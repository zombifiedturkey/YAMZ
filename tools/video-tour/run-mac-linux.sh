#!/bin/sh
cd "$(dirname "$0")"
command -v node >/dev/null 2>&1 || { echo "Node.js isn't installed. Get the LTS version from https://nodejs.org and run this again."; exit 1; }
if [ ! -d node_modules/playwright ]; then
  echo "First run: installing the recorder (one-off, a couple of minutes)..."
  npm install && npx playwright install chromium || exit 1
fi
node tour.mjs "$@"
