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
} from "../types/vision";

const logger = new Logger("VisionManager");

// Vision file metadata
interface VisionFileMetadata {
  version: string;
  created: string;
  updated: string;
}

// Vision file content
interface VisionFile {
  metadata: VisionFileMetadata;
  content: string;
}

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
      const visionFile = this.parseVisionFile(content);

      // Extract vision from markdown
      const vision = this.extractVisionFromMarkdown(visionFile);

      // Validate with schema
      this.currentVision = CanonicalVisionSchema.parse(vision);

      logger.info("Vision loaded successfully", {
        version: this.currentVision.version,
      });

      return this.currentVision;
    } catch (error) {
      if ((error as any).code === "ENOENT") {
        // Create default vision
        logger.info("No vision file found, creating default");
        return await this.createDefaultVision();
      }
      throw error;
    }
  }

  /**
   * Parse vision file with YAML frontmatter
   */
  private parseVisionFile(content: string): VisionFile {
    const lines = content.split("\n");
    let inFrontmatter = false;
    let frontmatterLines: string[] = [];
    let contentLines: string[] = [];
    let frontmatterCount = 0;

    for (const line of lines) {
      if (line.trim() === "---") {
        frontmatterCount++;
        if (frontmatterCount === 1) {
          inFrontmatter = true;
        } else if (frontmatterCount === 2) {
          inFrontmatter = false;
        }
        continue;
      }

      if (inFrontmatter) {
        frontmatterLines.push(line);
      } else if (frontmatterCount >= 2) {
        contentLines.push(line);
      }
    }

    // Parse YAML frontmatter manually (simplified)
    const metadata: VisionFileMetadata = {
      version: "1.0",
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    };

    for (const line of frontmatterLines) {
      const [key, ...valueParts] = line.split(":");
      if (key && valueParts.length > 0) {
        const value = valueParts.join(":").trim();
        if (key.trim() === "version") metadata.version = value;
        if (key.trim() === "created") metadata.created = value;
        if (key.trim() === "updated") metadata.updated = value;
      }
    }

    return {
      metadata,
      content: contentLines.join("\n"),
    };
  }

  /**
   * Extract vision data from markdown content
   */
  private extractVisionFromMarkdown(visionFile: VisionFile): CanonicalVision {
    const content = visionFile.content;
    const sections = this.parseMarkdownSections(content);

    const vision: CanonicalVision = {
      version: visionFile.metadata.version,
      created: new Date(visionFile.metadata.created),
      updated: new Date(visionFile.metadata.updated),
      mission: sections["mission"] || "",
      principles: this.parseList(sections["principles"] || ""),
      strategicGoals: this.parseStrategicGoals(
        sections["strategic goals"] || "",
      ),
      currentFocus: sections["current focus"] || "",
      successMetrics: this.parseMetrics(sections["success metrics"] || ""),
      metadata: {},
    };

    return vision;
  }

  /**
   * Parse markdown into sections
   */
  private parseMarkdownSections(content: string): Record<string, string> {
    const sections: Record<string, string> = {};
    const lines = content.split("\n");
    let currentSection = "";
    let sectionContent: string[] = [];

    for (const line of lines) {
      if (line.startsWith("## ")) {
        // Save previous section
        if (currentSection) {
          sections[currentSection.toLowerCase()] = sectionContent
            .join("\n")
            .trim();
        }
        // Start new section
        currentSection = line.substring(3).trim();
        sectionContent = [];
      } else {
        sectionContent.push(line);
      }
    }

    // Save last section
    if (currentSection) {
      sections[currentSection.toLowerCase()] = sectionContent.join("\n").trim();
    }

    return sections;
  }

  /**
   * Parse a markdown list
   */
  private parseList(content: string): string[] {
    const lines = content.split("\n");
    const items: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (
        trimmed.startsWith("- ") ||
        trimmed.startsWith("* ") ||
        /^\d+\. /.test(trimmed)
      ) {
        const item = trimmed.replace(/^[-*]\s+/, "").replace(/^\d+\.\s+/, "");
        if (item) items.push(item);
      }
    }

    return items;
  }

  /**
   * Parse strategic goals from markdown
   */
  private parseStrategicGoals(content: string): any[] {
    const lines = content.split("\n");
    const goals: any[] = [];
    let currentGoal: any = null;

    for (const line of lines) {
      const trimmed = line.trim();

      // Parse goal line (e.g., "1. [Goal Title] - Priority: High, Deadline: Q1 2026")
      const goalMatch = trimmed.match(/^\d+\.\s+\[([^\]]+)\](.*)$/);
      if (goalMatch) {
        if (currentGoal) goals.push(currentGoal);

        currentGoal = {
          id: crypto.randomBytes(8).toString("hex"),
          title: goalMatch[1],
          description: "",
          priority: "medium" as any,
          status: "not-started" as any,
          progress: 0,
          metrics: [],
        };

        // Parse metadata from the rest of the line
        const metadata = goalMatch[2];
        const priorityMatch = metadata.match(/Priority:\s*(\w+)/i);
        const deadlineMatch = metadata.match(/Deadline:\s*([^,]+)/i);

        if (priorityMatch) {
          currentGoal.priority = priorityMatch[1].toLowerCase();
        }
        if (deadlineMatch) {
          currentGoal.deadline = new Date(deadlineMatch[1]);
        }
      } else if (currentGoal && trimmed) {
        // Add to description
        currentGoal.description +=
          (currentGoal.description ? " " : "") + trimmed;
      }
    }

    if (currentGoal) goals.push(currentGoal);
    return goals;
  }

  /**
   * Parse success metrics
   */
  private parseMetrics(content: string): Record<string, string | number> {
    const lines = content.split("\n");
    const metrics: Record<string, string | number> = {};

    for (const line of lines) {
      const trimmed = line.trim();
      const match = trimmed.match(/^[-*]\s+([^:]+):\s*(.+)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim();

        // Try to parse as number
        const numValue = parseFloat(value);
        metrics[key] = isNaN(numValue) ? value : numValue;
      }
    }

    return metrics;
  }

  /**
   * Create default vision
   */
  private async createDefaultVision(): Promise<CanonicalVision> {
    const vision: CanonicalVision = {
      version: "1.0",
      created: new Date(),
      updated: new Date(),
      mission:
        "Build the Ultimate Chief of Staff for Developers - an AI-orchestrated system that amplifies developer productivity 10x",
      principles: [
        "Developer Experience First - Every feature must delight developers",
        "Intelligence at Scale - Smart automation that learns and adapts",
        "Enterprise Grade - Production-ready, secure, and reliable",
        "Open and Extensible - Plugin architecture for infinite possibilities",
        "Speed is a Feature - Sub-second responses, instant feedback",
      ],
      strategicGoals: [
        {
          id: "goal-1",
          title: "Launch NXTG-Forge v3.0",
          description: "Complete core infrastructure and orchestration engine",
          priority: "critical" as any,
          deadline: new Date("2026-02-01"),
          status: "in-progress",
          progress: 30,
          metrics: [
            "Bootstrap time < 30s",
            "10+ parallel agents",
            "Zero data loss",
          ],
        },
        {
          id: "goal-2",
          title: "Build AI Agent Ecosystem",
          description:
            "Create 20+ specialized agents for different development tasks",
          priority: "high" as any,
          deadline: new Date("2026-03-01"),
          status: "not-started",
          progress: 0,
          metrics: ["20+ agents", "95% task success rate", "Agent marketplace"],
        },
      ],
      currentFocus:
        "Building core infrastructure and orchestration engine for v3.0 launch",
      successMetrics: {
        "Bootstrap Time": "< 30 seconds",
        "Parallel Agents": "10+",
        "State Recovery": "< 2 seconds",
        "User Satisfaction": "> 90%",
        "Code Coverage": "> 80%",
      },
      metadata: {
        generator: "VisionManager",
        environment: "development",
      },
    };

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
    const markdown = this.visionToMarkdown(vision);
    await fs.writeFile(this.visionPath, markdown, "utf-8");
    logger.info("Vision saved to file");
  }

  /**
   * Convert vision to markdown
   */
  private visionToMarkdown(vision: CanonicalVision): string {
    const lines: string[] = [];

    // YAML frontmatter
    lines.push("---");
    lines.push(`version: ${vision.version}`);
    lines.push(`created: ${vision.created.toISOString()}`);
    lines.push(`updated: ${vision.updated.toISOString()}`);
    lines.push("---");
    lines.push("");

    // Content
    lines.push("# Canonical Vision");
    lines.push("");

    lines.push("## Mission");
    lines.push(vision.mission);
    lines.push("");

    lines.push("## Principles");
    for (const principle of vision.principles) {
      lines.push(`- ${principle}`);
    }
    lines.push("");

    lines.push("## Strategic Goals");
    for (let i = 0; i < vision.strategicGoals.length; i++) {
      const goal = vision.strategicGoals[i];
      const deadline = goal.deadline
        ? `, Deadline: ${goal.deadline.toISOString().split("T")[0]}`
        : "";
      lines.push(
        `${i + 1}. [${goal.title}] - Priority: ${goal.priority}${deadline}`,
      );
      if (goal.description) {
        lines.push(`   ${goal.description}`);
      }
    }
    lines.push("");

    lines.push("## Current Focus");
    lines.push(vision.currentFocus);
    lines.push("");

    lines.push("## Success Metrics");
    for (const [key, value] of Object.entries(vision.successMetrics)) {
      lines.push(`- ${key}: ${value}`);
    }
    lines.push("");

    return lines.join("\n");
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
    goals: any[],
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
      const events = JSON.parse(content);

      // Parse dates
      this.events = events.map((e: any) => ({
        ...e,
        timestamp: new Date(e.timestamp),
      }));

      logger.info(`Loaded ${this.events.length} vision events`);
    } catch (error) {
      if ((error as any).code === "ENOENT") {
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
