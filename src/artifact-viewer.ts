// The artifact viewer, Lit with a shadow root: one artifact's content, by its content type, as
// rendered Markdown, JSON formatted from its own tokens, or preformatted text, in a region that
// scrolls.

import { html, LitElement, nothing, type PropertyDeclarations, type PropertyValues } from "lit";

import elements from "@jaimestill/spike-html-apps-foundation/baseline/elements.css" with { type: "css" };
import reset from "@jaimestill/spike-html-apps-foundation/baseline/reset.css" with { type: "css" };
import { define } from "@jaimestill/spike-html-apps-foundation/dom.js";
import { formatJson } from "./json.ts";
import { markdown } from "./markdown.ts";
import styles from "./artifact-viewer.css" with { type: "css" };

/** The tag the element defines. */
export const tagName = "sl-artifact-viewer";

/**
 * Where the viewer's content stands: still loading, failed to load with `message` saying why, or
 * ready, its `content` shown by its `contentType`.
 */
export type ArtifactState = "loading" | "error" | "ready";

/** How a content type shows: which of the viewer's views takes it. */
export type ArtifactView = "markdown" | "json" | "text" | "unsupported";

/**
 * The view a content type shows in. Only the type and subtype count, read without case and
 * without parameters, so `Text/Markdown; charset=utf-8` is Markdown: text/markdown renders as
 * Markdown; application/json, or any type whose subtype ends in +json, as JSON; any other text/
 * type as preformatted text; and anything else, an empty type included, is unsupported.
 */
export function viewOf(contentType: string): ArtifactView {
  const essence = contentType.split(";", 1)[0].trim().toLowerCase();
  if (essence === "text/markdown") return "markdown";
  if (essence === "application/json" || /^[^/]+\/[^/]+\+json$/.test(essence)) return "json";
  if (/^text\/[^/]+$/.test(essence)) return "text";
  return "unsupported";
}

/** JSON content as shown: formatted from its tokens, or, when it doesn't parse, the parser's
 * reason. */
type Json = { ok: true; text: string } | { ok: false; reason: string };

// JSON.parse decides validity alone, and its value is thrown away: printing the value would move
// integer-like keys first, rewrite numbers, and drop duplicate keys, so the text shown is the
// content's own tokens, re-indented by formatJson.
function pretty(content: string): Json {
  try {
    JSON.parse(content);
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) };
  }
  return { ok: true, text: formatJson(content) };
}

/**
 * Shows one artifact: a header of its name and content type over its content, or, with
 * `noHeader`, its content alone, for a page that already shows the name and type in a header of
 * its own. Markdown renders through `markdown()`; valid JSON is formatted from its own tokens by
 * `formatJson()`, two spaces an indent, so its keys, their order, duplicates, numbers, and
 * strings show as written, never parsed and printed again; and other text is shown as it is; JSON that doesn't parse shows its raw text under a
 * note saying so, a type that isn't text shows a note in place of its bytes, and empty content a
 * note saying so. Long content scrolls inside the viewer, in a region the keyboard reaches. In
 * every state, header or not, one region named `<name> content` holds what the viewer shows: the
 * scrolling region, which the invalid JSON's note describes, or the frame around a note alone.
 * Display-only: it sends no event.
 */
export class ArtifactViewer extends LitElement {
  static styles = [reset, elements, styles];

  static properties = {
    name: { type: String },
    contentType: { type: String, attribute: "content-type" },
    content: { type: String },
    state: { type: String, reflect: true },
    message: { type: String },
    // A boolean attribute is true by its presence, so the option names the departure from the
    // default, the header shown, as the platform's novalidate and nomodule do.
    noHeader: { type: Boolean, reflect: true, attribute: "no-header" },
  } satisfies PropertyDeclarations;

  /** The artifact's name, shown in the viewer's header, and naming its content's region. */
  declare name: string;
  /** The artifact's media type, parameters allowed; it chooses the view. */
  declare contentType: string;
  /** The artifact's content, as text. */
  declare content: string;
  /** Loading, error, or ready; reflected to the `state` attribute. */
  declare state: ArtifactState;
  /** Why the content failed to load, shown in the error state. */
  declare message: string;
  /** Leaves out the header, so the content shows alone; its region keeps its name. */
  declare noHeader: boolean;

  // The JSON view's text, parsed once per content and type rather than on every render.
  #json: Json | null = null;

  constructor() {
    super();
    this.name = "";
    this.contentType = "";
    this.content = "";
    this.state = "ready";
    this.message = "";
    this.noHeader = false;
  }

  willUpdate(changed: PropertyValues<this>): void {
    if (changed.has("content") || changed.has("contentType")) {
      this.#json = viewOf(this.contentType) === "json" ? pretty(this.content ?? "") : null;
    }
  }

  // The name of the one region each state shows, the ready content's and every note's alike, so
  // the state is tied to its artifact with the header left out as with it shown.
  get #label(): string {
    return `${this.name || "Artifact"} content`;
  }

  // The scrolling region: the keyboard reaches it by Tab, so arrow and page keys scroll it, and
  // it is named for the artifact; a note over it, the invalid JSON's, describes it by its id. Its
  // one child is the content it scrolls, padded, so the padding scrolls with the content and
  // shows at its far edges.
  #region(content: unknown, markdownView = false, describedBy: string | typeof nothing = nothing) {
    return markdownView
      ? html`<div class="body markdown" tabindex="0" role="region" aria-label=${this.#label}>
          <div class="document">${content}</div>
        </div>`
      : html`<pre
          class="body"
          tabindex="0"
          role="region"
          aria-label=${this.#label}
          aria-describedby=${describedBy}
        ><span class="content">${content}</span></pre>`;
  }

  // A state that shows a note alone: the frame around it is the region named for the artifact,
  // as the scrolling region is in the states that show content, so no region nests in another.
  #alone(note: unknown) {
    return html`<div class="frame" role="region" aria-label=${this.#label}>${note}</div>`;
  }

  // A note: its label, and its detail below. Its kind is its class and its id, which the invalid
  // JSON's region is described by.
  #note(kind: string, label: string, detail: string | typeof nothing = nothing) {
    return html`<p class="note ${kind}" id=${kind} role=${kind === "loading" ? "status" : nothing}>
      <strong class="label">${label}</strong>
      ${detail === nothing ? nothing : html`<span class="detail">${detail}</span>`}
    </p>`;
  }

  // The frame: a note alone, a region, or the invalid JSON note over its raw text's region. A
  // supported type's empty content shows a note, before JSON's parse could call it invalid, so
  // the frame never stands empty.
  #frame() {
    switch (this.state) {
      case "loading":
        return this.#alone(this.#note("loading", "Loading…"));
      case "error":
        return this.#alone(
          this.#note("error", "Couldn't load this artifact.", this.message || nothing),
        );
    }
    const content = this.content ?? "";
    const view = viewOf(this.contentType);
    if (view === "unsupported") {
      return this.#alone(
        this.#note(
          "unsupported",
          "This content type can't be shown.",
          this.contentType ? `${this.contentType} isn't text.` : "It has no content type.",
        ),
      );
    }
    if (content === "") return this.#alone(this.#note("empty", "This artifact is empty."));
    switch (view) {
      case "markdown":
        return html`<div class="frame">${this.#region(markdown(content), true)}</div>`;
      case "json": {
        const json = this.#json ?? pretty(content);
        if (json.ok) return html`<div class="frame">${this.#region(json.text)}</div>`;
        return html`<div class="frame">
          ${this.#note("invalid", "Invalid JSON, shown as text.", json.reason)}
          ${this.#region(content, false, "invalid")}
        </div>`;
      }
      default:
        return html`<div class="frame">${this.#region(content)}</div>`;
    }
  }

  render() {
    const header =
      !this.noHeader && (this.name || this.contentType)
        ? html`<header class="header">
            ${this.name ? html`<span class="name">${this.name}</span>` : nothing}
            ${this.contentType ? html`<span class="type">${this.contentType}</span>` : nothing}
          </header>`
        : nothing;
    return html`${header}${this.#frame()}`;
  }
}

define(tagName, ArtifactViewer);

declare global {
  interface HTMLElementTagNameMap {
    "sl-artifact-viewer": ArtifactViewer;
  }
}
