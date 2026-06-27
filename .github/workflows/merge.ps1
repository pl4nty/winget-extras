$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $true

$tempRoot = if ($env:RUNNER_TEMP) { $env:RUNNER_TEMP } else { [IO.Path]::GetTempPath() }
$tempManifests = Join-Path $tempRoot 'manifests'
$tempDependencies = Join-Path $tempRoot 'winget-extras-dependencies'

Remove-Item $tempManifests, $tempDependencies -Recurse -Force -ErrorAction SilentlyContinue
New-Item $tempManifests, $tempDependencies -ItemType Directory -Force | Out-Null

# winget can't resolve dependencies across sources (microsoft/winget-cli#3271), so
# copy each declared winget-pkgs dependency in to be merged alongside our packages.
$installerFiles = @(git ls-files -- 'manifests/*.installer.yaml' 'fonts/*.installer.yaml')
$dependencies = @(
  & yq ea @'
[.]
| map((.Dependencies, .Installers[].Dependencies).PackageDependencies[].PackageIdentifier)
| flatten
| map(select(. != null))
| unique
| .[]
'@ @installerFiles
)

$token = $env:GH_TOKEN
if (-not $token) {
  $token = & gh auth token
  if ($LASTEXITCODE -ne 0) {
    throw 'GitHub authentication is required to resolve dependencies'
  }
}

$missingDependencies = @(
  foreach ($dependency in $dependencies) {
    $first = $dependency.Substring(0, 1).ToLowerInvariant()
    $path = "manifests/$first/$($dependency.Replace('.', '/'))"
    $fontPath = $path -replace '^manifests', 'fonts'

    $existingManifest = Get-ChildItem $path, $fontPath -Filter "$dependency.yaml" -File -Recurse -ErrorAction SilentlyContinue |
    Select-Object -First 1
    if ($existingManifest) {
      continue
    }

    [pscustomobject]@{
      Dependency = $dependency
      Path       = $path
    }
  }
)

if ($missingDependencies) {
  $headers = @{
    Accept                 = 'application/vnd.github+json'
    Authorization          = "Bearer $token"
    'User-Agent'           = 'winget-extras'
    'X-GitHub-Api-Version' = '2026-03-10'
  }

  $missingDependencies | ForEach-Object -ThrottleLimit 8 -Parallel {
    $ErrorActionPreference = 'Stop'
    $item = $_
    $encodePath = {
      param([string]$Path)
      ($Path.Split('/') | ForEach-Object { [Uri]::EscapeDataString($_) }) -join '/'
    }

    $apiBase = 'https://api.github.com/repos/microsoft/winget-pkgs/contents'
    $versions = Invoke-RestMethod `
      -Headers $using:headers `
      -Uri "$apiBase/$(& $encodePath $item.Path)"
    $version = $versions |
    Where-Object type -eq 'dir' |
    Select-Object -ExpandProperty name |
    & sort --version-sort |
    Select-Object -Last 1
    if (-not $version) {
      throw "No version found for dependency $($item.Dependency)"
    }

    $path = "$($item.Path)/$version"
    $files = Invoke-RestMethod `
      -Headers $using:headers `
      -Uri "$apiBase/$(& $encodePath $path)" |
    Where-Object { $_.type -eq 'file' -and $_.name -like '*.yaml' }
    $destination = Join-Path $using:tempDependencies $path
    New-Item $destination -ItemType Directory -Force | Out-Null

    $curlArguments = @('--fail', '--silent', '--show-error', '--location', '--parallel')
    foreach ($file in $files) {
      $uri = "https://raw.githubusercontent.com/microsoft/winget-pkgs/refs/heads/master/$(& $encodePath "$path/$($file.name)")"
      $curlArguments += @('--output', (Join-Path $destination $file.name), $uri)
    }
    & curl @curlArguments
  }
}

$yqExpression = @'
[.]
| group_by(.PackageIdentifier + "\u0000" + .PackageVersion)[]
| . as $docs
| ($docs | map(select(.ManifestType != "locale")) | .[] as $item ireduce ({}; . * $item))
| .Localization = ($docs | map(select(.ManifestType == "locale") | del(.PackageIdentifier, .PackageVersion, .ManifestType, .ManifestVersion)))
| del(.Localization | select(length == 0))
| .ManifestType = "merged"
| sort_keys(..)
| ... comments=""
'@

$normalizedTempManifests = $tempManifests.Replace('\', '/')
$env:TMP_MANIFESTS = $normalizedTempManifests
$splitExpression = 'strenv(TMP_MANIFESTS) + "/" + .PackageIdentifier + "-" + .PackageVersion + ".yaml"'
$packageGroups = @(
  Get-ChildItem manifests, fonts, $tempDependencies -Filter '*.yaml' -File -Recurse |
  Group-Object DirectoryName
)

$workerCount = [Math]::Min([Environment]::ProcessorCount, $packageGroups.Count)
$shards = [object[]]::new($workerCount)
for ($worker = 0; $worker -lt $workerCount; $worker++) {
  $shards[$worker] = [Collections.Generic.List[string]]::new()
}
for ($index = 0; $index -lt $packageGroups.Count; $index++) {
  $shards[$index % $workerCount].AddRange(
    [string[]]$packageGroups[$index].Group.FullName
  )
}

$shards | ForEach-Object -ThrottleLimit $workerCount -Parallel {
  $env:TMP_MANIFESTS = $using:normalizedTempManifests
  $files = @($_)
  & yq ea --split-exp $using:splitExpression $using:yqExpression @files
}
