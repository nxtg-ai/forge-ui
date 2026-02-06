/**
 * Bootstrap System Tests
 * Comprehensive unit tests for self-bootstrap infrastructure with 100% coverage goal
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { promises as fs } from "fs";
import * as path from "path";
import { BootstrapOrchestrator, BootstrapOptionsSchema, BootstrapResultSchema } from "../bootstrap";
import { StateManager } from "../state";

// Unmock fs for this test since we need real file system operations
vi.unmock("fs");
vi.unmock("node:fs");

// Mock external dependencies only
vi.mock("simple-git");
vi.mock("child_process");

describe("BootstrapOrchestrator", () => {
  let orchestrator: BootstrapOrchestrator;
  let mockStateManager: StateManager;
  let testProjectPath: string;

  beforeEach(async () => {
    testProjectPath = path.join(
      process.cwd(),
      ".test-bootstrap-" + Date.now() + "-" + Math.random().toString(36).slice(2),
    );

    // Mock StateManager
    mockStateManager = {
      initialize: vi.fn().mockResolvedValue(undefined),
    } as any;

    orchestrator = new BootstrapOrchestrator(mockStateManager);
  });

  afterEach(async () => {
    try {
      await fs.rm(testProjectPath, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
    vi.clearAllMocks();
  });

  describe("Schema Validation", () => {
    it("should validate valid BootstrapOptions", () => {
      const validOptions = {
        projectPath: "/test/path",
        githubUrl: "https://github.com/nxtg-ai/forge.git",
        shallow: true,
        branch: "main",
        force: false,
        skipDependencies: false,
        parallel: true,
      };

      const result = BootstrapOptionsSchema.safeParse(validOptions);
      expect(result.success).toBe(true);
    });

    it("should apply default values to BootstrapOptions", () => {
      const minimalOptions = {
        projectPath: "/test/path",
      };

      const result = BootstrapOptionsSchema.parse(minimalOptions);
      expect(result.githubUrl).toBe("https://github.com/nxtg-ai/forge.git");
      expect(result.shallow).toBe(true);
      expect(result.branch).toBe("main");
      expect(result.force).toBe(false);
      expect(result.skipDependencies).toBe(false);
      expect(result.parallel).toBe(true);
    });

    it("should reject invalid githubUrl", () => {
      const invalidOptions = {
        projectPath: "/test/path",
        githubUrl: "not-a-url",
      };

      const result = BootstrapOptionsSchema.safeParse(invalidOptions);
      expect(result.success).toBe(false);
    });

    it("should reject missing projectPath", () => {
      const invalidOptions = {
        githubUrl: "https://github.com/test/repo.git",
      };

      const result = BootstrapOptionsSchema.safeParse(invalidOptions);
      expect(result.success).toBe(false);
    });

    it("should validate BootstrapResult schema", () => {
      const validResult = {
        success: true,
        projectPath: "/test/path",
        installedComponents: ["component1", "component2"],
        duration: 1000,
        warnings: [],
        errors: [],
      };

      const result = BootstrapResultSchema.safeParse(validResult);
      expect(result.success).toBe(true);
    });

    it("should accept custom branch name", () => {
      const options = {
        projectPath: "/test/path",
        branch: "develop",
      };

      const result = BootstrapOptionsSchema.parse(options);
      expect(result.branch).toBe("develop");
    });

    it("should accept force flag", () => {
      const options = {
        projectPath: "/test/path",
        force: true,
      };

      const result = BootstrapOptionsSchema.parse(options);
      expect(result.force).toBe(true);
    });
  });

  describe("Constructor", () => {
    it("should initialize with StateManager", () => {
      expect(orchestrator).toBeInstanceOf(BootstrapOrchestrator);
    });

    it("should initialize empty completed steps", () => {
      expect(orchestrator["completedSteps"]).toEqual([]);
    });

    it("should initialize empty rollback stack", () => {
      expect(orchestrator["rollbackStack"]).toEqual([]);
    });
  });

  describe("createDirectoryStructure", () => {
    it("should create all required directories", async () => {
      await fs.mkdir(testProjectPath, { recursive: true });
      await orchestrator["createDirectoryStructure"](testProjectPath);

      // Check that directories were created
      const claudeDir = path.join(testProjectPath, ".claude/agents");
      const srcDir = path.join(testProjectPath, "src/core");
      const testDir = path.join(testProjectPath, "tests/unit");

      const claudeStat = await fs.stat(claudeDir);
      const srcStat = await fs.stat(srcDir);
      const testStat = await fs.stat(testDir);

      expect(claudeStat.isDirectory()).toBe(true);
      expect(srcStat.isDirectory()).toBe(true);
      expect(testStat.isDirectory()).toBe(true);
    });
  });

  describe("setupClaudeIntegration", () => {
    it("should create plugin.json", async () => {
      await fs.mkdir(testProjectPath, { recursive: true });
      await fs.mkdir(path.join(testProjectPath, ".claude"), { recursive: true });

      await orchestrator["setupClaudeIntegration"](testProjectPath);

      const pluginPath = path.join(testProjectPath, ".claude", "plugin.json");
      const content = await fs.readFile(pluginPath, "utf-8");
      const config = JSON.parse(content);

      expect(config.name).toBe("nxtg-forge");
      expect(config.version).toBe("3.0.0");
    });
  });

  describe("initializeConfiguration", () => {
    it("should create forge.config.json", async () => {
      await fs.mkdir(testProjectPath, { recursive: true });
      await fs.mkdir(path.join(testProjectPath, ".claude"), { recursive: true });

      await orchestrator["initializeConfiguration"](testProjectPath);

      const configPath = path.join(testProjectPath, ".claude", "forge.config.json");
      const content = await fs.readFile(configPath, "utf-8");
      const config = JSON.parse(content);

      expect(config.version).toBe("3.0.0");
      expect(config.settings.automationLevel).toBe(2);
      expect(config.settings.parallelExecution).toBe(true);
    });

    it("should include initialization timestamp", async () => {
      await fs.mkdir(testProjectPath, { recursive: true });
      await fs.mkdir(path.join(testProjectPath, ".claude"), { recursive: true });

      await orchestrator["initializeConfiguration"](testProjectPath);

      const configPath = path.join(testProjectPath, ".claude", "forge.config.json");
      const content = await fs.readFile(configPath, "utf-8");
      const config = JSON.parse(content);

      expect(config.initialized).toBeDefined();
      expect(new Date(config.initialized)).toBeInstanceOf(Date);
    });
  });

  describe("validateInstallation", () => {
    it("should fail when required files missing", async () => {
      await fs.mkdir(testProjectPath, { recursive: true });

      const result = await orchestrator["validateInstallation"](testProjectPath);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should pass validation when all required files exist", async () => {
      await fs.mkdir(testProjectPath, { recursive: true });
      await fs.mkdir(path.join(testProjectPath, ".claude"), { recursive: true });
      await fs.mkdir(path.join(testProjectPath, "src"), { recursive: true });
      await fs.mkdir(path.join(testProjectPath, "tests"), { recursive: true });

      // Create required files
      await fs.writeFile(path.join(testProjectPath, ".claude", "plugin.json"), "{}");
      await fs.writeFile(path.join(testProjectPath, ".claude", "forge.config.json"), "{}");
      await fs.writeFile(path.join(testProjectPath, "package.json"), "{}");

      const result = await orchestrator["validateInstallation"](testProjectPath);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe("detectCurrentState", () => {
    it("should detect non-existent directory", async () => {
      const nonExistentPath = path.join(testProjectPath, "nonexistent");

      const state = await orchestrator["detectCurrentState"](nonExistentPath);

      expect(state.exists).toBe(false);
      expect(state.hasGit).toBe(false);
      expect(state.hasNodeModules).toBe(false);
    });

    it("should detect existing directory", async () => {
      await fs.mkdir(testProjectPath, { recursive: true });

      const state = await orchestrator["detectCurrentState"](testProjectPath);

      expect(state.exists).toBe(true);
    });

    it("should detect .git directory", async () => {
      await fs.mkdir(testProjectPath, { recursive: true });
      await fs.mkdir(path.join(testProjectPath, ".git"), { recursive: true });

      const state = await orchestrator["detectCurrentState"](testProjectPath);

      expect(state.hasGit).toBe(true);
    });

    it("should detect node_modules", async () => {
      await fs.mkdir(testProjectPath, { recursive: true });
      await fs.mkdir(path.join(testProjectPath, "node_modules"), { recursive: true });

      const state = await orchestrator["detectCurrentState"](testProjectPath);

      expect(state.hasNodeModules).toBe(true);
    });

    it("should detect version from config", async () => {
      await fs.mkdir(testProjectPath, { recursive: true });
      await fs.mkdir(path.join(testProjectPath, ".claude"), { recursive: true });
      await fs.writeFile(
        path.join(testProjectPath, ".claude", "forge.config.json"),
        JSON.stringify({ version: "2.5.0" })
      );

      const state = await orchestrator["detectCurrentState"](testProjectPath);

      expect(state.version).toBe("2.5.0");
      expect(state.hasConfig).toBe(true);
    });
  });

  describe("rollback", () => {
    it("should execute rollback functions in reverse order", async () => {
      const executionOrder: number[] = [];

      orchestrator["rollbackStack"] = [
        async () => { executionOrder.push(1); },
        async () => { executionOrder.push(2); },
        async () => { executionOrder.push(3); },
      ];

      await orchestrator.rollback();

      expect(executionOrder).toEqual([3, 2, 1]);
    });

    it("should handle rollback errors gracefully", async () => {
      orchestrator["rollbackStack"] = [
        async () => { throw new Error("Rollback failed"); },
        async () => { /* Success */ },
      ];

      await expect(orchestrator.rollback()).resolves.not.toThrow();
    });

    it("should empty rollback stack", async () => {
      orchestrator["rollbackStack"] = [
        async () => {},
        async () => {},
      ];

      await orchestrator.rollback();

      expect(orchestrator["rollbackStack"]).toEqual([]);
    });
  });

  describe("createInstallationSteps", () => {
    it("should create clone step for fresh installation", () => {
      const options = {
        projectPath: testProjectPath,
      };
      const currentState = {
        exists: false,
        hasGit: false,
      };

      const steps = orchestrator["createInstallationSteps"](options, currentState);

      const cloneStep = steps.find(s => s.name === "Clone from GitHub");
      expect(cloneStep).toBeDefined();
      expect(cloneStep?.critical).toBe(true);
    });

    it("should skip clone step for existing git repo", () => {
      const options = {
        projectPath: testProjectPath,
      };
      const currentState = {
        exists: true,
        hasGit: true,
      };

      const steps = orchestrator["createInstallationSteps"](options, currentState);

      const cloneStep = steps.find(s => s.name === "Clone from GitHub");
      expect(cloneStep).toBeUndefined();
    });

    it("should skip dependencies when skipDependencies=true", () => {
      const options = {
        projectPath: testProjectPath,
        skipDependencies: true,
      };
      const currentState = { exists: true };

      const steps = orchestrator["createInstallationSteps"](options, currentState);

      const depStep = steps.find(s => s.name === "Install dependencies");
      expect(depStep).toBeUndefined();
    });

    it("should include dependencies when skipDependencies=false", () => {
      const options = {
        projectPath: testProjectPath,
        skipDependencies: false,
      };
      const currentState = { exists: true };

      const steps = orchestrator["createInstallationSteps"](options, currentState);

      const depStep = steps.find(s => s.name === "Install dependencies");
      expect(depStep).toBeDefined();
    });

    it("should always include configuration step", () => {
      const options = {
        projectPath: testProjectPath,
      };
      const currentState = { exists: true };

      const steps = orchestrator["createInstallationSteps"](options, currentState);

      const configStep = steps.find(s => s.name === "Initialize configuration");
      expect(configStep).toBeDefined();
      expect(configStep?.critical).toBe(true);
    });
  });

  describe("executeParallel", () => {
    it("should execute critical steps sequentially", async () => {
      const executionOrder: string[] = [];
      const steps = [
        {
          name: "Critical 1",
          critical: true,
          execute: async () => {
            executionOrder.push("critical-1");
          },
          rollback: async () => {},
        },
        {
          name: "Critical 2",
          critical: true,
          execute: async () => {
            executionOrder.push("critical-2");
          },
          rollback: async () => {},
        },
      ];

      const result = { warnings: [], errors: [] } as any;
      await orchestrator["executeParallel"](steps, result);

      expect(executionOrder).toEqual(["critical-1", "critical-2"]);
    });

    it("should execute non-critical steps in parallel", async () => {
      const steps = [
        {
          name: "Non-critical 1",
          critical: false,
          execute: vi.fn().mockResolvedValue(undefined),
          rollback: async () => {},
        },
        {
          name: "Non-critical 2",
          critical: false,
          execute: vi.fn().mockResolvedValue(undefined),
          rollback: async () => {},
        },
      ];

      const result = { warnings: [], errors: [] } as any;
      await orchestrator["executeParallel"](steps, result);

      expect(steps[0].execute).toHaveBeenCalled();
      expect(steps[1].execute).toHaveBeenCalled();
    });

    it("should add warnings for non-critical failures", async () => {
      const steps = [
        {
          name: "Failing step",
          critical: false,
          execute: async () => {
            throw new Error("Non-critical error");
          },
          rollback: async () => {},
        },
      ];

      const result = { warnings: [], errors: [] } as any;
      await orchestrator["executeParallel"](steps, result);

      expect(result.warnings).toContain("Non-critical step failed: Failing step");
    });

    it("should throw on critical step failure", async () => {
      const steps = [
        {
          name: "Critical step",
          critical: true,
          execute: async () => {
            throw new Error("Critical error");
          },
          rollback: async () => {},
        },
      ];

      const result = { warnings: [], errors: [] } as any;

      await expect(
        orchestrator["executeParallel"](steps, result)
      ).rejects.toThrow("Critical error");
    });
  });

  describe("executeSequential", () => {
    it("should execute steps in order", async () => {
      const executionOrder: number[] = [];
      const steps = [
        {
          name: "Step 1",
          critical: true,
          execute: async () => { executionOrder.push(1); },
          rollback: async () => {},
        },
        {
          name: "Step 2",
          critical: true,
          execute: async () => { executionOrder.push(2); },
          rollback: async () => {},
        },
        {
          name: "Step 3",
          critical: true,
          execute: async () => { executionOrder.push(3); },
          rollback: async () => {},
        },
      ];

      const result = { warnings: [], errors: [] } as any;
      await orchestrator["executeSequential"](steps, result);

      expect(executionOrder).toEqual([1, 2, 3]);
    });

    it("should stop on critical step failure", async () => {
      const executionOrder: number[] = [];
      const steps = [
        {
          name: "Step 1",
          critical: true,
          execute: async () => { executionOrder.push(1); },
          rollback: async () => {},
        },
        {
          name: "Failing step",
          critical: true,
          execute: async () => {
            throw new Error("Critical failure");
          },
          rollback: async () => {},
        },
        {
          name: "Step 3",
          critical: true,
          execute: async () => { executionOrder.push(3); },
          rollback: async () => {},
        },
      ];

      const result = { warnings: [], errors: [] } as any;

      await expect(
        orchestrator["executeSequential"](steps, result)
      ).rejects.toThrow("Critical failure");

      expect(executionOrder).toEqual([1]); // Only first step executed
    });

    it("should continue on non-critical step failure", async () => {
      const executionOrder: number[] = [];
      const steps = [
        {
          name: "Step 1",
          critical: false,
          execute: async () => { executionOrder.push(1); },
          rollback: async () => {},
        },
        {
          name: "Failing step",
          critical: false,
          execute: async () => {
            throw new Error("Non-critical failure");
          },
          rollback: async () => {},
        },
        {
          name: "Step 3",
          critical: false,
          execute: async () => { executionOrder.push(3); },
          rollback: async () => {},
        },
      ];

      const result = { warnings: [], errors: [] } as any;
      await orchestrator["executeSequential"](steps, result);

      expect(executionOrder).toEqual([1, 3]);
      expect(result.warnings.length).toBe(1);
    });
  });

  describe("API Compatibility", () => {
    it("should export BootstrapService alias", async () => {
      const { BootstrapService } = await import("../bootstrap");
      expect(BootstrapService).toBe(BootstrapOrchestrator);
    });
  });
});
