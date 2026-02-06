/**
 * Browser Logger
 * Silences noisy debug/info logs in dev mode, shows only warn+error.
 * In production, only errors are shown.
 */

const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3, silent: 4 } as const;

type LogLevel = keyof typeof LOG_LEVELS;

// Dev: show warn+error only. Prod: show error only.
const currentLevel: LogLevel =
  typeof import.meta !== "undefined" && import.meta.env?.DEV ? "warn" : "error";

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

export const logger = {
  debug: (...args: unknown[]) => {
    if (shouldLog("debug")) console.log(...args);
  },
  info: (...args: unknown[]) => {
    if (shouldLog("info")) console.log(...args);
  },
  warn: (...args: unknown[]) => {
    if (shouldLog("warn")) console.warn(...args);
  },
  error: (...args: unknown[]) => {
    if (shouldLog("error")) console.error(...args);
  },
};
