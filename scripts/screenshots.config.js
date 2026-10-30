// mise run screenshots' description, which spike-html-apps-tooling's spike-html-apps-screenshots
// reads: each specimen page under demo/, captured whole in tiles; the profile's facets, palette,
// space, and type, at flexoki, regular, and mono; --all's profiles, every palette at the defaults,
// then compact and sans at flexoki; the profiles each page registers, from the foundation's
// registry; and the repository served as the browser tier serves it.
// Adapted from spike-html-apps-components (2fded6d): scripts/screenshots.js, its pages, facets,
// profiles, and registry read kept as a description of the tooling's command.

import { served } from "../test/browser/support/served.ts";

/** The specimen pages, in the order they're captured and numbered, each one full-page state. */
const pages = [
  ["status-badge", "the status badge"],
  ["entry", "the entry"],
  ["pagination", "the pagination"],
  ["artifact-viewer", "the artifact viewer"],
  ["chat-thread", "the chat thread"],
  ["composer", "the composer"],
  ["upload-dropzone", "the upload dropzone"],
  ["stage-timeline", "the stage timeline"],
  ["event-log", "the event log"],
  ["search-results", "the search results"],
  ["document-list", "the document list"],
].map(([name, caption]) => ({ name, caption, path: `demo/${name}.html` }));

/** The page's registered names, by flag, read from the foundation's store at its well-known
 * global key, so a profile an extension page registers counts too; its color facet is palette's. */
const REGISTRY = `(() => {
  const store = globalThis[Symbol.for("spike-html-apps-foundation.registry")] ?? {};
  return { palette: store.color ?? [], space: store.space ?? [], type: store.type ?? [] };
})()`;

/** @type {import("@jaimestill/spike-html-apps-tooling/screenshots.js").Description} */
export default {
  pages,
  facets: [
    { flag: "palette", attribute: "data-palette", default: "flexoki" },
    { flag: "space", attribute: "data-space", default: "regular" },
    { flag: "type", attribute: "data-type", default: "mono" },
  ],
  all: [
    ...["flexoki", "primer", "catppuccin", "everforest"].map((palette) => ({ palette })),
    { space: "compact" },
    { type: "sans" },
  ],
  profiles: (page) => page.evaluate(REGISTRY),
  server: served,
};
