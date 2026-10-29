// The Markdown renderer from this repository's dist/, through its export, markdown(source), on
// test/fixtures/components.html: each token kind as the element it renders, raw HTML and images
// as text, each link scheme it refuses and admits, partial source, a growing source rendered in
// place, and marked loaded only by a page that imports the renderer.

import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";

import { launch } from "./support/browser-pipe.js";
import { root, serve } from "./support/server.js";

describe("markdown", { timeout: 60_000 }, () => {
  let server;
  let browser;
  let page;
  before(async () => {
    server = await serve();
    browser = await launch();
    page = await browser.open(`${server.origin}/test/fixtures/components.html`);
    // window.rendered(source) renders the source into a new container, resolving to its HTML
    // with Lit's marker comments removed; a real comment in the source renders as escaped text,
    // so none is removed.
    await page.evaluate(`window.verdict.then(async () => {
      const { render } = await import("lit");
      const { markdown } = await import("/dist/markdown.js");
      window.rendered = (source) => {
        const container = document.createElement("div");
        render(markdown(source), container);
        return container.innerHTML.replace(/<!--[^]*?-->/g, "");
      };
    })`);
  });
  after(async () => {
    await page?.close();
    await browser?.close();
    await server?.stop();
  });

  /** The HTML the source renders to. */
  const rendered = (source) => page.evaluate(`window.rendered(${JSON.stringify(source)})`);

  const kinds = {
    "an ATX heading at each depth": [
      "# one\n## two\n### three\n#### four\n##### five\n###### six",
      "<h1>one</h1><h2>two</h2><h3>three</h3><h4>four</h4><h5>five</h5><h6>six</h6>",
    ],
    "a setext heading": ["Title\n===", "<h1>Title</h1>"],
    paragraphs: ["one\ntwo\n\nthree", "<p>one\ntwo</p><p>three</p>"],
    "emphasis and strong, nested": [
      "*em* _em_ **strong** __strong__ ***both***",
      "<p><em>em</em> <em>em</em> <strong>strong</strong> <strong>strong</strong> " +
        "<em><strong>both</strong></em></p>",
    ],
    "a code span, its content literal": [
      "a `<b>&amp;</b>` b",
      "<p>a <code>&lt;b&gt;&amp;amp;&lt;/b&gt;</code> b</p>",
    ],
    "a fenced code block, its content literal": [
      "```js\nconst a = 1 < 2 && '<b>';\n```",
      "<pre><code>const a = 1 &lt; 2 &amp;&amp; '&lt;b&gt;';</code></pre>",
    ],
    "an indented code block": [
      "    line one\n      line two",
      "<pre><code>line one\n  line two</code></pre>",
    ],
    "an unordered list": ["- a\n- b", "<ul><li>a</li><li>b</li></ul>"],
    "an ordered list from 1, with no start": ["1. a\n2. b", "<ol><li>a</li><li>b</li></ol>"],
    "an ordered list keeping its start": ["3. a\n4. b", '<ol start="3"><li>a</li><li>b</li></ol>'],
    "lists nested both ways": [
      "- a\n  1. b\n  2. c\n     - d\n- e",
      "<ul><li>a<ol><li>b</li><li>c<ul><li>d</li></ul></li></ol></li><li>e</li></ul>",
    ],
    "a loose list's items as paragraphs": [
      "- a\n\n- b",
      "<ul><li><p>a</p></li><li><p>b</p></li></ul>",
    ],
    "task items as disabled checkboxes": [
      "- [ ] open\n- [x] done",
      '<ul><li><input type="checkbox" disabled=""> open</li>' +
        '<li><input type="checkbox" disabled="" checked=""> done</li></ul>',
    ],
    "a blockquote, nested": [
      "> one\n>\n> > two",
      "<blockquote><p>one</p><blockquote><p>two</p></blockquote></blockquote>",
    ],
    "a horizontal rule": ["a\n\n---\n\nb", "<p>a</p><hr><p>b</p>"],
    "a table with its alignments": [
      "| a | b | c | d |\n|:--|:-:|--:|---|\n| 1 | **2** | 3 | 4 |",
      "<table><thead><tr>" +
        '<th style="text-align:left;">a</th><th style="text-align:center;">b</th>' +
        '<th style="text-align:right;">c</th><th>d</th>' +
        "</tr></thead><tbody><tr>" +
        '<td style="text-align:left;">1</td>' +
        '<td style="text-align:center;"><strong>2</strong></td>' +
        '<td style="text-align:right;">3</td><td>4</td>' +
        "</tr></tbody></table>",
    ],
    "a table with no rows": ["| a |\n|---|", "<table><thead><tr><th>a</th></tr></thead></table>"],
    "strikethrough by one tilde or two": ["~a~ ~~b~~", "<p><del>a</del> <del>b</del></p>"],
    "a hard line break by two spaces or a backslash": ["a  \nb\\\nc", "<p>a<br>b<br>c</p>"],
    "character references resolved, and backslash escapes literal": [
      "&amp; &copy; &#60; &#x3E; \\* \\&amp; AT&T",
      "<p>&amp; © &lt; &gt; * &amp;amp; AT&amp;T</p>",
    ],
  };
  for (const [kind, [source, expected]] of Object.entries(kinds)) {
    test(`renders ${kind}`, async () => {
      assert.equal(await rendered(source), expected);
    });
  }

  const raw = {
    "a block of HTML": [
      '<div onclick="alert(1)">\n<script>alert(1)</script>\n</div>',
      '<p>&lt;div onclick="alert(1)"&gt;\n&lt;script&gt;alert(1)&lt;/script&gt;\n&lt;/div&gt;</p>',
    ],
    "inline HTML": [
      'a <img src=x onerror="alert(1)"> <b>b</b> <!-- c -->',
      '<p>a &lt;img src=x onerror="alert(1)"&gt; &lt;b&gt;b&lt;/b&gt; &lt;!-- c --&gt;</p>',
    ],
    "a script element": [
      "<script>alert(1)</script>",
      "<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>",
    ],
  };
  for (const [kind, [source, expected]] of Object.entries(raw)) {
    test(`renders ${kind} as its literal text`, async () => {
      assert.equal(await rendered(source), expected);
      const elements = await page.evaluate(`(() => {
        const container = document.createElement("div");
        container.innerHTML = window.rendered(${JSON.stringify(source)});
        return container.querySelectorAll("div, script, img, b").length;
      })()`);
      assert.equal(elements, 0);
    });
  }

  test("renders an image as its alt text, with no img", async () => {
    assert.equal(
      await rendered('![a *cat* `x`](https://example.com/cat.png "t") and ![](/empty.png)'),
      "<p>a cat x and </p>",
    );
    assert.equal(
      await rendered("[![logo](/logo.png)](https://example.com)"),
      '<p><a rel="noreferrer" href="https://example.com">logo</a></p>',
    );
  });

  const admitted = {
    http: ["[a](http://example.com/x?y=1&z=2)", "http://example.com/x?y=1&amp;z=2"],
    https: ["[a](https://example.com)", "https://example.com"],
    "https, in capitals": ["[a](HTTPS://example.com)", "HTTPS://example.com"],
    mailto: ["[a](mailto:me@example.com)", "mailto:me@example.com"],
    "a root-relative path": ["[a](/docs/x.md)", "/docs/x.md"],
    "a relative path": ["[a](docs/x.md)", "docs/x.md"],
    "a fragment": ["[a](#part)", "#part"],
    "a query": ["[a](?page=2)", "?page=2"],
    "a scheme-relative URL": ["[a](//example.com/x)", "//example.com/x"],
    "a reference link": ["[a][r]\n\n[r]: https://example.com/r", "https://example.com/r"],
    "an angle-bracket autolink": ["<https://example.com/a>", "https://example.com/a"],
    "a GFM bare URL": ["see https://example.com/b", "https://example.com/b"],
    "a GFM www. URL": ["see www.example.com", "http://www.example.com"],
    "an email autolink": ["<me@example.com>", "mailto:me@example.com"],
  };
  for (const [kind, [source, href]] of Object.entries(admitted)) {
    test(`renders a link to ${kind} as an anchor`, async () => {
      const html = await rendered(source);
      const anchors = [...html.matchAll(/<a rel="noreferrer" href="([^"]*)">/g)];
      assert.deepEqual(
        anchors.map(([, found]) => found),
        [href],
        html,
      );
    });
  }

  test("an anchor carries its title, and never a target", async () => {
    assert.equal(
      await rendered('[a](https://example.com "the &amp; title")'),
      '<p><a rel="noreferrer" href="https://example.com" title="the &amp; title">a</a></p>',
    );
  });

  const refused = {
    "javascript:": "[a **b**](javascript:alert(1))",
    "javascript:, in capitals": "[a **b**](JAVASCRIPT:alert(1))",
    "javascript:, in mixed case": "[a **b**](JaVaScRiPt:alert(1))",
    "javascript:, after a space": "[a **b**](< javascript:alert(1)>)",
    "javascript:, split by a tab": "[a **b**](<java\tscript:alert(1)>)",
    "javascript:, by a decimal reference": "[a **b**](&#106;avascript:alert(1))",
    "javascript:, by a hex reference": "[a **b**](&#x6A;avascript:alert(1))",
    "javascript:, its colon by a named reference": "[a **b**](javascript&colon;alert(1))",
    "javascript:, by a reference definition": "[a **b**][x]\n\n[x]: javascript:alert(1)",
    "data:": "[a **b**](data:text/html,<script>alert(1)</script>)",
    "data:, in capitals": "[a **b**](DATA:text/html;base64,PHNjcmlwdD4=)",
    "vbscript:": "[a **b**](vbscript:msgbox(1))",
    "file:": "[a **b**](file:///etc/passwd)",
    "an unknown scheme": "[a **b**](custom:thing)",
  };
  for (const [kind, source] of Object.entries(refused)) {
    test(`renders a link to ${kind} as its text, with no anchor`, async () => {
      assert.equal(await rendered(source), "<p>a <strong>b</strong></p>");
    });
  }

  test("renders an autolink to a refused scheme as its text", async () => {
    assert.equal(await rendered("<javascript:alert(1)>"), "<p>javascript:alert(1)</p>");
  });

  test("renders an unclosed fence as a code block holding what has arrived", async () => {
    assert.equal(await rendered("```"), "<pre><code></code></pre>");
    assert.equal(
      await rendered("text\n\n```python\nprint('<hi>')\nfor x in"),
      "<p>text</p><pre><code>print('&lt;hi&gt;')\nfor x in</code></pre>",
    );
  });

  test("renders a half-built list's items so far", async () => {
    assert.equal(await rendered("- one\n- tw"), "<ul><li>one</li><li>tw</li></ul>");
    assert.equal(await rendered("1. one\n2."), "<ol><li>one</li><li></li></ol>");
    assert.equal(await rendered("- one\n- "), "<ul><li>one</li><li></li></ul>");
    assert.equal(await rendered("- one\n  - tw"), "<ul><li>one<ul><li>tw</li></ul></li></ul>");
  });

  test("renders every prefix of a source with no error", async () => {
    const source =
      "# Title\n\nSome *em* and **strong** with `code` and [a link](https://example.com).\n\n" +
      "- one\n  1. two\n> quote\n\n| a | b |\n|:-|-:|\n| 1 | 2 |\n\n```js\nlet x = '<b>';\n```\n";
    const failures = await page.evaluate(`(() => {
      const source = ${JSON.stringify(source)};
      const failures = [];
      for (let end = 0; end <= source.length; end++) {
        try {
          window.rendered(source.slice(0, end));
        } catch (error) {
          failures.push(end + ": " + error.message);
        }
      }
      return failures;
    })()`);
    assert.deepEqual(failures, []);
  });

  test("re-rendering a growing source into the same container updates its DOM in place", async () => {
    const kept = await page.evaluate(`(async () => {
      const { render } = await import("lit");
      const { markdown } = await import("/dist/markdown.js");
      const container = document.createElement("div");
      render(markdown("# Title\\n\\nThe first"), container);
      const heading = container.querySelector("h1");
      const paragraph = container.querySelector("p");
      render(markdown("# Title\\n\\nThe first paragraph.\\n\\n- one"), container);
      const after = {
        heading: container.querySelector("h1") === heading,
        paragraph: container.querySelector("p") === paragraph,
        text: paragraph.textContent,
        items: container.querySelectorAll("li").length,
      };
      render(markdown("# Title\\n\\nThe first paragraph.\\n\\n- one\\n- two"), container);
      const list = container.querySelector("ul");
      render(markdown("# Title\\n\\nThe first paragraph.\\n\\n- one\\n- two\\n- three"), container);
      return { ...after, list: container.querySelector("ul") === list,
        last: container.querySelectorAll("li").length };
    })()`);
    assert.deepEqual(kept, {
      heading: true,
      paragraph: true,
      text: "The first paragraph.",
      items: 1,
      list: true,
      last: 3,
    });
  });

  test("a page that imports no Markdown-rendering module requests no marked module", async () => {
    // The components page with every other module of dist/ imported; marked's request appears only
    // once the renderer is imported, which shows the case can see it.
    // The modules that render Markdown, the renderer, the artifact viewer, and the chat thread,
    // are left out.
    const renderers = ["markdown.js", "artifact-viewer.js", "chat-thread.js"];
    const modules = readdirSync(join(root, "dist")).filter(
      (file) => file.endsWith(".js") && !renderers.includes(file),
    );
    assert.ok(modules.length > 0, "mise run build wrote no dist/");
    const other = await browser.open(`${server.origin}/test/fixtures/components.html`);
    try {
      const requests = await other.evaluate(`window.verdict.then(async () => {
        const marked = () => performance.getEntriesByType("resource")
          .map((entry) => new URL(entry.name).pathname)
          .filter((path) => path.startsWith("/deps/marked/"));
        await Promise.all(${JSON.stringify(modules)}.map((module) => import("/dist/" + module)));
        const before = marked();
        await import("/dist/markdown.js");
        return { before, after: marked() };
      })`);
      assert.deepEqual(requests, { before: [], after: ["/deps/marked/lib/marked.esm.js"] });
    } finally {
      await other.close();
    }
  });
});
