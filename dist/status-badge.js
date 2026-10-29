// A status badge, Lit with a shadow root on the foundation's reset and elements sheets.
// Adapted from spike-html-packages-components (4c0a5d8): src/status-badge.ts, renamed.
import { html, LitElement } from "lit";
import elements from "@jaimestill/spike-html-apps-foundation/baseline/elements.css" with { type: "css" };
import reset from "@jaimestill/spike-html-apps-foundation/baseline/reset.css" with { type: "css" };
import { define, emit } from "@jaimestill/spike-html-apps-foundation/dom.js";
import styles from "./status-badge.css" with { type: "css" };
/** The tag the element defines. */
export const tagName = "sl-status-badge";
/** Shows a label; a click dispatches `badge-select` with that label. */
export class StatusBadge extends LitElement {
    static styles = [reset, elements, styles];
    static properties = {
        label: { type: String },
    };
    constructor() {
        super();
        this.label = "";
    }
    render() {
        return html `<button type="button" @click=${this.#select}>${this.label}</button>`;
    }
    #select() {
        emit(this, "badge-select", { label: this.label });
    }
}
define(tagName, StatusBadge);
