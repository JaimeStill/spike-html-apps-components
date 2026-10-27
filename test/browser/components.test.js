// The components from this repository's dist/: conventions' 27 probe cases, its restyle case, and
// the sheets each shadow root adopts, the installed foundation's then its own, on
// test/fixtures/components.html, and the entry's formatted size and time there; and each component
// rendered under the foundation's profiles, on test/fixtures/profiles.html.
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
});
