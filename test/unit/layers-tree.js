// The layer's import cases as one file tree in the repository's shape: a file per forbidden import
// and form, each with the rules that catch it, and the imports the layer may make in the same
// layout. layers.test.js lints it.
// Adapted from spike-html-packages-components (4c0a5d8): test/unit/layers-tree.js, its
// one-package case now the app.

import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";

const root = join(import.meta.dirname, "../..");

/** The package's manifest as it stands, which the tree carries, so each import is judged against
 * it. */
export const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const components = manifest.name;

/** The foundation, the one layer below, as its install lays it out: its manifest, whose exports
 * the resolver reads, beside the subpaths the cases name. */
const foundation = components.replace(/components$/, "foundation");
const foundationManifest = readFileSync(
  join(root, "node_modules", foundation, "package.json"),
  "utf8",
);

/** The sibling layer and spike-html-apps' app, which the components never import. */
const sdk = components.replace(/components$/, "sdk");
const app = components.replace(/-components$/, "");

// The rules a case names: the layer table, the two manifest rules, and the CSS module script rule.
export const table = "boundaries/dependencies";
export const extraneous = "import-x/no-extraneous-dependencies";
export const relativePackages = "import-x/no-relative-packages";
export const cssModule = "no-restricted-syntax";
/** The rules the lint flags the tree with, no-unresolved among them, which no case may draw. */
export const watched = [table, extraneous, relativePackages, cssModule, "import-x/no-unresolved"];

/** An edge in each of the four import forms, one file per form, each named for the edge and its
 * form: a side-effect import, a type import, a re-export, and an import(). */
function forms(base, specifier) {
  return {
    [`${base}.ts`]: `import "${specifier}";`,
    [`${base}-type.ts`]: `import type { X } from "${specifier}";`,
    [`${base}-export.ts`]: `export * from "${specifier}";`,
    [`${base}-dynamic.ts`]: `await import("${specifier}");`,
  };
}

/** `files`, each path to its source and the rules that flag it, sorted. */
function by(rules, files) {
  return Object.fromEntries(
    Object.entries(files).map(([path, source]) => [path, { source, rules: [...rules].sort() }]),
  );
}

/** The foundation's installed files, from the layer's src/. */
const installed = `../node_modules/${foundation}`;

// Each file holds one import, named for what it imports.
export const violations = {
  // A package the manifest doesn't declare, by name: the table allows lit and the foundation
  // alone. lit-html, which lit depends on, is installed beside it; the SDK, the sibling layer, is
  // another layer's, and the app sits above every layer; a devDependency ships nothing; and the
  // package's own name resolves to its build, not its src/.
  ...by([table, extraneous], {
    "src/sdk.ts": `import { Client } from "${sdk}/client.js";`,
    ...forms("src/forms/sdk", `${sdk}/client.js`),
    "src/lit-html.ts": `import { html } from "lit-html";`,
    ...forms("src/forms/lit-html", "lit-html/directives/repeat.js"),
    "src/app.ts": `import { define } from "${app}/main.js";`,
    ...forms("src/forms/typescript", "typescript"),
    ...forms("src/forms/self-name", `${components}/status-badge.js`),
  }),
  // A declared package by a relative path into node_modules/: the foundation's installed files,
  // its build and its sheets, and lit's.
  ...by([table, relativePackages], {
    "src/foundation-path.ts": `import { define } from "${installed}/dist/dom.js";`,
    ...forms("src/forms/foundation-path", `../${installed}/dist/dom.js`),
    "src/foundation-sheet-path.ts": `import sheet from "${installed}/dist/baseline/reset.css" with { type: "css" };`,
    "src/lit-path.ts": `import "../node_modules/lit/index.js";`,
  }),
  // A value import of a declaration file, in each value form, an inline `type` specifier among
  // them, since verbatimModuleSyntax keeps that import.
  ...by([table], {
    "src/item-value.ts": `import { kindOf } from "./item.js";`,
    "src/item-side-effect.ts": `import "./item.js";`,
    "src/item-inline-type.ts": `import { type Item } from "./item.js";`,
    "src/item-export.ts": `export { kindOf } from "./item.js";`,
    "src/item-export-all.ts": `export * from "./item.js";`,
    "src/item-dynamic.ts": `await import("./item.js");`,
    "src/nested/item-value.ts": `import { kindOf } from "../item.js";`,
  }),
  // A .css import that isn't a static CSS module script, the layer's own sheet and the
  // foundation's.
  ...by([cssModule], {
    "src/css-side-effect.ts": `import "./x.css";`,
    "src/css-default.ts": `import sheet from "./x.css";`,
    "src/css-json.ts": `import sheet from "./x.css" with { type: "json" };`,
    "src/css-export.ts": `export { default } from "./x.css";`,
    "src/css-export-all.ts": `export * from "./x.css";`,
    "src/css-dynamic.ts": `await import("./x.css");`,
    "src/css-dynamic-json.ts": `await import("./x.css", { with: { type: "json" } });`,
    "src/css-dynamic-module.ts": `await import("./x.css", { with: { type: "css" } });`,
    "src/css-dynamic-quoted.ts": `await import("./x.css", { "with": { "type": "css" } });`,
    "src/css-dynamic-template.ts": "await import(`./x.css`, { with: { type: 'css' } });",
    "src/css-dynamic-computed.ts": "const name = 'x'; await import(`./${name}.css`);",
    "src/css-foundation.ts": `import sheet from "${foundation}/baseline/reset.css";`,
    "src/css-foundation-dynamic.ts": `await import("${foundation}/baseline/reset.css");`,
  }),
};

/** `cases`, each path to its source alone. */
export const sources = (cases) =>
  Object.fromEntries(Object.entries(cases).map(([path, { source }]) => [path, source]));

// Every import the layer may make, in each form, with names that hold dots, which a rule must tell
// from . and .. segments: its own files, lit, and the foundation by its package name, its modules,
// its declarations as types, and its sheets as CSS module scripts.
export const allowed = {
  "src/badge.ts": `export { x } from "./events.ts";`,
  "src/nested/own.ts": `import type { X } from "../badge.ts";\nawait import("../badge.ts");`,
  "src/nested/index.ts": `import "..";\nexport * from "./";`,
  "src/dotted.ts": `import "./..x/y.ts";\nimport "./.well-known/a.ts";`,
  "src/item-type.ts": `import type { kindOf } from "./item.js";`,
  "src/item-export-type.ts": `export type { Item } from "./item.js";`,
  "src/css-module.ts": `import sheet from "./x.css" with { type: "css" };`,
  "src/css-quoted.ts": `import sheet from "./x.css" with { "type": "css" };`,
  "src/css-export-module.ts": `export { default } from "./x.css" with { type: "css" };`,
  "src/lit.ts": [
    `import { html, LitElement, type PropertyDeclarations } from "lit";`,
    `import type { X } from "lit";`,
    `export * from "lit";`,
    `await import("lit");`,
    `import "lit/directives/repeat.js";`,
  ].join("\n"),
  "src/foundation.ts": [
    `import { define, emit } from "${foundation}/dom.js";`,
    `import type { X } from "${foundation}/dom.js";`,
    `export * from "${foundation}/dom.js";`,
    `await import("${foundation}/dom.js");`,
    `import type { BytesOptions } from "${foundation}/format.js";`,
  ].join("\n"),
  "src/foundation-sheets.ts": [
    `import reset from "${foundation}/baseline/reset.css" with { type: "css" };`,
    `import elements from "${foundation}/baseline/elements.css" with { "type": "css" };`,
  ].join("\n"),
};

/** The files the cases import that no case is: the modules, the declaration, the stylesheet, and
 * the package's build, which its own name resolves to. */
const targets = {
  "src/events.ts": "export const x = 1;",
  "src/index.ts": "export {};",
  "src/..x/y.ts": "export {};",
  "src/.well-known/a.ts": "export {};",
  "src/item.d.ts": [
    "export interface Item { name: string }",
    "export declare function kindOf(item: Item): string;",
  ].join("\n"),
  "src/x.css": ".x {}",
  "dist/status-badge.js": "export {};",
  "dist/status-badge.d.ts": "export interface X {}",
};

/** The packages the cases name by name, as stubs in node_modules/: lit and lit-html, the SDK, the
 * app, and typescript, a devDependency, each a module and its types at every subpath. */
const externals = ["lit", "lit-html", sdk, app, "typescript"];
const stub = (name) => ({
  "package.json": JSON.stringify({
    name,
    type: "module",
    exports: {
      ".": { types: "./index.d.ts", default: "./index.js" },
      "./*": { types: "./index.d.ts", default: "./index.js" },
    },
  }),
  "index.js": "export const html = () => {};\nexport class LitElement {}",
  "index.d.ts": [
    "export declare const html: () => void;",
    "export declare class LitElement {}",
    "export type PropertyDeclarations = object;",
    "export declare class Client {}",
    "export declare const define: () => void;",
    "export interface X {}",
  ].join("\n"),
});

/** The foundation as installed: its manifest as the install holds it, and stubs of the build the
 * cases reach through its exports, a module with its types, the formatters' declaration, the
 * ambient ./css types, and the sheets. */
const foundationFiles = {
  "package.json": foundationManifest,
  "dist/dom.js": "export const define = () => {};\nexport const emit = () => {};",
  "dist/dom.d.ts": [
    "export declare const define: () => void;",
    "export declare const emit: () => void;",
    "export interface X {}",
  ].join("\n"),
  "dist/format.d.ts": "export type BytesOptions = Intl.NumberFormatOptions;",
  "dist/css.d.ts": `declare module "*.css" {}`,
  "dist/baseline/reset.css": ".reset {}",
  "dist/baseline/elements.css": ".elements {}",
};

/** Writes `files` under `dir` with the manifest, the targets, the externals, the foundation, and a
 * link to the package itself, as an install of its own name lays it out, so every import resolves
 * and the lint judges it. Returns the code files written under src/. */
export function writeTree(dir, files) {
  const written = { ...files, ...targets, "package.json": JSON.stringify(manifest) };
  for (const name of externals) {
    for (const [path, source] of Object.entries(stub(name))) {
      written[join("node_modules", name, path)] = source;
    }
  }
  for (const [path, source] of Object.entries(foundationFiles)) {
    written[join("node_modules", foundation, path)] = source;
  }
  for (const [path, source] of Object.entries(written)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), `${source}\n`);
  }
  const self = join(dir, "node_modules", components);
  mkdirSync(dirname(self), { recursive: true });
  symlinkSync(relative(dirname(self), dir), self);
  return Object.keys(written).filter((path) => path.startsWith("src/") && /\.(js|ts)$/.test(path));
}

/** ESLint's JSON report on the tree under `dir`'s src/. -c takes the repo's config, whose patterns
 * then match from the working directory, the tree, and whose plugins load from the repo's
 * node_modules. Throws when ESLint doesn't run or exits other than 0 or 1. */
export function lint(dir) {
  const eslint = join(root, "node_modules", ".bin", "eslint");
  const run = spawnSync(eslint, ["-c", join(root, "eslint.config.js"), "-f", "json", "src"], {
    cwd: dir,
    encoding: "utf8",
  });
  if (run.error) throw new Error(`eslint didn't run: ${run.error}`);
  if (run.status !== 0 && run.status !== 1) {
    throw new Error(`eslint exited ${run.status}: ${run.stderr}`);
  }
  return JSON.parse(run.stdout);
}
