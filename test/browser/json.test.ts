// The JSON formatter from this repository's dist/, through its export, formatJson(text), on
// test/fixtures/components.html: keys in their order, integer-like keys and duplicates included;
// number literals and strings with their escapes as written; minified and oddly spaced text
// re-indented; empty, nested, scalar, and array documents; whitespace between tokens the only
// difference from the text; a document of about 1 MB formatted without a stall; and containers
// past MAX_DEPTH kept as written, so 20,000 levels format in output linear in the text.

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { launch } from "@jaimestill/spike-html-apps-tooling/browser.js";
import type { Browser, Page } from "@jaimestill/spike-html-apps-tooling/browser.js";
import { serve } from "@jaimestill/spike-html-apps-tooling/server.js";
import type { Server } from "@jaimestill/spike-html-apps-tooling/server.js";

import { served } from "./support/served.ts";

/** The text with the whitespace between its tokens removed, its strings' whitespace kept. */
const tokensOf = (text: string): string =>
  text.replace(/("(?:[^"\\]|\\.)*")|[ \t\n\r]+/g, (_, string?: string) => string ?? "");

describe("json", { timeout: 60_000 }, () => {
  let server: Server;
  let browser: Browser;
  let page: Page;
  before(async () => {
    server = await serve(served);
    browser = await launch();
    page = await browser.open(`${server.origin}/test/fixtures/components.html`);
    await page.evaluate(`window.verdict.then(async () => {
      window.formatJson = (await import("/dist/json.js")).formatJson;
    })`);
  });
  after(async () => {
    await page?.close();
    await browser?.close();
    await server?.stop();
  });

  /** The text, formatted. */
  const formatted = (text: string): Promise<string> =>
    page.evaluate(`window.formatJson(${JSON.stringify(text)})`);

  const cases: Record<string, [string, string]> = {
    "keys in their order, integer-like keys where they stand": [
      '{"b":1,"10":2,"2":3,"a":4}',
      '{\n  "b": 1,\n  "10": 2,\n  "2": 3,\n  "a": 4\n}',
    ],
    "number literals as written": [
      "[1.0,-0,1e3,1E-7,9007199254740993,0.10,-12.5e+02]",
      "[\n  1.0,\n  -0,\n  1e3,\n  1E-7,\n  9007199254740993,\n  0.10,\n  -12.5e+02\n]",
    ],
    "duplicate keys, each kept": ['{"a":1,"a":2,"a":3}', '{\n  "a": 1,\n  "a": 2,\n  "a": 3\n}'],
    "strings with their escapes, byte for byte": [
      String.raw`{"q\"k":"say \"hi\"","path":"C:\\dir\\","e":"caf\u00e9 é","nl":"a\nb\/c","sp":"  { [ , : ] }  "}`,
      String.raw`{
  "q\"k": "say \"hi\"",
  "path": "C:\\dir\\",
  "e": "caf\u00e9 é",
  "nl": "a\nb\/c",
  "sp": "  { [ , : ] }  "
}`,
    ],
    "minified text, indented two spaces a depth": [
      '{"id":"run-1","stages":[{"name":"classify","outputs":3,"ok":true,"err":null}],"done":false}',
      '{\n  "id": "run-1",\n  "stages": [\n    {\n      "name": "classify",\n      "outputs": 3,\n' +
        '      "ok": true,\n      "err": null\n    }\n  ],\n  "done": false\n}',
    ],
    "oddly spaced text, normalized": [
      '\r\n  {  "a"\t:\n[ 1 ,\n\n 2 ]  ,"b" :{ }\n,   "c":[\t]}  \n',
      '{\n  "a": [\n    1,\n    2\n  ],\n  "b": {},\n  "c": []\n}',
    ],
    "nested empty objects and arrays": [
      '{"a":{},"b":[],"c":[{}, [ ], {"d":{ }}]}',
      '{\n  "a": {},\n  "b": [],\n  "c": [\n    {},\n    [],\n    {\n      "d": {}\n    }\n  ]\n}',
    ],
    "an empty object at the top": ["{ }", "{}"],
    "an empty array at the top": ["[\n]", "[]"],
    "a top-level array": [
      '[1,"two",[3],{"four":4}]',
      '[\n  1,\n  "two",\n  [\n    3\n  ],\n  {\n    "four": 4\n  }\n]',
    ],
    "a top-level string": ['  "a \\"b\\""  ', '"a \\"b\\""'],
    "a top-level number": [" 1.50E+3 ", "1.50E+3"],
    "a top-level literal": ["\nnull\n", "null"],
  };
  for (const [kind, [text, expected]] of Object.entries(cases)) {
    test(`formats ${kind}`, async () => {
      const output = await formatted(text);
      assert.equal(output, expected);
      assert.equal(tokensOf(output), tokensOf(text), "only whitespace between tokens changed");
    });
  }

  test("changes only the whitespace between tokens, over a document of every kind", async () => {
    const text =
      ' { "z" : [ 1.0 , -0 , 1e3 , { "10" : "a\\u0000\\t b" , "2" : [ ] } ] , "z" : { "y" : ' +
      'true , "x" : false , "w" : null } , "\\ud83d\\ude00" : "😀" , "big" : 9007199254740993 } ';
    const output = await formatted(text);
    assert.equal(tokensOf(output), tokensOf(text));
    assert.ok(!/[ \t\r]\n|\n\n/.test(output), "no trailing space and no blank line");
  });

  test("formats about 1 MB of JSON without a stall", async (t) => {
    // 6,000 records of nested objects, arrays, strings with escapes, and numbers, minified.
    const timing: { bytes: number; lines: number; ms: number; same: boolean } =
      await page.evaluate(`(() => {
      const record = (i) => ({
        id: "run-" + i, "10": i, "2": -i * 1.5, note: "line \\"" + i + "\\"\\n\\u00e9",
        stages: [{ name: "classify", outputs: [i, i + 1, i + 2], ok: true }, { name: "summarize", err: null }],
        meta: {},
      });
      const text = JSON.stringify(Array.from({ length: 6000 }, (_, i) => record(i)));
      window.formatJson(text);
      const start = performance.now();
      const output = window.formatJson(text);
      const ms = performance.now() - start;
      return {
        bytes: new TextEncoder().encode(text).length,
        lines: output.split("\\n").length,
        ms,
        same: output.replace(/("(?:[^"\\\\]|\\\\.)*")|[ \\n]+/g, (_, s) => s ?? "") === text,
      };
    })()`);
    t.diagnostic(`${timing.bytes} bytes to ${timing.lines} lines in ${timing.ms.toFixed(1)} ms`);
    assert.ok(timing.bytes > 900_000, `the document is ${timing.bytes} bytes`);
    assert.ok(timing.same, "only whitespace between tokens changed");
    assert.ok(timing.ms < 250, `formatting took ${timing.ms} ms`);
  });

  /** Two spaces a level, as formatJson indents. */
  const indent = (depth: number): string => "  ".repeat(depth);

  test("formats every level of text nested 64 deep", async () => {
    const text = "[".repeat(64) + "1" + "]".repeat(64);
    const opening = Array.from({ length: 64 }, (_, depth) => `${indent(depth)}[`);
    const closing = Array.from({ length: 64 }, (_, depth) => `${indent(63 - depth)}]`);
    const expected = [...opening, `${indent(64)}1`, ...closing].join("\n");
    const output = await formatted(text);
    assert.equal(output, expected);
    assert.equal(tokensOf(output), tokensOf(text), "only whitespace between tokens changed");
  });

  test("keeps a container that would open at depth 65 as written, on its line", async () => {
    // 63 arrays, an object at depth 64, and in it an array at 65, spaced oddly, a string with
    // brackets in it, and a member after it, where the formatting resumes.
    const inner = '[ 1 ,{"b" : "] }"} ,\t[ ] ]';
    const text = "[".repeat(63) + `{"a":${inner} , "c":3}` + "]".repeat(63);
    const opening = Array.from({ length: 63 }, (_, depth) => `${indent(depth)}[`);
    const closing = Array.from({ length: 63 }, (_, depth) => `${indent(62 - depth)}]`);
    const object = [`${indent(63)}{`, `${indent(64)}"a": ${inner},`, `${indent(64)}"c": 3`];
    const expected = [...opening, ...object, `${indent(63)}}`, ...closing].join("\n");
    const output = await formatted(text);
    assert.equal(output, expected);
    assert.equal(tokensOf(output), tokensOf(text), "only whitespace between tokens changed");
  });

  test("keeps a container at depth 65 whole when its strings hold quotes and brackets", async () => {
    // At depth 65, an object whose key holds an opening brace, an escaped quote before closing
    // brackets, and an escaped backslash before a string's real end; then, back at 64, a string
    // holding the brackets that would close it. A count fooled by any of them ends the kept
    // container early or late, and the text after it shows indented differently or not at all.
    const kept = String.raw`{"{k\"": [ "\"]}", "\\", {"[" :"}]"} ] }`;
    const after = String.raw`"]]}\"["`;
    const text = "[".repeat(64) + `${kept},${after}` + "]".repeat(64);
    const opening = Array.from({ length: 64 }, (_, depth) => `${indent(depth)}[`);
    const closing = Array.from({ length: 64 }, (_, depth) => `${indent(63 - depth)}]`);
    const inner = [`${indent(64)}${kept},`, `${indent(64)}${after}`];
    const output = await formatted(text);
    assert.equal(output, [...opening, ...inner, ...closing].join("\n"));
    assert.equal(tokensOf(output), tokensOf(text), "only whitespace between tokens changed");
  });

  test("formats text nested 20,000 deep in output linear in its length, without a stall", async (t) => {
    // The 64 levels formatted add a line break and at most 128 spaces of indent at each of their
    // opening and closing brackets; the 19,936 below them are kept as written.
    const result: { text: number; output: number; ms: number; same: boolean; tail: boolean } =
      await page.evaluate(`(() => {
      const text = "[".repeat(20000) + ' 1 ' + "]".repeat(20000);
      window.formatJson(text);
      const start = performance.now();
      const output = window.formatJson(text);
      const ms = performance.now() - start;
      const kept = "[".repeat(20000 - 64) + ' 1 ' + "]".repeat(20000 - 64);
      return {
        text: text.length,
        output: output.length,
        ms,
        same: output.replace(/[ \\n]+/g, "") === text.replace(/ /g, ""),
        tail: output.includes("\\n" + "  ".repeat(64) + kept + "\\n"),
      };
    })()`);
    t.diagnostic(`${result.text} characters to ${result.output} in ${result.ms.toFixed(1)} ms`);
    assert.ok(
      result.output <= result.text + 4 * 64 * 64,
      `${result.output} characters from ${result.text}`,
    );
    assert.ok(result.same, "only whitespace between tokens changed");
    assert.ok(result.tail, "the levels past 64 kept as written, on their line");
    assert.ok(result.ms < 50, `formatting took ${result.ms} ms`);
  });
});
