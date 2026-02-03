/**
 * Sentry Integration for NXTG-Forge
 * Provides error tracking, performance monitoring, and session replay
 */

// Type definitions for Sentry (avoids import errors when Sentry not installed)
interface SentryConfig {
  dsn: string;
  environment: string;
  release?: string;
  tracesSampleRate?: number;
  replaysSessionSampleRate?: number;
  replaysOnErrorSampleRate?: number;
  debug?: boolean;
}

interface SentryUser {
  id?: string;
  email?: string;
  username?: string;
}

interface SentryContext {
  [key: string]: unknown;
}

// Check if Sentry is available (installed)
let Sentry: typeof import("@sentry/node") | null = null;

/**
 * Initialize Sentry for server-side error tracking
 * Call this early in your application startup
 */
export async function initSentryServer(): Promise<boolean> {
  const dsn = process.env.SENTRY_DSN;

  if (!dsn) {
    console.log("[Sentry] No SENTRY_DSN configured, error tracking disabled");
    return false;
  }

  try {
    // Dynamic import to avoid errors if not installed
    Sentry = await import("@sentry/node");

    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || "development",
      release: process.env.npm_package_version
        ? `nxtg-forge@${process.env.npm_package_version}`
        : undefined,
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
      debug: process.env.NODE_ENV === "development",

      // Filter out known non-errors
      beforeSend(event, hint) {
        const error = hint?.originalException;

        // Don't send expected/handled errors
        if (error instanceof Error) {
          if (error.message.includes("ECONNRESET")) return null;
          if (error.message.includes("EPIPE")) return null;
          if (error.message.includes("socket hang up")) return null;
        }

        return event;
      },

      // Add extra context to all events
      initialScope: {
        tags: {
          component: "api-server",
        },
      },
    });

    console.log("[Sentry] Server-side error tracking initialized");
    return true;
  } catch (error) {
    console.warn("[Sentry] Failed to initialize:", error);
    console.warn("[Sentry] Install with: npm install @sentry/node");
    return false;
  }
}

/**
 * Capture an exception and send to Sentry
 */
export function captureException(
  error: Error | string,
  context?: SentryContext
): string | null {
  if (!Sentry) {
    console.error("[Error]", error);
    return null;
  }

  const eventId = Sentry.captureException(error, {
    extra: context,
  });

  return eventId;
}

/**
 * Capture a message (non-error event)
 */
export function captureMessage(
  message: string,
  level: "fatal" | "error" | "warning" | "info" | "debug" = "info",
  context?: SentryContext
): string | null {
  if (!Sentry) {
    console.log(`[${level.toUpperCase()}]`, message);
    return null;
  }

  const eventId = Sentry.captureMessage(message, {
    level,
    extra: context,
  });

  return eventId;
}

/**
 * Set user context for error tracking
 */
export function setUser(user: SentryUser | null): void {
  if (!Sentry) return;
  Sentry.setUser(user);
}

/**
 * Add breadcrumb for debugging context
 */
export function addBreadcrumb(breadcrumb: {
  category?: string;
  message: string;
  level?: "fatal" | "error" | "warning" | "info" | "debug";
  data?: Record<string, unknown>;
}): void {
  if (!Sentry) return;
  Sentry.addBreadcrumb(breadcrumb);
}

/**
 * Set a tag that will be added to all events
 */
export function setTag(key: string, value: string): void {
  if (!Sentry) return;
  Sentry.setTag(key, value);
}

/**
 * Set extra context data
 */
export function setExtra(key: string, value: unknown): void {
  if (!Sentry) return;
  Sentry.setExtra(key, value);
}

/**
 * Start a performance transaction
 */
export function startTransaction(name: string, op: string): unknown {
  if (!Sentry) return null;
  return Sentry.startSpan({ name, op }, () => {});
}

/**
 * Express error handler middleware for Sentry
 */
export function sentryErrorHandler() {
  if (!Sentry) {
    // Return a no-op middleware if Sentry isn't initialized
    return (
      err: Error,
      _req: unknown,
      _res: unknown,
      next: (err?: Error) => void
    ) => {
      next(err);
    };
  }

  return Sentry.expressErrorHandler();
}

/**
 * Express request handler middleware for Sentry
 */
export function sentryRequestHandler() {
  if (!Sentry) {
    // Return a no-op middleware
    return (_req: unknown, _res: unknown, next: () => void) => {
      next();
    };
  }

  return Sentry.expressIntegration();
}

/**
 * Flush Sentry events before shutdown
 */
export async function flushSentry(timeout: number = 2000): Promise<boolean> {
  if (!Sentry) return true;

  try {
    await Sentry.close(timeout);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if Sentry is initialized and ready
 */
export function isSentryReady(): boolean {
  return Sentry !== null;
}

/**
 * Get Sentry instance for advanced usage
 */
export function getSentry(): typeof import("@sentry/node") | null {
  return Sentry;
}
