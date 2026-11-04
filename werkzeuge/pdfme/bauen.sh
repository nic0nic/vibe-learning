#!/usr/bin/env bash
# Baut pb_public/IT/datenbanken/lib/pdfme.min.js (Berichtsentwurf und PDF-Erzeugung, pdfme, MIT).
# Aufruf im Hauptordner von vibe-learning: bash werkzeuge/pdfme/bauen.sh   (braucht Node und npm)
# Ein einziges Skript für den Browser (window.PDFME), kein Build-Schritt im Betrieb.
# @pdfme/converter wird durch converter-ersatz.js ersetzt: Berichte nutzen nur leere Seiten,
# eigene PDF-Hintergründe gibt es nicht, das spart den PDF-Renderer (mehrere MB).
set -euo pipefail
VERSION=6.2.4
HIER="$(cd "$(dirname "$0")" && pwd)"
ZIEL="$HIER/../../pb_public/IT/datenbanken/lib"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
cp "$HIER/eintrag.js" "$HIER/converter-ersatz.js" "$TMP/"
cd "$TMP"
echo '{"name":"pdfme-bau","private":true}' > package.json
npm install --silent --no-audit --no-fund "@pdfme/ui@$VERSION" "@pdfme/generator@$VERSION" "@pdfme/schemas@$VERSION" "@pdfme/common@$VERSION" esbuild@0.25.10
npx esbuild eintrag.js --bundle --format=iife --global-name=PDFME --minify --target=es2020 --legal-comments=eof \
  --alias:@pdfme/converter=./converter-ersatz.js --define:process.env.NODE_ENV='"production"' --outfile="$ZIEL/pdfme.min.js"
echo "fertig: $ZIEL/pdfme.min.js (pdfme $VERSION)"
