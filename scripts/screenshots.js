// screenshots.sh's capture half: each specimen page in every profile and scheme, through the
// browser tier's driver, one full-page PNG per capture into the directory its argument names,
// printing `<path>\t<caption>` for each. A capture sets the profile's attributes on the root, then
// reaches the focus state with real Tab presses, so :focus-visible matches.
// Adapted from spike-html-apps-foundation (679e550): scripts/screenshots.js, its states the
// specimen pages, each captured whole, and the focus reached by Tab.

import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { launch } from "../test/browser/support/browser-pipe.js";
import { serve } from "../test/browser/support/server.js";

const [dir] = process.argv.slice(2);
if (!dir) throw new Error("usage: node scripts/screenshots.js <directory>");

/** The default profile of each facet, by its attribute. */
const DEFAULTS = { "data-palette": "flexoki", "data-space": "regular", "data-type": "mono" };

/** The profiles, each a name and the attribute it sets over the defaults: every color, then the
 * other space and the other type at the default color. */
const PROFILES = [
  ...["flexoki", "primer", "catppuccin", "everforest"].map((name) => [name, "data-palette"]),
  ["compact", "data-space"],
  ["sans", "data-type"],
];

const SCHEMES = ["light", "dark"];

/** The viewport: each capture takes the page's full height at this width. */
const SIZE = { width: 1280, height: 800 };

/** The specimen pages, in the order they're named: each component's page under demo/. */
const PAGES = [
  ["1-status-badge", "the status badge", "status-badge"],
  ["2-entry", "the entry", "entry"],
  ["3-pagination", "the pagination", "pagination"],
];

/** Sends Tab, as a keyboard presses it, so the browser moves focus and marks it focus-visible. */
async function pressTab(page) {
  const event = { key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 };
  await page.cdp("Input.dispatchKeyEvent", { type: "keyDown", ...event });
  await page.cdp("Input.dispatchKeyEvent", { type: "keyUp", ...event });
}

/** Resolves once every component on the page has rendered: each custom element defined and
 * every Lit element's update complete. */
const RENDERED = `(async () => {
  const tags = [...new Set([...document.querySelectorAll("*")]
    .map((el) => el.localName).filter((name) => name.includes("-")))];
  await Promise.all(tags.map((tag) => customElements.whenDefined(tag)));
  await Promise.all([...document.querySelectorAll(tags.join(",") || "x-none")]
    .map((el) => el.updateComplete));
})()`;

/** Focuses the focus section's mark, which takes focus only by script, and returns how many Tab
 * presses reach the component's focus state. */
const FOCUS_START = `(() => {
  const mark = document.querySelector("[data-focus-start]");
  mark.focus();
  return Number(mark.dataset.focusStart) || 1;
})()`;

/** Resolves once the fonts are ready and two frames have painted. */
const SETTLED = `document.fonts.ready.then(() => new Promise((resolve) =>
  requestAnimationFrame(() => requestAnimationFrame(resolve))))`;

const server = await serve();
const browser = await launch();
try {
  for (const [name, caption, file] of PAGES) {
    for (const [profile, attribute] of PROFILES) {
      for (const scheme of SCHEMES) {
        const page = await browser.open(`${server.origin}/demo/${file}.html`);
        try {
          await page.cdp("Emulation.setDeviceMetricsOverride", {
            ...SIZE,
            deviceScaleFactor: 1,
            mobile: false,
          });
          // A headless page never has the window's focus, which :focus-visible otherwise needs.
          await page.cdp("Emulation.setFocusEmulationEnabled", { enabled: true });
          await page.cdp("Emulation.setEmulatedMedia", {
            features: [{ name: "prefers-color-scheme", value: scheme }],
          });
          const attributes = { ...DEFAULTS, [attribute]: profile, "data-scheme": scheme };
          await page.evaluate(`(() => {
            const root = document.documentElement;
            for (const [name, value] of Object.entries(${JSON.stringify(attributes)})) {
              root.setAttribute(name, value);
            }
          })()`);
          await page.evaluate(RENDERED);
          const presses = await page.evaluate(FOCUS_START);
          for (let press = 0; press < presses; press++) await pressTab(page);
          await page.evaluate(SETTLED);
          const { cssContentSize } = await page.cdp("Page.getLayoutMetrics");
          const clip = { x: 0, y: 0, width: SIZE.width, height: cssContentSize.height, scale: 1 };
          const { data } = await page.cdp("Page.captureScreenshot", {
            format: "png",
            clip,
            captureBeyondViewport: true,
          });
          const path = join(dir, `${name}--${profile}-${scheme}.png`);
          writeFileSync(path, Buffer.from(data, "base64"));
          console.log(`${path}\t${caption}: ${profile}, ${scheme}`);
        } finally {
          await page.close();
        }
      }
    }
  }
} finally {
  await browser.close();
  await server.stop();
}
