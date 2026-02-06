/**
 * Logger Tests
 * Unit tests for structured logging utility
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Logger, LogLevel, getLogger } from "../logger";

// Mock winston to avoid file I/O in tests
vi.mock("winston", () => {
  const mockLogger = {
    log: vi.fn(),
    child: vi.fn(function (this: any, context: any) {
      return { ...this, ...context };
    }),
    on: vi.fn(),
    end: vi.fn(),
    add: vi.fn(),
  };

  return {
    default: {
      createLogger: vi.fn(() => mockLogger),
      format: {
        combine: vi.fn((...args) => args),
        timestamp: vi.fn(),
        errors: vi.fn(() => ({})),
        json: vi.fn(),
        colorize: vi.fn(),
        simple: vi.fn(),
      },
      transports: {
        Console: vi.fn(),
        File: vi.fn(),
      },
    },
  };
});

describe("Logger", () => {
  let logger: Logger;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    process.env.LOG_LEVEL = "debug";
    process.env.NODE_ENV = "test";
    logger = new Logger("test-module");
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  describe("getInstance", () => {
    it("should create new logger for module", () => {
      const logger1 = Logger.getInstance("module1");
      expect(logger1).toBeDefined();
      expect(logger1).toBeInstanceOf(Logger);
    });

    it("should return existing logger for module", () => {
      const logger1 = Logger.getInstance("module2");
      const logger2 = Logger.getInstance("module2");
      expect(logger1).toBe(logger2);
    });

    it("should create separate loggers for different modules", () => {
      const logger1 = Logger.getInstance("module3");
      const logger2 = Logger.getInstance("module4");
      expect(logger1).not.toBe(logger2);
    });
  });

  describe("Log levels", () => {
    it("should log error messages", () => {
      const winston = (logger as any).winston;
      logger.error("Test error");
      expect(winston.log).toHaveBeenCalledWith(
        LogLevel.ERROR,
        "Test error",
        expect.objectContaining({
          level: LogLevel.ERROR,
          message: "Test error",
          module: "test-module",
        }),
      );
    });

    it("should log error with Error object", () => {
      const winston = (logger as any).winston;
      const error = new Error("Test error");
      logger.error("Error occurred", error);
      expect(winston.log).toHaveBeenCalledWith(
        LogLevel.ERROR,
        "Error occurred",
        expect.objectContaining({
          error,
        }),
      );
    });

    it("should log warn messages", () => {
      const winston = (logger as any).winston;
      logger.warn("Test warning");
      expect(winston.log).toHaveBeenCalledWith(
        LogLevel.WARN,
        "Test warning",
        expect.objectContaining({
          level: LogLevel.WARN,
          message: "Test warning",
        }),
      );
    });

    it("should log info messages", () => {
      const winston = (logger as any).winston;
      logger.info("Test info");
      expect(winston.log).toHaveBeenCalledWith(
        LogLevel.INFO,
        "Test info",
        expect.objectContaining({
          level: LogLevel.INFO,
          message: "Test info",
        }),
      );
    });

    it("should log debug messages", () => {
      const winston = (logger as any).winston;
      logger.debug("Test debug");
      expect(winston.log).toHaveBeenCalledWith(
        LogLevel.DEBUG,
        "Test debug",
        expect.objectContaining({
          level: LogLevel.DEBUG,
          message: "Test debug",
        }),
      );
    });

    it("should log verbose messages", () => {
      const winston = (logger as any).winston;
      logger.verbose("Test verbose");
      expect(winston.log).toHaveBeenCalledWith(
        LogLevel.VERBOSE,
        "Test verbose",
        expect.objectContaining({
          level: LogLevel.VERBOSE,
          message: "Test verbose",
        }),
      );
    });
  });

  describe("Context", () => {
    it("should include module in log context", () => {
      const winston = (logger as any).winston;
      logger.info("Test message");
      expect(winston.log).toHaveBeenCalledWith(
        LogLevel.INFO,
        "Test message",
        expect.objectContaining({
          module: "test-module",
        }),
      );
    });

    it("should include timestamp in log context", () => {
      const winston = (logger as any).winston;
      logger.info("Test message");
      expect(winston.log).toHaveBeenCalledWith(
        LogLevel.INFO,
        "Test message",
        expect.objectContaining({
          timestamp: expect.any(Date),
        }),
      );
    });

    it("should merge custom context", () => {
      const winston = (logger as any).winston;
      logger.info("Test message", { userId: "123", requestId: "abc" });
      expect(winston.log).toHaveBeenCalledWith(
        LogLevel.INFO,
        "Test message",
        expect.objectContaining({
          userId: "123",
          requestId: "abc",
        }),
      );
    });
  });

  describe("Child logger", () => {
    it("should create child logger with context", () => {
      const winston = (logger as any).winston;
      const child = logger.child({ component: "auth" });
      expect(winston.child).toHaveBeenCalledWith({ component: "auth" });
      expect(child).toBeInstanceOf(Logger);
    });

    it("should include parent module in child name", () => {
      const child = logger.child({ component: "auth" });
      expect((child as any).module).toBe("test-module:auth");
    });
  });

  describe("Timer", () => {
    it("should measure operation duration", () => {
      vi.useFakeTimers();
      const winston = (logger as any).winston;

      const endTimer = logger.startTimer("operation");
      vi.advanceTimersByTime(100);
      endTimer();

      expect(winston.log).toHaveBeenCalledWith(
        LogLevel.DEBUG,
        "operation completed",
        expect.objectContaining({
          duration: 100,
          label: "operation",
        }),
      );

      vi.useRealTimers();
    });

    it("should return function to stop timer", () => {
      const endTimer = logger.startTimer("test");
      expect(endTimer).toBeInstanceOf(Function);
    });
  });

  describe("Method tracing", () => {
    it("should log method entry in verbose mode", () => {
      process.env.LOG_LEVEL = "verbose";
      const winston = (logger as any).winston;

      logger.methodEntry("testMethod", { arg1: "value" });

      expect(winston.log).toHaveBeenCalledWith(
        LogLevel.VERBOSE,
        "Entering testMethod",
        expect.objectContaining({
          method: "testMethod",
          args: { arg1: "value" },
        }),
      );
    });

    it("should not log method entry when not verbose", () => {
      process.env.LOG_LEVEL = "info";
      const winston = (logger as any).winston;

      logger.methodEntry("testMethod");

      expect(winston.log).not.toHaveBeenCalled();
    });

    it("should log method exit in verbose mode", () => {
      process.env.LOG_LEVEL = "verbose";
      const winston = (logger as any).winston;

      logger.methodExit("testMethod", { result: "success" });

      expect(winston.log).toHaveBeenCalledWith(
        LogLevel.VERBOSE,
        "Exiting testMethod",
        expect.objectContaining({
          method: "testMethod",
          result: { result: "success" },
        }),
      );
    });

    it("should not log method exit when not verbose", () => {
      process.env.LOG_LEVEL = "info";
      const winston = (logger as any).winston;

      logger.methodExit("testMethod");

      expect(winston.log).not.toHaveBeenCalled();
    });
  });

  describe("getLogger helper", () => {
    it("should return logger instance", () => {
      const logger = getLogger("helper-module");
      expect(logger).toBeInstanceOf(Logger);
    });

    it("should return same instance on multiple calls", () => {
      const logger1 = getLogger("same-module");
      const logger2 = getLogger("same-module");
      expect(logger1).toBe(logger2);
    });
  });

  describe("LogLevel enum", () => {
    it("should have correct log levels", () => {
      expect(LogLevel.ERROR).toBe("error");
      expect(LogLevel.WARN).toBe("warn");
      expect(LogLevel.INFO).toBe("info");
      expect(LogLevel.DEBUG).toBe("debug");
      expect(LogLevel.VERBOSE).toBe("verbose");
    });
  });
});
