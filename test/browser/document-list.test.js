// The document list from this repository's dist/, on test/fixtures/components.html: its
// composition, one sl-pagination around one sl-entry per document, the pagination's properties
// handed through and its attributes converted as the pagination's are, each entry's item mapped
// from its document; the selected document marked, for assistive technology and to the eye,
// moving no entry; the status line, one polite region, in every state, empty, loading, error, and
// ready, the state reflected, a page kept busy while loading and moving nowhere; the entry's open
// and the pagination's page-change and page-size-change reaching a listener on the list once each,
// the very events their parts sent, bubbling and composed; and no event as the properties change.

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { launch } from "./support/browser-pipe.js";
import { serve } from "./support/server.js";

describe("document list", { timeout: 60_000 }, () => {
  let server;
  let browser;
  let page;
  before(async () => {
    server = await serve();
    browser = await launch();
    page = await browser.open(`${server.origin}/test/fixtures/components.html`);
    // Keys go to the focused element as a user's would, though a headless page never has the
    // window's focus.
    await page.cdp("Emulation.setFocusEmulationEnabled", { enabled: true });
    // window.mount(fields) renders a list of the fields into main. A listener on the list's shadow
    // root keeps each event its parts send, as they send it, before it leaves the root; a listener
    // on the list records each one it hears, and whether it is one the root kept, the same event,
    // so a re-dispatch would show as a second, unkept one; and a listener on the document counts
    // what reaches it. window.read() resolves to what the list shows: the status line, the list,
    // each entry and its item, the selected mark, the pagination's properties, and the events.
    await page.evaluate(`window.verdict.then(async () => {
      await import("/dist/document-list.js");
      const types = ["open", "page-change", "page-size-change"];
      window.heard = [];
      window.reached = [];
      for (const type of types) document.addEventListener(type, (event) => window.reached.push(event.type));
      window.mount = async (fields) => {
        const list = Object.assign(document.createElement("sl-document-list"), fields);
        window.heard.length = 0;
        window.reached.length = 0;
        const sent = [];
        document.querySelector("main").replaceChildren(list);
        await list.updateComplete;
        for (const type of types) {
          list.shadowRoot.addEventListener(type, (event) => sent.push(event));
          list.addEventListener(type, (event) => window.heard.push({
            type: event.type,
            detail: event.detail,
            bubbles: event.bubbles,
            composed: event.composed,
            target: event.target === list,
            same: sent.includes(event),
          }));
        }
        await window.settled(list);
        return list;
      };
      // The list and every entry it holds rendered.
      window.settled = async (list) => {
        await list.updateComplete;
        const pagination = list.shadowRoot.querySelector("sl-pagination");
        await pagination.updateComplete;
        await Promise.all([...list.shadowRoot.querySelectorAll("sl-entry")].map((entry) => entry.updateComplete));
      };
      window.read = async () => {
        const list = document.querySelector("sl-document-list");
        await window.settled(list);
        const root = list.shadowRoot;
        const paginations = root.querySelectorAll("sl-pagination");
        const pagination = paginations[0];
        const status = root.querySelector(".status");
        const ul = root.querySelector("ul");
        return {
          state: list.getAttribute("state"),
          disabled: list.hasAttribute("disabled"),
          paginations: paginations.length,
          // The status line and the list are the pagination's slotted children, between its
          // summary and its controls.
          slotted: [...pagination.children].map((child) => child.localName),
          status: [status.getAttribute("role"), status.textContent.replace(/\\s+/g, " ").trim(), status.className],
          statusHeight: status.getBoundingClientRect().height,
          list: ul && [ul.getAttribute("aria-label"), ul.getAttribute("aria-busy")],
          paging: {
            page: pagination.page,
            size: pagination.size,
            total: pagination.total,
            more: pagination.more,
            pageSizes: pagination.pageSizes,
            disabled: pagination.disabled,
          },
          summary: pagination.shadowRoot.querySelector(".summary")?.textContent ?? null,
          entries: [...root.querySelectorAll("ul > li")].map((li) => {
            const entry = li.querySelector("sl-entry");
            const mark = getComputedStyle(li, "::before");
            const rect = entry.getBoundingClientRect();
            return {
              item: entry.item,
              current: li.getAttribute("aria-current"),
              mark: mark.backgroundColor !== "rgba(0, 0, 0, 0)" && parseFloat(mark.width) > 0,
              text: entry.shadowRoot.querySelector("button").textContent.replace(/\\s+/g, " ").trim(),
              box: [rect.left, rect.top, rect.width, rect.height],
            };
          }),
          heard: window.heard,
          reached: window.reached,
        };
      };
    })`);
  });
  after(async () => {
    await page?.close();
    await browser?.close();
    await server?.stop();
  });

  const mount = (fields = {}) =>
    page.evaluate(`window.mount(${JSON.stringify(fields)}).then(() => {})`);
  const read = () => page.evaluate("window.read()");
  // Sets the fields on the mounted list and waits for it and its parts to render.
  const update = (fields) =>
    page.evaluate(`(async () => {
      const list = document.querySelector("sl-document-list");
      Object.assign(list, ${JSON.stringify(fields)});
      await window.settled(list);
    })()`);
  // A key pressed and released on the focused element, with the text it types, if any.
  const press = async (key, keyCode, text) => {
    const event = { key, code: key, windowsVirtualKeyCode: keyCode };
    await page.cdp("Input.dispatchKeyEvent", {
      type: "keyDown",
      ...event,
      ...(text ? { text, unmodifiedText: text } : {}),
    });
    await page.cdp("Input.dispatchKeyEvent", { type: "keyUp", ...event });
  };

  // The emulator's documents, as its listing sends them, each with its run's status beside it:
  // the first page of eight by three.
  const documents = [
    {
      id: "doc-1",
      name: "terms.md",
      content_type: "text/markdown",
      size: 3120,
      created_at: "2026-10-27T11:12:44Z",
      run_id: "run-1",
      status: "complete",
    },
    {
      id: "doc-2",
      name: "retainer.docx",
      content_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      size: 41230,
      created_at: "2026-10-27T16:05:19Z",
      run_id: "run-2",
      status: "complete",
    },
    {
      id: "doc-3",
      name: "interview-notes.txt",
      content_type: "text/plain; charset=utf-8",
      size: 7204,
      created_at: "2026-10-29T15:42:03Z",
      run_id: "run-3",
      status: "running",
    },
  ];
  const paging = { page: 1, size: 3, total: 8, more: true, pageSizes: [3, 6, 12] };

  test("one pagination holds the status line and the list, and an entry per document, its item mapped from it", async () => {
    await mount({ ...paging, items: documents });
    const { paginations, slotted, list, entries, summary } = await read();
    assert.equal(paginations, 1);
    assert.deepEqual(slotted, ["p", "ul"]);
    assert.deepEqual(list, ["Documents", null]);
    assert.equal(summary, "Showing 1–3 of 8");
    // The entry's file: the document's fields, its acceptance time as the entry's time, and
    // nothing else, the run's id left out.
    assert.deepEqual(
      entries.map(({ item }) => item),
      documents.map(({ id, name, content_type, size, created_at, status }) => ({
        id,
        name,
        content_type,
        size,
        status,
        updated_at: created_at,
      })),
    );
    assert.match(
      entries[2].text,
      /^file interview-notes\.txt running 7\.2 kB text\/plain; charset=utf-8 /,
    );
  });

  test("the pagination's properties pass through as given, and its defaults are the list's", async () => {
    await mount();
    assert.deepEqual((await read()).paging, {
      page: 1,
      size: 12,
      total: null,
      more: false,
      pageSizes: [12, 24, 48, 96],
      disabled: false,
    });
    await mount({ ...paging, items: documents });
    assert.deepEqual((await read()).paging, { ...paging, disabled: false });
    await update({ page: null, total: null, more: true, size: 6, pageSizes: [6], disabled: true });
    const { paging: passed, disabled } = await read();
    assert.deepEqual(passed, {
      page: null,
      size: 6,
      total: null,
      more: true,
      pageSizes: [6],
      disabled: true,
    });
    assert.equal(disabled, true, "disabled reflected, as the pagination's is");
  });

  test("the paging attributes convert as the pagination's do", async () => {
    const passed = await page.evaluate(`(async () => {
      const holder = document.querySelector("main");
      holder.innerHTML = '<sl-document-list page="2" size="6" total="14" more page-sizes="[6,12]" disabled></sl-document-list>';
      const list = holder.firstElementChild;
      await window.settled(list);
      const pagination = list.shadowRoot.querySelector("sl-pagination");
      return [pagination.page, pagination.size, pagination.total, pagination.more, pagination.pageSizes, pagination.disabled];
    })()`);
    assert.deepEqual(passed, [2, 6, 14, true, [6, 12], true]);
  });

  test("the selected document's item is aria-current and shows its mark; the others neither", async () => {
    await mount({ ...paging, items: documents, selected: "doc-2" });
    const { entries } = await read();
    assert.deepEqual(
      entries.map(({ current, mark }) => [current, mark]),
      [
        [null, false],
        ["true", true],
        [null, false],
      ],
    );
  });

  test("selecting another document moves the mark and no entry", async () => {
    await mount({ ...paging, items: documents });
    const before = await read();
    assert.ok(before.entries.every(({ current, mark }) => current === null && !mark));
    await update({ selected: "doc-3" });
    const after = await read();
    assert.deepEqual(
      after.entries.map(({ current }) => current),
      [null, null, "true"],
    );
    assert.deepEqual(
      after.entries.map(({ box }) => box),
      before.entries.map(({ box }) => box),
    );
    await update({ selected: null });
    assert.ok((await read()).entries.every(({ current, mark }) => current === null && !mark));
  });

  test("ready with no documents says so quietly, and lists none", async () => {
    await mount({ total: 0 });
    const { state, status, list, entries } = await read();
    assert.equal(state, "ready");
    assert.deepEqual(status, ["status", "No documents.", "status ready"]);
    assert.equal(list, null);
    assert.deepEqual(entries, []);
  });

  test("a ready page leaves the status line blank, a line tall", async () => {
    await mount({ ...paging, items: documents });
    const { status, statusHeight } = await read();
    assert.deepEqual(status, ["status", "", "status ready"]);
    assert.ok(statusHeight > 0, `the blank status line ${statusHeight} tall`);
  });

  test("loading says so, reflected; a first load lists nothing, and a page change keeps its page busy", async () => {
    await mount({ state: "loading" });
    let shown = await read();
    assert.equal(shown.state, "loading");
    assert.deepEqual(shown.status, ["status", "Loading documents…", "status loading"]);
    assert.equal(shown.list, null);
    await mount({ ...paging, items: documents });
    const ready = await read();
    await update({ state: "loading" });
    shown = await read();
    assert.equal(shown.state, "loading");
    assert.deepEqual(shown.status, ["status", "Loading documents…", "status loading"]);
    assert.deepEqual(shown.list, ["Documents", "true"]);
    // The status line's text comes and goes in its own line: the entries stay where they were.
    assert.equal(shown.statusHeight, ready.statusHeight);
    assert.deepEqual(
      shown.entries.map(({ box }) => box),
      ready.entries.map(({ box }) => box),
    );
    await update({ state: "ready" });
    assert.deepEqual((await read()).list, ["Documents", null]);
  });

  test("an error shows its label and message, reflected, and lists no documents", async () => {
    await mount({
      ...paging,
      items: documents,
      state: "error",
      message: "503 Service Unavailable.",
    });
    const { state, status, list, entries, paginations } = await read();
    assert.equal(state, "error");
    assert.deepEqual(status, [
      "status",
      "Couldn't load the documents. 503 Service Unavailable.",
      "status error",
    ]);
    assert.equal(list, null);
    assert.deepEqual(entries, []);
    assert.equal(paginations, 1);
    await update({ message: "" });
    assert.equal((await read()).status[1], "Couldn't load the documents.");
  });

  test("an entry's open reaches the list's listener once, the entry's own event and detail, bubbling and composed", async () => {
    await mount({ ...paging, items: documents });
    await page.evaluate(`(() => {
      const entry = document.querySelector("sl-document-list").shadowRoot.querySelectorAll("sl-entry")[1];
      entry.shadowRoot.querySelector("button").click();
    })()`);
    const { heard, reached } = await read();
    assert.deepEqual(heard, [
      {
        type: "open",
        detail: { id: "doc-2", kind: "file" },
        bubbles: true,
        composed: true,
        target: true,
        same: true,
      },
    ]);
    assert.deepEqual(reached, ["open"]);
  });

  test("the keyboard reaches the first entry by Tab, and Enter opens it, once", async () => {
    await mount({ ...paging, items: documents });
    await page.evaluate(`(() => {
      const before = Object.assign(document.createElement("button"), { textContent: "before" });
      document.querySelector("main").prepend(before);
      before.focus();
    })()`);
    await press("Tab", 9);
    await press("Enter", 13, "\r");
    const { heard } = await read();
    assert.deepEqual(
      heard.map(({ type, detail, same }) => [type, detail, same]),
      [["open", { id: "doc-1", kind: "file" }, true]],
    );
  });

  test("the pagination's page-change and page-size-change reach the list's listener once each, its own events and details", async () => {
    await mount({ ...paging, page: 2, items: documents });
    await page.evaluate(`(() => {
      const root = document.querySelector("sl-document-list").shadowRoot.querySelector("sl-pagination").shadowRoot;
      root.querySelector('button[aria-label="Next page"]').click();
      root.querySelector('button[aria-label="Previous page"]').click();
      const select = root.querySelector("select");
      select.value = "6";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    })()`);
    const { heard, reached } = await read();
    assert.deepEqual(heard, [
      {
        type: "page-change",
        detail: { page: 3 },
        bubbles: true,
        composed: true,
        target: true,
        same: true,
      },
      {
        type: "page-change",
        detail: { page: 1 },
        bubbles: true,
        composed: true,
        target: true,
        same: true,
      },
      {
        type: "page-size-change",
        detail: { size: 6 },
        bubbles: true,
        composed: true,
        target: true,
        same: true,
      },
    ]);
    assert.deepEqual(reached, ["page-change", "page-change", "page-size-change"]);
  });

  test("the list sends no event as its properties change", async () => {
    await mount();
    await update({ state: "loading" });
    await update({ ...paging, items: documents, state: "ready" });
    await update({ selected: "doc-1" });
    await update({ page: 2, selected: "doc-3" });
    await update({ size: 6, pageSizes: [6, 12], total: 12, more: false });
    await update({ state: "error", message: "down" });
    await update({ items: [], state: "ready", disabled: true });
    const { heard, reached } = await read();
    assert.deepEqual(heard, []);
    assert.deepEqual(reached, []);
  });
});
