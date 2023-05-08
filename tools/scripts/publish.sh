#!/bin/sh
APP="$1"

jq .name < apps/sampler-app/package.json | sed 's|@digital-alchemy/||' | xargs npx figlet-cli -f Pagga

MAIN="dist/apps/$APP/main.js"
MINIFIED="dist/apps/$APP/minified.js"
HEADER="#!/usr/bin/env node"
npx nx build "$APP" --configuration=production
npx terser "$MAIN" -c -m --keep-classnames --module > "$MINIFIED"
echo "$HEADER" > "$MAIN"; cat "$MINIFIED" >> "$MAIN"

npx yarn publish --cwd "dist/apps/$APP" --non-interactive
