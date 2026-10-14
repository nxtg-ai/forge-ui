// @vitest-environment node
/**
 * The app's stage constants must equal the root STAGE file, and the label
 * must be derived from both axes.
 * NEXUS: DIRECTIVE-NXTG-20261007-11, DIRECTIVE-NXTG-20261013-17.
 */
import { describe, it, expect, vi } from "vitest";
import {
  APP_DISTRIBUTION,
  APP_MATURITY,
  APP_STAGE,
  DISTRIBUTIONS,
  MATURITIES,
  stageLabel,
} from "../app-stage";

vi.unmock("fs");
const fs = await vi.importActual<typeof import("node:fs")>("node:fs");
const path = await vi.importActual<typeof import("node:path")>("node:path");

function stageField(name: string): string | undefined {
  const text = fs.readFileSync(path.resolve(__dirname, "../../../STAGE"), "utf-8");
  const line = text.split(/\r?\n/).find((l) => l.startsWith(`${name}:`));
  return line?.slice(name.length + 1).trim();
}

describe("app stage", () => {
  it("distribution equals the root STAGE file", () => {
    expect(APP_DISTRIBUTION).toBe(stageField("distribution"));
  });

  it("maturity equals the root STAGE file", () => {
    expect(APP_MATURITY).toBe(stageField("maturity"));
  });

  it("uses known values on both axes", () => {
    expect(DISTRIBUTIONS).toContain(APP_DISTRIBUTION);
    expect(MATURITIES).toContain(APP_MATURITY);
  });

  it("displays 'Public preview' for public + pre-alpha", () => {
    expect(APP_STAGE).toBe("Public preview");
  });

  it("derives the label from both axes", () => {
    expect(stageLabel("public", "pre-alpha")).toBe("Public preview");
    expect(stageLabel("public", "dogfood")).toBe("Public preview");
    expect(stageLabel("public", "alpha")).toBe("Alpha");
    expect(stageLabel("public", "beta")).toBe("Beta");
    expect(stageLabel("public", "rc")).toBe("Release candidate");
    expect(stageLabel("public", "ga")).toBe("GA");
  });

  it("gives an internal product no outward label", () => {
    expect(stageLabel("internal", "pre-alpha")).toBeNull();
    expect(stageLabel("internal", "dogfood")).toBeNull();
  });
});
