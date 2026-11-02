// The chat thread from this repository's dist/, on test/fixtures/components.html: each item and
// part type as it renders, user text plain and assistant text as Markdown, raw HTML as text; a
// refusal labelled; each status labelled; unknown item and part types skipped; verbose hiding and
// showing reasoning, function calls, and their outputs, collapsed, valid JSON formatted from its
// own tokens and invalid JSON as it is; a reasoning item's summary on its line and its content
// inside, as it streams, without a summary, and without content, a line alone, and the line's
// accessible name; a streaming message re-rendered in place, the items above
// it the same nodes; the verbose attribute reflected; a held frame opening at its end and following
// the newest item, as items are added and a streaming reply grows, only from its end or on a user's
// message, alone or with the reply's first text, the reader scrolling by the wheel, under a page
// zoom too, and scrolling instantly; a details opened in a held frame's last item followed, under
// reduced motion too, and a reader scrolled up keeping their place; one opened above the last item
// not followed, its summary kept in place, nor a later growth of the last; a thread reattached
// after a detached update scrolling nothing on its own; a thread not held scrolling no container
// of its consumer's, as items are added or a details opens; and no event sent.

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { launch } from "@jaimestill/spike-html-apps-tooling/browser.js";
import type { Browser, Page } from "@jaimestill/spike-html-apps-tooling/browser.js";
import { serve } from "@jaimestill/spike-html-apps-tooling/server.js";
import type { Server } from "@jaimestill/spike-html-apps-tooling/server.js";

import { deepFormatted } from "./support/deep.ts";
import { served } from "./support/served.ts";

/** What window.read reads from a list item of a thread's shadow root. */
interface Item {
  kind: string;
  element: string;
  label: string | null;
  status: string | null;
  busy: string | null;
  names: string[];
  open: boolean | null;
  line: string | null;
  gist: string | null;
  separator: string | null;
  plain: string[];
  markdown: string | null;
  refusal: string | null;
  pre: string | null;
  empty: string | null;
}

/** A node of the page's accessibility tree, as Accessibility.getFullAXTree gives it. */
interface AXNode {
  ignored: boolean;
  role?: { value: string };
  name?: { value: string };
}

/** A frame's scroll position: its scrollTop and the most it scrolls, rounded. */
interface Where {
  top: number;
  end: number;
}

/** A held frame's place around a click on a summary, and the summary's top in the viewport and
 * whether it shows in the frame. */
interface Opened extends Where {
  summary: number;
  shown: boolean;
}

/** What window.read reads from a thread's shadow root. */
interface View {
  frame: { tabindex: string | null; role: string | null; label: string | null };
  list: string | null;
  empty: string | null;
  items: Item[];
}

describe("chat thread", { timeout: 60_000 }, () => {
  let server: Server;
  let browser: Browser;
  let page: Page;
  before(async () => {
    server = await serve(served);
    browser = await launch();
    page = await browser.open(`${server.origin}/test/fixtures/components.html`);
    // window.shown(fields) renders a thread of the fields into main, resolving to what its shadow
    // root shows: the list's semantics, and each list item's kind, label, status, and content.
    await page.evaluate(`window.verdict.then(async () => {
      await import("/dist/chat-thread.js");
      window.read = (thread) => {
        const root = thread.shadowRoot;
        const list = root.querySelector("ol");
        const text = (element, selector) =>
          element.querySelector(selector)?.textContent.replace(/\\s+/g, " ").trim() ?? null;
        return {
          frame: {
            tabindex: root.querySelector(".frame").getAttribute("tabindex"),
            role: root.querySelector(".frame").getAttribute("role"),
            label: root.querySelector(".frame").getAttribute("aria-label"),
          },
          list: list?.localName ?? null,
          empty: text(root, ".empty-thread"),
          items: [...root.querySelectorAll("ol > li")].map((li) => {
            const details = li.querySelector("details");
            return {
              kind: [...li.classList].find((name) => name !== "item"),
              element: li.firstElementChild.localName,
              label: text(li, ".role") ?? text(li, ".kind"),
              status: text(li, ".status"),
              busy: li.querySelector("article")?.getAttribute("aria-busy") ?? null,
              names: [...li.querySelectorAll(".name, .id")].map((el) => el.textContent),
              open: details ? details.open : null,
              line: text(li, "summary, .line"),
              gist: text(li, ".summary-text"),
              separator: li.querySelector(".summary-text")
                ? getComputedStyle(li.querySelector(".summary-text"), "::before").content
                : null,
              plain: [...li.querySelectorAll(".content > .text, .content > p.text")].map(
                (el) => el.textContent),
              markdown: li.querySelector(".markdown")?.innerHTML.replace(/<!--[^>]*-->/g, "") ?? null,
              refusal: text(li, ".refusal"),
              pre: li.querySelector("pre")?.textContent ?? null,
              empty: text(li, ".empty"),
            };
          }),
        };
      };
      window.shown = async (fields) => {
        const thread = Object.assign(document.createElement("sl-chat-thread"), fields);
        document.querySelector("main").replaceChildren(thread);
        await thread.updateComplete;
        return window.read(thread);
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

  const user = (text: string) => ({
    type: "message",
    role: "user",
    content: [{ type: "input_text", text }],
  });
  const assistant = (id: string, text: string, status = "completed") => ({
    type: "message",
    id,
    role: "assistant",
    status,
    content: [{ type: "output_text", text, annotations: [] }],
  });
  const reasoning = {
    type: "reasoning",
    id: "rs_1",
    status: "completed",
    summary: [{ type: "summary_text", text: "Look up the weather." }],
    content: [{ type: "reasoning_text", text: "Paris is a city.\nCall the tool." }],
  };
  const call = {
    type: "function_call",
    id: "fc_1",
    status: "completed",
    call_id: "call_1",
    name: "get_weather",
    arguments: '{"city":"Paris"}',
  };
  const output = { type: "function_call_output", call_id: "call_1", output: '{"temperature":14}' };
  const tools = [user("Weather?"), reasoning, call, output, assistant("msg_1", "It's **14 °C**.")];

  test("an empty thread says so, in its frame, a region Tab reaches", async () => {
    const view = await shown({ items: [] });
    assert.equal(view.empty, "No messages yet.");
    assert.equal(view.list, null);
    assert.deepEqual(view.frame, { tabindex: "0", role: "region", label: "Conversation" });
  });

  test("a user's input_text is plain text, labelled User, its line breaks kept", async () => {
    const view = await shown({ items: [user("# not a heading\n**not bold**")] });
    assert.equal(view.list, "ol");
    assert.equal(view.items.length, 1);
    const [item] = view.items;
    assert.deepEqual([item.kind, item.element, item.label], ["user", "article", "User"]);
    assert.deepEqual(item.plain, ["# not a heading\n**not bold**"]);
    assert.equal(item.markdown, null);
    assert.equal(item.status, null);
  });

  test("an assistant's output_text renders as Markdown, labelled Assistant", async () => {
    const view = await shown({
      items: [assistant("msg_1", "# Title\n\n- **one**\n- [two](https://example.com)")],
    });
    const [item] = view.items;
    assert.deepEqual([item.kind, item.label], ["assistant", "Assistant"]);
    assert.match(item.markdown ?? "", /<h1>Title<\/h1>/);
    assert.match(item.markdown ?? "", /<li><strong>one<\/strong><\/li>/);
    assert.match(item.markdown ?? "", /<a rel="noreferrer" href="https:\/\/example.com">two<\/a>/);
    assert.deepEqual(item.plain, []);
  });

  test("raw HTML in output_text shows as its text, never as elements", async () => {
    const view: { elements: number; text: string; pwned: number | null } =
      await page.evaluate(`(async () => {
      const thread = document.createElement("sl-chat-thread");
      thread.items = [{ type: "message", id: "m", role: "assistant", status: "completed",
        content: [{ type: "output_text", text: '<img src=x onerror="window.pwned=1"><b>bold</b>\\n\\n<script>window.pwned=1</script>' }] }];
      document.querySelector("main").replaceChildren(thread);
      await thread.updateComplete;
      const markdown = thread.shadowRoot.querySelector(".markdown");
      return {
        elements: [...markdown.querySelectorAll("img, b, script")].length,
        text: markdown.textContent,
        pwned: window.pwned ?? null,
      };
    })()`);
    assert.equal(view.elements, 0);
    assert.match(view.text, /<img src=x onerror="window.pwned=1"><b>bold<\/b>/);
    assert.match(view.text, /<script>window.pwned=1<\/script>/);
    assert.equal(view.pwned, null);
  });

  test("a refusal part shows as a labelled refusal", async () => {
    const view = await shown({
      items: [
        {
          type: "message",
          id: "msg_1",
          role: "assistant",
          status: "completed",
          content: [{ type: "refusal", refusal: "I can't share credentials." }],
        },
      ],
    });
    assert.equal(view.items[0].refusal, "Refusal I can't share credentials.");
    assert.equal(view.items[0].markdown, null);
  });

  test("each status shows its label: streaming busy, incomplete, failed, and none when completed", async () => {
    const view = await shown({
      items: [
        assistant("a", "one", "in_progress"),
        assistant("b", "two", "completed"),
        assistant("c", "three", "incomplete"),
        assistant("d", "four", "failed"),
        { type: "message", role: "assistant", content: [{ type: "output_text", text: "five" }] },
      ],
    });
    assert.deepEqual(
      view.items.map(({ status, busy }) => [status, busy]),
      [
        ["Streaming", "true"],
        [null, null],
        ["Incomplete", null],
        ["Failed", null],
        [null, null],
      ],
    );
  });

  test("verbose off hides reasoning, function calls, and their outputs; messages always show", async () => {
    const view = await shown({ items: tools });
    assert.deepEqual(
      view.items.map(({ kind, label }) => [kind, label]),
      [
        ["user", "User"],
        ["assistant", "Assistant"],
      ],
    );
  });

  test("verbose on shows each, collapsed in a native details: reasoning, the call's arguments pretty-printed, its output", async () => {
    const view = await shown({ items: tools, verbose: true });
    assert.deepEqual(
      view.items.map(({ kind, element, label, open }) => [kind, element, label, open]),
      [
        ["user", "article", "User", null],
        ["verbose", "details", "Reasoning", false],
        ["verbose", "details", "Function call", false],
        ["verbose", "details", "Function output", false],
        ["assistant", "article", "Assistant", null],
      ],
    );
    const [, thinking, called, answered] = view.items;
    assert.deepEqual(thinking.plain, ["Paris is a city.\nCall the tool."]);
    assert.deepEqual(called.names, ["get_weather", "call_1"]);
    assert.equal(called.pre, '{\n  "city": "Paris"\n}');
    // The output names the function it answers, by its call_id.
    assert.deepEqual(answered.names, ["get_weather", "call_1"]);
    assert.equal(answered.pre, '{\n  "temperature": 14\n}');
  });

  test("a reasoning item's summary is on its line, after the kind, and its content alone inside", async () => {
    const view = await shown({
      verbose: true,
      items: [
        {
          ...reasoning,
          summary: [
            { type: "summary_text", text: "Look up the weather." },
            { type: "summary_text", text: "Then answer." },
          ],
        },
      ],
    });
    const [thinking] = view.items;
    assert.equal(thinking.element, "details");
    assert.equal(thinking.open, false);
    assert.equal(thinking.line, "Reasoning Look up the weather. Then answer.");
    assert.equal(thinking.gist, "Look up the weather. Then answer.");
    // A middle dot and a space set the summary off from the kind, shown but not read.
    assert.equal(thinking.separator, '"·\u00a0" / ""');
    assert.deepEqual(thinking.plain, ["Paris is a city.\nCall the tool."]);
  });

  test("a streaming reasoning item reads Reasoning alone until its summary arrives, its status on the line throughout", async () => {
    const streaming = {
      ...reasoning,
      status: "in_progress",
      summary: [],
      content: [{ type: "reasoning_text", text: "Paris is" }],
    };
    const begun = await shown({ verbose: true, items: [streaming] });
    assert.deepEqual(
      begun.items.map(({ element, line, status, gist, plain }) => [
        element,
        line,
        status,
        gist,
        plain,
      ]),
      [["details", "Reasoning Streaming", "Streaming", null, ["Paris is"]]],
    );
    // A summary part just added, its text still empty, is no summary yet.
    const added = await shown({
      verbose: true,
      items: [{ ...streaming, summary: [{ type: "summary_text", text: "" }] }],
    });
    assert.equal(added.items[0].line, "Reasoning Streaming");
    assert.equal(added.items[0].gist, null);
    const summarized = await shown({
      verbose: true,
      items: [{ ...streaming, summary: [{ type: "summary_text", text: "Look up" }] }],
    });
    assert.equal(summarized.items[0].line, "Reasoning Streaming Look up");
    assert.deepEqual(summarized.items[0].plain, ["Paris is"]);
    for (const [status, label] of [
      ["incomplete", "Incomplete"],
      ["failed", "Failed"],
    ]) {
      const ended = await shown({ verbose: true, items: [{ ...reasoning, status }] });
      assert.equal(ended.items[0].line, `Reasoning ${label} Look up the weather.`);
    }
  });

  test("a reasoning item with no summary reads Reasoning alone, its content inside", async () => {
    for (const summary of [undefined, [], [{ type: "summary_text", text: " " }]]) {
      const view = await shown({ verbose: true, items: [{ ...reasoning, summary }] });
      const [thinking] = view.items;
      assert.equal(thinking.element, "details");
      assert.equal(thinking.line, "Reasoning");
      assert.equal(thinking.gist, null);
      assert.deepEqual(thinking.plain, ["Paris is a city.\nCall the tool."]);
    }
  });

  test("a reasoning item with a summary and no content is a line alone, with nothing to expand", async () => {
    for (const content of [undefined, [], [{ type: "reasoning_text", text: "" }]]) {
      const view = await shown({ verbose: true, items: [{ ...reasoning, content }] });
      const [thinking] = view.items;
      assert.equal(thinking.element, "p");
      assert.equal(thinking.open, null);
      assert.equal(thinking.line, "Reasoning Look up the weather.");
      assert.deepEqual(thinking.plain, []);
      assert.equal(thinking.empty, null);
    }
    const streaming = await shown({
      verbose: true,
      items: [{ ...reasoning, status: "in_progress", content: [] }],
    });
    assert.equal(streaming.items[0].line, "Reasoning Streaming Look up the weather.");
    // Beside a details, its kind lines up with the summary's, after the marker's room, and the
    // accessibility tree holds no marker for it: the paragraph reads its text alone.
    await shown({ verbose: true, items: [{ ...reasoning, content: [] }, reasoning] });
    const lefts: number[] = await page.evaluate(`[
      ...document.querySelector("sl-chat-thread").shadowRoot.querySelectorAll(".kind"),
    ].map((kind) => kind.getBoundingClientRect().left)`);
    assert.equal(lefts[0], lefts[1]);
    const { nodes }: { nodes: AXNode[] } = await page.cdp("Accessibility.getFullAXTree", {});
    const roles = nodes.filter((node) => !node.ignored).map((node) => node.role?.value);
    assert.equal(roles.filter((role) => role === "ListMarker").length, 0);
  });

  test("a reasoning item's line is named, in the accessibility tree, for its kind and its summary", async () => {
    await shown({
      verbose: true,
      items: [
        reasoning,
        { ...reasoning, id: "rs_2", summary: [] },
        call,
        { ...reasoning, id: "rs_3", status: "failed" },
      ],
    });
    const { nodes }: { nodes: AXNode[] } = await page.cdp("Accessibility.getFullAXTree", {});
    const names = nodes
      .filter((node) => !node.ignored && node.role?.value === "DisclosureTriangle")
      .map((node) => node.name?.value ?? "");
    // The separator is generated with no alternative text, so the name reads the kind, the
    // status, and the summary, a word apart, as a call's reads its kind, name, and call_id.
    assert.deepEqual(names, [
      "Reasoning Look up the weather.",
      "Reasoning",
      "Function call get_weather call_1",
      "Reasoning Failed Look up the weather.",
    ]);
  });

  test("a call's arguments and its output show their own keys, order, numbers, and duplicates as written", async () => {
    // Parsed and printed again, "10" and "2" would move first, 9007199254740993 would round, 1.0
    // and 1e3 would be rewritten, and the first "dup" would be dropped.
    const args = '{"b":1,"10":[1.0,1e3,9007199254740993],"2":{},"dup":"a","dup":"b"}';
    const formatted =
      '{\n  "b": 1,\n  "10": [\n    1.0,\n    1e3,\n    9007199254740993\n  ],\n  "2": {},\n  "dup": "a",\n  "dup": "b"\n}';
    const view = await shown({
      verbose: true,
      items: [
        { ...call, arguments: args },
        { ...output, id: "o_1", output: '{"9":9007199254740993,"1":-0}' },
      ],
    });
    assert.equal(view.items[0].pre, formatted);
    assert.equal(view.items[1].pre, '{\n  "9": 9007199254740993,\n  "1": -0\n}');
  });

  test("arguments nested 20,000 deep show their outer 64 levels formatted, the rest as written", async () => {
    const args = "[".repeat(20_000) + "1" + "]".repeat(20_000);
    const view = await shown({ verbose: true, items: [{ ...call, arguments: args }] });
    assert.equal(view.items[0].pre, deepFormatted(20_000));
  });

  test("arguments that don't parse show raw; empty arguments and output say so; output parts join", async () => {
    const view = await shown({
      verbose: true,
      items: [
        { ...call, id: "fc_a", arguments: '{"city": Par' },
        { ...call, id: "fc_b", call_id: "call_2", arguments: "" },
        { type: "function_call_output", id: "o_1", call_id: "call_2", output: "" },
        {
          type: "function_call_output",
          id: "o_2",
          call_id: "call_9",
          output: [
            { type: "input_text", text: "line one" },
            { type: "input_image", image_url: "https://example.com/a.png" },
            { type: "input_text", text: "line two" },
          ],
        },
        { type: "reasoning", id: "rs_e", summary: [], encrypted_content: "opaque" },
      ],
    });
    assert.equal(view.items[0].pre, '{"city": Par');
    assert.equal(view.items[1].empty, "No arguments.");
    assert.equal(view.items[2].empty, "No output.");
    // An output whose call isn't in the thread names its call_id alone.
    assert.deepEqual(view.items[3].names, ["call_9"]);
    assert.equal(view.items[3].pre, "line one\nline two");
    assert.equal(view.items[4].empty, "No reasoning text.");
  });

  test("unknown item types, unknown roles, and unknown part types are skipped, with no error", async () => {
    const view: { errors: string[]; view: View } = await page.evaluate(`(async () => {
      const errors = [];
      const onError = (event) => errors.push(String(event.message));
      window.addEventListener("error", onError);
      const thread = document.createElement("sl-chat-thread");
      thread.verbose = true;
      thread.items = [
        { type: "message", role: "user", content: [{ type: "input_text", text: "one" }] },
        { type: "web_search_call", id: "ws_1", status: "completed", action: { query: "q" } },
        { type: "image_generation_call", id: "ig_1", result: "AAAA" },
        { type: "message", role: "system", content: [{ type: "input_text", text: "be brief" }] },
        { type: "message", id: "m", role: "assistant", status: "completed", content: [
          { type: "output_audio", data: "UklGRg==" },
          { type: "output_text", text: "two" },
          { type: "input_image", image_url: "https://example.com/a.png" },
        ] },
        null,
        { type: "message", role: "user", content: [
          { type: "input_audio", data: "UklGRg==", format: "wav" },
          { type: "input_text", text: "three" },
        ] },
      ];
      document.querySelector("main").replaceChildren(thread);
      await thread.updateComplete;
      window.removeEventListener("error", onError);
      return { errors, view: window.read(thread) };
    })()`);
    assert.deepEqual(view.errors, []);
    assert.deepEqual(
      view.view.items.map(({ kind, plain, markdown }) => [kind, plain, markdown]),
      [
        ["user", ["one"], null],
        ["assistant", [], "<p>two</p>"],
        ["user", ["three"], null],
      ],
    );
  });

  test("a streaming message re-renders in place as its text grows, the items above it the same nodes", async () => {
    const result: {
      same: boolean[];
      paragraphKept: boolean;
      topsKept: boolean;
      finished: boolean;
      code: string;
      status: string | null;
    } = await page.evaluate(`(async () => {
      const thread = document.createElement("sl-chat-thread");
      const question = { type: "message", role: "user", content: [{ type: "input_text", text: "Go" }] };
      const first = { type: "message", id: "msg_a", role: "assistant", status: "completed",
        content: [{ type: "output_text", text: "Earlier answer." }] };
      const ask = { type: "message", role: "user", content: [{ type: "input_text", text: "More" }] };
      const reply = (text, status = "in_progress") => ({ type: "message", id: "msg_b",
        role: "assistant", status, content: text ? [{ type: "output_text", text }] : [] });
      thread.items = [question, first, ask];
      document.querySelector("main").replaceChildren(thread);
      await thread.updateComplete;
      const root = thread.shadowRoot;
      const nodes = () => [...root.querySelectorAll("ol > li")];
      const tops = () => nodes().map((li) => li.getBoundingClientRect().top);
      const before = nodes();
      const beforeTops = tops();
      const steps = ["", "Here", "Here is a list:\\n\\n- one", "Here is a list:\\n\\n- one\\n- tw",
        "Here is a list:\\n\\n- one\\n- two\\n\\n\`\`\`js\\nconst a"];
      let replyNode;
      let paragraph;
      const same = [];
      for (const text of steps) {
        thread.items = [question, first, ask, reply(text)];
        await thread.updateComplete;
        const now = nodes();
        replyNode ??= now[3];
        paragraph ??= now[3].querySelector(".markdown p");
        same.push(before.every((node, index) => now[index] === node) && now[3] === replyNode);
      }
      const streamingParagraph = root.querySelectorAll("ol > li")[3].querySelector(".markdown p");
      thread.items = [question, first, ask, reply(steps.at(-1) + " = 1;\\n\`\`\`", "completed")];
      await thread.updateComplete;
      return {
        same,
        paragraphKept: paragraph !== null && streamingParagraph === paragraph,
        topsKept: tops().slice(0, 3).every((top, index) => top === beforeTops[index]),
        finished: nodes()[3] === replyNode,
        code: root.querySelector("ol > li:nth-child(4) pre code").textContent,
        status: root.querySelector("ol > li:nth-child(4) .status")?.textContent ?? null,
      };
    })()`);
    assert.deepEqual(result.same, [true, true, true, true, true]);
    assert.equal(result.paragraphKept, true, "the reply's first paragraph is the same node");
    assert.equal(result.topsKept, true, "the items above the reply don't move");
    assert.equal(result.finished, true);
    assert.equal(result.code, "const a = 1;");
    assert.equal(result.status, null);
  });

  test("verbose turning keeps each message's nodes, and the attribute sets and reflects it", async () => {
    const result: {
      initial: number;
      reflected: boolean;
      hidden: number;
      articles: number[];
      kept: boolean;
    } = await page.evaluate(`(async () => {
      const main = document.querySelector("main");
      main.innerHTML = "<sl-chat-thread verbose></sl-chat-thread>";
      const thread = main.firstElementChild;
      thread.items = ${JSON.stringify(tools)};
      await thread.updateComplete;
      const root = thread.shadowRoot;
      const articles = () => [...root.querySelectorAll("article")];
      const before = articles();
      const verbose = root.querySelectorAll("details").length;
      thread.verbose = false;
      await thread.updateComplete;
      return {
        initial: verbose,
        reflected: thread.hasAttribute("verbose"),
        hidden: root.querySelectorAll("details").length,
        articles: [before.length, articles().length],
        kept: articles().every((node, index) => node === before[index]),
      };
    })()`);
    assert.ok(result.articles[0] > 0, "the thread shows messages");
    assert.deepEqual(result, {
      initial: 3,
      reflected: false,
      hidden: 0,
      articles: [result.articles[0], result.articles[0]],
      kept: true,
    });
  });

  // A held thread's follow cases. followed(steps) mounts a thread held to 10rem and shows each
  // step's items in turn, awaiting each update, after the reader scrolls the frame as the step
  // says, by the wheel over it: "up", 40px up, or "end", as far down as it goes, the scroll
  // settled before the update. It resolves to the frame's place after each step, read the moment
  // the update completes, so a smooth scroll still under way would read short of its end, and
  // where the reader's scroll left it, before the update.
  const followed = async (
    steps: { items: unknown[]; scroll?: "up" | "end"; verbose?: boolean }[],
  ): Promise<(Where & { scrolled: number | null })[]> => {
    await page.evaluate(`(async () => {
      const thread = document.createElement("sl-chat-thread");
      thread.style.blockSize = "10rem";
      document.querySelector("main").replaceChildren(thread);
      await thread.updateComplete;
      window.held = thread.shadowRoot.querySelector(".frame");
    })()`);
    const places = [];
    for (const { items, scroll, verbose } of steps) {
      let scrolled: number | null = null;
      if (scroll) {
        const { x, y } = await page.evaluate(`(() => {
          const { x, y, width, height } = window.held.getBoundingClientRect();
          return { x: x + width / 2, y: y + height / 2 };
        })()`);
        const deltaY = scroll === "up" ? -40 : 100_000;
        await page.cdp("Input.dispatchMouseEvent", { type: "mouseWheel", x, y, deltaX: 0, deltaY });
        // Settled: moved, and unchanged across two frames.
        const settled = `new Promise((resolve) => {
          const top = window.held.scrollTop;
          requestAnimationFrame(() => requestAnimationFrame(() =>
            resolve(window.held.scrollTop === top && top !== ${places.at(-1)?.top ?? -1} ? Math.round(top) : null)));
        })`;
        for (let frames = 0; scrolled === null; frames += 2) {
          assert.ok(frames < 600, `the wheel scrolled the frame ${scroll}`);
          scrolled = await page.evaluate(settled);
        }
      }
      places.push({
        scrolled,
        ...(await page.evaluate(`(async () => {
          const thread = window.held.getRootNode().host;
          ${verbose === undefined ? "" : `thread.verbose = ${verbose};`}
          thread.items = ${JSON.stringify(items)};
          await thread.updateComplete;
          const frame = window.held;
          return {
            top: Math.round(frame.scrollTop),
            end: Math.round(frame.scrollHeight - frame.clientHeight),
          };
        })()`)),
      });
    }
    return places;
  };

  // A long conversation: turns of a question and a reply, each reply a few paragraphs.
  const turns = (count: number) =>
    Array.from({ length: count }, (_, turn) => [
      user(`Question ${turn + 1}?`),
      assistant(`msg_t${turn}`, `Answer ${turn + 1}.\n\nA second paragraph.\n\nA third.`),
    ]).flat();
  // A reply streaming word by word: its text after each of the words.
  const words = "The run read the document, chunked it, and embedded every chunk in turn".split(
    " ",
  );
  const streamed = (count: number) => words.slice(0, count).join(" ");

  test("held, the thread opens at its end and follows the newest item as items are added", async () => {
    const places = await followed([
      { items: turns(4) },
      { items: [...turns(4), user("And then?")] },
      { items: [...turns(4), user("And then?"), assistant("msg_n", "Then it finished.")] },
      { items: turns(6) },
    ]);
    assert.ok(places[0].end > 0, `the frame scrolls: ${JSON.stringify(places[0])}`);
    for (const [index, { top, end }] of places.entries()) {
      assert.equal(top, end, `step ${index}: at its end`);
    }
    assert.ok(places[3].end > places[0].end, "the items added to its scroll");
  });

  test("held, the thread follows a streaming reply as its text grows", async () => {
    const history = turns(3);
    const ask = user("How did the run go?");
    const steps = [6, 8, 10, 12, 14].map((count) => ({
      items: [...history, ask, assistant("msg_s", streamed(count).repeat(3), "in_progress")],
    }));
    const places = await followed([{ items: [...history, ask] }, ...steps]);
    for (const [index, { top, end }] of places.entries()) {
      assert.equal(top, end, `step ${index}: at its end`);
    }
    assert.ok(places.at(-1)!.end > places[1].end, "the reply's text grew the scroll");
  });

  test("held under a page zoom, the thread goes on following, its end a fraction of a pixel off", async () => {
    // A CSS zoom leaves the frame's end short of its scroll by its rounding, past a pixel at 0.9
    // and 1.1; each height is one where a pixel's threshold stopped the follow part way.
    const lost: string[] = await page.evaluate(`(async () => {
      const lost = [];
      for (const [zoom, height] of [["0.9", "157.3px"], ["1.1", "9.77rem"], ["1.33", "10rem"], ["0.67", "9.77rem"]]) {
        const main = document.querySelector("main");
        main.style.zoom = zoom;
        const thread = document.createElement("sl-chat-thread");
        thread.style.blockSize = height;
        main.replaceChildren(thread);
        await thread.updateComplete;
        const frame = thread.shadowRoot.querySelector(".frame");
        const items = [];
        for (let index = 0; index < 30; index++) {
          items.push(index % 2
            ? { type: "message", role: "assistant", id: "msg_" + index, content: [{ type: "output_text", text: "Answer " + index + " " + "x".repeat((index * 7) % 50) }] }
            : { type: "message", role: "assistant", id: "msg_" + index, content: [{ type: "output_text", text: "Note " + index }] });
          thread.items = [...items];
          await thread.updateComplete;
          const short = frame.scrollHeight - frame.clientHeight - frame.scrollTop;
          if (short > 8) {
            lost.push(zoom + " " + height + ": " + short.toFixed(1) + "px short after item " + index);
            break;
          }
        }
        main.style.zoom = "";
      }
      return lost;
    })()`);
    assert.deepEqual(lost, []);
  });

  test("scrolled up from the end by the reader, the thread keeps their place; scrolled back to the end, it follows again", async () => {
    const history = turns(4);
    const ask = user("How did the run go?");
    // The reply a paragraph longer at each step, so each step grows the scroll.
    const reply = (count: number) =>
      assistant("msg_s", Array(count).fill(streamed(words.length)).join("\n\n"), "in_progress");
    const places = await followed([
      { items: [...history, ask, reply(1)] },
      { items: [...history, ask, reply(2)], scroll: "up" },
      { items: [...history, ask, reply(3)] },
      { items: [...history, ask, reply(4)], verbose: true },
      { items: [...history, ask, reply(5)], scroll: "end" },
      { items: [...history, ask, reply(6)] },
    ]);
    const [opened, released, kept, toggled, resumed, again] = places;
    assert.equal(opened.top, opened.end, "it opens at its end");
    assert.ok(released.scrolled! < opened.end, `the wheel scrolled it up: ${released.scrolled}`);
    assert.equal(released.top, released.scrolled, "the reply grew, and the place is kept");
    assert.ok(released.end > opened.end, "the reply grew below the reader's place");
    assert.equal(kept.top, released.top, "and kept as the reply grows on");
    assert.ok(kept.end > released.end, "the reply grew again");
    assert.equal(toggled.top, released.top, "verbose turning keeps it too");
    assert.equal(resumed.scrolled, toggled.end, "the wheel took it back to its end");
    assert.equal(resumed.top, resumed.end, "and it follows");
    assert.ok(resumed.end > toggled.end, "as the reply grows");
    assert.equal(again.top, again.end, "and goes on following");
    assert.ok(again.end > resumed.end, "the reply went on growing");
  });

  test("a message the user sends resumes following, though the reader had scrolled up", async () => {
    const history = turns(4);
    const thought = assistant("msg_x", "One more thought.");
    const ask = user("Thanks. And next?");
    const places = await followed([
      { items: history },
      { items: [...history, thought], scroll: "up" },
      { items: [...history, thought, ask] },
      {
        items: [...history, thought, ask, assistant("msg_y", "Next, it publishes.", "in_progress")],
      },
    ]);
    const [, released, sent, replied] = places;
    assert.ok(released.top < released.end, "scrolled up, it kept the reader's place");
    assert.equal(sent.top, sent.end, "the user's message brought it to its end");
    assert.equal(replied.top, replied.end, "and it follows the reply");
  });

  test("a message the user sends and the reply's first text, in one update, resume following", async () => {
    const history = turns(4);
    const thought = assistant("msg_x", "One more thought.");
    const places = await followed([
      { items: history },
      { items: [...history, thought], scroll: "up" },
      {
        items: [
          ...history,
          thought,
          user("Thanks. And next?"),
          assistant("msg_y", "Next, it publishes.", "in_progress"),
        ],
      },
    ]);
    const [, released, sent] = places;
    assert.ok(released.top < released.end, "scrolled up, it kept the reader's place");
    assert.equal(sent.top, sent.end, "the message and the reply brought it to its end");
  });

  test("the thread follows instantly where motion is allowed, never smoothly", async () => {
    // Reduced motion could only make a scroll less smooth, so the case that proves the scroll
    // instant is motion allowed.
    await page.cdp("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
    });
    const history = turns(4);
    const places = await followed([
      { items: history },
      { items: [...history, user("Another?")] },
      { items: [...history, user("Another?"), assistant("msg_r", "Yes, another.", "in_progress")] },
    ]);
    await page.cdp("Emulation.setEmulatedMedia", { features: [] });
    for (const [index, { top, end }] of places.entries()) {
      assert.equal(top, end, `step ${index}: at its end once the update completes`);
    }
  });

  // A held thread's details opened, by a click on its summary, the native toggle, with no update
  // of the thread's: opened({ scroll, below }) mounts a held, verbose thread whose call_1 has long
  // arguments, the last item or followed by the item below, scrolled up by the wheel first when
  // asked, opens the call's details, and resolves to the frame's place, and the clicked summary's
  // top in the viewport, before the click and two frames after it.
  const opened = async ({ scroll, below }: { scroll?: "up"; below?: unknown } = {}) => {
    const args = JSON.stringify(
      Object.fromEntries(Array.from({ length: 12 }, (_, key) => [`key_${key}`, key])),
    );
    const items = [...turns(4), { ...call, arguments: args }, ...(below ? [below] : [])];
    await followed([
      { items, verbose: true },
      { items, ...(scroll ? { scroll } : {}) },
    ]);
    const where: { before: Opened; after: Opened } = await page.evaluate(`new Promise((resolve) => {
      const frame = window.held;
      const summary = [...frame.querySelectorAll("summary")].find(
        (summary) => summary.querySelector(".id")?.textContent === "call_1");
      const where = () => {
        const shown = summary.getBoundingClientRect();
        const held = frame.getBoundingClientRect();
        return {
          top: Math.round(frame.scrollTop),
          end: Math.round(frame.scrollHeight - frame.clientHeight),
          summary: Math.round(shown.top),
          shown: shown.top >= held.top && shown.bottom <= held.bottom,
        };
      };
      const before = where();
      summary.click();
      requestAnimationFrame(() => requestAnimationFrame(() => resolve({ before, after: where() })));
    })`);
    return where;
  };

  test("held at its end, a details opened in the last item keeps the frame's end in view", async () => {
    // Read two frames after the click, a smooth scroll would be short of the end: motion allowed
    // proves the follow instant too.
    await page.cdp("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
    });
    const { before, after } = await opened();
    await page.cdp("Emulation.setEmulatedMedia", { features: [] });
    assert.equal(before.top, before.end, "at its end before the click");
    assert.ok(after.end > before.end, `the details grew the scroll: ${JSON.stringify(after)}`);
    assert.equal(after.top, after.end, "and the frame followed it to its end");
  });

  test("scrolled up by the reader, a details opened at the end keeps their place", async () => {
    const { before, after } = await opened({ scroll: "up" });
    assert.ok(before.top < before.end, `the wheel scrolled it up: ${JSON.stringify(before)}`);
    assert.ok(after.end > before.end, "the details grew the scroll");
    assert.equal(after.top, before.top, "and the reader's place is kept");
  });

  test("under reduced motion, a details opened at the end keeps the frame's end in view", async () => {
    await page.cdp("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value: "reduce" }],
    });
    const { before, after } = await opened();
    await page.cdp("Emulation.setEmulatedMedia", { features: [] });
    assert.equal(before.top, before.end, "at its end before the click");
    assert.ok(after.end > before.end, "the details grew the scroll");
    assert.equal(after.top, after.end, "and the frame followed it to its end");
  });

  test("held at its end, a details opened above the last item keeps the frame's place and its summary's", async () => {
    const { before, after } = await opened({ below: assistant("msg_z", "Done.") });
    assert.equal(before.top, before.end, "at its end before the click");
    assert.ok(before.shown, `the summary shows above the last item: ${JSON.stringify(before)}`);
    assert.ok(after.end > before.end, `the details grew the scroll: ${JSON.stringify(after)}`);
    assert.equal(after.top, before.top, "the frame keeps its place");
    assert.equal(after.summary, before.summary, "and the summary clicked stays where it was");
  });

  test("a details grown above the last item leaves a later growth of the last unfollowed", async () => {
    // At the end, a details opened above the last item: the reader is no longer at the end, so
    // the last item's details opened next keeps their place too.
    const { after: above } = await opened({
      below: { ...call, id: "fc_2", call_id: "call_2", arguments: '{"city":"Lyon"}' },
    });
    const last: Where = await page.evaluate(`new Promise((resolve) => {
      const frame = window.held;
      [...frame.querySelectorAll("summary")].at(-1).click();
      requestAnimationFrame(() => requestAnimationFrame(() => resolve({
        top: Math.round(frame.scrollTop),
        end: Math.round(frame.scrollHeight - frame.clientHeight),
      })));
    })`);
    assert.ok(above.top < above.end, `the details above left the end: ${JSON.stringify(above)}`);
    assert.ok(last.end > above.end, "the last item's details grew the scroll");
    assert.equal(last.top, above.top, "and the reader's place is kept");
  });

  test("reattached after its items changed detached, the thread doesn't scroll on its own", async () => {
    await followed([{ items: turns(4) }]);
    const result: { reattached: number; settled: number; end: number } =
      await page.evaluate(`(async () => {
        const frame = window.held;
        const thread = frame.getRootNode().host;
        const main = thread.parentNode;
        thread.remove();
        thread.items = ${JSON.stringify(turns(5))};
        await thread.updateComplete;
        main.append(thread);
        const reattached = Math.round(frame.scrollTop);
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        return {
          reattached,
          settled: Math.round(frame.scrollTop),
          end: Math.round(frame.scrollHeight - frame.clientHeight),
        };
      })()`);
    assert.ok(result.end > result.reattached, `the frame scrolls: ${JSON.stringify(result)}`);
    assert.equal(result.settled, result.reattached, "and keeps the place it reattached at");
  });

  test("not held, the thread is as tall as its content and scrolls no container it doesn't own", async () => {
    const scrolled: { frame: Where; pane: Where }[] = await page.evaluate(`(async () => {
      const pane = document.createElement("div");
      pane.style.cssText = "block-size: 10rem; overflow: auto";
      const thread = pane.appendChild(document.createElement("sl-chat-thread"));
      document.querySelector("main").replaceChildren(pane);
      thread.items = ${JSON.stringify(turns(4))};
      await thread.updateComplete;
      thread.verbose = true;
      thread.items = ${JSON.stringify([...turns(6), call])};
      await thread.updateComplete;
      const frame = thread.shadowRoot.querySelector(".frame");
      const where = (element) => ({
        top: Math.round(element.scrollTop),
        end: Math.round(element.scrollHeight - element.clientHeight),
      });
      const updated = { frame: where(frame), pane: where(pane) };
      // A details opened at its end grows it with no update.
      [...frame.querySelectorAll("summary")].at(-1).click();
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      return [updated, { frame: where(frame), pane: where(pane) }];
    })()`);
    for (const [index, { frame, pane }] of scrolled.entries()) {
      assert.deepEqual(frame, { top: 0, end: 0 }, `step ${index}: its frame doesn't scroll`);
      assert.ok(pane.end > 0, `step ${index}: the pane scrolls: ${JSON.stringify(pane)}`);
      assert.equal(pane.top, 0, `step ${index}: the pane keeps its place: its consumer scrolls it`);
    }
    assert.ok(scrolled[1].pane.end > scrolled[0].pane.end, "the details grew the pane's scroll");
  });

  test("the thread sends no event as its items and verbose change", async () => {
    const sent: string[] = await page.evaluate(`(async () => {
      const thread = document.querySelector("main").appendChild(
        document.createElement("sl-chat-thread"));
      const sent = [];
      const original = thread.dispatchEvent.bind(thread);
      thread.dispatchEvent = (event) => (sent.push(event.type), original(event));
      for (const fields of [
        { items: ${JSON.stringify(tools)} },
        { verbose: true },
        { items: [] },
        { verbose: false, items: ${JSON.stringify([user("again")])} },
      ]) {
        Object.assign(thread, fields);
        await thread.updateComplete;
      }
      return sent;
    })()`);
    assert.deepEqual(sent, []);
  });
});
