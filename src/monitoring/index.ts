/**
 * Monitoring System Index
 * Unified API for health monitoring, performance tracking, and alerting
 */

export * from "./health";
export * from "./performance";
export * from "./errors";
export * from "./alerts";
export * from "./diagnostics";
// export { MetricsDashboard } from './dashboard'; // Disabled until JSX is configured

import { EventEmitter } from "events";
import { HealthMonitor, SystemHealth, HealthStatus } from "./health";
import {
  PerformanceMonitor,
  PerformanceReport,
  MetricType,
  PerformanceAlert,
} from "./performance";
import {
  ErrorTracker,
  ErrorReport,
  ErrorCategory,
  ErrorSeverity,
  TrackedError,
} from "./errors";
import { AlertingSystem, AlertType, AlertSeverity, Alert } from "./alerts";
import { DiagnosticTools, DiagnosticReport } from "./diagnostics";
import { Logger } from "../utils/logger";

const logger = new Logger("MonitoringSystem");

// Monitoring configuration
export interface MonitoringConfig {
  projectPath?: string;
  healthCheckInterval?: number;
  performanceReportInterval?: number;
  errorReportInterval?: number;
  alertCheckInterval?: number;
  enableAutoRecovery?: boolean;
  enableAlerts?: boolean;
  persistMetrics?: boolean;
  [key: string]: unknown;
}

// Health status change event
export interface HealthStatusChange {
  previous: HealthStatus;
  current: HealthStatus;
  timestamp: Date;
  [key: string]: unknown;
  reason?: string;
}

// Notification event
export interface NotificationEvent {
  type: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

// Rollback event
export interface RollbackEvent {
  alertId: string;
  target?: string;
  params?: Record<string, unknown>;
  timestamp: Date;
  [key: string]: unknown;
}

// Restart event
export interface RestartEvent {
  alertId: string;
  target?: string;
  params?: Record<string, unknown>;
  timestamp: Date;
  [key: string]: unknown;
}

// Debug options
export interface DebugModeOptions {
  verbose?: boolean;
  traceErrors?: boolean;
  profilePerformance?: boolean;
  collectLogs?: boolean;
  outputPath?: string;
  [key: string]: unknown;
}

// Monitoring status
export interface MonitoringStatus {
  running: boolean;
  startedAt?: Date;
  health?: SystemHealth;
  performance?: PerformanceReport;
  errors?: ErrorReport;
  activeAlerts: number;
}

// Unified monitoring report
export interface MonitoringReport {
  timestamp: Date;
  health: SystemHealth;
  performance: PerformanceReport;
  errors: ErrorReport;
  alerts: Alert[];
  diagnostics?: DiagnosticReport;
}

/**
 * Unified Monitoring System
 * Orchestrates all monitoring components
 */
export class MonitoringSystem extends EventEmitter {
  private config: MonitoringConfig;
  private healthMonitor: HealthMonitor;
  private performanceMonitor: PerformanceMonitor;
  private errorTracker: ErrorTracker;
  private alertingSystem: AlertingSystem;
  private diagnosticTools: DiagnosticTools;
  private running: boolean = false;
  private startedAt?: Date;

  constructor(config: MonitoringConfig = {}) {
    super();
    this.config = {
      projectPath: process.cwd(),
      healthCheckInterval: 30000,
      performanceReportInterval: 60000,
      errorReportInterval: 60000,
      alertCheckInterval: 30000,
      enableAutoRecovery: true,
      enableAlerts: true,
      persistMetrics: true,
      ...config,
    };

    // Initialize monitors
    this.healthMonitor = new HealthMonitor(this.config.projectPath);
    this.performanceMonitor = new PerformanceMonitor();
    this.errorTracker = new ErrorTracker(this.config.projectPath);
    this.alertingSystem = new AlertingSystem(this.config.projectPath);
    this.diagnosticTools = new DiagnosticTools(this.config.projectPath);

    this.setupEventHandlers();
  }

  /**
   * Setup event handlers between components
   */
  private setupEventHandlers(): void {
    // Health monitor events
    this.healthMonitor.on("healthUpdate", (health: SystemHealth) => {
      this.handleHealthUpdate(health);
    });

    this.healthMonitor.on("statusChange", (change: HealthStatusChange) => {
      this.handleStatusChange(change);
    });

    // Performance monitor events
    this.performanceMonitor.on(
      "performanceReport",
      (report: PerformanceReport) => {
        this.handlePerformanceReport(report);
      },
    );

    this.performanceMonitor.on("performanceAlert", (alert: PerformanceAlert) => {
      this.handlePerformanceAlert(alert);
    });

    // Error tracker events
    this.errorTracker.on("errorTracked", (error: TrackedError) => {
      this.handleErrorTracked(error);
    });

    this.errorTracker.on("errorRecovered", (error: TrackedError) => {
      this.handleErrorRecovered(error);
    });

    this.errorTracker.on("errorReport", (report: ErrorReport) => {
      this.handleErrorReport(report);
    });

    // Alerting system events
    this.alertingSystem.on("alert", (alert: Alert) => {
      this.handleAlert(alert);
    });

    this.alertingSystem.on("notification", (notification: NotificationEvent) => {
      this.emit("notification", notification);
    });

    this.alertingSystem.on("rollback", (rollback: RollbackEvent) => {
      this.handleRollback(rollback);
    });

    this.alertingSystem.on("restart", (restart: RestartEvent) => {
      this.handleRestart(restart);
    });
  }

  /**
   * Start monitoring system
   */
  async start(): Promise<void> {
    if (this.running) {
      logger.warn("Monitoring system already running");
      return;
    }

    logger.info("Starting monitoring system", this.config);

    // Start all monitors
    await this.healthMonitor.start(this.config.healthCheckInterval);
    this.performanceMonitor.start(this.config.performanceReportInterval);
    this.errorTracker.start(this.config.errorReportInterval);

    if (this.config.enableAlerts) {
      this.alertingSystem.start(this.config.alertCheckInterval);
    }

    this.running = true;
    this.startedAt = new Date();

    // Perform initial health check
    const initialHealth = await this.healthMonitor.performHealthCheck();
    this.emit("started", {
      health: initialHealth,
      timestamp: this.startedAt,
    });

    logger.info("Monitoring system started successfully");
  }

  /**
   * Stop monitoring system
   */
  stop(): void {
    if (!this.running) {
      logger.warn("Monitoring system not running");
      return;
    }

    logger.info("Stopping monitoring system");

    // Stop all monitors
    this.healthMonitor.stop();
    this.performanceMonitor.stop();
    this.errorTracker.stop();
    this.alertingSystem.stop();

    this.running = false;
    this.emit("stopped", { timestamp: new Date() });

    logger.info("Monitoring system stopped");
  }

  /**
   * Get current status
   */
  getStatus(): MonitoringStatus {
    return {
      running: this.running,
      startedAt: this.startedAt,
      health: this.healthMonitor.getCurrentHealth() || undefined,
      performance: this.performanceMonitor.generateReport(),
      errors: this.errorTracker.generateReport(),
      activeAlerts: this.alertingSystem.getActiveAlerts().length,
    };
  }

  /**
   * Generate comprehensive report
   */
  async generateReport(
    includeDiagnostics: boolean = false,
  ): Promise<MonitoringReport> {
    const health = await this.healthMonitor.performHealthCheck();
    const performance = this.performanceMonitor.generateReport();
    const errors = this.errorTracker.generateReport();
    const alerts = this.alertingSystem.getActiveAlerts();

    const report: MonitoringReport = {
      timestamp: new Date(),
      health,
      performance,
      errors,
      alerts,
    };

    if (includeDiagnostics) {
      report.diagnostics = await this.diagnosticTools.runDiagnostics();
    }

    return report;
  }

  /**
   * Run diagnostics
   */
  async runDiagnostics(): Promise<DiagnosticReport> {
    return this.diagnosticTools.runDiagnostics();
  }

  /**
   * Track custom metric
   */
  trackMetric(
    type: MetricType,
    name: string,
    duration: number,
    success: boolean = true,
  ): void {
    this.performanceMonitor.recordMetric({
      type,
      name,
      duration,
      timestamp: new Date(),
      success,
    });
  }

  /**
   * Track error
   */
  trackError(
    error: Error | string,
    category?: ErrorCategory,
    severity?: ErrorSeverity,
    context?: Record<string, unknown>,
  ): void {
    this.errorTracker.trackError(error, category, severity, context);
  }

  /**
   * Create alert
   */
  createAlert(
    type: AlertType,
    severity: AlertSeverity,
    title: string,
    message: string,
    metadata?: Record<string, unknown>,
  ): void {
    if (this.config.enableAlerts) {
      this.alertingSystem.createAlert(type, severity, title, message, metadata);
    }
  }

  /**
   * Handle health update
   */
  private handleHealthUpdate(health: SystemHealth): void {
    // Check for critical health
    if (
      health.status === HealthStatus.CRITICAL ||
      health.status === HealthStatus.FAILED
    ) {
      this.createAlert(
        AlertType.HEALTH_DEGRADATION,
        AlertSeverity.CRITICAL,
        "System Health Critical",
        `System health score: ${health.overallScore}%`,
        { health },
      );
    }

    this.emit("healthUpdate", health);
  }

  /**
   * Handle status change
   */
  private handleStatusChange(change: HealthStatusChange): void {
    logger.info("Health status changed", change);

    if (change.current === HealthStatus.FAILED) {
      this.createAlert(
        AlertType.HEALTH_DEGRADATION,
        AlertSeverity.CRITICAL,
        "System Health Failed",
        "System health has failed",
        {
          previous: change.previous,
          current: change.current,
          timestamp: change.timestamp.toISOString(),
          reason: change.reason,
        },
      );
    }

    this.emit("statusChange", change);
  }

  /**
   * Handle performance report
   */
  private handlePerformanceReport(report: PerformanceReport): void {
    // Check for high error rate
    if (report.errorRate > 10) {
      this.createAlert(
        AlertType.PERFORMANCE_DEGRADATION,
        AlertSeverity.WARNING,
        "High Error Rate",
        `Error rate: ${report.errorRate.toFixed(1)}%`,
        { report },
      );
    }

    // Check for performance degradation
    if (report.averageLatency > 1000) {
      this.createAlert(
        AlertType.PERFORMANCE_DEGRADATION,
        AlertSeverity.WARNING,
        "Performance Degradation",
        `Average latency: ${report.averageLatency.toFixed(0)}ms`,
        { report },
      );
    }

    this.emit("performanceReport", report);
  }

  /**
   * Handle performance alert
   */
  private handlePerformanceAlert(alert: PerformanceAlert): void {
    this.createAlert(
      AlertType.PERFORMANCE_DEGRADATION,
      alert.severity === "critical"
        ? AlertSeverity.ERROR
        : AlertSeverity.WARNING,
      "Performance Alert",
      alert.message,
      {
        type: alert.type,
        severity: alert.severity,
        threshold: alert.threshold,
        actual: alert.actual,
        timestamp: alert.timestamp.toISOString(),
      },
    );
  }

  /**
   * Handle error tracked
   */
  private handleErrorTracked(error: TrackedError): void {
    // Auto-recovery if enabled
    if (this.config.enableAutoRecovery && error.recoveryAttempts === 0) {
      logger.info("Attempting auto-recovery", { errorId: error.id });
      // Recovery logic would go here
    }

    this.emit("errorTracked", error);
  }

  /**
   * Handle error recovered
   */
  private handleErrorRecovered(error: TrackedError): void {
    logger.info("Error recovered", { errorId: error.id });
    this.emit("errorRecovered", error);
  }

  /**
   * Handle error report
   */
  private handleErrorReport(report: ErrorReport): void {
    // Check for high error rate
    if (report.errorRate > 10) {
      this.createAlert(
        AlertType.HIGH_ERROR_RATE,
        AlertSeverity.ERROR,
        "High Error Rate",
        `${report.errorRate.toFixed(2)} errors per minute`,
        { report },
      );
    }

    this.emit("errorReport", report);
  }

  /**
   * Handle alert
   */
  private handleAlert(alert: Alert): void {
    logger.info("Alert created", {
      type: alert.type,
      severity: alert.severity,
      title: alert.title,
    });

    this.emit("alert", alert);
  }

  /**
   * Handle rollback request
   */
  private handleRollback(rollback: RollbackEvent): void {
    logger.warn("Rollback requested", rollback);

    if (this.config.enableAutoRecovery) {
      // Implement rollback logic
      this.emit("rollback", rollback);
    }
  }

  /**
   * Handle restart request
   */
  private handleRestart(restart: RestartEvent): void {
    logger.warn("Restart requested", restart);

    if (this.config.enableAutoRecovery) {
      // Implement restart logic
      this.emit("restart", restart);
    }
  }

  /**
   * Enable debug mode
   */
  enableDebugMode(options?: DebugModeOptions): void {
    this.diagnosticTools.enableDebugMode(options);
  }

  /**
   * Disable debug mode
   */
  disableDebugMode(): void {
    this.diagnosticTools.disableDebugMode();
  }

  /**
   * Collect logs for support
   */
  async collectLogs(outputPath?: string): Promise<string> {
    return this.diagnosticTools.collectLogs(outputPath);
  }

  /**
   * Get health monitor
   */
  getHealthMonitor(): HealthMonitor {
    return this.healthMonitor;
  }

  /**
   * Get performance monitor
   */
  getPerformanceMonitor(): PerformanceMonitor {
    return this.performanceMonitor;
  }

  /**
   * Get error tracker
   */
  getErrorTracker(): ErrorTracker {
    return this.errorTracker;
  }

  /**
   * Get alerting system
   */
  getAlertingSystem(): AlertingSystem {
    return this.alertingSystem;
  }

  /**
   * Get diagnostic tools
   */
  getDiagnosticTools(): DiagnosticTools {
    return this.diagnosticTools;
  }
}
