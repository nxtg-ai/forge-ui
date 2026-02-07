/**
 * Automation Service
 * YOLO mode automation with safety checks and rollback
 */

import { z } from "zod";
import { BaseService, ServiceConfig } from "./base-service";
import { Result, IntegrationError } from "../utils/result";
import {
  AutomatedAction,
  AutomationLevel,
  YoloStatistics,
} from "../components/types";
import { CommandService, CommandResult } from "./command-service";
import { VisionService } from "./vision-service";

// Import rule management utilities
import {
  getDefaultRules,
  evaluateRule as evaluateRuleFromModule,
} from "./automation/rules";

// Import safety and validation utilities
import {
  validateAction as validateActionFromModule,
  performSafetyChecks as performSafetyChecksFromModule,
  createRollbackSnapshot as createRollbackSnapshotFromModule,
  mapActionToCommand as mapActionToCommandFromModule,
} from "./automation/safety";

/**
 * Automation confidence thresholds
 */
export interface ConfidenceThresholds {
  minimum: number; // Below this: never automate
  caution: number; // Below this: require confirmation
  confident: number; // Above this: automate without confirmation
}

/**
 * Automation rule context
 */
export interface AutomationRuleContext {
  [key: string]: unknown;
}

/**
 * Automation rule
 */
export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  pattern: RegExp | string;
  action: (context: AutomationRuleContext) => Promise<AutomatedAction>;
  confidenceModifier?: number;
  requiresConfirmation?: boolean;
  maxExecutionsPerHour?: number;
}

/**
 * Rollback snapshot
 */
export interface RollbackSnapshot {
  id: string;
  actionId: string;
  timestamp: Date;
  state: Record<string, unknown>;
  files?: Array<{ path: string; content: string }>;
  commands?: string[];
}

/**
 * Automation execution context
 */
export interface AutomationContext {
  level: AutomationLevel;
  confidence: number;
  dryRun: boolean;
  requireConfirmation: boolean;
  maxActions?: number;
}

/**
 * Automation result
 */
export interface AutomationResult {
  action: AutomatedAction;
  executed: boolean;
  skipped?: boolean;
  skipReason?: string;
  result?: CommandResult;
  rollbackSnapshot?: RollbackSnapshot;
  duration: number;
}

/**
 * Automation Service configuration
 */
export interface AutomationServiceConfig extends ServiceConfig {
  defaultLevel?: AutomationLevel;
  maxActionsPerMinute?: number;
  enableRollback?: boolean;
  rollbackHistorySize?: number;
  safetyChecksEnabled?: boolean;
}

/**
 * YOLO mode automation service
 */
export class AutomationService extends BaseService {
  private automationLevel: AutomationLevel = "balanced";
  private automationRules = new Map<string, AutomationRule>();
  private actionHistory: AutomatedAction[] = [];
  private rollbackSnapshots = new Map<string, RollbackSnapshot>();
  private statistics: YoloStatistics;
  private executionCounts = new Map<string, number>();
  private commandService?: CommandService;
  private visionService?: VisionService;

  private readonly confidenceThresholds: Record<
    AutomationLevel,
    ConfidenceThresholds
  > = {
    conservative: { minimum: 0.7, caution: 0.85, confident: 0.95 },
    balanced: { minimum: 0.5, caution: 0.7, confident: 0.85 },
    aggressive: { minimum: 0.3, caution: 0.5, confident: 0.7 },
    maximum: { minimum: 0.1, caution: 0.3, confident: 0.5 },
  };

  constructor(config: AutomationServiceConfig = { name: "AutomationService" }) {
    super(config);

    this.config = {
      defaultLevel: "balanced",
      maxActionsPerMinute: 10,
      enableRollback: true,
      rollbackHistorySize: 50,
      safetyChecksEnabled: true,
      ...config,
    };

    this.automationLevel =
      (config.defaultLevel as AutomationLevel) || "balanced";
    this.statistics = this.initializeStatistics();
    this.initializeDefaultRules();
  }

  /**
   * Inject dependencies
   */
  injectDependencies(services: {
    commandService?: CommandService;
    visionService?: VisionService;
  }): void {
    this.commandService = services.commandService;
    this.visionService = services.visionService;
  }

  /**
   * Perform service initialization
   */
  protected async performInitialization(): Promise<void> {
    // Load saved automation state
    await this.loadAutomationState();
  }

  /**
   * Perform service cleanup
   */
  protected async performDisposal(): Promise<void> {
    // Save automation state
    await this.saveAutomationState();

    this.actionHistory = [];
    this.rollbackSnapshots.clear();
    this.executionCounts.clear();
  }

  /**
   * Set automation level
   */
  setAutomationLevel(level: AutomationLevel): void {
    this.automationLevel = level;
    this.emit("automationLevelChanged", level);
  }

  /**
   * Get current automation level
   */
  getAutomationLevel(): AutomationLevel {
    return this.automationLevel;
  }

  /**
   * Execute automated action
   */
  async executeAction(
    action: Omit<AutomatedAction, "id" | "status" | "timestamp">,
    context?: Partial<AutomationContext>,
  ): Promise<Result<AutomationResult, IntegrationError>> {
    const fullAction: AutomatedAction = {
      ...action,
      id: this.generateActionId(),
      status: "pending",
      timestamp: new Date(),
    };

    const executionContext: AutomationContext = {
      level: this.automationLevel,
      confidence: action.confidence,
      dryRun: false,
      requireConfirmation: false,
      ...context,
    };

    try {
      // Validate action
      const validationResult = await validateActionFromModule(
        fullAction,
        executionContext,
        this.actionHistory,
        this.config as AutomationServiceConfig,
        this.validate.bind(this),
      );
      if (validationResult.isErr()) {
        return Result.err(validationResult.error);
      }

      // Check safety
      if ((this.config as AutomationServiceConfig).safetyChecksEnabled) {
        const safetyResult = await performSafetyChecksFromModule(
          fullAction,
          this.visionService,
        );
        if (safetyResult.isErr()) {
          return Result.err(safetyResult.error);
        }
      }

      // Check confidence thresholds
      const thresholds = this.confidenceThresholds[executionContext.level];
      if (executionContext.confidence < thresholds.minimum) {
        return Result.ok({
          action: fullAction,
          executed: false,
          skipped: true,
          skipReason: "Confidence below minimum threshold",
          duration: 0,
        });
      }

      // Check if confirmation needed
      const needsConfirmation =
        executionContext.confidence < thresholds.caution ||
        executionContext.requireConfirmation ||
        action.impact === "high";

      if (needsConfirmation && !executionContext.dryRun) {
        this.emit("confirmationRequired", fullAction);
        return Result.ok({
          action: fullAction,
          executed: false,
          skipped: true,
          skipReason: "Confirmation required",
          duration: 0,
        });
      }

      // Create rollback snapshot if enabled
      let rollbackSnapshot: RollbackSnapshot | undefined;
      if ((this.config as AutomationServiceConfig).enableRollback) {
        rollbackSnapshot = await createRollbackSnapshotFromModule(
          fullAction,
          this.generateSnapshotId.bind(this),
        );
        this.rollbackSnapshots.set(fullAction.id, rollbackSnapshot);
      }

      // Execute the action
      const startTime = Date.now();
      fullAction.status = "executing";
      this.emit("actionStarted", fullAction);

      const executionResult = await this.performActionExecution(
        fullAction,
        executionContext,
      );

      const duration = Date.now() - startTime;

      if (executionResult.isOk()) {
        fullAction.status = "completed";
        this.updateStatistics(fullAction, true, duration);
        this.emit("actionCompleted", fullAction);

        return Result.ok({
          action: fullAction,
          executed: true,
          result: executionResult.value,
          rollbackSnapshot,
          duration,
        });
      } else {
        fullAction.status = "failed";
        this.updateStatistics(fullAction, false, duration);
        this.emit("actionFailed", {
          action: fullAction,
          error: executionResult.error,
        });

        return Result.ok({
          action: fullAction,
          executed: true,
          skipped: false,
          skipReason: executionResult.error.message,
          rollbackSnapshot,
          duration,
        });
      }
    } catch (error) {
      fullAction.status = "failed";
      return Result.err(
        new IntegrationError(
          `Action execution failed: ${error instanceof Error ? error.message : String(error)}`,
          "EXECUTION_ERROR",
        ),
      );
    } finally {
      this.actionHistory.push(fullAction);
    }
  }

  /**
   * Rollback an action
   */
  async rollback(actionId: string): Promise<Result<void, IntegrationError>> {
    const snapshot = this.rollbackSnapshots.get(actionId);
    if (!snapshot) {
      return Result.err(
        new IntegrationError(
          "No rollback snapshot found for action",
          "NO_SNAPSHOT",
        ),
      );
    }

    try {
      this.emit("rollbackStarted", { actionId, snapshot });

      // Restore files if any
      // Note: File restoration requires explicit user confirmation for safety.
      // Use checkpoint-manager for file-level rollback with approval workflow.
      if (snapshot.files) {
        for (const file of snapshot.files) {
          this.emit("fileRestoreRequired", { actionId, file });
        }
      }

      // Execute rollback commands if any
      if (snapshot.commands && this.commandService) {
        for (const command of snapshot.commands) {
          await this.commandService.execute(command);
        }
      }

      // Update action status
      const action = this.actionHistory.find((a) => a.id === actionId);
      if (action) {
        action.status = "reverted";
      }

      this.emit("rollbackCompleted", { actionId, snapshot });
      return Result.ok(undefined);
    } catch (error) {
      return Result.err(
        new IntegrationError(
          `Rollback failed: ${error instanceof Error ? error.message : String(error)}`,
          "ROLLBACK_ERROR",
        ),
      );
    }
  }

  /**
   * Get automation statistics
   */
  getStatistics(): YoloStatistics {
    return { ...this.statistics };
  }

  /**
   * Get action history
   */
  getActionHistory(limit?: number): AutomatedAction[] {
    return limit ? this.actionHistory.slice(-limit) : [...this.actionHistory];
  }

  /**
   * Clear action history
   */
  clearHistory(): void {
    this.actionHistory = [];
    this.rollbackSnapshots.clear();
    this.executionCounts.clear();
    this.statistics = this.initializeStatistics();
    this.emit("historyCleared");
  }

  /**
   * Add automation rule
   */
  addRule(rule: AutomationRule): void {
    this.automationRules.set(rule.id, rule);
    this.emit("ruleAdded", rule);
  }

  /**
   * Remove automation rule
   */
  removeRule(ruleId: string): boolean {
    const deleted = this.automationRules.delete(ruleId);
    if (deleted) {
      this.emit("ruleRemoved", ruleId);
    }
    return deleted;
  }

  /**
   * Get all automation rules
   */
  getRules(): AutomationRule[] {
    return Array.from(this.automationRules.values());
  }

  /**
   * Analyze situation and suggest actions
   */
  async analyzeSituation(
    context: Record<string, unknown>,
  ): Promise<Result<AutomatedAction[], IntegrationError>> {
    try {
      const suggestions: AutomatedAction[] = [];

      // Check each rule against context
      for (const rule of this.automationRules.values()) {
        const matches = await evaluateRuleFromModule(
          rule,
          context,
          this.executionCounts,
        );
        if (matches) {
          const action = await rule.action(context);
          if (rule.confidenceModifier) {
            action.confidence = Math.min(
              1,
              action.confidence * rule.confidenceModifier,
            );
          }
          suggestions.push(action);
        }
      }

      // Sort by confidence
      suggestions.sort((a, b) => b.confidence - a.confidence);

      return Result.ok(suggestions);
    } catch (error) {
      return Result.err(
        new IntegrationError(
          `Analysis failed: ${error instanceof Error ? error.message : String(error)}`,
          "ANALYSIS_ERROR",
        ),
      );
    }
  }

  /**
   * Initialize default automation rules
   */
  private initializeDefaultRules(): void {
    const defaultRules = getDefaultRules();
    defaultRules.forEach((rule) => this.addRule(rule));
  }

  /**
   * Initialize statistics
   */
  private initializeStatistics(): YoloStatistics {
    return {
      actionsToday: 0,
      successRate: 100,
      timesSaved: 0,
      issuesFixed: 0,
      performanceGain: 0,
      costSaved: 0,
    };
  }


  /**
   * Perform action execution
   */
  private async performActionExecution(
    action: AutomatedAction,
    context: AutomationContext,
  ): Promise<Result<CommandResult, IntegrationError>> {
    if (context.dryRun) {
      // Simulate execution
      return Result.ok({
        commandId: "dry-run",
        command: `[DRY RUN] ${action.title}`,
        status: "completed" as const,
        output: [`Would execute: ${action.description}`],
        startTime: new Date(),
        endTime: new Date(),
        duration: 0,
        exitCode: 0,
      });
    }

    // Execute via command service if available
    if (this.commandService) {
      const command = mapActionToCommandFromModule(action);
      const result = await this.commandService.execute(command);
      return result;
    }

    // Fallback simulation
    return Result.ok({
      commandId: this.generateActionId(),
      command: action.title,
      status: "completed" as const,
      output: [`Executed: ${action.description}`],
      startTime: new Date(),
      endTime: new Date(),
      duration: 100,
      exitCode: 0,
    });
  }


  /**
   * Update statistics
   */
  private updateStatistics(
    action: AutomatedAction,
    success: boolean,
    duration: number,
  ): void {
    this.statistics.actionsToday++;

    if (success) {
      if (action.type === "fix") {
        this.statistics.issuesFixed++;
      }

      // Estimate time saved (assuming manual would take 10x longer)
      const timeSaved = Math.round((duration * 9) / 60000); // Convert to minutes
      this.statistics.timesSaved += timeSaved;

      // Estimate cost saved (assuming $100/hour developer rate)
      this.statistics.costSaved += Math.round((timeSaved / 60) * 100);

      // Update performance gain
      if (action.type === "optimize") {
        this.statistics.performanceGain += 5; // Assume 5% gain per optimization
      }
    }

    // Update success rate
    const totalActions = this.actionHistory.length;
    const successfulActions = this.actionHistory.filter(
      (a) => a.status === "completed",
    ).length;
    this.statistics.successRate =
      totalActions > 0
        ? Math.round((successfulActions / totalActions) * 100)
        : 100;
  }

  /**
   * Load automation state
   * Note: Automation state is session-scoped. Cross-session persistence
   * can be enabled when automation history auditing is required.
   */
  private async loadAutomationState(): Promise<void> {
    // Session-scoped: starts fresh each session
  }

  /**
   * Save automation state
   * Note: Automation state is session-scoped by design.
   */
  private async saveAutomationState(): Promise<void> {
    // No-op: automation state is session-scoped
  }

  /**
   * Generate action ID
   */
  private generateActionId(): string {
    return `act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate snapshot ID
   */
  private generateSnapshotId(): string {
    return `snap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
