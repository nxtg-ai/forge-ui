/**
 * Automation Service
 * YOLO mode automation with safety checks and rollback
 */

import { z } from 'zod';
import { BaseService, ServiceConfig } from './base-service';
import { Result, IntegrationError } from '../utils/result';
import { AutomatedAction, AutomationLevel, YoloStatistics } from '../components/types';
import { CommandService, CommandResult } from './command-service';
import { VisionService } from './vision-service';

/**
 * Automation confidence thresholds
 */
export interface ConfidenceThresholds {
  minimum: number;      // Below this: never automate
  caution: number;      // Below this: require confirmation
  confident: number;    // Above this: automate without confirmation
}

/**
 * Automation rule
 */
export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  pattern: RegExp | string;
  action: (context: any) => Promise<AutomatedAction>;
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
  private automationLevel: AutomationLevel = 'balanced';
  private automationRules = new Map<string, AutomationRule>();
  private actionHistory: AutomatedAction[] = [];
  private rollbackSnapshots = new Map<string, RollbackSnapshot>();
  private statistics: YoloStatistics;
  private executionCounts = new Map<string, number>();
  private commandService?: CommandService;
  private visionService?: VisionService;

  private readonly confidenceThresholds: Record<AutomationLevel, ConfidenceThresholds> = {
    conservative: { minimum: 0.7, caution: 0.85, confident: 0.95 },
    balanced: { minimum: 0.5, caution: 0.7, confident: 0.85 },
    aggressive: { minimum: 0.3, caution: 0.5, confident: 0.7 },
    maximum: { minimum: 0.1, caution: 0.3, confident: 0.5 }
  };

  constructor(config: AutomationServiceConfig = { name: 'AutomationService' }) {
    super(config);

    this.config = {
      defaultLevel: 'balanced',
      maxActionsPerMinute: 10,
      enableRollback: true,
      rollbackHistorySize: 50,
      safetyChecksEnabled: true,
      ...config
    };

    this.automationLevel = (config.defaultLevel as AutomationLevel) || 'balanced';
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
    this.emit('automationLevelChanged', level);
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
    action: Omit<AutomatedAction, 'id' | 'status' | 'timestamp'>,
    context?: Partial<AutomationContext>
  ): Promise<Result<AutomationResult, IntegrationError>> {
    const fullAction: AutomatedAction = {
      ...action,
      id: this.generateActionId(),
      status: 'pending',
      timestamp: new Date()
    };

    const executionContext: AutomationContext = {
      level: this.automationLevel,
      confidence: action.confidence,
      dryRun: false,
      requireConfirmation: false,
      ...context
    };

    try {
      // Validate action
      const validationResult = await this.validateAction(fullAction, executionContext);
      if (validationResult.isErr()) {
        return Result.err(validationResult.error);
      }

      // Check safety
      if ((this.config as AutomationServiceConfig).safetyChecksEnabled) {
        const safetyResult = await this.performSafetyChecks(fullAction);
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
          skipReason: 'Confidence below minimum threshold',
          duration: 0
        });
      }

      // Check if confirmation needed
      const needsConfirmation = executionContext.confidence < thresholds.caution ||
                              executionContext.requireConfirmation ||
                              action.impact === 'high';

      if (needsConfirmation && !executionContext.dryRun) {
        this.emit('confirmationRequired', fullAction);
        return Result.ok({
          action: fullAction,
          executed: false,
          skipped: true,
          skipReason: 'Confirmation required',
          duration: 0
        });
      }

      // Create rollback snapshot if enabled
      let rollbackSnapshot: RollbackSnapshot | undefined;
      if ((this.config as AutomationServiceConfig).enableRollback) {
        rollbackSnapshot = await this.createRollbackSnapshot(fullAction);
        this.rollbackSnapshots.set(fullAction.id, rollbackSnapshot);
      }

      // Execute the action
      const startTime = Date.now();
      fullAction.status = 'executing';
      this.emit('actionStarted', fullAction);

      const executionResult = await this.performActionExecution(fullAction, executionContext);

      const duration = Date.now() - startTime;

      if (executionResult.isOk()) {
        fullAction.status = 'completed';
        this.updateStatistics(fullAction, true, duration);
        this.emit('actionCompleted', fullAction);

        return Result.ok({
          action: fullAction,
          executed: true,
          result: executionResult.value,
          rollbackSnapshot,
          duration
        });
      } else {
        fullAction.status = 'failed';
        this.updateStatistics(fullAction, false, duration);
        this.emit('actionFailed', { action: fullAction, error: executionResult.error });

        return Result.ok({
          action: fullAction,
          executed: true,
          skipped: false,
          skipReason: executionResult.error.message,
          rollbackSnapshot,
          duration
        });
      }
    } catch (error) {
      fullAction.status = 'failed';
      return Result.err(
        new IntegrationError(
          `Action execution failed: ${error instanceof Error ? error.message : String(error)}`,
          'EXECUTION_ERROR'
        )
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
          'No rollback snapshot found for action',
          'NO_SNAPSHOT'
        )
      );
    }

    try {
      this.emit('rollbackStarted', { actionId, snapshot });

      // Restore files if any
      if (snapshot.files) {
        for (const file of snapshot.files) {
          // TODO: Restore file content
          // await fs.writeFile(file.path, file.content);
        }
      }

      // Execute rollback commands if any
      if (snapshot.commands && this.commandService) {
        for (const command of snapshot.commands) {
          await this.commandService.execute(command);
        }
      }

      // Update action status
      const action = this.actionHistory.find(a => a.id === actionId);
      if (action) {
        action.status = 'reverted';
      }

      this.emit('rollbackCompleted', { actionId, snapshot });
      return Result.ok(undefined);
    } catch (error) {
      return Result.err(
        new IntegrationError(
          `Rollback failed: ${error instanceof Error ? error.message : String(error)}`,
          'ROLLBACK_ERROR'
        )
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
    this.emit('historyCleared');
  }

  /**
   * Add automation rule
   */
  addRule(rule: AutomationRule): void {
    this.automationRules.set(rule.id, rule);
    this.emit('ruleAdded', rule);
  }

  /**
   * Remove automation rule
   */
  removeRule(ruleId: string): boolean {
    const deleted = this.automationRules.delete(ruleId);
    if (deleted) {
      this.emit('ruleRemoved', ruleId);
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
    context: Record<string, unknown>
  ): Promise<Result<AutomatedAction[], IntegrationError>> {
    try {
      const suggestions: AutomatedAction[] = [];

      // Check each rule against context
      for (const rule of this.automationRules.values()) {
        const matches = await this.evaluateRule(rule, context);
        if (matches) {
          const action = await rule.action(context);
          if (rule.confidenceModifier) {
            action.confidence = Math.min(1, action.confidence * rule.confidenceModifier);
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
          'ANALYSIS_ERROR'
        )
      );
    }
  }

  /**
   * Initialize default automation rules
   */
  private initializeDefaultRules(): void {
    // Test failure auto-fix rule
    this.addRule({
      id: 'auto-fix-tests',
      name: 'Auto-fix failing tests',
      description: 'Automatically fix simple test failures',
      pattern: /test.*fail|fail.*test/i,
      action: async (context) => ({
        id: '',
        type: 'fix',
        title: 'Fix failing tests',
        description: 'Automatically fix identified test failures',
        impact: 'low',
        status: 'pending',
        timestamp: new Date(),
        confidence: 0.7,
        automated: true
      }),
      confidenceModifier: 0.8
    });

    // Performance optimization rule
    this.addRule({
      id: 'optimize-performance',
      name: 'Optimize performance',
      description: 'Automatically optimize identified performance issues',
      pattern: /slow|performance|optimize/i,
      action: async (context) => ({
        id: '',
        type: 'optimize',
        title: 'Optimize performance',
        description: 'Apply performance optimizations',
        impact: 'medium',
        status: 'pending',
        timestamp: new Date(),
        confidence: 0.6,
        automated: true
      }),
      requiresConfirmation: true
    });

    // Security fix rule
    this.addRule({
      id: 'security-fix',
      name: 'Fix security issues',
      description: 'Automatically fix security vulnerabilities',
      pattern: /security|vulnerability|CVE/i,
      action: async (context) => ({
        id: '',
        type: 'fix',
        title: 'Fix security vulnerability',
        description: 'Apply security patches',
        impact: 'high',
        status: 'pending',
        timestamp: new Date(),
        confidence: 0.9,
        automated: true
      }),
      requiresConfirmation: true
    });

    // Dependency update rule
    this.addRule({
      id: 'update-deps',
      name: 'Update dependencies',
      description: 'Automatically update outdated dependencies',
      pattern: /outdated|dependency.*update|update.*dependency/i,
      action: async (context) => ({
        id: '',
        type: 'update',
        title: 'Update dependencies',
        description: 'Update outdated packages to latest stable versions',
        impact: 'medium',
        status: 'pending',
        timestamp: new Date(),
        confidence: 0.8,
        automated: true
      }),
      maxExecutionsPerHour: 5
    });

    // Code formatting rule
    this.addRule({
      id: 'format-code',
      name: 'Format code',
      description: 'Automatically format code files',
      pattern: /format|lint|style/i,
      action: async (context) => ({
        id: '',
        type: 'refactor',
        title: 'Format code',
        description: 'Apply code formatting and linting fixes',
        impact: 'low',
        status: 'pending',
        timestamp: new Date(),
        confidence: 0.95,
        automated: true
      })
    });
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
      costSaved: 0
    };
  }

  /**
   * Validate action
   */
  private async validateAction(
    action: AutomatedAction,
    context: AutomationContext
  ): Promise<Result<void, IntegrationError>> {
    // Check rate limiting
    const config = this.config as AutomationServiceConfig;
    const recentActions = this.actionHistory.filter(a =>
      a.timestamp > new Date(Date.now() - 60000)
    );

    if (recentActions.length >= (config.maxActionsPerMinute ?? 10)) {
      return Result.err(
        new IntegrationError(
          'Rate limit exceeded',
          'RATE_LIMIT'
        )
      );
    }

    // Validate action structure
    const ActionSchema = z.object({
      type: z.enum(['fix', 'optimize', 'refactor', 'update', 'deploy']),
      title: z.string().min(1),
      description: z.string(),
      impact: z.enum(['low', 'medium', 'high']),
      confidence: z.number().min(0).max(1)
    });

    const result = this.validate(action, ActionSchema);
    if (result.isErr()) {
      return Result.err(
        new IntegrationError(
          `Invalid action: ${result.error.message}`,
          'VALIDATION_ERROR',
          result.error.details
        )
      );
    }

    return Result.ok(undefined);
  }

  /**
   * Perform safety checks
   */
  private async performSafetyChecks(
    action: AutomatedAction
  ): Promise<Result<void, IntegrationError>> {
    // Check with vision service for alignment
    if (this.visionService) {
      const alignmentResult = this.visionService.checkAlignment(
        `${action.title}: ${action.description}`
      );

      if (alignmentResult.isOk() && !alignmentResult.value.aligned) {
        return Result.err(
          new IntegrationError(
            'Action not aligned with vision',
            'ALIGNMENT_ERROR',
            alignmentResult.value
          )
        );
      }
    }

    // Check for dangerous patterns
    const dangerousPatterns = [
      /delete.*production/i,
      /drop.*database/i,
      /rm\s+-rf/i,
      /force.*push/i
    ];

    const actionText = `${action.title} ${action.description}`;
    for (const pattern of dangerousPatterns) {
      if (pattern.test(actionText)) {
        return Result.err(
          new IntegrationError(
            'Dangerous action detected',
            'SAFETY_CHECK_FAILED'
          )
        );
      }
    }

    return Result.ok(undefined);
  }

  /**
   * Create rollback snapshot
   */
  private async createRollbackSnapshot(
    action: AutomatedAction
  ): Promise<RollbackSnapshot> {
    // TODO: Capture actual system state
    return {
      id: this.generateSnapshotId(),
      actionId: action.id,
      timestamp: new Date(),
      state: {
        action: action.type,
        target: action.title
      }
    };
  }

  /**
   * Perform action execution
   */
  private async performActionExecution(
    action: AutomatedAction,
    context: AutomationContext
  ): Promise<Result<CommandResult, IntegrationError>> {
    if (context.dryRun) {
      // Simulate execution
      return Result.ok({
        commandId: 'dry-run',
        command: `[DRY RUN] ${action.title}`,
        status: 'completed',
        output: [`Would execute: ${action.description}`],
        startTime: new Date(),
        endTime: new Date(),
        duration: 0,
        exitCode: 0
      });
    }

    // Execute via command service if available
    if (this.commandService) {
      const command = this.mapActionToCommand(action);
      const result = await this.commandService.execute(command);
      return result;
    }

    // Fallback simulation
    return Result.ok({
      commandId: this.generateActionId(),
      command: action.title,
      status: 'completed',
      output: [`Executed: ${action.description}`],
      startTime: new Date(),
      endTime: new Date(),
      duration: 100,
      exitCode: 0
    });
  }

  /**
   * Map action to command
   */
  private mapActionToCommand(action: AutomatedAction): string {
    // Map action types to commands
    const commandMap: Record<AutomatedAction['type'], string> = {
      fix: 'npm run fix',
      optimize: 'npm run optimize',
      refactor: 'npm run format',
      update: 'npm update',
      deploy: 'npm run deploy'
    };

    return commandMap[action.type] || 'echo "No command mapping"';
  }

  /**
   * Evaluate rule against context
   */
  private async evaluateRule(
    rule: AutomationRule,
    context: Record<string, unknown>
  ): Promise<boolean> {
    // Check execution limits
    const execCount = this.executionCounts.get(rule.id) || 0;
    if (rule.maxExecutionsPerHour && execCount >= rule.maxExecutionsPerHour) {
      return false;
    }

    // Check pattern match
    const contextString = JSON.stringify(context).toLowerCase();
    if (typeof rule.pattern === 'string') {
      return contextString.includes(rule.pattern.toLowerCase());
    } else {
      return rule.pattern.test(contextString);
    }
  }

  /**
   * Update statistics
   */
  private updateStatistics(
    action: AutomatedAction,
    success: boolean,
    duration: number
  ): void {
    this.statistics.actionsToday++;

    if (success) {
      if (action.type === 'fix') {
        this.statistics.issuesFixed++;
      }

      // Estimate time saved (assuming manual would take 10x longer)
      const timeSaved = Math.round((duration * 9) / 60000); // Convert to minutes
      this.statistics.timesSaved += timeSaved;

      // Estimate cost saved (assuming $100/hour developer rate)
      this.statistics.costSaved += Math.round((timeSaved / 60) * 100);

      // Update performance gain
      if (action.type === 'optimize') {
        this.statistics.performanceGain += 5; // Assume 5% gain per optimization
      }
    }

    // Update success rate
    const totalActions = this.actionHistory.length;
    const successfulActions = this.actionHistory.filter(a => a.status === 'completed').length;
    this.statistics.successRate = totalActions > 0
      ? Math.round((successfulActions / totalActions) * 100)
      : 100;
  }

  /**
   * Load automation state
   */
  private async loadAutomationState(): Promise<void> {
    // TODO: Load from persistence
  }

  /**
   * Save automation state
   */
  private async saveAutomationState(): Promise<void> {
    // TODO: Save to persistence
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