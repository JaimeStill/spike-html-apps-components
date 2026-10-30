// The stage timeline from this repository's dist/, on test/fixtures/components.html: each stage's
// name, its state's label and marker, and its completion time, formatted by the foundation in the
// page's locale and time zone; the stages in their positions' order; the active stage the list's
// current step; a stage that advances changing in its own nodes, nothing moving; nothing focusable;
// and no event.

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { launch } from "@jaimestill/spike-html-apps-tooling/browser.js";
import type { Browser, Page } from "@jaimestill/spike-html-apps-tooling/browser.js";
import { serve } from "@jaimestill/spike-html-apps-tooling/server.js";
import type { Server } from "@jaimestill/spike-html-apps-tooling/server.js";

import { served } from "./support/served.ts";

/** A stage as the cases give the timeline one, in the emulator's shape. */
interface Stage {
  name: string;
  position: number;
  state: "pending" | "active" | "complete" | "failed";
  completedAt: string | null;
}

/** What window.read resolves to: the list's element and label, each step as it shows, and the
 * events the host sent. */
interface Shown {
  list: [string, string | null];
  stages: {
    name: string;
    label: string;
    time: string | null;
    datetime: string | null;
    marker: string;
    markerHidden: string | null;
    current: string | null;
  }[];
  sent: string[];
}

describe("stage timeline", { timeout: 60_000 }, () => {
  let server: Server;
  let browser: Browser;
  let page: Page;
  before(async () => {
    server = await serve(served);
    browser = await launch();
    page = await browser.open(`${server.origin}/test/fixtures/components.html`);
    // Keys go to the focused element as a user's would, though a headless page never has the
    // window's focus.
    await page.cdp("Emulation.setFocusEmulationEnabled", { enabled: true });
    // window.mount(stages) renders a timeline of the stages into main, recording every event its
    // host dispatches; window.read() resolves to what each step shows, in the list's order.
    await page.evaluate(`window.verdict.then(async () => {
      await import("/dist/stage-timeline.js");
      window.mount = async (stages) => {
        const timeline = Object.assign(document.createElement("sl-stage-timeline"), { stages });
        window.sent = [];
        const original = timeline.dispatchEvent.bind(timeline);
        timeline.dispatchEvent = (event) => (window.sent.push(event.type), original(event));
        document.querySelector("main").replaceChildren(timeline);
        await timeline.updateComplete;
        return timeline;
      };
      window.read = async () => {
        const timeline = document.querySelector("sl-stage-timeline");
        await timeline.updateComplete;
        const root = timeline.shadowRoot;
        const list = root.querySelector("ol");
        return {
          list: [list.localName, list.getAttribute("aria-label")],
          stages: [...list.children].map((step) => {
            const time = step.querySelector("time");
            const marker = step.querySelector(".marker");
            return {
              name: step.querySelector(".name").textContent,
              label: step.querySelector(".label > .shown").textContent,
              time: time && time.textContent.replace(/\\s+/g, " "),
              datetime: time && time.getAttribute("datetime"),
              marker: marker.querySelector("svg") ? "glyph" : marker.textContent.trim(),
              markerHidden: marker.getAttribute("aria-hidden"),
              current: step.getAttribute("aria-current"),
            };
          }),
          sent: window.sent,
        };
      };
    })`);
  });
  after(async () => {
    await page?.close();
    await browser?.close();
    await server?.stop();
  });

  const mount = (stages: Stage[]) =>
    page.evaluate(`window.mount(${JSON.stringify(stages)}).then(() => {})`);
  const read = (): Promise<Shown> => page.evaluate("window.read()");

  const names = ["upload", "metadata", "extraction", "chunks", "embeddings"];
  // The emulator's five stages in the states given, by position; a complete one with its time.
  const run = (...states: Stage["state"][]): Stage[] =>
    names.map((name, index) => ({
      name,
      position: index + 1,
      state: states[index],
      completedAt: states[index] === "complete" ? `2026-10-29T15:42:0${index}Z` : null,
    }));

  test("each stage shows its name, its state's label and marker, and its completion time", async () => {
    await mount(run("complete", "complete", "active", "pending", "pending"));
    const { list, stages } = await read();
    assert.deepEqual(list, ["ol", "Stages"]);
    // The browser runs in en-US at UTC, as the tooling's launch() starts it.
    assert.deepEqual(stages, [
      {
        name: "upload",
        label: "Complete",
        time: "Oct 29, 2026, 3:42:00 PM",
        datetime: "2026-10-29T15:42:00.000Z",
        marker: "glyph",
        markerHidden: "true",
        current: null,
      },
      {
        name: "metadata",
        label: "Complete",
        time: "Oct 29, 2026, 3:42:01 PM",
        datetime: "2026-10-29T15:42:01.000Z",
        marker: "glyph",
        markerHidden: "true",
        current: null,
      },
      {
        name: "extraction",
        label: "In progress",
        time: null,
        datetime: null,
        marker: "3",
        markerHidden: "true",
        current: "step",
      },
      {
        name: "chunks",
        label: "Pending",
        time: null,
        datetime: null,
        marker: "4",
        markerHidden: "true",
        current: null,
      },
      {
        name: "embeddings",
        label: "Pending",
        time: null,
        datetime: null,
        marker: "5",
        markerHidden: "true",
        current: null,
      },
    ]);
  });

  test("a failed stage is labelled Failed, its marker a glyph, and no stage is current", async () => {
    await mount(run("complete", "complete", "failed", "pending", "pending"));
    const { stages } = await read();
    assert.deepEqual(
      stages.map(({ label, marker, current }) => [label, marker, current]),
      [
        ["Complete", "glyph", null],
        ["Complete", "glyph", null],
        ["Failed", "glyph", null],
        ["Pending", "4", null],
        ["Pending", "5", null],
      ],
    );
  });

  test("the stages show in their positions' order, whatever order the list gives them", async () => {
    const stages = run("complete", "active", "pending", "pending", "pending");
    await mount([stages[3], stages[0], stages[4], stages[2], stages[1]]);
    assert.deepEqual(
      (await read()).stages.map(({ name }) => name),
      names,
    );
  });

  test("a completion time may be a Date; one that is absent, null, or unparseable shows none", async () => {
    await page.evaluate(`window.mount([
      { name: "upload", position: 1, state: "complete", completedAt: new Date(Date.UTC(2026, 9, 29, 9, 5, 3)) },
      { name: "metadata", position: 2, state: "complete" },
      { name: "extraction", position: 3, state: "complete", completedAt: null },
      { name: "chunks", position: 4, state: "complete", completedAt: "not a time" },
    ]).then(() => {})`);
    assert.deepEqual(
      (await read()).stages.map(({ time }) => time),
      ["Oct 29, 2026, 9:05:03 AM", null, null, null],
    );
  });

  test("a stage that advances changes in its own nodes, and no step moves or resizes", async () => {
    // The run advanced one step at a time, then failed, at 20rem and at 40rem: after each step
    // the list holds the same element per stage, and every step's box, and its name's, label's,
    // and time slot's, is where and as large as it was.
    const steps = [
      run("pending", "pending", "pending", "pending", "pending"),
      run("active", "pending", "pending", "pending", "pending"),
      run("complete", "active", "pending", "pending", "pending"),
      run("complete", "complete", "active", "pending", "pending"),
      run("complete", "complete", "complete", "complete", "complete"),
      run("complete", "complete", "failed", "pending", "pending"),
    ];
    for (const width of ["20rem", "40rem"]) {
      await mount(steps[0]);
      const measured: { same: boolean; boxes: number[][][]; host: number[] }[] = [];
      for (const stages of steps) {
        measured.push(
          await page.evaluate(`(async () => {
            const timeline = document.querySelector("sl-stage-timeline");
            timeline.style.inlineSize = ${JSON.stringify(width)};
            timeline.stages = ${JSON.stringify(stages)};
            await timeline.updateComplete;
            const steps = [...timeline.shadowRoot.querySelectorAll(".stage")];
            window.nodes ??= steps;
            const box = (part) => {
              const { left, top, width, height } = part.getBoundingClientRect();
              return [left, top, width, height].map(Math.round);
            };
            return {
              same: steps.every((step, index) => step === window.nodes[index]),
              boxes: steps.map((step) =>
                [step, ...step.querySelectorAll(".name, .label, .when")].map(box)),
              host: box(timeline),
            };
          })()`),
        );
      }
      await page.evaluate("delete window.nodes");
      for (const [index, { same, boxes, host }] of measured.entries()) {
        assert.ok(same, `${width}, step ${index}: the same nodes`);
        assert.deepEqual(boxes, measured[0].boxes, `${width}, step ${index}: the steps' boxes`);
        assert.deepEqual(host, measured[0].host, `${width}, step ${index}: the timeline's box`);
      }
    }
  });

  test("in a parent that sizes it to its content, the timeline keeps its width as stages advance", async () => {
    await mount(run("pending", "pending", "pending", "pending", "pending"));
    const widths: number[] = await page.evaluate(`(async () => {
      const timeline = document.querySelector("sl-stage-timeline");
      const parent = document.createElement("div");
      parent.style.display = "inline-block";
      timeline.replaceWith(parent);
      parent.append(timeline);
      const widths = [];
      for (const stages of ${JSON.stringify([
        run("pending", "pending", "pending", "pending", "pending"),
        run("complete", "complete", "active", "pending", "pending"),
        run("complete", "complete", "complete", "complete", "complete"),
        run("complete", "complete", "failed", "pending", "pending"),
      ])}) {
        timeline.stages = stages;
        await timeline.updateComplete;
        widths.push(timeline.getBoundingClientRect().width);
      }
      return widths;
    })()`);
    assert.ok(widths[0] > 0, `${widths[0]} wide`);
    assert.deepEqual(
      widths,
      widths.map(() => widths[0]),
    );
  });

  test("the timeline holds nothing focusable: Tab passes over it", async () => {
    await mount(run("complete", "active", "pending", "pending", "pending"));
    const reached: number = await page.evaluate(`(() => {
      const main = document.querySelector("main");
      const before = Object.assign(document.createElement("button"), { textContent: "before" });
      const next = Object.assign(document.createElement("button"), { textContent: "after" });
      main.prepend(before);
      main.append(next);
      before.focus();
      return main.querySelector("sl-stage-timeline").shadowRoot
        .querySelectorAll("a[href], button, input, select, textarea, details, [tabindex]").length;
    })()`);
    assert.equal(reached, 0, "focusable parts");
    const event = { key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 };
    await page.cdp("Input.dispatchKeyEvent", { type: "keyDown", ...event });
    await page.cdp("Input.dispatchKeyEvent", { type: "keyUp", ...event });
    assert.equal(await page.evaluate("document.activeElement.textContent"), "after");
  });

  test("the timeline sends no event as its stages change", async () => {
    await mount(run("pending", "pending", "pending", "pending", "pending"));
    await page.evaluate(`(async () => {
      const timeline = document.querySelector("sl-stage-timeline");
      for (const stages of ${JSON.stringify([
        run("active", "pending", "pending", "pending", "pending"),
        run("complete", "complete", "failed", "pending", "pending"),
        [],
      ])}) {
        timeline.stages = stages;
        await timeline.updateComplete;
      }
    })()`);
    assert.deepEqual((await read()).sent, []);
  });
});
