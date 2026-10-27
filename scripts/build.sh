#!/usr/bin/env bash
# The build: src/ into a fresh dist/. tsc emits each module's .js and .d.ts, and the .css is copied
# beside them as written.
# From spike-html-packages-components (4c0a5d8): scripts/build.sh.
set -euo pipefail
cd "$(dirname "$0")/.."

rm -rf dist
tsc -p .
(cd src && find . -type f -name '*.css' -print0 | xargs -0 -r cp --parents -t ../dist)
