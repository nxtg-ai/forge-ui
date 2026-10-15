/**
 * Initialization Service
 * Handles NXTG-Forge project initialization and setup
 */

import { BaseService } from "./base-service";
import { Result, IntegrationError, ValidationError } from "../utils/result";
import * as fs from "fs/promises";
import * as path from "path";
import {
  type ProjectType,
  type ExistingSetup,
  type ProjectDetection,
  type InitOptions,
  type InitResult,
  type GovernanceConstitution,
  InitOptionsSchema,
  AGENT_TEMPLATES,
  generateConfig,
  generateCompleteClaude,
  generateForgeSection,
  detectProjectType as detectProjectTypeUtil,
  checkExistingSetup as checkExistingSetupUtil,
} from "./init";

// Re-export types for backward compatibility
export type {
  ProjectType,
  ExistingSetup,
  ProjectDetection,
  InitOptions,
  InitResult,
};

/**
 * Initialization Service
 * Handles project setup, detection, and scaffolding
 */
export class InitService extends BaseService {
  private projectRoot: string;

  constructor(projectRoot: string) {
    super({ name: "init-service" });
    this.projectRoot = projectRoot;
  }

  protected async performInitialization(): Promise<void> {
    // Verify project root exists
    try {
      await fs.access(this.projectRoot);
    } catch {
      throw new IntegrationError(
        "Project root does not exist",
        "INVALID_PROJECT_ROOT",
      );
    }
  }

  protected async performDisposal(): Promise<void> {
    // No cleanup needed
  }

  /**
   * Detect project type based on files present
   */
  async detectProjectType(): Promise<
    Result<ProjectDetection, IntegrationError>
  > {
    return detectProjectTypeUtil(this.projectRoot);
  }

  /**
   * Check for existing NXTG-Forge setup
   */
  async checkExistingSetup(): Promise<Result<ExistingSetup, IntegrationError>> {
    return checkExistingSetupUtil(this.projectRoot);
  }

  /**
   * Scaffold the NXTG-Forge harness structure
   */
  async scaffoldHarness(
    projectType: ProjectType,
  ): Promise<Result<string[], IntegrationError>> {
    try {
      const createdPaths: string[] = [];

      // Create directory structure
      const directories = [
        ".claude/forge",
        ".claude/forge/agents",
        ".claude/forge/memory",
        ".claude/forge/memory/sessions",
        ".claude/forge/memory/context",
        ".claude/plans",
        ".claude/skills",
      ];

      for (const dir of directories) {
        const fullPath = path.join(this.projectRoot, dir);
        await fs.mkdir(fullPath, { recursive: true });
        createdPaths.push(dir);
      }

      // Create config.yml
      const configPath = path.join(
        this.projectRoot,
        ".claude/forge/config.yml",
      );
      const config = generateConfig(projectType);
      await fs.writeFile(configPath, config, "utf-8");
      createdPaths.push(".claude/forge/config.yml");

      // Create starter agent templates
      await this.createStarterAgentTemplates();
      createdPaths.push(".claude/forge/agents/starter-general.md");

      return Result.ok(createdPaths);
    } catch (error) {
      return Result.err(
        new IntegrationError(
          `Failed to scaffold harness: ${error instanceof Error ? error.message : String(error)}`,
          "SCAFFOLD_ERROR",
        ),
      );
    }
  }

  /**
   * Copy starter agents based on project type
   */
  async copyStarterAgents(
    projectType: ProjectType,
  ): Promise<Result<string[], IntegrationError>> {
    try {
      const copiedAgents: string[] = [];
      // Source: template agents in forge harness
      const sourceAgentsDir = path.join(
        this.projectRoot,
        ".claude/forge/agents",
      );
      // Target: project's active agents directory (where Claude Code looks)
      const targetAgentsDir = path.join(this.projectRoot, ".claude/agents");

      // Ensure target directory exists
      await fs.mkdir(targetAgentsDir, { recursive: true });

      // Determine which agents to copy based on project type
      const agentsToCopy = ["starter-general.md"];

      switch (projectType) {
        case "react":
          agentsToCopy.push("starter-react.md");
          break;
        case "node":
          agentsToCopy.push("starter-node.md");
          break;
        case "python":
          agentsToCopy.push("starter-python.md");
          break;
        case "fullstack":
          agentsToCopy.push("starter-fullstack.md", "starter-react.md");
          break;
      }

      // Copy each agent from forge templates to project agents
      for (const agentFile of agentsToCopy) {
        const sourcePath = path.join(sourceAgentsDir, agentFile);
        const targetPath = path.join(targetAgentsDir, agentFile);
        try {
          await fs.access(sourcePath);
          await fs.copyFile(sourcePath, targetPath);
          copiedAgents.push(agentFile.replace(".md", ""));
        } catch {
          // Agent file doesn't exist in source, skip
        }
      }

      return Result.ok(copiedAgents);
    } catch (error) {
      return Result.err(
        new IntegrationError(
          `Failed to copy starter agents: ${error instanceof Error ? error.message : String(error)}`,
          "AGENT_COPY_ERROR",
        ),
      );
    }
  }

  /**
   * Initialize governance.json
   */
  async initializeGovernance(
    directive: string,
    goals?: string[],
  ): Promise<Result<void, IntegrationError>> {
    try {
      const governancePath = path.join(
        this.projectRoot,
        ".claude/governance.json",
      );

      const constitution: GovernanceConstitution = {
        directive,
        vision: goals || [],
        status: "ACTIVE",
        confidence: 100,
        updatedBy: "/frg-init wizard",
        updatedAt: new Date().toISOString(),
      };

      const governance = {
        version: 1,
        timestamp: new Date().toISOString(),
        constitution,
        workstreams: [],
        sentinelLog: [
          {
            id: "log-1",
            timestamp: Date.now(),
            type: "INFO",
            severity: "low",
            category: "initialization",
            source: "init-service",
            message: "NXTG-Forge initialized successfully",
            context: {
              directive,
              goals,
            },
            actionRequired: false,
          },
        ],
        metadata: {
          sessionId: `init-${Date.now()}`,
          projectPath: this.projectRoot,
          forgeVersion: "3.0.0",
          lastSync: new Date().toISOString(),
        },
      };

      await fs.writeFile(
        governancePath,
        JSON.stringify(governance, null, 2),
        "utf-8",
      );

      return Result.ok(undefined);
    } catch (error) {
      return Result.err(
        new IntegrationError(
          `Failed to initialize governance: ${error instanceof Error ? error.message : String(error)}`,
          "GOVERNANCE_INIT_ERROR",
        ),
      );
    }
  }

  /**
   * Write the Forge section of CLAUDE.md.
   *
   * CLAUDE.md is read by coding agents as instructions, so this never puts
   * request text in it (the directive stays in .claude/governance.json) and
   * never replaces an existing file unless forceOverwrite is set:
   * - "skip" (the default) writes nothing.
   * - "generate" creates the file, and refuses with CLAUDE_MD_EXISTS if one is
   *   already there. The refusal is the exclusive-create flag on the write
   *   itself, so it holds even if an earlier existence check failed.
   * - "merge" appends the Forge section to the file on disk, or creates the
   *   file if there is none. Existing text is kept.
   * In every mode, a CLAUDE.md that is not a regular file (a symlink, a
   * folder) is refused with CLAUDE_MD_NOT_A_FILE, and the writes open with
   * O_NOFOLLOW where the platform has it. A cloned repo can ship CLAUDE.md as
   * a symlink to a file outside the project, such as a shell rc file.
   * PRM-CLX9-20261015-06 item (a).
   */
  async generateClaudeMd(
    projectType: ProjectType,
    option: "generate" | "merge" | "skip" = "skip",
    { forceOverwrite = false }: { forceOverwrite?: boolean } = {},
  ): Promise<Result<void, IntegrationError>> {
    if (option === "skip") {
      return Result.ok(undefined);
    }

    const claudeMdPath = path.join(this.projectRoot, "CLAUDE.md");
    try {
      const kind = await entryKind(claudeMdPath);
      if (kind === "other") {
        return Result.err(claudeMdNotAFileError());
      }

      if (option === "merge" && kind === "file") {
        const existing = await fs.readFile(claudeMdPath, {
          encoding: "utf-8",
          flag: openFlags().read,
        });
        const separator = existing.endsWith("\n\n") ? "" : "\n\n";
        await fs.appendFile(
          claudeMdPath,
          separator + "---\n\n" + generateForgeSection(projectType),
          {
            encoding: "utf-8",
            flag: openFlags().append,
          },
        );
        return Result.ok(undefined);
      }

      await fs.writeFile(claudeMdPath, generateCompleteClaude(projectType), {
        encoding: "utf-8",
        flag: forceOverwrite ? openFlags().truncate : openFlags().create,
      });
      return Result.ok(undefined);
    } catch (error) {
      if (isErrnoCode(error, "EEXIST")) {
        return Result.err(claudeMdExistsError());
      }
      if (isErrnoCode(error, "ELOOP")) {
        return Result.err(claudeMdNotAFileError());
      }
      return Result.err(
        new IntegrationError(
          `Failed to generate CLAUDE.md: ${error instanceof Error ? error.message : String(error)}`,
          "CLAUDE_MD_ERROR",
        ),
      );
    }
  }

  /**
   * Full initialization workflow
   */
  async initializeProject(
    options: InitOptions,
  ): Promise<Result<InitResult, IntegrationError | ValidationError>> {
    // Validate options
    const validationResult = this.validate(options, InitOptionsSchema);
    if (validationResult.isErr()) {
      return Result.err(validationResult.error);
    }

    const validOptions = validationResult.unwrap();

    try {
      const created: string[] = [];
      let projectType = validOptions.projectType;

      // Step 1: Detect project type if not provided
      if (!projectType) {
        const detectionResult = await this.detectProjectType();
        if (detectionResult.isErr()) {
          return Result.err(detectionResult.error);
        }
        projectType = detectionResult.unwrap().projectType;
      }

      // Refuse before writing anything if CLAUDE.md would be replaced, so a
      // refused init leaves the project as it was.
      const claudeMdOption = validOptions.claudeMdOption ?? "skip";
      const forceOverwrite = validOptions.forceOverwrite === true;
      if (claudeMdOption !== "skip") {
        const kind = await entryKind(path.join(this.projectRoot, "CLAUDE.md"));
        if (kind === "other") {
          return Result.err(claudeMdNotAFileError());
        }
        if (claudeMdOption === "generate" && !forceOverwrite && kind === "file") {
          return Result.err(claudeMdExistsError());
        }
      }

      // Step 2: Scaffold harness
      const scaffoldResult = await this.scaffoldHarness(projectType);
      if (scaffoldResult.isErr()) {
        return Result.err(scaffoldResult.error);
      }
      created.push(...scaffoldResult.unwrap());

      // Step 3: Copy starter agents
      const agentsResult = await this.copyStarterAgents(projectType);
      if (agentsResult.isErr()) {
        return Result.err(agentsResult.error);
      }
      const agentsCopied = agentsResult.unwrap();

      // Step 4: Initialize governance
      const governanceResult = await this.initializeGovernance(
        validOptions.directive,
        validOptions.goals,
      );
      if (governanceResult.isErr()) {
        return Result.err(governanceResult.error);
      }
      created.push(".claude/governance.json");

      // Step 5: Write CLAUDE.md (skipped unless the caller asked for it)
      const claudeMdResult = await this.generateClaudeMd(
        projectType,
        claudeMdOption,
        { forceOverwrite },
      );
      if (claudeMdResult.isErr()) {
        return Result.err(claudeMdResult.error);
      }
      if (claudeMdOption !== "skip") {
        created.push("CLAUDE.md");
      }

      return Result.ok({
        success: true,
        created,
        projectType,
        agentsCopied,
        message: "NXTG-Forge initialized successfully",
      });
    } catch (error) {
      return Result.err(
        new IntegrationError(
          `Initialization failed: ${error instanceof Error ? error.message : String(error)}`,
          "INIT_ERROR",
        ),
      );
    }
  }

  /**
   * Create starter agent template files
   */
  private async createStarterAgentTemplates(): Promise<void> {
    const agentsDir = path.join(this.projectRoot, ".claude/forge/agents");

    // Write all agent templates
    await fs.writeFile(
      path.join(agentsDir, "starter-general.md"),
      AGENT_TEMPLATES.general,
      "utf-8",
    );

    await fs.writeFile(
      path.join(agentsDir, "starter-react.md"),
      AGENT_TEMPLATES.react,
      "utf-8",
    );

    await fs.writeFile(
      path.join(agentsDir, "starter-node.md"),
      AGENT_TEMPLATES.node,
      "utf-8",
    );

    await fs.writeFile(
      path.join(agentsDir, "starter-python.md"),
      AGENT_TEMPLATES.python,
      "utf-8",
    );

    await fs.writeFile(
      path.join(agentsDir, "starter-fullstack.md"),
      AGENT_TEMPLATES.fullstack,
      "utf-8",
    );
  }
}

/**
 * open() flags for the CLAUDE.md writes. O_NOFOLLOW is 0 where the platform
 * has none (Windows); the lstat check still runs there.
 */
function openFlags(): { read: number; append: number; create: number; truncate: number } {
  const c = fs.constants;
  const noFollow = c.O_NOFOLLOW ?? 0;
  return {
    read: c.O_RDONLY | noFollow,
    append: c.O_WRONLY | c.O_APPEND | noFollow,
    create: c.O_WRONLY | c.O_CREAT | c.O_EXCL | noFollow,
    truncate: c.O_WRONLY | c.O_CREAT | c.O_TRUNC | noFollow,
  };
}

function claudeMdExistsError(): IntegrationError {
  return new IntegrationError(
    "CLAUDE.md already exists. Use claudeMdOption \"merge\" to append the Forge section, or set forceOverwrite to replace the file.",
    "CLAUDE_MD_EXISTS",
  );
}

function claudeMdNotAFileError(): IntegrationError {
  return new IntegrationError(
    "CLAUDE.md is not a regular file (it is a symlink, a folder or similar). forge-ui writes only to a regular CLAUDE.md in the project folder.",
    "CLAUDE_MD_NOT_A_FILE",
  );
}

function isErrnoCode(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as NodeJS.ErrnoException).code === code
  );
}

/**
 * What is at the path, without following a symlink: nothing, a regular file,
 * or anything else (symlink, folder, device).
 */
async function entryKind(filePath: string): Promise<"none" | "file" | "other"> {
  try {
    const stat = await fs.lstat(filePath);
    return stat.isFile() ? "file" : "other";
  } catch (error) {
    if (isErrnoCode(error, "ENOENT")) {
      return "none";
    }
    throw error;
  }
}
