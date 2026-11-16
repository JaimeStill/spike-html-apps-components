// Pagination, Lit with a shadow root: a page of entries between its summary and its controls.
// Adapted from spike-html-packages-components (4c0a5d8): src/pagination-lit-shadow.ts, renamed.
import { html, LitElement, nothing } from "lit";
import elements from "@jaimestill/spike-html-apps-foundation/baseline/elements.css" with { type: "css" };
import reset from "@jaimestill/spike-html-apps-foundation/baseline/reset.css" with { type: "css" };
import { define, emit } from "@jaimestill/spike-html-apps-foundation/dom.js";
import styles from "./pagination.css" with { type: "css" };
/** The tag the element defines. */
export const tagName = "sl-pagination";
/**
 * The rows a page shows, `first` to `last`, from 1, of `total`: the summary's "Showing X–Y of N".
 * Null when the pagination shows no summary: the total unknown or none, or the page continued by
 * cursor, or no page size.
 */
export function summaryRange(page, size, total) {
    if (total === null || total <= 0 || page === null || !size)
        return null;
    return { first: Math.min((page - 1) * size + 1, total), last: Math.min(page * size, total) };
}
/**
 * Pages through a listing. The host's children, its entries, sit in the default slot between a
 * "Showing X–Y of N" summary and the controls: a page size selector, labelled by the `label` slot
 * ("Page Size" by default), previous and next buttons, and an editable page number clamped to the
 * page count. A child in the `status` slot follows the summary's text on its line, shown only
 * while the summary is (see `summaryRange`). The properties are the envelope's fields; the element never changes its own page,
 * it sends `page-change` and `page-size-change` and the host sets the next page's fields.
 */
export class Pagination extends LitElement {
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
    };
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
    get pageCount() {
        if (this.total === null || !this.size)
            return null;
        return Math.max(1, Math.ceil(this.total / this.size));
    }
    get #hasPrev() {
        return this.page !== null && this.page > 1;
    }
    get #hasNext() {
        const count = this.pageCount;
        if (count === null)
            return this.more;
        return this.page !== null && this.page < count;
    }
    #handlePrev() {
        if (this.page !== null && this.#hasPrev) {
            emit(this, "page-change", { page: this.page - 1 });
        }
    }
    #handleNext() {
        if (this.#hasNext) {
            emit(this, "page-change", {
                page: this.page === null ? null : this.page + 1,
            });
        }
    }
    #handleSizeChange(e) {
        const size = Number(e.target.value);
        emit(this, "page-size-change", { size });
    }
    // Clamps the typed number to 1..pageCount (no upper bound while the count is unknown) and asks
    // for that page if it differs. The input goes back to the current page either way: it shows
    // `page` until the host sets another.
    #handlePageInput(e) {
        const input = e.target;
        const typed = input.valueAsNumber;
        if (this.page === null)
            return;
        input.value = String(this.page);
        if (!Number.isFinite(typed))
            return;
        const clamped = Math.min(Math.max(Math.trunc(typed), 1), this.pageCount ?? Infinity);
        if (clamped !== this.page) {
            emit(this, "page-change", { page: clamped });
        }
    }
    #handlePageFocus(e) {
        e.target.select();
    }
    // The summary's line, its text and then the status slot's content, as one run of text that
    // wraps as a paragraph does.
    #renderSummary() {
        const range = summaryRange(this.page, this.size, this.total);
        if (range === null)
            return nothing;
        const { first, last } = range;
        return html `<p class="summary">Showing ${first}–${last} of ${this.total}<slot name="status"></slot></p>`;
    }
    render() {
        const count = this.pageCount;
        return html `
      ${this.#renderSummary()}
      <slot></slot>
      <div class="pagination">
        <label class="page-size">
          <span class="page-size-label"><slot name="label">Page Size</slot></span>
          <select ?disabled=${this.disabled} @change=${this.#handleSizeChange}>
            ${(this.pageSizes ?? []).map((n) => html `<option value=${n} ?selected=${n === this.size}>${n}</option>`)}
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
            ${count === null ? nothing : html `<span aria-hidden="true">/ ${count}</span>`}
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
define(tagName, Pagination);
