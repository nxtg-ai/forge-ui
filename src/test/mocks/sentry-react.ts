/**
 * Mock @sentry/react for tests
 * The package is not installed as a dependency, but the code dynamically imports it
 */

import { vi } from "vitest";

export const init = vi.fn();
export const captureException = vi.fn(() => "mock-event-id");
export const captureMessage = vi.fn(() => "mock-event-id");
export const setUser = vi.fn();
export const setTag = vi.fn();
export const setExtra = vi.fn();
export const addBreadcrumb = vi.fn();
export const close = vi.fn(() => Promise.resolve());

// React-specific exports
export const browserTracingIntegration = vi.fn(() => ({
  name: "BrowserTracing",
}));

export const replayIntegration = vi.fn((options: any) => ({
  name: "Replay",
  options,
}));

export const ErrorBoundary = function MockErrorBoundary({
  children,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  return children;
};

export const withProfiler = vi.fn((Component: any, options?: any) => Component);

export const Severity = {
  Fatal: "fatal",
  Error: "error",
  Warning: "warning",
  Log: "log",
  Info: "info",
  Debug: "debug",
};
