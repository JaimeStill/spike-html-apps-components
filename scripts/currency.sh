#!/usr/bin/env bash
# Prints `<where>: <item> <pin> -> <latest>` for each mise tool, package.json dependency, GitHub
# Actions pin, and github: devDependency's tag behind its latest, and each peer range that doesn't
# admit its package's latest release, and exits 1 if any; prints nothing when all are current.
# Reads the network.
# From spike-html-packages-components (4c0a5d8): scripts/currency.sh.
set -euo pipefail
cd "$(dirname "$0")/.."

# Errors only: mise warns on every run that a GitHub release has no assets.
outdated=$(MISE_LOG_LEVEL=error mise outdated --bump --local --json)
trailing=$(node -p '
  Object.entries(JSON.parse(process.argv[1]))
    .map(([tool, { requested, bump }]) => "mise.toml: " + [tool, requested, "->", bump].join(" "))
    .join("\n")
' "$outdated")

pins=$(node -p '
  const { dependencies, devDependencies } = require("./package.json");
  Object.entries({ ...dependencies, ...devDependencies })
    .map(([name, pin]) => name + " " + pin)
    .join("\n")
')
typescript_eslint=$(node -p 'require("./package.json").devDependencies["typescript-eslint"]')
while read -r package pin; do
  # A github: devDependency (the foundation, the tooling) is pinned to its repository's release tag, which the
  # registry doesn't hold: its tag against that repository's latest release.
  if [[ $pin == github:* ]]; then
    spec=${pin#github:}
    latest=$(gh api "repos/${spec%%#*}/releases/latest" --jq .tag_name)
    if [[ ${spec#*#} != "$latest" ]]; then
      trailing+=$'\n'"package.json: $package ${spec#*#} -> $latest"
    fi
    # A peer (the foundation) is by a caret range, which must admit that latest release, so a
    # consumer can declare it beside the components: by the release test's own rule.
    range=$(node -p 'require("./package.json").peerDependencies?.[process.argv[1]] ?? ""' "$package")
    if [[ -n $range ]] && ! node --input-type=module -e '
      import { caretAdmits } from "./test/unit/release.js";
      process.exit(caretAdmits(...process.argv.slice(1)) ? 0 : 1);
    ' "$range" "$latest"; then
      trailing+=$'\n'"package.json: peer $package $range -> ^${latest#v}"
    fi
    continue
  fi
  latest=$(pnpm view "$package" version)
  # typescript is held to the newest version typescript-eslint's peer range accepts.
  if [[ $package == typescript ]]; then
    range=$(pnpm view "typescript-eslint@$typescript_eslint" peerDependencies.typescript)
    accepted=$(pnpm view "typescript@$range" version --json)
    latest=$(node -p '[].concat(JSON.parse(process.argv[1])).join("\n")' "$accepted" |
      sort -V | tail -n 1)
  fi
  if [[ $pin != "$latest" ]]; then
    trailing+=$'\n'"package.json: $package $pin -> $latest"
  fi
done <<<"$pins"

# Each action a workflow uses, against its repository's latest release.
uses=$(grep -ho 'uses: *[^ ]*@[^ ]*' .github/workflows/*.yml | sed 's/uses: *//' | sort -u)
while read -r action; do
  repo=$(cut -d/ -f1,2 <<<"${action%@*}")
  latest=$(gh api "repos/$repo/releases/latest" --jq .tag_name)
  if [[ ${action#*@} != "$latest" ]]; then
    trailing+=$'\n'".github/workflows: ${action%@*} ${action#*@} -> $latest"
  fi
done <<<"$uses"

if [[ -n ${trailing//$'\n'/} ]]; then
  sed '/^$/d' <<<"$trailing"
  exit 1
fi
