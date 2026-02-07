/**
 * Automation Service - Safety Checks and Validation
 */

import { z } from "zod";
import { Result, IntegrationError, ValidationError } from "../../utils/result";
import {
  AutomatedAction,
  AutomationLevel,
} from "../../components/types";
import {
  AutomationContext,
  RollbackSnapshot,
  AutomationServiceConfig,
} from "../automation-service";
import { VisionService } from "../vision-service";

/**
 * Validate action
 */
export async function validateAction(
  action: AutomatedAction,
  context: AutomationContext,
  actionHistory: AutomatedAction[],
  config: AutomationServiceConfig,
  validateFn: (data: unknown, schema: z.ZodSchema) => Result<unknown, ValidationError>,
): Promise<Result<void, IntegrationError>> {
  // Check rate limiting
  const recentActions = actionHistory.filter(
    (a) => a.timestamp > new Date(Date.now() - 60000),
  );

  if (recentActions.length >= (config.maxActionsPerMinute ?? 10)) {
    return Result.err(
      new IntegrationError("Rate limit exceeded", "RATE_LIMIT"),
    );
  }

  // Validate action structure
  const ActionSchema = z.object({
    type: z.enum(["fix", "optimize", "refactor", "update", "deploy"]),
    title: z.string().min(1),
    description: z.string(),
    impact: z.enum(["low", "medium", "high"]),
    confidence: z.number().min(0).max(1),
  });

  const result = validateFn(action, ActionSchema);
  if (result.isErr()) {
    return Result.err(
      new IntegrationError(
        `Invalid action: ${result.error.message}`,
        "VALIDATION_ERROR",
        result.error.details,
      ),
    );
  }

  return Result.ok(undefined);
}

/**
 * Perform safety checks
 */
export async function performSafetyChecks(
  action: AutomatedAction,
  visionService?: VisionService,
): Promise<Result<void, IntegrationError>> {
  // Check with vision service for alignment
  if (visionService) {
    const alignmentResult = visionService.checkAlignment(
      `${action.title}: ${action.description}`,
    );

    if (alignmentResult.isOk() && !alignmentResult.value.aligned) {
      return Result.err(
        new IntegrationError(
          "Action not aligned with vision",
          "ALIGNMENT_ERROR",
          alignmentResult.value,
        ),
      );
    }
  }

  // Check for dangerous patterns
  const dangerousPatterns = [
    /delete.*production/i,
    /drop.*database/i,
    /rm\s+-rf/i,
    /force.*push/i,
  ];

  const actionText = `${action.title} ${action.description}`;
  for (const pattern of dangerousPatterns) {
    if (pattern.test(actionText)) {
      return Result.err(
        new IntegrationError(
          "Dangerous action detected",
          "SAFETY_CHECK_FAILED",
        ),
      );
    }
  }

  return Result.ok(undefined);
}

/**
 * Create rollback snapshot
 * Note: Currently captures action metadata only. File-level snapshots
 * are handled by checkpoint-manager for granular rollback support.
 */
export async function createRollbackSnapshot(
  action: AutomatedAction,
  generateSnapshotId: () => string,
): Promise<RollbackSnapshot> {
  return {
    id: generateSnapshotId(),
    actionId: action.id,
    timestamp: new Date(),
    state: {
      action: action.type,
      target: action.title,
    },
  };
}

/**
 * Map action to command
 */
export function mapActionToCommand(action: AutomatedAction): string {
  // Map action types to commands
  const commandMap: Record<AutomatedAction["type"], string> = {
    fix: "npm run fix",
    optimize: "npm run optimize",
    refactor: "npm run format",
    update: "npm update",
    deploy: "npm run deploy",
  };

  return commandMap[action.type] || 'echo "No command mapping"';
}
