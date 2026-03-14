#!/usr/bin/env bash
# ===== SVJ Portál — Build script =====
# Spojí + minifikuje JS a CSS, updatuje index.html na bundle s cache busting hashem.
# Dev: index.html načítá 59 souborů separátně (git checkout index.html pro reset)
# Prod: spusť ./build.sh — vygeneruje dist/ a přepíše index.html
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIST="$SCRIPT_DIR/dist"
CONCAT_JS="$DIST/concat_tmp.js"
CONCAT_CSS="$DIST/concat_tmp.css"

mkdir -p "$DIST"

echo "=== [1/4] Concatenating JS (59 files) ==="
cat \
  "$SCRIPT_DIR/js/theme.js" \
  "$SCRIPT_DIR/js/ui.js" \
  "$SCRIPT_DIR/js/auth.js" \
  "$SCRIPT_DIR/js/router.js" \
  "$SCRIPT_DIR/js/api.js" \
  "$SCRIPT_DIR/js/pages/login.js" \
  "$SCRIPT_DIR/js/pages/home.js" \
  "$SCRIPT_DIR/js/pages/registrace.js" \
  "$SCRIPT_DIR/js/pages/nastenka.js" \
  "$SCRIPT_DIR/js/pages/vlastnici.js" \
  "$SCRIPT_DIR/js/pages/jednotky.js" \
  "$SCRIPT_DIR/js/pages/jednotky-qr.js" \
  "$SCRIPT_DIR/js/pages/dokumenty.js" \
  "$SCRIPT_DIR/js/pages/dokumenty-upload.js" \
  "$SCRIPT_DIR/js/pages/dokumenty-preview.js" \
  "$SCRIPT_DIR/js/pages/nastaveni.js" \
  "$SCRIPT_DIR/js/pages/nastaveni-google.js" \
  "$SCRIPT_DIR/js/pages/nastaveni-gdrive.js" \
  "$SCRIPT_DIR/js/pages/odom.js" \
  "$SCRIPT_DIR/js/pages/admin.js" \
  "$SCRIPT_DIR/js/pages/admin-users.js" \
  "$SCRIPT_DIR/js/pages/admin-vlastnici-ext.js" \
  "$SCRIPT_DIR/js/pages/admin-invites.js" \
  "$SCRIPT_DIR/js/pages/admin-settings.js" \
  "$SCRIPT_DIR/js/pages/admin-kn.js" \
  "$SCRIPT_DIR/js/pages/hlasovani.js" \
  "$SCRIPT_DIR/js/pages/admin-sfpi.js" \
  "$SCRIPT_DIR/js/pages/admin-penb.js" \
  "$SCRIPT_DIR/js/pages/revize.js" \
  "$SCRIPT_DIR/js/pages/admin-revize.js" \
  "$SCRIPT_DIR/js/pages/admin-revize-form.js" \
  "$SCRIPT_DIR/js/pages/admin-revize-historie.js" \
  "$SCRIPT_DIR/js/pages/revize-zavady.js" \
  "$SCRIPT_DIR/js/pages/admin-fond-oprav.js" \
  "$SCRIPT_DIR/js/pages/fond-oprav.js" \
  "$SCRIPT_DIR/js/pages/fond-oprav-charts.js" \
  "$SCRIPT_DIR/js/pages/fond-oprav-modal.js" \
  "$SCRIPT_DIR/js/pages/fond-oprav-detail.js" \
  "$SCRIPT_DIR/js/pages/fond-rozpocet.js" \
  "$SCRIPT_DIR/js/pages/fond-zalohy.js" \
  "$SCRIPT_DIR/js/pages/fond-zalohy-modal.js" \
  "$SCRIPT_DIR/js/pages/admin-okoli.js" \
  "$SCRIPT_DIR/js/pages/admin-parkovani.js" \
  "$SCRIPT_DIR/js/pages/admin-cenova-mapa.js" \
  "$SCRIPT_DIR/js/pages/zavady.js" \
  "$SCRIPT_DIR/js/pages/zavady-detail.js" \
  "$SCRIPT_DIR/js/pages/kalendar.js" \
  "$SCRIPT_DIR/js/pages/datovka.js" \
  "$SCRIPT_DIR/js/pages/datovka-guide.js" \
  "$SCRIPT_DIR/js/pages/kontakty.js" \
  "$SCRIPT_DIR/js/pages/meridla.js" \
  "$SCRIPT_DIR/js/pages/meridla-modal.js" \
  "$SCRIPT_DIR/js/pages/meridla-hromadny.js" \
  "$SCRIPT_DIR/js/pages/meridla-graf.js" \
  "$SCRIPT_DIR/js/pages/kalendar-modal.js" \
  "$SCRIPT_DIR/js/pages/kalendar-gcal.js" \
  "$SCRIPT_DIR/js/pages/gmail.js" \
  "$SCRIPT_DIR/js/notifikace.js" \
  "$SCRIPT_DIR/js/app.js" \
  > "$CONCAT_JS"

echo "=== [2/4] Minifying JS ==="
npx esbuild "$CONCAT_JS" \
  --minify \
  --platform=browser \
  --target=es2018 \
  --outfile="$DIST/bundle.min.js"

rm -f "$CONCAT_JS"

echo "=== [3/4] Concatenating + minifying CSS ==="
cat \
  "$SCRIPT_DIR/css/theme.css" \
  "$SCRIPT_DIR/css/layout.css" \
  "$SCRIPT_DIR/css/components.css" \
  > "$CONCAT_CSS"

npx esbuild "$CONCAT_CSS" \
  --minify \
  --outfile="$DIST/bundle.min.css"

rm -f "$CONCAT_CSS"

# Senior CSS — samostatný bundle (lazy loaded přes theme.js)
npx esbuild "$SCRIPT_DIR/css/senior.css" \
  --minify \
  --outfile="$DIST/senior.min.css"

echo "=== [4/4] Cache busting + index.html ==="
HASH=$(md5sum "$DIST/bundle.min.js" "$DIST/bundle.min.css" | md5sum | cut -c1-8)
echo "Hash: $HASH"

JS_SIZE=$(wc -c < "$DIST/bundle.min.js")
CSS_SIZE=$(wc -c < "$DIST/bundle.min.css")
echo "JS:  $(( JS_SIZE / 1024 )) KB (minified)"
echo "CSS: $(( CSS_SIZE / 1024 )) KB (minified)"

# Nahradit BUILD:CSS blok
CSS_TAG="<link rel=\"stylesheet\" href=\"dist/bundle.min.css?v=${HASH}\">"
perl -i -0pe \
  "s|<!-- BUILD:CSS -->.*?<!-- /BUILD:CSS -->|<!-- BUILD:CSS -->\n${CSS_TAG}\n<!-- /BUILD:CSS -->|s" \
  "$SCRIPT_DIR/index.html"

# Nahradit BUILD:JS blok
JS_TAG="<script defer src=\"dist/bundle.min.js?v=${HASH}\"></script>"
perl -i -0pe \
  "s|<!-- BUILD:JS -->.*?<!-- /BUILD:JS -->|<!-- BUILD:JS -->\n${JS_TAG}\n<!-- /BUILD:JS -->|s" \
  "$SCRIPT_DIR/index.html"

echo ""
echo "✓ Build hotový! dist/bundle.min.js a dist/bundle.min.css"
echo "  Nasaď: zkopíruj dist/ na server a reload Apache"
echo "  Dev reset: git checkout index.html"
