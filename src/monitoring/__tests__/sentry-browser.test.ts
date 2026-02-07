/**
 * Comprehensive tests for Sentry browser monitoring module
 * Tests initialization, error capture, context setting, and React-specific features
 *
 * Note: @sentry/react is mocked via vitest.config.ts alias to src/test/mocks/sentry-react.ts
 * The dynamic import of @sentry/react inside initSentryBrowser() doesn't resolve to the mock,
 * so these tests focus on the fallback behavior when Sentry is not initialized.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Unmock to get real implementation
vi.unmock("../sentry-browser");

describe("Sentry Browser Monitoring Module", () => {
  let sentryBrowserModule: any;
  let consoleLogSpy: any;
  let consoleWarnSpy: any;
  let consoleErrorSpy: any;

  beforeEach(async () => {
    // Mock console methods
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Mock import.meta without DSN (tests non-initialized state)
    vi.stubGlobal("import", {
      meta: {
        env: {},
      },
    });

    // Import fresh module for each test
    vi.resetModules();
    sentryBrowserModule = await import("../sentry-browser");
  });

  afterEach(() => {
    // Restore console
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();

    // Clear all mocks
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  describe("initSentryBrowser", () => {
    it("returns false when VITE_SENTRY_DSN is not configured", async () => {
      const result = await sentryBrowserModule.initSentryBrowser();

      expect(result).toBe(false);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        "[Sentry] No VITE_SENTRY_DSN configured, browser error tracking disabled"
      );
    });

    it("handles missing import.meta entirely", async () => {
      vi.stubGlobal("import", undefined);
      vi.resetModules();
      const module = await import("../sentry-browser");

      const result = await module.initSentryBrowser();

      expect(result).toBe(false);
    });

    it("handles import.meta without env property", async () => {
      vi.stubGlobal("import", { meta: {} });
      vi.resetModules();
      const module = await import("../sentry-browser");

      const result = await module.initSentryBrowser();

      expect(result).toBe(false);
    });
  });

  describe("captureException when Sentry is not initialized", () => {
    it("returns null and logs to console when Sentry is not initialized", () => {
      const error = new Error("Test error");
      const result = sentryBrowserModule.captureException(error);

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith("[Error]", error);
    });

    it("handles string errors when Sentry is not initialized", () => {
      const result = sentryBrowserModule.captureException("String error message");

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith("[Error]", "String error message");
    });

    it("ignores context parameter when Sentry is not initialized", () => {
      const error = new Error("Test error");
      const context = { component: "Dashboard", action: "load" };
      const result = sentryBrowserModule.captureException(error, context);

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith("[Error]", error);
    });

    it("handles empty string errors", () => {
      expect(() => sentryBrowserModule.captureException("")).not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith("[Error]", "");
    });
  });

  describe("captureMessage when Sentry is not initialized", () => {
    it("logs to console with default info level when Sentry is not initialized", () => {
      const result = sentryBrowserModule.captureMessage("Test message");

      expect(result).toBeNull();
      expect(consoleLogSpy).toHaveBeenCalledWith("[INFO]", "Test message");
    });

    it("logs to console with warning level", () => {
      const result = sentryBrowserModule.captureMessage("Test warning", "warning");

      expect(result).toBeNull();
      expect(consoleLogSpy).toHaveBeenCalledWith("[WARNING]", "Test warning");
    });

    it("logs to console with error level", () => {
      const result = sentryBrowserModule.captureMessage("Test error", "error");

      expect(result).toBeNull();
      expect(consoleLogSpy).toHaveBeenCalledWith("[ERROR]", "Test error");
    });

    it("logs to console with fatal level", () => {
      const result = sentryBrowserModule.captureMessage("Test fatal", "fatal");

      expect(result).toBeNull();
      expect(consoleLogSpy).toHaveBeenCalledWith("[FATAL]", "Test fatal");
    });

    it("logs to console with debug level", () => {
      const result = sentryBrowserModule.captureMessage("Test debug", "debug");

      expect(result).toBeNull();
      expect(consoleLogSpy).toHaveBeenCalledWith("[DEBUG]", "Test debug");
    });

    it("ignores context parameter when Sentry is not initialized", () => {
      const context = { component: "api", endpoint: "/users" };
      const result = sentryBrowserModule.captureMessage(
        "API call failed",
        "error",
        context
      );

      expect(result).toBeNull();
      expect(consoleLogSpy).toHaveBeenCalledWith("[ERROR]", "API call failed");
    });
  });

  describe("setUser when Sentry is not initialized", () => {
    it("does nothing when Sentry is not initialized", () => {
      expect(() =>
        sentryBrowserModule.setUser({ id: "123", email: "test@example.com" })
      ).not.toThrow();
    });

    it("handles null user", () => {
      expect(() => sentryBrowserModule.setUser(null)).not.toThrow();
    });

    it("handles user with all properties", () => {
      expect(() =>
        sentryBrowserModule.setUser({
          id: "user-123",
          email: "user@example.com",
          username: "testuser",
        })
      ).not.toThrow();
    });
  });

  describe("addBreadcrumb when Sentry is not initialized", () => {
    it("does nothing when Sentry is not initialized", () => {
      expect(() =>
        sentryBrowserModule.addBreadcrumb({ message: "Test breadcrumb" })
      ).not.toThrow();
    });

    it("handles breadcrumb with full context", () => {
      const breadcrumb = {
        category: "ui.click",
        message: "User clicked button",
        level: "info" as const,
        data: { buttonId: "submit", pageUrl: "/dashboard" },
      };

      expect(() => sentryBrowserModule.addBreadcrumb(breadcrumb)).not.toThrow();
    });

    it("handles breadcrumb with minimal data", () => {
      expect(() =>
        sentryBrowserModule.addBreadcrumb({ message: "Simple breadcrumb" })
      ).not.toThrow();
    });
  });

  describe("setTag and setExtra when Sentry is not initialized", () => {
    it("setTag does nothing when Sentry is not initialized", () => {
      expect(() => sentryBrowserModule.setTag("environment", "test")).not.toThrow();
    });

    it("setExtra does nothing when Sentry is not initialized", () => {
      expect(() =>
        sentryBrowserModule.setExtra("data", { key: "value" })
      ).not.toThrow();
    });

    it("handles complex extra data", () => {
      const complexData = {
        nested: { value: 123 },
        array: [1, 2, 3],
        nullValue: null,
        undefinedValue: undefined,
      };

      expect(() =>
        sentryBrowserModule.setExtra("complex", complexData)
      ).not.toThrow();
    });

    it("handles multiple tags in sequence", () => {
      expect(() => {
        sentryBrowserModule.setTag("tag1", "value1");
        sentryBrowserModule.setTag("tag2", "value2");
        sentryBrowserModule.setTag("tag3", "value3");
      }).not.toThrow();
    });
  });

  describe("getSentryErrorBoundary", () => {
    it("returns null when Sentry is not initialized", () => {
      const ErrorBoundary = sentryBrowserModule.getSentryErrorBoundary();

      expect(ErrorBoundary).toBeNull();
    });

    it("returns consistent null on multiple calls", () => {
      const result1 = sentryBrowserModule.getSentryErrorBoundary();
      const result2 = sentryBrowserModule.getSentryErrorBoundary();

      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });
  });

  describe("withSentryProfiler", () => {
    it("returns original component when Sentry is not initialized", () => {
      const TestComponent = () => null;
      const WrappedComponent = sentryBrowserModule.withSentryProfiler(TestComponent);

      expect(WrappedComponent).toBe(TestComponent);
    });

    it("returns original component with name parameter", () => {
      const TestComponent = () => null;
      const WrappedComponent = sentryBrowserModule.withSentryProfiler(
        TestComponent,
        "TestComponent"
      );

      expect(WrappedComponent).toBe(TestComponent);
    });

    it("handles functional components", () => {
      const FunctionalComponent = ({ title }: { title: string }) => null;
      const WrappedComponent = sentryBrowserModule.withSentryProfiler(
        FunctionalComponent
      );

      expect(WrappedComponent).toBe(FunctionalComponent);
    });
  });

  describe("isSentryReady", () => {
    it("returns false when Sentry is not initialized", () => {
      expect(sentryBrowserModule.isSentryReady()).toBe(false);
    });

    it("returns consistent false on multiple calls", () => {
      expect(sentryBrowserModule.isSentryReady()).toBe(false);
      expect(sentryBrowserModule.isSentryReady()).toBe(false);
      expect(sentryBrowserModule.isSentryReady()).toBe(false);
    });
  });

  describe("flushSentry", () => {
    it("returns true immediately when Sentry is not initialized", async () => {
      const result = await sentryBrowserModule.flushSentry();

      expect(result).toBe(true);
    });

    it("accepts custom timeout parameter", async () => {
      const result = await sentryBrowserModule.flushSentry(5000);

      expect(result).toBe(true);
    });

    it("handles default timeout of 2000ms", async () => {
      const result = await sentryBrowserModule.flushSentry();

      expect(result).toBe(true);
    });

    it("completes quickly when not initialized", async () => {
      const start = Date.now();
      await sentryBrowserModule.flushSentry();
      const duration = Date.now() - start;

      // Should complete immediately, not wait for timeout
      expect(duration).toBeLessThan(100);
    });
  });

  describe("Integration tests - lifecycle", () => {
    it("maintains consistent state through multiple calls", () => {
      expect(sentryBrowserModule.isSentryReady()).toBe(false);

      const error1 = sentryBrowserModule.captureException(new Error("Error 1"));
      const error2 = sentryBrowserModule.captureException("Error 2");

      expect(error1).toBeNull();
      expect(error2).toBeNull();

      const msg1 = sentryBrowserModule.captureMessage("Message 1");
      const msg2 = sentryBrowserModule.captureMessage("Message 2", "warning");

      expect(msg1).toBeNull();
      expect(msg2).toBeNull();

      expect(sentryBrowserModule.isSentryReady()).toBe(false);
    });

    it("handles rapid succession calls without errors", () => {
      expect(() => {
        for (let i = 0; i < 100; i++) {
          sentryBrowserModule.captureException(new Error(`Error ${i}`));
          sentryBrowserModule.captureMessage(`Message ${i}`);
          sentryBrowserModule.setTag(`tag${i}`, `value${i}`);
          sentryBrowserModule.addBreadcrumb({ message: `Breadcrumb ${i}` });
        }
      }).not.toThrow();
    });

    it("handles interleaved operations", () => {
      sentryBrowserModule.setUser({ id: "123" });
      sentryBrowserModule.captureException(new Error("test"));
      sentryBrowserModule.addBreadcrumb({ message: "breadcrumb" });
      sentryBrowserModule.setTag("key", "value");
      sentryBrowserModule.captureMessage("message");
      sentryBrowserModule.setExtra("data", { key: "value" });

      expect(sentryBrowserModule.isSentryReady()).toBe(false);
    });
  });

  describe("Type safety and edge cases", () => {
    it("handles empty strings", () => {
      expect(() => sentryBrowserModule.captureException("")).not.toThrow();
      expect(() => sentryBrowserModule.captureMessage("")).not.toThrow();
    });

    it("handles special characters in strings", () => {
      const specialMessage = 'Error: \n\t\r"quoted"\' <html>';
      expect(() => sentryBrowserModule.captureMessage(specialMessage)).not.toThrow();
      expect(() => sentryBrowserModule.captureException(specialMessage)).not.toThrow();
    });

    it("handles undefined and null in context objects", () => {
      const context = {
        defined: "value",
        undefined: undefined,
        null: null,
      };

      expect(() =>
        sentryBrowserModule.captureException(new Error("test"), context)
      ).not.toThrow();
      expect(() =>
        sentryBrowserModule.captureMessage("test", "info", context)
      ).not.toThrow();
    });

    it("handles large context objects", () => {
      const largeContext: Record<string, unknown> = {};
      for (let i = 0; i < 1000; i++) {
        largeContext[`key${i}`] = `value${i}`;
      }

      expect(() =>
        sentryBrowserModule.captureException(new Error("test"), largeContext)
      ).not.toThrow();
    });

    it("handles circular references in error objects gracefully", () => {
      const error: any = new Error("Circular error");
      error.self = error;

      expect(() => sentryBrowserModule.captureException(error)).not.toThrow();
    });

    it("handles Error subclasses", () => {
      class CustomError extends Error {
        constructor(message: string, public code: number) {
          super(message);
          this.name = "CustomError";
        }
      }

      const customError = new CustomError("Custom error", 404);
      expect(() => sentryBrowserModule.captureException(customError)).not.toThrow();
    });
  });

  describe("Console output formatting", () => {
    it("formats error level correctly in uppercase", () => {
      sentryBrowserModule.captureMessage("test", "error");

      expect(consoleLogSpy).toHaveBeenCalledWith("[ERROR]", "test");
    });

    it("formats warning level correctly in uppercase", () => {
      sentryBrowserModule.captureMessage("test", "warning");

      expect(consoleLogSpy).toHaveBeenCalledWith("[WARNING]", "test");
    });

    it("formats info level correctly in uppercase", () => {
      sentryBrowserModule.captureMessage("test", "info");

      expect(consoleLogSpy).toHaveBeenCalledWith("[INFO]", "test");
    });

    it("formats debug level correctly in uppercase", () => {
      sentryBrowserModule.captureMessage("test", "debug");

      expect(consoleLogSpy).toHaveBeenCalledWith("[DEBUG]", "test");
    });

    it("formats fatal level correctly in uppercase", () => {
      sentryBrowserModule.captureMessage("test", "fatal");

      expect(consoleLogSpy).toHaveBeenCalledWith("[FATAL]", "test");
    });
  });

  describe("Browser-specific features", () => {
    it("getSentryErrorBoundary provides React error boundary", () => {
      // When not initialized, should return null
      const ErrorBoundary = sentryBrowserModule.getSentryErrorBoundary();
      expect(ErrorBoundary).toBeNull();
    });

    it("withSentryProfiler wraps React components for performance monitoring", () => {
      const MyComponent = () => null;
      const ProfiledComponent = sentryBrowserModule.withSentryProfiler(
        MyComponent,
        "MyComponent"
      );

      // When not initialized, should return original component
      expect(ProfiledComponent).toBe(MyComponent);
    });

    it("supports UI-specific breadcrumbs", () => {
      expect(() => {
        sentryBrowserModule.addBreadcrumb({
          category: "ui.click",
          message: "User clicked submit button",
          level: "info",
          data: { buttonId: "submit", x: 100, y: 200 },
        });
      }).not.toThrow();
    });

    it("supports navigation breadcrumbs", () => {
      expect(() => {
        sentryBrowserModule.addBreadcrumb({
          category: "navigation",
          message: "Navigated to /dashboard",
          level: "info",
          data: { from: "/home", to: "/dashboard" },
        });
      }).not.toThrow();
    });
  });

  describe("Error message patterns", () => {
    it("logs error prefix for exceptions", () => {
      sentryBrowserModule.captureException(new Error("test error"));

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[Error]",
        expect.any(Error)
      );
    });

    it("logs level prefix for messages", () => {
      sentryBrowserModule.captureMessage("info message", "info");
      sentryBrowserModule.captureMessage("warn message", "warning");
      sentryBrowserModule.captureMessage("error message", "error");

      expect(consoleLogSpy).toHaveBeenCalledWith("[INFO]", "info message");
      expect(consoleLogSpy).toHaveBeenCalledWith("[WARNING]", "warn message");
      expect(consoleLogSpy).toHaveBeenCalledWith("[ERROR]", "error message");
    });
  });

  describe("Type exports", () => {
    it("exports SentryUser type", () => {
      // Test that the type is usable
      const user: import("../sentry-browser").SentryUser = {
        id: "123",
        email: "test@example.com",
        username: "testuser",
      };

      expect(user.id).toBe("123");
    });

    it("exports SentryContext type", () => {
      // Test that the type is usable
      const context: import("../sentry-browser").SentryContext = {
        key1: "value1",
        key2: 123,
        key3: { nested: "object" },
      };

      expect(context.key1).toBe("value1");
    });
  });

  describe("beforeSend filter logic (via init config)", () => {
    it("would filter network errors in beforeSend", () => {
      // Note: We can't test the actual beforeSend since init doesn't succeed
      // in tests, but we document the expected behavior

      const networkErrors = [
        "Failed to fetch",
        "NetworkError: Connection lost",
        "Load failed",
        "ResizeObserver loop limit exceeded",
      ];

      // These errors would be filtered out if Sentry was initialized
      networkErrors.forEach((message) => {
        const error = new Error(message);
        // When not initialized, errors are logged to console
        sentryBrowserModule.captureException(error);
        expect(consoleErrorSpy).toHaveBeenCalledWith("[Error]", error);
      });
    });

    it("would pass through application errors in beforeSend", () => {
      const appError = new Error("Application logic error");

      // When not initialized, errors are logged
      sentryBrowserModule.captureException(appError);
      expect(consoleErrorSpy).toHaveBeenCalledWith("[Error]", appError);
    });
  });
});
