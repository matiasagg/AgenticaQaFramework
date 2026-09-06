$Owner = if ($env:OWNER) { $env:OWNER } else { "matiasagg" }
$Repo = if ($env:REPO) { $env:REPO } else { "AgenticaQaFramework" }

function Invoke-GitHubApi {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Method,

        [Parameter(Mandatory = $true)]
        [string]$Path,

        [string]$Body
    )

    if (-not $Body) {
        return gh api --method $Method $Path
    }

    $Body | gh api --method $Method $Path --input -
}

Export-ModuleMember -Function Invoke-GitHubApi