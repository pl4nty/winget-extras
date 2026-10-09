param([Parameter(Mandatory)][string]$FixtureRoot)

$ErrorActionPreference = 'Stop'
& "$PSScriptRoot/../install-module.ps1" -Name powershell-yaml

function Assert([bool]$Condition, [string]$Message) {
    if (-not $Condition) { throw $Message }
}

function Assert-InstallerSelection($Installer) {
    # Stop at the first setup operation to exercise selection without Windows APIs.
    function New-Item { throw 'Installer selection passed' }
    $failure = $null
    try {
        & "$PSScriptRoot/../run.ps1" -ManifestPath $Installer.path -Arch $Installer.arch -Scope $Installer.scope -InstallerType $Installer.type
    }
    catch { $failure = $_.Exception.Message }
    Assert ($failure -eq 'Installer selection passed') "Matrix entry must select an installer: $($Installer | ConvertTo-Json -Compress). $failure"
}

function Assert-LogsOnFailure([string]$FixtureRoot) {
    # Reuse the loaded modules and stop before any Windows setup runs.
    function Import-Module {}
    function Initialize-WinGet {
        'installer failure log' | Set-Content "$env:RUNNER_TEMP/artifacts/Test.App-x64-machine-exe-installer.log"
        throw 'Validation setup failed'
    }
    $savedEnvironment = @{}
    foreach ($name in 'RUNNER_TEMP', 'LOCALAPPDATA', 'GITHUB_STEP_SUMMARY', 'GITHUB_OUTPUT', 'GITHUB_ACTIONS') {
        $savedEnvironment[$name] = [Environment]::GetEnvironmentVariable($name)
    }
    try {
        $env:RUNNER_TEMP = $FixtureRoot
        $env:LOCALAPPDATA = "$FixtureRoot/local-appdata"
        $env:GITHUB_STEP_SUMMARY = "$FixtureRoot/failure-summary.md"
        $env:GITHUB_OUTPUT = $null
        $env:GITHUB_ACTIONS = 'true'
        $diagnostics = "$env:LOCALAPPDATA/Packages/Microsoft.DesktopAppInstaller_8wekyb3d8bbwe/LocalState/DiagOutputDir"
        New-Item $diagnostics -ItemType Directory -Force | Out-Null
        'winget failure log' | Set-Content "$diagnostics/winget.log"
        $records = [Collections.Generic.List[object]]::new()
        $failure = $null
        try {
            & "$PSScriptRoot/../run.ps1" -ManifestPath 'manifests/t/Test/App/1.0/Test.App.installer.yaml' -Arch x64 -Scope machine -InstallerType exe 6>&1 |
                ForEach-Object { $records.Add($_) }
        }
        catch { $failure = $_.Exception.Message }
        Assert ($failure -eq 'Validation setup failed') 'Reporting logs must preserve the validation failure'
        $output = ($records | ForEach-Object ToString) -join "`n"
        Assert (-not $output.Contains('Architecture:')) 'Validation must not print the redundant installer metadata line'
        Assert ($output -match '(?s)::group::Installer log.*installer failure log.*::endgroup::.*::group::WinGet log.*winget failure log.*::endgroup::') 'Failed validation must print both named log dropdowns before exiting'
        $summary = Get-Content $env:GITHUB_STEP_SUMMARY -Raw
        Assert ($summary.Contains('installer failure log') -and $summary.Contains('winget failure log')) 'Failed validation must still write the job summary'
    }
    finally {
        foreach ($name in $savedEnvironment.Keys) { [Environment]::SetEnvironmentVariable($name, $savedEnvironment[$name]) }
    }
}

# Parse every CI script, including Windows-only code that cannot run on Linux.
foreach ($file in Get-ChildItem "$PSScriptRoot/../.." -Recurse -File | Where-Object Extension -in '.ps1', '.psm1') {
    $parseErrors = $null
    $null = [Management.Automation.Language.Parser]::ParseFile($file.FullName, [ref]$null, [ref]$parseErrors)
    Assert ($parseErrors.Count -eq 0) "$($file.Name): $parseErrors"
}

$module = Import-Module "$PSScriptRoot/../Validation.psm1" -PassThru
$expectedExports = @('Initialize-WinGet', 'Install-AttackSurfaceAnalyzer', 'Invoke-Installer', 'Save-InstallerScreenshot', 'Show-InstalledApp', 'Write-ValidationSummary')
Assert ((Compare-Object $expectedExports @($module.ExportedFunctions.Keys)).Count -eq 0) 'The validation module must expose only its public operations'
foreach ($helper in 'Close-OobeScreen', 'Close-StartMenu', 'New-Screenshot') {
    Assert (-not (Get-Command $helper -ErrorAction SilentlyContinue)) "Internal helper $helper must remain private"
}
$preferences = & $module { @($ErrorActionPreference, $PSNativeCommandUseErrorActionPreference) }
Assert ($preferences[0] -eq 'Stop' -and $preferences[1] -eq $true) 'Module functions must fail on setup errors independently of caller preferences'

Push-Location $FixtureRoot
try {
    Get-Content matrix.json -Raw | ConvertFrom-Json | ForEach-Object { Assert-InstallerSelection $_ }
    $failure = $null
    try { & "$PSScriptRoot/../run.ps1" -ManifestPath "manifests/t/Test/App/1.0/Test.App.installer.yaml" -Arch invalid }
    catch { $failure = $_.Exception.Message }
    Assert ($failure -like 'No installer matches*') 'An invalid selection must fail before Windows setup'

    New-Item 'artifacts' -ItemType Directory | Out-Null
    'installer log' | Set-Content 'artifacts/Test.App-x64-installer.log'
    "$($PSStyle.Foreground.Green)winget log$($PSStyle.Reset)" | Set-Content 'artifacts/Test.App-x64-winget.log'
    'other package' | Set-Content 'artifacts/Other.App-x64-winget.log'
    $savedActions = $env:GITHUB_ACTIONS
    try {
        $env:GITHUB_ACTIONS = 'true'
        $records = @(Write-ValidationSummary -ArtifactName Test.App-x64 -ArtifactsPath artifacts -SummaryPath summary.md 6>&1)
        $output = ($records | ForEach-Object ToString) -join "`n"
        Assert ($output -match '(?s)::group::Installer log.*installer log.*::endgroup::.*::group::WinGet log.*winget log.*::endgroup::') 'Installer and WinGet logs must use their names as dropdown titles'
        Assert (-not ($output -match '==> (Installer|WinGet) log|::group::Details|Completed')) 'Artifact logs must not have duplicate headings or timed completion messages'
    }
    finally { $env:GITHUB_ACTIONS = $savedActions }
    $summary = Get-Content summary.md -Raw
    Assert (([regex]::Matches($summary, 'installer log')).Count -eq 1) 'Installer logs must appear only once'
    Assert ($summary.Contains('winget log') -and -not $summary.Contains('other package')) 'Report only the selected installer logs'
    Assert (-not $summary.Contains([char]27)) 'Job summaries must contain plain text without ANSI colors'
    Assert ($summary.Contains('<details><summary>Installer log</summary>') -and $summary.Contains('<details><summary>WinGet log</summary>')) 'Summary dropdowns must use the log names'
    1..75 | ForEach-Object { "log line $_" } | Set-Content 'artifacts/Long.App-installer.log'
    $savedActions = $env:GITHUB_ACTIONS
    try {
        $env:GITHUB_ACTIONS = 'true'
        $records = @(Write-ValidationSummary -ArtifactName Long.App -ArtifactsPath artifacts -SummaryPath long-summary.md 6>&1)
        $output = ($records | ForEach-Object ToString) -join "`n"
        Assert ($output -match '(?s)::group::Installer log \(last 50 lines\)\n\.\.\. 25 earlier lines omitted\nlog line 26\n.*log line 75\n::endgroup::\n::group::Installer log \(full\)\nlog line 1\n.*log line 75\n::endgroup::') 'Long console logs must show a bounded tail followed by the complete log in separate named dropdowns'
    }
    finally { $env:GITHUB_ACTIONS = $savedActions }
    $longSummary = Get-Content long-summary.md -Raw
    Assert (-not ($longSummary -match 'last 50 lines|earlier lines omitted|\(full\)')) 'Console previews must not change the Markdown summary'
    Assert (([regex]::Matches($longSummary, '(?m)^log line \d+\r?$')).Count -eq 75) 'The Markdown summary must contain the complete log exactly once'
    Write-ValidationSummary -ArtifactName '' -SummaryPath missing-summary.md
    Assert (-not (Test-Path missing-summary.md)) 'Failed setup must not produce an unnamed summary'
    Write-ValidationSummary -ArtifactName Test.App-x64 -ArtifactsPath missing-artifacts -SummaryPath empty-summary.md
    Assert ((Get-Content empty-summary.md -Raw).Contains('Validation logs: Test.App-x64')) 'Missing logs must not prevent a summary'
    Assert-LogsOnFailure $FixtureRoot

    # Exercise app exit reporting without launching an app or using Windows desktop APIs.
    & $module {
        function Close-OobeScreen {}
        function Start-Process {
            param($FilePath, $ArgumentList, [switch]$PassThru, [switch]$NoNewWindow)
            if ($FilePath -ne 'winget' -or ($ArgumentList -join ' ') -ne 'install --verbose --manifest "package"') { throw 'Installer arguments changed' }
            Write-Host 'installer output'
            $testInstaller
        }
        $testInstaller = [pscustomobject]@{ HasExited = $true; ExitCode = 0 }
        $testInstaller | Add-Member ScriptMethod WaitForExit {
            param($Timeout)
            if ($Timeout -ne 300000) { throw 'Installer timeout changed' }
            $true
        }
        $savedActions = $env:GITHUB_ACTIONS
        $savedNoColor = $env:NO_COLOR
        try {
            $env:GITHUB_ACTIONS = 'true'
            $env:NO_COLOR = $null
            foreach ($exitCode in 0, 7) {
                $testInstaller.ExitCode = $exitCode
                $records = @(Invoke-Installer @('install', '--verbose', '--manifest', '"package"') 6>&1)
                $values = @($records | Where-Object { $_ -isnot [Management.Automation.InformationRecord] })
                if ($values.Count -ne 1 -or $values[0] -ne $testInstaller) { throw 'Installer logging must preserve the process result, including nonzero exits' }
                $coloredOutput = ($records | ForEach-Object ToString) -join "`n"
                $expected = if ($exitCode -eq 0) { "$($PSStyle.Foreground.Green)==> Installer exit code 0" } else { "$($PSStyle.Foreground.BrightRed)==> Error: Installer exit code 7" }
                if (-not $coloredOutput.Contains($expected)) { throw 'Installer exit codes must use success or error headings according to their value' }
                $annotations = @($records | Where-Object { $_.ToString().StartsWith('::error::Installer exit code') })
                if ($annotations.Count -ne [int]($exitCode -ne 0)) { throw 'Only nonzero installer exits must emit an error annotation' }
                $output = $coloredOutput -replace '\x1b\[[0-?]*[ -/]*[@-~]', ''
                if ($output -notmatch '(?s)\n\$ winget install --verbose --manifest "package"\n::group::Details\ninstaller output.*Completed Run WinGet installer.*::endgroup::') {
                    throw 'Installer command must precede the Details dropdown, with output and completion inside'
                }
            }
        }
        finally {
            $env:GITHUB_ACTIONS = $savedActions
            $env:NO_COLOR = $savedNoColor
        }
        function Close-StartMenu {}
        function Get-ChildItem {}
        function Unblock-File {}
        function Start-Job { 1 }
        function Wait-Job { 1 }
        function Receive-Job { 1 }
        function Remove-Job {}
        function Start-Sleep {}
        function Add-Type {}
        function New-Screenshot {}
        function New-Object { [pscustomobject]@{} | Add-Member ScriptMethod MinimizeAll {} -PassThru }
        function Get-Process { $testApp }
        $savedPath = $env:PATH
        try {
            foreach ($exitCode in @(0, $null, 'unavailable')) {
                $testApp = [pscustomobject]@{ Id = 1; Handle = 1; HasExited = $true; ExitCode = $exitCode }
                if ($exitCode -eq 'unavailable') {
                    $testApp | Add-Member ScriptProperty ExitCode { throw 'Process has exited' } -Force
                }
                $testApp | Add-Member ScriptMethod Refresh {}
                $testApp | Add-Member ScriptMethod Dispose {}
                $records = @(Show-InstalledApp -Manifest @{} -Entry @{ Commands = @('test-app') } -InstallerType portable -ScreenshotPath app.png 6>&1)
                $message = $records[-1].ToString() -replace '\x1b\[[0-?]*[ -/]*[@-~]', ''
                $expected = if ($exitCode -eq 0 -and $null -ne $exitCode) { 'App exited with code 0' } else { 'App exited (exit code unavailable)' }
                if ($message -ne $expected) { throw "Incorrect app exit report: $message" }
            }
        }
        finally { $env:PATH = $savedPath }
    }

    Write-Host 'PowerShell validation tests passed'
}
finally { Pop-Location }
