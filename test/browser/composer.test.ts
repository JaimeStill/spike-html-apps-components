// The composer from this repository's dist/, on test/fixtures/components.html: send sending the
// field's text, bubbling and composed, and clearing the field; empty and whitespace-only text
// unsendable; busy putting stop in send's place, in the same footprint, typing still allowed;
// disabled blocking typing, sending, and stopping; Enter, Shift+Enter, and Escape doing only what
// a native textarea does; the field growing with its text to eight lines, then scrolling; value
// and the attributes in step with the field; and no event but send and stop.

import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";

import { launch } from "@jaimestill/spike-html-apps-tooling/browser.js";
import type { Browser, Page } from "@jaimestill/spike-html-apps-tooling/browser.js";
import { serve } from "@jaimestill/spike-html-apps-tooling/server.js";
import type { Server } from "@jaimestill/spike-html-apps-tooling/server.js";

import { served } from "./support/served.ts";

/** What window.read reads from the composer: its value and field, its action, its attributes,
 * its focus, and the events it sent and the document heard. */
interface Shown {
  value: string;
  field: string;
  fieldDisabled: boolean;
  action: "send" | "stop";
  name: string[];
  actionDisabled: boolean;
  busy: boolean;
  disabled: boolean;
  focused: string | null;
  sent: string[];
  heard: { type: string; detail: unknown; bubbles: boolean; composed: boolean }[];
}

/** An element's box, as the footprint case measures it. */
interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

describe("composer", { timeout: 60_000 }, () => {
  let server: Server;
  let browser: Browser;
  let page: Page;
  before(async () => {
    server = await serve(served);
    browser = await launch();
    page = await browser.open(`${server.origin}/test/fixtures/components.html`);
    // Keys go to the focused element as a user's would, and :focus-visible matches, though a
    // headless page never has the window's focus.
    await page.cdp("Emulation.setFocusEmulationEnabled", { enabled: true });
    // window.mount(fields) renders a composer of the fields into main, recording every event its
    // host dispatches and every send and stop the document hears; window.read() resolves, once it
    // renders, to what it shows.
    await page.evaluate(`window.verdict.then(async () => {
      await import("/dist/composer.js");
      window.heard = [];
      for (const type of ["send", "stop"]) {
        document.addEventListener(type, (event) => window.heard.push({
          type, detail: event.detail, bubbles: event.bubbles, composed: event.composed,
        }));
      }
      window.mount = async (fields) => {
        const composer = Object.assign(document.createElement("sl-composer"), fields);
        window.sent = [];
        window.heard.length = 0;
        const original = composer.dispatchEvent.bind(composer);
        composer.dispatchEvent = (event) => (window.sent.push(event.type), original(event));
        document.querySelector("main").replaceChildren(composer);
        await composer.updateComplete;
        return composer;
      };
      window.read = async () => {
        const composer = document.querySelector("sl-composer");
        await composer.updateComplete;
        const root = composer.shadowRoot;
        const field = root.querySelector("textarea");
        const action = root.querySelector(".action");
        return {
          value: composer.value,
          field: field.value,
          fieldDisabled: field.disabled,
          action: action.classList.contains("stop") ? "stop" : "send",
          // The button's name: its shown label, the hidden one out of the accessibility tree.
          name: [...action.children]
            .filter((label) => getComputedStyle(label).visibility === "visible")
            .map((label) => label.textContent),
          actionDisabled: action.disabled,
          busy: composer.hasAttribute("busy"),
          disabled: composer.hasAttribute("disabled"),
          focused: root.activeElement?.localName ?? null,
          sent: window.sent,
          heard: window.heard,
        };
      };
      window.focusField = () =>
        document.querySelector("sl-composer").shadowRoot.querySelector("textarea").focus();
      window.clickAction = async () => {
        document.querySelector("sl-composer").shadowRoot.querySelector(".action").click();
        return window.read();
      };
    })`);
  });
  after(async () => {
    await page?.close();
    await browser?.close();
    await server?.stop();
  });

  const mount = (fields: Record<string, unknown> = {}) =>
    page.evaluate(`window.mount(${JSON.stringify(fields)}).then(() => {})`);
  const read = (): Promise<Shown> => page.evaluate("window.read()");
  const clickAction = (): Promise<Shown> => page.evaluate("window.clickAction()");
  const focusField = () => page.evaluate("window.focusField()");
  // Text typed into the focused element, as an input method commits it.
  const type = (text: string) => page.cdp("Input.insertText", { text });
  // A key pressed and released on the focused element, with the text it types, if any.
  const press = async (
    key: string,
    {
      code = key,
      keyCode,
      text,
      modifiers = 0,
    }: { code?: string; keyCode?: number; text?: string; modifiers?: number } = {},
  ) => {
    await page.cdp("Input.dispatchKeyEvent", {
      type: "keyDown",
      key,
      code,
      windowsVirtualKeyCode: keyCode,
      modifiers,
      ...(text === undefined ? {} : { text, unmodifiedText: text }),
    });
    await page.cdp("Input.dispatchKeyEvent", {
      type: "keyUp",
      key,
      code,
      windowsVirtualKeyCode: keyCode,
      modifiers,
    });
  };

  beforeEach(() => mount());

  test("activating send sends the text, bubbling and composed, clears the field, and returns focus to it", async () => {
    await focusField();
    await type("Which stages ran?");
    const typed = await read();
    assert.deepEqual(
      [typed.value, typed.field, typed.action, typed.name, typed.actionDisabled],
      ["Which stages ran?", "Which stages ran?", "send", ["Send"], false],
    );
    assert.deepEqual(typed.sent, [], "typing sends no event");
    const after = await clickAction();
    assert.deepEqual(after.sent, ["send"]);
    assert.deepEqual(after.heard, [
      { type: "send", detail: { text: "Which stages ran?" }, bubbles: true, composed: true },
    ]);
    assert.deepEqual(
      [after.value, after.field, after.actionDisabled, after.focused],
      ["", "", true, "textarea"],
    );
  });

  test("the text is sent as typed, its line breaks and surrounding spaces kept", async () => {
    await mount({ value: "  first line\nsecond line  " });
    const after = await clickAction();
    assert.deepEqual(
      after.heard.map(({ detail }) => detail),
      [{ text: "  first line\nsecond line  " }],
    );
  });

  test("a listener that restores the text on send keeps it", async () => {
    await mount({ value: "draft" });
    const after: Shown = await page.evaluate(`(() => {
      const composer = document.querySelector("sl-composer");
      composer.addEventListener("send", (event) => (composer.value = event.detail.text), { once: true });
      return window.clickAction();
    })()`);
    assert.deepEqual([after.value, after.field, after.actionDisabled], ["draft", "draft", false]);
  });

  for (const [what, value] of [
    ["empty", ""],
    ["whitespace-only", " \n\t  \n"],
  ]) {
    test(`${what} text can't be sent: send is disabled and activating it sends nothing`, async () => {
      await mount({ value });
      const shown = await read();
      assert.deepEqual([shown.action, shown.actionDisabled], ["send", true]);
      const after = await clickAction();
      assert.deepEqual([after.sent, after.heard, after.field], [[], [], value]);
    });
  }

  test("busy puts stop in send's place, which sends stop with {} and leaves the text", async () => {
    await mount({ busy: true, value: "next question" });
    const shown = await read();
    assert.deepEqual(
      [shown.action, shown.name, shown.actionDisabled, shown.busy],
      ["stop", ["Stop"], false, true],
    );
    const after = await clickAction();
    assert.deepEqual(after.heard, [{ type: "stop", detail: {}, bubbles: true, composed: true }]);
    assert.deepEqual([after.value, after.field], ["next question", "next question"]);
  });

  test("while busy the field takes typing, and nothing is sent", async () => {
    await mount({ busy: true });
    await focusField();
    await type("drafted while busy");
    await press("Enter", { keyCode: 13, text: "\r" });
    const shown = await read();
    assert.deepEqual(
      [shown.value, shown.fieldDisabled, shown.action, shown.sent],
      ["drafted while busy\n", false, "stop", []],
    );
    // Once the app clears busy, send returns, enabled for the draft.
    const after: Shown = await page.evaluate(`(() => {
      document.querySelector("sl-composer").busy = false;
      return window.read();
    })()`);
    assert.deepEqual(
      [after.action, after.actionDisabled, after.busy, after.value],
      ["send", false, false, "drafted while busy\n"],
    );
  });

  test("disabled blocks typing, sending, and stopping, and reflects", async () => {
    await mount({ disabled: true, value: "kept" });
    await focusField();
    await type("typed");
    const shown = await read();
    assert.deepEqual(
      [shown.disabled, shown.fieldDisabled, shown.focused, shown.value, shown.field],
      [true, true, null, "kept", "kept"],
    );
    assert.equal(shown.actionDisabled, true, "send is disabled, though the field holds text");
    const sent = await clickAction();
    assert.deepEqual(sent.heard, []);
    const busy: Shown = await page.evaluate(`(() => {
      document.querySelector("sl-composer").busy = true;
      return window.clickAction();
    })()`);
    assert.deepEqual([busy.action, busy.actionDisabled, busy.heard], ["stop", true, []]);
    // The attribute sets it too, and its removal enables the field again.
    const enabled: Shown = await page.evaluate(`(() => {
      document.querySelector("sl-composer").removeAttribute("disabled");
      return window.read();
    })()`);
    assert.deepEqual([enabled.disabled, enabled.fieldDisabled], [false, false]);
  });

  test("Enter and Shift+Enter insert a newline, Escape does nothing, and none sends an event", async () => {
    await focusField();
    await type("one");
    await press("Enter", { keyCode: 13, text: "\r" });
    await type("two");
    await press("Enter", { keyCode: 13, text: "\r", modifiers: 8 });
    await type("three");
    await press("Escape", { keyCode: 27 });
    const shown = await read();
    assert.deepEqual(
      [shown.value, shown.field, shown.focused],
      ["one\ntwo\nthree", "one\ntwo\nthree", "textarea"],
    );
    assert.deepEqual([shown.sent, shown.heard], [[], []]);
  });

  test("the field starts at one line, the control's height, grows with its text to eight lines, then scrolls", async () => {
    const sizes: {
      lines: number;
      height: number;
      scrolls: boolean;
      bottoms: number;
      button: number;
    }[] = await page.evaluate(`(async () => {
      const composer = await window.mount({});
      composer.style.inlineSize = "20rem";
      const field = composer.shadowRoot.querySelector("textarea");
      const action = composer.shadowRoot.querySelector(".action");
      const frame = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const sizes = [];
      for (let lines = 1; lines <= 12; lines++) {
        composer.value = Array.from({ length: lines }, (_, i) => "line " + (i + 1)).join("\\n");
        await composer.updateComplete;
        await frame();
        const rect = field.getBoundingClientRect();
        const button = action.getBoundingClientRect();
        sizes.push({
          lines,
          height: rect.height,
          scrolls: field.scrollHeight > field.clientHeight,
          bottoms: Math.abs(rect.bottom - button.bottom),
          button: button.height,
        });
      }
      return sizes;
    })()`);
    const [one, two] = sizes;
    const line = two.height - one.height;
    assert.ok(line > 0, `a second line grows the field by ${line}`);
    assert.ok(Math.abs(one.height - one.button) < 0.5, `one line: ${one.height} by ${one.button}`);
    for (const { lines, height, scrolls, bottoms } of sizes) {
      const expected = one.height + line * (Math.min(lines, 8) - 1);
      assert.ok(Math.abs(height - expected) < 1, `${lines} lines: ${height} tall, not ${expected}`);
      assert.equal(scrolls, lines > 8, `${lines} lines: scrolls ${scrolls}`);
      assert.ok(bottoms < 0.5, `${lines} lines: the control sits at the field's block end`);
    }
  });

  test("value sets the field and typing sets value; the attributes set value, placeholder, and label", async () => {
    const shown: { first: string } = await page.evaluate(`(async () => {
      const composer = await window.mount({ value: "restored draft" });
      const root = composer.shadowRoot;
      const field = root.querySelector("textarea");
      const first = field.value;
      field.focus();
      return { first };
    })()`);
    assert.equal(shown.first, "restored draft");
    await type(" plus more");
    const typed = await read();
    assert.deepEqual(
      [typed.value, typed.field],
      ["restored draft plus more", "restored draft plus more"],
    );
    const replaced: {
      set: string;
      markup: string[];
      label: { text: string; area: number };
      defaultLabel: { text: string; area: number };
    } = await page.evaluate(`(async () => {
      const composer = document.querySelector("sl-composer");
      composer.value = "set again";
      await composer.updateComplete;
      const field = composer.shadowRoot.querySelector("textarea");
      const set = field.value;
      const host = document.createElement("div");
      host.innerHTML = '<sl-composer value="from markup" placeholder="Ask" label="Prompt"></sl-composer>';
      document.querySelector("main").append(host);
      const marked = host.firstElementChild;
      await marked.updateComplete;
      const markedField = marked.shadowRoot.querySelector("textarea");
      const label = (element) => {
        const [named] = element.shadowRoot.querySelector("textarea").labels;
        const rect = named.getBoundingClientRect();
        return { text: named.textContent, area: rect.width * rect.height };
      };
      return {
        set,
        markup: [markedField.value, markedField.placeholder, marked.value],
        label: label(marked),
        defaultLabel: label(composer),
      };
    })()`);
    assert.equal(replaced.set, "set again");
    assert.deepEqual(replaced.markup, ["from markup", "Ask", "from markup"]);
    assert.equal(replaced.label.text, "Prompt");
    assert.equal(replaced.defaultLabel.text, "Message");
    assert.ok(replaced.label.area <= 1, `the label is visually hidden: ${replaced.label.area}px²`);
  });

  test("send and stop share one footprint: the swap moves nothing, in a font where their labels differ", async () => {
    const result: {
      send: Record<string, Box>;
      stop: Record<string, Box>;
      labels: number[];
    } = await page.evaluate(`(async () => {
      const composer = await window.mount({ value: "a draft" });
      // A serif interface font, so the two labels differ in width.
      composer.style.setProperty("--font-ui", "serif");
      composer.style.inlineSize = "24rem";
      const root = composer.shadowRoot;
      const frame = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const measure = () => {
        const box = (element) => {
          const { x, y, width, height } = element.getBoundingClientRect();
          return { x, y, width, height };
        };
        return {
          host: box(composer),
          field: box(root.querySelector("textarea")),
          action: box(root.querySelector(".action")),
        };
      };
      await frame();
      const send = measure();
      const labels = [...root.querySelectorAll(".action > span")].map((span) => span.getBoundingClientRect().width);
      composer.busy = true;
      await composer.updateComplete;
      await frame();
      const stop = measure();
      return { send, stop, labels };
    })()`);
    assert.notEqual(result.labels[0], result.labels[1], `labels ${result.labels} differ`);
    assert.deepEqual(result.stop, result.send);
  });

  test("the composer sends no event as its properties change", async () => {
    const sent: string[] = await page.evaluate(`(async () => {
      const composer = await window.mount({});
      for (const fields of [
        { value: "draft" },
        { placeholder: "Ask" },
        { label: "Prompt" },
        { busy: true },
        { disabled: true },
        { busy: false, disabled: false, value: "" },
      ]) {
        Object.assign(composer, fields);
        await composer.updateComplete;
      }
      return window.sent;
    })()`);
    assert.deepEqual(sent, []);
  });
});
