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

/**
 * The drift check must not race the release. On a release push the check ran
 * on the merge, before deploy.yml had created the tag and release, and opened
 * a false drift issue (#18, #19, #27, #106, #112). It now runs after Deploy &
 * Release completes, plus the daily schedule (forge-pm al:7e63e862cfcff11e).
 */
describe("release-protocol-check.yml triggers", () => {
  const wf = yaml.load(readFileSync(WORKFLOW, "utf-8")) as {
    on: Record<string, unknown>;
    jobs: Record<string, { if?: string }>;
  };
  const deploy = yaml.load(readFileSync(resolve(__dirname, "../../../.github/workflows/deploy.yml"), "utf-8")) as {
    name: string;
  };

  it("does not run on push", () => {
    expect(Object.keys(wf.on)).not.toContain("push");
  });

  it("runs when Deploy & Release completes, and on the daily schedule", () => {
    expect(wf.on.workflow_run).toEqual({ workflows: [deploy.name], types: ["completed"] });
    expect(deploy.name).toBe("Deploy & Release");
    expect(wf.on.schedule).toEqual([{ cron: "0 8 * * *" }]);
  });

  it("skips when the triggering deploy run did not succeed", () => {
    expect(wf.jobs["drift-check"].if).toBe(
      "github.event_name != 'workflow_run' || github.event.workflow_run.conclusion == 'success'",
    );
  });
});
