param(
    [Parameter(Mandatory)][string]$Name,
    [int]$Attempts = 5
)

# PSGallery's search API intermittently returns no results, which surfaces as
# "No match was found for the specified search criteria and module name '<name>'"
# and fails the whole job. Retry with backoff instead.
for ($attempt = 1; $attempt -le $Attempts; $attempt++) {
    if (Get-Module -ListAvailable -Name $Name) { return }

    try {
        Install-Module $Name -Force -ErrorAction Stop
        # Install-Package can report the failure as a non-terminating error, so
        # confirm the module actually landed rather than trusting the exit path.
        if (Get-Module -ListAvailable -Name $Name) { return }
        throw "Install-Module reported success but '$Name' is not available"
    }
    catch {
        if ($attempt -eq $Attempts) { throw }
        Write-Host "::warning::Failed to install '$Name' (attempt $attempt/$Attempts): $($_.Exception.Message)"

        # An unregistered PSGallery produces the same error as a transient search
        # failure, so restore the default repositories before retrying.
        if (-not (Get-PSRepository -Name PSGallery -ErrorAction SilentlyContinue)) {
            Register-PSRepository -Default -ErrorAction SilentlyContinue
        }
        Start-Sleep -Seconds ([Math]::Pow(2, $attempt))
    }
}
