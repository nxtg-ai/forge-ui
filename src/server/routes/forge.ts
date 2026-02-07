/**
 * Forge Routes - Initialization, feedback, compliance, error tracking, and diff management
 *
 * Routes extracted from api-server.ts for better organization.
 * All routes use RouteContext for dependency injection.
 */

import express from "express";
import * as fs from "fs/promises";
import * as path from "path";
import type { RouteContext } from "../route-context";
import { rateLimit, writeLimiter, validateRequest, feedbackSchema } from "../middleware";
import { getLogger } from "../../utils/logger";
import { captureException } from "../../monitoring/sentry";
import type { InitOptions } from "../../services/init-service";
import { StatusService } from "../../services/status-service";

const logger = getLogger("forge-routes");

/**
 * Extended RouteContext with WebSocket client count
 */
interface ForgeRouteContext extends RouteContext {
  getWsClientCount: () => number;
  sentryReady: boolean;
}

/**
 * Create forge-related routes
 */
export function createForgeRoutes(ctx: ForgeRouteContext): express.Router {
  const router = express.Router();

  // Feedback file path
  const FEEDBACK_FILE = path.join(ctx.projectRoot, "data", "feedback.json");

  // Ensure feedback file exists
  async function ensureFeedbackFile() {
    try {
      await fs.mkdir(path.dirname(FEEDBACK_FILE), { recursive: true });
      try {
        await fs.access(FEEDBACK_FILE);
      } catch {
        await fs.writeFile(FEEDBACK_FILE, JSON.stringify([], null, 2));
      }
    } catch (error) {
      logger.error("Failed to initialize feedback file:", error);
    }
  }

  // Initialize feedback file
  ensureFeedbackFile();

  // ============= Diff Endpoints =============

  router.post("/diffs/apply", async (req, res) => {
    try {
      const { filePath, timestamp } = req.body;

      if (!filePath) {
        return res.status(400).json({
          success: false,
          error: "filePath is required",
          timestamp: new Date().toISOString(),
        });
      }

      // Diff application is handled by Claude Code's native file operations.
      // This endpoint provides UI notification and event broadcasting.
      logger.info(`📝 Applying diff to: ${filePath}`);

      // Broadcast diff applied event
      ctx.broadcast("diff.applied", {
        filePath,
        timestamp: timestamp || new Date().toISOString(),
      });

      res.json({
        success: true,
        message: `Successfully applied changes to ${filePath}`,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  router.post("/diffs/reject", async (req, res) => {
    try {
      const { filePath, timestamp } = req.body;

      if (!filePath) {
        return res.status(400).json({
          success: false,
          error: "filePath is required",
          timestamp: new Date().toISOString(),
        });
      }

      // Diff rejection notifies UI and broadcasts event.
      // Actual file state is managed by Claude Code.
      logger.info(`❌ Rejecting diff for: ${filePath}`);

      // Broadcast diff rejected event
      ctx.broadcast("diff.rejected", {
        filePath,
        timestamp: timestamp || new Date().toISOString(),
      });

      res.json({
        success: true,
        message: `Rejected changes to ${filePath}`,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  router.get("/diffs/pending", async (req, res) => {
    try {
      // Pending diffs are tracked in the approval queue, not here.
      // This endpoint returns the UI-visible pending state.
      const diffs: Array<{ filePath: string; timestamp: string }> = [];

      res.json({
        success: true,
        data: diffs,
        count: diffs.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // ============= Error Tracking Endpoint =============

  router.post("/errors", async (req, res) => {
    try {
      const errorData = req.body;

      // Log error with structured format
      logger.error("🚨 Frontend Error Reported:", {
        message: errorData.message,
        name: errorData.name,
        url: errorData.url,
        timestamp: errorData.timestamp,
        environment: errorData.environment,
      });

      // Send to Sentry if initialized
      if (ctx.sentryReady) {
        const error = new Error(errorData.message);
        error.name = errorData.name || "FrontendError";
        error.stack = errorData.stack;

        captureException(error, {
          url: errorData.url,
          userAgent: errorData.userAgent,
          componentStack: errorData.componentStack,
          timestamp: errorData.timestamp,
          source: "frontend",
        });
      }

      // Broadcast error event for monitoring dashboard
      ctx.broadcast("error.reported", {
        message: errorData.message,
        timestamp: errorData.timestamp,
      });

      res.json({
        success: true,
        message: "Error reported successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Failed to log error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to log error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // ============= Health Check =============

  router.get("/health", (req, res) => {
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      services: {
        orchestrator: ctx.orchestrator.isHealthy(),
        vision: ctx.visionSystem.isHealthy(),
        state: ctx.stateManager.isHealthy(),
        coordination: ctx.coordinationService.isHealthy(),
        websocket: ctx.getWsClientCount() > 0,
      },
    });
  });

  // ============= Forge Initialization Endpoints =============

  // Detect project type
  router.get("/forge/detect", async (req, res) => {
    try {
      const detectionResult = await ctx.initService.detectProjectType();

      if (detectionResult.isErr()) {
        return res.status(500).json({
          success: false,
          error: detectionResult.error.message,
          timestamp: new Date().toISOString(),
        });
      }

      res.json({
        success: true,
        data: detectionResult.unwrap(),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Detection failed",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Check existing setup
  router.get("/forge/check", async (req, res) => {
    try {
      const setupResult = await ctx.initService.checkExistingSetup();

      if (setupResult.isErr()) {
        return res.status(500).json({
          success: false,
          error: setupResult.error.message,
          timestamp: new Date().toISOString(),
        });
      }

      res.json({
        success: true,
        data: setupResult.unwrap(),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Setup check failed",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Initialize NXTG-Forge
  router.post("/forge/init", async (req, res) => {
    try {
      const options: InitOptions = req.body;

      // Perform initialization
      const result = await ctx.initService.initializeProject(options);

      if (result.isErr()) {
        const error = result.error;
        return res.status(400).json({
          success: false,
          error: error.message,
          code: "code" in error ? error.code : "INIT_ERROR",
          timestamp: new Date().toISOString(),
        });
      }

      const initResult = result.unwrap();

      // Broadcast initialization event
      ctx.broadcast("forge.initialized", {
        projectType: initResult.projectType,
        agentsCopied: initResult.agentsCopied,
        filesCreated: initResult.created.length,
      });

      res.json({
        success: true,
        data: initResult,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Initialization failed",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Get project status (/frg-status command backend)
  router.get("/forge/status", async (req, res) => {
    try {
      const statusResult = await ctx.statusService.getStatus();

      if (statusResult.isErr()) {
        return res.status(500).json({
          success: false,
          error: statusResult.error.message,
          timestamp: new Date().toISOString(),
        });
      }

      const status = statusResult.unwrap();

      // Support CLI format via query param
      if (req.query.format === "cli") {
        res.type("text/plain");
        res.send(StatusService.formatForCLI(status));
      } else {
        res.json({
          success: true,
          data: status,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      captureException(error instanceof Error ? error : String(error));
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Status retrieval failed",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // ============= Beta Feedback Endpoints =============

  // Submit feedback
  router.post(
    "/feedback",
    rateLimit(writeLimiter),
    validateRequest(feedbackSchema),
    async (req, res) => {
      try {
        const {
          rating,
          category,
          description,
          url,
          userAgent,
          timestamp,
        } = req.body;

        // Create feedback entry
        const feedback = {
          id: `feedback-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          rating: Number(rating),
          category,
          description,
          url: url || "unknown",
          userAgent: userAgent || "unknown",
          timestamp: timestamp || new Date().toISOString(),
          status: "new",
        };

        // Read existing feedback
        await ensureFeedbackFile();
        const data = await fs.readFile(FEEDBACK_FILE, "utf-8");
        const feedbackList = JSON.parse(data);

        // Add new feedback
        feedbackList.push(feedback);

        // Write back to file
        await fs.writeFile(FEEDBACK_FILE, JSON.stringify(feedbackList, null, 2));

        // Broadcast feedback event
        ctx.broadcast("feedback.submitted", {
          id: feedback.id,
          category: feedback.category,
          rating: feedback.rating,
          timestamp: feedback.timestamp,
        });

        res.json({
          success: true,
          data: { id: feedback.id },
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        logger.error("Failed to save feedback:", error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
      }
    },
  );

  // Get all feedback (admin endpoint)
  router.get("/feedback", async (req, res) => {
    try {
      await ensureFeedbackFile();
      const data = await fs.readFile(FEEDBACK_FILE, "utf-8");
      const feedbackList = JSON.parse(data);

      // Sort by timestamp descending
      feedbackList.sort((a: { timestamp: string }, b: { timestamp: string }) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      res.json({
        success: true,
        data: feedbackList,
        count: feedbackList.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Failed to read feedback:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Get feedback statistics
  router.get("/feedback/stats", async (req, res) => {
    try {
      await ensureFeedbackFile();
      const data = await fs.readFile(FEEDBACK_FILE, "utf-8");
      const feedbackList = JSON.parse(data);

      // Calculate statistics
      const totalCount = feedbackList.length;
      const averageRating = totalCount > 0
        ? feedbackList.reduce((sum: number, f: { rating: number }) => sum + f.rating, 0) / totalCount
        : 0;

      // Count by category
      const byCategory: Record<string, number> = {};
      feedbackList.forEach((f: { category: string }) => {
        byCategory[f.category] = (byCategory[f.category] || 0) + 1;
      });

      // Count by rating
      const byRating: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      feedbackList.forEach((f: { rating: number }) => {
        byRating[f.rating] = (byRating[f.rating] || 0) + 1;
      });

      // Recent feedback (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentCount = feedbackList.filter((f: { timestamp: string }) =>
        new Date(f.timestamp) >= sevenDaysAgo
      ).length;

      res.json({
        success: true,
        data: {
          totalCount,
          averageRating: Math.round(averageRating * 10) / 10,
          byCategory,
          byRating,
          recentCount,
          lastSubmission: totalCount > 0 ? feedbackList[0].timestamp : null,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Failed to calculate feedback stats:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // ============= Compliance Endpoints =============

  // Full compliance report
  router.get("/compliance/report", async (req, res) => {
    try {
      const result = await ctx.complianceService.getComplianceReport();
      if (result.ok) {
        res.json(result.value);
      } else {
        logger.error("[Compliance] Report generation failed:", result.error);
        res.status(500).json({ error: "Failed to generate compliance report" });
      }
    } catch (error) {
      logger.error("Compliance report failed:", error);
      res.status(500).json({ error: "Failed to generate compliance report" });
    }
  });

  // CycloneDX SBOM document
  router.get("/compliance/sbom", async (req, res) => {
    try {
      const result = await ctx.complianceService.generateSBOM();
      if (result.ok) {
        res.setHeader("Content-Type", "application/vnd.cyclonedx+json");
        res.json(result.value);
      } else {
        logger.error("[Compliance] SBOM generation failed:", result.error);
        res.status(500).json({ error: "Failed to generate SBOM" });
      }
    } catch (error) {
      logger.error("SBOM generation failed:", error);
      res.status(500).json({ error: "Failed to generate SBOM" });
    }
  });

  // License conflicts (lightweight for dashboard badges)
  router.get("/compliance/conflicts", async (req, res) => {
    try {
      const result = await ctx.complianceService.getComplianceReport();
      if (result.ok) {
        res.json({
          status: result.value.status,
          score: result.value.score,
          conflicts: result.value.conflicts,
          summary: result.value.summary,
        });
      } else {
        logger.error("[Compliance] Conflicts check failed:", result.error);
        res.status(500).json({ error: "Failed to check license conflicts" });
      }
    } catch (error) {
      logger.error("Compliance conflicts check failed:", error);
      res.status(500).json({ error: "Failed to check license conflicts" });
    }
  });

  return router;
}
