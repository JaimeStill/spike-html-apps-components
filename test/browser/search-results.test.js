// The search results from this repository's dist/, on test/fixtures/components.html: the status
// line, one polite region, in every state, idle, loading, no matches, matches, and error, and the
// state reflected; each match a native button, its name, its field's label, and its snippet, a
// snippet that only repeats the name left out; the query's occurrences marked case-insensitively,
// as text, markup and a pattern's specials literal, a letter whose other case is longer shifting
// no mark, a blank query marking nothing; activating a match by click and by the keyboard sending
// open with its id, bubbling and composed; a focused match kept as the list changes; and no
// event as the properties change.

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { launch } from "@jaimestill/spike-html-apps-tooling/browser.js";
import { serve } from "@jaimestill/spike-html-apps-tooling/server.js";

import { served } from "./support/served.js";

describe("search results", { timeout: 60_000 }, () => {
  let server;
  let browser;
  let page;
  before(async () => {
    server = await serve(served);
    browser = await launch();
    page = await browser.open(`${server.origin}/test/fixtures/components.html`);
    // Keys go to the focused element as a user's would, though a headless page never has the
    // window's focus.
    await page.cdp("Emulation.setFocusEmulationEnabled", { enabled: true });
    // window.mount(fields) renders results of the fields into main, recording every event its
    // host dispatches and every open the document hears; window.read() resolves to what the
    // results show: the status line, and each match's parts, each name and snippet as a list of
    // its text runs, a marked run in brackets.
    await page.evaluate(`window.verdict.then(async () => {
      await import("/dist/search-results.js");
      window.heard = [];
      document.addEventListener("open", (event) => window.heard.push({
        type: event.type, detail: event.detail, bubbles: event.bubbles, composed: event.composed,
      }));
      window.mount = async (fields) => {
        const results = Object.assign(document.createElement("sl-search-results"), fields);
        window.sent = [];
        window.heard.length = 0;
        const original = results.dispatchEvent.bind(results);
        results.dispatchEvent = (event) => (window.sent.push(event.type), original(event));
        document.querySelector("main").replaceChildren(results);
        await results.updateComplete;
        return results;
      };
      const runs = (element) =>
        element === null
          ? null
          : [...element.childNodes]
              .filter((node) => node.nodeType === Node.TEXT_NODE || node.nodeType === Node.ELEMENT_NODE)
              .map((node) => (node.localName === "mark" ? "[" + node.textContent + "]" : node.textContent))
              .filter((text) => text !== "")
              .join("")
              // A word joiner shows as "+", so a case sees where the snippet's ellipses join.
              .replaceAll("\\u2060", "+");
      window.read = async () => {
        const results = document.querySelector("sl-search-results");
        await results.updateComplete;
        const root = results.shadowRoot;
        const status = root.querySelector(".status");
        const list = root.querySelector("ul");
        return {
          state: results.getAttribute("state"),
          status: [status.getAttribute("role"), status.textContent.replace(/\\s+/g, " ").trim()],
          list: list && [list.getAttribute("aria-label"), list.getAttribute("aria-busy")],
          matches: [...root.querySelectorAll("li > button.match")].map((button) => ({
            type: button.type,
            field: button.querySelector(".field").textContent,
            name: runs(button.querySelector(".name")),
            snippet: runs(button.querySelector(".snippet")),
            text: button.textContent.replace(/\\s+/g, " ").trim(),
            elements: [...button.querySelectorAll("*")].map((element) => element.localName),
          })),
          sent: window.sent,
          heard: window.heard,
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
  // A key pressed and released on the focused element, with the text it types, if any.
  const press = async (key, keyCode, text) => {
    const event = { key, code: key === " " ? "Space" : key, windowsVirtualKeyCode: keyCode };
    await page.cdp("Input.dispatchKeyEvent", {
      type: "keyDown",
      ...event,
      ...(text ? { text, unmodifiedText: text } : {}),
    });
    await page.cdp("Input.dispatchKeyEvent", { type: "keyUp", ...event });
  };

  // The emulator's matches for "report": two in content, one in a name.
  const matches = [
    {
      id: "doc-1",
      name: "quarterly-report.md",
      field: "content",
      snippet: "…revenue rose. This report covers the regions…",
    },
    { id: "doc-2", name: "Report template.docx", field: "name", snippet: "Report template.docx" },
    {
      id: "doc-3",
      name: "notes.md",
      field: "content",
      snippet: "…a weekly REPORT, not a monthly report.",
    },
  ];

  test("idle, before any query, the status line prompts, and no list shows", async () => {
    await mount();
    const { state, status, list, matches: shown } = await read();
    assert.equal(state, "ready");
    assert.deepEqual(status, ["status", "Search document names and content."]);
    assert.equal(list, null);
    assert.deepEqual(shown, []);
  });

  test("loading says it is searching for the query, and keeps the matches given, busy", async () => {
    await mount({ query: "report", state: "loading" });
    assert.deepEqual((await read()).status, ["status", "Searching for “report”…"]);
    await mount({ query: "  ", state: "loading", items: matches });
    const { state, status, list, matches: shown } = await read();
    assert.equal(state, "loading");
    assert.deepEqual(status, ["status", "Searching…"]);
    assert.deepEqual(list, ["Matches", "true"]);
    assert.equal(shown.length, 3);
  });

  test("a query with no matches says so, quoting it, trimmed", async () => {
    await mount({ query: "  zebra ", items: [] });
    const { status, list } = await read();
    assert.deepEqual(status, ["status", "No matches for “zebra”"]);
    assert.equal(list, null);
  });

  test("an error shows its label and message, and no matches", async () => {
    await mount({
      query: "report",
      state: "error",
      message: "503 Service Unavailable.",
      items: matches,
    });
    const { state, status, list, matches: shown } = await read();
    assert.equal(state, "error");
    assert.deepEqual(status, ["status", "Couldn't search. 503 Service Unavailable."]);
    assert.equal(list, null);
    assert.deepEqual(shown, []);
    await mount({ state: "error" });
    assert.deepEqual((await read()).status, ["status", "Couldn't search."]);
  });

  test("state reflects to its attribute as it changes, through the same status line", async () => {
    await mount({ query: "report" });
    const reflected = await page.evaluate(`(async () => {
      const results = document.querySelector("sl-search-results");
      const status = results.shadowRoot.querySelector(".status");
      const seen = [];
      for (const state of ["loading", "error", "ready"]) {
        results.state = state;
        await results.updateComplete;
        seen.push([results.getAttribute("state"), results.shadowRoot.querySelector(".status") === status]);
      }
      results.setAttribute("state", "loading");
      await results.updateComplete;
      const now = results.shadowRoot.querySelector(".status");
      seen.push([results.state, now === status, now.textContent]);
      return seen;
    })()`);
    assert.deepEqual(reflected, [
      ["loading", true],
      ["error", true],
      ["ready", true],
      ["loading", true, "Searching for “report”…"],
    ]);
  });

  test("each match is a native button: its name, its field's label, and its snippet, the query marked in either case", async () => {
    await mount({ query: "report", items: matches });
    const { status, list, matches: shown } = await read();
    assert.deepEqual(status, ["status", "3 matches for “report”"]);
    assert.deepEqual(list, ["Matches", null]);
    assert.deepEqual(
      shown.map(({ type, field, name, snippet }) => ({ type, field, name, snippet })),
      [
        {
          type: "button",
          field: "in content",
          name: "quarterly-[report].md",
          snippet: "…+revenue rose. This [report] covers the regions+…",
        },
        // A name match's snippet only repeats its name, which shows marked: no snippet.
        { type: "button", field: "in name", name: "[Report] template.docx", snippet: null },
        {
          type: "button",
          field: "in content",
          name: "notes.md",
          snippet: "…+a weekly [REPORT], not a monthly [report].",
        },
      ],
    );
    // The button's name, its content, starts with the document's name.
    assert.ok(shown.every(({ text }, index) => text.startsWith(matches[index].name)));
    await mount({ query: "report", items: matches.slice(0, 1) });
    assert.deepEqual((await read()).status, ["status", "1 match for “report”"]);
  });

  test("a name match whose snippet is not the name's shows its snippet too", async () => {
    await mount({
      query: "plan",
      items: [{ id: "x", name: "plan.md", field: "name", snippet: "an older plan" }],
    });
    assert.deepEqual(
      (await read()).matches.map(({ name, snippet }) => [name, snippet]),
      [["[plan].md", "an older [plan]"]],
    );
  });

  test("markup in a snippet, a name, or the query shows as text, and a pattern's specials are literal", async () => {
    await mount({
      query: "<b>(a+b)*</b>",
      items: [
        {
          id: "x",
          name: "<img src=x onerror=alert(1)>.md",
          field: "content",
          snippet: "<i>aab</i> and <b>(a+b)*</b> and <B>(A+B)*</B>, never ab or aab",
        },
      ],
    });
    const [match] = (await read()).matches;
    assert.equal(match.name, "<img src=x onerror=alert(1)>.md");
    assert.equal(
      match.snippet,
      "<i>aab</i> and [<b>(a+b)*</b>] and [<B>(A+B)*</B>], never ab or aab",
    );
    // The only elements are the parts and the marks: no markup from the text.
    assert.deepEqual(match.elements, ["span", "span", "span", "span", "mark", "mark"]);
    await mount({
      query: ".*",
      items: [{ id: "y", name: "a.b", field: "content", snippet: "x.*y .* z" }],
    });
    assert.equal((await read()).matches[0].snippet, "x[.*]y [.*] z");
  });

  test("a letter whose other case is longer shifts no mark, and folds as one letter", async () => {
    // Lowered, "İ" is two code points, so marks found on a lowered copy would land two places off.
    await mount({
      query: "straße",
      items: [
        {
          id: "x",
          name: "STRAẞE.txt",
          field: "content",
          snippet: "İİ Straße, STRAẞE, and strasse: a straße.",
        },
      ],
    });
    const [match] = (await read()).matches;
    assert.equal(match.name, "[STRAẞE].txt");
    assert.equal(match.snippet, "İİ [Straße], [STRAẞE], and strasse: a [straße].");
    await mount({
      query: "report",
      items: [{ id: "y", name: "İİİ.md", field: "content", snippet: "İİİİ report İ" }],
    });
    assert.equal((await read()).matches[0].snippet, "İİİİ [report] İ");
    // A letter beyond the basic plane is one letter: the match is whole.
    await mount({
      query: "𝒜b",
      items: [{ id: "z", name: "z", field: "content", snippet: "x𝒜By" }],
    });
    assert.equal((await read()).matches[0].snippet, "x[𝒜B]y");
  });

  test("a snippet's ellipses join the text beside them, so no line breaks after or before one alone", async () => {
    await mount({
      query: "report",
      items: [
        { id: "a", name: "a.md", field: "content", snippet: "…https://example.com/reports/q3…" },
        { id: "b", name: "b.md", field: "content", snippet: "…report" },
        { id: "c", name: "c.md", field: "content", snippet: "…" },
      ],
    });
    assert.deepEqual(
      (await read()).matches.map(({ snippet }) => snippet),
      ["…+https://example.com/[report]s/q3+…", "…+[report]", "…"],
    );
    // Held to a column narrower than the URL, the leading ellipsis shares its line with the URL's
    // start.
    const lines = await page.evaluate(`(async () => {
      const results = document.querySelector("sl-search-results");
      results.style.inlineSize = "12rem";
      await results.updateComplete;
      const snippet = results.shadowRoot.querySelector(".snippet");
      const range = document.createRange();
      const text = document.createTreeWalker(snippet, NodeFilter.SHOW_TEXT).nextNode();
      range.setStart(text, 0);
      range.setEnd(text, 3);
      return new Set([...range.getClientRects()].filter((rect) => rect.width > 0).map((rect) => Math.round(rect.top))).size;
    })()`);
    assert.equal(lines, 1);
  });

  test("an empty or whitespace query marks nothing", async () => {
    for (const query of ["", "   ", "\t\n"]) {
      await mount({ query, items: matches });
      const { status, matches: shown } = await read();
      assert.deepEqual(status, ["status", "3 matches"], JSON.stringify(query));
      assert.deepEqual(
        shown.map(({ name, snippet }) => [name, snippet]),
        [
          ["quarterly-report.md", "…+revenue rose. This report covers the regions+…"],
          ["Report template.docx", null],
          ["notes.md", "…+a weekly REPORT, not a monthly report."],
        ],
        JSON.stringify(query),
      );
      assert.ok(shown.every(({ elements }) => !elements.includes("mark")));
    }
  });

  test("a query's whitespace runs mark as one space, as a snippet's are collapsed", async () => {
    await mount({ query: " weekly \t REPORT ", items: matches });
    assert.equal((await read()).matches[2].snippet, "…+a [weekly REPORT], not a monthly report.");
  });

  test("clicking a match sends open with its id, bubbling and composed", async () => {
    await mount({ query: "report", items: matches });
    await page.evaluate(`(() => {
      document.querySelector("sl-search-results").shadowRoot.querySelectorAll("button")[1].click();
    })()`);
    const { sent, heard } = await read();
    assert.deepEqual(sent, ["open"]);
    assert.deepEqual(heard, [
      { type: "open", detail: { id: "doc-2" }, bubbles: true, composed: true },
    ]);
  });

  test("the keyboard reaches each match by Tab, and Enter and Space open it", async () => {
    await mount({ query: "report", items: matches });
    await page.evaluate(`(() => {
      const before = Object.assign(document.createElement("button"), { textContent: "before" });
      document.querySelector("main").prepend(before);
      before.focus();
    })()`);
    const focused = () =>
      page.evaluate(`(() => {
        const root = document.querySelector("sl-search-results").shadowRoot;
        return [...root.querySelectorAll("button")].indexOf(root.activeElement);
      })()`);
    await press("Tab", 9);
    assert.equal(await focused(), 0);
    await press("Enter", 13, "\r");
    await press("Tab", 9);
    await press("Tab", 9);
    assert.equal(await focused(), 2);
    await press(" ", 32, " ");
    const { heard } = await read();
    assert.deepEqual(
      heard.map(({ detail, bubbles, composed }) => [detail, bubbles, composed]),
      [
        [{ id: "doc-1" }, true, true],
        [{ id: "doc-3" }, true, true],
      ],
    );
  });

  test("a focused match keeps its node and focus as matches are added before it", async () => {
    await mount({ query: "report", items: matches });
    const kept = await page.evaluate(`(async () => {
      const results = document.querySelector("sl-search-results");
      const root = results.shadowRoot;
      const button = root.querySelectorAll("button")[2];
      button.focus();
      results.items = [{ id: "doc-0", name: "a.md", field: "name", snippet: "a.md" }, ...results.items];
      await results.updateComplete;
      return [root.querySelectorAll("button")[3] === button, root.activeElement === button];
    })()`);
    assert.deepEqual(kept, [true, true]);
  });

  test("the results send no event as their properties change", async () => {
    await mount();
    await page.evaluate(`(async () => {
      const results = document.querySelector("sl-search-results");
      for (const fields of [
        { query: "report", state: "loading" },
        { items: ${JSON.stringify(matches)}, state: "ready" },
        { query: "rep" },
        { state: "error", message: "down" },
        { items: [], state: "ready", query: "" },
      ]) {
        Object.assign(results, fields);
        await results.updateComplete;
      }
    })()`);
    const { sent, heard } = await read();
    assert.deepEqual(sent, []);
    assert.deepEqual(heard, []);
  });
});
