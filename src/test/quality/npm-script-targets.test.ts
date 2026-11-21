// @vitest-environment node
/**
 * Every npm script that runs a file in this repo must point at a file that exists. Otherwise
 * `npm run <name>` fails with a module-not-found error the first time anyone tries it.
 *
 * NEXUS: DIRECTIVE-NXTG-20261121-01 (forge-pm al:ae3ce4fa42a065fe), issue #91. `status` ran
 * `tsx scripts/status.ts`, and scripts/status.ts was never committed.
 */
import { describe, it, expect, vi } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import * as path from "node:path";

// src/test/setup.ts mocks fs for unit tests; this test reads the real package.json.
vi.unmock("fs");

const ROOT = path.resolve(__dirname, "../../..");
const pkg = JSON.parse(readFileSync(path.join(ROOT, "package.json"), "utf-8")) as {
  scripts: Record<string, string>;
};

// A repo path that a script hands to a runner: scripts/… or src/… source files, or ./name.sh.
const TARGET = /(?:^|\s)(?:\.\/)?((?:scripts|src)\/[^\s"']+\.(?:ts|tsx|mjs|cjs|js|sh)|[\w.-]+\.sh)(?=\s|$)/g;

function targets(command: string): string[] {
  return [...command.matchAll(TARGET)].map((m) => m[1]);
}

describe("npm script targets", () => {
  it("finds the targets it is meant to find", () => {
    expect(targets("tsx scripts/maintain.ts --check")).toEqual(["scripts/maintain.ts"]);
    expect(targets("./init.sh")).toEqual(["init.sh"]);
    expect(targets("tsc -p tsconfig.server.json && node scripts/fix-esm-imports.mjs")).toEqual([
      "scripts/fix-esm-imports.mjs",
    ]);
    expect(targets("vitest run src/test/quality/")).toEqual([]);
  });

  it("every file an npm script runs exists", () => {
    const missing = Object.entries(pkg.scripts).flatMap(([name, command]) =>
      targets(command)
        .filter((file) => !existsSync(path.join(ROOT, file)))
        .map((file) => `${name} -> ${file}`),
    );
    expect(missing).toEqual([]);
  });

  it("has no status script (issue #91: scripts/status.ts was never committed)", () => {
    expect(pkg.scripts).not.toHaveProperty("status");
  });
});
