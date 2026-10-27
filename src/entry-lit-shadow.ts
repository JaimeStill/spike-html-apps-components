// Entry, Lit with a shadow root: one directory or file of a document hierarchy, as a button.
// Adapted from spike-html-packages-components (4c0a5d8): src/entry-lit-shadow.ts, renamed, its
// size and time formatted by the foundation's formatBytes and formatDateTime, and its name and
// status in a head, the row entry-shadow.css wraps.

import { html, LitElement, nothing, type PropertyDeclarations } from "lit";

import elements from "@jaimestill/spike-html-apps-foundation/baseline/elements.css" with { type: "css" };
import reset from "@jaimestill/spike-html-apps-foundation/baseline/reset.css" with { type: "css" };
import { define, emit } from "@jaimestill/spike-html-apps-foundation/dom.js";
import { formatBytes, formatDateTime } from "@jaimestill/spike-html-apps-foundation/format.js";
import styles from "./entry-shadow.css" with { type: "css" };

/** The tag this version defines. */
export const tagName = "sl-entry-lit-shadow";

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
 * Shows one entry: its kind, name, and status; a file's size, absent while it is pending, and
 * content type; and when it was last updated. Activating it sends `open` with its id and kind.
 */
export class EntryLitShadow extends LitElement {
  static styles = [reset, elements, styles];

  static properties = {
    item: { attribute: false },
  } satisfies PropertyDeclarations;

  /** The directory or file shown; nothing renders while it is null. */
  declare item: EntryItem | null;

  constructor() {
    super();
    this.item = null;
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
        <span class="kind">${kindOf(item)}</span>
        <span class="head">
          <span class="name">${item.name}</span>
          <span class="status">${item.status}</span>
        </span>
        <span class="meta">
          ${
            file && file.size !== null
              ? html`<span class="size">${formatBytes(file.size)}</span>`
              : nothing
          }
          ${file ? html`<span class="type">${file.content_type}</span>` : nothing}
          <time datetime=${item.updated_at}>${formatDateTime(new Date(item.updated_at))}</time>
        </span>
      </button>
    `;
  }
}

define(tagName, EntryLitShadow);

declare global {
  interface HTMLElementTagNameMap {
    "sl-entry-lit-shadow": EntryLitShadow;
  }
}
