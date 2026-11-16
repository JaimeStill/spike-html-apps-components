// The stage timeline, Lit with a shadow root: a run's stages as a connected, ordered list of steps,
// each its name, its state in words and by its marker, and when it completed or failed, a failed
// stage with why. It knows no SDK and no domain: the app maps its run's stages onto the shape
// below. It is display-only: it sends no event, holds nothing focusable, and binds no key.
import { html, LitElement, nothing, svg } from "lit";
import { repeat } from "lit/directives/repeat.js";
import elements from "@jaimestill/spike-html-apps-foundation/baseline/elements.css" with { type: "css" };
import reset from "@jaimestill/spike-html-apps-foundation/baseline/reset.css" with { type: "css" };
import { define } from "@jaimestill/spike-html-apps-foundation/dom.js";
import { formatDateTime } from "@jaimestill/spike-html-apps-foundation/format.js";
import styles from "./stage-timeline.css" with { type: "css" };
/** The tag the element defines. */
export const tagName = "sl-stage-timeline";
/** Each state's label, which tells the states apart in words as well as by marker and color. */
const labels = {
    pending: "Pending",
    active: "In progress",
    complete: "Complete",
    failed: "Failed",
};
/** A stage's time's format: the date, and the clock to the second, since a run's stages complete
 * seconds apart. */
const timeFormat = { dateStyle: "medium", timeStyle: "medium" };
/** A time as wide as any the format writes in the page's locale, two-digit day and hour, which
 * the time slot holds hidden, so a stage that completes shows its time in space already there. */
const widest = new Date(2026, 4, 28, 22, 58, 58);
/** The markers' glyphs: a check for complete, a cross for failed, drawn in the marker's color. */
const check = svg `<path d="M3.5 8.5l3 3 6-7" />`;
const cross = svg `<path d="M4.5 4.5l7 7M11.5 4.5l-7 7" />`;
/** The time the stage's state shows, a failed stage's failure, else its completion, as a Date; or
 * null when it has none or it doesn't parse. */
function timeOf(stage) {
    const at = stage.state === "failed" ? (stage.failedAt ?? stage.completedAt) : stage.completedAt;
    if (at === undefined || at === null)
        return null;
    const date = new Date(at);
    return Number.isNaN(date.getTime()) ? null : date;
}
/**
 * A run's stages as an ordered list of steps, connected top to bottom, in their positions' order.
 * Each step shows its name; under it, its state's label and its time, a complete stage's
 * completion or a failed one's failure, formatted by the foundation's formatDateTime; under that, a
 * failed stage's reason, when it has one; and before it a marker, its position for a pending or
 * active stage, a check for a complete one, a cross for a failed one. The reason is the step's own
 * text, in its list item, so assistive technology reads it with the stage's name, label, and time.
 * The active stage is the list's current step. A stage that advances changes in place: its label
 * and its time each have a slot as wide as the widest they hold, so nothing moves as a state
 * changes; a failure's reason, the one line a state adds, adds it below the step's detail line,
 * wrapping to the timeline's width and never widening it.
 */
export class StageTimeline extends LitElement {
    static styles = [reset, elements, styles];
    static properties = {
        stages: { attribute: false },
    };
    constructor() {
        super();
        this.stages = [];
    }
    #marker(stage) {
        const glyph = stage.state === "complete" ? check : stage.state === "failed" ? cross : nothing;
        return html `<span class="marker" aria-hidden="true"
      >${glyph === nothing
            ? html `<span class="position">${stage.position}</span>`
            : html `<svg viewBox="0 0 16 16">${glyph}</svg>`}</span
    >`;
    }
    #stage(stage) {
        const date = timeOf(stage);
        const reason = stage.state === "failed" && stage.reason ? stage.reason : null;
        // The label's slot stacks every label, the stage's own shown and the rest hidden, so it is as
        // wide as the widest; the time's slot stacks the stage's time, when it has one, over the
        // widest time hidden, so it holds its width with or without one.
        return html `<li
      class="stage ${stage.state}"
      data-name=${stage.name}
      aria-current=${stage.state === "active" ? "step" : nothing}
    >
      ${this.#marker(stage)}
      <span class="name">${stage.name}</span>
      <span class="detail">
        <span class="slot label">
          ${Object.keys(labels).map((state) => state === stage.state
            ? html `<span class="shown">${labels[state]}</span>`
            : html `<span class="hold" aria-hidden="true">${labels[state]}</span>`)}
        </span>
        <span class="slot when">
          ${date
            ? html `<time class="shown" datetime=${date.toISOString()}
                  >${formatDateTime(date, undefined, timeFormat)}</time
                >`
            : nothing}
          <span class="hold" aria-hidden="true">${formatDateTime(widest, undefined, timeFormat)}</span>
        </span>
      </span>
      ${reason === null ? nothing : html `<span class="reason">${reason}</span>`}
    </li>`;
    }
    render() {
        // In their positions' order, the given order kept between equal positions; each step keyed by
        // its name, so a stage that advances re-renders in its own nodes.
        const stages = [...(this.stages ?? [])].sort((a, b) => a.position - b.position);
        return html `<ol class="stages" aria-label="Stages">
      ${repeat(stages, (stage) => stage.name, (stage) => this.#stage(stage))}
    </ol>`;
    }
}
define(tagName, StageTimeline);
