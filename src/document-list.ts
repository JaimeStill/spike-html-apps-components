// The document list, Lit with a shadow root: a page of documents, composed of the components that
// already show each part. Each document is an sl-entry, and the page is an sl-pagination, whose
// default slot holds the list between its summary and its controls; the list adds only what
// neither has, the selected document's mark and the list's loading, error, and empty states. Its
// document is a structural shape of its own, which a document API's document fits once its run's
// status is beside it; the component knows no SDK and no domain. It binds no key.
//
// The composed parts send their own events: an entry's `open`, and the pagination's `page-change`
// and `page-size-change`, each dispatched bubbling and composed by the foundation's emit, so each
// crosses the part's shadow root and this one and reaches the list's listener as it was sent, its
// detail the part's own. The list re-dispatches none of them, which would send each twice.

import { html, LitElement, nothing, type PropertyDeclarations } from "lit";
import { repeat } from "lit/directives/repeat.js";

import elements from "@jaimestill/spike-html-apps-foundation/baseline/elements.css" with { type: "css" };
import reset from "@jaimestill/spike-html-apps-foundation/baseline/reset.css" with { type: "css" };
import { define } from "@jaimestill/spike-html-apps-foundation/dom.js";
import "./entry.ts";
import type { FileItem } from "./entry.ts";
import { summaryRange } from "./pagination.ts";
import styles from "./document-list.css" with { type: "css" };

/** The tag the element defines. */
export const tagName = "sl-document-list";

/**
 * Where the list stands: still loading, failed with `message` saying why, or ready, its `items`
 * shown, or its empty message when there are none.
 */
export type DocumentListState = "loading" | "error" | "ready";

/**
 * A document as the list shows it: its id, name, content type, and size in bytes, as its upload
 * declared them; when it was accepted, an RFC 3339 string; and a status, the state of the run its
 * upload started. An API's document fits it with its run's status set beside it; its other fields,
 * the run's id among them, the list ignores.
 */
export interface DocumentItem {
  id: string;
  name: string;
  content_type: string;
  size: number;
  created_at: string;
  status: string;
}

/**
 * The entry's file for a document: the same fields, its acceptance time as the time the entry
 * shows. Each document maps once, while the app holds it, so an entry is handed the same item
 * across renders and updates only when its document changes.
 */
const entryItems = new WeakMap<DocumentItem, FileItem>();
function entryItem(item: DocumentItem): FileItem {
  let file = entryItems.get(item);
  if (file === undefined) {
    const { id, name, content_type, size, created_at, status } = item;
    file = { id, name, content_type, size, status, updated_at: created_at };
    entryItems.set(item, file);
  }
  return file;
}

/**
 * Shows a page of documents: an sl-pagination, its summary, its page size, and its steps, around
 * an sl-entry for each document, the selected one marked. The paging properties are the
 * pagination's own, under the same names, handed to it as given; the list never changes its own
 * page. Activating an entry sends the entry's `open`, `{ id, kind }`; paging sends the
 * pagination's `page-change`, `{ page }`, and `page-size-change`, `{ size }`. The host sets
 * `selected` and the next page's fields.
 *
 * A status line, the list's one live region, polite, says the list is loading, that it failed with
 * `message` saying why, or that there are no documents; a ready page of documents leaves it blank.
 * While the pagination shows its summary, the status follows the summary's text on its line, in
 * the pagination's `status` slot, "Showing 1–3 of 8 · Loading documents…", so it takes no line of
 * its own and its text, coming and going, moves neither the entries nor the controls. With no
 * summary to join, and in the error state, it is a line of its own above the entries, a line tall
 * even when blank, for the same reason. While loading, documents already given stay listed, marked
 * busy, so a page change doesn't empty and refill the list; an error lists none.
 */
export class DocumentList extends LitElement {
  static styles = [reset, elements, styles];

  // The paging properties are the pagination's declarations, so each attribute converts as the
  // pagination's does.
  static properties = {
    items: { attribute: false },
    selected: { type: String },
    state: { type: String, reflect: true },
    message: { type: String },
    page: { type: Number },
    size: { type: Number },
    total: { type: Number },
    more: { type: Boolean },
    pageSizes: { type: Array, attribute: "page-sizes" },
    disabled: { type: Boolean, reflect: true },
  } satisfies PropertyDeclarations;

  /** The page's documents, in the order given. */
  declare items: readonly DocumentItem[];
  /** The selected document's id, marked in the list; null when none is. */
  declare selected: string | null;
  /** Loading, error, or ready; reflected to the `state` attribute. */
  declare state: DocumentListState;
  /** Why the list failed to load, shown in the error state. */
  declare message: string;
  /** The pagination's page: the page's number, from 1; null on a page continued by cursor. */
  declare page: number | null;
  /** The pagination's page size. */
  declare size: number | null;
  /** The pagination's total: the listing's count; null when the read didn't count. */
  declare total: number | null;
  /** The pagination's more: whether a further page exists. */
  declare more: boolean;
  /** The pagination's page sizes offered. */
  declare pageSizes: number[] | null;
  /** The pagination's disabled: disables its controls; reflected to the `disabled` attribute. */
  declare disabled: boolean;

  constructor() {
    super();
    this.items = [];
    this.selected = null;
    this.state = "ready";
    this.message = "";
    // The pagination's defaults.
    this.page = 1;
    this.size = 12;
    this.total = null;
    this.more = false;
    this.pageSizes = [12, 24, 48, 96];
    this.disabled = false;
  }

  // The status line's content, by the state and whether any documents are listed.
  #status(documents: readonly DocumentItem[]) {
    switch (this.state) {
      case "loading":
        return html`<span class="label">Loading documents…</span>`;
      case "error":
        return html`<strong class="label">Couldn't load the documents.</strong>
          ${this.message ? html`<span class="detail">${this.message}</span>` : nothing}`;
    }
    return documents.length ? nothing : html`<span class="label empty">No documents.</span>`;
  }

  // An entry per document, in a list item. The selected document's entry draws its own frame in
  // the interaction color, by its selected property, and its item holds aria-current, which says
  // it to assistive technology: the entry's button is inside its own shadow root, out of the
  // list's reach.
  #entry(item: DocumentItem) {
    const selected = item.id === this.selected;
    return html`<li aria-current=${selected ? "true" : nothing}>
      <sl-entry .item=${entryItem(item)} .selected=${selected}></sl-entry>
    </li>`;
  }

  render() {
    const documents = this.state === "error" ? [] : (this.items ?? []);
    // The status joins the summary's line while the pagination shows one, but for an error, which
    // reads as a line of its own. The same element moves between the slots, so the live region is
    // never replaced.
    const joins = this.state !== "error" && summaryRange(this.page, this.size, this.total) !== null;
    // The pagination takes its properties as the list was given them, and holds the status line,
    // in its summary's status slot or its default slot, and the entries, in its default slot. Each entry is keyed by its document's id, so a focused
    // entry stays with its document as the page changes around it.
    return html`<sl-pagination
      .page=${this.page}
      .size=${this.size}
      .total=${this.total}
      .more=${this.more}
      .pageSizes=${this.pageSizes}
      .disabled=${this.disabled}
    >
      <p class="status ${this.state}" role="status" slot=${joins ? "status" : nothing}>${this.#status(documents)}</p>
      ${
        documents.length
          ? html`<ul class="documents" aria-label="Documents" aria-busy=${this.state === "loading" ? "true" : nothing}>
            ${repeat(
              documents,
              (item) => item.id,
              (item) => this.#entry(item),
            )}
          </ul>`
          : nothing
      }
    </sl-pagination>`;
  }
}

define(tagName, DocumentList);

declare global {
  interface HTMLElementTagNameMap {
    "sl-document-list": DocumentList;
  }
}
