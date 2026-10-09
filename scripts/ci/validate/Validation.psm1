$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $true
Import-Module "$PSScriptRoot/Logging.psm1"

function Initialize-WinGet([string]$StatePath, [string]$Arch, [string]$Scope, [string]$InstallerType) {
    # Disable Defender SmartScreen and MOTW
    New-Item -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\System' -Force | Out-Null
    Set-ItemProperty -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\System' -Name 'EnableSmartScreen' -Type DWord -Value 0
    Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer' -Name 'SmartScreenEnabled' -Type String -Value 'Off' -ErrorAction SilentlyContinue
    New-Item -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Policies\Attachments" -Force | Out-Null
    Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Policies\Attachments" -Name "SaveZoneInformation" -Value 1

    # Install latest WinGet version for fonts support
    $wingetDirectory = Join-Path $env:RUNNER_TEMP 'winget'
    New-Item $wingetDirectory -ItemType Directory -Force | Out-Null
    gh release download --repo microsoft/winget-cli `
        --pattern 'Microsoft.DesktopAppInstaller_8wekyb3d8bbwe.msixbundle' `
        --pattern 'DesktopAppInstaller_Dependencies.zip' `
        --dir $wingetDirectory

    Expand-Archive "$wingetDirectory\DesktopAppInstaller_Dependencies.zip" "$wingetDirectory\dependencies"
    $dependencies = (Get-ChildItem "$wingetDirectory\dependencies\$env:RUNNER_ARCH" -File).FullName
    Add-AppxPackage "$wingetDirectory\Microsoft.DesktopAppInstaller_8wekyb3d8bbwe.msixbundle" -DependencyPath $dependencies -ForceApplicationShutdown -ForceUpdateFromAnyVersion -ErrorAction Stop
    Write-CILog "Installed WinGet $(winget --version)" -Level Success

    $preferences = @{ architectures = @($Arch) }
    if ($Scope) { $preferences.scope = $Scope }
    if ($InstallerType) { $preferences.installerTypes = @($InstallerType) }
    $wingetSettings = @{
        '$schema'            = 'https://aka.ms/winget-settings.schema.json'
        experimentalFeatures = @{ fonts = $true }
        installBehavior      = @{ preferences = $preferences }
    }
    $wingetSettings | ConvertTo-Json -Depth 5 | Set-Content -Path "$StatePath/settings.json" -Encoding UTF8
    winget settings --enable LocalManifestFiles
    winget settings --enable LocalArchiveMalwareScanOverride
}

function Install-AttackSurfaceAnalyzer {
    Invoke-CIStep 'Install Attack Surface Analyzer' {
        gh release download latest --repo pl4nty/AttackSurfaceAnalyzer --pattern '*.nupkg' --dir asa-pkg
        $cli = Get-ChildItem asa-pkg/Microsoft.CST.AttackSurfaceAnalyzer.CLI.*.nupkg | Select-Object -First 1
        $version = $cli.BaseName -replace '^Microsoft\.CST\.AttackSurfaceAnalyzer\.CLI\.', ''
        dotnet tool install --global --add-source asa-pkg Microsoft.CST.AttackSurfaceAnalyzer.CLI --version $version
        "$env:USERPROFILE\.dotnet\tools" >> $env:GITHUB_PATH
        Write-CILog "Installed Attack Surface Analyzer $version" -Level Success
    }
}

function Invoke-Installer([string[]]$Arguments) {
    Invoke-CIStep 'Run WinGet installer (timeout: 5 minutes)' {
        Close-OobeScreen
        $process = Start-Process winget -ArgumentList $Arguments -PassThru -NoNewWindow
        # Large archives can need several minutes to extract.
        $null = $process.WaitForExit(5 * 60 * 1000)
        $result = if ($process.HasExited) { "exit code $($process.ExitCode)" } else { 'timed out' }
        $level = if (-not $process.HasExited) { 'Warning' } elseif ($process.ExitCode -eq 0) { 'Success' } else { 'Error' }
        Write-CILog "Installer $result" -Level $level
        $process
    } -Command "winget $($Arguments -join ' ')"
}

function New-Screenshot([string]$Path) {
    Add-Type -AssemblyName System.Windows.Forms, System.Drawing
    $screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
    $bmp = [System.Drawing.Bitmap]::new($screen.Width, $screen.Height)
    $gfx = [System.Drawing.Graphics]::FromImage($bmp)
    try {
        $gfx.CopyFromScreen($screen.Location, [System.Drawing.Point]::Empty, $screen.Size)
        $bmp.Save($Path)
        Write-CILog "Saved screenshot: $(Split-Path $Path -Leaf)" -Level Success
    }
    finally {
        $gfx.Dispose()
        $bmp.Dispose()
    }
}

# arm64 runners can sit on the Windows OOBE (privacy settings) screen, which covers the
# desktop and blocks an install from completing. Mark privacy consent complete and close
# the OOBE host so it doesn't reappear.
function Close-OobeScreen {
    Set-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\OOBE' -Name PrivacyConsentStatus -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
    Stop-Process -Name WWAHost, FirstLogonAnim -Force -ErrorAction SilentlyContinue
}

# The shell auto-opens the Start menu after OOBE, and it covers the middle of the screen -
# exactly where an installer waiting on a dialog puts its window.
function Close-StartMenu {
    Stop-Process -Name StartMenuExperienceHost -Force -ErrorAction SilentlyContinue
    Start-Sleep 1
}

function Show-InstalledApp([hashtable]$Manifest, [hashtable]$Entry, [string]$InstallerType, [string]$ScreenshotPath) {
    # TODO validate multiple NestedInstallerFiles
    $appPath = $null
    if (($Entry.NestedInstallerType ?? $manifest.NestedInstallerType) -eq 'portable') {
        $appPath = Split-Path ($Entry.NestedInstallerFiles ?? $manifest.NestedInstallerFiles)[0].RelativeFilePath -Leaf
    }
    elseif ($InstallerType -eq 'portable') {
        $appPath = (@($Entry.Commands) + @($manifest.Commands)) | Where-Object { $_ } | Select-Object -First 1
    }
    elseif ($InstallerType -eq 'msix') {
        $familyName = $Entry.PackageFamilyName ?? $manifest.PackageFamilyName
        $appxManifest = Get-AppxPackage | Where-Object PackageFamilyName -EQ $familyName | Get-AppxPackageManifest
        $appPath = "shell:AppsFolder\$familyName!$($appxManifest.Package.Applications.Application.Id)"
    }
    else {
        $appPath = @(
            "$env:PUBLIC\Desktop",
            "$env:USERPROFILE\Desktop",
            "$env:ProgramData\Microsoft\Windows\Start Menu\Programs",
            "$env:APPDATA\Microsoft\Windows\Start Menu\Programs"
        ) | Get-ChildItem -Recurse -File -Exclude "Uninstall*" | Sort-Object LastWriteTime -Descending | Select-Object -First 1 -ExpandProperty FullName
    }

    if (-not $appPath) {
        Write-CILog 'No application entry point found; skipping launch and screenshot' -Level Warning
        return
    }

    if ($InstallerType -ne "msix") {
        Get-ChildItem "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" -Recurse -File -ErrorAction SilentlyContinue | Unblock-File
        Unblock-File $appPath -ErrorAction SilentlyContinue
    }

    $env:PATH = "$([Environment]::GetEnvironmentVariable('PATH', 'Machine'));$([Environment]::GetEnvironmentVariable('PATH', 'User'))"

    # In case OOBE came back while the installer ran.
    Close-OobeScreen

    Write-CILog "Launch $(Split-Path $appPath -Leaf)"
    # ShellExecute doesn't return while the shell holds a dialog open - an advertised shortcut
    # whose installer source is gone gets Windows Installer's repair prompt - and a thread
    # stuck in it keeps pwsh alive after the script ends. A child process can be killed.
    # https://github.com/PowerShell/PowerShell/issues/10996
    $launch = Start-Job { try { (Start-Process $using:appPath -PassThru).Id } catch {} }
    $processId = if (Wait-Job $launch -Timeout 60) { Receive-Job $launch }
    Remove-Job $launch -Force
    $app = if ($processId) { Get-Process -Id $processId -ErrorAction SilentlyContinue }
    if ($app) {
        # Keep a handle open so Windows retains the exit code after the app exits.
        try { $null = $app.Handle } catch {}
    }
    elseif ($processId) { Write-CILog 'App launcher exited before its process could be observed' -Level Detail }
    else { Write-CILog 'App did not start within 60 seconds' -Level Warning }

    Start-Sleep 10

    # Hide the runner's debug console via "show desktop", then restore just the app window
    # so only it shows in the screenshot.
    Add-Type 'using System;using System.Runtime.InteropServices;public static class Win{[DllImport("user32.dll")]public static extern bool ShowWindow(IntPtr h,int c);}' -ErrorAction SilentlyContinue
    Close-StartMenu
    (New-Object -ComObject Shell.Application).MinimizeAll()
    if ($app) {
        $app.Refresh()
        if (-not $app.HasExited) { [Win]::ShowWindow($app.MainWindowHandle, 9) | Out-Null }
    }
    Start-Sleep 1

    New-Screenshot $ScreenshotPath
    if ($app) {
        if ($app.HasExited) {
            $exitCode = try { $app.ExitCode } catch { $null }
            $result = if ($null -ne $exitCode) { "with code $exitCode" } else { '(exit code unavailable)' }
            Write-CILog "App exited $result" -Level Detail
        }
        else {
            Stop-Process -Id $app.Id -ErrorAction SilentlyContinue
        }
        $app.Dispose()
    }
}

function Save-InstallerScreenshot([string]$Path) {
    Close-StartMenu
    New-Screenshot $Path
}

function Write-ValidationSummary {
    param(
        [string]$ArtifactName = $env:ARTIFACT_NAME,
        [string]$ArtifactsPath = "$env:RUNNER_TEMP/artifacts",
        [string]$SummaryPath = $env:GITHUB_STEP_SUMMARY
    )

    if (-not $ArtifactName) { return }
    Write-CILog "Report validation artifacts: $ArtifactName"
    $summary = @("## Validation logs: $ArtifactName", '')

    $logs = Get-ChildItem -LiteralPath $ArtifactsPath -Filter "$ArtifactName-*.log" -File -ErrorAction SilentlyContinue |
        Sort-Object Name
    foreach ($log in $logs) {
        $content = @(Get-Content -LiteralPath $log.FullName)
        $title = if ($log.Name.EndsWith('-winget.log')) { 'WinGet log' } elseif ($log.Name.EndsWith('-correlation.log')) { 'Correlation log' } else { 'Installer log' }
        $githubActions = $env:GITHUB_ACTIONS -eq 'true'
        $consoleLogs = @(@{ Title = $title; Content = $content })
        if ($content.Count -gt 50) {
            $consoleLogs = @(
                @{ Title = "$title (last 50 lines)"; Content = @("... $($content.Count - 50) earlier lines omitted") + @($content | Select-Object -Last 50) },
                @{ Title = "$title (full)"; Content = $content }
            )
        }
        foreach ($consoleLog in $consoleLogs) {
            if ($githubActions) { Write-Host "::group::$($consoleLog.Title)" }
            else { Write-CILog $consoleLog.Title }
            try { $consoleLog.Content | Write-Host }
            finally { if ($githubActions) { Write-Host '::endgroup::' } }
        }
        $plainContent = $content -replace '\x1b\[[0-?]*[ -/]*[@-~]', ''
        $summary += @("<details><summary>$title</summary>", '', '```text') + $plainContent + @('```', '', '</details>', '')
    }
    if ($SummaryPath) { $summary >> $SummaryPath }
}

Export-ModuleMember -Function Initialize-WinGet, Install-AttackSurfaceAnalyzer, Invoke-Installer, Show-InstalledApp, Save-InstallerScreenshot, Write-ValidationSummary
