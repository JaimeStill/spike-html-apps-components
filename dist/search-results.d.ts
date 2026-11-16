import { LitElement, type PropertyValues } from "lit";
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
 * Shows a search's matches under its status line. The status line says where the search stands: a
 * prompt before any query is answered, searching, the count of matches for the query they answer,
 * no matches for the query an empty answer was for, or that the search failed, with `message`
 * saying why. Each match is a button, as wide as the results: its document's name, with the field
 * it matched in at the line's end, and under them the snippet around the match; a match in the name
 * whose snippet only repeats the name shows the name alone. The query's occurrences in the name and
 * the snippet are marked, case-insensitively. Activating a match sends `open` with its id. A paged
 * search sets `total`, how many match in all, and the count says how many of them are shown; with
 * no matches shown, the total counts nothing, and the line says there are none, as without it.
 *
 * The status line is the results' one live region, polite, and stays in place across every
 * state, so each change of its text is read: a count once the matches arrive, a failure's reason.
 * While loading, matches already given stay listed, marked busy, so the list doesn't empty and
 * refill as a query is typed; an error shows none.
 *
 * The marks and the ready line's query, a count's or no matches', are those of the query the
 * shown items answer, which is not always `query`: a consumer searching anew sets the new query,
 * then `loading`, in one update or in two, the status line saying what it searches for, while the
 * last query's matches stay listed until the new ones arrive. Those keep the marks of the query
 * they were set with, since the new query's would mark what the search never matched, and their
 * count names that query, not the new one, which they don't answer; an empty answer's "No matches"
 * names the query it answered, not one never searched for. So the marks and the line take `query`
 * as it is when `items` is set, in the same update or before it, and with no query answered the
 * line prompts. A `query` set alone, from idle, after an empty answer, or with matches shown,
 * re-marks nothing and leaves the line as it was, so the live region reads no change in any
 * state. Searching names `query` as it is, since it says what is searched for now. A consumer sets
 * the query, the state, and the matches as it learns them, as before, an empty answer included,
 * and needs no second query property; one that filters the matches shown by a new query sets them
 * again with it.
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
        total: {
            type: NumberConstructor;
        };
        state: {
            type: StringConstructor;
            reflect: true;
        };
        message: {
            type: StringConstructor;
        };
    };
    /** The query searched for: the searching line's words, and the marks and the line's query of
     * the matches set with it. */
    query: string;
    /** The matches to list, in the order given. Named items, since an element's `matches` is the
     * DOM's selector test. */
    items: readonly SearchMatch[];
    /** How many match in all, when the search found more than `items` holds, as a paged search's
     * first page; null, or no more than the matches given, the count is theirs. */
    total: number | null;
    /** Loading, error, or ready; reflected to the `state` attribute. */
    state: SearchState;
    /** Why the search failed, shown in the error state. */
    message: string;
    constructor();
    protected willUpdate(changed: PropertyValues<this>): void;
    render(): import("lit").TemplateResult<1>;
}
declare global {
    interface HTMLElementTagNameMap {
        "sl-search-results": SearchResults;
    }
}
