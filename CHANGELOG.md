# Changelog

All notable changes to `@jaimestill/spike-html-apps-components` are documented here. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the package adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.10.1] - 2026-11-02

### Fixed

- `sl-pagination`'s page number shows whole. Its field was 4ch wide in all, the elements sheet's
  padding and border inside the 4ch, so at the regular spacing less than two digits fit and page
  13 read "1:", in mono and in sans. The field is now as wide as three digits inside its padding
  and border, at every spacing and type, and keeps that one width from page 1 to page 999, so it
  doesn't jump as the page changes; past page 999 it grows with the page rather than clip it.

## [0.10.0] - 2026-11-02

### Added

- `sl-search-results` takes a `total`, a number, how many match in all, for a paged search that
  shows its first page. Set and greater than the matches given, the status line counts them of it,
  "96 of 140 matches for “notes”", where it counted the page alone, "96 matches", as if the page
  were every match. Unset, or no more than the matches given, the count is theirs, as before; a
  total that isn't a number is none. It counts in the ready state only, as the count did, and only
  while matches are shown: with none, the line reads "No matches for “notes”" as without a total,
  never "0 of 140 matches".

### Fixed

- `sl-chat-thread`'s function call shows its whole call id at any width. A call_id is one unbroken
  token, `call_01a19c590db77cc28219329571ef2e06` as a model writes one, and its line kept it whole,
  so a narrow thread, 375px wide, ran it past the frame's edge, cut off. A call's or an output's
  function name and call id now move to the next line whole, as inline code in a reply does, and
  break anywhere only when longer than the line, inside the frame; where they fit, the line is as
  before.
- `sl-search-results` marks the matches it shows, and names in its status line, the query they
  answer. One `query` drove the status line and the marks, so a consumer searching anew, setting
  the new query and `loading` while the last query's matches stay listed, re-marked those with the
  new query, marking what the search never matched, and a query set before `loading` read "3
  matches for" the new query for a moment in the live region; from idle, or after an empty answer,
  it read "No matches for" a query never searched for. The marks, the count's "N matches for
  “…”", and "No matches for “…”" now take the query as it is when `items` is set, in the same
  update or before it, and with no query answered the line prompts; a query set alone re-marks
  nothing and leaves the line as it was in every state, so the live region reads no change.
  "Searching for “…”" still names the query as it is. A consumer that sets the query and the
  matches together, an empty answer included, as before, sees no change, and needs no new
  property.
- `sl-event-log`'s `LogEvent.time` is optional, string, Date, or null, as CloudEvents makes `time`
  optional; it was required, so a consumer typing a stream's events had to invent one. An event
  without a time shows its type alone on its line, its source, subject, and id under it where a
  timed event's are, no time text and no room held for one, as one whose time doesn't parse
  already did.

## [0.9.1] - 2026-11-02

### Fixed

- `sl-chat-thread`, held to a height, follows its last item when it grows with no update of its
  own: a details the reader opens in it, a reasoning or a function call's, or an image that loads.
  While the reader is at the frame's end, its end stays in view, instantly under any motion
  preference, as following new items does; it stopped at its old place, the expanded content cut
  off below. Only the last item's growth follows: a details opened in an item above it opens in
  place, the summary clicked where it was, and leaves the reader short of the end. A reader who
  scrolled up keeps their place, a thread reattached scrolls nothing on its own, and unheld
  nothing changes. The details still toggle natively: a ResizeObserver over the frame's content
  sees the growth.

## [0.9.0] - 2026-11-02

### Added

- `sl-chat-thread` follows its newest item, as `sl-event-log` does. Held to a height by its
  consumer, its frame scrolls to its end on each update, an item added or a streaming reply's text
  grown, while the reader is at its end, within the browser's rounding: a reader who scrolled up
  keeps their place as the reply streams on, and one who scrolls back to the end is followed
  again. Unlike the log, its first items open at the end, since a conversation reads from its
  newest, and a user's message added, the one the reader just sent, alone or with the reply's
  first text, brings the frame to its end wherever the reader was. The scroll is instant under any
  motion preference. It exposes no property: the reader's scroll is the state. Unheld, the thread
  is as tall as its content and scrolls no container of its consumer's, so a consumer that wants
  it followed holds it to a height.

### Changed

- `sl-chat-thread`'s reasoning item, with `verbose`, carries its summary on its line: "Reasoning",
  its status when it has one, then the summary text, set off by a middle dot that the
  accessibility tree skips, in the line's color at its regular weight, wrapping as prose. Expanded,
  its details holds the reasoning content alone, where it showed the summary and the content as
  two unlabelled paragraphs. A summary part with no text yet, as one just begun streaming, is no
  summary, and the line reads "Reasoning" alone until its text arrives. A reasoning item with a
  summary and no content is a line alone, a paragraph in the summary's type and place, not a
  details that opens on nothing; one with neither still says "No reasoning text.".

### Fixed

- `sl-chat-thread`'s verbose lines are named in the accessibility tree a word apart. Chromium
  dropped the spaces Lit renders between a summary's parts, naming a call's line
  "Function callget_weathercall_1"; each part is now an inline block, whose edge keeps the space,
  so the line is named "Function call get_weather call_1".
- `sl-composer` no longer leaves focus on a disabled control. Stop activated with the field empty,
  by the keyboard or a pointer, became a disabled send once the app cleared `busy`, and kept focus
  there, where it took no key and some browsers drop focus to the body. When the button turns
  disabled while it holds focus, focus now moves to the field, where the reader writes next. With
  a draft in the field, send is enabled and keeps focus, as before.
- `sl-event-log` no longer stops following by itself under a CSS zoom. It took its frame for
  scrolled up when its end was more than a pixel off, which a zoom such as 0.9 or 1.1 leaves by
  rounding alone; the end now allows two pixels, and two device pixels under a zoom below 1.

## [0.8.0] - 2026-11-01

### Added

- `./json.js`'s `formatJson(text)`: valid JSON text re-indented from its own tokens, two spaces an
  indent, one member or element a line, `": "` after each key, and an empty object or array as
  `{}` or `[]`. Each token is kept as written, so only the whitespace between tokens changes. It
  reads tokens without checking their grammar, so its caller decides whether the text is valid.
  It indents containers to `MAX_DEPTH`, 64, deep, exported beside it; a container that would open
  deeper is kept as written, from its opening bracket to its matching closing one, on the line
  where it opens, and formatting resumes after it. Its output's length is then linear in the
  text's at any depth, where indenting every level grew with the square of the depth and text of
  40 kB nested 20,000 deep passed the longest string. Should formatting still throw a
  `RangeError`, the viewer and the chat thread show the text as it is.
- `sl-artifact-viewer` renders natively what the browser can, from a Blob given as its `content`,
  which now takes `string | Blob`: `application/pdf` in an iframe, the browser's own PDF viewer,
  titled with the name, the frame's width and up to 40rem tall, scrolling itself; `image/*` but
  `image/svg+xml` in an img, its alt the name, at its natural size or narrower, its aspect kept;
  `audio/*` and `video/*` in their native elements with controls, labelled with the name, the
  viewer's width. `text/html` still shows as text, never as a page. The `content-type` decides
  the view, and the object URL's bytes are typed by it, never by the Blob, so a disagreeing Blob
  never loads as a page. A native type's type and subtype must each be an HTTP token, since a
  browser sniffs bytes of a type it can't parse, or reads `image/png,text/html` as the list's
  last type, a page. The viewer owns the URL: it makes it while connected, revokes it as the content or its type changes
  and as it disconnects, and makes it again on reconnecting. A native type with no Blob yet shows
  the loading note. A string content for a text type is unchanged.
- `sl-artifact-viewer` shows text whenever the content is text, "can't be shown" its last resort.
  The textual application types, exported as `TEXT_TYPES` (application/xml, application/javascript,
  application/ecmascript, application/yaml, application/x-yaml, application/toml,
  application/csv, application/x-ndjson, application/sql, application/x-sh, and
  application/x-shellscript), and any subtype ending in +xml or +yaml, `image/svg+xml` and
  `application/xhtml+xml` among them, show their source as text, from a string and from no URL. A
  text/ type is text however it is written, `text/plain,x` included. Any other type, an unknown or
  a malformed one, takes a Blob, and the viewer reads its bytes: its first MiB, `SNIFF_BYTES`,
  decoded as UTF-8 with no C0 control character but tab, line feed, form feed, and carriage
  return, shows as text, and only bytes that fail that, a NUL among them, show the note and a
  link that downloads them under the artifact's name, typed `application/octet-stream`. The loading note shows until the read ends, and
  `updateComplete` waits for it.

### Changed

- `viewOf(contentType)` returns `{ view, content }` in place of the view alone: `view` adds
  `pdf`, `image`, `audio`, and `video`, and `unknown` replaces `unsupported`, a type that names no
  view, whose Blob's bytes decide; `content` says what the view takes, `text` or `blob`, so a
  consumer fetches text for a text type and a Blob for any other. A caller that compared its
  result to `"unsupported"` decides on `viewOf(type).content`; `image/svg+xml` is now `text`, and
  `image/*` other than SVG, `audio/*`, `video/*`, and `application/pdf` are native.

### Removed

- The unit tier's brotli budget check, which failed the check when the pack's runtime files, each
  compressed alone with brotli, summed over 45,000 B. The layer's size is now measured, at the end
  of a session's work, not enforced per commit.

### Fixed

- `sl-artifact-viewer`'s valid JSON shows its own keys, order, and numbers: it is formatted from
  its tokens by `formatJson()`, where it was parsed and printed again, which moved integer-like
  keys first, rewrote number literals, `1.0` as `1`, `1e3` as `1000`, and `9007199254740993` as
  `9007199254740992`, and dropped all but the last of a duplicated key. Its strings keep their
  escapes as written. Whether the content is valid JSON is still decided by `JSON.parse`, and
  invalid JSON still shows as text under its note.
- `sl-chat-thread`'s function call arguments and function output, when valid JSON, show their own
  keys, order, numbers, and duplicates: they are formatted from their tokens by `formatJson()`,
  where they were parsed and printed again, with the same misrepresentation the viewer had.
  `JSON.parse` still decides validity alone, and text that doesn't parse still shows as it is.

## [0.7.0] - 2026-11-01

### Added

- `sl-artifact-viewer`'s `noHeader` property, reflected to the `no-header` boolean attribute,
  leaves out the viewer's header, the artifact's name and content type over its content, for a
  page that shows them in a header of its own. The frame then starts where the header did, with
  no gap, in every state, and every state keeps its accessible name, `<name> content`, so what
  it shows stays tied to its artifact without the header. The default, the header shown, is
  unchanged.
- `sl-stage-timeline`'s `TimelineStage` takes a failed stage's `failedAt`, when it failed, and
  `reason`, why, as a run's stage carries `failed_at` and `reason`. A failed stage shows
  `failedAt` in its time's slot, and its reason on a line under its label, in the muted text with
  the label in the failure's red, inside its list item, so assistive technology reads it with the
  stage's name, state, and time. A long reason wraps to the timeline's width, never widening it,
  the markers and the text column aligned. A failed stage with no `failedAt` still shows its
  `completedAt`, so a consumer that passed the failure's time there keeps working; every other
  state, and a reason on any stage but a failed one, is unchanged.
- `sl-entry`'s `statusTone` property, reflected to the `status-tone` attribute, shows the status
  in a status hue, by the components' own status vocabulary and hues: `active` in the accent
  hook, `var(--accent-color, var(--magenta))`, as the timeline's active stage; `complete` in
  `--green`; `incomplete` in `--orange`, as the chat thread's incomplete item; and `failed` in
  `--red`. Only the color changes, so a tone moves nothing, and the status's text still says the
  state. With no tone, or a value outside the four, the status stays muted in `--fg-2`, as
  before; the item's shape is unchanged.
- `sl-document-list`'s `DocumentItem` takes an optional `status_tone`, which the list hands to
  the document's entry as its `statusTone`, so a failed run's status shows in red and a complete
  one's in green. A document without one shows its status muted, as before.

### Fixed

- `sl-artifact-viewer` names every state for its artifact, as it named the ready content's
  region. The loading, error, and unsupported notes, which sat in no named container, are now in
  a region named `<name> content`, the frame around the note; invalid JSON's note describes its
  raw text's region, by `aria-describedby`. Empty content of a supported type shows a note, "This
  artifact is empty.", in that named frame, in place of an empty scrolling region; empty JSON,
  which showed an invalid JSON note over an empty region, shows it too.

## [0.6.1] - 2026-11-01

### Fixed

- `sl-drawer`'s heading, its `label`, is at `--text-l`, the foundation's h4 size, in the docked
  aside and in the drawer. It took the baseline `h2`'s `--text-2xl`, a page section's size, and
  competed with the page's own headings. Its weight, leading, and font are unchanged.
- `sl-drawer`'s scrolling body keeps a focused control's whole focus outline in view. Focus
  scrolled the control flush with the body's top or bottom edge, which cut off the outline's
  4px there; the body's scroll padding now matches its padding, `--space-s`, so focus stops a
  padding short of the edge, as the content sits at rest.
- `sl-upload-dropzone`'s focused Cancel button no longer draws its focus outline over the
  progress bar and the bytes sent below it. An upload's two lines sat `--space-3xs` apart; they
  now sit apart by the outline's reach, `--line-m` plus the foundation's 2px offset, and
  `--space-3xs` beyond it. Every upload is that much taller, in every state, so one that finishes
  keeps its height.

## [0.6.0] - 2026-10-31

### Changed

- `sl-drawer` docks at exactly `dock`: `dock` is the width at which it docks, read in the media
  query `(width < <dock>)` in place of `(max-width: <dock>)`, so at exactly `dock` it now docks,
  where it was a drawer before; it is a drawer only below `dock`. A page that wrote a value just
  under its breakpoint, `47.99rem` for 48rem, to dock at it, can write the breakpoint itself. A
  length the query can't read still leaves the drawer docked.
- `sl-drawer`'s docked `aside` has the drawer's header: `label` as a visible `h2`, which names the
  aside by `aria-labelledby` in place of `aria-label`, with no Close button. Each mode renders only
  its own header, so the shadow tree holds one heading at a time, and the slotted content needs no
  heading of its own; a page that gave the docked content a title of its own drops it. The aside
  is a column, the header over the content, which scrolls below the header when the host is held
  shorter than it, as the drawer's body does.
- The active stage in `sl-stage-timeline` (its marker's border, tint, glyph, and ring, and its
  label), the streaming dot in `sl-chat-thread`, and the selected frame in `sl-entry`, which
  `sl-document-list`'s selected document shows, take the foundation's accent hook,
  `var(--accent-color, var(--magenta))`, magenta by default, where they took the interaction
  color, blue: each marks what is current, active, or in progress, not what can be acted on. The
  focus ring, links, hover, and the upload dropzone's drag-over stay in the interaction color, so
  a selected entry's frame and its focus ring now differ by hue as well. A page that set
  `--interaction-color` to restyle these marks sets `--accent-color`.
- The foundation peer is `^0.3.0`, where it was `^0.2.0`: the accent hook is v0.3.0's. In it the
  upload dropzone's native progress bars follow the accent too.

## [0.5.0] - 2026-10-31

### Added

- `./drawer.js` defines `sl-drawer`, a responsive drawer for a narrow layout: its children, in the
  default slot, sit in one of two shadow wrappers by the mode. Wider than `dock`, a CSS length
  (48rem by default) read in the media query `(max-width: <dock>)`, the drawer is docked: an
  `aside`, a complementary landmark named by `label`, laid out as an ordinary block in the host's
  place, always shown and taking no focus; `open` stays false there, and `show()`, `close()`, and
  `toggle()` do nothing. At or below `dock` the drawer is closed until `show()`, `toggle()`, or
  `open`, reflected, opens it, a native dialog shown with `showModal()`: it covers the viewport
  edge to edge, the page behind inert, and focus moves inside it. `open` in the markup, or set
  before the element is connected, opens it so as the page loads, sending `open`, and is reverted
  to false while docked, sending nothing. Its header holds `label` as an
  `h2`, which names the dialog, and a Close button whose accessible name is its text and the
  label, "Close Documents"; the text is the `close` slot's, "Close" by default, for a translation.
  The header stays in view while the content below it scrolls. The Close button, Escape,
  `close()`, `toggle()`, or `open` set false closes it, and the dialog returns focus to the
  element that held it. It slides in and out from the inline-start edge, the right in a
  right-to-left page, by a 200ms translate, only when the reader allows motion. It dispatches
  `open` and `close`, each with `{}`, bubbling and composed, as the modal drawer opens and closes,
  never on a switch between the modes: a viewport or a `dock` that crosses the width swaps only
  the shadow wrapper, so the slotted content is never moved, disconnected, or re-created, and
  nothing slides; an open drawer docks, and docked content becomes a closed drawer.
- `demo/drawer.html`, the drawer's specimen page: an app's frame, captured docked at 1280px and
  closed, open, and open right to left at 480px.

### Changed

- `sl-entry`'s meta line no longer opens with its kind, "file" or "directory": a file's line is its
  size, absent while pending, its content type, and its time, and a directory's its time alone.
  The kind stays in the button's accessible name, after the status, in a visually hidden span, so
  a screen reader still says which an entry is; `open`'s detail is still `{ id, kind }`.

### Fixed

- `sl-entry`'s accessible name carries a file's content type whole, "text/plain" rather than
  "text/ plain": each break opportunity the meta line puts after the type's slash, dots, hyphens,
  and plus is now `aria-hidden`, since Chrome's accessibility tree read each as a space. The type
  wraps at its punctuation as before.
- `sl-upload-dropzone`'s bytes sent hold the width of "999 bytes", the widest count now that the
  foundation's `formatBytes` writes the long unit under 1 kB (from v0.2.2), so the bar keeps its
  length as a count climbs past 1 kB in a type whose letters are as wide as its digits.

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

[Unreleased]: https://github.com/JaimeStill/spike-html-apps-components/compare/v0.10.1...HEAD
[0.10.1]: https://github.com/JaimeStill/spike-html-apps-components/compare/v0.10.0...v0.10.1
[0.10.0]: https://github.com/JaimeStill/spike-html-apps-components/compare/v0.9.1...v0.10.0
[0.9.1]: https://github.com/JaimeStill/spike-html-apps-components/compare/v0.9.0...v0.9.1
[0.9.0]: https://github.com/JaimeStill/spike-html-apps-components/compare/v0.8.0...v0.9.0
[0.8.0]: https://github.com/JaimeStill/spike-html-apps-components/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/JaimeStill/spike-html-apps-components/compare/v0.6.1...v0.7.0
[0.6.1]: https://github.com/JaimeStill/spike-html-apps-components/compare/v0.6.0...v0.6.1
[0.6.0]: https://github.com/JaimeStill/spike-html-apps-components/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/JaimeStill/spike-html-apps-components/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/JaimeStill/spike-html-apps-components/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/JaimeStill/spike-html-apps-components/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/JaimeStill/spike-html-apps-components/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/JaimeStill/spike-html-apps-components/releases/tag/v0.1.0
