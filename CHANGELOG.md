# Changelog

All notable changes to `@jaimestill/spike-html-apps-components` are documented here. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the package adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-10-27

### Added

- A specimen page per component, `demo/status-badge.html`, `demo/entry.html`, and
  `demo/pagination.html`: every state of the component, labelled, again in a section 20rem wide,
  and one instance reached by the keyboard to show its focus ring. They link the foundation's
  `page-full.css` and import its `register-full.js`, so a profile applies by attribute on the root,
  and lay out through their own `demo` layer, `demo/demo.css`, on the foundation's tokens.
- `mise run screenshots [--keep]`: each specimen page in each of the four colors and in compact
  and sans, light and dark, in the pinned chrome-headless-shell, the focus reached by a real Tab
  press, shown inline in kitty and removed on exit unless `--keep` is given. The check never runs
  it.
- A browser case on every built-in profile: page-full.css with register-full.js, each component
  rendered with no error in the four colors, compact, and sans, light and dark, each facet's
  color, font, and padding reaching its shadow root.

### Changed

- The foundation moves to v0.2.0: the devDependency installs its `v0.2.0` tag, and the peer range
  is `^0.2.0`.
- The entry formats a file's size and its updated time with the foundation's `formatBytes` and
  `formatDateTime`, from `./format.js`, in place of its own Intl formatters; the output is
  unchanged.
- The release test's fault cases name the foundation's `v0.2.0` tag.

### Removed

- The typescript-eslint entries excluded from pnpm's minimum release age: 8.72.1 has aged past it.

### Fixed

- The entry's kind column is 9ch, the width of its longest kind, "directory", in place of the 8ch
  it was copied with, so the kind no longer runs into the name.
- The entry's wrapped meta lines step by the grid's row gap, the name-to-meta step, in place of
  the column gap.
- The entry lays out intrinsically, so it sizes to its content in any parent, a shrink-to-fit
  one too (an inline-block, a content-sized flex item, a grid's auto track): its name and status
  share a row that wraps, so the status moves to a line of its own below the name only when the
  two don't fit side by side, before the name narrows past 16ch; and a name too long for its line
  wraps within the entry.
- The pagination wraps its groups when narrow, and its "Page Size" label and page count no longer
  break; its step buttons keep their own height in place of stretching to the row's.
- Browser cases on the specimen pages, in every profile, for each of these.

## [0.1.0] - 2026-10-27

### Added

- The components layer, first released under this name: copied from
  spike-html-packages-components v0.2.0 (4c0a5d8), its pins brought to their latest. It holds the
  status badge, the entry, and the pagination, Lit with shadow roots, each adopting the
  foundation's reset and elements sheets, then its own.
- The dependencies: lit 3.3.3, and the foundation as a peer at `^0.1.0`, which the repository
  installs by its release tag, `github:JaimeStill/spike-html-apps-foundation#v0.1.0`.
- The release by tag: `v<version>`, whose tree is the pack, with the tarball on its GitHub
  release.

[Unreleased]: https://github.com/JaimeStill/spike-html-apps-components/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/JaimeStill/spike-html-apps-components/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/JaimeStill/spike-html-apps-components/releases/tag/v0.1.0
