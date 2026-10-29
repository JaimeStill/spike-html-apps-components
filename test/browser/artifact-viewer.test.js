// The artifact viewer from this repository's dist/, on test/fixtures/components.html: the view each
// content type takes, its parameters and case aside; JSON pretty-printed, and invalid JSON's raw
// text under its note; a type that isn't text as a note, never its bytes; the loading and error
// states; long content scrolling inside the viewer, by the keyboard once Tab reaches its region;
// and no event sent.

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { launch } from "./support/browser-pipe.js";
import { serve } from "./support/server.js";

describe("artifact viewer", { timeout: 60_000 }, () => {
  let server;
  let browser;
  let page;
  before(async () => {
    server = await serve();
    browser = await launch();
    page = await browser.open(`${server.origin}/test/fixtures/components.html`);
    // window.shown(fields) renders a viewer of the fields into main, resolving to what its shadow
    // root shows: the head's name and type, each note's label and detail, the region's element,
    // text, and tabindex, and whether a heading, list, or table rendered.
    await page.evaluate(`window.verdict.then(async () => {
      await import("/dist/artifact-viewer.js");
      window.shown = async (fields) => {
        const viewer = Object.assign(document.createElement("sl-artifact-viewer"), fields);
        document.querySelector("main").replaceChildren(viewer);
        await viewer.updateComplete;
        const root = viewer.shadowRoot;
        const text = (selector) => root.querySelector(selector)?.textContent.trim() ?? null;
        const region = root.querySelector(".body");
        return {
          name: text(".name"),
          type: text(".type"),
          notes: [...root.querySelectorAll(".note")].map((note) => ({
            kind: [...note.classList].find((name) => name !== "note"),
            label: note.querySelector(".label").textContent.trim(),
            detail: note.querySelector(".detail")?.textContent.trim() ?? null,
          })),
          region: region && {
            element: region.localName,
            markdown: region.classList.contains("markdown"),
            text: region.textContent.replace(/^\\s+|\\s+$/g, ""),
            tabindex: region.getAttribute("tabindex"),
            label: region.getAttribute("aria-label"),
          },
          rendered: ["h1", "ul", "table", "a"].filter((tag) => root.querySelector(tag)),
        };
      };
    })`);
  });
  after(async () => {
    await page?.close();
    await browser?.close();
    await server?.stop();
  });

  const shown = (fields) => page.evaluate(`window.shown(${JSON.stringify(fields)})`);

  const source =
    "# Notes\n\n- one\n- two\n\n| a | b |\n| - | - |\n| 1 | 2 |\n\n[site](https://example.com)";

  for (const contentType of [
    "text/markdown",
    "text/markdown; charset=utf-8",
    "Text/Markdown;charset=UTF-8",
    " TEXT/MARKDOWN ",
  ]) {
    test(`${JSON.stringify(contentType)} renders as Markdown`, async () => {
      const view = await shown({ name: "notes.md", contentType, content: source });
      assert.equal(view.region.markdown, true);
      assert.deepEqual(view.rendered, ["h1", "ul", "table", "a"]);
      assert.deepEqual(view.notes, []);
    });
  }

  const value = { id: "run-1", stages: [{ name: "classify", outputs: 3 }] };
  for (const contentType of [
    "application/json",
    "application/json; charset=utf-8",
    "Application/JSON",
    "application/ld+json",
    "application/vnd.run+json; profile=x",
    "APPLICATION/VND.RUN+JSON",
  ]) {
    test(`${JSON.stringify(contentType)} parses and prints as JSON, two spaces an indent`, async () => {
      const view = await shown({ name: "run.json", contentType, content: JSON.stringify(value) });
      assert.equal(view.region.element, "pre");
      assert.equal(view.region.text, JSON.stringify(value, null, 2));
      assert.deepEqual(view.notes, []);
    });
  }

  for (const contentType of ["text/plain", "text/csv; charset=utf-8", "TEXT/HTML", "text/x-log"]) {
    test(`${JSON.stringify(contentType)} shows as preformatted text, as it is`, async () => {
      const content = "<b>bold?</b>\n  indented,  spaced\n# not a heading";
      const view = await shown({ name: "a.txt", contentType, content });
      assert.equal(view.region.element, "pre");
      assert.equal(view.region.text, content);
      assert.deepEqual(view.rendered, []);
      assert.deepEqual(view.notes, []);
    });
  }

  test("JSON that doesn't parse shows its raw text under a labelled note", async () => {
    const content = '{"id": "run-1", "status": complete,}';
    const view = await shown({ name: "broken.json", contentType: "application/json", content });
    assert.equal(view.notes.length, 1);
    assert.equal(view.notes[0].kind, "invalid");
    assert.equal(view.notes[0].label, "Invalid JSON, shown as text.");
    assert.match(view.notes[0].detail, /JSON/);
    assert.equal(view.region.element, "pre");
    assert.equal(view.region.text, content);
  });

  for (const contentType of [
    "image/png",
    "application/octet-stream",
    "application/pdf",
    "",
    "text",
  ]) {
    test(`${JSON.stringify(contentType)} shows a labelled note in place of its content`, async () => {
      const content = "\u0089PNG\r\n\u001a\n-the-bytes-";
      const view = await shown({ name: "chart.png", contentType, content });
      assert.equal(view.region, null);
      assert.deepEqual(
        view.notes.map(({ kind, label }) => [kind, label]),
        [["unsupported", "This content type can't be shown."]],
      );
      assert.equal(
        view.notes[0].detail,
        contentType ? `${contentType} isn't text.` : "It has no content type.",
      );
      assert.ok(!JSON.stringify(view).includes("-the-bytes-"), "the content isn't shown");
    });
  }

  test("loading shows a status note and no content", async () => {
    const view = await shown({
      name: "summary.md",
      contentType: "text/markdown",
      content: "# stale",
      state: "loading",
    });
    assert.deepEqual(view.notes, [{ kind: "loading", label: "Loading…", detail: null }]);
    assert.equal(view.region, null);
    assert.deepEqual([view.name, view.type], ["summary.md", "text/markdown"]);
  });

  test("an error shows a labelled note with its message, and no content", async () => {
    const view = await shown({
      name: "summary.md",
      contentType: "text/markdown",
      content: "# stale",
      state: "error",
      message: "The pipeline returned 404 Not Found.",
    });
    assert.deepEqual(view.notes, [
      {
        kind: "error",
        label: "Couldn't load this artifact.",
        detail: "The pipeline returned 404 Not Found.",
      },
    ]);
    assert.equal(view.region, null);
  });

  test("the attributes set the name, content type, and state", async () => {
    const view = await page.evaluate(`(async () => {
      const main = document.querySelector("main");
      main.innerHTML =
        '<sl-artifact-viewer name="a.json" content-type="application/json" content="[1,2]"></sl-artifact-viewer>';
      const viewer = main.firstElementChild;
      await viewer.updateComplete;
      const before = viewer.shadowRoot.querySelector("pre").textContent;
      viewer.state = "loading";
      await viewer.updateComplete;
      return { before, reflected: viewer.getAttribute("state") };
    })()`);
    assert.deepEqual(view, { before: "[\n  1,\n  2\n]", reflected: "loading" });
  });

  test("the scrolling region is reached by Tab and named for the artifact, and keys scroll it", async () => {
    // The viewer's max-block-size, 32rem, holds 200 lines' region to it, so the region scrolls.
    await page.cdp("Emulation.setFocusEmulationEnabled", { enabled: true });
    const content = Array.from({ length: 200 }, (_, i) => `line ${i + 1}`).join("\n");
    const view = await shown({ name: "run.log", contentType: "text/plain", content });
    assert.deepEqual([view.region.tabindex, view.region.label], ["0", "run.log content"]);
    const before = await page.evaluate(`(() => {
      const start = document.querySelector("main").insertBefore(
        document.createElement("button"), document.querySelector("sl-artifact-viewer"));
      start.focus();
      const viewer = document.querySelector("sl-artifact-viewer");
      const region = viewer.shadowRoot.querySelector(".body");
      return {
        host: viewer.getBoundingClientRect().height,
        rem: parseFloat(getComputedStyle(document.documentElement).fontSize),
        scrolls: region.scrollHeight > region.clientHeight,
      };
    })()`);
    assert.ok(before.scrolls, "the region scrolls");
    assert.ok(before.host <= 32 * before.rem + 0.5, `the viewer is ${before.host} tall`);
    const press = async (key, code, windowsVirtualKeyCode) => {
      for (const type of ["keyDown", "keyUp"]) {
        await page.cdp("Input.dispatchKeyEvent", { type, key, code, windowsVirtualKeyCode });
      }
    };
    await press("Tab", "Tab", 9);
    await press("PageDown", "PageDown", 34);
    await press("ArrowDown", "ArrowDown", 40);
    const after = await page.evaluate(`new Promise((resolve) => setTimeout(() => {
      const viewer = document.querySelector("sl-artifact-viewer");
      const region = viewer.shadowRoot.querySelector(".body");
      resolve({
        focused: viewer.shadowRoot.activeElement === region && region.matches(":focus-visible"),
        scrollTop: region.scrollTop,
      });
    }, 500))`);
    assert.equal(after.focused, true, "Tab focuses the region, focus-visible");
    assert.ok(after.scrollTop > 0, `the keys scrolled the region to ${after.scrollTop}`);
  });

  test("the viewer sends no event as its properties change", async () => {
    const sent = await page.evaluate(`(async () => {
      const viewer = document.querySelector("main").appendChild(
        document.createElement("sl-artifact-viewer"));
      const sent = [];
      const original = viewer.dispatchEvent.bind(viewer);
      viewer.dispatchEvent = (event) => (sent.push(event.type), original(event));
      for (const fields of [
        { name: "a.md", contentType: "text/markdown", content: "# a" },
        { state: "loading" },
        { state: "error", message: "gone" },
        { state: "ready", contentType: "application/json", content: "{" },
      ]) {
        Object.assign(viewer, fields);
        await viewer.updateComplete;
      }
      return sent;
    })()`);
    assert.deepEqual(sent, []);
  });
});
