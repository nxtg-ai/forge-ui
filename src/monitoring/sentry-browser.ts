/**
 * Sentry Browser Integration for NXTG-Forge UI
 * Provides error tracking and performance monitoring for React
 */

// Type definitions
interface SentryUser {
  id?: string;
  email?: string;
  username?: string;
}

interface SentryContext {
  [key: string]: unknown;
}

// Browser Sentry instance (loaded dynamically)
let SentryBrowser: typeof import("@sentry/react") | null = null;
let initialized = false;

/**
 * Initialize Sentry for browser-side error tracking
 * Call this early in your React app (e.g., in main.tsx)
 */
export async function initSentryBrowser(): Promise<boolean> {
  // Get DSN from environment (Vite exposes as import.meta.env)
  const dsn =
    typeof import.meta !== "undefined"
      ? (import.meta as { env?: { VITE_SENTRY_DSN?: string } }).env
          ?.VITE_SENTRY_DSN
      : undefined;

  if (!dsn) {
    console.log(
      "[Sentry] No VITE_SENTRY_DSN configured, browser error tracking disabled"
    );
    return false;
  }

  try {
    // Dynamic import to avoid bundle bloat if not used
    SentryBrowser = await import("@sentry/react");

    SentryBrowser.init({
      dsn,
      environment:
        (import.meta as { env?: { MODE?: string } }).env?.MODE || "development",
      release: `nxtg-forge@${(import.meta as { env?: { VITE_APP_VERSION?: string } }).env?.VITE_APP_VERSION || "3.0.0"}`,

      // Performance monitoring
      tracesSampleRate:
        (import.meta as { env?: { MODE?: string } }).env?.MODE === "production"
          ? 0.1
          : 1.0,

      // Session replay for debugging
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,

      // React-specific integrations
      integrations: [
        SentryBrowser.browserTracingIntegration(),
        SentryBrowser.replayIntegration({
          maskAllText: false,
          blockAllMedia: false,
        }),
      ],

      // Filter out expected errors
      beforeSend(event: any, hint: any) {
        const error = hint?.originalException;

        if (error instanceof Error) {
          // Ignore network errors that are expected
          if (error.message.includes("Failed to fetch")) return null;
          if (error.message.includes("NetworkError")) return null;
          if (error.message.includes("Load failed")) return null;

          // Ignore ResizeObserver errors (browser quirk)
          if (error.message.includes("ResizeObserver")) return null;
        }

        return event;
      },

      // Add context to all events
      initialScope: {
        tags: {
          component: "ui",
        },
      },
    });

    initialized = true;
    console.log("[Sentry] Browser error tracking initialized");
    return true;
  } catch (error) {
    console.warn("[Sentry] Failed to initialize browser tracking:", error);
    console.warn("[Sentry] Install with: npm install @sentry/react");
    return false;
  }
}

/**
 * Capture an exception in the browser
 */
export function captureException(
  error: Error | string,
  context?: SentryContext
): string | null {
  if (!SentryBrowser || !initialized) {
    console.error("[Error]", error);
    return null;
  }

  return SentryBrowser.captureException(error, {
    extra: context,
  });
}

/**
 * Capture a message
 */
export function captureMessage(
  message: string,
  level: "fatal" | "error" | "warning" | "info" | "debug" = "info",
  context?: SentryContext
): string | null {
  if (!SentryBrowser || !initialized) {
    console.log(`[${level.toUpperCase()}]`, message);
    return null;
  }

  return SentryBrowser.captureMessage(message, {
    level,
    extra: context,
  });
}

/**
 * Set user context
 */
export function setUser(user: SentryUser | null): void {
  if (!SentryBrowser || !initialized) return;
  SentryBrowser.setUser(user);
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(breadcrumb: {
  category?: string;
  message: string;
  level?: "fatal" | "error" | "warning" | "info" | "debug";
  data?: Record<string, unknown>;
}): void {
  if (!SentryBrowser || !initialized) return;
  SentryBrowser.addBreadcrumb(breadcrumb);
}

/**
 * Set a tag
 */
export function setTag(key: string, value: string): void {
  if (!SentryBrowser || !initialized) return;
  SentryBrowser.setTag(key, value);
}

/**
 * Set extra context
 */
export function setExtra(key: string, value: unknown): void {
  if (!SentryBrowser || !initialized) return;
  SentryBrowser.setExtra(key, value);
}

/**
 * Get Sentry ErrorBoundary component for React
 * Falls back to null if Sentry not initialized
 */
export function getSentryErrorBoundary(): React.ComponentType<{
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> | null {
  if (!SentryBrowser || !initialized) return null;
  return SentryBrowser.ErrorBoundary;
}

/**
 * Wrap a component with Sentry profiling
 */
export function withSentryProfiler<P extends object>(
  Component: React.ComponentType<P>,
  name?: string
): React.ComponentType<P> {
  if (!SentryBrowser || !initialized) return Component;
  return SentryBrowser.withProfiler(Component, { name });
}

/**
 * Check if Sentry is ready
 */
export function isSentryReady(): boolean {
  return initialized && SentryBrowser !== null;
}

/**
 * Flush pending events
 */
export async function flushSentry(timeout: number = 2000): Promise<boolean> {
  if (!SentryBrowser || !initialized) return true;

  try {
    await SentryBrowser.close(timeout);
    return true;
  } catch {
    return false;
  }
}

// Re-export for convenience
export type { SentryUser, SentryContext };
