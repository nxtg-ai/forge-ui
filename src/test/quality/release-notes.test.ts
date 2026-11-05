// @vitest-environment node
/**
 * The GitHub release body is the CHANGELOG section for the tagged version, not a git log.
 *
 * NEXUS: DIRECTIVE-NXTG-20261105-02 (forge-pm al:272d2b9b386c33a3). deploy.yml used to write the
 * body from `git log` (plus an install footer that ran `npm start`), which overwrote the reviewed
 * notes on v3.5.3 and v3.5.4 until they were restored by hand with `gh release edit`.
 */
import { describe, it, expect, vi } from "vitest";
import { spawnSync } from "node:child_process";
import * as os from "node:os";
import * as path from "node:path";
import yaml from "js-yaml";

vi.unmock("fs");
const fs = await vi.importActual<typeof import("node:fs")>("node:fs");

const ROOT = path.resolve(__dirname, "../../..");
const SCRIPT = path.join(ROOT, ".github/scripts/release-notes.sh");

function notes(version: string, changelog?: string) {
  const args = changelog ? [SCRIPT, version, changelog] : [SCRIPT, version];
  return spawnSync("bash", args, { cwd: ROOT, encoding: "utf-8" });
}

const SAMPLE = [
  "# Changelog",
  "",
  "## [Unreleased]",
  "",
  "## [2.0.0] - 2026-01-02",
  "",
  "Intro line.",
  "",
  "### Fixed",
  "",
  "- A fix.",
  "",
  "## [1.0.0] - 2026-01-01",
  "",
  "- First.",
  "",
].join("\r\n");

describe("release notes from the CHANGELOG", () => {
  it("prints exactly the version's section, without CR and surrounding blank lines", () => {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "release-notes-")), "CHANGELOG.md");
    fs.writeFileSync(file, SAMPLE);
    const r = notes("2.0.0", file);
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toBe("Intro line.\n\n### Fixed\n\n- A fix.\n");
  });

  it("fails, printing nothing, for a missing or empty section", () => {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "release-notes-")), "CHANGELOG.md");
    fs.writeFileSync(file, SAMPLE);
    for (const v of ["9.9.9", "Unreleased"]) {
      const r = notes(v, file);
      expect(r.status).toBe(1);
      expect(r.stdout).toBe("");
    }
  });

  it("reads this repo's CHANGELOG for the current version", () => {
    const version = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf-8")).version;
    const r = notes(version);
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toContain("forge-ui is a **Public preview**");
  });

  it("deploy.yml writes the release body with release-notes.sh, not git log", () => {
    const doc = yaml.load(fs.readFileSync(path.join(ROOT, ".github/workflows/deploy.yml"), "utf-8")) as {
      jobs: { release: { steps: Array<{ name?: string; run?: string; with?: Record<string, string> }> } };
    };
    const steps = doc.jobs.release.steps;
    const gen = steps.find((s) => (s.run ?? "").includes("CHANGELOG_RELEASE.md"));
    expect(gen?.run).toContain("release-notes.sh");
    expect(gen?.run).not.toContain("git log");
    const create = steps.find((s) => s.name === "Create GitHub Release");
    expect(create?.with?.body_path).toBe("CHANGELOG_RELEASE.md");
  });
});
