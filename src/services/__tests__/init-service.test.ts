/**
 * Tests for InitService
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { InitService } from "../init-service";
import * as fs from "fs/promises";
import * as path from "path";
import { tmpdir } from "os";
import { Result, IntegrationError } from "../../utils/result";
import { generateForgeSection, generateCompleteClaude } from "../init";

// `fs/promises` is NOT touched by the global `vi.mock("fs", ...)` in
// src/test/setup.ts (that mock only intercepts the "fs" specifier), so
// init-service.ts's real fs/promises calls already run against the real
// filesystem in this file's existing tests. Here we additionally wrap
// `mkdir`/`writeFile` with vi.fn(actual) so individual tests can force a
// single call to fail (mockRejectedValueOnce) while every other call falls
// through to the real implementation — this is how we reach the catch
// branches that real filesystem behavior can't reliably trigger on demand
// (e.g. forcing a non-Error rejection).
vi.mock("fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("fs/promises")>();
  return {
    ...actual,
    mkdir: vi.fn(actual.mkdir),
    writeFile: vi.fn(actual.writeFile),
  };
});

describe("InitService", () => {
  let testDir: string;
  let initService: InitService;

  beforeEach(async () => {
    // Create temporary test directory
    testDir = await fs.mkdtemp(path.join(tmpdir(), "init-service-test-"));
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

      const result = await initService.initializeProject(options);

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

      const result = await initService.initializeProject(options);

      expect(result.isOk()).toBe(true);
      const initResult = result.unwrap();
      expect(initResult.projectType).toBe("react");
    });

    it("should reject invalid directive", async () => {
      const options = {
        directive: "Bad", // Too short (< 5 chars)
        claudeMdOption: "generate" as const,
      };

      const result = await initService.initializeProject(options);

      expect(result.isErr()).toBe(true);
    });
  });

  describe("copyStarterAgents - project type switch branches", () => {
    beforeEach(async () => {
      // scaffoldHarness writes all 5 starter templates regardless of the
      // project type argument, so it's the fixture for every switch case.
      const scaffold = await initService.scaffoldHarness("react");
      expect(scaffold.isOk()).toBe(true);
    });

    it("copies only the general agent for a project type with no dedicated template", async () => {
      const result = await initService.copyStarterAgents("unknown");

      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toEqual(["starter-general"]);
    });

    it("copies the node agent alongside general for node projects", async () => {
      const result = await initService.copyStarterAgents("node");

      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toEqual(["starter-general", "starter-node"]);
    });

    it("copies the python agent alongside general for python projects", async () => {
      const result = await initService.copyStarterAgents("python");

      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toEqual(["starter-general", "starter-python"]);
    });

    it("copies fullstack and react agents alongside general for fullstack projects", async () => {
      const result = await initService.copyStarterAgents("fullstack");

      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toEqual([
        "starter-general",
        "starter-fullstack",
        "starter-react",
      ]);
    });
  });

  describe("scaffoldHarness - failure paths", () => {
    it("returns a SCAFFOLD_ERROR with the Error message when directory creation throws an Error", async () => {
      vi.mocked(fs.mkdir).mockRejectedValueOnce(
        new Error("EACCES: permission denied"),
      );

      const result = await initService.scaffoldHarness("react");

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("SCAFFOLD_ERROR");
        expect(result.error.message).toBe(
          "Failed to scaffold harness: EACCES: permission denied",
        );
      }
    });

    it("returns a SCAFFOLD_ERROR with a stringified message when directory creation throws a non-Error value", async () => {
      vi.mocked(fs.mkdir).mockRejectedValueOnce("disk-full");

      const result = await initService.scaffoldHarness("react");

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe(
          "Failed to scaffold harness: disk-full",
        );
      }
    });
  });

  describe("copyStarterAgents - failure paths", () => {
    it("returns an AGENT_COPY_ERROR with the Error message when the target directory cannot be created", async () => {
      vi.mocked(fs.mkdir).mockRejectedValueOnce(
        new Error("ENOSPC: no space left on device"),
      );

      const result = await initService.copyStarterAgents("react");

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("AGENT_COPY_ERROR");
        expect(result.error.message).toBe(
          "Failed to copy starter agents: ENOSPC: no space left on device",
        );
      }
    });

    it("returns an AGENT_COPY_ERROR with a stringified message when the target directory creation throws a non-Error value", async () => {
      vi.mocked(fs.mkdir).mockRejectedValueOnce("locked");

      const result = await initService.copyStarterAgents("react");

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe(
          "Failed to copy starter agents: locked",
        );
      }
    });
  });

  describe("initializeGovernance - failure paths", () => {
    it("returns a GOVERNANCE_INIT_ERROR with the Error message when governance.json cannot be written", async () => {
      await fs.mkdir(path.join(testDir, ".claude"), { recursive: true });
      vi.mocked(fs.writeFile).mockRejectedValueOnce(new Error("EROFS: read-only file system"));

      const result = await initService.initializeGovernance("Directive", [
        "Goal",
      ]);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("GOVERNANCE_INIT_ERROR");
        expect(result.error.message).toBe(
          "Failed to initialize governance: EROFS: read-only file system",
        );
      }
    });

    it("returns a GOVERNANCE_INIT_ERROR with a stringified message when the write throws a non-Error value", async () => {
      await fs.mkdir(path.join(testDir, ".claude"), { recursive: true });
      vi.mocked(fs.writeFile).mockRejectedValueOnce("quota-exceeded");

      const result = await initService.initializeGovernance("Directive");

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe(
          "Failed to initialize governance: quota-exceeded",
        );
      }
    });
  });

  describe("generateClaudeMd - additional branches", () => {
    it("does not insert an extra blank line when the existing content already ends with two newlines", async () => {
      const existingContent = "# My Project\n\nAlready spaced.\n\n";
      const vision = "Build a dashboard";

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
      // No extra blank line was appended before the "---" separator: exactly
      // the existing content, unchanged, immediately followed by the divider.
      // The "Initialized" timestamp is stripped before comparing since it's
      // generated independently by the assertion's own call.
      const stripTimestamp = (s: string) =>
        s.replace(/\*\*Initialized\*\*: [^\n]+/, "**Initialized**: <ts>");
      expect(stripTimestamp(claudeMd)).toBe(
        stripTimestamp(
          existingContent + "---\n\n" + generateForgeSection(vision, "react"),
        ),
      );
    });

    it("returns a CLAUDE_MD_ERROR with the Error message when CLAUDE.md cannot be written", async () => {
      vi.mocked(fs.writeFile).mockRejectedValueOnce(
        new Error("EACCES: permission denied"),
      );

      const result = await initService.generateClaudeMd(
        "Vision",
        "react",
        "generate",
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("CLAUDE_MD_ERROR");
        expect(result.error.message).toBe(
          "Failed to generate CLAUDE.md: EACCES: permission denied",
        );
      }
    });

    it("returns a CLAUDE_MD_ERROR with a stringified message when the write throws a non-Error value", async () => {
      vi.mocked(fs.writeFile).mockRejectedValueOnce("write-failed");

      const result = await initService.generateClaudeMd(
        "Vision",
        "react",
        "generate",
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe(
          "Failed to generate CLAUDE.md: write-failed",
        );
      }
    });
  });

  describe("initializeProject - step-failure propagation", () => {
    it("propagates a DETECTION_ERROR and never reaches scaffolding when auto-detection fails", async () => {
      const missingRoot = path.join(testDir, "does-not-exist");
      const serviceOnMissingRoot = new InitService(missingRoot);

      const result = await serviceOnMissingRoot.initializeProject({
        directive: "Build something great",
        claudeMdOption: "generate",
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("DETECTION_ERROR");
        expect(result.error.message).toContain(
          "Failed to detect project type:",
        );
        expect(result.error.message).toContain("ENOENT");
      }
    });

    it("propagates the scaffold error and stops before copying agents", async () => {
      // A plain FILE at ".claude" blocks scaffoldHarness's
      // `mkdir(".claude/forge", { recursive: true })`.
      await fs.writeFile(path.join(testDir, ".claude"), "blocker");

      const result = await initService.initializeProject({
        directive: "Build something great",
        projectType: "react",
        claudeMdOption: "generate",
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("SCAFFOLD_ERROR");
        expect(result.error.message).toContain(
          "Failed to scaffold harness:",
        );
        expect(result.error.message).toContain("ENOTDIR");
      }

      // Nothing from the agent-copy step ran.
      const agentsDirExists = await fs
        .access(path.join(testDir, ".claude/agents"))
        .then(() => true)
        .catch(() => false);
      expect(agentsDirExists).toBe(false);
    });

    it("propagates the agent-copy error and stops before initializing governance", async () => {
      // scaffoldHarness only touches ".claude/forge/**", so ".claude" itself
      // can stay a real directory while a FILE at ".claude/agents" blocks
      // copyStarterAgents's own `mkdir(".claude/agents", { recursive: true })`.
      await fs.mkdir(path.join(testDir, ".claude"), { recursive: true });
      await fs.writeFile(path.join(testDir, ".claude/agents"), "blocker");

      const result = await initService.initializeProject({
        directive: "Build something great",
        projectType: "react",
        claudeMdOption: "generate",
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("AGENT_COPY_ERROR");
        expect(result.error.message).toContain(
          "Failed to copy starter agents:",
        );
      }

      // Scaffolding itself DID complete (config.yml was written) before the
      // agent-copy step failed.
      const configExists = await fs
        .access(path.join(testDir, ".claude/forge/config.yml"))
        .then(() => true)
        .catch(() => false);
      expect(configExists).toBe(true);

      // Governance never ran.
      const governanceExists = await fs
        .access(path.join(testDir, ".claude/governance.json"))
        .then(() => true)
        .catch(() => false);
      expect(governanceExists).toBe(false);
    });

    it("propagates the governance error and stops before generating CLAUDE.md", async () => {
      // A DIRECTORY at the exact governance.json path makes the write fail
      // with EISDIR, after scaffold + agent-copy have already succeeded.
      await fs.mkdir(path.join(testDir, ".claude/governance.json"), {
        recursive: true,
      });

      const result = await initService.initializeProject({
        directive: "Build something great",
        projectType: "react",
        claudeMdOption: "generate",
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("GOVERNANCE_INIT_ERROR");
        expect(result.error.message).toContain(
          "Failed to initialize governance:",
        );
        expect(result.error.message).toContain("EISDIR");
      }

      // CLAUDE.md generation never ran.
      const claudeMdExists = await fs
        .access(path.join(testDir, "CLAUDE.md"))
        .then(() => true)
        .catch(() => false);
      expect(claudeMdExists).toBe(false);
    });

    it("propagates the CLAUDE.md error after scaffold, agent-copy and governance all succeed", async () => {
      // A DIRECTORY at the exact CLAUDE.md path makes the final write fail
      // with EISDIR.
      await fs.mkdir(path.join(testDir, "CLAUDE.md"), { recursive: true });

      const result = await initService.initializeProject({
        directive: "Build something great",
        projectType: "react",
        claudeMdOption: "generate",
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("CLAUDE_MD_ERROR");
        expect(result.error.message).toContain(
          "Failed to generate CLAUDE.md:",
        );
        expect(result.error.message).toContain("EISDIR");
      }

      // Governance DID complete before the CLAUDE.md step failed.
      const governance = JSON.parse(
        await fs.readFile(
          path.join(testDir, ".claude/governance.json"),
          "utf-8",
        ),
      );
      expect(governance.constitution.directive).toBe(
        "Build something great",
      );
    });

    it("defaults claudeMdOption to 'generate' when the caller omits it", async () => {
      const result = await initService.initializeProject({
        directive: "Build something great",
        projectType: "react",
        // claudeMdOption intentionally omitted
      });

      expect(result.isOk()).toBe(true);
      expect(result.unwrap().created).toContain("CLAUDE.md");

      const claudeMd = await fs.readFile(
        path.join(testDir, "CLAUDE.md"),
        "utf-8",
      );
      expect(claudeMd).toContain("# Project Knowledge Base");
    });

    it("falls back to empty existing content when checkExistingSetup itself fails", async () => {
      vi.spyOn(initService, "checkExistingSetup").mockResolvedValueOnce(
        Result.err(
          new IntegrationError("boom", "SETUP_CHECK_ERROR"),
        ),
      );

      const result = await initService.initializeProject({
        directive: "Build something great",
        projectType: "react",
        claudeMdOption: "merge",
      });

      expect(result.isOk()).toBe(true);

      const claudeMd = await fs.readFile(
        path.join(testDir, "CLAUDE.md"),
        "utf-8",
      );
      // With existingSetup.isErr(), existingContent falls back to "". Since
      // `option === "merge" && existingContent` is then false (empty string
      // is falsy), generateClaudeMd takes its non-merge branch and emits the
      // full fresh template — proving the fallback empty string actually
      // flowed through rather than initializeProject throwing or hanging.
      // The "Initialized" timestamp is stripped before comparing since it's
      // generated independently by the assertion's own call.
      const stripTimestamp = (s: string) =>
        s.replace(/\*\*Initialized\*\*: [^\n]+/, "**Initialized**: <ts>");
      expect(stripTimestamp(claudeMd)).toBe(
        stripTimestamp(
          generateCompleteClaude("Build something great", "react"),
        ),
      );
    });

    it("skips CLAUDE.md creation entirely when claudeMdOption is 'skip'", async () => {
      const result = await initService.initializeProject({
        directive: "Build something great",
        projectType: "react",
        claudeMdOption: "skip",
      });

      expect(result.isOk()).toBe(true);
      const initResult = result.unwrap();
      expect(initResult.created).not.toContain("CLAUDE.md");

      const claudeMdExists = await fs
        .access(path.join(testDir, "CLAUDE.md"))
        .then(() => true)
        .catch(() => false);
      expect(claudeMdExists).toBe(false);
    });

    it("reports an unexpected Error thrown mid-workflow as an INIT_ERROR carrying its message", async () => {
      vi.spyOn(initService, "detectProjectType").mockRejectedValueOnce(
        new Error("unexpected failure"),
      );

      const result = await initService.initializeProject({
        directive: "Build something great",
        // projectType omitted so detectProjectType is actually invoked
        claudeMdOption: "generate",
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("INIT_ERROR");
        expect(result.error.message).toBe(
          "Initialization failed: unexpected failure",
        );
      }
    });

    it("reports an unexpected non-Error throw mid-workflow as an INIT_ERROR with a stringified message", async () => {
      vi.spyOn(initService, "detectProjectType").mockRejectedValueOnce(
        "raw-string-throw",
      );

      const result = await initService.initializeProject({
        directive: "Build something great",
        claudeMdOption: "generate",
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe(
          "Initialization failed: raw-string-throw",
        );
      }
    });
  });
});
