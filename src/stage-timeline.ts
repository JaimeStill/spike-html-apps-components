// The stage timeline, Lit with a shadow root: a run's stages as a connected, ordered list of steps,
// each its name, its state in words and by its marker, and when it completed. It knows no SDK and
// no domain: the app maps its run's stages onto the shape below. It is display-only: it sends no
// event, holds nothing focusable, and binds no key.

import { html, LitElement, nothing, svg, type PropertyDeclarations } from "lit";
import { repeat } from "lit/directives/repeat.js";

import elements from "@jaimestill/spike-html-apps-foundation/baseline/elements.css" with { type: "css" };
import reset from "@jaimestill/spike-html-apps-foundation/baseline/reset.css" with { type: "css" };
import { define } from "@jaimestill/spike-html-apps-foundation/dom.js";
import { formatDateTime } from "@jaimestill/spike-html-apps-foundation/format.js";
import styles from "./stage-timeline.css" with { type: "css" };

/** The tag the element defines. */
export const tagName = "sl-stage-timeline";

/** A stage's state: not reached, in progress, finished, or stopped by a failure. */
export type StageState = "pending" | "active" | "complete" | "failed";

/**
 * A stage as the timeline shows it, a shape of its own that the app fills: its name, its 1-based
 * position among the run's stages, its state, and, once it completed, when: an RFC 3339 string, as
 * a run's JSON carries it, or a Date. null or absent shows no time.
 */
export interface TimelineStage {
  name: string;
  position: number;
  state: StageState;
  completedAt?: string | Date | null;
}

/** Each state's label, which tells the states apart in words as well as by marker and color. */
const labels: Record<StageState, string> = {
  pending: "Pending",
  active: "In progress",
  complete: "Complete",
  failed: "Failed",
};

/** The completion time's format: the date, and the clock to the second, since a run's stages
 * complete seconds apart. */
const timeFormat: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "medium" };

/** A time as wide as any the format writes in the page's locale, two-digit day and hour, which
 * the time slot holds hidden, so a stage that completes shows its time in space already there. */
const widest = new Date(2026, 4, 28, 22, 58, 58);

/** The markers' glyphs: a check for complete, a cross for failed, drawn in the marker's color. */
const check = svg`<path d="M3.5 8.5l3 3 6-7" />`;
const cross = svg`<path d="M4.5 4.5l7 7M11.5 4.5l-7 7" />`;

/** The stage's completion time as a Date, or null when it has none or it doesn't parse. */
function completion(stage: TimelineStage): Date | null {
  if (stage.completedAt === undefined || stage.completedAt === null) return null;
  const date = new Date(stage.completedAt);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * A run's stages as an ordered list of steps, connected top to bottom, in their positions' order.
 * Each step shows its name; under it, its state's label and its completion time, formatted by the
 * foundation's formatDateTime; and before it a marker, its position for a pending or active stage,
 * a check for a complete one, a cross for a failed one. The active stage is the list's current
 * step. A stage that advances changes in place: its label and its time each have a slot as wide as
 * the widest they hold, so nothing moves as a state changes.
 */
export class StageTimeline extends LitElement {
  static styles = [reset, elements, styles];

  static properties = {
    stages: { attribute: false },
  } satisfies PropertyDeclarations;

  /** The stages to show; the timeline orders them by position. */
  declare stages: readonly TimelineStage[];

  constructor() {
    super();
    this.stages = [];
  }

  #marker(stage: TimelineStage) {
    const glyph = stage.state === "complete" ? check : stage.state === "failed" ? cross : nothing;
    return html`<span class="marker" aria-hidden="true"
      >${
        glyph === nothing
          ? html`<span class="position">${stage.position}</span>`
          : html`<svg viewBox="0 0 16 16">${glyph}</svg>`
      }</span
    >`;
  }

  #stage(stage: TimelineStage) {
    const date = completion(stage);
    // The label's slot stacks every label, the stage's own shown and the rest hidden, so it is as
    // wide as the widest; the time's slot stacks the stage's time, when it has one, over the
    // widest time hidden, so it holds its width with or without one.
    return html`<li
      class="stage ${stage.state}"
      data-name=${stage.name}
      aria-current=${stage.state === "active" ? "step" : nothing}
    >
      ${this.#marker(stage)}
      <span class="name">${stage.name}</span>
      <span class="detail">
        <span class="slot label">
          ${(Object.keys(labels) as StageState[]).map((state) =>
            state === stage.state
              ? html`<span class="shown">${labels[state]}</span>`
              : html`<span class="hold" aria-hidden="true">${labels[state]}</span>`,
          )}
        </span>
        <span class="slot when">
          ${
            date
              ? html`<time class="shown" datetime=${date.toISOString()}
                  >${formatDateTime(date, undefined, timeFormat)}</time
                >`
              : nothing
          }
          <span class="hold" aria-hidden="true">${formatDateTime(widest, undefined, timeFormat)}</span>
        </span>
      </span>
    </li>`;
  }

  render() {
    // In their positions' order, the given order kept between equal positions; each step keyed by
    // its name, so a stage that advances re-renders in its own nodes.
    const stages = [...(this.stages ?? [])].sort((a, b) => a.position - b.position);
    return html`<ol class="stages" aria-label="Stages">
      ${repeat(
        stages,
        (stage) => stage.name,
        (stage) => this.#stage(stage),
      )}
    </ol>`;
  }
}

define(tagName, StageTimeline);

declare global {
  interface HTMLElementTagNameMap {
    "sl-stage-timeline": StageTimeline;
  }
}
