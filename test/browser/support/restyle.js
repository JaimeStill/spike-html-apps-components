// The restyle case: one edit to the elements sheet repaints the buttons in both components' shadow
// roots, since a CSS module script is one CSSStyleSheet per document.
// Adapted from spike-html-packages-components (4c0a5d8): test/browser/support/restyle.js, renamed.

import elements from "@jaimestill/spike-html-apps-foundation/baseline/elements.css" with { type: "css" };
import { directories } from "../../../demo/documents.js";
import { settle, version } from "./probe.js";

/** @import { EntryItem } from "../../../dist/entry.js" */

/** The background the edit gives every button: a color no source sets. */
const edited = "rgb(1, 2, 3)";

/** Adds a button rule at the end of the sheet's foundation.elements block, so it wins. */
function edit() {
  const layer = Array.from(elements.cssRules).find(
    (rule) => rule instanceof CSSLayerBlockRule && rule.name === "foundation.elements",
  );
  if (!(layer instanceof CSSLayerBlockRule)) throw new Error("no foundation.elements block");
  layer.insertRule(`:where(button) { background-color: ${edited}; }`, layer.cssRules.length);
}

/** A background value as the page computes it. @param {string} background */
function computed(background) {
  const swatch = document.createElement("div");
  swatch.style.setProperty("background", background);
  document.body.append(swatch);
  const value = getComputedStyle(swatch).backgroundColor;
  swatch.remove();
  return value;
}

/** Each button's background, any transition finished. @param {HTMLButtonElement[]} buttons */
const backgrounds = (buttons) =>
  buttons.map((button) => {
    for (const animation of button.getAnimations()) animation.finish();
    return getComputedStyle(button).backgroundColor;
  });

/** Renders a pagination holding one entry, edits the sheet, and writes the verdict to #verdict. */
export async function run() {
  const pagination = document.createElement(version.pagination);
  const entry = /** @type {HTMLElement & { item: EntryItem }} */ (
    document.createElement(version.entry)
  );
  Object.assign(pagination, { page: 2, size: 3, total: 8 });
  entry.item = directories.items[0];
  pagination.append(entry);
  document.querySelector("main")?.append(pagination);
  await version.load();
  await settle();

  const buttons = [
    pagination.shadowRoot?.querySelector('[aria-label="Next page"]'),
    entry.shadowRoot?.querySelector("button"),
  ];
  if (!buttons.every((button) => button instanceof HTMLButtonElement)) {
    throw new Error("a button didn't render in a shadow root");
  }
  // A var() with no token computes to transparent, rgba(0, 0, 0, 0): an opaque rgb() shows the
  // tokens loaded.
  const expected = computed("var(--bg-2)");
  const before = backgrounds(buttons);
  edit();
  const after = backgrounds(buttons);

  const ok =
    expected.startsWith("rgb(") &&
    before.every((value) => value === expected) &&
    after.every((value) => value === edited);
  const line = `pagination ${before[0]} -> ${after[0]}, entry ${before[1]} -> ${after[1]}`;
  const verdict = document.getElementById("verdict");
  if (verdict) verdict.textContent = `${ok ? "ok" : "FAIL"}: ${line}`;
}
