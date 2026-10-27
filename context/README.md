# spike-html-apps-components

spike-html-apps-components is the components layer of [spike-html-apps](https://github.com/JaimeStill/spike-html-apps):
the status badge, the entry, and the pagination, Lit with shadow roots, and their sheets. It is built on the foundation's release tag as a consumer installs it, and released by tag. This context records only working knowledge the code and the README do not
express.

## Working knowledge

- The layer is a copy, under a new name, of the source its provenance lines name; an upstream fix
  is ported by hand, never taken as a dependency.
- A version bump, with its `CHANGELOG.md` section headed `## [<version>]`, is what releases; a push
  to main that bumps nothing ends green.
