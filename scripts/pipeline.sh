#!/bin/bash
RED="\033[0;31m"
NC="\033[0m"
FONT="Doom"
MAIN="main"


# * Verify everything correctly builds
# don't test with obviously broken code
npx figlet-cli -f "$FONT" Build | lolcat
npx nx run-many --target=build --all --configuration=production || exit 1

# * Run tests
npx figlet-cli -f "$FONT" Test | lolcat
npx nx run-many --target=test --all || exit 1

# * Lint
npx figlet-cli -f "$FONT" Lint | lolcat
npx nx run-many --target=lint --all || exit 1

# ? If only interested if the pipeline is expected to produce a valid build
if [[ $* == "--validate" ]]; then
  npx figlet-cli -f "$FONT" LGTM | lolcat
  exit 0
fi

# ? Tentatively seems like a good method
# Other potential methods (may be worth testing exit codes?):
# ~ git diff --cached --exit-code
# ~ git diff-index --quiet HEAD
#   - git update-index --really-refresh # (optionally in front)
GIT_CLEAN=$(git status --porcelain)

# * Only allowed to create finalized builds from clean branches
if [ -n "$GIT_CLEAN" ] && [[ $* != "--dev" ]]; then
  ERROR=$(npx figlet-cli -f "$FONT" "Dirty branch")
  echo -e "${RED}${ERROR}${NC}"
  echo "${GIT_CLEAN}"
  exit 1
fi

# # * Rebuild local bin files
# npx figlet-cli -f "$FONT" "Compile" | lolcat
# npx nx run-many --target=compile --all || exit 1

# if [[ $* == "--compile" ]]; then
#   npx figlet-cli -f "$FONT" "Compile succeeded" | lolcat
#   exit 0
# fi

CURRENT_BRANCH=$(git branch --show-current)
if [[  $CURRENT_BRANCH != "${MAIN}" ]] && [[ $* != "--dev" ]]; then
  echo -e "${RED}Can only publish dev builds from non-main branches${NC}"
  exit 1
else
  echo "Publishing development build" | lolcat
fi

# * Bump package.json versions, retrieve new version back
VERSION=$(node ./dist/apps/build-pipeline/main.js "$*")

# * Build again (transfer package updates to dist)
npx figlet-cli -f "$FONT" "Publish ${VERSION}" | lolcat
npx nx run-many --target=build --all --configuration=production --skip-nx-cache || exit 1

# Publish packages out
# ---
# For some reason, the publish will sometimes inexplicably fail:
# - phantom build error
# - stuff related to cannot find `~/.npmrc` (most common)
# - magic swamp gas
#
# If any of the builds fail, then retry
# NX will run from cache for successful ones
# With only 1-2 failed, they shouldn't re-fail a 2nd time. Haven't observed it happen yet
npx nx run-many --target=publish --all || npx nx run-many --target=publish --all || exit 1

if [[ $* == "--dev" ]]; then
  npx figlet-cli -f "$FONT" "Done" | lolcat
  exit 0
fi

# Commit and push
# ---
# Want commits with only package updates to appear with the "build" commit
git commit -a -m "build"

if [[ $* == "--tag" ]]; then
  npx figlet-cli -f "$FONT" "Create tag ${VERSION}" | lolcat
  git tag "${VERSION}"
fi

git push --follow-tags
npx figlet-cli -f "$FONT" "Done" | lolcat
