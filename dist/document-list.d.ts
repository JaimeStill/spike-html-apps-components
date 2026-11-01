import { LitElement } from "lit";
import "./entry.ts";
/** The tag the element defines. */
export declare const tagName = "sl-document-list";
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
export declare class DocumentList extends LitElement {
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
        items: {
            attribute: false;
        };
        selected: {
            type: StringConstructor;
        };
        state: {
            type: StringConstructor;
            reflect: true;
        };
        message: {
            type: StringConstructor;
        };
    };
    /** The page's documents, in the order given. */
    items: readonly DocumentItem[];
    /** The selected document's id, marked in the list; null when none is. */
    selected: string | null;
    /** Loading, error, or ready; reflected to the `state` attribute. */
    state: DocumentListState;
    /** Why the list failed to load, shown in the error state. */
    message: string;
    /** The pagination's page: the page's number, from 1; null on a page continued by cursor. */
    page: number | null;
    /** The pagination's page size. */
    size: number | null;
    /** The pagination's total: the listing's count; null when the read didn't count. */
    total: number | null;
    /** The pagination's more: whether a further page exists. */
    more: boolean;
    /** The pagination's page sizes offered. */
    pageSizes: number[] | null;
    /** The pagination's disabled: disables its controls; reflected to the `disabled` attribute. */
    disabled: boolean;
    constructor();
    render(): import("lit").TemplateResult<1>;
}
declare global {
    interface HTMLElementTagNameMap {
        "sl-document-list": DocumentList;
    }
}
