#!/bin/bash
# Run all tests, bail out if any fail
npx nx run-many --target=test --all || exit 1

# Verify everything correctly builds (before bumping versions)
npx nx run-many --target=build --all --configuration=production || exit 1

# Bump package.json versions
./bin/build-pipeline

# Build again (transfer package updates to `dist`)
npx nx run-many --target=build --all --configuration=production || exit 1

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

# Commit and push
# ---
# Want commits with only package updates to appear with the "build" commit
git commit -a -m "build"
git push
