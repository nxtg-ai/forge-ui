/**
 * Initialization Service
 * Handles NXTG-Forge project initialization and setup
 */

import { BaseService } from "./base-service";
import { Result, IntegrationError, ValidationError } from "../utils/result";
import * as fs from "fs/promises";
import * as path from "path";
import { z } from "zod";

/**
 * Supported project types
 */
export type ProjectType =
  | "react"
  | "node"
  | "python"
  | "rust"
  | "go"
  | "fullstack"
  | "unknown";

/**
 * Existing setup status
 */
export interface ExistingSetup {
  hasForge: boolean;
  hasClaudeMd: boolean;
  claudeMdContent: string;
  hasGovernance: boolean;
  hasAgents: boolean;
  agentCount: number;
}

/**
 * Project detection result
 */
export interface ProjectDetection {
  projectType: ProjectType;
  hasPackageJson: boolean;
  hasRequirementsTxt: boolean;
  hasCargoToml: boolean;
  hasGoMod: boolean;
  hasTsConfig: boolean;
  hasViteConfig: boolean;
  detectedFrameworks: string[];
}

/**
 * Initialization options
 */
export interface InitOptions {
  directive: string;
  goals?: string[];
  projectType?: ProjectType;
  claudeMdOption?: "generate" | "merge" | "skip";
  forceOverwrite?: boolean;
}

/**
 * Initialization result
 */
export interface InitResult {
  success: boolean;
  created: string[];
  projectType: ProjectType;
  agentsCopied: string[];
  message: string;
}

/**
 * Governance constitution structure
 */
interface GovernanceConstitution {
  directive: string;
  vision: string[];
  status: string;
  confidence: number;
  updatedBy: string;
  updatedAt: string;
}

/**
 * Validation schemas
 */
const InitOptionsSchema = z.object({
  directive: z.string().min(5, "Directive must be at least 5 characters"),
  goals: z.array(z.string()).optional(),
  projectType: z
    .enum(["react", "node", "python", "rust", "go", "fullstack", "unknown"])
    .optional(),
  claudeMdOption: z.enum(["generate", "merge", "skip"]).optional(),
  forceOverwrite: z.boolean().optional(),
});

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
    try {
      const files = await fs.readdir(this.projectRoot);
      const fileSet = new Set(files);

      const hasPackageJson = fileSet.has("package.json");
      const hasRequirementsTxt = fileSet.has("requirements.txt");
      const hasCargoToml = fileSet.has("Cargo.toml");
      const hasGoMod = fileSet.has("go.mod");
      const hasTsConfig = fileSet.has("tsconfig.json");
      const hasViteConfig =
        fileSet.has("vite.config.ts") || fileSet.has("vite.config.js");

      const detectedFrameworks: string[] = [];
      let projectType: ProjectType = "unknown";

      // Detect based on files
      if (hasPackageJson) {
        try {
          const packageJsonPath = path.join(this.projectRoot, "package.json");
          const packageJson = JSON.parse(
            await fs.readFile(packageJsonPath, "utf-8"),
          );
          const deps = {
            ...packageJson.dependencies,
            ...packageJson.devDependencies,
          };

          if (deps.react) {
            detectedFrameworks.push("react");
            projectType = "react";
          }
          if (deps.vue) {
            detectedFrameworks.push("vue");
          }
          if (deps.express || deps.fastify || deps.koa) {
            detectedFrameworks.push("node-backend");
            if (projectType === "react") {
              projectType = "fullstack";
            } else {
              projectType = "node";
            }
          }
          if (deps.vite) {
            detectedFrameworks.push("vite");
          }
          if (deps.next) {
            detectedFrameworks.push("nextjs");
            projectType = "fullstack";
          }
        } catch {
          // If package.json can't be parsed, just continue
        }
      }

      if (hasRequirementsTxt || fileSet.has("pyproject.toml")) {
        detectedFrameworks.push("python");
        projectType = "python";
      }

      if (hasCargoToml) {
        detectedFrameworks.push("rust");
        projectType = "rust";
      }

      if (hasGoMod) {
        detectedFrameworks.push("go");
        projectType = "go";
      }

      return Result.ok({
        projectType,
        hasPackageJson,
        hasRequirementsTxt,
        hasCargoToml,
        hasGoMod,
        hasTsConfig,
        hasViteConfig,
        detectedFrameworks,
      });
    } catch (error) {
      return Result.err(
        new IntegrationError(
          `Failed to detect project type: ${error instanceof Error ? error.message : String(error)}`,
          "DETECTION_ERROR",
        ),
      );
    }
  }

  /**
   * Check for existing NXTG-Forge setup
   */
  async checkExistingSetup(): Promise<Result<ExistingSetup, IntegrationError>> {
    try {
      const claudePath = path.join(this.projectRoot, ".claude");
      const forgePath = path.join(claudePath, "forge");
      const claudeMdPath = path.join(this.projectRoot, "CLAUDE.md");
      const governancePath = path.join(claudePath, "governance.json");
      const agentsPath = path.join(forgePath, "agents");

      let hasForge = false;
      let hasClaudeMd = false;
      let hasGovernance = false;
      let hasAgents = false;
      let agentCount = 0;
      let claudeMdContent = "";

      try {
        await fs.access(forgePath);
        hasForge = true;
      } catch {
        // Doesn't exist
      }

      try {
        claudeMdContent = await fs.readFile(claudeMdPath, "utf-8");
        hasClaudeMd = true;
      } catch {
        // Doesn't exist
      }

      try {
        await fs.access(governancePath);
        hasGovernance = true;
      } catch {
        // Doesn't exist
      }

      try {
        const agentFiles = await fs.readdir(agentsPath);
        const starterAgents = agentFiles.filter((f) =>
          f.startsWith("starter-"),
        );
        hasAgents = starterAgents.length > 0;
        agentCount = starterAgents.length;
      } catch {
        // Doesn't exist
      }

      return Result.ok({
        hasForge,
        hasClaudeMd,
        claudeMdContent,
        hasGovernance,
        hasAgents,
        agentCount,
      });
    } catch (error) {
      return Result.err(
        new IntegrationError(
          `Failed to check existing setup: ${error instanceof Error ? error.message : String(error)}`,
          "SETUP_CHECK_ERROR",
        ),
      );
    }
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
      const config = this.generateConfig(projectType);
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
   * Generate or merge CLAUDE.md
   */
  async generateClaudeMd(
    vision: string,
    projectType: ProjectType,
    option: "generate" | "merge" | "skip" = "generate",
    existingContent?: string,
  ): Promise<Result<void, IntegrationError>> {
    if (option === "skip") {
      return Result.ok(undefined);
    }

    try {
      const claudeMdPath = path.join(this.projectRoot, "CLAUDE.md");
      let content = "";

      if (option === "merge" && existingContent) {
        // Merge forge section at bottom
        content = existingContent;
        if (!content.endsWith("\n\n")) {
          content += "\n\n";
        }
        content += "---\n\n";
        content += this.generateForgeSection(vision, projectType);
      } else {
        // Generate new CLAUDE.md
        content = this.generateCompleteClaude(vision, projectType);
      }

      await fs.writeFile(claudeMdPath, content, "utf-8");
      return Result.ok(undefined);
    } catch (error) {
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

      // Step 5: Generate CLAUDE.md
      const existingSetup = await this.checkExistingSetup();
      const claudeMdOption = validOptions.claudeMdOption || "generate";
      const existingContent = existingSetup.isOk()
        ? existingSetup.unwrap().claudeMdContent
        : "";

      const claudeMdResult = await this.generateClaudeMd(
        validOptions.directive,
        projectType,
        claudeMdOption,
        existingContent,
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
   * Generate config.yml content
   */
  private generateConfig(projectType: ProjectType): string {
    return `# NXTG-Forge Configuration
# Generated by /frg-init wizard

project:
  type: ${projectType}
  initialized: ${new Date().toISOString()}

agents:
  enabled: true
  auto_assign: true

memory:
  enabled: true
  retention_days: 90

quality:
  min_coverage: 85
  strict_types: true
  linting: strict
`;
  }

  /**
   * Create starter agent template files
   */
  private async createStarterAgentTemplates(): Promise<void> {
    const agentsDir = path.join(this.projectRoot, ".claude/forge/agents");

    // Create starter-general.md (universal agent for all project types)
    const generalAgent = `---
name: starter-general
description: Universal development assistant for any project type
tools: ["Glob", "Grep", "Read", "Write", "Edit", "Bash"]
---

# Starter Agent - General Purpose

You are a helpful development assistant. Follow project conventions and maintain code quality.

## Capabilities
- Code review and suggestions
- Bug fixing and debugging
- Documentation writing
- Test creation
- General development tasks

## Guidelines
- Read existing code before making changes
- Follow the project's coding style
- Write tests for new functionality
- Keep changes focused and minimal
`;

    await fs.writeFile(path.join(agentsDir, "starter-general.md"), generalAgent, "utf-8");

    // Create starter-react.md
    const reactAgent = `---
name: starter-react
description: React 19 specialist with hooks and modern patterns
tools: ["Glob", "Grep", "Read", "Write", "Edit", "Bash"]
---

# Starter Agent - React

You are a React specialist. Use modern React 19 patterns with hooks and functional components.

## Capabilities
- React component development
- State management with hooks
- Performance optimization
- Testing with Vitest/React Testing Library

## Guidelines
- Prefer functional components with hooks
- Use TypeScript for type safety
- Follow React best practices
- Write accessible components
`;

    await fs.writeFile(path.join(agentsDir, "starter-react.md"), reactAgent, "utf-8");

    // Create starter-node.md
    const nodeAgent = `---
name: starter-node
description: Node.js/Express backend specialist
tools: ["Glob", "Grep", "Read", "Write", "Edit", "Bash"]
---

# Starter Agent - Node.js

You are a Node.js backend specialist. Build scalable, secure APIs.

## Capabilities
- REST API development
- Database integration
- Authentication/Authorization
- Testing with Jest/Vitest

## Guidelines
- Use async/await patterns
- Implement proper error handling
- Follow security best practices
- Write comprehensive tests
`;

    await fs.writeFile(path.join(agentsDir, "starter-node.md"), nodeAgent, "utf-8");

    // Create starter-python.md
    const pythonAgent = `---
name: starter-python
description: Python/FastAPI backend specialist
tools: ["Glob", "Grep", "Read", "Write", "Edit", "Bash"]
---

# Starter Agent - Python

You are a Python specialist. Build clean, well-tested applications.

## Capabilities
- FastAPI/Flask development
- Database integration with SQLAlchemy
- Type hints and validation
- Testing with pytest

## Guidelines
- Use type hints throughout
- Follow PEP 8 style guidelines
- Write comprehensive tests
- Use virtual environments
`;

    await fs.writeFile(path.join(agentsDir, "starter-python.md"), pythonAgent, "utf-8");

    // Create starter-fullstack.md
    const fullstackAgent = `---
name: starter-fullstack
description: Full-stack development combining frontend and backend
tools: ["Glob", "Grep", "Read", "Write", "Edit", "Bash"]
---

# Starter Agent - Full Stack

You are a full-stack specialist. Bridge frontend and backend seamlessly.

## Capabilities
- End-to-end feature development
- API design and integration
- Database modeling
- Testing across the stack

## Guidelines
- Maintain consistency between frontend/backend
- Design clean API contracts
- Write integration tests
- Consider security at all layers
`;

    await fs.writeFile(path.join(agentsDir, "starter-fullstack.md"), fullstackAgent, "utf-8");
  }

  /**
   * Generate complete CLAUDE.md
   */
  private generateCompleteClaude(
    vision: string,
    projectType: ProjectType,
  ): string {
    return `# Project Knowledge Base

## Vision

${vision}

## Project Type

${projectType}

## Development Guidelines

### Code Quality
- Maintain 85%+ test coverage
- Use strict TypeScript/type checking
- Follow SOLID principles
- Write self-documenting code

### Testing
- Write tests before implementation (TDD)
- Cover happy path, edge cases, and errors
- Use meaningful test descriptions

### Documentation
- Document public APIs and interfaces
- Keep README up to date
- Use JSDoc/docstrings for complex logic

---

${this.generateForgeSection(vision, projectType)}
`;
  }

  /**
   * Generate NXTG-Forge section for CLAUDE.md
   */
  private generateForgeSection(
    vision: string,
    projectType: ProjectType,
  ): string {
    return `## NXTG-Forge Integration

This project is enhanced with NXTG-Forge - an AI-orchestrated development system.

### What is NXTG-Forge?

NXTG-Forge is your AI Chief of Staff that:
- Plans and tracks feature development
- Maintains code quality and architecture
- Provides intelligent recommendations
- Automates repetitive tasks
- Ensures project governance

### Project Vision

${vision}

### Available Commands

- \`/frg-status\` - View project status and health
- \`/frg-feature "name"\` - Plan and implement a new feature
- \`/frg-test\` - Run comprehensive test suite
- \`/frg-deploy\` - Deploy application
- \`/frg-checkpoint\` - Create project checkpoint
- \`/frg-report\` - Generate session report

### Project Configuration

- **Type**: ${projectType}
- **Forge Version**: 3.0.0
- **Initialized**: ${new Date().toISOString()}

### Directory Structure

\`\`\`
.claude/
  forge/
    config.yml          # Forge configuration
    agents/             # Starter agents for this project type
    memory/             # Session and context memory
  governance.json       # Project governance and tracking
  plans/                # Feature plans and designs
  skills/               # Project-specific knowledge
\`\`\`

### Next Steps

1. Run \`/frg-status\` to see current project state
2. Use \`/frg-feature "feature name"\` to plan your first feature
3. Let NXTG-Forge guide you through implementation

---

*Generated by NXTG-Forge v3.0.0*
`;
  }
}
