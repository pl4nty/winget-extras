param([Parameter(Mandatory)][string]$FixtureRoot)

$ErrorActionPreference = 'Stop'
Import-Module "$PSScriptRoot/../Correlation.psm1"

# Test comparison/reporting with deterministic canonical values. The Windows smoke
# check exercises the real WinGet index normalizer rather than this fixture adapter.
& (Get-Module Correlation) {
    function script:Get-NormalizedMetadataValue([string]$Field, [string]$Value) {
        if ($Field -eq 'ProductCode') { return $Value.ToLowerInvariant().Replace('ß', 'ss') }
        if ($Field -eq 'DisplayName') { $Value = $Value -replace '\s+2\.0\s*\(x64\)', '' }
        if ($Field -eq 'Publisher') { $Value = $Value -replace '\s+(Corporation|Inc\.)$', '' }
        ($Value -replace '[^\p{L}\p{Nd}]', '').ToLowerInvariant()
    }
}

function Assert([bool]$Condition, [string]$Message) {
    if (-not $Condition) { throw $Message }
}

$directory = Join-Path $FixtureRoot 'correlation'
New-Item $directory -ItemType Directory | Out-Null
$manifestPath = "$directory/Test.App.installer.yaml"
@'
ManifestType: defaultLocale
PackageLocale: en-US
PackageName: Test App
Publisher: Test Publisher
'@ | Set-Content "$directory/Test.App.locale.en-US.yaml"
@'
ManifestType: locale
PackageLocale: fr-FR
PackageName: Application Test
'@ | Set-Content "$directory/Test.App.locale.fr-FR.yaml"
'ManifestType: installer' | Set-Content $manifestPath
$manifest = @{
    PackageIdentifier = 'Test.App'
    PackageVersion = '2.0'
    InstallerType = 'wix'
    Scope = 'machine'
    ProductCode = '{12345678-1234-1234-1234-123456789abc}'
}
$entry = @{ Architecture = 'x64'; InstallerSha256 = ('A' * 64) }
$metadataPath = "$directory/metadata.json"
$actual = @{
    DisplayName = 'Test App'
    Publisher = 'Test Publisher'
    DisplayVersion = '2.0'
    ProductCode = '{12345678-1234-1234-1234-123456789ABC}'
    InstallerType = 'msi'
}

function Write-Metadata([hashtable]$Arp = $actual, [string]$Status = 'Success', [string]$Scope = 'machine') {
    @{
        status = $Status
        diagnostics = @{ reason = 'normalization match and new/changed'; changedEntryCount = 1 }
        metadata = @{ metadata = @(@{ scope = $Scope; AppsAndFeaturesEntries = @($Arp) }) }
    } | ConvertTo-Json -Depth 10 | Set-Content $metadataPath
}

function Get-Failure([hashtable]$Manifest = $manifest, [hashtable]$Entry = $entry) {
    try {
        Test-InstallerMetadata -ManifestPath $manifestPath -Manifest $Manifest -Entry $Entry -MetadataPath $metadataPath 6> $null
        return ''
    }
    catch { return $_.Exception.Message }
}

Write-Metadata
Assert (-not (Get-Failure)) 'Default locale and root product code/scope must match the collected metadata'
Write-Metadata -Scope Machine
$casingSummaryPath = "$directory/casing-summary.md"
$records = @(Test-InstallerMetadata -ManifestPath $manifestPath -Manifest $manifest -Entry $entry -MetadataPath $metadataPath -SummaryPath $casingSummaryPath 6>&1)
$output = ($records | ForEach-Object ToString) -join "`n"
$summary = Get-Content $casingSummaryPath -Raw
Assert ($summary.Contains('| Scope | machine | machine | — | ✅ Exact match |')) 'Scope casing must display canonical values and count as an exact match'
Assert ($summary.Contains("| ProductCode | $($manifest.ProductCode) | $($actual.ProductCode) | — | ✅ Exact match |")) 'Product code casing must match while preserving both reported values'
Assert ($summary.Contains('| InstallerType | wix | msi | — | ✅ Exact match |')) 'InstallerType must inherit the root type and recognize wix/MSI equivalence'
Assert (-not $output.Contains('Normalized match') -and -not $summary.Contains('✅ Normalized match')) 'Representation differences must not be reported as WinGet normalized matches'
$uppercaseManifest = $manifest.Clone()
$uppercaseManifest.ProductCode = $manifest.ProductCode.ToUpperInvariant()
$lowercaseActual = $actual.Clone()
$lowercaseActual.ProductCode = $actual.ProductCode.ToLowerInvariant()
Write-Metadata $lowercaseActual
$records = @(Test-InstallerMetadata -ManifestPath $manifestPath -Manifest $uppercaseManifest -Entry $entry -MetadataPath $metadataPath -SummaryPath "$directory/verbatim-summary.md" 6>&1)
$output = ($records | ForEach-Object ToString) -join "`n"
Assert ($output.Contains("ProductCode: $($lowercaseActual.ProductCode) (Exact match)")) 'Console output must preserve the installed product code verbatim'
Assert ((Get-Content "$directory/verbatim-summary.md" -Raw).Contains("| ProductCode | $($uppercaseManifest.ProductCode) | $($lowercaseActual.ProductCode) | — | ✅ Exact match |")) 'The Markdown summary must preserve installed product code casing'
foreach ($variant in ([guid]$manifest.ProductCode).ToString('D'), ([guid]$manifest.ProductCode).ToString('N'), " $($manifest.ProductCode)", "$($manifest.ProductCode) ") {
    $guidVariant = $actual.Clone()
    $guidVariant.ProductCode = $variant
    Write-Metadata $guidVariant
    $variantSummaryPath = "$directory/guid-summary-$([guid]::NewGuid()).md"
    $failure = try {
        Test-InstallerMetadata -ManifestPath $manifestPath -Manifest $manifest -Entry $entry -MetadataPath $metadataPath -SummaryPath $variantSummaryPath 6> $null
    } catch { $_.Exception.Message }
    Assert ($failure -like '*ProductCode: expected*observed*') 'Product code braces, hyphens and whitespace must remain significant, as in WinGet'
    Assert ((Get-Content $variantSummaryPath -Raw).Contains("| ProductCode | $($manifest.ProductCode) | $variant | — | ❌ Mismatch |")) 'Mismatch summaries must preserve product code formatting verbatim'
}
$textManifest = $manifest.Clone()
$textManifest.ProductCode = 'Test_App_is1'
$textActual = $actual.Clone()
$textActual.ProductCode = 'test_app_IS1'
Write-Metadata $textActual
Assert (-not (Get-Failure -Manifest $textManifest)) 'Non-GUID ARP product codes must compare as case-folded strings'
$textManifest.ProductCode = 'Straße_is1'
$textActual.ProductCode = 'STRASSE_IS1'
Write-Metadata $textActual
Assert (-not (Get-Failure -Manifest $textManifest)) 'Product code comparison must use WinGet Unicode case folding rather than ordinal ignore-case equality'
$missingPublisher = $actual.Clone()
$missingPublisher.Remove('Publisher')
Write-Metadata $missingPublisher
Assert ((Get-Failure) -like '*Publisher: expected*observed*') 'A missing observed field must fail instead of skipping the comparison'
$normalized = $actual.Clone()
$normalized.DisplayName = 'Test App 2.0 (x64)'
$normalized.Publisher = 'Test Publisher Corporation'
Write-Metadata $normalized
$summaryPath = "$directory/summary.md"
$records = @(Test-InstallerMetadata -ManifestPath $manifestPath -Manifest $manifest -Entry $entry -MetadataPath $metadataPath -SummaryPath $summaryPath 6>&1)
$output = ($records | ForEach-Object ToString) -join "`n"
Assert ($output.Contains('DisplayName: testapp (Normalized match)') -and $output.Contains('Publisher: testpublisher (Normalized match)')) 'Normalized name/publisher matches must pass and display the canonical value'
$summary = Get-Content $summaryPath -Raw
Assert ($summary.Contains('**Result:** ✅ Passed') -and $summary.Contains('**WinGet correlation:** normalization match and new/changed')) 'The Markdown summary must report the overall result and WinGet correlation reason'
Assert ($summary.Contains('| Field | Manifest | Installed | Normalized value | Result |')) 'The summary must contain a formatted metadata comparison table'
Assert ($summary.Contains('| DisplayName | Test App | Test App 2.0 (x64) | testapp | ✅ Normalized match |')) 'Normalized rows must show the normalized value and an explicit match label'
Assert ($summary.Contains('| DisplayVersion | 2.0 | 2.0 | — | ✅ Exact match |')) 'Exact matches must be labeled separately'
Assert (-not $summary.Contains([char]27)) 'The summary must contain plain Markdown without ANSI colors'
$undeclared = $manifest.Clone()
$undeclared.Remove('ProductCode')
$undeclared.Remove('Scope')
Test-InstallerMetadata -ManifestPath $manifestPath -Manifest $undeclared -Entry $entry -MetadataPath $metadataPath -SummaryPath "$directory/undeclared-summary.md" 6> $null
Assert ((Get-Content "$directory/undeclared-summary.md" -Raw).Contains('| ProductCode | — | {12345678-1234-1234-1234-123456789ABC} | — | ➖ Not declared |')) 'Fields absent from both installer and root must remain undeclared'

$wrongVersion = $normalized.Clone()
$wrongVersion.DisplayVersion = '3.0'
Write-Metadata $wrongVersion
$failure = try {
    Test-InstallerMetadata -ManifestPath $manifestPath -Manifest $manifest -Entry $entry -MetadataPath $metadataPath -SummaryPath "$directory/failed-summary.md" 6> $null
} catch { $_.Exception.Message }
Assert ($failure -like '*DisplayVersion: expected*2.0*observed*3.0*') 'Normalized identity must not hide a version mismatch'
$summary = Get-Content "$directory/failed-summary.md" -Raw
Assert ($summary.Contains('**Result:** ❌ Failed') -and $summary.Contains('| DisplayVersion | 2.0 | 3.0 | — | ❌ Mismatch |')) 'Failed comparisons must still write their metadata table to the summary'

foreach ($field in 'DisplayName', 'Publisher', 'DisplayVersion', 'ProductCode', 'InstallerType') {
    $wrong = $actual.Clone()
    $wrong[$field] = 'Unrelated value'
    Write-Metadata $wrong
    Assert ((Get-Failure) -like "*${field}: expected*observed*Unrelated value*") "Collector Success must not hide a mismatching $field"
}
Write-Metadata -Status LowConfidence
Assert ((Get-Failure) -like '*could not correlate*LowConfidence*') 'Ambiguous correlation must fail even when metadata fields happen to match'
$failure = try {
    Test-InstallerMetadata -ManifestPath $manifestPath -Manifest $manifest -Entry $entry -MetadataPath $metadataPath -SummaryPath "$directory/ambiguous-summary.md" 6> $null
} catch { $_.Exception.Message }
Assert ((Get-Content "$directory/ambiguous-summary.md" -Raw).Contains('could not correlate the installed application: LowConfidence')) 'Ambiguous correlation must write a useful failure summary without a comparison table'
Write-Metadata -Status Error
Assert ((Get-Failure) -like '*could not correlate*Error*') 'Collector errors must fail'
'{"status":"Success","metadata":{"metadata":[]}}' | Set-Content $metadataPath
Assert ((Get-Failure) -like '*no correlated*') 'Empty collector output must never pass'

$override = $entry.Clone()
$override.Scope = 'user'
$override.ProductCode = 'installer-code'
$override.AppsAndFeaturesEntries = @(@{
    DisplayName = 'Different ARP name'
    Publisher = 'Different publisher'
    DisplayVersion = '7.8.9'
    ProductCode = 'ARP-code'
    InstallerType = 'wix'
    UpgradeCode = '{00000000-0000-0000-0000-000000000000}'
})
$observedOverride = @{
    DisplayName = 'different arp name'
    Publisher = ' Different publisher '
    DisplayVersion = '7.8.9'
    ProductCode = 'arp-CODE'
    InstallerType = 'msi'
}
Write-Metadata $observedOverride -Scope user
Assert (-not (Get-Failure -Entry $override)) 'Installer ARP fields must override defaults, including a DisplayVersion different from PackageVersion and wix/msi equivalence'
Write-Metadata $observedOverride -Scope machine
Assert ((Get-Failure -Entry $override) -like '*Scope: expected*user*observed*machine*') 'Installer scope must override the root scope'

Write-Metadata
Assert ((Get-Failure -Entry ($entry + @{ InstallerType = 'exe' })) -like '*InstallerType: expected*exe*observed*msi*') 'Installer type must override the root type'
Assert (-not (Get-Failure -Entry ($entry + @{ InstallerType = 'exe'; AppsAndFeaturesEntries = @(@{ InstallerType = 'msi' }) }))) 'An explicit ARP installer type must override the effective installer type'

$rootEntries = $manifest.Clone()
$rootEntries.AppsAndFeaturesEntries = $override.AppsAndFeaturesEntries
$rootEntries.Scope = 'user'
Write-Metadata $observedOverride -Scope user
Assert (-not (Get-Failure -Manifest $rootEntries)) 'Root AppsAndFeaturesEntries must be inherited'
Write-Metadata
Assert (-not (Get-Failure -Manifest $rootEntries -Entry ($entry + @{ AppsAndFeaturesEntries = @(@{ ProductCode = $manifest.ProductCode }); Scope = 'machine' }))) 'Installer entries must replace, rather than merge with, root AppsAndFeaturesEntries'

$alternatives = $entry + @{ AppsAndFeaturesEntries = @(@{ DisplayName = 'Old name' }, @{ DisplayName = 'Test App' }) }
Assert (-not (Get-Failure -Entry $alternatives)) 'A complete matching alternative ARP entry must pass'
$splitFields = $entry + @{ AppsAndFeaturesEntries = @(@{ DisplayName = 'Test App'; Publisher = 'Wrong publisher' }, @{ DisplayName = 'Wrong name'; Publisher = 'Test Publisher' }) }
Assert ([bool](Get-Failure -Entry $splitFields)) 'Fields from different manifest entries must not combine into a false match'
$badRoot = $manifest.Clone()
$badRoot.ProductCode = 'incorrect-root-code'
Assert ([bool](Get-Failure -Manifest $badRoot -Entry ($entry + @{ AppsAndFeaturesEntries = @(@{ DisplayName = 'Test App' }) }))) 'An omitted ARP product code must still check the inherited installer product code'

$localized = $actual.Clone()
$localized.DisplayName = 'Application Test'
Write-Metadata $localized
Assert (-not (Get-Failure -Entry ($entry + @{ InstallerLocale = 'fr-FR' }))) 'Installer locale must select localized names and inherit a missing localized publisher'

$archive = $manifest.Clone()
$archive.InstallerType = 'zip'
$archive.NestedInstallerType = 'wix'
Write-Metadata
Assert (-not (Get-Failure -Manifest $archive)) 'Archives must use the nested installer type'
Assert ((Get-Failure -Manifest $archive -Entry ($entry + @{ NestedInstallerType = 'exe' })) -like '*InstallerType: expected*exe*observed*msi*') 'Installer-level nested types must override root nested types for ARP comparison'
Assert (-not (Start-InstallerMetadataCollection -Manifest @{ InstallerType = 'font' } -Entry @{})) 'Fonts must skip native ARP collection'
Assert (-not (Get-Failure -Manifest @{ InstallerType = 'font' } -Entry @{})) 'Fonts must skip ARP comparison'
Test-InstallerMetadata -Manifest ($manifest + @{ NestedInstallerType = 'font' }) -Entry @{ InstallerType = 'zip' } -SummaryPath "$directory/font-summary.md" 6> $null
Assert ((Get-Content "$directory/font-summary.md" -Raw).Contains('**Result:** ➖ Skipped')) 'Skipped font checks must be included in the Markdown summary'

$module = Get-Module Correlation
& $module {
    foreach ($field in 'DisplayName', 'Publisher', 'DisplayVersion', 'PackageFamilyName') {
        $row = Compare-MetadataField $field 'Test Value' ' test value '
        if ($row.Match -ne 'Exact match' -or $row.Normalized) { throw "$field casing and whitespace must not be labeled as WinGet normalization" }
    }
    $cell = ConvertTo-MarkdownCell "a|b <script> `"quote`" ``code```nnext"
    if ($cell -ne 'a&#124;b &lt;script&gt; &quot;quote&quot; &#96;code&#96;<br>next') { throw 'Markdown cells must escape pipes, HTML, code fences and line breaks' }
    function Get-NormalizedMetadataValue { '' }
    if ((Compare-MetadataField DisplayName 'Old Name' 'Different Name').Match -ne 'Mismatch') { throw 'Empty normalization must not accept unrelated values' }
    function Get-AppxPackage { [pscustomobject]@{ PackageFamilyName = 'Test.App_family' } }
    Test-InstallerMetadata -Manifest @{ InstallerType = 'msix'; PackageFamilyName = 'Test.App_family' } -Entry @{}
    $failure = try { Test-InstallerMetadata -Manifest @{ InstallerType = 'zip'; NestedInstallerType = 'msix'; PackageFamilyName = 'Wrong_family' } -Entry @{} } catch { $_.Exception.Message }
    if ($failure -notlike '*does not match*Wrong_family*') { throw 'MSIX correlation must fail on a mismatching package family' }
    $failure = try { Test-InstallerMetadata -Manifest @{ InstallerType = 'msix' } -Entry @{} } catch { $_.Exception.Message }
    if ($failure -notlike '*PackageFamilyName is required*') { throw 'MSIX correlation must not silently skip a missing family name' }
}

# Capture the native API input without loading a Windows DLL or changing the registry.
Add-Type @'
public class WinGetMetadataCollection {
    public string Input;
    public WinGetMetadataCollection(string input, string logPath, string outputPath) { Input = input; }
}
'@
$inputCollection = Start-InstallerMetadataCollection -ManifestPath $manifestPath -Manifest $manifest -Entry $override -OutputPath $metadataPath -LogPath "$directory/correlation.log"
$inputData = $inputCollection.Input | ConvertFrom-Json -AsHashtable
Assert ($inputData.packageData.installerHash -eq $entry.InstallerSha256) 'Collection must be keyed by the selected installer hash'
Assert ($inputData.supportedMetadataVersion -eq '1.1') 'Collection must request scope metadata'
Assert (@($inputData.packageData.Locales | Where-Object PackageName -EQ 'Different ARP name').Count -eq 1) 'Explicit ARP names must participate in WinGet normalization'

function Assert-CorrelationLifecycle([string]$FixtureRoot) {
    # Run the validation orchestration with successful and failed installers. Keep
    # native setup, app launches, and attack surface collection out of the tests.
    function Import-Module {}
    function Initialize-WinGet {}
    function Show-InstalledApp {}
    function Start-Sleep {}
    function asa {
        param($Operation)
        if ($Operation -eq 'export-collect') { '{}' | Set-Content baseline_vs_installed_summary.sarif }
    }
    function Start-InstallerMetadataCollection {
        param($OutputPath, $LogPath)
        $collection.OutputPath = $OutputPath
        'correlation diagnostic log' | Set-Content $LogPath
        $collection
    }
    function Invoke-Installer {
        param($Arguments)
        [pscustomobject]@{ HasExited = $true; ExitCode = $testExitCode }
    }
    function Test-InstallerMetadata {
        param($MetadataPath)
        if (-not (Test-Path -LiteralPath $MetadataPath)) { throw 'Comparison ran before completing collection' }
        $collection.Compared = $true
        if ($testMismatch) { throw 'ARP mismatch' }
    }
    $savedEnvironment = @{}
    foreach ($name in 'RUNNER_TEMP', 'LOCALAPPDATA', 'ProgramFiles', 'ProgramFiles(x86)', 'GITHUB_STEP_SUMMARY', 'GITHUB_OUTPUT') {
        $savedEnvironment[$name] = [Environment]::GetEnvironmentVariable($name)
    }
    try {
        $env:RUNNER_TEMP = "$FixtureRoot/lifecycle"
        $env:LOCALAPPDATA = "$FixtureRoot/local-appdata"
        $env:ProgramFiles = "$FixtureRoot/program-files"
        ${env:ProgramFiles(x86)} = $null
        $env:GITHUB_STEP_SUMMARY = "$FixtureRoot/lifecycle-summary.md"
        $env:GITHUB_OUTPUT = $null
        New-Item $env:ProgramFiles -ItemType Directory | Out-Null
        foreach ($testExitCode in 0, 7) {
            foreach ($testMismatch in $false, $true) {
                $collection = [pscustomobject]@{ OutputPath = ''; Completed = 0; Disposed = 0; Compared = $false }
                $collection | Add-Member ScriptMethod Complete { $this.Completed++; '{"status":"Success"}' | Set-Content $this.OutputPath }
                $collection | Add-Member ScriptMethod Dispose { $this.Disposed++ }
                $failure = ''
                try {
                    & "$PSScriptRoot/../run.ps1" -ManifestPath 'manifests/t/Test/App/1.0/Test.App.installer.yaml' -Arch x64 -Scope machine -InstallerType exe 6> $null
                }
                catch { $failure = $_.Exception.Message }
                Assert ($collection.Disposed -eq 1) 'Every collected baseline must be disposed, including when validation fails'
                Assert ($collection.Completed -eq [int]($testExitCode -eq 0)) 'Only successful installations should complete ARP collection'
                Assert ($collection.Compared -eq ($testExitCode -eq 0)) 'Failed installs must not compare incomplete metadata'
                if ($testExitCode -ne 0) { Assert ($failure -like '*exit code 7*') 'Collection cleanup must preserve installer failures' }
                elseif ($testMismatch) { Assert ($failure -eq 'ARP mismatch') 'A correlation mismatch must fail the validate step' }
                else { Assert (-not $failure) "Successful correlation must allow validation to finish: $failure" }
            }
        }
        Assert ((Get-Content $env:GITHUB_STEP_SUMMARY -Raw).Contains('Correlation log')) 'Correlation diagnostics must be included in the job summary on failure'
    }
    finally {
        foreach ($name in $savedEnvironment.Keys) { [Environment]::SetEnvironmentVariable($name, $savedEnvironment[$name]) }
    }
}

Assert-CorrelationLifecycle $FixtureRoot
Write-Host 'Installer correlation tests passed'
