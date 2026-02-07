/**
 * Vision Serializer
 * Converts vision data to markdown format
 */

import * as crypto from "crypto";
import { CanonicalVision, Priority } from "../../types/vision";
import { VisionEvent } from "../../types/vision";

/**
 * Convert vision to markdown
 */
export function visionToMarkdown(vision: CanonicalVision): string {
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
 * Create default vision
 */
export function createDefaultVision(): CanonicalVision {
  return {
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
        priority: Priority.CRITICAL,
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
        priority: Priority.HIGH,
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
}
