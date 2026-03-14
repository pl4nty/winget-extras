param(
    [Parameter(Mandatory)][string]$ManifestPath,
    [Parameter(Mandatory)][string]$Arch,
    [string]$Scope,
    [string]$InstallerType
)

function Take-Screenshot([string]$Path) {
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

$manifest = Get-Content $ManifestPath | ConvertFrom-Yaml

$nameParts = @($manifest.PackageIdentifier, $Arch)
if ($Scope) { $nameParts += $Scope }
if ($InstallerType) { $nameParts += $InstallerType }
$artifactName = $nameParts -join '-'
"artifact_name=$artifactName" >> $env:GITHUB_OUTPUT

winget settings --enable LocalManifestFiles
winget settings --enable LocalArchiveMalwareScanOverride

$analyzerArgs = @(
    "--verbose",
    "--all", "--hives", "CurrentUser, LocalMachine",
    "--directories"
)
if ($manifest.DefaultInstallLocation) {
    $analyzerArgs += [Environment]::ExpandEnvironmentVariables("$($manifest.DefaultInstallLocation)".Trim().Trim("'`""))
}
else {
    $analyzerArgs += "$env:ProgramFiles,${env:ProgramFiles(x86)},$env:USERPROFILE\AppData"
    $analyzerArgs += "--skip-directories"
    $skipDirectories = @(
        '7-Zip',
        'Amazon',
        'CMake',
        'dotnet',
        'Git',
        'Microsoft SDKs',
        'Microsoft SQL Server',
        'Microsoft Visual Studio',
        'nodejs',
        'OpenSSL',
        'PostgreSQL'
    ) | ForEach-Object { Join-Path $env:ProgramFiles $_ }
    $analyzerArgs += ($skipDirectories -join ',')
}

$wingetArgs = @(
    "install", "--verbose",
    "--manifest", (Resolve-Path $ManifestPath),
    "--architecture", $Arch,
    "--log", "$artifacts\$artifactName-installer.log",
    "--silent",
    "--ignore-local-archive-malware-scan", "--accept-package-agreements"
)
if ($Scope) { $wingetArgs += '--scope', $Scope }
if ($InstallerType) { $wingetArgs += '--installer-type', $InstallerType }
$installStart = Get-Date

Write-Host "asa collect --runid baseline $analyzerArgs"
asa collect --runid baseline $analyzerArgs
$installer = Start-Process winget -ArgumentList $wingetArgs -PassThru -NoNewWindow

if (-not $installer.WaitForExit(5 * 60 * 1000)) {
    Take-Screenshot "$artifacts\$artifactName.png"
    Stop-Process -Id $installer.Id
    throw 'Install timed out'
}
if ($installer.ExitCode -ne 0) {
    Get-ChildItem "$env:LOCALAPPDATA\Packages\Microsoft.DesktopAppInstaller_8wekyb3d8bbwe\LocalState\DiagOutputDir\" | Sort-Object LastWriteTime -Descending | Select-Object -First 1 | Move-Item "$artifacts\$artifactName-winget.log"
    throw "Install failed with exit code $($installer.ExitCode)"
}

asa collect --runid installed $analyzerArgs
asa export-collect --firstrunid baseline --secondrunid installed --outputsarif
Move-Item baseline_vs_installed_summary.sarif "$artifacts\$artifactName-asa.sarif" -Force

$shortcut = @(
    "$env:PUBLIC\Desktop",
    "$env:USERPROFILE\Desktop",
    "$env:ProgramData\Microsoft\Windows\Start Menu\Programs",
    "$env:APPDATA\Microsoft\Windows\Start Menu\Programs"
) | Get-ChildItem -Filter *.lnk -Recurse | Where-Object LastWriteTime -gt $installStart | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if ($shortcut) {
    $app = Start-Process $shortcut.FullName -PassThru
    Start-Sleep 10
    Take-Screenshot "$artifacts\$artifactName.png"
    Stop-Process -Id $app.Id
}
