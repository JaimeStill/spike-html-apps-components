#!/usr/bin/env bash
# mise run screenshots: captures the specimen pages on dist/ in every profile and scheme, through
# screenshots.js, each page in vertical tiles at most 1200px tall, into a mktemp -d directory
# removed on exit unless --keep. Prints each tile's caption and path, and shows it inline with
# kitty's icat when the terminal displays images, scaled to fit the screen's width and height, so
# no image runs past the screen and the terminal comes back to the cursor.
# Adapted from spike-html-apps-foundation (679e550): scripts/screenshots.sh, naming the specimen
# pages.
set -euo pipefail
cd "$(dirname "$0")/.."

keep=false
for arg in "$@"; do
  case $arg in
    --keep) keep=true ;;
    *)
      echo "usage: mise run screenshots [--keep]" >&2
      exit 2
      ;;
  esac
done

dir=$(mktemp -d "${TMPDIR:-/tmp}/screenshots.XXXXXX")
if $keep; then
  trap 'echo "kept: $dir"' EXIT
else
  trap 'rm -rf "$dir"' EXIT
fi

# kitty's icat, as kitten or through kitty, in stream mode: the image travels in escape codes, the
# one mode that crosses tmux. Shown only when stdout is a terminal and icat detects its support;
# otherwise only the captions and paths print.
icat=()
if [[ -t 1 ]] && { exec 3<>/dev/tty; } 2>/dev/null; then
  if command -v kitten >/dev/null; then
    icat=(kitten icat)
  elif command -v kitty >/dev/null; then
    icat=(kitty +kitten icat)
  fi
  if ((${#icat[@]})) &&
    ! "${icat[@]}" --detect-support --detection-timeout=2 --transfer-mode=stream \
      <&3 >/dev/null 2>&1; then
    icat=()
  fi
fi

BROWSER_EXECUTABLE=$(mise which chrome-headless-shell) node scripts/screenshots.js "$dir" |
  while IFS=$'\t' read -r path caption; do
    printf '%s\n  %s\n' "$caption" "$path"
    if ((${#icat[@]})); then
      "${icat[@]}" --transfer-mode=stream --align=left --fit=both "$path" <&3
    fi
  done
