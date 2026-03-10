#!/usr/bin/env bash
# ============================================================
# SVJ Portál — Záloha databáze
# Použití: bash database/backup.sh
# ============================================================

set -euo pipefail

DB_NAME="svj_portal"
DB_USER="svj_portal"
DB_PASS="svj_portal_dev"
DB_HOST="127.0.0.1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="$SCRIPT_DIR/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILE="$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo ">>> Zálohuji databázi '$DB_NAME'..."
mysqldump \
  -h "$DB_HOST" \
  -u "$DB_USER" \
  -p"$DB_PASS" \
  --single-transaction \
  --routines \
  --triggers \
  "$DB_NAME" | gzip > "$FILE"

echo ">>> Záloha uložena: $FILE"
echo ">>> Velikost: $(du -sh "$FILE" | cut -f1)"

# Ponech jen posledních 10 záloh
echo ">>> Čistím staré zálohy (ponechávám 10 nejnovějších)..."
ls -t "$BACKUP_DIR"/*.sql.gz 2>/dev/null | tail -n +11 | xargs -r rm --
echo "=== Hotovo ==="
