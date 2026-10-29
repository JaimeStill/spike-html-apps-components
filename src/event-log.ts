// The event log, Lit with a shadow root: events in the order given, each its type, its time, and
// its source, subject, and id, with its data pretty-printed on demand, inside one frame that
// scrolls when its consumer constrains its block size. The event is a structural subset of
// CloudEvents 1.0, by its attribute names, so an event as a stream carries it fits as it is. It
// knows no SDK and no domain. It is display-only: it sends no event and binds no key.

import { html, LitElement, nothing, type PropertyDeclarations, type PropertyValues } from "lit";
import { repeat } from "lit/directives/repeat.js";

import elements from "@jaimestill/spike-html-apps-foundation/baseline/elements.css" with { type: "css" };
import reset from "@jaimestill/spike-html-apps-foundation/baseline/reset.css" with { type: "css" };
import { define } from "@jaimestill/spike-html-apps-foundation/dom.js";
import { formatDateTime } from "@jaimestill/spike-html-apps-foundation/format.js";
import styles from "./event-log.css" with { type: "css" };

/** The tag the element defines. */
export const tagName = "sl-event-log";

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

/** The time's format: the date, and the clock to the second, as the stage timeline shows it,
 * since a run's events arrive seconds apart. */
const timeFormat: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "medium" };

/** The event's time as a Date, or null when it doesn't parse. */
function occurred(event: LogEvent): Date | null {
  if (event.time === undefined || event.time === null) return null;
  const date = new Date(event.time);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * The data as the log shows it: a string as it is, since text data reads as text; any other value
 * as JSON with two-space indents, a bigint as its digits. A value JSON can't write, a circular
 * object or a function, shows as its String().
 */
function pretty(data: unknown): string {
  if (typeof data === "string") return data;
  try {
    const json = JSON.stringify(
      data,
      (_key, value: unknown) => (typeof value === "bigint" ? value.toString() : value),
      2,
    );
    if (json !== undefined) return json;
  } catch {
    // A circular object: shown below by its String().
  }
  return String(data);
}

/**
 * Shows events as a log, in the order given, oldest first: each its type and its time, formatted
 * by the foundation's formatDateTime, absolute and to the second; under them its source, subject,
 * and id, each labelled; and its data pretty-printed in a native details, collapsed until opened.
 * An event without data says so in the details' place. Each event is keyed by its source and id,
 * the pair CloudEvents makes unique, so events appended to the list leave those shown in their own
 * nodes and places, and a details the reader opened stays open.
 *
 * The frame is a log, a live region: polite, so an arrival never interrupts, and additions only,
 * so a new event is read once and a re-render or a removal is not. Events are discrete and arrive
 * at a pipeline's pace, seconds apart, unlike a chat reply streamed word by word, which a live
 * region would read at every word. When its consumer constrains its block size, the frame scrolls,
 * and it follows the newest event as one arrives only while the reader is at its end: a reader who
 * scrolled up keeps their place, and the first events shown open at the top.
 */
export class EventLog extends LitElement {
  static styles = [reset, elements, styles];

  static properties = {
    events: { attribute: false },
  } satisfies PropertyDeclarations;

  /** The events to show, oldest first. */
  declare events: readonly LogEvent[];

  /** Whether the update in flight follows the newest event: the frame was at its end, and showed
   * events already. */
  #follow = false;

  constructor() {
    super();
    this.events = [];
  }

  protected override willUpdate(changed: PropertyValues<this>) {
    // The frame as the last update left it, before this one appends: at its end, within a pixel,
    // when it doesn't scroll at all too.
    const frame = this.renderRoot.querySelector<HTMLElement>(".frame");
    const shown = (changed.get("events") as readonly LogEvent[] | undefined)?.length ?? 0;
    this.#follow =
      changed.has("events") &&
      shown > 0 &&
      frame !== null &&
      frame.scrollHeight - frame.clientHeight - frame.scrollTop <= 1;
  }

  protected override updated() {
    if (!this.#follow) return;
    this.#follow = false;
    const frame = this.renderRoot.querySelector<HTMLElement>(".frame");
    if (frame) frame.scrollTop = frame.scrollHeight;
  }

  #pair(label: string, value: string) {
    return html`<div class="pair">
      <dt>${label}</dt>
      <dd>${value}</dd>
    </div>`;
  }

  #event(event: LogEvent) {
    const date = occurred(event);
    const subject = event.subject ?? undefined;
    return html`<li class="event">
      <div class="head">
        <span class="type">${event.type}</span>
        ${
          date
            ? html`<time class="when" datetime=${date.toISOString()}
                >${formatDateTime(date, undefined, timeFormat)}</time
              >`
            : nothing
        }
      </div>
      <dl class="meta">
        ${this.#pair("source", event.source)}
        ${subject === undefined || subject === "" ? nothing : this.#pair("subject", subject)}
        ${this.#pair("id", event.id)}
      </dl>
      ${
        event.data === undefined
          ? html`<p class="no-data">No data</p>`
          : html`<details class="data">
              <summary>Data</summary>
              <pre>${pretty(event.data)}</pre>
            </details>`
      }
    </li>`;
  }

  render() {
    const events = this.events ?? [];
    // The frame is the log. Each event keyed by its source and id: the keyed repeat keeps every
    // shown event's DOM as the list grows.
    return html`<div class="frame" role="log" aria-live="polite" aria-relevant="additions" aria-label="Events">
      ${
        events.length
          ? html`<ol class="events">
            ${repeat(
              events,
              (event) => `${event.source}\u0000${event.id}`,
              (event) => this.#event(event),
            )}
          </ol>`
          : html`<p class="empty">No events yet.</p>`
      }
    </div>`;
  }
}

define(tagName, EventLog);

declare global {
  interface HTMLElementTagNameMap {
    "sl-event-log": EventLog;
  }
}
