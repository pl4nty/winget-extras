param(
    [string]$PackageId = $env:PACKAGE_ID,
    [string]$Version = $env:VERSION,
    [string[]]$ChangedPaths = @(),
    [string]$OutputPath = $env:GITHUB_OUTPUT
)

$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $true
Import-Module "$PSScriptRoot/Logging.psm1"

$packages = @(if ($PackageId) {
    if (-not $Version) { throw 'Version is required when PackageId is supplied' }
    $relativePath = "$($PackageId.Substring(0, 1).ToLowerInvariant())/$($PackageId.Replace('.', '/'))/$Version"
    if (Test-Path "fonts/$relativePath") { "fonts/$relativePath" } else { "manifests/$relativePath" }
}
else {
    if ($env:CHANGED -and -not $PSBoundParameters.ContainsKey('ChangedPaths')) {
        $ChangedPaths = $env:CHANGED | ConvertFrom-Json
    }
    $ChangedPaths | Select-Object -Unique | Where-Object { Test-Path $_ }
})

$files = @($packages | ForEach-Object {
    Get-ChildItem -LiteralPath $_ -Filter '*.installer.yaml' -File | Resolve-Path -Relative
})
$json = if ($files.Count) {
    # Keep the first variant for each selection so jobs cannot cancel each other.
    & yq eval-all -o=json -I=0 @'
[. as $manifest | .Installers[] | {
  "path": filename,
  "id": $manifest.PackageIdentifier,
  "version": $manifest.PackageVersion,
  "arch": .Architecture,
  "scope": (.Scope // $manifest.Scope // null),
  "type": (.InstallerType // $manifest.InstallerType // null)
}] | unique_by([.path, .arch, .scope, .type])
'@ @files
}
else { '[]' }

if ($OutputPath) {
    $installers = @($json | ConvertFrom-Json)
    Write-CILog "Selected $($installers.Count) installer jobs from $($files.Count) manifests"
    foreach ($installer in $installers) {
        Write-CILog "$($installer.id) $($installer.version) | $($installer.arch) | $($installer.scope ?? 'default') | $($installer.type ?? 'default')" -Level Detail
    }
    "installers=$json" >> $OutputPath
}
else { $json }
