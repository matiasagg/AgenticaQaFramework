$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $scriptDir "Common.ps1")

$labels = @(
    "epic",
    "feature",
    "backend",
    "frontend",
    "sdet",
    "devops",
    "docs",
    "architecture",
    "qa",
    "p0",
    "p1",
    "p2"
)

$existingLabels = gh label list --repo "$Owner/$Repo" --limit 200 --json name --jq ".[].name"

foreach ($label in $labels) {
    if ($existingLabels -contains $label) {
        Write-Host "La label ya existe: $label"
        continue
    }

    Write-Host "Creando label: $label"
    $payload = [ordered]@{
        name  = $label
        color = "1f76ff"
    } | ConvertTo-Json -Compress

    Invoke-GitHubApi -Method "POST" -Path "repos/$Owner/$Repo/labels" -Body $payload | Out-Null
}