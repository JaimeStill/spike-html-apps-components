// The components from this repository's dist/: conventions' 27 probe cases, the restyle case, the
// adopted sheets, and the entry's formatting, on test/fixtures/components.html, on the lean entry
// and in every profile on the full entry; each component in every profile, on
// test/fixtures/profiles.html; and the entry's, the pagination's, the artifact viewer's, the chat
// thread's, the composer's, the upload dropzone's, the stage timeline's, the event log's, and the
// search results' geometry on their specimen pages under demo/, in every profile, the entry's, the
// viewer's, the thread's, the composer's, the dropzone's, the timeline's, the log's, and the
// results' in parents that size them to their content too.
// Adapted from spike-html-packages-components (4c0a5d8): test/browser/components.test.js, renamed,
// with the formatting, profile, and specimen geometry cases added.

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { launch } from "./support/browser-pipe.js";
import { serve } from "./support/server.js";

describe("components", { timeout: 60_000 }, () => {
  let server;
  let browser;
  before(async () => {
    server = await serve();
    browser = await launch();
  });
  after(async () => {
    await browser?.close();
    await server?.stop();
  });

  // The profiles the foundation's full entry carries: each color at the other facets' defaults,
  // then compact and sans each at the rest's, and each of those light and dark.
  const schemes = ["light", "dark"];
  const profiles = [
    ...["flexoki", "primer", "catppuccin", "everforest"].map((color) => ({ color })),
    { space: "compact" },
    { type: "sans" },
  ].flatMap((profile) => schemes.map((scheme) => ({ ...profile, scheme })));

  // Each case on the components page runs once on the lean entry, page.css, with no profile set,
  // and once in each profile combination on the full entry, page-full.css with register-full.js.
  const defaults = { color: "flexoki", space: "regular", type: "mono" };
  const runs = [
    { name: "on the lean page.css", query: "", dataset: {} },
    ...profiles.map((profile) => {
      const { color, space, type, scheme } = { ...defaults, ...profile };
      const query = new URLSearchParams({ entry: "full", palette: color, space, type, scheme });
      const dataset = { palette: color, space, type, scheme };
      return { name: `in ${color} ${space} ${type} ${scheme}`, query: String(query), dataset };
    }),
  ];

  /**
   * Opens the components page in a run's entry and profile, with the query's module when one is
   * given, resolving to the page once its run settles, its entry's sheet linked and its profile
   * set on the root.
   */
  async function open(run, module) {
    const query = new URLSearchParams(run.query);
    if (module !== undefined) query.set("module", module);
    const page = await browser.open(`${server.origin}/test/fixtures/components.html?${query}`);
    try {
      const { sheets, dataset } = await page.evaluate(`window.verdict.then(() => ({
        sheets: [...document.styleSheets].map((sheet) => sheet.href?.split("/").at(-1)),
        dataset: { ...document.documentElement.dataset },
      }))`);
      const entry = run.query === "" ? "page.css" : "page-full.css";
      assert.deepEqual({ sheets, dataset }, { sheets: [entry], dataset: run.dataset }, run.name);
    } catch (error) {
      await page.close();
      throw error;
    }
    return page;
  }

  /** Runs one case module on the components page, resolving to its verdict and report. */
  async function verdictOf(run, module) {
    const page = await open(run, module);
    try {
      return await page.evaluate(`window.verdict.then(() => ({
        verdict: document.getElementById("verdict").textContent,
        report: document.getElementById("report").textContent,
      }))`);
    } finally {
      await page.close();
    }
  }

  for (const run of runs) {
    test(`all 27 of conventions' probe cases hold, ${run.name}`, async () => {
      const { verdict, report } = await verdictOf(run, "probe");
      assert.equal(verdict, "ok: all 27 cases hold", report);
    });

    test(`one edit to the elements sheet repaints the buttons in both shadow roots, ${run.name}`, async () => {
      const { verdict } = await verdictOf(run, "restyle");
      assert.match(verdict, /^ok: /, verdict);
    });

    test(`each component adopts the foundation's reset and elements sheets, then its own, ${run.name}`, async () => {
      const page = await open(run);
      try {
        const { adopted, label } = await page.evaluate(`(async () => {
        // A CSS module script is one sheet per URL: the foundation's by the page's import map, the
        // URL its bare specifier in dist/ resolves to, and each component's own beside its module.
        const sheet = async (specifier) =>
          (await import(specifier, { with: { type: "css" } })).default;
        const foundation = "@jaimestill/spike-html-apps-foundation";
        const reset = await sheet(foundation + "/baseline/reset.css");
        const elements = await sheet(foundation + "/baseline/elements.css");
        const components = [
          ["sl-search-results", "search-results", "search-results.css"],
          ["sl-event-log", "event-log", "event-log.css"],
          ["sl-stage-timeline", "stage-timeline", "stage-timeline.css"],
          ["sl-upload-dropzone", "upload-dropzone", "upload-dropzone.css"],
          ["sl-composer", "composer", "composer.css"],
          ["sl-chat-thread", "chat-thread", "chat-thread.css"],
          ["sl-artifact-viewer", "artifact-viewer", "artifact-viewer.css"],
          ["sl-pagination", "pagination", "pagination.css"],
          ["sl-entry", "entry", "entry.css"],
          ["sl-status-badge", "status-badge", "status-badge.css"],
        ];
        const adopted = {};
        for (const [tag, module, own] of components) {
          await import("/dist/" + module + ".js");
          const ownSheet = await sheet("/dist/" + own);
          const element = document.body.appendChild(document.createElement(tag));
          await element.updateComplete;
          adopted[tag] = element.shadowRoot.adoptedStyleSheets.map((s) =>
            s === reset ? "reset" : s === elements ? "elements" : s === ownSheet ? "own" : "other");
        }
        const badge = document.querySelector("sl-status-badge");
        badge.label = "Draft";
        await badge.updateComplete;
        return { adopted, label: badge.shadowRoot.querySelector("button").textContent };
      })()`);
        for (const tag of [
          "sl-search-results",
          "sl-event-log",
          "sl-stage-timeline",
          "sl-upload-dropzone",
          "sl-composer",
          "sl-chat-thread",
          "sl-artifact-viewer",
          "sl-pagination",
          "sl-entry",
          "sl-status-badge",
        ]) {
          assert.deepEqual(adopted[tag], ["reset", "elements", "own"], tag);
        }
        assert.equal(label, "Draft");
      } finally {
        await page.close();
      }
    });

    test(`the entry shows a file's size and modified time in the page's locale and time zone, ${run.name}`, async () => {
      // The browser runs in en-US at UTC, as support/browser-pipe.js launches it.
      const page = await open(run);
      try {
        const shown = await page.evaluate(`(async () => {
        await import("/dist/entry.js");
        const entry = document.createElement("sl-entry");
        entry.item = {
          id: "f-1536",
          name: "sketch.txt",
          status: "available",
          size: 1536,
          content_type: "text/plain",
          updated_at: "2026-10-12T16:41:07Z",
        };
        document.querySelector("main").append(entry);
        await entry.updateComplete;
        const root = entry.shadowRoot;
        return {
          size: root.querySelector(".size").textContent,
          time: root.querySelector("time").textContent,
        };
      })()`);
        assert.deepEqual(shown, { size: "1.5 kB", time: "Oct 12, 2026, 4:41 PM" });
      } finally {
        await page.close();
      }
    });
  }

  test(`each component renders under each of the ${profiles.length} profile combinations`, async () => {
    const page = await browser.open(`${server.origin}/test/fixtures/profiles.html`);
    try {
      const { registered, rendered, errors } = await page.evaluate(`(async () => {
        const registry = await import("@jaimestill/spike-html-apps-foundation/registry.js");
        const { directories, files } = await import("/demo/documents.js");
        await Promise.all(["search-results", "event-log", "stage-timeline", "upload-dropzone", "composer", "chat-thread", "artifact-viewer", "pagination", "entry", "status-badge"].map(
          (module) => import("/dist/" + module + ".js")));
        // Each component as a host composes it: search results of a match in content, whose
        // button the profile styles, an event log of a stage event, a stage timeline
        // part way through a run, an upload dropzone listing an upload in progress, a composer holding a draft, a chat thread of a
        // user's message and the assistant's Markdown reply, an artifact viewer of a Markdown document, the pagination
        // holding one entry per item, a lone entry, and a labelled badge.
        const components = {
          "sl-search-results": () =>
            Object.assign(document.createElement("sl-search-results"), {
              query: "report",
              items: [{ id: "doc-1", name: "quarterly-report.md", field: "content",
                snippet: "\u2026This report covers the three regions\u2026" }],
            }),
          "sl-event-log": () =>
            Object.assign(document.createElement("sl-event-log"), {
              events: [
                { id: "run-1.1", type: "emulator.run.stage", source: "/emulator/lab-a", subject: "run-1",
                  time: "2026-10-29T15:42:07Z", data: { stage: "upload", position: 1 } },
              ],
            }),
          "sl-stage-timeline": () =>
            Object.assign(document.createElement("sl-stage-timeline"), {
              stages: [
                { name: "upload", position: 1, state: "complete", completedAt: "2026-10-29T15:42:07Z" },
                { name: "metadata", position: 2, state: "active" },
                { name: "extraction", position: 3, state: "pending" },
              ],
            }),
          "sl-upload-dropzone": () =>
            Object.assign(document.createElement("sl-upload-dropzone"), {
              uploads: [{ id: "u-1", name: "notes.md", size: 18400, sent: 6300, state: "uploading" }],
            }),
          "sl-composer": () =>
            Object.assign(document.createElement("sl-composer"), { value: "Status?" }),
          "sl-chat-thread": () =>
            Object.assign(document.createElement("sl-chat-thread"), {
              items: [
                { type: "message", role: "user", content: [{ type: "input_text", text: "Status?" }] },
                { type: "message", id: "msg_1", role: "assistant", status: "completed",
                  content: [{ type: "output_text", text: "All **3** stages completed." }] },
              ],
            }),
          "sl-artifact-viewer": () =>
            Object.assign(document.createElement("sl-artifact-viewer"), {
              name: "notes.md",
              contentType: "text/markdown",
              content: "# Notes\\n\\nA paragraph, then a list:\\n\\n- one\\n- two",
            }),
          "sl-pagination": () => {
            const pagination = document.createElement("sl-pagination");
            Object.assign(pagination, { page: 2, size: 3, total: 8, pageSizes: [3, 6, 12] });
            for (const item of directories.items) {
              pagination.append(Object.assign(document.createElement("sl-entry"), { item }));
            }
            return pagination;
          },
          "sl-entry": () =>
            Object.assign(document.createElement("sl-entry"), { item: files.items[0] }),
          "sl-status-badge": () =>
            Object.assign(document.createElement("sl-status-badge"), { label: "Draft" }),
        };
        const defaults = { color: "flexoki", space: "regular", type: "mono" };
        const attributes = { color: "data-palette", space: "data-space", type: "data-type", scheme: "data-scheme" };
        const root = document.documentElement;
        const rendered = [];
        for (const profile of ${JSON.stringify(profiles)}) {
          const choice = { ...defaults, ...profile };
          for (const [facet, name] of Object.entries(choice)) root.setAttribute(attributes[facet], name);
          for (const [tag, make] of Object.entries(components)) {
            const element = document.querySelector("main").appendChild(make());
            await element.updateComplete;
            const { width, height } = element.getBoundingClientRect();
            // The look the profile gives the component's first button, inside its shadow root, the
            // search results' their first match's, the composer's its send control, enabled by the draft, the dropzone's its picker button;
            // the artifact viewer, which holds no button, the color and padding of what its region
            // scrolls, and its Markdown heading's font, since the region's text is the body font,
            // which the type facet's profiles share; the chat thread, which holds none either, the
            // color and padding of the user's message, and its label's font, the interface font;
            // the stage timeline, which holds none either, its complete stage's marker's color,
            // its step's column gap, the space between marker and text, and its label's font; the
            // event log, which holds no button but its data's toggle, its list's color and padding,
            // and its time's font, the interface font.
            const viewer = tag === "sl-artifact-viewer";
            const thread = tag === "sl-chat-thread";
            const timeline = tag === "sl-stage-timeline";
            const log = tag === "sl-event-log";
            const style = getComputedStyle(element.shadowRoot.querySelector(
              viewer ? ".body > *" : thread ? ".user > .message" : timeline ? ".complete > .marker" : log ? ".events" : "button"));
            const font = viewer
              ? getComputedStyle(element.shadowRoot.querySelector("h1"))
              : thread
                ? getComputedStyle(element.shadowRoot.querySelector(".role"))
                : timeline
                  ? getComputedStyle(element.shadowRoot.querySelector(".label"))
                  : log
                    ? getComputedStyle(element.shadowRoot.querySelector(".when"))
                    : style;
            const look = {
              color: style.color + " on " + style.backgroundColor,
              font: font.fontFamily,
              padding: timeline
                ? parseFloat(getComputedStyle(element.shadowRoot.querySelector(".stage")).columnGap)
                : parseFloat(style.paddingInlineStart),
            };
            rendered.push({ ...choice, profile: JSON.stringify(choice), tag, width, height, look });
            element.remove();
          }
        }
        const registered = Object.fromEntries(registry.FACETS.map((f) => [f, registry.profiles(f)]));
        return { registered, rendered, errors: window.errors };
      })()`);
      // register-full.js registered every built-in profile, so each attribute names one the page
      // carries.
      assert.deepEqual(registered, {
        color: ["flexoki", "primer", "catppuccin", "everforest"],
        space: ["regular", "compact"],
        type: ["mono", "sans"],
      });
      assert.equal(rendered.length, profiles.length * 10);
      for (const { profile, tag, width, height } of rendered) {
        assert.ok(width > 0 && height > 0, `${tag} under ${profile}: a ${width} × ${height} box`);
      }
      assert.deepEqual(errors, []);
      // Each facet reaches every shadow root: the four colors light and dark are eight looks, sans
      // sets another font than mono, and compact pads tighter than regular.
      const looks = (tag, where) =>
        rendered.filter((shown) => shown.tag === tag && where(shown)).map((shown) => shown.look);
      for (const tag of [
        "sl-search-results",
        "sl-event-log",
        "sl-stage-timeline",
        "sl-upload-dropzone",
        "sl-composer",
        "sl-chat-thread",
        "sl-artifact-viewer",
        "sl-pagination",
        "sl-entry",
        "sl-status-badge",
      ]) {
        const colors = looks(tag, ({ space, type }) => space === "regular" && type === "mono");
        assert.equal(
          new Set(colors.map((look) => look.color)).size,
          8,
          `${tag}: ${colors.map((look) => look.color)}`,
        );
        for (const scheme of schemes) {
          const [mono] = looks(
            tag,
            (shown) =>
              shown.scheme === scheme &&
              shown.color === "flexoki" &&
              shown.type === "mono" &&
              shown.space === "regular",
          );
          const [sans] = looks(tag, (shown) => shown.scheme === scheme && shown.type === "sans");
          const [compact] = looks(
            tag,
            (shown) => shown.scheme === scheme && shown.space === "compact",
          );
          assert.notEqual(sans.font, mono.font, `${tag}, ${scheme}: sans sets the font`);
          assert.ok(
            compact.padding < mono.padding,
            `${tag}, ${scheme}: compact pads ${compact.padding}, regular ${mono.padding}`,
          );
        }
      }
    } finally {
      await page.close();
    }
  });

  /**
   * Runs the measure, the source of an in-page function of the profile, on the specimen page under
   * demo/ in each profile combination, resolving to its results in profile order. The page's
   * components render once; each profile applies by attribute on the root, as on the profiles
   * case's page, and the measure runs once the profile's fonts are ready and a frame has passed.
   * The profiles are the full entry's unless others are given.
   */
  async function measureSpecimen(specimen, measure, over = profiles) {
    const page = await browser.open(`${server.origin}/demo/${specimen}.html`);
    try {
      return await page.evaluate(`(async () => {
        const tags = ["sl-entry", "sl-pagination", "sl-artifact-viewer", "sl-chat-thread", "sl-composer", "sl-upload-dropzone", "sl-stage-timeline", "sl-event-log", "sl-search-results"]
          .filter((tag) => document.querySelector(tag));
        await Promise.all(tags.map((tag) => customElements.whenDefined(tag)));
        await Promise.all([...document.querySelectorAll(tags.join(","))].map((el) => el.updateComplete));
        const defaults = { color: "flexoki", space: "regular", type: "mono" };
        const attributes = { color: "data-palette", space: "data-space", type: "data-type", scheme: "data-scheme" };
        const root = document.documentElement;
        const measure = ${measure};
        const results = [];
        for (const profile of ${JSON.stringify(over)}) {
          const choice = { ...defaults, ...profile };
          for (const [facet, name] of Object.entries(choice)) root.setAttribute(attributes[facet], name);
          await document.fonts.ready;
          await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          results.push({ profile: JSON.stringify(choice), ...measure(choice) });
        }
        return results;
      })()`);
    } finally {
      await page.close();
    }
  }

  // In-page helpers the measures below share, as source: the number of lines an element's text
  // renders on, and each entry with an item in a section of the specimen page.
  const LINES = `(element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    const rects = [...range.getClientRects()].filter((rect) => rect.width > 0);
    return new Set(rects.map((rect) => Math.round(rect.top))).size;
  }`;
  const ENTRIES = `(section) => [...document.querySelectorAll(section + " sl-entry")]
    .filter((entry) => entry.item !== null)`;

  test('the entry\'s kind, "directory" the longest, ends a column gap before the name, in every profile', async () => {
    const results = await measureSpecimen(
      "entry",
      `() => {
        const entries = (${ENTRIES})("main");
        const directories = entries.filter((entry) => !("content_type" in entry.item));
        return { shown: directories.map((entry) => {
          const root = entry.shadowRoot;
          const gap = parseFloat(getComputedStyle(root.querySelector(".entry")).columnGap);
          return {
            kind: root.querySelector(".kind").textContent,
            kindEnd: root.querySelector(".kind").getBoundingClientRect().right + gap,
            nameStart: root.querySelector(".name").getBoundingClientRect().left,
          };
        }) };
      }`,
    );
    for (const { profile, shown } of results) {
      assert.ok(shown.length >= 2, `${profile}: a directory at full width and at 20rem`);
      for (const { kind, kindEnd, nameStart } of shown) {
        assert.equal(kind, "directory");
        assert.ok(
          kindEnd <= nameStart + 0.5,
          `${profile}: the kind and its gap end at ${kindEnd}, the name starts at ${nameStart}`,
        );
      }
    }
  });

  test("at 20rem, the entry's wrapped lines, its status's and its meta's, step by its row gap, in every profile", async () => {
    // The lines of an entry's stack, top to bottom: the name's; the status's, when it wraps below
    // the name; then each line of the meta's parts. Each steps from the one above by the entry's
    // row gap, the name-to-meta step, within a pixel.
    const measure = `() => ({ wrapped: (${ENTRIES})(".narrow").flatMap((entry) => {
      const root = entry.shadowRoot;
      const rowGap = parseFloat(getComputedStyle(root.querySelector(".entry")).rowGap);
      const name = root.querySelector(".name").getBoundingClientRect();
      const status = root.querySelector(".status").getBoundingClientRect();
      const meta = root.querySelector(".meta");
      const metaTop = meta.getBoundingClientRect().top;
      const parts = [...meta.children].map((part) => part.getBoundingClientRect());
      const tops = [...new Set(parts.map((part) => Math.round(part.top)))];
      if (tops.length < 2) return [];
      const line = (top) => parts.filter((part) => Math.round(part.top) === top);
      // The lines above the meta: the status is one of them when it wraps between the name and
      // the meta, and on the name's line it ends that line with the name.
      const onName = status.top < name.bottom - 0.5;
      const head = !onName && status.bottom <= metaTop + 0.5
        ? [name, status]
        : [{ top: name.top, bottom: onName ? Math.max(name.bottom, status.bottom) : name.bottom }];
      return [{
        name: entry.item.name,
        rowGap,
        steps: [
          ...head.slice(1).map((next, i) => next.top - head[i].bottom),
          metaTop - head.at(-1).bottom,
          ...tops.slice(1).map((top, i) =>
            Math.min(...line(top).map((part) => part.top)) -
            Math.max(...line(tops[i]).map((part) => part.bottom))),
        ],
      }];
    }) })`;
    for (const specimen of ["entry", "pagination"]) {
      for (const { profile, wrapped } of await measureSpecimen(specimen, measure)) {
        assert.ok(wrapped.length > 0, `${specimen} under ${profile}: a meta row wraps at 20rem`);
        for (const { name, rowGap, steps } of wrapped) {
          for (const step of steps) {
            assert.ok(
              Math.abs(step - rowGap) <= 1,
              `${specimen} under ${profile}, ${name}: lines ${steps.join(", ")} apart, the row gap ${rowGap}`,
            );
          }
        }
      }
    }
  });

  test('at 20rem, "brand-guide.pdf" renders on one line, in every profile', async () => {
    const measure = `() => ({ lines: (${ENTRIES})(".narrow")
      .filter((entry) => entry.item.name === "brand-guide.pdf")
      .map((entry) => (${LINES})(entry.shadowRoot.querySelector(".name"))) })`;
    for (const specimen of ["entry", "pagination"]) {
      for (const { profile, lines } of await measureSpecimen(specimen, measure)) {
        assert.ok(lines.length > 0, `${specimen} under ${profile}: brand-guide.pdf at 20rem`);
        for (const count of lines) {
          assert.equal(count, 1, `${specimen} under ${profile}: brand-guide.pdf on ${count} lines`);
        }
      }
    }
  });

  test("at 20rem, each meta value, the size and the time's date and clock, renders on one line, in every profile", async () => {
    // A break may fall between the meta's parts, or between the time's date and its clock, never
    // inside "1.5 kB" or "4:41 PM". The content type, which has no space to break at, wraps
    // anywhere to keep inside the entry, so it isn't one of these.
    const measure = `() => ({ shown: (${ENTRIES})(".narrow").map((entry) => {
      const root = entry.shadowRoot;
      const time = root.querySelector("time");
      const values = [".size", "time > .date", "time > .clock"]
        .flatMap((selector) => [...root.querySelectorAll(selector)]);
      return {
        name: entry.item.name,
        parts: [...time.children].map((part) => part.className),
        lines: values.map((value) => [value.textContent, (${LINES})(value)]),
      };
    }) })`;
    for (const specimen of ["entry", "pagination"]) {
      for (const { profile, shown } of await measureSpecimen(specimen, measure)) {
        assert.ok(shown.length > 0, `${specimen} under ${profile}: an entry at 20rem`);
        for (const { name, parts, lines } of shown) {
          const where = `${specimen} under ${profile}, ${name}`;
          assert.deepEqual(parts, ["date", "clock"], `${where}: the time's parts`);
          for (const [text, count] of lines) {
            assert.equal(count, 1, `${where}: "${text}" on ${count} lines`);
          }
        }
      }
    }
  });

  test("from 20rem down to 16rem, every part of the entry keeps inside its button, its size and clock whole and its date broken only at its spaces, in mono and sans, regular and compact", async () => {
    // The narrow section restyled to each width in turn, down to 16rem, the entry's supported
    // minimum width, then put back to its own 20rem. At each,
    // every part of every entry, the kind, the name, the status, and each meta part, keeps inside
    // its button; the size and the time's clock each render on one line; and each word of the
    // date, its text between spaces, renders on one line, so the date breaks only at its spaces.
    const over = ["mono", "sans"].flatMap((type) =>
      ["regular", "compact"].flatMap((space) => schemes.map((scheme) => ({ type, space, scheme }))),
    );
    const measure = `() => {
      const section = document.querySelector(".narrow");
      const widths = ["20rem", "18rem", "16rem"].map((width) => {
        section.style.maxInlineSize = width;
        return { width, shown: (${ENTRIES})(".narrow").map((entry) => {
          const root = entry.shadowRoot;
          const button = root.querySelector(".entry");
          const box = button.getBoundingClientRect();
          const parts = [".kind", ".name", ".status", ".meta > *", "time > .date", "time > .clock"]
            .flatMap((selector) => [...root.querySelectorAll(selector)]);
          const date = root.querySelector("time > .date");
          // Lit's markers stand beside the date's text: its one text node holds the date.
          const text = [...date.childNodes].find((node) => node.nodeType === Node.TEXT_NODE);
          const words = [...text.data.matchAll(/\\S+/g)].map((match) => {
            const range = document.createRange();
            range.setStart(text, match.index);
            range.setEnd(text, match.index + match[0].length);
            const rects = [...range.getClientRects()].filter((rect) => rect.width > 0);
            return [match[0], new Set(rects.map((rect) => Math.round(rect.top))).size];
          });
          return {
            name: entry.item.name,
            overflow: button.scrollWidth - button.clientWidth,
            outside: parts
              .filter((part) => {
                const rect = part.getBoundingClientRect();
                return rect.left < box.left - 0.5 || rect.right > box.right + 0.5;
              })
              .map((part) => [part.className || part.localName, part.textContent,
                Math.round(part.getBoundingClientRect().right - box.right)]),
            whole: [".size", "time > .clock"]
              .flatMap((selector) => [...root.querySelectorAll(selector)])
              .map((value) => [value.textContent, (${LINES})(value)]),
            words,
          };
        }) };
      });
      section.style.maxInlineSize = "";
      return { widths };
    }`;
    for (const { profile, widths } of await measureSpecimen("entry", measure, over)) {
      for (const { width, shown } of widths) {
        assert.ok(shown.length > 0, `${profile} at ${width}: an entry`);
        for (const { name, overflow, outside, whole, words } of shown) {
          const where = `${profile} at ${width}, ${name}`;
          assert.ok(overflow <= 0, `${where}: the button's content overflows it by ${overflow}`);
          assert.deepEqual(outside, [], `${where}: parts past the button, by px`);
          assert.ok(words.length > 0, `${where}: the date's words`);
          for (const [text, count] of [...whole, ...words]) {
            assert.equal(count, 1, `${where}: "${text}" on ${count} lines`);
          }
        }
      }
    }
  });

  test("at 20rem, the pagination's label and page count keep to one line, and its steps to one control's height, in every profile", async () => {
    const results = await measureSpecimen(
      "pagination",
      `() => ({ shown: [...document.querySelectorAll(".narrow sl-pagination")].map((pagination) => {
        const root = pagination.shadowRoot;
        const lines = ${LINES};
        const count = root.querySelector(".page-indicator > span");
        const height = (selector) => root.querySelector(selector).getBoundingClientRect().height;
        return {
          label: lines(root.querySelector(".page-size-label")),
          count: count === null ? null : lines(count),
          steps: [...root.querySelectorAll(".page-step")].map((step) => step.getBoundingClientRect().height),
          control: Math.max(height("select"), height(".page-input")),
        };
      }) })`,
    );
    for (const { profile, shown } of results) {
      assert.ok(shown.length > 0, `${profile}: a pagination at 20rem`);
      for (const { label, count, steps, control } of shown) {
        assert.equal(label, 1, `${profile}: "Page Size" on ${label} lines`);
        if (count !== null) assert.equal(count, 1, `${profile}: the page count on ${count} lines`);
        // A pixel's allowance: in sans, the elements sheet's button is a pixel taller than its select.
        for (const step of steps) {
          assert.ok(step <= control + 1, `${profile}: a step ${step} tall, a control ${control}`);
        }
      }
    }
  });

  test("at 20rem, every state keeps within the column, a long name wrapping inside its entry, in every profile", async () => {
    // A component wider than the column widens its frame, the grid's item, past the list, so the
    // list's scroll width shows it; a name too long for its entry spills past the entry's button.
    // The status stays shown inside the entry, beside the name or on a line below it.
    const measure = `() => {
      const list = document.querySelector(".narrow .states");
      return {
        overflow: list.scrollWidth - list.clientWidth,
        spills: (${ENTRIES})(".narrow").map((entry) => {
          const root = entry.shadowRoot;
          const box = root.querySelector(".entry").getBoundingClientRect();
          const name = root.querySelector(".name").getBoundingClientRect();
          const status = root.querySelector(".status").getBoundingClientRect();
          return {
            name: entry.item.name,
            by: name.right - box.right,
            status: {
              shown: status.width > 0 && status.height > 0,
              inside: status.left >= box.left - 0.5 && status.right <= box.right + 0.5,
              clear: status.top >= name.bottom - 0.5 || status.left >= name.right - 0.5,
            },
          };
        }),
      };
    }`;
    for (const specimen of ["entry", "pagination"]) {
      for (const { profile, overflow, spills } of await measureSpecimen(specimen, measure)) {
        assert.ok(
          overflow <= 0,
          `${specimen} under ${profile}: the states overflow the column by ${overflow}`,
        );
        assert.ok(spills.length > 0, `${specimen} under ${profile}: an entry at 20rem`);
        for (const { name, by, status } of spills) {
          assert.ok(
            by <= 0.5,
            `${specimen} under ${profile}: ${name} spills past its entry by ${by}`,
          );
          assert.deepEqual(
            status,
            { shown: true, inside: true, clear: true },
            `${specimen} under ${profile}: ${name}'s status`,
          );
        }
      }
    }
  });

  test("in a parent that sizes it to its content, the entry takes its content's width, in every profile", async () => {
    // The fit section's entries: brand-guide.pdf in an inline-block, as a content-sized flex
    // item, and in a grid's auto track. Each entry is at least as wide as its first line laid out
    // whole, the kind, the name on one line, and the status, with the column gaps between, and
    // every part keeps inside its button.
    const results = await measureSpecimen(
      "entry",
      `() => ({ fits: (${ENTRIES})("#fit").map((entry) => {
        const root = entry.shadowRoot;
        const button = root.querySelector(".entry");
        const box = button.getBoundingClientRect();
        const gap = parseFloat(getComputedStyle(button).columnGap);
        const part = (selector) => root.querySelector(selector).getBoundingClientRect();
        const [kind, name, status, meta] = [".kind", ".name", ".status", ".meta"].map(part);
        // The name's text laid out on one line, however its box wraps it.
        const range = document.createRange();
        range.selectNodeContents(root.querySelector(".name"));
        const text = [...range.getClientRects()].reduce((sum, rect) => sum + rect.width, 0);
        const inside = (rect) =>
          rect.left >= box.left - 0.5 && rect.right <= box.right + 0.5 &&
          rect.top >= box.top - 0.5 && rect.bottom <= box.bottom + 0.5;
        return {
          parent: entry.parentElement.className,
          name: entry.item.name,
          width: box.width,
          natural: kind.width + gap + text + gap + status.width,
          lines: (${LINES})(root.querySelector(".name")),
          status: status.width > 0 && status.height > 0,
          overflow: button.scrollWidth - button.clientWidth,
          outside: [["kind", kind], ["name", name], ["status", status], ["meta", meta]]
            .filter(([, rect]) => !inside(rect)).map(([which]) => which),
        };
      }) })`,
    );
    for (const { profile, fits } of results) {
      assert.deepEqual(
        fits.map(({ parent, name }) => [parent, name]),
        ["fit-inline-block", "fit-flex", "fit-grid"].map((parent) => [parent, "brand-guide.pdf"]),
        `${profile}: the fit section's entries`,
      );
      for (const { parent, width, natural, lines, status, overflow, outside } of fits) {
        const where = `${parent} under ${profile}`;
        assert.ok(
          width >= natural - 0.5,
          `${where}: the entry ${width} wide, its content ${natural}`,
        );
        assert.equal(lines, 1, `${where}: brand-guide.pdf on ${lines} lines`);
        assert.ok(status, `${where}: the status shown`);
        assert.ok(overflow <= 0, `${where}: the entry's content overflows it by ${overflow}`);
        assert.deepEqual(outside, [], `${where}: parts outside the entry`);
      }
    }
  });

  // In-page helper the artifact viewer's measures share, as source: each viewer in a section of
  // its specimen page.
  const VIEWERS = `(section) => [...document.querySelectorAll(section + " sl-artifact-viewer")]`;

  test("the artifact viewer's specimen renders every state, at full size or held, within 20rem, in every profile", async () => {
    // Every viewer shows its head and a region or a note. The viewer is as tall as its content,
    // so no region scrolls down but run.log's, which the page holds to 16rem, and it does; at
    // 20rem the states keep within the column, every part of each viewer inside its box, and a
    // JSON line too long for the column scrolls its region sideways, never wrapping.
    const measure = `() => {
      const list = document.querySelector(".narrow .states");
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
      const shown = (${VIEWERS})("main").map((viewer) => {
        const root = viewer.shadowRoot;
        const box = viewer.getBoundingClientRect();
        const parts = [...root.querySelectorAll(".head, .name, .type, .frame, .note, .body")];
        const region = root.querySelector(".body");
        return {
          name: viewer.name,
          narrow: viewer.closest(".narrow") !== null,
          head: root.querySelector(".head") !== null,
          shown: root.querySelector(".body, .note") !== null,
          held: viewer.classList.contains("held"),
          height: box.height / rem,
          outside: parts
            .filter((part) => {
              const rect = part.getBoundingClientRect();
              return rect.left < box.left - 0.5 || rect.right > box.right + 0.5 ||
                rect.top < box.top - 0.5 || rect.bottom > box.bottom + 0.5;
            })
            .map((part) => part.className),
          sideways: region !== null && region.scrollWidth > region.clientWidth,
          scrolls: region !== null && region.scrollHeight > region.clientHeight,
        };
      });
      return { overflow: list.scrollWidth - list.clientWidth, shown };
    }`;
    for (const { profile, overflow, shown } of await measureSpecimen("artifact-viewer", measure)) {
      assert.ok(overflow <= 0, `${profile}: the states overflow the column by ${overflow}`);
      assert.equal(
        shown.length,
        22,
        `${profile}: nine states twice, the three fits, and the focus state`,
      );
      for (const { name, narrow, head, shown: content, held, height, scrolls, outside } of shown) {
        const where = `${profile}, ${name}${narrow ? " at 20rem" : ""}`;
        assert.ok(head && content, `${where}: a head and a region or a note`);
        assert.equal(held, name === "run.log", `${where}: only run.log is held`);
        if (held) {
          assert.ok(Math.abs(height - 16) < 0.01, `${where}: held to ${height}rem, not 16rem`);
          assert.ok(scrolls, `${where}: held, its region scrolls down`);
        } else {
          assert.ok(!scrolls, `${where}: at full size, its region scrolls down`);
        }
        assert.deepEqual(outside, [], `${where}: parts outside the viewer`);
      }
      assert.equal(
        shown.filter(({ name }) => name === "run.log").length,
        3,
        `${profile}: run.log twice in the states and once focused`,
      );
      const [json] = shown.filter(({ name, narrow }) => name === "run.json" && narrow);
      assert.ok(json.sideways, `${profile}: run.json's id line scrolls sideways at 20rem`);
    }
  });

  test("in a parent that sizes it to its content, the artifact viewer takes its content's width, in every profile", async () => {
    // The fit section's viewers: each is as wide as its widest line, so its region needs no
    // sideways scroll, and no wider than the column.
    const results = await measureSpecimen(
      "artifact-viewer",
      `() => {
        const column = document.querySelector("#fit .fits").getBoundingClientRect().width;
        return { fits: (${VIEWERS})("#fit").map((viewer) => {
          const region = viewer.shadowRoot.querySelector(".body");
          const width = viewer.getBoundingClientRect().width;
          return {
            parent: viewer.parentElement.className,
            sideways: region.scrollWidth - region.clientWidth,
            width,
            column,
          };
        }) };
      }`,
    );
    for (const { profile, fits } of results) {
      assert.deepEqual(
        fits.map(({ parent }) => parent),
        ["fit-inline-block", "fit-flex", "fit-grid"],
        `${profile}: the fit section's viewers`,
      );
      for (const { parent, sideways, width, column } of fits) {
        const where = `${parent} under ${profile}`;
        assert.ok(sideways <= 0, `${where}: the region scrolls sideways by ${sideways}`);
        assert.ok(width < column / 2, `${where}: ${width} wide in a ${column} column`);
      }
    }
  });

  // In-page helper the chat thread's measures share, as source: each thread in a section of its
  // specimen page.
  const THREADS = `(section) => [...document.querySelectorAll(section + " sl-chat-thread")]`;

  test("the chat thread's specimen renders every state, at full size or held, within 20rem, its ids whole, in every profile", async () => {
    // Every thread shows its frame. The thread is as tall as its content, so no frame scrolls down
    // but the long content's, which the page holds to 16rem, and it does. At 20rem the states keep
    // within the column, every part of each thread inside its box across, and each id, function
    // name, kind, role, status, and inline code span in a reply on one line.
    const measure = `() => {
      const list = document.querySelector(".narrow .states");
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
      const lines = ${LINES};
      const shown = (${THREADS})("main").map((thread) => {
        const root = thread.shadowRoot;
        const box = thread.getBoundingClientRect();
        const frame = root.querySelector(".frame");
        const parts = [...root.querySelectorAll(
          ".frame, ol, li, article, details, summary, .meta, .content, pre, table, p")];
        return {
          narrow: thread.closest(".narrow") !== null,
          items: thread.items.length,
          frame: frame !== null,
          held: thread.classList.contains("held"),
          height: box.height / rem,
          outside: parts
            .filter((part) => {
              const rect = part.getBoundingClientRect();
              return rect.left < box.left - 0.5 || rect.right > box.right + 0.5;
            })
            .map((part) => part.localName + "." + part.className),
          broken: [...root.querySelectorAll(".id, .name, .kind, .role, .status, .markdown code:not(pre code)")]
            .filter((part) => lines(part) > 1)
            .map((part) => part.textContent),
          scrolls: frame.scrollHeight > frame.clientHeight,
        };
      });
      return { overflow: list.scrollWidth - list.clientWidth, shown };
    }`;
    for (const { profile, overflow, shown } of await measureSpecimen("chat-thread", measure)) {
      assert.ok(overflow <= 0, `${profile}: the states overflow the column by ${overflow}`);
      assert.equal(
        shown.length,
        46,
        `${profile}: 21 states twice, the three fits, and the focus state`,
      );
      assert.equal(
        shown.filter(({ held }) => held).length,
        5,
        `${profile}: the long content twice in the states, twice at 20rem, and once focused`,
      );
      for (const [
        index,
        { narrow, frame, held, height, scrolls, outside, broken },
      ] of shown.entries()) {
        const where = `${profile}, thread ${index}${narrow ? " at 20rem" : ""}`;
        assert.ok(frame, `${where}: a frame`);
        if (held) {
          assert.ok(Math.abs(height - 16) < 0.01, `${where}: held to ${height}rem, not 16rem`);
          assert.ok(scrolls, `${where}: held, its frame scrolls down`);
        } else {
          assert.ok(!scrolls, `${where}: at full size, its frame scrolls down`);
        }
        assert.deepEqual(outside, [], `${where}: parts outside the thread`);
        assert.deepEqual(broken, [], `${where}: broken across lines`);
      }
    }
  });

  test("in a parent that sizes it to its content, the chat thread takes its content's width, in every profile", async () => {
    // The fit section's threads, a short exchange each: each takes its content's width, so its
    // frame needs no sideways scroll, and is no wider than half the column.
    const results = await measureSpecimen(
      "chat-thread",
      `() => {
        const column = document.querySelector("#fit .fits").getBoundingClientRect().width;
        return { fits: (${THREADS})("#fit").map((thread) => {
          const frame = thread.shadowRoot.querySelector(".frame");
          return {
            parent: thread.parentElement.className,
            sideways: frame.scrollWidth - frame.clientWidth,
            width: thread.getBoundingClientRect().width,
            column,
          };
        }) };
      }`,
    );
    for (const { profile, fits } of results) {
      assert.deepEqual(
        fits.map(({ parent }) => parent),
        ["fit-inline-block", "fit-flex", "fit-grid"],
        `${profile}: the fit section's threads`,
      );
      for (const { parent, sideways, width, column } of fits) {
        const where = `${parent} under ${profile}`;
        assert.ok(sideways <= 0, `${where}: the frame scrolls sideways by ${sideways}`);
        assert.ok(width > 0 && width < column / 2, `${where}: ${width} wide in a ${column} column`);
      }
    }
  });
  // In-page helper the composer's measures share, as source: each composer in a section of its
  // specimen page.
  const COMPOSERS = `(section) => [...document.querySelectorAll(section + " sl-composer")]`;

  test("the composer's specimen renders every state within 20rem, its field grown to its text up to eight lines, in every profile", async () => {
    // Every composer shows its field and one control, send or stop by busy, at the field's block
    // end. The field is one line tall, the control's height, when its text fits one line, and
    // grows to its text; only the fourteen lines' field is held, at eight, and scrolls. At 20rem
    // the states keep within the column, every part of each composer inside its box.
    const measure = `() => {
      const list = document.querySelector(".narrow .states");
      const shown = (${COMPOSERS})("main").map((composer) => {
        const root = composer.shadowRoot;
        const box = composer.getBoundingClientRect();
        const field = root.querySelector("textarea");
        const action = root.querySelector(".action");
        const rect = field.getBoundingClientRect();
        const button = action.getBoundingClientRect();
        const style = getComputedStyle(field);
        const line = parseFloat(style.lineHeight);
        const chrome =
          parseFloat(style.paddingBlockStart) + parseFloat(style.paddingBlockEnd) +
          parseFloat(style.borderBlockStartWidth) + parseFloat(style.borderBlockEndWidth);
        return {
          narrow: composer.closest(".narrow") !== null,
          busy: composer.busy,
          action: action.classList.contains("stop") ? "stop" : "send",
          lines: Math.round((rect.height - chrome) / line),
          oneLine: Math.abs(rect.height - button.height) < 0.5,
          bottoms: Math.abs(rect.bottom - button.bottom),
          outside: [field, action]
            .filter((part) => {
              const r = part.getBoundingClientRect();
              return r.left < box.left - 0.5 || r.right > box.right + 0.5 ||
                r.top < box.top - 0.5 || r.bottom > box.bottom + 0.5;
            })
            .map((part) => part.localName),
          scrolls: field.scrollHeight > field.clientHeight,
          sideways: field.scrollWidth > field.clientWidth,
        };
      });
      return { overflow: list.scrollWidth - list.clientWidth, shown };
    }`;
    for (const { profile, overflow, shown } of await measureSpecimen("composer", measure)) {
      assert.ok(overflow <= 0, `${profile}: the states overflow the column by ${overflow}`);
      assert.equal(
        shown.length,
        20,
        `${profile}: eight states twice, the three fits, and the focus state`,
      );
      assert.equal(
        shown.filter(({ scrolls }) => scrolls).length,
        2,
        `${profile}: the fourteen lines' field scrolls, in the states and at 20rem`,
      );
      for (const [
        index,
        { narrow, busy, action, lines, oneLine, bottoms, outside, scrolls, sideways },
      ] of shown.entries()) {
        const where = `${profile}, composer ${index}${narrow ? " at 20rem" : ""}`;
        assert.equal(action, busy ? "stop" : "send", `${where}: busy ${busy} shows ${action}`);
        assert.ok(lines >= 1 && lines <= 8, `${where}: the field is ${lines} lines tall`);
        if (scrolls)
          assert.equal(lines, 8, `${where}: scrolls at ${lines} lines, short of the bound`);
        assert.equal(oneLine, lines === 1, `${where}: one line is the control's height`);
        assert.ok(bottoms < 0.5, `${where}: the control sits at the field's block end`);
        assert.ok(!sideways, `${where}: the field scrolls sideways`);
        assert.deepEqual(outside, [], `${where}: parts outside the composer`);
      }
    }
  });

  test("in a parent that sizes it to its content, the composer takes its draft's width, in every profile", async () => {
    // The fit section's composers, a short draft each: each takes its draft's width, so its field
    // needs no sideways scroll and holds the draft on one line, and is no wider than half the
    // column.
    const results = await measureSpecimen(
      "composer",
      `() => {
        const column = document.querySelector("#fit .fits").getBoundingClientRect().width;
        return { fits: (${COMPOSERS})("#fit").map((composer) => {
          const root = composer.shadowRoot;
          const field = root.querySelector("textarea");
          return {
            parent: composer.parentElement.className,
            sideways: field.scrollWidth - field.clientWidth,
            oneLine: Math.abs(
              field.getBoundingClientRect().height -
                root.querySelector(".action").getBoundingClientRect().height,
            ) < 0.5,
            width: composer.getBoundingClientRect().width,
            column,
          };
        }) };
      }`,
    );
    for (const { profile, fits } of results) {
      assert.deepEqual(
        fits.map(({ parent }) => parent),
        ["fit-inline-block", "fit-flex", "fit-grid"],
        `${profile}: the fit section's composers`,
      );
      for (const { parent, sideways, oneLine, width, column } of fits) {
        const where = `${parent} under ${profile}`;
        assert.ok(sideways <= 0, `${where}: the field scrolls sideways by ${sideways}`);
        assert.ok(oneLine, `${where}: the draft wraps`);
        assert.ok(width > 0 && width < column / 2, `${where}: ${width} wide in a ${column} column`);
      }
    }
  });
  // In-page helper the upload dropzone's measures share, as source: each dropzone in a section of
  // its specimen page.
  const DROPZONES = `(section) => [...document.querySelectorAll(section + " sl-upload-dropzone")]`;

  test("the upload dropzone's specimen renders every state within 20rem, its names cut short and its sizes and labels whole, in every profile", async () => {
    // Every dropzone shows its zone; only the drag-over state's, once in the states and once at
    // 20rem, is marked. At 20rem the states keep within the column, every part of each dropzone
    // inside its box across. Each name keeps one line, cut short when long; each size, bytes sent,
    // label, and control keeps one line. Within a dropzone, every upload without a message is one
    // height inside its divider, whatever its state or progress.
    const measure = `() => {
      const list = document.querySelector(".narrow .states");
      const lines = ${LINES};
      const shown = (${DROPZONES})("main").map((dropzone) => {
        const root = dropzone.shadowRoot;
        const box = dropzone.getBoundingClientRect();
        const parts = [...root.querySelectorAll(
          ".zone, .prompt, button, .upload, .name, .end, .detail, progress, .bytes, .message")];
        const items = [...root.querySelectorAll(".upload")];
        return {
          narrow: dropzone.closest(".narrow") !== null,
          zone: root.querySelector(".zone") !== null,
          over: root.querySelector(".zone.over") !== null,
          outside: parts
            .filter((part) => {
              const rect = part.getBoundingClientRect();
              return rect.left < box.left - 0.5 || rect.right > box.right + 0.5;
            })
            .map((part) => part.localName + "." + part.className),
          // The bytes hold the sent count in an inline-block, whose box's top the line helper
          // counts apart from its text's, so they are measured by height: one line of their own.
          broken: [
            ...[...root.querySelectorAll(".name, .state, button")].filter((part) => lines(part) > 1),
            ...[...root.querySelectorAll(".bytes")].filter((part) =>
              part.getBoundingClientRect().height > 1.5 * parseFloat(getComputedStyle(part).lineHeight)),
          ].map((part) => part.textContent.trim()),
          heights: [...new Set(items
            .filter((item) => !item.querySelector(".message"))
            .map((item) => item.clientHeight))],
        };
      });
      return { overflow: list.scrollWidth - list.clientWidth, shown };
    }`;
    for (const { profile, overflow, shown } of await measureSpecimen("upload-dropzone", measure)) {
      assert.ok(overflow <= 0, `${profile}: the states overflow the column by ${overflow}`);
      assert.equal(
        shown.length,
        26,
        `${profile}: eleven states twice, the three fits, and the focus state`,
      );
      assert.equal(
        shown.filter(({ over }) => over).length,
        2,
        `${profile}: the drag-over state, in the states and at 20rem`,
      );
      for (const [index, { narrow, zone, outside, broken, heights }] of shown.entries()) {
        const where = `${profile}, dropzone ${index}${narrow ? " at 20rem" : ""}`;
        assert.ok(zone, `${where}: a zone`);
        assert.deepEqual(outside, [], `${where}: parts outside the dropzone`);
        assert.deepEqual(broken, [], `${where}: broken across lines`);
        assert.ok(heights.length <= 1, `${where}: uploads of heights ${heights}`);
      }
    }
  });

  test("in a parent that sizes it to its content, the upload dropzone takes its content's width, in every profile", async () => {
    // The fit section's dropzones, one short upload each: each takes its content's width, so its
    // prompt and button share one line and its upload's name shows whole, and is no wider than
    // half the column.
    const results = await measureSpecimen(
      "upload-dropzone",
      `() => {
        const column = document.querySelector("#fit .fits").getBoundingClientRect().width;
        return { fits: (${DROPZONES})("#fit").map((dropzone) => {
          const root = dropzone.shadowRoot;
          const prompt = root.querySelector(".prompt").getBoundingClientRect();
          const pick = root.querySelector(".pick").getBoundingClientRect();
          const name = root.querySelector(".name");
          return {
            parent: dropzone.parentElement.className,
            oneLine: Math.abs((prompt.top + prompt.bottom) / 2 - (pick.top + pick.bottom) / 2) < 1,
            cut: name.scrollWidth > name.clientWidth,
            width: dropzone.getBoundingClientRect().width,
            column,
          };
        }) };
      }`,
    );
    for (const { profile, fits } of results) {
      assert.deepEqual(
        fits.map(({ parent }) => parent),
        ["fit-inline-block", "fit-flex", "fit-grid"],
        `${profile}: the fit section's dropzones`,
      );
      for (const { parent, oneLine, cut, width, column } of fits) {
        const where = `${parent} under ${profile}`;
        assert.ok(oneLine, `${where}: the prompt and the button wrap`);
        assert.ok(!cut, `${where}: the name is cut short`);
        assert.ok(width > 0 && width < column / 2, `${where}: ${width} wide in a ${column} column`);
      }
    }
  });

  // In-page helper the stage timeline's measures share, as source: each timeline in a section of
  // its specimen page.
  const TIMELINES = `(section) => [...document.querySelectorAll(section + " sl-stage-timeline")]`;

  test("the stage timeline's specimen renders every state within 20rem, its names, labels, and times whole, in every profile", async () => {
    // Every timeline shows the emulator's five stages. At 20rem the states keep within the column,
    // every part of each timeline inside its box across. Each label and time keeps one line, and
    // each step but the last, which has no connector, is one height within a timeline, whatever
    // its state, as is each detail line.
    const measure = `() => {
      const list = document.querySelector(".narrow .states");
      const lines = ${LINES};
      const shown = (${TIMELINES})("main").map((timeline) => {
        const root = timeline.shadowRoot;
        const box = timeline.getBoundingClientRect();
        const steps = [...root.querySelectorAll(".stage")];
        return {
          narrow: timeline.closest(".narrow") !== null,
          steps: steps.length,
          outside: [...root.querySelectorAll(".stage, .marker, .name, .detail, .label, .when")]
            .filter((part) => {
              const rect = part.getBoundingClientRect();
              return rect.left < box.left - 0.5 || rect.right > box.right + 0.5;
            })
            .map((part) => part.localName + "." + part.className),
          broken: [...root.querySelectorAll(".name, .label > .shown, time")]
            .filter((part) => lines(part) > 1)
            .map((part) => part.textContent),
          heights: [...new Set(steps.slice(0, -1).map((step) => Math.round(step.getBoundingClientRect().height)))],
          details: [...new Set(steps.map((step) => Math.round(step.querySelector(".detail").getBoundingClientRect().height)))],
        };
      });
      return { overflow: list.scrollWidth - list.clientWidth, shown };
    }`;
    for (const { profile, overflow, shown } of await measureSpecimen("stage-timeline", measure)) {
      assert.ok(overflow <= 0, `${profile}: the states overflow the column by ${overflow}`);
      assert.equal(shown.length, 11, `${profile}: four states twice, and the three fits`);
      for (const [index, { narrow, steps, outside, broken, heights, details }] of shown.entries()) {
        const where = `${profile}, timeline ${index}${narrow ? " at 20rem" : ""}`;
        assert.equal(steps, 5, `${where}: the stages`);
        assert.deepEqual(outside, [], `${where}: parts outside the timeline`);
        assert.deepEqual(broken, [], `${where}: broken across lines`);
        assert.equal(heights.length, 1, `${where}: steps of heights ${heights}`);
        assert.equal(details.length, 1, `${where}: detail lines of heights ${details}`);
      }
    }
  });

  test("in a parent that sizes it to its content, the stage timeline takes its content's width, in every profile", async () => {
    // The fit section's timelines, part way through a run: each takes its content's width, so
    // each complete stage's label and time share one line, and is no wider than half the column.
    const results = await measureSpecimen(
      "stage-timeline",
      `() => {
        const column = document.querySelector("#fit .fits").getBoundingClientRect().width;
        return { fits: (${TIMELINES})("#fit").map((timeline) => {
          const root = timeline.shadowRoot;
          return {
            parent: timeline.parentElement.className,
            oneLine: [...root.querySelectorAll(".complete")].every((step) => {
              const label = step.querySelector(".label").getBoundingClientRect();
              const time = step.querySelector("time").getBoundingClientRect();
              return Math.abs(label.top - time.top) < 1;
            }),
            width: timeline.getBoundingClientRect().width,
            column,
          };
        }) };
      }`,
    );
    for (const { profile, fits } of results) {
      assert.deepEqual(
        fits.map(({ parent }) => parent),
        ["fit-inline-block", "fit-flex", "fit-grid"],
        `${profile}: the fit section's timelines`,
      );
      for (const { parent, oneLine, width, column } of fits) {
        const where = `${parent} under ${profile}`;
        assert.ok(oneLine, `${where}: a label and its time wrap`);
        assert.ok(width > 0 && width < column / 2, `${where}: ${width} wide in a ${column} column`);
      }
    }
  });
  // In-page helper the event log's measures share, as source: each log in a section of its
  // specimen page.
  const LOGS = `(section) => [...document.querySelectorAll(section + " sl-event-log")]`;

  test("the event log's specimen renders every state, at full size or held, within 20rem, its types, times, labels, and values whole, in every profile", async () => {
    // Every log shows its frame. The log is as tall as its events, so no frame scrolls down but
    // the many events', which the page holds to 16rem, and it does. At 20rem the states keep
    // within the column, every part of each log inside its box across, and each type, time,
    // metadata label and value, and data toggle on one line.
    const measure = `() => {
      const list = document.querySelector(".narrow .states");
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
      const lines = ${LINES};
      const shown = (${LOGS})("main").map((log) => {
        const root = log.shadowRoot;
        const box = log.getBoundingClientRect();
        const frame = root.querySelector(".frame");
        const parts = [...root.querySelectorAll(
          ".frame, ol, li, .head, .type, .when, .meta, .pair, dt, dd, details, summary, pre, .no-data, .empty")];
        return {
          narrow: log.closest(".narrow") !== null,
          events: log.events.length,
          frame: frame !== null,
          held: log.classList.contains("held"),
          height: box.height / rem,
          outside: parts
            .filter((part) => {
              const rect = part.getBoundingClientRect();
              return rect.left < box.left - 0.5 || rect.right > box.right + 0.5;
            })
            .map((part) => part.localName + "." + part.className),
          broken: [...root.querySelectorAll(".type, .when, dt, dd, summary, .no-data")]
            .filter((part) => lines(part) > 1)
            .map((part) => part.textContent),
          scrolls: frame.scrollHeight > frame.clientHeight,
        };
      });
      return { overflow: list.scrollWidth - list.clientWidth, shown };
    }`;
    for (const { profile, overflow, shown } of await measureSpecimen("event-log", measure)) {
      assert.ok(overflow <= 0, `${profile}: the states overflow the column by ${overflow}`);
      assert.equal(
        shown.length,
        14,
        `${profile}: five states twice, the three fits, and the focus state`,
      );
      assert.equal(
        shown.filter(({ held }) => held).length,
        2,
        `${profile}: the many events once in the states and once at 20rem`,
      );
      for (const [
        index,
        { narrow, frame, held, height, scrolls, outside, broken },
      ] of shown.entries()) {
        const where = `${profile}, log ${index}${narrow ? " at 20rem" : ""}`;
        assert.ok(frame, `${where}: a frame`);
        if (held) {
          assert.ok(Math.abs(height - 16) < 0.01, `${where}: held to ${height}rem, not 16rem`);
          assert.ok(scrolls, `${where}: held, its frame scrolls down`);
        } else {
          assert.ok(!scrolls, `${where}: at full size, its frame scrolls down`);
        }
        assert.deepEqual(outside, [], `${where}: parts outside the log`);
        assert.deepEqual(broken, [], `${where}: broken across lines`);
      }
    }
  });

  test("in a parent that sizes it to its content, the event log takes its type's and time's width, in every profile", async () => {
    // The fit section's logs, a run's first two events each: each takes its content's width, so
    // each event's type and time share one line and its frame needs no sideways scroll, and is no
    // wider than half the column; its metadata wraps within that width, every part inside it.
    const results = await measureSpecimen(
      "event-log",
      `() => {
        const column = document.querySelector("#fit .fits").getBoundingClientRect().width;
        return { fits: (${LOGS})("#fit").map((log) => {
          const root = log.shadowRoot;
          const frame = root.querySelector(".frame");
          const box = log.getBoundingClientRect();
          return {
            parent: log.parentElement.className,
            oneLine: [...root.querySelectorAll(".event")].every((event) => {
              const type = event.querySelector(".type").getBoundingClientRect();
              const time = event.querySelector(".when").getBoundingClientRect();
              return Math.abs(type.bottom - time.bottom) < 2;
            }),
            outside: [...root.querySelectorAll("dt, dd")].filter((part) => {
              const rect = part.getBoundingClientRect();
              return rect.left < box.left - 0.5 || rect.right > box.right + 0.5;
            }).length,
            sideways: frame.scrollWidth - frame.clientWidth,
            width: box.width,
            column,
          };
        }) };
      }`,
    );
    for (const { profile, fits } of results) {
      assert.deepEqual(
        fits.map(({ parent }) => parent),
        ["fit-inline-block", "fit-flex", "fit-grid"],
        `${profile}: the fit section's logs`,
      );
      for (const { parent, oneLine, outside, sideways, width, column } of fits) {
        const where = `${parent} under ${profile}`;
        assert.ok(oneLine, `${where}: a type and its time wrap`);
        assert.equal(outside, 0, `${where}: metadata outside the log`);
        assert.ok(sideways <= 0, `${where}: the frame scrolls sideways by ${sideways}`);
        assert.ok(width > 0 && width < column / 2, `${where}: ${width} wide in a ${column} column`);
      }
    }
  });

  // In-page helper the search results' measures share, as source: each results element in a
  // section of its specimen page.
  const SEARCHES = `(section) => [...document.querySelectorAll(section + " sl-search-results")]`;

  test("the search results' specimen renders every state within 20rem, their field labels whole, in every profile", async () => {
    // Every results element shows its status line. At 20rem the states keep within the column,
    // every part of each inside its box across, a long name and snippet wrapping inside their
    // button; each field label keeps one line, and at full width sits on its name's line, at the
    // line's end.
    const measure = `() => {
      const list = document.querySelector(".narrow .states");
      const lines = ${LINES};
      const shown = (${SEARCHES})("main").map((results) => {
        const root = results.shadowRoot;
        const box = results.getBoundingClientRect();
        const parts = [...root.querySelectorAll(".status, ul, li, button, .head, .name, .field, .snippet, mark")];
        return {
          narrow: results.closest(".narrow") !== null,
          fit: results.closest("#fit") !== null,
          status: root.querySelector(".status[role=status]") !== null,
          outside: parts
            .filter((part) => {
              const rect = part.getBoundingClientRect();
              return rect.left < box.left - 0.5 || rect.right > box.right + 0.5;
            })
            .map((part) => part.localName + "." + part.className),
          broken: [...root.querySelectorAll(".field")]
            .filter((part) => lines(part) > 1)
            .map((part) => part.textContent),
          // Each short name's field label on its name's last line, ending the button's content.
          beside: [...root.querySelectorAll(".match")]
            .filter((button) => button.querySelector(".name").textContent.length < 24)
            .map((button) => {
              const name = button.querySelector(".name").getBoundingClientRect();
              const field = button.querySelector(".field").getBoundingClientRect();
              const head = button.querySelector(".head").getBoundingClientRect();
              return Math.abs(name.bottom - field.bottom) < 3 && Math.abs(field.right - head.right) < 1;
            }),
        };
      });
      return { overflow: list.scrollWidth - list.clientWidth, shown };
    }`;
    for (const { profile, overflow, shown } of await measureSpecimen("search-results", measure)) {
      assert.ok(overflow <= 0, `${profile}: the states overflow the column by ${overflow}`);
      assert.equal(
        shown.length,
        24,
        `${profile}: ten states twice, the three fits, and the focus state`,
      );
      for (const [index, { narrow, fit, status, outside, broken, beside }] of shown.entries()) {
        const where = `${profile}, results ${index}${narrow ? " at 20rem" : ""}`;
        assert.ok(status, `${where}: a status line`);
        assert.deepEqual(outside, [], `${where}: parts outside the results`);
        assert.deepEqual(broken, [], `${where}: a field label broken across lines`);
        if (!narrow && !fit) {
          assert.ok(beside.every(Boolean), `${where}: a short name's field label off its line`);
        }
      }
    }
  });

  test("in a parent that sizes them to their content, the search results take their content's width, in every profile", async () => {
    // The fit section's results, two short matches each: each takes its content's width, so each
    // name shares its line with its field label and each snippet keeps one line, every part
    // inside, and is no wider than half the column.
    const results = await measureSpecimen(
      "search-results",
      `() => {
        const column = document.querySelector("#fit .fits").getBoundingClientRect().width;
        const lines = ${LINES};
        return { fits: (${SEARCHES})("#fit").map((results) => {
          const root = results.shadowRoot;
          const box = results.getBoundingClientRect();
          return {
            parent: results.parentElement.className,
            oneLine: [...root.querySelectorAll(".match")].every((button) => {
              const name = button.querySelector(".name").getBoundingClientRect();
              const field = button.querySelector(".field").getBoundingClientRect();
              const snippet = button.querySelector(".snippet");
              return Math.abs(name.bottom - field.bottom) < 3 && (!snippet || lines(snippet) === 1);
            }),
            outside: [...root.querySelectorAll(".status, button, .name, .field, .snippet")].filter((part) => {
              const rect = part.getBoundingClientRect();
              return rect.left < box.left - 0.5 || rect.right > box.right + 0.5;
            }).length,
            width: box.width,
            column,
          };
        }) };
      }`,
    );
    for (const { profile, fits } of results) {
      assert.deepEqual(
        fits.map(({ parent }) => parent),
        ["fit-inline-block", "fit-flex", "fit-grid"],
        `${profile}: the fit section's results`,
      );
      for (const { parent, oneLine, outside, width, column } of fits) {
        const where = `${parent} under ${profile}`;
        assert.ok(oneLine, `${where}: a name and its label, or a snippet, wrap`);
        assert.equal(outside, 0, `${where}: parts outside the results`);
        assert.ok(width > 0 && width < column / 2, `${where}: ${width} wide in a ${column} column`);
      }
    }
  });
});
