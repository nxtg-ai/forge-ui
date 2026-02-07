/**
 * @vitest-environment node
 */

/**
 * Frontend Health Tests - CANONICAL
 *
 * These tests catch integration failures that unit tests miss:
 * 1. Build verification - does Vite build succeed?
 * 2. WebSocket singleton enforcement - only ws-manager.ts creates WS connections to /ws
 * 3. Import chain validation - no server-only imports in browser code
 * 4. No duplicate data fetching patterns
 *
 * WHY THIS EXISTS:
 * On 2026-02-05, 6 separate WebSocket connections from one browser tab
 * caused an infinite reconnect storm. Unit tests all passed because
 * they tested components in isolation. These tests catch systemic issues.
 */

import { describe, test, expect, vi } from "vitest";

// Unmock fs - global setup.ts mocks it, but we need real filesystem access
vi.unmock("fs");
vi.unmock("node:fs");

import { execSync } from "node:child_process";
import { readFileSync, existsSync, readdirSync, type Dirent } from "node:fs";
import { join, basename, relative, resolve } from "node:path";

// ROOT = project root (v3/), not src/
const ROOT = resolve(__dirname, "../../..");

/**
 * Recursively find all .ts/.tsx files under a directory, excluding test/server files
 */
function findSourceFiles(dir: string, extensions = [".ts", ".tsx"]): string[] {
  const results: string[] = [];
  if (!existsSync(dir)) return results;

  const entries: Dirent[] = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (
        entry.name === "__tests__" ||
        entry.name === "node_modules" ||
        entry.name === "server"
      ) {
        continue;
      }
      results.push(...findSourceFiles(fullPath, extensions));
    } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
      if (
        entry.name.includes(".test.") ||
        entry.name.includes(".spec.") ||
        entry.name.includes(".example.")
      ) {
        continue;
      }
      results.push(fullPath);
    }
  }
  return results;
}

describe("Frontend Health", () => {
  describe("Build Verification", () => {
    test("vite build succeeds without errors", () => {
      try {
        const result = execSync("npx vite build 2>&1", {
          cwd: ROOT,
          timeout: 60000,
          encoding: "utf-8",
        });
        expect(result).toContain("built in");
      } catch (error: any) {
        throw new Error(
          `Vite build failed:\n${error.stdout || error.message}`,
        );
      }
    }, 60000);
  });

  describe("WebSocket Singleton Enforcement", () => {
    test("only ws-manager.ts creates WebSocket connections to /ws endpoint", () => {
      const clientFiles = findSourceFiles(join(ROOT, "src"));
      const violations: string[] = [];

      for (const filePath of clientFiles) {
        if (filePath.endsWith("ws-manager.ts")) continue;
        if (
          filePath.includes("terminal") ||
          filePath.includes("Terminal") ||
          filePath.includes("SessionPersistence")
        )
          continue;

        const content = readFileSync(filePath, "utf-8");

        if (content.includes("new WebSocket(")) {
          violations.push(relative(ROOT, filePath));
        }
      }

      if (violations.length > 0) {
        throw new Error(
          `WebSocket singleton violation! These files create their own WebSocket connections ` +
            `instead of using wsManager:\n  - ${violations.join("\n  - ")}\n\n` +
            `Fix: Import { wsManager } from '../services/ws-manager' and use ` +
            `wsManager.subscribe() instead of new WebSocket().`,
        );
      }
    });

    test("ws-manager.ts exports a singleton instance", () => {
      const wsManagerPath = join(ROOT, "src/services/ws-manager.ts");
      const content = readFileSync(wsManagerPath, "utf-8");

      expect(content).toContain("private constructor()");
      expect(content).toContain("static getInstance()");
      expect(content).toMatch(/export const wsManager\s*=/);
    });
  });

  describe("Import Chain Validation", () => {
    test("client-side files do not import server-only modules", () => {
      const clientFiles = findSourceFiles(join(ROOT, "src"));

      const serverOnlyImports = [
        'from "fs"',
        'from "fs/promises"',
        'from "child_process"',
        'from "http"',
        'from "https"',
        'from "net"',
        'from "express"',
        'from "ws"',
        'from "node-pty"',
        'from "winston"',
      ];

      // Directories that are server-side / CLI / Node.js only
      const serverSideDirs = [
        "core",
        "monitoring",
        "orchestration",
        "test",
        "maintenance",
        "adapters",
      ];

      // Individual files that legitimately use Node.js APIs
      const serverSideFiles = [
        "daemon.ts",
        "logger.ts",
        "status-service.ts",
        "governance-state-manager.ts",
        "base-service.ts",
        "init-service.ts",
        "intelligence-injector.ts",
        "intelligence-parser.ts",
        "command-service.ts",
        "compliance-service.ts",
        "vision-service.ts",
        "state.ts", // root state module
      ];

      const violations: Array<{ file: string; import: string }> = [];

      for (const filePath of clientFiles) {
        const fileName = basename(filePath);
        const relPath = relative(join(ROOT, "src"), filePath);

        // Skip server-side directories
        if (serverSideDirs.some((dir) => relPath.startsWith(dir + "/"))) continue;
        // Skip known server-side files
        if (serverSideFiles.includes(fileName)) continue;

        const content = readFileSync(filePath, "utf-8");

        for (const serverImport of serverOnlyImports) {
          if (content.includes(serverImport)) {
            violations.push({
              file: relative(ROOT, filePath),
              import: serverImport,
            });
          }
        }
      }

      if (violations.length > 0) {
        const details = violations
          .map((v) => `  ${v.file}: ${v.import}`)
          .join("\n");
        throw new Error(
          `Server-only imports found in client-side code:\n${details}\n\n` +
            `These imports will break the browser bundle.`,
        );
      }
    });
  });

  describe("No Duplicate Data Fetching", () => {
    test("dashboard hooks don't create competing polling loops", () => {
      const dashHook = readFileSync(
        join(ROOT, "src/hooks/useDashboardData.ts"),
        "utf-8",
      );
      const intervalMatches = dashHook.match(/setInterval/g);
      expect(intervalMatches?.length || 0).toBeLessThanOrEqual(1);
    });
  });

  describe("Terminal Reconnect Safety", () => {
    test("useSessionPersistence uses stability timer before resetting reconnect counter", () => {
      const hookPath = join(
        ROOT,
        "src/components/infinity-terminal/hooks/useSessionPersistence.ts",
      );
      const content = readFileSync(hookPath, "utf-8");

      // Must use a stability timer (setTimeout) before resetting reconnect counter.
      // Direct reset in onopen causes infinite loops when server rejects connections.
      expect(content).toContain("stabilityTimer");
      expect(content).toContain("setTimeout");

      // The onopen handler must NOT directly set reconnectAttemptsRef.current = 0
      // outside of a timer callback. Look for lines that reset directly at top-level of onopen.
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line === "reconnectAttemptsRef.current = 0;") {
          // Check surrounding context - must be inside setTimeout or disconnect
          const context = lines.slice(Math.max(0, i - 5), i).join(" ");
          const isInTimer = context.includes("setTimeout") || context.includes("stabilityTimer");
          const isInDisconnect = context.includes("disconnect") || context.includes("resetReconnect");
          expect(
            isInTimer || isInDisconnect,
          ).toBe(true);
        }
      }
    });

    test("PTY bridge allows Vite proxy origins", () => {
      const bridgePath = join(ROOT, "src/server/pty-bridge.ts");
      const content = readFileSync(bridgePath, "utf-8");

      // Must allow connections from both Vite (5050) and API server (5051)
      expect(content).toContain("localhost:5050");
      expect(content).toContain("localhost:5051");
    });
  });

  describe("Component Structure", () => {
    test("key pages export default components", () => {
      const pages = ["src/pages/dashboard-live.tsx", "src/pages/landing.tsx"];

      for (const pagePath of pages) {
        const fullPath = join(ROOT, pagePath);
        if (!existsSync(fullPath)) continue;
        const content = readFileSync(fullPath, "utf-8");
        expect(content).toContain("export default");
      }
    });
  });
});
