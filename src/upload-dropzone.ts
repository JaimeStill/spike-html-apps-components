// The upload dropzone, Lit with a shadow root: a zone that takes files by drop or through a native
// file picker, and the list of the uploads the app reports, each with its progress or its finished
// state. It knows no SDK and no domain: files go out as File objects, a cancel goes out by the
// upload's id, and the app does the uploading. It binds no key.

import { html, LitElement, nothing, type PropertyDeclarations } from "lit";
import { repeat } from "lit/directives/repeat.js";

import elements from "@jaimestill/spike-html-apps-foundation/baseline/elements.css" with { type: "css" };
import reset from "@jaimestill/spike-html-apps-foundation/baseline/reset.css" with { type: "css" };
import { define, emit } from "@jaimestill/spike-html-apps-foundation/dom.js";
import { formatBytes } from "@jaimestill/spike-html-apps-foundation/format.js";
import styles from "./upload-dropzone.css" with { type: "css" };

/** The tag the element defines. */
export const tagName = "sl-upload-dropzone";

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

/** The finished states' labels, which mark each apart in words as well as in color. */
const finished: Record<Exclude<UploadState, "uploading">, string> = {
  done: "Done",
  failed: "Failed",
  cancelled: "Cancelled",
};

/** Whether a drag carries files, so text or a link dragged over the zone leaves it as it is. */
function carriesFiles(event: DragEvent): boolean {
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
  } satisfies PropertyDeclarations;

  /** The uploads to list, in the order the app gives them. */
  declare uploads: readonly UploadItem[];
  /** The picker's accepted types, its input's accept attribute; empty accepts any file. */
  declare accept: string;
  /** Refuses files by drop and by the picker; reflected to `disabled`. */
  declare disabled: boolean;
  /** Whether files are dragged over the zone: the component's own state, never the app's. */
  declare private over: boolean;

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

  get #input(): HTMLInputElement | null {
    return this.renderRoot.querySelector("input");
  }

  #pick(): void {
    if (!this.disabled) this.#input?.click();
  }

  // The input clears once its files go out, so choosing the same file again still sends them.
  #change(e: Event): void {
    const input = e.target as HTMLInputElement;
    const files = [...(input.files ?? [])];
    input.value = "";
    if (!this.disabled && files.length) emit<FilesSelectDetail>(this, "files-select", { files });
  }

  // Each drag event that carries files is the zone's: its default cancelled, so a drop never
  // opens the file in the page, disabled or not. While disabled the drop effect is none, so the
  // pointer shows the zone refuses.
  #enter(e: DragEvent): void {
    if (!carriesFiles(e)) return;
    e.preventDefault();
    this.#depth++;
    this.over = true;
  }

  #dragover(e: DragEvent): void {
    if (!carriesFiles(e)) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = this.disabled ? "none" : "copy";
  }

  #leave(e: DragEvent): void {
    if (!carriesFiles(e)) return;
    this.#depth = Math.max(0, this.#depth - 1);
    if (this.#depth === 0) this.over = false;
  }

  #drop(e: DragEvent): void {
    if (!carriesFiles(e)) return;
    e.preventDefault();
    this.#depth = 0;
    this.over = false;
    const files = [...(e.dataTransfer?.files ?? [])];
    if (!this.disabled && files.length) emit<FilesSelectDetail>(this, "files-select", { files });
  }

  #cancel(upload: UploadItem): void {
    if (upload.state === "uploading")
      emit<UploadCancelDetail>(this, "upload-cancel", { id: upload.id });
  }

  #upload(upload: UploadItem) {
    const size = formatBytes(upload.size);
    const uploading = upload.state === "uploading";
    // The trailing cell, at the item's end: an uploading item's cancel control, beside its name,
    // or a finished one's label, centered on its two lines. The detail line sits under the name:
    // an uploading item's bar, as wide as the item, and its bytes sent of its size; a finished
    // one's size, and a failed one's message after it.
    const end =
      upload.state === "uploading"
        ? html`<button
          type="button"
          class="cancel"
          aria-label="Cancel ${upload.name}"
          @click=${() => this.#cancel(upload)}
        >
          Cancel
        </button>`
        : html`<span class="state">${finished[upload.state]}</span>`;
    // The bytes follow the bar, the sent count held to the widest count's width, so the bar keeps
    // its length as they climb.
    const sent = Math.min(Math.max(upload.sent, 0), upload.size);
    const detail = uploading
      ? html`<progress value=${sent} max=${upload.size} aria-label="Uploading ${upload.name}"></progress
          ><span class="bytes"><span class="sent">${formatBytes(sent)}</span> of ${size}</span>`
      : upload.state === "failed" && upload.message
        ? html`<span class="bytes">${size}</span><span class="message">${upload.message}</span>`
        : html`<span class="bytes">${size}</span>`;
    return html`<li class="upload ${upload.state}" data-id=${upload.id}>
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
    return html`<div
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
      ${
        uploads.length
          ? html`<ul class="uploads" aria-label="Uploads">
            ${repeat(
              uploads,
              (upload) => upload.id,
              (upload) => this.#upload(upload),
            )}
          </ul>`
          : nothing
      }`;
  }
}

define(tagName, UploadDropzone);

declare global {
  interface HTMLElementTagNameMap {
    "sl-upload-dropzone": UploadDropzone;
  }
}
