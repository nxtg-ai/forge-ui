#!/usr/bin/env node
/**
 * Rewrite emitted relative import specifiers to real file paths.
 *
 * NEXUS: DIRECTIVE-NXTG-20260718-15.
 *
 * WHY THIS EXISTS
 * The package is `"type": "module"` and the server compiles with
 * `module: ES2022`, but `moduleResolution: "node"` — a combination TypeScript
 * accepts and emits verbatim. Node's ESM loader, unlike the old CJS resolver,
 * does NOT probe extensions or `index` files: `import "../core/orchestrator"`
 * is a hard ERR_MODULE_NOT_FOUND. So `tsc` reported success while the artifact
 * could not boot at all — `npm start` has been dead since the ESM migration and
 * shipped that way in v3.3.2.
 *
 * WHY A REWRITE RATHER THAN `.js` IN SOURCE
 * The NodeNext-canonical fix is writing `./foo.js` in every source import. That
 * is ~72 specifiers across the server graph and changes files the client build
 * shares, so it carries real regression risk for a defect that lives purely in
 * the emit. Rewriting the emit keeps ONE set of source specifiers for dev and
 * built alike — the directive's "must not fork dev vs built behavior" — and the
 * smoke gate proves the artifact actually runs rather than merely compiling.
 *
 * WHAT IT REWRITES
 * Relative specifiers only (`./x`, `../x`) in static imports/exports and
 * dynamic `import()`. Bare specifiers (node_modules, `node:` builtins) are left
 * alone — Node resolves those itself. Already-extensioned specifiers are left
 * alone, so the step is idempotent.
 */

import { readFile, writeFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const DIST = path.join(ROOT, "dist");

/**
 * Resolve one specifier against the emitted tree.
 *
 * Mirrors what the CJS resolver used to do implicitly: try the file, then a
 * directory's index. Returns null when neither exists, which is reported rather
 * than silently rewritten — a specifier we cannot resolve is a real problem and
 * guessing would just move the failure to runtime.
 */
export function resolveSpecifier(fromFile, spec) {
  if (!spec.startsWith(".")) return null; // bare specifier — Node's job
  if (/\.(js|mjs|cjs|json|node)$/.test(spec)) return null; // already explicit

  const base = path.resolve(path.dirname(fromFile), spec);

  if (existsSync(`${base}.js`)) return `${spec}.js`;
  if (existsSync(path.join(base, "index.js"))) return `${spec}/index.js`;
  if (existsSync(`${base}.json`)) return null; // JSON needs import attributes

  return null;
}

/** Every `.js` file under dist. */
export async function collect(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await collect(full)));
    else if (entry.name.endsWith(".js")) out.push(full);
  }
  return out;
}

// `from "x"` / `import("x")` / `export ... from "x"`, single or double quoted.
export const SPECIFIER = /(\bfrom\s*|\bimport\s*\(\s*)(["'])(\.[^"']*)\2/g;

/**
 * Rewrite a tree in place.
 *
 * Returns a report rather than exiting, so tests can drive it against a
 * synthetic tree and assert on the unresolved list.
 */
export async function rewriteTree(dir) {
  const files = await collect(dir);
  let rewritten = 0;
  let touched = 0;
  const unresolved = [];

  for (const file of files) {
    const source = await readFile(file, "utf-8");
    let changed = false;

    const next = source.replace(SPECIFIER, (match, head, quote, spec) => {
      const resolved = resolveSpecifier(file, spec);
      if (!resolved) {
        // Only flag things that look like they SHOULD have resolved.
        if (spec.startsWith(".") && !/\.(js|mjs|cjs|json|node)$/.test(spec)) {
          unresolved.push(`${path.relative(dir, file)}: ${spec}`);
        }
        return match;
      }
      changed = true;
      rewritten += 1;
      return `${head}${quote}${resolved}${quote}`;
    });

    if (changed) {
      await writeFile(file, next);
      touched += 1;
    }
  }

  return { rewritten, touched, total: files.length, unresolved };
}

async function main() {
  if (!existsSync(DIST)) {
    console.error("fix-esm-imports: dist/ not found — run the build first");
    process.exit(1);
  }

  const { rewritten, touched, total, unresolved } = await rewriteTree(DIST);

  console.log(
    `fix-esm-imports: rewrote ${rewritten} specifier(s) across ${touched} file(s) of ${total}`,
  );

  if (unresolved.length > 0) {
    // Fail the build: an unresolvable relative specifier is exactly the defect
    // this step exists to kill, and letting it through would ship another
    // artifact that compiles but cannot boot.
    console.error(
      `fix-esm-imports: ${unresolved.length} unresolved relative specifier(s):`,
    );
    for (const u of unresolved.slice(0, 20)) console.error(`  ${u}`);
    process.exit(1);
  }
}

// Only run as a CLI; importing this module (tests) must not execute the build.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error("fix-esm-imports failed:", error);
    process.exit(1);
  });
}
