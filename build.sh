#!/usr/bin/env bash
set -euo pipefail

REPO_NAME="ym-games"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

rm -rf _site
mkdir -p _site

# Build each Vite app
for dir in */; do
  [ -f "$dir/package.json" ] || continue

  name="${dir%/}"
  slug=$(echo "$name" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')

  echo "=== Building $name -> $slug ==="

  cd "$name"
  npm ci
  npx vite build --base="/$REPO_NAME/$slug/"
  cd ..

  mv "$name/dist" "_site/$slug"
done

# Copy root static files
cp slides.html _site/slides.html

# Generate root index.html from template
app_links=""
for dir in */; do
  [ -f "$dir/package.json" ] || continue
  name="${dir%/}"
  slug=$(echo "$name" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')
  app_links="${app_links}<a class=\"card\" href=\"/$REPO_NAME/$slug/\"><h2>$name</h2><span>Play now \&rarr;</span></a>\n"
done

sed "s|<!-- APP_LINKS -->|${app_links}|" index.html > _site/index.html
echo "=== Done! Output in _site/ ==="
