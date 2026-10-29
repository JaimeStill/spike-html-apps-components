// The browser tier's static server: the repository root, or another directory, over plain http on
// the loopback address, every file sent as it is on disk, and under /deps/ the installed packages
// the pages' import maps name. The pages load this repository's built dist/, so nothing needs
// transforming.
// Adapted from spike-html-packages-components (4c0a5d8): test/browser/support/server.js, renamed.

import { realpathSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, extname, join, normalize } from "node:path";

/** The repository root, which the server serves by default. */
export const root = join(import.meta.dirname, "../../..");

/** The content type of each extension served; any other file is a 404. */
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };

// Under pnpm, lit's own dependencies sit beside it in its store directory, not in node_modules/,
// so the pages' import maps name lit, its dependencies, marked, and the foundation under /deps/: each
// package's installed directory, by its name. The foundation is the install the components' dist/
// imports by name, reached as a consumer reaches it.
const store = dirname(realpathSync(join(root, "node_modules/lit")));
const deps = {
  lit: join(store, "lit"),
  "lit-html": join(store, "lit-html"),
  "lit-element": join(store, "lit-element"),
  "@lit/reactive-element": join(store, "@lit/reactive-element"),
  // marked bundles itself into one module and depends on nothing.
  marked: join(root, "node_modules/marked"),
  "@jaimestill/spike-html-apps-foundation": join(
    root,
    "node_modules/@jaimestill/spike-html-apps-foundation",
  ),
};

/** The file a request's path names: under /deps/ one of the packages', otherwise the tree's. */
function file(tree, pathname) {
  // normalize() of an absolute path never climbs above its root, so no request leaves the tree,
  // and none under /deps/ leaves its package.
  const path = normalize(decodeURIComponent(pathname));
  if (!path.startsWith("/deps/")) return join(tree, path);
  const rest = path.slice("/deps".length);
  const name = Object.keys(deps).find((name) => rest.startsWith(`/${name}/`));
  return name && join(deps[name], rest.slice(name.length + 1));
}

/** Serves the tree on a free loopback port, resolving to its origin and a stop(). */
export async function serve(tree = root) {
  const server = createServer(async (request, response) => {
    const path = file(tree, new URL(request.url, "http://localhost").pathname);
    const type = path && types[extname(path)];
    const body = type && (await readFile(path).catch(() => undefined));
    if (body === undefined) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, { "content-type": type, "cache-control": "no-store" }).end(body);
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  return {
    origin: `http://127.0.0.1:${server.address().port}`,
    stop: () => new Promise((resolve) => server.close(resolve)),
  };
}
