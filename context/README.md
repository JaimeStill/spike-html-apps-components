# spike-html-apps-components

spike-html-apps-components is the components layer of
[spike-html-apps](https://github.com/JaimeStill/spike-html-apps): eleven Lit components with shadow
roots, their sheets, and a Markdown renderer. It is built on the foundation's release
tag as a consumer installs it, and released by tag. This context records only working knowledge
the code and the README do not express.

## Working knowledge

- The layer is a copy, under a new name, of the source its provenance lines name; an upstream fix
  is ported by hand, never taken as a dependency.
- A version bump, with its `CHANGELOG.md` section headed `## [<version>]`, is what releases; a push
  to main that bumps nothing ends green.

## Notes

- [`foundation-candidates.md`](foundation-candidates.md): the patterns the components keep locally
  that the foundation could own, grouped by the shape the foundation would give them.
