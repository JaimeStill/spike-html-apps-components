// The drawer, Lit with a shadow root: docked inline as a complementary landmark, an aside, in a
// wide layout, and a modal dialog covering the viewport, sliding in from the inline-start edge, in
// a narrow one. The mode is the viewport's, by a media query on `dock`; a switch swaps only the
// shadow root's wrapper and its slot, so the slotted content, the host's own children, is never
// moved, disconnected, or re-created.
import { html, LitElement, nothing } from "lit";
import elements from "@jaimestill/spike-html-apps-foundation/baseline/elements.css" with { type: "css" };
import reset from "@jaimestill/spike-html-apps-foundation/baseline/reset.css" with { type: "css" };
import { define, emit } from "@jaimestill/spike-html-apps-foundation/dom.js";
import styles from "./drawer.css" with { type: "css" };
/** The tag the element defines. */
export const tagName = "sl-drawer";
/**
 * A drawer for a narrow layout. Its children sit in the default slot, in one of two shadow
 * wrappers, by the mode.
 *
 * Wider than `dock`, a CSS length (48rem by default), the drawer is docked: its children in an
 * `aside`, a complementary landmark named by `label`, laid out as an ordinary block in the host's
 * place, always shown, never taking focus; `open` stays false there, setting it true is undone,
 * and `show()`, `close()`, and `toggle()` do nothing.
 * At or below `dock` the drawer is closed until `show()`, `toggle()`, or `open` opens it, a
 * native dialog shown by `showModal()`: it covers the viewport edge to edge, sliding in from the
 * inline-start edge, the right in a right-to-left context, the page behind it inert, and focus
 * moves inside it. Its header holds `label` as a visible `h2` that names the dialog, and a Close
 * button whose accessible name adds the label, "Close Documents"; the button's visible text is
 * the `close` slot's, "Close" by default, for a translation. The header stays in view while the
 * children scroll below it. The Close button, Escape, `close()`, `toggle()`, or `open` set false
 * closes it, and the dialog returns focus to the element that held it when it opened. Under
 * reduced motion it opens and closes at once. `open` in the markup, or set before the element is
 * connected, opens the drawer as the page loads at or below `dock`, sending `open`, and is undone
 * while docked, sending nothing.
 *
 * `open` and `close` go out each time the modal drawer opens or closes, however it was asked,
 * never on a switch between the modes. A switch, as the viewport crosses `dock`, closes an open
 * drawer silently: one that was open becomes docked, and docked content becomes a closed drawer.
 * Removing the element closes it silently too, setting `open` false, so one put back is closed
 * unless `open` is set again before. `dock` is read in a media query,
 * `(max-width: <dock>)`, where rem and em are the initial font size's; a length the query can't
 * read never matches, so the drawer stays docked.
 */
export class Drawer extends LitElement {
    static styles = [reset, elements, styles];
    static properties = {
        open: { type: Boolean, reflect: true },
        dock: { type: String },
        label: { type: String },
    };
    // The mode is a custom state, drawer or docked, which a host's page may style.
    #internals = this.attachInternals();
    #query = null;
    // The mode, which picks the wrapper rendered: null until the element is connected, and again
    // once it is removed, so a reconnected element reapplies its mode.
    #narrow = null;
    // Whether the dialog is open modally as far as the element has handled it, so a close event
    // the element caused itself, or one queued before a later open, is never reported again.
    #modal = false;
    constructor() {
        super();
        this.open = false;
        this.dock = "48rem";
        this.label = "";
    }
    get #dialog() {
        return this.renderRoot.querySelector("dialog");
    }
    connectedCallback() {
        super.connectedCallback();
        this.#watch();
    }
    // Removed, the element closes silently: a removed modal dialog leaves the top layer but keeps
    // its open attribute, which a reconnect would show non-modally.
    disconnectedCallback() {
        super.disconnectedCallback();
        this.#query?.removeEventListener("change", this.#change);
        this.#query = null;
        this.#narrow = null;
        this.#modal = false;
        this.open = false;
        this.#dialog?.close();
    }
    /** Opens the modal drawer; at or below `dock` only. */
    show() {
        // The query's change event lags a resize by a frame; its matches is current, so the mode is
        // read from it first, and a show() just after a resize opens the drawer the viewport calls for,
        // the update run at once so the dialog is rendered and shown before show() returns.
        if (this.#query)
            this.#change();
        if (!this.#narrow || this.open)
            return;
        this.open = true;
        this.performUpdate();
    }
    /** Closes the modal drawer. */
    close() {
        if (!this.open)
            return;
        this.open = false;
        this.#sync();
    }
    /** Opens the modal drawer when it is closed and closes it when it is open. */
    toggle() {
        if (this.open)
            this.close();
        else
            this.show();
    }
    /** Reads the mode from a new query on `dock`, listening for its changes. */
    #watch() {
        this.#query?.removeEventListener("change", this.#change);
        this.#query = matchMedia(`(max-width: ${this.dock})`);
        this.#query.addEventListener("change", this.#change);
        this.#change();
    }
    /**
     * Sets the mode from the query. A switch renders the other wrapper around the same slotted
     * children: an open dialog leaves the top layer as it is removed, with no close event and no
     * focus moved, and the new dialog is created closed, so nothing slides. The first mode, on
     * connecting, is no switch: `open` stands, from the markup or set before, and opens the drawer
     * by the ordinary update, or is undone there if the drawer is docked.
     */
    #change = () => {
        const narrow = this.#query?.matches ?? false;
        if (narrow === this.#narrow)
            return;
        const switched = this.#narrow !== null;
        this.#narrow = narrow;
        const { states } = this.#internals;
        states.delete(narrow ? "docked" : "drawer");
        states.add(narrow ? "drawer" : "docked");
        if (switched) {
            this.#modal = false;
            this.open = false;
        }
        this.requestUpdate();
    };
    willUpdate(changed) {
        if (changed.has("dock") && this.#query)
            this.#watch();
        if (!this.#narrow)
            this.open = false;
    }
    updated() {
        this.#sync();
    }
    /** Brings the dialog to `open`, reporting a modal open or close. */
    #sync() {
        const dialog = this.#dialog;
        if (!dialog)
            return;
        if (this.open && !this.#modal) {
            dialog.showModal();
            this.#modal = true;
            emit(this, "open", {});
        }
        else if (!this.open && this.#modal) {
            this.#modal = false;
            dialog.close();
            emit(this, "close", {});
        }
    }
    // The dialog closed itself, by Escape: the element follows. A close it caused, one queued
    // before a later open, or one from a dialog a switch has since replaced finds the modal flag
    // clear, the dialog open, or another dialog rendered.
    #closed(e) {
        const dialog = this.#dialog;
        if (!this.#modal || !dialog || e.currentTarget !== dialog || dialog.open)
            return;
        this.#modal = false;
        this.open = false;
        emit(this, "close", {});
    }
    render() {
        if (!this.#narrow) {
            return html `<aside aria-label=${this.label || nothing}><slot></slot></aside>`;
        }
        // The label is in the Close button's name, visually hidden, so a translated text in the close
        // slot still names what the button closes.
        return html `<dialog aria-labelledby="title" @close=${this.#closed}>
      <header>
        <h2 id="title">${this.label}</h2>
        <button type="button" @click=${this.close}>
          <slot name="close">Close</slot><span class="hidden"> ${this.label}</span>
        </button>
      </header>
      <div class="body"><slot></slot></div>
    </dialog>`;
    }
}
define(tagName, Drawer);
