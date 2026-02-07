/**
 * Canonical Vision System
 * Manages the strategic vision and alignment checking
 */

import { promises as fs } from "fs";
import * as path from "path";
import { z } from "zod";
import * as crypto from "crypto";
import { Logger } from "../utils/logger";
import {
  CanonicalVision,
  VisionEvent,
  AlignmentResult,
  Decision,
  VisionUpdate,
  PropagationResult,
  CanonicalVisionSchema,
  VisionEventSchema,
  AlignmentResultSchema,
  StrategicGoal,
  Priority,
} from "../types/vision";
import {
  parseVisionFile,
  extractVisionFromMarkdown,
  VisionFile,
  VisionFileMetadata,
} from "./vision/parser";
import {
  visionToMarkdown,
  createDefaultVision as createDefaultVisionData,
} from "./vision/serializer";

const logger = new Logger("VisionManager");

export class VisionManager {
  private visionPath: string;
  private eventsPath: string;
  private currentVision: CanonicalVision | null = null;
  private events: VisionEvent[] = [];
  private subscribers: Set<(vision: CanonicalVision) => void> = new Set();

  constructor(projectPath: string) {
    this.visionPath = path.join(projectPath, ".claude", "VISION.md");
    this.eventsPath = path.join(projectPath, ".claude", "vision-events.json");
  }

  /**
   * Initialize the vision system
   */
  async initialize(): Promise<void> {
    // Ensure vision directory exists
    const visionDir = path.dirname(this.visionPath);
    await fs.mkdir(visionDir, { recursive: true });

    // Load or create vision
    await this.loadVision();

    // Load event history
    await this.loadEvents();

    logger.info("Vision system initialized");
  }

  /**
   * Load vision from file
   */
  async loadVision(): Promise<CanonicalVision> {
    try {
      const content = await fs.readFile(this.visionPath, "utf-8");
      const visionFile = parseVisionFile(content);

      // Extract vision from markdown
      const vision = extractVisionFromMarkdown(visionFile);

      // Validate with schema
      this.currentVision = CanonicalVisionSchema.parse(vision);

      logger.info("Vision loaded successfully", {
        version: this.currentVision.version,
      });

      return this.currentVision;
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === "ENOENT") {
        // Create default vision
        logger.info("No vision file found, creating default");
        return await this.createDefaultVision();
      }
      throw error;
    }
  }


  /**
   * Create default vision
   */
  private async createDefaultVision(): Promise<CanonicalVision> {
    const vision = createDefaultVisionData();

    await this.saveVision(vision);
    this.currentVision = vision;

    // Record creation event
    await this.recordEvent({
      id: crypto.randomBytes(8).toString("hex"),
      timestamp: new Date(),
      type: "created",
      actor: "system",
      data: vision,
      newVersion: vision.version,
    });

    return vision;
  }

  /**
   * Save vision to file
   */
  private async saveVision(vision: CanonicalVision): Promise<void> {
    const markdown = visionToMarkdown(vision);
    await fs.writeFile(this.visionPath, markdown, "utf-8");
    logger.info("Vision saved to file");
  }

  /**
   * Update vision with changes
   */
  async updateVision(updates: VisionUpdate): Promise<void> {
    if (!this.currentVision) {
      throw new Error("No vision loaded");
    }

    const previousVersion = this.currentVision.version;

    // Create a candidate vision with updates applied
    const candidateVision: CanonicalVision = {
      ...this.currentVision,
      updated: new Date(),
      version: this.incrementVersion(this.currentVision.version),
    };

    // Apply updates to candidate
    if (updates.mission !== undefined) {
      candidateVision.mission = updates.mission;
    }
    if (updates.principles !== undefined) {
      candidateVision.principles = updates.principles;
    }
    if (updates.strategicGoals !== undefined) {
      candidateVision.strategicGoals = updates.strategicGoals;
    }
    if (updates.currentFocus !== undefined) {
      candidateVision.currentFocus = updates.currentFocus;
    }
    if (updates.successMetrics !== undefined) {
      candidateVision.successMetrics = updates.successMetrics;
    }

    // Validate the updated vision before applying
    const validationResult = CanonicalVisionSchema.safeParse(candidateVision);
    if (!validationResult.success) {
      const errors = validationResult.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ");
      throw new Error(`Invalid vision data: ${errors}`);
    }

    // Validation passed - apply the update
    this.currentVision = validationResult.data;

    // Save to file
    await this.saveVision(this.currentVision);

    // Record event
    await this.recordEvent({
      id: crypto.randomBytes(8).toString("hex"),
      timestamp: new Date(),
      type: "updated",
      actor: "user",
      data: updates,
      previousVersion,
      newVersion: this.currentVision.version,
    });

    // Propagate to subscribers
    await this.propagateVisionUpdate(this.currentVision);

    logger.info("Vision updated", { version: this.currentVision.version });
  }

  /**
   * Increment version number
   */
  private incrementVersion(version: string): string {
    const parts = version.split(".");
    const patch = parseInt(parts[parts.length - 1]) || 0;
    parts[parts.length - 1] = String(patch + 1);
    return parts.join(".");
  }

  /**
   * Get vision history
   */
  async getVisionHistory(): Promise<VisionEvent[]> {
    return [...this.events];
  }

  /**
   * Check alignment of a decision with vision
   */
  async checkAlignment(decision: Decision): Promise<AlignmentResult> {
    if (!this.currentVision) {
      throw new Error("No vision loaded");
    }

    const violations: Array<{
      principle: string;
      reason: string;
      severity: "minor" | "major" | "critical";
    }> = [];

    const suggestions: string[] = [];
    let score = 1.0;

    // Check against principles
    for (const principle of this.currentVision.principles) {
      const alignment = this.checkPrincipleAlignment(decision, principle);
      if (!alignment.aligned) {
        violations.push({
          principle,
          reason: alignment.reason,
          severity: alignment.severity,
        });
        score -= alignment.penalty;
      }
    }

    // Check against strategic goals
    const goalAlignment = this.checkGoalAlignment(
      decision,
      this.currentVision.strategicGoals,
    );
    if (!goalAlignment.aligned) {
      score -= 0.2;
      suggestions.push(...goalAlignment.suggestions);
    }

    // Generate suggestions based on violations
    if (violations.length > 0) {
      suggestions.push(
        "Consider reviewing the decision against core principles",
      );
      suggestions.push("Ensure the decision supports strategic goals");
    }

    return {
      aligned: violations.length === 0,
      score: Math.max(0, Math.min(1, score)),
      violations,
      suggestions,
    };
  }

  /**
   * Check alignment with a specific principle
   */
  private checkPrincipleAlignment(
    decision: Decision,
    principle: string,
  ): {
    aligned: boolean;
    reason: string;
    severity: "minor" | "major" | "critical";
    penalty: number;
  } {
    // Simplified alignment check - in production, use NLP/AI
    const principleKeywords = principle.toLowerCase().split(/\s+/);
    const decisionText =
      `${decision.description} ${decision.rationale}`.toLowerCase();

    // Check for conflicting patterns
    if (
      principle.includes("Developer Experience") &&
      decision.impact === "high"
    ) {
      if (!decisionText.includes("developer") && !decisionText.includes("dx")) {
        return {
          aligned: false,
          reason: "High impact decision does not consider developer experience",
          severity: "major",
          penalty: 0.3,
        };
      }
    }

    if (
      principle.includes("Enterprise Grade") &&
      decisionText.includes("prototype")
    ) {
      return {
        aligned: false,
        reason: "Prototype approach conflicts with enterprise-grade principle",
        severity: "minor",
        penalty: 0.1,
      };
    }

    return {
      aligned: true,
      reason: "",
      severity: "minor",
      penalty: 0,
    };
  }

  /**
   * Check alignment with strategic goals
   */
  private checkGoalAlignment(
    decision: Decision,
    goals: StrategicGoal[],
  ): {
    aligned: boolean;
    suggestions: string[];
  } {
    const activeGoals = goals.filter((g) => g.status === "in-progress");
    const decisionText =
      `${decision.description} ${decision.rationale}`.toLowerCase();

    const suggestions: string[] = [];
    let supportsGoal = false;

    for (const goal of activeGoals) {
      const goalText = `${goal.title} ${goal.description}`.toLowerCase();
      const goalKeywords = goalText.split(/\s+/).filter((w) => w.length > 3);

      // Check if decision supports any active goal
      const overlap = goalKeywords.filter((kw) =>
        decisionText.includes(kw),
      ).length;
      if (overlap > 2) {
        supportsGoal = true;
        break;
      }
    }

    if (!supportsGoal && activeGoals.length > 0) {
      suggestions.push(
        `Consider how this decision supports active goal: ${activeGoals[0].title}`,
      );
      suggestions.push("Align decision rationale with strategic priorities");
    }

    return {
      aligned: supportsGoal || activeGoals.length === 0,
      suggestions,
    };
  }

  /**
   * Propagate vision updates to agents
   */
  async propagateVisionUpdate(
    vision: CanonicalVision,
  ): Promise<PropagationResult> {
    const result: PropagationResult = {
      success: true,
      agentsNotified: [],
      failures: [],
    };

    // Notify all subscribers
    for (const subscriber of this.subscribers) {
      try {
        subscriber(vision);
        result.agentsNotified.push("subscriber");
      } catch (error) {
        result.success = false;
        result.failures.push({
          agentId: "subscriber",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // In production, would notify actual agents via message queue
    logger.info("Vision propagated", {
      notified: result.agentsNotified.length,
      failures: result.failures.length,
    });

    return result;
  }

  /**
   * Subscribe to vision updates
   */
  subscribe(callback: (vision: CanonicalVision) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  /**
   * Record vision event
   */
  private async recordEvent(event: VisionEvent): Promise<void> {
    this.events.push(event);
    await this.saveEvents();
  }

  /**
   * Load event history
   */
  private async loadEvents(): Promise<void> {
    try {
      const content = await fs.readFile(this.eventsPath, "utf-8");
      const events = JSON.parse(content) as unknown[];

      // Parse dates and validate
      this.events = events.map((e) => {
        const event = e as Record<string, unknown>;
        return {
          ...event,
          timestamp: new Date(event.timestamp as string),
        } as VisionEvent;
      });

      logger.info(`Loaded ${this.events.length} vision events`);
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === "ENOENT") {
        this.events = [];
      } else {
        throw error;
      }
    }
  }

  /**
   * Save event history
   */
  private async saveEvents(): Promise<void> {
    await fs.writeFile(this.eventsPath, JSON.stringify(this.events, null, 2));
  }

  /**
   * Get current vision
   */
  getCurrentVision(): CanonicalVision | null {
    return this.currentVision;
  }

  // API compatibility methods
  async getVision(): Promise<CanonicalVision> {
    if (!this.currentVision) {
      await this.loadVision();
    }
    return this.currentVision!;
  }

  async captureVision(text: string): Promise<CanonicalVision> {
    // Parse vision from text input
    const updates: VisionUpdate = {
      mission: text,
      currentFocus: text,
    };
    await this.updateVision(updates);
    return this.currentVision!;
  }

  isHealthy(): boolean {
    return this.currentVision !== null;
  }
}

// Export alias for API compatibility
export const VisionSystem = VisionManager;
