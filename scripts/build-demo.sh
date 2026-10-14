#!/bin/sh
# Assembles the static live demo into ./_site (used by the GitHub Pages workflow).
set -e
cd "$(dirname "$0")/.."
rm -rf _site && mkdir -p _site
cp demo/index.html demo/404.html demo/sw.js demo/seed.json _site/
touch _site/.nojekyll
cp YAMZ.html _site/yamz.html
cp server/login.html _site/login.html
cp public/icon.svg public/icon-192.png public/icon-512.png _site/
echo "Demo built in _site/"
