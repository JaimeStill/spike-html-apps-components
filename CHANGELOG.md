# Changelog

All notable changes to `@jaimestill/spike-html-apps-components` are documented here. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the package adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.4.0] - 2026-10-30

### Added

- `sl-composer`'s `send()` does what activating its send control does, which now calls it: while
  the text is empty or whitespace, or the composer is `busy` or `disabled`, nothing; otherwise it
  clears the field, sends `send` with the text, and focuses the field. An app that sends on a key
  calls it rather than repeating the rules; the composer still binds no key.

## [0.3.0] - 2026-10-29

### Added

- marked 18.1.2 is the package's second dependency, pinned exactly as lit is. Only
  `./markdown.js` imports it, so a page that imports no Markdown-rendering module loads none of
  it; a page that does maps `marked` in its import map, to `marked/lib/marked.esm.js`.
- `./markdown.js` exports `markdown(source)`, which renders a Markdown string as a Lit template of
  plain native elements, which the foundation's elements sheet styles: headings, paragraphs,
  emphasis, strong, code spans, fenced and indented code, nested ordered and unordered lists with
  their start, task items, blockquotes, rules, links, GFM tables with their alignment and
  strikethrough, and line breaks. It reads the source with marked's lexer only; Lit escapes every
  text value, so raw HTML, block or inline, shows as its text. A link is an anchor, with
  `rel="noreferrer"` and no target, only to an http, https, or mailto URL or a relative one, and
  any other scheme shows the link's text; an image shows its alt text. Partial source renders as
  far as it has arrived, an unclosed fence as a code block, and a growing source re-rendered into
  the same container updates in place.
- `./artifact-viewer.js` defines `sl-artifact-viewer`, which shows one artifact, its `name`,
  `contentType` (the `content-type` attribute), and `content`, by its content type: text/markdown
  rendered through `markdown()`; application/json, or any `+json` type, parsed and printed with
  two-space indents; any other text/ type as preformatted text. Parameters and case don't count, so
  `Text/Markdown; charset=utf-8` is Markdown. JSON that doesn't parse shows its raw text under a
  labelled note, and a type that isn't text shows a labelled note in place of its content. Its
  `state`, reflected, is `ready` by default, `loading`, or `error` with its `message`. The viewer
  is as tall as its content; a consumer that constrains its block size, on the host or by a sized
  parent, holds it there, and long content scrolls inside the viewer, in a region Tab reaches; its
  lines never wrap, so a narrow viewer scrolls them sideways. The name and type head one frame,
  which holds the content or a note; the browser's own scrollbars show on an axis the content
  overflows, and the padding shows at the scroll's far end. It sizes to its content in any parent,
  a shrink-to-fit one too, and sends no event. It imports marked through
  `./markdown.js`, so a page that uses it maps `marked` in its import map. `viewOf(contentType)`
  exports the choice of view. Its specimen page is `demo/artifact-viewer.html`, and
  `mise run screenshots --page artifact-viewer` captures it.
- `./chat-thread.js` defines `sl-chat-thread`, which shows a conversation's `items` in order, a
  structural subset of Open Responses 2026-04-24 by its JSON field names, its types exported:
  `message` items, the user's or the assistant's, their `input_text` parts as plain text,
  `output_text` parts rendered through `markdown()`, and `refusal` parts as a labelled refusal;
  `reasoning` items, their summary and content text; `function_call` items, their name, call id,
  and arguments, pretty-printed when they parse as JSON and raw when they don't; and
  `function_call_output` items, their output, named for the call they answer. Item types, roles,
  and part types it doesn't know are skipped, with no error. Each message is labelled with its
  role, the user's at the inline end; a message `in_progress` reads as streaming, with a dot that
  pulses unless motion is reduced, and re-renders in place as its text grows, keyed by item id, so
  the items above it keep their nodes and don't move; `incomplete` and `failed` messages are
  labelled so. `verbose`, reflected, false by default, hides reasoning, calls, and outputs; set,
  it shows each collapsed in a native details. The items are an ordered list in one frame, as tall
  as its content unless the consumer constrains it, when it scrolls inside, in a region Tab
  reaches. It sizes to its content in any parent, a shrink-to-fit one too, and sends no event and
  binds no key. It imports marked through `./markdown.js`. Its specimen page is
  `demo/chat-thread.html`, and `mise run screenshots --page chat-thread` captures it.
- `./composer.js` defines `sl-composer`, a multi-line text field and its send control. Activating
  send sends `send`, its detail `{ text }`, the field's text as typed, and clears the field first,
  so a listener that sets `value` keeps what it set; focus returns to the field. Send is disabled
  while the text is empty or whitespace. `busy`, reflected, puts a stop control in send's place, in
  the same footprint, which sends `stop` with `{}`; the field still takes typing, and nothing is
  sent. `disabled`, reflected, disables the field and the control. `value` is the field's text,
  kept in step with typing, which sends no event; `placeholder` is the field's, and `label`
  ("Message" by default) names it in a visually hidden label. The field grows with its text by
  `field-sizing: content` from one line, the control's height, to eight, then scrolls with the
  browser's own scrollbar; without `field-sizing` it keeps one row. It binds no key: Enter,
  Shift+Enter, and Escape do what a native textarea does. Its specimen page is
  `demo/composer.html`, and `mise run screenshots --page composer` captures it.
- `./upload-dropzone.js` defines `sl-upload-dropzone`, a zone that takes files, several at a time,
  dropped on it or chosen through the native file picker its button opens, by pointer or keyboard,
  and sends `files-select` either way, its detail `{ files }`, an array of the `File`s. A drag of
  files marks the zone, kept while it moves across the zone's children and cleared when it leaves
  or drops; a drag of anything but files leaves the zone alone, and a drop of files is never the
  browser's, so a missed drop never opens the file in the page. `disabled`, reflected, refuses
  files by both paths, its drop effect none, and reads as disabled. `accept` is the picker's; a
  drop is not filtered by it, and the app validates what it receives. `uploads` lists the app's
  uploads, each a structural `UploadItem`, exported, `{ id, name, size, sent, state, message? }`:
  its name, on one line and cut short when long, and its size by the foundation's `formatBytes`;
  an uploading one its bytes sent of its size and a native progress bar, and a cancel control
  named for the file, which sends `upload-cancel` with `{ id }`; a done, failed, or cancelled one
  its label, a failed one its message. Neither progress nor a change of state moves an upload's
  rows. It binds no key. Its specimen page is `demo/upload-dropzone.html`, and
  `mise run screenshots --page upload-dropzone` captures it.
- `./stage-timeline.js` defines `sl-stage-timeline`, a run's stages as a connected, ordered list
  of steps. `stages` takes each as a structural `TimelineStage`, exported,
  `{ name, position, state, completedAt? }`, its state `pending`, `active`, `complete`, or
  `failed`, and its completion time an RFC 3339 string or a `Date`. The steps show in their
  positions' order, each its name; its state's label, Pending, In progress, Complete, or Failed;
  its marker, its position, a check, or a cross; and its completion time by the foundation's
  `formatDateTime`, to the second. The active stage is the list's current step, its marker
  ringed by a pulse unless motion is reduced. A stage that advances changes in its own nodes, and
  its label and time hold their slots' widths, so nothing moves as a state changes, in a
  shrink-to-fit parent too. It holds nothing focusable, sends no event, and binds no key. Its
  specimen page is `demo/stage-timeline.html`, and `mise run screenshots --page stage-timeline`
  captures it.
- `./event-log.js` defines `sl-event-log`, events as a log in the order given, inside one frame.
  `events` takes each as a structural `LogEvent`, exported, a subset of CloudEvents 1.0 by its
  attribute names, `{ id, type, source, subject?, time, data? }`, its time an RFC 3339 string or a
  `Date`. Each event shows its type; its time by the foundation's `formatDateTime`, absolute and to
  the second; its source, subject, and id, labelled, grouped under them, a subject or an id wider
  than its line cut with an ellipsis on one line, never broken, its full text kept and shown in its
  `title`; and its data, pretty-printed as JSON, a string as it is, in a native details collapsed until opened, or a note when
  it has none. Events are keyed by source and id, so events appended leave those shown in their
  own nodes and places, and a details the reader opened stays open. The frame is a polite log of
  additions. The log is as tall as its events; a consumer that constrains its block size holds it
  there and it scrolls inside, following the newest event as one arrives only while the reader is
  at its end. It sends no event and binds no key. Its specimen page is `demo/event-log.html`, and
  `mise run screenshots --page event-log` captures it.
- `./search-results.js` defines `sl-search-results`, a search's matches under a status line.
  `items` takes each as a structural `SearchMatch`, exported, `{ id, name, field, snippet }`, its
  field `name` or `content`; `query` is the query they are for; and `state`, reflected, `ready`,
  `loading`, or `error`, with `message` saying why it failed. The status line, one polite live
  region in every state, prompts before any query, says it is searching, counts the matches for
  the query, says there are none, or says the search failed with its message. Each match is a
  native button, its document's name with its field's label, "in name" or "in content", at the
  line's end, and under them its snippet, ellipses kept and joined to the text beside them; a name
  match whose snippet only repeats its name shows the name alone. The query's occurrences in the
  name and the snippet are marked case-insensitively, letter by letter, as text, so markup and a
  pattern's specials in either are literal, and a letter whose other case is longer shifts no
  mark; a blank query marks nothing. Activating a match sends `open`, its detail `{ id }`. While
  loading, matches already given stay listed, busy; an error lists none. It binds no key. Its
  specimen page is `demo/search-results.html`, and `mise run screenshots --page search-results`
  captures it.
- `./document-list.js` defines `sl-document-list`, a page of documents composed of the existing
  components: one `sl-pagination`, whose default slot holds the list's status line and an
  `sl-entry` per document. `items` takes each as a structural `DocumentItem`, exported,
  `{ id, name, content_type, size, created_at, status }`, an API's document with its run's status
  set beside it, which the list maps onto the entry's file, its `created_at` the entry's time. The
  pagination's properties, `page`, `size`, `total`, `more`, `pageSizes` (`page-sizes`), and
  `disabled`, reflected, are the list's under the same names, with the pagination's defaults, and
  pass through as given. `selected` takes a document's id: its list item is `aria-current="true"`
  and its entry is `selected`, framed in the interaction color, so marking one moves no entry, and
  every entry starts at the pagination's edge. `state`, reflected, `ready`, `loading`, or `error`,
  with `message`, as the search results'. The status line, one polite live region, says the list
  is loading, that it failed with its message, or that there are no documents, and is blank over a
  ready page. While the pagination shows its summary, the status runs on after it in its `status`
  slot, "Showing 1–3 of 8 · Loading documents…", taking no line of its own; with no summary, and
  for an error, it is a line of its own above the entries, held a line tall when blank; either way
  its text moves nothing. While loading, documents already given stay listed, busy; an error lists
  none. The entry's `open`, `{ id, kind }`, and the pagination's `page-change`, `{ page }`, and
  `page-size-change`, `{ size }`, bubble and are composed, so they reach the list's listener as
  their parts sent them; the list dispatches no event of its own. It binds no key. Its specimen
  page is `demo/document-list.html`, and `mise run screenshots --page document-list` captures it.
- `sl-entry` takes `selected`, a boolean reflected to the `selected` attribute, false by default,
  which frames its button in the interaction color, the border and an inset line inside it, so the
  frame moves nothing; while its focus is visible the focus ring alone marks it, the frame giving
  way to the normal border, its width unchanged, until focus leaves. It is a mark to the eye only:
  the consumer says it to assistive technology, as `sl-document-list` does with `aria-current`. The
  entry's specimen page shows it, and its focus state is selected.
- `sl-pagination` has a `status` slot, after the summary's text on its line, shown while the
  summary is, and `./pagination.js` exports `summaryRange(page, size, total)`, the summary's first
  and last rows, or null when it shows none.
- `mise run screenshots` takes `--page <name>`, repeatable, capturing only the specimen pages
  named, and `--scheme light` or `--scheme dark`, capturing that scheme alone; both combine with
  the profile flags and `--all`. An unknown page name exits 2, listing the pages' names.

### Changed

- Breaking: the entry is `sl-entry` and the pagination `sl-pagination`, each a plain name, as
  `sl-status-badge` is. Their modules are `./entry.js` and `./pagination.js`, their sheets
  `./entry.css` and `./pagination.css`, and their classes `Entry` and `Pagination`. The old tags
  `sl-entry-lit-shadow` and `sl-pagination-lit-shadow`, the modules `./entry-lit-shadow.js` and
  `./pagination-lit-shadow.js`, the sheets `./entry-shadow.css` and `./pagination-shadow.css`, and
  the classes `EntryLitShadow` and `PaginationLitShadow` no longer exist; a consumer renames its
  imports and its tags.
- The entry's name is its primary text, semibold at the body size, and its status a quiet label at
  the line's end, the smallest size and muted. Its kind, as quiet, opens the meta line under the
  name in place of a column of its own, so a narrow entry gives its width to the name and the meta,
  and its text reads name, status, kind, size, content type, time. The meta wraps between its
  values, and a content type too long for its line breaks after a slash, dot, hyphen, or plus, at a
  `wbr`, and inside a part only when that part alone is wider than the line.

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

[Unreleased]: https://github.com/JaimeStill/spike-html-apps-components/compare/v0.4.0...HEAD
[0.4.0]: https://github.com/JaimeStill/spike-html-apps-components/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/JaimeStill/spike-html-apps-components/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/JaimeStill/spike-html-apps-components/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/JaimeStill/spike-html-apps-components/releases/tag/v0.1.0
