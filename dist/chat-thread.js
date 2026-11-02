// The chat thread, Lit with a shadow root: a conversation's items, in order, as an ordered list
// inside one frame that scrolls when its consumer constrains its block size. The items are a
// structural subset of Open Responses (spec 2026-04-24): messages, reasoning, function calls, and
// their outputs, by the spec's JSON field names, so a response's output or a conversation's
// history fits as it is.
import { html, LitElement, nothing, } from "lit";
import { repeat } from "lit/directives/repeat.js";
import elements from "@jaimestill/spike-html-apps-foundation/baseline/elements.css" with { type: "css" };
import reset from "@jaimestill/spike-html-apps-foundation/baseline/reset.css" with { type: "css" };
import { define } from "@jaimestill/spike-html-apps-foundation/dom.js";
import { formatJson } from "./json.js";
import { markdown } from "./markdown.js";
import styles from "./chat-thread.css" with { type: "css" };
/** The tag the element defines. */
export const tagName = "sl-chat-thread";
/**
 * Text as shown: valid JSON formatted from its own tokens by `formatJson()`, two spaces an indent,
 * else the text as it is. `JSON.parse` decides validity alone and its value is thrown away:
 * printing the value would move integer-like keys first, rewrite numbers, and drop duplicate keys.
 * Text whose formatting would pass the longest string, a RangeError, shows as it is too.
 */
function pretty(text) {
    try {
        JSON.parse(text);
        return formatJson(text);
    }
    catch {
        return text;
    }
}
/** The label a status shows beside an item's kind; a completed item, or one without a status,
 * shows none. */
const STATUS_LABELS = {
    in_progress: "Streaming",
    incomplete: "Incomplete",
    failed: "Failed",
};
/**
 * Whether a frame is scrolled to its end, as far as the browser can tell. Its integer heights and
 * its scroll position, snapped to the device pixel, leave up to two pixels between, and more
 * under a CSS zoom below 1, where a device pixel is more than a CSS one; within one CSS pixel, the
 * follow would stop by itself at a zoom of 0.9 or 1.1. A browser without `currentCSSZoom` is taken
 * as unzoomed. `height` is the scroll height to measure against, the frame's own by default, or
 * the one it had before its content grew.
 */
function atEnd(frame, height = frame.scrollHeight) {
    const zoom = Math.min(frame.currentCSSZoom ?? 1, 1);
    return height - frame.clientHeight - frame.scrollTop <= 2 / zoom;
}
/** Scrolls a frame to its end, instantly: the follow's one scroll. */
function end(frame) {
    frame.scrollTop = frame.scrollHeight;
}
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
export class ChatThread extends LitElement {
    static styles = [reset, elements, styles];
    static properties = {
        items: { attribute: false },
        verbose: { type: Boolean, reflect: true },
    };
    /** Whether the update in flight follows the newest item: the frame was at its end, or showed
     * no items yet, or the update adds a user's message. */
    #follow = false;
    /** The frame's scroll height when its content was last seen, by the last update, the last
     * resize of any of it, or the thread's connecting: the end the reader was at, or not, before the
     * last item grew with no update. */
    #height = 0;
    /** The frame's content the observer watches: the list, or the empty note before any item. */
    #content = null;
    /** The content's end, the one item whose growth follows: the list's last item, or the empty
     * note before any item. */
    #last = null;
    /** The last item's height when it was last seen, as `#height` is: whether it grew. */
    #size = 0;
    // The content resized with no update. Only the last item grown follows, its end kept in view
    // while the reader was at the end the content had; an item above it grown is left to the
    // browser, the summary the reader clicked staying where it was. Every resize, the last item's
    // or one above it, records the heights it leaves, so a growth above the end, which leaves the
    // reader short of the new end, has the next growth of the last measured against the end as it
    // now is. The observer watches the whole content, which any item's growth resizes, and the
    // last item's growth is its height against the one last seen. A ResizeObserver rather than the
    // details' toggle event sees every cause, an image's load as well as a disclosure, and leaves
    // the details toggling natively. Its callback runs after layout, the growth already in the
    // scroll height, so the reader's place is measured against the height last seen; a scroll
    // listener keeping the place instead could read the grown height, its event dispatched between
    // the growth and the callback. A reader at the end of content that shrank is at its new end
    // already, the browser's clamp. The scroll leaves the content's size alone, so it never loops
    // the observer.
    #resized = new ResizeObserver(() => {
        const frame = this.renderRoot.querySelector(".frame");
        if (!frame)
            return;
        const grew = this.#measured() !== this.#size;
        if (grew && atEnd(frame, this.#height))
            end(frame);
        this.#seen(frame);
    });
    constructor() {
        super();
        this.items = [];
        this.verbose = false;
    }
    // Connected again, the frame is measured as it now is, its updates while detached unmeasured
    // and its scroll position the browser's, and observed anew, so the observer's first callback
    // finds the content as the reader does and scrolls nothing on its own. The first connection has
    // no frame yet: its first update observes it.
    connectedCallback() {
        super.connectedCallback();
        const frame = this.renderRoot.querySelector(".frame");
        if (!frame)
            return;
        this.#content = null;
        this.#observe(frame);
        this.#seen(frame);
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        this.#resized.disconnect();
    }
    willUpdate(changed) {
        // The frame as the last update left it, before this one grows it: at its end, within the
        // browser's rounding, when it doesn't scroll at all too. No frame yet is the first render.
        const frame = this.renderRoot.querySelector(".frame");
        const before = changed.has("items")
            ? (changed.get("items") ?? [])
            : (this.items ?? []);
        // A user's message among the items added, the newest or the one before the reply's first
        // text, when the consumer adds both at once.
        const sent = (this.items ?? [])
            .slice(before.length)
            .some((item) => item?.type === "message" && item.role === "user");
        this.#follow =
            (changed.has("items") || changed.has("verbose")) &&
                (frame === null || before.length === 0 || sent || atEnd(frame));
    }
    updated() {
        const follow = this.#follow;
        this.#follow = false;
        // Detached, the frame has no layout to follow or measure, and the observer is disconnected:
        // connecting measures and observes it.
        if (!this.isConnected)
            return;
        const frame = this.renderRoot.querySelector(".frame");
        if (!frame)
            return;
        if (follow)
            end(frame);
        // The content as this update left it, followed or not.
        this.#observe(frame);
        this.#seen(frame);
    }
    // The frame's content as it now is, the height the observer's next callback measures against.
    #seen(frame) {
        this.#height = frame.scrollHeight;
        this.#size = this.#measured();
    }
    // The last item's height, the empty note's before any item, or none.
    #measured() {
        return this.#last?.getBoundingClientRect().height ?? 0;
    }
    // The frame's content observed, anew when the list replaced the empty note, or the note the
    // list; and its end found again, an item added after the last.
    #observe(frame) {
        const content = frame.firstElementChild;
        this.#last = content?.matches("ol") ? content.lastElementChild : content;
        if (content === this.#content)
            return;
        if (this.#content)
            this.#resized.unobserve(this.#content);
        this.#content = content;
        if (content)
            this.#resized.observe(content);
    }
    // An item's status, labelled, when it has one worth saying: streaming carries its indicator.
    #status(status) {
        const label = status ? STATUS_LABELS[status] : undefined;
        if (!label)
            return nothing;
        return html `<span class="status ${status}">${label}</span>`;
    }
    #message(item) {
        const role = item.role === "user" ? "User" : "Assistant";
        const parts = (item.content ?? []).map((part) => {
            switch (part?.type) {
                case "input_text":
                    return html `<p class="text">${part.text}</p>`;
                case "output_text":
                    return html `<div class="markdown">${markdown(part.text ?? "")}</div>`;
                case "refusal":
                    return html `<p class="refusal">
            <strong class="label">Refusal</strong> <span>${part.refusal}</span>
          </p>`;
                default:
                    return nothing;
            }
        });
        return html `<article
      class="message ${item.role}"
      aria-busy=${item.status === "in_progress" ? "true" : nothing}
    >
      <header class="meta"><span class="role">${role}</span>${this.#status(item.status)}</header>
      <div class="content">${parts}</div>
    </article>`;
    }
    // A verbose item's line: its kind, what names it, and its status, then what describes it, in
    // the label's type. The parts are inline, a space apart, so a narrow thread wraps the line
    // between them, each whole but the description, which wraps as prose.
    #line(item, kind, names, described) {
        const status = this.#status(item.status);
        const parts = [html `<span class="kind">${kind}</span>`, ...names];
        if (status !== nothing)
            parts.push(status);
        parts.push(...described);
        return parts.map((part, index) => (index ? html ` ${part}` : part));
    }
    // A verbose item: its line in the summary of a details collapsed by default, which keeps its
    // native marker.
    #details(item, kind, names, body, described = []) {
        return html `<details class="verbose ${item.type}">
      <summary>${this.#line(item, kind, names, described)}</summary>
      <div class="content">${body}</div>
    </details>`;
    }
    // A reasoning item: its summary on the line, after a separator the accessibility tree skips,
    // and its content inside, the summary not again. Its summary parts join into one sentence run;
    // a part with no text yet, as one just begun streaming, is no summary. With content but no
    // summary, the line reads Reasoning alone; with neither, the details says there is no text. With
    // a summary and no content, nothing would expand, so the line stands alone, a paragraph in the
    // summary's type and place: no disclosure that opens on nothing. Its gutter, hidden from the
    // accessibility tree, holds the room of the summaries' marker, so its kind lines up with theirs;
    // no whitespace before the kind, which would widen it.
    #reasoning(item) {
        const parts = (parts, type) => (parts ?? []).filter((part) => part?.type === type);
        const summary = parts(item.summary, "summary_text")
            .map((part) => part.text ?? "")
            .join(" ")
            .trim();
        const content = parts(item.content, "reasoning_text");
        const thought = content.some((part) => part.text?.trim());
        const described = summary ? [html `<span class="summary-text">${summary}</span>`] : [];
        if (summary && !thought) {
            const gutter = html `<span class="gutter" aria-hidden="true"></span>`;
            const line = this.#line(item, "Reasoning", [], described);
            return html `<p class="verbose reasoning line">${gutter}${line}</p>`;
        }
        return this.#details(item, "Reasoning", [], thought
            ? content.map((part) => html `<p class="text reasoning_text">${part.text}</p>`)
            : html `<p class="empty">No reasoning text.</p>`, described);
    }
    #call(item) {
        const args = item.arguments ?? "";
        return this.#details(item, "Function call", [html `<code class="name">${item.name}</code>`, html `<span class="id">${item.call_id}</span>`], args.trim() ? html `<pre>${pretty(args)}</pre>` : html `<p class="empty">No arguments.</p>`);
    }
    #output(item, name) {
        const output = typeof item.output === "string"
            ? item.output
            : (item.output ?? [])
                .filter((part) => part?.type === "input_text")
                .map((part) => part.text)
                .join("\n");
        return this.#details(item, "Function output", [
            ...(name ? [html `<code class="name">${name}</code>`] : []),
            html `<span class="id">${item.call_id}</span>`,
        ], output.trim() ? html `<pre>${pretty(output)}</pre>` : html `<p class="empty">No output.</p>`);
    }
    render() {
        // Each call's name by its call_id, so an output names the function it answers.
        const names = new Map();
        // The items shown, each keyed by its id, or by its place when it has none, as a user's input
        // message hasn't: the keyed repeat keeps every item's DOM as the list grows and as verbose
        // turns, so a streaming message re-renders in place and the items above it don't move.
        const shown = [];
        (this.items ?? []).forEach((item, index) => {
            const key = item?.id ? `id:${item.id}` : `at:${index}`;
            switch (item?.type) {
                case "message":
                    if (item.role === "user" || item.role === "assistant") {
                        shown.push({ key, kind: item.role, view: this.#message(item) });
                    }
                    return;
                case "reasoning":
                    if (this.verbose)
                        shown.push({ key, kind: "verbose", view: this.#reasoning(item) });
                    return;
                case "function_call":
                    names.set(item.call_id, item.name);
                    if (this.verbose)
                        shown.push({ key, kind: "verbose", view: this.#call(item) });
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
        return html `<div class="frame" tabindex="0" role="region" aria-label="Conversation">
      ${shown.length
            ? html `<ol class="thread">
            ${repeat(shown, ({ key }) => key, ({ kind, view }) => html `<li class="item ${kind}">${view}</li>`)}
          </ol>`
            : html `<p class="empty-thread">No messages yet.</p>`}
    </div>`;
    }
}
define(tagName, ChatThread);
