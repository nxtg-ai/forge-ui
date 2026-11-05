/**
 * Semgrep and Gitleaks must publish their SARIF to code scanning.
 *
 * From 2026-04-13 the security-scan workflow kept SARIF only as an artifact,
 * so their code-scanning alerts froze at commit e2f637a: fixed code never
 * closed an alert and new findings never opened one (DIRECTIVE-NXTG-20261105-03,
 * forge-pm ruling: a scanner whose findings are frozen counts as off).
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import yaml from "js-yaml";

const WORKFLOW = resolve(__dirname, "../../../.github/workflows/security-scan.yml");

interface Step {
  name?: string;
  uses?: string;
  run?: string;
  if?: string;
  with?: Record<string, string>;
}
interface Job {
  permissions?: Record<string, string>;
  steps?: Step[];
}

function job(id: string): Job {
  const wf = yaml.load(readFileSync(WORKFLOW, "utf-8")) as { jobs: Record<string, Job> };
  return wf.jobs[id];
}

describe.each([
  ["semgrep", "semgrep.sarif"],
  ["gitleaks", "gitleaks.sarif"],
])("security-scan.yml %s job", (id, sarif) => {
  it("uploads its SARIF to code scanning under its own category", () => {
    const upload = (job(id).steps ?? []).find((s) =>
      s.uses?.startsWith("github/codeql-action/upload-sarif@"),
    );
    expect(upload?.with).toEqual({ sarif_file: sarif, category: id });
  });

  it("has security-events: write so the upload is allowed", () => {
    expect(job(id).permissions?.["security-events"]).toBe("write");
  });
});

describe("security-scan.yml gitleaks install", () => {
  it("downloads a pinned release, not releases/latest", () => {
    const install = (job("gitleaks").steps ?? []).find((s) => s.name === "Install Gitleaks");
    expect(install?.run).toMatch(/releases\/download\/v\d+\.\d+\.\d+\//);
    expect(install?.run).not.toContain("releases/latest/");
  });
});
