// The artifact viewer, Lit with a shadow root: one artifact's content, by its content type, as
// rendered Markdown, JSON formatted from its own tokens, or preformatted text, in a region that
// scrolls; or, from a Blob, as the browser renders it natively: a PDF in a frame, an image, audio,
// or video; or, for a type that names no view, as text when its bytes are text. Only content that
// is binary by those rules can't be shown.

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

/**
 * How a content type shows: which of the viewer's views takes it. `unknown` is a type that names
 * no view, its bytes deciding: a Blob of them shows as text when they are text, and as a note that
 * it can't be shown, with a link that downloads it, when they aren't.
 */
export type ArtifactView =
  "markdown" | "json" | "text" | "pdf" | "image" | "audio" | "video" | "unknown";

/** The content a view takes: `text`, a string; or `blob`, a Blob. */
export type ArtifactContent = "text" | "blob";

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
 * `Text/Markdown; charset=utf-8` is Markdown. Text, a string: text/markdown renders as Markdown;
 * application/json, or any type whose subtype ends in +json, as JSON; any other text/ type, text/html
 * among them, and each of `TEXT_TYPES`, as preformatted text, never as a page or a URL. A Blob:
 * application/pdf in a frame, and an image/, audio/, or video/ type in its element, but
 * image/svg+xml, a document that can run script when opened on its own, which shows its source as
 * text. A native view's type and subtype must each be an HTTP token, so `image/png,text/html` is no
 * image; a text/ type is text however it is written, `text/plain,x` included, since text never
 * gets a URL. Anything else, an empty type included, is `unknown`: its content is a Blob, and the
 * viewer, which can see its bytes where this can't, shows it as text when they are text.
 */
export function viewOf(contentType: string): ArtifactViewOf {
  const view = viewFor(essenceOf(contentType));
  return { view, content: TEXT_VIEWS.has(view) ? "text" : "blob" };
}

// A content type's essence: its type and subtype, lowercased, without parameters.
function essenceOf(contentType: string): string {
  return contentType.split(";", 1)[0].trim().toLowerCase();
}

// A valid essence: a type and a subtype of HTTP token characters alone. The object URL's bytes
// carry the essence, and a browser that can't parse it as one type sniffs them, or reads it as a
// list and takes its last type, so `image/png,text/html` opened from an img loads as a page.
const ESSENCE = /^[-!#$%&'*+.^_`|~0-9a-z]+\/[-!#$%&'*+.^_`|~0-9a-z]+$/;

/**
 * The types other than text/ ones that show as their source, as preformatted text: XML, and any
 * subtype ending in +xml, image/svg+xml and application/xhtml+xml among them; JavaScript; YAML,
 * and any subtype ending in +yaml; TOML; CSV; newline-delimited JSON, which isn't one JSON text;
 * SQL; and shell scripts.
 */
export const TEXT_TYPES: readonly string[] = [
  "application/xml",
  "application/javascript",
  "application/ecmascript",
  "application/yaml",
  "application/x-yaml",
  "application/toml",
  "application/csv",
  "application/x-ndjson",
  "application/sql",
  "application/x-sh",
  "application/x-shellscript",
];

function viewFor(essence: string): ArtifactView {
  if (!ESSENCE.test(essence)) return essence.startsWith("text/") ? "text" : "unknown";
  if (essence === "text/markdown") return "markdown";
  if (essence === "application/json" || essence.endsWith("+json")) return "json";
  if (essence.startsWith("text/")) return "text";
  if (TEXT_TYPES.includes(essence) || essence.endsWith("+xml") || essence.endsWith("+yaml"))
    return "text";
  if (essence === "application/pdf") return "pdf";
  const [type] = essence.split("/", 1);
  return type === "image" || type === "audio" || type === "video" ? type : "unknown";
}

/**
 * The bytes an unknown type's Blob is judged by: its first MiB. They are text when they decode as
 * UTF-8, a sequence cut at the MiB's end aside, and hold no C0 control character but tab, line
 * feed, form feed, and carriage return, so a NUL among them is binary. Text past the MiB shows as
 * decoded, an invalid sequence there as U+FFFD.
 */
export const SNIFF_BYTES = 1024 * 1024;

// Whether the text holds a C0 control character text never does: any but tab, line feed, form
// feed, and carriage return.
function hasControl(text: string): boolean {
  for (let at = 0; at < text.length; at++) {
    const code = text.charCodeAt(at);
    if (code < 0x20 && code !== 0x09 && code !== 0x0a && code !== 0x0c && code !== 0x0d)
      return true;
  }
  return false;
}

// A Blob's bytes as text, or null when the bytes are binary or can't be read.
async function textOf(blob: Blob): Promise<string | null> {
  try {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const head = bytes.subarray(0, SNIFF_BYTES);
    const decided = new TextDecoder("utf-8", { fatal: true }).decode(head, {
      stream: bytes.length > SNIFF_BYTES,
    });
    if (hasControl(decided)) return null;
    return bytes.length > SNIFF_BYTES ? new TextDecoder().decode(bytes) : decided;
  } catch {
    return null;
  }
}

/** JSON content as shown: formatted from its tokens, or, when it doesn't parse, the parser's
 * reason. */
type Json = { ok: true; text: string } | { ok: false; reason: string };

// JSON.parse decides validity alone, and its value is thrown away: printing the value would move
// integer-like keys first, rewrite numbers, and drop duplicate keys, so the text shown is the
// content's own tokens, re-indented by formatJson, which keeps containers past MAX_DEPTH as written.
// Text whose formatting would still pass the longest string, a RangeError, shows as it is.
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
 * strings show as written, never parsed and printed again; and other text, text/html, XML, and
 * SVG's source included, is shown as it is, never as a page and from no URL. JSON that doesn't parse shows its raw text under a note saying so, and empty
 * content a note saying so. Long content scrolls inside the viewer, in a region the keyboard
 * reaches.
 *
 * A PDF, an image, audio, or video shows from a Blob, natively: a PDF in an iframe, the browser's
 * own viewer, as tall as the viewer allows; an image no wider than the viewer and never past its
 * natural size; audio, and video, which keeps its aspect, the viewer's width, with their controls.
 * The `content-type` decides the view, never the Blob's own type, and the bytes are shown as that
 * type. Until the Blob is given, the view shows the loading note. An unknown type's Blob shows the
 * loading note until its bytes are read, then as text when they are text, by `SNIFF_BYTES`'s rule,
 * and only when they aren't, a note in place of them and a link that downloads them under the
 * artifact's name; a string given for an unknown type shows as text unless it holds a control
 * character text doesn't, and as the note, with no link, if it does. `updateComplete` waits for
 * the read. The viewer owns each object URL it shows: it makes one for the Blob it holds while
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
  /** The artifact's content: a string for a text type, a Blob for a native or an unknown one, as
   * `viewOf()` says. A native type with no Blob shows the loading note, and a text type given
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
  // An unknown type's Blob as read: its text, or null when its bytes are binary; and the read
  // under way, which updateComplete waits for.
  #read: { blob: Blob; text: string | null } | null = null;
  #reading: Promise<void> | null = null;
  #readingBlob: Blob | null = null;

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
      const { view } = viewOf(this.contentType);
      this.#json = view === "json" ? pretty(text) : null;
      if (view === "unknown" && this.content instanceof Blob) this.#readBlob(this.content);
    }
    this.#sync();
  }

  // Reads an unknown type's Blob once, unless it is read or being read already; when the read
  // ends, the viewer updates with it if the Blob is still its content.
  #readBlob(blob: Blob): void {
    if (this.#read?.blob === blob || this.#readingBlob === blob) return;
    this.#readingBlob = blob;
    this.#reading = (async () => {
      const text = await textOf(blob);
      if (this.content === blob) {
        this.#read = { blob, text };
        this.requestUpdate();
      }
      // A read begun since is the one still under way.
      if (this.#readingBlob === blob) {
        this.#reading = null;
        this.#readingBlob = null;
      }
    })();
  }

  // Complete once a Blob being read is shown as its bytes decide, as well as rendered.
  protected override async getUpdateComplete(): Promise<boolean> {
    let complete = await super.getUpdateComplete();
    while (this.#reading) {
      await this.#reading;
      complete = await super.getUpdateComplete();
    }
    return complete;
  }

  // The unknown type's Blob as read, when the content is still that Blob: its text, or null.
  get #sniffed(): { text: string | null } | null {
    return this.#read && this.#read.blob === this.content ? this.#read : null;
  }

  // The object URL for the Blob, while connected and while its view shows a Blob, made of a slice
  // typed by the content type, so the browser renders the bytes as the view does, whatever the
  // Blob says: a PDF's frame never loads the bytes as a page. An unknown type's Blob has one only
  // once its bytes are read as binary, for its download link, and its bytes are then
  // application/octet-stream, so the link, opened rather than downloaded, never renders them; text
  // shows in the pre, from no URL. A URL no longer wanted is revoked first.
  #sync(): void {
    const { view, content } = viewOf(this.contentType);
    const wanted =
      this.isConnected &&
      this.content instanceof Blob &&
      content === "blob" &&
      (view !== "unknown" || this.#sniffed?.text === null);
    const blob = wanted ? (this.content as Blob) : null;
    const type = view === "unknown" ? "application/octet-stream" : essenceOf(this.contentType);
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
    if (view === "unknown") return this.#unknown(name);
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

  // An unknown type's content, its bytes deciding: a Blob shows the loading note until it is read,
  // then its text, or, binary, the note that it can't be shown, with its download link. A string
  // shows as text when it holds no control character text never does, and as the note otherwise.
  #unknown(name: string) {
    let text: string | null;
    if (this.content instanceof Blob) {
      if (this.content.size === 0)
        return this.#alone(this.#note("empty", "This artifact is empty."));
      const sniffed = this.#sniffed;
      if (!sniffed) return this.#alone(this.#note("loading", "Loading…"));
      text = sniffed.text;
    } else {
      if (this.content === "") return this.#alone(this.#note("empty", "This artifact is empty."));
      text = hasControl(this.content) ? null : this.content;
    }
    if (text !== null) return html`<div class="frame">${this.#region(text)}</div>`;
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
