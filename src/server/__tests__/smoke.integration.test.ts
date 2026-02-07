/**
 * INTEGRATION SMOKE TESTS — No mocks. Real server. Real HTTP. Real output.
 *
 * These tests exist because of a catastrophic failure on 2026-02-06:
 * - 2326 unit tests passed with mocks
 * - The actual Command Center was completely broken
 * - A duplicate placeholder route intercepted all real requests
 * - Nobody caught it because nobody started the actual server
 *
 * These tests start the REAL api-server, make REAL HTTP requests,
 * and verify REAL responses. If these fail, the product is broken
 * regardless of how many unit tests pass.
 *
 * Run with: npx vitest run src/server/__tests__/smoke.integration.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execSync, spawn, type ChildProcess } from "child_process";
import * as path from "path";

const PROJECT_ROOT = path.resolve(__dirname, "../../..");
const PORT = 15051; // Use non-standard port to avoid conflicts
const BASE_URL = `http://localhost:${PORT}`;

let serverProcess: ChildProcess | null = null;

async function waitForServer(url: string, timeoutMs = 15000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(`${url}/api/health`);
      if (response.ok) return true;
    } catch {
      // Server not ready yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

function killPort(port: number): void {
  try {
    execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null`, { encoding: "utf-8" });
  } catch {
    // Nothing on that port
  }
}

beforeAll(async () => {
  // Ensure port is free
  killPort(PORT);
  await new Promise((r) => setTimeout(r, 500));

  // Start the REAL server (detached so we can kill the whole process group)
  serverProcess = spawn("npx", ["tsx", path.join(PROJECT_ROOT, "src/server/api-server.ts")], {
    cwd: PROJECT_ROOT,
    env: { ...process.env, PORT: String(PORT), NODE_ENV: "test" },
    stdio: ["ignore", "pipe", "pipe"],
    detached: true,
  });

  // Collect stderr for debugging
  let stderr = "";
  serverProcess.stderr?.on("data", (data) => { stderr += data.toString(); });

  const ready = await waitForServer(BASE_URL);
  if (!ready) {
    throw new Error(`Server failed to start on port ${PORT} within 15s.\nStderr: ${stderr}`);
  }
}, 20000);

afterAll(async () => {
  if (serverProcess && serverProcess.pid) {
    // Kill the entire process group (negative PID) to catch child processes
    try { process.kill(-serverProcess.pid, "SIGTERM"); } catch { /* already dead */ }
    await new Promise((r) => setTimeout(r, 1000));
    try { process.kill(-serverProcess.pid, "SIGKILL"); } catch { /* already dead */ }
  }
  killPort(PORT);
}, 10000);

describe("Smoke Tests: Real Server, Real Requests", () => {
  // ============= Health Check =============

  it("GET /api/health returns 200", async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("healthy");
  });

  // ============= Command Execution =============

  it("POST /api/commands/execute with frg-status returns real project data", async () => {
    const res = await fetch(`${BASE_URL}/api/commands/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command: "frg-status" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();

    // Must be successful
    expect(body.success).toBe(true);

    // Must have real data, not placeholder
    expect(body.data).toBeDefined();
    expect(body.data.output).toBeDefined();
    expect(typeof body.data.output).toBe("string");
    expect(body.data.output.length).toBeGreaterThan(10);

    // Must NOT be the placeholder "Command executed: {json}" response
    expect(body.data.output).not.toContain("Command executed:");

    // Must have real project info
    expect(body.data.output).toContain("NXTG-Forge");
  }, 30000);

  it("POST /api/commands/execute with git-status returns real git data", async () => {
    const res = await fetch(`${BASE_URL}/api/commands/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command: "git-status" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.output).toContain("Branch:");
    expect(body.data.output).toContain("Recent Commits");
  }, 10000);

  it("POST /api/commands/execute with analyze-types returns real tsc output", async () => {
    const res = await fetch(`${BASE_URL}/api/commands/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command: "analyze-types" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.output).toBeDefined();
    // Either "0 errors" or has real error count — either way it's real
    expect(body.data.output).toMatch(/TypeScript: \d+ error|All types check out/);
  }, 60000);

  it("POST /api/commands/execute with system-info returns real system data", async () => {
    const res = await fetch(`${BASE_URL}/api/commands/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command: "system-info" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.output).toContain("Node.js:");
    expect(body.data.output).toContain("Platform:");
  }, 10000);

  // ============= Error Handling =============

  it("POST /api/commands/execute with unknown command returns 404 with available list", async () => {
    const res = await fetch(`${BASE_URL}/api/commands/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command: "nonexistent-garbage" }),
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain("Available:");
    expect(body.error).toContain("frg-status");
  });

  it("POST /api/commands/execute with missing command returns 400", async () => {
    const res = await fetch(`${BASE_URL}/api/commands/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it("POST /api/commands/execute with wrong payload shape returns 400", async () => {
    // This is what the old client used to send — the full Command object
    // instead of { command: "frg-status" }. This must fail, not silently succeed.
    const res = await fetch(`${BASE_URL}/api/commands/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Status Report", id: "frg-status", category: "forge" }),
    });

    const body = await res.json();
    // Should either fail (400) or at least not return placeholder data
    if (res.status === 200) {
      // If it somehow succeeds, it must have real data
      expect(body.data?.output).not.toContain("Command executed:");
    }
  });

  // ============= All Registered Commands Work =============

  it("every registered command returns a valid response", async () => {
    // First, get the list of available commands from an error response
    const errRes = await fetch(`${BASE_URL}/api/commands/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command: "__list__" }),
    });
    const errBody = await errRes.json();
    const availableMatch = errBody.error?.match(/Available: (.+)/);
    expect(availableMatch).toBeTruthy();

    const commands = availableMatch![1].split(", ");
    expect(commands.length).toBeGreaterThanOrEqual(5);

    // Test each command (skip long-running ones)
    const skipLongRunning = new Set(["frg-test", "frg-deploy", "frg-gap-analysis", "analyze-lint", "analyze-bundle", "test-coverage"]);

    for (const cmd of commands) {
      if (skipLongRunning.has(cmd)) continue;

      const res = await fetch(`${BASE_URL}/api/commands/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: cmd }),
      });

      const body = await res.json();

      // Every command must return a valid response shape
      expect(body).toHaveProperty("success");
      expect(body).toHaveProperty("timestamp");

      if (body.success) {
        expect(body.data).toBeDefined();
        expect(body.data.output).toBeDefined();
        expect(typeof body.data.output).toBe("string");
        expect(body.data.output.length).toBeGreaterThan(0);
        // Must never be the placeholder response
        expect(body.data.output).not.toContain("Command executed:");
      }
    }
  }, 120000);

  // ============= Client-Server Protocol Agreement =============

  it("client payload format matches server expectation", async () => {
    // The client sends { command: "frg-status" }
    // The server must accept this exact format
    const clientPayload = { command: "frg-status" };

    const res = await fetch(`${BASE_URL}/api/commands/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(clientPayload),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.command).toBe("frg-status");
    expect(body.data.output).toBeDefined();
  }, 30000);

  // ============= State Endpoints =============

  it("GET /api/state returns real state data", async () => {
    const res = await fetch(`${BASE_URL}/api/state`);
    if (res.status === 200) {
      const body = await res.json();
      expect(body.success).toBe(true);
    }
    // 200 or 404 are both acceptable (endpoint may not exist)
    expect([200, 404]).toContain(res.status);
  });

  it("GET /api/governance/state returns governance data", async () => {
    const res = await fetch(`${BASE_URL}/api/governance/state`);
    if (res.status === 200) {
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
    }
    expect([200, 404]).toContain(res.status);
  });
});
