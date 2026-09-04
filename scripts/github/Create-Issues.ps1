$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $scriptDir "Common.ps1")

$backlogPath = if ($args.Count -gt 0) { $args[0] } else { "$PSScriptRoot/../backlog/issues.json" }

if (-not (Test-Path $backlogPath)) {
    throw "No existe el archivo del backlog: $backlogPath"
}

$items = Get-Content -Path $backlogPath -Raw | ConvertFrom-Json

foreach ($item in $items) {
    $payload = [ordered]@{
        title = $item.title
        body  = $item.body
        labels = @($item.labels)
    } | ConvertTo-Json -Compress

    Write-Host "Creando issue: $($item.title)"
    Invoke-GitHubApi -Method "POST" -Path "repos/$Owner/$Repo/issues" -Body $payload | Out-Null
}