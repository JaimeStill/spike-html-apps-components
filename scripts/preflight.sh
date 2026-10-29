#!/usr/bin/env bash
# Fails naming mise run install when a tool a task needs is missing: the node_modules tooling, the
# dependencies the build reads, lit, marked, and the foundation at its tag, and with `browser`, the pinned
# chrome-headless-shell.
# Adapted from spike-html-packages-components (4c0a5d8): scripts/preflight.sh, renamed.
set -euo pipefail

fail() {
  echo "preflight: $1 isn't installed; run mise run install" >&2
  exit 1
}

for bin in eslint prettier; do
  [[ -x node_modules/.bin/$bin ]] || fail "$bin (devDependencies)"
done
[[ -f node_modules/lit/package.json ]] || fail "lit (dependencies)"
[[ -f node_modules/marked/package.json ]] || fail "marked (dependencies)"
# The foundation is a peer, which the repository's devDependency installs at its tag.
[[ -f node_modules/@jaimestill/spike-html-apps-foundation/package.json ]] ||
  fail "@jaimestill/spike-html-apps-foundation (devDependencies)"

[[ "${1:-}" == browser ]] || exit 0
shell=$(mise which chrome-headless-shell 2>/dev/null) || fail "chrome-headless-shell"
# mise caches downloads by checksum: a version bumped without its sha256 installs the old build.
pin=$(mise current http:chrome-headless-shell)
if [[ "$("$shell" --version)" != *" $pin" ]]; then
  echo "preflight: $shell isn't chrome-headless-shell $pin; give the pin its own sha256" >&2
  exit 1
fi
