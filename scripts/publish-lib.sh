#!/bin/sh
PROJECT="$1"

jq .name < "libs/${PROJECT}/project.json" | xargs npx figlet-cli -f Pagga

yarn publish --cwd "dist/libs/${PROJECT}" --non-interactive
