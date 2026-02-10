/**
 * Governance Routes Module
 *
 * Handles all governance-related HTTP endpoints:
 * - State management
 * - Configuration
 * - Sentinel logging
 * - Live context
 * - Memory insights
 * - Blocker tracking
 * - Validation
 * - Backups
 */

import express from "express";
import * as fs from "fs/promises";
import * as path from "path";
import type { RouteContext } from "../route-context";
import { getLogger } from "../../utils/logger";
import type { GovernanceState } from "../../types/governance.types";

const logger = getLogger("governance-routes");

export function createGovernanceRoutes(ctx: RouteContext): express.Router {
  const router = express.Router();

  // GET /state - Read current governance state
  router.get("/state", async (req, res) => {
    try {
      const governancePath = path.join(ctx.projectRoot, ".claude/governance.json");

      try {
        const data = await fs.readFile(governancePath, "utf-8");
        const state: GovernanceState = JSON.parse(data);

        res.json({
          success: true,
          data: state,
          timestamp: new Date().toISOString(),
        });
      } catch (error: unknown) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          res.status(404).json({
            success: false,
            error: "Governance state not found",
            message: "Initialize governance with seed data first",
            timestamp: new Date().toISOString(),
          });
        } else {
          throw error; // Re-throw to be caught by outer catch
        }
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Failed to read governance state",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // GET /config - Read governance configuration
  router.get("/config", async (req, res) => {
    try {
      const configPath = path.join(ctx.projectRoot, ".claude/governance/config.json");

      try {
        const data = await fs.readFile(configPath, "utf-8");
        const config = JSON.parse(data);

        res.json({
          success: true,
          data: config,
          timestamp: new Date().toISOString(),
        });
      } catch (error: unknown) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          // Return default config if file doesn't exist
          const { DEFAULT_GOVERNANCE_CONFIG } =
            await import("../../types/governance.types.js");
          res.json({
            success: true,
            data: DEFAULT_GOVERNANCE_CONFIG,
            timestamp: new Date().toISOString(),
            message: "Using default configuration (config.json not found)",
          });
        } else {
          throw error;
        }
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Failed to read governance config",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // POST /sentinel - Append sentinel log entry
  router.post("/sentinel", async (req, res) => {
    try {
      const entry = req.body;

      // Validate required fields
      if (!entry.type || !entry.source || !entry.message) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields: type, source, message",
          timestamp: new Date().toISOString(),
        });
      }

      // Append log using state manager (includes automatic rotation)
      await ctx.governanceStateManager.appendSentinelLog(entry);

      // Broadcast governance update to all clients
      const state = await ctx.governanceStateManager.readState();
      ctx.broadcast("governance.update", state);

      res.json({
        success: true,
        message: "Sentinel log entry added",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Failed to append sentinel log",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // GET /live-context - Gather live project context
  router.get("/live-context", async (req, res) => {
    try {
      const liveContext = await ctx.statusService.getLiveContext();
      res.json({
        success: true,
        data: liveContext,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Failed to gather live context",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // GET /memory-insights - Parse and analyze Claude's native memory file
  router.get("/memory-insights", async (req, res) => {
    try {
      const os = await import("os");
      const homeDir = os.default.homedir();

      // Derive Claude memory path from active project root
      // Claude Code stores memory at ~/.claude/projects/-{path-with-dashes}/memory/MEMORY.md
      const projectSlug = ctx.projectRoot.replace(/\//g, "-");
      const projectMemoryPath = path.join(
        homeDir,
        `.claude/projects/${projectSlug}/memory/MEMORY.md`,
      );

      // Also search all memory files as fallback
      const memoryGlob = path.join(
        homeDir,
        ".claude/projects/*/memory/MEMORY.md",
      );
      const { glob } = await import("glob");
      const memoryFiles = await glob(memoryGlob);

      // Prefer project-specific path, then search by project directory name
      const projectDirName = path.basename(ctx.projectRoot);
      let memoryContent = "";
      const targetPath =
        memoryFiles.find((f) => f.includes(projectSlug)) ||
        memoryFiles.find((f) => f.includes(projectDirName)) ||
        projectMemoryPath;

      try {
        memoryContent = await fs.readFile(targetPath, "utf-8");
      } catch {
        // No memory file found
      }

      // Parse sections from MEMORY.md
      const sections: {
        title: string;
        items: string[];
        type: "rule" | "decision" | "discovery" | "other";
      }[] = [];
      const lines = memoryContent.replace(/\r/g, "").split("\n");
      let currentSection = "";
      let currentItems: string[] = [];
      let currentType: "rule" | "decision" | "discovery" | "other" = "other";

      for (const line of lines) {
        if (line.startsWith("## ")) {
          if (currentSection && currentItems.length > 0) {
            sections.push({
              title: currentSection,
              items: currentItems.slice(0, 5),
              type: currentType,
            });
          }
          currentSection = line.replace(/^#+\s*/, "");
          currentItems = [];
          if (currentSection.toLowerCase().includes("rule"))
            currentType = "rule";
          else if (currentSection.toLowerCase().includes("decision"))
            currentType = "decision";
          else if (currentSection.toLowerCase().includes("discovery"))
            currentType = "discovery";
          else currentType = "other";
        } else if (line.startsWith("### ")) {
          currentItems.push(line.replace(/^#+\s*/, ""));
        }
      }
      if (currentSection && currentItems.length > 0) {
        sections.push({
          title: currentSection,
          items: currentItems.slice(0, 5),
          type: currentType,
        });
      }

      res.json({
        success: true,
        data: {
          hasMemory: memoryContent.length > 0,
          sections: sections.slice(0, 6),
          totalRules: sections
            .filter((s) => s.type === "rule")
            .reduce((sum, s) => sum + s.items.length, 0),
          totalDecisions: sections
            .filter((s) => s.type === "decision")
            .reduce((sum, s) => sum + s.items.length, 0),
          lastModified: memoryContent.length > 0
            ? (await fs.stat(targetPath)).mtime.toISOString()
            : null,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Failed to read memory insights",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // GET /blockers - Extract blockers, action items, and pending decisions
  router.get("/blockers", async (req, res) => {
    try {
      const state = await ctx.governanceStateManager.readState();

      // Extract blockers from workstreams
      const blockedWorkstreams = state.workstreams
        .filter(
          (ws) =>
            ws.status === "blocked" ||
            ws.risk === "high" ||
            (ws.metrics?.blockers ?? 0) > 0,
        )
        .map((ws) => ({
          id: ws.id,
          name: ws.name,
          status: ws.status,
          risk: ws.risk,
          blockerCount: ws.metrics?.blockers ?? 0,
          progress: ws.progress,
        }));

      // Extract actionRequired sentinel entries
      const actionItems = (state.sentinelLog || [])
        .filter(
          (entry) =>
            entry.actionRequired === true ||
            entry.type === "ERROR" ||
            entry.type === "CRITICAL",
        )
        .slice(-10)
        .map((entry) => ({
          id: entry.id,
          type: entry.type,
          message: entry.message,
          source: entry.source,
          timestamp: entry.timestamp,
          actionRequired: entry.actionRequired ?? false,
        }));

      // Extract pending decision workstreams
      const pendingDecisions = state.workstreams
        .filter((ws) => ws.status === "pending")
        .map((ws) => ({
          id: ws.id,
          name: ws.name,
          taskCount: ws.tasks?.length ?? 0,
          dependencies: ws.dependencies ?? [],
        }));

      res.json({
        success: true,
        data: {
          blockedWorkstreams,
          actionItems,
          pendingDecisions,
          summary: {
            totalBlockers: blockedWorkstreams.length,
            totalActionItems: actionItems.length,
            totalPending: pendingDecisions.length,
            needsAttention:
              blockedWorkstreams.length > 0 || actionItems.length > 0,
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Failed to gather blocker data",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // GET /validate - Validate governance state integrity
  router.get("/validate", async (req, res) => {
    try {
      const result = await ctx.governanceStateManager.validateStateIntegrity();

      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Failed to validate state",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // GET /backup/latest - Retrieve latest governance backup
  router.get("/backup/latest", async (req, res) => {
    try {
      const backup = await ctx.governanceStateManager.getLatestBackup();

      if (!backup) {
        return res.status(404).json({
          success: false,
          error: "No backups found",
          timestamp: new Date().toISOString(),
        });
      }

      res.json({
        success: true,
        data: backup,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Failed to retrieve backup",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  return router;
}
