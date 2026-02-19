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
  npm install
  npx vite build --base="/$REPO_NAME/$slug/"
  cd ..

  mv "$name/dist" "_site/$slug"
done

# Copy standalone files
cp slides.html _site/slides.html

# Generate root index.html
cat > _site/index.html << 'HEADER'
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>YM Games</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0f172a;color:#e2e8f0;min-height:100vh;display:flex;flex-direction:column;align-items:center}
header{padding:3rem 1rem 1rem;text-align:center}
h1{font-size:2.5rem;font-weight:800;background:linear-gradient(135deg,#818cf8,#c084fc,#f472b6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
header p{margin-top:.5rem;color:#94a3b8;font-size:1.1rem}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1.5rem;padding:2rem 1.5rem 4rem;max-width:960px;width:100%}
a.card{background:#1e293b;border:1px solid #334155;border-radius:1rem;padding:2rem 1.5rem;text-decoration:none;color:inherit;transition:transform .15s,border-color .15s,box-shadow .15s}
a.card:hover{transform:translateY(-4px);border-color:#818cf8;box-shadow:0 8px 30px rgba(129,140,248,.15)}
a.card h2{font-size:1.35rem;font-weight:700;margin-bottom:.35rem}
a.card span{color:#64748b;font-size:.9rem}
</style>
</head>
<body>
<header><h1>YM Games</h1><p>Pick a game to play</p></header>
<div class="grid">
HEADER

for dir in */; do
  [ -f "$dir/package.json" ] || continue
  name="${dir%/}"
  slug=$(echo "$name" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')
  echo "<a class=\"card\" href=\"/$REPO_NAME/$slug/\"><h2>$name</h2><span>Play now &rarr;</span></a>" >> _site/index.html
done

echo "<a class=\"card\" href=\"/$REPO_NAME/slides.html\"><h2>AI Presentation</h2><span>View slides &rarr;</span></a>" >> _site/index.html

cat >> _site/index.html << 'FOOTER'
</div>
</body>
</html>
FOOTER
echo "=== Done! Output in _site/ ==="
