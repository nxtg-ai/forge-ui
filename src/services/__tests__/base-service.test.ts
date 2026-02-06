/**
 * Base Service Tests
 * Comprehensive tests for service lifecycle, validation, and utilities
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { BaseService, ServiceState } from "../base-service";
import { z } from "zod";
import { Result } from "../../utils/result";

// Concrete test implementation of BaseService
class TestService extends BaseService {
  public initializeCalled = false;
  public disposeCalled = false;
  public shouldFailInit = false;

  protected async performInitialization(): Promise<void> {
    this.initializeCalled = true;
    if (this.shouldFailInit) {
      throw new Error("Initialization failed");
    }
  }

  protected async performDisposal(): Promise<void> {
    this.disposeCalled = true;
  }

  // Expose protected methods for testing
  public testValidate<T>(data: unknown, schema: z.ZodSchema<T>) {
    return this.validate(data, schema);
  }

  public testRetry<T>(operation: () => Promise<T>, retryCount?: number) {
    return this.retry(operation, retryCount);
  }

  public testDebounce<TArgs extends unknown[]>(
    fn: (...args: TArgs) => void,
    delay?: number,
  ) {
    return this.debounce(fn, delay);
  }

  public testWithTimeout<T>(operation: Promise<T>, timeout?: number) {
    return this.withTimeout(operation, timeout);
  }
}

describe("BaseService", () => {
  let service: TestService;

  beforeEach(() => {
    service = new TestService({
      name: "TestService",
      retryCount: 3,
      timeout: 1000,
      debounceMs: 100,
    });
  });

  afterEach(async () => {
    if (!service["disposed"]) {
      await service.dispose();
    }
  });

  describe("initialization", () => {
    it("should initialize successfully", async () => {
      expect(service.getState()).toBe(ServiceState.IDLE);

      const result = await service.initialize();

      expect(result.isOk()).toBe(true);
      expect(service.getState()).toBe(ServiceState.READY);
      expect(service.initializeCalled).toBe(true);
    });

    it("should emit state change events", async () => {
      const stateHandler = vi.fn();
      const readyHandler = vi.fn();

      service.on("stateChange", stateHandler);
      service.on("ready", readyHandler);

      await service.initialize();

      expect(stateHandler).toHaveBeenCalledWith(ServiceState.INITIALIZING);
      expect(stateHandler).toHaveBeenCalledWith(ServiceState.READY);
      expect(readyHandler).toHaveBeenCalled();
    });

    it("should return ok if already ready", async () => {
      await service.initialize();

      const result = await service.initialize();

      expect(result.isOk()).toBe(true);
      expect(service.initializeCalled).toBe(true); // Only called once
    });

    it("should handle initialization errors", async () => {
      service.shouldFailInit = true;
      const errorHandler = vi.fn();
      service.on("error", errorHandler);

      const result = await service.initialize();

      expect(result.isErr()).toBe(true);
      expect(service.getState()).toBe(ServiceState.ERROR);
      expect(errorHandler).toHaveBeenCalled();

      if (result.isErr()) {
        expect(result.error.message).toContain("Initialization failed");
      }
    });

    it("should prevent initialization after disposal", async () => {
      await service.dispose();

      const result = await service.initialize();

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("SERVICE_DISPOSED");
      }
    });

    it("should handle concurrent initialization", async () => {
      // Start two initializations at the same time
      const [result1, result2] = await Promise.all([
        service.initialize(),
        service.initialize(),
      ]);

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);
      expect(service.initializeCalled).toBe(true); // Only called once
    });
  });

  describe("disposal", () => {
    it("should dispose successfully", async () => {
      await service.initialize();
      const disposedHandler = vi.fn();
      service.on("disposed", disposedHandler);

      await service.dispose();

      expect(service.getState()).toBe(ServiceState.DISPOSED);
      expect(service.disposeCalled).toBe(true);
      expect(disposedHandler).toHaveBeenCalled();
    });

    it("should remove all listeners on disposal", async () => {
      const handler = vi.fn();
      service.on("stateChange", handler);

      await service.dispose();

      service.emit("stateChange", ServiceState.READY);

      expect(handler).not.toHaveBeenCalled();
    });

    it("should prevent disposal multiple times", async () => {
      await service.dispose();
      const firstDisposeCalled = service.disposeCalled;

      service.disposeCalled = false;
      await service.dispose();

      expect(service.disposeCalled).toBe(false); // Not called second time
      expect(firstDisposeCalled).toBe(true);
    });

    it("should not change state after disposal", async () => {
      await service.dispose();

      service["setState"](ServiceState.READY);

      expect(service.getState()).toBe(ServiceState.DISPOSED);
    });
  });

  describe("validation", () => {
    it("should validate data against schema", () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const data = { name: "John", age: 30 };
      const result = service.testValidate(data, schema);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual(data);
      }
    });

    it("should return error for invalid data", () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const data = { name: "John", age: "not a number" };
      const result = service.testValidate(data, schema);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain("Validation failed");
        expect(result.error.details).toBeDefined();
      }
    });

    it("should validate nested schemas", () => {
      const schema = z.object({
        user: z.object({
          name: z.string(),
          email: z.string().email(),
        }),
        settings: z.object({
          theme: z.enum(["light", "dark"]),
        }),
      });

      const data = {
        user: { name: "John", email: "john@example.com" },
        settings: { theme: "dark" },
      };

      const result = service.testValidate(data, schema);

      expect(result.isOk()).toBe(true);
    });

    it("should handle validation errors with details", () => {
      const schema = z.object({
        email: z.string().email(),
        age: z.number().min(0).max(150),
      });

      const data = { email: "invalid", age: 200 };
      const result = service.testValidate(data, schema);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.details).toBeDefined();
        expect(result.error.details.length).toBeGreaterThan(0);
      }
    });
  });

  describe("retry", () => {
    it("should succeed on first attempt", async () => {
      const operation = vi.fn().mockResolvedValue("success");

      const result = await service.testRetry(operation);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe("success");
      }
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it("should retry on failure", async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error("fail 1"))
        .mockRejectedValueOnce(new Error("fail 2"))
        .mockResolvedValue("success");

      const result = await service.testRetry(operation);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe("success");
      }
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it("should fail after max retries", async () => {
      const operation = vi.fn().mockRejectedValue(new Error("always fails"));

      const result = await service.testRetry(operation, 2);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain("Operation failed after 2 attempts");
        expect(result.error.code).toBe("RETRY_EXHAUSTED");
      }
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it("should use exponential backoff", async () => {
      vi.useFakeTimers();

      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error("fail 1"))
        .mockRejectedValueOnce(new Error("fail 2"))
        .mockResolvedValue("success");

      const resultPromise = service.testRetry(operation);

      // First attempt fails immediately
      await vi.advanceTimersByTimeAsync(0);
      expect(operation).toHaveBeenCalledTimes(1);

      // Second attempt after 100ms
      await vi.advanceTimersByTimeAsync(100);
      expect(operation).toHaveBeenCalledTimes(2);

      // Third attempt after 200ms
      await vi.advanceTimersByTimeAsync(200);
      expect(operation).toHaveBeenCalledTimes(3);

      const result = await resultPromise;
      expect(result.isOk()).toBe(true);

      vi.useRealTimers();
    });
  });

  describe("debounce", () => {
    it("should debounce function calls", async () => {
      vi.useFakeTimers();

      const fn = vi.fn();
      const debounced = service.testDebounce(fn, 100);

      debounced("arg1");
      debounced("arg2");
      debounced("arg3");

      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith("arg3");

      vi.useRealTimers();
    });

    it("should use default debounce delay from config", async () => {
      vi.useFakeTimers();

      const fn = vi.fn();
      const debounced = service.testDebounce(fn); // No delay specified

      debounced();
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100); // Default from config
      expect(fn).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });

    it("should reset timer on repeated calls", async () => {
      vi.useFakeTimers();

      const fn = vi.fn();
      const debounced = service.testDebounce(fn, 100);

      debounced();
      vi.advanceTimersByTime(50);

      debounced(); // Reset timer
      vi.advanceTimersByTime(50);

      expect(fn).not.toHaveBeenCalled(); // Not yet

      vi.advanceTimersByTime(50);
      expect(fn).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });
  });

  describe("withTimeout", () => {
    it("should resolve within timeout", async () => {
      const operation = new Promise((resolve) =>
        setTimeout(() => resolve("success"), 100),
      );

      const result = await service.testWithTimeout(operation, 200);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe("success");
      }
    });

    it("should timeout long operations", async () => {
      const operation = new Promise((resolve) =>
        setTimeout(() => resolve("success"), 200),
      );

      const result = await service.testWithTimeout(operation, 100);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain("timed out");
        expect(result.error.code).toBe("TIMEOUT");
      }
    });

    it("should use default timeout from config", async () => {
      const operation = new Promise((resolve) =>
        setTimeout(() => resolve("success"), 100),
      );

      const result = await service.testWithTimeout(operation);

      expect(result.isOk()).toBe(true);
    });

    it("should handle operation errors", async () => {
      const operation = Promise.reject(new Error("Operation error"));

      const result = await service.testWithTimeout(operation, 1000);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain("Operation error");
      }
    });
  });

  describe("state management", () => {
    it("should have correct initial state", () => {
      expect(service.getState()).toBe(ServiceState.IDLE);
    });

    it("should transition through states correctly", async () => {
      const states: ServiceState[] = [];
      service.on("stateChange", (state) => states.push(state));

      await service.initialize();
      await service.dispose();

      expect(states).toEqual([
        ServiceState.INITIALIZING,
        ServiceState.READY,
        ServiceState.DISPOSED,
      ]);
    });

    it("should emit ready event when ready", async () => {
      const readyHandler = vi.fn();
      service.on("ready", readyHandler);

      await service.initialize();

      expect(readyHandler).toHaveBeenCalled();
    });

    it("should emit error event on failure", async () => {
      service.shouldFailInit = true;
      const errorHandler = vi.fn();
      service.on("error", errorHandler);

      await service.initialize();

      expect(errorHandler).toHaveBeenCalled();
      const error = errorHandler.mock.calls[0][0];
      expect(error.message).toContain("Initialization failed");
    });

    it("should maintain state consistency", async () => {
      await service.initialize();
      expect(service.getState()).toBe(ServiceState.READY);

      await service.dispose();
      expect(service.getState()).toBe(ServiceState.DISPOSED);
    });
  });

  describe("configuration", () => {
    it("should use custom config values", () => {
      const customService = new TestService({
        name: "Custom",
        retryCount: 5,
        timeout: 5000,
        debounceMs: 200,
      });

      expect(customService["config"].retryCount).toBe(5);
      expect(customService["config"].timeout).toBe(5000);
      expect(customService["config"].debounceMs).toBe(200);
    });

    it("should use default config values", () => {
      const defaultService = new TestService({
        name: "Default",
      });

      expect(defaultService["config"].retryCount).toBe(3);
      expect(defaultService["config"].timeout).toBe(30000);
      expect(defaultService["config"].debounceMs).toBe(100);
    });

    it("should merge custom and default config", () => {
      const partialService = new TestService({
        name: "Partial",
        retryCount: 10, // Custom
        // timeout and debounceMs will use defaults
      });

      expect(partialService["config"].retryCount).toBe(10);
      expect(partialService["config"].timeout).toBe(30000);
      expect(partialService["config"].debounceMs).toBe(100);
    });
  });

  describe("error handling", () => {
    it("should handle initialization errors gracefully", async () => {
      service.shouldFailInit = true;

      const result = await service.initialize();

      expect(result.isErr()).toBe(true);
      expect(service.getState()).toBe(ServiceState.ERROR);
    });

    it("should convert non-Error objects to IntegrationError", async () => {
      const errorService = new (class extends BaseService {
        protected async performInitialization(): Promise<void> {
          throw "string error";
        }
        protected async performDisposal(): Promise<void> {}
      })({ name: "ErrorService" });

      const result = await errorService.initialize();

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain("string error");
      }

      await errorService.dispose();
    });

    it("should preserve IntegrationError instances", async () => {
      const customError = new (class extends Error {
        constructor(message: string) {
          super(message);
          this.name = "CustomError";
        }
      })("Custom error");

      const errorService = new (class extends BaseService {
        protected async performInitialization(): Promise<void> {
          throw customError;
        }
        protected async performDisposal(): Promise<void> {}
      })({ name: "ErrorService" });

      const result = await errorService.initialize();

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Custom error");
      }

      await errorService.dispose();
    });
  });
});
