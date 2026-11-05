/**
 * deploy.yml must not interpolate GitHub expressions into run: scripts
 * (code scanning #388, Semgrep run-shell-injection).
 *
 * A `${{ ... }}` inside `run:` is pasted into the shell script before it runs,
 * so a crafted value (a workflow_dispatch input, a tag name) becomes shell
 * code. Values must reach scripts through `env:` instead.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import yaml from "js-yaml";

const WORKFLOW = resolve(__dirname, "../../../.github/workflows/deploy.yml");

interface Step {
  name?: string;
  run?: string;
  env?: Record<string, string>;
}
interface Workflow {
  jobs: Record<string, { steps?: Step[] }>;
}

function steps(): Array<{ job: string; step: Step }> {
  const wf = yaml.load(readFileSync(WORKFLOW, "utf-8")) as Workflow;
  return Object.entries(wf.jobs).flatMap(([job, j]) =>
    (j.steps ?? []).map((step) => ({ job, step })),
  );
}

describe("deploy.yml run steps (#388)", () => {
  it("interpolates no ${{ }} expression into any run: script", () => {
    const offenders = steps()
      .filter(({ step }) => typeof step.run === "string" && step.run.includes("${{"))
      .map(({ job, step }) => `${job} / ${step.name ?? "(unnamed)"}`);
    expect(offenders).toEqual([]);
  });

  it("passes the version to every step that uses it through env", () => {
    const usesVersion = steps().filter(
      ({ step }) =>
        typeof step.run === "string" &&
        /\$\{?VERSION\b/.test(step.run) &&
        !/^\s*VERSION=/m.test(step.run),
    );
    expect(usesVersion.length).toBeGreaterThanOrEqual(3);
    for (const { job, step } of usesVersion) {
      expect({ step: `${job} / ${step.name}`, env: typeof step.env?.VERSION }).toEqual({
        step: `${job} / ${step.name}`,
        env: "string",
      });
    }
  });

  it("rejects a version that is not semver before using it", () => {
    const determine = steps().find(({ step }) => step.name === "Determine version");
    expect(determine?.step.run).toMatch(/\[\[ "\$VERSION" =~ \^\[0-9\]\+/);
    expect(determine?.step.run).toContain("exit 1");
  });
});
