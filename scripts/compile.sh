#!/bin/sh
APP="$1"
SUBFOLDER="$2"
APP_DIST="dist/apps/$APP"

# Print header
jq .name < "apps/${SUBFOLDER:+$SUBFOLDER/}$APP""/project.json" | xargs npx figlet-cli -f Pagga

# Build app
rm -rf "$APP_DIST"
npx nx build "$APP" --configuration=production || exit 0

# Create dependencies
cp yarn.lock "$APP_DIST"
npx yarn --cwd "$APP_DIST" --non-interactive

# Build binaries
npx pkg -o "bin/$APP" --compress brotli "$APP_DIST"
