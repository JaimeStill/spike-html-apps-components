// mise run demo: serves the repository through the browser tier's static server and prints the
// demo page's URL, which loads dist/, until Ctrl-C.
// From spike-html-packages-components (4c0a5d8): scripts/demo.js.

import { serve } from "../test/browser/support/server.js";

const server = await serve();
console.log(`${server.origin}/demo/components.html`);
process.once("SIGINT", async () => {
  await server.stop();
  process.exit(0);
});
