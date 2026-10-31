// The components probe: renders the pagination holding one entry per fixture item, drives it
// through its contract alone, and reports every case as a line.
// From spike-html-packages-components (4c0a5d8): test/browser/support/probe.js.

import { continued, directories, files, pageSizes } from "../../../demo/documents.js";

/** @import { EntryItem } from "../../../dist/entry.js" */
/** @import { Page } from "../../../demo/documents.js" */

/**
 * The pagination's contract, as the probe reaches it.
 *
 * @typedef {HTMLElement & {
 *   page: number | null;
 *   size: number | null;
 *   total: number | null;
 *   more: boolean;
 *   pageSizes: number[] | null;
 *   disabled: boolean;
 * }} PaginationElement
 */

/** @typedef {HTMLElement & { item: EntryItem | null }} EntryElement */
/** @typedef {{ name: string; actual: string; ok: boolean }} Case */
/** @typedef {HTMLButtonElement | HTMLInputElement | HTMLSelectElement} FormControl */

/**
 * The three compositions every case reads: the directories, page 2 of 3; the files, with a pending
 * one and a slotted label; and the files continued by cursor, with no page and no total.
 *
 * @typedef {{
 *   listing: PaginationElement;
 *   filed: PaginationElement;
 *   cursor: PaginationElement;
 * }} Compositions
 */

/** The composition's two tags, and the import that defines them from dist/. */
export const version = {
  pagination: "sl-pagination",
  entry: "sl-entry",
  load: () =>
    Promise.all([import("../../../dist/pagination.js"), import("../../../dist/entry.js")]),
};

/** The events the probe hears, as they bubble to the document. */
const eventTypes = ["page-change", "page-size-change", "open"];

/** Lets pending updates land: Lit renders in a microtask queued when a property changes. */
export const settle = () => Promise.resolve();

/** @param {Element} element */
const renderRoot = (element) => element.shadowRoot ?? element;

/**
 * The text a reader sees: text nodes in rendered order, through shadow roots and slots, with
 * whitespace collapsed. Each element's text stands apart from its neighbors' but a wbr's, a break
 * opportunity inside a word, which adds no space.
 *
 * @param {Node} node
 * @returns {string}
 */
function renderedText(node) {
  /** @param {Node} n @returns {string} */
  const text = (n) => {
    if (n instanceof Text) return n.data;
    if (!(n instanceof Element) || n instanceof HTMLStyleElement || n.localName === "wbr")
      return "";
    const assigned = n instanceof HTMLSlotElement ? n.assignedNodes() : [];
    const children = assigned.length ? assigned : (n.shadowRoot ?? n).childNodes;
    return ` ${Array.from(children, text).join("")} `;
  };
  return text(node).replace(/\s+/g, " ").trim();
}

/**
 * The element, or an error naming what didn't render.
 *
 * @template T
 * @param {T | null} element
 * @param {string} what
 * @returns {T}
 */
function found(element, what) {
  if (element === null) throw new Error(`no ${what} rendered`);
  return element;
}

/**
 * The pagination's control with the aria-label.
 *
 * @template {HTMLElement} T
 * @param {Element} pagination
 * @param {string} label
 * @returns {T}
 */
function labelled(pagination, label) {
  const selector = `[aria-label="${label}"]`;
  return found(/** @type {T | null} */ (renderRoot(pagination).querySelector(selector)), selector);
}

/** The pagination's own controls and entries. */
const parts = {
  /** @param {Element} pagination @returns {FormControl[]} */
  controls: (pagination) =>
    Array.from(
      /** @type {NodeListOf<FormControl>} */ (
        renderRoot(pagination).querySelectorAll("button, select, input")
      ),
    ).filter((element) => !element.closest(version.entry)),
  /** @param {Element} pagination @returns {HTMLButtonElement} */
  prev: (pagination) => labelled(pagination, "Previous page"),
  /** @param {Element} pagination @returns {HTMLButtonElement} */
  next: (pagination) => labelled(pagination, "Next page"),
  /** @param {Element} pagination @returns {HTMLInputElement} */
  pageInput: (pagination) => labelled(pagination, "Page number"),
  /** @param {Element} pagination */
  sizeSelect: (pagination) =>
    found(renderRoot(pagination).querySelector("select"), "the page size select"),
  /** The label around the page size select, as a reader sees it, without the options. */
  sizeLabel: (/** @type {Element} */ pagination) => {
    const select = parts.sizeSelect(pagination);
    const label = found(select.closest("label"), "the size label");
    return renderedText(label).replace(renderedText(select), "").trim();
  },
  /** @param {Element} pagination @returns {EntryElement[]} */
  entries: (pagination) => Array.from(pagination.querySelectorAll(version.entry)),
  /** @param {EntryElement} entry */
  opener: (entry) => found(renderRoot(entry).querySelector("button"), "the entry's button"),
};

/**
 * Builds a composition from a page of the fixture, setting every property before the definition.
 *
 * @param {Page<EntryItem>} page
 * @param {string} [label]
 */
function compose(page, label) {
  const pagination = /** @type {PaginationElement} */ (document.createElement(version.pagination));
  pagination.page = page.page ?? null;
  pagination.size = page.size;
  pagination.total = page.total ?? null;
  pagination.more = page.more;
  pagination.pageSizes = pageSizes;
  if (label !== undefined) {
    const slotted = document.createElement("span");
    slotted.slot = "label";
    slotted.textContent = label;
    pagination.append(slotted);
  }
  for (const item of page.items) {
    const entry = /** @type {EntryElement} */ (document.createElement(version.entry));
    entry.item = item;
    pagination.append(entry);
  }
  return pagination;
}

/** Collects the cases, each compared with what it must be. */
class Report {
  /** @type {Case[]} */
  cases = [];

  /**
   * A case whose actual value must equal `expected`.
   *
   * @param {string} name
   * @param {string} actual
   * @param {string} expected
   */
  equal(name, actual, expected) {
    this.cases.push({ name, actual, ok: actual === expected });
  }

  /**
   * A case on rendered text, which must hold every one of `has` and none of `lacks`.
   *
   * @param {string} name
   * @param {Element} element
   * @param {string[]} has
   * @param {string[]} [lacks]
   */
  text(name, element, has, lacks = []) {
    const actual = renderedText(element);
    const ok = has.every((s) => actual.includes(s)) && !lacks.some((s) => actual.includes(s));
    this.cases.push({ name, actual, ok });
  }

  /**
   * A case on the events an action sends, as they reach the document, or "none".
   *
   * @param {string} name
   * @param {string} expected
   * @param {() => void} act
   */
  async events(name, expected, act) {
    /** @type {string[]} */
    const heard = [];
    /** @param {Event} e */
    const hear = (e) =>
      heard.push(`${e.type} ${JSON.stringify(/** @type {CustomEvent} */ (e).detail)}`);
    for (const type of eventTypes) document.addEventListener(type, hear);
    act();
    await settle();
    for (const type of eventTypes) document.removeEventListener(type, hear);
    this.equal(`event ${name}`, heard.join("; ") || "none", expected);
  }
}

/**
 * Sets a control's value as a reader would, and sends the change it makes.
 *
 * @param {HTMLInputElement | HTMLSelectElement} control
 * @param {string} value
 */
function change(control, value) {
  control.value = value;
  control.dispatchEvent(new Event("change", { bubbles: true }));
}

/**
 * An event as the report writes it.
 *
 * @param {string} type
 * @param {unknown} detail
 */
const heard = (type, detail) => `${type} ${JSON.stringify(detail)}`;

/**
 * What each composition renders: the entries, the summary, and the label.
 *
 * @param {Report} report
 * @param {Compositions} compositions
 */
function renderCases(report, { listing, filed, cursor }) {
  report.text("text directories", listing, [
    "Showing 4–6 of 8",
    "designs active directory",
    "invoices active directory",
    "legal active directory",
    "Page Size 3 6 12",
    "/ 3",
  ]);
  report.text("text files", filed, [
    "Showing 1–3 of 5",
    "brand-guide.pdf available file 2.4 MB application/pdf",
    "notes.md available file 18.4 kB text/markdown",
    "storefront.png pending file image/png",
    "Files per page 3 6 12",
  ]);
  report.text(
    "text cursor",
    cursor,
    [
      "nda-2026.pdf available file 96.4 kB",
      "retainer.docx available file 41.2 kB application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "terms.md available file",
    ],
    ["Showing", "/ "],
  );
  report.text(
    "text pending file",
    parts.entries(filed)[2],
    ["storefront.png pending"],
    ["byte", "kB", "MB"],
  );
  report.equal(
    "summary with a total",
    /Showing \S+ of \d+/.exec(renderedText(listing))?.[0] ?? "absent",
    "Showing 4–6 of 8",
  );
  report.equal(
    "summary without a total",
    /Showing/.test(renderedText(cursor)) ? "present" : "absent",
    "absent",
  );
  report.equal("label default", parts.sizeLabel(listing), "Page Size");
  report.equal("label slotted", parts.sizeLabel(filed), "Files per page");
}

/**
 * A control's painted look, from its computed style.
 *
 * @param {Element} element
 */
function look(element) {
  const style = getComputedStyle(element);
  const border = `${style.borderTopWidth} ${style.borderTopStyle} ${style.borderTopColor}`;
  const padding = [style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft];
  return [
    `background ${style.backgroundColor}`,
    `color ${style.color}`,
    `border ${border}`,
    `padding ${padding.join(" ")}`,
    `font ${style.fontFamily} ${style.fontSize}`,
  ].join(", ");
}

/**
 * The look the page's baseline gives a bare control of the same tag and type, at the font size
 * the control's parent computes, which its reset's `font: inherit` reads.
 *
 * @param {FormControl} control
 */
function baselineLook(control) {
  const parent = control.parentElement ?? /** @type {ShadowRoot} */ (control.getRootNode()).host;
  const holder = document.createElement("div");
  holder.style.fontSize = getComputedStyle(parent).fontSize;
  const reference = document.createElement(control.localName);
  if (control instanceof HTMLInputElement) reference.setAttribute("type", control.type);
  holder.append(reference);
  document.body.append(holder);
  const expected = look(reference);
  holder.remove();
  return expected;
}

/**
 * The controls are bare, painted by the adopted baseline alone.
 *
 * @param {Report} report
 * @param {Compositions} compositions
 */
function lookCase(report, { listing }) {
  /** @type {[string, FormControl][]} */
  const controls = [
    ["next", parts.next(listing)],
    ["select", parts.sizeSelect(listing)],
    ["input", parts.pageInput(listing)],
    ["entry", parts.opener(parts.entries(listing)[0])],
  ];
  const ok = controls.every(([, control]) => look(control) === baselineLook(control));
  const actual = controls.map(([name, control]) => `${name} ${look(control)}`).join("; ");
  report.cases.push({ name: "controls painted by the baseline", actual, ok });
}

/**
 * The entry with the longest content type stays inside its box.
 *
 * @param {Report} report
 * @param {Compositions} compositions
 */
function overflowCase(report, { cursor }) {
  /** @param {EntryElement} entry */
  const typeOf = (entry) =>
    entry.item !== null && "content_type" in entry.item ? entry.item.content_type : "";
  const entry = parts
    .entries(cursor)
    .reduce((longest, e) => (typeOf(e).length > typeOf(longest).length ? e : longest));
  const button = parts.opener(entry);
  /** @param {Element} inner @param {Element} outer */
  const within = (inner, outer) => {
    const a = inner.getBoundingClientRect();
    const b = outer.getBoundingClientRect();
    return a.left >= b.left - 0.5 && a.right <= b.right + 0.5;
  };
  /** @param {Element} element */
  const fits = (element) => element.scrollWidth <= element.clientWidth;
  const overflowing = [
    ...(within(entry, cursor) ? [] : ["the entry past the pagination"]),
    ...(within(button, entry) ? [] : ["the button past the entry"]),
    ...(fits(button)
      ? []
      : [`the button's content, ${button.scrollWidth} > ${button.clientWidth}`]),
    // Every part the eye sees: the kind, visually hidden, is a pixel clipped to nothing, so its
    // text overflows its box by design.
    ...Array.from(button.querySelectorAll(":not(.kind)"))
      .filter((part) => !within(part, button) || !fits(part))
      .map((part) => `its ${part.localName} "${renderedText(part)}"`),
  ];
  const fit = overflowing.length ? `overflows: ${overflowing.join(", ")}` : "fits";
  report.cases.push({
    name: "longest content type inside its entry",
    actual: `${typeOf(entry)}: ${fit}`,
    ok: !overflowing.length,
  });
}

/**
 * The events each control sends; the element never changes its own page.
 *
 * @param {Report} report
 * @param {Compositions} compositions
 */
async function eventCases(report, { listing, filed, cursor }) {
  await report.events("prev", heard("page-change", { page: 1 }), () => parts.prev(listing).click());
  await report.events("next", heard("page-change", { page: 3 }), () => parts.next(listing).click());
  await report.events("clamp 99", heard("page-change", { page: 3 }), () =>
    change(parts.pageInput(listing), "99"),
  );
  await report.events("clamp -4", heard("page-change", { page: 1 }), () =>
    change(parts.pageInput(listing), "-4"),
  );
  await report.events("size change", heard("page-size-change", { size: 6 }), () =>
    change(parts.sizeSelect(listing), "6"),
  );
  const [directory] = parts.entries(listing);
  await report.events(
    "open directory",
    `open {"id":"${directories.items[0].id}","kind":"directory"}`,
    () => parts.opener(directory).click(),
  );
  const pending = parts.entries(filed)[2];
  await report.events("open file", `open {"id":"${files.items[2].id}","kind":"file"}`, () =>
    parts.opener(pending).click(),
  );
  await report.events("cursor next", heard("page-change", { page: null }), () =>
    parts.next(cursor).click(),
  );
  report.equal("page kept after the events", String(listing.page), "2");
}

/**
 * Lit's attribute conversion, and the properties set before the definition.
 *
 * @param {Report} report
 * @param {Compositions} compositions
 */
function contractCases(report, { listing }) {
  const fresh = /** @type {PaginationElement} */ (document.createElement(version.pagination));
  fresh.setAttribute("total", "8");
  const counted = fresh.total;
  fresh.removeAttribute("total");
  report.equal("contract number attribute removed", `${counted} -> ${fresh.total}`, "8 -> null");

  fresh.setAttribute("page-sizes", "[5, 10]");
  const parsed = JSON.stringify(fresh.pageSizes);
  fresh.setAttribute("page-sizes", "[5, 10");
  report.equal(
    "contract invalid page-sizes JSON",
    `${parsed} -> ${JSON.stringify(fresh.pageSizes)}`,
    "[5,10] -> null",
  );

  // Read from what renders: a value the element never took in still reads back from its field.
  const sizes = Array.from(parts.sizeSelect(listing).options, (option) => option.value);
  const name = /^(\S+)/.exec(renderedText(parts.entries(listing)[0]))?.[1];
  report.equal(
    "contract properties set before definition",
    `page ${parts.pageInput(listing).value}, sizes ${sizes.join("/")}, first entry ${name}`,
    "page 2, sizes 3/6/12, first entry designs",
  );
}

/**
 * `disabled` reflected both ways, and the cursor page's controls.
 *
 * @param {Report} report
 * @param {Compositions} compositions
 */
async function stateCases(report, { listing, cursor }) {
  /** @param {PaginationElement} pagination */
  const state = (pagination) => {
    const controls = parts.controls(pagination);
    const off = controls.filter((control) => control.disabled).length;
    const attribute = pagination.hasAttribute("disabled");
    const disabled = `${off} of ${controls.length} controls disabled`;
    return `property ${pagination.disabled}, attribute ${attribute}, ${disabled}`;
  };
  const allOff = "property true, attribute true, 4 of 4 controls disabled";

  listing.disabled = true;
  await settle();
  report.equal("disabled property to attribute", state(listing), allOff);
  await report.events("disabled next", "none", () => parts.next(listing).click());
  listing.removeAttribute("disabled");
  await settle();
  report.equal(
    "disabled attribute removed to property",
    state(listing),
    "property false, attribute false, 0 of 4 controls disabled",
  );
  listing.setAttribute("disabled", "");
  await settle();
  report.equal("disabled attribute to property", state(listing), allOff);
  listing.disabled = false;
  await settle();

  /** @param {FormControl} control */
  const shown = (control) => (control.disabled ? "disabled" : "enabled");
  report.equal(
    "cursor page controls",
    [
      `input ${shown(parts.pageInput(cursor))}`,
      `prev ${shown(parts.prev(cursor))}`,
      `next ${shown(parts.next(cursor))}`,
    ].join(", "),
    "input disabled, prev disabled, next enabled",
  );
}

/**
 * Runs every case, rendered into the host.
 *
 * @param {HTMLElement} host
 */
async function probe(host) {
  if (customElements.get(version.pagination) || customElements.get(version.entry)) {
    throw new Error("the elements are defined before the compositions are built");
  }
  /** @type {Compositions} */
  const compositions = {
    listing: compose(directories),
    filed: compose(files, "Files per page"),
    cursor: compose(continued),
  };
  // Narrowed to a preview column's width, it shows whether the longest content type wraps.
  compositions.cursor.style.maxInlineSize = "22rem";
  host.append(compositions.listing, compositions.filed, compositions.cursor);
  await version.load();
  await settle();

  const report = new Report();
  renderCases(report, compositions);
  lookCase(report, compositions);
  overflowCase(report, compositions);
  await eventCases(report, compositions);
  contractCases(report, compositions);
  await stateCases(report, compositions);
  return report.cases;
}

/** Runs the probe in this page, writing a line per case to #report and a verdict to #verdict. */
export async function run() {
  const verdict = found(document.getElementById("verdict"), "#verdict");
  const report = found(document.getElementById("report"), "#report");
  const cases = await probe(found(document.querySelector("main"), "main"));
  report.textContent = cases
    .map(({ name, actual, ok }) => `${ok ? "ok  " : "FAIL"} ${name}: ${actual}`)
    .join("\n");
  const failed = cases.filter((c) => !c.ok).map((c) => c.name);
  verdict.textContent = failed.length
    ? `FAIL: ${failed.join(", ")}`
    : `ok: all ${cases.length} cases hold`;
}
