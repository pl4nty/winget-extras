param(
    [Parameter(Mandatory)][string]$Name,
    [int]$Attempts = 5
)

# PSGallery intermittently can't find modules, from either a transient search
# failure or a dropped repository registration. Both report "No match was found".
for ($attempt = 1; $attempt -le $Attempts; $attempt++) {
    if (Get-Module -ListAvailable -Name $Name) { return }
    try {
        Install-Module $Name -Force -ErrorAction Stop
    }
    catch {
        if ($attempt -eq $Attempts) { throw }
        Write-Host "::warning::Failed to install '$Name' (attempt $attempt/$Attempts): $($_.Exception.Message)"
        if (-not (Get-PSRepository -Name PSGallery -ErrorAction SilentlyContinue)) {
            Register-PSRepository -Default -ErrorAction SilentlyContinue
        }
        Start-Sleep -Seconds ([Math]::Pow(2, $attempt))
    }
}
if (-not (Get-Module -ListAvailable -Name $Name)) { throw "Failed to install '$Name'" }
