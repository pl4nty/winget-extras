param(
    [Parameter(Mandatory)][string]$Name,
    [ValidateRange(1, 10)][int]$Attempts = 5
)
Import-Module "$PSScriptRoot/Logging.psm1"

# PSGallery intermittently can't find modules, from either a transient search
# failure or a dropped repository registration. Both report "No match was found".
for ($attempt = 1; $attempt -le $Attempts; $attempt++) {
    try {
        if (-not (Get-Module -ListAvailable -Name $Name)) {
            Write-CILog "Install PowerShell module $Name (attempt $attempt/$Attempts)"
            Install-Module $Name -Force -ErrorAction Stop
        }
        Import-Module $Name -ErrorAction Stop
        return
    }
    catch {
        if ($attempt -eq $Attempts) { throw }
        Write-CILog "Failed to install '$Name' (attempt $attempt/$Attempts): $($_.Exception.Message)" -Level Warning
        if (-not (Get-PSRepository -Name PSGallery -ErrorAction SilentlyContinue)) {
            Register-PSRepository -Default -ErrorAction SilentlyContinue
        }
        Start-Sleep -Seconds ([Math]::Pow(2, $attempt))
    }
}
