# Changelog

All notable changes to `@jaimestill/spike-html-apps-components` are documented here. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the package adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Breaking: the entry is `sl-entry` and the pagination `sl-pagination`, each a plain name, as
  `sl-status-badge` is. Their modules are `./entry.js` and `./pagination.js`, their sheets
  `./entry.css` and `./pagination.css`, and their classes `Entry` and `Pagination`. The old tags
  `sl-entry-lit-shadow` and `sl-pagination-lit-shadow`, the modules `./entry-lit-shadow.js` and
  `./pagination-lit-shadow.js`, the sheets `./entry-shadow.css` and `./pagination-shadow.css`, and
  the classes `EntryLitShadow` and `PaginationLitShadow` no longer exist; a consumer renames its
  imports and its tags.

## [0.2.0] - 2026-10-27

### Added

- A specimen page per component, `demo/status-badge.html`, `demo/entry.html`, and
  `demo/pagination.html`, shows every state of the component, labelled, then again in a section
  20rem wide, and one instance reached by the keyboard to show its focus ring. The pages link the
  foundation's `page-full.css` and import its `register-full.js`, so a profile applies by attribute
  on the root, and lay out through their own `demo` layer, `demo/demo.css`, on the foundation's
  tokens.
- `mise run screenshots [--palette <name>] [--space <name>] [--type <name>] [--all] [--keep]`
  captures each specimen page in the pinned chrome-headless-shell, light and dark, in tiles at
  most 1200px tall, reaching the focus state by a real Tab press: by default at flexoki, regular,
  and mono; with the facet flags, combined, in the profiles named, each checked against the pages'
  registry; with `--all`, in each of the four colors and in compact and sans. It shows each
  capture inline in kitty and removes the captures on exit unless `--keep` is given. The check never runs it.
- A browser case renders each component on page-full.css with register-full.js, with no error, in
  the four colors, compact, and sans, light and dark, and checks that each facet's color, font,
  and padding reaches its shadow root.

### Changed

- The foundation moves to v0.2.0: the devDependency installs its `v0.2.0` tag, and the peer range
  is `^0.2.0`.
- The entry formats a file's size and its updated time with the foundation's `formatBytes` and
  `formatDateTime`, from `./format.js`, in place of its own Intl formatters. The output is
  unchanged up to 999 GB; from 1 TB a size scales to TB and PB, "1.5 TB" where the entry's own
  formatter printed "1,500 GB".
- The entry renders its time's date and clock in spans of their own, `.date` and `.clock`, the
  text unchanged.
- The release test's fault cases name the foundation's `v0.2.0` tag.
- The probe, restyle, adopted-sheets, and formatting cases run on the lean `page.css` and again in
  every profile on `page-full.css` with `register-full.js`, by the query of
  `test/fixtures/components.html`.

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
- The entry's size and its time's clock each stay whole, never breaking inside "1.5 kB" or
  "4:41 PM", and its time's date breaks only at its own spaces, so the entry keeps inside its box
  down to 16rem, its supported minimum width.
- Browser cases on the specimen pages check each of these fixes in every profile.

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
