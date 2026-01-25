/**
 * Logger Utility
 * Structured logging for NXTG-Forge
 */

import winston from 'winston';
import * as path from 'path';

// Log levels
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
  VERBOSE = 'verbose'
}

// Log context
interface LogContext {
  module: string;
  timestamp: Date;
  [key: string]: any;
}

export class Logger {
  private winston: winston.Logger;
  private module: string;
  private static instances = new Map<string, Logger>();
  private static defaultLogger: winston.Logger;

  // Initialize default logger
  static {
    Logger.defaultLogger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })
      ]
    });

    // Add file transport in production
    if (process.env.NODE_ENV === 'production') {
      Logger.defaultLogger.add(
        new winston.transports.File({
          filename: path.join(process.cwd(), 'logs', 'error.log'),
          level: 'error'
        })
      );
      Logger.defaultLogger.add(
        new winston.transports.File({
          filename: path.join(process.cwd(), 'logs', 'combined.log')
        })
      );
    }
  }

  constructor(module: string) {
    this.module = module;
    this.winston = Logger.defaultLogger.child({ module });
    Logger.instances.set(module, this);
  }

  /**
   * Get logger instance for module
   */
  static getInstance(module: string): Logger {
    if (!Logger.instances.has(module)) {
      new Logger(module);
    }
    return Logger.instances.get(module)!;
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error | any, context?: Partial<LogContext>): void {
    this.log(LogLevel.ERROR, message, { error, ...context });
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: Partial<LogContext>): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * Log info message
   */
  info(message: string, context?: Partial<LogContext>): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: Partial<LogContext>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Log verbose message
   */
  verbose(message: string, context?: Partial<LogContext>): void {
    this.log(LogLevel.VERBOSE, message, context);
  }

  /**
   * Generic log method
   */
  private log(level: LogLevel, message: string, context?: Partial<LogContext>): void {
    const logEntry = {
      level,
      message,
      module: this.module,
      timestamp: new Date(),
      ...context
    };

    this.winston.log(level, message, logEntry);
  }

  /**
   * Create child logger with additional context
   */
  child(context: Record<string, any>): Logger {
    const childLogger = new Logger(`${this.module}:${context.component || 'child'}`);
    childLogger.winston = this.winston.child(context);
    return childLogger;
  }

  /**
   * Start timer for performance measurement
   */
  startTimer(label: string): () => void {
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      this.debug(`${label} completed`, { duration, label });
    };
  }

  /**
   * Log method entry (for debugging)
   */
  methodEntry(methodName: string, args?: any): void {
    if (process.env.LOG_LEVEL === 'verbose') {
      this.verbose(`Entering ${methodName}`, { method: methodName, args });
    }
  }

  /**
   * Log method exit (for debugging)
   */
  methodExit(methodName: string, result?: any): void {
    if (process.env.LOG_LEVEL === 'verbose') {
      this.verbose(`Exiting ${methodName}`, { method: methodName, result });
    }
  }

  /**
   * Set global log level
   */
  static setLevel(level: LogLevel): void {
    Logger.defaultLogger.level = level;
  }

  /**
   * Flush logs (ensure all logs are written)
   */
  static async flush(): Promise<void> {
    return new Promise((resolve) => {
      Logger.defaultLogger.on('finish', resolve);
      Logger.defaultLogger.end();
    });
  }
}

// Export convenience function
export function getLogger(module: string): Logger {
  return Logger.getInstance(module);
}