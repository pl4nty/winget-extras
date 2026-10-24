$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $true

$tempRoot = if ($env:RUNNER_TEMP) { $env:RUNNER_TEMP } else { [IO.Path]::GetTempPath() }
$tempManifests = Join-Path $tempRoot 'manifests'
$tempDependencies = Join-Path $tempRoot 'winget-dependencies'

Remove-Item $tempManifests, $tempDependencies -Recurse -Force -ErrorAction SilentlyContinue
New-Item $tempManifests, $tempDependencies -ItemType Directory -Force | Out-Null
# ensure the merged-manifests artifact is never empty, even before any packages exist
New-Item (Join-Path $tempManifests '.keep') -ItemType File | Out-Null

$manifestRoots = @(@('manifests', 'fonts') | Where-Object { Test-Path $_ })

# winget can't resolve dependencies across sources (microsoft/winget-cli#3271), so
# copy each declared winget-pkgs dependency in to be merged alongside our packages.
$installerFiles = @(git ls-files -- 'manifests/*.installer.yaml' 'fonts/*.installer.yaml')
$dependencies = @(
  if ($installerFiles) {
    & yq ea @'
[.]
| map((.Dependencies, .Installers[].Dependencies).PackageDependencies[].PackageIdentifier)
| flatten
| map(select(. != null))
| unique
| .[]
'@ @installerFiles
  }
)

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
  # Fetch everything through two GraphQL queries pinned to one winget-pkgs commit.
  # Per-file downloads hit rate limits on raw.githubusercontent.com and
  # intermittent 403s on jsDelivr.
  $invokeGraphQL = {
    param([string]$Query)
    gh api graphql -f "query=$Query" --jq '.data.repository.object' | ConvertFrom-Json
  }

  $fields = for ($index = 0; $index -lt $missingDependencies.Count; $index++) {
    "d${index}: file(path: $($missingDependencies[$index].Path | ConvertTo-Json)) { object { ... on Tree { entries { name type object { ... on Tree { entries { name type } } } } } } }"
  }
  $commit = & $invokeGraphQL @"
{ repository(owner: "microsoft", name: "winget-pkgs") { object(expression: "master") { ... on Commit { oid
$($fields -join "`n")
} } } }
"@

  $downloads = @(for ($index = 0; $index -lt $missingDependencies.Count; $index++) {
    $item = $missingDependencies[$index]
    # A package path may also contain child packages. Version manifests are YAML
    # files exactly one directory below the requested PackageIdentifier.
    $manifests = @(
      foreach ($versionEntry in $commit."d$index".object.entries) {
        if ($versionEntry.type -ne 'tree') {
          continue
        }
        foreach ($entry in $versionEntry.object.entries) {
          if ($entry.type -eq 'blob' -and $entry.name -like '*.yaml') {
            [pscustomobject]@{
              Version = $versionEntry.name
              Name    = $entry.name
            }
          }
        }
      }
    )
    $version = $manifests |
    Where-Object Name -eq "$($item.Dependency).yaml" |
    Select-Object -ExpandProperty Version |
    & sort --version-sort |
    Select-Object -Last 1
    if (-not $version) {
      throw "No version found for dependency $($item.Dependency)"
    }

    $manifests | Where-Object Version -eq $version | ForEach-Object {
      "$($item.Path)/$version/$($_.Name)"
    }
  })

  $fields = for ($index = 0; $index -lt $downloads.Count; $index++) {
    "f${index}: file(path: $($downloads[$index] | ConvertTo-Json)) { object { ... on Blob { text isBinary isTruncated } } }"
  }
  $files = & $invokeGraphQL @"
{ repository(owner: "microsoft", name: "winget-pkgs") { object(oid: "$($commit.oid)") { ... on Commit {
$($fields -join "`n")
} } } }
"@

  for ($index = 0; $index -lt $downloads.Count; $index++) {
    $blob = $files."f$index".object
    if (-not $blob -or $blob.isBinary -or $blob.isTruncated) {
      throw "Failed to download dependency manifest $($downloads[$index])"
    }
    $destination = Join-Path $tempDependencies $downloads[$index]
    New-Item (Split-Path $destination) -ItemType Directory -Force | Out-Null
    [IO.File]::WriteAllText($destination, $blob.text)
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
$splitExpression = 'strenv(TMP_MANIFESTS) + "/" + .PackageIdentifier + "-" + (.PackageVersion | tostring) + ".yaml"'
$packageGroups = @(
  Get-ChildItem ($manifestRoots + $tempDependencies) -Filter '*.yaml' -File -Recurse |
  Group-Object DirectoryName
)

if (-not $packageGroups) {
  Write-Host 'No manifests found, nothing to merge'
  return
}

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
