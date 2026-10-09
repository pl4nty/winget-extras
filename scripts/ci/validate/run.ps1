param(
    [Parameter(Mandatory)][string]$ManifestPath,
    [Parameter(Mandatory)][string]$Arch,
    [string]$Scope,
    [string]$InstallerType
)

$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $true

Import-Module "$PSScriptRoot/Validation.psm1"
Import-Module "$PSScriptRoot/Logging.psm1"
Import-Module "$PSScriptRoot/Correlation.psm1"

& "$PSScriptRoot/install-module.ps1" -Name powershell-yaml

$manifest = Get-Content -LiteralPath $ManifestPath -Raw | ConvertFrom-Yaml

$selectedInstaller = $manifest.Installers | Where-Object {
    $_.Architecture -eq $Arch -and
    [string]($_.Scope ?? $manifest.Scope) -eq $Scope -and
    [string]($_.InstallerType ?? $manifest.InstallerType) -eq $InstallerType
} | Select-Object -First 1
if (-not $selectedInstaller) {
    throw "No installer matches architecture '$Arch', scope '$Scope', and type '$InstallerType' in $ManifestPath"
}

$artifacts = "$env:RUNNER_TEMP\artifacts"
New-Item $artifacts -ItemType Directory -Force | Out-Null

$installModes = @($selectedInstaller.InstallModes ?? $manifest.InstallModes)
$expectTimeout = $installModes.Count -eq 1 -and $installModes[0] -eq 'interactive'

$expectSystemNotSupported = @($selectedInstaller.ExpectedReturnCodes) + @($manifest.ExpectedReturnCodes) |
    Where-Object { $_.ReturnResponse -eq 'systemNotSupported' }

$artifactName = @($manifest.PackageIdentifier, $Arch, $Scope, $InstallerType) | Where-Object { $_ } | Join-String -Separator '-'
if ($env:GITHUB_OUTPUT) { "artifact_name=$artifactName" >> $env:GITHUB_OUTPUT }
Write-CILog "Validate $($manifest.PackageIdentifier) $($manifest.PackageVersion)"

$wingetState = "$env:LOCALAPPDATA/Packages/Microsoft.DesktopAppInstaller_8wekyb3d8bbwe/LocalState"
$metadataPath = "$artifacts/$artifactName-metadata.json"
$metadataCollection = $null

try {
    Invoke-CIStep 'Set up WinGet' {
        Initialize-WinGet -StatePath $wingetState -Arch $Arch -Scope $Scope -InstallerType $InstallerType
    }

    $programDirectories = @($env:ProgramFiles, ${env:ProgramFiles(x86)}) | Where-Object { $_ } | Select-Object -Unique
    $programFilesBefore = @($programDirectories | Get-ChildItem -Directory | Select-Object -ExpandProperty FullName)
    $analyzerArgs = @(
        "--all", "--hives", "CurrentUser, LocalMachine",
        "--skip-directories", "$env:LOCALAPPDATA\AzureFunctionsTools",
        "--directories", "$env:USERPROFILE\AppData"
    )

    $wingetArgs = @(
        "install", "--verbose",
        '--manifest', ('"{0}"' -f (Split-Path -LiteralPath (Resolve-Path -LiteralPath $ManifestPath).Path)),
        '--log', ('"{0}"' -f "$artifacts/$artifactName-installer.log"),
        "--ignore-local-archive-malware-scan",
        "--accept-package-agreements", "--accept-source-agreements"
    )
    $wingetArgs += if ($expectTimeout) { '--interactive' } else { '--silent' }

    if (-not (Test-Path asa.sqlite)) {
        Invoke-CIStep 'Collect baseline attack surface' { asa collect --runid baseline $analyzerArgs }
    }
    $metadataCollection = Invoke-CIStep 'Collect baseline installer metadata' {
        Start-InstallerMetadataCollection -ManifestPath $ManifestPath -Manifest $manifest -Entry $selectedInstaller `
            -OutputPath $metadataPath -LogPath "$artifacts/$artifactName-correlation.log"
    }
    $installer = Invoke-Installer $wingetArgs
    if ($installer.HasExited -and $installer.ExitCode -eq -1978334972) {
        # Dependency not found, so try resolving it from our source
        Write-CILog 'Dependency not found; retrying with the winget-extras source' -Level Warning
        winget source add --name winget-extras --type Microsoft.PreIndexed.Package --arg https://winget.tplant.com.au/cache --accept-source-agreements
        winget source remove --name winget
        $installer = Invoke-Installer $wingetArgs
    }
    if (-not $installer.HasExited) {
        Save-InstallerScreenshot "$artifacts\$artifactName.png"
        Stop-Process -Id $installer.Id
        if ($expectTimeout) {
            Write-CILog 'Install timed out as expected for an interactive-only installer' -Level Success
            return
        }
        Write-CILog 'Install timed out after 5 minutes' -Level Error
        throw 'Install timed out'
    }
    if ($expectTimeout) {
        Write-CILog "Interactive-only install exited with code $($installer.ExitCode) instead of timing out" -Level Error
        throw "Interactive-only install exited with code $($installer.ExitCode) instead of timing out"
    }
    if ($installer.ExitCode -ne 0) {
        # APPINSTALLER_CLI_ERROR_INSTALL_SYSTEM_NOT_SUPPORTED
        if ($expectSystemNotSupported -and $installer.ExitCode -eq -1978334957) {
            Write-CILog 'Install reported the system is not supported, as the manifest declares' -Level Success
            return
        }
        Write-CILog "Install failed with exit code $($installer.ExitCode)" -Level Error
        throw "Install failed with exit code $($installer.ExitCode)"
    }
    Write-CILog "Installed $artifactName successfully" -Level Success

    Invoke-CIStep 'Check installed package correlation' {
        Write-CILog 'Wait 5 seconds for installed package registration' -Level Detail
        Start-Sleep -Seconds 5
        if ($metadataCollection) { $metadataCollection.Complete() }
        Test-InstallerMetadata -ManifestPath $ManifestPath -Manifest $manifest -Entry $selectedInstaller -MetadataPath $metadataPath
    }

    $programFilesAdded = $programDirectories | Get-ChildItem -Directory | Select-Object -ExpandProperty FullName | Where-Object { $_ -notin $programFilesBefore }
    $analyzerArgs[-1] = @($analyzerArgs[-1]) + @($programFilesAdded) -join ','
    Invoke-CIStep 'Analyze installed attack surface' {
        asa collect --overwrite --runid installed $analyzerArgs
        asa export-collect --firstrunid baseline --secondrunid installed --outputsarif --filename "$PSScriptRoot\analyses.json"
        Move-Item baseline_vs_installed_summary.sarif "$artifacts\$artifactName-asa.sarif" -Force
    }

    Invoke-CIStep 'Launch app and capture screenshot' {
        Show-InstalledApp -Manifest $manifest -Entry $selectedInstaller -InstallerType $InstallerType -ScreenshotPath "$artifacts/$artifactName.png"
    }
    Write-CILog "Validation passed: $artifactName" -Level Success
}
finally {
    if ($metadataCollection) { $metadataCollection.Dispose() }
    $log = Get-ChildItem "$wingetState/DiagOutputDir" -File -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if ($log) { Copy-Item -LiteralPath $log.FullName "$artifacts/$artifactName-winget.log" }
    Write-ValidationSummary -ArtifactName $artifactName -ArtifactsPath $artifacts
}
