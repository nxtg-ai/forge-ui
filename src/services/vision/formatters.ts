/**
 * Vision Service - Markdown Formatting Utilities
 */

import * as yaml from "js-yaml";
import { VisionData, Goal, Metric, EngagementMode } from "../../components/types";
import {
  CanonicalVision,
  StrategicGoal,
} from "../../types/vision";
import { VisionFile, parseMarkdownSections } from "./parsers";

/**
 * Format vision as markdown
 */
export function formatVisionAsMarkdown(vision: VisionData): string {
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
  vision.constraints.forEach((constraint) => sections.push(`- ${constraint}`));
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
 * Parse VisionData from file
 */
export function parseVisionFromFile(file: VisionFile): VisionData {
  const { frontmatter, content } = file;

  // Parse content sections
  const sections = parseMarkdownSections(content);

  const mission = sections.mission || frontmatter.mission || "";
  const goals = sections.goals || frontmatter.goals || [];
  const constraints = sections.constraints || frontmatter.constraints || [];
  const metrics = sections.metrics || frontmatter.successMetrics || [];
  const timeframe = sections.timeframe || frontmatter.timeframe || "";

  return {
    mission: typeof mission === "string" ? mission : String(mission),
    goals: Array.isArray(goals) ? (goals as string[]) : [String(goals)],
    constraints: Array.isArray(constraints)
      ? (constraints as string[])
      : [String(constraints)],
    successMetrics: Array.isArray(metrics)
      ? (metrics as string[])
      : [String(metrics)],
    timeframe: typeof timeframe === "string" ? timeframe : String(timeframe),
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
 * Create canonical vision from VisionData
 */
export function createCanonicalFromVisionData(
  vision: VisionData,
): CanonicalVision {
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
              : (g.status as
                  | "not-started"
                  | "in-progress"
                  | "completed"
                  | "blocked"),
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
export function updateCanonicalFromVisionData(
  canonical: CanonicalVision,
  vision: VisionData,
): CanonicalVision {
  return {
    ...canonical,
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
 * Prepare YAML frontmatter for vision file
 */
export function prepareVisionFrontmatter(vision: VisionData): string {
  const frontmatter = {
    title: "Canonical Vision",
    version: vision.version ?? 1,
    created: vision.createdAt ?? new Date(),
    updated: vision.lastUpdated ?? new Date(),
    engagementMode: vision.engagementMode,
    tags: ["vision", "canonical", "forge"],
  };

  return yaml.dump(frontmatter);
}

/**
 * Generate alignment suggestions
 */
export function generateAlignmentSuggestions(
  decision: string,
  visionData: VisionData,
): string[] {
  const suggestions: string[] = [];

  suggestions.push(
    `Consider how this aligns with the mission: ${visionData.mission}`,
  );
  suggestions.push(
    "Review the strategic goals and ensure this decision supports them",
  );
  suggestions.push("Check for any constraint violations before proceeding");

  return suggestions;
}
