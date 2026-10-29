# Foundation candidates

This note lists the patterns the components keep locally that the foundation could own. Each is
checked against `src/`: it recurs in two or more components, or it fills a gap in the foundation
that a component had to work around. They are grouped by the shape the foundation would give them,
so a foundation goal can stage them by group; each names what it is, where it occurs, why it is
shared, and that shape. A candidate the foundation takes leaves the
components' sheets in the same change, and leaves this note.

## Tokens

- **A control's block size.** `calc(1lh + 2 * var(--space-3xs) + 2 * var(--line-s))`, a line in
  the elements sheet's field and button padding and border. `composer.css` bounds the textarea at
  eight such lines; `upload-dropzone.css` sizes the strut that keeps an upload's first line as tall
  as its cancel control. Both restate the elements sheet's padding and border, so a change there
  would drift from them. Shape: a token, or the control's block padding and border as tokens a
  component can compute n lines from.
- **Status colors.** Complete or done in `--green`: `stage-timeline.css`, `upload-dropzone.css`.
  Failed or error in `--red`: `stage-timeline.css`, `upload-dropzone.css`, `chat-thread.css`, and
  the error state's label in `artifact-viewer.css`, `search-results.css`, and `document-list.css`.
  In progress in the interaction color: `stage-timeline.css` (the active stage),
  `chat-thread.css` (the streaming dot). Warning in `--orange`: `chat-thread.css` alone. Every
  component picks the same hue for the same meaning by name, as the foundation's color tokens ask,
  since they carry no role. Shape: role tokens, success, danger, warning, and active, each
  defaulting to its hue, which revisits that decision deliberately.
- **The interaction tint.** `color-mix(in srgb, var(--interaction-color, var(--blue)) 10%,
  transparent)` behind the drag-over zone in `upload-dropzone.css`, and at 12% behind the active
  marker in `stage-timeline.css`: one surface, at two strengths by accident. Shape: a token.

## Elements-sheet rules

- **A disabled text field.** The elements sheet styles a disabled button but not a disabled
  input, select, or textarea, which keep the enabled look. `composer.css` gives its textarea one:
  the divider's border, the `--bg-1` surface, `--fg-2` text. Every form that disables a field
  needs it. Shape: a `:disabled` rule beside the fields' outlined look.
- **A progress bar in a dark scheme.** The elements sheet leaves `progress` native, tinted by
  `accent-color`, and Chrome paints its track near white in a dark scheme. `upload-dropzone`'s
  bars show it. Shape: an elements-sheet rule for `progress` (and `meter`) whose track follows the
  scheme, on `--bg-2` or by `color-scheme`.

## Utilities

- **A bare list.** `margin: 0; padding: 0; list-style: none`, and `margin: 0` on each item to undo
  the elements sheet's step between items: `chat-thread.css`, `event-log.css`,
  `search-results.css`, `stage-timeline.css`, `document-list.css`, `upload-dropzone.css`. Every
  component that lists its items as a list. Shape: a utility class; not an elements-sheet rule,
  since prose lists keep their markers.
- **Keep whole.** `white-space: nowrap` on a size, a count, a time, an id, or a label, in every
  sheet but `artifact-viewer.css` and `status-badge.css`, with `font-variant-numeric: tabular-nums`
  where its digits change: the bytes in `upload-dropzone.css`, the time in `stage-timeline.css` and
  `event-log.css`. Shape: a utility class for each, or one for a numeric value that does both.
- **Break only when longer than the line.** A value that moves to the next line whole and breaks
  inside only when it alone is wider than the line: `max-inline-size: 100%` with
  `overflow-wrap: anywhere` on a metadata value in `event-log.css` and on inline code in
  `chat-thread.css`; `overflow-wrap: break-word` with a `wbr` after each slash, dot, hyphen, and
  plus on the content type in `entry.css` and `entry.ts`. Shape: a utility class, and a helper
  beside the formatters that puts a `wbr` after a value's punctuation.
- **One-line truncation.** `overflow: hidden; text-overflow: ellipsis; white-space: nowrap` on an
  upload's name in `upload-dropzone.css`. One component, but the foundation has no such utility
  and any list of names wants one. Shape: a utility class.
- **The scrolling frame.** The host a flex column; the frame `flex: 1 1 auto`, a grid of one
  `minmax(0, 1fr)` column, `min-block-size: 0`, `overflow: auto`, bordered as the pre is: as tall
  as its content, held by a consumer that constrains it and scrolling inside, and as wide as its
  content in a shrink-to-fit parent. `artifact-viewer.css`, `chat-thread.css`, `event-log.css`,
  each restating the recipe and its reasoning. Shape: a utility class for the frame, with the
  host's two declarations documented beside it.
- **A slot as wide as its widest content.** A grid cell stacking each alternative,
  `grid-area: 1 / 1`, those not shown `visibility: hidden`, so a change of text moves nothing:
  the state label and the time in `stage-timeline.css`, send and stop in `composer.css`. Shape: a
  utility class, its hidden alternatives `aria-hidden` by the markup.
- **The head row.** A name that grows to its own width, `flex: 1 1 16ch; max-inline-size:
  max-content`, and a quiet label at the line's end, `margin-inline-start: auto`, in a row that
  wraps the label under the name only when the two don't fit: `entry.css`, `artifact-viewer.css`,
  `search-results.css`, the last two noting they follow the entry's. Shape: a utility class for
  the row with one for each part.
- **Quiet label type.** Small and muted, `--text-s` or `--text-xs` in `--fg-2`, often in
  `--font-ui`: a status line, a time, a detail line, a summary, a metadata label beside its value.
  `entry.css`, `pagination.css`, `chat-thread.css`, `upload-dropzone.css`, `stage-timeline.css`,
  `event-log.css`, `search-results.css`, `document-list.css`. Shape: one or two utility classes,
  the small and the smallest step.
- **The status line.** One polite `role="status"` paragraph rendered in every state, so its text
  changes are read and never replaced, held a line tall when blank, `min-block-size: 1lh`, so its
  text coming or going moves nothing: `search-results.ts` and `.css`, `document-list.ts` and
  `.css`. Shape: a utility class for its type and reserved line, its markup documented.
- **Motion behind reduced motion.** Each animation or transition sits under
  `@media (prefers-reduced-motion: no-preference)`: the streaming dot's pulse in
  `chat-thread.css`, the active marker's ring in `stage-timeline.css`, the zone's color transition
  in `upload-dropzone.css`. Shape: an in-progress keyframes pair, pulse and ring, and duration
  tokens, in a sheet a shadow root adopts.
- **Visually hidden.** A label kept for assistive technology that takes no space, by `clip-path:
  inset(50%)` and a 1px box: `composer.css`, and the foundation's own `theme-menu.css`, privately.
  Shape: a utility class.

## Formatters

- **JSON, pretty-printed.** `JSON.stringify(…, null, 2)` in three local `pretty` functions:
  `artifact-viewer.ts` parses text and keeps the parser's reason when it fails; `chat-thread.ts`
  parses text and returns it raw when it fails; `event-log.ts` prints a value, a string as it is
  and a bigint as its digits, falling back to `String()` for a circular one. Shape:
  `formatJson(value)` and a parsing companion for text in `format.js`.
- **`formatBytes` below a kilobyte.** `formatBytes(0)` is "0 byte" and `formatBytes(1)` "1 byte":
  Intl's short byte unit doesn't pluralize. `upload-dropzone.ts` shows "0 byte of …" as an upload
  starts, and `entry.ts` shows an empty file's size so. Shape: a fix in `formatBytes`, the plural
  or the symbol "B" below 1 kB.

## Left local

These patterns stay in their components: each occurs in one, and fills no gap another component
has met.

- Pluralized counts ("1 match", "3 matches") and the query in typographic quotes:
  `search-results.ts`.
- A snippet's ellipses joined to their text by a word joiner: `search-results.ts`.
- The selected frame, the border and an inset line in the interaction color, yielding to the focus
  ring: `entry.css`; `sl-document-list` reaches it through the entry's `selected`.
