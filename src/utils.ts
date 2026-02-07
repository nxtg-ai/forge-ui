/**
 * Utility functions for NXTG Forge
 */

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
