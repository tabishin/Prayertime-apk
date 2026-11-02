#!/bin/bash
# Sync Web App assets to Android Kiosk assets folder for offline packaging
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
ROOT_DIR="$(cd "$DIR/.." >/dev/null 2>&1 && pwd)"
ASSETS_DEST="$DIR/app/src/main/assets"

echo "Syncing web assets to Android Kiosk assets directory..."
mkdir -p "$ASSETS_DEST"
mkdir -p "$ASSETS_DEST/assets"

cp "$ROOT_DIR/index.html" "$ASSETS_DEST/"
cp "$ROOT_DIR/styles.css" "$ASSETS_DEST/"
cp "$ROOT_DIR/script.js" "$ASSETS_DEST/"
cp "$ROOT_DIR/admin.html" "$ASSETS_DEST/" 2>/dev/null || true
cp "$ROOT_DIR/admin.js" "$ASSETS_DEST/" 2>/dev/null || true
cp "$ROOT_DIR/admin.css" "$ASSETS_DEST/" 2>/dev/null || true
cp "$ROOT_DIR/settings.json" "$ASSETS_DEST/"
cp "$ROOT_DIR/hadiths.json" "$ASSETS_DEST/"
cp "$ROOT_DIR/manifest.json" "$ASSETS_DEST/"
cp "$ROOT_DIR/sw.js" "$ASSETS_DEST/"

if [ -d "$ROOT_DIR/assets" ]; then
    cp -r "$ROOT_DIR/assets/"* "$ASSETS_DEST/assets/" 2>/dev/null || true
fi

echo "Assets sync complete! Total assets in $ASSETS_DEST:"
ls -lh "$ASSETS_DEST"
