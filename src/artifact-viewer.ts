// The artifact viewer, Lit with a shadow root: one artifact's content, by its content type, as
// rendered Markdown, pretty-printed JSON, or preformatted text, in a region that scrolls.

import { html, LitElement, nothing, type PropertyDeclarations, type PropertyValues } from "lit";

import elements from "@jaimestill/spike-html-apps-foundation/baseline/elements.css" with { type: "css" };
import reset from "@jaimestill/spike-html-apps-foundation/baseline/reset.css" with { type: "css" };
import { define } from "@jaimestill/spike-html-apps-foundation/dom.js";
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

/** JSON content as shown: pretty-printed, or, when it doesn't parse, the parser's reason. */
type Json = { ok: true; text: string } | { ok: false; reason: string };

function pretty(content: string): Json {
  try {
    return { ok: true, text: JSON.stringify(JSON.parse(content), null, 2) };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Shows one artifact: its name and content type over its content. Markdown renders through
 * `markdown()`, JSON is parsed and printed with two-space indents, and other text is shown as it
 * is; JSON that doesn't parse shows its raw text under a note saying so, and a type that isn't
 * text shows a note in place of its bytes. Long content scrolls inside the viewer, in a region the
 * keyboard reaches. Display-only: it sends no event.
 */
export class ArtifactViewer extends LitElement {
  static styles = [reset, elements, styles];

  static properties = {
    name: { type: String },
    contentType: { type: String, attribute: "content-type" },
    content: { type: String },
    state: { type: String, reflect: true },
    message: { type: String },
  } satisfies PropertyDeclarations;

  /** The artifact's name, shown in the viewer's head. */
  declare name: string;
  /** The artifact's media type, parameters allowed; it chooses the view. */
  declare contentType: string;
  /** The artifact's content, as text. */
  declare content: string;
  /** Loading, error, or ready; reflected to the `state` attribute. */
  declare state: ArtifactState;
  /** Why the content failed to load, shown in the error state. */
  declare message: string;

  // The JSON view's text, parsed once per content and type rather than on every render.
  #json: Json | null = null;

  constructor() {
    super();
    this.name = "";
    this.contentType = "";
    this.content = "";
    this.state = "ready";
    this.message = "";
  }

  willUpdate(changed: PropertyValues<this>): void {
    if (changed.has("content") || changed.has("contentType")) {
      this.#json = viewOf(this.contentType) === "json" ? pretty(this.content ?? "") : null;
    }
  }

  // The scrolling region: the keyboard reaches it by Tab, so arrow and page keys scroll it, and
  // it is named for the artifact. Its one child is the content it scrolls, padded, so the padding
  // scrolls with the content and shows at its far edges.
  #region(content: unknown, markdownView = false) {
    const label = `${this.name || "Artifact"} content`;
    return markdownView
      ? html`<div class="body markdown" tabindex="0" role="region" aria-label=${label}>
          <div class="document">${content}</div>
        </div>`
      : html`<pre class="body" tabindex="0" role="region" aria-label=${label}><span class="content">${content}</span></pre>`;
  }

  #note(kind: string, label: string, detail: string | typeof nothing = nothing) {
    return html`<p class="note ${kind}" role=${kind === "loading" ? "status" : nothing}>
      <strong class="label">${label}</strong>
      ${detail === nothing ? nothing : html`<span class="detail">${detail}</span>`}
    </p>`;
  }

  // The frame's content: a note, a region, or the invalid JSON note over its raw text's region.
  #renderContent() {
    switch (this.state) {
      case "loading":
        return this.#note("loading", "Loading…");
      case "error":
        return this.#note("error", "Couldn't load this artifact.", this.message || nothing);
    }
    const content = this.content ?? "";
    switch (viewOf(this.contentType)) {
      case "markdown":
        return this.#region(markdown(content), true);
      case "json": {
        const json = this.#json ?? pretty(content);
        if (json.ok) return this.#region(json.text);
        return html`${this.#note("invalid", "Invalid JSON, shown as text.", json.reason)}
        ${this.#region(content)}`;
      }
      case "text":
        return this.#region(content);
      default:
        return this.#note(
          "unsupported",
          "This content type can't be shown.",
          this.contentType ? `${this.contentType} isn't text.` : "It has no content type.",
        );
    }
  }

  render() {
    const head =
      this.name || this.contentType
        ? html`<header class="head">
            ${this.name ? html`<span class="name">${this.name}</span>` : nothing}
            ${this.contentType ? html`<span class="type">${this.contentType}</span>` : nothing}
          </header>`
        : nothing;
    return html`${head}<div class="frame">${this.#renderContent()}</div>`;
  }
}

define(tagName, ArtifactViewer);

declare global {
  interface HTMLElementTagNameMap {
    "sl-artifact-viewer": ArtifactViewer;
  }
}
