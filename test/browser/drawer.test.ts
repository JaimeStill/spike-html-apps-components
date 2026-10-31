// The drawer from this repository's dist/, on test/fixtures/components.html, its viewport set
// either side of the dock width: docked above it, an aside exposed as a complementary landmark,
// visible, its content interactive, the page live, focus left where it was; at or below it,
// closed by default, and opened modally by show(), toggle(), or open, a dialog named by its
// visible heading and covering the viewport edge to edge, its header in view while its content
// scrolls, the page behind inert and focus inside, closed by its Close button, Escape, close(),
// toggle(), or open, focus returned to the opener; the Close button's text replaced through its
// slot; open and close sent once each, bubbling and composed, never on a mode switch; a switch in
// either direction, by the viewport or by dock, keeping the very same slotted elements, never
// disconnected, and what was typed and counted in them; the slide's transition, absent under
// reduced motion and on a switch; and the slide from the inline-start edge, the left, or the
// right in a right-to-left page.

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

/** A box in the viewport. */
interface Box {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
}

/** What window.read reads from the drawer: its mode, its shadow wrapper and the dialog's state,
 * the wrapper's box, focus, and the events it sent and the document heard. */
interface Shown {
  mode: "docked" | "drawer" | null;
  open: boolean;
  attribute: boolean;
  wrapper: string | null;
  dialogOpen: boolean;
  modal: boolean;
  box: Box;
  visible: boolean;
  focused: string | null;
  sent: string[];
  heard: Heard[];
}

/** A node of the page's accessibility tree, as Accessibility.getFullAXTree gives it. */
interface AXNode {
  ignored: boolean;
  role?: { value: string };
  name?: { value: string };
}

// The dock width, 48rem at the initial font size, and a viewport either side of it.
const DOCK = 768;
const WIDE = 1280;
const NARROW = 480;
const HEIGHT = 800;

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
    // window.mount(fields, extra) renders, into main, an opener that calls show(), a drawer of
    // the fields holding a filter field, a button that counts its clicks, a probe element that
    // counts its connections and disconnections, and the extra markup, and a button outside it,
    // all the page's; window.read() resolves, once the drawer renders, to what it shows.
    await page.evaluate(`window.verdict.then(async () => {
      await import("/dist/drawer.js");
      window.lifecycle = { connected: 0, disconnected: 0 };
      customElements.define("x-probe", class extends HTMLElement {
        connectedCallback() { window.lifecycle.connected++; }
        disconnectedCallback() { window.lifecycle.disconnected++; }
      });
      window.heard = [];
      for (const type of ["open", "close"]) {
        document.addEventListener(type, (event) => {
          if (event.target.localName === "sl-drawer") window.heard.push({
            type, detail: event.detail, bubbles: event.bubbles, composed: event.composed,
          });
        });
      }
      window.mount = async (fields, extra) => {
        const main = document.querySelector("main");
        main.innerHTML = "";
        window.lifecycle.connected = window.lifecycle.disconnected = 0;
        main.innerHTML = '<button id="opener" type="button">Documents</button>' +
          '<sl-drawer><input id="filter" aria-label="Filter"><button id="count" type="button">0</button>' +
          '<x-probe id="probe">probe</x-probe>' + extra + '</sl-drawer>' +
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
        const wrapper = drawer.shadowRoot.querySelector("aside, dialog");
        const dialog = drawer.shadowRoot.querySelector("dialog");
        const { left, right, top, bottom, width } = wrapper.getBoundingClientRect();
        const active = document.activeElement;
        // Focus in the drawer's own header is the host's, and its shadow root's active element.
        const focused = active === document.body || active === null ? null
          : active === drawer ? "drawer " + (drawer.shadowRoot.activeElement?.localName ?? "")
          : active.id || active.localName;
        return {
          mode: drawer.matches(":state(docked)") ? "docked" : drawer.matches(":state(drawer)") ? "drawer" : null,
          open: drawer.open,
          attribute: drawer.hasAttribute("open"),
          wrapper: wrapper?.localName ?? null,
          dialogOpen: dialog?.open ?? false,
          modal: dialog?.matches(":modal") ?? false,
          box: { left, right, top, bottom, width },
          visible: wrapper.checkVisibility(),
          focused,
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
      // The center of an element of the page's, or, with shadow, of the drawer's shadow root's.
      window.center = (selector, shadow) => {
        const root = shadow ? document.querySelector("sl-drawer").shadowRoot : document;
        const { left, top, width, height } = root.querySelector(selector).getBoundingClientRect();
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
  // The viewport's size.
  const resize = async (width: number, height = HEIGHT) => {
    await page.cdp("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await until(page, `innerWidth === ${width} && innerHeight === ${height}`);
  };
  // The drawer mounted at the viewport's size, once it has settled on the mode the default dock
  // gives it there.
  const mount = async (
    width: number,
    fields: Record<string, unknown> = {},
    extra = "",
    height = HEIGHT,
  ) => {
    await resize(width, height);
    await page.evaluate(
      `window.mount(${JSON.stringify({ label: "Documents", ...fields })}, ${JSON.stringify(extra)})`,
    );
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
  const center = (selector: string, shadow = false): Promise<{ x: number; y: number }> =>
    page.evaluate(`window.center(${JSON.stringify(selector)}, ${shadow})`);
  // Resolves once the drawer's transitions have ended.
  const slid = () =>
    page.evaluate(
      `Promise.all(document.querySelector("sl-drawer").shadowRoot.getAnimations().map((a) => a.finished)).then(() => {})`,
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
  // The names of the nodes of the role the accessibility tree exposes.
  const exposed = async (role: string): Promise<string[]> => {
    const { nodes }: { nodes: AXNode[] } = await page.cdp("Accessibility.getFullAXTree", {});
    return nodes
      .filter((node) => !node.ignored && node.role?.value === role)
      .map((node) => node.name?.value ?? "");
  };

  beforeEach(async () => {
    await page.cdp("Emulation.setEmulatedMedia", { features: [] });
    await page.evaluate(`document.documentElement.removeAttribute("dir")`);
  });

  test("above dock it is docked: an aside exposed as a complementary landmark, not a dialog, its content interactive, the page live, focus left in place", async () => {
    await mount(WIDE);
    const shown = await read();
    assert.deepEqual(
      [shown.mode, shown.wrapper, shown.dialogOpen, shown.open, shown.visible],
      ["docked", "aside", false, false, true],
    );
    assert.deepEqual(await exposed("complementary"), ["Documents"]);
    assert.deepEqual(await exposed("dialog"), [], "no dialog in the tree");
    assert.ok(shown.box.width > 0, "the docked aside takes space");
    assert.equal(shown.focused, null, "docking moves no focus into the content");
    assert.equal(await pageLive(), true, "the page takes focus");
    // A click on the slotted button reaches it, and so does one on the page's button.
    await clickAt(await center("#count"));
    assert.equal(await page.evaluate(`document.querySelector("#count").textContent`), "1");
    await clickAt(await center("#opener"));
    const after = await read();
    assert.deepEqual([after.wrapper, after.modal, after.open], ["aside", false, false]);
    assert.deepEqual(after.sent, [], "show() does nothing while docked");
  });

  test("docked, show(), toggle(), and open leave it docked and send nothing", async () => {
    await mount(WIDE);
    await call("show");
    await call("toggle");
    await page.evaluate(`document.querySelector("sl-drawer").open = true`);
    const shown = await read();
    assert.deepEqual(
      [shown.mode, shown.wrapper, shown.modal, shown.open, shown.attribute, shown.sent],
      ["docked", "aside", false, false, false, []],
    );
  });

  for (const width of [DOCK, NARROW]) {
    test(`at ${width}px, at or below dock, it is closed by default`, async () => {
      await mount(width);
      const shown = await read();
      assert.deepEqual(
        [shown.mode, shown.wrapper, shown.dialogOpen, shown.open, shown.visible, shown.sent],
        ["drawer", "dialog", false, false, false, []],
      );
    });
  }

  test("Enter on the opener shows a modal dialog named by its visible heading: the page behind inert, focus inside, Tab trapped; open goes out once", async () => {
    await mount(NARROW);
    await openByKeyboard();
    const shown = await read();
    assert.deepEqual(
      [shown.mode, shown.dialogOpen, shown.modal, shown.open, shown.attribute, shown.visible],
      ["drawer", true, true, true, true, true],
    );
    assert.deepEqual(await exposed("dialog"), ["Documents"]);
    // The fixture page has no heading of its own.
    assert.deepEqual(await exposed("heading"), ["Documents"]);
    assert.equal(
      await page.evaluate(
        `document.querySelector("sl-drawer").shadowRoot.querySelector("h2").checkVisibility()`,
      ),
      true,
      "the heading shows",
    );
    assert.equal(shown.focused, "drawer button", "focus moves to the dialog's first control");
    assert.equal(await pageLive(), false, "the page behind takes no focus");
    assert.deepEqual(shown.heard, [{ type: "open", detail: {}, bubbles: true, composed: true }]);
    // Tab stays among the drawer's controls, or leaves for the browser's own, never the page's.
    for (let i = 0; i < 5; i++) {
      await press("Tab", 9);
      const { focused } = await read();
      assert.ok(
        focused === null || ["drawer button", "filter", "count"].includes(focused),
        `Tab reached ${focused}`,
      );
    }
  });

  for (const [width, height] of [
    [480, 800],
    [375, 667],
  ] as const) {
    test(`open at ${width}×${height}, the dialog's box is the viewport's, edge to edge`, async () => {
      await mount(width, {}, "", height);
      await openByKeyboard();
      const { box } = await read();
      assert.deepEqual(box, { left: 0, right: width, top: 0, bottom: height, width });
    });
  }

  test("the header stays in view while the content scrolls below it", async () => {
    await mount(NARROW, {}, '<div id="tall" style="block-size: 3000px">tall</div>');
    await openByKeyboard();
    const scrolled: { header: number; body: number; dialog: number; bottom: number } =
      await page.evaluate(`(() => {
        const root = document.querySelector("sl-drawer").shadowRoot;
        const body = root.querySelector(".body");
        body.scrollTop = body.scrollHeight;
        return {
          header: root.querySelector("header").getBoundingClientRect().top,
          body: body.scrollTop,
          dialog: root.querySelector("dialog").scrollTop,
          bottom: document.querySelector("#tall").getBoundingClientRect().bottom,
        };
      })()`);
    assert.ok(scrolled.body > 0, "the content scrolled");
    assert.equal(scrolled.dialog, 0, "the dialog itself doesn't scroll");
    assert.equal(scrolled.header, 0, "the header stays at the top");
    assert.ok(scrolled.bottom <= HEIGHT, `the content's end came into view: ${scrolled.bottom}`);
  });

  test("the Close button, named Close Documents, closes it, focus returns to the opener, and close goes out once", async () => {
    await mount(NARROW);
    await openByKeyboard();
    assert.ok((await exposed("button")).includes("Close Documents"), "the button's name");
    await clickAt(await center("header button", true));
    await closedHeard(1);
    const shown = await read();
    assert.deepEqual(
      [shown.dialogOpen, shown.modal, shown.open, shown.attribute, shown.focused],
      [false, false, false, false, "opener"],
    );
    assert.equal(await pageLive(), true);
    assert.deepEqual(shown.sent, ["open", "close"]);
  });

  test("a replacement for the Close button's text, through its close slot, shows and leads its name", async () => {
    await mount(NARROW, {}, '<span slot="close" id="fermer">Fermer</span>');
    await openByKeyboard();
    const names = await exposed("button");
    assert.ok(names.includes("Fermer Documents"), `the button's name: ${names}`);
    assert.ok(!names.some((name) => name.startsWith("Close")), "the default text is replaced");
    const shown: { visible: boolean; inButton: boolean } = await page.evaluate(`(() => {
      const fermer = document.querySelector("#fermer");
      return {
        visible: fermer.checkVisibility(),
        inButton: fermer.assignedSlot?.closest("button") != null,
      };
    })()`);
    assert.deepEqual(shown, { visible: true, inButton: true });
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
      return { docked, modal: drawer.shadowRoot.querySelector("dialog")?.matches(":modal") ?? false };
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

  test("a switch across dock, either way, keeps the very same slotted elements, never disconnected, and their state; it sends nothing and never slides", async () => {
    await mount(NARROW);
    await openByKeyboard();
    await page.evaluate(`document.querySelector("#filter").focus()`);
    await page.cdp("Input.insertText", { text: "quarterly" });
    await page.evaluate(`(() => {
      window.kept = {
        filter: document.querySelector("#filter"),
        count: document.querySelector("#count"),
        probe: document.querySelector("#probe"),
      };
      window.kept.count.click();
    })()`);
    // The kept elements against the page's and the drawer's current slot, the probe's lifecycle
    // callbacks, what was typed and counted, and the drawer's transitions running.
    const same = () =>
      page.evaluate(`(() => {
        const drawer = document.querySelector("sl-drawer");
        const { filter, count, probe } = window.kept;
        const kept = [filter, count, probe];
        return {
          identity: document.querySelector("#filter") === filter &&
            document.querySelector("#count") === count && document.querySelector("#probe") === probe,
          parent: kept.every((element) => element.parentNode === drawer),
          slotted: kept.every((element) => element.assignedSlot === drawer.shadowRoot.querySelector("slot:not([name])")),
          lifecycle: { ...window.lifecycle },
          value: filter.value,
          count: count.textContent,
          animations: drawer.shadowRoot.getAnimations().length,
        };
      })()`);
    const kept = {
      identity: true,
      parent: true,
      slotted: true,
      lifecycle: { connected: 1, disconnected: 0 },
      value: "quarterly",
      count: "1",
      animations: 0,
    };
    // Open at narrow, then wide: docked, with no event.
    await resize(WIDE);
    await settled("docked");
    let shown = await read();
    assert.deepEqual(
      [shown.mode, shown.wrapper, shown.modal, shown.open, shown.visible],
      ["docked", "aside", false, false, true],
    );
    assert.deepEqual(await same(), kept, "open at narrow, resized wide");
    // Back to narrow: closed, with no event.
    await resize(NARROW);
    await settled("drawer");
    shown = await read();
    assert.deepEqual([shown.wrapper, shown.dialogOpen, shown.open], ["dialog", false, false]);
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
    assert.deepEqual([shown.modal, shown.focused], [true, "drawer button"]);
    await page.evaluate("new Promise((resolve) => setTimeout(resolve, 50))");
    assert.deepEqual((await read()).sent, ["open", "open"], "only the opens went out");
  });

  test("the drawer slides in by a transition, and under reduced motion opens with none", async () => {
    // The transitions running on the dialog once show() returns.
    const running = () =>
      page.evaluate(`(() => {
        const drawer = document.querySelector("sl-drawer");
        drawer.show();
        const dialog = drawer.shadowRoot.querySelector("dialog");
        return {
          duration: getComputedStyle(dialog).transitionDuration,
          transitions: drawer.shadowRoot.getAnimations().map((a) => a.transitionProperty).sort(),
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

  for (const [dir, edge] of [
    ["ltr", "left"],
    ["rtl", "right"],
  ] as const) {
    test(`in a ${dir} page the drawer slides in from past the ${edge} edge and ends flush with it`, async () => {
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
        assert.ok(start.right <= 1, `starts past the left edge: ${start.right}`);
        assert.ok(Math.abs(end.left) <= 1, `ends flush with the left edge: ${end.left}`);
      } else {
        assert.ok(start.left >= NARROW - 1, `starts past the right edge: ${start.left}`);
        assert.ok(
          Math.abs(end.right - NARROW) <= 1,
          `ends flush with the right edge: ${end.right}`,
        );
      }
    });
  }
});
