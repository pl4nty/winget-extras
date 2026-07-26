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

Install-Module powershell-yaml -Force

$artifacts = "$env:RUNNER_TEMP\artifacts"
New-Item $artifacts -ItemType Directory -Force | Out-Null

# Disable Defender SmartScreen and MOTW
New-Item -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\System' -Force | Out-Null
Set-ItemProperty -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\System' -Name 'EnableSmartScreen' -Type DWord -Value 0
Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer' -Name 'SmartScreenEnabled' -Type String -Value 'Off' -ErrorAction SilentlyContinue
New-Item -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Policies\Attachments" -Force | Out-Null
Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Policies\Attachments" -Name "SaveZoneInformation" -Value 1

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
Write-Host "Installed latest WinGet: $(winget --version)"

$wingetSettings = @{
    '$schema'            = 'https://aka.ms/winget-settings.schema.json'
    experimentalFeatures = @{
        fonts = $true
    }
    installBehavior      = @{
        preferences = @{
            architectures = @($Arch)
        }
    }
}
if ($Scope) { $wingetSettings.installBehavior.preferences.scope = $Scope }
if ($InstallerType) { $wingetSettings.installBehavior.preferences.installerTypes = @($InstallerType) }
$wingetSettings | ConvertTo-Json -Depth 100 | Set-Content -Path "$env:LOCALAPPDATA\Packages\Microsoft.DesktopAppInstaller_8wekyb3d8bbwe\LocalState\settings.json" -Encoding UTF8
winget settings --enable LocalManifestFiles
winget settings --enable LocalArchiveMalwareScanOverride

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
    "--log", "$artifacts\$artifactName-installer.log",
    "--silent", "--ignore-local-archive-malware-scan",
    "--accept-package-agreements", "--accept-source-agreements"
)

if (-not (Test-Path asa.sqlite)) {
    Write-Host "asa collect --runid baseline $analyzerArgs"
    asa collect --runid baseline $analyzerArgs
}
$installer = Start-Process winget -ArgumentList $wingetArgs -PassThru -NoNewWindow
# 2GB+ zips like Cinebench need longer than 2 mins to extract
$success = $installer.WaitForExit(5 * 60 * 1000)
if ($installer.ExitCode -eq "-1978334972") {
    # Dependency not found, so try resolving it from our source
    winget source add --name winget-extras --type Microsoft.PreIndexed.Package --arg https://winget.tplant.com.au/cache --accept-source-agreements
    winget source remove --name winget
    $installer = Start-Process winget -ArgumentList $wingetArgs -PassThru -NoNewWindow
    $success = $installer.WaitForExit(5 * 60 * 1000)
}
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
    $appPath = Split-Path ($selectedInstaller.NestedInstallerFiles ?? $manifest.NestedInstallerFiles)[0].RelativeFilePath -Leaf
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

    # Close the Start menu (the post-OOBE shell auto-opens it), hide the runner's debug console
    # via "show desktop", then restore just the app window so only it shows in the screenshot.
    Add-Type 'using System;using System.Runtime.InteropServices;public static class Win{[DllImport("user32.dll")]public static extern bool ShowWindow(IntPtr h,int c);}' -ErrorAction SilentlyContinue
    Stop-Process -Name StartMenuExperienceHost -Force -ErrorAction SilentlyContinue
    (New-Object -ComObject Shell.Application).MinimizeAll()
    if ($app) { $app.Refresh(); [Win]::ShowWindow($app.MainWindowHandle, 9) | Out-Null }
    Start-Sleep 1

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
