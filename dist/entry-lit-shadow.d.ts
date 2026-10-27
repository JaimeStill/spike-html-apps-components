import { LitElement, nothing } from "lit";
/** The tag this version defines. */
export declare const tagName = "sl-entry-lit-shadow";
/** The fields of a directory the entry renders; a go-web-service Directory fits it. */
export interface DirectoryItem {
    id: string;
    name: string;
    status: string;
    updated_at: string;
}
/**
 * The fields of a file the entry renders; a go-web-service File fits it. `size` is null until
 * the file's write completes.
 */
export interface FileItem extends DirectoryItem {
    size: number | null;
    content_type: string;
}
/** What the entry shows: a directory, or a file, told apart by its `content_type`. */
export type EntryItem = DirectoryItem | FileItem;
/** `open`'s detail: the entry's id and kind. */
export interface OpenDetail {
    id: string;
    kind: "directory" | "file";
}
/**
 * Shows one entry: its kind, name, and status; a file's size, absent while it is pending, and
 * content type; and when it was last updated. Activating it sends `open` with its id and kind.
 */
export declare class EntryLitShadow extends LitElement {
    #private;
    static styles: CSSStyleSheet[];
    static properties: {
        item: {
            attribute: false;
        };
    };
    /** The directory or file shown; nothing renders while it is null. */
    item: EntryItem | null;
    constructor();
    render(): typeof nothing | import("lit").TemplateResult<1>;
}
declare global {
    interface HTMLElementTagNameMap {
        "sl-entry-lit-shadow": EntryLitShadow;
    }
}
