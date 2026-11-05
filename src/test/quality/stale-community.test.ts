// @vitest-environment node
/**
 * The stale bot must never mark or close an outside author's issue or PR.
 *
 * NEXUS: DIRECTIVE-NXTG-20261105-02 (stale bot item, emma-soul al:66c6c92e0cfbf5a2). forge-ui #41,
 * an outside proposal, was marked stale by the bot on 2026-11-05 before any maintainer replied.
 * .github/scripts/community-label.mjs labels outside authors `community`, and stale.yml runs that
 * before actions/stale and exempts the label.
 */
import { describe, it, expect, vi } from "vitest";
import * as path from "node:path";
import yaml from "js-yaml";

vi.unmock("fs");
const fs = await vi.importActual<typeof import("node:fs")>("node:fs");

const ROOT = path.resolve(__dirname, "../../..");
const { numbersToLabel } = await import(path.join(ROOT, ".github/scripts/community-label.mjs"));

type Step = { uses?: string; run?: string; with?: Record<string, string> };

function staleSteps(): Step[] {
  const doc = yaml.load(fs.readFileSync(path.join(ROOT, ".github/workflows/stale.yml"), "utf-8")) as {
    jobs: { stale: { steps: Step[] } };
  };
  return doc.jobs.stale.steps;
}

describe("stale bot and outside authors", () => {
  it("labels outside, non-bot authors that are not labelled yet, and nobody else", () => {
    const jsonl = fs.readFileSync(path.join(ROOT, "src/test/fixtures/stale/open-items.jsonl"), "utf-8");
    // 101 NONE, 102 CONTRIBUTOR, 103 FIRST_TIME_CONTRIBUTOR. Not: OWNER, MEMBER, COLLABORATOR,
    // a bot, or an item that already has the label.
    expect(numbersToLabel(jsonl)).toEqual([101, 102, 103]);
  });

  it("stale.yml labels outside authors before actions/stale runs", () => {
    const steps = staleSteps();
    const labelAt = steps.findIndex((s) => (s.run ?? "").includes("community-label.mjs"));
    const staleAt = steps.findIndex((s) => (s.uses ?? "").startsWith("actions/stale@"));
    expect(labelAt).toBeGreaterThanOrEqual(0);
    expect(staleAt).toBeGreaterThan(labelAt);
  });

  it("actions/stale exempts the community label for issues and PRs", () => {
    const stale = staleSteps().find((s) => (s.uses ?? "").startsWith("actions/stale@"))!;
    const list = (key: string) => (stale.with?.[key] ?? "").split(",").map((x) => x.trim());
    expect(list("exempt-issue-labels")).toContain("community");
    expect(list("exempt-pr-labels")).toContain("community");
  });
});
