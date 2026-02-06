/**
 * Vision Service
 * Manage canonical vision and vision capture functionality
 */

import { promises as fs } from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import { z } from "zod";
import { BaseService, ServiceConfig } from "./base-service";
import { Result, IntegrationError, ValidationError } from "../utils/result";
import { getLogger } from "../utils/logger";

const logger = getLogger("vision-service");
import { VisionData, Goal, Metric, EngagementMode } from "../components/types";
import {
  CanonicalVision,
  StrategicGoal,
  AlignmentResult,
} from "../types/vision";

/**
 * Vision file format
 */
interface VisionFile {
  frontmatter: Record<string, unknown>;
  content: string;
}

/**
 * Vision update event
 */
export interface VisionUpdateEvent {
  type:
    | "created"
    | "updated"
    | "goal-added"
    | "goal-completed"
    | "focus-changed";
  timestamp: Date;
  data: Partial<VisionData>;
  actor: string;
}

/**
 * Vision capture data
 */
export interface VisionCaptureData {
  capturedAt: Date;
  capturedBy: string;
  engagementMode: EngagementMode;
  vision: VisionData;
  notes?: string;
  tags?: string[];
}

/**
 * Vision alignment check
 */
export interface AlignmentCheck {
  decision: string;
  aligned: boolean;
  score: number;
  violations?: string[];
  suggestions?: string[];
}

/**
 * Vision Service configuration
 */
export interface VisionServiceConfig extends ServiceConfig {
  visionPath?: string;
  capturesPath?: string;
  autoSave?: boolean;
  validateOnSave?: boolean;
}

/**
 * Vision management service
 */
export class VisionService extends BaseService {
  private canonicalVision: CanonicalVision | null = null;
  private visionData: VisionData | null = null;
  private captures: VisionCaptureData[] = [];
  private visionHistory: VisionUpdateEvent[] = [];

  constructor(config: VisionServiceConfig = { name: "VisionService" }) {
    super(config);

    this.config = {
      visionPath: ".claude/VISION.md",
      capturesPath: ".claude/vision-captures",
      autoSave: true,
      validateOnSave: true,
      ...config,
    };
  }

  /**
   * Perform service initialization
   */
  protected async performInitialization(): Promise<void> {
    // Load canonical vision
    const loadResult = await this.loadCanonicalVision();
    if (loadResult.isErr()) {
      // Create default vision if none exists
      await this.createDefaultVision();
    }

    // Load vision captures
    await this.loadVisionCaptures();
  }

  /**
   * Perform service cleanup
   */
  protected async performDisposal(): Promise<void> {
    // Save any pending changes
    const config = this.config as VisionServiceConfig;
    if (config.autoSave && this.visionData) {
      await this.saveVision(this.visionData);
    }

    this.canonicalVision = null;
    this.visionData = null;
    this.captures = [];
    this.visionHistory = [];
  }

  /**
   * Get current vision data
   */
  getVision(): Result<VisionData, IntegrationError> {
    if (!this.visionData) {
      return Result.err(
        new IntegrationError("No vision data available", "NO_VISION"),
      );
    }
    return Result.ok(this.visionData);
  }

  /**
   * Get canonical vision
   */
  getCanonicalVision(): Result<CanonicalVision, IntegrationError> {
    if (!this.canonicalVision) {
      return Result.err(
        new IntegrationError(
          "No canonical vision available",
          "NO_CANONICAL_VISION",
        ),
      );
    }
    return Result.ok(this.canonicalVision);
  }

  /**
   * Update vision data
   */
  async updateVision(
    update: Partial<VisionData>,
    actor = "system",
  ): Promise<Result<VisionData, IntegrationError>> {
    try {
      // Merge with existing vision
      const newVision: VisionData = this.visionData
        ? { ...this.visionData, ...update, lastUpdated: new Date() }
        : {
            mission: update.mission ?? "",
            goals: update.goals ?? [],
            constraints: update.constraints ?? [],
            successMetrics: update.successMetrics ?? [],
            timeframe: update.timeframe ?? "",
            engagementMode: update.engagementMode,
            lastUpdated: new Date(),
            version: 1,
            ...update,
          };

      // Validate if configured
      const config = this.config as VisionServiceConfig;
      if (config.validateOnSave) {
        const validationResult = this.validateVision(newVision);
        if (validationResult.isErr()) {
          return Result.err(validationResult.error);
        }
      }

      // Update internal state
      this.visionData = newVision;

      // Record update event
      const event: VisionUpdateEvent = {
        type: "updated",
        timestamp: new Date(),
        data: update,
        actor,
      };
      this.visionHistory.push(event);
      this.emit("visionUpdate", event);

      // Auto-save if configured
      if (config.autoSave) {
        await this.saveVision(newVision);
      }

      // Update canonical vision
      if (this.canonicalVision) {
        this.updateCanonicalFromVisionData(newVision);
      }

      return Result.ok(newVision);
    } catch (error) {
      return Result.err(
        new IntegrationError(
          `Failed to update vision: ${error instanceof Error ? error.message : String(error)}`,
          "UPDATE_ERROR",
        ),
      );
    }
  }

  /**
   * Save vision to file
   */
  async saveVision(
    vision: VisionData,
  ): Promise<Result<void, IntegrationError>> {
    try {
      const config = this.config as VisionServiceConfig;
      const visionPath = path.resolve(config.visionPath!);

      // Prepare YAML frontmatter
      const frontmatter = {
        title: "Canonical Vision",
        version: vision.version ?? 1,
        created: vision.createdAt ?? new Date(),
        updated: vision.lastUpdated ?? new Date(),
        engagementMode: vision.engagementMode,
        tags: ["vision", "canonical", "forge"],
      };

      // Prepare markdown content
      const content = this.formatVisionAsMarkdown(vision);

      // Combine frontmatter and content
      const fileContent = `---\n${yaml.dump(frontmatter)}---\n\n${content}`;

      // Ensure directory exists
      await fs.mkdir(path.dirname(visionPath), { recursive: true });

      // Write file
      await fs.writeFile(visionPath, fileContent, "utf-8");

      this.emit("visionSaved", { path: visionPath, vision });
      return Result.ok(undefined);
    } catch (error) {
      return Result.err(
        new IntegrationError(
          `Failed to save vision: ${error instanceof Error ? error.message : String(error)}`,
          "SAVE_ERROR",
        ),
      );
    }
  }

  /**
   * Load canonical vision from file
   */
  async loadCanonicalVision(): Promise<
    Result<CanonicalVision, IntegrationError>
  > {
    try {
      const config = this.config as VisionServiceConfig;
      const visionPath = path.resolve(config.visionPath!);

      // Check if file exists
      try {
        await fs.access(visionPath);
      } catch {
        return Result.err(
          new IntegrationError("Vision file not found", "FILE_NOT_FOUND"),
        );
      }

      // Read file
      const fileContent = await fs.readFile(visionPath, "utf-8");

      // Parse YAML frontmatter
      const visionFile = this.parseVisionFile(fileContent);

      // Convert to VisionData
      this.visionData = this.parseVisionFromFile(visionFile);

      // Create canonical vision
      this.canonicalVision = this.createCanonicalFromVisionData(
        this.visionData,
      );

      this.emit("visionLoaded", this.visionData);
      return Result.ok(this.canonicalVision);
    } catch (error) {
      return Result.err(
        new IntegrationError(
          `Failed to load vision: ${error instanceof Error ? error.message : String(error)}`,
          "LOAD_ERROR",
        ),
      );
    }
  }

  /**
   * Capture current vision state
   */
  async captureVision(
    data: VisionCaptureData,
  ): Promise<Result<void, IntegrationError>> {
    try {
      const config = this.config as VisionServiceConfig;
      const capturesPath = path.resolve(config.capturesPath!);

      // Generate filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `vision-capture-${timestamp}.yaml`;
      const filePath = path.join(capturesPath, filename);

      // Ensure directory exists
      await fs.mkdir(capturesPath, { recursive: true });

      // Save capture
      const captureContent = yaml.dump(data);
      await fs.writeFile(filePath, captureContent, "utf-8");

      // Add to captures list
      this.captures.push(data);

      this.emit("visionCaptured", data);
      return Result.ok(undefined);
    } catch (error) {
      return Result.err(
        new IntegrationError(
          `Failed to capture vision: ${error instanceof Error ? error.message : String(error)}`,
          "CAPTURE_ERROR",
        ),
      );
    }
  }

  /**
   * Load vision captures
   */
  async loadVisionCaptures(): Promise<
    Result<VisionCaptureData[], IntegrationError>
  > {
    try {
      const config = this.config as VisionServiceConfig;
      const capturesPath = path.resolve(config.capturesPath!);

      // Check if directory exists
      try {
        await fs.access(capturesPath);
      } catch {
        // Directory doesn't exist, no captures yet
        return Result.ok([]);
      }

      // Read all YAML files
      const files = await fs.readdir(capturesPath);
      const yamlFiles = files.filter(
        (f) => f.endsWith(".yaml") || f.endsWith(".yml"),
      );

      const captures: VisionCaptureData[] = [];

      for (const file of yamlFiles) {
        try {
          const content = await fs.readFile(
            path.join(capturesPath, file),
            "utf-8",
          );
          const capture = yaml.load(content) as VisionCaptureData;
          captures.push(capture);
        } catch (error) {
          logger.error(`Failed to load capture ${file}: ${error}`);
        }
      }

      // Sort by capture date
      captures.sort(
        (a, b) =>
          new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime(),
      );

      this.captures = captures;
      return Result.ok(captures);
    } catch (error) {
      return Result.err(
        new IntegrationError(
          `Failed to load captures: ${error instanceof Error ? error.message : String(error)}`,
          "LOAD_CAPTURES_ERROR",
        ),
      );
    }
  }

  /**
   * Get vision captures
   */
  getCaptures(limit?: number): VisionCaptureData[] {
    return limit ? this.captures.slice(0, limit) : this.captures;
  }

  /**
   * Check alignment with vision
   */
  checkAlignment(decision: string): Result<AlignmentCheck, IntegrationError> {
    if (!this.visionData) {
      return Result.err(
        new IntegrationError("No vision data for alignment check", "NO_VISION"),
      );
    }

    try {
      // Simple alignment scoring based on keywords
      const visionText =
        `${this.visionData.mission} ${this.visionData.goals.join(" ")}`.toLowerCase();
      const decisionText = decision.toLowerCase();

      // Check for constraint violations
      const violations: string[] = [];
      for (const constraint of this.visionData.constraints) {
        if (this.violatesConstraint(decisionText, constraint)) {
          violations.push(constraint);
        }
      }

      // Calculate alignment score
      const keywords = this.extractKeywords(visionText);
      const matches = keywords.filter((keyword) =>
        decisionText.includes(keyword),
      ).length;
      const score = keywords.length > 0 ? matches / keywords.length : 0;

      const aligned = score > 0.3 && violations.length === 0;

      const result: AlignmentCheck = {
        decision,
        aligned,
        score,
        violations: violations.length > 0 ? violations : undefined,
        suggestions: aligned
          ? undefined
          : this.generateAlignmentSuggestions(decision),
      };

      this.emit("alignmentChecked", result);
      return Result.ok(result);
    } catch (error) {
      return Result.err(
        new IntegrationError(
          `Alignment check failed: ${error instanceof Error ? error.message : String(error)}`,
          "ALIGNMENT_ERROR",
        ),
      );
    }
  }

  /**
   * Get vision history
   */
  getHistory(limit?: number): VisionUpdateEvent[] {
    return limit ? this.visionHistory.slice(-limit) : this.visionHistory;
  }

  /**
   * Create default vision
   */
  private async createDefaultVision(): Promise<void> {
    this.visionData = {
      mission: "Build exceptional software with AI-powered orchestration",
      goals: [
        "Maximize development velocity",
        "Ensure code quality and maintainability",
        "Automate repetitive tasks",
        "Enable seamless team collaboration",
      ],
      constraints: [
        "Maintain backward compatibility",
        "Ensure security best practices",
        "Follow SOLID principles",
        "Write comprehensive tests",
      ],
      successMetrics: [
        "Code coverage > 80%",
        "Build time < 5 minutes",
        "Zero critical security issues",
        "Developer satisfaction > 90%",
      ],
      timeframe: "6 months",
      engagementMode: "builder",
      createdAt: new Date(),
      lastUpdated: new Date(),
      version: 1,
    };

    this.canonicalVision = this.createCanonicalFromVisionData(this.visionData);

    // Auto-save default vision
    const config = this.config as VisionServiceConfig;
    if (config.autoSave) {
      await this.saveVision(this.visionData);
    }
  }

  /**
   * Parse vision file with YAML frontmatter
   */
  private parseVisionFile(content: string): VisionFile {
    const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);

    if (match) {
      return {
        frontmatter: yaml.load(match[1]) as Record<string, unknown>,
        content: match[2].trim(),
      };
    }

    return {
      frontmatter: {},
      content: content.trim(),
    };
  }

  /**
   * Parse VisionData from file
   */
  private parseVisionFromFile(file: VisionFile): VisionData {
    const { frontmatter, content } = file;

    // Parse content sections
    const sections = this.parseMarkdownSections(content);

    const mission = sections.mission || frontmatter.mission || "";
    const goals = sections.goals || frontmatter.goals || [];
    const constraints = sections.constraints || frontmatter.constraints || [];
    const metrics = sections.metrics || frontmatter.successMetrics || [];
    const timeframe = sections.timeframe || frontmatter.timeframe || "";

    return {
      mission: typeof mission === 'string' ? mission : String(mission),
      goals: Array.isArray(goals) ? goals as string[] : [String(goals)],
      constraints: Array.isArray(constraints) ? constraints as string[] : [String(constraints)],
      successMetrics: Array.isArray(metrics) ? metrics as string[] : [String(metrics)],
      timeframe: typeof timeframe === 'string' ? timeframe : String(timeframe),
      engagementMode:
        (frontmatter.engagementMode as EngagementMode) || "builder",
      createdAt: frontmatter.created
        ? new Date(frontmatter.created as string)
        : new Date(),
      lastUpdated: frontmatter.updated
        ? new Date(frontmatter.updated as string)
        : new Date(),
      version: (frontmatter.version as number) || 1,
    };
  }

  /**
   * Parse markdown sections
   */
  private parseMarkdownSections(content: string): Record<string, string | string[]> {
    const sections: Record<string, string | string[]> = {};
    const lines = content.split("\n");

    let currentSection = "";
    let sectionContent: string[] = [];

    for (const line of lines) {
      if (line.startsWith("## ")) {
        // Save previous section
        if (currentSection && sectionContent.length > 0) {
          sections[currentSection] = this.parseSectionContent(sectionContent);
        }

        // Start new section
        currentSection = line.substring(3).toLowerCase().replace(/\s+/g, "");
        sectionContent = [];
      } else if (currentSection) {
        sectionContent.push(line);
      }
    }

    // Save last section
    if (currentSection && sectionContent.length > 0) {
      sections[currentSection] = this.parseSectionContent(sectionContent);
    }

    return sections;
  }

  /**
   * Parse section content
   */
  private parseSectionContent(lines: string[]): string | string[] {
    const content = lines.join("\n").trim();

    // Check if it's a list
    if (content.includes("\n- ") || content.startsWith("- ")) {
      return content
        .split("\n")
        .filter((line) => line.startsWith("- "))
        .map((line) => line.substring(2).trim());
    }

    // Otherwise return as string
    return content;
  }

  /**
   * Format vision as markdown
   */
  private formatVisionAsMarkdown(vision: VisionData): string {
    const sections: string[] = [];

    sections.push("## Mission");
    sections.push(vision.mission);
    sections.push("");

    sections.push("## Goals");
    const goals =
      typeof vision.goals[0] === "string"
        ? (vision.goals as string[])
        : (vision.goals as Goal[]).map((g) => g.title);
    goals.forEach((goal) => sections.push(`- ${goal}`));
    sections.push("");

    sections.push("## Constraints");
    vision.constraints.forEach((constraint) =>
      sections.push(`- ${constraint}`),
    );
    sections.push("");

    sections.push("## Success Metrics");
    const metrics =
      typeof vision.successMetrics[0] === "string"
        ? (vision.successMetrics as string[])
        : (vision.successMetrics as Metric[]).map(
            (m) => `${m.name}: ${m.current}/${m.target} ${m.unit}`,
          );
    metrics.forEach((metric) => sections.push(`- ${metric}`));
    sections.push("");

    sections.push("## Timeframe");
    sections.push(vision.timeframe);

    return sections.join("\n");
  }

  /**
   * Create canonical vision from VisionData
   */
  private createCanonicalFromVisionData(vision: VisionData): CanonicalVision {
    const goals =
      typeof vision.goals[0] === "string"
        ? (vision.goals as string[]).map((g, i) => ({
            id: `goal-${i}`,
            title: g,
            description: g,
            priority: "medium" as const,
            metrics: [],
            status: "not-started" as const,
            progress: 0,
          }))
        : (vision.goals as Goal[]).map((g) => ({
            id: g.id,
            title: g.title,
            description: g.description,
            priority: "medium" as const,
            metrics: [],
            status:
              g.status === "pending"
                ? ("not-started" as const)
                : (g.status as "not-started" | "in-progress" | "completed" | "blocked"),
            progress: g.progress,
          }));

    return {
      version: String(vision.version ?? 1),
      created: vision.createdAt ?? new Date(),
      updated: vision.lastUpdated ?? new Date(),
      mission: vision.mission,
      principles: vision.constraints,
      strategicGoals: goals as StrategicGoal[],
      currentFocus: goals[0]?.title ?? "",
      successMetrics:
        typeof vision.successMetrics[0] === "string"
          ? (vision.successMetrics as string[]).reduce(
              (acc, m, i) => {
                acc[`metric-${i}`] = m;
                return acc;
              },
              {} as Record<string, string | number>,
            )
          : (vision.successMetrics as Metric[]).reduce(
              (acc, m) => {
                acc[m.name] = `${m.current}/${m.target} ${m.unit}`;
                return acc;
              },
              {} as Record<string, string | number>,
            ),
    };
  }

  /**
   * Update canonical vision from VisionData
   */
  private updateCanonicalFromVisionData(vision: VisionData): void {
    if (!this.canonicalVision) return;

    this.canonicalVision = {
      ...this.canonicalVision,
      updated: vision.lastUpdated ?? new Date(),
      mission: vision.mission,
      principles: vision.constraints,
      currentFocus:
        typeof vision.goals[0] === "string"
          ? (vision.goals[0] as string)
          : ((vision.goals[0] as Goal)?.title ?? ""),
    };
  }

  /**
   * Validate vision data
   */
  private validateVision(vision: VisionData): Result<void, IntegrationError> {
    const VisionDataSchema = z.object({
      mission: z.string().min(1),
      goals: z.array(z.union([z.string(), z.any()])).min(1),
      constraints: z.array(z.string()),
      successMetrics: z.array(z.union([z.string(), z.any()])),
      timeframe: z.string(),
      engagementMode: z
        .enum(["ceo", "vp", "engineer", "builder", "founder"])
        .optional(),
    });

    const result = this.validate(vision, VisionDataSchema);
    if (result.isErr()) {
      return Result.err(
        new IntegrationError(
          `Invalid vision data: ${result.error.message}`,
          "VALIDATION_ERROR",
          result.error.details,
        ),
      );
    }

    return Result.ok(undefined);
  }

  /**
   * Check if decision violates constraint
   */
  private violatesConstraint(decision: string, constraint: string): boolean {
    // Simple keyword-based violation check
    const constraintKeywords = this.extractKeywords(constraint.toLowerCase());
    const negativeWords = ["not", "no", "avoid", "prevent", "without"];

    for (const keyword of constraintKeywords) {
      if (negativeWords.some((neg) => constraint.toLowerCase().includes(neg))) {
        // Negative constraint - check if decision contains the keyword
        if (decision.includes(keyword)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Extract keywords from text
   */
  private extractKeywords(text: string): string[] {
    const stopWords = [
      "the",
      "a",
      "an",
      "and",
      "or",
      "but",
      "in",
      "on",
      "at",
      "to",
      "for",
    ];
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter((word) => word.length > 3 && !stopWords.includes(word));

    return [...new Set(words)];
  }

  /**
   * Generate alignment suggestions
   */
  private generateAlignmentSuggestions(decision: string): string[] {
    const suggestions: string[] = [];

    if (this.visionData) {
      suggestions.push(
        `Consider how this aligns with the mission: ${this.visionData.mission}`,
      );
      suggestions.push(
        "Review the strategic goals and ensure this decision supports them",
      );
      suggestions.push("Check for any constraint violations before proceeding");
    }

    return suggestions;
  }
}
