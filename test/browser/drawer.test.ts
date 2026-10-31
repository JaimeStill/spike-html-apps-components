// The drawer from this repository's dist/, on test/fixtures/components.html, its viewport set
// either side of the dock width: docked above it, visible, non-modal, its content interactive, the
// page live, focus left where it was; at or below it, closed by default, and opened modally by
// show(), toggle(), or open, the page behind inert and focus inside, closed by Escape, a click on
// the scrim, close(), toggle(), or open, focus returned to the opener; open and close sent once
// each, bubbling and composed, never on a mode switch; a switch in either direction, by the
// viewport or by dock, keeping the very same slotted element and what was typed into it; the
// slide's transition, absent under reduced motion; and the slide from the inline-start edge, the
// left, or the right in a right-to-left page.

import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";

import { launch, until } from "@jaimestill/spike-html-apps-tooling/browser.js";
import type { Browser, Page } from "@jaimestill/spike-html-apps-tooling/browser.js";
import { serve } from "@jaimestill/spike-html-apps-tooling/server.js";
import type { Server } from "@jaimestill/spike-html-apps-tooling/server.js";

import { served } from "./support/served.ts";

/** An event the document heard from the drawer. */
interface Heard {
  type: string;
  detail: unknown;
  bubbles: boolean;
  composed: boolean;
}

/** What window.read reads from the drawer: its mode and its dialog's state, its box, focus, the
 * page's liveness, and the events it sent and the document heard. */
interface Shown {
  mode: "docked" | "drawer" | null;
  open: boolean;
  attribute: boolean;
  dialogOpen: boolean;
  modal: boolean;
  label: string | null;
  box: { left: number; right: number; top: number; bottom: number; width: number };
  visible: boolean;
  focused: string | null;
  sent: string[];
  heard: Heard[];
}

// The dock width, 48rem at the initial font size, and a viewport either side of it.
const DOCK = 768;
const WIDE = 1280;
const NARROW = 600;
const HEIGHT = 720;

describe("drawer", { timeout: 60_000 }, () => {
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
    // window.mount(fields) renders, into main, an opener that calls show(), a drawer of the fields
    // holding a filter field and a button that counts its clicks, and a button outside it, all
    // the page's; window.read() resolves, once the drawer renders, to what it shows.
    await page.evaluate(`window.verdict.then(async () => {
      await import("/dist/drawer.js");
      window.heard = [];
      for (const type of ["open", "close"]) {
        document.addEventListener(type, (event) => {
          if (event.target.localName === "sl-drawer") window.heard.push({
            type, detail: event.detail, bubbles: event.bubbles, composed: event.composed,
          });
        });
      }
      window.mount = async (fields) => {
        const main = document.querySelector("main");
        main.innerHTML = '<button id="opener" type="button">Documents</button>' +
          '<sl-drawer><input id="filter" aria-label="Filter"><button id="count" type="button">0</button></sl-drawer>' +
          '<button id="outside" type="button">Outside</button>';
        document.querySelector("#opener").addEventListener("click", () =>
          document.querySelector("sl-drawer").show());
        document.querySelector("#count").addEventListener("click", (event) =>
          (event.target.textContent = String(Number(event.target.textContent) + 1)));
        const drawer = Object.assign(document.querySelector("sl-drawer"), fields);
        window.sent = [];
        window.heard.length = 0;
        const original = drawer.dispatchEvent.bind(drawer);
        drawer.dispatchEvent = (event) => (window.sent.push(event.type), original(event));
        await drawer.updateComplete;
      };
      window.read = async () => {
        const drawer = document.querySelector("sl-drawer");
        await drawer.updateComplete;
        const dialog = drawer.shadowRoot.querySelector("dialog");
        const { left, right, top, bottom, width } = dialog.getBoundingClientRect();
        const active = document.activeElement;
        return {
          mode: drawer.matches(":state(docked)") ? "docked" : drawer.matches(":state(drawer)") ? "drawer" : null,
          open: drawer.open,
          attribute: drawer.hasAttribute("open"),
          dialogOpen: dialog.open,
          modal: dialog.matches(":modal"),
          label: dialog.getAttribute("aria-label"),
          box: { left, right, top, bottom, width },
          visible: dialog.checkVisibility(),
          focused: active === document.body || active === null ? null : active.id || active.localName,
          sent: window.sent,
          heard: window.heard,
        };
      };
      // Whether the outside button takes focus, as no inert element does; focus is put back.
      window.pageLive = () => {
        const before = document.activeElement;
        const outside = document.querySelector("#outside");
        outside.focus();
        const live = document.activeElement === outside;
        before?.focus?.();
        return live;
      };
      // The center of an element of the page's, in the viewport.
      window.center = (selector) => {
        const { left, top, width, height } = document.querySelector(selector).getBoundingClientRect();
        return { x: left + width / 2, y: top + height / 2 };
      };
    })`);
  });
  after(async () => {
    await page?.close();
    await browser?.close();
    await server?.stop();
  });

  const read = (): Promise<Shown> => page.evaluate("window.read()");
  const pageLive = (): Promise<boolean> => page.evaluate("window.pageLive()");
  const call = (method: string) => page.evaluate(`document.querySelector("sl-drawer").${method}()`);
  // The drawer's mode once the viewport's media queries have settled on it.
  const settled = (mode: "docked" | "drawer") =>
    until(page, `document.querySelector("sl-drawer")?.matches(":state(${mode})")`);
  // The viewport's width, and the mode the drawer settles on at it, at the default dock.
  const resize = async (width: number) => {
    await page.cdp("Emulation.setDeviceMetricsOverride", {
      width,
      height: HEIGHT,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await until(page, `innerWidth === ${width}`);
  };
  const mount = async (width: number, fields: Record<string, unknown> = {}) => {
    await resize(width);
    await page.evaluate(`window.mount(${JSON.stringify({ label: "Documents", ...fields })})`);
    await settled(width > DOCK ? "docked" : "drawer");
  };
  // A key pressed and released on the focused element, with the text it types, if any.
  const press = async (key: string, keyCode: number, text?: string) => {
    for (const type of ["keyDown", "keyUp"]) {
      await page.cdp("Input.dispatchKeyEvent", {
        type,
        key,
        code: key,
        windowsVirtualKeyCode: keyCode,
        ...(text === undefined || type === "keyUp" ? {} : { text, unmodifiedText: text }),
      });
    }
  };
  const clickAt = async ({ x, y }: { x: number; y: number }) => {
    for (const type of ["mousePressed", "mouseReleased"]) {
      await page.cdp("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount: 1 });
    }
  };
  const center = (selector: string): Promise<{ x: number; y: number }> =>
    page.evaluate(`window.center(${JSON.stringify(selector)})`);
  // Resolves once the dialog's and its scrim's transitions have ended.
  const slid = () =>
    page.evaluate(
      `Promise.all(document.querySelector("sl-drawer").shadowRoot.querySelector("dialog").getAnimations({ subtree: true }).map((a) => a.finished)).then(() => {})`,
    );
  // The opener focused by the keyboard and activated by Enter, as a user opens the drawer.
  const openByKeyboard = async () => {
    await page.evaluate(`document.querySelector("#opener").focus()`);
    await press("Enter", 13, "\r");
    await until(page, `document.querySelector("sl-drawer").open`);
    await slid();
  };
  // Resolves once the close events queued so far have reached the document.
  const closedHeard = (count: number) =>
    until(page, `window.heard.filter((e) => e.type === "close").length >= ${count}`);

  beforeEach(async () => {
    await page.cdp("Emulation.setEmulatedMedia", { features: [] });
    await page.evaluate(`document.documentElement.removeAttribute("dir")`);
  });

  test("above dock it is docked: visible, not modal, its content interactive, the page live, focus left in place", async () => {
    await mount(WIDE);
    const shown = await read();
    assert.deepEqual(
      [shown.mode, shown.dialogOpen, shown.modal, shown.open, shown.visible, shown.label],
      ["docked", true, false, false, true, "Documents"],
    );
    assert.ok(shown.box.width > 0, "the docked dialog takes space");
    assert.equal(shown.focused, null, "docking moves no focus into the content");
    assert.equal(await pageLive(), true, "the page takes focus");
    // A click on the slotted button reaches it, and so does one on the page's button.
    await clickAt(await center("#count"));
    assert.equal(await page.evaluate(`document.querySelector("#count").textContent`), "1");
    await clickAt(await center("#opener"));
    const after = await read();
    assert.deepEqual([after.dialogOpen, after.modal, after.open], [true, false, false]);
    assert.deepEqual(after.sent, [], "show() does nothing while docked");
  });

  test("docked, show(), toggle(), and open leave it docked and send nothing", async () => {
    await mount(WIDE);
    await call("show");
    await call("toggle");
    await page.evaluate(`document.querySelector("sl-drawer").open = true`);
    const shown = await read();
    assert.deepEqual(
      [shown.mode, shown.modal, shown.open, shown.attribute, shown.sent],
      ["docked", false, false, false, []],
    );
  });

  for (const width of [DOCK, NARROW]) {
    test(`at ${width}px, at or below dock, it is closed by default`, async () => {
      await mount(width);
      const shown = await read();
      assert.deepEqual(
        [shown.mode, shown.dialogOpen, shown.modal, shown.open, shown.visible, shown.sent],
        ["drawer", false, false, false, false, []],
      );
    });
  }

  test("show() opens it modally: the page behind inert and unmoved, focus inside; it sends open once", async () => {
    await mount(NARROW);
    const place = () =>
      page.evaluate(`JSON.stringify(document.querySelector("#outside").getBoundingClientRect())`);
    const before = await place();
    await openByKeyboard();
    assert.equal(await place(), before, "the page behind keeps its layout");
    const shown = await read();
    assert.deepEqual(
      [shown.mode, shown.dialogOpen, shown.modal, shown.open, shown.attribute, shown.visible],
      ["drawer", true, true, true, true, true],
    );
    assert.equal(shown.focused, "filter", "focus moves to the content's first control");
    assert.equal(await pageLive(), false, "the page behind takes no focus");
    assert.deepEqual(shown.heard, [{ type: "open", detail: {}, bubbles: true, composed: true }]);
    // Tab stays among the drawer's controls.
    for (let i = 0; i < 4; i++) {
      await press("Tab", 9);
      const { focused } = await read();
      assert.ok(
        focused === null || ["filter", "count"].includes(focused),
        `Tab reached ${focused}`,
      );
    }
  });

  test("Escape closes it, focus returns to the opener, and close goes out once", async () => {
    await mount(NARROW);
    await openByKeyboard();
    await press("Escape", 27);
    await closedHeard(1);
    const shown = await read();
    assert.deepEqual(
      [shown.dialogOpen, shown.modal, shown.open, shown.attribute, shown.focused],
      [false, false, false, false, "opener"],
    );
    assert.equal(await pageLive(), true);
    assert.deepEqual(shown.sent, ["open", "close"]);
    assert.deepEqual(
      shown.heard.map(({ type, bubbles, composed }) => [type, bubbles, composed]),
      [
        ["open", true, true],
        ["close", true, true],
      ],
    );
  });

  test("a click on the scrim closes it and focus returns to the opener; a click inside doesn't", async () => {
    await mount(NARROW);
    await openByKeyboard();
    // Inside the drawer, on its padding, which is the dialog itself: it stays open.
    const { box } = await read();
    await clickAt({ x: box.right - 4, y: box.bottom - 4 });
    assert.equal((await read()).open, true, "a click on the drawer's own padding");
    // On the scrim, over the outside button, which the click never reaches.
    await clickAt({ x: NARROW - 8, y: HEIGHT / 2 });
    await closedHeard(1);
    const shown = await read();
    assert.deepEqual([shown.open, shown.dialogOpen, shown.focused], [false, false, "opener"]);
    assert.deepEqual(shown.sent, ["open", "close"]);
  });

  test("a press inside the drawer released on the scrim doesn't close it", async () => {
    await mount(NARROW);
    await openByKeyboard();
    const { box } = await read();
    const inside = { x: box.right - 4, y: box.bottom - 4 };
    await page.cdp("Input.dispatchMouseEvent", {
      type: "mousePressed",
      ...inside,
      button: "left",
      clickCount: 1,
    });
    await page.cdp("Input.dispatchMouseEvent", {
      type: "mouseMoved",
      x: NARROW - 8,
      y: HEIGHT / 2,
      button: "left",
    });
    await page.cdp("Input.dispatchMouseEvent", {
      type: "mouseReleased",
      x: NARROW - 8,
      y: HEIGHT / 2,
      button: "left",
      clickCount: 1,
    });
    assert.equal((await read()).open, true);
  });

  for (const [how, close] of [
    ["close()", "document.querySelector('sl-drawer').close()"],
    ["toggle()", "document.querySelector('sl-drawer').toggle()"],
    ["open set false", "document.querySelector('sl-drawer').open = false"],
  ]) {
    test(`${how} closes it, focus returns to the opener, and close goes out once`, async () => {
      await mount(NARROW);
      await openByKeyboard();
      await page.evaluate(close);
      await closedHeard(1);
      const shown = await read();
      assert.deepEqual([shown.open, shown.dialogOpen, shown.focused], [false, false, "opener"]);
      assert.deepEqual(shown.sent, ["open", "close"]);
    });
  }

  test("show() just after a resize to narrow opens it, before the media query's change event", async () => {
    await mount(WIDE);
    await page.cdp("Emulation.setDeviceMetricsOverride", {
      width: NARROW,
      height: HEIGHT,
      deviceScaleFactor: 1,
      mobile: false,
    });
    // Still docked by the last change event the drawer heard, though the viewport is narrow.
    const shown: { docked: boolean; modal: boolean } = await page.evaluate(`(() => {
      const drawer = document.querySelector("sl-drawer");
      const docked = drawer.matches(":state(docked)");
      drawer.show();
      return { docked, modal: drawer.shadowRoot.querySelector("dialog").matches(":modal") };
    })()`);
    assert.deepEqual(shown, { docked: true, modal: true });
  });

  test("toggle() and open set true open it modally, open sent once each time", async () => {
    await mount(NARROW);
    await call("toggle");
    assert.deepEqual([(await read()).modal, (await read()).sent], [true, ["open"]]);
    await call("show");
    assert.deepEqual((await read()).sent, ["open"], "show() on an open drawer sends nothing");
    await call("close");
    await call("close");
    assert.deepEqual((await read()).sent, ["open", "close"], "close() on a closed one, nothing");
    await page.evaluate(`document.querySelector("sl-drawer").open = true`);
    const shown = await read();
    assert.deepEqual([shown.modal, shown.sent], [true, ["open", "close", "open"]]);
  });

  test("open set before the first render opens it at or below dock", async () => {
    await mount(NARROW, { open: true });
    const shown = await read();
    assert.deepEqual([shown.modal, shown.sent], [true, ["open"]]);
  });

  test("a switch across dock, either way, keeps the very same slotted element and its state, and sends nothing", async () => {
    await mount(NARROW);
    await openByKeyboard();
    await page.cdp("Input.insertText", { text: "quarterly" });
    await page.evaluate(`(() => {
      window.kept = { filter: document.querySelector("#filter"), count: document.querySelector("#count") };
      window.kept.count.click();
    })()`);
    const same = () =>
      page.evaluate(`(() => {
        const drawer = document.querySelector("sl-drawer");
        const { filter, count } = window.kept;
        return {
          identity: document.querySelector("#filter") === filter && document.querySelector("#count") === count,
          parent: filter.parentNode === drawer && count.parentNode === drawer,
          slotted: filter.assignedSlot === drawer.shadowRoot.querySelector("slot"),
          value: filter.value,
          count: count.textContent,
        };
      })()`);
    const kept = { identity: true, parent: true, slotted: true, value: "quarterly", count: "1" };
    // Open at narrow, then wide: docked, with no event.
    await resize(WIDE);
    await settled("docked");
    let shown = await read();
    assert.deepEqual(
      [shown.mode, shown.dialogOpen, shown.modal, shown.open, shown.visible],
      ["docked", true, false, false, true],
    );
    assert.deepEqual(await same(), kept, "open at narrow, resized wide");
    // Back to narrow: closed, with no event.
    await resize(NARROW);
    await settled("drawer");
    shown = await read();
    assert.deepEqual([shown.dialogOpen, shown.modal, shown.open], [false, false, false]);
    assert.deepEqual(await same(), kept, "docked, resized narrow");
    // Closed at narrow, then wide and back.
    await resize(WIDE);
    await settled("docked");
    await resize(NARROW);
    await settled("drawer");
    assert.deepEqual(await same(), kept, "closed at narrow, resized wide and back");
    // A change of dock switches the same way.
    await page.evaluate(`document.querySelector("sl-drawer").dock = "20rem"`);
    await settled("docked");
    assert.deepEqual(await same(), kept, "dock lowered past the viewport");
    await page.evaluate(`document.querySelector("sl-drawer").dock = "48rem"`);
    await settled("drawer");
    assert.deepEqual(await same(), kept, "dock raised past the viewport");
    // It opens again from the same content.
    await call("show");
    shown = await read();
    assert.deepEqual([shown.modal, shown.focused], [true, "filter"]);
    await page.evaluate("new Promise((resolve) => setTimeout(resolve, 50))");
    assert.deepEqual((await read()).sent, ["open", "open"], "only the opens went out");
  });

  test("the drawer slides in by a transition, and under reduced motion opens with none", async () => {
    // The transitions running on the dialog and its scrim once show() returns.
    const running = () =>
      page.evaluate(`(() => {
        const drawer = document.querySelector("sl-drawer");
        drawer.show();
        const dialog = drawer.shadowRoot.querySelector("dialog");
        return {
          duration: getComputedStyle(dialog).transitionDuration,
          transitions: dialog.getAnimations({ subtree: true }).map((a) => a.transitionProperty).sort(),
          translate: getComputedStyle(dialog).translate,
        };
      })()`);
    await mount(NARROW);
    const motion = await running();
    assert.ok(motion.transitions.includes("translate"), `transitions ${motion.transitions}`);
    await page.cdp("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value: "reduce" }],
    });
    await mount(NARROW);
    const reduced = await running();
    assert.deepEqual(reduced, { duration: "0s", transitions: [], translate: "0px" });
    await call("close");
    assert.deepEqual(
      await page.evaluate(
        `document.querySelector("sl-drawer").shadowRoot.querySelector("dialog").checkVisibility()`,
      ),
      false,
      "closed at once",
    );
  });

  test("a switch across dock never slides: the dialog and its scrim change at once", async () => {
    // The transitions running on the dialog and its scrim, read as soon as the mode has switched,
    // well inside a slide's time.
    const running = () =>
      page.evaluate(
        `document.querySelector("sl-drawer").shadowRoot.querySelector("dialog").getAnimations({ subtree: true }).length`,
      );
    await mount(NARROW);
    await call("show");
    await slid();
    await resize(WIDE);
    await settled("docked");
    assert.equal(await running(), 0, "an open drawer docking");
    await resize(NARROW);
    await settled("drawer");
    assert.equal(await running(), 0, "docked content becoming a closed drawer");
  });

  for (const [dir, edge] of [
    ["ltr", "left"],
    ["rtl", "right"],
  ] as const) {
    test(`in a ${dir} page the drawer slides in from the ${edge} edge and sits against it`, async () => {
      await page.evaluate(`document.documentElement.dir = "${dir}"`);
      await mount(NARROW);
      // The dialog's box at the slide's start, its transitions paused there, then at its end.
      const at = (time: "start" | "end") =>
        page.evaluate(`(() => {
          const dialog = document.querySelector("sl-drawer").shadowRoot.querySelector("dialog");
          for (const animation of dialog.getAnimations()) {
            animation.pause();
            animation.currentTime = ${time === "start" ? "0" : "animation.effect.getTiming().duration"};
          }
          const { left, right } = dialog.getBoundingClientRect();
          return { left, right };
        })()`);
      await call("show");
      const start = await at("start");
      const end = await at("end");
      if (edge === "left") {
        assert.ok(Math.abs(start.right) <= 1, `starts past the left edge: ${start.right}`);
        assert.ok(Math.abs(end.left) <= 1, `ends against the left edge: ${end.left}`);
      } else {
        assert.ok(Math.abs(start.left - NARROW) <= 1, `starts past the right edge: ${start.left}`);
        assert.ok(Math.abs(end.right - NARROW) <= 1, `ends against the right edge: ${end.right}`);
      }
    });
  }
});
