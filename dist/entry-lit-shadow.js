// Entry, Lit with a shadow root: one directory or file of a document hierarchy, as a button.
// Adapted from spike-html-packages-components (4c0a5d8): src/entry-lit-shadow.ts, renamed.
import { html, LitElement, nothing } from "lit";
import elements from "@jaimestill/spike-html-apps-foundation/baseline/elements.css" with { type: "css" };
import reset from "@jaimestill/spike-html-apps-foundation/baseline/reset.css" with { type: "css" };
import { define, emit } from "@jaimestill/spike-html-apps-foundation/dom.js";
import styles from "./entry-shadow.css" with { type: "css" };
/** The tag this version defines. */
export const tagName = "sl-entry-lit-shadow";
// One formatter per unit, built once: sizes step by 1000, as the SI units Intl names do.
const sizeUnits = ["byte", "kilobyte", "megabyte", "gigabyte"].map((unit) => new Intl.NumberFormat(undefined, {
    style: "unit",
    unit,
    unitDisplay: "short",
    maximumFractionDigits: 1,
}));
const updatedTime = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });
/** Whether the item is a directory or a file: only a file has a content type. */
function kindOf(item) {
    return "content_type" in item ? "file" : "directory";
}
/** A byte count in the largest unit that keeps it at 1 or more. */
function formatSize(bytes) {
    const step = Math.min(Math.floor(Math.log10(Math.max(bytes, 1)) / 3), sizeUnits.length - 1);
    return sizeUnits[step].format(bytes / 1000 ** step);
}
/**
 * Shows one entry: its kind, name, and status; a file's size, absent while it is pending, and
 * content type; and when it was last updated. Activating it sends `open` with its id and kind.
 */
export class EntryLitShadow extends LitElement {
    static styles = [reset, elements, styles];
    static properties = {
        item: { attribute: false },
    };
    constructor() {
        super();
        this.item = null;
    }
    #open() {
        if (this.item !== null) {
            emit(this, "open", { id: this.item.id, kind: kindOf(this.item) });
        }
    }
    render() {
        const item = this.item;
        if (item === null)
            return nothing;
        const file = "content_type" in item ? item : null;
        return html `
      <button type="button" class="entry" @click=${this.#open}>
        <span class="kind">${kindOf(item)}</span>
        <span class="name">${item.name}</span>
        <span class="status">${item.status}</span>
        <span class="meta">
          ${file && file.size !== null
            ? html `<span class="size">${formatSize(file.size)}</span>`
            : nothing}
          ${file ? html `<span class="type">${file.content_type}</span>` : nothing}
          <time datetime=${item.updated_at}>${updatedTime.format(new Date(item.updated_at))}</time>
        </span>
      </button>
    `;
    }
}
define(tagName, EntryLitShadow);
