// The type guards: values that hold to the declarations dist/ ships, so a declaration that
// narrows what a consumer may write fails `types:browser`. No page runs this module; tsc checks
// it with the in-page modules, against the same dist/.
//
// It guards `LogEvent.time` optional: an event without a time, as CloudEvents allows, and one whose
// time is null, as a JSON field written empty is. A `time` made required, or not null, fails here.

/** @import { LogEvent } from "../../../dist/event-log.js" */

/** @type {LogEvent} */
export const untimed = { id: "1", type: "run.started", source: "/runs/1" };

/** @type {LogEvent} */
export const nullTime = { id: "2", type: "run.started", source: "/runs/2", time: null };
