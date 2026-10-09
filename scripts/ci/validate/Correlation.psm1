$ErrorActionPreference = 'Stop'
Import-Module "$PSScriptRoot/Logging.psm1"
$script:NormalizedValues = @{}

function Initialize-InstallerMetadataCollector {
    if ('WinGetMetadataCollection' -as [type]) { return }

    # Pin the utility independently of the runner's WinGet installation. Use the
    # PowerShell process architecture, which can differ from the installer being tested.
    $version = '1.29.380'
    $directory = Join-Path $env:RUNNER_TEMP "winget-util/$version"
    $architecture = [Runtime.InteropServices.RuntimeInformation]::ProcessArchitecture.ToString().ToLowerInvariant()
    $library = "$directory/runtimes/win-$architecture/native/WinGetUtil.dll"
    if (-not (Test-Path -LiteralPath $library)) {
        New-Item $directory -ItemType Directory -Force | Out-Null
        $archive = "$directory/package.zip"
        Invoke-WebRequest "https://api.nuget.org/v3-flatcontainer/microsoft.windowspackagemanager.utils/$version/microsoft.windowspackagemanager.utils.$version.nupkg" -OutFile $archive
        Expand-Archive $archive $directory -Force
        Remove-Item $archive
    }
    # Windows resolves subsequent imports by the loaded DLL's name. Keep it loaded
    # for the lifetime of the PowerShell process.
    $null = [Runtime.InteropServices.NativeLibrary]::Load($library)
    Add-Type @'
using System;
using System.Runtime.InteropServices;

public sealed class WinGetMetadataCollection : IDisposable
{
    private IntPtr handle;
    private readonly string outputPath;

    [DllImport("WinGetUtil.dll", CallingConvention = CallingConvention.StdCall, CharSet = CharSet.Unicode)]
    private static extern int WinGetBeginInstallerMetadataCollection(string input, string logPath, uint options, out IntPtr handle);

    [DllImport("WinGetUtil.dll", CallingConvention = CallingConvention.StdCall, CharSet = CharSet.Unicode)]
    private static extern int WinGetCompleteInstallerMetadataCollection(IntPtr handle, string outputPath, uint options);

    [DllImport("WinGetUtil.dll", CallingConvention = CallingConvention.StdCall, CharSet = CharSet.Unicode)]
    private static extern int WinGetSQLiteIndexCreate(string path, uint major, uint minor, out IntPtr index);
    [DllImport("WinGetUtil.dll", CallingConvention = CallingConvention.StdCall, CharSet = CharSet.Unicode)]
    private static extern int WinGetSQLiteIndexAddManifest(IntPtr index, string manifest, string relativePath);
    [DllImport("WinGetUtil.dll", CallingConvention = CallingConvention.StdCall)]
    private static extern int WinGetSQLiteIndexClose(IntPtr index);

    [DllImport("winsqlite3.dll", CallingConvention = CallingConvention.Cdecl)]
    private static extern int sqlite3_open_v2([MarshalAs(UnmanagedType.LPUTF8Str)] string path, out IntPtr database, int flags, IntPtr vfs);
    [UnmanagedFunctionPointer(CallingConvention.Cdecl)]
    private delegate int SqliteCallback(IntPtr context, int count, IntPtr values, IntPtr names);
    [DllImport("winsqlite3.dll", CallingConvention = CallingConvention.Cdecl)]
    private static extern int sqlite3_exec(IntPtr database, [MarshalAs(UnmanagedType.LPUTF8Str)] string sql, SqliteCallback callback, IntPtr context, out IntPtr error);
    [DllImport("winsqlite3.dll", CallingConvention = CallingConvention.Cdecl)]
    private static extern int sqlite3_close(IntPtr database);
    [DllImport("winsqlite3.dll", CallingConvention = CallingConvention.Cdecl)]
    private static extern void sqlite3_free(IntPtr value);

    public static string[] Normalize(string indexPath, string manifestPath, bool productCode)
    {
        IntPtr index = IntPtr.Zero;
        try
        {
            // Schema 1.2 uses the same name/publisher normalization as ARP correlation.
            Marshal.ThrowExceptionForHR(WinGetSQLiteIndexCreate(indexPath, 1, 2, out index));
            Marshal.ThrowExceptionForHR(WinGetSQLiteIndexAddManifest(index, manifestPath, "normalization.yaml"));
        }
        finally { if (index != IntPtr.Zero) WinGetSQLiteIndexClose(index); }

        IntPtr database = IntPtr.Zero;
        try
        {
            if (sqlite3_open_v2(indexPath, out database, 1, IntPtr.Zero) != 0)
                throw new InvalidOperationException("Cannot read the WinGet normalization index");
            string[] result = null;
            SqliteCallback callback = (context, count, values, names) => {
                result = new string[count];
                for (int i = 0; i < count; i++)
                    result[i] = Marshal.PtrToStringUTF8(Marshal.ReadIntPtr(values, i * IntPtr.Size));
                return 0;
            };
            IntPtr error;
            string query = productCode ? "SELECT productcode FROM productcodes" : "SELECT norm_name, norm_publisher FROM norm_names CROSS JOIN norm_publishers";
            int status = sqlite3_exec(database, query, callback, IntPtr.Zero, out error);
            string message = error == IntPtr.Zero ? null : Marshal.PtrToStringUTF8(error);
            if (error != IntPtr.Zero) sqlite3_free(error);
            if (status != 0 || result == null) throw new InvalidOperationException(message ?? "WinGet returned no normalized identity");
            return result;
        }
        finally { if (database != IntPtr.Zero) sqlite3_close(database); }
    }

    public WinGetMetadataCollection(string input, string logPath, string outputPath)
    {
        this.outputPath = outputPath;
        Marshal.ThrowExceptionForHR(WinGetBeginInstallerMetadataCollection(input, logPath, 0, out handle));
    }

    public void Complete()
    {
        if (handle == IntPtr.Zero) return;
        var current = handle;
        handle = IntPtr.Zero;
        // The native API frees the handle even if completing the collection fails.
        Marshal.ThrowExceptionForHR(WinGetCompleteInstallerMetadataCollection(current, outputPath, 0));
    }

    public void Dispose()
    {
        if (handle == IntPtr.Zero) return;
        var current = handle;
        handle = IntPtr.Zero;
        WinGetCompleteInstallerMetadataCollection(current, null, 1);
    }
}
'@
}

function Get-CorrelationPackage([string]$ManifestPath, [hashtable]$Manifest, [hashtable]$Entry) {
    $locales = @(Get-ChildItem -LiteralPath (Split-Path -LiteralPath $ManifestPath) -Filter '*.yaml' -File | ForEach-Object {
        $document = Get-Content -LiteralPath $_.FullName -Raw | ConvertFrom-Yaml
        if ($document.ManifestType -in 'defaultLocale', 'locale', 'singleton') { $document }
    })
    $defaultLocale = $locales | Where-Object ManifestType -In 'defaultLocale', 'singleton' | Select-Object -First 1
    if (-not $defaultLocale) { throw 'A default locale manifest is required for installer correlation' }
    $locale = $locales | Where-Object PackageLocale -EQ ($Entry.InstallerLocale ?? $Manifest.InstallerLocale) | Select-Object -First 1
    $locale = $locale ?? $defaultLocale
    @{
        DefaultLocale = $defaultLocale
        Locales = @($locales | Where-Object { $_ -ne $defaultLocale })
        ExpectedLocale = @{
            PackageName = $locale.PackageName ?? $defaultLocale.PackageName
            Publisher = $locale.Publisher ?? $defaultLocale.Publisher
            PackageLocale = $locale.PackageLocale
        }
    }
}

function Start-InstallerMetadataCollection([string]$ManifestPath, [hashtable]$Manifest, [hashtable]$Entry, [string]$OutputPath, [string]$LogPath) {
    $type = $Entry.InstallerType ?? $Manifest.InstallerType
    if ($type -eq 'zip') { $type = $Entry.NestedInstallerType ?? $Manifest.NestedInstallerType }
    if ($type -in 'msix', 'appx', 'font') { return }

    Initialize-InstallerMetadataCollector
    $package = Get-CorrelationPackage $ManifestPath $Manifest $Entry
    # Include explicit ARP names in normalization, especially for bundles which
    # install dependencies alongside the app. The API doesn't consume installer fields.
    $arpLocales = @($Entry.AppsAndFeaturesEntries ?? $Manifest.AppsAndFeaturesEntries) | Where-Object { $_.DisplayName } | ForEach-Object {
        @{
            PackageLocale = $package.ExpectedLocale.PackageLocale
            PackageName = $_.DisplayName
            Publisher = $_.Publisher ?? $package.ExpectedLocale.Publisher
        }
    }
    $input = @{
        version = '1.0'
        supportedMetadataVersion = '1.1'
        submissionData = @{ submissionIdentifier = "$($Manifest.PackageIdentifier)/$($Manifest.PackageVersion)" }
        packageData = @{
            installerHash = $Entry.InstallerSha256
            DefaultLocale = $package.DefaultLocale
            Locales = @($package.Locales) + @($arpLocales)
        }
    } | ConvertTo-Json -Depth 20 -Compress
    [WinGetMetadataCollection]::new($input, [IO.Path]::GetFullPath($LogPath), [IO.Path]::GetFullPath($OutputPath))
}

function Get-NormalizedMetadataValue([string]$Field, [string]$Value) {
    $key = "$Field`0$Value"
    if (-not $script:NormalizedValues.ContainsKey($key)) {
        Initialize-InstallerMetadataCollector
        $directory = Join-Path $env:RUNNER_TEMP "winget-normalize-$([guid]::NewGuid())"
        New-Item $directory -ItemType Directory | Out-Null
        try {
            # WinGet doesn't export the normalizer directly. Index a single synthetic
            # manifest and read its canonical values using Windows' built-in SQLite.
            $manifest = @{
                PackageIdentifier = 'CI.Normalization'; PackageVersion = '1.0'; PackageLocale = 'en-US'
                PackageName = $(if ($Field -eq 'DisplayName') { $Value } else { 'Normalization' })
                Publisher = $(if ($Field -eq 'Publisher') { $Value } else { 'Normalization' })
                License = 'MIT'; ShortDescription = 'Normalize installer metadata'
                ManifestType = 'singleton'; ManifestVersion = '1.6.0'
                Installers = @(@{ Architecture = 'x64'; InstallerType = 'exe'; InstallerUrl = 'https://example.invalid/setup.exe'; InstallerSha256 = ('0' * 64) })
            }
            if ($Field -eq 'ProductCode') { $manifest.Installers[0].ProductCode = $Value }
            # JSON is valid YAML, and preserves punctuation and Unicode in names.
            $manifest | ConvertTo-Json -Depth 5 | Set-Content "$directory/manifest.yaml" -Encoding utf8
            $values = [WinGetMetadataCollection]::Normalize("$directory/index.db", "$directory/manifest.yaml", $Field -eq 'ProductCode')
            $script:NormalizedValues[$key] = $values[$(if ($Field -eq 'Publisher') { 1 } else { 0 })]
        }
        finally { Remove-Item $directory -Recurse -Force }
    }
    $script:NormalizedValues[$key]
}

function Compare-MetadataField([string]$Field, [string]$Expected, [string]$Actual) {
    # Scope casing is a representation difference, not WinGet identity normalization.
    if ($Field -eq 'Scope') {
        $Expected = $Expected.Trim().ToLowerInvariant()
        $Actual = $Actual.Trim().ToLowerInvariant()
    }
    $row = @{ Field = $Field; Expected = $Expected; Actual = $Actual; Normalized = ''; Match = 'Mismatch' }
    if (-not $Expected) { $row.Match = 'Not declared'; return $row }
    if ([string]::IsNullOrWhiteSpace($Actual)) { return $row }
    if ($Field -eq 'ProductCode') {
        # WinGet folds these strings before an ordinal comparison. Preserve the
        # collected value in reports; GUID punctuation and whitespace are significant.
        $foldedExpected = Get-NormalizedMetadataValue $Field $Expected
        $foldedActual = Get-NormalizedMetadataValue $Field $Actual
        if ([string]::Equals($foldedExpected, $foldedActual, [StringComparison]::Ordinal)) { $row.Match = 'Exact match' }
        return $row
    }
    if ([string]::Equals($Expected.Trim(), $Actual.Trim(), [StringComparison]::OrdinalIgnoreCase)) {
        $row.Match = 'Exact match'
        return $row
    }

    if ($Field -in 'DisplayName', 'Publisher') {
        $normalizedExpected = Get-NormalizedMetadataValue $Field $Expected
        $normalizedActual = Get-NormalizedMetadataValue $Field $Actual
        # Empty canonical values must not turn two unrelated names into a match.
        if ($normalizedExpected -and [string]::Equals($normalizedExpected, $normalizedActual, [StringComparison]::OrdinalIgnoreCase)) {
            $row.Match = 'Normalized match'
            $row.Normalized = $normalizedActual
        }
    }
    elseif ($Field -eq 'InstallerType') {
        # ARP records MSI packages as msi even when their manifest specifies wix.
        if ($Expected.Trim() -in 'wix', 'msi' -and $Actual.Trim() -in 'wix', 'msi') { $row.Match = 'Exact match' }
    }
    $row
}

function ConvertTo-MarkdownCell([string]$Value) {
    if (-not $Value) { return '—' }
    [Net.WebUtility]::HtmlEncode($Value).Replace('|', '&#124;').Replace('`', '&#96;').Replace("`r", '').Replace("`n", '<br>')
}

function Write-CorrelationSummary([hashtable]$Manifest, [string]$Result, [string]$Reason, [object[]]$Rows, [string[]]$Notes, [string]$SummaryPath) {
    if (-not $SummaryPath) { return }
    $status = switch ($Result) { Passed { '✅ Passed' } Skipped { '➖ Skipped' } default { '❌ Failed' } }
    $summary = @("## Package correlation: $(ConvertTo-MarkdownCell $Manifest.PackageIdentifier) $(ConvertTo-MarkdownCell $Manifest.PackageVersion)", '', "**Result:** $status", '')
    if ($Reason) { $summary += @("**WinGet correlation:** $(ConvertTo-MarkdownCell $Reason)", '') }
    if ($Rows.Count) {
        $summary += @('| Field | Manifest | Installed | Normalized value | Result |', '| --- | --- | --- | --- | --- |')
        foreach ($row in $Rows) {
            $icon = switch ($row.Match) { 'Mismatch' { '❌' } 'Not declared' { '➖' } default { '✅' } }
            $cells = @($row.Field, $row.Expected, $row.Actual, $row.Normalized, "$icon $($row.Match)") | ForEach-Object { ConvertTo-MarkdownCell $_ }
            $summary += "| $($cells -join ' | ') |"
        }
        $summary += ''
    }
    foreach ($note in $Notes) { $summary += @("$(ConvertTo-MarkdownCell $note)", '') }
    $summary | Add-Content -LiteralPath $SummaryPath -Encoding utf8
}

function Test-InstallerMetadata {
    param(
        [string]$ManifestPath, [hashtable]$Manifest, [hashtable]$Entry, [string]$MetadataPath,
        [string]$SummaryPath = $env:GITHUB_STEP_SUMMARY
    )
    $rows = @()
    $notes = @()
    $reason = ''
    $result = 'Failed'
    try {
        $type = $Entry.InstallerType ?? $Manifest.InstallerType
        if ($type -eq 'zip') { $type = $Entry.NestedInstallerType ?? $Manifest.NestedInstallerType }
        if ($type -eq 'font') {
            $notes += 'ARP correlation does not apply to font installers'
            Write-CILog $notes[-1] -Level Detail
            $result = 'Skipped'
            return
        }
        if ($type -in 'msix', 'appx') {
            $family = $Entry.PackageFamilyName ?? $Manifest.PackageFamilyName
            if (-not $family) { throw 'PackageFamilyName is required to check the installed MSIX package' }
            $packages = @(Get-AppxPackage | Where-Object PackageFamilyName -EQ $family)
            $rows = @(Compare-MetadataField 'PackageFamilyName' $family $(if ($packages) { $family } else { '' }))
            if (-not $packages) { throw "Installed MSIX package does not match PackageFamilyName '$family'" }
            Write-CILog "Installed package family matches: $family" -Level Success
            $result = 'Passed'
            return
        }

        $metadata = Get-Content -LiteralPath $MetadataPath -Raw | ConvertFrom-Json -AsHashtable
        $reason = $metadata.diagnostics.reason ?? $metadata.diagnostics.errorText
        Write-CILog "Correlation: $($metadata.status) ($reason)" -Level Detail
        if ($metadata.status -ne 'Success') {
            $metadata.diagnostics | ConvertTo-Json -Depth 10 | Write-Host
            throw "WinGet could not correlate the installed application: $($metadata.status)"
        }
        $observed = @($metadata.metadata.metadata | ForEach-Object {
            $scope = $_.scope
            foreach ($arp in $_.AppsAndFeaturesEntries) { $arp + @{ Scope = $scope } }
        })
        if (-not $observed) { throw 'WinGet returned no correlated AppsAndFeatures entries' }

        $package = Get-CorrelationPackage $ManifestPath $Manifest $Entry
        $declared = @($Entry.AppsAndFeaturesEntries ?? $Manifest.AppsAndFeaturesEntries)
        if (-not $declared) { $declared = @(@{}) }
        $candidates = foreach ($arp in $declared) {
            $expected = @{
                DisplayName = $arp.DisplayName ?? $package.ExpectedLocale.PackageName
                Publisher = $arp.Publisher ?? $package.ExpectedLocale.Publisher
                DisplayVersion = $arp.DisplayVersion ?? $Manifest.PackageVersion
                ProductCode = $arp.ProductCode ?? $Entry.ProductCode ?? $Manifest.ProductCode
                InstallerType = $arp.InstallerType ?? $type
                Scope = $Entry.Scope ?? $Manifest.Scope
            }
            foreach ($actual in $observed) {
                $comparisons = @(foreach ($field in 'DisplayName', 'Publisher', 'DisplayVersion', 'ProductCode', 'InstallerType', 'Scope') {
                    Compare-MetadataField $field $expected[$field] $actual[$field]
                })
                $differences = @($comparisons | Where-Object Match -EQ 'Mismatch' | ForEach-Object {
                    "$($_.Field): expected '$($_.Expected)', observed '$($_.Actual)'"
                })
                @{ Rows = $comparisons; Differences = $differences }
            }
        }
        # Match a complete entry, favoring an exact alternative when both pass.
        $best = $candidates | Sort-Object { $_.Differences.Count }, { @($_.Rows | Where-Object Match -EQ 'Normalized match').Count } | Select-Object -First 1
        $rows = $best.Rows
        foreach ($row in $rows | Where-Object Match -NE 'Not declared') {
            $value = if ($row.Match -eq 'Normalized match') { $row.Normalized } else { $row.Actual }
            Write-CILog "$($row.Field): $value ($($row.Match))" -Level Detail
        }
        if (@($declared | Where-Object UpgradeCode).Count) {
            $notes += 'UpgradeCode is not exposed by the WinGet metadata collector; it was not checked'
            Write-CILog $notes[-1] -Level Detail
        }
        if ($best.Differences.Count) {
            throw "Installed AppsAndFeatures metadata does not match the manifest: $($best.Differences -join '; ')"
        }
        Write-CILog 'Installed AppsAndFeatures metadata matches the manifest' -Level Success
        $result = 'Passed'
    }
    catch {
        $notes += $_.Exception.Message
        throw
    }
    finally {
        Write-CorrelationSummary -Manifest $Manifest -Result $result -Reason $reason -Rows $rows -Notes $notes -SummaryPath $SummaryPath
    }
}

Export-ModuleMember -Function Start-InstallerMetadataCollection, Test-InstallerMetadata
