#!/bin/sh
APP="$1"
APP_DIST="dist/apps/$APP"

# Print header
jq .name < "apps/$APP/project.json" | xargs npx figlet-cli -f Pagga

# Build app
rm -r "$APP_DIST"
npx nx build "$APP" --configuration=production

# Create dependencies
cp yarn.lock "$APP_DIST"
npx yarn --cwd "$APP_DIST" --non-interactive

# Build binaries
npx pkg -o "bin/$APP" --compress brotli "$APP_DIST"
