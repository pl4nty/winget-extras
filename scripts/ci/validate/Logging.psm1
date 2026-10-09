$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $true
$script:GroupDepth = 0

function ConvertTo-CICommandData([string]$Message) {
    $Message.Replace('%', '%25').Replace("`r", '%0D').Replace("`n", '%0A')
}

function Write-CILog {
    param(
        [Parameter(Mandatory)][string]$Message,
        [ValidateSet('Info', 'Success', 'Completed', 'Warning', 'Error', 'Detail', 'Command')][string]$Level = 'Info'
    )

    $color = ''
    $reset = ''
    if (-not (Test-Path Env:NO_COLOR) -and ($env:GITHUB_ACTIONS -eq 'true' -or $Host.UI.SupportsVirtualTerminal)) {
        $color = switch ($Level) {
            Info { $PSStyle.Bold + $PSStyle.Foreground.Blue }
            Success { $PSStyle.Foreground.Green }
            Completed { $PSStyle.Foreground.Magenta }
            Warning { $PSStyle.Foreground.Yellow }
            Error { $PSStyle.Foreground.BrightRed }
            Detail { $PSStyle.Dim }
            Command { $PSStyle.Foreground.BrightBlack }
        }
        $reset = $PSStyle.Reset
    }
    $prefix = switch ($Level) {
        Warning { '==> Warning: ' }
        Error { '==> Error: ' }
        Detail { if ($script:GroupDepth -gt 0) { '    ' } else { '' } }
        Command { '$ ' }
        default { '==> ' }
    }
    $displayMessage = $Message.Replace("`r", '').Replace("`n", ' ')
    Write-Host "$color$prefix$displayMessage$reset"
    if ($env:GITHUB_ACTIONS -eq 'true' -and $Level -in 'Warning', 'Error') {
        Write-Host "::$($Level.ToLowerInvariant())::$(ConvertTo-CICommandData $Message)"
    }
}

function Invoke-CIStep([string]$Title, [scriptblock]$Action, [string]$Command) {
    Write-CILog $Title
    if ($Command) { Write-CILog $Command -Level Command }
    $githubActions = $env:GITHUB_ACTIONS -eq 'true'
    if ($githubActions) {
        Write-Host '::group::Details'
        $script:GroupDepth++
    }
    $timer = [Diagnostics.Stopwatch]::StartNew()
    try {
        & $Action
        $timer.Stop()
        Write-CILog "Completed $Title in $($timer.Elapsed.ToString('m\:ss'))" -Level Completed
    }
    catch {
        Write-CILog "Failed $Title after $($timer.Elapsed.ToString('m\:ss')): $($_.Exception.Message)" -Level Error
        throw
    }
    finally {
        $timer.Stop()
        if ($githubActions) {
            $script:GroupDepth--
            Write-Host '::endgroup::'
        }
    }
}

Export-ModuleMember -Function Write-CILog, Invoke-CIStep
