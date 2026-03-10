#!/usr/bin/env bash
# ============================================================
# SVJ Portál — Setup databáze
# Použití: bash database/setup.sh
# ============================================================

set -euo pipefail

DB_NAME="svj_portal"
DB_USER="svj_portal"
DB_PASS="svj_portal_dev"
DB_HOST="127.0.0.1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== SVJ Portál — DB Setup ==="

# --- Root přístup pro vytvoření DB a uživatele ---
echo ""
echo "Zadej heslo MySQL ROOT uživatele (nebo Enter pokud není):"
read -rs MYSQL_ROOT_PASS

MYSQL_ROOT="mysql -h $DB_HOST -u root"
if [ -n "$MYSQL_ROOT_PASS" ]; then
  MYSQL_ROOT="mysql -h $DB_HOST -u root -p$MYSQL_ROOT_PASS"
fi

echo ""
echo ">>> Vytvářím databázi a uživatele..."
$MYSQL_ROOT <<SQL
CREATE DATABASE IF NOT EXISTS \`$DB_NAME\`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_czech_ci;

CREATE USER IF NOT EXISTS '$DB_USER'@'$DB_HOST'
  IDENTIFIED BY '$DB_PASS';

GRANT ALL PRIVILEGES ON \`$DB_NAME\`.* TO '$DB_USER'@'$DB_HOST';
FLUSH PRIVILEGES;
SQL

echo ">>> Spouštím migrace..."
for f in "$SCRIPT_DIR/migrations"/*.sql; do
  echo "    → $f"
  mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < "$f"
done

echo ">>> Spouštím seeds..."
for f in "$SCRIPT_DIR/seeds"/*.sql; do
  echo "    → $f"
  mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < "$f"
done

echo ""
echo "=== Hotovo! DB '$DB_NAME' je připravena. ==="
echo ""
echo "Nezapomeň:"
echo "  1. Zkopírovat .env.example → .env a nastavit SETTINGS_ENCRYPT_KEY"
echo "  2. Zadat API klíče přes admin UI → Nastavení → API klíče"
