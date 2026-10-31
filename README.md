# spike-html-apps-components

The components layer of [spike-html-apps](https://github.com/JaimeStill/spike-html-apps):
eleven Lit components with shadow roots, their sheets, and a Markdown renderer. It is ES modules
with their type declarations and stylesheets, built on the foundation, which they take as a peer,
and is released by git tag.

## Install

Each release is a tag, `v<version>`, whose tree is the package as `pnpm pack` builds it:
`package.json`, this README, the LICENSE, and `dist/`; each GitHub release also carries the
tarball. It depends on lit 3.3.3 and marked 18.1.2, and takes
[the foundation](https://github.com/JaimeStill/spike-html-apps-foundation) as a peer at
`^0.2.0`: a consumer declares the foundation beside the components, from any of its sources, and
the one copy serves both, so a restyle of the foundation's sheets by package name reaches the
components' shadow roots too. Install both by their tags:

```
npm install --allow-git=root github:JaimeStill/spike-html-apps-components#v0.4.0 github:JaimeStill/spike-html-apps-foundation#v0.2.1
pnpm add github:JaimeStill/spike-html-apps-components#v0.4.0 github:JaimeStill/spike-html-apps-foundation#v0.2.1
bun add github:JaimeStill/spike-html-apps-components#v0.4.0 github:JaimeStill/spike-html-apps-foundation#v0.2.1
```

Or by their release tarballs:

```
npm install --allow-remote=root https://github.com/JaimeStill/spike-html-apps-components/releases/download/v0.3.0/jaimestill-spike-html-apps-components-0.3.0.tgz https://github.com/JaimeStill/spike-html-apps-foundation/releases/download/v0.2.0/jaimestill-spike-html-apps-foundation-0.2.0.tgz
pnpm add https://github.com/JaimeStill/spike-html-apps-components/releases/download/v0.3.0/jaimestill-spike-html-apps-components-0.3.0.tgz https://github.com/JaimeStill/spike-html-apps-foundation/releases/download/v0.2.0/jaimestill-spike-html-apps-foundation-0.2.0.tgz
bun add https://github.com/JaimeStill/spike-html-apps-components/releases/download/v0.3.0/jaimestill-spike-html-apps-components-0.3.0.tgz https://github.com/JaimeStill/spike-html-apps-foundation/releases/download/v0.2.0/jaimestill-spike-html-apps-foundation-0.2.0.tgz
```

- npm 12 refuses a git dependency unless `--allow-git` allows it, and a remote tarball unless
  `--allow-remote` does; `root` allows only the ones the project declares itself, which both
  packages are.
- pnpm needs no guard: both are the project's own dependencies, at the top level, so
  `blockExoticSubdeps` never applies.
- bun needs no guard.
- Without the foundation declared, the install fails under all three, on the foundation's 404 from
  npmjs; bun still leaves the components installed with no foundation beside them.

## Use

The package is `@jaimestill/spike-html-apps-components`. Each module defines its element when
it is imported, and the element's shadow root adopts the foundation's reset and elements sheets,
then its own. The modules import `lit` and the foundation by package name and their sheets as CSS
module scripts, so a page reaches them through an import map or a bundler, and links the
foundation's `page.css`:

```html
<link rel="stylesheet" href="node_modules/@jaimestill/spike-html-apps-foundation/dist/page.css" />
<script type="module">
  import "@jaimestill/spike-html-apps-components/status-badge.js";
</script>
<sl-status-badge label="ready"></sl-status-badge>
```

- `./status-badge.js`: `sl-status-badge`, a label; a click dispatches `badge-select`.
- `./entry.js`: `sl-entry`, one directory or file of a document hierarchy, as a button, its name
  the primary text, its status and kind quiet labels; it dispatches `open`, and `selected`,
  reflected, frames it in the interaction color, moving nothing. It formats a file's size and its
  updated time with the foundation's `formatBytes` and `formatDateTime`. It sizes to its content in
  any parent, a shrink-to-fit one too, and stays inside its box down to 16rem, its supported
  minimum width.
- `./pagination.js`: `sl-pagination`, a page of entries between its summary and its controls, a
  `status` slot running on after the summary's text; it dispatches `page-change` and
  `page-size-change`.
- `./markdown.js`: `markdown(source)`, a Markdown string as a Lit template of plain elements, by
  marked's lexer: raw HTML shows as text, an image as its alt text, and a link is an anchor only
  to an http, https, or mailto URL or a relative one. It is the one module that imports marked,
  which an import map then maps too.
- `./artifact-viewer.js`: `sl-artifact-viewer`, one artifact's content by its content type, as
  rendered Markdown, pretty-printed JSON, or preformatted text, scrolling inside the viewer; it
  sends no event. It imports `./markdown.js`, so its page maps marked too.
- `./chat-thread.js`: `sl-chat-thread`, a conversation's items in order, a structural subset of
  Open Responses: a user's text as plain text, the assistant's as rendered Markdown, a refusal
  labelled, and a streaming reply re-rendered in place; with `verbose`, reasoning, function calls,
  and their outputs too, each collapsed in a native details. It exports its item types and sends
  no event. It imports `./markdown.js`, so its page maps marked too.
- `./composer.js`: `sl-composer`, a multi-line text field that grows to eight lines, and its
  send control, which a stop control replaces while `busy`; it dispatches `send` with the text,
  then clears the field, and `stop`. Its `send()` does what activating send does, so an app that
  sends on a key calls it; the composer binds no key.
- `./upload-dropzone.js`: `sl-upload-dropzone`, a zone that takes files by drop or through its
  picker button, and the app's uploads below it, each with its progress and a cancel control or
  its finished state; it dispatches `files-select` with an array of the files, and
  `upload-cancel` with an upload's id. It exports its upload type and binds no key.
- `./stage-timeline.js`: `sl-stage-timeline`, a run's stages as a connected, ordered list of
  steps in their positions' order, each its name, its state's label and marker, and its completion
  time by the foundation's `formatDateTime`; the active stage is the current step, and a stage that
  advances changes in place, moving nothing. It exports its stage type, holds nothing focusable,
  and sends no event.
- `./event-log.js`: `sl-event-log`, events as a log in the order given, each its type, its time by
  the foundation's `formatDateTime`, its source, subject, and id, and its data pretty-printed in a
  native details, collapsed; events appended leave those shown in place, and a constrained log
  scrolls inside, following the newest only from its end. It exports its event type, a CloudEvents
  subset, and sends no event.
- `./search-results.js`: `sl-search-results`, a search's matches under a status line, each a
  native button of its document's name, the field it matched in, and its snippet, the query marked
  case-insensitively as text; it dispatches `open` with a match's id, and has loading and error
  states. It exports its match type and binds no key.
- `./document-list.js`: `sl-document-list`, a page of documents composed of the components above,
  an `sl-entry` per document inside one `sl-pagination`, whose properties it takes under the same
  names and hands through; it frames the selected document's entry, and has empty, loading, and
  error states, said on the pagination's summary line when it shows one. The entry's `open` and
  the pagination's `page-change` and `page-size-change` reach its listener as their parts sent
  them; it dispatches none of its own. It exports its document type and binds no key.
- `./*.css`: each component's sheet, which its module imports itself.

`demo/components.html` puts the status badge, the entry, and the pagination on one page, with its
import map. Each component has a specimen page, `demo/<name>.html`, for `status-badge`, `entry`,
`pagination`, `artifact-viewer`, `chat-thread`, `composer`, `upload-dropzone`, `stage-timeline`,
`event-log`, `search-results`, and `document-list`. A specimen page shows every state of its
component, labelled, then again in a section 20rem wide, and, for a component that holds a
control, one instance reached by the keyboard to show its focus ring. The specimen pages link the
foundation's `page-full.css` and import its `register-full.js`, so a profile applies by its
attribute on the root.

`mise run screenshots` captures each specimen page light and dark, in vertical tiles at most
1200px tall. It runs the `spike-html-apps-screenshots` bin of
[spike-html-apps-tooling](https://github.com/JaimeStill/spike-html-apps-tooling) over the capture
description `scripts/screenshots.config.ts`, and checks a named profile against the pages'
registry. [Development](#development) lists the task's flags, and the tooling's README documents
them.

## Development

Tasks run through [mise](https://mise.jdx.dev):

```
mise run install                      # the pinned tools, and node_modules with the foundation and the tooling at their tags; reads the network
mise run check                        # lint, types, build, and the unit and browser tiers; reads no network
mise run build                        # src/ into dist/
mise run demo                         # serve the components demo page and the specimen pages on dist/
mise run screenshots                  # capture each specimen page at the defaults, flexoki, regular, and mono, light and dark, in tiles, inline in kitty
mise run screenshots --palette primer # the same, in the palette named; the facet flags combine
mise run screenshots --space compact  # the same, in the space named
mise run screenshots --type sans      # the same, in the type named
mise run screenshots --all            # the full matrix: the four colors at the defaults, then compact and sans at flexoki; no facet flag joins it
mise run screenshots --page entry     # only the page named; repeatable, and with any of the above
mise run screenshots --scheme dark    # only the scheme named, light or dark; with any of the above
mise run screenshots --output browser # a gallery of the captures, opened in the browser; directory keeps the files; with any of the above
mise run screenshots --dir <path>     # write the captures into the directory named, with any of the above
mise run screenshots --keep           # keep the terminal output's captures, with any of the above
mise run currency                     # report every tool, package, and action pin, the foundation's and the tooling's tags, and the foundation's peer range, behind its latest
```

The task's arguments follow its name, as above; `mise run screenshots -- --space compact` passes
them the same, and `mise run screenshots -- --help` lists the flags with the pages and profiles.
A usage error, an unknown page name, or a profile a page hasn't registered exits 2 before any
capture, an unknown name listing the valid ones.

A push to main whose `package.json` version has no tag yet releases it: the check, then the pack
committed and tagged, and a GitHub release from `CHANGELOG.md`.

## Provenance

The layer is copied from spike-html-packages-components at 4c0a5d8, its v0.2.0, and the
specimen pages' layout sheet and the screenshots task from spike-html-apps-foundation at 679e550.
Each copied file that takes comments names its source in a provenance line; the JSON files, which
take none, carry no line.

## License

[Apache License 2.0](LICENSE).
