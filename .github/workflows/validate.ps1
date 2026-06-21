param(
    [Parameter(Mandatory)][string]$ManifestPath,
    [Parameter(Mandatory)][string]$Arch,
    [string]$Scope,
    [string]$InstallerType
)

function New-Screenshot([string]$Path) {
    Add-Type -AssemblyName System.Windows.Forms, System.Drawing
    $screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
    $bmp = [System.Drawing.Bitmap]::new($screen.Width, $screen.Height)
    $gfx = [System.Drawing.Graphics]::FromImage($bmp)
    $gfx.CopyFromScreen($screen.Location, [System.Drawing.Point]::Empty, $screen.Size)
    $bmp.Save($Path); $gfx.Dispose(); $bmp.Dispose()
}

# Tidy the desktop just before a screenshot: minimize console windows like the runner's debug
# console, close the Start menu (the post-OOBE shell auto-opens it on arm64) and bring the app
# forward. Targeted minimize keeps the app visible, unlike Shell.MinimizeAll.
function Hide-DebugWindows([System.Diagnostics.Process]$App) {
    Add-Type @"
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class WinApi {
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
    [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetClassName(IntPtr hWnd, StringBuilder lpClassName, int nMaxCount);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
}
"@ -ErrorAction SilentlyContinue

    $SW_MINIMIZE = 6
    $consoleClasses = 'ConsoleWindowClass', 'CASCADIA_HOSTING_WINDOW_CLASS'
    $callback = [WinApi+EnumWindowsProc] {
        param($hWnd, $lParam)
        if ([WinApi]::IsWindowVisible($hWnd)) {
            $sb = [System.Text.StringBuilder]::new(256)
            [WinApi]::GetClassName($hWnd, $sb, $sb.Capacity) | Out-Null
            if ($consoleClasses -contains $sb.ToString()) {
                [WinApi]::ShowWindow($hWnd, $SW_MINIMIZE) | Out-Null
            }
        }
        return $true
    }
    [WinApi]::EnumWindows($callback, [IntPtr]::Zero) | Out-Null

    # Close the Start menu (killing the host closes the flyout; it respawns in the background).
    Stop-Process -Name StartMenuExperienceHost -Force -ErrorAction SilentlyContinue

    # Bring the app to the foreground so it's the focused window in the shot.
    if ($App) { $App.Refresh() }
    if ($App -and $App.MainWindowHandle -ne [IntPtr]::Zero) {
        [WinApi]::SetForegroundWindow($App.MainWindowHandle) | Out-Null
    }

    Start-Sleep 1
}

Install-Module powershell-yaml -Force

$artifacts = "$env:RUNNER_TEMP\artifacts"
New-Item $artifacts -ItemType Directory -Force | Out-Null

$manifest = Get-Content $ManifestPath | ConvertFrom-Yaml
$selectedInstaller = $manifest.Installers | Where-Object {
    $matchesArch = $_.Architecture -eq $Arch
    $matchesScope = ($Scope -and $_.Scope -eq $Scope) -or (-not $Scope -and -not $_.Scope)
    $effectiveInstallerType = $_.InstallerType ?? $manifest.InstallerType
    $matchesInstallerType = ($InstallerType -and $effectiveInstallerType -eq $InstallerType) -or (-not $InstallerType -and -not $effectiveInstallerType)
    $matchesArch -and $matchesScope -and $matchesInstallerType
} | Select-Object -First 1

$nameParts = @($manifest.PackageIdentifier, $Arch)
if ($Scope) { $nameParts += $Scope }
if ($InstallerType) { $nameParts += $InstallerType }
$artifactName = $nameParts -join '-'
"artifact_name=$artifactName" >> $env:GITHUB_OUTPUT

# Install latest pre-release WinGet version for fonts support and local manifest fixes.
# Switch back to Repair-WinGetPackageManager and stable WinGet once 1.29.x releases and
# PowerShell modules update.
$assetUrl = gh api `
    '/repos/microsoft/winget-cli/releases' `
    --jq 'map(select(.prerelease)) | first | .assets[] | select(.name == "Microsoft.DesktopAppInstaller_8wekyb3d8bbwe.msixbundle") | .browser_download_url'

$wingetBundle = Join-Path $env:RUNNER_TEMP 'Microsoft.DesktopAppInstaller_8wekyb3d8bbwe.msixbundle'
Invoke-WebRequest -Uri $assetUrl -OutFile $wingetBundle
Add-AppxPackage -Path $wingetBundle -ForceUpdateFromAnyVersion -ErrorAction Stop
Write-Host "Installed latest WinGet pre-release: $(winget --version)"

@{
    '$schema'            = 'https://aka.ms/winget-settings.schema.json'
    experimentalFeatures = @{
        fonts = $true
    }
} | ConvertTo-Json | Set-Content -Path "$env:LOCALAPPDATA\Packages\Microsoft.DesktopAppInstaller_8wekyb3d8bbwe\LocalState\settings.json" -Encoding UTF8
winget settings --enable LocalManifestFiles
winget settings --enable LocalArchiveMalwareScanOverride

# Add the source so declared dependencies (copied in from winget-pkgs at publish) resolve
winget source add --name winget-extras --type Microsoft.PreIndexed.Package --arg https://winget.tplant.com.au/cache --accept-source-agreements

$programFilesBefore = Get-ChildItem $env:ProgramFiles -Directory | Select-Object -ExpandProperty FullName
$programFilesx86Before = Get-ChildItem ${env:ProgramFiles(x86)} -Directory | Select-Object -ExpandProperty FullName
$analyzerArgs = @(
    # "--verbose",
    "--all", "--hives", "CurrentUser, LocalMachine",
    "--skip-directories", "$env:LOCALAPPDATA\AzureFunctionsTools",
    "--directories", "$env:USERPROFILE\AppData"
)

$wingetArgs = @(
    "install", "--verbose",
    "--manifest", (Split-Path $ManifestPath),
    "--architecture", $Arch,
    "--log", "$artifacts\$artifactName-installer.log",
    "--silent", "--ignore-local-archive-malware-scan",
    "--accept-package-agreements", "--accept-source-agreements"
)
if ($Scope) { $wingetArgs += '--scope', $Scope }
if ($InstallerType) { $wingetArgs += '--installer-type', $InstallerType }

if (-not (Test-Path asa.sqlite)) {
    Write-Host "asa collect --runid baseline $analyzerArgs"
    asa collect --runid baseline $analyzerArgs
}
$installer = Start-Process winget -ArgumentList $wingetArgs -PassThru -NoNewWindow
$success = $installer.WaitForExit(2 * 60 * 1000)
$log = Get-ChildItem "$env:LOCALAPPDATA\Packages\Microsoft.DesktopAppInstaller_8wekyb3d8bbwe\LocalState\DiagOutputDir\" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
Copy-Item $log "$artifacts\$artifactName-winget.log"
if (-not $success) {
    New-Screenshot "$artifacts\$artifactName.png"
    Stop-Process -Id $installer.Id
    throw 'Install timed out'
}
if ($installer.ExitCode -ne 0) {
    throw "Install failed with exit code $($installer.ExitCode)"
}

$programFilesAdded = Get-ChildItem $env:ProgramFiles -Directory | Select-Object -ExpandProperty FullName | Where-Object { $_ -notin $programFilesBefore }
$programFilesx86Added = Get-ChildItem ${env:ProgramFiles(x86)} -Directory | Select-Object -ExpandProperty FullName | Where-Object { $_ -notin $programFilesx86Before }
$analyzerArgs[-1] = @($analyzerArgs[-1]) + $programFilesAdded + $programFilesx86Added -join ","
Write-Host "asa collect --overwrite --runid installed $analyzerArgs"
asa collect --overwrite --runid installed $analyzerArgs
asa export-collect --firstrunid baseline --secondrunid installed --outputsarif --filename "$PSScriptRoot\analyses.json"
Move-Item baseline_vs_installed_summary.sarif "$artifacts\$artifactName-asa.sarif" -Force

# TODO validate multiple NestedInstallerFiles
$appPath = $null
if ($manifest.NestedInstallerType -eq 'portable') {
    $appPath = Split-Path $manifest.NestedInstallerFiles[0].RelativeFilePath -Leaf
}
elseif ($InstallerType -eq 'portable') {
    $appPath = (@($selectedInstaller.Commands) + @($manifest.Commands)) | Where-Object { $_ } | Select-Object -First 1
}
elseif ($InstallerType -eq 'msix') {
    $manifest = Get-AppxPackage | Where-Object PackageFamilyName -EQ $selectedInstaller.PackageFamilyName | Get-AppxPackageManifest
    $appPath = "shell:AppsFolder\$($selectedInstaller.PackageFamilyName)!$($manifest.Package.Applications.Application.Id)"
}
else {
    $appPath = @(
        "$env:PUBLIC\Desktop",
        "$env:USERPROFILE\Desktop",
        "$env:ProgramData\Microsoft\Windows\Start Menu\Programs",
        "$env:APPDATA\Microsoft\Windows\Start Menu\Programs"
    ) | Get-ChildItem -Recurse -Exclude "Uninstall*" | Sort-Object LastWriteTime -Descending | Select-Object -First 1 -ExpandProperty FullName
}

if ($appPath) {
    if ($InstallerType -ne "msix") {
        Get-ChildItem "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" -Recurse -File -ErrorAction SilentlyContinue | Unblock-File
        Unblock-File $appPath -ErrorAction SilentlyContinue
    }

    $env:PATH = "$([Environment]::GetEnvironmentVariable('PATH', 'Machine'));$([Environment]::GetEnvironmentVariable('PATH', 'User'))"

    # arm64 runners can sit on the Windows OOBE (privacy settings) screen, which covers the
    # desktop. Mark privacy consent complete and close the OOBE host so it doesn't reappear.
    Set-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\OOBE' -Name PrivacyConsentStatus -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
    Stop-Process -Name WWAHost, FirstLogonAnim -Force -ErrorAction SilentlyContinue

    Write-Host "Starting $appPath"
    # https://github.com/PowerShell/PowerShell/issues/10996
    try { $app = Start-Process $appPath -PassThru } catch {}

    Start-Sleep 10
    Hide-DebugWindows $app
    New-Screenshot "$artifacts\$artifactName.png"
    if ($app) {
        if ($app.HasExited) {
            Write-Host "App exited with code $($app.ExitCode) after $($app.ExitTime - $app.StartTime)"
        }
        else {
            Stop-Process -Id $app.Id -ErrorAction SilentlyContinue
        }
    }
}
