// mise run demo: serves the repository through spike-html-apps-tooling's static server and prints
// the demo pages' URLs, the components page and each component's specimen page, which load dist/,
// until Ctrl-C.
// Adapted from spike-html-packages-components (4c0a5d8): scripts/demo.js, printing the specimen
// pages too.

import { serve } from "@jaimestill/spike-html-apps-tooling/server.js";

import { served } from "../test/browser/support/served.ts";

const server = await serve(served);
for (const page of [
  "components",
  "status-badge",
  "entry",
  "pagination",
  "artifact-viewer",
  "chat-thread",
  "composer",
  "upload-dropzone",
  "stage-timeline",
  "event-log",
  "search-results",
  "document-list",
  "drawer",
]) {
  console.log(`${server.origin}/demo/${page}.html`);
}
process.once("SIGINT", async () => {
  await server.stop();
  process.exit(0);
});
