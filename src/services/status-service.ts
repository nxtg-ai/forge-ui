/**
 * Forge Status Service
 * Gathers comprehensive project state for /frg-status command
 */

import { simpleGit } from "simple-git";
import * as fs from "fs/promises";
import * as path from "path";
import { Result } from "../utils/result";
import type { GovernanceState } from "../types/governance.types";
import {
  getOrchestratorHealth,
  type OrchestratorFinding,
} from "./orchestrator-health";

/**
 * Turn orchestrator findings into a factor breakdown for the UI.
 *
 * Severities are counted per category rather than re-weighted — the score
 * itself is the orchestrator's, and inventing weights here would reintroduce
 * the local-fabrication problem this replaces.
 */
function summarizeFindings(
  findings: OrchestratorFinding[],
): { label: string; value: number; max: number }[] {
  const byCategory = new Map<string, number>();
  for (const f of findings) {
    byCategory.set(f.category, (byCategory.get(f.category) ?? 0) + 1);
  }
  const total = findings.length;
  return [...byCategory.entries()].map(([label, count]) => ({
    label: `${label} findings`,
    value: count,
    max: total,
  }));
}

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
  /**
   * Canonical project health. Sourced from the orchestrator's
   * `forge_get_health`; falls back to a local estimate that is explicitly
   * tagged via `source` so the UI can label it. Consumers MUST read this
   * rather than deriving their own number (contracts/dx-journeys.md).
   */
  health: ProjectHealth;
  timestamp: string;
}

export interface ProjectHealth {
  score: number;
  factors: { label: string; value: number; max: number }[];
  source: HealthSource;
  summary?: string;
}

export interface LastCommit {
  hash: string;
  message: string;
  date: string;
  author: string;
}

export interface LiveTestResults {
  passing: number;
  failing: number;
  skipped: number;
  lastRun: string | null;
}

export interface LiveContext {
  git: {
    branch: string;
    lastCommit: LastCommit | null;
    uncommittedCount: number;
    ahead: number;
    behind: number;
  };
  tests: LiveTestResults;
  health: {
    score: number;
    factors: { label: string; value: number; max: number }[];
    /**
     * Where the score came from. "orchestrator" is the canonical source
     * (forge_get_health via MCP); "estimate" means the orchestrator was
     * unreachable and this is a locally-derived approximation that MUST be
     * labeled as such in the UI. See contracts/dx-journeys.md.
     */
    source: HealthSource;
    /** Orchestrator one-line summary, when canonical. */
    summary?: string;
  };
  timestamp: string;
}

/**
 * Where a displayed health score came from.
 *
 * "orchestrator" and "governance" are both CANONICAL MCP surfaces (L2/L3 and
 * L1-plugin-only respectively). "estimate" is locally derived and MUST be
 * labeled as non-canonical in the UI — see contracts/dx-journeys.md.
 */
export type HealthSource = "orchestrator" | "governance" | "estimate";

/** The canonical (non-estimate) sources, for consumers that must distinguish. */
export const CANONICAL_HEALTH_SOURCES: readonly HealthSource[] = [
  "orchestrator",
  "governance",
];

export class StatusService {
  private resolveRoot: () => string;

  /**
   * Accepts a fixed root or a resolver.
   *
   * The resolver form exists because the API server's project root is dynamic
   * — it follows the active runspace. This service was constructed once with
   * the startup cwd and `setProjectRoot` was never called, so after a runspace
   * switch the dashboard reported health and identity for the ORIGINAL project
   * while every other route had moved. Passing a resolver keeps the two in step
   * by construction. NEXUS: DIRECTIVE-NXTG-20260718-14.
   */
  constructor(projectRoot: string | (() => string)) {
    this.resolveRoot =
      typeof projectRoot === "function" ? projectRoot : () => projectRoot;
  }

  /**
   * The root as of RIGHT NOW.
   *
   * Deliberately NOT read by the probe helpers. Each read can return a
   * different value (the resolver follows the active runspace), so concurrent
   * probes within a single request could each describe a DIFFERENT project —
   * a response identifying project B while reporting project A's build status.
   * Public entry points snapshot this once and thread the snapshot down.
   * NEXUS: Codex re-gate 13 [P1].
   */
  private get currentRoot(): string {
    return this.resolveRoot();
  }

  /** Switch to a different project root (for multi-project support) */
  setProjectRoot(newRoot: string): void {
    this.resolveRoot = () => newRoot;
  }

  /**
   * Gather complete project status
   */
  async getStatus(): Promise<Result<ForgeStatus, Error>> {
    try {
      // Snapshot ONCE. Every probe and every output field below describes this
      // exact root, so a runspace switch mid-request yields the pre-switch
      // project in full rather than a blend of two.
      const root = this.currentRoot;

      const [git, tests, build, governance, agents] = await Promise.all([
        this.getGitStatus(root),
        this.getTestCoverage(root),
        this.getBuildStatus(root),
        this.getGovernanceHealth(root),
        this.getAgentAvailability(root),
      ]);

      const health = await this.resolveHealth(
        root,
        {
          branch: git.branch,
          lastCommit: null,
          uncommittedCount: git.staged + git.modified + git.untracked,
          ahead: git.ahead,
          behind: git.behind,
        },
        {
          passing: tests.passing,
          failing: Math.max(0, tests.total - tests.passing),
          skipped: 0,
          lastRun: null,
        },
        governance,
      );

      const projectName = await this.getProjectName(root);
      const forgeVersion = await this.getForgeVersion(root);

      const status: ForgeStatus = {
        project: {
          name: projectName,
          path: root,
          forgeVersion,
        },
        git,
        tests,
        build,
        governance,
        agents,
        health,
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
  private async getGitStatus(root: string): Promise<GitStatus> {
    try {
      const git = simpleGit(root);
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
  private async getTestCoverage(root: string): Promise<TestCoverage> {
    try {
      // Try to read coverage from coverage-final.json
      const coveragePath = path.join(
        root,
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
  private async getBuildStatus(root: string): Promise<BuildStatus> {
    try {
      // Check if dist directory exists
      const distPath = path.join(root, "dist");
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
  private async getGovernanceHealth(root: string): Promise<GovernanceHealth> {
    try {
      const governancePath = path.join(
        root,
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
  private async getAgentAvailability(root: string): Promise<AgentAvailability> {
    try {
      const agentsPath = path.join(root, ".claude", "agents");
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
  private async getProjectName(root: string): Promise<string> {
    // Canonical first: `.forge/state.json:project_name` is what `forge init`
    // records and what the orchestrator reports as the project's identity.
    // package.json is a Node-only convention — a Rust/Python project, or any
    // bare `forge init` fixture, has no package.json at all and used to report
    // "unknown" here, which broke identity binding against the canonical
    // surface (contracts/dx-journeys.md — the same project must be identifiable
    // on both sides). NEXUS: DIRECTIVE-NXTG-20260718-14.
    try {
      const statePath = path.join(root, ".forge", "state.json");
      const state = JSON.parse(await fs.readFile(statePath, "utf-8"));
      if (typeof state.project_name === "string" && state.project_name) {
        return state.project_name;
      }
    } catch {
      // No forge state — fall through to the Node convention.
    }

    try {
      const pkgPath = path.join(root, "package.json");
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
  private async getForgeVersion(root: string): Promise<string> {
    try {
      const pkgPath = path.join(root, "package.json");
      const data = await fs.readFile(pkgPath, "utf-8");
      const pkg = JSON.parse(data);
      return pkg.version || "0.0.0";
    } catch {
      return "0.0.0";
    }
  }

  /**
   * Gather live operational context (ephemeral, never written to governance.json)
   */
  async getLiveContext(): Promise<LiveContext> {
    // Same snapshot discipline as getStatus — one root per response.
    const root = this.currentRoot;
    const git = simpleGit(root);

    // Git state
    let gitState: LiveContext["git"] = {
      branch: "unknown",
      lastCommit: null,
      uncommittedCount: 0,
      ahead: 0,
      behind: 0,
    };
    try {
      const status = await git.status();
      const log = await git.log({ maxCount: 1 });
      const latest = log.latest;

      gitState = {
        branch: status.current || "unknown",
        lastCommit: latest
          ? {
              hash: latest.hash.slice(0, 7),
              message: latest.message,
              date: latest.date,
              author: latest.author_name,
            }
          : null,
        uncommittedCount:
          status.modified.length +
          status.staged.length +
          status.not_added.length,
        ahead: status.ahead,
        behind: status.behind,
      };
    } catch {
      // not a git repo - defaults are fine
    }

    // Test results
    const tests = await this.getCachedTestResults(root);

    // Health — canonical score comes from the orchestrator; the local
    // computation is a labeled last-resort estimate only.
    const governance = await this.getGovernanceHealth(root);
    const health = await this.resolveHealth(root, gitState, tests, governance);

    return {
      git: gitState,
      tests,
      health,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Read cached test results from .claude/state/test-results.json
   */
  private async getCachedTestResults(root: string): Promise<LiveTestResults> {
    try {
      const testPath = path.join(
        root,
        ".claude",
        "state",
        "test-results.json",
      );
      const data = await fs.readFile(testPath, "utf-8");
      const parsed = JSON.parse(data);
      return {
        passing: parsed.passing ?? 0,
        failing: parsed.failing ?? 0,
        skipped: parsed.skipped ?? 0,
        lastRun: parsed.lastRun ?? parsed.timestamp ?? null,
      };
    } catch {
      return { passing: 0, failing: 0, skipped: 0, lastRun: null };
    }
  }

  /**
   * Resolve project health, preferring the canonical orchestrator score.
   *
   * Order: orchestrator `forge_get_health` (canonical) → local estimate.
   * The local path is retained ONLY as a labeled fallback so the dashboard
   * still renders when the orchestrator is unavailable.
   */
  private async resolveHealth(
    root: string,
    git: LiveContext["git"],
    tests: LiveTestResults,
    governance: GovernanceHealth,
  ): Promise<LiveContext["health"]> {
    // Tier 1 — the orchestrator, canonical whenever it is reachable.
    const canonical = await getOrchestratorHealth(root);

    if (canonical) {
      return {
        score: canonical.score,
        // Orchestrator findings grouped by category become the factor
        // breakdown, so the UI keeps a drill-down without inventing weights.
        factors: summarizeFindings(canonical.findings),
        source: "orchestrator",
        summary: canonical.summary,
      };
    }

    // Tier 2 — plugin-only (L1): no orchestrator binary, but the project
    // declares a governance MCP server. Still canonical, just a different
    // surface, so it must not be presented as a local estimate.
    const { getGovernanceHealth } = await import("./governance-health");
    const plugin = await getGovernanceHealth(root);

    if (plugin) {
      return {
        score: plugin.score,
        factors: [],
        source: "governance",
        summary: plugin.grade
          ? `Governance health: ${plugin.score}/100 (${plugin.grade})`
          : `Governance health: ${plugin.score}/100`,
      };
    }

    // Tier 3 — nothing canonical is reachable. Labeled, never presented as
    // canonical health (the DoD's hard FAIL condition).
    return {
      ...this.computeHealthScore(git, tests, governance),
      source: "estimate",
    };
  }

  /**
   * Derive a 0-100 health score from operational data.
   *
   * FALLBACK ONLY — this is not the canonical score. Anything surfacing it
   * must label it as an estimate (see resolveHealth).
   */
  private computeHealthScore(
    git: LiveContext["git"],
    tests: LiveTestResults,
    governance: GovernanceHealth,
  ): Omit<LiveContext["health"], "source" | "summary"> {
    const factors: { label: string; value: number; max: number }[] = [];

    // Git hygiene (30 pts): lose points for large uncommitted counts
    const gitScore = Math.max(0, 30 - git.uncommittedCount * 3);
    factors.push({ label: "Git hygiene", value: gitScore, max: 30 });

    // Test health (30 pts): ratio of passing to total
    const totalTests = tests.passing + tests.failing + tests.skipped;
    const testScore =
      totalTests > 0 ? Math.round((tests.passing / totalTests) * 30) : 15;
    factors.push({ label: "Test health", value: testScore, max: 30 });

    // Governance (20 pts): based on confidence and blocked workstreams
    const govScore = Math.round(governance.confidence * 20) -
      governance.workstreamsBlocked * 5;
    factors.push({
      label: "Governance",
      value: Math.max(0, Math.min(20, govScore)),
      max: 20,
    });

    // Sync status (20 pts): lose points if behind remote
    const syncScore = Math.max(0, 20 - git.behind * 5);
    factors.push({ label: "Sync status", value: syncScore, max: 20 });

    const score = factors.reduce((sum, f) => sum + f.value, 0);
    return { score: Math.min(100, Math.max(0, score)), factors };
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
