$ErrorActionPreference = 'Stop'
& "$PSScriptRoot/logging.ps1"

function Assert([bool]$Condition, [string]$Message) {
    if (-not $Condition) { throw $Message }
}

$fixtureRoot = Join-Path ([IO.Path]::GetTempPath()) "winget-extras-ci-$([guid]::NewGuid())"
New-Item $fixtureRoot -ItemType Directory | Out-Null
Push-Location $fixtureRoot
try {
    $packagePath = 'manifests/t/Test/App/1.0'
    $fontPath = 'fonts/t/Test/Font/1.0'
    New-Item $packagePath, $fontPath -ItemType Directory -Force | Out-Null
    @'
PackageIdentifier: Test.App
PackageVersion: '1.0'
InstallerType: exe
Scope: machine
Installers:
  - Architecture: x64
    InstallerLocale: en-US
  - Architecture: x64
    InstallerLocale: fr-FR
  - Architecture: x64
    Scope: user
  - Architecture: arm64
    InstallerType: msi
'@ | Set-Content "$packagePath/Test.App.installer.yaml"
    @'
PackageIdentifier: Test.Font
PackageVersion: '1.0'
InstallerType: font
Installers:
  - Architecture: neutral
'@ | Set-Content "$fontPath/Test.Font.installer.yaml"

    $matrixScript = "$PSScriptRoot/../matrix.ps1"
    $json = & $matrixScript -PackageId '' -ChangedPaths @($packagePath, $packagePath, 'deleted-package') -OutputPath ''
    $matrix = @($json | ConvertFrom-Json)
    Assert ($matrix.Count -eq 3) 'Duplicate paths and locale variants must produce only one job per selection'
    Assert (@($matrix | Where-Object { $_.id -ne 'Test.App' -or $_.version -ne '1.0' }).Count -eq 0) 'Job names must have the package ID and version without needing the manifest path'
    Assert (@($matrix | Where-Object { $_.arch -eq 'x64' -and $_.scope -eq 'machine' -and $_.type -eq 'exe' }).Count -eq 1) 'Root scope and installer type must be inherited'
    Assert (@($matrix | Where-Object { $_.arch -eq 'x64' -and $_.scope -eq 'user' }).Count -eq 1) 'Installer scope must override root scope'
    Assert (@($matrix | Where-Object { $_.arch -eq 'arm64' -and $_.type -eq 'msi' }).Count -eq 1) 'Installer type must override root type'
    Assert (@($matrix | Where-Object { -not (Test-Path -LiteralPath $_.path) }).Count -eq 0) 'Matrix paths must resolve from the repository root'

    $manualJson = & $matrixScript -PackageId Test.App -Version 1.0 -OutputPath ''
    Assert ($manualJson -eq $json) 'Manual package selection must match changed-file selection'
    $savedChanged = $env:CHANGED
    try {
        $env:CHANGED = ConvertTo-Json -InputObject @($packagePath)
        $environmentJson = & $matrixScript -PackageId '' -OutputPath ''
        Assert ($environmentJson -eq $json) 'Workflow environment input must match explicit changed paths'
    }
    finally { $env:CHANGED = $savedChanged }

    $json = & $matrixScript -PackageId Test.Font -Version 1.0 -OutputPath ''
    $matrix = @($json | ConvertFrom-Json)
    Assert ($json.StartsWith('[{') -and $matrix.Count -eq 1) 'A single installer must remain a flat JSON array'
    Assert ($matrix[0].path -like '*fonts*' -and $null -eq $matrix[0].scope) 'Fonts must resolve with an optional scope'
    $json = & $matrixScript -PackageId '' -ChangedPaths @('deleted-package') -OutputPath ''
    Assert ($json -eq '[]') 'Deleted packages must produce an empty JSON array'
    $json = & $matrixScript -PackageId '' -ChangedPaths @() -OutputPath ''
    Assert ($json -eq '[]') 'No changes must produce an empty JSON array'
    & $matrixScript -PackageId Test.Font -Version 1.0 -OutputPath github-output.txt
    Assert ((Get-Content github-output.txt) -match '^installers=\[\{') 'GitHub output must contain a flat installer array'

    $failure = $null
    try { & $matrixScript -PackageId Test.App -Version '' -OutputPath '' }
    catch { $failure = $_.Exception.Message }
    Assert ($failure -like 'Version is required*') 'Manual package selection must require a version'
    $failure = $null
    try { & $matrixScript -PackageId Missing.App -Version 1.0 -OutputPath '' }
    catch { $failure = $_.Exception.Message }
    Assert ([bool]$failure) 'Missing manual package selection must fail'

    & $matrixScript -PackageId '' -ChangedPaths @($packagePath, $fontPath) -OutputPath '' | Set-Content matrix.json
    Write-Host 'Installer matrix tests passed'
    & "$PSScriptRoot/validation.ps1" -FixtureRoot $fixtureRoot
    & "$PSScriptRoot/correlation.ps1" -FixtureRoot $fixtureRoot
}
finally {
    Pop-Location
    Remove-Item $fixtureRoot -Recurse -Force
}
