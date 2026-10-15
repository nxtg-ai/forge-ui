// @vitest-environment node
/**
 * POST /api/diffs/apply changes no file, so it must not say it did.
 *
 * NEXUS: PRM-CLX9-20261015-06 item (b), EMMA-SOUL Dx3 99fe91ba point 6. The
 * route used to answer "Successfully applied changes to <file>" while writing
 * nothing, and the client repeated that text whatever the server said.
 *
 * Real router on a temp folder; the client test stubs only fetch (the network).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import express from "express";
import request from "supertest";
import * as os from "node:os";
import * as path from "node:path";

vi.unmock("fs");
const fs = await vi.importActual<typeof import("node:fs")>("node:fs");

import { createForgeRoutes } from "../forge";
import { applyDiff } from "../../../api/diff-service";

const ORIGINAL = "export const value = 1;\n";

let dir: string;
let target: string;
let app: express.Express;
let events: Array<{ type: string; data: unknown }>;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "forge-diffs-apply-"));
  target = path.join(dir, "file.ts");
  fs.writeFileSync(target, ORIGINAL);
  events = [];
  app = express();
  app.use(express.json());
  app.use(
    "/api",
    createForgeRoutes({
      projectRoot: dir,
      broadcast: (type: string, data: unknown) => events.push({ type, data }),
    } as unknown as Parameters<typeof createForgeRoutes>[0]),
  );
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
  vi.unstubAllGlobals();
});

describe("POST /api/diffs/apply", () => {
  it("says that no file was changed, and changes none", async () => {
    const res = await request(app).post("/api/diffs/apply").send({ filePath: target });

    expect(res.status).toBe(200);
    expect(res.body.applied).toBe(false);
    expect(res.body.message).not.toMatch(/applied changes/i);
    expect(res.body.message).toContain("No file was changed");
    expect(fs.readFileSync(target, "utf-8")).toBe(ORIGINAL);
  });

  it("broadcasts the decision as accepted, not applied", async () => {
    await request(app).post("/api/diffs/apply").send({ filePath: target });

    expect(events.map((e) => e.type)).toEqual(["diff.accepted"]);
  });
});

describe("applyDiff (client)", () => {
  it("reports the server's answer instead of claiming success", async () => {
    const server = await request(app).post("/api/diffs/apply").send({ filePath: target });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => server.body }),
    );

    const result = await applyDiff(target);

    expect(result.success).toBe(true);
    expect(result.applied).toBe(false);
    expect(result.message).toBe(server.body.message);
    expect(result.message).not.toMatch(/applied changes/i);
  });
});
