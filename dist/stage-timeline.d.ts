import { LitElement } from "lit";
/** The tag the element defines. */
export declare const tagName = "sl-stage-timeline";
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
/**
 * A run's stages as an ordered list of steps, connected top to bottom, in their positions' order.
 * Each step shows its name; under it, its state's label and its completion time, formatted by the
 * foundation's formatDateTime; and before it a marker, its position for a pending or active stage,
 * a check for a complete one, a cross for a failed one. The active stage is the list's current
 * step. A stage that advances changes in place: its label and its time each have a slot as wide as
 * the widest they hold, so nothing moves as a state changes.
 */
export declare class StageTimeline extends LitElement {
    #private;
    static styles: CSSStyleSheet[];
    static properties: {
        stages: {
            attribute: false;
        };
    };
    /** The stages to show; the timeline orders them by position. */
    stages: readonly TimelineStage[];
    constructor();
    render(): import("lit").TemplateResult<1>;
}
declare global {
    interface HTMLElementTagNameMap {
        "sl-stage-timeline": StageTimeline;
    }
}
