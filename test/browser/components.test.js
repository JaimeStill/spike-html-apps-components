// The components from this repository's dist/: conventions' 27 probe cases, its restyle case, and
// the sheets each shadow root adopts, the installed foundation's then its own, on
// test/fixtures/components.html.
// Adapted from spike-html-packages-components (4c0a5d8): test/browser/components.test.js, renamed.

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
});
