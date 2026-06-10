# Backup PostgreSQL from Docker — run from project root
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$backupDir = Join-Path $root "backups"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$outFile = Join-Path $backupDir "limootrade-$timestamp.sql"

if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir | Out-Null
}

$running = docker ps --filter "name=limootrade-db" --format "{{.Names}}" 2>$null
if (-not $running) {
    Write-Error "Container limootrade-db is not running. Start with: docker compose up -d"
}

docker exec limootrade-db pg_dump -U limootrade limootrade | Out-File -FilePath $outFile -Encoding utf8
Write-Host "Backup saved: $outFile"
