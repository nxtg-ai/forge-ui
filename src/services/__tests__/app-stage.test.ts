// @vitest-environment node
/**
 * The app's stage constant must equal the root STAGE file.
 * NEXUS: DIRECTIVE-NXTG-20261007-11.
 */
import { describe, it, expect, vi } from "vitest";
import { APP_STAGE, RELEASE_STAGES } from "../app-stage";

vi.unmock("fs");
const fs = await vi.importActual<typeof import("node:fs")>("node:fs");
const path = await vi.importActual<typeof import("node:path")>("node:path");

describe("APP_STAGE", () => {
  it("equals the root STAGE file", () => {
    const stage = fs.readFileSync(path.resolve(__dirname, "../../../STAGE"), "utf-8").trim();
    expect(APP_STAGE).toBe(stage);
  });

  it("is a known release stage", () => {
    expect(RELEASE_STAGES).toContain(APP_STAGE);
  });
});
