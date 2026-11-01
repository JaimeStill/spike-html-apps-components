// The stage timeline from this repository's dist/, on test/fixtures/components.html: each stage's
// name, its state's label and marker, and its completion time, formatted by the foundation in the
// page's locale and time zone; a failed stage's failure time and reason, part of its step for
// assistive technology, a long reason wrapping in the step's text column; the stages in their
// positions' order; the active stage the list's current step; a stage that advances changing in
// its own nodes, nothing moving; nothing focusable; and no event.

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
  failedAt?: string | null;
  reason?: string | null;
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
    reason: string | null;
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
            const reason = step.querySelector(".reason");
            const marker = step.querySelector(".marker");
            return {
              name: step.querySelector(".name").textContent,
              label: step.querySelector(".label > .shown").textContent,
              time: time && time.textContent.replace(/\\s+/g, " "),
              datetime: time && time.getAttribute("datetime"),
              reason: reason && reason.textContent,
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
        reason: null,
        marker: "glyph",
        markerHidden: "true",
        current: null,
      },
      {
        name: "metadata",
        label: "Complete",
        time: "Oct 29, 2026, 3:42:01 PM",
        datetime: "2026-10-29T15:42:01.000Z",
        reason: null,
        marker: "glyph",
        markerHidden: "true",
        current: null,
      },
      {
        name: "extraction",
        label: "In progress",
        time: null,
        datetime: null,
        reason: null,
        marker: "3",
        markerHidden: "true",
        current: "step",
      },
      {
        name: "chunks",
        label: "Pending",
        time: null,
        datetime: null,
        reason: null,
        marker: "4",
        markerHidden: "true",
        current: null,
      },
      {
        name: "embeddings",
        label: "Pending",
        time: null,
        datetime: null,
        reason: null,
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

  // The emulator's reason for a run its fail rule fails, as a run's JSON carries it.
  const reason = `emulated failure: the document's name matches the fail rule "fail-at-*:extraction"`;
  // The run failed at extraction, at its failure time and with the reason given.
  const failedRun = (why: string): Stage[] =>
    run("complete", "complete", "failed", "pending", "pending").map((stage) =>
      stage.state === "failed"
        ? { ...stage, failedAt: "2026-10-29T15:42:16Z", reason: why }
        : stage,
    );

  test("a failed stage shows its failure time and, under its detail line, its reason; no other stage shows one", async () => {
    await mount(failedRun(reason));
    const { stages } = await read();
    assert.deepEqual(
      stages.map(({ name, label, time, datetime, reason }) => [
        name,
        label,
        time,
        datetime,
        reason,
      ]),
      [
        ["upload", "Complete", "Oct 29, 2026, 3:42:00 PM", "2026-10-29T15:42:00.000Z", null],
        ["metadata", "Complete", "Oct 29, 2026, 3:42:01 PM", "2026-10-29T15:42:01.000Z", null],
        ["extraction", "Failed", "Oct 29, 2026, 3:42:16 PM", "2026-10-29T15:42:16.000Z", reason],
        ["chunks", "Pending", null, null, null],
        ["embeddings", "Pending", null, null, null],
      ],
    );
    // The reason sits under the detail line, at the name's start, in the muted text: the label
    // carries the failure's hue.
    const placed: {
      below: boolean;
      start: boolean;
      reason: string;
      label: string;
      hues: string[];
    } = await page.evaluate(`(() => {
        const root = document.querySelector("sl-stage-timeline").shadowRoot;
        const step = root.querySelector(".failed");
        const rect = (selector) => step.querySelector(selector).getBoundingClientRect();
        const resolve = (value) => {
          const probe = root.appendChild(document.createElement("span"));
          probe.style.color = value;
          const resolved = getComputedStyle(probe).color;
          probe.remove();
          return resolved;
        };
        return {
          below: rect(".reason").top >= rect(".detail").bottom - 0.5,
          start: Math.abs(rect(".reason").left - rect(".name").left) < 0.5,
          reason: getComputedStyle(step.querySelector(".reason")).color,
          label: getComputedStyle(step.querySelector(".label")).color,
          hues: [resolve("var(--fg-2)"), resolve("var(--red)")],
        };
      })()`);
    assert.ok(placed.below, "the reason under the detail line");
    assert.ok(placed.start, "the reason at the name's start");
    assert.deepEqual([placed.reason, placed.label], placed.hues, "the reason muted, the label red");
  });

  test("a failed stage's reason and time are part of its list item for assistive technology", async () => {
    await mount(failedRun(reason));
    /** A node of the page's accessibility tree, as Accessibility.getFullAXTree gives it. */
    interface AXNode {
      nodeId: string;
      ignored?: boolean;
      role?: { value: string };
      name?: { value: string };
      childIds?: string[];
    }
    const { nodes }: { nodes: AXNode[] } = await page.cdp("Accessibility.getFullAXTree", {});
    const byId = new Map(nodes.map((node) => [node.nodeId, node]));
    // A node's text as assistive technology reads it: its descendants' static text, in order,
    // ignored text, the aria-hidden marker's and the slots' holds', left out.
    const text = (node: AXNode): string[] =>
      node.role?.value === "StaticText"
        ? node.ignored
          ? []
          : [node.name?.value ?? ""]
        : (node.childIds ?? []).flatMap((id) => {
            const child = byId.get(id);
            return child ? text(child) : [];
          });
    const items = nodes
      .filter((node) => node.role?.value === "listitem")
      .map((node) => text(node).join(" ").replace(/\s+/g, " ").trim());
    assert.deepEqual(items, [
      "upload Complete Oct 29, 2026, 3:42:00 PM",
      "metadata Complete Oct 29, 2026, 3:42:01 PM",
      `extraction Failed Oct 29, 2026, 3:42:16 PM ${reason}`,
      "chunks Pending",
      "embeddings Pending",
    ]);
  });

  test("a failed stage given its time in completedAt, as before failedAt, still shows it; failedAt wins when both are given", async () => {
    await mount([
      { name: "upload", position: 1, state: "failed", completedAt: "2026-10-29T15:42:07Z" },
      {
        name: "metadata",
        position: 2,
        state: "failed",
        completedAt: "2026-10-29T15:42:07Z",
        failedAt: "2026-10-29T15:42:09Z",
      },
      // A time or a reason the stage's state doesn't take shows none: a complete stage's failedAt
      // and reason; and a failed stage's empty reason shows none either.
      {
        name: "extraction",
        position: 3,
        state: "complete",
        completedAt: "2026-10-29T15:42:16Z",
        failedAt: "2026-10-29T15:42:31Z",
        reason,
      },
      {
        name: "chunks",
        position: 4,
        state: "failed",
        completedAt: null,
        failedAt: null,
        reason: "",
      },
    ]);
    assert.deepEqual(
      (await read()).stages.map(({ time, reason }) => [time, reason]),
      [
        ["Oct 29, 2026, 3:42:07 PM", null],
        ["Oct 29, 2026, 3:42:09 PM", null],
        ["Oct 29, 2026, 3:42:16 PM", null],
        [null, null],
      ],
    );
  });

  test("at 20rem, a long reason wraps inside the step's text column, the markers and text aligned", async () => {
    // A reason of many words and one unbroken run longer than the column: it wraps onto lines of
    // its own at the name's start, inside the timeline's box, the list never scrolling sideways;
    // every marker keeps its column, and every name its start; the step below starts after the
    // reason's last line and its gap.
    const long = `${reason}; the extractor gave up after reading /var/lib/pipeline/uploads/0193a5d2-7c10-7e4f-9a1b-2c3d4e5f6071/fail-at-extraction.txt and three retries`;
    await mount(failedRun(long));
    const measured: {
      lines: number;
      inside: boolean;
      start: boolean;
      overflow: number;
      markers: number[];
      names: number[];
      after: boolean;
    } = await page.evaluate(`(async () => {
      const timeline = document.querySelector("sl-stage-timeline");
      timeline.style.inlineSize = "20rem";
      await timeline.updateComplete;
      const root = timeline.shadowRoot;
      const box = timeline.getBoundingClientRect();
      const reason = root.querySelector(".failed .reason");
      const rect = reason.getBoundingClientRect();
      const lineHeight = parseFloat(getComputedStyle(reason).lineHeight);
      const left = (selector) =>
        [...new Set([...root.querySelectorAll(selector)].map((part) => Math.round(part.getBoundingClientRect().left)))];
      const list = root.querySelector(".stages");
      return {
        lines: Math.round(rect.height / lineHeight),
        inside: rect.left >= box.left - 0.5 && rect.right <= box.right + 0.5,
        start: Math.abs(rect.left - root.querySelector(".failed .name").getBoundingClientRect().left) < 0.5,
        overflow: list.scrollWidth - list.clientWidth,
        markers: left(".marker"),
        names: left(".name"),
        after: root.querySelector(".failed + .stage").getBoundingClientRect().top > rect.bottom,
      };
    })()`);
    assert.ok(measured.lines > 2, `the reason on ${measured.lines} lines`);
    assert.ok(measured.inside, "the reason inside the timeline's box");
    assert.ok(measured.start, "the reason's lines at the name's start");
    assert.ok(measured.overflow <= 0, `the list overflows by ${measured.overflow}`);
    assert.equal(measured.markers.length, 1, `markers at ${measured.markers}`);
    assert.equal(measured.names.length, 1, `names at ${measured.names}`);
    assert.ok(measured.after, "the next step after the reason");
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

  test("in a parent that sizes it to its content, the timeline keeps its width as stages advance, a failure's reason too", async () => {
    // The reason wraps to the width the names and detail lines give the timeline, never widening
    // it: a failure in a sized-to-content parent moves nothing sideways.
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
        failedRun(reason.repeat(3)),
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
