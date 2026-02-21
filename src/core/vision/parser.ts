/**
 * Vision Parser
 * Extracts vision data from markdown format
 */

import * as crypto from "crypto";
import { CanonicalVision, StrategicGoal, Priority } from "../../types/vision";

// Vision file metadata
export interface VisionFileMetadata {
  version: string;
  created: string;
  updated: string;
}

// Vision file content
export interface VisionFile {
  metadata: VisionFileMetadata;
  content: string;
}

/**
 * Parse vision file with YAML frontmatter
 */
export function parseVisionFile(content: string): VisionFile {
  const lines = content.split("\n");
  let inFrontmatter = false;
  const frontmatterLines: string[] = [];
  const contentLines: string[] = [];
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
export function extractVisionFromMarkdown(
  visionFile: VisionFile,
): CanonicalVision {
  const content = visionFile.content;
  const sections = parseMarkdownSections(content);

  const vision: CanonicalVision = {
    version: visionFile.metadata.version,
    created: new Date(visionFile.metadata.created),
    updated: new Date(visionFile.metadata.updated),
    mission: sections["mission"] || "",
    principles: parseList(sections["principles"] || ""),
    strategicGoals: parseStrategicGoals(sections["strategic goals"] || ""),
    currentFocus: sections["current focus"] || "",
    successMetrics: parseMetrics(sections["success metrics"] || ""),
    metadata: {},
  };

  return vision;
}

/**
 * Parse markdown into sections
 */
export function parseMarkdownSections(
  content: string,
): Record<string, string> {
  const sections: Record<string, string> = {};
  const lines = content.split("\n");
  let currentSection = "";
  let sectionContent: string[] = [];

  for (const line of lines) {
    if (line.startsWith("## ")) {
      // Save previous section
      if (currentSection) {
        sections[currentSection.toLowerCase()] = sectionContent.join("\n").trim();
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
export function parseList(content: string): string[] {
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
export function parseStrategicGoals(content: string): StrategicGoal[] {
  const lines = content.split("\n");
  const goals: StrategicGoal[] = [];
  let currentGoal: Partial<StrategicGoal> | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // Parse goal line (e.g., "1. [Goal Title] - Priority: High, Deadline: Q1 2026")
    const goalMatch = trimmed.match(/^\d+\.\s+\[([^\]]+)\](.*)$/);
    if (goalMatch) {
      if (currentGoal && isCompleteGoal(currentGoal)) {
        goals.push(currentGoal as StrategicGoal);
      }

      currentGoal = {
        id: crypto.randomBytes(8).toString("hex"),
        title: goalMatch[1],
        description: "",
        priority: Priority.MEDIUM,
        status: "not-started",
        progress: 0,
        metrics: [],
      };

      // Parse metadata from the rest of the line
      const metadata = goalMatch[2];
      const priorityMatch = metadata.match(/Priority:\s*(\w+)/i);
      const deadlineMatch = metadata.match(/Deadline:\s*([^,]+)/i);

      if (priorityMatch) {
        const priorityStr = priorityMatch[1].toLowerCase();
        if (priorityStr in Priority) {
          currentGoal.priority =
            Priority[priorityStr.toUpperCase() as keyof typeof Priority];
        }
      }
      if (deadlineMatch) {
        currentGoal.deadline = new Date(deadlineMatch[1]);
      }
    } else if (currentGoal && trimmed) {
      // Add to description
      currentGoal.description =
        (currentGoal.description || "") +
        (currentGoal.description ? " " : "") +
        trimmed;
    }
  }

  if (currentGoal && isCompleteGoal(currentGoal)) {
    goals.push(currentGoal as StrategicGoal);
  }
  return goals;
}

/**
 * Check if parsed goal has all required fields
 */
function isCompleteGoal(goal: Partial<StrategicGoal>): goal is StrategicGoal {
  return !!(
    goal.id &&
    goal.title &&
    goal.description !== undefined &&
    goal.priority &&
    goal.status &&
    goal.progress !== undefined &&
    goal.metrics
  );
}

/**
 * Parse success metrics
 */
export function parseMetrics(content: string): Record<string, string | number> {
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
