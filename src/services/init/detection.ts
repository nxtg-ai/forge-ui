/**
 * Init Service Detection
 * Project type detection and existing setup checking
 */

import * as fs from "fs/promises";
import * as path from "path";
import { Result, IntegrationError } from "../../utils/result";
import type { ProjectType, ProjectDetection, ExistingSetup } from "./types";

/**
 * Detect project type based on files present
 */
export async function detectProjectType(
  projectRoot: string,
): Promise<Result<ProjectDetection, IntegrationError>> {
  try {
    const files = await fs.readdir(projectRoot);
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
        const packageJsonPath = path.join(projectRoot, "package.json");
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
export async function checkExistingSetup(
  projectRoot: string,
): Promise<Result<ExistingSetup, IntegrationError>> {
  try {
    const claudePath = path.join(projectRoot, ".claude");
    const forgePath = path.join(claudePath, "forge");
    const claudeMdPath = path.join(projectRoot, "CLAUDE.md");
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
