#!/bin/bash
npx nx run-many --target=test --all || exit 1
npx nx run-many --target=build --all || exit 1
node ./pipeline.js
npx nx run-many --target=publish --all
