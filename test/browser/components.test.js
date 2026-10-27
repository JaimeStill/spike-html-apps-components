// The components from this repository's dist/: conventions' 27 probe cases, its restyle case, and
// the sheets each shadow root adopts, the installed foundation's then its own, on
// test/fixtures/components.html, and the entry's formatted size and time there; and each component
// rendered under the foundation's profiles, on test/fixtures/profiles.html; and the entry's and the
// pagination's geometry on their specimen pages under demo/, full width and at 20rem, in each
// profile.
// Adapted from spike-html-packages-components (4c0a5d8): test/browser/components.test.js, renamed,
// and the entry's size and time case added.

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

  /** Runs one case module on the components page, resolving to its verdict and report. */
  async function run(module) {
    const page = await browser.open(
      `${server.origin}/test/fixtures/components.html?module=${module}`,
    );
    try {
      return await page.evaluate(`window.verdict.then(() => ({
        verdict: document.getElementById("verdict").textContent,
        report: document.getElementById("report").textContent,
      }))`);
    } finally {
      await page.close();
    }
  }

  test("all 27 of conventions' probe cases hold", async () => {
    const { verdict, report } = await run("probe");
    assert.equal(verdict, "ok: all 27 cases hold", report);
  });

  test("one edit to the elements sheet repaints the buttons in both shadow roots", async () => {
    const { verdict } = await run("restyle");
    assert.match(verdict, /^ok: /);
  });

  test("each component adopts the foundation's reset and elements sheets, then its own", async () => {
    const page = await browser.open(`${server.origin}/test/fixtures/components.html`);
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
          ["sl-pagination-lit-shadow", "pagination-lit-shadow", "pagination-shadow.css"],
          ["sl-entry-lit-shadow", "entry-lit-shadow", "entry-shadow.css"],
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
      for (const tag of ["sl-pagination-lit-shadow", "sl-entry-lit-shadow", "sl-status-badge"]) {
        assert.deepEqual(adopted[tag], ["reset", "elements", "own"], tag);
      }
      assert.equal(label, "Draft");
    } finally {
      await page.close();
    }
  });

  test("the entry shows a file's size and modified time in the page's locale and time zone", async () => {
    // The browser runs in en-US at UTC, as support/browser-pipe.js launches it.
    const page = await browser.open(`${server.origin}/test/fixtures/components.html`);
    try {
      const shown = await page.evaluate(`(async () => {
        await import("/dist/entry-lit-shadow.js");
        const entry = document.createElement("sl-entry-lit-shadow");
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

  // The profiles the foundation's full entry carries: each color at the other facets' defaults,
  // then compact and sans each at the rest's, and each of those light and dark.
  const schemes = ["light", "dark"];
  const profiles = [
    ...["flexoki", "primer", "catppuccin", "everforest"].map((color) => ({ color })),
    { space: "compact" },
    { type: "sans" },
  ].flatMap((profile) => schemes.map((scheme) => ({ ...profile, scheme })));

  test(`each component renders under each of the ${profiles.length} profile combinations`, async () => {
    const page = await browser.open(`${server.origin}/test/fixtures/profiles.html`);
    try {
      const { registered, rendered, errors } = await page.evaluate(`(async () => {
        const registry = await import("@jaimestill/spike-html-apps-foundation/registry.js");
        const { directories, files } = await import("/demo/documents.js");
        await Promise.all(["pagination-lit-shadow", "entry-lit-shadow", "status-badge"].map(
          (module) => import("/dist/" + module + ".js")));
        // Each component as a host composes it: the pagination holding one entry per item, a
        // lone entry, and a labelled badge.
        const components = {
          "sl-pagination-lit-shadow": () => {
            const pagination = document.createElement("sl-pagination-lit-shadow");
            Object.assign(pagination, { page: 2, size: 3, total: 8, pageSizes: [3, 6, 12] });
            for (const item of directories.items) {
              pagination.append(Object.assign(document.createElement("sl-entry-lit-shadow"), { item }));
            }
            return pagination;
          },
          "sl-entry-lit-shadow": () =>
            Object.assign(document.createElement("sl-entry-lit-shadow"), { item: files.items[0] }),
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
            rendered.push({ profile: JSON.stringify(choice), tag, width, height });
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
      assert.equal(rendered.length, profiles.length * 3);
      for (const { profile, tag, width, height } of rendered) {
        assert.ok(width > 0 && height > 0, `${tag} under ${profile}: a ${width} × ${height} box`);
      }
      assert.deepEqual(errors, []);
    } finally {
      await page.close();
    }
  });

  /**
   * Runs the measure, the source of an in-page function of the profile, on the specimen page under
   * demo/ in each profile combination, resolving to its results in profile order. The page's
   * components render once; each profile applies by attribute on the root, as on the profiles
   * case's page, and the measure runs once the profile's fonts are ready and a frame has passed.
   */
  async function measureSpecimen(specimen, measure) {
    const page = await browser.open(`${server.origin}/demo/${specimen}.html`);
    try {
      return await page.evaluate(`(async () => {
        const tags = ["sl-entry-lit-shadow", "sl-pagination-lit-shadow"]
          .filter((tag) => document.querySelector(tag));
        await Promise.all(tags.map((tag) => customElements.whenDefined(tag)));
        await Promise.all([...document.querySelectorAll(tags.join(","))].map((el) => el.updateComplete));
        const defaults = { color: "flexoki", space: "regular", type: "mono" };
        const attributes = { color: "data-palette", space: "data-space", type: "data-type", scheme: "data-scheme" };
        const root = document.documentElement;
        const measure = ${measure};
        const results = [];
        for (const profile of ${JSON.stringify(profiles)}) {
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
  const ENTRIES = `(section) => [...document.querySelectorAll(section + " sl-entry-lit-shadow")]
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

  test("at 20rem, the entry's wrapped meta lines step by the name-to-meta gap, in every profile", async () => {
    const measure = `() => ({ wrapped: (${ENTRIES})(".narrow").flatMap((entry) => {
      const root = entry.shadowRoot;
      const name = root.querySelector(".name").getBoundingClientRect();
      const meta = root.querySelector(".meta");
      const parts = [...meta.children].map((part) => part.getBoundingClientRect());
      const tops = [...new Set(parts.map((part) => Math.round(part.top)))];
      if (tops.length < 2) return [];
      const line = (top) => parts.filter((part) => Math.round(part.top) === top);
      return [{
        name: entry.item.name,
        nameToMeta: meta.getBoundingClientRect().top - name.bottom,
        steps: tops.slice(1).map((top, i) =>
          Math.min(...line(top).map((part) => part.top)) -
          Math.max(...line(tops[i]).map((part) => part.bottom))),
      }];
    }) })`;
    for (const specimen of ["entry", "pagination"]) {
      for (const { profile, wrapped } of await measureSpecimen(specimen, measure)) {
        assert.ok(wrapped.length > 0, `${specimen} under ${profile}: a meta row wraps at 20rem`);
        for (const { name, nameToMeta, steps } of wrapped) {
          for (const step of steps) {
            assert.ok(
              Math.abs(step - nameToMeta) <= 1,
              `${specimen} under ${profile}, ${name}: meta lines ${step} apart, the name ${nameToMeta} above the meta`,
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

  test("at 20rem, the pagination's label and page count keep to one line, and its steps to one control's height, in every profile", async () => {
    const results = await measureSpecimen(
      "pagination",
      `() => ({ shown: [...document.querySelectorAll(".narrow sl-pagination-lit-shadow")].map((pagination) => {
        const root = pagination.shadowRoot;
        const lines = ${LINES};
        const count = root.querySelector(".page-indicator > span");
        const height = (selector) => root.querySelector(selector).getBoundingClientRect().height;
        const bar = root.querySelector(".pagination");
        return {
          label: lines(root.querySelector(".page-size-label")),
          count: count === null ? null : lines(count),
          steps: [...root.querySelectorAll(".page-step")].map((step) => step.getBoundingClientRect().height),
          control: Math.max(height("select"), height(".page-input")),
          overflow: bar.scrollWidth - bar.clientWidth,
        };
      }) })`,
    );
    for (const { profile, shown } of results) {
      assert.ok(shown.length > 0, `${profile}: a pagination at 20rem`);
      for (const { label, count, steps, control, overflow } of shown) {
        assert.equal(label, 1, `${profile}: "Page Size" on ${label} lines`);
        if (count !== null) assert.equal(count, 1, `${profile}: the page count on ${count} lines`);
        // A pixel's allowance: in sans, the elements sheet's button is a pixel taller than its select.
        for (const step of steps) {
          assert.ok(step <= control + 1, `${profile}: a step ${step} tall, a control ${control}`);
        }
        assert.ok(overflow <= 0, `${profile}: the controls overflow by ${overflow}`);
      }
    }
  });
});
