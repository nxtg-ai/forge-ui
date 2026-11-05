/**
 * release-protocol-check.yml (the ADR-036 template) must not interpolate
 * GitHub expressions into run: scripts (code scanning #530). Values reach
 * the scripts through env: and are read as "$VAR".
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import yaml from "js-yaml";

const WORKFLOW = resolve(__dirname, "../../../.github/workflows/release-protocol-check.yml");

interface Step {
  name?: string;
  run?: string;
}

describe("release-protocol-check.yml run steps", () => {
  const wf = yaml.load(readFileSync(WORKFLOW, "utf-8")) as {
    jobs: Record<string, { steps?: Step[] }>;
  };
  const runSteps = Object.entries(wf.jobs).flatMap(([job, j]) =>
    (j.steps ?? []).filter((s) => typeof s.run === "string").map((s) => ({ job, s })),
  );

  it("has run steps to check", () => {
    expect(runSteps.length).toBeGreaterThan(0);
  });

  it("interpolates no ${{ }} expression into any run: script", () => {
    const offenders = runSteps
      .filter(({ s }) => s.run!.includes("${{"))
      .map(({ job, s }) => `${job} / ${s.name ?? "(unnamed)"}`);
    expect(offenders).toEqual([]);
  });

  it("never pipes a download into a shell", () => {
    const piped = runSteps
      .filter(({ s }) => /curl[^\n|]*\|\s*(ba)?sh\b/.test(s.run!))
      .map(({ job, s }) => `${job} / ${s.name ?? "(unnamed)"}`);
    expect(piped).toEqual([]);
  });
});
