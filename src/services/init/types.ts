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

/**
 * Validation schemas
 */
export const InitOptionsSchema = z.object({
  directive: z.string().min(5, "Directive must be at least 5 characters"),
  goals: z.array(z.string()).optional(),
  projectType: z
    .enum(["react", "node", "python", "rust", "go", "fullstack", "unknown"])
    .optional(),
  claudeMdOption: z.enum(["generate", "merge", "skip"]).optional(),
  forceOverwrite: z.boolean().optional(),
});
