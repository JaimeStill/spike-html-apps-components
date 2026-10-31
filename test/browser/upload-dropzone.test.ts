// The upload dropzone from this repository's dist/, on test/fixtures/components.html: files chosen
// through the native picker its button opens by the keyboard, and files dropped on the zone, each
// sending files-select with an array of the files, bubbling and composed; the drag-over mark set
// by a drag of files, kept across the zone's children, and cleared by leaving or dropping; a drop
// never left to the browser; disabled refusing both paths, and reflecting; accept the picker's
// alone; the uploads listed, each its name, its formatted size, an uploading one's bar and bytes
// sent and its cancel control, which sends upload-cancel with its id, a finished one's label; and
// neither progress nor a change of state moving an upload's rows; and each upload's layout, its
// detail under its name, a finished label centered on the item, an uploading bar across it.

import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, beforeEach, describe, test } from "node:test";

import { launch } from "@jaimestill/spike-html-apps-tooling/browser.js";
import type { Browser, Page } from "@jaimestill/spike-html-apps-tooling/browser.js";
import { serve } from "@jaimestill/spike-html-apps-tooling/server.js";
import type { Server } from "@jaimestill/spike-html-apps-tooling/server.js";

import { served } from "./support/served.ts";

/** An event the document heard: a files-select's detail as whether its files are an array and
 * each file's name and size, an upload-cancel's as it was sent, its id. */
interface Heard {
  type: string;
  detail: { array?: boolean; files?: [string, number][]; id?: string };
  bubbles: boolean;
  composed: boolean;
}

/** A drag event as the document heard it, after the zone: its default prevented, and its drop
 * effect. */
interface Drag {
  type: string;
  prevented: boolean;
  effect: string;
}

/** What window.read resolves to: the zone's mark, its controls, the uploads listed, and the
 * events sent and heard. */
interface Read {
  over: boolean;
  disabled: boolean;
  pickDisabled: boolean;
  inputDisabled: boolean;
  multiple: boolean;
  accept: string | null;
  focused: string | null;
  uploads: {
    id: string;
    name: string;
    title: string;
    state: string | null;
    bytes: string;
    message: string | null;
    progress: [number, number, string | null] | null;
    cancel: string | null;
  }[];
  sent: string[];
  heard: Heard[];
}

/** A box's edges, as getBoundingClientRect gives them. */
interface Edges {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

describe("upload dropzone", { timeout: 60_000 }, () => {
  let server: Server;
  let browser: Browser;
  let page: Page;
  let files: string;
  before(async () => {
    // Two files on disk for the picker, as a user's file system holds them.
    files = mkdtempSync(join(tmpdir(), "upload-dropzone."));
    writeFileSync(join(files, "notes.txt"), "a note");
    writeFileSync(join(files, "figure.png"), Buffer.alloc(1536));
    server = await serve(served);
    browser = await launch();
    page = await browser.open(`${server.origin}/test/fixtures/components.html`);
    // Keys go to the focused element as a user's would, and :focus-visible matches, though a
    // headless page never has the window's focus.
    await page.cdp("Emulation.setFocusEmulationEnabled", { enabled: true });
    // The picker opens as a protocol event rather than a dialog, which the case answers.
    await page.cdp("Page.setInterceptFileChooserDialog", { enabled: true });
    // window.mount(fields) renders a dropzone of the fields into main, recording every event its
    // host dispatches and every files-select and upload-cancel the document hears, a
    // files-select's files by name and size; window.drag(type, names, target) dispatches a drag
    // event carrying files of those names, or text when names is null, on the zone or the named
    // part of it, resolving to whether its default was prevented and its drop effect.
    await page.evaluate(`window.verdict.then(async () => {
      await import("/dist/upload-dropzone.js");
      window.heard = [];
      for (const type of ["files-select", "upload-cancel"]) {
        document.addEventListener(type, (event) => window.heard.push({
          type,
          detail: type === "files-select"
            ? {
                array: Array.isArray(event.detail.files),
                files: event.detail.files.map((file) => [file.name, file.size]),
              }
            : event.detail,
          bubbles: event.bubbles,
          composed: event.composed,
        }));
      }
      // The document hears each drag event after the zone, so it reads what the zone left: its
      // default prevented, and its drop effect.
      window.drags = [];
      for (const type of ["dragover", "drop"]) {
        document.addEventListener(type, (event) => window.drags.push({
          type, prevented: event.defaultPrevented, effect: event.dataTransfer.dropEffect,
        }));
      }
      window.mount = async (fields) => {
        const dropzone = Object.assign(document.createElement("sl-upload-dropzone"), fields);
        window.sent = [];
        window.heard.length = 0;
        window.drags.length = 0;
        const original = dropzone.dispatchEvent.bind(dropzone);
        dropzone.dispatchEvent = (event) => (window.sent.push(event.type), original(event));
        document.querySelector("main").replaceChildren(dropzone);
        await dropzone.updateComplete;
        return dropzone;
      };
      window.part = (selector) =>
        document.querySelector("sl-upload-dropzone").shadowRoot.querySelector(selector);
      window.drag = async (type, names, target = ".zone") => {
        const dataTransfer = new DataTransfer();
        if (names === null) dataTransfer.setData("text/plain", "a dragged line");
        for (const name of names ?? []) dataTransfer.items.add(new File(["x".repeat(name.length)], name));
        const event = new DragEvent(type, { bubbles: true, cancelable: true, composed: true, dataTransfer });
        window.part(target).dispatchEvent(event);
        await document.querySelector("sl-upload-dropzone").updateComplete;
        return { prevented: event.defaultPrevented, effect: dataTransfer.dropEffect };
      };
      window.read = async () => {
        const dropzone = document.querySelector("sl-upload-dropzone");
        await dropzone.updateComplete;
        const root = dropzone.shadowRoot;
        const pick = root.querySelector(".pick");
        const input = root.querySelector("input");
        return {
          over: root.querySelector(".zone").classList.contains("over"),
          disabled: dropzone.hasAttribute("disabled"),
          pickDisabled: pick.disabled,
          inputDisabled: input.disabled,
          multiple: input.multiple,
          accept: input.getAttribute("accept"),
          focused: root.activeElement?.className ?? null,
          uploads: [...root.querySelectorAll(".upload")].map((upload) => {
            const progress = upload.querySelector("progress");
            const cancel = upload.querySelector("button");
            return {
              id: upload.dataset.id,
              name: upload.querySelector(".name").textContent,
              title: upload.querySelector(".name").title,
              state: upload.querySelector(".state")?.textContent ?? null,
              bytes: upload.querySelector(".bytes").textContent.replace(/\\s+/g, " ").trim(),
              message: upload.querySelector(".message")?.textContent ?? null,
              progress: progress && [progress.value, progress.max, progress.getAttribute("aria-label")],
              cancel: cancel && cancel.getAttribute("aria-label"),
            };
          }),
          sent: window.sent,
          heard: window.heard,
        };
      };
    })`);
  });
  after(async () => {
    await page?.close();
    await browser?.close();
    await server?.stop();
    rmSync(files, { recursive: true, force: true });
  });

  const mount = (fields: Record<string, unknown> = {}) =>
    page.evaluate(`window.mount(${JSON.stringify(fields)}).then(() => {})`);
  const read = (): Promise<Read> => page.evaluate("window.read()");
  const drag = (
    type: string,
    names: string[] | null,
    target?: string,
  ): Promise<{ prevented: boolean; effect: string }> =>
    page.evaluate(
      `window.drag(${JSON.stringify(type)}, ${JSON.stringify(names)}, ${JSON.stringify(target)})`,
    );
  // A user's drag of the files on disk named onto the zone's center, through the browser's own
  // drag path: entered, moved over, then dropped, or left when drop is false. Resolves to what the
  // document heard of the dragover and the drop.
  const dragFiles = async (
    names: string[],
    { drop = true }: { drop?: boolean } = {},
  ): Promise<Drag[]> => {
    const { x, y }: { x: number; y: number } = await page.evaluate(`(() => {
      const rect = window.part(".zone").getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + 8 };
    })()`);
    const data = {
      items: [],
      files: names.map((name) => join(files, name)),
      dragOperationsMask: 1,
    };
    for (const type of ["dragEnter", "dragOver", drop ? "drop" : "dragCancel"]) {
      await page.cdp("Input.dispatchDragEvent", { type, x, y, data });
    }
    return page.evaluate("window.drags");
  };
  // A key pressed and released on the focused element.
  const press = async (key: string, keyCode: number, text?: string) => {
    const event = { key, code: key, windowsVirtualKeyCode: keyCode };
    await page.cdp("Input.dispatchKeyEvent", {
      type: "keyDown",
      ...event,
      ...(text ? { text, unmodifiedText: text } : {}),
    });
    await page.cdp("Input.dispatchKeyEvent", { type: "keyUp", ...event });
  };
  // Focuses the picker button, then presses Enter, as the keyboard opens the picker; resolves to
  // the picker's event, or null when none opens within the wait.
  const openPicker = async () => {
    // Page.fileChooserOpened's parameters, the two the cases read.
    const opened = new Promise<{ mode: string; backendNodeId: number }>((resolve) =>
      page.on("Page.fileChooserOpened", resolve),
    );
    await page.evaluate("window.part('.pick').focus()");
    await press("Enter", 13, "\r");
    return Promise.race([
      opened,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 500)),
    ]);
  };

  const uploads = [
    {
      id: "u-1",
      name: "quarterly-report.pdf",
      size: 4_600_000,
      sent: 1_200_000,
      state: "uploading",
    },
    { id: "d-1", name: "brand-guide.pdf", size: 2_400_000, sent: 2_400_000, state: "done" },
    {
      id: "f-1",
      name: "scan-0042.tiff",
      size: 88_000_000,
      sent: 31_000_000,
      state: "failed",
      message: "The connection closed.",
    },
    { id: "c-1", name: "draft-v3.docx", size: 940_000, sent: 410_000, state: "cancelled" },
  ];

  beforeEach(() => mount());

  test("Enter on the picker button opens the native picker, several files at a time, and the files chosen go out as an array", async () => {
    const opened = await openPicker();
    assert.ok(opened, "the picker opened");
    assert.equal(opened.mode, "selectMultiple");
    await page.cdp("DOM.setFileInputFiles", {
      files: [join(files, "notes.txt"), join(files, "figure.png")],
      backendNodeId: opened.backendNodeId,
    });
    const shown = await read();
    assert.deepEqual(shown.sent, ["files-select"]);
    assert.deepEqual(shown.heard, [
      {
        type: "files-select",
        detail: {
          array: true,
          files: [
            ["notes.txt", 6],
            ["figure.png", 1536],
          ],
        },
        bubbles: true,
        composed: true,
      },
    ]);
    assert.equal(shown.focused, "pick", "focus stays on the picker button");
    // The input clears once its files go out, so the same file chosen again goes out again.
    assert.equal(await page.evaluate("window.part('input').files.length"), 0);
  });

  test("files dropped on the zone go out as an array, and the drop is never the browser's", async () => {
    // Entering the zone fires a dragover too, so the document hears one or more, then the drop.
    const drags = await dragFiles(["notes.txt", "figure.png"]);
    assert.deepEqual(drags.at(-1), { type: "drop", prevented: true, effect: "copy" });
    assert.ok(drags.length > 1, "dragovers before the drop");
    for (const over of drags.slice(0, -1)) {
      assert.deepEqual(over, { type: "dragover", prevented: true, effect: "copy" });
    }
    const shown = await read();
    assert.deepEqual(shown.sent, ["files-select"]);
    assert.deepEqual(shown.heard, [
      {
        type: "files-select",
        detail: {
          array: true,
          files: [
            ["notes.txt", 6],
            ["figure.png", 1536],
          ],
        },
        bubbles: true,
        composed: true,
      },
    ]);
    assert.equal(shown.over, false, "the drop clears the mark");
  });

  test("a user's drag of files marks the zone until it moves off it", async () => {
    // Entered and moved over, the drag still on the zone; then moved off it, below the dropzone,
    // and ended there without a drop.
    const { x, y }: { x: number; y: number } = await page.evaluate(`(() => {
      const rect = window.part(".zone").getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + 8 };
    })()`);
    const data = { items: [], files: [join(files, "notes.txt")], dragOperationsMask: 1 };
    await page.cdp("Input.dispatchDragEvent", { type: "dragEnter", x, y, data });
    await page.cdp("Input.dispatchDragEvent", { type: "dragOver", x, y, data });
    assert.equal((await read()).over, true, "over the zone");
    const below: number = await page.evaluate(
      `document.querySelector("sl-upload-dropzone").getBoundingClientRect().bottom + 40`,
    );
    await page.cdp("Input.dispatchDragEvent", { type: "dragOver", x, y: below, data });
    const shown = await read();
    assert.deepEqual([shown.over, shown.heard], [false, []], "moved off the zone");
    await page.cdp("Input.dispatchDragEvent", { type: "dragCancel", x, y: below, data });
  });

  test("a drag of files marks the zone, kept across its children, and leaving or dropping clears it", async () => {
    assert.equal((await read()).over, false);
    await drag("dragenter", ["a.txt"]);
    assert.equal((await read()).over, true, "entered");
    // Moving onto the button enters it before leaving the zone's own box: the mark holds.
    await drag("dragenter", ["a.txt"], ".pick");
    await drag("dragleave", ["a.txt"], ".zone");
    assert.equal((await read()).over, true, "over a child");
    await drag("dragleave", ["a.txt"], ".pick");
    assert.equal((await read()).over, false, "left");
    await drag("dragenter", ["a.txt"]);
    await drag("drop", ["a.txt"]);
    assert.equal((await read()).over, false, "dropped");
  });

  test("a drag that carries no files leaves the zone unmarked and the browser's", async () => {
    const entered = await drag("dragenter", null);
    const over = await drag("dragover", null);
    const shown = await read();
    assert.deepEqual([entered.prevented, over.prevented, shown.over], [false, false, false]);
    const dropped = await drag("drop", null);
    assert.equal(dropped.prevented, false);
    assert.deepEqual((await read()).heard, []);
  });

  test("disabled refuses a drop and the picker, never marks the zone, and reflects", async () => {
    await mount({ disabled: true });
    const shown = await read();
    assert.deepEqual([shown.disabled, shown.pickDisabled, shown.inputDisabled], [true, true, true]);
    await drag("dragenter", ["a.txt"]);
    assert.equal((await read()).over, false, "a drag does not mark it");
    const drags = await dragFiles(["notes.txt"]);
    assert.deepEqual(
      drags.find(({ type }) => type === "dragover"),
      { type: "dragover", prevented: true, effect: "none" },
      "the pointer shows a refusal",
    );
    // A drop that arrives anyway is taken from the browser, so it never opens the file, and sent
    // nowhere.
    const dropped = await drag("drop", ["a.txt"]);
    assert.equal(dropped.prevented, true, "a refused drop never opens the file");
    assert.deepEqual((await read()).heard, [], "a refused drop sends nothing");
    assert.equal(await openPicker(), null, "the picker does not open");
    // A click on the button, or a change on the input holding a file, sends nothing either.
    await page.evaluate(`(() => {
      window.part(".pick").click();
      const input = window.part("input");
      const transfer = new DataTransfer();
      transfer.items.add(new File(["x"], "a.txt"));
      input.files = transfer.files;
      input.dispatchEvent(new Event("change"));
    })()`);
    const after = await read();
    assert.deepEqual([after.sent, after.heard], [[], []]);
    // Enabled again, the attribute goes, and a drop goes out.
    await page.evaluate(`document.querySelector("sl-upload-dropzone").disabled = false`);
    assert.equal((await read()).disabled, false);
    await drag("drop", ["a.txt"]);
    assert.deepEqual((await read()).sent, ["files-select"]);
  });

  test("accept is the picker's; a drop is not filtered by it", async () => {
    assert.equal((await read()).accept, null, "no accept by default");
    await mount({ accept: ".pdf,application/pdf" });
    const shown = await read();
    assert.deepEqual([shown.accept, shown.multiple], [".pdf,application/pdf", true]);
    await drag("drop", ["figure.png"]);
    assert.deepEqual(
      (await read()).heard.map(({ detail }) => detail.files),
      [[["figure.png", 10]]],
    );
  });

  test("each upload shows its name and formatted size; an uploading one its bar and bytes sent, a finished one its label", async () => {
    await mount({ uploads });
    assert.deepEqual((await read()).uploads, [
      {
        id: "u-1",
        name: "quarterly-report.pdf",
        title: "quarterly-report.pdf",
        state: null,
        bytes: "1.2 MB of 4.6 MB",
        message: null,
        progress: [1_200_000, 4_600_000, "Uploading quarterly-report.pdf"],
        cancel: "Cancel quarterly-report.pdf",
      },
      {
        id: "d-1",
        name: "brand-guide.pdf",
        title: "brand-guide.pdf",
        state: "Done",
        bytes: "2.4 MB",
        message: null,
        progress: null,
        cancel: null,
      },
      {
        id: "f-1",
        name: "scan-0042.tiff",
        title: "scan-0042.tiff",
        state: "Failed",
        bytes: "88 MB",
        message: "The connection closed.",
        progress: null,
        cancel: null,
      },
      {
        id: "c-1",
        name: "draft-v3.docx",
        title: "draft-v3.docx",
        state: "Cancelled",
        bytes: "940 kB",
        message: null,
        progress: null,
        cancel: null,
      },
    ]);
  });

  test("progress follows sent, held between 0 and the size", async () => {
    const at = async (sent: number) => {
      await mount({ uploads: [{ ...uploads[0], size: 18_400, sent }] });
      const [shown] = (await read()).uploads;
      return [shown.progress?.[0], shown.progress?.[1], shown.bytes];
    };
    assert.deepEqual(await at(0), [0, 18_400, "0 bytes of 18.4 kB"]);
    assert.deepEqual(await at(6_300), [6_300, 18_400, "6.3 kB of 18.4 kB"]);
    assert.deepEqual(await at(18_400), [18_400, 18_400, "18.4 kB of 18.4 kB"]);
    assert.deepEqual(await at(99_999), [18_400, 18_400, "18.4 kB of 18.4 kB"]);
    assert.deepEqual(await at(-5), [0, 18_400, "0 bytes of 18.4 kB"]);
  });

  test("an uploading item's cancel control sends upload-cancel with its id, bubbling and composed; no other item has one", async () => {
    await mount({ uploads });
    const buttons: string[] = await page.evaluate(
      `[...document.querySelector("sl-upload-dropzone").shadowRoot.querySelectorAll(".upload button")]
        .map((button) => button.closest(".upload").dataset.id)`,
    );
    assert.deepEqual(buttons, ["u-1"]);
    await page.evaluate(`window.part(".upload button").click()`);
    const shown = await read();
    assert.deepEqual(shown.sent, ["upload-cancel"]);
    assert.deepEqual(shown.heard, [
      { type: "upload-cancel", detail: { id: "u-1" }, bubbles: true, composed: true },
    ]);
  });

  test("the cancel control is reached by Tab after the picker button and activated by the keyboard", async () => {
    await mount({ uploads: [uploads[0]] });
    await page.evaluate("window.part('.pick').focus()");
    await press("Tab", 9);
    assert.equal((await read()).focused, "cancel");
    await press("Enter", 13, "\r");
    assert.deepEqual(
      (await read()).heard.map(({ type, detail }) => [type, detail]),
      [["upload-cancel", { id: "u-1" }]],
    );
  });

  test("neither progress nor a change of state moves an upload's rows", async () => {
    // One upload at 20rem, its name long enough to be cut short, measured as it advances and then
    // as it finishes each way: the item's height, the name's box, and the bar's.
    // A missing bar's box is undefined, which JSON leaves out.
    const measure = async (
      upload: Record<string, unknown>,
    ): Promise<{ height: number; name: number[]; bar?: number[]; cut: boolean }> => {
      await mount({ uploads: [upload] });
      return page.evaluate(`(() => {
        const dropzone = document.querySelector("sl-upload-dropzone");
        dropzone.style.inlineSize = "20rem";
        const item = window.part(".upload");
        const box = (part) => {
          const rect = part?.getBoundingClientRect();
          return rect && [rect.left, rect.top, rect.width, rect.height].map(Math.round);
        };
        return {
          height: Math.round(item.getBoundingClientRect().height),
          name: box(item.querySelector(".name")).slice(0, 2).concat(box(item.querySelector(".name"))[3]),
          bar: box(item.querySelector("progress")),
          cut: item.querySelector(".name").scrollWidth > item.querySelector(".name").clientWidth,
        };
      })()`);
    };
    const long = {
      id: "l-1",
      name: "run-01J9X4R7Q2M8ZK3T5V6W-extraction-output-with-a-long-name.jsonl",
      size: 27_300_000,
      state: "uploading",
    };
    const steps: Awaited<ReturnType<typeof measure>>[] = [];
    for (const sent of [0, 950, 9_100, 910_000, 9_100_000, 27_300_000]) {
      steps.push(await measure({ ...long, sent }));
    }
    for (const step of steps) {
      assert.ok(step.cut, "the long name is cut short");
      assert.deepEqual(step, steps[0], "as progress advances");
    }
    for (const state of ["done", "cancelled", "failed"]) {
      const finished = await measure({ ...long, sent: 27_300_000, state, message: "Refused." });
      assert.equal(finished.height, steps[0].height, `${state}: the item's height`);
      assert.deepEqual(finished.name, steps[0].name, `${state}: the name's place and height`);
    }
  });

  test("an upload's detail sits under its name at its start; a label is centered on the item, a bar spans it", async () => {
    // Every state at 20rem and at 40rem. Each item's detail line starts where its name does,
    // below it; a finished item's label ends the item, centered on its two lines; an uploading
    // item's cancel control ends the name's line, and under it the bar runs from the name's start
    // to its bytes, which end the item.
    await mount({ uploads });
    for (const width of ["20rem", "40rem"]) {
      const items: {
        id: string;
        item: Edges;
        name: Edges;
        detail: Edges;
        bytes: Edges;
        bar: Edges | null;
        gap: number;
        end: Edges;
      }[] = await page.evaluate(`(() => {
        const dropzone = document.querySelector("sl-upload-dropzone");
        dropzone.style.inlineSize = ${JSON.stringify(width)};
        const edges = (element) => {
          const { left, right, top, bottom } = element.getBoundingClientRect();
          return { left, right, top, bottom };
        };
        return [...dropzone.shadowRoot.querySelectorAll(".upload")].map((item) => {
          const style = getComputedStyle(item);
          const outer = edges(item);
          const progress = item.querySelector("progress");
          return {
            id: item.dataset.id,
            item: {
              ...outer,
              top: outer.top + parseFloat(style.paddingTop),
              bottom: outer.bottom - parseFloat(style.paddingBottom),
            },
            name: edges(item.querySelector(".name")),
            detail: edges(item.querySelector(".detail")),
            bytes: edges(item.querySelector(".bytes")),
            bar: progress && edges(progress),
            gap: parseFloat(getComputedStyle(item.querySelector(".detail")).columnGap),
            end: edges(item.querySelector(".state, .cancel")),
          };
        });
      })()`);
      assert.equal(items.length, 4, `${width}: the items`);
      for (const { id, item, name, detail, bytes, bar, gap, end } of items) {
        const where = `${id} at ${width}`;
        const near = (a: number, b: number, what: string) =>
          assert.ok(Math.abs(a - b) <= 1, `${where}: ${what}, ${a} and ${b}`);
        near(detail.left, name.left, "the detail line's start and the name's");
        assert.ok(detail.top >= name.bottom - 0.5, `${where}: the detail line below the name`);
        near(end.right, item.right, "the trailing cell's end and the item's");
        if (bar) {
          near(bar.left, name.left, "the bar's start and the name's");
          near(bytes.right, item.right, "the bytes' end and the item's");
          near(
            bytes.left - bar.right,
            gap,
            "the gap between the bar and the bytes, and the line's",
          );
          assert.ok(end.bottom <= detail.top + 0.5, `${where}: the control on the name's line`);
        } else {
          near(bytes.left, name.left, "the size's start and the name's");
          near(
            (end.top + end.bottom) / 2,
            (item.top + item.bottom) / 2,
            "the label's middle and the item's",
          );
        }
      }
    }
  });

  test("the dropzone sends no event as its properties change", async () => {
    await page.evaluate(`(async () => {
      const dropzone = document.querySelector("sl-upload-dropzone");
      dropzone.uploads = ${JSON.stringify(uploads)};
      await dropzone.updateComplete;
      dropzone.accept = "image/*";
      dropzone.disabled = true;
      await dropzone.updateComplete;
      dropzone.uploads = [];
      dropzone.disabled = false;
      await dropzone.updateComplete;
    })()`);
    assert.deepEqual((await read()).sent, []);
  });
});
