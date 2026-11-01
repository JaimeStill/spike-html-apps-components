// The artifact viewer from this repository's dist/, on test/fixtures/components.html: the view each
// content type takes, its parameters and case aside; JSON formatted from its own tokens, its keys,
// their order, duplicates, numbers, and strings as written, and invalid JSON's raw text under its
// note; text/html as text, never a page; a PDF, an image, audio, and video from a Blob in their
// native elements, named and sized, each object URL the viewer's own, revoked as the content
// changes and as it disconnects, and made again as it reconnects; a type it can't show as a note,
// never its bytes, with a link that downloads a Blob given; viewOf's view and content for each
// type; the loading and error states; long content scrolling inside the viewer, by the keyboard once Tab reaches its region;
// with noHeader, no header, the region's name kept, and no gap where the header was; every state's
// container named for the artifact, with noHeader or without; and no event sent.

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { launch } from "@jaimestill/spike-html-apps-tooling/browser.js";
import type { Browser, Page } from "@jaimestill/spike-html-apps-tooling/browser.js";
import { serve } from "@jaimestill/spike-html-apps-tooling/server.js";
import type { Server } from "@jaimestill/spike-html-apps-tooling/server.js";

import { served } from "./support/served.ts";

/** What window.shown reads from a viewer's shadow root. */
interface View {
  name: string | null;
  type: string | null;
  notes: { kind: string; label: string; detail: string | null }[];
  region: {
    element: string;
    markdown: boolean;
    text: string;
    tabindex: string | null;
    label: string | null;
  } | null;
  rendered: string[];
}

/** A node of the page's accessibility tree, as Accessibility.getFullAXTree gives it. */
interface AXNode {
  nodeId: string;
  ignored: boolean;
  role?: { value: string };
  name?: { value: string };
  description?: { value: string };
  childIds?: string[];
}

describe("artifact viewer", { timeout: 60_000 }, () => {
  let server: Server;
  let browser: Browser;
  let page: Page;
  before(async () => {
    server = await serve(served);
    browser = await launch();
    page = await browser.open(`${server.origin}/test/fixtures/components.html`);
    // window.shown(fields) renders a viewer of the fields into main, resolving to what its shadow
    // root shows: the header's name and type, each note's label and detail, the region's element,
    // text, and tabindex, and whether a heading, list, or table rendered.
    await page.evaluate(`window.verdict.then(async () => {
      await import("/dist/artifact-viewer.js");
      window.media = await import("/test/fixtures/media.js");
      // Every object URL the page makes, with the type and size of its Blob, and every URL it
      // revokes, in order.
      window.urls = { created: [], revoked: [] };
      const create = URL.createObjectURL;
      URL.createObjectURL = (blob) => {
        const url = create.call(URL, blob);
        window.urls.created.push({ url, type: blob.type, size: blob.size });
        return url;
      };
      const revoke = URL.revokeObjectURL;
      URL.revokeObjectURL = (url) => {
        window.urls.revoked.push(url);
        revoke.call(URL, url);
      };
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

  const shown = (fields: Record<string, unknown>): Promise<View> =>
    page.evaluate(`window.shown(${JSON.stringify(fields)})`);

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
      assert.equal(view.region?.markdown, true);
      assert.deepEqual(view.rendered, ["h1", "ul", "table", "a"]);
      assert.deepEqual(view.notes, []);
    });
  }

  const value = { id: "run-1", stages: [{ name: "classify", outputs: 3 }] };
  const printed =
    '{\n  "id": "run-1",\n  "stages": [\n    {\n      "name": "classify",\n      "outputs": 3\n    }\n  ]\n}';
  for (const contentType of [
    "application/json",
    "application/json; charset=utf-8",
    "Application/JSON",
    "application/ld+json",
    "application/vnd.run+json; profile=x",
    "APPLICATION/VND.RUN+JSON",
  ]) {
    test(`${JSON.stringify(contentType)} shows as JSON, two spaces an indent`, async () => {
      const view = await shown({ name: "run.json", contentType, content: JSON.stringify(value) });
      assert.equal(view.region?.element, "pre");
      assert.equal(view.region?.text, printed);
      assert.deepEqual(view.notes, []);
    });
  }

  test("JSON shows its own keys in their order, duplicates, numbers, and strings as written", async () => {
    // Parsed and printed again, "2" and "10" would move first, the numbers would be rewritten,
    // 9007199254740993 rounded, and the first "dup" dropped.
    const content = String.raw`{"b":1,"10":[1.0,-0,1e3,1E-7,9007199254740993],"2":{},"dup":"a","dup":"say \"hi\", caf\u00e9 é\n\\"}`;
    const view = await shown({ name: "run.json", contentType: "application/json", content });
    assert.equal(
      view.region?.text,
      String.raw`{
  "b": 1,
  "10": [
    1.0,
    -0,
    1e3,
    1E-7,
    9007199254740993
  ],
  "2": {},
  "dup": "a",
  "dup": "say \"hi\", caf\u00e9 é\n\\"
}`,
    );
    assert.deepEqual(view.notes, []);
  });

  test("JSON of about 1 MB shows formatted without a stall", async (t) => {
    const timing: { bytes: number; ms: number; lines: number } = await page.evaluate(`(async () => {
      const record = (i) => ({ id: "run-" + i, "10": i, "2": -i * 1.5, note: "a \\"" + i + "\\"",
        stages: [{ name: "classify", outputs: [i, i + 1], ok: true }, { name: "summarize", err: null }] });
      const content = JSON.stringify(Array.from({ length: 6000 }, (_, i) => record(i)));
      const viewer = Object.assign(document.createElement("sl-artifact-viewer"),
        { name: "big.json", contentType: "application/json" });
      document.querySelector("main").replaceChildren(viewer);
      await viewer.updateComplete;
      const start = performance.now();
      viewer.content = content;
      await viewer.updateComplete;
      const ms = performance.now() - start;
      return {
        bytes: content.length,
        ms,
        lines: viewer.shadowRoot.querySelector(".content").textContent.split("\\n").length,
      };
    })()`);
    t.diagnostic(
      `${timing.bytes} bytes shown as ${timing.lines} lines in ${timing.ms.toFixed(1)} ms`,
    );
    assert.ok(timing.bytes > 900_000, `the content is ${timing.bytes} bytes`);
    assert.ok(timing.lines > 100_000, `it shows ${timing.lines} lines`);
    assert.ok(timing.ms < 500, `the update took ${timing.ms} ms`);
  });

  for (const contentType of ["text/plain", "text/csv; charset=utf-8", "TEXT/HTML", "text/x-log"]) {
    test(`${JSON.stringify(contentType)} shows as preformatted text, as it is`, async () => {
      const content = "<b>bold?</b>\n  indented,  spaced\n# not a heading";
      const view = await shown({ name: "a.txt", contentType, content });
      assert.equal(view.region?.element, "pre");
      assert.equal(view.region?.text, content);
      assert.deepEqual(view.rendered, []);
      assert.deepEqual(view.notes, []);
    });
  }

  test("valid JSON nested too deep for its indents to fit in a string shows as it is", async () => {
    // 20,000 levels are 40 kB of text, but their indents alone would be some 800 million spaces.
    const content = "[".repeat(20_000) + "1" + "]".repeat(20_000);
    const view = await shown({ name: "deep.json", contentType: "application/json", content });
    assert.equal(view.region?.text, content);
    assert.deepEqual(view.notes, []);
  });

  test("JSON that doesn't parse shows its raw text under a labelled note", async () => {
    const content = '{"id": "run-1", "status": complete,}';
    const view = await shown({ name: "broken.json", contentType: "application/json", content });
    assert.equal(view.notes.length, 1);
    assert.equal(view.notes[0].kind, "invalid");
    assert.equal(view.notes[0].label, "Invalid JSON, shown as text.");
    assert.match(view.notes[0].detail ?? "", /JSON/);
    assert.equal(view.region?.element, "pre");
    assert.equal(view.region?.text, content);
  });

  for (const [contentType, detail] of [
    ["application/zip", "application/zip isn't text."],
    ["application/octet-stream", "application/octet-stream isn't text."],
    ["image/svg+xml", "image/svg+xml isn't text."],
    ["", "It has no content type."],
    ["text", "text isn't text."],
  ]) {
    test(`${JSON.stringify(contentType)} shows a labelled note in place of its content`, async () => {
      const content = "\u0089PNG\r\n\u001a\n-the-bytes-";
      const view = await shown({ name: "chart.zip", contentType, content });
      assert.equal(view.region, null);
      assert.deepEqual(
        view.notes.map(({ kind, label }) => [kind, label]),
        [["unsupported", "This content type can't be shown."]],
      );
      assert.equal(view.notes[0].detail, detail);
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

  test("viewOf gives each type's view and the content it takes", async () => {
    const results: Record<string, unknown> = await page.evaluate(`(async () => {
      const { viewOf } = await import("/dist/artifact-viewer.js");
      const types = ["text/markdown", "application/ld+json", "text/html; charset=utf-8",
        "Application/PDF", "image/png", "image/svg+xml", "audio/wav", "VIDEO/WEBM; codecs=vp9",
        "application/zip", "", "image", "image/png,text/html", "image/x y", "text/plain,x"];
      return Object.fromEntries(types.map((type) => [type, viewOf(type)]));
    })()`);
    assert.deepEqual(results, {
      "text/markdown": { view: "markdown", content: "text" },
      "application/ld+json": { view: "json", content: "text" },
      "text/html; charset=utf-8": { view: "text", content: "text" },
      "Application/PDF": { view: "pdf", content: "blob" },
      "image/png": { view: "image", content: "blob" },
      "image/svg+xml": { view: "unsupported", content: "none" },
      "audio/wav": { view: "audio", content: "blob" },
      "VIDEO/WEBM; codecs=vp9": { view: "video", content: "blob" },
      "application/zip": { view: "unsupported", content: "none" },
      "": { view: "unsupported", content: "none" },
      image: { view: "unsupported", content: "none" },
      "image/png,text/html": { view: "unsupported", content: "none" },
      "image/x y": { view: "unsupported", content: "none" },
      "text/plain,x": { view: "unsupported", content: "none" },
    });
  });

  /** What window.native reads of a viewer given a Blob from test/fixtures/media.js. */
  interface Native {
    element: string | null;
    src: string | null;
    created: { url: string; type: string; size: number } | null;
    given: { type: string; size: number };
    title: string | null;
    alt: string | null;
    label: string | null;
    notes: string[];
    frame: { width: number; height: number; scrolls: boolean };
    box: { width: number; height: number } | null;
    rem: number;
  }

  // Renders a viewer of the fields with media[fixture]() as its content, and reads its native
  // element: its src and the object URL made for it, its names, and its box and the frame's. The
  // style is the host's.
  const native = async (
    fields: Record<string, unknown>,
    fixture: string,
    style = "",
  ): Promise<Native> =>
    page.evaluate(`(async () => {
      const fields = ${JSON.stringify(fields)};
      const blob = window.media[${JSON.stringify(fixture)}]();
      const viewer = Object.assign(document.createElement("sl-artifact-viewer"), fields,
        { content: blob });
      viewer.style.cssText = ${JSON.stringify(style)};
      const before = window.urls.created.length;
      document.querySelector("main").replaceChildren(viewer);
      await viewer.updateComplete;
      const root = viewer.shadowRoot;
      const element = root.querySelector(".media");
      if (element?.localName === "img") await element.decode();
      if (element?.localName === "video" && element.readyState < 1) {
        await new Promise((resolve) => element.addEventListener("loadedmetadata", resolve,
          { once: true }));
      }
      const frame = root.querySelector(".frame");
      const box = element?.getBoundingClientRect();
      return {
        element: element?.localName ?? null,
        src: element?.getAttribute("src") ?? null,
        created: window.urls.created.slice(before).at(-1) ?? null,
        given: { type: blob.type, size: blob.size },
        title: element?.getAttribute("title") ?? null,
        alt: element?.getAttribute("alt") ?? null,
        label: element?.getAttribute("aria-label") ?? null,
        notes: [...root.querySelectorAll(".note")].map((note) => note.classList[1]),
        frame: { width: frame.clientWidth, height: frame.clientHeight,
          scrolls: frame.scrollHeight > frame.clientHeight || frame.scrollWidth > frame.clientWidth },
        box: box ? { width: box.width, height: box.height } : null,
        rem: parseFloat(getComputedStyle(document.documentElement).fontSize),
      };
    })()`);

  // The object URL shown is the one the viewer made, from a Blob of the given one's bytes, typed by
  // the content type, which decides the view.
  const madeFor = (view: Native, type: string) => {
    assert.match(view.src ?? "", /^blob:/);
    assert.equal(view.src, view.created?.url, "the src is the URL the viewer made");
    assert.deepEqual(
      [view.created?.type, view.created?.size],
      [type, view.given.size],
      "made from the given bytes, typed by the content type",
    );
    assert.deepEqual(view.notes, []);
  };

  test("application/pdf shows in an iframe, titled, the frame's width, tall, the viewer's frame unscrolled", async () => {
    // chrome-headless-shell has no PDF viewer plugin, so the frame's pages never render here: the
    // test holds the iframe, its blob: src, its title, and its box, not the PDF's pages.
    const view = await native({ name: "summary.pdf", contentType: "application/pdf" }, "pdf");
    assert.equal(view.element, "iframe");
    madeFor(view, "application/pdf");
    assert.equal(view.title, "summary.pdf");
    assert.ok(Math.abs((view.box?.width ?? 0) - view.frame.width) <= 0.5, "the frame's width");
    assert.ok((view.box?.height ?? 0) >= 16 * view.rem, `${view.box?.height} tall`);
    assert.equal(view.frame.scrolls, false, "the viewer's frame doesn't scroll the iframe");
    assert.deepEqual(await regions().then((named) => named.map(({ name }) => name)), [
      "summary.pdf content",
    ]);
    // Held to 12rem, the viewer shrinks the iframe into its frame, still unscrolled.
    const held = await native(
      { name: "summary.pdf", contentType: "application/pdf" },
      "pdf",
      "block-size: 12rem",
    );
    assert.ok((held.box?.height ?? 0) <= held.frame.height + 0.5, `${held.box?.height} tall`);
    assert.equal(held.frame.scrolls, false);
  });

  test("no view's object URL, opened as a document of its own, loads a Blob as a page", async () => {
    // Each Blob is a page typed text/html, which, loaded in the app's origin, would set ran on the
    // frame's parent. Each view's URL, a native element's src or the download link's href, is
    // opened in a frame, as "Open image in new tab" or the link opened rather than downloaded
    // would; a URL the test makes of the Blob itself first shows that such a page would run.
    const opened: Record<string, { url: string | null; ran: boolean; type: string | null }> =
      await page.evaluate(`(async () => {
      const page = () => new Blob(["<script>parent.ran = true</script>"], { type: "text/html" });
      const open = async (url) => {
        window.ran = false;
        const frame = document.createElement("iframe");
        frame.src = url;
        const loaded = new Promise((resolve) => frame.addEventListener("load", resolve));
        document.body.append(frame);
        await Promise.race([loaded, new Promise((resolve) => setTimeout(resolve, 1000))]);
        frame.remove();
        return { url, ran: window.ran, type: (await fetch(url)).headers.get("content-type") };
      };
      const opened = { control: await open(URL.createObjectURL(page())) };
      for (const contentType of ["application/pdf; name=x", "image/png", "audio/wav",
        "video/webm", "image/svg+xml", "application/zip", "image/png,text/html"]) {
        const viewer = Object.assign(document.createElement("sl-artifact-viewer"),
          { name: "x", contentType, content: page() });
        document.querySelector("main").replaceChildren(viewer);
        await viewer.updateComplete;
        const root = viewer.shadowRoot;
        const url = root.querySelector(".media")?.getAttribute("src") ??
          root.querySelector(".download")?.getAttribute("href");
        opened[contentType] = url ? await open(url) : { url: null, ran: false, type: null };
      }
      return opened;
    })()`);
    assert.deepEqual(
      [opened.control.ran, opened.control.type],
      [true, "text/html"],
      "a page's own URL runs",
    );
    for (const [contentType, type] of [
      ["application/pdf; name=x", "application/pdf"],
      ["image/png", "image/png"],
      ["audio/wav", "audio/wav"],
      ["video/webm", "video/webm"],
      ["image/svg+xml", "application/octet-stream"],
      ["application/zip", "application/octet-stream"],
      ["image/png,text/html", "application/octet-stream"],
    ]) {
      const { url, ran, type: served } = opened[contentType];
      assert.match(url ?? "", /^blob:/, `${contentType} shows a URL`);
      assert.deepEqual([ran, served], [false, type], `${contentType}'s URL is no page`);
    }
  });

  test("image/* shows in an img, its alt the name, at its natural size, never upscaled, narrowed with its aspect", async () => {
    const view = await native(
      { name: "chart.png", contentType: "image/png" },
      "png",
      "inline-size: 40rem",
    );
    assert.equal(view.element, "img");
    madeFor(view, "image/png");
    assert.equal(view.alt, "chart.png");
    assert.deepEqual(view.box, { width: 160, height: 90 }, "its natural size, the blob decoded");
    const narrow = await native(
      { name: "chart.png", contentType: "image/png" },
      "png",
      "inline-size: 100px",
    );
    assert.ok((narrow.box?.width ?? 0) <= narrow.frame.width + 0.5, "no wider than the frame");
    const ratio = (narrow.box?.height ?? 0) / (narrow.box?.width ?? 1);
    assert.ok(Math.abs(ratio - 90 / 160) < 0.02, `its aspect, ${ratio}`);
    assert.equal(narrow.frame.scrolls, false);
  });

  test("audio/* shows in a native audio with controls, labelled, the frame's width", async () => {
    const view = await native({ name: "silence.wav", contentType: "audio/wav" }, "wav");
    assert.equal(view.element, "audio");
    madeFor(view, "audio/wav");
    assert.equal(view.label, "silence.wav");
    assert.ok(Math.abs((view.box?.width ?? 0) - view.frame.width) <= 0.5, "the frame's width");
    const controls = await page.evaluate(
      `document.querySelector("sl-artifact-viewer").shadowRoot.querySelector("audio").controls`,
    );
    assert.equal(controls, true);
  });

  test("video/* shows in a native video with controls, labelled, the frame's width at its aspect", async () => {
    const view = await native({ name: "clip.webm", contentType: "video/webm" }, "webm");
    assert.equal(view.element, "video");
    madeFor(view, "video/webm");
    assert.equal(view.label, "clip.webm");
    assert.ok(Math.abs((view.box?.width ?? 0) - view.frame.width) <= 0.5, "the frame's width");
    const ratio = (view.box?.height ?? 0) / (view.box?.width ?? 1);
    assert.ok(Math.abs(ratio - 36 / 64) < 0.02, `its aspect, ${ratio}`);
  });

  for (const noHeader of [false, true]) {
    test(`a native view's frame is the region named for the artifact${noHeader ? ", with noHeader, no header and no gap" : ""}`, async () => {
      const view = await native({ name: "chart.png", contentType: "image/png", noHeader }, "png");
      assert.equal(view.element, "img");
      const box: { header: boolean; frameTop: number } = await page.evaluate(`(() => {
        const viewer = document.querySelector("sl-artifact-viewer");
        const root = viewer.shadowRoot;
        return { header: root.querySelector("header") !== null,
          frameTop: root.querySelector(".frame").getBoundingClientRect().top -
            viewer.getBoundingClientRect().top };
      })()`);
      assert.equal(box.header, !noHeader);
      if (noHeader)
        assert.ok(Math.abs(box.frameTop) <= 0.5, `the frame starts ${box.frameTop} down`);
      const named = await regions();
      assert.deepEqual(
        named.map(({ name }) => name),
        ["chart.png content"],
      );
    });
  }

  test("the viewer revokes its URL as the content changes and as it disconnects, and makes one again as it reconnects", async () => {
    const {
      steps,
      served,
    }: { steps: { src: string | null; revoked: string[]; created: string[] }[]; served: string[] } =
      await page.evaluate(`(async () => {
      const viewer = Object.assign(document.createElement("sl-artifact-viewer"),
        { name: "chart.png", contentType: "image/png", content: window.media.png() });
      const main = document.querySelector("main");
      // The viewer a test before left, removed first, revokes its own URL before the count.
      main.replaceChildren();
      const steps = [];
      let created = window.urls.created.length;
      let revoked = window.urls.revoked.length;
      const step = async (change) => {
        await change();
        await viewer.updateComplete;
        steps.push({
          src: viewer.shadowRoot.querySelector(".media")?.getAttribute("src") ?? null,
          created: window.urls.created.slice(created).map(({ url }) => url),
          revoked: window.urls.revoked.slice(revoked),
        });
        created = window.urls.created.length;
        revoked = window.urls.revoked.length;
      };
      await step(() => main.replaceChildren(viewer));
      await step(() => { viewer.content = window.media.png(); });
      await step(() => viewer.remove());
      await step(() => main.append(viewer));
      await step(() => { viewer.contentType = "image/webp"; });
      await step(() => { viewer.content = ""; });
      // Each URL revoked is gone: the browser no longer serves it.
      const served = await Promise.all(steps.flatMap(({ revoked }) => revoked).map((url) =>
        fetch(url).then(() => url, () => null)));
      return { steps, served: served.filter(Boolean) };
    })()`);
    const [mounted, changed, removed, restored, retyped, cleared] = steps;
    assert.equal(mounted.created.length, 1, "connected, one URL is made");
    assert.equal(mounted.src, mounted.created[0]);
    assert.deepEqual(mounted.revoked, []);
    assert.deepEqual(
      changed.revoked,
      [mounted.src],
      "the old URL is revoked as the content changes",
    );
    assert.deepEqual(changed.created, [changed.src]);
    assert.deepEqual(removed.revoked, [changed.src], "disconnecting revokes it");
    assert.deepEqual(removed.created, []);
    assert.equal(restored.created.length, 1, "reconnecting makes one again");
    assert.equal(restored.src, restored.created[0]);
    assert.deepEqual(restored.revoked, []);
    assert.deepEqual(retyped.revoked, [restored.src], "a new type is a new URL");
    assert.deepEqual(retyped.created, [retyped.src]);
    assert.deepEqual(cleared.revoked, [retyped.src], "no Blob, no URL");
    assert.deepEqual(cleared.created, []);
    assert.equal(cleared.src, null);
    assert.deepEqual(served, [], "no URL revoked is still served");
  });

  test("a native type with no Blob yet shows the loading note; loading and error take no Blob's element", async () => {
    const view: { kinds: string[]; media: boolean }[] = await page.evaluate(`(async () => {
      const viewer = Object.assign(document.createElement("sl-artifact-viewer"),
        { name: "summary.pdf", contentType: "application/pdf" });
      document.querySelector("main").replaceChildren(viewer);
      const read = async (fields) => {
        Object.assign(viewer, fields);
        await viewer.updateComplete;
        const root = viewer.shadowRoot;
        return { kinds: [...root.querySelectorAll(".note")].map((note) => note.classList[1]),
          media: root.querySelector(".media") !== null };
      };
      return [
        await read({}),
        await read({ content: "%PDF-1.4" }),
        await read({ content: window.media.pdf(), state: "loading" }),
        await read({ state: "error", message: "gone" }),
        await read({ state: "ready", content: new Blob([], { type: "application/pdf" }) }),
      ];
    })()`);
    assert.deepEqual(view, [
      { kinds: ["loading"], media: false },
      { kinds: ["loading"], media: false },
      { kinds: ["loading"], media: false },
      { kinds: ["error"], media: false },
      { kinds: ["empty"], media: false },
    ]);
  });

  test("text/html shows as text, string or Blob, never in an iframe", async () => {
    const view: { pre: string | null; iframe: boolean; notes: string[]; made: number }[] =
      await page.evaluate(`(async () => {
      const viewer = Object.assign(document.createElement("sl-artifact-viewer"),
        { name: "page.html", contentType: "text/html" });
      document.querySelector("main").replaceChildren(viewer);
      const read = async (content) => {
        const before = window.urls.created.length;
        viewer.content = content;
        await viewer.updateComplete;
        const root = viewer.shadowRoot;
        return { pre: root.querySelector("pre")?.textContent ?? null,
          iframe: root.querySelector("iframe") !== null,
          notes: [...root.querySelectorAll(".note")].map((note) => note.classList[1]),
          made: window.urls.created.length - before };
      };
      const html = "<h1>Hi</h1><script>window.pwned = 1</script>";
      return [await read(html), await read(new Blob([html], { type: "text/html" }))];
    })()`);
    assert.deepEqual(view, [
      { pre: "<h1>Hi</h1><script>window.pwned = 1</script>", iframe: false, notes: [], made: 0 },
      // A Blob is no text type's content: it shows as none, and no URL is made of it.
      { pre: null, iframe: false, notes: ["empty"], made: 0 },
    ]);
  });

  test("a type it can't show, given a Blob, offers a link that downloads it under its name", async () => {
    const view: {
      href: string | null;
      download: string | null;
      text: string | null;
      created: { url: string; type: string; size: number };
      detail: string | null;
    } = await page.evaluate(`(async () => {
      const viewer = Object.assign(document.createElement("sl-artifact-viewer"), {
        name: "bundle.zip", contentType: "application/zip",
        content: new Blob(["PK-the-bytes-"], { type: "text/html" }),
      });
      document.querySelector("main").replaceChildren(viewer);
      await viewer.updateComplete;
      const link = viewer.shadowRoot.querySelector(".note a");
      return { href: link?.getAttribute("href") ?? null, download: link?.getAttribute("download") ?? null,
        text: link?.textContent.trim() ?? null, created: window.urls.created.at(-1),
        detail: viewer.shadowRoot.querySelector(".detail")?.textContent ?? null };
    })()`);
    assert.match(view.href ?? "", /^blob:/);
    assert.equal(view.href, view.created.url);
    // Typed application/octet-stream, so the link opened rather than downloaded renders nothing.
    assert.deepEqual([view.created.type, view.created.size], ["application/octet-stream", 13]);
    assert.equal(view.download, "bundle.zip");
    assert.equal(view.text, "Download bundle.zip");
    assert.equal(view.detail, "application/zip isn't text.");
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
    // A block-size of 16rem on the host holds 200 lines' region to it, so the region scrolls.
    await page.cdp("Emulation.setFocusEmulationEnabled", { enabled: true });
    const content = Array.from({ length: 200 }, (_, i) => `line ${i + 1}`).join("\n");
    const view = await shown({ name: "run.log", contentType: "text/plain", content });
    assert.deepEqual([view.region?.tabindex, view.region?.label], ["0", "run.log content"]);
    const before: { host: number; rem: number; scrolls: boolean } = await page.evaluate(`(() => {
      const start = document.querySelector("main").insertBefore(
        document.createElement("button"), document.querySelector("sl-artifact-viewer"));
      start.focus();
      const viewer = document.querySelector("sl-artifact-viewer");
      viewer.style.blockSize = "16rem";
      const region = viewer.shadowRoot.querySelector(".body");
      return {
        host: viewer.getBoundingClientRect().height,
        rem: parseFloat(getComputedStyle(document.documentElement).fontSize),
        scrolls: region.scrollHeight > region.clientHeight,
      };
    })()`);
    assert.ok(before.scrolls, "the region scrolls");
    assert.ok(Math.abs(before.host - 16 * before.rem) <= 0.5, `the viewer is ${before.host} tall`);
    const press = async (key: string, code: string, windowsVirtualKeyCode: number) => {
      for (const type of ["keyDown", "keyUp"]) {
        await page.cdp("Input.dispatchKeyEvent", { type, key, code, windowsVirtualKeyCode });
      }
    };
    await press("Tab", "Tab", 9);
    await press("PageDown", "PageDown", 34);
    await press("ArrowDown", "ArrowDown", 40);
    const after: { focused: boolean; scrollTop: number } =
      await page.evaluate(`new Promise((resolve) => setTimeout(() => {
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

  test("scrolled to its end, the region shows its padding past the content, in each view", async () => {
    // A viewer 12rem wide and 10rem tall, of lines too long and too many for it: scrolled to the
    // end of both axes, the text's widest line and last line, and the Markdown code block's
    // border, stop short of the region's edges by the padding, never cut at the frame.
    const long = Array.from({ length: 40 }, (_, i) => `line ${i + 1} ${"x".repeat(60)}end`).join(
      "\n",
    );
    const cases = [
      { contentType: "text/plain", content: long },
      { contentType: "application/json", content: JSON.stringify({ line: "y".repeat(80) }) },
      { contentType: "text/markdown", content: "```\n" + long + "\n```" },
    ];
    for (const fields of cases) {
      await shown({ name: "wide", ...fields });
      const gaps: { scrolled: boolean; inline: number; block: number } =
        await page.evaluate(`(() => {
        const viewer = document.querySelector("sl-artifact-viewer");
        viewer.style.inlineSize = "12rem";
        viewer.style.maxBlockSize = "10rem";
        const region = viewer.shadowRoot.querySelector(".body");
        region.scrollLeft = region.scrollWidth;
        region.scrollTop = region.scrollHeight;
        // The region's edges inside its scrollbars, where its content stops showing.
        const box = region.getBoundingClientRect();
        const edge = {
          right: box.left + region.clientLeft + region.clientWidth,
          bottom: box.top + region.clientTop + region.clientHeight,
        };
        const code = region.querySelector(".document pre");
        let end;
        if (code) {
          end = code.getBoundingClientRect();
        } else {
          // The text's box: its widest line's end, and its last line's foot.
          const range = document.createRange();
          range.selectNodeContents(region.querySelector(".content"));
          end = range.getBoundingClientRect();
        }
        const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
        return {
          scrolled: region.scrollLeft > 0,
          inline: (edge.right - end.right) / rem,
          block: (edge.bottom - end.bottom) / rem,
        };
      })()`);
      const where = fields.contentType;
      assert.ok(gaps.scrolled, `${where}: the region scrolls sideways`);
      assert.ok(gaps.inline >= 0.5, `${where}: ${gaps.inline}rem past the content's inline end`);
      assert.ok(gaps.block >= 0.5, `${where}: ${gaps.block}rem past the content's block end`);
    }
  });

  // The viewer's layout and its region's names in the accessibility tree, for the fields: whether
  // a header renders and shows, the header's and the frame's tops from the host's, and the names of
  // the regions exposed.
  const laidOut = async (
    fields: Record<string, unknown>,
  ): Promise<{
    header: boolean;
    headerTop: number | null;
    frameTop: number;
    regions: string[];
  }> => {
    await shown(fields);
    const box: { header: boolean; headerTop: number | null; frameTop: number } =
      await page.evaluate(`(() => {
      const viewer = document.querySelector("sl-artifact-viewer");
      const root = viewer.shadowRoot;
      const top = viewer.getBoundingClientRect().top;
      const header = root.querySelector("header");
      return {
        header: header !== null && header.checkVisibility(),
        headerTop: header && header.getBoundingClientRect().top - top,
        frameTop: root.querySelector(".frame").getBoundingClientRect().top - top,
      };
    })()`);
    const { nodes }: { nodes: AXNode[] } = await page.cdp("Accessibility.getFullAXTree", {});
    const regions = nodes
      .filter((node) => !node.ignored && node.role?.value === "region")
      .map((node) => node.name?.value ?? "");
    return { ...box, regions };
  };

  for (const contentType of ["text/markdown", "application/json", "text/plain"]) {
    test(`${contentType}: with noHeader, no header shows, the region keeps its name, and the frame starts where the header did`, async () => {
      const fields = { name: "notes.md", contentType, content: "[1]" };
      const headed = await laidOut(fields);
      assert.equal(headed.header, true, "without noHeader, the header shows");
      assert.ok(headed.frameTop > 0, `without noHeader, the frame sits ${headed.frameTop} below`);
      assert.deepEqual(headed.regions, ["notes.md content"]);
      const bare = await laidOut({ ...fields, noHeader: true });
      assert.equal(bare.header, false, "no header renders");
      assert.equal(bare.headerTop, null, "no header element");
      assert.ok(
        Math.abs(bare.frameTop - (headed.headerTop ?? NaN)) <= 0.5,
        `the frame's top, ${bare.frameTop}, is the header's, ${headed.headerTop}`,
      );
      assert.deepEqual(bare.regions, headed.regions, "the region's accessible name is unchanged");
    });
  }

  // The regions the accessibility tree exposes, each with its name, its description, and the text
  // of the static text nodes beneath it, joined by spaces.
  const regions = async (): Promise<{ name: string; description: string; text: string }[]> => {
    const { nodes }: { nodes: AXNode[] } = await page.cdp("Accessibility.getFullAXTree", {});
    const byId = new Map(nodes.map((node) => [node.nodeId, node]));
    const text = (node: AXNode): string[] =>
      node.role?.value === "StaticText"
        ? [node.name?.value ?? ""]
        : (node.childIds ?? []).flatMap((id) => {
            const child = byId.get(id);
            return child ? text(child) : [];
          });
    return nodes
      .filter((node) => !node.ignored && node.role?.value === "region")
      .map((node) => ({
        name: node.name?.value ?? "",
        description: node.description?.value ?? "",
        text: text(node).join(" "),
      }));
  };

  // Each state that isn't a region's content alone, with what its named container holds: its
  // text, and the invalid JSON's note as the description of the raw text's region.
  const states: {
    state: string;
    fields: Record<string, unknown>;
    holds: string[];
    description: RegExp;
  }[] = [
    {
      state: "loading",
      fields: { contentType: "text/markdown", content: "# stale", state: "loading" },
      holds: ["Loading…"],
      description: /^$/,
    },
    {
      state: "error",
      fields: {
        contentType: "text/markdown",
        state: "error",
        message: "The pipeline returned 404.",
      },
      holds: ["Couldn't load this artifact.", "The pipeline returned 404."],
      description: /^$/,
    },
    {
      state: "invalid JSON",
      fields: { contentType: "application/json", content: '{"id": run-1}' },
      holds: ['{"id": run-1}'],
      description: /^Invalid JSON, shown as text\. .*JSON/,
    },
    {
      state: "unsupported",
      fields: { contentType: "application/zip", content: "-the-bytes-" },
      holds: ["This content type can't be shown.", "application/zip isn't text."],
      description: /^$/,
    },
    {
      state: "empty",
      fields: { contentType: "text/plain", content: "" },
      holds: ["This artifact is empty."],
      description: /^$/,
    },
  ];
  for (const { state, fields, holds, description } of states) {
    test(`${state}: the state's container is named for the artifact, with noHeader or without, and noHeader leaves no header and no gap`, async () => {
      for (const noHeader of [false, true]) {
        const where = `${state}${noHeader ? ", noHeader" : ""}`;
        const box = await laidOut({ name: "report.md", ...fields, noHeader });
        assert.equal(box.header, !noHeader, `${where}: a header unless noHeader`);
        if (noHeader) {
          assert.equal(box.headerTop, null, `${where}: no header element`);
          assert.ok(
            Math.abs(box.frameTop) <= 0.5,
            `${where}: the frame starts ${box.frameTop} down`,
          );
        }
        const named = await regions();
        assert.deepEqual(
          named.map(({ name }) => name),
          ["report.md content"],
          `${where}: one region, named for the artifact`,
        );
        for (const part of holds) {
          assert.ok(named[0].text.includes(part), `${where}: "${named[0].text}" holds "${part}"`);
        }
        assert.match(named[0].description, description, `${where}: its description`);
      }
    });
  }

  test("the no-header attribute sets noHeader, and noHeader reflects to it", async () => {
    const view = await page.evaluate(`(async () => {
      const main = document.querySelector("main");
      main.innerHTML =
        '<sl-artifact-viewer no-header name="a.json" content-type="application/json" content="[1]"></sl-artifact-viewer>';
      const viewer = main.firstElementChild;
      await viewer.updateComplete;
      const read = () => ({
        noHeader: viewer.noHeader,
        attribute: viewer.hasAttribute("no-header"),
        header: viewer.shadowRoot.querySelector("header") !== null,
      });
      const set = read();
      viewer.noHeader = false;
      await viewer.updateComplete;
      return { set, cleared: read() };
    })()`);
    assert.deepEqual(view, {
      set: { noHeader: true, attribute: true, header: false },
      cleared: { noHeader: false, attribute: false, header: true },
    });
  });

  test("the viewer sends no event as its properties change", async () => {
    const sent: string[] = await page.evaluate(`(async () => {
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
