/**
 * Init Service Types
 * Type definitions and schemas for initialization
 */

import { z } from "zod";

/**
 * Supported project types
 */
export type ProjectType =
  | "react"
  | "node"
  | "python"
  | "rust"
  | "go"
  | "fullstack"
  | "unknown";

/**
 * Existing setup status
 */
export interface ExistingSetup {
  hasForge: boolean;
  hasClaudeMd: boolean;
  claudeMdContent: string;
  hasGovernance: boolean;
  hasAgents: boolean;
  agentCount: number;
}

/**
 * Project detection result
 */
export interface ProjectDetection {
  projectType: ProjectType;
  hasPackageJson: boolean;
  hasRequirementsTxt: boolean;
  hasCargoToml: boolean;
  hasGoMod: boolean;
  hasTsConfig: boolean;
  hasViteConfig: boolean;
  detectedFrameworks: string[];
}

/**
 * Initialization options
 */
export interface InitOptions {
  directive: string;
  goals?: string[];
  projectType?: ProjectType;
  claudeMdOption?: "generate" | "merge" | "skip";
  forceOverwrite?: boolean;
}

/**
 * Initialization result
 */
export interface InitResult {
  success: boolean;
  created: string[];
  projectType: ProjectType;
  agentsCopied: string[];
  message: string;
}

/**
 * Governance constitution structure
 */
export interface GovernanceConstitution {
  directive: string;
  vision: string[];
  status: string;
  confidence: number;
  updatedBy: string;
  updatedAt: string;
}

export const MAX_DIRECTIVE_LENGTH = 2000;
export const MAX_GOAL_LENGTH = 500;
export const MAX_GOALS_COUNT = 50;

/**
 * Map a projectType input onto a compile-time literal ProjectType constant.
 * Prevents untrusted strings from flowing directly into generated config or
 * instruction files (CodeQL js/http-to-file-access).
 */
export function canonicalizeProjectType(value: string): ProjectType {
  switch (value) {
    case "react":
      return "react";
    case "node":
      return "node";
    case "python":
      return "python";
    case "rust":
      return "rust";
    case "go":
      return "go";
    case "fullstack":
      return "fullstack";
    case "unknown":
      return "unknown";
    default:
      throw new Error(`Unsupported project type: ${String(value).slice(0, 40)}`);
  }
}

/**
 * Strip NUL bytes and non-printable ASCII control characters (preserving
 * tabs and newlines) and cap length before writing user text to disk.
 */
export function sanitizeInitText(value: string, maxLength: number): string {
  let out = "";
  const limit = Math.min(value.length, maxLength);
  for (let i = 0; i < value.length && out.length < limit; i++) {
    const code = value.charCodeAt(i);
    if (code === 9 || code === 10 || code === 13 || (code >= 32 && code !== 127)) {
      out += value[i];
    }
  }
  return out;
}

/**
 * Validation schemas
 */
export const InitOptionsSchema = z.object({
  directive: z
    .string()
    .min(5, "Directive must be at least 5 characters")
    .max(MAX_DIRECTIVE_LENGTH, `Directive must be at most ${MAX_DIRECTIVE_LENGTH} characters`),
  goals: z.array(z.string().max(MAX_GOAL_LENGTH)).max(MAX_GOALS_COUNT).optional(),
  projectType: z
    .enum(["react", "node", "python", "rust", "go", "fullstack", "unknown"])
    .optional(),
  claudeMdOption: z.enum(["generate", "merge", "skip"]).optional(),
  forceOverwrite: z.boolean().optional(),
});
