import { LitElement, type PropertyValues } from "lit";
/** The tag the element defines. */
export declare const tagName = "sl-drawer";
/** `open`'s detail: empty. */
export type OpenDetail = Record<string, never>;
/** `close`'s detail: empty. */
export type CloseDetail = Record<string, never>;
/**
 * A drawer for a narrow layout. Its children sit in the default slot, in one of two shadow
 * wrappers, by the mode.
 *
 * At `dock`, a CSS length (48rem by default), and wider, the drawer is docked: its children in an
 * `aside`, a complementary landmark, laid out as an ordinary block in the host's place, always
 * shown, never taking focus; `open` stays false there, setting it true is undone, and `show()`,
 * `close()`, and `toggle()` do nothing. Its header holds `label` as a visible `h2` that names the
 * aside, with no Close button, and stays in view while the children scroll below it when the host
 * is held shorter than they are; the children need no heading of their own.
 * Below `dock` the drawer is closed until `show()`, `toggle()`, or `open` opens it, a
 * native dialog shown by `showModal()`: it covers the viewport edge to edge, sliding in from the
 * inline-start edge, the right in a right-to-left context, the page behind it inert, and focus
 * moves inside it. Its header holds `label` as a visible `h2` that names the dialog, and a Close
 * button whose accessible name adds the label, "Close Documents"; the button's visible text is
 * the `close` slot's, "Close" by default, for a translation. The header stays in view while the
 * children scroll below it. The Close button, Escape, `close()`, `toggle()`, or `open` set false
 * closes it, and the dialog returns focus to the element that held it when it opened. Under
 * reduced motion it opens and closes at once. `open` in the markup, or set before the element is
 * connected, opens the drawer as the page loads below `dock`, sending `open`, and is undone
 * while docked, sending nothing.
 *
 * `open` and `close` go out each time the modal drawer opens or closes, however it was asked,
 * never on a switch between the modes. A switch, as the viewport crosses `dock`, closes an open
 * drawer silently: one that was open becomes docked, and docked content becomes a closed drawer.
 * Removing the element closes it silently too, setting `open` false, so one put back is closed
 * unless `open` is set again before. `dock` is read in a media query, `(width < <dock>)`, where
 * rem and em are the initial font size's, so a viewport of exactly `dock` docks; a length the
 * query can't read never matches, so the drawer stays docked.
 * Each mode renders only its own header, so the shadow tree holds one heading at a time.
 */
export declare class Drawer extends LitElement {
    #private;
    static styles: CSSStyleSheet[];
    static properties: {
        open: {
            type: BooleanConstructor;
            reflect: true;
        };
        dock: {
            type: StringConstructor;
        };
        label: {
            type: StringConstructor;
        };
    };
    /** Whether the modal drawer is open; reflected to `open`, and always false while docked. */
    open: boolean;
    /** The width at which the drawer docks, and wider: a CSS length, read in a media query. */
    dock: string;
    /** The visible heading of the docked aside and of the drawer, which names each. */
    label: string;
    constructor();
    connectedCallback(): void;
    disconnectedCallback(): void;
    /** Opens the modal drawer; below `dock` only. */
    show(): void;
    /** Closes the modal drawer. */
    close(): void;
    /** Opens the modal drawer when it is closed and closes it when it is open. */
    toggle(): void;
    protected willUpdate(changed: PropertyValues<this>): void;
    protected updated(): void;
    render(): import("lit").TemplateResult<1>;
}
declare global {
    interface HTMLElementTagNameMap {
        "sl-drawer": Drawer;
    }
}
