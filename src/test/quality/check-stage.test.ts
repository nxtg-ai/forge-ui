// @vitest-environment node
/**
 * Red controls for .github/scripts/check-stage.sh.
 *
 * NEXUS: forge-pm al:a984d7463ae70cd4 (check-stage reads forge-ui's own registry
 * row; README clones the release tag) and EMMA-SOUL Dx3 cc950597 (README line 9
 * is FINAL B, kept literal). Each mutation must turn the check red, so a pass
 * means "checked", not "skipped".
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { spawnSync } from "node:child_process";
import * as os from "node:os";
import * as path from "node:path";

vi.unmock("fs");
const fs = await vi.importActual<typeof import("node:fs")>("node:fs");

const ROOT = path.resolve(__dirname, "../../..");
const SCRIPT = path.join(ROOT, ".github/scripts/check-stage.sh");
const SURFACES = [
  "STAGE",
  "README.md",
  "CHANGELOG.md",
  "package.json",
  "src/services/app-stage.ts",
  "src/server/routes/forge.ts",
  "src/components/layout/AppHeader.tsx",
];

// The real registry shape: the forge row is the plugin and orchestrator (alpha);
// forge-ui is its own row.
const REGISTRY = (forgeUiMaturity: string) => `products:
  - id: forge
    name: Forge
    distribution: public
    maturity: alpha          # plugin and orchestrator
    owner_lane: forge-pm
  - id: forge-ui
    name: Forge UI
    distribution: public
    maturity: ${forgeUiMaturity}      # FINAL B
    owner_lane: forge-pm
  - id: dx3
    distribution: internal
    maturity: dogfood
`;

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "forge-check-stage-"));
  for (const f of SURFACES) {
    fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
    fs.copyFileSync(path.join(ROOT, f), path.join(dir, f));
  }
  fs.writeFileSync(path.join(dir, "registry.yml"), REGISTRY("pre-alpha"));
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

function run(): { code: number | null; out: string } {
  const r = spawnSync("bash", [SCRIPT], {
    cwd: dir,
    env: { ...process.env, FORGE_STAGE_REGISTRY: path.join(dir, "registry.yml") },
    encoding: "utf-8",
  });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
}

function edit(file: string, from: string | RegExp, to: string): void {
  const p = path.join(dir, file);
  const before = fs.readFileSync(p, "utf-8");
  const after = before.replace(from, to);
  expect(after).not.toBe(before);
  fs.writeFileSync(p, after);
}

describe("check-stage", () => {
  it("passes on the repo's surfaces and checks the forge-ui registry row", () => {
    const { code, out } = run();
    expect(code, out).toBe(0);
    expect(out).toContain("ok   STAGE equals registry row forge-ui (public, pre-alpha)");
    expect(out).toContain("ok   README line 9 is the ruled stage text");
  });

  it("reads the forge-ui row, not the forge row (forge is alpha)", () => {
    // The fixture's forge row already says alpha; only forge-ui moving turns it red.
    fs.writeFileSync(path.join(dir, "registry.yml"), REGISTRY("alpha"));
    const { code, out } = run();
    expect(code).toBe(1);
    expect(out).toContain("differs from registry row forge-ui");
  });

  it("is red when README line 9 is not FINAL B byte for byte", () => {
    edit("README.md", "is still a public preview.", "is a public preview.");
    expect(run().code).toBe(1);
  });

  it("is red when the README clone tag does not match package.json", () => {
    const version = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf-8")).version;
    edit("package.json", `"version": "${version}"`, '"version": "9.9.9"');
    const { code, out } = run();
    expect(code).toBe(1);
    expect(out).toContain("README clones the release tag v9.9.9");
  });

  it("skips, and says so, where the registry is not readable", () => {
    const r = spawnSync("bash", [SCRIPT], {
      cwd: dir,
      env: { ...process.env, FORGE_STAGE_REGISTRY: path.join(dir, "missing.yml") },
      encoding: "utf-8",
    });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("skip registry row forge-ui");
  });
});
