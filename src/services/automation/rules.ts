/**
 * Automation Service - Default Rules and Rule Management
 */

import { AutomatedAction } from "../../components/types";
import { AutomationRule, AutomationRuleContext } from "../automation-service";

/**
 * Get default automation rules
 */
export function getDefaultRules(): AutomationRule[] {
  return [
    // Test failure auto-fix rule
    {
      id: "auto-fix-tests",
      name: "Auto-fix failing tests",
      description: "Automatically fix simple test failures",
      pattern: /test.*fail|fail.*test/i,
      action: async (context: AutomationRuleContext) => ({
        id: "",
        type: "fix",
        title: "Fix failing tests",
        description: "Automatically fix identified test failures",
        impact: "low",
        status: "pending",
        timestamp: new Date(),
        confidence: 0.7,
        automated: true,
      }),
      confidenceModifier: 0.8,
    },

    // Performance optimization rule
    {
      id: "optimize-performance",
      name: "Optimize performance",
      description: "Automatically optimize identified performance issues",
      pattern: /slow|performance|optimize/i,
      action: async (context: AutomationRuleContext) => ({
        id: "",
        type: "optimize",
        title: "Optimize performance",
        description: "Apply performance optimizations",
        impact: "medium",
        status: "pending",
        timestamp: new Date(),
        confidence: 0.6,
        automated: true,
      }),
      requiresConfirmation: true,
    },

    // Security fix rule
    {
      id: "security-fix",
      name: "Fix security issues",
      description: "Automatically fix security vulnerabilities",
      pattern: /security|vulnerability|CVE/i,
      action: async (context: AutomationRuleContext) => ({
        id: "",
        type: "fix",
        title: "Fix security vulnerability",
        description: "Apply security patches",
        impact: "high",
        status: "pending",
        timestamp: new Date(),
        confidence: 0.9,
        automated: true,
      }),
      requiresConfirmation: true,
    },

    // Dependency update rule
    {
      id: "update-deps",
      name: "Update dependencies",
      description: "Automatically update outdated dependencies",
      pattern: /outdated|dependency.*update|update.*dependency/i,
      action: async (context: AutomationRuleContext) => ({
        id: "",
        type: "update",
        title: "Update dependencies",
        description: "Update outdated packages to latest stable versions",
        impact: "medium",
        status: "pending",
        timestamp: new Date(),
        confidence: 0.8,
        automated: true,
      }),
      maxExecutionsPerHour: 5,
    },

    // Code formatting rule
    {
      id: "format-code",
      name: "Format code",
      description: "Automatically format code files",
      pattern: /format|lint|style/i,
      action: async (context: AutomationRuleContext) => ({
        id: "",
        type: "refactor",
        title: "Format code",
        description: "Apply code formatting and linting fixes",
        impact: "low",
        status: "pending",
        timestamp: new Date(),
        confidence: 0.95,
        automated: true,
      }),
    },
  ];
}

/**
 * Evaluate rule against context
 */
export async function evaluateRule(
  rule: AutomationRule,
  context: Record<string, unknown>,
  executionCounts: Map<string, number>,
): Promise<boolean> {
  // Check execution limits
  const execCount = executionCounts.get(rule.id) || 0;
  if (rule.maxExecutionsPerHour && execCount >= rule.maxExecutionsPerHour) {
    return false;
  }

  // Check pattern match
  const contextString = JSON.stringify(context).toLowerCase();
  if (typeof rule.pattern === "string") {
    return contextString.includes(rule.pattern.toLowerCase());
  } else {
    return rule.pattern.test(contextString);
  }
}
