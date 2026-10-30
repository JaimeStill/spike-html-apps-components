# Standards

The judgement calls the check can't enforce, one line each, for the standards-reviewer. What
`mise run check` enforces is never restated here. They are spike-html-apps' Design, Layers, and
Code calls that apply to the components, with the source layer's calls that still hold.

The architecture pages that apply, in the architecture repository:

- `principles/minimal-footprint.md`
- `principles/rolling-currency.md`
- `principles/independent-releases.md`
- `principles/downward-dependencies.md`
- `principles/validation-first.md`

## Design

- spike-html-design v0.7.0 is the visual baseline: native elements keep its styling, and every
  profile renders as it does there.
- A component is finished in every state it can show (empty, loading, streaming, error, long
  content, narrow width) and in every profile, light and dark, regular and compact.
- Focus is always visible, and nothing shifts layout as data arrives. Motion is brief, or a quiet
  loop that signals ongoing work and ends with it; all of it honours reduced motion.
- A component sizes to its content in any parent, a shrink-to-fit one too: no container query or
  containment on the host, and none that sets the component's width. An inner element may query
  the width the component already has.
- A value, such as a size or a clock, never breaks inside itself; a narrow line breaks between
  values.
- Density, alignment, and spacing come from the foundation's tokens, never a literal.
- A visual change's session brief carries its screenshots per state and profile; the architect's
  acceptance is the design review, and a passing check alone doesn't ship one.

## Package

- The package is `@jaimestill/spike-html-apps-components`, one row of spike-html-apps' layer
  table: the components, built on the foundation.
- lit and marked are its two dependencies, each pinned exactly, and the foundation its one peer.
  Only a module that renders Markdown imports marked, so a page that imports none loads none of it.
- `dist/` lives only in a release tag's tree, the pack, never on a branch.
- Releases are `v<version>` annotated tags cut by `release.yml` from `package.json`'s version,
  each with its `CHANGELOG.md` section, and never changed or re-cut.

## Layers

- A component takes its data as its own properties, emits events, and imports no SDK or domain
  code; wiring lives in the app.
- No component binds a key; only the app binds keys.
- A layer resolves the layer below only through its release tag, as a consumer does: never a
  link, path alias, source condition, or project reference.

## Code

- Code meets the bar of spike-html-conventions' `layers/` code at a88828a: a header of about 2–6
  lines, a one-line doc comment per export, and comments only for a non-obvious why, beside the
  code it explains rather than in the header.
- A copied file names its source repository and commit in a provenance line, which reads
  `From|Adapted from <repo> (<commit>): <path>`. It names the immediate source alone; that source
  keeps the earlier lines.
- Sources use `.ts` relative specifiers, which tsc rewrites.
- The browser tier tests `dist/`, and no server transforms what it serves.
- Tests are TypeScript run under Node's type stripping, erasable syntax only, type-checked by
  `tsconfig.test.json`; browser-served fixtures stay `.js`.
- A mise task runs one script or one command, and `check` is a depends list.
