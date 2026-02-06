/**
 * Performance Monitoring System
 * Tracks and analyzes system performance metrics
 */

import { EventEmitter } from "events";
import { performance, PerformanceObserver } from "perf_hooks";
import { Logger } from "../utils/logger";

const logger = new Logger("PerformanceMonitor");

// Performance metric types
export enum MetricType {
  STATE_UPDATE_LATENCY = "state_update_latency",
  COMMAND_EXECUTION = "command_execution",
  UI_RENDER = "ui_render",
  AGENT_COORDINATION = "agent_coordination",
  FILE_OPERATION = "file_operation",
  API_CALL = "api_call",
  DATABASE_QUERY = "database_query",
  CACHE_OPERATION = "cache_operation",
}

// Performance metric
export interface PerformanceMetric {
  type: MetricType;
  name: string;
  duration: number; // milliseconds
  timestamp: Date;
  metadata?: Record<string, unknown>;
  success: boolean;
  error?: string;
}

// Performance statistics
export interface PerformanceStats {
  type: MetricType;
  count: number;
  totalDuration: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  p50: number; // median
  p90: number; // 90th percentile
  p99: number; // 99th percentile
  successRate: number;
  lastUpdated: Date;
}

// Performance report
export interface PerformanceReport {
  timestamp: Date;
  duration: number; // report period in seconds
  metrics: Map<MetricType, PerformanceStats>;
  totalOperations: number;
  averageLatency: number;
  errorRate: number;
  alerts: PerformanceAlert[];
}

// Performance alert
export interface PerformanceAlert {
  type: MetricType;
  severity: "warning" | "critical";
  message: string;
  threshold: number;
  actual: number;
  timestamp: Date;
  [key: string]: unknown;
}

// Performance thresholds (in milliseconds)
const PERFORMANCE_THRESHOLDS: Record<
  MetricType,
  { warning: number; critical: number }
> = {
  [MetricType.STATE_UPDATE_LATENCY]: { warning: 100, critical: 500 },
  [MetricType.COMMAND_EXECUTION]: { warning: 1000, critical: 5000 },
  [MetricType.UI_RENDER]: { warning: 16, critical: 50 }, // 60fps = 16ms
  [MetricType.AGENT_COORDINATION]: { warning: 500, critical: 2000 },
  [MetricType.FILE_OPERATION]: { warning: 100, critical: 1000 },
  [MetricType.API_CALL]: { warning: 500, critical: 3000 },
  [MetricType.DATABASE_QUERY]: { warning: 100, critical: 1000 },
  [MetricType.CACHE_OPERATION]: { warning: 10, critical: 50 },
};

export class PerformanceMonitor extends EventEmitter {
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private activeOperations: Map<string, number> = new Map();
  private observer: PerformanceObserver | null = null;
  private reportInterval: NodeJS.Timeout | null = null;
  private maxMetricsPerType = 1000;
  private startTime: number;

  constructor() {
    super();
    this.startTime = Date.now();
    this.setupObserver();
  }

  /**
   * Setup performance observer
   */
  private setupObserver(): void {
    this.observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.processPerformanceEntry(entry);
      }
    });

    this.observer.observe({ entryTypes: ["measure", "mark"] });
  }

  /**
   * Start performance monitoring
   */
  start(reportIntervalMs: number = 60000): void {
    logger.info("Starting performance monitoring", {
      interval: reportIntervalMs,
    });

    this.reportInterval = setInterval(() => {
      const report = this.generateReport();
      this.emit("performanceReport", report);
      this.checkAlerts(report);
    }, reportIntervalMs);
  }

  /**
   * Stop performance monitoring
   */
  stop(): void {
    if (this.reportInterval) {
      clearInterval(this.reportInterval);
      this.reportInterval = null;
    }

    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    logger.info("Performance monitoring stopped");
  }

  /**
   * Start tracking an operation
   */
  startOperation(
    id: string,
    type: MetricType,
    metadata?: Record<string, unknown>,
  ): void {
    const markName = `${type}-${id}-start`;
    performance.mark(markName);
    this.activeOperations.set(id, Date.now());

    logger.debug("Started operation", { id, type, metadata });
  }

  /**
   * End tracking an operation
   */
  endOperation(
    id: string,
    type: MetricType,
    success: boolean = true,
    error?: string,
  ): void {
    const startTime = this.activeOperations.get(id);
    if (!startTime) {
      logger.warn("Operation not found", { id });
      return;
    }

    const markName = `${type}-${id}-end`;
    const measureName = `${type}-${id}`;
    const startMarkName = `${type}-${id}-start`;

    performance.mark(markName);
    performance.measure(measureName, startMarkName, markName);

    const duration = Date.now() - startTime;

    const metric: PerformanceMetric = {
      type,
      name: measureName,
      duration,
      timestamp: new Date(),
      success,
      error,
    };

    this.recordMetric(metric);
    this.activeOperations.delete(id);

    logger.debug("Ended operation", { id, type, duration, success });

    // Clean up marks
    performance.clearMarks(startMarkName);
    performance.clearMarks(markName);
    performance.clearMeasures(measureName);
  }

  /**
   * Record a performance metric directly
   */
  recordMetric(metric: PerformanceMetric): void {
    const key = metric.type;

    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }

    const metrics = this.metrics.get(key)!;
    metrics.push(metric);

    // Limit stored metrics
    if (metrics.length > this.maxMetricsPerType) {
      metrics.shift();
    }

    // Check for threshold violations
    this.checkThresholds(metric);
  }

  /**
   * Track state update latency
   */
  trackStateUpdate(duration: number): void {
    this.recordMetric({
      type: MetricType.STATE_UPDATE_LATENCY,
      name: "state-update",
      duration,
      timestamp: new Date(),
      success: true,
    });
  }

  /**
   * Track command execution time
   */
  trackCommandExecution(
    command: string,
    duration: number,
    success: boolean = true,
  ): void {
    this.recordMetric({
      type: MetricType.COMMAND_EXECUTION,
      name: `command-${command}`,
      duration,
      timestamp: new Date(),
      success,
      metadata: { command },
    });
  }

  /**
   * Track UI render performance
   */
  trackUIRender(component: string, duration: number): void {
    this.recordMetric({
      type: MetricType.UI_RENDER,
      name: `render-${component}`,
      duration,
      timestamp: new Date(),
      success: true,
      metadata: { component },
    });
  }

  /**
   * Track agent coordination overhead
   */
  trackAgentCoordination(agentCount: number, duration: number): void {
    this.recordMetric({
      type: MetricType.AGENT_COORDINATION,
      name: "agent-coordination",
      duration,
      timestamp: new Date(),
      success: true,
      metadata: { agentCount },
    });
  }

  /**
   * Process performance entry from observer
   */
  private processPerformanceEntry(entry: PerformanceEntry): void {
    // Extract type from entry name
    const parts = entry.name.split("-");
    const typeStr = parts[0];

    // Map to metric type
    const type = this.getMetricTypeFromString(typeStr);
    if (!type) return;

    this.recordMetric({
      type,
      name: entry.name,
      duration: entry.duration,
      timestamp: new Date(entry.startTime),
      success: true,
    });
  }

  /**
   * Get metric type from string
   */
  private getMetricTypeFromString(str: string): MetricType | null {
    const mapping: Record<string, MetricType> = {
      state_update: MetricType.STATE_UPDATE_LATENCY,
      command: MetricType.COMMAND_EXECUTION,
      ui: MetricType.UI_RENDER,
      agent: MetricType.AGENT_COORDINATION,
      file: MetricType.FILE_OPERATION,
      api: MetricType.API_CALL,
      db: MetricType.DATABASE_QUERY,
      cache: MetricType.CACHE_OPERATION,
    };

    return mapping[str] || null;
  }

  /**
   * Calculate statistics for a set of metrics
   */
  private calculateStats(
    metrics: PerformanceMetric[],
  ): PerformanceStats | null {
    if (metrics.length === 0) return null;

    const durations = metrics.map((m) => m.duration).sort((a, b) => a - b);
    const successCount = metrics.filter((m) => m.success).length;

    return {
      type: metrics[0].type,
      count: metrics.length,
      totalDuration: durations.reduce((a, b) => a + b, 0),
      averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      p50: this.percentile(durations, 50),
      p90: this.percentile(durations, 90),
      p99: this.percentile(durations, 99),
      successRate: (successCount / metrics.length) * 100,
      lastUpdated: new Date(),
    };
  }

  /**
   * Calculate percentile
   */
  private percentile(sorted: number[], p: number): number {
    const index = Math.ceil((sorted.length * p) / 100) - 1;
    return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
  }

  /**
   * Check thresholds for a metric
   */
  private checkThresholds(metric: PerformanceMetric): void {
    const thresholds = PERFORMANCE_THRESHOLDS[metric.type];
    if (!thresholds) return;

    if (metric.duration > thresholds.critical) {
      const alert: PerformanceAlert = {
        type: metric.type,
        severity: "critical",
        message: `Critical performance degradation in ${metric.type}`,
        threshold: thresholds.critical,
        actual: metric.duration,
        timestamp: new Date(),
      };

      this.emit("performanceAlert", alert);
      logger.error("Critical performance threshold exceeded", alert);
    } else if (metric.duration > thresholds.warning) {
      const alert: PerformanceAlert = {
        type: metric.type,
        severity: "warning",
        message: `Performance warning in ${metric.type}`,
        threshold: thresholds.warning,
        actual: metric.duration,
        timestamp: new Date(),
      };

      this.emit("performanceAlert", alert);
      logger.warn("Performance threshold warning", alert);
    }
  }

  /**
   * Generate performance report
   */
  generateReport(): PerformanceReport {
    const stats = new Map<MetricType, PerformanceStats>();
    const alerts: PerformanceAlert[] = [];

    let totalOperations = 0;
    let totalDuration = 0;
    let totalErrors = 0;

    // Calculate stats for each metric type
    for (const [key, metrics] of this.metrics) {
      const typeStats = this.calculateStats(metrics);
      if (typeStats) {
        stats.set(typeStats.type, typeStats);
        totalOperations += typeStats.count;
        totalDuration += typeStats.totalDuration;
        totalErrors += Math.round(
          typeStats.count * (1 - typeStats.successRate / 100),
        );

        // Check for performance issues
        const thresholds = PERFORMANCE_THRESHOLDS[typeStats.type];
        if (thresholds) {
          if (typeStats.p90 > thresholds.critical) {
            alerts.push({
              type: typeStats.type,
              severity: "critical",
              message: `P90 latency exceeds critical threshold`,
              threshold: thresholds.critical,
              actual: typeStats.p90,
              timestamp: new Date(),
            });
          } else if (typeStats.p90 > thresholds.warning) {
            alerts.push({
              type: typeStats.type,
              severity: "warning",
              message: `P90 latency exceeds warning threshold`,
              threshold: thresholds.warning,
              actual: typeStats.p90,
              timestamp: new Date(),
            });
          }
        }
      }
    }

    const duration = (Date.now() - this.startTime) / 1000;
    const averageLatency =
      totalOperations > 0 ? totalDuration / totalOperations : 0;
    const errorRate =
      totalOperations > 0 ? (totalErrors / totalOperations) * 100 : 0;

    return {
      timestamp: new Date(),
      duration,
      metrics: stats,
      totalOperations,
      averageLatency,
      errorRate,
      alerts,
    };
  }

  /**
   * Check alerts in report
   */
  private checkAlerts(report: PerformanceReport): void {
    for (const alert of report.alerts) {
      this.emit("performanceAlert", alert);
    }

    // Check overall error rate
    if (report.errorRate > 10) {
      const alert: PerformanceAlert = {
        type: MetricType.COMMAND_EXECUTION,
        severity: "critical",
        message: "High error rate detected",
        threshold: 10,
        actual: report.errorRate,
        timestamp: new Date(),
      };

      this.emit("performanceAlert", alert);
      logger.error("High error rate", { errorRate: report.errorRate });
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(type?: MetricType): PerformanceMetric[] {
    if (type) {
      return this.metrics.get(type) || [];
    }

    const allMetrics: PerformanceMetric[] = [];
    for (const metrics of this.metrics.values()) {
      allMetrics.push(...metrics);
    }

    return allMetrics;
  }

  /**
   * Clear metrics
   */
  clearMetrics(type?: MetricType): void {
    if (type) {
      this.metrics.delete(type);
    } else {
      this.metrics.clear();
    }
  }

  /**
   * Get memory usage
   */
  getMemoryUsage(): {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
    arrayBuffers: number;
  } {
    const usage = process.memoryUsage();
    return {
      rss: usage.rss / 1024 / 1024, // MB
      heapTotal: usage.heapTotal / 1024 / 1024,
      heapUsed: usage.heapUsed / 1024 / 1024,
      external: usage.external / 1024 / 1024,
      arrayBuffers: usage.arrayBuffers / 1024 / 1024,
    };
  }
}
