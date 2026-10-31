// The upload dropzone, Lit with a shadow root: a zone that takes files by drop or through a native
// file picker, and the list of the uploads the app reports, each with its progress or its finished
// state. It knows no SDK and no domain: files go out as File objects, a cancel goes out by the
// upload's id, and the app does the uploading. It binds no key.
import { html, LitElement, nothing } from "lit";
import { repeat } from "lit/directives/repeat.js";
import elements from "@jaimestill/spike-html-apps-foundation/baseline/elements.css" with { type: "css" };
import reset from "@jaimestill/spike-html-apps-foundation/baseline/reset.css" with { type: "css" };
import { define, emit } from "@jaimestill/spike-html-apps-foundation/dom.js";
import { formatBytes } from "@jaimestill/spike-html-apps-foundation/format.js";
import styles from "./upload-dropzone.css" with { type: "css" };
/** The tag the element defines. */
export const tagName = "sl-upload-dropzone";
/** The finished states' labels, which mark each apart in words as well as in color. */
const finished = {
    done: "Done",
    failed: "Failed",
    cancelled: "Cancelled",
};
/** Whether a drag carries files, so text or a link dragged over the zone leaves it as it is. */
function carriesFiles(event) {
    return event.dataTransfer?.types.includes("Files") ?? false;
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
export class UploadDropzone extends LitElement {
    static styles = [reset, elements, styles];
    static properties = {
        uploads: { attribute: false },
        accept: { type: String },
        disabled: { type: Boolean, reflect: true },
        over: { state: true },
    };
    // How many of the zone's boxes the drag is over: dragenter on a child comes before dragleave on
    // the box it left, so the mark clears only when the count returns to zero, never between them.
    #depth = 0;
    constructor() {
        super();
        this.uploads = [];
        this.accept = "";
        this.disabled = false;
        this.over = false;
    }
    get #input() {
        return this.renderRoot.querySelector("input");
    }
    #pick() {
        if (!this.disabled)
            this.#input?.click();
    }
    // The input clears once its files go out, so choosing the same file again still sends them.
    #change(e) {
        const input = e.target;
        const files = [...(input.files ?? [])];
        input.value = "";
        if (!this.disabled && files.length)
            emit(this, "files-select", { files });
    }
    // Each drag event that carries files is the zone's: its default cancelled, so a drop never
    // opens the file in the page, disabled or not. While disabled the drop effect is none, so the
    // pointer shows the zone refuses.
    #enter(e) {
        if (!carriesFiles(e))
            return;
        e.preventDefault();
        this.#depth++;
        this.over = true;
    }
    #dragover(e) {
        if (!carriesFiles(e))
            return;
        e.preventDefault();
        if (e.dataTransfer)
            e.dataTransfer.dropEffect = this.disabled ? "none" : "copy";
    }
    #leave(e) {
        if (!carriesFiles(e))
            return;
        this.#depth = Math.max(0, this.#depth - 1);
        if (this.#depth === 0)
            this.over = false;
    }
    #drop(e) {
        if (!carriesFiles(e))
            return;
        e.preventDefault();
        this.#depth = 0;
        this.over = false;
        const files = [...(e.dataTransfer?.files ?? [])];
        if (!this.disabled && files.length)
            emit(this, "files-select", { files });
    }
    #cancel(upload) {
        if (upload.state === "uploading") {
            emit(this, "upload-cancel", { id: upload.id });
        }
    }
    #upload(upload) {
        const size = formatBytes(upload.size);
        const uploading = upload.state === "uploading";
        // The trailing cell, at the item's end: an uploading item's cancel control, beside its name,
        // or a finished one's label, centered on its two lines. The detail line sits under the name:
        // an uploading item's bar, as wide as the item, and its bytes sent of its size; a finished
        // one's size, and a failed one's message after it.
        const end = upload.state === "uploading"
            ? html `<button
          type="button"
          class="cancel"
          aria-label="Cancel ${upload.name}"
          @click=${() => this.#cancel(upload)}
        >
          Cancel
        </button>`
            : html `<span class="state">${finished[upload.state]}</span>`;
        // The bytes follow the bar, the sent count held to the widest count's width, so the bar keeps
        // its length as they climb.
        const sent = Math.min(Math.max(upload.sent, 0), upload.size);
        const detail = uploading
            ? html `<progress value=${sent} max=${upload.size} aria-label="Uploading ${upload.name}"></progress
          ><span class="bytes"><span class="sent">${formatBytes(sent)}</span> of ${size}</span>`
            : upload.state === "failed" && upload.message
                ? html `<span class="bytes">${size}</span><span class="message">${upload.message}</span>`
                : html `<span class="bytes">${size}</span>`;
        return html `<li class="upload ${upload.state}" data-id=${upload.id}>
      <span class="name" title=${upload.name}>${upload.name}</span>
      <span class="end">${end}</span>
      <span class="detail">${detail}</span>
    </li>`;
    }
    render() {
        const over = this.over && !this.disabled;
        const uploads = this.uploads ?? [];
        // Each upload's row is keyed by its id, so a focused cancel control stays with its upload as
        // the app reorders or removes others.
        return html `<div
        class="zone ${over ? "over" : ""}"
        @dragenter=${this.#enter}
        @dragover=${this.#dragover}
        @dragleave=${this.#leave}
        @drop=${this.#drop}
      >
        <span class="prompt">Drop files here, or</span>
        <button type="button" class="pick" ?disabled=${this.disabled} @click=${this.#pick}>
          Choose files
        </button>
        <input
          type="file"
          multiple
          hidden
          accept=${this.accept || nothing}
          ?disabled=${this.disabled}
          @change=${this.#change}
        />
      </div>
      ${uploads.length
            ? html `<ul class="uploads" aria-label="Uploads">
            ${repeat(uploads, (upload) => upload.id, (upload) => this.#upload(upload))}
          </ul>`
            : nothing}`;
    }
}
define(tagName, UploadDropzone);
