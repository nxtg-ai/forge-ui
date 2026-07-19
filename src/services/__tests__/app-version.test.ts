// @vitest-environment node
/**
 * Version-source coupling — DIRECTIVE-NXTG-20260718-12 item 2.
 *
 * `clientInfo.version` was a hardcoded semver literal that drifted through an
 * entire release: a 3.3.2 client reported "3.3.1" to the orchestrator. Nothing
 * failed, because nothing coupled the literal to package.json.
 *
 * These drive the REAL spawn + handshake against the stub binary and read what
 * actually went on the wire — no mocking of the version module, per the
 * project's "Real Logs, No Mocking" principle.
 *
 * On non-vacuity: the wire assertion below is not self-satisfying. With a
 * hardcoded literal in the bridge, seeding package.json to any other version
 * makes it fail — verified both directions when this landed (see the directive
 * Response). The structural test is the second lock: it fails the moment a
 * semver literal reappears in the handshake, without needing a seed at all.
 */

import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";

const STUB = fileURLToPath(
  new URL("../../test/fixtures/forge-mcp-stub.mjs", import.meta.url),
);

const PKG_PATH = fileURLToPath(new URL("../../../package.json", import.meta.url));
const BRIDGE_PATH = fileURLToPath(
  new URL("../orchestrator-health.ts", import.meta.url),
);

// The global test setup mocks `fs`; these assertions read files the stub and
// the repo really wrote, so they need the unmocked module.
let readFileSync: typeof import("node:fs").readFileSync;

const originalBin = process.env.FORGE_BIN;
const originalMode = process.env.FORGE_STUB_MODE;

beforeEach(async () => {
  ({ readFileSync } = await vi.importActual<typeof import("node:fs")>("node:fs"));
  process.env.FORGE_BIN = STUB;
});

afterAll(() => {
  if (originalBin === undefined) delete process.env.FORGE_BIN;
  else process.env.FORGE_BIN = originalBin;
  if (originalMode === undefined) delete process.env.FORGE_STUB_MODE;
  else process.env.FORGE_STUB_MODE = originalMode;
});

describe("MCP handshake version coupling", () => {
  it("puts package.json's version on the wire", async () => {
    process.env.FORGE_STUB_MODE = "record-client";
    const clientFile = join(tmpdir(), `forge-clientinfo-${randomUUID()}`);
    process.env.FORGE_STUB_CLIENTFILE = clientFile;

    const { getOrchestratorHealth, clearOrchestratorHealthCache } = await import(
      "../orchestrator-health"
    );
    clearOrchestratorHealthCache();

    const health = await getOrchestratorHealth(
      join(tmpdir(), `forge-version-probe-${randomUUID()}`),
    );
    expect(health).not.toBeNull();

    const pkg = JSON.parse(readFileSync(PKG_PATH, "utf-8"));
    const clientInfo = JSON.parse(readFileSync(clientFile, "utf-8"));

    expect(clientInfo.name).toBe("forge-ui");
    expect(clientInfo.version).toBe(pkg.version);
  });

  it("resolves app-version from package.json", async () => {
    const pkg = JSON.parse(readFileSync(PKG_PATH, "utf-8"));
    const { appVersion } = await import("../app-version");

    expect(appVersion).toBe(pkg.version);
    // An `undefined` reaching the wire is the failure mode app-version exists
    // to prevent, so pin the shape as well as the value.
    expect(appVersion).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("keeps a semver literal out of the handshake", async () => {
    ({ readFileSync } = await vi.importActual<typeof import("node:fs")>("node:fs"));
    // The structural lock. The wire test above only fails on a literal once
    // package.json moves past it; this one fails the instant a literal appears,
    // which is the regression that actually happened.
    const source = readFileSync(BRIDGE_PATH, "utf-8");
    const clientInfoLine = source
      .split("\n")
      .find((line) => line.includes("clientInfo:"));

    expect(clientInfoLine).toBeDefined();
    expect(clientInfoLine).not.toMatch(/\d+\.\d+\.\d+/);
    expect(clientInfoLine).toContain("appVersion");
  });
});
