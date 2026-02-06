/**
 * Type stubs for optional Sentry packages
 * Allows compilation when @sentry packages are not installed
 */

declare module '@sentry/node' {
  export function init(options: any): void;
  export function captureException(error: Error | string, context?: any): string;
  export function captureMessage(message: string, options?: any): string;
  export function setUser(user: any): void;
  export function setTag(key: string, value: string): void;
  export function setContext(name: string, context: any): void;
  export function setExtra(key: string, value: any): void;
  export function addBreadcrumb(breadcrumb: any): void;
  export function flush(timeout?: number): Promise<boolean>;
  export function close(timeout?: number): Promise<boolean>;
  export function startSpan(options: any, callback: any): any;
  export function expressIntegration(): any;
  export function expressErrorHandler(): any;
}

declare module '@sentry/react' {
  export function init(options: any): void;
  export function captureException(error: Error | string, context?: any): string;
  export function captureMessage(message: string, options?: any): string;
  export function setUser(user: any): void;
  export function setTag(key: string, value: string): void;
  export function setContext(name: string, context: any): void;
  export function setExtra(key: string, value: any): void;
  export function addBreadcrumb(breadcrumb: any): void;
  export function browserTracingIntegration(): any;
  export function replayIntegration(options?: any): any;
  export function close(timeout?: number): Promise<boolean>;
  export const ErrorBoundary: any;
  export const withProfiler: any;
}
