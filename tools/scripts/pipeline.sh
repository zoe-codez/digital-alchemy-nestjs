#!/bin/bash
npx nx run-many --target=test --all || exit 1
npx nx run-many --target=build --all --configuration=production || exit 1
node tools/scripts/pipeline.js
npx nx run-many --target=build --all --configuration=production || exit 1
# Sometimes the first publish will fail to pick up `~/.npmrc`... because it hates me
# Second attempt will run from cache for successfully published, only actually re-running failed
npx nx run-many --target=publish --all || npx nx run-many --target=publish --all || exit 1
git commit -a -m "build"
git push
