// The chat thread from this repository's dist/, on test/fixtures/components.html: each item and
// part type as it renders, user text plain and assistant text as Markdown, raw HTML as text; a
// refusal labelled; each status labelled; unknown item and part types skipped; verbose hiding and
// showing reasoning, function calls, and their outputs, collapsed; a streaming message re-rendered
// in place, the items above it the same nodes; the verbose attribute reflected; and no event sent.

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { launch } from "./support/browser-pipe.js";
import { serve } from "./support/server.js";

describe("chat thread", { timeout: 60_000 }, () => {
  let server;
  let browser;
  let page;
  before(async () => {
    server = await serve();
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

  const shown = (fields) => page.evaluate(`window.shown(${JSON.stringify(fields)})`);

  const user = (text) => ({
    type: "message",
    role: "user",
    content: [{ type: "input_text", text }],
  });
  const assistant = (id, text, status = "completed") => ({
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
    assert.match(item.markdown, /<h1>Title<\/h1>/);
    assert.match(item.markdown, /<li><strong>one<\/strong><\/li>/);
    assert.match(item.markdown, /<a rel="noreferrer" href="https:\/\/example.com">two<\/a>/);
    assert.deepEqual(item.plain, []);
  });

  test("raw HTML in output_text shows as its text, never as elements", async () => {
    const view = await page.evaluate(`(async () => {
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
    assert.deepEqual(thinking.plain, ["Look up the weather.", "Paris is a city.\nCall the tool."]);
    assert.deepEqual(called.names, ["get_weather", "call_1"]);
    assert.equal(called.pre, '{\n  "city": "Paris"\n}');
    // The output names the function it answers, by its call_id.
    assert.deepEqual(answered.names, ["get_weather", "call_1"]);
    assert.equal(answered.pre, '{\n  "temperature": 14\n}');
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
    const view = await page.evaluate(`(async () => {
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
    const result = await page.evaluate(`(async () => {
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
    const result = await page.evaluate(`(async () => {
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

  test("the thread sends no event as its items and verbose change", async () => {
    const sent = await page.evaluate(`(async () => {
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
