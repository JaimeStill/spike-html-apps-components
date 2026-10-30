// The lint the check runs: the recommended rules, the layer's imports in src/, and every .css
// import a CSS module script. test/unit/layers.test.ts runs it over test/unit/layers-tree.ts.
// Adapted from spike-html-packages-components (4c0a5d8): eslint.config.js, renamed.

import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import boundaries from "eslint-plugin-boundaries";
import importX from "eslint-plugin-import-x";
import globals from "globals";
import tseslint from "typescript-eslint";

const code = ["**/*.js", "**/*.ts"];

// The attribute a CSS module script carries among a declaration's attributes, by its key's name
// or its quoted key.
const cssType = `:matches(ImportAttribute[key.name='type'], ImportAttribute[key.value='type'])[value.value='css']`;
const cssSource = "[source.value=/\\.css$/]";
// An import() whose specifier ends in .css: a string, or a template whose last part does, matched
// at that part.
const cssDynamic = [
  `ImportExpression${cssSource}`,
  "ImportExpression > TemplateLiteral.source > TemplateElement[tail=true][value.cooked=/\\.css$/]",
];
const cssImports = [
  ...["ImportDeclaration", "ExportNamedDeclaration", "ExportAllDeclaration"].map((type) => ({
    selector: `${type}${cssSource}:not(:has(${cssType}))`,
    message: "A .css import is a CSS module script: add with { type: 'css' }.",
  })),
  ...cssDynamic.map((selector) => ({
    selector,
    message:
      "A .css file is imported statically, as a CSS module script with { type: 'css' }, never by " +
      "import().",
  })),
];

// The layer table cut to the components: their sources, which may import themselves and three
// packages by name, lit, marked, and the foundation, which the manifest declares, the foundation as
// a peer; the foundation is reached only through its install, as a consumer reaches it.
const foundation = "@jaimestill/spike-html-apps-foundation";
export const layers = [
  { name: "components", path: "src", may: ["components", "lit", "marked", foundation] },
];

// The layer is an element by its directory, matched from the root (partialMatch false), with a
// second pattern for a file in a directory whose name starts with a dot, which micromatch's **
// never enters, so ./.well-known/ and ./..x/ stay in the layer.
const elements = layers.map(({ name, path }) => ({
  type: name,
  pattern: [path, `${path}/**/.*`],
  partialMatch: false,
}));

// The rule's default is disallow, and it checks every origin (a package is external) and local
// files no element holds: an import passes only when a policy names its target, the layer or a
// package the table names, which the rule matches by its name, any subpath of it.
const policies = layers.map(({ name, may }) => ({
  from: { element: { type: name } },
  allow: {
    to: may.map((target) =>
      target === name
        ? { element: { type: target } }
        : { module: { origin: "external", source: target } },
    ),
  },
}));

// A declaration file in the layer (the components hold none yet) has no runtime, so an import that
// resolves to one passes only as a type import, `import type` or `export type`, which tsc erases:
// the last policy refuses any other kind, and as the last whose selector matches it overrides the
// allow before it. The dependency's kind is the declaration's, so `import { type X }` is a value
// import here, as it is to verbatimModuleSyntax, which keeps it as `import {}` and so loads the
// file. checkInternals has the rule judge an import within the layer too, which the layer's policy
// allows. internalPath is a local file's path: a package imported by name, which the resolver
// takes to the .d.ts its build ships beside each .js, is the allows' to judge, not this policy's.
const declarations = {
  disallow: { to: { internalPath: "**/*.d.ts" }, dependency: { kind: "value" } },
  message:
    "A .d.ts file is a declaration with no runtime: import it with `import type` (or export " +
    "from it with `export type`), never as a value, a side effect, or an import().",
};

export default defineConfig([
  // The build, gitignored, which ESLint doesn't read.
  { ignores: ["dist/"] },
  { files: code, extends: [js.configs.recommended, tseslint.configs.recommended] },
  { files: code, languageOptions: { globals: globals.browser } },
  { files: code, rules: { "no-restricted-syntax": ["error", ...cssImports] } },
  // The suite and the scripts run on node; test/'s .js, the modules a test page loads, run in the
  // browser.
  { files: ["test/**/*.ts", "scripts/**"], languageOptions: { globals: globals.node } },
  {
    files: ["src/**"],
    plugins: { boundaries, "import-x": importX },
    settings: {
      "import/resolver": { typescript: true },
      "import-x/resolver": { typescript: true },
      "boundaries/elements": elements,
    },
    // The rule judges the file an import resolves to, never the specifier's text, and
    // no-unresolved fails a specifier that names no file, so no import passes by naming none.
    rules: {
      "import-x/no-unresolved": "error",
      // Each judges an import against package.json: a package name it doesn't declare in
      // dependencies or peerDependencies, where the foundation is (a devDependency alone ships
      // nothing, and includeInternal holds the package's own name, which resolves inside it, to
      // the same), in every import form (includeTypes), and a relative path that reaches another
      // package's files.
      "import-x/no-extraneous-dependencies": [
        "error",
        { devDependencies: false, includeInternal: true, includeTypes: true },
      ],
      "import-x/no-relative-packages": "error",
      "boundaries/dependencies": [
        "error",
        {
          default: "disallow",
          checkAllOrigins: true,
          checkUnknownLocals: true,
          checkInternals: true,
          policies: [...policies, declarations],
        },
      ],
    },
  },
]);
