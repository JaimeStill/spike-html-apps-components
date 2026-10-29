// The event log from this repository's dist/, on test/fixtures/components.html: its frame a polite
// log of additions; each event's type, time, formatted by the foundation in the page's locale and
// time zone, and its source, subject, and id, labelled; its data pretty-printed in a details,
// collapsed, or a note when it has none; the events in the order given; events appended leaving
// those shown in their own nodes and places, an opened details open; the frame following the
// newest only from its end; the details opened by the keyboard; and no event sent.

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { launch } from "./support/browser-pipe.js";
import { serve } from "./support/server.js";

describe("event log", { timeout: 60_000 }, () => {
  let server;
  let browser;
  let page;
  before(async () => {
    server = await serve();
    browser = await launch();
    page = await browser.open(`${server.origin}/test/fixtures/components.html`);
    // Keys go to the focused element as a user's would, though a headless page never has the
    // window's focus.
    await page.cdp("Emulation.setFocusEmulationEnabled", { enabled: true });
    // window.mount(events) renders a log of the events into main, recording every event its host
    // dispatches; window.read() resolves to what the frame and each event show, in the list's
    // order.
    await page.evaluate(`window.verdict.then(async () => {
      await import("/dist/event-log.js");
      window.mount = async (events) => {
        const log = Object.assign(document.createElement("sl-event-log"), { events });
        window.sent = [];
        const original = log.dispatchEvent.bind(log);
        log.dispatchEvent = (event) => (window.sent.push(event.type), original(event));
        document.querySelector("main").replaceChildren(log);
        await log.updateComplete;
        return log;
      };
      window.read = async () => {
        const log = document.querySelector("sl-event-log");
        await log.updateComplete;
        const root = log.shadowRoot;
        const frame = root.querySelector(".frame");
        return {
          frame: ["role", "aria-live", "aria-relevant", "aria-label", "tabindex"].map((name) =>
            frame.getAttribute(name)),
          list: root.querySelector("ol")?.localName ?? null,
          empty: root.querySelector(".empty")?.textContent ?? null,
          events: [...root.querySelectorAll("ol > li")].map((event) => {
            const time = event.querySelector("time");
            const details = event.querySelector("details");
            return {
              type: event.querySelector(".type").textContent,
              time: time && time.textContent.replace(/\\s+/g, " "),
              datetime: time && time.getAttribute("datetime"),
              meta: [...event.querySelectorAll(".meta > .pair")].map((pair) => [
                pair.querySelector("dt").textContent,
                pair.querySelector("dd").textContent,
              ]),
              summary: details?.querySelector("summary").textContent ?? null,
              open: details ? details.open : null,
              data: details?.querySelector("pre").textContent ?? null,
              note: event.querySelector(".no-data")?.textContent ?? null,
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

  const mount = (events) => page.evaluate(`window.mount(${JSON.stringify(events)}).then(() => {})`);
  const read = () => page.evaluate("window.read()");

  const run = "0193a5c2-7e4b-7c1d-9f2a-3b4c5d6e7f80";
  const names = ["upload", "metadata", "extraction", "chunks", "embeddings"];
  // The emulator's stage event for the stage at the index, as its stream carries it.
  const stage = (index) => ({
    id: `${run}.${index + 1}`,
    type: "emulator.run.stage",
    source: "/emulator/lab-a",
    subject: run,
    time: `2026-10-29T15:42:0${index}Z`,
    data: { stage: names[index], position: index + 1, stage_count: 5, document_id: "doc-1" },
  });
  const stages = (count) => Array.from({ length: count }, (_, index) => stage(index));

  test("an empty log says so, in its frame, a polite log of additions", async () => {
    await mount([]);
    const { frame, list, empty, events } = await read();
    assert.deepEqual(frame, ["log", "polite", "additions", "Events", null]);
    assert.equal(list, null);
    assert.equal(empty, "No events yet.");
    assert.deepEqual(events, []);
  });

  test("each event shows its type, its time, its source, subject, and id, and its data collapsed", async () => {
    await mount(stages(2));
    const { frame, list, events } = await read();
    assert.deepEqual(frame, ["log", "polite", "additions", "Events", null]);
    assert.equal(list, "ol");
    // The browser runs in en-US at UTC, as support/browser-pipe.js launches it.
    assert.deepEqual(events[0], {
      type: "emulator.run.stage",
      time: "Oct 29, 2026, 3:42:00 PM",
      datetime: "2026-10-29T15:42:00.000Z",
      meta: [
        ["source", "/emulator/lab-a"],
        ["subject", run],
        ["id", `${run}.1`],
      ],
      summary: "Data",
      open: false,
      data: JSON.stringify(stage(0).data, null, 2),
      note: null,
    });
    assert.equal(events[1].time, "Oct 29, 2026, 3:42:01 PM");
  });

  test("the events show in the order given, not by time", async () => {
    const given = [stage(3), stage(0), stage(4), stage(1)];
    await mount(given);
    assert.deepEqual(
      (await read()).events.map(({ meta }) => meta.at(-1)[1]),
      given.map(({ id }) => id),
    );
  });

  test("data shows pretty-printed: an object or array as JSON, a string as it is, null, and a bigint's digits", async () => {
    await page.evaluate(`window.mount([
      { id: "1", type: "t", source: "s", time: "2026-10-29T15:42:00Z", data: { a: [1, { b: true }] } },
      { id: "2", type: "t", source: "s", time: "2026-10-29T15:42:00Z", data: "Read from page 1.\\nThen page 2." },
      { id: "3", type: "t", source: "s", time: "2026-10-29T15:42:00Z", data: null },
      { id: "4", type: "t", source: "s", time: "2026-10-29T15:42:00Z", data: [] },
      { id: "5", type: "t", source: "s", time: "2026-10-29T15:42:00Z", data: 0 },
      { id: "6", type: "t", source: "s", time: "2026-10-29T15:42:00Z", data: { big: 9007199254740993n } },
    ]).then(() => {})`);
    assert.deepEqual(
      (await read()).events.map(({ data }) => data),
      [
        '{\n  "a": [\n    1,\n    {\n      "b": true\n    }\n  ]\n}',
        "Read from page 1.\nThen page 2.",
        "null",
        "[]",
        "0",
        '{\n  "big": "9007199254740993"\n}',
      ],
    );
  });

  test("data JSON can't write shows as its String(); absent data shows a note in the details' place", async () => {
    await page.evaluate(`(() => {
      const circular = { name: "loop" };
      circular.self = circular;
      return window.mount([
        { id: "1", type: "t", source: "s", time: "2026-10-29T15:42:00Z", data: circular },
        { id: "2", type: "t", source: "s", time: "2026-10-29T15:42:00Z", data: Symbol("token") },
        { id: "3", type: "t", source: "s", time: "2026-10-29T15:42:00Z" },
      ]).then(() => {});
    })()`);
    assert.deepEqual(
      (await read()).events.map(({ summary, data, note }) => [summary, data, note]),
      [
        ["Data", "[object Object]", null],
        ["Data", "Symbol(token)", null],
        [null, null, "No data"],
      ],
    );
  });

  test("a subject absent or null shows no subject; a time that doesn't parse shows none; a Date is a time", async () => {
    await page.evaluate(`window.mount([
      { id: "1", type: "t", source: "s", time: "not a time", data: 1 },
      { id: "2", type: "t", source: "s", subject: null, time: new Date(Date.UTC(2026, 9, 29, 9, 5, 3)), data: 2 },
    ]).then(() => {})`);
    const { events } = await read();
    assert.deepEqual(
      events.map(({ time, meta }) => [time, meta.map(([label]) => label)]),
      [
        [null, ["source", "id"]],
        ["Oct 29, 2026, 9:05:03 AM", ["source", "id"]],
      ],
    );
  });

  test("events of one id from two sources are two events", async () => {
    await mount([stage(0), { ...stage(0), source: "/emulator/lab-b" }]);
    assert.deepEqual(
      (await read()).events.map(({ meta }) => meta[0][1]),
      ["/emulator/lab-a", "/emulator/lab-b"],
    );
  });

  test("events appended leave those shown in their own nodes and places, an opened details open", async () => {
    // At 20rem and at 40rem: the first two events shown, the second's data opened, then the rest
    // appended one at a time. After each, the first two are the same nodes, at the same boxes,
    // and the second's details is still open.
    for (const width of ["20rem", "40rem"]) {
      await mount(stages(2));
      const measured = [];
      for (const count of [2, 3, 4, 5]) {
        measured.push(
          await page.evaluate(`(async () => {
            const log = document.querySelector("sl-event-log");
            log.style.inlineSize = ${JSON.stringify(width)};
            log.events = ${JSON.stringify(stages(count))};
            await log.updateComplete;
            const events = [...log.shadowRoot.querySelectorAll(".event")];
            if (!window.nodes) {
              window.nodes = events;
              events[1].querySelector("details").open = true;
            }
            const box = (part) => {
              const { left, top, width, height } = part.getBoundingClientRect();
              return [left, top, width, height].map(Math.round);
            };
            return {
              count: events.length,
              same: window.nodes.every((node, index) => node === events[index]),
              boxes: window.nodes.map(box),
              open: window.nodes.map((node) => node.querySelector("details").open),
            };
          })()`),
        );
      }
      await page.evaluate("delete window.nodes");
      for (const [index, { count, same, boxes, open }] of measured.entries()) {
        const where = `${width}, ${count} events`;
        assert.equal(count, index + 2, `${where}: the events`);
        assert.ok(same, `${where}: the same nodes`);
        assert.deepEqual(boxes, measured[0].boxes, `${where}: the first two events' boxes`);
        assert.deepEqual(open, [false, true], `${where}: the details' open states`);
      }
    }
  });

  test("held, the frame follows the newest event only when at its end, and the first events open at the top", async () => {
    await mount(stages(3));
    const scrolled = await page.evaluate(`(async () => {
      const log = document.querySelector("sl-event-log");
      log.style.blockSize = "10rem";
      const frame = log.shadowRoot.querySelector(".frame");
      const append = async (count) => {
        log.events = ${JSON.stringify(stages(5))}.slice(0, count);
        await log.updateComplete;
      };
      const where = () => ({
        top: Math.round(frame.scrollTop),
        end: Math.round(frame.scrollHeight - frame.clientHeight),
      });
      // Shown fresh with every event at once: the frame opens at the top.
      log.events = [];
      await log.updateComplete;
      await append(3);
      const first = where();
      // Scrolled to its end, one more arrives: the frame follows it.
      frame.scrollTop = frame.scrollHeight;
      await append(4);
      const followed = where();
      // Scrolled up, one more arrives: the frame keeps the reader's place.
      frame.scrollTop = 0;
      await append(5);
      const kept = where();
      return { first, followed, kept };
    })()`);
    assert.ok(scrolled.first.end > 0, `the frame scrolls: ${JSON.stringify(scrolled.first)}`);
    assert.equal(scrolled.first.top, 0, "the first events open at the top");
    assert.equal(scrolled.followed.top, scrolled.followed.end, "at its end, it follows");
    assert.equal(scrolled.kept.top, 0, "scrolled up, it keeps its place");
    assert.ok(scrolled.kept.end > scrolled.followed.end, "the fifth event added to its scroll");
  });

  test("the keyboard reaches each event's data toggle by Tab, and Enter and Space open and close it", async () => {
    await mount(stages(2));
    const key = async (name, code, text) => {
      const event = {
        key: name,
        code,
        windowsVirtualKeyCode: name === "Tab" ? 9 : name === "Enter" ? 13 : 32,
      };
      await page.cdp("Input.dispatchKeyEvent", {
        type: "keyDown",
        ...event,
        ...(text ? { text, unmodifiedText: text } : {}),
      });
      await page.cdp("Input.dispatchKeyEvent", { type: "keyUp", ...event });
    };
    await page.evaluate(`(() => {
      const before = Object.assign(document.createElement("button"), { textContent: "before" });
      document.querySelector("main").prepend(before);
      before.focus();
    })()`);
    const state = () =>
      page.evaluate(`(() => {
        const root = document.querySelector("sl-event-log").shadowRoot;
        return {
          focused: root.activeElement?.localName ?? null,
          index: [...root.querySelectorAll("summary")].indexOf(root.activeElement),
          open: [...root.querySelectorAll("details")].map((details) => details.open),
        };
      })()`);
    await key("Tab", "Tab");
    assert.deepEqual(await state(), { focused: "summary", index: 0, open: [false, false] });
    await key("Enter", "Enter", "\r");
    assert.deepEqual(await state(), { focused: "summary", index: 0, open: [true, false] });
    await key("Tab", "Tab");
    await key(" ", "Space", " ");
    assert.deepEqual(await state(), { focused: "summary", index: 1, open: [true, true] });
    await key("Enter", "Enter", "\r");
    assert.deepEqual(await state(), { focused: "summary", index: 1, open: [true, false] });
  });

  test("the log sends no event as events arrive and its details open", async () => {
    await mount(stages(1));
    await page.evaluate(`(async () => {
      const log = document.querySelector("sl-event-log");
      for (const events of ${JSON.stringify([stages(3), stages(5), []])}) {
        log.events = events;
        await log.updateComplete;
        log.shadowRoot.querySelector("summary")?.click();
      }
    })()`);
    assert.deepEqual((await read()).sent, []);
  });
});
