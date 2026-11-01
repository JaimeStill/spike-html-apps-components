// The artifact viewer, Lit with a shadow root: one artifact's content, by its content type, as
// rendered Markdown, JSON formatted from its own tokens, or preformatted text, in a region that
// scrolls; or, from a Blob, as the browser renders it natively: a PDF in a frame, an image, audio,
// or video.

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
export type ArtifactView =
  "markdown" | "json" | "text" | "pdf" | "image" | "audio" | "video" | "unsupported";

/**
 * The content a view takes: `text`, a string; `blob`, a Blob; or `none`, nothing, since the view
 * shows a note, though a Blob given to it is offered as a download.
 */
export type ArtifactContent = "text" | "blob" | "none";

// The views whose content is a string.
const TEXT_VIEWS = new Set<ArtifactView>(["markdown", "json", "text"]);

/** A content type's view, and the content that view takes. */
export interface ArtifactViewOf {
  view: ArtifactView;
  content: ArtifactContent;
}

/**
 * The view a content type shows in, and the content it takes, so a consumer knows what to fetch.
 * Only the type and subtype count, read without case and without parameters, so
 * `Text/Markdown; charset=utf-8` is Markdown, and a type and subtype must each be an HTTP token, so
 * `image/png,text/html` is no image. Text, a string: text/markdown renders as Markdown;
 * application/json, or any type whose subtype ends in +json, as JSON; any other text/ type, text/html
 * among them, as preformatted text, never as a page. A Blob: application/pdf in a frame, and an
 * image/, audio/, or video/ type in its element, but image/svg+xml, a document that can run script
 * when opened on its own. Anything else, an empty type included, is unsupported, its content none.
 */
export function viewOf(contentType: string): ArtifactViewOf {
  const view = viewFor(essenceOf(contentType));
  const content = TEXT_VIEWS.has(view) ? "text" : view === "unsupported" ? "none" : "blob";
  return { view, content };
}

// A content type's essence: its type and subtype, lowercased, without parameters.
function essenceOf(contentType: string): string {
  return contentType.split(";", 1)[0].trim().toLowerCase();
}

// A valid essence: a type and a subtype of HTTP token characters alone. The object URL's bytes
// carry the essence, and a browser that can't parse it as one type sniffs them, or reads it as a
// list and takes its last type, so `image/png,text/html` opened from an img loads as a page.
const ESSENCE = /^[-!#$%&'*+.^_`|~0-9a-z]+\/[-!#$%&'*+.^_`|~0-9a-z]+$/;

function viewFor(essence: string): ArtifactView {
  if (!ESSENCE.test(essence)) return "unsupported";
  if (essence === "text/markdown") return "markdown";
  if (essence === "application/json" || essence.endsWith("+json")) return "json";
  if (essence.startsWith("text/")) return "text";
  if (essence === "application/pdf") return "pdf";
  if (essence === "image/svg+xml") return "unsupported";
  const [type] = essence.split("/", 1);
  return type === "image" || type === "audio" || type === "video" ? type : "unsupported";
}

/** JSON content as shown: formatted from its tokens, or, when it doesn't parse, the parser's
 * reason. */
type Json = { ok: true; text: string } | { ok: false; reason: string };

// JSON.parse decides validity alone, and its value is thrown away: printing the value would move
// integer-like keys first, rewrite numbers, and drop duplicate keys, so the text shown is the
// content's own tokens, re-indented by formatJson. Its indents grow with the square of the depth,
// so a short text nested some ten thousand deep can't fit in a string: it shows as it is.
function pretty(content: string): Json {
  try {
    JSON.parse(content);
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) };
  }
  try {
    return { ok: true, text: formatJson(content) };
  } catch {
    return { ok: true, text: content };
  }
}

/**
 * Shows one artifact: a header of its name and content type over its content, or, with
 * `noHeader`, its content alone, for a page that already shows the name and type in a header of
 * its own. Markdown renders through `markdown()`; valid JSON is formatted from its own tokens by
 * `formatJson()`, two spaces an indent, so its keys, their order, duplicates, numbers, and
 * strings show as written, never parsed and printed again; and other text, text/html included, is
 * shown as it is. JSON that doesn't parse shows its raw text under a note saying so, and empty
 * content a note saying so. Long content scrolls inside the viewer, in a region the keyboard
 * reaches.
 *
 * A PDF, an image, audio, or video shows from a Blob, natively: a PDF in an iframe, the browser's
 * own viewer, as tall as the viewer allows; an image no wider than the viewer and never past its
 * natural size; audio, and video, which keeps its aspect, the viewer's width, with their controls.
 * The `content-type` decides the view, never the Blob's own type, and the bytes are shown as that
 * type. Until the Blob is given, the view shows the loading note. Any other type shows a note in
 * place of its bytes, with, when a Blob is given, a link that downloads it under the artifact's
 * name. The viewer owns each object URL it shows: it makes one for the Blob it holds while
 * connected, and revokes it when the content or its type changes and when it disconnects.
 *
 * In every state, header or not, one region named `<name> content` holds what the viewer shows:
 * the scrolling region, which the invalid JSON's note describes, or the frame around a note or a
 * native element. Display-only: it sends no event.
 */
export class ArtifactViewer extends LitElement {
  static styles = [reset, elements, styles];

  static properties = {
    name: { type: String },
    contentType: { type: String, attribute: "content-type" },
    // A string from the attribute; a Blob only by the property.
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
  /** The artifact's content: a string for a text type, a Blob for a native or an unsupported one,
   * as `viewOf()` says. A native type with no Blob shows the loading note, and a text type given
   * a Blob shows as empty, as `""` does. */
  declare content: string | Blob;
  /** Loading, error, or ready; reflected to the `state` attribute. */
  declare state: ArtifactState;
  /** Why the content failed to load, shown in the error state. */
  declare message: string;
  /** Leaves out the header, so the content shows alone; its region keeps its name. */
  declare noHeader: boolean;

  // The JSON view's text, parsed once per content and type rather than on every render.
  #json: Json | null = null;
  // The object URL shown, and the Blob and type it was made from.
  #url = "";
  #blob: Blob | null = null;
  #type = "";

  constructor() {
    super();
    this.name = "";
    this.contentType = "";
    this.content = "";
    this.state = "ready";
    this.message = "";
    this.noHeader = false;
  }

  connectedCallback(): void {
    super.connectedCallback();
    // A viewer reconnected still holding its Blob makes its URL again, as it updates.
    if (this.hasUpdated) this.requestUpdate();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#sync();
  }

  willUpdate(changed: PropertyValues<this>): void {
    if (changed.has("content") || changed.has("contentType")) {
      const text = typeof this.content === "string" ? this.content : "";
      this.#json = viewOf(this.contentType).view === "json" ? pretty(text) : null;
    }
    this.#sync();
  }

  // The object URL for the Blob, while connected and while its view shows a Blob, made of a slice
  // typed by the content type, so the browser renders the bytes as the view does, whatever the
  // Blob says: a PDF's frame never loads the bytes as a page. An unsupported type's bytes are
  // application/octet-stream, so its link, opened rather than downloaded, never renders them. A
  // URL no longer wanted is revoked first.
  #sync(): void {
    const { view, content } = viewOf(this.contentType);
    const blob =
      this.isConnected && this.content instanceof Blob && content !== "text" ? this.content : null;
    const type = view === "unsupported" ? "application/octet-stream" : essenceOf(this.contentType);
    if (blob === this.#blob && type === this.#type) return;
    if (this.#url) URL.revokeObjectURL(this.#url);
    this.#blob = blob;
    this.#type = type;
    this.#url = blob ? URL.createObjectURL(blob.slice(0, blob.size, type)) : "";
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

  // A note: its label, its detail below, and an action below that. Its kind is its class and its
  // id, which the invalid JSON's region is described by.
  #note(
    kind: string,
    label: string,
    detail: string | typeof nothing = nothing,
    action: unknown = nothing,
  ) {
    return html`<p class="note ${kind}" id=${kind} role=${kind === "loading" ? "status" : nothing}>
      <strong class="label">${label}</strong>
      ${detail === nothing ? nothing : html`<span class="detail">${detail}</span>`} ${action}
    </p>`;
  }

  // A Blob's native element, named for the artifact: the frame's title, the image's alt, the
  // media's label. The frame scrolls its own document, so the viewer's frame holds it unscrolled.
  #native(view: ArtifactView, name: string) {
    const url = this.#url;
    switch (view) {
      case "pdf":
        return html`<iframe class="media pdf" src=${url} title=${name}></iframe>`;
      case "image":
        return html`<img class="media image" src=${url} alt=${name} />`;
      case "audio":
        return html`<audio class="media audio" controls src=${url} aria-label=${name}></audio>`;
      default:
        return html`<video class="media video" controls src=${url} aria-label=${name}></video>`;
    }
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
    const { view, content: kind } = viewOf(this.contentType);
    const name = this.name || "Artifact";
    if (view === "unsupported") {
      return this.#alone(
        this.#note(
          "unsupported",
          "This content type can't be shown.",
          this.contentType ? `${this.contentType} isn't text.` : "It has no content type.",
          this.#url
            ? html`<a class="download" href=${this.#url} download=${this.name}>Download ${name}</a>`
            : nothing,
        ),
      );
    }
    if (kind === "blob") {
      if (!this.#url) return this.#alone(this.#note("loading", "Loading…"));
      if (this.#blob?.size === 0)
        return this.#alone(this.#note("empty", "This artifact is empty."));
      return this.#alone(this.#native(view, name));
    }
    const content = typeof this.content === "string" ? this.content : "";
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
