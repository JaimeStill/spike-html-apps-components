import { LitElement, nothing } from "lit";
/** The tag the element defines. */
export declare const tagName = "sl-entry";
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
 * Shows one entry: its name, the primary text, and its status, a quiet label at the line's end;
 * then a quiet meta line of its kind, a file's size, absent while it is pending, and content type,
 * and when it was last updated. Activating it sends `open` with its id and kind. `selected` frames
 * the entry's button in the interaction color, a mark to the eye only: the consumer that selects
 * it says so to assistive technology, as sl-document-list does with aria-current on its item.
 */
export declare class Entry extends LitElement {
    #private;
    static styles: CSSStyleSheet[];
    static properties: {
        item: {
            attribute: false;
        };
        selected: {
            type: BooleanConstructor;
            reflect: true;
        };
    };
    /** The directory or file shown; nothing renders while it is null. */
    item: EntryItem | null;
    /** Frames the entry as the selected one; reflected to the `selected` attribute. */
    selected: boolean;
    constructor();
    render(): typeof nothing | import("lit").TemplateResult<1>;
}
declare global {
    interface HTMLElementTagNameMap {
        "sl-entry": Entry;
    }
}
