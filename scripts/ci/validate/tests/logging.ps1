$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $true
Import-Module "$PSScriptRoot/../Logging.psm1"

function Assert([bool]$Condition, [string]$Message) {
    if (-not $Condition) { throw $Message }
}

$savedActions = $env:GITHUB_ACTIONS
$savedNoColor = $env:NO_COLOR
try {
    $env:GITHUB_ACTIONS = 'true'
    $env:NO_COLOR = $null
    $records = @(Write-CILog 'Set up WinGet' 6>&1)
    Assert ($records.Count -eq 1 -and $records[0].ToString().Contains($PSStyle.Foreground.Blue)) 'CI headings must use ANSI colors'
    $records = @(Write-CILog 'winget install --verbose --manifest "package"' -Level Command 6>&1)
    Assert ($records[0].ToString() -eq "$($PSStyle.Foreground.BrightBlack)`$ winget install --verbose --manifest `"package`"$($PSStyle.Reset)") 'Commands must be gray with an unindented dollar prompt'
    $records = @(Write-CILog "Failed 50%`r`n::endgroup::" -Level Error 6>&1)
    Assert ($records[-1].ToString() -eq '::error::Failed 50%25%0D%0A::endgroup::') 'Annotations must be plain and escape command data'
    Assert (-not $records[0].ToString().Contains("`n")) 'A log message must not inject another workflow command'

    $env:NO_COLOR = '1'
    $records = @(Write-CILog 'Installed successfully' -Level Success 6>&1)
    Assert (-not $records[0].ToString().Contains([char]27)) 'NO_COLOR must disable ANSI decorations'

    $records = @(Invoke-CIStep 'Successful phase' { 'result' } -Command 'winget install' 6>&1)
    $values = @($records | Where-Object { $_ -is [string] })
    Assert ($values.Count -eq 1 -and $values[0] -eq 'result') 'Phase logging must preserve return values without mixing log messages into the success stream'
    Assert ($records[1].ToString() -eq '$ winget install' -and $records[2].ToString() -eq '::group::Details') 'Commands must appear before the Details dropdown'
    Assert ($records[-1].ToString() -eq '::endgroup::') 'A successful phase must close its group after reporting completion'
    Assert ($records[-2].ToString() -like '*Completed Successful phase in*') 'A successful phase must report its elapsed time inside Details'
    $records = @(Write-CILog 'Outside dropdown' -Level Detail 6>&1)
    Assert ($records[0].ToString() -eq 'Outside dropdown') 'Details outside dropdowns must not be indented'
    $records = @(Invoke-CIStep 'Outer phase' {
        Write-CILog 'Outer detail' -Level Detail
        Invoke-CIStep 'Inner phase' { Write-CILog 'Inner detail' -Level Detail }
        Write-CILog 'Outer detail after inner phase' -Level Detail
    } 6>&1)
    foreach ($message in 'Outer detail', 'Inner detail', 'Outer detail after inner phase') {
        Assert (@($records | Where-Object { $_.ToString() -eq "    $message" }).Count -eq 1) 'Details must stay indented inside nested dropdowns'
    }
    $records = @(Write-CILog 'After dropdown' -Level Detail 6>&1)
    Assert ($records[0].ToString() -eq 'After dropdown') 'Closing dropdowns must restore unindented details'

    $parallelValue = 'parallel result'
    $values = @(Invoke-CIStep 'Parallel phase' {
        1, 2 | ForEach-Object -Parallel { $using:parallelValue }
    } 6> $null)
    Assert ($values.Count -eq 2 -and $values[0] -eq $parallelValue -and $values[1] -eq $parallelValue) 'Phase wrappers must preserve caller variables in parallel work'

    $records = [Collections.Generic.List[object]]::new()
    $failure = $null
    try {
        Invoke-CIStep 'Failed phase' { throw 'original failure' } 6>&1 | ForEach-Object { $records.Add($_) }
    }
    catch { $failure = $_.Exception.Message }
    Assert ($failure -eq 'original failure') 'Phase logging must rethrow the original error'
    Assert ($records[-1].ToString() -eq '::endgroup::') 'Failed phases must close their log group'
    Assert (@($records | Where-Object { $_.ToString() -like '::error::*original failure*' }).Count -eq 1) 'Failed phases must emit one error annotation'
    Assert (@($records | Where-Object { $_.ToString() -like '*Completed Failed phase*' }).Count -eq 0) 'Failed phases must not report successful completion'
    $records = @(Write-CILog 'After failure' -Level Detail 6>&1)
    Assert ($records[0].ToString() -eq 'After failure') 'Failed dropdowns must restore unindented details'

    $failure = $null
    try { Invoke-CIStep 'Native command' { & pwsh -NoProfile -Command 'exit 7' } 6> $null }
    catch { $failure = $_ }
    Assert ([bool]$failure) 'Nonzero native command exits must still fail the phase'

    $env:GITHUB_ACTIONS = 'false'
    $records = @(Invoke-CIStep 'Local phase' { Write-CILog 'Local detail' -Level Detail } 6>&1)
    Assert (@($records | Where-Object { $_.ToString() -eq 'Local detail' }).Count -eq 1) 'Local phases without dropdowns must not indent details'
    $records = @(Write-CILog 'Local warning' -Level Warning 6>&1)
    Assert ($records.Count -eq 1) 'Local logs must not include workflow annotations'
    Write-Host 'CI logging tests passed'
}
finally {
    $env:GITHUB_ACTIONS = $savedActions
    $env:NO_COLOR = $savedNoColor
}
