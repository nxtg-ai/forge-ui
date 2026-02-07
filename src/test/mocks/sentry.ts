/**
 * Mock @sentry/node for tests
 * The package is not installed as a dependency, but the code dynamically imports it
 */

export const init = () => {};
export const captureException = () => {};
export const captureMessage = () => {};
export const setUser = () => {};
export const setTag = () => {};
export const setContext = () => {};
export const addBreadcrumb = () => {};
export const Severity = {
  Fatal: 'fatal',
  Error: 'error',
  Warning: 'warning',
  Log: 'log',
  Info: 'info',
  Debug: 'debug',
};
