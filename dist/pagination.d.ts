import { LitElement } from "lit";
/** The tag the element defines. */
export declare const tagName = "sl-pagination";
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
 * The rows a page shows, `first` to `last`, from 1, of `total`: the summary's "Showing X–Y of N".
 * Null when the pagination shows no summary: the total unknown or none, or the page continued by
 * cursor, or no page size.
 */
export declare function summaryRange(page: number | null, size: number | null, total: number | null): {
    first: number;
    last: number;
} | null;
/**
 * Pages through a listing. The host's children, its entries, sit in the default slot between a
 * "Showing X–Y of N" summary and the controls: a page size selector, labelled by the `label` slot
 * ("Page Size" by default), previous and next buttons, and an editable page number clamped to the
 * page count. A child in the `status` slot follows the summary's text on its line, shown only
 * while the summary is (see `summaryRange`). The properties are the envelope's fields; the element never changes its own page,
 * it sends `page-change` and `page-size-change` and the host sets the next page's fields.
 */
export declare class Pagination extends LitElement {
    #private;
    static styles: CSSStyleSheet[];
    static properties: {
        page: {
            type: NumberConstructor;
        };
        size: {
            type: NumberConstructor;
        };
        total: {
            type: NumberConstructor;
        };
        more: {
            type: BooleanConstructor;
        };
        pageSizes: {
            type: ArrayConstructor;
            attribute: string;
        };
        disabled: {
            type: BooleanConstructor;
            reflect: true;
        };
    };
    /** The page's number, from 1; null on a page continued by cursor, which disables the input. */
    page: number | null;
    /** The page size, selected among `pageSizes`. */
    size: number | null;
    /** The listing's row count; null when the read didn't count, and Next then follows `more`. */
    total: number | null;
    /** Whether a further page exists. */
    more: boolean;
    /** The page sizes offered. */
    pageSizes: number[] | null;
    /** Disables every control; reflected to the `disabled` attribute. */
    disabled: boolean;
    constructor();
    /** The number of pages, from the total and the size; null when either is unknown. */
    get pageCount(): number | null;
    render(): import("lit").TemplateResult<1>;
}
declare global {
    interface HTMLElementTagNameMap {
        "sl-pagination": Pagination;
    }
}
