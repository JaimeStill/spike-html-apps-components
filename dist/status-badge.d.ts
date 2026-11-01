import { LitElement } from "lit";
/** The tag the element defines. */
export declare const tagName = "sl-status-badge";
/** Shows a label; a click dispatches `badge-select` with that label. */
export declare class StatusBadge extends LitElement {
    #private;
    static styles: CSSStyleSheet[];
    static properties: {
        label: {
            type: StringConstructor;
        };
    };
    label: string;
    constructor();
    render(): import("lit").TemplateResult<1>;
}
