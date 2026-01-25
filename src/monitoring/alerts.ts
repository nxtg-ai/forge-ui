/**
 * Alerting System
 * Manages alerts and notifications for system health issues
 */

import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../utils/logger';
import { HealthStatus } from './health';
import { ErrorSeverity } from './errors';

const logger = new Logger('AlertingSystem');

// Alert severity levels
export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

// Alert types
export enum AlertType {
  HEALTH_DEGRADATION = 'health_degradation',
  STATE_SYNC_FAILURE = 'state_sync_failure',
  AGENT_FAILURE = 'agent_failure',
  AUTOMATION_ROLLBACK = 'automation_rollback',
  HIGH_ERROR_RATE = 'high_error_rate',
  PERFORMANCE_DEGRADATION = 'performance_degradation',
  MEMORY_PRESSURE = 'memory_pressure',
  DISK_SPACE_LOW = 'disk_space_low',
  CUSTOM = 'custom'
}

// Alert condition
export interface AlertCondition {
  type: AlertType;
  threshold: number;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  window?: number; // Time window in seconds
  consecutive?: number; // Number of consecutive violations
}

// Alert definition
export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  resolved: boolean;
  metadata?: Record<string, any>;
  actions?: AlertAction[];
}

// Alert action
export interface AlertAction {
  type: 'rollback' | 'restart' | 'notify' | 'execute' | 'log';
  target?: string;
  params?: Record<string, any>;
  executed: boolean;
  result?: any;
}

// Alert rule
export interface AlertRule {
  id: string;
  name: string;
  condition: AlertCondition;
  severity: AlertSeverity;
  actions: AlertAction[];
  enabled: boolean;
  cooldown?: number; // Seconds before rule can trigger again
  lastTriggered?: Date;
}

// Alert statistics
export interface AlertStats {
  total: number;
  bySeverity: Record<AlertSeverity, number>;
  byType: Record<AlertType, number>;
  acknowledged: number;
  resolved: number;
  active: number;
}

// Default alert rules
const DEFAULT_RULES: AlertRule[] = [
  {
    id: 'health-critical',
    name: 'Critical Health Status',
    condition: { type: AlertType.HEALTH_DEGRADATION, threshold: 50, operator: 'lt' },
    severity: AlertSeverity.CRITICAL,
    actions: [
      { type: 'notify', executed: false },
      { type: 'log', executed: false }
    ],
    enabled: true,
    cooldown: 300
  },
  {
    id: 'state-sync-failure',
    name: 'State Sync Failure',
    condition: { type: AlertType.STATE_SYNC_FAILURE, threshold: 3, operator: 'gte', consecutive: 3 },
    severity: AlertSeverity.ERROR,
    actions: [
      { type: 'notify', executed: false },
      { type: 'restart', target: 'state-manager', executed: false }
    ],
    enabled: true,
    cooldown: 600
  },
  {
    id: 'high-error-rate',
    name: 'High Error Rate',
    condition: { type: AlertType.HIGH_ERROR_RATE, threshold: 10, operator: 'gt', window: 60 },
    severity: AlertSeverity.WARNING,
    actions: [
      { type: 'notify', executed: false },
      { type: 'log', executed: false }
    ],
    enabled: true,
    cooldown: 300
  },
  {
    id: 'memory-pressure',
    name: 'Memory Pressure',
    condition: { type: AlertType.MEMORY_PRESSURE, threshold: 90, operator: 'gt' },
    severity: AlertSeverity.WARNING,
    actions: [
      { type: 'notify', executed: false },
      { type: 'execute', target: 'gc', executed: false }
    ],
    enabled: true,
    cooldown: 600
  },
  {
    id: 'disk-space-low',
    name: 'Low Disk Space',
    condition: { type: AlertType.DISK_SPACE_LOW, threshold: 10, operator: 'lt' },
    severity: AlertSeverity.ERROR,
    actions: [
      { type: 'notify', executed: false },
      { type: 'log', executed: false }
    ],
    enabled: true,
    cooldown: 3600
  }
];

export class AlertingSystem extends EventEmitter {
  private alerts: Map<string, Alert> = new Map();
  private rules: Map<string, AlertRule> = new Map();
  private alertHistory: Alert[] = [];
  private maxHistorySize = 1000;
  private persistPath: string;
  private checkInterval: NodeJS.Timeout | null = null;
  private violationCounts: Map<string, number> = new Map();

  constructor(projectPath?: string) {
    super();
    this.persistPath = path.join(projectPath || process.cwd(), '.claude', 'monitoring', 'alerts.json');
    this.loadPersistedAlerts();
    this.initializeRules();
  }

  /**
   * Initialize default rules
   */
  private initializeRules(): void {
    for (const rule of DEFAULT_RULES) {
      this.rules.set(rule.id, { ...rule });
    }
  }

  /**
   * Start alert monitoring
   */
  start(intervalMs: number = 30000): void {
    logger.info('Starting alert monitoring', { interval: intervalMs });

    this.checkInterval = setInterval(() => {
      this.evaluateRules();
    }, intervalMs);
  }

  /**
   * Stop alert monitoring
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    this.persistAlerts();
    logger.info('Alert monitoring stopped');
  }

  /**
   * Create an alert
   */
  createAlert(
    type: AlertType,
    severity: AlertSeverity,
    title: string,
    message: string,
    metadata?: Record<string, any>
  ): Alert {
    const alert: Alert = {
      id: this.generateAlertId(),
      type,
      severity,
      title,
      message,
      timestamp: new Date(),
      acknowledged: false,
      resolved: false,
      metadata,
      actions: []
    };

    this.alerts.set(alert.id, alert);
    this.alertHistory.push(alert);

    if (this.alertHistory.length > this.maxHistorySize) {
      this.alertHistory.shift();
    }

    // Log alert
    this.logAlert(alert);

    // Emit alert event
    this.emit('alert', alert);

    // Check if any rules should trigger actions
    this.checkRuleActions(alert);

    return alert;
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): void {
    const alert = this.alerts.get(alertId);
    if (alert && !alert.acknowledged) {
      alert.acknowledged = true;
      this.emit('alertAcknowledged', alert);
      logger.info('Alert acknowledged', { alertId, type: alert.type });
    }
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): void {
    const alert = this.alerts.get(alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.acknowledged = true;
      this.emit('alertResolved', alert);
      logger.info('Alert resolved', { alertId, type: alert.type });

      // Remove from active alerts after a delay
      setTimeout(() => {
        this.alerts.delete(alertId);
      }, 60000); // Keep for 1 minute after resolution
    }
  }

  /**
   * Add custom rule
   */
  addRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
    logger.info('Alert rule added', { ruleId: rule.id, name: rule.name });
  }

  /**
   * Update rule
   */
  updateRule(ruleId: string, updates: Partial<AlertRule>): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      Object.assign(rule, updates);
      logger.info('Alert rule updated', { ruleId });
    }
  }

  /**
   * Enable/disable rule
   */
  setRuleEnabled(ruleId: string, enabled: boolean): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = enabled;
      logger.info(`Alert rule ${enabled ? 'enabled' : 'disabled'}`, { ruleId });
    }
  }

  /**
   * Evaluate rules against current metrics
   */
  private evaluateRules(): void {
    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;

      // Check cooldown
      if (rule.lastTriggered) {
        const cooldownExpiry = new Date(rule.lastTriggered.getTime() + (rule.cooldown || 0) * 1000);
        if (cooldownExpiry > new Date()) {
          continue;
        }
      }

      // Evaluate condition (this would normally check actual metrics)
      const violated = this.evaluateCondition(rule.condition);

      if (violated) {
        // Track consecutive violations if required
        if (rule.condition.consecutive) {
          const count = (this.violationCounts.get(rule.id) || 0) + 1;
          this.violationCounts.set(rule.id, count);

          if (count < rule.condition.consecutive) {
            continue;
          }
        }

        // Create alert
        const alert = this.createAlert(
          rule.condition.type,
          rule.severity,
          rule.name,
          `Alert rule "${rule.name}" triggered`,
          { ruleId: rule.id }
        );

        // Execute actions
        this.executeActions(alert, rule.actions);

        // Update rule
        rule.lastTriggered = new Date();
        this.violationCounts.set(rule.id, 0);
      } else {
        // Reset violation count
        this.violationCounts.set(rule.id, 0);
      }
    }
  }

  /**
   * Evaluate a condition
   */
  private evaluateCondition(condition: AlertCondition): boolean {
    // This is a placeholder - in real implementation, this would check actual metrics
    // For now, return false to avoid triggering alerts
    return false;
  }

  /**
   * Check if alert should trigger rule actions
   */
  private checkRuleActions(alert: Alert): void {
    for (const rule of this.rules.values()) {
      if (rule.enabled && rule.condition.type === alert.type) {
        this.executeActions(alert, rule.actions);
      }
    }
  }

  /**
   * Execute alert actions
   */
  private async executeActions(alert: Alert, actions: AlertAction[]): Promise<void> {
    for (const action of actions) {
      if (action.executed) continue;

      try {
        switch (action.type) {
          case 'notify':
            await this.executeNotify(alert);
            break;
          case 'log':
            await this.executeLog(alert);
            break;
          case 'rollback':
            await this.executeRollback(alert, action);
            break;
          case 'restart':
            await this.executeRestart(alert, action);
            break;
          case 'execute':
            await this.executeCustom(alert, action);
            break;
        }

        action.executed = true;
        logger.info('Alert action executed', {
          alertId: alert.id,
          actionType: action.type
        });
      } catch (error) {
        logger.error('Failed to execute alert action', {
          alertId: alert.id,
          actionType: action.type,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    // Store actions with alert
    if (!alert.actions) alert.actions = [];
    alert.actions.push(...actions);
  }

  /**
   * Execute notify action
   */
  private async executeNotify(alert: Alert): Promise<void> {
    this.emit('notification', {
      type: 'alert',
      severity: alert.severity,
      title: alert.title,
      message: alert.message,
      timestamp: alert.timestamp
    });
  }

  /**
   * Execute log action
   */
  private async executeLog(alert: Alert): Promise<void> {
    const logEntry = {
      alertId: alert.id,
      type: alert.type,
      severity: alert.severity,
      title: alert.title,
      message: alert.message,
      timestamp: alert.timestamp,
      metadata: alert.metadata
    };

    // Log to file
    const logPath = path.join(
      path.dirname(this.persistPath),
      `alert-log-${new Date().toISOString().split('T')[0]}.json`
    );

    try {
      const existing = fs.existsSync(logPath)
        ? JSON.parse(fs.readFileSync(logPath, 'utf-8'))
        : [];

      existing.push(logEntry);
      fs.writeFileSync(logPath, JSON.stringify(existing, null, 2));
    } catch (error) {
      logger.error('Failed to write alert log', error as Error);
    }
  }

  /**
   * Execute rollback action
   */
  private async executeRollback(alert: Alert, action: AlertAction): Promise<void> {
    this.emit('rollback', {
      alertId: alert.id,
      target: action.target,
      params: action.params
    });
  }

  /**
   * Execute restart action
   */
  private async executeRestart(alert: Alert, action: AlertAction): Promise<void> {
    this.emit('restart', {
      alertId: alert.id,
      target: action.target,
      params: action.params
    });
  }

  /**
   * Execute custom action
   */
  private async executeCustom(alert: Alert, action: AlertAction): Promise<void> {
    this.emit('customAction', {
      alertId: alert.id,
      target: action.target,
      params: action.params
    });
  }

  /**
   * Generate alert ID
   */
  private generateAlertId(): string {
    return `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log alert based on severity
   */
  private logAlert(alert: Alert): void {
    const logData = {
      id: alert.id,
      type: alert.type,
      title: alert.title,
      message: alert.message,
      metadata: alert.metadata
    };

    switch (alert.severity) {
      case AlertSeverity.CRITICAL:
        logger.error('CRITICAL ALERT', logData);
        break;
      case AlertSeverity.ERROR:
        logger.error('ERROR ALERT', logData);
        break;
      case AlertSeverity.WARNING:
        logger.warn('WARNING ALERT', logData);
        break;
      case AlertSeverity.INFO:
        logger.info('INFO ALERT', logData);
        break;
    }
  }

  /**
   * Load persisted alerts
   */
  private loadPersistedAlerts(): void {
    try {
      if (fs.existsSync(this.persistPath)) {
        const data = JSON.parse(fs.readFileSync(this.persistPath, 'utf-8'));

        for (const alert of data.alerts) {
          alert.timestamp = new Date(alert.timestamp);
          if (!alert.resolved) {
            this.alerts.set(alert.id, alert);
          }
          this.alertHistory.push(alert);
        }

        logger.info('Loaded persisted alerts', { count: this.alerts.size });
      }
    } catch (error) {
      logger.error('Failed to load persisted alerts', error);
    }
  }

  /**
   * Persist alerts to disk
   */
  private persistAlerts(): void {
    try {
      const dir = path.dirname(this.persistPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const data = {
        timestamp: new Date(),
        alerts: Array.from(this.alerts.values()),
        history: this.alertHistory.slice(-100) // Keep last 100 for history
      };

      fs.writeFileSync(this.persistPath, JSON.stringify(data, null, 2));
    } catch (error) {
      logger.error('Failed to persist alerts', error);
    }
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values()).filter(a => !a.resolved);
  }

  /**
   * Get alerts by type
   */
  getAlertsByType(type: AlertType): Alert[] {
    return Array.from(this.alerts.values()).filter(a => a.type === type);
  }

  /**
   * Get alerts by severity
   */
  getAlertsBySeverity(severity: AlertSeverity): Alert[] {
    return Array.from(this.alerts.values()).filter(a => a.severity === severity);
  }

  /**
   * Get alert statistics
   */
  getStats(): AlertStats {
    const alerts = Array.from(this.alerts.values());

    const stats: AlertStats = {
      total: alerts.length,
      bySeverity: {
        [AlertSeverity.INFO]: 0,
        [AlertSeverity.WARNING]: 0,
        [AlertSeverity.ERROR]: 0,
        [AlertSeverity.CRITICAL]: 0
      },
      byType: {} as Record<AlertType, number>,
      acknowledged: 0,
      resolved: 0,
      active: 0
    };

    for (const alert of alerts) {
      stats.bySeverity[alert.severity]++;

      if (!stats.byType[alert.type]) {
        stats.byType[alert.type] = 0;
      }
      stats.byType[alert.type]++;

      if (alert.acknowledged) stats.acknowledged++;
      if (alert.resolved) stats.resolved++;
      if (!alert.resolved) stats.active++;
    }

    return stats;
  }

  /**
   * Clear resolved alerts
   */
  clearResolvedAlerts(): void {
    for (const [id, alert] of this.alerts) {
      if (alert.resolved) {
        this.alerts.delete(id);
      }
    }
  }
}