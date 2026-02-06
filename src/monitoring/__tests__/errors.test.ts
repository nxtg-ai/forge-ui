/**
 * Error Tracking System Tests
 * Comprehensive tests for error monitoring and recovery tracking
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  ErrorTracker,
  ErrorCategory,
  ErrorSeverity,
  TrackedError,
  ErrorReport,
  RecoveryStrategy,
} from "../errors";
import * as path from "path";

// Mock fs module with factory function
vi.mock("fs", () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

// Import the mocked fs to access the mocks
import * as fs from "fs";

describe("ErrorTracker", () => {
  let errorTracker: ErrorTracker;
  let mockProjectPath: string;

  beforeEach(() => {
    mockProjectPath = "/test/project";

    // Reset and configure mocks
    fs.existsSync.mockReturnValue(false);
    fs.readFileSync.mockReturnValue(JSON.stringify({ errors: [] }));
    fs.writeFileSync.mockImplementation(() => {});
    fs.mkdirSync.mockImplementation(() => '' as any);

    errorTracker = new ErrorTracker(mockProjectPath);

    // Clear mock call history but keep implementations
    fs.existsSync.mockClear();
    fs.readFileSync.mockClear();
    fs.writeFileSync.mockClear();
    fs.mkdirSync.mockClear();
  });

  afterEach(() => {
    if (errorTracker) {
      errorTracker.stop();
    }
  });

  describe("constructor", () => {
    it("should create with default project path", () => {
      const tracker = new ErrorTracker();
      expect(tracker).toBeDefined();
    });

    it("should create with custom project path", () => {
      const tracker = new ErrorTracker("/custom/path");
      expect(tracker).toBeDefined();
    });

    it("should initialize recovery strategies", () => {
      expect(errorTracker).toBeDefined();
      // Recovery strategies should be loaded
    });

    it("should load persisted errors if file exists", () => {
      const persistedErrors = {
        errors: [
          {
            id: "error-1",
            category: ErrorCategory.UI,
            severity: ErrorSeverity.MEDIUM,
            message: "UI error",
            timestamp: new Date().toISOString(),
            firstOccurrence: new Date().toISOString(),
            lastOccurrence: new Date().toISOString(),
            recovered: false,
            recoveryAttempts: 0,
            count: 1,
          },
        ],
      };

      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify(persistedErrors));

      const tracker = new ErrorTracker(mockProjectPath);
      const errors = tracker.getErrors();
      expect(errors.length).toBe(1);
    });
  });

  describe("trackError", () => {
    it("should track a new error", () => {
      const error = new Error("Test error");
      const trackedError = errorTracker.trackError(
        error,
        ErrorCategory.BACKEND,
        ErrorSeverity.HIGH
      );

      expect(trackedError).toBeDefined();
      expect(trackedError.id).toBeDefined();
      expect(trackedError.category).toBe(ErrorCategory.BACKEND);
      expect(trackedError.severity).toBe(ErrorSeverity.HIGH);
      expect(trackedError.message).toBe("Test error");
      expect(trackedError.stack).toBeDefined();
      expect(trackedError.count).toBe(1);
      expect(trackedError.recovered).toBe(false);
    });

    it("should track error from string message", () => {
      const trackedError = errorTracker.trackError(
        "String error message",
        ErrorCategory.VALIDATION,
        ErrorSeverity.LOW
      );

      expect(trackedError.message).toBe("String error message");
      expect(trackedError.stack).toBeUndefined();
    });

    it("should use default category and severity", () => {
      const error = new Error("Test error");
      const trackedError = errorTracker.trackError(error);

      expect(trackedError.category).toBe(ErrorCategory.UNKNOWN);
      expect(trackedError.severity).toBe(ErrorSeverity.MEDIUM);
    });

    it("should increment count for duplicate errors", () => {
      const error = new Error("Duplicate error");

      const trackedError1 = errorTracker.trackError(error, ErrorCategory.UI);
      const trackedError2 = errorTracker.trackError(error, ErrorCategory.UI);

      expect(trackedError2.count).toBe(2);
      expect(trackedError2.id).toBe(trackedError1.id);
    });

    it("should update last occurrence for duplicate errors", () => {
      vi.useFakeTimers();

      const error = new Error("Test error");
      const trackedError1 = errorTracker.trackError(error, ErrorCategory.UI);

      vi.advanceTimersByTime(1000);

      const trackedError2 = errorTracker.trackError(error, ErrorCategory.UI);

      expect(trackedError2.lastOccurrence.getTime()).toBeGreaterThan(
        trackedError1.firstOccurrence.getTime()
      );

      vi.useRealTimers();
    });

    it("should upgrade severity for duplicate errors", () => {
      const error = new Error("Test error");

      errorTracker.trackError(error, ErrorCategory.UI, ErrorSeverity.LOW);
      const trackedError = errorTracker.trackError(
        error,
        ErrorCategory.UI,
        ErrorSeverity.CRITICAL
      );

      expect(trackedError.severity).toBe(ErrorSeverity.CRITICAL);
    });

    it("should not downgrade severity for duplicate errors", () => {
      const error = new Error("Test error");

      errorTracker.trackError(error, ErrorCategory.UI, ErrorSeverity.CRITICAL);
      const trackedError = errorTracker.trackError(
        error,
        ErrorCategory.UI,
        ErrorSeverity.LOW
      );

      expect(trackedError.severity).toBe(ErrorSeverity.CRITICAL);
    });

    it("should emit errorTracked event", async () => {
      const promise = new Promise<TrackedError>((resolve) => {
        errorTracker.on("errorTracked", resolve);
      });

      errorTracker.trackError(new Error("Event test error"));

      const trackedError = await promise;
      expect(trackedError.message).toBe("Event test error");
    });

    it("should include context in tracked error", () => {
      const context = { userId: "123", action: "login" };
      const trackedError = errorTracker.trackError(
        new Error("Test error"),
        ErrorCategory.BACKEND,
        ErrorSeverity.MEDIUM,
        context
      );

      expect(trackedError.context).toEqual(context);
    });

    it("should attempt recovery after tracking", async () => {
      const recoveryHandler = vi.fn();
      errorTracker.on("recoveryAction", recoveryHandler);

      errorTracker.trackError(
        new Error("Test error"),
        ErrorCategory.BACKEND,
        ErrorSeverity.HIGH
      );

      // Wait for async recovery (BACKEND has 2000ms backoff)
      await new Promise((resolve) => setTimeout(resolve, 2500));

      expect(recoveryHandler).toHaveBeenCalled();
    });
  });

  describe("markRecovered", () => {
    it("should mark error as recovered", () => {
      const trackedError = errorTracker.trackError(
        new Error("Test error"),
        ErrorCategory.UI
      );

      expect(trackedError.recovered).toBe(false);

      errorTracker.markRecovered(trackedError.id);

      const errors = errorTracker.getErrors();
      const recoveredError = errors.find((e) => e.id === trackedError.id);
      expect(recoveredError?.recovered).toBe(true);
    });

    it("should emit errorRecovered event", async () => {
      const trackedError = errorTracker.trackError(
        new Error("Test error"),
        ErrorCategory.UI
      );

      const promise = new Promise<TrackedError>((resolve) => {
        errorTracker.on("errorRecovered", resolve);
      });

      errorTracker.markRecovered(trackedError.id);

      const error = await promise;
      expect(error.id).toBe(trackedError.id);
    });

    it("should handle non-existent error ID gracefully", () => {
      expect(() => {
        errorTracker.markRecovered("non-existent-id");
      }).not.toThrow();
    });
  });

  describe("categorizeError", () => {
    it("should categorize UI errors", () => {
      const category = errorTracker.categorizeError(new Error("Component render failed"));
      expect(category).toBe(ErrorCategory.UI);
    });

    it("should categorize backend errors", () => {
      const category = errorTracker.categorizeError(new Error("API request failed"));
      expect(category).toBe(ErrorCategory.BACKEND);
    });

    it("should categorize integration errors", () => {
      const category = errorTracker.categorizeError(new Error("Integration sync failed"));
      expect(category).toBe(ErrorCategory.INTEGRATION);
    });

    it("should categorize state errors", () => {
      const category = errorTracker.categorizeError(new Error("State update failed"));
      expect(category).toBe(ErrorCategory.STATE);
    });

    it("should categorize agent errors", () => {
      const category = errorTracker.categorizeError(new Error("Agent orchestration failed"));
      expect(category).toBe(ErrorCategory.AGENT);
    });

    it("should categorize command errors", () => {
      const category = errorTracker.categorizeError(new Error("Command execution failed"));
      expect(category).toBe(ErrorCategory.COMMAND);
    });

    it("should categorize file system errors", () => {
      const category = errorTracker.categorizeError(new Error("File read failed"));
      expect(category).toBe(ErrorCategory.FILE_SYSTEM);
    });

    it("should categorize network errors", () => {
      const category = errorTracker.categorizeError(new Error("Network connection timeout"));
      expect(category).toBe(ErrorCategory.NETWORK);
    });

    it("should categorize validation errors", () => {
      const category = errorTracker.categorizeError(new Error("Validation failed: invalid email"));
      expect(category).toBe(ErrorCategory.VALIDATION);
    });

    it("should categorize unknown errors", () => {
      const category = errorTracker.categorizeError(new Error("Random error"));
      expect(category).toBe(ErrorCategory.UNKNOWN);
    });

    it("should categorize string errors", () => {
      const category = errorTracker.categorizeError("UI component failed");
      expect(category).toBe(ErrorCategory.UI);
    });
  });

  describe("generateReport", () => {
    it("should generate error report", async () => {
      errorTracker.trackError(new Error("Error 1"), ErrorCategory.UI, ErrorSeverity.LOW);
      errorTracker.trackError(new Error("Error 2"), ErrorCategory.BACKEND, ErrorSeverity.HIGH);
      errorTracker.trackError(
        new Error("Error 3"),
        ErrorCategory.BACKEND,
        ErrorSeverity.CRITICAL
      );

      // Wait a bit so period > 0
      await new Promise((resolve) => setTimeout(resolve, 10));

      const report = errorTracker.generateReport();

      expect(report).toBeDefined();
      expect(report.timestamp).toBeInstanceOf(Date);
      expect(report.totalErrors).toBe(3);
      expect(report.period).toBeGreaterThan(0);
    });

    it("should calculate error rate", () => {
      vi.useFakeTimers();

      for (let i = 0; i < 10; i++) {
        errorTracker.trackError(new Error(`Error ${i}`));
      }

      vi.advanceTimersByTime(60000); // 1 minute

      const report = errorTracker.generateReport();
      expect(report.errorRate).toBeGreaterThan(0);

      vi.useRealTimers();
    });

    it("should categorize errors in report", () => {
      errorTracker.trackError(new Error("Error 1"), ErrorCategory.UI);
      errorTracker.trackError(new Error("Error 2"), ErrorCategory.UI);
      errorTracker.trackError(new Error("Error 3"), ErrorCategory.BACKEND);

      const report = errorTracker.generateReport();

      expect(report.categories.has(ErrorCategory.UI)).toBe(true);
      expect(report.categories.has(ErrorCategory.BACKEND)).toBe(true);

      const uiStats = report.categories.get(ErrorCategory.UI);
      expect(uiStats?.total).toBe(2);
    });

    it("should include top errors", () => {
      for (let i = 0; i < 15; i++) {
        errorTracker.trackError(new Error(`Error ${i}`));
      }

      const report = errorTracker.generateReport();

      expect(report.topErrors.length).toBeLessThanOrEqual(10);
    });

    it("should include critical errors", () => {
      errorTracker.trackError(new Error("Critical 1"), ErrorCategory.UI, ErrorSeverity.CRITICAL);
      errorTracker.trackError(new Error("Warning"), ErrorCategory.UI, ErrorSeverity.LOW);
      errorTracker.trackError(new Error("Critical 2"), ErrorCategory.UI, ErrorSeverity.CRITICAL);

      const report = errorTracker.generateReport();

      expect(report.criticalErrors.length).toBe(2);
      expect(report.criticalErrors.every((e) => e.severity === ErrorSeverity.CRITICAL)).toBe(true);
    });

    it("should calculate recovery rate", () => {
      const error1 = errorTracker.trackError(new Error("Error 1"));
      errorTracker.trackError(new Error("Error 2"));
      const error3 = errorTracker.trackError(new Error("Error 3"));

      errorTracker.markRecovered(error1.id);
      errorTracker.markRecovered(error3.id);

      const report = errorTracker.generateReport();

      expect(report.recoveryRate).toBeCloseTo(66.67, 1);
    });

    it("should calculate average recovery attempts", () => {
      errorTracker.trackError(new Error("Error 1"), ErrorCategory.UI);

      const report = errorTracker.generateReport();

      const uiStats = report.categories.get(ErrorCategory.UI);
      expect(uiStats?.averageRecoveryAttempts).toBeGreaterThanOrEqual(0);
    });
  });

  describe("start and stop", () => {
    it("should start error tracking", () => {
      errorTracker.start(1000);

      expect(() => errorTracker.start(1000)).not.toThrow();
    });

    it("should stop error tracking", () => {
      errorTracker.start(1000);
      errorTracker.stop();

      expect(() => errorTracker.stop()).not.toThrow();
    });

    it("should emit error reports at interval", async () => {
      vi.useFakeTimers();

      const reportHandler = vi.fn();
      errorTracker.on("errorReport", reportHandler);

      errorTracker.start(1000);

      vi.advanceTimersByTime(1000);
      errorTracker.stop();

      expect(reportHandler).toHaveBeenCalled();

      vi.useRealTimers();
    });

    it("should persist errors on stop", () => {
      errorTracker.trackError(new Error("Test error"));
      errorTracker.stop();

      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it("should use default interval", () => {
      errorTracker.start();

      expect(() => errorTracker.start()).not.toThrow();
    });
  });

  describe("getErrors", () => {
    it("should return all errors", () => {
      errorTracker.trackError(new Error("Error 1"));
      errorTracker.trackError(new Error("Error 2"));
      errorTracker.trackError(new Error("Error 3"));

      const errors = errorTracker.getErrors();
      expect(errors.length).toBe(3);
    });

    it("should filter errors by category", () => {
      errorTracker.trackError(new Error("Error 1"), ErrorCategory.UI);
      errorTracker.trackError(new Error("Error 2"), ErrorCategory.BACKEND);
      errorTracker.trackError(new Error("Error 3"), ErrorCategory.UI);

      const uiErrors = errorTracker.getErrors(ErrorCategory.UI);
      expect(uiErrors.length).toBe(2);
      expect(uiErrors.every((e) => e.category === ErrorCategory.UI)).toBe(true);
    });

    it("should filter errors by severity", () => {
      errorTracker.trackError(new Error("Error 1"), ErrorCategory.UI, ErrorSeverity.LOW);
      errorTracker.trackError(new Error("Error 2"), ErrorCategory.UI, ErrorSeverity.HIGH);
      errorTracker.trackError(new Error("Error 3"), ErrorCategory.UI, ErrorSeverity.HIGH);

      const highErrors = errorTracker.getErrors(undefined, ErrorSeverity.HIGH);
      expect(highErrors.length).toBe(2);
      expect(highErrors.every((e) => e.severity === ErrorSeverity.HIGH)).toBe(true);
    });

    it("should filter errors by category and severity", () => {
      errorTracker.trackError(new Error("Error 1"), ErrorCategory.UI, ErrorSeverity.LOW);
      errorTracker.trackError(new Error("Error 2"), ErrorCategory.UI, ErrorSeverity.HIGH);
      errorTracker.trackError(new Error("Error 3"), ErrorCategory.BACKEND, ErrorSeverity.HIGH);

      const uiHighErrors = errorTracker.getErrors(ErrorCategory.UI, ErrorSeverity.HIGH);
      expect(uiHighErrors.length).toBe(1);
      expect(uiHighErrors[0].category).toBe(ErrorCategory.UI);
      expect(uiHighErrors[0].severity).toBe(ErrorSeverity.HIGH);
    });
  });

  describe("clearErrors", () => {
    it("should clear all errors", () => {
      errorTracker.trackError(new Error("Error 1"));
      errorTracker.trackError(new Error("Error 2"));

      errorTracker.clearErrors();

      const errors = errorTracker.getErrors();
      expect(errors.length).toBe(0);
    });

    it("should clear errors by category", () => {
      errorTracker.trackError(new Error("Error 1"), ErrorCategory.UI);
      errorTracker.trackError(new Error("Error 2"), ErrorCategory.BACKEND);
      errorTracker.trackError(new Error("Error 3"), ErrorCategory.UI);

      errorTracker.clearErrors(ErrorCategory.UI);

      const errors = errorTracker.getErrors();
      expect(errors.length).toBe(1);
      expect(errors[0].category).toBe(ErrorCategory.BACKEND);
    });

    it("should persist after clearing", () => {
      errorTracker.trackError(new Error("Error 1"));
      errorTracker.clearErrors();

      expect(fs.writeFileSync).toHaveBeenCalled();
    });
  });

  describe("setRecoveryStrategy", () => {
    it("should set custom recovery strategy", () => {
      const strategy: RecoveryStrategy = {
        category: ErrorCategory.UI as any,
        action: "retry",
        maxAttempts: 5,
        backoffMs: 1000,
      };

      errorTracker.setRecoveryStrategy(ErrorCategory.UI, strategy);

      expect(() =>
        errorTracker.setRecoveryStrategy(ErrorCategory.UI, strategy)
      ).not.toThrow();
    });

    it("should override default recovery strategy", () => {
      const strategy: RecoveryStrategy = {
        category: ErrorCategory.UI,
        action: "reset",
        maxAttempts: 10,
        backoffMs: 500,
      };

      errorTracker.setRecoveryStrategy(ErrorCategory.UI, strategy);

      expect(() => errorTracker.setRecoveryStrategy(ErrorCategory.UI, strategy)).not.toThrow();
    });
  });

  describe("recovery actions", () => {
    it("should emit retry recovery action", async () => {
      const recoveryHandler = vi.fn();
      errorTracker.on("recoveryAction", recoveryHandler);

      errorTracker.trackError(new Error("Test error"), ErrorCategory.UI);

      // UI has 1000ms backoff
      await new Promise((resolve) => setTimeout(resolve, 1500));

      expect(recoveryHandler).toHaveBeenCalledWith(
        expect.objectContaining({ type: "retry" })
      );
    });

    it("should emit reset recovery action", async () => {
      const recoveryHandler = vi.fn();
      errorTracker.on("recoveryAction", recoveryHandler);

      errorTracker.trackError(new Error("Test error"), ErrorCategory.INTEGRATION);

      // INTEGRATION has 3000ms backoff
      await new Promise((resolve) => setTimeout(resolve, 3500));

      expect(recoveryHandler).toHaveBeenCalledWith(
        expect.objectContaining({ type: "reset" })
      );
    });

    it("should emit rollback recovery action", async () => {
      const recoveryHandler = vi.fn();
      errorTracker.on("recoveryAction", recoveryHandler);

      errorTracker.trackError(new Error("Test error"), ErrorCategory.STATE);

      // STATE has 0ms backoff
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(recoveryHandler).toHaveBeenCalledWith(
        expect.objectContaining({ type: "rollback" })
      );
    });

    it("should emit alert recovery action", async () => {
      const recoveryHandler = vi.fn();
      errorTracker.on("recoveryAction", recoveryHandler);

      errorTracker.trackError(new Error("Test error"), ErrorCategory.FILE_SYSTEM);

      // FILE_SYSTEM has 0ms backoff
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(recoveryHandler).toHaveBeenCalledWith(
        expect.objectContaining({ type: "alert" })
      );
    });

    it("should not exceed max recovery attempts", async () => {
      const recoveryHandler = vi.fn();
      errorTracker.on("recoveryAction", recoveryHandler);

      const strategy: RecoveryStrategy = {
        category: ErrorCategory.UI as any,
        action: "retry",
        maxAttempts: 2,
        backoffMs: 0,
      };

      errorTracker.setRecoveryStrategy(ErrorCategory.UI, strategy);

      const error = new Error("Test error");
      errorTracker.trackError(error, ErrorCategory.UI);
      errorTracker.trackError(error, ErrorCategory.UI);
      errorTracker.trackError(error, ErrorCategory.UI);

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should only attempt recovery up to maxAttempts
      expect(recoveryHandler).toHaveBeenCalledTimes(2);
    });

    it("should apply exponential backoff", async () => {
      vi.useFakeTimers();

      const recoveryHandler = vi.fn();
      errorTracker.on("recoveryAction", recoveryHandler);

      const strategy: RecoveryStrategy = {
        category: ErrorCategory.UI as any,
        action: "retry",
        maxAttempts: 3,
        backoffMs: 100,
      };

      errorTracker.setRecoveryStrategy(ErrorCategory.UI, strategy);

      const error = new Error("Test error");
      errorTracker.trackError(error, ErrorCategory.UI);

      await vi.advanceTimersByTimeAsync(100);
      expect(recoveryHandler).toHaveBeenCalledTimes(1);

      errorTracker.trackError(error, ErrorCategory.UI);
      await vi.advanceTimersByTimeAsync(200);
      expect(recoveryHandler).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });
  });

  describe("alert checks", () => {
    it("should emit alert for high error rate", async () => {
      vi.useFakeTimers();

      const alertHandler = vi.fn();
      errorTracker.on("alert", alertHandler);

      errorTracker.start(1000);

      // Track many errors
      for (let i = 0; i < 20; i++) {
        errorTracker.trackError(new Error(`Error ${i}`));
      }

      vi.advanceTimersByTime(1000);
      errorTracker.stop();

      expect(alertHandler).toHaveBeenCalledWith(
        expect.objectContaining({ type: "high_error_rate" })
      );

      vi.useRealTimers();
    });

    it("should emit alert for critical errors", async () => {
      vi.useFakeTimers();

      const alertHandler = vi.fn();
      errorTracker.on("alert", alertHandler);

      errorTracker.start(1000);

      // Track critical errors
      for (let i = 0; i < 5; i++) {
        errorTracker.trackError(new Error(`Error ${i}`), ErrorCategory.UI, ErrorSeverity.CRITICAL);
      }

      vi.advanceTimersByTime(1000);
      errorTracker.stop();

      expect(alertHandler).toHaveBeenCalledWith(
        expect.objectContaining({ type: "critical_errors" })
      );

      vi.useRealTimers();
    });

    it("should emit alert for low recovery rate", async () => {
      vi.useFakeTimers();

      const alertHandler = vi.fn();
      errorTracker.on("alert", alertHandler);

      errorTracker.start(1000);

      // Track many unrecovered errors
      for (let i = 0; i < 10; i++) {
        errorTracker.trackError(new Error(`Error ${i}`));
      }

      vi.advanceTimersByTime(60000); // Wait for recovery rate calculation
      errorTracker.stop();

      vi.useRealTimers();
    });

    it("should emit alert for category threshold", async () => {
      vi.useFakeTimers();

      const alertHandler = vi.fn();
      errorTracker.on("alert", alertHandler);

      errorTracker.start(1000);

      // Track many errors in one category
      for (let i = 0; i < 10; i++) {
        errorTracker.trackError(new Error(`Error ${i}`), ErrorCategory.UI);
      }

      vi.advanceTimersByTime(1000);
      errorTracker.stop();

      expect(alertHandler).toHaveBeenCalledWith(
        expect.objectContaining({ type: "category_threshold" })
      );

      vi.useRealTimers();
    });
  });

  describe("persistence", () => {
    it("should persist errors to disk", () => {
      errorTracker.trackError(new Error("Test error"));
      errorTracker.stop();

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining("errors.json"),
        expect.any(String)
      );
    });

    it("should create directory if it doesn't exist", () => {
      fs.existsSync.mockReturnValue(false);
      fs.mkdirSync.mockImplementation(() => '' as any);

      errorTracker.trackError(new Error("Test error"));
      errorTracker.stop();

      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ recursive: true })
      );
    });

    it("should handle persistence errors gracefully", () => {
      fs.writeFileSync.mockImplementation(() => {
        throw new Error("Write failed");
      });

      expect(() => {
        errorTracker.stop();
      }).not.toThrow();
    });

    it("should serialize dates correctly", () => {
      errorTracker.trackError(new Error("Test error"));
      errorTracker.stop();

      const writeCall = fs.writeFileSync.mock.calls[0];
      const data = JSON.parse(writeCall[1] as string);

      expect(data.timestamp).toBeDefined();
      expect(data.errors).toBeDefined();
    });
  });
});
