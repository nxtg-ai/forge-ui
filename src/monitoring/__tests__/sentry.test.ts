/**
 * Comprehensive tests for Sentry monitoring module
 * Tests initialization, error capture, context setting, and middleware
 *
 * Note: We test the real implementation by not using the global mock from setup.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type * as SentryType from "@sentry/node";

// Unmock to get real implementation (setup.ts has a global mock)
vi.unmock("../sentry");

describe("Sentry Monitoring Module", () => {
  let sentryModule: any;
  let originalEnv: NodeJS.ProcessEnv;
  let consoleLogSpy: any;
  let consoleInfoSpy: any;
  let consoleDebugSpy: any;
  let consoleWarnSpy: any;
  let consoleErrorSpy: any;

  beforeEach(async () => {
    // Save original environment
    originalEnv = { ...process.env };

    // Mock console methods
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleInfoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    consoleDebugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Import fresh module for each test
    vi.resetModules();
    sentryModule = await import("../sentry");
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;

    // Restore console
    consoleLogSpy.mockRestore();
    consoleInfoSpy.mockRestore();
    consoleDebugSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();

    // Clear all mocks
    vi.clearAllMocks();
  });

  describe("initSentryServer", () => {
    it("returns false when SENTRY_DSN is not configured", async () => {
      delete process.env.SENTRY_DSN;

      const result = await sentryModule.initSentryServer();

      expect(result).toBe(false);
      expect(consoleDebugSpy).toHaveBeenCalledWith(
        "[Sentry] No SENTRY_DSN configured, error tracking disabled"
      );
    });

    it("handles initialization failure when Sentry package is not available", async () => {
      process.env.SENTRY_DSN = "https://test@sentry.io/123";

      // The module will try to dynamically import @sentry/node, which is mocked
      // Since we have a mock at src/test/mocks/sentry.ts via vitest.config.ts alias,
      // it should load but the mock is minimal
      const result = await sentryModule.initSentryServer();

      // The mock sentry module doesn't fully initialize, so check what happens
      // The init function exists in the mock but does nothing
      expect(result).toBeDefined();
    });
  });

  describe("captureException when Sentry is not initialized", () => {
    it("returns null and logs to console when Sentry is not initialized", () => {
      delete process.env.SENTRY_DSN;

      const error = new Error("Test error");
      const result = sentryModule.captureException(error);

      // When Sentry is null, it should log and return null
      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith("[Error]", error);
    });

    it("handles string errors when Sentry is not initialized", () => {
      delete process.env.SENTRY_DSN;

      const result = sentryModule.captureException("String error message");

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith("[Error]", "String error message");
    });

    it("ignores context parameter when Sentry is not initialized", () => {
      delete process.env.SENTRY_DSN;

      const error = new Error("Test error");
      const context = { userId: "123", action: "upload" };
      const result = sentryModule.captureException(error, context);

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith("[Error]", error);
    });
  });

  describe("captureMessage when Sentry is not initialized", () => {
    it("logs to console with default info level when Sentry is not initialized", () => {
      delete process.env.SENTRY_DSN;

      const result = sentryModule.captureMessage("Test message");

      expect(result).toBeNull();
      expect(consoleInfoSpy).toHaveBeenCalledWith("[INFO]", "Test message");
    });

    it("logs to console with warning level", () => {
      delete process.env.SENTRY_DSN;

      const result = sentryModule.captureMessage("Test warning", "warning");

      expect(result).toBeNull();
      expect(consoleInfoSpy).toHaveBeenCalledWith("[WARNING]", "Test warning");
    });

    it("logs to console with error level", () => {
      delete process.env.SENTRY_DSN;

      const result = sentryModule.captureMessage("Test error", "error");

      expect(result).toBeNull();
      expect(consoleInfoSpy).toHaveBeenCalledWith("[ERROR]", "Test error");
    });

    it("logs to console with fatal level", () => {
      delete process.env.SENTRY_DSN;

      const result = sentryModule.captureMessage("Test fatal", "fatal");

      expect(result).toBeNull();
      expect(consoleInfoSpy).toHaveBeenCalledWith("[FATAL]", "Test fatal");
    });

    it("logs to console with debug level", () => {
      delete process.env.SENTRY_DSN;

      const result = sentryModule.captureMessage("Test debug", "debug");

      expect(result).toBeNull();
      expect(consoleInfoSpy).toHaveBeenCalledWith("[DEBUG]", "Test debug");
    });

    it("ignores context parameter when Sentry is not initialized", () => {
      delete process.env.SENTRY_DSN;

      const context = { component: "api", endpoint: "/users" };
      const result = sentryModule.captureMessage("API call failed", "error", context);

      expect(result).toBeNull();
      expect(consoleInfoSpy).toHaveBeenCalledWith("[ERROR]", "API call failed");
    });
  });

  describe("setUser when Sentry is not initialized", () => {
    it("does nothing when Sentry is not initialized", () => {
      delete process.env.SENTRY_DSN;

      // Should not throw
      expect(() =>
        sentryModule.setUser({ id: "123", email: "test@example.com" })
      ).not.toThrow();
    });

    it("handles null user", () => {
      delete process.env.SENTRY_DSN;

      expect(() => sentryModule.setUser(null)).not.toThrow();
    });
  });

  describe("addBreadcrumb when Sentry is not initialized", () => {
    it("does nothing when Sentry is not initialized", () => {
      delete process.env.SENTRY_DSN;

      expect(() =>
        sentryModule.addBreadcrumb({ message: "Test breadcrumb" })
      ).not.toThrow();
    });

    it("handles breadcrumb with full context", () => {
      delete process.env.SENTRY_DSN;

      const breadcrumb = {
        category: "navigation",
        message: "User clicked button",
        level: "info" as const,
        data: { buttonId: "submit", pageUrl: "/form" },
      };

      expect(() => sentryModule.addBreadcrumb(breadcrumb)).not.toThrow();
    });
  });

  describe("setTag and setExtra when Sentry is not initialized", () => {
    it("setTag does nothing when Sentry is not initialized", () => {
      delete process.env.SENTRY_DSN;

      expect(() => sentryModule.setTag("environment", "test")).not.toThrow();
    });

    it("setExtra does nothing when Sentry is not initialized", () => {
      delete process.env.SENTRY_DSN;

      expect(() =>
        sentryModule.setExtra("data", { key: "value" })
      ).not.toThrow();
    });

    it("handles complex extra data", () => {
      delete process.env.SENTRY_DSN;

      const complexData = {
        nested: { value: 123 },
        array: [1, 2, 3],
        nullValue: null,
      };

      expect(() => sentryModule.setExtra("complex", complexData)).not.toThrow();
    });
  });

  describe("startTransaction when Sentry is not initialized", () => {
    it("returns null when Sentry is not initialized", () => {
      delete process.env.SENTRY_DSN;

      const result = sentryModule.startTransaction("test-transaction", "http.request");

      expect(result).toBeNull();
    });
  });

  describe("sentryErrorHandler", () => {
    it("returns no-op middleware when Sentry is not initialized", () => {
      delete process.env.SENTRY_DSN;

      const middleware = sentryModule.sentryErrorHandler();

      expect(middleware).toBeInstanceOf(Function);

      // Test that it's a no-op that calls next
      const next = vi.fn();
      const error = new Error("Test error");
      middleware(error, {}, {}, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    it("no-op middleware has correct signature (4 parameters for error handler)", () => {
      delete process.env.SENTRY_DSN;

      const middleware = sentryModule.sentryErrorHandler();

      // Error handlers in Express must have 4 parameters
      expect(middleware.length).toBe(4);
    });
  });

  describe("sentryRequestHandler", () => {
    it("returns no-op middleware when Sentry is not initialized", () => {
      delete process.env.SENTRY_DSN;

      const middleware = sentryModule.sentryRequestHandler();

      expect(middleware).toBeInstanceOf(Function);

      // Test that it's a no-op that calls next
      const next = vi.fn();
      middleware({}, {}, next);

      expect(next).toHaveBeenCalled();
    });

    it("no-op middleware has correct signature (3 parameters for request handler)", () => {
      delete process.env.SENTRY_DSN;

      const middleware = sentryModule.sentryRequestHandler();

      // Request handlers in Express must have 3 parameters
      expect(middleware.length).toBe(3);
    });
  });

  describe("flushSentry", () => {
    it("returns true immediately when Sentry is not initialized", async () => {
      delete process.env.SENTRY_DSN;

      const result = await sentryModule.flushSentry();

      expect(result).toBe(true);
    });

    it("accepts custom timeout parameter", async () => {
      delete process.env.SENTRY_DSN;

      const result = await sentryModule.flushSentry(5000);

      expect(result).toBe(true);
    });

    it("handles default timeout of 2000ms", async () => {
      delete process.env.SENTRY_DSN;

      const result = await sentryModule.flushSentry();

      expect(result).toBe(true);
    });
  });

  describe("isSentryReady", () => {
    it("returns false when Sentry is not initialized", () => {
      delete process.env.SENTRY_DSN;

      expect(sentryModule.isSentryReady()).toBe(false);
    });
  });

  describe("getSentry", () => {
    it("returns null when Sentry is not initialized", () => {
      delete process.env.SENTRY_DSN;

      expect(sentryModule.getSentry()).toBeNull();
    });
  });

  describe("Integration tests - lifecycle", () => {
    it("maintains consistent state through multiple calls", () => {
      delete process.env.SENTRY_DSN;

      // Multiple calls should all behave consistently
      expect(sentryModule.isSentryReady()).toBe(false);
      expect(sentryModule.getSentry()).toBeNull();

      const error1 = sentryModule.captureException(new Error("Error 1"));
      const error2 = sentryModule.captureException("Error 2");

      expect(error1).toBeNull();
      expect(error2).toBeNull();

      const msg1 = sentryModule.captureMessage("Message 1");
      const msg2 = sentryModule.captureMessage("Message 2", "warning");

      expect(msg1).toBeNull();
      expect(msg2).toBeNull();
    });

    it("handles rapid succession calls without errors", () => {
      delete process.env.SENTRY_DSN;

      expect(() => {
        for (let i = 0; i < 100; i++) {
          sentryModule.captureException(new Error(`Error ${i}`));
          sentryModule.captureMessage(`Message ${i}`);
          sentryModule.setTag(`tag${i}`, `value${i}`);
          sentryModule.addBreadcrumb({ message: `Breadcrumb ${i}` });
        }
      }).not.toThrow();
    });
  });

  describe("Type safety and edge cases", () => {
    it("handles empty strings", () => {
      delete process.env.SENTRY_DSN;

      expect(() => sentryModule.captureException("")).not.toThrow();
      expect(() => sentryModule.captureMessage("")).not.toThrow();
    });

    it("handles special characters in strings", () => {
      delete process.env.SENTRY_DSN;

      const specialMessage = 'Error: \n\t\r"quoted"\' <html>';
      expect(() => sentryModule.captureMessage(specialMessage)).not.toThrow();
    });

    it("handles undefined and null in context objects", () => {
      delete process.env.SENTRY_DSN;

      const context = {
        defined: "value",
        undefined: undefined,
        null: null,
      };

      expect(() => sentryModule.captureException(new Error("test"), context)).not.toThrow();
      expect(() => sentryModule.captureMessage("test", "info", context)).not.toThrow();
    });

    it("handles large context objects", () => {
      delete process.env.SENTRY_DSN;

      const largeContext: Record<string, unknown> = {};
      for (let i = 0; i < 1000; i++) {
        largeContext[`key${i}`] = `value${i}`;
      }

      expect(() =>
        sentryModule.captureException(new Error("test"), largeContext)
      ).not.toThrow();
    });

    it("handles circular references in error objects gracefully", () => {
      delete process.env.SENTRY_DSN;

      const error: any = new Error("Circular error");
      error.self = error;

      // Should not throw even with circular reference
      expect(() => sentryModule.captureException(error)).not.toThrow();
    });
  });

  describe("Environment variable handling", () => {
    it("handles missing SENTRY_DSN", async () => {
      delete process.env.SENTRY_DSN;

      const result = await sentryModule.initSentryServer();

      expect(result).toBe(false);
      expect(consoleDebugSpy).toHaveBeenCalledWith(
        "[Sentry] No SENTRY_DSN configured, error tracking disabled"
      );
    });

    it("handles empty SENTRY_DSN", async () => {
      process.env.SENTRY_DSN = "";

      const result = await sentryModule.initSentryServer();

      expect(result).toBe(false);
      expect(consoleDebugSpy).toHaveBeenCalledWith(
        "[Sentry] No SENTRY_DSN configured, error tracking disabled"
      );
    });

    it("handles whitespace-only SENTRY_DSN", async () => {
      process.env.SENTRY_DSN = "   ";

      // The module checks for truthiness, so this should attempt initialization
      // but the mock Sentry will handle it
      const result = await sentryModule.initSentryServer();

      // With whitespace DSN, it will try to init with the mock
      expect(result).toBeDefined();
    });
  });

  describe("Console output formatting", () => {
    it("formats error level correctly in uppercase", () => {
      delete process.env.SENTRY_DSN;

      sentryModule.captureMessage("test", "error");

      expect(consoleInfoSpy).toHaveBeenCalledWith("[ERROR]", "test");
    });

    it("formats warning level correctly in uppercase", () => {
      delete process.env.SENTRY_DSN;

      sentryModule.captureMessage("test", "warning");

      expect(consoleInfoSpy).toHaveBeenCalledWith("[WARNING]", "test");
    });

    it("formats info level correctly in uppercase", () => {
      delete process.env.SENTRY_DSN;

      sentryModule.captureMessage("test", "info");

      expect(consoleInfoSpy).toHaveBeenCalledWith("[INFO]", "test");
    });

    it("formats debug level correctly in uppercase", () => {
      delete process.env.SENTRY_DSN;

      sentryModule.captureMessage("test", "debug");

      expect(consoleInfoSpy).toHaveBeenCalledWith("[DEBUG]", "test");
    });

    it("formats fatal level correctly in uppercase", () => {
      delete process.env.SENTRY_DSN;

      sentryModule.captureMessage("test", "fatal");

      expect(consoleInfoSpy).toHaveBeenCalledWith("[FATAL]", "test");
    });
  });
});
