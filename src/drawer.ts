// The drawer, Lit with a shadow root: one native dialog holding the default slot, docked inline in
// a wide layout and a modal drawer from the inline-start edge in a narrow one. The mode is the
// viewport's, by a media query on `dock`; a switch changes only how the one dialog is shown, so the
// slotted content is never moved, re-parented, or re-created.

import { html, LitElement, type PropertyDeclarations, type PropertyValues } from "lit";

import elements from "@jaimestill/spike-html-apps-foundation/baseline/elements.css" with { type: "css" };
import reset from "@jaimestill/spike-html-apps-foundation/baseline/reset.css" with { type: "css" };
import { define, emit } from "@jaimestill/spike-html-apps-foundation/dom.js";
import styles from "./drawer.css" with { type: "css" };

/** The tag the element defines. */
export const tagName = "sl-drawer";

/** `open`'s detail: empty. */
export type OpenDetail = Record<string, never>;

/** `close`'s detail: empty. */
export type CloseDetail = Record<string, never>;

/**
 * A drawer for a narrow layout. Its children sit in the default slot, inside one native dialog.
 *
 * Wider than `dock`, a CSS length (48rem by default), the dialog is docked: open non-modally,
 * by its attribute, so it never takes focus, laid out as an ordinary block in the host's place,
 * always visible, with no scrim and no focus trap; `open` stays false there, and `show()`,
 * `close()`, and `toggle()` do nothing.
 * At or below `dock` the drawer is closed until `show()`, `toggle()`, or `open` opens it with
 * `showModal()`: it slides in from the inline-start edge, the right in a right-to-left context,
 * over a scrim, the page behind it inert, and focus moves inside it. Escape, a click on the scrim,
 * `close()`, `toggle()`, or `open` set false closes it, and the dialog returns focus to the
 * element that held it when it opened. Under reduced motion it opens and closes at once.
 *
 * `open` and `close` go out each time the modal drawer opens or closes, however it was asked,
 * never on a switch between the modes. A switch, as the viewport crosses `dock`, closes an open
 * drawer silently: one that was open becomes docked, and docked content becomes a closed drawer.
 * Removing the element closes it silently too. `dock` is read in a media query, `(max-width: <dock>)`, where rem and em are the initial font
 * size's; a length the query can't read never matches, so the drawer stays docked. `label` is the
 * dialog's accessible name.
 */
export class Drawer extends LitElement {
  static styles = [reset, elements, styles];

  static properties = {
    open: { type: Boolean, reflect: true },
    dock: { type: String },
    label: { type: String },
  } satisfies PropertyDeclarations;

  /** Whether the modal drawer is open; reflected to `open`, and always false while docked. */
  declare open: boolean;
  /** The width above which the drawer docks: a CSS length, read in a media query. */
  declare dock: string;
  /** The dialog's accessible name. */
  declare label: string;

  // The mode is a custom state, drawer or docked, which the sheet styles; instant holds every
  // transition off for the one style change a mode switch makes.
  readonly #internals = this.attachInternals();
  #query: MediaQueryList | null = null;
  // The mode the dialog is shown in: null until the element is connected, and again once it is
  // removed, so a reconnected element reapplies its mode.
  #narrow: boolean | null = null;
  // Whether the dialog is open modally as far as the element has handled it, so a close event
  // the element caused itself, or one queued before a later open, is never reported again.
  #modal = false;
  // Whether the pointer went down on the scrim, so a press that started inside the drawer and
  // ended on the scrim isn't taken for a click on it.
  #pressedScrim = false;

  constructor() {
    super();
    this.open = false;
    this.dock = "48rem";
    this.label = "";
  }

  get #dialog(): HTMLDialogElement | null {
    return this.renderRoot.querySelector("dialog");
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#watch();
  }

  // Removed, the element closes silently: a removed modal dialog leaves the top layer but keeps
  // its open attribute, which a reconnect would show non-modally.
  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#query?.removeEventListener("change", this.#change);
    this.#query = null;
    this.#narrow = null;
    this.#modal = false;
    this.open = false;
    this.#dialog?.close();
  }

  /** Opens the modal drawer; at or below `dock` only. */
  show(): void {
    // The query's change event lags a resize by a frame; its matches is current, so the mode is
    // read from it first, and a show() just after a resize opens the drawer the viewport calls for.
    if (this.#query) this.#change();
    if (!this.#narrow || this.open) return;
    this.open = true;
    this.#sync();
  }

  /** Closes the modal drawer. */
  close(): void {
    if (!this.open) return;
    this.open = false;
    this.#sync();
  }

  /** Opens the modal drawer when it is closed and closes it when it is open. */
  toggle(): void {
    if (this.open) this.close();
    else this.show();
  }

  /** Reads the mode from a new query on `dock`, listening for its changes. */
  #watch(): void {
    this.#query?.removeEventListener("change", this.#change);
    this.#query = matchMedia(`(max-width: ${this.dock})`);
    this.#query.addEventListener("change", this.#change);
    this.#change();
  }

  /** Sets the mode from the query; a switch reshows the dialog in the new mode, transitions off. */
  #change = (): void => {
    const narrow = this.#query?.matches ?? false;
    if (narrow === this.#narrow) return;
    this.#narrow = narrow;
    const { states } = this.#internals;
    states.add("instant");
    states.delete(narrow ? "docked" : "drawer");
    states.add(narrow ? "drawer" : "docked");
    const dialog = this.#dialog;
    if (dialog?.open) {
      this.#modal = false;
      dialog.close();
    }
    this.open = false;
    if (dialog && !narrow) this.#dockDialog(dialog);
    // The new mode's styles apply now, while instant holds the transitions off.
    dialog?.getBoundingClientRect();
    states.delete("instant");
  };

  // Docked, the dialog is open by its attribute rather than show(), which would run the dialog
  // focusing steps and move focus into the content on each load and each switch to docked.
  #dockDialog(dialog: HTMLDialogElement): void {
    dialog.toggleAttribute("open", true);
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has("dock") && this.#query) this.#watch();
    if (!this.#narrow) this.open = false;
  }

  protected override updated(): void {
    this.#sync();
  }

  /** Brings the dialog to the element's mode and `open`, reporting a modal open or close. */
  #sync(): void {
    const dialog = this.#dialog;
    if (!dialog) return;
    if (!this.#narrow) {
      if (!dialog.open) this.#dockDialog(dialog);
      return;
    }
    if (this.open && !this.#modal) {
      dialog.showModal();
      this.#modal = true;
      emit<OpenDetail>(this, "open", {});
    } else if (!this.open && this.#modal) {
      this.#modal = false;
      dialog.close();
      emit<CloseDetail>(this, "close", {});
    }
  }

  // The dialog closed itself, by Escape or a form of method dialog: the element follows. A close
  // it caused, or one queued before a later open, finds the modal flag clear or the dialog open.
  #closed(): void {
    if (!this.#modal || this.#dialog?.open) return;
    this.#modal = false;
    this.open = false;
    emit<CloseDetail>(this, "close", {});
  }

  /** Whether the event is the pointer on the scrim: on the dialog itself, outside its box. */
  #onScrim(e: MouseEvent): boolean {
    const dialog = this.#dialog;
    if (!this.#modal || !dialog || e.target !== dialog) return false;
    const { left, right, top, bottom } = dialog.getBoundingClientRect();
    return e.clientX < left || e.clientX > right || e.clientY < top || e.clientY > bottom;
  }

  #pointerdown(e: PointerEvent): void {
    this.#pressedScrim = this.#onScrim(e);
  }

  #click(e: MouseEvent): void {
    const scrim = this.#pressedScrim && this.#onScrim(e);
    this.#pressedScrim = false;
    if (scrim) this.close();
  }

  render() {
    return html`<dialog
      aria-label=${this.label}
      @close=${this.#closed}
      @pointerdown=${this.#pointerdown}
      @click=${this.#click}
    >
      <slot></slot>
    </dialog>`;
  }
}

define(tagName, Drawer);

declare global {
  interface HTMLElementTagNameMap {
    "sl-drawer": Drawer;
  }
}
