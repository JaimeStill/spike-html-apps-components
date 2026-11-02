import { LitElement } from "lit";
/** The tag the element defines. */
export declare const tagName = "sl-search-results";
/**
 * Where the search stands: still searching, failed with `message` saying why, or ready, its
 * `items`, its matches, shown.
 */
export type SearchState = "loading" | "error" | "ready";
/** The field a match was found in: the document's name, or its text content. */
export type MatchField = "name" | "content";
/**
 * A match as the results show it: the document's id and name, the field the query matched in, and
 * the snippet of that field's text around the match, an ellipsis (U+2026) at an end it cuts short.
 */
export interface SearchMatch {
    id: string;
    name: string;
    field: MatchField;
    snippet: string;
}
/** `open`'s detail: the id of the matched document to open. */
export interface SearchOpenDetail {
    id: string;
}
/**
 * Shows a search's matches under its status line. The status line says where the search stands:
 * a prompt before any query, searching, the count of matches for the query, no matches for it, or
 * that the search failed, with `message` saying why. Each match is a button, as wide as the
 * results: its document's name, with the field it matched in at the line's end, and under them the
 * snippet around the match; a match in the name whose snippet only repeats the name shows the
 * name alone. The query's occurrences in the name and the snippet are marked, case-insensitively.
 * Activating a match sends `open` with its id.
 *
 * The status line is the results' one live region, polite, and stays in place across every
 * state, so each change of its text is read: a count once the matches arrive, a failure's reason.
 * While loading, matches already given stay listed, marked busy, so the list doesn't empty and
 * refill as a query is typed; an error shows none.
 */
export declare class SearchResults extends LitElement {
    #private;
    static styles: CSSStyleSheet[];
    static properties: {
        query: {
            type: StringConstructor;
        };
        items: {
            attribute: false;
        };
        state: {
            type: StringConstructor;
            reflect: true;
        };
        message: {
            type: StringConstructor;
        };
    };
    /** The query the matches are for: their marks, and the status line's words. */
    query: string;
    /** The matches to list, in the order given. Named items, since an element's `matches` is the
     * DOM's selector test. */
    items: readonly SearchMatch[];
    /** Loading, error, or ready; reflected to the `state` attribute. */
    state: SearchState;
    /** Why the search failed, shown in the error state. */
    message: string;
    constructor();
    render(): import("lit").TemplateResult<1>;
}
declare global {
    interface HTMLElementTagNameMap {
        "sl-search-results": SearchResults;
    }
}
