// A release's shape: a pack of the build checked against the sources, package.json's files and
// exports, which Node itself resolves, the Apache 2.0 LICENSE its manifest declares, and its
// dependencies, lit pinned exactly and the foundation a peer. test/unit/release.test.js runs it on
// a pnpm pack.
// Adapted from spike-html-packages-components (4c0a5d8): test/unit/release.js, renamed.

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

/** Every file below `dir`, relative to it with / separators, sorted. */
export function listFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { recursive: true })
    .filter((path) => statSync(join(dir, path)).isFile())
    .map((path) => path.split(sep).join("/"))
    .sort();
}

/** A key's or target's parts around its one *, or undefined when it holds none. */
function star(pattern) {
  const at = pattern.indexOf("*");
  return at < 0 ? undefined : { prefix: pattern.slice(0, at), suffix: pattern.slice(at + 1) };
}

// Node's condition sets: its defaults, and with types, the condition TypeScript adds.
const conditionSets = [[], ["--conditions=types"]];
// Each specifier in argv resolved as the package's own import, or null where Node refuses it.
const resolveArgs = `console.log(JSON.stringify(process.argv.slice(1).map((specifier) => {
  try { return import.meta.resolve(specifier); } catch { return null; }
})));`;

/** The paths, relative to root, that Node resolves each subpath of the package at root to under
 * any condition set, by self-reference, as { subpath: Set }; none where Node refuses it. */
function resolveSubpaths(root, name, subpaths) {
  const specifiers = subpaths.map((subpath) => name + subpath.slice(1));
  const resolved = Object.fromEntries(subpaths.map((subpath) => [subpath, new Set()]));
  for (const conditions of conditionSets) {
    const args = [...conditions, "--input-type=module", "-e", resolveArgs, ...specifiers];
    const urls = JSON.parse(execFileSync(process.execPath, args, { cwd: root, encoding: "utf8" }));
    urls.forEach((url, i) => {
      if (url === null) return;
      resolved[subpaths[i]].add(relative(root, fileURLToPath(url)).split(sep).join("/"));
    });
  }
  return resolved;
}

/** The dist/ paths a source in src/ ships as. */
export function builtFrom(source) {
  if (source.endsWith(".d.ts") || source.endsWith(".css")) return [`dist/${source}`];
  if (source.endsWith(".ts")) {
    const base = source.slice(0, -".ts".length);
    return [`dist/${base}.js`, `dist/${base}.d.ts`];
  }
  return [];
}

/** The files every pack carries whatever package.json's files lists. */
const always = ["LICENSE", "README.md", "package.json"];

/** The license every release declares, and the text its LICENSE opens with. */
const license = "Apache-2.0";
const licenseHeading = /^\s*Apache License\s+Version 2\.0, January 2004\s/;

/** What keeps root, a pack's package/, from carrying the license its package.json declares, one
 * line each: the declaration and the LICENSE beside package.json. */
export function licenseProblems(root) {
  const problems = [];
  const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  if (manifest.license !== license) {
    problems.push(`package.json declares license ${manifest.license}, not ${license}`);
  }
  const path = join(root, "LICENSE");
  if (!existsSync(path)) problems.push("LICENSE is missing");
  else if (!licenseHeading.test(readFileSync(path, "utf8"))) {
    problems.push("LICENSE isn't the Apache License 2.0");
  }
  return problems;
}

const foundation = "@jaimestill/spike-html-apps-foundation";

/** The dependencies every release declares, and nothing else. lit is its one dependency, at one
 * version, never a range. The foundation is a peer, by a caret range on its versions, never a
 * git spec: a consumer declares the foundation beside the components, from whichever
 * source, and one copy serves both, so a restyle of its sheets by package name reaches the
 * components' shadow roots. The repository's own install of it is a devDependency at one release
 * tag on GitHub, never a range, a branch, a commit, or a #semver: spec, which bun fails, and a tag
 * the peer range admits. Which version, range, and tag is package.json's, and mise run currency
 * reports each behind its latest. */
const exactVersion = /^\d+\.\d+\.\d+$/;
const dependencies = { lit: exactVersion };
const caretRange = /^\^\d+\.\d+\.\d+$/;
const foundationTag = /^github:JaimeStill\/spike-html-apps-foundation#(v\d+\.\d+\.\d+)$/;

/** Whether the caret range, ^x.y.z, admits the version, x.y.z or its tag vx.y.z: the same
 * leftmost nonzero part and no lower, so ^0.1.0 admits 0.1.x only. mise run currency asks it
 * too. */
export function caretAdmits(range, version) {
  const [major, minor, patch] = range.slice(1).split(".").map(Number);
  const [vMajor, vMinor, vPatch] = version.replace(/^v/, "").split(".").map(Number);
  const atLeast =
    vMajor > major ||
    (vMajor === major && (vMinor > minor || (vMinor === minor && vPatch >= patch)));
  if (!atLeast) return false;
  if (major > 0) return vMajor === major;
  if (minor > 0) return vMajor === 0 && vMinor === minor;
  return vMajor === 0 && vMinor === 0 && vPatch === patch;
}

/** What keeps root, a pack's package/, from declaring exactly the dependencies a release needs,
 * in the form each takes, one line each. */
export function dependencyProblems(root) {
  const problems = [];
  const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  const declared = manifest.dependencies ?? {};
  const peers = manifest.peerDependencies ?? {};
  const dev = manifest.devDependencies ?? {};
  for (const [name, pin] of Object.entries(dependencies)) {
    if (!(name in declared)) problems.push(`package.json doesn't declare ${name}`);
    else if (!pin.test(declared[name])) {
      problems.push(`package.json declares ${name} ${declared[name]}, not an exact pin`);
    }
  }
  for (const name of Object.keys(declared)) {
    if (name === foundation) {
      problems.push(`package.json declares ${foundation} in dependencies, not as a peer`);
    } else if (!(name in dependencies)) {
      problems.push(`package.json declares ${name}, which no release needs`);
    }
  }
  for (const name of Object.keys(peers)) {
    if (name !== foundation)
      problems.push(`package.json declares peer ${name}, which no release needs`);
  }
  const range = caretRange.test(peers[foundation]) ? peers[foundation] : undefined;
  if (!(foundation in peers)) problems.push(`package.json doesn't declare peer ${foundation}`);
  else if (!range) {
    problems.push(
      `package.json declares peer ${foundation} ${peers[foundation]}, not a caret range`,
    );
  }
  const tag = dev[foundation]?.match(foundationTag);
  if (!(foundation in dev))
    problems.push(`package.json doesn't declare devDependency ${foundation}`);
  else if (!tag) {
    problems.push(
      `package.json declares devDependency ${foundation} ${dev[foundation]}, not an exact release tag`,
    );
  }
  if (range && tag && !caretAdmits(range, tag[1])) {
    problems.push(
      `package.json's devDependency ${foundation} ${dev[foundation]} is outside its peer range ${peers[foundation]}`,
    );
  }
  return problems;
}

/** What keeps root, a pack's package/, from being the release its package.json declares for the
 * sources in `src`, one line each. */
export function releaseProblems(root, src) {
  const problems = [...licenseProblems(root), ...dependencyProblems(root)];
  const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  const { exports = {}, files = [] } = manifest;
  const packed = listFiles(root);
  const built = packed.filter((path) => path.startsWith("dist/"));
  const builtSet = new Set(built);

  // The pack is the build and the files every pack carries, and nothing else.
  if (!packed.includes("README.md")) problems.push("the pack has no README.md");
  for (const path of packed) {
    if (!path.startsWith("dist/") && !always.includes(path)) {
      problems.push(`${path} is packed but isn't the build, ${always.join(", ")}`);
    }
  }

  // The build against the sources: each source's emit or copy is there, and nothing else is.
  const expected = new Set();
  for (const source of listFiles(src)) {
    const outputs = builtFrom(source);
    if (outputs.length === 0) problems.push(`src/${source} isn't a .ts, .d.ts, or .css source`);
    for (const output of outputs) {
      expected.add(output);
      if (!builtSet.has(output)) problems.push(`src/${source} has no built ${output}`);
    }
  }
  for (const path of built) {
    if (!expected.has(path)) problems.push(`${path} is built from no source`);
  }

  // files ships the build: each built file lies under an entry of files.
  const shipped = (path) =>
    files.some(
      (entry) =>
        path === entry.replace(/\/$/, "") || path.startsWith(`${entry.replace(/\/$/, "")}/`),
    );
  for (const path of built) {
    if (!shipped(path)) problems.push(`${path} isn't under package.json's files`);
  }

  // exports: every entry a target or a flat object of condition targets, or null, which excludes
  // its subpath; every built file reached through an export as Node resolves it; every pattern key
  // reaching a built file; and every target Node resolves an export to built. The subpaths judged
  // are the exact keys and each built file's subpath through a pattern target that matches it.
  const subpaths = new Set();
  const origins = [];
  for (const [key, entry] of Object.entries(exports)) {
    if (entry === null) continue;
    const targets = typeof entry === "string" ? [entry] : Object.values(entry);
    if (targets.length === 0 || targets.some((target) => typeof target !== "string")) {
      problems.push(`exports["${key}"] isn't a target or a flat object of condition targets`);
      continue;
    }
    const keyParts = star(key);
    if (keyParts === undefined) subpaths.add(key);
    for (const target of targets) {
      const parts = star(target);
      for (const path of built) {
        const file = `./${path}`;
        let subpath;
        if (parts === undefined) {
          if (target === file && keyParts === undefined) subpath = key;
        } else if (
          keyParts !== undefined &&
          file.length >= parts.prefix.length + parts.suffix.length &&
          file.startsWith(parts.prefix) &&
          file.endsWith(parts.suffix)
        ) {
          subpath = key.replace(
            "*",
            file.slice(parts.prefix.length, file.length - parts.suffix.length),
          );
        }
        if (subpath === undefined) continue;
        subpaths.add(subpath);
        origins.push({ key, subpath, path });
      }
    }
  }
  const resolved = resolveSubpaths(root, manifest.name, [...subpaths]);
  const reached = origins.filter(({ subpath, path }) => resolved[subpath].has(path));
  for (const path of built) {
    if (!reached.some((origin) => origin.path === path)) {
      problems.push(`${path} is reachable through no export`);
    }
  }
  for (const key of Object.keys(exports)) {
    if (key.includes("*") && !reached.some((origin) => origin.key === key)) {
      problems.push(`exports["${key}"] reaches no built file`);
    }
  }
  for (const [subpath, paths] of Object.entries(resolved)) {
    for (const path of paths) {
      if (!builtSet.has(path)) {
        problems.push(`exports["${subpath}"] resolves to ./${path}, which isn't built`);
      }
    }
  }
  return problems;
}
