# spike-html-apps-components

The components layer of [spike-html-apps](https://github.com/JaimeStill/spike-html-apps):
the status badge, the entry, and the pagination, Lit with shadow roots, and their sheets. It is ES
modules with their type declarations and stylesheets, built on the foundation, which they take as
a peer, and is released by git tag.

## Install

Each release is a tag, `v<version>`, whose tree is the package as `pnpm pack` builds it:
`package.json`, this README, the LICENSE, and `dist/`; each GitHub release also carries the
tarball. It depends on lit 3.3.3, and takes
[the foundation](https://github.com/JaimeStill/spike-html-apps-foundation) as a peer at
`^0.2.0`: a consumer declares the foundation beside the components, from any of its sources, and
the one copy serves both, so a restyle of the foundation's sheets by package name reaches the
components' shadow roots too. Install both by their tags:

```
npm install --allow-git=root github:JaimeStill/spike-html-apps-components#v0.2.0 github:JaimeStill/spike-html-apps-foundation#v0.2.0
pnpm add github:JaimeStill/spike-html-apps-components#v0.2.0 github:JaimeStill/spike-html-apps-foundation#v0.2.0
bun add github:JaimeStill/spike-html-apps-components#v0.2.0 github:JaimeStill/spike-html-apps-foundation#v0.2.0
```

Or by their release tarballs:

```
npm install --allow-remote=root https://github.com/JaimeStill/spike-html-apps-components/releases/download/v0.2.0/jaimestill-spike-html-apps-components-0.2.0.tgz https://github.com/JaimeStill/spike-html-apps-foundation/releases/download/v0.2.0/jaimestill-spike-html-apps-foundation-0.2.0.tgz
pnpm add https://github.com/JaimeStill/spike-html-apps-components/releases/download/v0.2.0/jaimestill-spike-html-apps-components-0.2.0.tgz https://github.com/JaimeStill/spike-html-apps-foundation/releases/download/v0.2.0/jaimestill-spike-html-apps-foundation-0.2.0.tgz
bun add https://github.com/JaimeStill/spike-html-apps-components/releases/download/v0.2.0/jaimestill-spike-html-apps-components-0.2.0.tgz https://github.com/JaimeStill/spike-html-apps-foundation/releases/download/v0.2.0/jaimestill-spike-html-apps-foundation-0.2.0.tgz
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
- `./entry-lit-shadow.js`: `sl-entry-lit-shadow`, one directory or file of a document hierarchy,
  as a button; it dispatches `open`.
- `./pagination-lit-shadow.js`: `sl-pagination-lit-shadow`, a page of entries between its summary
  and its controls; it dispatches `page-change` and `page-size-change`.
- `./*.css`: each component's sheet, which its module imports itself.

`demo/components.html` is a page on all three, with its import map. Each component also has a
specimen page, `demo/status-badge.html`, `demo/entry.html`, and `demo/pagination.html`: every
state, labelled, again 20rem wide, and its focus ring, on the foundation's `page-full.css`, so a
profile applies by its attribute on the root.

## Development

Tasks run through [mise](https://mise.jdx.dev):

```
mise run install     # the pinned tools, and node_modules with the foundation at its tag; reads the network
mise run check       # lint, types, build, and the unit and browser tiers; reads no network
mise run build       # src/ into dist/
mise run demo        # serve the components demo page and the specimen pages on dist/
mise run screenshots # capture each specimen page in every profile and scheme, inline in kitty; --keep keeps them
mise run currency    # report every tool, package, and action pin, and the foundation's tag and peer range, behind its latest
```

A push to main whose `package.json` version has no tag yet releases it: the check, then the pack
committed and tagged, and a GitHub release from `CHANGELOG.md`.

## Provenance

The layer is copied from spike-html-packages-components at 4c0a5d8, its v0.2.0. Each copied file
that takes comments names its source in a provenance line; the JSON files, which take none, carry
no line.

## License

[Apache License 2.0](LICENSE).
