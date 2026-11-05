/**
 * GET /api/commands must list exactly the commands POST /api/commands/execute
 * can run (issue #90).
 *
 * Unlike commands.test.ts, this file uses the real command registry
 * (src/config/forge-commands.ts), so it fails when the listed ids and the
 * EXECUTABLE_COMMANDS handlers drift apart. child_process is mocked so no
 * command actually runs.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { createCommandRoutes } from "../commands";
import type { RouteContext } from "../../route-context";
import { Result } from "../../../utils/result";
import { getIconByName } from "../../../utils/icon-mapper";
import { HelpCircle } from "lucide-react";

vi.mock("child_process", () => ({
  execSync: vi.fn(() => "{}"),
}));

function makeApp(): express.Application {
  const ctx = {
    projectRoot: "/test/project",
    orchestrator: {
      getCommandHistory: vi.fn(),
      getCommandSuggestions: vi.fn(),
    },
    statusService: {
      getStatus: vi.fn(async () =>
        Result.err({ message: "status unavailable in test" } as Error),
      ),
    },
    broadcast: vi.fn(),
  } as unknown as RouteContext;

  const app = express();
  app.use(express.json());
  app.use("/api/commands", createCommandRoutes(ctx));
  return app;
}

/** The ids POST /execute accepts, read from its 404 reply for an unknown id. */
async function runnableIds(app: express.Application): Promise<string[]> {
  const res = await request(app)
    .post("/api/commands/execute")
    .send({ command: "no-such-command" })
    .expect(404);
  const match = /Available: (.*)$/.exec(res.body.error as string);
  expect(match).not.toBeNull();
  return match![1].split(", ").sort();
}

async function listedIds(app: express.Application): Promise<string[]> {
  const res = await request(app).get("/api/commands").expect(200);
  expect(res.body.success).toBe(true);
  return (res.body.data as Array<{ id: string }>).map((c) => c.id).sort();
}

describe("GET /api/commands lists exactly the runnable commands (#90)", () => {
  let app: express.Application;

  beforeEach(() => {
    app = makeApp();
  });

  it("lists the same ids that POST /execute accepts", async () => {
    const listed = await listedIds(app);
    const runnable = await runnableIds(app);
    expect(listed).toEqual(runnable);
  });

  it("lists the 14 commands the server can run", async () => {
    expect(await listedIds(app)).toEqual(
      [
        "analyze-bundle",
        "analyze-deps",
        "analyze-lint",
        "analyze-types",
        "frg-deploy",
        "frg-feature",
        "frg-gap-analysis",
        "frg-status",
        "frg-test",
        "git-diff",
        "git-log",
        "git-status",
        "system-info",
        "test-coverage",
      ].sort(),
    );
  });

  it("runs every listed command instead of answering 404", async () => {
    const listed = await listedIds(app);
    for (const id of listed) {
      const res = await request(app)
        .post("/api/commands/execute")
        .send({ command: id });
      expect({ id, status: res.status }).toEqual({ id, status: 200 });
    }
  });

  it("gives every listed command a name, description, category and icon", async () => {
    const res = await request(app).get("/api/commands").expect(200);
    for (const cmd of res.body.data as Array<Record<string, unknown>>) {
      expect(typeof cmd.name).toBe("string");
      expect((cmd.name as string).length).toBeGreaterThan(0);
      expect((cmd.description as string).length).toBeGreaterThan(0);
      expect(["forge", "git", "test", "deploy", "analyze"]).toContain(
        cmd.category,
      );
      // HelpCircle is the client fallback for an unknown or missing icon name
      expect({ id: cmd.id, fallback: getIconByName(cmd.iconName as string) === HelpCircle })
        .toEqual({ id: cmd.id, fallback: false });
    }
  });
});
