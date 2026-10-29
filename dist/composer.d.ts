import { LitElement } from "lit";
/** The tag the element defines. */
export declare const tagName = "sl-composer";
/** `send`'s detail: the field's text, as typed. */
export interface SendDetail {
    text: string;
}
/** `stop`'s detail: empty. */
export type StopDetail = Record<string, never>;
/**
 * A multi-line text field and a send control. Activating send sends `send` with the field's text
 * and clears the field; send is disabled while the text is empty or whitespace. While `busy`, a
 * stop control takes send's place, in the same footprint, and sends `stop`; the field still takes
 * typing, so the next message can be drafted, but nothing is sent. While `disabled`, nothing can
 * be typed, sent, or stopped. The field grows with its text from one line to eight, then scrolls.
 *
 * `value` is the field's text, kept in step with typing, so the app reads a draft or sets one; it
 * sends no event as the text changes. The field is named by `label`, in a label kept for assistive
 * technology and visually hidden, since a composer's place in a chat shows what it is for.
 */
export declare class Composer extends LitElement {
    #private;
    static styles: CSSStyleSheet[];
    static properties: {
        value: {
            type: StringConstructor;
        };
        placeholder: {
            type: StringConstructor;
        };
        label: {
            type: StringConstructor;
        };
        busy: {
            type: BooleanConstructor;
            reflect: true;
        };
        disabled: {
            type: BooleanConstructor;
            reflect: true;
        };
    };
    /** The field's text; typing updates it, and setting it sets the field's. */
    value: string;
    /** The field's placeholder, shown while it is empty. */
    placeholder: string;
    /** The field's accessible name, in a visually hidden label. */
    label: string;
    /** Whether the app is answering: stop replaces send; reflected to `busy`. */
    busy: boolean;
    /** Disables the field and the control; reflected to `disabled`. */
    disabled: boolean;
    constructor();
    render(): import("lit").TemplateResult<1>;
}
declare global {
    interface HTMLElementTagNameMap {
        "sl-composer": Composer;
    }
}
