import { LitElement, type PropertyValues, type TemplateResult } from "lit";
/** The tag the element defines. */
export declare const tagName = "sl-chat-thread";
/**
 * An item's status: still being produced, finished, stopped before finishing, or failed. An
 * input item, a user's message, has none.
 */
export type ItemStatus = "in_progress" | "completed" | "incomplete" | "failed";
/** Text a user gave the model: an `input_text` part, shown as plain text. */
export interface InputTextPart {
    type: "input_text";
    text: string;
}
/** Text the model produced: an `output_text` part, rendered as Markdown. */
export interface OutputTextPart {
    type: "output_text";
    text: string;
}
/** The model's refusal to answer: a `refusal` part, shown as a labelled refusal. */
export interface RefusalPart {
    type: "refusal";
    refusal: string;
}
/** A message's content part the thread shows; a part of any other type is skipped. */
export type MessagePart = InputTextPart | OutputTextPart | RefusalPart;
/** A `message` item: content parts from the user or the assistant. */
export interface MessageItem {
    type: "message";
    id?: string;
    role: "user" | "assistant";
    status?: ItemStatus;
    content: readonly MessagePart[];
}
/** A text part of a reasoning item: `reasoning_text` in its content, `summary_text` in its
 * summary. */
export interface ReasoningTextPart {
    type: "reasoning_text" | "summary_text";
    text: string;
}
/** A `reasoning` item: the model's reasoning, as its content, its summary, or both. */
export interface ReasoningItem {
    type: "reasoning";
    id?: string;
    status?: ItemStatus;
    content?: readonly ReasoningTextPart[];
    summary?: readonly ReasoningTextPart[];
}
/** A `function_call` item: the model's call of a function, its arguments JSON text. */
export interface FunctionCallItem {
    type: "function_call";
    id?: string;
    status?: ItemStatus;
    call_id: string;
    name: string;
    arguments: string;
}
/** A `function_call_output` item: a call's result, a string or an array of input_text parts. */
export interface FunctionCallOutputItem {
    type: "function_call_output";
    id?: string;
    status?: ItemStatus;
    call_id: string;
    output: string | readonly InputTextPart[];
}
/** An item the thread shows; an item of any other type is skipped. */
export type ThreadItem = MessageItem | ReasoningItem | FunctionCallItem | FunctionCallOutputItem;
/**
 * Shows a conversation's items in order: a user's text as plain text, the assistant's as rendered
 * Markdown, and a refusal as a labelled refusal. A message still in progress reads as streaming,
 * and as its text grows it re-renders in place, the items above it untouched; an incomplete or a
 * failed message is labelled so. With `verbose` set, reasoning, function calls, and their outputs
 * show too, each collapsed in a native details; otherwise they are hidden. A reasoning item's line
 * carries its summary after its kind and status, and its details holds its content alone; with a
 * summary and no content, the line stands alone, with nothing to expand. Item and part types the
 * thread doesn't know are skipped. Display-only: it sends no event and binds no key.
 *
 * The items are an ordered list of articles, not a log: order is the thread's meaning, and a list
 * tells assistive technology how many items there are and where each sits. A log's live region
 * would announce every word of a streaming reply; a consumer that wants an announcement adds a
 * status of its own.
 *
 * When its consumer constrains its block size, the frame scrolls, and it follows the newest item,
 * as the event log does: an update, an item added or a streaming reply's text grown, scrolls the
 * frame to its end while the reader is at its end, within a pixel or two, so a reader who scrolled
 * up keeps their place as the reply streams on, and one who scrolls back to the end is followed
 * again. A conversation reads from its newest item, so the first items shown open at the end, and a
 * user's message added to the end, the one the reader just sent, alone or with the reply's first
 * text, brings the frame to its end wherever the reader was. The last item grown with no update,
 * a details the reader opens in it or an image that loads, is followed the same way: while the
 * reader is at the frame's end, its end stays in view, and a reader who scrolled up keeps their
 * place. Only the last item's growth follows: an item above it grown, a details the reader opens
 * there, behaves natively, the summary clicked staying where it was and its content opening below
 * it, and leaves the reader short of the end. The scroll is instant, never smooth, under any
 * motion preference.
 * The thread follows only in its own frame: unconstrained, it is as tall as its content and its
 * consumer's scroll moves it, which the thread never scrolls, so a consumer that wants it followed
 * holds it to a height.
 */
export declare class ChatThread extends LitElement {
    #private;
    static styles: CSSStyleSheet[];
    static properties: {
        items: {
            attribute: false;
        };
        verbose: {
            type: BooleanConstructor;
            reflect: true;
        };
    };
    /** The conversation's items, oldest first. */
    items: readonly ThreadItem[];
    /** Whether reasoning, function calls, and their outputs show; reflected to `verbose`. */
    verbose: boolean;
    constructor();
    connectedCallback(): void;
    disconnectedCallback(): void;
    protected willUpdate(changed: PropertyValues<this>): void;
    protected updated(): void;
    render(): TemplateResult<1>;
}
declare global {
    interface HTMLElementTagNameMap {
        "sl-chat-thread": ChatThread;
    }
}
