// Pagination, Lit with a shadow root: a page of entries between its summary and its controls.
// Adapted from spike-html-packages-components (4c0a5d8): src/pagination-lit-shadow.ts, renamed.

import { html, LitElement, nothing, type PropertyDeclarations } from "lit";

import elements from "@jaimestill/spike-html-apps-foundation/baseline/elements.css" with { type: "css" };
import reset from "@jaimestill/spike-html-apps-foundation/baseline/reset.css" with { type: "css" };
import { define, emit } from "@jaimestill/spike-html-apps-foundation/dom.js";
import styles from "./pagination-shadow.css" with { type: "css" };

/** The tag this version defines. */
export const tagName = "sl-pagination-lit-shadow";

/**
 * `page-change`'s detail: the page asked for. It is null when Next is pressed on a page continued
 * by cursor, whose number the element doesn't know; the host follows the envelope's `next`.
 */
export interface PageChangeDetail {
  page: number | null;
}

/** `page-size-change`'s detail: the page size chosen. */
export interface PageSizeChangeDetail {
  size: number;
}

/**
 * Pages through a listing. The host's children, its entries, sit in the default slot between a
 * "Showing X–Y of N" summary and the controls: a page size selector, labelled by the `label` slot
 * ("Page Size" by default), previous and next buttons, and an editable page number clamped to the
 * page count. The properties are the envelope's fields; the element never changes its own page,
 * it sends `page-change` and `page-size-change` and the host sets the next page's fields.
 */
export class PaginationLitShadow extends LitElement {
  static styles = [reset, elements, styles];

  // Lit reads the reactive properties from this static map, in place of decorators. Each field is
  // `declare`d, so the class emits no field to shadow Lit's accessor, and given its default in
  // the constructor. Lit's converters give the attribute contract: a removed number attribute is
  // null, and page-sizes is parsed as JSON, null when it isn't valid.
  static properties = {
    page: { type: Number },
    size: { type: Number },
    total: { type: Number },
    more: { type: Boolean },
    pageSizes: { type: Array, attribute: "page-sizes" },
    disabled: { type: Boolean, reflect: true },
  } satisfies PropertyDeclarations;

  /** The page's number, from 1; null on a page continued by cursor, which disables the input. */
  declare page: number | null;
  /** The page size, selected among `pageSizes`. */
  declare size: number | null;
  /** The listing's row count; null when the read didn't count, and Next then follows `more`. */
  declare total: number | null;
  /** Whether a further page exists. */
  declare more: boolean;
  /** The page sizes offered. */
  declare pageSizes: number[] | null;
  /** Disables every control; reflected to the `disabled` attribute. */
  declare disabled: boolean;

  constructor() {
    super();
    this.page = 1;
    this.size = 12;
    this.total = null;
    this.more = false;
    this.pageSizes = [12, 24, 48, 96];
    this.disabled = false;
  }

  /** The number of pages, from the total and the size; null when either is unknown. */
  get pageCount(): number | null {
    if (this.total === null || !this.size) return null;
    return Math.max(1, Math.ceil(this.total / this.size));
  }

  get #hasPrev(): boolean {
    return this.page !== null && this.page > 1;
  }

  get #hasNext(): boolean {
    const count = this.pageCount;
    if (count === null) return this.more;
    return this.page !== null && this.page < count;
  }

  #handlePrev(): void {
    if (this.page !== null && this.#hasPrev) {
      emit<PageChangeDetail>(this, "page-change", { page: this.page - 1 });
    }
  }

  #handleNext(): void {
    if (this.#hasNext) {
      emit<PageChangeDetail>(this, "page-change", {
        page: this.page === null ? null : this.page + 1,
      });
    }
  }

  #handleSizeChange(e: Event): void {
    const size = Number((e.target as HTMLSelectElement).value);
    emit<PageSizeChangeDetail>(this, "page-size-change", { size });
  }

  // Clamps the typed number to 1..pageCount (no upper bound while the count is unknown) and asks
  // for that page if it differs. The input goes back to the current page either way: it shows
  // `page` until the host sets another.
  #handlePageInput(e: Event): void {
    const input = e.target as HTMLInputElement;
    const typed = input.valueAsNumber;
    if (this.page === null) return;
    input.value = String(this.page);
    if (!Number.isFinite(typed)) return;

    const clamped = Math.min(Math.max(Math.trunc(typed), 1), this.pageCount ?? Infinity);
    if (clamped !== this.page) {
      emit<PageChangeDetail>(this, "page-change", { page: clamped });
    }
  }

  #handlePageFocus(e: FocusEvent): void {
    (e.target as HTMLInputElement).select();
  }

  #renderSummary() {
    const { page, size, total } = this;
    if (total === null || total <= 0 || page === null || !size) return nothing;
    const first = Math.min((page - 1) * size + 1, total);
    const last = Math.min(page * size, total);
    return html`<p class="summary">Showing ${first}–${last} of ${total}</p>`;
  }

  render() {
    const count = this.pageCount;
    return html`
      ${this.#renderSummary()}
      <slot></slot>
      <div class="pagination">
        <label class="page-size">
          <span class="page-size-label"><slot name="label">Page Size</slot></span>
          <select ?disabled=${this.disabled} @change=${this.#handleSizeChange}>
            ${(this.pageSizes ?? []).map(
              (n) => html`<option value=${n} ?selected=${n === this.size}>${n}</option>`,
            )}
          </select>
        </label>
        <div class="page-controls">
          <button
            type="button"
            class="page-step"
            aria-label="Previous page"
            ?disabled=${this.disabled || !this.#hasPrev}
            @click=${this.#handlePrev}
          >
            ‹
          </button>
          <span class="page-indicator">
            <input
              class="page-input"
              type="number"
              min="1"
              max=${count ?? nothing}
              step="1"
              .value=${this.page === null ? "" : String(this.page)}
              ?disabled=${this.disabled || this.page === null || count === 1}
              aria-label="Page number"
              @change=${this.#handlePageInput}
              @focus=${this.#handlePageFocus}
            />
            ${count === null ? nothing : html`<span aria-hidden="true">/ ${count}</span>`}
          </span>
          <button
            type="button"
            class="page-step"
            aria-label="Next page"
            ?disabled=${this.disabled || !this.#hasNext}
            @click=${this.#handleNext}
          >
            ›
          </button>
        </div>
      </div>
    `;
  }
}

define(tagName, PaginationLitShadow);

declare global {
  interface HTMLElementTagNameMap {
    "sl-pagination-lit-shadow": PaginationLitShadow;
  }
}
