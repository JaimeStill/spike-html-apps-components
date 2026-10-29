// screenshots.sh's capture half: each specimen page in each of the run's profiles, light and
// dark, through the browser tier's driver, each page captured whole as vertical tiles, one PNG per
// tile into the directory its first argument names, printing `<path>\t<caption>` for each. The
// arguments after the directory choose the profiles: none, the defaults alone; `--palette`,
// `--space`, and `--type`, each with a name, that facet's profile over the defaults, combined;
// `--all`, every color at the defaults, then compact and sans at the default color. Each named
// profile is checked against the registry of every specimen page, after it loads, before any
// capture: an unknown name prints the facet's registered names and exits 2. `--page`, with a
// specimen page's name, repeatable, captures only the pages named, an unknown name printing the
// pages' names and exiting 2 before the browser launches; `--scheme`, light or dark, captures that
// scheme alone. Both join the profile arguments and `--all` alike. Each file name and
// caption names the whole profile, color, space, and type, so every run's names are unambiguous.
// A tile is at most TILE tall, so no capture runs many screens tall where icat scales it to the
// terminal's width; a page that fits in one tile keeps its name and caption without the
// `--<k>of<m>` and `(k of m)` suffix. A capture sets the profile's attributes on the root, then
// reaches the focus state with real Tab presses, so :focus-visible matches.
// Adapted from spike-html-apps-foundation (679e550): scripts/screenshots.js, its states the
// specimen pages, each captured whole in tiles, the focus reached by Tab, and its profiles chosen
// by argument.

import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { launch } from "../test/browser/support/browser-pipe.js";
import { serve } from "../test/browser/support/server.js";

const USAGE =
  "usage: node scripts/screenshots.js <directory> [--all | [--palette <name>] [--space <name>] [--type <name>]] [--page <name>]... [--scheme light|dark]";

/** Each facet's flag, the registry's facet it names, the root attribute it sets, and its
 * default profile. */
const FACETS = [
  { flag: "--palette", facet: "color", attribute: "data-palette", fallback: "flexoki" },
  { flag: "--space", facet: "space", attribute: "data-space", fallback: "regular" },
  { flag: "--type", facet: "type", attribute: "data-type", fallback: "mono" },
];

/** The default profile: each facet's default, by its attribute. */
const DEFAULTS = Object.fromEntries(FACETS.map(({ attribute, fallback }) => [attribute, fallback]));

/** --all's profiles: every color, then the other space and the other type at the default color,
 * each by the attribute it sets over the defaults. */
const ALL = [
  ...["flexoki", "primer", "catppuccin", "everforest"].map((name) => ({ "data-palette": name })),
  { "data-space": "compact" },
  { "data-type": "sans" },
].map((over) => ({ ...DEFAULTS, ...over }));

const [dir, ...args] = process.argv.slice(2);
if (!dir) throw new Error(USAGE);

const SCHEMES = ["light", "dark"];

/** The run's choice: `all`, or each named facet's name by its flag; the pages named, in the order
 * named; and the scheme named, if any. */
const named = new Map();
let all = false;
const pageNames = [];
let schemeName;
for (let index = 0; index < args.length; index++) {
  const arg = args[index];
  if (arg === "--all") all = true;
  else if (FACETS.some(({ flag }) => flag === arg) && index + 1 < args.length) {
    named.set(arg, args[++index]);
  } else if (arg === "--page" && index + 1 < args.length) pageNames.push(args[++index]);
  else if (
    arg === "--scheme" &&
    schemeName === undefined &&
    SCHEMES.includes(args[index + 1] ?? "")
  ) {
    schemeName = args[++index];
  } else throw new Error(USAGE);
}
if (all && named.size) throw new Error(USAGE);

/** The run's profiles, each the root attributes it sets. */
const PROFILES = all
  ? ALL
  : [
      Object.fromEntries(
        FACETS.map(({ flag, attribute, fallback }) => [attribute, named.get(flag) ?? fallback]),
      ),
    ];

/** The viewport: each page is captured over its full height at this width. */
const SIZE = { width: 1280, height: 800 };

/** A tile's greatest height, in CSS px at SIZE's width. */
const TILE = 1200;

/** How far up from a tile's foot a cut may move to a section's top: the tile's last quarter. */
const SECTION_SLACK = TILE / 4;

/** How far up a cut may move to a state's top, when no section's top is near: the tile's last
 * half, since a state can be taller than a quarter tile (a pagination state is about 340px), and
 * a narrower window would leave some tiles no state boundary to cut at. */
const STATE_SLACK = TILE / 2;

/** The specimen pages, in the order they're named: each component's page under demo/. */
const PAGES = [
  ["1-status-badge", "the status badge", "status-badge"],
  ["2-entry", "the entry", "entry"],
  ["3-pagination", "the pagination", "pagination"],
  ["4-artifact-viewer", "the artifact viewer", "artifact-viewer"],
  ["5-chat-thread", "the chat thread", "chat-thread"],
  ["6-composer", "the composer", "composer"],
];

/** The run's pages: those `--page` names, each once, in PAGES' order, or every page when none is
 * named. An unknown name prints every page's name and exits 2, before the server or the browser
 * starts. */
const unknownPage = pageNames.find((name) => !PAGES.some(([, , file]) => file === name));
if (unknownPage !== undefined) {
  console.error(
    `screenshots: unknown page ${unknownPage}; the specimen pages: ${PAGES.map(([, , file]) => file).join(", ")}`,
  );
  process.exit(2);
}
const RUN_PAGES = pageNames.length ? PAGES.filter(([, , file]) => pageNames.includes(file)) : PAGES;

/** The run's schemes: the one `--scheme` names, or both. */
const RUN_SCHEMES = schemeName ? [schemeName] : SCHEMES;

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

/** The page's preferred cuts, as offsets from its top: each top-level section's top, then each
 * state's figure's top, so a tile seldom splits a state mid-way. */
const BOUNDARIES = `(() => {
  const top = (el) => Math.floor(el.getBoundingClientRect().top + window.scrollY);
  return {
    sections: [...document.querySelectorAll("main > section")].map(top),
    states: [...document.querySelectorAll("main > section figure.state")].map(top),
  };
})()`;

/**
 * The page's tiles, top to bottom, each `[top, height]`, meeting edge to edge. Each tile ends at
 * the lowest section boundary within its last SECTION_SLACK px, else the lowest state boundary
 * within its last STATE_SLACK px, else TILE px down; the last ends at the page's foot.
 *
 * @param {number} height the page's height
 * @param {{ sections: number[]; states: number[] }} boundaries
 */
function tiles(height, { sections, states }) {
  const result = [];
  for (let top = 0; top < height;) {
    let end = Math.min(top + TILE, height);
    if (end < height) {
      const within = (slack) => (offset) => offset > end - slack && offset <= end;
      end =
        Math.max(...sections.filter(within(SECTION_SLACK)), 0) ||
        Math.max(...states.filter(within(STATE_SLACK)), 0) ||
        end;
    }
    result.push([top, end - top]);
    top = end;
  }
  return result;
}

/** The page's registry, read from the foundation's store at its well-known global key: each
 * facet's registered names, so a profile an extension page registers counts too. */
const REGISTRY = `(() => {
  const store = globalThis[Symbol.for("spike-html-apps-foundation.registry")] ?? {};
  return { color: store.color ?? [], space: store.space ?? [], type: store.type ?? [] };
})()`;

/** Resolves once the fonts are ready and two frames have painted. */
const SETTLED = `document.fonts.ready.then(() => new Promise((resolve) =>
  requestAnimationFrame(() => requestAnimationFrame(resolve))))`;

/**
 * The first named profile some specimen page hasn't registered, as the message naming the
 * facet's valid names on that page, or undefined when every page registers every named profile.
 * Each page is read once it loads, so its modules have registered their profiles.
 */
async function unknownProfile(browser, origin) {
  for (const [, , file] of RUN_PAGES) {
    const page = await browser.open(`${origin}/demo/${file}.html`);
    try {
      const registry = await page.evaluate(REGISTRY);
      for (const { flag, facet } of FACETS) {
        const value = named.get(flag);
        if (value !== undefined && !registry[facet].includes(value)) {
          const facetName = flag.slice(2);
          return `screenshots: unknown ${facetName} ${value}; the ${facetName}s ${file}.html registers: ${registry[facet].join(", ")}`;
        }
      }
    } finally {
      await page.close();
    }
  }
  return undefined;
}

const server = await serve();
const browser = await launch();
try {
  const unknown = named.size ? await unknownProfile(browser, server.origin) : undefined;
  if (unknown) {
    console.error(unknown);
    process.exitCode = 2;
  }
  for (const [name, caption, file] of unknown ? [] : RUN_PAGES) {
    for (const profile of PROFILES) {
      const label = FACETS.map(({ attribute }) => profile[attribute]);
      for (const scheme of RUN_SCHEMES) {
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
          const attributes = { ...profile, "data-scheme": scheme };
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
          const full = Math.ceil(cssContentSize.height);
          const cuts = tiles(full, await page.evaluate(BOUNDARIES));
          // The viewport as tall as the page, so every tile lies inside it: Chromium paints a
          // scrolling region's scrollbars only inside the viewport, and a capture beyond it would
          // drop them below the first screen. The width stays, so the layout doesn't change.
          await page.cdp("Emulation.setDeviceMetricsOverride", {
            ...SIZE,
            height: Math.max(SIZE.height, full),
            deviceScaleFactor: 1,
            mobile: false,
          });
          await page.evaluate(SETTLED);
          for (const [index, [y, height]] of cuts.entries()) {
            const { data } = await page.cdp("Page.captureScreenshot", {
              format: "png",
              clip: { x: 0, y, width: SIZE.width, height, scale: 1 },
            });
            const [suffix, count] =
              cuts.length > 1
                ? [`--${index + 1}of${cuts.length}`, ` (${index + 1} of ${cuts.length})`]
                : ["", ""];
            const path = join(dir, `${name}--${label.join("-")}-${scheme}${suffix}.png`);
            writeFileSync(path, Buffer.from(data, "base64"));
            console.log(`${path}\t${caption}: ${label.join(", ")}, ${scheme}${count}`);
          }
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
