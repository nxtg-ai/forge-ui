/**
 * Memory Service
 * Persists context memory to file system with governance integration
 */

import * as fs from "fs/promises";
import * as path from "path";
import { z } from "zod";
import { BaseService } from "./base-service";
import { Result, IntegrationError } from "../utils/result";

/**
 * Memory item schema
 */
export const MemoryItemSchema = z.object({
  id: z.string(),
  content: z.string(),
  category: z.enum(["decision", "learning", "pattern", "context", "other"]),
  tags: z.array(z.string()),
  created: z.string(),
  updated: z.string(),
  confidence: z.number().min(0).max(100).optional(),
  references: z.array(z.string()).optional(),
});

export type MemoryItem = z.infer<typeof MemoryItemSchema>;

/**
 * Memory file entry with frontmatter
 */
interface MemoryEntry {
  id: string;
  content: string;
  category: MemoryItem["category"];
  tags: string[];
  created: string;
  updated: string;
  confidence?: number;
  references?: string[];
}

/**
 * Memory Service Configuration
 */
export interface MemoryServiceConfig {
  projectRoot: string;
}

/**
 * Memory Service
 * Manages persistent context memory stored in .claude/forge/memory/
 */
export class MemoryService extends BaseService {
  private projectRoot: string;
  private memoryDir: string;
  private decisionsFile: string;
  private learningsFile: string;
  private patternsFile: string;
  private snapshotsDir: string;

  constructor(config: MemoryServiceConfig) {
    super({ name: "memory-service" });
    this.projectRoot = config.projectRoot;
    this.memoryDir = path.join(this.projectRoot, ".claude/forge/memory");
    this.decisionsFile = path.join(this.memoryDir, "decisions.md");
    this.learningsFile = path.join(this.memoryDir, "learnings.md");
    this.patternsFile = path.join(this.memoryDir, "patterns.md");
    this.snapshotsDir = path.join(this.memoryDir, "context-snapshots");
  }

  protected async performInitialization(): Promise<void> {
    // Ensure memory directory structure exists
    await fs.mkdir(this.memoryDir, { recursive: true });
    await fs.mkdir(this.snapshotsDir, { recursive: true });

    // Initialize empty files if they don't exist
    await this.ensureFile(this.decisionsFile, "# Memory: Decisions\n\nKey architectural and strategic decisions with rationale.\n\n---\n");
    await this.ensureFile(this.learningsFile, "# Memory: Learnings\n\nAccumulated project knowledge from mistakes, discoveries, and insights.\n\n---\n");
    await this.ensureFile(this.patternsFile, "# Memory: Patterns\n\nDiscovered conventions, patterns, and best practices for this codebase.\n\n---\n");
  }

  protected async performDisposal(): Promise<void> {
    // No active resources to clean up
  }

  /**
   * Ensure a file exists with default content
   */
  private async ensureFile(filePath: string, defaultContent: string): Promise<void> {
    try {
      await fs.access(filePath);
    } catch {
      await fs.writeFile(filePath, defaultContent, "utf-8");
    }
  }

  /**
   * Read all memory items from file system
   */
  async readMemory(): Promise<Result<MemoryItem[], IntegrationError>> {
    try {
      const [decisions, learnings, patterns] = await Promise.all([
        this.readMemoryFile(this.decisionsFile, "decision"),
        this.readMemoryFile(this.learningsFile, "learning"),
        this.readMemoryFile(this.patternsFile, "pattern"),
      ]);

      const allItems = [
        ...decisions.unwrap(),
        ...learnings.unwrap(),
        ...patterns.unwrap(),
      ];

      return Result.ok(allItems);
    } catch (error) {
      return Result.err(
        new IntegrationError(
          error instanceof Error ? error.message : "Failed to read memory",
          "READ_ERROR",
        ),
      );
    }
  }

  /**
   * Read memory items from a specific file
   */
  private async readMemoryFile(
    filePath: string,
    category: "decision" | "learning" | "pattern",
  ): Promise<Result<MemoryItem[], IntegrationError>> {
    try {
      const content = await fs.readFile(filePath, "utf-8");
      const items = this.parseMemoryFile(content, category);
      return Result.ok(items);
    } catch (error) {
      // If file doesn't exist, return empty array
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return Result.ok([]);
      }
      return Result.err(
        new IntegrationError(
          error instanceof Error ? error.message : "Failed to read memory file",
          "READ_ERROR",
        ),
      );
    }
  }

  /**
   * Parse memory file content into MemoryItems
   */
  private parseMemoryFile(content: string, defaultCategory: "decision" | "learning" | "pattern"): MemoryItem[] {
    const items: MemoryItem[] = [];

    // Split by entry separator (---)
    const sections = content.split(/\n---\n/).slice(1); // Skip header

    for (const section of sections) {
      if (!section.trim()) continue;

      // Parse frontmatter and content
      const frontmatterMatch = section.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

      if (frontmatterMatch) {
        const [, frontmatter, body] = frontmatterMatch;
        const entry = this.parseFrontmatter(frontmatter);

        items.push({
          id: entry.id || crypto.randomUUID(),
          content: body.trim(),
          category: entry.category || defaultCategory,
          tags: entry.tags || [],
          created: entry.created || new Date().toISOString(),
          updated: entry.updated || new Date().toISOString(),
          confidence: entry.confidence,
          references: entry.references,
        });
      }
    }

    return items;
  }

  /**
   * Parse YAML-like frontmatter
   */
  private parseFrontmatter(frontmatter: string): Partial<MemoryEntry> {
    const lines = frontmatter.split("\n");
    const entry: Partial<MemoryEntry> = {};

    for (const line of lines) {
      const [key, ...valueParts] = line.split(":");
      if (!key || !valueParts.length) continue;

      const value = valueParts.join(":").trim();
      const trimmedKey = key.trim();

      switch (trimmedKey) {
        case "id":
          entry.id = value;
          break;
        case "type":
        case "category":
          if (value === "decision" || value === "learning" || value === "pattern") {
            entry.category = value;
          }
          break;
        case "created":
          entry.created = value;
          break;
        case "updated":
          entry.updated = value;
          break;
        case "confidence":
          entry.confidence = parseInt(value, 10);
          break;
        case "tags":
          entry.tags = value.split(",").map(t => t.trim());
          break;
        case "references":
          entry.references = value.split(",").map(r => r.trim());
          break;
      }
    }

    return entry;
  }

  /**
   * Write a memory item to the appropriate file
   */
  async writeMemory(item: MemoryItem): Promise<Result<void, IntegrationError>> {
    const validation = this.validate(item, MemoryItemSchema);
    if (!validation.isOk()) {
      return Result.err(
        new IntegrationError(
          "Invalid memory item",
          "VALIDATION_ERROR",
          { errors: validation.unwrapErr() },
        ),
      );
    }

    try {
      const targetFile = this.getTargetFile(item.category);
      const entry = this.formatMemoryEntry(item);

      // Append to file
      await fs.appendFile(targetFile, `\n${entry}\n`, "utf-8");

      return Result.ok(undefined);
    } catch (error) {
      return Result.err(
        new IntegrationError(
          error instanceof Error ? error.message : "Failed to write memory",
          "WRITE_ERROR",
        ),
      );
    }
  }

  /**
   * Update an existing memory item
   */
  async updateMemory(item: MemoryItem): Promise<Result<void, IntegrationError>> {
    try {
      // Read all items from the category file
      const targetFile = this.getTargetFile(item.category);
      const result = await this.readMemoryFile(targetFile, item.category as "decision" | "learning" | "pattern");

      if (!result.isOk()) {
        return result as Result<void, IntegrationError>;
      }

      const items = result.unwrap();

      // Find and replace the item
      const index = items.findIndex(i => i.id === item.id);
      if (index === -1) {
        return Result.err(
          new IntegrationError(
            `Memory item not found: ${item.id}`,
            "NOT_FOUND",
          ),
        );
      }

      items[index] = { ...item, updated: new Date().toISOString() };

      // Rewrite the entire file
      await this.rewriteMemoryFile(targetFile, items, item.category as "decision" | "learning" | "pattern");

      return Result.ok(undefined);
    } catch (error) {
      return Result.err(
        new IntegrationError(
          error instanceof Error ? error.message : "Failed to update memory",
          "UPDATE_ERROR",
        ),
      );
    }
  }

  /**
   * Delete a memory item
   */
  async deleteMemory(id: string, category: MemoryItem["category"]): Promise<Result<void, IntegrationError>> {
    try {
      const targetFile = this.getTargetFile(category);
      const result = await this.readMemoryFile(targetFile, category as "decision" | "learning" | "pattern");

      if (!result.isOk()) {
        return result as Result<void, IntegrationError>;
      }

      const items = result.unwrap().filter(i => i.id !== id);

      // Rewrite the entire file
      await this.rewriteMemoryFile(targetFile, items, category as "decision" | "learning" | "pattern");

      return Result.ok(undefined);
    } catch (error) {
      return Result.err(
        new IntegrationError(
          error instanceof Error ? error.message : "Failed to delete memory",
          "DELETE_ERROR",
        ),
      );
    }
  }

  /**
   * Rewrite entire memory file with items
   */
  private async rewriteMemoryFile(
    filePath: string,
    items: MemoryItem[],
    category: "decision" | "learning" | "pattern",
  ): Promise<void> {
    const header = category === "decision"
      ? "# Memory: Decisions\n\nKey architectural and strategic decisions with rationale.\n\n---\n"
      : category === "learning"
      ? "# Memory: Learnings\n\nAccumulated project knowledge from mistakes, discoveries, and insights.\n\n---\n"
      : "# Memory: Patterns\n\nDiscovered conventions, patterns, and best practices for this codebase.\n\n---\n";

    const entries = items.map(item => this.formatMemoryEntry(item)).join("\n");

    await fs.writeFile(filePath, header + entries, "utf-8");
  }

  /**
   * Format memory item as file entry with frontmatter
   */
  private formatMemoryEntry(item: MemoryItem): string {
    const lines = [
      "---",
      `id: ${item.id}`,
      `type: ${item.category}`,
      `created: ${item.created}`,
      `updated: ${item.updated}`,
      `tags: ${item.tags.join(", ")}`,
    ];

    if (item.confidence !== undefined) {
      lines.push(`confidence: ${item.confidence}`);
    }

    if (item.references && item.references.length > 0) {
      lines.push(`references: ${item.references.join(", ")}`);
    }

    lines.push("---");
    lines.push("");
    lines.push(item.content);

    return lines.join("\n");
  }

  /**
   * Get target file path for a category
   */
  private getTargetFile(category: MemoryItem["category"]): string {
    switch (category) {
      case "decision":
        return this.decisionsFile;
      case "learning":
        return this.learningsFile;
      case "pattern":
        return this.patternsFile;
      case "context":
      case "other":
        // Default to learnings for generic items
        return this.learningsFile;
    }
  }

  /**
   * Export memory in format ready for Claude context
   */
  async exportForContext(): Promise<Result<string, IntegrationError>> {
    const result = await this.readMemory();

    if (!result.isOk()) {
      return Result.err(result.unwrapErr());
    }

    const items = result.unwrap();

    // Group by category
    const decisions = items.filter(i => i.category === "decision");
    const learnings = items.filter(i => i.category === "learning");
    const patterns = items.filter(i => i.category === "pattern");
    const contexts = items.filter(i => i.category === "context" || i.category === "other");

    const sections: string[] = [
      "# NXTG-Forge Context Memory",
      "",
      "This is accumulated knowledge from previous sessions.",
      "",
    ];

    if (decisions.length > 0) {
      sections.push("## Key Decisions", "");
      decisions.forEach(d => {
        sections.push(`- ${d.content}`);
        if (d.tags.length > 0) {
          sections.push(`  Tags: ${d.tags.join(", ")}`);
        }
      });
      sections.push("");
    }

    if (learnings.length > 0) {
      sections.push("## Learnings", "");
      learnings.forEach(l => {
        sections.push(`- ${l.content}`);
        if (l.tags.length > 0) {
          sections.push(`  Tags: ${l.tags.join(", ")}`);
        }
      });
      sections.push("");
    }

    if (patterns.length > 0) {
      sections.push("## Patterns & Conventions", "");
      patterns.forEach(p => {
        sections.push(`- ${p.content}`);
        if (p.tags.length > 0) {
          sections.push(`  Tags: ${p.tags.join(", ")}`);
        }
      });
      sections.push("");
    }

    if (contexts.length > 0) {
      sections.push("## Context Notes", "");
      contexts.forEach(c => {
        sections.push(`- ${c.content}`);
        if (c.tags.length > 0) {
          sections.push(`  Tags: ${c.tags.join(", ")}`);
        }
      });
      sections.push("");
    }

    return Result.ok(sections.join("\n"));
  }

  /**
   * Create a point-in-time context snapshot
   */
  async createSnapshot(name?: string): Promise<Result<string, IntegrationError>> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const snapshotName = name || `snapshot-${timestamp}`;
      const snapshotFile = path.join(this.snapshotsDir, `${snapshotName}.md`);

      const contextResult = await this.exportForContext();

      if (!contextResult.isOk()) {
        return Result.err(contextResult.unwrapErr());
      }

      const content = [
        `# Context Snapshot: ${snapshotName}`,
        "",
        `Created: ${new Date().toISOString()}`,
        "",
        "---",
        "",
        contextResult.unwrap(),
      ].join("\n");

      await fs.writeFile(snapshotFile, content, "utf-8");

      return Result.ok(snapshotFile);
    } catch (error) {
      return Result.err(
        new IntegrationError(
          error instanceof Error ? error.message : "Failed to create snapshot",
          "SNAPSHOT_ERROR",
        ),
      );
    }
  }

  /**
   * Sync memory event to governance.json
   */
  async syncToGovernance(
    eventType: "memory.created" | "memory.updated" | "memory.deleted" | "memory.snapshot",
    details: Record<string, unknown>,
  ): Promise<Result<void, IntegrationError>> {
    try {
      const governancePath = path.join(this.projectRoot, ".claude/governance.json");

      // Read current governance state
      const data = await fs.readFile(governancePath, "utf-8");
      const governance = JSON.parse(data);

      // Add to sentinel log
      const logEntry = {
        id: `log-${Date.now()}`,
        timestamp: Date.now(),
        type: "INFO",
        severity: "low",
        category: "memory",
        source: "memory-service",
        message: this.getEventMessage(eventType, details),
        context: details,
        actionRequired: false,
      };

      governance.sentinelLog = governance.sentinelLog || [];
      governance.sentinelLog.push(logEntry);

      // Write back
      await fs.writeFile(
        governancePath,
        JSON.stringify(governance, null, 2),
        "utf-8",
      );

      return Result.ok(undefined);
    } catch (error) {
      // Don't fail the operation if governance sync fails
      console.warn("Failed to sync to governance:", error);
      return Result.ok(undefined);
    }
  }

  /**
   * Get human-readable message for event type
   */
  private getEventMessage(
    eventType: string,
    details: Record<string, unknown>,
  ): string {
    switch (eventType) {
      case "memory.created":
        return `Memory item created: ${details.category} - "${details.content}"`;
      case "memory.updated":
        return `Memory item updated: ${details.id}`;
      case "memory.deleted":
        return `Memory item deleted: ${details.id}`;
      case "memory.snapshot":
        return `Context snapshot created: ${details.name}`;
      default:
        return `Memory event: ${eventType}`;
    }
  }
}
