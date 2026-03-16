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

$manifest = Get-Content $ManifestPath | ConvertFrom-Yaml

$nameParts = @($manifest.PackageIdentifier, $Arch)
if ($Scope) { $nameParts += $Scope }
if ($InstallerType) { $nameParts += $InstallerType }
$artifactName = $nameParts -join '-'
"artifact_name=$artifactName" >> $env:GITHUB_OUTPUT

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
    "--architecture", $Arch,
    "--log", "$artifacts\$artifactName-installer.log",
    "--silent",
    "--ignore-local-archive-malware-scan", "--accept-package-agreements"
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

$programFilesAfter = Get-ChildItem $env:ProgramFiles -Directory | Select-Object -ExpandProperty FullName
$programFilesx86After = Get-ChildItem ${env:ProgramFiles(x86)} -Directory | Select-Object -ExpandProperty FullName
$analyzerArgs[-1] += ',' + (($programFilesAfter | Where-Object { $_ -notin $programFilesBefore }) -join ',')
$analyzerArgs[-1] += ',' + (($programFilesx86After | Where-Object { $_ -notin $programFilesx86Before }) -join ',')
Write-Host "asa collect --overwrite --runid installed $analyzerArgs"
asa collect --overwrite --runid installed $analyzerArgs
asa export-collect --firstrunid baseline --secondrunid installed --outputsarif
Move-Item baseline_vs_installed_summary.sarif "$artifacts\$artifactName-asa.sarif" -Force

# TODO support InstallerType: portable by passing through executable name?
# TODO validate multiple NestedInstallerFiles
$app = $null
if ($manifest.NestedInstallerType -eq 'portable') {
    $env:PATH = "$([Environment]::GetEnvironmentVariable('PATH', 'Machine'));$([Environment]::GetEnvironmentVariable('PATH', 'User'))"
    $app = Start-Process (Split-Path $manifest.NestedInstallerFiles[0].RelativeFilePath -Leaf) -PassThru
}
else {
    $shortcut = @(
        "$env:PUBLIC\Desktop",
        "$env:USERPROFILE\Desktop",
        "$env:ProgramData\Microsoft\Windows\Start Menu\Programs",
        "$env:APPDATA\Microsoft\Windows\Start Menu\Programs"
    ) | Get-ChildItem -Recurse -Exclude "Uninstall*" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if ($shortcut) {
        Write-Host "Starting $($shortcut.FullName)"
        $app = Start-Process $shortcut.FullName -PassThru
    }
}

if ($app) {
    Start-Sleep 10
    New-Screenshot "$artifacts\$artifactName.png"
    Stop-Process -Id $app.Id
}
