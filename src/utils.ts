/**
 * Utility functions for NXTG Forge
 */

export class Logger {
  constructor(private prefix: string) {}

  info(message: string): void {
    console.log(`[${this.prefix}] ℹ️  ${message}`);
  }

  success(message: string): void {
    console.log(`[${this.prefix}] ✅ ${message}`);
  }

  error(message: string): void {
    console.error(`[${this.prefix}] ❌ ${message}`);
  }

  warn(message: string): void {
    console.warn(`[${this.prefix}] ⚠️  ${message}`);
  }
}

export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString();
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export async function fileExists(path: string): Promise<boolean> {
  try {
    await require("fs").promises.access(path);
    return true;
  } catch {
    return false;
  }
}
