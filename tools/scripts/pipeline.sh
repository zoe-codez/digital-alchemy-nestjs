#!/bin/bash
npx nx run-many --target=test --all || exit 1
npx nx run-many --target=build --all --configuration=production || exit 1
node tools/scripts/pipeline.js
npx nx run-many --target=publish --all
