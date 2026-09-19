$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $true
$mergeTimer = [Diagnostics.Stopwatch]::StartNew()
Write-Host "Merge started: PowerShell $($PSVersionTable.PSVersion), $([Environment]::ProcessorCount) CPUs, $([Runtime.InteropServices.RuntimeInformation]::ProcessArchitecture)"

$tempRoot = if ($env:RUNNER_TEMP) { $env:RUNNER_TEMP } else { [IO.Path]::GetTempPath() }
$tempManifests = Join-Path $tempRoot 'manifests'
$tempDependencies = Join-Path $tempRoot 'winget-extras-dependencies'

Remove-Item $tempManifests, $tempDependencies -Recurse -Force -ErrorAction SilentlyContinue
New-Item $tempManifests, $tempDependencies -ItemType Directory -Force | Out-Null

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

function Start-ManifestMerge {
  param(
    [IO.FileInfo[]]$Files,
    [string]$Destination,
    [Collections.Generic.List[Diagnostics.Process]]$Processes
  )

  $groups = [Collections.Generic.Dictionary[string, Collections.Generic.List[string]]]::new([StringComparer]::Ordinal)
  foreach ($file in $Files) {
    if (-not $groups.ContainsKey($file.DirectoryName)) {
      $groups[$file.DirectoryName] = [Collections.Generic.List[string]]::new()
    }
    $groups[$file.DirectoryName].Add($file.FullName)
  }
  if (-not $groups.Count) {
    return
  }

  $workerCount = [Math]::Min([Environment]::ProcessorCount, $groups.Count)
  $shards = [object[]]::new($workerCount)
  for ($worker = 0; $worker -lt $workerCount; $worker++) {
    $shards[$worker] = [Collections.Generic.List[string]]::new()
  }
  $index = 0
  foreach ($group in $groups.Values) {
    # Directory enumeration is unsorted; preserve deterministic document order.
    $group.Sort([StringComparer]::Ordinal)
    $shards[$index++ % $workerCount].AddRange($group)
  }

  $splitExpression = 'strenv(TMP_MANIFESTS) + "/" + .PackageIdentifier + "-" + (.PackageVersion | tostring) + ".yaml"'
  foreach ($shard in $shards) {
    # yq already runs in a separate process, so no PowerShell worker is needed.
    $startInfo = [Diagnostics.ProcessStartInfo]::new('yq')
    $startInfo.UseShellExecute = $false
    $startInfo.WorkingDirectory = $PWD.ProviderPath
    $startInfo.Environment['TMP_MANIFESTS'] = $Destination.Replace('\', '/')
    foreach ($argument in @('ea', '--split-exp', $splitExpression, $yqExpression)) {
      $startInfo.ArgumentList.Add($argument)
    }
    foreach ($file in $shard) {
      $startInfo.ArgumentList.Add($file)
    }
    $Processes.Add([Diagnostics.Process]::Start($startInfo))
  }
}

# winget can't resolve dependencies across sources (microsoft/winget-cli#3271), so
# copy each declared winget-pkgs dependency in to be merged alongside our packages.
$installerFiles = @(git ls-files -- 'manifests/*.installer.yaml' 'fonts/*.installer.yaml')
$dependencies = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
if ($installerFiles.Count) {
  # Stream one document at a time rather than retaining every installer in yq.
  & yq e -N '(.Dependencies, .Installers[].Dependencies).PackageDependencies[].PackageIdentifier | select(. != null)' @installerFiles |
  ForEach-Object { [void]$dependencies.Add($_) }
}

$localFiles = @(
  foreach ($root in 'manifests', 'fonts') {
    [IO.DirectoryInfo]::new((Join-Path $PWD $root)).EnumerateFiles('*.yaml', [IO.SearchOption]::AllDirectories)
  }
)
$localManifestNames = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
foreach ($file in $localFiles) {
  [void]$localManifestNames.Add($file.Name)
}
$missingDependencies = @(
  foreach ($dependency in $dependencies) {
    $first = $dependency.Substring(0, 1).ToLowerInvariant()
    $path = "manifests/$first/$($dependency.Replace('.', '/'))"
    if ($localManifestNames.Contains("$dependency.yaml")) {
      continue
    }

    [pscustomobject]@{
      Dependency = $dependency
      Path       = $path
    }
  }
)

$mergeProcesses = [Collections.Generic.List[Diagnostics.Process]]::new()
Write-Host ('Discovery: {0:F3}s ({1} local files, {2} upstream dependencies)' -f $mergeTimer.Elapsed.TotalSeconds, $localFiles.Count, $missingDependencies.Count)
try {
  # Local packages and upstream dependencies have disjoint identifiers. Merge
  # local files while dependency discovery and downloads are in flight.
  Start-ManifestMerge -Files $localFiles -Destination $tempManifests -Processes $mergeProcesses
  Write-Host ('Local merges started: {0:F3}s' -f $mergeTimer.Elapsed.TotalSeconds)

  if ($missingDependencies) {
    $token = $env:GH_TOKEN
    if (-not $token) {
      $token = & gh auth token
      if ($LASTEXITCODE -ne 0) {
        throw 'GitHub authentication is required to resolve dependencies'
      }
    }

    # Multiplex requests over HTTP/2 and decompress large manifest trees.
    # Separate clients keep the GitHub token off CDN requests; connection limits
    # still apply when a server falls back to HTTP/1.1.
    $apiHandler = [Net.Http.HttpClientHandler]::new()
    $apiHandler.MaxConnectionsPerServer = 8
    $apiHandler.AutomaticDecompression = [Net.DecompressionMethods]::All
    $apiClient = [Net.Http.HttpClient]::new($apiHandler)
    $apiClient.DefaultRequestVersion = [Version]::new(2, 0)
    $apiClient.DefaultRequestHeaders.Add('Accept', 'application/vnd.github+json')
    $apiClient.DefaultRequestHeaders.Add('Authorization', "Bearer $token")
    $apiClient.DefaultRequestHeaders.Add('User-Agent', 'winget-extras')
    $apiClient.DefaultRequestHeaders.Add('X-GitHub-Api-Version', '2026-03-10')
    $downloadHandler = [Net.Http.HttpClientHandler]::new()
    $downloadHandler.MaxConnectionsPerServer = 16
    $downloadHandler.AutomaticDecompression = [Net.DecompressionMethods]::All
    $downloadClient = [Net.Http.HttpClient]::new($downloadHandler)
    $downloadClient.DefaultRequestVersion = [Version]::new(2, 0)
    try {
      $requests = [Collections.Generic.List[object]]::new()
      $downloads = [Collections.Generic.List[object]]::new()
      foreach ($item in $missingDependencies) {
        $encodedPath = ($item.Path.Split('/') | ForEach-Object { [Uri]::EscapeDataString($_) }) -join '/'
        $requests.Add([pscustomobject]@{
            Item = $item
            EncodedPath = $encodedPath
            Task = $apiClient.GetStringAsync("https://api.github.com/repos/microsoft/winget-pkgs/git/trees/master:${encodedPath}?recursive=1")
          })
      }
      Write-Host ('Tree requests started: {0:F3}s' -f $mergeTimer.Elapsed.TotalSeconds)

      while ($requests.Count) {
        # Start file downloads as soon as any tree arrives, without waiting for
        # slower packages or occupying a PowerShell runspace during network I/O.
        $index = [Threading.Tasks.Task]::WaitAny([Threading.Tasks.Task[]]$requests.Task)
        $request = $requests[$index]
        $requests.RemoveAt($index)
        $item = $request.Item
        try {
          $tree = $request.Task.GetAwaiter().GetResult() | ConvertFrom-Json -AsHashtable
        } catch {
          throw "Failed to resolve dependency $($item.Dependency): $_"
        }
        if ($tree.truncated) {
          throw "Manifest tree was truncated for dependency $($item.Dependency)"
        }

        # A package path may also contain child packages. Version manifests are
        # YAML files exactly one directory below the requested PackageIdentifier.
        $manifests = @(
          foreach ($entry in $tree.tree) {
            $segments = $entry.path.Split('/')
            if ($entry.type -eq 'blob' -and $segments.Count -eq 2 -and $segments[1] -like '*.yaml') {
              [pscustomobject]@{
                Version = $segments[0]
                Name    = $segments[1]
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

        $files = $manifests |
        Where-Object Version -eq $version |
        Select-Object -ExpandProperty Name
        $destination = Join-Path $tempDependencies "$($item.Path)/$version"
        [void][IO.Directory]::CreateDirectory($destination)

        foreach ($file in $files) {
          $uri = "https://cdn.jsdelivr.net/gh/microsoft/winget-pkgs@master/$($request.EncodedPath)/$([Uri]::EscapeDataString($version))/$([Uri]::EscapeDataString($file))"
          $downloads.Add([pscustomobject]@{
              Path = Join-Path $destination $file
              Uri = $uri
              Task = $downloadClient.GetByteArrayAsync($uri)
            })
        }
      }
      Write-Host ('Trees resolved: {0:F3}s ({1} files queued); local merges finished: {2}' -f $mergeTimer.Elapsed.TotalSeconds, $downloads.Count, @($mergeProcesses | Where-Object HasExited).Count)
      $maxDownloadAttempts = 4
      $pendingDownloads = $downloads
      for ($attempt = 1; $pendingDownloads.Count; $attempt++) {
        $retries = [Collections.Generic.List[object]]::new()
        foreach ($download in $pendingDownloads) {
          try {
            $contents = $download.Task.GetAwaiter().GetResult()
          } catch {
            # Retry every HTTP status and transport error, including timeouts.
            if ($attempt -ge $maxDownloadAttempts) {
              throw "Failed to download $($download.Uri) after $attempt attempts: $_"
            }
            Write-Warning "Download failed (attempt $attempt/$maxDownloadAttempts), retrying $($download.Uri): $_"
            $retries.Add($download)
            continue
          }
          [IO.File]::WriteAllBytes($download.Path, $contents)
        }
        if ($retries.Count) {
          # Back off once per round (1, 2, 4 seconds), then retry failed files
          # concurrently using the same connection pool. Keep successful files.
          Start-Sleep -Seconds ([Math]::Pow(2, $attempt - 1))
          foreach ($download in $retries) {
            $download.Task = $downloadClient.GetByteArrayAsync($download.Uri)
          }
        }
        $pendingDownloads = $retries
      }
    } finally {
      $apiClient.Dispose()
      $downloadClient.Dispose()
    }
  }
  Write-Host ('Downloads complete: {0:F3}s; local merges finished: {1}' -f $mergeTimer.Elapsed.TotalSeconds, @($mergeProcesses | Where-Object HasExited).Count)

  $dependencyFiles = @([IO.DirectoryInfo]::new($tempDependencies).EnumerateFiles('*.yaml', [IO.SearchOption]::AllDirectories))
  Start-ManifestMerge -Files $dependencyFiles -Destination $tempManifests -Processes $mergeProcesses

  foreach ($process in $mergeProcesses) {
    $process.WaitForExit()
    if ($process.ExitCode -ne 0) {
      throw "yq merge failed with exit code $($process.ExitCode)"
    }
  }
  Write-Host ('Merge complete: {0:F3}s' -f $mergeTimer.Elapsed.TotalSeconds)
} finally {
  # Also stop outstanding merges if dependency resolution or another yq fails.
  foreach ($process in $mergeProcesses) {
    if (-not $process.HasExited) {
      $process.Kill($true)
      $process.WaitForExit()
    }
    $process.Dispose()
  }
}
