// The search results, Lit with a shadow root: a search's matches, each a document's name and the
// snippet around where the query matched, the query's occurrences marked, under a status line
// that says where the search stands. Each match is a native button that sends `open` with its
// document's id. The match is a structural shape of its own, which a search API's match fits as
// it is; the component knows no SDK and no domain. It binds no key.

import { html, LitElement, nothing, type PropertyDeclarations, type PropertyValues } from "lit";
import { repeat } from "lit/directives/repeat.js";

import elements from "@jaimestill/spike-html-apps-foundation/baseline/elements.css" with { type: "css" };
import reset from "@jaimestill/spike-html-apps-foundation/baseline/reset.css" with { type: "css" };
import { define, emit } from "@jaimestill/spike-html-apps-foundation/dom.js";
import styles from "./search-results.css" with { type: "css" };

/** The tag the element defines. */
export const tagName = "sl-search-results";

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

/** The field labels, which say in words where each match was found. */
const fields: Record<MatchField, string> = {
  name: "in name",
  content: "in content",
};

/**
 * The query as the results mark it: trimmed, its runs of whitespace one space each, as a snippet's
 * are, and split into code points. A blank query is empty, and marks nothing.
 */
function needleOf(query: string): string[] {
  return Array.from((query ?? "").trim().replace(/\s+/g, " "));
}

/**
 * Whether two code points are one letter but for case: the same, or the same in lower case or in
 * upper case. Each is compared alone, so a code point whose case mapping is longer, "İ" lowered to
 * "i̇" or "ß" raised to "SS", matches only what maps to the same; "ß" matches "ẞ" but never "ss".
 * This is the rune-by-rune case folding a search by Unicode simple folding does, near enough to
 * mark what such a search matched.
 */
function sameLetter(a: string, b: string): boolean {
  return a === b || a.toLowerCase() === b.toLowerCase() || a.toUpperCase() === b.toUpperCase();
}

/**
 * The text with each occurrence of the needle, case-insensitively and left to right, in a `mark`:
 * a list of strings and mark templates, which Lit renders as text nodes and elements, so markup in
 * the text or the query shows as text. It compares code point by code point on the text as given,
 * never on a lowered copy, so each mark's offsets are the text's own even where a letter's other
 * case is longer, and nothing in the query is a pattern. An empty needle marks nothing.
 */
function withMarks(text: string, needle: readonly string[]): unknown {
  if (!needle.length) return text;
  const letters = Array.from(text ?? "");
  const parts: unknown[] = [];
  let plain = 0;
  for (let at = 0; at + needle.length <= letters.length;) {
    if (needle.every((letter, offset) => sameLetter(letters[at + offset], letter))) {
      if (at > plain) parts.push(letters.slice(plain, at).join(""));
      parts.push(html`<mark>${letters.slice(at, at + needle.length).join("")}</mark>`);
      at += needle.length;
      plain = at;
    } else {
      at++;
    }
  }
  if (plain < letters.length) parts.push(letters.slice(plain).join(""));
  return parts;
}

/**
 * The snippet with each end's ellipsis joined to the text beside it by a word joiner (U+2060), so
 * a line never breaks after a leading ellipsis or before a trailing one: a narrow line leaves no
 * ellipsis alone on it.
 */
function joined(snippet: string): string {
  return (snippet ?? "")
    .replace(/^\u2026(?=.)/u, "\u2026\u2060")
    .replace(/(?<=.)\u2026$/u, "\u2060\u2026");
}

/**
 * Whether a match's snippet only repeats its name: a match in the name, whose snippet, its
 * ellipses and its whitespace runs aside, is the name or a stretch of it. The name shows whole and
 * marked, so such a snippet adds nothing.
 */
function repeatsName(match: SearchMatch): boolean {
  if (match.field !== "name") return false;
  const collapse = (text: string) => text.trim().replace(/\s+/g, " ");
  const core = collapse((match.snippet ?? "").replace(/^…|…$/g, ""));
  return collapse(match.name ?? "").includes(core);
}

/**
 * A count of matches in words: "1 match", "3 matches"; or, when the search found more than are
 * shown, the shown of the total, "96 of 140 matches".
 */
function count(shown: number, total: number): string {
  if (total > shown) return `${shown} of ${total} matches`;
  return `${shown} ${shown === 1 ? "match" : "matches"}`;
}

/**
 * Shows a search's matches under its status line. The status line says where the search stands:
 * a prompt before any query, searching, the count of matches for the query, no matches for it, or
 * that the search failed, with `message` saying why. Each match is a button, as wide as the
 * results: its document's name, with the field it matched in at the line's end, and under them the
 * snippet around the match; a match in the name whose snippet only repeats the name shows the
 * name alone. The query's occurrences in the name and the snippet are marked, case-insensitively.
 * Activating a match sends `open` with its id. A paged search sets `total`, how many match in all,
 * and the count says how many of them are shown.
 *
 * The status line is the results' one live region, polite, and stays in place across every
 * state, so each change of its text is read: a count once the matches arrive, a failure's reason.
 * While loading, matches already given stay listed, marked busy, so the list doesn't empty and
 * refill as a query is typed; an error shows none.
 *
 * The marks are those of the query the shown matches answer, which is not always `query`: a
 * consumer searching anew sets the new query, then `loading`, in one update or in two, the status
 * line saying what it searches for, while the last query's matches stay listed until the new ones
 * arrive. Those keep the marks of the query they were set with, since the new query's would mark
 * what the search never matched. So the marks take `query` as it is when `items` is set, in the
 * same update or before it; a `query` set alone re-marks nothing. A consumer sets the query, the
 * state, and the matches as it learns them, as before, and needs no second query property; one
 * that filters the matches shown by a new query sets them again with it.
 */
export class SearchResults extends LitElement {
  static styles = [reset, elements, styles];

  static properties = {
    query: { type: String },
    items: { attribute: false },
    total: { type: Number },
    state: { type: String, reflect: true },
    message: { type: String },
  } satisfies PropertyDeclarations;

  /** The query searched for: the status line's words, and the marks of the matches set with it. */
  declare query: string;
  /** The matches to list, in the order given. Named items, since an element's `matches` is the
   * DOM's selector test. */
  declare items: readonly SearchMatch[];
  /** How many match in all, when the search found more than `items` holds, as a paged search's
   * first page; unset, or no more than the matches given, the count is theirs. */
  declare total: number | undefined;
  /** Loading, error, or ready; reflected to the `state` attribute. */
  declare state: SearchState;
  /** Why the search failed, shown in the error state. */
  declare message: string;

  constructor() {
    super();
    this.query = "";
    this.items = [];
    this.state = "ready";
    this.message = "";
  }

  /** The query the shown matches answer, `query` as it was when they were set: their marks'. */
  #answered = "";

  protected override willUpdate(changed: PropertyValues<this>) {
    if (changed.has("items")) this.#answered = this.query;
  }

  #open(match: SearchMatch): void {
    emit<SearchOpenDetail>(this, "open", { id: match.id });
  }

  // The status line's content, by the state, the query, and the matches.
  #status(query: string, matches: readonly SearchMatch[]) {
    const quoted = `“${query}”`;
    switch (this.state) {
      case "loading":
        return html`<span class="label">${query ? `Searching for ${quoted}…` : "Searching…"}</span>`;
      case "error":
        return html`<strong class="label">Couldn't search.</strong>
          ${this.message ? html`<span class="detail">${this.message}</span>` : nothing}`;
    }
    // A total that isn't a number, as an attribute that doesn't parse, is none.
    const total = typeof this.total === "number" && this.total > matches.length ? this.total : 0;
    if (matches.length || total) {
      return html`<span class="label">${count(matches.length, total)}${query ? ` for ${quoted}` : ""}</span>`;
    }
    return query
      ? html`<span class="label">No matches for ${quoted}</span>`
      : html`<span class="label prompt">Search document names and content.</span>`;
  }

  #match(match: SearchMatch, needle: readonly string[]) {
    return html`<li>
      <button type="button" class="match" data-field=${match.field} @click=${() => this.#open(match)}>
        <span class="head">
          <span class="name">${withMarks(match.name, needle)}</span>
          <span class="field">${fields[match.field] ?? match.field}</span>
        </span>
        ${repeatsName(match) ? nothing : html`<span class="snippet">${withMarks(joined(match.snippet), needle)}</span>`}
      </button>
    </li>`;
  }

  render() {
    const query = needleOf(this.query).join("");
    const needle = needleOf(this.#answered);
    const matches = this.state === "error" ? [] : (this.items ?? []);
    // Each match is keyed by its id, so a focused match stays with its document as the list
    // changes around it.
    return html`<p class="status ${this.state}" role="status">${this.#status(query, matches)}</p>
      ${
        matches.length
          ? html`<ul class="matches" aria-label="Matches" aria-busy=${this.state === "loading" ? "true" : nothing}>
            ${repeat(
              matches,
              (match) => match.id,
              (match) => this.#match(match, needle),
            )}
          </ul>`
          : nothing
      }`;
  }
}

define(tagName, SearchResults);

declare global {
  interface HTMLElementTagNameMap {
    "sl-search-results": SearchResults;
  }
}
