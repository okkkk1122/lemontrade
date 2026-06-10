#!/usr/bin/env sh
# Backup PostgreSQL from Docker — run from project root
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="$ROOT/backups"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="$BACKUP_DIR/limootrade-$STAMP.sql"

mkdir -p "$BACKUP_DIR"

if ! docker ps --format '{{.Names}}' | grep -q '^limootrade-db$'; then
  echo "Container limootrade-db is not running. Start with: docker compose up -d" >&2
  exit 1
fi

docker exec limootrade-db pg_dump -U limootrade limootrade > "$OUT"
echo "Backup saved: $OUT"
