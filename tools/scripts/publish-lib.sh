#!/bin/sh
PROJECT="$1"

jq .name < "libs/$PROJECT/project.json" | xargs npx figlet-cli -f Pagga

npx nx build "$PROJECT" --configuration=production || exit 0
npx yarn publish --cwd "dist/libs/$PROJECT" --non-interactive
