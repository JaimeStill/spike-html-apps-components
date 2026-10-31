import { LitElement, type PropertyValues } from "lit";
/** The tag the element defines. */
export declare const tagName = "sl-artifact-viewer";
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
export declare function viewOf(contentType: string): ArtifactView;
/**
 * Shows one artifact: its name and content type over its content. Markdown renders through
 * `markdown()`, JSON is parsed and printed with two-space indents, and other text is shown as it
 * is; JSON that doesn't parse shows its raw text under a note saying so, and a type that isn't
 * text shows a note in place of its bytes. Long content scrolls inside the viewer, in a region the
 * keyboard reaches. Display-only: it sends no event.
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
    };
    /** The artifact's name, shown in the viewer's head. */
    name: string;
    /** The artifact's media type, parameters allowed; it chooses the view. */
    contentType: string;
    /** The artifact's content, as text. */
    content: string;
    /** Loading, error, or ready; reflected to the `state` attribute. */
    state: ArtifactState;
    /** Why the content failed to load, shown in the error state. */
    message: string;
    constructor();
    willUpdate(changed: PropertyValues<this>): void;
    render(): import("lit").TemplateResult<1>;
}
declare global {
    interface HTMLElementTagNameMap {
        "sl-artifact-viewer": ArtifactViewer;
    }
}
