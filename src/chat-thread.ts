// The chat thread, Lit with a shadow root: a conversation's items, in order, as an ordered list
// inside one frame that scrolls when its consumer constrains its block size. The items are a
// structural subset of Open Responses (spec 2026-04-24): messages, reasoning, function calls, and
// their outputs, by the spec's JSON field names, so a response's output or a conversation's
// history fits as it is.

import { html, LitElement, nothing, type PropertyDeclarations, type TemplateResult } from "lit";
import { repeat } from "lit/directives/repeat.js";

import elements from "@jaimestill/spike-html-apps-foundation/baseline/elements.css" with { type: "css" };
import reset from "@jaimestill/spike-html-apps-foundation/baseline/reset.css" with { type: "css" };
import { define } from "@jaimestill/spike-html-apps-foundation/dom.js";
import { markdown } from "./markdown.ts";
import styles from "./chat-thread.css" with { type: "css" };

/** The tag the element defines. */
export const tagName = "sl-chat-thread";

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

/** Text as shown: JSON pretty-printed with two-space indents when it parses, else as it is. */
function pretty(text: string): string {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

/** The label a status shows beside an item's kind; a completed item, or one without a status,
 * shows none. */
const STATUS_LABELS: Record<string, string> = {
  in_progress: "Streaming",
  incomplete: "Incomplete",
  failed: "Failed",
};

/**
 * Shows a conversation's items in order: a user's text as plain text, the assistant's as rendered
 * Markdown, and a refusal as a labelled refusal. A message still in progress reads as streaming,
 * and as its text grows it re-renders in place, the items above it untouched; an incomplete or a
 * failed message is labelled so. With `verbose` set, reasoning, function calls, and their outputs
 * show too, each collapsed in a native details; otherwise they are hidden. Item and part types the
 * thread doesn't know are skipped. Display-only: it sends no event and binds no key.
 *
 * The items are an ordered list of articles, not a log: order is the thread's meaning, and a list
 * tells assistive technology how many items there are and where each sits. A log's live region
 * would announce every word of a streaming reply; a consumer that wants an announcement adds a
 * status of its own.
 */
export class ChatThread extends LitElement {
  static styles = [reset, elements, styles];

  static properties = {
    items: { attribute: false },
    verbose: { type: Boolean, reflect: true },
  } satisfies PropertyDeclarations;

  /** The conversation's items, oldest first. */
  declare items: readonly ThreadItem[];
  /** Whether reasoning, function calls, and their outputs show; reflected to `verbose`. */
  declare verbose: boolean;

  constructor() {
    super();
    this.items = [];
    this.verbose = false;
  }

  // An item's status, labelled, when it has one worth saying: streaming carries its indicator.
  #status(status: string | undefined) {
    const label = status ? STATUS_LABELS[status] : undefined;
    if (!label) return nothing;
    return html`<span class="status ${status}">${label}</span>`;
  }

  #message(item: MessageItem) {
    const role = item.role === "user" ? "User" : "Assistant";
    const parts = (item.content ?? []).map((part) => {
      switch (part?.type) {
        case "input_text":
          return html`<p class="text">${part.text}</p>`;
        case "output_text":
          return html`<div class="markdown">${markdown(part.text ?? "")}</div>`;
        case "refusal":
          return html`<p class="refusal">
            <strong class="label">Refusal</strong> <span>${part.refusal}</span>
          </p>`;
        default:
          return nothing;
      }
    });
    return html`<article
      class="message ${item.role}"
      aria-busy=${item.status === "in_progress" ? "true" : nothing}
    >
      <header class="meta"><span class="role">${role}</span>${this.#status(item.status)}</header>
      <div class="content">${parts}</div>
    </article>`;
  }

  // A verbose item: its kind, what names it, and its status, in the summary of a details collapsed
  // by default. The summary keeps its native marker, so its parts are inline, a space apart, and
  // a narrow thread wraps the line between them, each whole.
  #details(item: ThreadItem, kind: string, names: TemplateResult[], body: unknown) {
    const status = this.#status(item.status);
    const parts = [html`<span class="kind">${kind}</span>`, ...names];
    if (status !== nothing) parts.push(status);
    return html`<details class="verbose ${item.type}">
      <summary>${parts.map((part, index) => (index ? html` ${part}` : part))}</summary>
      <div class="content">${body}</div>
    </details>`;
  }

  #reasoning(item: ReasoningItem) {
    const text = (parts: readonly ReasoningTextPart[] | undefined, type: string) =>
      (parts ?? [])
        .filter((part) => part?.type === type)
        .map((part) => html`<p class="text ${type}">${part.text}</p>`);
    const shown = [...text(item.summary, "summary_text"), ...text(item.content, "reasoning_text")];
    return this.#details(
      item,
      "Reasoning",
      [],
      shown.length ? shown : html`<p class="empty">No reasoning text.</p>`,
    );
  }

  #call(item: FunctionCallItem) {
    const args = item.arguments ?? "";
    return this.#details(
      item,
      "Function call",
      [html`<code class="name">${item.name}</code>`, html`<span class="id">${item.call_id}</span>`],
      args.trim() ? html`<pre>${pretty(args)}</pre>` : html`<p class="empty">No arguments.</p>`,
    );
  }

  #output(item: FunctionCallOutputItem, name: string | undefined) {
    const output =
      typeof item.output === "string"
        ? item.output
        : (item.output ?? [])
            .filter((part) => part?.type === "input_text")
            .map((part) => part.text)
            .join("\n");
    return this.#details(
      item,
      "Function output",
      [
        ...(name ? [html`<code class="name">${name}</code>`] : []),
        html`<span class="id">${item.call_id}</span>`,
      ],
      output.trim() ? html`<pre>${pretty(output)}</pre>` : html`<p class="empty">No output.</p>`,
    );
  }

  render() {
    // Each call's name by its call_id, so an output names the function it answers.
    const names = new Map<string, string>();
    // The items shown, each keyed by its id, or by its place when it has none, as a user's input
    // message hasn't: the keyed repeat keeps every item's DOM as the list grows and as verbose
    // turns, so a streaming message re-renders in place and the items above it don't move.
    const shown: { key: string; kind: string; view: TemplateResult }[] = [];
    (this.items ?? []).forEach((item, index) => {
      const key = item?.id ? `id:${item.id}` : `at:${index}`;
      switch (item?.type) {
        case "message":
          if (item.role === "user" || item.role === "assistant") {
            shown.push({ key, kind: item.role, view: this.#message(item) });
          }
          return;
        case "reasoning":
          if (this.verbose) shown.push({ key, kind: "verbose", view: this.#reasoning(item) });
          return;
        case "function_call":
          names.set(item.call_id, item.name);
          if (this.verbose) shown.push({ key, kind: "verbose", view: this.#call(item) });
          return;
        case "function_call_output":
          if (this.verbose) {
            shown.push({ key, kind: "verbose", view: this.#output(item, names.get(item.call_id)) });
          }
          return;
      }
    });
    // The frame scrolls when the consumer constrains it, so the keyboard reaches it by Tab, and it
    // is named for what it holds.
    return html`<div class="frame" tabindex="0" role="region" aria-label="Conversation">
      ${
        shown.length
          ? html`<ol class="thread">
            ${repeat(
              shown,
              ({ key }) => key,
              ({ kind, view }) => html`<li class="item ${kind}">${view}</li>`,
            )}
          </ol>`
          : html`<p class="empty-thread">No messages yet.</p>`
      }
    </div>`;
  }
}

define(tagName, ChatThread);

declare global {
  interface HTMLElementTagNameMap {
    "sl-chat-thread": ChatThread;
  }
}
