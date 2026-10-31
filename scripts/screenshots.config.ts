// mise run screenshots' description, which spike-html-apps-tooling's spike-html-apps-screenshots
// reads: each specimen page under demo/, captured whole in tiles, and the drawer's page in its
// viewport at a wide and a narrow width, its drawer docked, closed, open, and open right to left;
// the profile's facets, palette, space, and type, at flexoki, regular, and mono; --all's profiles,
// every palette at the defaults, then compact and sans at flexoki; the profiles each page
// registers, from the foundation's registry; and the repository served as the browser tier
// serves it.
// Adapted from spike-html-apps-components (2fded6d): scripts/screenshots.js, its pages, facets,
// profiles, and registry read kept as a description of the tooling's command.

import type {
  DescribedPage,
  DescribedState,
  Description,
  Step,
} from "@jaimestill/spike-html-apps-tooling/screenshots.js";

import { served } from "../test/browser/support/served.ts";

/** The drawer page's mode is the viewport's: wider than its dock, 48rem, and at or below it. */
const wide = { width: 1280, height: 800 };
const narrow = { width: 480, height: 800 };

/** Opens the drawer as a user does, Enter on the toolbar's Documents button, the page's direction
 * set first, and resolves once its slide has ended; the drawer's first control holds focus. */
const opened =
  (dir: "ltr" | "rtl"): Step =>
  async (page) => {
    await page.evaluate(`document.documentElement.dir = "${dir}"`);
    await page.cdp("Emulation.setFocusEmulationEnabled", { enabled: true });
    await page.evaluate(`document.querySelector("#open-documents").focus()`);
    const enter = { key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 };
    await page.cdp("Input.dispatchKeyEvent", { type: "keyDown", ...enter, text: "\r" });
    await page.cdp("Input.dispatchKeyEvent", { type: "keyUp", ...enter });
    await page.evaluate(`(async () => {
      const dialog = document.querySelector("sl-drawer").shadowRoot.querySelector("dialog");
      await Promise.all(dialog.getAnimations({ subtree: true }).map((a) => a.finished));
    })()`);
  };

/** The drawer page's states, each its viewport alone. */
const drawerStates: DescribedState[] = [
  { name: "drawer-docked", caption: "the drawer, docked above 48rem", viewport: wide, full: false },
  {
    name: "drawer-closed",
    caption: "the drawer, closed at or below 48rem",
    viewport: narrow,
    full: false,
  },
  {
    name: "drawer-open",
    caption: "the drawer, open at or below 48rem",
    viewport: narrow,
    full: false,
    open: opened("ltr"),
  },
  {
    name: "drawer-open-rtl",
    caption: "the drawer, open at or below 48rem, right to left",
    viewport: narrow,
    full: false,
    open: opened("rtl"),
  },
];

/** The specimen pages, in the order they're captured and numbered, each one full-page state but
 * the drawer's. */
const pages: DescribedPage[] = (
  [
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
  ] satisfies [name: string, caption: string][]
)
  .map(([name, caption]): DescribedPage => ({ name, caption, path: `demo/${name}.html` }))
  .concat({
    name: "drawer",
    caption: "the drawer",
    path: "demo/drawer.html",
    states: drawerStates,
  });

/** The page's registered names, by flag, read from the foundation's store at its well-known
 * global key, so a profile an extension page registers counts too; its color facet is palette's. */
const REGISTRY = `(() => {
  const store = globalThis[Symbol.for("spike-html-apps-foundation.registry")] ?? {};
  return { palette: store.color ?? [], space: store.space ?? [], type: store.type ?? [] };
})()`;

const description: Description = {
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

export default description;
