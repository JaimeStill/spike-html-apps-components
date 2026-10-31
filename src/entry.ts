// Entry, Lit with a shadow root: one directory or file of a document hierarchy, as a button.
// Adapted from spike-html-packages-components (4c0a5d8): src/entry-lit-shadow.ts, renamed, its
// size and time formatted by the foundation's formatBytes and formatDateTime, its name and status
// in a head, the row entry.css wraps, its kind kept for assistive technology alone, its content
// type breakable at its punctuation, its time's date and clock in spans, and its frame marked when
// selected.

import { html, LitElement, nothing, type PropertyDeclarations } from "lit";

import elements from "@jaimestill/spike-html-apps-foundation/baseline/elements.css" with { type: "css" };
import reset from "@jaimestill/spike-html-apps-foundation/baseline/reset.css" with { type: "css" };
import { define, emit } from "@jaimestill/spike-html-apps-foundation/dom.js";
import {
  formatBytes,
  formatDate,
  formatDateTime,
} from "@jaimestill/spike-html-apps-foundation/format.js";
import styles from "./entry.css" with { type: "css" };

/** The tag the element defines. */
export const tagName = "sl-entry";

/** The fields of a directory the entry renders; a go-web-service Directory fits it. */
export interface DirectoryItem {
  id: string;
  name: string;
  status: string;
  updated_at: string;
}

/**
 * The fields of a file the entry renders; a go-web-service File fits it. `size` is null until
 * the file's write completes.
 */
export interface FileItem extends DirectoryItem {
  size: number | null;
  content_type: string;
}

/** What the entry shows: a directory, or a file, told apart by its `content_type`. */
export type EntryItem = DirectoryItem | FileItem;

/** `open`'s detail: the entry's id and kind. */
export interface OpenDetail {
  id: string;
  kind: "directory" | "file";
}

/** Whether the item is a directory or a file: only a file has a content type. */
function kindOf(item: EntryItem): OpenDetail["kind"] {
  return "content_type" in item ? "file" : "directory";
}

/**
 * A content type with a break opportunity, a wbr, after each slash, dot, hyphen, and plus, so a
 * type too long for its line, "application/vnd.openxmlformats-officedocument…", breaks between its
 * parts, never inside one, unless a part alone is wider than the line. Each wbr is aria-hidden:
 * Chrome's accessibility tree reads a wbr as a space, so the button's accessible name would say
 * "text/ plain"; hidden, it adds nothing to the name, which carries the type whole, and the break
 * it offers the eye stays.
 */
function renderType(contentType: string) {
  const parts = contentType.split(/(?<=[/.+-])/);
  return parts.map((part, i) => (i === 0 ? part : html`<wbr aria-hidden="true" />${part}`));
}

/**
 * The entry's time, formatDateTime's text, as its date and its clock with the locale's text
 * between, each in a span: entry.css keeps the clock whole and breaks the date only at its spaces,
 * so a narrow line breaks between them and never inside "4:41 PM". A locale that doesn't write the
 * date first and the clock last gets the whole text, unsplit.
 */
function renderTime(updatedAt: string) {
  const date = new Date(updatedAt);
  const whole = formatDateTime(date);
  const day = formatDate(date);
  const clock = formatDateTime(date, undefined, { dateStyle: undefined });
  const split =
    whole.length > day.length + clock.length && whole.startsWith(day) && whole.endsWith(clock);
  const between = whole.slice(day.length, -clock.length);
  return html`<time datetime=${updatedAt}
    >${
      split
        ? html`<span class="date">${day}</span>${between}<span class="clock">${clock}</span>`
        : whole
    }</time
  >`;
}

/**
 * Shows one entry: its name, the primary text, and its status, a quiet label at the line's end;
 * then a quiet meta line of a file's size, absent while it is pending, and content type, and when
 * it was last updated, so a directory's meta is its time alone. Its kind, "file" or "directory",
 * shows nowhere, since the meta already tells the two apart to the eye: it sits visually hidden
 * between the head and the meta, so the button's accessible name, which a screen reader reads
 * once and in order, still says which it is, after the status. Activating it sends `open` with its
 * id and kind. `selected` frames the entry's button in the interaction color, a mark to the eye
 * only: the consumer that selects it says so to assistive technology, as sl-document-list does
 * with aria-current on its item.
 */
export class Entry extends LitElement {
  static styles = [reset, elements, styles];

  static properties = {
    item: { attribute: false },
    selected: { type: Boolean, reflect: true },
  } satisfies PropertyDeclarations;

  /** The directory or file shown; nothing renders while it is null. */
  declare item: EntryItem | null;
  /** Frames the entry as the selected one; reflected to the `selected` attribute. */
  declare selected: boolean;

  constructor() {
    super();
    this.item = null;
    this.selected = false;
  }

  #open(): void {
    if (this.item !== null) {
      emit<OpenDetail>(this, "open", { id: this.item.id, kind: kindOf(this.item) });
    }
  }

  render() {
    const item = this.item;
    if (item === null) return nothing;
    const file = "content_type" in item ? item : null;
    return html`
      <button type="button" class="entry" @click=${this.#open}>
        <span class="head">
          <span class="name">${item.name}</span>
          <span class="status">${item.status}</span>
        </span>
        <span class="kind">${kindOf(item)}</span>
        <span class="meta">
          ${
            file && file.size !== null
              ? html`<span class="size">${formatBytes(file.size)}</span>`
              : nothing
          }
          ${file ? html`<span class="type">${renderType(file.content_type)}</span>` : nothing}
          ${renderTime(item.updated_at)}
        </span>
      </button>
    `;
  }
}

define(tagName, Entry);

declare global {
  interface HTMLElementTagNameMap {
    "sl-entry": Entry;
  }
}
