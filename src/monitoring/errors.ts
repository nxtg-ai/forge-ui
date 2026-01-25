/**
 * Error Tracking System
 * Comprehensive error monitoring and recovery tracking
 */

import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../utils/logger';

const logger = new Logger('ErrorTracker');

// Error categories
export enum ErrorCategory {
  UI = 'ui',
  BACKEND = 'backend',
  INTEGRATION = 'integration',
  STATE = 'state',
  AGENT = 'agent',
  COMMAND = 'command',
  FILE_SYSTEM = 'file_system',
  NETWORK = 'network',
  VALIDATION = 'validation',
  UNKNOWN = 'unknown'
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Tracked error
export interface TrackedError {
  id: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  stack?: string;
  timestamp: Date;
  context?: Record<string, any>;
  recovered: boolean;
  recoveryAttempts: number;
  firstOccurrence: Date;
  lastOccurrence: Date;
  count: number;
}

// Error statistics
export interface ErrorStats {
  category: ErrorCategory;
  total: number;
  resolved: number;
  unresolved: number;
  averageRecoveryAttempts: number;
  severityBreakdown: Record<ErrorSeverity, number>;
}

// Error report
export interface ErrorReport {
  timestamp: Date;
  period: number; // seconds
  totalErrors: number;
  errorRate: number; // errors per minute
  categories: Map<ErrorCategory, ErrorStats>;
  topErrors: TrackedError[];
  recoveryRate: number; // percentage
  criticalErrors: TrackedError[];
}

// Recovery strategy
export interface RecoveryStrategy {
  category: ErrorCategory;
  action: 'retry' | 'reset' | 'rollback' | 'alert' | 'ignore';
  maxAttempts: number;
  backoffMs: number;
}

// Default recovery strategies
const DEFAULT_RECOVERY_STRATEGIES: Record<ErrorCategory, RecoveryStrategy> = {
  [ErrorCategory.UI]: { category: ErrorCategory.UI, action: 'retry', maxAttempts: 3, backoffMs: 1000 },
  [ErrorCategory.BACKEND]: { category: ErrorCategory.BACKEND, action: 'retry', maxAttempts: 5, backoffMs: 2000 },
  [ErrorCategory.INTEGRATION]: { category: ErrorCategory.INTEGRATION, action: 'reset', maxAttempts: 3, backoffMs: 3000 },
  [ErrorCategory.STATE]: { category: ErrorCategory.STATE, action: 'rollback', maxAttempts: 1, backoffMs: 0 },
  [ErrorCategory.AGENT]: { category: ErrorCategory.AGENT, action: 'retry', maxAttempts: 3, backoffMs: 2000 },
  [ErrorCategory.COMMAND]: { category: ErrorCategory.COMMAND, action: 'retry', maxAttempts: 2, backoffMs: 1000 },
  [ErrorCategory.FILE_SYSTEM]: { category: ErrorCategory.FILE_SYSTEM, action: 'alert', maxAttempts: 1, backoffMs: 0 },
  [ErrorCategory.NETWORK]: { category: ErrorCategory.NETWORK, action: 'retry', maxAttempts: 5, backoffMs: 5000 },
  [ErrorCategory.VALIDATION]: { category: ErrorCategory.VALIDATION, action: 'alert', maxAttempts: 1, backoffMs: 0 },
  [ErrorCategory.UNKNOWN]: { category: ErrorCategory.UNKNOWN, action: 'alert', maxAttempts: 1, backoffMs: 0 }
};

// Alert thresholds
const ALERT_THRESHOLDS = {
  errorRate: 10, // errors per minute
  criticalCount: 3,
  categoryThreshold: 5, // errors per category
  recoveryFailureRate: 50 // percentage
};

export class ErrorTracker extends EventEmitter {
  private errors: Map<string, TrackedError> = new Map();
  private errorHistory: TrackedError[] = [];
  private recoveryStrategies: Map<ErrorCategory, RecoveryStrategy>;
  private reportInterval: NodeJS.Timeout | null = null;
  private startTime: number;
  private maxHistorySize = 1000;
  private persistPath: string;

  constructor(projectPath?: string) {
    super();
    this.startTime = Date.now();
    this.recoveryStrategies = new Map(Object.entries(DEFAULT_RECOVERY_STRATEGIES) as [ErrorCategory, RecoveryStrategy][]);
    this.persistPath = path.join(projectPath || process.cwd(), '.claude', 'monitoring', 'errors.json');
    this.loadPersistedErrors();
  }

  /**
   * Start error tracking
   */
  start(reportIntervalMs: number = 60000): void {
    logger.info('Starting error tracking', { interval: reportIntervalMs });

    this.reportInterval = setInterval(() => {
      const report = this.generateReport();
      this.emit('errorReport', report);
      this.checkAlerts(report);
      this.persistErrors();
    }, reportIntervalMs);
  }

  /**
   * Stop error tracking
   */
  stop(): void {
    if (this.reportInterval) {
      clearInterval(this.reportInterval);
      this.reportInterval = null;
    }

    this.persistErrors();
    logger.info('Error tracking stopped');
  }

  /**
   * Track an error
   */
  trackError(
    error: Error | string,
    category: ErrorCategory = ErrorCategory.UNKNOWN,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context?: Record<string, any>
  ): TrackedError {
    const message = typeof error === 'string' ? error : error.message;
    const stack = typeof error === 'string' ? undefined : error.stack;

    // Generate error ID based on message and category
    const errorId = this.generateErrorId(message, category);

    // Check if error already exists
    let trackedError = this.errors.get(errorId);

    if (trackedError) {
      // Update existing error
      trackedError.count++;
      trackedError.lastOccurrence = new Date();

      // Update severity if higher
      if (this.compareSeverity(severity, trackedError.severity) > 0) {
        trackedError.severity = severity;
      }
    } else {
      // Create new tracked error
      trackedError = {
        id: errorId,
        category,
        severity,
        message,
        stack,
        timestamp: new Date(),
        context,
        recovered: false,
        recoveryAttempts: 0,
        firstOccurrence: new Date(),
        lastOccurrence: new Date(),
        count: 1
      };

      this.errors.set(errorId, trackedError);
    }

    // Add to history
    this.errorHistory.push({ ...trackedError });
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory.shift();
    }

    // Log the error
    this.logError(trackedError);

    // Emit error event
    this.emit('errorTracked', trackedError);

    // Attempt recovery if applicable
    this.attemptRecovery(trackedError);

    return trackedError;
  }

  /**
   * Mark error as recovered
   */
  markRecovered(errorId: string): void {
    const error = this.errors.get(errorId);
    if (error) {
      error.recovered = true;
      this.emit('errorRecovered', error);
      logger.info('Error recovered', { errorId, attempts: error.recoveryAttempts });
    }
  }

  /**
   * Attempt error recovery
   */
  private async attemptRecovery(error: TrackedError): Promise<void> {
    const strategy = this.recoveryStrategies.get(error.category);
    if (!strategy || error.recoveryAttempts >= strategy.maxAttempts) {
      return;
    }

    error.recoveryAttempts++;

    // Apply backoff
    if (strategy.backoffMs > 0) {
      await new Promise(resolve => setTimeout(resolve, strategy.backoffMs * error.recoveryAttempts));
    }

    switch (strategy.action) {
      case 'retry':
        this.emit('recoveryAction', { type: 'retry', error });
        break;
      case 'reset':
        this.emit('recoveryAction', { type: 'reset', error });
        break;
      case 'rollback':
        this.emit('recoveryAction', { type: 'rollback', error });
        break;
      case 'alert':
        this.emit('recoveryAction', { type: 'alert', error });
        break;
      case 'ignore':
        error.recovered = true;
        break;
    }
  }

  /**
   * Generate error ID
   */
  private generateErrorId(message: string, category: ErrorCategory): string {
    const hash = require('crypto').createHash('sha256');
    hash.update(`${category}-${message.substring(0, 100)}`);
    return hash.digest('hex').substring(0, 16);
  }

  /**
   * Compare severity levels
   */
  private compareSeverity(a: ErrorSeverity, b: ErrorSeverity): number {
    const levels = { low: 0, medium: 1, high: 2, critical: 3 };
    return levels[a] - levels[b];
  }

  /**
   * Log error based on severity
   */
  private logError(error: TrackedError): void {
    const logData = {
      category: error.category,
      message: error.message,
      count: error.count,
      context: error.context
    };

    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        logger.error('Critical error tracked', logData);
        break;
      case ErrorSeverity.HIGH:
        logger.error('High severity error tracked', logData);
        break;
      case ErrorSeverity.MEDIUM:
        logger.warn('Medium severity error tracked', logData);
        break;
      case ErrorSeverity.LOW:
        logger.info('Low severity error tracked', logData);
        break;
    }
  }

  /**
   * Categorize error automatically
   */
  categorizeError(error: Error | string): ErrorCategory {
    const message = typeof error === 'string' ? error : error.message.toLowerCase();

    if (message.includes('ui') || message.includes('render') || message.includes('component')) {
      return ErrorCategory.UI;
    }
    if (message.includes('backend') || message.includes('server') || message.includes('api')) {
      return ErrorCategory.BACKEND;
    }
    if (message.includes('integration') || message.includes('sync')) {
      return ErrorCategory.INTEGRATION;
    }
    if (message.includes('state') || message.includes('store')) {
      return ErrorCategory.STATE;
    }
    if (message.includes('agent') || message.includes('orchestrat')) {
      return ErrorCategory.AGENT;
    }
    if (message.includes('command') || message.includes('execute')) {
      return ErrorCategory.COMMAND;
    }
    if (message.includes('file') || message.includes('fs') || message.includes('disk')) {
      return ErrorCategory.FILE_SYSTEM;
    }
    if (message.includes('network') || message.includes('timeout') || message.includes('connection')) {
      return ErrorCategory.NETWORK;
    }
    if (message.includes('validation') || message.includes('invalid') || message.includes('required')) {
      return ErrorCategory.VALIDATION;
    }

    return ErrorCategory.UNKNOWN;
  }

  /**
   * Generate error report
   */
  generateReport(): ErrorReport {
    const now = Date.now();
    const period = (now - this.startTime) / 1000;
    const categories = new Map<ErrorCategory, ErrorStats>();

    let totalErrors = 0;
    let resolvedErrors = 0;

    // Calculate stats per category
    for (const error of this.errors.values()) {
      totalErrors++;
      if (error.recovered) resolvedErrors++;

      let stats = categories.get(error.category);
      if (!stats) {
        stats = {
          category: error.category,
          total: 0,
          resolved: 0,
          unresolved: 0,
          averageRecoveryAttempts: 0,
          severityBreakdown: {
            [ErrorSeverity.LOW]: 0,
            [ErrorSeverity.MEDIUM]: 0,
            [ErrorSeverity.HIGH]: 0,
            [ErrorSeverity.CRITICAL]: 0
          }
        };
        categories.set(error.category, stats);
      }

      stats.total++;
      if (error.recovered) {
        stats.resolved++;
      } else {
        stats.unresolved++;
      }
      stats.severityBreakdown[error.severity]++;
    }

    // Calculate average recovery attempts
    for (const stats of categories.values()) {
      const categoryErrors = Array.from(this.errors.values()).filter(e => e.category === stats.category);
      const totalAttempts = categoryErrors.reduce((sum, e) => sum + e.recoveryAttempts, 0);
      stats.averageRecoveryAttempts = categoryErrors.length > 0 ? totalAttempts / categoryErrors.length : 0;
    }

    // Get top errors
    const topErrors = Array.from(this.errors.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Get critical errors
    const criticalErrors = Array.from(this.errors.values())
      .filter(e => e.severity === ErrorSeverity.CRITICAL && !e.recovered);

    const errorRate = period > 0 ? (totalErrors / period) * 60 : 0; // errors per minute
    const recoveryRate = totalErrors > 0 ? (resolvedErrors / totalErrors) * 100 : 100;

    return {
      timestamp: new Date(),
      period,
      totalErrors,
      errorRate,
      categories,
      topErrors,
      recoveryRate,
      criticalErrors
    };
  }

  /**
   * Check alerts based on report
   */
  private checkAlerts(report: ErrorReport): void {
    // Check error rate
    if (report.errorRate > ALERT_THRESHOLDS.errorRate) {
      this.emit('alert', {
        type: 'high_error_rate',
        severity: 'critical',
        message: `High error rate: ${report.errorRate.toFixed(2)} errors/min`,
        threshold: ALERT_THRESHOLDS.errorRate,
        actual: report.errorRate
      });
    }

    // Check critical errors
    if (report.criticalErrors.length >= ALERT_THRESHOLDS.criticalCount) {
      this.emit('alert', {
        type: 'critical_errors',
        severity: 'critical',
        message: `${report.criticalErrors.length} unresolved critical errors`,
        threshold: ALERT_THRESHOLDS.criticalCount,
        actual: report.criticalErrors.length
      });
    }

    // Check recovery rate
    if (report.recoveryRate < (100 - ALERT_THRESHOLDS.recoveryFailureRate)) {
      this.emit('alert', {
        type: 'low_recovery_rate',
        severity: 'warning',
        message: `Low recovery rate: ${report.recoveryRate.toFixed(1)}%`,
        threshold: 100 - ALERT_THRESHOLDS.recoveryFailureRate,
        actual: report.recoveryRate
      });
    }

    // Check category thresholds
    for (const [category, stats] of report.categories) {
      if (stats.unresolved >= ALERT_THRESHOLDS.categoryThreshold) {
        this.emit('alert', {
          type: 'category_threshold',
          severity: 'warning',
          message: `High unresolved errors in ${category}: ${stats.unresolved}`,
          threshold: ALERT_THRESHOLDS.categoryThreshold,
          actual: stats.unresolved,
          category
        });
      }
    }
  }

  /**
   * Load persisted errors
   */
  private loadPersistedErrors(): void {
    try {
      if (fs.existsSync(this.persistPath)) {
        const data = fs.readFileSync(this.persistPath, 'utf-8');
        const persisted = JSON.parse(data);

        for (const error of persisted.errors) {
          error.firstOccurrence = new Date(error.firstOccurrence);
          error.lastOccurrence = new Date(error.lastOccurrence);
          error.timestamp = new Date(error.timestamp);
          this.errors.set(error.id, error);
        }

        logger.info('Loaded persisted errors', { count: this.errors.size });
      }
    } catch (error) {
      logger.error('Failed to load persisted errors', error);
    }
  }

  /**
   * Persist errors to disk
   */
  private persistErrors(): void {
    try {
      const dir = path.dirname(this.persistPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const data = {
        timestamp: new Date(),
        errors: Array.from(this.errors.values())
      };

      fs.writeFileSync(this.persistPath, JSON.stringify(data, null, 2));
    } catch (error) {
      logger.error('Failed to persist errors', error);
    }
  }

  /**
   * Clear errors
   */
  clearErrors(category?: ErrorCategory): void {
    if (category) {
      for (const [id, error] of this.errors) {
        if (error.category === category) {
          this.errors.delete(id);
        }
      }
    } else {
      this.errors.clear();
    }

    this.persistErrors();
  }

  /**
   * Get errors
   */
  getErrors(category?: ErrorCategory, severity?: ErrorSeverity): TrackedError[] {
    let errors = Array.from(this.errors.values());

    if (category) {
      errors = errors.filter(e => e.category === category);
    }

    if (severity) {
      errors = errors.filter(e => e.severity === severity);
    }

    return errors;
  }

  /**
   * Set recovery strategy
   */
  setRecoveryStrategy(category: ErrorCategory, strategy: RecoveryStrategy): void {
    this.recoveryStrategies.set(category, strategy);
  }
}