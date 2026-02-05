/**
 * Forge Status Service
 * Gathers comprehensive project state for /frg-status command
 */

import { simpleGit } from "simple-git";
import * as fs from "fs/promises";
import * as path from "path";
import { Result } from "../utils/result";
import type { GovernanceState } from "../types/governance.types";

export interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  staged: number;
  modified: number;
  untracked: number;
  hasUncommitted: boolean;
}

export interface TestCoverage {
  lines: number;
  statements: number;
  functions: number;
  branches: number;
  passing: number;
  total: number;
}

export interface BuildStatus {
  status: "ok" | "error" | "unknown";
  lastBuild?: string;
  errors?: string[];
}

export interface GovernanceHealth {
  status: "active" | "blocked" | "pending" | "unknown";
  confidence: number;
  workstreamsActive: number;
  workstreamsBlocked: number;
  tasksPending: number;
  tasksCompleted: number;
}

export interface AgentAvailability {
  total: number;
  available: string[];
  categories: {
    core: number;
    specialized: number;
  };
}

export interface ForgeStatus {
  project: {
    name: string;
    path: string;
    forgeVersion: string;
  };
  git: GitStatus;
  tests: TestCoverage;
  build: BuildStatus;
  governance: GovernanceHealth;
  agents: AgentAvailability;
  timestamp: string;
}

export class StatusService {
  constructor(private projectRoot: string) {}

  /**
   * Gather complete project status
   */
  async getStatus(): Promise<Result<ForgeStatus, Error>> {
    try {
      const [git, tests, build, governance, agents] = await Promise.all([
        this.getGitStatus(),
        this.getTestCoverage(),
        this.getBuildStatus(),
        this.getGovernanceHealth(),
        this.getAgentAvailability(),
      ]);

      const projectName = await this.getProjectName();
      const forgeVersion = await this.getForgeVersion();

      const status: ForgeStatus = {
        project: {
          name: projectName,
          path: this.projectRoot,
          forgeVersion,
        },
        git,
        tests,
        build,
        governance,
        agents,
        timestamp: new Date().toISOString(),
      };

      return Result.ok(status);
    } catch (error) {
      return Result.err(
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  /**
   * Get git repository status
   */
  private async getGitStatus(): Promise<GitStatus> {
    try {
      const git = simpleGit(this.projectRoot);
      const status = await git.status();
      const branch = await git.branchLocal();

      return {
        branch: status.current || "unknown",
        ahead: status.ahead,
        behind: status.behind,
        staged: status.staged.length,
        modified: status.modified.length,
        untracked: status.not_added.length,
        hasUncommitted:
          status.modified.length > 0 ||
          status.staged.length > 0 ||
          status.not_added.length > 0,
      };
    } catch (error) {
      // Not a git repository or git not available
      return {
        branch: "unknown",
        ahead: 0,
        behind: 0,
        staged: 0,
        modified: 0,
        untracked: 0,
        hasUncommitted: false,
      };
    }
  }

  /**
   * Get test coverage from vitest
   */
  private async getTestCoverage(): Promise<TestCoverage> {
    try {
      // Try to read coverage from coverage-final.json
      const coveragePath = path.join(
        this.projectRoot,
        "coverage",
        "coverage-summary.json",
      );

      try {
        const coverageData = await fs.readFile(coveragePath, "utf-8");
        const coverage = JSON.parse(coverageData);
        const total = coverage.total;

        return {
          lines: Math.round(total.lines.pct || 0),
          statements: Math.round(total.statements.pct || 0),
          functions: Math.round(total.functions.pct || 0),
          branches: Math.round(total.branches.pct || 0),
          passing: 0, // Will be updated by actual test run
          total: 0,
        };
      } catch {
        // Coverage file doesn't exist, return defaults
        return {
          lines: 0,
          statements: 0,
          functions: 0,
          branches: 0,
          passing: 0,
          total: 0,
        };
      }
    } catch (error) {
      return {
        lines: 0,
        statements: 0,
        functions: 0,
        branches: 0,
        passing: 0,
        total: 0,
      };
    }
  }

  /**
   * Get build status
   */
  private async getBuildStatus(): Promise<BuildStatus> {
    try {
      // Check if dist directory exists
      const distPath = path.join(this.projectRoot, "dist");
      try {
        await fs.access(distPath);
        return {
          status: "ok",
          lastBuild: new Date().toISOString(),
        };
      } catch {
        return {
          status: "unknown",
        };
      }
    } catch (error) {
      return {
        status: "error",
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  }

  /**
   * Get governance health from governance.json
   */
  private async getGovernanceHealth(): Promise<GovernanceHealth> {
    try {
      const governancePath = path.join(
        this.projectRoot,
        ".claude",
        "governance.json",
      );
      const data = await fs.readFile(governancePath, "utf-8");
      const governance: GovernanceState = JSON.parse(data);

      const workstreams = governance.workstreams || [];
      const activeWorkstreams = workstreams.filter(
        (ws) => ws.status === "active" || ws.status === "completed",
      );
      const blockedWorkstreams = workstreams.filter(
        (ws) => ws.status === "blocked",
      );

      // Count all tasks across workstreams
      let tasksPending = 0;
      let tasksCompleted = 0;

      for (const ws of workstreams) {
        for (const task of ws.tasks || []) {
          if (task.status === "completed") {
            tasksCompleted++;
          } else {
            tasksPending++;
          }
        }
      }

      return {
        status: governance.constitution?.status?.toLowerCase() as
          | "active"
          | "blocked"
          | "pending"
          | "unknown",
        confidence: governance.constitution?.confidence || 0,
        workstreamsActive: activeWorkstreams.length,
        workstreamsBlocked: blockedWorkstreams.length,
        tasksPending,
        tasksCompleted,
      };
    } catch (error) {
      return {
        status: "unknown",
        confidence: 0,
        workstreamsActive: 0,
        workstreamsBlocked: 0,
        tasksPending: 0,
        tasksCompleted: 0,
      };
    }
  }

  /**
   * Get agent availability
   */
  private async getAgentAvailability(): Promise<AgentAvailability> {
    try {
      const agentsPath = path.join(this.projectRoot, ".claude", "agents");
      const files = await fs.readdir(agentsPath);
      const agentFiles = files.filter((f) => f.endsWith(".md"));

      // Categorize agents
      const coreAgents = agentFiles.filter((f) =>
        f.includes("builder") || f.includes("planner") || f.includes("orchestrator") || f.includes("guardian"),
      );
      const specializedAgents = agentFiles.filter((f) => !coreAgents.includes(f));

      return {
        total: agentFiles.length,
        available: agentFiles.map((f) => f.replace(".md", "")),
        categories: {
          core: coreAgents.length,
          specialized: specializedAgents.length,
        },
      };
    } catch (error) {
      return {
        total: 0,
        available: [],
        categories: {
          core: 0,
          specialized: 0,
        },
      };
    }
  }

  /**
   * Get project name from package.json
   */
  private async getProjectName(): Promise<string> {
    try {
      const pkgPath = path.join(this.projectRoot, "package.json");
      const data = await fs.readFile(pkgPath, "utf-8");
      const pkg = JSON.parse(data);
      return pkg.name || "unknown";
    } catch {
      return "unknown";
    }
  }

  /**
   * Get forge version from package.json
   */
  private async getForgeVersion(): Promise<string> {
    try {
      const pkgPath = path.join(this.projectRoot, "package.json");
      const data = await fs.readFile(pkgPath, "utf-8");
      const pkg = JSON.parse(data);
      return pkg.version || "0.0.0";
    } catch {
      return "0.0.0";
    }
  }

  /**
   * Format status for CLI output
   */
  static formatForCLI(status: ForgeStatus): string {
    const lines: string[] = [];

    lines.push("NXTG-Forge Status");
    lines.push("─────────────────");
    lines.push(`Project: ${status.project.name}`);
    lines.push(`Branch: ${status.git.branch}`);

    // Test info
    if (status.tests.total > 0) {
      const coverage = status.tests.lines;
      lines.push(
        `Tests: ${status.tests.passing} passing (${coverage}% coverage)`,
      );
    } else {
      lines.push("Tests: No coverage data");
    }

    // Build status
    lines.push(`Build: ${status.build.status.toUpperCase()}`);

    // Governance
    lines.push(`Governance: ${status.governance.status.toUpperCase()}`);

    // Agents
    lines.push(`Agents: ${status.agents.total} available`);

    // Git changes
    if (status.git.hasUncommitted) {
      lines.push("");
      lines.push("Uncommitted changes:");
      if (status.git.staged > 0) {
        lines.push(`  Staged: ${status.git.staged}`);
      }
      if (status.git.modified > 0) {
        lines.push(`  Modified: ${status.git.modified}`);
      }
      if (status.git.untracked > 0) {
        lines.push(`  Untracked: ${status.git.untracked}`);
      }
    }

    return lines.join("\n");
  }
}
