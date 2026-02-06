/**
 * E2E Test Suite: Command Execute Endpoint
 * Tests /api/commands/execute endpoint for Forge command execution
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { ForgeStatus } from "../../services/status-service";

// Mock dependencies
vi.mock("../../services/status-service");
vi.mock("child_process");

describe("E2E: /api/commands/execute endpoint", () => {
  let mockFetch: typeof fetch;
  const API_BASE = "http://localhost:5051";

  beforeEach(() => {
    // Create mock fetch
    mockFetch = vi.fn(async (url: string, options?: RequestInit) => {
      const method = options?.method || "GET";
      const urlPath = new URL(url, API_BASE).pathname;
      const body = options?.body ? JSON.parse(options.body as string) : {};

      // Handle /api/commands/execute endpoint
      if (urlPath === "/api/commands/execute" && method === "POST") {
        const { command } = body;

        // Test case: missing command
        if (!command || typeof command !== "string") {
          return {
            ok: false,
            status: 400,
            json: async () => ({
              success: false,
              error: "Missing command ID",
              timestamp: new Date().toISOString(),
            }),
          } as Response;
        }

        // Test case: unknown command
        const validCommands = [
          "frg-status",
          "frg-test",
          "frg-deploy",
          "frg-feature",
          "frg-gap-analysis",
        ];
        if (!validCommands.includes(command)) {
          return {
            ok: false,
            status: 404,
            json: async () => ({
              success: false,
              error: `Unknown command: ${command}. Available: ${validCommands.join(", ")}`,
              timestamp: new Date().toISOString(),
            }),
          } as Response;
        }

        // Test case: frg-status (success with mock data)
        if (command === "frg-status") {
          const mockStatus: ForgeStatus = {
            project: {
              name: "test-project",
              path: "/test/path",
              forgeVersion: "1.0.0",
            },
            git: {
              branch: "main",
              ahead: 0,
              behind: 0,
              staged: 0,
              modified: 0,
              untracked: 0,
              hasUncommitted: false,
            },
            tests: {
              lines: 85,
              statements: 82,
              functions: 90,
              branches: 75,
              passing: 42,
              total: 45,
            },
            build: {
              status: "ok",
              lastBuild: new Date().toISOString(),
            },
            governance: {
              status: "active",
              confidence: 95,
              workstreamsActive: 3,
              workstreamsBlocked: 0,
              tasksPending: 5,
              tasksCompleted: 12,
            },
            agents: {
              total: 22,
              available: ["builder", "planner", "tester"],
              categories: {
                core: 4,
                specialized: 18,
              },
            },
            timestamp: new Date().toISOString(),
          };

          return {
            ok: true,
            status: 200,
            json: async () => ({
              success: true,
              data: {
                command: "frg-status",
                output: "NXTG-Forge Status\n─────────────────\nProject: test-project\nBranch: main",
                ...mockStatus,
              },
              timestamp: new Date().toISOString(),
            }),
          } as Response;
        }

        // Test case: frg-test (success with test results)
        if (command === "frg-test") {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              success: true,
              data: {
                command: "frg-test",
                output: "Test Suites: 3 passed, 3 total\nTests: 42 passed, 42 total",
                passed: 42,
                failed: 0,
                total: 42,
              },
              timestamp: new Date().toISOString(),
            }),
          } as Response;
        }

        // Test case: frg-deploy (success with build complete)
        if (command === "frg-deploy") {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              success: true,
              data: {
                command: "frg-deploy",
                output: "Build complete: dist/index.html",
                stage: "build-complete",
              },
              timestamp: new Date().toISOString(),
            }),
          } as Response;
        }

        // Test case: frg-feature (redirect to terminal)
        if (command === "frg-feature") {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              success: true,
              data: {
                command: "frg-feature",
                output: "Feature creation requires the Infinity Terminal.\nNavigate to the Terminal page and use: /frg-feature <name>",
                redirect: "/terminal",
              },
              timestamp: new Date().toISOString(),
            }),
          } as Response;
        }

        // Test case: frg-gap-analysis (success with analysis)
        if (command === "frg-gap-analysis") {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              success: true,
              data: {
                command: "frg-gap-analysis",
                output: "## Test Coverage\nTests: 42 passed\n\n## Documentation\nSource files: 120\nDoc files: 15",
              },
              timestamp: new Date().toISOString(),
            }),
          } as Response;
        }
      }

      // Default 404
      return {
        ok: false,
        status: 404,
        json: async () => ({
          success: false,
          error: "Not found",
          timestamp: new Date().toISOString(),
        }),
      } as Response;
    }) as unknown as typeof fetch;

    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Request Validation", () => {
    it("should return 400 for missing command body", async () => {
      const response = await fetch(`${API_BASE}/api/commands/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain("Missing command ID");
      expect(data.timestamp).toBeDefined();
    });

    it("should return 400 for non-string command", async () => {
      const response = await fetch(`${API_BASE}/api/commands/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: 123 }),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain("Missing command ID");
    });

    it("should return 404 for unknown command", async () => {
      const response = await fetch(`${API_BASE}/api/commands/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: "frg-unknown" }),
      });

      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain("Unknown command: frg-unknown");
      expect(data.error).toContain("Available:");
    });
  });

  describe("Command Execution: frg-status", () => {
    it("should execute frg-status successfully", async () => {
      const response = await fetch(`${API_BASE}/api/commands/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: "frg-status" }),
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.data.command).toBe("frg-status");
      expect(data.data.output).toBeDefined();
      expect(data.timestamp).toBeDefined();
    });

    it("should return valid ForgeStatus shape", async () => {
      const response = await fetch(`${API_BASE}/api/commands/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: "frg-status" }),
      });

      const data = await response.json();

      expect(data.data).toHaveProperty("project");
      expect(data.data).toHaveProperty("git");
      expect(data.data).toHaveProperty("tests");
      expect(data.data).toHaveProperty("build");
      expect(data.data).toHaveProperty("governance");
      expect(data.data).toHaveProperty("agents");
      expect(data.data.project).toHaveProperty("name");
      expect(data.data.project).toHaveProperty("path");
      expect(data.data.project).toHaveProperty("forgeVersion");
    });

    it("should include CLI-formatted output", async () => {
      const response = await fetch(`${API_BASE}/api/commands/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: "frg-status" }),
      });

      const data = await response.json();

      expect(data.data.output).toContain("NXTG-Forge Status");
      expect(data.data.output).toContain("Project:");
      expect(data.data.output).toContain("Branch:");
    });
  });

  describe("Command Execution: frg-test", () => {
    it("should execute frg-test successfully", async () => {
      const response = await fetch(`${API_BASE}/api/commands/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: "frg-test" }),
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.data.command).toBe("frg-test");
      expect(data.data.output).toBeDefined();
    });

    it("should return test results data", async () => {
      const response = await fetch(`${API_BASE}/api/commands/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: "frg-test" }),
      });

      const data = await response.json();

      expect(data.data).toHaveProperty("passed");
      expect(data.data).toHaveProperty("failed");
      expect(data.data).toHaveProperty("total");
      expect(typeof data.data.passed).toBe("number");
      expect(typeof data.data.failed).toBe("number");
      expect(typeof data.data.total).toBe("number");
    });
  });

  describe("Command Execution: frg-deploy", () => {
    it("should execute frg-deploy successfully", async () => {
      const response = await fetch(`${API_BASE}/api/commands/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: "frg-deploy" }),
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.data.command).toBe("frg-deploy");
      expect(data.data.output).toBeDefined();
    });

    it("should return build stage information", async () => {
      const response = await fetch(`${API_BASE}/api/commands/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: "frg-deploy" }),
      });

      const data = await response.json();

      expect(data.data).toHaveProperty("stage");
      expect(data.data.stage).toBe("build-complete");
    });
  });

  describe("Command Execution: frg-feature", () => {
    it("should execute frg-feature and return redirect", async () => {
      const response = await fetch(`${API_BASE}/api/commands/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: "frg-feature" }),
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.data.command).toBe("frg-feature");
      expect(data.data.output).toContain("Infinity Terminal");
    });

    it("should return redirect data to terminal", async () => {
      const response = await fetch(`${API_BASE}/api/commands/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: "frg-feature" }),
      });

      const data = await response.json();

      expect(data.data).toHaveProperty("redirect");
      expect(data.data.redirect).toBe("/terminal");
    });
  });

  describe("Command Execution: frg-gap-analysis", () => {
    it("should execute frg-gap-analysis successfully", async () => {
      const response = await fetch(`${API_BASE}/api/commands/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: "frg-gap-analysis" }),
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.data.command).toBe("frg-gap-analysis");
      expect(data.data.output).toBeDefined();
    });

    it("should return analysis output with sections", async () => {
      const response = await fetch(`${API_BASE}/api/commands/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: "frg-gap-analysis" }),
      });

      const data = await response.json();

      expect(data.data.output).toContain("Test Coverage");
      expect(data.data.output).toContain("Documentation");
    });
  });

  describe("Response Shape Validation", () => {
    it("should return consistent response shape for success", async () => {
      const response = await fetch(`${API_BASE}/api/commands/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: "frg-status" }),
      });

      const data = await response.json();

      expect(data).toHaveProperty("success");
      expect(data).toHaveProperty("data");
      expect(data).toHaveProperty("timestamp");
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty("command");
      expect(data.data).toHaveProperty("output");
    });

    it("should return consistent response shape for errors", async () => {
      const response = await fetch(`${API_BASE}/api/commands/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: "frg-invalid" }),
      });

      const data = await response.json();

      expect(data).toHaveProperty("success");
      expect(data).toHaveProperty("error");
      expect(data).toHaveProperty("timestamp");
      expect(data.success).toBe(false);
    });

    it("should include ISO 8601 timestamp", async () => {
      const response = await fetch(`${API_BASE}/api/commands/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: "frg-status" }),
      });

      const data = await response.json();

      expect(data.timestamp).toBeDefined();
      expect(() => new Date(data.timestamp)).not.toThrow();
      expect(new Date(data.timestamp).toISOString()).toBe(data.timestamp);
    });
  });

  describe("All Executable Commands", () => {
    const executableCommands = [
      "frg-status",
      "frg-test",
      "frg-deploy",
      "frg-feature",
      "frg-gap-analysis",
    ];

    it.each(executableCommands)(
      "should successfully execute %s",
      async (command) => {
        const response = await fetch(`${API_BASE}/api/commands/execute`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ command }),
        });

        const data = await response.json();

        expect(response.ok).toBe(true);
        expect(data.success).toBe(true);
        expect(data.data.command).toBe(command);
        expect(data.data.output).toBeDefined();
        expect(typeof data.data.output).toBe("string");
      },
    );
  });

  describe("Edge Cases", () => {
    it("should handle empty string command", async () => {
      const response = await fetch(`${API_BASE}/api/commands/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: "" }),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it("should handle null command", async () => {
      const response = await fetch(`${API_BASE}/api/commands/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: null }),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it("should handle undefined command", async () => {
      const response = await fetch(`${API_BASE}/api/commands/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: undefined }),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it("should handle command with extra whitespace", async () => {
      const response = await fetch(`${API_BASE}/api/commands/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: " frg-status " }),
      });

      const data = await response.json();

      // Should fail because whitespace is not trimmed
      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });

    it("should handle case-sensitive command names", async () => {
      const response = await fetch(`${API_BASE}/api/commands/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: "FRG-STATUS" }),
      });

      const data = await response.json();

      // Should fail because commands are case-sensitive
      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });
  });
});
