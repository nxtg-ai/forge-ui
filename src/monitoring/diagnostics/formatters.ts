/**
 * Diagnostic Report Formatters
 * Functions for formatting diagnostic reports and collecting logs
 */

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import * as os from "os";

export interface DiagnosticResult {
  name: string;
  category: string;
  passed: boolean;
  duration: number;
  message: string;
  details?: Record<string, unknown>;
  recommendation?: string;
}

export interface DiagnosticReport {
  timestamp: Date;
  projectPath: string;
  totalTests: number;
  passed: number;
  failed: number;
  duration: number;
  results: DiagnosticResult[];
  systemInfo: SystemInfo;
  recommendations: string[];
}

export interface SystemInfo {
  platform: string;
  nodeVersion: string;
  npmVersion: string;
  memory: {
    total: number;
    free: number;
    used: number;
  };
  disk: {
    total: number;
    free: number;
    used: number;
  };
  cpu: {
    cores: number;
    model: string;
    speed: number;
  };
}

/**
 * Get npm version
 */
export function getNpmVersion(): string {
  try {
    return execSync("npm --version", { encoding: "utf-8" }).trim();
  } catch {
    return "unknown";
  }
}

/**
 * Get disk information
 */
export function getDiskInfo(projectPath: string): {
  total: number;
  free: number;
  used: number;
} {
  try {
    const result = execSync(`df -k "${projectPath}" | tail -1`, {
      encoding: "utf-8",
    });
    const parts = result.trim().split(/\s+/);

    return {
      total: Math.round(parseInt(parts[1]) / 1024), // MB
      used: Math.round(parseInt(parts[2]) / 1024),
      free: Math.round(parseInt(parts[3]) / 1024),
    };
  } catch {
    return { total: 0, free: 0, used: 0 };
  }
}

/**
 * Get system information
 */
export function getSystemInfo(projectPath: string): SystemInfo {
  return {
    platform: os.platform(),
    nodeVersion: process.version,
    npmVersion: getNpmVersion(),
    memory: {
      total: Math.round(os.totalmem() / 1024 / 1024),
      free: Math.round(os.freemem() / 1024 / 1024),
      used: Math.round((os.totalmem() - os.freemem()) / 1024 / 1024),
    },
    disk: getDiskInfo(projectPath),
    cpu: {
      cores: os.cpus().length,
      model: os.cpus()[0].model,
      speed: os.cpus()[0].speed,
    },
  };
}

/**
 * Format diagnostic summary
 */
export function formatDiagnosticSummary(report: DiagnosticReport): string {
  const lines: string[] = [];

  lines.push("DIAGNOSTIC REPORT");
  lines.push("=".repeat(50));
  lines.push(`Timestamp: ${report.timestamp.toISOString()}`);
  lines.push(`Project: ${report.projectPath}`);
  lines.push("");

  lines.push("TEST RESULTS");
  lines.push("-".repeat(50));
  lines.push(`Total Tests: ${report.totalTests}`);
  lines.push(`Passed: ${report.passed} ✓`);
  lines.push(`Failed: ${report.failed} ✗`);
  lines.push(`Duration: ${report.duration.toFixed(2)}ms`);
  lines.push("");

  if (report.failed > 0) {
    lines.push("FAILED TESTS");
    lines.push("-".repeat(50));
    for (const result of report.results.filter((r) => !r.passed)) {
      lines.push(`✗ ${result.name}: ${result.message}`);
      if (result.recommendation) {
        lines.push(`  → ${result.recommendation}`);
      }
    }
    lines.push("");
  }

  lines.push("SYSTEM INFO");
  lines.push("-".repeat(50));
  lines.push(`Platform: ${report.systemInfo.platform}`);
  lines.push(`Node: ${report.systemInfo.nodeVersion}`);
  lines.push(`NPM: ${report.systemInfo.npmVersion}`);
  lines.push(
    `Memory: ${report.systemInfo.memory.used}MB / ${report.systemInfo.memory.total}MB`,
  );
  lines.push(
    `CPU: ${report.systemInfo.cpu.model} (${report.systemInfo.cpu.cores} cores)`,
  );
  lines.push("");

  if (report.recommendations.length > 0) {
    lines.push("RECOMMENDATIONS");
    lines.push("-".repeat(50));
    for (const rec of report.recommendations) {
      lines.push(`• ${rec}`);
    }
  }

  return lines.join("\n");
}
