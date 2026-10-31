import { LitElement } from "lit";
/** The tag the element defines. */
export declare const tagName = "sl-upload-dropzone";
/** An upload's state: sending, or finished one of three ways. */
export type UploadState = "uploading" | "done" | "failed" | "cancelled";
/**
 * An upload as the dropzone shows it, a shape of its own that the app fills: its id, the file's
 * name and size in bytes, the bytes sent so far, its state, and, when it failed, why.
 */
export interface UploadItem {
    id: string;
    name: string;
    size: number;
    sent: number;
    state: UploadState;
    message?: string;
}
/** `files-select`'s detail: the files dropped or picked, in order, as an array. */
export interface FilesSelectDetail {
    files: File[];
}
/** `upload-cancel`'s detail: the id of the upload to cancel. */
export interface UploadCancelDetail {
    id: string;
}
/**
 * A zone that takes files, several at a time, dropped on it or chosen through the native file
 * picker its button opens, and sends `files-select` with them either way. Dragging files over the
 * zone marks it. While `disabled`, the zone takes no files by either path and reads as disabled.
 * `accept` is the picker's, a hint to it; a drop is not filtered by it, and the app validates
 * what it receives.
 *
 * Below the zone, `uploads` lists the app's uploads: each its name and its size, an uploading
 * one its bytes sent of its size, a native progress bar, and a cancel control that sends
 * `upload-cancel` with its id; a finished one its label, done, failed with its message, or
 * cancelled.
 */
export declare class UploadDropzone extends LitElement {
    #private;
    static styles: CSSStyleSheet[];
    static properties: {
        uploads: {
            attribute: false;
        };
        accept: {
            type: StringConstructor;
        };
        disabled: {
            type: BooleanConstructor;
            reflect: true;
        };
        over: {
            state: true;
        };
    };
    /** The uploads to list, in the order the app gives them. */
    uploads: readonly UploadItem[];
    /** The picker's accepted types, its input's accept attribute; empty accepts any file. */
    accept: string;
    /** Refuses files by drop and by the picker; reflected to `disabled`. */
    disabled: boolean;
    /** Whether files are dragged over the zone: the component's own state, never the app's. */
    private over;
    constructor();
    render(): import("lit").TemplateResult<1>;
}
declare global {
    interface HTMLElementTagNameMap {
        "sl-upload-dropzone": UploadDropzone;
    }
}
