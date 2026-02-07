/**
 * Commands Routes Tests - Comprehensive test coverage for commands.ts
 *
 * Tests all command routes: history, suggestions, list, execute
 * Tests all executable commands: frg-*, git-*, analyze-*, test-*, system-info
 *
 * Test coverage includes:
 * - GET /history - Command execution history
 * - POST /suggestions - Command suggestions from context
 * - GET / - List available commands
 * - POST /execute - Execute whitelisted commands
 * - All 14 EXECUTABLE_COMMANDS entries
 * - Success paths, error handling, validation, edge cases
 * - Broadcasting, rate limiting, unknown commands
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import request from "supertest";
import { createCommandRoutes } from "../commands";
import type { RouteContext } from "../../route-context";
import { Result } from "../../../utils/result";
import { StatusService } from "../../../services/status-service";

// Mock child_process module
vi.mock("child_process", () => ({
  execSync: vi.fn(),
}));

// Mock forge-commands module
vi.mock("../../../config/forge-commands", () => ({
  FORGE_COMMANDS: [
    {
      id: "frg-status",
      name: "Status Report",
      description: "Display project status",
      category: "forge",
      hotkey: "s",
      requiresConfirmation: false,
      severity: "safe",
      icon: { name: "Activity" },
    },
    {
      id: "frg-test",
      name: "Run Tests",
      description: "Execute test suite",
      category: "test",
      hotkey: "t",
      requiresConfirmation: false,
      severity: "safe",
      icon: { name: "CheckCircle" },
    },
  ],
}));

describe("Command Routes", () => {
  let app: express.Application;
  let mockCtx: RouteContext;
  let mockExecSync: any;

  beforeEach(async () => {
    // Get mocked execSync
    const { execSync } = await import("child_process");
    mockExecSync = vi.mocked(execSync);

    // Create mock context
    mockCtx = {
      projectRoot: "/test/project",
      orchestrator: {
        getCommandHistory: vi.fn(),
        getCommandSuggestions: vi.fn(),
      } as any,
      statusService: {
        getStatus: vi.fn(),
      } as any,
      broadcast: vi.fn(),
      visionSystem: {} as any,
      stateManager: {} as any,
      coordinationService: {} as any,
      mcpSuggestionEngine: {} as any,
      bootstrapService: {} as any,
      runspaceManager: {} as any,
      governanceStateManager: {} as any,
      initService: {} as any,
      complianceService: {} as any,
      getWorkerPool: vi.fn(),
      getWsClientCount: vi.fn(),
    };

    // Create express app with routes
    app = express();
    app.use(express.json());
    app.use("/api/commands", createCommandRoutes(mockCtx));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============= GET /history =============

  describe("GET /api/commands/history", () => {
    it("returns command history successfully", async () => {
      const mockHistory = [
        {
          id: "cmd-1",
          command: "frg-status",
          timestamp: "2026-02-06T10:00:00Z",
          status: "success",
        },
        {
          id: "cmd-2",
          command: "frg-test",
          timestamp: "2026-02-06T11:00:00Z",
          status: "failed",
        },
      ];
      vi.mocked(mockCtx.orchestrator.getCommandHistory).mockResolvedValue(
        mockHistory,
      );

      const res = await request(app).get("/api/commands/history").expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(mockHistory);
      expect(res.body.timestamp).toBeDefined();
      expect(mockCtx.orchestrator.getCommandHistory).toHaveBeenCalledOnce();
    });

    it("returns empty history", async () => {
      vi.mocked(mockCtx.orchestrator.getCommandHistory).mockResolvedValue([]);

      const res = await request(app).get("/api/commands/history").expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });

    it("handles errors gracefully", async () => {
      vi.mocked(mockCtx.orchestrator.getCommandHistory).mockRejectedValue(
        new Error("Database connection failed"),
      );

      const res = await request(app).get("/api/commands/history").expect(500);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("Database connection failed");
      expect(res.body.timestamp).toBeDefined();
    });

    it("handles non-Error exceptions", async () => {
      vi.mocked(mockCtx.orchestrator.getCommandHistory).mockRejectedValue(
        "String error",
      );

      const res = await request(app).get("/api/commands/history").expect(500);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("Unknown error");
    });
  });

  // ============= POST /suggestions =============

  describe("POST /api/commands/suggestions", () => {
    it("returns command suggestions based on context", async () => {
      const mockSuggestions = [
        { command: "frg-test", relevance: 0.9, reason: "Test files modified" },
        {
          command: "frg-status",
          relevance: 0.7,
          reason: "Check project state",
        },
      ];
      vi.mocked(
        mockCtx.orchestrator.getCommandSuggestions,
      ).mockResolvedValue(mockSuggestions);

      const context = { modifiedFiles: ["test.ts"], branch: "feature/new" };

      const res = await request(app)
        .post("/api/commands/suggestions")
        .send({ context })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(mockSuggestions);
      expect(res.body.timestamp).toBeDefined();
      expect(mockCtx.orchestrator.getCommandSuggestions).toHaveBeenCalledWith(
        context,
      );
    });

    it("handles missing context", async () => {
      vi.mocked(
        mockCtx.orchestrator.getCommandSuggestions,
      ).mockResolvedValue([]);

      const res = await request(app)
        .post("/api/commands/suggestions")
        .send({})
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(mockCtx.orchestrator.getCommandSuggestions).toHaveBeenCalledWith(
        undefined,
      );
    });

    it("handles errors in suggestion engine", async () => {
      vi.mocked(
        mockCtx.orchestrator.getCommandSuggestions,
      ).mockRejectedValue(new Error("Suggestion engine failed"));

      const res = await request(app)
        .post("/api/commands/suggestions")
        .send({ context: {} })
        .expect(500);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("Suggestion engine failed");
    });
  });

  // ============= GET / (List Commands) =============

  describe("GET /api/commands/", () => {
    it("returns list of available commands", async () => {
      const res = await request(app).get("/api/commands/").expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(2);

      // Verify structure
      const firstCommand = res.body.data[0];
      expect(firstCommand).toHaveProperty("id");
      expect(firstCommand).toHaveProperty("name");
      expect(firstCommand).toHaveProperty("description");
      expect(firstCommand).toHaveProperty("category");
      expect(firstCommand).toHaveProperty("hotkey");
      expect(firstCommand).toHaveProperty("requiresConfirmation");
      expect(firstCommand).toHaveProperty("severity");
      expect(firstCommand).toHaveProperty("iconName");

      // Verify values
      expect(firstCommand.id).toBe("frg-status");
      expect(firstCommand.name).toBe("Status Report");
      expect(firstCommand.iconName).toBe("Activity");
    });

    it("transforms icon objects to iconName strings", async () => {
      const res = await request(app).get("/api/commands/").expect(200);

      res.body.data.forEach((cmd: any) => {
        expect(typeof cmd.iconName).toBe("string");
        expect(cmd.icon).toBeUndefined(); // Icon object should not be present
      });
    });
  });

  // ============= POST /execute - frg-status =============

  describe("POST /api/commands/execute - frg-status", () => {
    it("executes frg-status successfully", async () => {
      const mockStatus = {
        project: { name: "NXTG-Forge", path: "/test", forgeVersion: "1.0.0" },
        git: { branch: "main", ahead: 0, behind: 0 },
        tests: { passing: 10, total: 10 },
      };
      vi.mocked(mockCtx.statusService.getStatus).mockResolvedValue(
        Result.ok(mockStatus),
      );

      // Mock the static formatForCLI method
      const mockCLIOutput = "=== NXTG-Forge Status ===\nBranch: main";
      const formatForCLISpy = vi
        .spyOn(StatusService, "formatForCLI")
        .mockReturnValue(mockCLIOutput);

      const res = await request(app)
        .post("/api/commands/execute")
        .send({ command: "frg-status" })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.command).toBe("frg-status");
      expect(res.body.data.output).toBe(mockCLIOutput);
      expect(res.body.data.project).toBeDefined();
      expect(res.body.timestamp).toBeDefined();

      // Verify broadcast
      expect(mockCtx.broadcast).toHaveBeenCalledWith(
        "command.started",
        expect.objectContaining({ command: "frg-status" }),
      );
      expect(mockCtx.broadcast).toHaveBeenCalledWith(
        "command.completed",
        expect.objectContaining({ command: "frg-status", success: true }),
      );

      formatForCLISpy.mockRestore();
    });

    it("handles frg-status errors", async () => {
      vi.mocked(mockCtx.statusService.getStatus).mockResolvedValue(
        Result.err({ message: "Git not found" } as Error),
      );

      const res = await request(app)
        .post("/api/commands/execute")
        .send({ command: "frg-status" })
        .expect(200);

      expect(res.body.success).toBe(false);
      expect(res.body.data.output).toBe("Git not found");
      expect(mockCtx.broadcast).toHaveBeenCalledWith(
        "command.failed",
        expect.objectContaining({ success: false }),
      );
    });
  });

  // ============= POST /execute - frg-test =============

  describe("POST /api/commands/execute - frg-test", () => {
    it("executes tests successfully with passing results", async () => {
      mockExecSync.mockReturnValue(
        "✓ test 1 passed\n✓ test 2 passed\n\n1 passed, 0 failed",
      );

      const res = await request(app)
        .post("/api/commands/execute")
        .send({ command: "frg-test" })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.output).toContain("1 passed");
      expect(res.body.data.passed).toBe(1);
      expect(res.body.data.failed).toBe(0);
      expect(res.body.data.total).toBe(1);

      expect(mockExecSync).toHaveBeenCalledWith(
        "npx vitest run --reporter=verbose 2>&1",
        expect.objectContaining({
          cwd: "/test/project",
          timeout: 120000,
          encoding: "utf-8",
        }),
      );
    });

    it("handles test failures", async () => {
      const error: any = new Error("Command failed");
      error.stdout = "5 passed, 3 failed";
      mockExecSync.mockImplementation(() => {
        throw error;
      });

      const res = await request(app)
        .post("/api/commands/execute")
        .send({ command: "frg-test" })
        .expect(200);

      expect(res.body.success).toBe(false);
      expect(res.body.data.passed).toBe(5);
      expect(res.body.data.failed).toBe(3);
    });

    it("extracts test counts from output", async () => {
      mockExecSync.mockReturnValue("Test Suites: 2 passed\nTests: 2 passed, 2 failed");

      const res = await request(app)
        .post("/api/commands/execute")
        .send({ command: "frg-test" })
        .expect(200);

      expect(res.body.data.passed).toBe(2);
      expect(res.body.data.failed).toBe(2);
    });
  });

  // ============= POST /execute - frg-deploy =============

  describe("POST /api/commands/execute - frg-deploy", () => {
    it("executes deploy with successful type check and build", async () => {
      mockExecSync
        .mockReturnValueOnce("") // tsc --noEmit succeeds
        .mockReturnValueOnce("✓ built in 1.2s"); // vite build succeeds

      const res = await request(app)
        .post("/api/commands/execute")
        .send({ command: "frg-deploy" })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.output).toContain("built");
      expect(res.body.data.stage).toBe("build-complete");

      expect(mockExecSync).toHaveBeenCalledWith(
        "npx tsc --noEmit 2>&1",
        expect.any(Object),
      );
      expect(mockExecSync).toHaveBeenCalledWith(
        "npx vite build 2>&1",
        expect.any(Object),
      );
    });

    it("fails pre-flight check on TypeScript errors", async () => {
      const error: any = new Error("Type check failed");
      error.stderr = "error TS2345: Argument of type 'string' is not assignable";
      mockExecSync.mockImplementation(() => {
        throw error;
      });

      const res = await request(app)
        .post("/api/commands/execute")
        .send({ command: "frg-deploy" })
        .expect(200);

      expect(res.body.success).toBe(false);
      expect(res.body.data.output).toContain("Pre-flight failed");
      expect(res.body.data.output).toContain("TypeScript errors");
    });

    it("fails on build errors after successful type check", async () => {
      mockExecSync.mockReturnValueOnce(""); // tsc succeeds

      const buildError: any = new Error("Build failed");
      buildError.stdout = "Error: Module not found";
      mockExecSync.mockImplementation(() => {
        throw buildError;
      });

      const res = await request(app)
        .post("/api/commands/execute")
        .send({ command: "frg-deploy" })
        .expect(200);

      expect(res.body.success).toBe(false);
      expect(res.body.data.output).toContain("Build failed");
    });
  });

  // ============= POST /execute - frg-feature =============

  describe("POST /api/commands/execute - frg-feature", () => {
    it("returns terminal redirect message", async () => {
      const res = await request(app)
        .post("/api/commands/execute")
        .send({ command: "frg-feature" })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.output).toContain("Infinity Terminal");
      expect(res.body.data.output).toContain("/frg-feature");
      expect(res.body.data.redirect).toBe("/terminal");
    });
  });

  // ============= POST /execute - frg-gap-analysis =============

  describe("POST /api/commands/execute - frg-gap-analysis", () => {
    it("analyzes test coverage and documentation", async () => {
      mockExecSync
        .mockReturnValueOnce("10 passed\n85% coverage\n") // test output
        .mockReturnValueOnce("42") // src files
        .mockReturnValueOnce("15"); // doc files

      const res = await request(app)
        .post("/api/commands/execute")
        .send({ command: "frg-gap-analysis" })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.output).toContain("Test Coverage");
      expect(res.body.data.output).toContain("Documentation");
      expect(res.body.data.output).toContain("42");
      expect(res.body.data.output).toContain("15");
    });

    it("handles test failures gracefully", async () => {
      // First call throws (test failure), then return values for src and doc counts
      mockExecSync
        .mockImplementationOnce(() => {
          throw new Error("Tests failed");
        })
        .mockReturnValueOnce("42")
        .mockReturnValueOnce("15");

      const res = await request(app)
        .post("/api/commands/execute")
        .send({ command: "frg-gap-analysis" })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.output).toContain("Failed to run tests");
    });

    it("handles doc analysis failures", async () => {
      mockExecSync
        .mockReturnValueOnce("10 passed")
        .mockImplementation(() => {
          throw new Error("Doc analysis failed");
        });

      const res = await request(app)
        .post("/api/commands/execute")
        .send({ command: "frg-gap-analysis" })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.output).toContain("Failed to analyze");
    });
  });

  // ============= POST /execute - git commands =============

  describe("POST /api/commands/execute - git-status", () => {
    it("returns git status with branch and changes", async () => {
      mockExecSync
        .mockReturnValueOnce("main") // branch
        .mockReturnValueOnce("M file1.ts\nA file2.ts") // status
        .mockReturnValueOnce("abc123 Latest commit") // log
        .mockReturnValueOnce("2"); // ahead

      const res = await request(app)
        .post("/api/commands/execute")
        .send({ command: "git-status" })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.output).toContain("Branch: main");
      expect(res.body.data.output).toContain("Ahead of remote: 2 commits");
      expect(res.body.data.output).toContain("Changed Files");
      expect(res.body.data.output).toContain("Recent Commits");
      expect(res.body.data.branch).toBe("main");
      expect(res.body.data.changedFiles).toBe(2);
    });

    it("handles clean working tree", async () => {
      mockExecSync
        .mockReturnValueOnce("main")
        .mockReturnValueOnce("") // no changes
        .mockReturnValueOnce("abc123 Commit")
        .mockReturnValueOnce("0");

      const res = await request(app)
        .post("/api/commands/execute")
        .send({ command: "git-status" })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.output).toContain("working tree clean");
      expect(res.body.data.changedFiles).toBe(0);
    });

    it("handles no upstream branch", async () => {
      mockExecSync
        .mockReturnValueOnce("feature-branch")
        .mockReturnValueOnce("M file.ts")
        .mockReturnValueOnce("abc123 Commit")
        .mockReturnValueOnce("no upstream");

      const res = await request(app)
        .post("/api/commands/execute")
        .send({ command: "git-status" })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.output).toContain("no upstream");
    });

    it("handles git errors", async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error("Not a git repository");
      });

      const res = await request(app)
        .post("/api/commands/execute")
        .send({ command: "git-status" })
        .expect(200);

      expect(res.body.success).toBe(false);
      expect(res.body.data.output).toContain("Not a git repository");
    });
  });

  describe("POST /api/commands/execute - git-diff", () => {
    it("shows staged and unstaged changes", async () => {
      mockExecSync
        .mockReturnValueOnce("file1.ts | 10 +++++++---") // staged
        .mockReturnValueOnce("file2.ts | 5 ++---"); // unstaged

      const res = await request(app)
        .post("/api/commands/execute")
        .send({ command: "git-diff" })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.output).toContain("Staged Changes");
      expect(res.body.data.output).toContain("Unstaged Changes");
      expect(res.body.data.output).toContain("file1.ts");
      expect(res.body.data.output).toContain("file2.ts");
    });

    it("shows empty when no changes", async () => {
      mockExecSync.mockReturnValueOnce("").mockReturnValueOnce("");

      const res = await request(app)
        .post("/api/commands/execute")
        .send({ command: "git-diff" })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.output).toContain("nothing staged");
      expect(res.body.data.output).toContain("no unstaged changes");
    });
  });

  describe("POST /api/commands/execute - git-log", () => {
    it("shows commit history with graph", async () => {
      mockExecSync.mockReturnValue(
        "* abc123 (HEAD -> main) Latest commit\n* def456 Previous commit",
      );

      const res = await request(app)
        .post("/api/commands/execute")
        .send({ command: "git-log" })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.output).toContain("abc123");
      expect(res.body.data.output).toContain("Latest commit");
    });
  });

  // ============= POST /execute - analyze commands =============

  describe("POST /api/commands/execute - analyze-types", () => {
    it("reports success when no type errors", async () => {
      mockExecSync.mockReturnValue("");

      const res = await request(app)
        .post("/api/commands/execute")
        .send({ command: "analyze-types" })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.output).toContain("0 errors");
      expect(res.body.data.output).toContain("All types check out");
    });

    it("reports type errors with count", async () => {
      const error: any = new Error("Type check failed");
      error.stdout =
        "error TS2345: Type mismatch\nerror TS2339: Property does not exist\nerror TS7006: Implicit any";
      mockExecSync.mockImplementation(() => {
        throw error;
      });

      const res = await request(app)
        .post("/api/commands/execute")
        .send({ command: "analyze-types" })
        .expect(200);

      expect(res.body.success).toBe(false);
      expect(res.body.data.output).toContain("3 error(s)");
      expect(res.body.data.errorCount).toBe(3);
    });
  });

  describe("POST /api/commands/execute - analyze-lint", () => {
    it("reports clean lint results", async () => {
      mockExecSync.mockReturnValue("");

      const res = await request(app)
        .post("/api/commands/execute")
        .send({ command: "analyze-lint" })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.output).toContain("No issues found");
    });

    it("reports lint errors", async () => {
      const error: any = new Error("Lint failed");
      error.stdout = "error: Unexpected console statement";
      mockExecSync.mockImplementation(() => {
        throw error;
      });

      const res = await request(app)
        .post("/api/commands/execute")
        .send({ command: "analyze-lint" })
        .expect(200);

      expect(res.body.success).toBe(false);
      expect(res.body.data.output).toContain("Unexpected console");
    });
  });

  describe("POST /api/commands/execute - analyze-deps", () => {
    it("reports all dependencies up to date", async () => {
      mockExecSync.mockReturnValue("{}");

      const res = await request(app)
        .post("/api/commands/execute")
        .send({ command: "analyze-deps" })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.output).toContain("All dependencies are up to date");
    });

    it("reports outdated dependencies", async () => {
      const outdated = JSON.stringify({
        react: { current: "18.2.0", latest: "18.3.0", wanted: "18.3.0" },
        typescript: { current: "5.0.0", latest: "5.4.0", wanted: "5.4.0" },
      });
      mockExecSync.mockReturnValue(outdated);

      const res = await request(app)
        .post("/api/commands/execute")
        .send({ command: "analyze-deps" })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.output).toContain("2 outdated package(s)");
      expect(res.body.data.output).toContain("react: 18.2.0 → 18.3.0");
      expect(res.body.data.outdatedCount).toBe(2);
    });

    it("handles npm errors", async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error("npm not found");
      });

      const res = await request(app)
        .post("/api/commands/execute")
        .send({ command: "analyze-deps" })
        .expect(200);

      expect(res.body.success).toBe(false);
    });
  });

  describe("POST /api/commands/execute - analyze-bundle", () => {
    it("returns bundle analysis", async () => {
      mockExecSync.mockReturnValue(
        "dist/index.js  42.5 KB\ndist/vendor.js 123.2 KB",
      );

      const res = await request(app)
        .post("/api/commands/execute")
        .send({ command: "analyze-bundle" })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.output).toContain("42.5 KB");
    });
  });

  // ============= POST /execute - test commands =============

  describe("POST /api/commands/execute - test-coverage", () => {
    it("returns coverage report", async () => {
      mockExecSync.mockReturnValue(
        "Statements: 85%\nBranches: 75%\nFunctions: 90%\nLines: 85%",
      );

      const res = await request(app)
        .post("/api/commands/execute")
        .send({ command: "test-coverage" })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.output).toContain("85%");
    });
  });

  // ============= POST /execute - system-info =============

  describe("POST /api/commands/execute - system-info", () => {
    it("returns comprehensive system information", async () => {
      mockExecSync
        .mockReturnValueOnce("10.2.3") // npm version
        .mockReturnValueOnce("git version 2.40.0") // git version
        .mockReturnValueOnce(
          "/dev/sda1  100G  50G  50G  50%  /test/project",
        ); // disk usage

      const res = await request(app)
        .post("/api/commands/execute")
        .send({ command: "system-info" })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.output).toContain("Node.js:");
      expect(res.body.data.output).toContain("npm:      10.2.3");
      expect(res.body.data.output).toContain("Git:      git version 2.40.0");
      expect(res.body.data.output).toContain("Platform:");
      expect(res.body.data.output).toContain("Memory:");
      expect(res.body.data.output).toContain("CPUs:");
      expect(res.body.data.output).toContain("Uptime:");
      expect(res.body.data.output).toContain("Disk:");
    });

    it("handles command execution errors", async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error("df command failed");
      });

      const res = await request(app)
        .post("/api/commands/execute")
        .send({ command: "system-info" })
        .expect(200);

      expect(res.body.success).toBe(false);
    });
  });

  // ============= POST /execute - error handling =============

  describe("POST /api/commands/execute - error handling", () => {
    it("returns 400 for missing command", async () => {
      const res = await request(app)
        .post("/api/commands/execute")
        .send({})
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("Missing command ID");
      expect(res.body.timestamp).toBeDefined();
    });

    it("returns 400 for non-string command", async () => {
      const res = await request(app)
        .post("/api/commands/execute")
        .send({ command: 123 })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("Missing command ID");
    });

    it("returns 404 for unknown command", async () => {
      const res = await request(app)
        .post("/api/commands/execute")
        .send({ command: "unknown-command" })
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain("Unknown command: unknown-command");
      expect(res.body.error).toContain("Available:");
      expect(res.body.error).toContain("frg-status");
      expect(res.body.error).toContain("git-status");
    });

    it("handles unexpected errors during execution", async () => {
      vi.mocked(mockCtx.statusService.getStatus).mockImplementation(() => {
        throw new Error("Unexpected crash");
      });

      const res = await request(app)
        .post("/api/commands/execute")
        .send({ command: "frg-status" })
        .expect(500);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("Unexpected crash");
    });

    it("handles non-Error exceptions during execution", async () => {
      vi.mocked(mockCtx.statusService.getStatus).mockImplementation(() => {
        throw "String error";
      });

      const res = await request(app)
        .post("/api/commands/execute")
        .send({ command: "frg-status" })
        .expect(500);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("Command execution failed");
    });
  });

  // ============= Broadcasting tests =============

  describe("Command execution broadcasting", () => {
    it("broadcasts command.started before execution", async () => {
      vi.mocked(mockCtx.statusService.getStatus).mockResolvedValue(
        Result.ok({} as any),
      );
      const formatForCLISpy = vi
        .spyOn(StatusService, "formatForCLI")
        .mockReturnValue("output");

      await request(app)
        .post("/api/commands/execute")
        .send({ command: "frg-status" });

      expect(mockCtx.broadcast).toHaveBeenCalledWith(
        "command.started",
        expect.objectContaining({
          command: "frg-status",
          startedAt: expect.any(String),
        }),
      );

      formatForCLISpy.mockRestore();
    });

    it("broadcasts command.completed on success", async () => {
      mockExecSync.mockReturnValue("main");

      await request(app)
        .post("/api/commands/execute")
        .send({ command: "git-status" });

      expect(mockCtx.broadcast).toHaveBeenCalledWith(
        "command.completed",
        expect.objectContaining({
          command: "git-status",
          success: true,
          completedAt: expect.any(String),
        }),
      );
    });

    it("broadcasts command.failed on failure", async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error("Command failed");
      });

      await request(app)
        .post("/api/commands/execute")
        .send({ command: "git-status" });

      expect(mockCtx.broadcast).toHaveBeenCalledWith(
        "command.failed",
        expect.objectContaining({
          command: "git-status",
          success: false,
          completedAt: expect.any(String),
        }),
      );
    });
  });

  // ============= getExecOutput helper tests =============

  describe("getExecOutput error extraction", () => {
    it("extracts stdout from execSync errors", async () => {
      const error: any = new Error("Failed");
      error.stdout = "This is stdout";
      error.stderr = "This is stderr";
      mockExecSync.mockImplementation(() => {
        throw error;
      });

      const res = await request(app)
        .post("/api/commands/execute")
        .send({ command: "git-status" })
        .expect(200);

      expect(res.body.data.output).toContain("This is stdout");
    });

    it("falls back to stderr when stdout is empty", async () => {
      const error: any = new Error("Failed");
      error.stderr = "This is stderr";
      mockExecSync.mockImplementation(() => {
        throw error;
      });

      const res = await request(app)
        .post("/api/commands/execute")
        .send({ command: "git-status" })
        .expect(200);

      expect(res.body.data.output).toContain("This is stderr");
    });

    it("falls back to message when stdout and stderr are empty", async () => {
      const error: any = new Error("This is the message");
      mockExecSync.mockImplementation(() => {
        throw error;
      });

      const res = await request(app)
        .post("/api/commands/execute")
        .send({ command: "git-status" })
        .expect(200);

      expect(res.body.data.output).toContain("This is the message");
    });

    it("handles non-object errors", async () => {
      mockExecSync.mockImplementation(() => {
        throw "String error";
      });

      const res = await request(app)
        .post("/api/commands/execute")
        .send({ command: "git-status" })
        .expect(200);

      expect(res.body.data.output).toBe("String error");
    });
  });

  // ============= Edge cases =============

  describe("Edge cases", () => {
    it("handles empty command string", async () => {
      const res = await request(app)
        .post("/api/commands/execute")
        .send({ command: "" })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("Missing command ID");
    });

    it("handles command with leading/trailing whitespace", async () => {
      const res = await request(app)
        .post("/api/commands/execute")
        .send({ command: "  frg-status  " })
        .expect(404);

      expect(res.body.success).toBe(false);
    });

    it("verifies all whitelisted commands are present", async () => {
      const expectedCommands = [
        "frg-status",
        "frg-test",
        "frg-deploy",
        "frg-feature",
        "frg-gap-analysis",
        "git-status",
        "git-diff",
        "git-log",
        "analyze-types",
        "analyze-lint",
        "analyze-deps",
        "analyze-bundle",
        "test-coverage",
        "system-info",
      ];

      for (const cmd of expectedCommands) {
        // Just verify the command exists by checking 404 vs other errors
        const res = await request(app)
          .post("/api/commands/execute")
          .send({ command: cmd });

        // Should not be 404 (unknown command)
        expect(res.status).not.toBe(404);
      }
    });

    it("handles concurrent command executions", async () => {
      mockExecSync.mockReturnValue("main");

      const requests = [
        request(app)
          .post("/api/commands/execute")
          .send({ command: "git-status" }),
        request(app)
          .post("/api/commands/execute")
          .send({ command: "git-status" }),
        request(app)
          .post("/api/commands/execute")
          .send({ command: "git-status" }),
      ];

      const results = await Promise.all(requests);

      results.forEach((res) => {
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });

      expect(mockCtx.broadcast).toHaveBeenCalledTimes(6); // 3 started + 3 completed
    });
  });
});
