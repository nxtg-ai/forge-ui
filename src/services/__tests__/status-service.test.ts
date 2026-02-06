/**
 * Status Service Tests
 * Comprehensive tests for project status gathering
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { StatusService } from "../status-service";
import * as fs from "fs/promises";
import * as path from "path";
import { tmpdir } from "os";
import { simpleGit } from "simple-git";

// Mock simple-git
vi.mock("simple-git");

describe("StatusService", () => {
  let testDir: string;
  let service: StatusService;

  beforeEach(async () => {
    testDir = path.join(tmpdir(), `status-service-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
    service = new StatusService(testDir);

    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("getStatus", () => {
    it("should gather complete project status", async () => {
      // Setup minimal project structure
      await fs.writeFile(
        path.join(testDir, "package.json"),
        JSON.stringify({ name: "test-project", version: "1.0.0" }),
      );

      // Mock git
      const mockGit = {
        status: vi.fn().mockResolvedValue({
          current: "main",
          ahead: 0,
          behind: 0,
          staged: [],
          modified: [],
          not_added: [],
        }),
        branchLocal: vi.fn().mockResolvedValue({}),
      };
      vi.mocked(simpleGit).mockReturnValue(mockGit as any);

      const result = await service.getStatus();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const status = result.value;
        expect(status.project.name).toBe("test-project");
        expect(status.project.forgeVersion).toBe("1.0.0");
        expect(status.git.branch).toBe("main");
        expect(status.timestamp).toBeDefined();
      }
    });

    it("should include git status", async () => {
      const mockGit = {
        status: vi.fn().mockResolvedValue({
          current: "feature-branch",
          ahead: 2,
          behind: 1,
          staged: ["file1.ts"],
          modified: ["file2.ts", "file3.ts"],
          not_added: ["file4.ts"],
        }),
        branchLocal: vi.fn().mockResolvedValue({}),
      };
      vi.mocked(simpleGit).mockReturnValue(mockGit as any);

      await fs.writeFile(
        path.join(testDir, "package.json"),
        JSON.stringify({ name: "test" }),
      );

      const result = await service.getStatus();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.git).toEqual({
          branch: "feature-branch",
          ahead: 2,
          behind: 1,
          staged: 1,
          modified: 2,
          untracked: 1,
          hasUncommitted: true,
        });
      }
    });

    it("should handle non-git repositories", async () => {
      // Mock git to throw error
      const mockGit = {
        status: vi.fn().mockRejectedValue(new Error("Not a git repository")),
        branchLocal: vi.fn().mockRejectedValue(new Error("Not a git repository")),
      };
      vi.mocked(simpleGit).mockReturnValue(mockGit as any);

      await fs.writeFile(
        path.join(testDir, "package.json"),
        JSON.stringify({ name: "test" }),
      );

      const result = await service.getStatus();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.git.branch).toBe("unknown");
        expect(result.value.git.hasUncommitted).toBe(false);
      }
    });

    it("should read test coverage when available", async () => {
      await fs.writeFile(
        path.join(testDir, "package.json"),
        JSON.stringify({ name: "test" }),
      );

      // Create coverage directory and file
      const coverageDir = path.join(testDir, "coverage");
      await fs.mkdir(coverageDir, { recursive: true });
      await fs.writeFile(
        path.join(coverageDir, "coverage-summary.json"),
        JSON.stringify({
          total: {
            lines: { pct: 85.5 },
            statements: { pct: 88.2 },
            functions: { pct: 75.0 },
            branches: { pct: 60.5 },
          },
        }),
      );

      // Mock git
      vi.mocked(simpleGit).mockReturnValue({
        status: vi.fn().mockResolvedValue({
          current: "main",
          ahead: 0,
          behind: 0,
          staged: [],
          modified: [],
          not_added: [],
        }),
        branchLocal: vi.fn().mockResolvedValue({}),
      } as any);

      const result = await service.getStatus();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.tests).toEqual({
          lines: 86,
          statements: 88,
          functions: 75,
          branches: 61,
          passing: 0,
          total: 0,
        });
      }
    });

    it("should return zero coverage when file missing", async () => {
      await fs.writeFile(
        path.join(testDir, "package.json"),
        JSON.stringify({ name: "test" }),
      );

      vi.mocked(simpleGit).mockReturnValue({
        status: vi.fn().mockResolvedValue({
          current: "main",
          ahead: 0,
          behind: 0,
          staged: [],
          modified: [],
          not_added: [],
        }),
        branchLocal: vi.fn().mockResolvedValue({}),
      } as any);

      const result = await service.getStatus();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.tests.lines).toBe(0);
        expect(result.value.tests.statements).toBe(0);
      }
    });

    it("should check build status from dist directory", async () => {
      await fs.writeFile(
        path.join(testDir, "package.json"),
        JSON.stringify({ name: "test" }),
      );

      // Create dist directory
      await fs.mkdir(path.join(testDir, "dist"), { recursive: true });

      vi.mocked(simpleGit).mockReturnValue({
        status: vi.fn().mockResolvedValue({
          current: "main",
          ahead: 0,
          behind: 0,
          staged: [],
          modified: [],
          not_added: [],
        }),
        branchLocal: vi.fn().mockResolvedValue({}),
      } as any);

      const result = await service.getStatus();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.build.status).toBe("ok");
        expect(result.value.build.lastBuild).toBeDefined();
      }
    });

    it("should return unknown build status when no dist", async () => {
      await fs.writeFile(
        path.join(testDir, "package.json"),
        JSON.stringify({ name: "test" }),
      );

      vi.mocked(simpleGit).mockReturnValue({
        status: vi.fn().mockResolvedValue({
          current: "main",
          ahead: 0,
          behind: 0,
          staged: [],
          modified: [],
          not_added: [],
        }),
        branchLocal: vi.fn().mockResolvedValue({}),
      } as any);

      const result = await service.getStatus();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.build.status).toBe("unknown");
      }
    });

    it("should read governance health", async () => {
      await fs.writeFile(
        path.join(testDir, "package.json"),
        JSON.stringify({ name: "test" }),
      );

      // Create governance structure
      const claudeDir = path.join(testDir, ".claude");
      await fs.mkdir(claudeDir, { recursive: true });
      await fs.writeFile(
        path.join(claudeDir, "governance.json"),
        JSON.stringify({
          constitution: {
            status: "ACTIVE",
            confidence: 85,
          },
          workstreams: [
            {
              status: "active",
              tasks: [
                { status: "completed" },
                { status: "in_progress" },
              ],
            },
            {
              status: "blocked",
              tasks: [{ status: "pending" }],
            },
          ],
        }),
      );

      vi.mocked(simpleGit).mockReturnValue({
        status: vi.fn().mockResolvedValue({
          current: "main",
          ahead: 0,
          behind: 0,
          staged: [],
          modified: [],
          not_added: [],
        }),
        branchLocal: vi.fn().mockResolvedValue({}),
      } as any);

      const result = await service.getStatus();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.governance.status).toBe("active");
        expect(result.value.governance.confidence).toBe(85);
        expect(result.value.governance.workstreamsActive).toBe(1);
        expect(result.value.governance.workstreamsBlocked).toBe(1);
        expect(result.value.governance.tasksCompleted).toBe(1);
        expect(result.value.governance.tasksPending).toBe(2);
      }
    });

    it("should handle missing governance file", async () => {
      await fs.writeFile(
        path.join(testDir, "package.json"),
        JSON.stringify({ name: "test" }),
      );

      vi.mocked(simpleGit).mockReturnValue({
        status: vi.fn().mockResolvedValue({
          current: "main",
          ahead: 0,
          behind: 0,
          staged: [],
          modified: [],
          not_added: [],
        }),
        branchLocal: vi.fn().mockResolvedValue({}),
      } as any);

      const result = await service.getStatus();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.governance.status).toBe("unknown");
        expect(result.value.governance.confidence).toBe(0);
      }
    });

    it("should count available agents", async () => {
      await fs.writeFile(
        path.join(testDir, "package.json"),
        JSON.stringify({ name: "test" }),
      );

      // Create agents directory with agent files
      const agentsDir = path.join(testDir, ".claude/agents");
      await fs.mkdir(agentsDir, { recursive: true });
      await fs.writeFile(path.join(agentsDir, "builder.md"), "# Builder");
      await fs.writeFile(path.join(agentsDir, "planner.md"), "# Planner");
      await fs.writeFile(path.join(agentsDir, "orchestrator.md"), "# Orchestrator");
      await fs.writeFile(path.join(agentsDir, "qa.md"), "# QA");
      await fs.writeFile(path.join(agentsDir, "README.txt"), "Not an agent");

      vi.mocked(simpleGit).mockReturnValue({
        status: vi.fn().mockResolvedValue({
          current: "main",
          ahead: 0,
          behind: 0,
          staged: [],
          modified: [],
          not_added: [],
        }),
        branchLocal: vi.fn().mockResolvedValue({}),
      } as any);

      const result = await service.getStatus();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.agents.total).toBe(4);
        expect(result.value.agents.categories.core).toBe(3); // builder, planner, orchestrator
        expect(result.value.agents.categories.specialized).toBe(1); // qa
        expect(result.value.agents.available).toContain("builder");
        expect(result.value.agents.available).toContain("qa");
      }
    });

    it("should handle missing agents directory", async () => {
      await fs.writeFile(
        path.join(testDir, "package.json"),
        JSON.stringify({ name: "test" }),
      );

      vi.mocked(simpleGit).mockReturnValue({
        status: vi.fn().mockResolvedValue({
          current: "main",
          ahead: 0,
          behind: 0,
          staged: [],
          modified: [],
          not_added: [],
        }),
        branchLocal: vi.fn().mockResolvedValue({}),
      } as any);

      const result = await service.getStatus();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.agents.total).toBe(0);
        expect(result.value.agents.available).toEqual([]);
      }
    });

    it("should handle missing package.json", async () => {
      vi.mocked(simpleGit).mockReturnValue({
        status: vi.fn().mockResolvedValue({
          current: "main",
          ahead: 0,
          behind: 0,
          staged: [],
          modified: [],
          not_added: [],
        }),
        branchLocal: vi.fn().mockResolvedValue({}),
      } as any);

      const result = await service.getStatus();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.project.name).toBe("unknown");
        expect(result.value.project.forgeVersion).toBe("0.0.0");
      }
    });
  });

  describe("formatForCLI", () => {
    it("should format status for CLI output", () => {
      const status = {
        project: {
          name: "my-project",
          path: "/path/to/project",
          forgeVersion: "1.2.3",
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
          statements: 88,
          functions: 75,
          branches: 60,
          passing: 42,
          total: 50,
        },
        build: {
          status: "ok" as const,
        },
        governance: {
          status: "active" as const,
          confidence: 90,
          workstreamsActive: 3,
          workstreamsBlocked: 0,
          tasksPending: 5,
          tasksCompleted: 15,
        },
        agents: {
          total: 8,
          available: ["builder", "planner"],
          categories: {
            core: 4,
            specialized: 4,
          },
        },
        timestamp: new Date().toISOString(),
      };

      const formatted = StatusService.formatForCLI(status);

      expect(formatted).toContain("NXTG-Forge Status");
      expect(formatted).toContain("Project: my-project");
      expect(formatted).toContain("Branch: main");
      expect(formatted).toContain("Tests: 42 passing (85% coverage)");
      expect(formatted).toContain("Build: OK");
      expect(formatted).toContain("Governance: ACTIVE");
      expect(formatted).toContain("Agents: 8 available");
    });

    it("should show uncommitted changes", () => {
      const status = {
        project: {
          name: "test",
          path: "/test",
          forgeVersion: "1.0.0",
        },
        git: {
          branch: "feature",
          ahead: 1,
          behind: 0,
          staged: 2,
          modified: 3,
          untracked: 1,
          hasUncommitted: true,
        },
        tests: {
          lines: 0,
          statements: 0,
          functions: 0,
          branches: 0,
          passing: 0,
          total: 0,
        },
        build: {
          status: "unknown" as const,
        },
        governance: {
          status: "unknown" as const,
          confidence: 0,
          workstreamsActive: 0,
          workstreamsBlocked: 0,
          tasksPending: 0,
          tasksCompleted: 0,
        },
        agents: {
          total: 0,
          available: [],
          categories: { core: 0, specialized: 0 },
        },
        timestamp: new Date().toISOString(),
      };

      const formatted = StatusService.formatForCLI(status);

      expect(formatted).toContain("Uncommitted changes:");
      expect(formatted).toContain("Staged: 2");
      expect(formatted).toContain("Modified: 3");
      expect(formatted).toContain("Untracked: 1");
    });

    it("should handle no coverage data", () => {
      const status = {
        project: {
          name: "test",
          path: "/test",
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
          lines: 0,
          statements: 0,
          functions: 0,
          branches: 0,
          passing: 0,
          total: 0,
        },
        build: {
          status: "ok" as const,
        },
        governance: {
          status: "active" as const,
          confidence: 100,
          workstreamsActive: 0,
          workstreamsBlocked: 0,
          tasksPending: 0,
          tasksCompleted: 0,
        },
        agents: {
          total: 5,
          available: [],
          categories: { core: 3, specialized: 2 },
        },
        timestamp: new Date().toISOString(),
      };

      const formatted = StatusService.formatForCLI(status);

      expect(formatted).toContain("Tests: No coverage data");
    });

    it("should not show uncommitted section when clean", () => {
      const status = {
        project: {
          name: "test",
          path: "/test",
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
          lines: 0,
          statements: 0,
          functions: 0,
          branches: 0,
          passing: 0,
          total: 0,
        },
        build: {
          status: "ok" as const,
        },
        governance: {
          status: "active" as const,
          confidence: 100,
          workstreamsActive: 0,
          workstreamsBlocked: 0,
          tasksPending: 0,
          tasksCompleted: 0,
        },
        agents: {
          total: 0,
          available: [],
          categories: { core: 0, specialized: 0 },
        },
        timestamp: new Date().toISOString(),
      };

      const formatted = StatusService.formatForCLI(status);

      expect(formatted).not.toContain("Uncommitted changes:");
    });
  });
});
