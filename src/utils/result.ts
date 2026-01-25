/**
 * Result Type for Error Handling
 * Implements functional error handling with Result<T, E> pattern
 */

/**
 * Result type for handling success and error states
 * Follows the functional programming pattern for error handling
 */
export type Result<T, E = Error> = Ok<T> | Err<E>;

/**
 * Success result wrapper
 */
export class Ok<T> {
  readonly ok = true as const;
  readonly err = false as const;

  constructor(public readonly value: T) {}

  /**
   * Maps the success value to a new value
   */
  map<U>(fn: (value: T) => U): Result<U, never> {
    return new Ok(fn(this.value));
  }

  /**
   * Maps the error value (no-op for Ok)
   */
  mapErr<F>(_fn: (error: never) => F): Result<T, F> {
    return this as unknown as Result<T, F>;
  }

  /**
   * Chains another Result-producing operation
   */
  andThen<U, F>(fn: (value: T) => Result<U, F>): Result<U, F> {
    return fn(this.value);
  }

  /**
   * Returns the value or throws if error
   */
  unwrap(): T {
    return this.value;
  }

  /**
   * Returns the value or a default
   */
  unwrapOr(_defaultValue: T): T {
    return this.value;
  }

  /**
   * Returns the value or computes it from error
   */
  unwrapOrElse(_fn: (error: never) => T): T {
    return this.value;
  }

  /**
   * Checks if Result is Ok
   */
  isOk(): this is Ok<T> {
    return true;
  }

  /**
   * Checks if Result is Err
   */
  isErr(): this is Err<never> {
    return false;
  }

  /**
   * Matches on the Result
   */
  match<U>(patterns: {
    ok: (value: T) => U;
    err: (error: never) => U;
  }): U {
    return patterns.ok(this.value);
  }
}

/**
 * Error result wrapper
 */
export class Err<E> {
  readonly ok = false as const;
  readonly err = true as const;

  constructor(public readonly error: E) {}

  /**
   * Maps the success value (no-op for Err)
   */
  map<U>(_fn: (value: never) => U): Result<U, E> {
    return this as unknown as Result<U, E>;
  }

  /**
   * Maps the error value to a new error
   */
  mapErr<F>(fn: (error: E) => F): Result<never, F> {
    return new Err(fn(this.error));
  }

  /**
   * Chains another Result-producing operation (no-op for Err)
   */
  andThen<U, F>(_fn: (value: never) => Result<U, F>): Result<U, E> {
    return this as unknown as Result<U, E>;
  }

  /**
   * Returns the value or throws if error
   */
  unwrap(): never {
    throw this.error;
  }

  /**
   * Returns the value or a default
   */
  unwrapOr<T>(defaultValue: T): T {
    return defaultValue;
  }

  /**
   * Returns the value or computes it from error
   */
  unwrapOrElse<T>(fn: (error: E) => T): T {
    return fn(this.error);
  }

  /**
   * Checks if Result is Ok
   */
  isOk(): this is Ok<never> {
    return false;
  }

  /**
   * Checks if Result is Err
   */
  isErr(): this is Err<E> {
    return true;
  }

  /**
   * Matches on the Result
   */
  match<U>(patterns: {
    ok: (value: never) => U;
    err: (error: E) => U;
  }): U {
    return patterns.err(this.error);
  }
}

/**
 * Helper functions for creating Results
 */
export const Result = {
  /**
   * Creates a successful Result
   */
  ok<T>(value: T): Ok<T> {
    return new Ok(value);
  },

  /**
   * Creates an error Result
   */
  err<E>(error: E): Err<E> {
    return new Err(error);
  },

  /**
   * Wraps a function that might throw in a Result
   */
  from<T>(fn: () => T): Result<T, Error> {
    try {
      return new Ok(fn());
    } catch (error) {
      return new Err(error instanceof Error ? error : new Error(String(error)));
    }
  },

  /**
   * Wraps an async function that might throw in a Result
   */
  async fromAsync<T>(fn: () => Promise<T>): Promise<Result<T, Error>> {
    try {
      const value = await fn();
      return new Ok(value);
    } catch (error) {
      return new Err(error instanceof Error ? error : new Error(String(error)));
    }
  },

  /**
   * Combines multiple Results into a single Result
   */
  all<T>(results: Result<T, Error>[]): Result<T[], Error> {
    const values: T[] = [];

    for (const result of results) {
      if (result.isErr()) {
        return result as unknown as Result<T[], Error>;
      }
      values.push(result.value);
    }

    return new Ok(values);
  },

  /**
   * Returns the first Ok result or the last Err
   */
  any<T>(results: Result<T, Error>[]): Result<T, Error> {
    let lastError: Err<Error> | null = null;

    for (const result of results) {
      if (result.isOk()) {
        return result;
      }
      lastError = result;
    }

    return lastError || new Err(new Error('No results provided'));
  }
};

/**
 * Type guard for Ok results
 */
export function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
  return result.ok === true;
}

/**
 * Type guard for Err results
 */
export function isErr<T, E>(result: Result<T, E>): result is Err<E> {
  return result.err === true;
}

/**
 * Custom error types for the integration layer
 */
export class IntegrationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'IntegrationError';
  }
}

export class ValidationError extends IntegrationError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class NetworkError extends IntegrationError {
  constructor(message: string, details?: unknown) {
    super(message, 'NETWORK_ERROR', details);
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends IntegrationError {
  constructor(message: string, details?: unknown) {
    super(message, 'TIMEOUT_ERROR', details);
    this.name = 'TimeoutError';
  }
}

export class StateError extends IntegrationError {
  constructor(message: string, details?: unknown) {
    super(message, 'STATE_ERROR', details);
    this.name = 'StateError';
  }
}