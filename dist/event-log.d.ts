import { LitElement, type PropertyValues } from "lit";
/** The tag the element defines. */
export declare const tagName = "sl-event-log";
/**
 * An event as the log shows it, a subset of CloudEvents 1.0 by its attribute names: its id,
 * unique within its source; its type; its source; the subject it is about, when it names one;
 * when it happened, an RFC 3339 string, as an event's JSON carries it, or a Date; and its data, a
 * JSON value, absent when it carries none.
 */
export interface LogEvent {
    id: string;
    type: string;
    source: string;
    subject?: string | null;
    time: string | Date;
    data?: unknown;
}
/**
 * Shows events as a log, in the order given, oldest first: each its type and its time, formatted
 * by the foundation's formatDateTime, absolute and to the second; under them its source, subject,
 * and id, each labelled, a subject or an id longer than its line cut with an ellipsis, its whole
 * text kept and shown in its title; and its data pretty-printed in a native details, collapsed
 * until opened. An event without data says so in the details' place. Each event is keyed by its
 * source and id, the pair CloudEvents makes unique, so events appended to the list leave those
 * shown in their own nodes and places, and a details the reader opened stays open.
 *
 * The frame is a log, a live region: polite, so an arrival never interrupts, and additions only,
 * so a new event is read once and a re-render or a removal is not. Events are discrete and arrive
 * at a pipeline's pace, seconds apart, unlike a chat reply streamed word by word, which a live
 * region would read at every word. When its consumer constrains its block size, the frame scrolls,
 * and it follows the newest event as one arrives only while the reader is at its end: a reader who
 * scrolled up keeps their place, and the first events shown open at the top.
 */
export declare class EventLog extends LitElement {
    #private;
    static styles: CSSStyleSheet[];
    static properties: {
        events: {
            attribute: false;
        };
    };
    /** The events to show, oldest first. */
    events: readonly LogEvent[];
    constructor();
    protected willUpdate(changed: PropertyValues<this>): void;
    protected updated(): void;
    render(): import("lit").TemplateResult<1>;
}
declare global {
    interface HTMLElementTagNameMap {
        "sl-event-log": EventLog;
    }
}
