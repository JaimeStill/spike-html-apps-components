#!/usr/bin/env bash
# mise run screenshots: captures the specimen pages on dist/, light and dark, through
# screenshots.js, each page in vertical tiles at most 1200px tall, into a mktemp -d directory
# removed on exit unless --keep. The profiles: by default the defaults alone, flexoki, regular,
# and mono; --palette, --space, and --type, each with a name, that facet's profile over the
# defaults, combined; --all the full matrix, every color at the defaults, then compact and sans at
# flexoki, which no facet flag joins. --page, with a specimen page's name, repeatable, captures
# only the pages named; --scheme light or dark captures that scheme alone; both join the profile
# flags and --all alike, since they choose pages and schemes, not profiles. screenshots.js checks
# each page name against its pages, and each profile name against the pages' registry, before any
# capture, exiting 2 with the registered names on an unknown one; any other argument, a scheme
# but light or dark or a second --scheme among them, exits 2 with the usage. Prints each tile's
# caption and path, and shows it inline with kitty's icat when the terminal displays images,
# scaled to fit the screen's width and height, so no image runs past the screen and the terminal
# comes back to the cursor.
# Adapted from spike-html-apps-foundation (679e550): scripts/screenshots.sh, naming the specimen
# pages, and choosing the profiles by argument.
set -euo pipefail
cd "$(dirname "$0")/.."

usage() {
  echo "usage: mise run screenshots [--all | [--palette <name>] [--space <name>] [--type <name>]] [--page <name>]... [--scheme light|dark] [--keep]" >&2
  exit 2
}

keep=false
all=false
facets=()
choices=()
scheme=
while (($#)); do
  case $1 in
    --keep) keep=true ;;
    --all) all=true ;;
    --palette | --space | --type)
      (($# > 1)) || usage
      facets+=("$1" "$2")
      shift
      ;;
    --page)
      (($# > 1)) || usage
      choices+=("$1" "$2")
      shift
      ;;
    --scheme)
      (($# > 1)) || usage
      [[ $2 == light || $2 == dark ]] && [[ -z $scheme ]] || usage
      scheme=$2
      choices+=("$1" "$2")
      shift
      ;;
    *) usage ;;
  esac
  shift
done
if $all && ((${#facets[@]})); then
  usage
fi
profiles=("${facets[@]}")
if $all; then
  profiles=(--all)
fi

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

BROWSER_EXECUTABLE=$(mise which chrome-headless-shell) node scripts/screenshots.js "$dir" "${profiles[@]}" "${choices[@]}" |
  while IFS=$'\t' read -r path caption; do
    printf '%s\n  %s\n' "$caption" "$path"
    if ((${#icat[@]})); then
      "${icat[@]}" --transfer-mode=stream --align=left --fit=both "$path" <&3
    fi
  done
