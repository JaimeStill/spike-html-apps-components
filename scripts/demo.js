// mise run demo: serves the repository through the browser tier's static server and prints the
// demo pages' URLs, the components page and each component's specimen page, which load dist/,
// until Ctrl-C.
// Adapted from spike-html-packages-components (4c0a5d8): scripts/demo.js, printing the specimen
// pages too.

import { serve } from "../test/browser/support/server.js";

const server = await serve();
for (const page of ["components", "status-badge", "entry", "pagination", "artifact-viewer"]) {
  console.log(`${server.origin}/demo/${page}.html`);
}
process.once("SIGINT", async () => {
  await server.stop();
  process.exit(0);
});
