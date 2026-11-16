import { LitElement, type PropertyValues } from "lit";
/** The tag the element defines. */
export declare const tagName = "sl-artifact-viewer";
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
export type ArtifactView = "markdown" | "json" | "text" | "pdf" | "image" | "audio" | "video" | "unknown";
/** The content a view takes: `text`, a string; or `blob`, a Blob. */
export type ArtifactContent = "text" | "blob";
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
export declare function viewOf(contentType: string): ArtifactViewOf;
/**
 * The types other than text/ ones that show as their source, as preformatted text: XML, and any
 * subtype ending in +xml, image/svg+xml and application/xhtml+xml among them; JavaScript; YAML,
 * and any subtype ending in +yaml; TOML; CSV; newline-delimited JSON, which isn't one JSON text;
 * SQL; and shell scripts.
 */
export declare const TEXT_TYPES: readonly string[];
/**
 * The bytes an unknown type's Blob is judged by: its first MiB. They are text when they decode as
 * UTF-8, a sequence cut at the MiB's end aside, and hold no C0 control character but tab, line
 * feed, form feed, and carriage return, so a NUL among them is binary. Text past the MiB shows as
 * decoded, an invalid sequence there as U+FFFD.
 */
export declare const SNIFF_BYTES: number;
/**
 * Shows one artifact: a header of its name and content type over its content, or, with
 * `noHeader`, its content alone, for a page that already shows the name and type in a header of
 * its own. Markdown renders through `markdown()`; valid JSON is formatted from its own tokens by
 * `formatJson()`, two spaces an indent, so its keys, their order, duplicates, numbers, and
 * strings show as written, never parsed and printed again; and other text, text/html, XML, and
 * SVG's source included, is shown as it is, never as a page and from no URL. JSON that doesn't
 * parse shows its raw text under a note saying so, and empty content a note saying so. Long
 * content scrolls inside the viewer, in a region the keyboard reaches.
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
export declare class ArtifactViewer extends LitElement {
    #private;
    static styles: CSSStyleSheet[];
    static properties: {
        name: {
            type: StringConstructor;
        };
        contentType: {
            type: StringConstructor;
            attribute: string;
        };
        content: {
            type: StringConstructor;
        };
        state: {
            type: StringConstructor;
            reflect: true;
        };
        message: {
            type: StringConstructor;
        };
        noHeader: {
            type: BooleanConstructor;
            reflect: true;
            attribute: string;
        };
    };
    /** The artifact's name, shown in the viewer's header, and naming its content's region. */
    name: string;
    /** The artifact's media type, parameters allowed; it chooses the view. */
    contentType: string;
    /** The artifact's content: a string for a text type, a Blob for a native or an unknown one, as
     * `viewOf()` says. A native type with no Blob shows the loading note, and a text type given
     * a Blob shows as empty, as `""` does. */
    content: string | Blob;
    /** Loading, error, or ready; reflected to the `state` attribute. */
    state: ArtifactState;
    /** Why the content failed to load, shown in the error state. */
    message: string;
    /** Leaves out the header, so the content shows alone; its region keeps its name. */
    noHeader: boolean;
    constructor();
    connectedCallback(): void;
    disconnectedCallback(): void;
    willUpdate(changed: PropertyValues<this>): void;
    protected getUpdateComplete(): Promise<boolean>;
    render(): import("lit").TemplateResult<1>;
}
declare global {
    interface HTMLElementTagNameMap {
        "sl-artifact-viewer": ArtifactViewer;
    }
}
