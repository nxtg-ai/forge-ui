/**
 * Base Service Class
 * Foundation for all integration services with event handling
 */

import { EventEmitter } from 'events';
import { z } from 'zod';
import { Result, IntegrationError, ValidationError } from '../utils/result';

/**
 * Service lifecycle states
 */
export enum ServiceState {
  IDLE = 'idle',
  INITIALIZING = 'initializing',
  READY = 'ready',
  BUSY = 'busy',
  ERROR = 'error',
  DISPOSED = 'disposed'
}

/**
 * Base service configuration
 */
export interface ServiceConfig {
  name: string;
  retryCount?: number;
  timeout?: number;
  debounceMs?: number;
}

/**
 * Service event types
 */
export interface ServiceEvents {
  stateChange: (state: ServiceState) => void;
  error: (error: Error) => void;
  ready: () => void;
  disposed: () => void;
}

/**
 * Abstract base class for all services
 */
export abstract class BaseService extends EventEmitter {
  protected state: ServiceState = ServiceState.IDLE;
  protected config: ServiceConfig;
  protected disposed = false;
  protected initPromise?: Promise<void>;

  constructor(config: ServiceConfig) {
    super();
    this.config = {
      retryCount: 3,
      timeout: 30000,
      debounceMs: 100,
      ...config
    };
  }

  /**
   * Get current service state
   */
  getState(): ServiceState {
    return this.state;
  }

  /**
   * Set service state and emit event
   */
  protected setState(state: ServiceState): void {
    if (this.disposed && state !== ServiceState.DISPOSED) {
      return;
    }

    this.state = state;
    this.emit('stateChange', state);

    if (state === ServiceState.READY) {
      this.emit('ready');
    } else if (state === ServiceState.DISPOSED) {
      this.emit('disposed');
    }
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<Result<void, IntegrationError>> {
    if (this.disposed) {
      return Result.err(
        new IntegrationError('Service is disposed', 'SERVICE_DISPOSED')
      );
    }

    if (this.state === ServiceState.READY) {
      return Result.ok(undefined);
    }

    if (this.state === ServiceState.INITIALIZING && this.initPromise) {
      await this.initPromise;
      return Result.ok(undefined);
    }

    this.setState(ServiceState.INITIALIZING);

    this.initPromise = this.performInitialization();

    try {
      await this.initPromise;
      this.setState(ServiceState.READY);
      return Result.ok(undefined);
    } catch (error) {
      this.setState(ServiceState.ERROR);
      const integrationError = error instanceof IntegrationError
        ? error
        : new IntegrationError(
            error instanceof Error ? error.message : String(error),
            'INITIALIZATION_ERROR'
          );
      this.emit('error', integrationError);
      return Result.err(integrationError);
    } finally {
      this.initPromise = undefined;
    }
  }

  /**
   * Abstract method for service-specific initialization
   */
  protected abstract performInitialization(): Promise<void>;

  /**
   * Dispose the service and clean up resources
   */
  async dispose(): Promise<void> {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    this.setState(ServiceState.DISPOSED);

    await this.performDisposal();
    this.removeAllListeners();
  }

  /**
   * Abstract method for service-specific disposal
   */
  protected abstract performDisposal(): Promise<void>;

  /**
   * Validate data against a Zod schema
   */
  protected validate<T>(
    data: unknown,
    schema: z.ZodSchema<T>
  ): Result<T, ValidationError> {
    try {
      const validated = schema.parse(data);
      return Result.ok(validated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return Result.err(
          new ValidationError(
            'Validation failed',
            (error as any).errors
          )
        );
      }
      return Result.err(
        new ValidationError(
          error instanceof Error ? error.message : String(error)
        )
      );
    }
  }

  /**
   * Retry an operation with exponential backoff
   */
  protected async retry<T>(
    operation: () => Promise<T>,
    retryCount?: number
  ): Promise<Result<T, IntegrationError>> {
    const maxRetries = retryCount ?? this.config.retryCount ?? 3;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await operation();
        return Result.ok(result);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < maxRetries - 1) {
          // Exponential backoff: 100ms, 200ms, 400ms...
          const delay = Math.pow(2, attempt) * 100;
          await this.delay(delay);
        }
      }
    }

    return Result.err(
      new IntegrationError(
        `Operation failed after ${maxRetries} attempts: ${lastError?.message}`,
        'RETRY_EXHAUSTED',
        { lastError }
      )
    );
  }

  /**
   * Delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create a debounced version of a function
   */
  protected debounce<T extends (...args: any[]) => any>(
    fn: T,
    delay?: number
  ): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout | null = null;
    const debounceDelay = delay ?? this.config.debounceMs ?? 100;

    return (...args: Parameters<T>): void => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        fn.apply(this, args);
        timeoutId = null;
      }, debounceDelay);
    };
  }

  /**
   * Execute an operation with timeout
   */
  protected async withTimeout<T>(
    operation: Promise<T>,
    timeout?: number
  ): Promise<Result<T, IntegrationError>> {
    const timeoutMs = timeout ?? this.config.timeout ?? 30000;

    return Promise.race([
      operation.then(result => Result.ok(result)),
      new Promise<Result<T, IntegrationError>>(resolve =>
        setTimeout(
          () => resolve(Result.err(
            new IntegrationError(
              `Operation timed out after ${timeoutMs}ms`,
              'TIMEOUT'
            )
          )),
          timeoutMs
        )
      )
    ]).catch(error => Result.err(
      new IntegrationError(
        error instanceof Error ? error.message : String(error),
        'OPERATION_ERROR'
      )
    ));
  }
}