/**
 * Tests for InitService
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { InitService } from "../init-service";
import * as fs from "fs/promises";
import * as path from "path";
import { tmpdir } from "os";

describe("InitService", () => {
  let testDir: string;
  let initService: InitService;

  beforeEach(async () => {
    // Create temporary test directory
    testDir = path.join(tmpdir(), `init-service-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
    initService = new InitService(testDir);
  });

  afterEach(async () => {
    // Cleanup test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore errors
    }
  });

  describe("detectProjectType", () => {
    it("should detect React project from package.json", async () => {
      const packageJson = {
        name: "test-project",
        dependencies: {
          react: "^19.0.0",
        },
      };

      await fs.writeFile(
        path.join(testDir, "package.json"),
        JSON.stringify(packageJson),
      );

      const result = await initService.detectProjectType();

      expect(result.isOk()).toBe(true);
      const detection = result.unwrap();
      expect(detection.projectType).toBe("react");
      expect(detection.hasPackageJson).toBe(true);
      expect(detection.detectedFrameworks).toContain("react");
    });

    it("should detect Python project from requirements.txt", async () => {
      await fs.writeFile(
        path.join(testDir, "requirements.txt"),
        "fastapi==0.109.0\nuvicorn==0.27.0",
      );

      const result = await initService.detectProjectType();

      expect(result.isOk()).toBe(true);
      const detection = result.unwrap();
      expect(detection.projectType).toBe("python");
      expect(detection.hasRequirementsTxt).toBe(true);
      expect(detection.detectedFrameworks).toContain("python");
    });

    it("should detect fullstack project with both frontend and backend", async () => {
      const packageJson = {
        name: "test-project",
        dependencies: {
          react: "^19.0.0",
          express: "^4.18.0",
        },
      };

      await fs.writeFile(
        path.join(testDir, "package.json"),
        JSON.stringify(packageJson),
      );

      const result = await initService.detectProjectType();

      expect(result.isOk()).toBe(true);
      const detection = result.unwrap();
      expect(detection.projectType).toBe("fullstack");
    });

    it("should return unknown for empty directory", async () => {
      const result = await initService.detectProjectType();

      expect(result.isOk()).toBe(true);
      const detection = result.unwrap();
      expect(detection.projectType).toBe("unknown");
    });
  });

  describe("checkExistingSetup", () => {
    it("should report no existing setup in empty directory", async () => {
      const result = await initService.checkExistingSetup();

      expect(result.isOk()).toBe(true);
      const setup = result.unwrap();
      expect(setup.hasForge).toBe(false);
      expect(setup.hasClaudeMd).toBe(false);
      expect(setup.hasGovernance).toBe(false);
      expect(setup.hasAgents).toBe(false);
      expect(setup.agentCount).toBe(0);
    });

    it("should detect existing .claude/forge directory", async () => {
      await fs.mkdir(path.join(testDir, ".claude/forge"), {
        recursive: true,
      });

      const result = await initService.checkExistingSetup();

      expect(result.isOk()).toBe(true);
      const setup = result.unwrap();
      expect(setup.hasForge).toBe(true);
    });

    it("should detect existing CLAUDE.md", async () => {
      const claudeMdContent = "# My Project\n\nProject documentation.";
      await fs.writeFile(path.join(testDir, "CLAUDE.md"), claudeMdContent);

      const result = await initService.checkExistingSetup();

      expect(result.isOk()).toBe(true);
      const setup = result.unwrap();
      expect(setup.hasClaudeMd).toBe(true);
      expect(setup.claudeMdContent).toBe(claudeMdContent);
    });

    it("should count starter agents", async () => {
      const agentsDir = path.join(testDir, ".claude/forge/agents");
      await fs.mkdir(agentsDir, { recursive: true });
      await fs.writeFile(path.join(agentsDir, "starter-react.md"), "# React");
      await fs.writeFile(
        path.join(agentsDir, "starter-general.md"),
        "# General",
      );
      await fs.writeFile(path.join(agentsDir, "custom-agent.md"), "# Custom");

      const result = await initService.checkExistingSetup();

      expect(result.isOk()).toBe(true);
      const setup = result.unwrap();
      expect(setup.hasAgents).toBe(true);
      expect(setup.agentCount).toBe(2); // Only counts starter-* files
    });
  });

  describe("scaffoldHarness", () => {
    it("should create forge directory structure", async () => {
      const result = await initService.scaffoldHarness("react");

      expect(result.isOk()).toBe(true);
      const created = result.unwrap();

      // Verify directories exist
      expect(
        await fs
          .access(path.join(testDir, ".claude/forge"))
          .then(() => true)
          .catch(() => false),
      ).toBe(true);
      expect(
        await fs
          .access(path.join(testDir, ".claude/forge/agents"))
          .then(() => true)
          .catch(() => false),
      ).toBe(true);
      expect(
        await fs
          .access(path.join(testDir, ".claude/forge/memory"))
          .then(() => true)
          .catch(() => false),
      ).toBe(true);
      expect(
        await fs
          .access(path.join(testDir, ".claude/plans"))
          .then(() => true)
          .catch(() => false),
      ).toBe(true);

      // Verify config.yml was created
      expect(created).toContain(".claude/forge/config.yml");
      const configContent = await fs.readFile(
        path.join(testDir, ".claude/forge/config.yml"),
        "utf-8",
      );
      expect(configContent).toContain("type: react");
    });
  });

  describe("initializeGovernance", () => {
    it("should create governance.json with directive and goals", async () => {
      const directive = "Build an amazing app";
      const goals = ["Ship MVP", "Get to 90% test coverage"];

      await fs.mkdir(path.join(testDir, ".claude"), { recursive: true });
      const result = await initService.initializeGovernance(directive, goals);

      expect(result.isOk()).toBe(true);

      const governancePath = path.join(testDir, ".claude/governance.json");
      const governance = JSON.parse(
        await fs.readFile(governancePath, "utf-8"),
      );

      expect(governance.constitution.directive).toBe(directive);
      expect(governance.constitution.vision).toEqual(goals);
      expect(governance.constitution.status).toBe("ACTIVE");
      expect(governance.workstreams).toEqual([]);
    });
  });

  describe("generateClaudeMd", () => {
    it("should generate new CLAUDE.md", async () => {
      const vision = "Build a React dashboard";
      const result = await initService.generateClaudeMd(
        vision,
        "react",
        "generate",
      );

      expect(result.isOk()).toBe(true);

      const claudeMd = await fs.readFile(
        path.join(testDir, "CLAUDE.md"),
        "utf-8",
      );
      expect(claudeMd).toContain(vision);
      expect(claudeMd).toContain("react");
      expect(claudeMd).toContain("NXTG-Forge Integration");
    });

    it("should merge with existing CLAUDE.md", async () => {
      const existingContent = "# My Project\n\nExisting documentation.";
      const vision = "Build a React dashboard";

      const result = await initService.generateClaudeMd(
        vision,
        "react",
        "merge",
        existingContent,
      );

      expect(result.isOk()).toBe(true);

      const claudeMd = await fs.readFile(
        path.join(testDir, "CLAUDE.md"),
        "utf-8",
      );
      expect(claudeMd).toContain("Existing documentation");
      expect(claudeMd).toContain("NXTG-Forge Integration");
      expect(claudeMd).toContain(vision);
    });

    it("should skip CLAUDE.md when option is skip", async () => {
      const result = await initService.generateClaudeMd(
        "Test",
        "react",
        "skip",
      );

      expect(result.isOk()).toBe(true);

      const exists = await fs
        .access(path.join(testDir, "CLAUDE.md"))
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(false);
    });
  });

  describe("initialize", () => {
    it("should perform full initialization workflow", async () => {
      const options = {
        directive: "Build an amazing React application",
        goals: ["Ship MVP in 2 weeks", "Maintain 90% test coverage"],
        projectType: "react" as const,
        claudeMdOption: "generate" as const,
      };

      const result = await initService.initialize(options);

      expect(result.isOk()).toBe(true);
      const initResult = result.unwrap();

      expect(initResult.success).toBe(true);
      expect(initResult.projectType).toBe("react");
      expect(initResult.created).toContain(".claude/governance.json");
      expect(initResult.created).toContain("CLAUDE.md");
      expect(initResult.agentsCopied.length).toBeGreaterThan(0);

      // Verify key files exist
      expect(
        await fs
          .access(path.join(testDir, ".claude/governance.json"))
          .then(() => true)
          .catch(() => false),
      ).toBe(true);
      expect(
        await fs
          .access(path.join(testDir, "CLAUDE.md"))
          .then(() => true)
          .catch(() => false),
      ).toBe(true);
      expect(
        await fs
          .access(path.join(testDir, ".claude/forge/config.yml"))
          .then(() => true)
          .catch(() => false),
      ).toBe(true);
    });

    it("should auto-detect project type when not provided", async () => {
      // Create a React project
      const packageJson = {
        name: "test-project",
        dependencies: { react: "^19.0.0" },
      };
      await fs.writeFile(
        path.join(testDir, "package.json"),
        JSON.stringify(packageJson),
      );

      const options = {
        directive: "Build an amazing application",
        claudeMdOption: "generate" as const,
      };

      const result = await initService.initialize(options);

      expect(result.isOk()).toBe(true);
      const initResult = result.unwrap();
      expect(initResult.projectType).toBe("react");
    });

    it("should reject invalid directive", async () => {
      const options = {
        directive: "Bad", // Too short (< 5 chars)
        claudeMdOption: "generate" as const,
      };

      const result = await initService.initialize(options);

      expect(result.isErr()).toBe(true);
    });
  });
});
