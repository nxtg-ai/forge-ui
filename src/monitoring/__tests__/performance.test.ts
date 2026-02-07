/**
 * Tests for Performance Monitoring System
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EventEmitter } from "events";
import {
  PerformanceMonitor,
  MetricType,
  PerformanceMetric,
  PerformanceAlert,
  PerformanceReport,
} from "../performance";

// Mock logger
vi.mock("../../utils/logger", () => ({
  Logger: class {
    info = vi.fn();
    warn = vi.fn();
    error = vi.fn();
    debug = vi.fn();
  },
}));

// Hoist mocks for perf_hooks
const mockPerformance = vi.hoisted(() => ({
  mark: vi.fn(),
  measure: vi.fn(),
  clearMarks: vi.fn(),
  clearMeasures: vi.fn(),
  now: vi.fn(() => Date.now()),
}));

let observerCallback: any = null;

const mockObserverInstance = vi.hoisted(() => ({
  observe: vi.fn(),
  disconnect: vi.fn(),
}));

vi.mock("perf_hooks", () => {
  class PerformanceObserver {
    static _callback: any;

    constructor(callback: any) {
      observerCallback = callback;
      PerformanceObserver._callback = callback;
    }

    observe = mockObserverInstance.observe;
    disconnect = mockObserverInstance.disconnect;
  }

  return {
    performance: mockPerformance,
    PerformanceObserver,
    default: {
      performance: mockPerformance,
      PerformanceObserver,
    },
  };
});

describe("PerformanceMonitor", () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    monitor = new PerformanceMonitor();
  });

  afterEach(() => {
    monitor.stop();
    vi.useRealTimers();
  });

  describe("constructor", () => {
    it("creates a performance monitor instance", () => {
      expect(monitor).toBeInstanceOf(PerformanceMonitor);
      expect(monitor).toBeInstanceOf(EventEmitter);
    });

    it("sets up performance observer", () => {
      expect(mockObserverInstance.observe).toHaveBeenCalledWith({
        entryTypes: ["measure", "mark"],
      });
    });
  });

  describe("start", () => {
    it("starts performance monitoring with default interval", () => {
      const reportSpy = vi.fn();
      monitor.on("performanceReport", reportSpy);

      monitor.start();

      // Fast-forward to first report
      vi.advanceTimersByTime(60000);

      expect(reportSpy).toHaveBeenCalled();
    });

    it("starts performance monitoring with custom interval", () => {
      const reportSpy = vi.fn();
      monitor.on("performanceReport", reportSpy);

      monitor.start(30000);

      // Fast-forward to first report
      vi.advanceTimersByTime(30000);

      expect(reportSpy).toHaveBeenCalledTimes(1);

      // Fast-forward to second report
      vi.advanceTimersByTime(30000);

      expect(reportSpy).toHaveBeenCalledTimes(2);
    });

    it("emits performance reports at regular intervals", () => {
      const reportSpy = vi.fn();
      monitor.on("performanceReport", reportSpy);

      monitor.start(10000);

      vi.advanceTimersByTime(10000);
      expect(reportSpy).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(10000);
      expect(reportSpy).toHaveBeenCalledTimes(2);

      vi.advanceTimersByTime(10000);
      expect(reportSpy).toHaveBeenCalledTimes(3);
    });
  });

  describe("stop", () => {
    it("stops performance monitoring", () => {
      const reportSpy = vi.fn();
      monitor.on("performanceReport", reportSpy);

      monitor.start(10000);
      monitor.stop();

      vi.advanceTimersByTime(10000);

      expect(reportSpy).not.toHaveBeenCalled();
    });

    it("disconnects performance observer", () => {
      monitor.stop();

      expect(mockObserverInstance.disconnect).toHaveBeenCalled();
    });

    it("can be called multiple times safely", () => {
      monitor.stop();
      monitor.stop();

      expect(mockObserverInstance.disconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe("startOperation and endOperation", () => {
    it("tracks operation duration", () => {
      const opId = "test-op-1";

      monitor.startOperation(opId, MetricType.COMMAND_EXECUTION);

      expect(mockPerformance.mark).toHaveBeenCalledWith(
        `${MetricType.COMMAND_EXECUTION}-${opId}-start`,
      );

      vi.advanceTimersByTime(100);

      monitor.endOperation(opId, MetricType.COMMAND_EXECUTION);

      expect(mockPerformance.mark).toHaveBeenCalledWith(
        `${MetricType.COMMAND_EXECUTION}-${opId}-end`,
      );
      expect(mockPerformance.measure).toHaveBeenCalled();

      const metrics = monitor.getMetrics(MetricType.COMMAND_EXECUTION);
      expect(metrics.length).toBe(1);
      expect(metrics[0].duration).toBeGreaterThanOrEqual(100);
    });

    it("tracks operation with metadata", () => {
      const opId = "test-op-2";
      const metadata = { command: "test-command" };

      monitor.startOperation(opId, MetricType.COMMAND_EXECUTION, metadata);
      monitor.endOperation(opId, MetricType.COMMAND_EXECUTION);

      const metrics = monitor.getMetrics(MetricType.COMMAND_EXECUTION);
      expect(metrics.length).toBe(1);
    });

    it("tracks failed operations", () => {
      const opId = "test-op-3";
      const error = "Operation failed";

      monitor.startOperation(opId, MetricType.COMMAND_EXECUTION);
      monitor.endOperation(opId, MetricType.COMMAND_EXECUTION, false, error);

      const metrics = monitor.getMetrics(MetricType.COMMAND_EXECUTION);
      expect(metrics.length).toBe(1);
      expect(metrics[0].success).toBe(false);
      expect(metrics[0].error).toBe(error);
    });

    it("handles ending non-existent operation gracefully", () => {
      monitor.endOperation("non-existent", MetricType.COMMAND_EXECUTION);

      const metrics = monitor.getMetrics(MetricType.COMMAND_EXECUTION);
      expect(metrics.length).toBe(0);
    });

    it("cleans up performance marks and measures", () => {
      const opId = "test-op-4";

      monitor.startOperation(opId, MetricType.COMMAND_EXECUTION);
      monitor.endOperation(opId, MetricType.COMMAND_EXECUTION);

      expect(mockPerformance.clearMarks).toHaveBeenCalledWith(
        `${MetricType.COMMAND_EXECUTION}-${opId}-start`,
      );
      expect(mockPerformance.clearMarks).toHaveBeenCalledWith(
        `${MetricType.COMMAND_EXECUTION}-${opId}-end`,
      );
      expect(mockPerformance.clearMeasures).toHaveBeenCalled();
    });
  });

  describe("recordMetric", () => {
    it("records a performance metric", () => {
      const metric: PerformanceMetric = {
        type: MetricType.STATE_UPDATE_LATENCY,
        name: "test-metric",
        duration: 50,
        timestamp: new Date(),
        success: true,
      };

      monitor.recordMetric(metric);

      const metrics = monitor.getMetrics(MetricType.STATE_UPDATE_LATENCY);
      expect(metrics.length).toBe(1);
      expect(metrics[0]).toEqual(metric);
    });

    it("limits stored metrics per type", () => {
      // Record more than maxMetricsPerType (1000)
      for (let i = 0; i < 1100; i++) {
        monitor.recordMetric({
          type: MetricType.COMMAND_EXECUTION,
          name: `metric-${i}`,
          duration: 10,
          timestamp: new Date(),
          success: true,
        });
      }

      const metrics = monitor.getMetrics(MetricType.COMMAND_EXECUTION);
      expect(metrics.length).toBe(1000);
    });

    it("emits warning alert when threshold exceeded", () => {
      const alertSpy = vi.fn();
      monitor.on("performanceAlert", alertSpy);

      monitor.recordMetric({
        type: MetricType.STATE_UPDATE_LATENCY,
        name: "slow-update",
        duration: 150, // warning threshold is 100ms
        timestamp: new Date(),
        success: true,
      });

      expect(alertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: "warning",
          type: MetricType.STATE_UPDATE_LATENCY,
        }),
      );
    });

    it("emits critical alert when critical threshold exceeded", () => {
      const alertSpy = vi.fn();
      monitor.on("performanceAlert", alertSpy);

      monitor.recordMetric({
        type: MetricType.STATE_UPDATE_LATENCY,
        name: "very-slow-update",
        duration: 600, // critical threshold is 500ms
        timestamp: new Date(),
        success: true,
      });

      expect(alertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: "critical",
          type: MetricType.STATE_UPDATE_LATENCY,
        }),
      );
    });
  });

  describe("tracking methods", () => {
    describe("trackStateUpdate", () => {
      it("records state update metric", () => {
        monitor.trackStateUpdate(50);

        const metrics = monitor.getMetrics(MetricType.STATE_UPDATE_LATENCY);
        expect(metrics.length).toBe(1);
        expect(metrics[0].duration).toBe(50);
        expect(metrics[0].success).toBe(true);
      });
    });

    describe("trackCommandExecution", () => {
      it("records command execution metric", () => {
        monitor.trackCommandExecution("test-command", 1000, true);

        const metrics = monitor.getMetrics(MetricType.COMMAND_EXECUTION);
        expect(metrics.length).toBe(1);
        expect(metrics[0].duration).toBe(1000);
        expect(metrics[0].metadata).toEqual({ command: "test-command" });
      });

      it("tracks failed command execution", () => {
        monitor.trackCommandExecution("failing-command", 500, false);

        const metrics = monitor.getMetrics(MetricType.COMMAND_EXECUTION);
        expect(metrics[0].success).toBe(false);
      });
    });

    describe("trackUIRender", () => {
      it("records UI render metric", () => {
        monitor.trackUIRender("TestComponent", 12);

        const metrics = monitor.getMetrics(MetricType.UI_RENDER);
        expect(metrics.length).toBe(1);
        expect(metrics[0].duration).toBe(12);
        expect(metrics[0].metadata).toEqual({ component: "TestComponent" });
      });
    });

    describe("trackAgentCoordination", () => {
      it("records agent coordination metric", () => {
        monitor.trackAgentCoordination(5, 300);

        const metrics = monitor.getMetrics(MetricType.AGENT_COORDINATION);
        expect(metrics.length).toBe(1);
        expect(metrics[0].duration).toBe(300);
        expect(metrics[0].metadata).toEqual({ agentCount: 5 });
      });
    });
  });

  describe("generateReport", () => {
    beforeEach(() => {
      // Add some test metrics
      monitor.trackStateUpdate(50);
      monitor.trackStateUpdate(100);
      monitor.trackStateUpdate(150);
      monitor.trackCommandExecution("cmd1", 500, true);
      monitor.trackCommandExecution("cmd2", 1500, false);
      monitor.trackUIRender("Component1", 10);
      monitor.trackUIRender("Component2", 20);
    });

    it("generates performance report", () => {
      const report = monitor.generateReport();

      expect(report).toHaveProperty("timestamp");
      expect(report).toHaveProperty("duration");
      expect(report).toHaveProperty("metrics");
      expect(report).toHaveProperty("totalOperations");
      expect(report).toHaveProperty("averageLatency");
      expect(report).toHaveProperty("errorRate");
      expect(report).toHaveProperty("alerts");
    });

    it("calculates correct statistics", () => {
      const report = monitor.generateReport();

      const stateStats = report.metrics.get(MetricType.STATE_UPDATE_LATENCY);
      expect(stateStats).toBeDefined();
      expect(stateStats!.count).toBe(3);
      expect(stateStats!.averageDuration).toBe(100); // (50+100+150)/3
      expect(stateStats!.minDuration).toBe(50);
      expect(stateStats!.maxDuration).toBe(150);
    });

    it("calculates percentiles correctly", () => {
      const report = monitor.generateReport();

      const stateStats = report.metrics.get(MetricType.STATE_UPDATE_LATENCY);
      expect(stateStats!.p50).toBeDefined();
      expect(stateStats!.p90).toBeDefined();
      expect(stateStats!.p99).toBeDefined();
    });

    it("calculates success rate correctly", () => {
      const report = monitor.generateReport();

      const cmdStats = report.metrics.get(MetricType.COMMAND_EXECUTION);
      expect(cmdStats!.successRate).toBe(50); // 1 success out of 2
    });

    it("includes total operations count", () => {
      const report = monitor.generateReport();

      expect(report.totalOperations).toBe(7); // 3+2+2
    });

    it("calculates average latency", () => {
      const report = monitor.generateReport();

      expect(report.averageLatency).toBeGreaterThan(0);
    });

    it("calculates error rate", () => {
      const report = monitor.generateReport();

      // 1 failed command out of 7 total operations
      expect(report.errorRate).toBeCloseTo(14.29, 1);
    });

    it("generates alerts for threshold violations", () => {
      monitor.trackStateUpdate(600); // Exceeds critical threshold

      const report = monitor.generateReport();

      expect(report.alerts.length).toBeGreaterThan(0);
    });
  });

  describe("getMetrics", () => {
    beforeEach(() => {
      monitor.trackStateUpdate(50);
      monitor.trackCommandExecution("cmd1", 100, true);
    });

    it("returns metrics for specific type", () => {
      const metrics = monitor.getMetrics(MetricType.STATE_UPDATE_LATENCY);

      expect(metrics.length).toBe(1);
      expect(metrics[0].type).toBe(MetricType.STATE_UPDATE_LATENCY);
    });

    it("returns all metrics when no type specified", () => {
      const metrics = monitor.getMetrics();

      expect(metrics.length).toBe(2);
    });

    it("returns empty array for type with no metrics", () => {
      const metrics = monitor.getMetrics(MetricType.DATABASE_QUERY);

      expect(metrics).toEqual([]);
    });
  });

  describe("clearMetrics", () => {
    beforeEach(() => {
      monitor.trackStateUpdate(50);
      monitor.trackCommandExecution("cmd1", 100, true);
    });

    it("clears metrics for specific type", () => {
      monitor.clearMetrics(MetricType.STATE_UPDATE_LATENCY);

      expect(
        monitor.getMetrics(MetricType.STATE_UPDATE_LATENCY).length,
      ).toBe(0);
      expect(monitor.getMetrics(MetricType.COMMAND_EXECUTION).length).toBe(1);
    });

    it("clears all metrics when no type specified", () => {
      monitor.clearMetrics();

      expect(monitor.getMetrics().length).toBe(0);
    });
  });

  describe("getMemoryUsage", () => {
    it("returns memory usage statistics", () => {
      const usage = monitor.getMemoryUsage();

      expect(usage).toHaveProperty("rss");
      expect(usage).toHaveProperty("heapTotal");
      expect(usage).toHaveProperty("heapUsed");
      expect(usage).toHaveProperty("external");
      expect(usage).toHaveProperty("arrayBuffers");

      // Values should be in MB
      expect(usage.rss).toBeGreaterThan(0);
      expect(usage.heapTotal).toBeGreaterThan(0);
      expect(usage.heapUsed).toBeGreaterThan(0);
    });
  });

  describe("performance thresholds", () => {
    it("respects thresholds for state update latency", () => {
      const warningSpy = vi.fn();
      const criticalSpy = vi.fn();

      monitor.on("performanceAlert", (alert: PerformanceAlert) => {
        if (alert.severity === "warning") warningSpy(alert);
        if (alert.severity === "critical") criticalSpy(alert);
      });

      monitor.trackStateUpdate(50); // OK
      expect(warningSpy).not.toHaveBeenCalled();

      monitor.trackStateUpdate(150); // Warning (> 100ms)
      expect(warningSpy).toHaveBeenCalled();

      monitor.trackStateUpdate(600); // Critical (> 500ms)
      expect(criticalSpy).toHaveBeenCalled();
    });

    it("respects thresholds for UI render", () => {
      const alertSpy = vi.fn();
      monitor.on("performanceAlert", alertSpy);

      monitor.trackUIRender("Component", 10); // OK
      expect(alertSpy).not.toHaveBeenCalled();

      monitor.trackUIRender("SlowComponent", 20); // Warning (> 16ms)
      expect(alertSpy).toHaveBeenCalled();
    });

    it("respects thresholds for command execution", () => {
      const alertSpy = vi.fn();
      monitor.on("performanceAlert", alertSpy);

      monitor.trackCommandExecution("fast", 500, true); // OK
      expect(alertSpy).not.toHaveBeenCalled();

      monitor.trackCommandExecution("slow", 1500, true); // Warning
      expect(alertSpy).toHaveBeenCalled();
    });
  });

  describe("high error rate alert", () => {
    it("emits alert when error rate exceeds 10%", () => {
      const alertSpy = vi.fn();
      monitor.on("performanceAlert", alertSpy);

      // Create 10 operations, 2 failures = 20% error rate
      for (let i = 0; i < 8; i++) {
        monitor.trackCommandExecution(`cmd${i}`, 100, true);
      }
      for (let i = 0; i < 2; i++) {
        monitor.trackCommandExecution(`failcmd${i}`, 100, false);
      }

      monitor.start(10000);
      vi.advanceTimersByTime(10000);

      // Should have emitted high error rate alert
      const highErrorAlert = (alertSpy.mock.calls as any[]).find(
        (call) => call[0].message === "High error rate detected",
      );
      expect(highErrorAlert).toBeDefined();
    });

    it("does not emit alert when error rate is low", () => {
      const alertSpy = vi.fn();
      monitor.on("performanceAlert", alertSpy);

      // 1 failure out of 20 = 5% error rate
      for (let i = 0; i < 19; i++) {
        monitor.trackCommandExecution(`cmd${i}`, 100, true);
      }
      monitor.trackCommandExecution("failcmd", 100, false);

      monitor.start(10000);
      vi.advanceTimersByTime(10000);

      const highErrorAlert = (alertSpy.mock.calls as any[]).find(
        (call) => call[0].message === "High error rate detected",
      );
      expect(highErrorAlert).toBeUndefined();
    });
  });

  describe("performance observer integration", () => {
    it("processes performance entries from observer", () => {
      const mockEntry = {
        name: "state_update-test-123",
        duration: 75,
        startTime: Date.now(),
        entryType: "measure",
      };

      // Trigger observer callback
      if (observerCallback) {
        observerCallback({
          getEntries: () => [mockEntry],
        });
      }

      const metrics = monitor.getMetrics(MetricType.STATE_UPDATE_LATENCY);
      expect(metrics.length).toBeGreaterThan(0);
    });

    it("ignores entries with unknown metric types", () => {
      const mockEntry = {
        name: "unknown_type-test-123",
        duration: 75,
        startTime: Date.now(),
        entryType: "measure",
      };

      const initialCount = monitor.getMetrics().length;

      if (observerCallback) {
        observerCallback({
          getEntries: () => [mockEntry],
        });
      }

      expect(monitor.getMetrics().length).toBe(initialCount);
    });

    it("maps performance entry names to metric types", () => {
      const testCases = [
        { name: "state_update-op1", type: MetricType.STATE_UPDATE_LATENCY },
        { name: "command-op2", type: MetricType.COMMAND_EXECUTION },
        { name: "ui-op3", type: MetricType.UI_RENDER },
        { name: "agent-op4", type: MetricType.AGENT_COORDINATION },
        { name: "file-op5", type: MetricType.FILE_OPERATION },
        { name: "api-op6", type: MetricType.API_CALL },
        { name: "db-op7", type: MetricType.DATABASE_QUERY },
        { name: "cache-op8", type: MetricType.CACHE_OPERATION },
      ];

      for (const testCase of testCases) {
        const mockEntry = {
          name: testCase.name,
          duration: 50,
          startTime: Date.now(),
          entryType: "measure",
        };

        if (observerCallback) {
          observerCallback({
            getEntries: () => [mockEntry],
          });
        }

        const metrics = monitor.getMetrics(testCase.type);
        expect(metrics.length).toBeGreaterThan(0);
      }
    });
  });

  describe("edge cases", () => {
    it("handles empty metrics gracefully", () => {
      const report = monitor.generateReport();

      expect(report.totalOperations).toBe(0);
      expect(report.averageLatency).toBe(0);
      expect(report.errorRate).toBe(0);
    });

    it("handles single metric correctly", () => {
      monitor.trackStateUpdate(100);

      const report = monitor.generateReport();
      const stats = report.metrics.get(MetricType.STATE_UPDATE_LATENCY);

      expect(stats!.count).toBe(1);
      expect(stats!.averageDuration).toBe(100);
      expect(stats!.minDuration).toBe(100);
      expect(stats!.maxDuration).toBe(100);
      expect(stats!.p50).toBe(100);
      expect(stats!.p90).toBe(100);
      expect(stats!.p99).toBe(100);
    });

    it("handles very large durations", () => {
      monitor.trackCommandExecution("long-task", 999999, true);

      const metrics = monitor.getMetrics(MetricType.COMMAND_EXECUTION);
      expect(metrics[0].duration).toBe(999999);
    });

    it("handles zero duration", () => {
      monitor.trackStateUpdate(0);

      const metrics = monitor.getMetrics(MetricType.STATE_UPDATE_LATENCY);
      expect(metrics[0].duration).toBe(0);
    });

    it("handles concurrent operations", () => {
      const ops = ["op1", "op2", "op3", "op4", "op5"];

      // Start all operations
      for (const op of ops) {
        monitor.startOperation(op, MetricType.COMMAND_EXECUTION);
      }

      vi.advanceTimersByTime(100);

      // End all operations
      for (const op of ops) {
        monitor.endOperation(op, MetricType.COMMAND_EXECUTION);
      }

      const metrics = monitor.getMetrics(MetricType.COMMAND_EXECUTION);
      expect(metrics.length).toBe(5);
    });
  });

  describe("report duration tracking", () => {
    it("tracks report duration from start", () => {
      const startTime = Date.now();

      vi.advanceTimersByTime(5000);

      const report = monitor.generateReport();

      expect(report.duration).toBeCloseTo(5, 0); // 5 seconds
    });
  });

  describe("metric metadata", () => {
    it("preserves metadata in metrics", () => {
      const metadata = {
        userId: "user123",
        sessionId: "session456",
        customField: "value",
      };

      monitor.recordMetric({
        type: MetricType.API_CALL,
        name: "api-test",
        duration: 200,
        timestamp: new Date(),
        success: true,
        metadata,
      });

      const metrics = monitor.getMetrics(MetricType.API_CALL);
      expect(metrics[0].metadata).toEqual(metadata);
    });
  });

  describe("percentile calculation", () => {
    it("calculates percentiles for various data sets", () => {
      // Add 100 metrics with predictable durations
      for (let i = 1; i <= 100; i++) {
        monitor.trackCommandExecution(`cmd${i}`, i * 10, true);
      }

      const report = monitor.generateReport();
      const stats = report.metrics.get(MetricType.COMMAND_EXECUTION);

      expect(stats!.p50).toBeLessThanOrEqual(stats!.p90);
      expect(stats!.p90).toBeLessThanOrEqual(stats!.p99);
      expect(stats!.p99).toBeLessThanOrEqual(stats!.maxDuration);
    });

    it("handles percentile calculation for small datasets", () => {
      monitor.trackStateUpdate(10);
      monitor.trackStateUpdate(20);

      const report = monitor.generateReport();
      const stats = report.metrics.get(MetricType.STATE_UPDATE_LATENCY);

      expect(stats!.p50).toBeDefined();
      expect(stats!.p90).toBeDefined();
      expect(stats!.p99).toBeDefined();
    });
  });

  describe("alert aggregation in reports", () => {
    it("aggregates multiple alerts in report", () => {
      // Generate multiple slow operations
      monitor.trackStateUpdate(600); // Critical
      monitor.trackCommandExecution("slow", 2500, true); // Warning
      monitor.trackUIRender("SlowComponent", 60); // Critical

      const report = monitor.generateReport();

      expect(report.alerts.length).toBeGreaterThan(0);
    });

    it("includes P90 threshold alerts in report", () => {
      // Generate metrics with high P90
      // Need 90% or more slow to trigger P90 alert
      // Warning threshold for state_update is 100ms
      for (let i = 0; i < 10; i++) {
        // First metric is fast, rest are slow to ensure P90 > 100ms
        monitor.trackStateUpdate(i === 0 ? 10 : 150);
      }

      const report = monitor.generateReport();
      const p90Alert = report.alerts.find(
        (a) => a.message.includes("P90 latency"),
      );

      expect(p90Alert).toBeDefined();
    });
  });
});
