// What the components serve to a browser: the repository root, whose demo/ and test/fixtures/
// pages load the built dist/, and the packages the pages' import maps name under /deps/. The
// browser tier, mise run demo, and the screenshots description all serve it through
// spike-html-apps-tooling's serve, so the list is kept here once.

import { join } from "node:path";

import type { ServeOptions } from "@jaimestill/spike-html-apps-tooling/server.js";

/** The repository root, the served tree. */
export const root = join(import.meta.dirname, "../../..");

/**
 * The packages served under /deps/: lit, whose own dependencies (lit-html, lit-element, and
 * @lit/reactive-element) pnpm installs beside it in its store and the server brings with it;
 * marked; and the foundation, the install the components' dist/ imports by name, reached as a
 * consumer reaches it.
 */
export const deps = ["lit", "marked", "@jaimestill/spike-html-apps-foundation"];

/** The serve options for the repository: the root and its deps. */
export const served: ServeOptions = { root, deps };
