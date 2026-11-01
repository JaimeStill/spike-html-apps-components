// The composer, Lit with a shadow root: a multi-line text field and its send control, which a
// stop control replaces while the app is busy. It binds no key: Enter, Shift+Enter, and Escape
// belong to the app, so the field does only what a native textarea does, and an app that sends on
// a key calls send(), the one implementation of the send rules, which the send control calls too.
import { html, LitElement } from "lit";
import { live } from "lit/directives/live.js";
import elements from "@jaimestill/spike-html-apps-foundation/baseline/elements.css" with { type: "css" };
import reset from "@jaimestill/spike-html-apps-foundation/baseline/reset.css" with { type: "css" };
import { define, emit } from "@jaimestill/spike-html-apps-foundation/dom.js";
import styles from "./composer.css" with { type: "css" };
/** The tag the element defines. */
export const tagName = "sl-composer";
/**
 * A multi-line text field and a send control. Activating send sends `send` with the field's text
 * and clears the field; send is disabled while the text is empty or whitespace. While `busy`, a
 * stop control takes send's place, in the same footprint, and sends `stop`; the field still takes
 * typing, so the next message can be drafted, but nothing is sent. While `disabled`, nothing can
 * be typed, sent, or stopped. The field grows with its text from one line to eight, then scrolls.
 *
 * `send()` does what activating send does, so an app that binds a key to sending calls it rather
 * than repeating the rules: it does nothing while the text is empty or whitespace, or the composer
 * is busy or disabled. `value` is the field's text, kept in step with typing, so the app reads a
 * draft or sets one; it sends no event as the text changes. The field is named by `label`, in a
 * label kept for assistive technology and visually hidden, since a composer's place in a chat
 * shows what it is for.
 */
export class Composer extends LitElement {
    static styles = [reset, elements, styles];
    static properties = {
        value: { type: String },
        placeholder: { type: String },
        label: { type: String },
        busy: { type: Boolean, reflect: true },
        disabled: { type: Boolean, reflect: true },
    };
    constructor() {
        super();
        this.value = "";
        this.placeholder = "";
        this.label = "Message";
        this.busy = false;
        this.disabled = false;
    }
    get #field() {
        return this.renderRoot.querySelector("textarea");
    }
    get #sendable() {
        return !this.disabled && !this.busy && (this.value ?? "").trim() !== "";
    }
    #input(e) {
        this.value = e.target.value;
    }
    /** Does what activating send does: clears the field, sends `send` with the text, refocuses. */
    send() {
        if (!this.#sendable)
            return;
        const text = this.value;
        // The field clears before `send` goes out, so a listener that sets `value`, restoring the
        // draft when its send fails, keeps what it set.
        this.value = "";
        emit(this, "send", { text });
        // The control a pointer or the keyboard activated turns disabled once the field is empty,
        // unless the app turns busy, so focus returns to the field.
        this.#field?.focus();
    }
    #stop() {
        if (this.busy && !this.disabled)
            emit(this, "stop", {});
    }
    render() {
        const busy = this.busy;
        // One button, send or stop, keeps focus across the swap. Both labels sit in its one grid cell,
        // the other hidden, so it is as wide as the wider label either way and nothing shifts.
        return html `<label class="label" for="field">${this.label}</label>
      <div class="composer">
        <textarea
          id="field"
          rows="1"
          .value=${live(this.value ?? "")}
          placeholder=${this.placeholder ?? ""}
          ?disabled=${this.disabled}
          @input=${this.#input}
        ></textarea>
        <button
          type="button"
          class="action ${busy ? "stop" : "send"}"
          ?disabled=${busy ? this.disabled : !this.#sendable}
          @click=${busy ? this.#stop : this.send}
        >
          <span class=${busy ? "off" : "on"}>Send</span>
          <span class=${busy ? "on" : "off"}>Stop</span>
        </button>
      </div>`;
    }
}
define(tagName, Composer);
