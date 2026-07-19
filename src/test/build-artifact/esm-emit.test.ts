// @vitest-environment node
/**
 * ESM emit correctness — DIRECTIVE-NXTG-20260718-15.
 *
 * The shipped v3.3.2 server could not boot: `tsc` emitted extensionless
 * relative specifiers (`moduleResolution: "node"` + `module: ES2022` +
 * `"type": "module"`), and Node's ESM loader does not probe extensions. Every
 * gate we had tested SOURCE through tsx; none tested the ARTIFACT, so a
 * compiles-but-does-not-run defect shipped.
 *
 * Two layers guard it now: `scripts/smoke-built-server.mjs` boots the real
 * artifact in the quality gates (verified to exit 1 on a seeded extensionless
 * import), and these tests pin the rewriter's logic — including the case where
 * it must FAIL the build rather than silently emit something unrunnable.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// The global setup mocks `fs`, but the rewriter under test does REAL filesystem
// probing (existsSync) against a real temp tree — that probing IS the behavior
// being verified, so this file opts back into the unmocked module.
vi.mock("node:fs", async (importOriginal) => await importOriginal());
vi.mock("fs", async (importOriginal) => await importOriginal());
import { mkdtemp, mkdir, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  resolveSpecifier,
  rewriteTree,
} from "../../../scripts/fix-esm-imports.mjs";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "forge-esm-emit-"));
});

describe("resolveSpecifier", () => {
  it("appends .js when the sibling module exists", async () => {
    await writeFile(join(dir, "target.js"), "export const a = 1;\n");

    expect(resolveSpecifier(join(dir, "entry.js"), "./target")).toBe("./target.js");
  });

  it("appends /index.js for a directory module", async () => {
    await mkdir(join(dir, "pkg"), { recursive: true });
    await writeFile(join(dir, "pkg", "index.js"), "export const a = 1;\n");

    expect(resolveSpecifier(join(dir, "entry.js"), "./pkg")).toBe("./pkg/index.js");
  });

  it("leaves bare specifiers to Node", () => {
    // Rewriting these would break node_modules and node: builtins.
    expect(resolveSpecifier(join(dir, "entry.js"), "express")).toBeNull();
    expect(resolveSpecifier(join(dir, "entry.js"), "node:fs")).toBeNull();
  });

  it("leaves an already-explicit specifier alone, so the step is idempotent", async () => {
    await writeFile(join(dir, "target.js"), "export const a = 1;\n");

    expect(resolveSpecifier(join(dir, "entry.js"), "./target.js")).toBeNull();
  });

  it("does not invent a specifier for a missing module", () => {
    expect(resolveSpecifier(join(dir, "entry.js"), "./nope")).toBeNull();
  });
});

describe("rewriteTree", () => {
  it("fixes static, dynamic, and re-export specifiers in one pass", async () => {
    await writeFile(join(dir, "target.js"), "export const a = 1;\n");
    await mkdir(join(dir, "pkg"), { recursive: true });
    await writeFile(join(dir, "pkg", "index.js"), "export const b = 2;\n");
    await writeFile(
      join(dir, "entry.js"),
      [
        'import { a } from "./target";',
        'export { b } from "./pkg";',
        'const c = await import("./target");',
        'import express from "express";',
        'import { readFile } from "node:fs/promises";',
      ].join("\n"),
    );

    const report = await rewriteTree(dir);
    const out = await readFile(join(dir, "entry.js"), "utf-8");

    expect(out).toContain('from "./target.js"');
    expect(out).toContain('from "./pkg/index.js"');
    expect(out).toContain('import("./target.js")');
    // Bare specifiers must survive untouched.
    expect(out).toContain('from "express"');
    expect(out).toContain('from "node:fs/promises"');
    expect(report.unresolved).toEqual([]);
    expect(report.rewritten).toBe(3);
  });

  it("is idempotent — a second pass rewrites nothing", async () => {
    await writeFile(join(dir, "target.js"), "export const a = 1;\n");
    await writeFile(join(dir, "entry.js"), 'import { a } from "./target";\n');

    await rewriteTree(dir);
    const second = await rewriteTree(dir);

    expect(second.rewritten).toBe(0);
  });

  it("reports an unresolvable specifier instead of emitting something unrunnable", async () => {
    // The control for the build-failing path: a specifier that resolves to
    // nothing is exactly the defect this step exists to kill, so it must be
    // surfaced rather than passed through silently.
    await writeFile(join(dir, "entry.js"), 'import x from "./missing";\n');

    const report = await rewriteTree(dir);

    expect(report.rewritten).toBe(0);
    expect(report.unresolved).toHaveLength(1);
    expect(report.unresolved[0]).toContain("./missing");
  });
});

describe("build pipeline wiring", () => {
  it("keeps the rewrite and artifact smoke gate wired into the scripts", async () => {
    // Structural guard: the fix and its proof are only worth anything while
    // they actually run. Dropping either from package.json would silently
    // resurrect the shipped-unrunnable-artifact class.
    const pkg = JSON.parse(
      await readFile(new URL("../../../package.json", import.meta.url), "utf-8"),
    );

    expect(pkg.scripts["build:server"]).toContain("fix-esm-imports");
    expect(pkg.scripts["quality:gates"]).toContain("smoke:built");
    expect(pkg.scripts["smoke:built"]).toContain("smoke-built-server");
  });
});
