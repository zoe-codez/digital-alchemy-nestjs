#!/bin/sh
PROJECT="$1"

jq .name < "apps/$PROJECT/project.json" | xargs npx figlet-cli -f Pagga

MAIN="dist/apps/$PROJECT/main.js"
MINIFIED="dist/apps/$PROJECT/minified.js"
HEADER="#!/usr/bin/env node"
npx nx build "$PROJECT" --configuration=production
npx terser "$MAIN" -c -m --keep-classnames --module > "$MINIFIED"
echo "$HEADER" > "$MAIN"; cat "$MINIFIED" >> "$MAIN"

npx yarn publish --cwd "dist/apps/$PROJECT" --non-interactive
