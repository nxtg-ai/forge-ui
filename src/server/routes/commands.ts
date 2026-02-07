/**
 * Command Routes - Forge command execution endpoints
 *
 * Routes:
 * - GET /history - Command execution history
 * - POST /suggestions - Get command suggestions based on context
 * - GET / - List available commands
 * - POST /execute - Execute a command from the whitelist
 */

import express from "express";
import type { RouteContext } from "../route-context";
import { rateLimit, writeLimiter } from "../middleware";
import { captureException } from "../../monitoring/sentry";
import { getLogger } from "../../utils/logger";
import { StatusService } from "../../services/status-service";

const logger = getLogger("routes:commands");

/** Extract output from execSync errors (which include stdout/stderr/message) */
function getExecOutput(error: unknown): string {
  if (error && typeof error === "object") {
    const e = error as { stdout?: string; stderr?: string; message?: string };
    return e.stdout || e.stderr || e.message || "Unknown error";
  }
  return String(error);
}

export function createCommandRoutes(ctx: RouteContext): express.Router {
  const router = express.Router();

  // ============= Command History =============

  router.get("/history", async (req, res) => {
    try {
      const history = await ctx.orchestrator.getCommandHistory();
      res.json({
        success: true,
        data: history,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // ============= Command Suggestions =============

  router.post("/suggestions", async (req, res) => {
    try {
      const { context } = req.body;
      const suggestions = await ctx.orchestrator.getCommandSuggestions(context);
      res.json({
        success: true,
        data: suggestions,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // ============= Available Commands List =============

  router.get("/", async (req, res) => {
    try {
      // Import the forge commands registry
      const { FORGE_COMMANDS } = await import("../../config/forge-commands");

      // Transform to UI-compatible format
      const commands = FORGE_COMMANDS.map((cmd) => ({
        id: cmd.id,
        name: cmd.name,
        description: cmd.description,
        category: cmd.category,
        hotkey: cmd.hotkey,
        requiresConfirmation: cmd.requiresConfirmation,
        severity: cmd.severity,
        // Icon name is sent as string, component resolves on client
        iconName: cmd.icon.name,
      }));

      res.json({
        success: true,
        data: commands,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // ============= Command Execution Endpoint =============

  // Whitelist of commands that can be executed from the UI
  const EXECUTABLE_COMMANDS: Record<
    string,
    () => Promise<{ success: boolean; output: string; data?: unknown }>
  > = {
    "frg-status": async () => {
      const result = await ctx.statusService.getStatus();
      if (result.isErr()) {
        return { success: false, output: result.error.message };
      }
      const status = result.unwrap();
      const cliOutput = StatusService.formatForCLI(status);
      return { success: true, output: cliOutput, data: status };
    },

    "frg-test": async () => {
      const { execSync } = await import("child_process");
      try {
        const output = execSync("npx vitest run --reporter=verbose 2>&1", {
          cwd: ctx.projectRoot,
          timeout: 120000,
          encoding: "utf-8",
          maxBuffer: 1024 * 1024 * 5,
        });
        const passMatch = output.match(/(\d+) passed/);
        const failMatch = output.match(/(\d+) failed/);
        const passed = passMatch ? parseInt(passMatch[1]) : 0;
        const failed = failMatch ? parseInt(failMatch[1]) : 0;
        return {
          success: failed === 0,
          output,
          data: { passed, failed, total: passed + failed },
        };
      } catch (error: unknown) {
        const output = getExecOutput(error);
        const failMatch = output.match(/(\d+) failed/);
        const passMatch = output.match(/(\d+) passed/);
        return {
          success: false,
          output,
          data: {
            passed: passMatch ? parseInt(passMatch[1]) : 0,
            failed: failMatch ? parseInt(failMatch[1]) : 0,
          },
        };
      }
    },

    "frg-deploy": async () => {
      const { execSync } = await import("child_process");
      // Pre-flight: type check
      try {
        execSync("npx tsc --noEmit 2>&1", {
          cwd: ctx.projectRoot,
          timeout: 60000,
          encoding: "utf-8",
        });
      } catch (error: unknown) {
        return {
          success: false,
          output: `Pre-flight failed: TypeScript errors\n${getExecOutput(error)}`,
        };
      }
      // Build
      try {
        const output = execSync("npx vite build 2>&1", {
          cwd: ctx.projectRoot,
          timeout: 60000,
          encoding: "utf-8",
        });
        return { success: true, output, data: { stage: "build-complete" } };
      } catch (error: unknown) {
        return {
          success: false,
          output: `Build failed:\n${getExecOutput(error)}`,
        };
      }
    },

    "frg-feature": async () => {
      return {
        success: true,
        output:
          "Feature creation requires the Infinity Terminal.\nNavigate to the Terminal page and use: /frg-feature <name>",
        data: { redirect: "/terminal" },
      };
    },

    "frg-gap-analysis": async () => {
      const { execSync } = await import("child_process");
      const lines: string[] = [];

      // Test coverage
      try {
        const testOutput = execSync(
          "npx vitest run --reporter=verbose 2>&1 | tail -5",
          {
            cwd: ctx.projectRoot,
            timeout: 120000,
            encoding: "utf-8",
          },
        );
        lines.push("## Test Coverage\n" + testOutput.trim());
      } catch {
        lines.push("## Test Coverage\nFailed to run tests");
      }

      // Doc coverage
      try {
        const srcFiles = execSync(
          "find src -name '*.ts' -o -name '*.tsx' | grep -v test | grep -v __tests__ | wc -l",
          {
            cwd: ctx.projectRoot,
            timeout: 10000,
            encoding: "utf-8",
          },
        ).trim();
        const docFiles = execSync("find docs -name '*.md' 2>/dev/null | wc -l", {
          cwd: ctx.projectRoot,
          timeout: 10000,
          encoding: "utf-8",
        }).trim();
        lines.push(
          `## Documentation\nSource files: ${srcFiles}\nDoc files: ${docFiles}`,
        );
      } catch {
        lines.push("## Documentation\nFailed to analyze");
      }

      return { success: true, output: lines.join("\n\n") };
    },

    // ============= Git Commands =============

    "git-status": async () => {
      const { execSync } = await import("child_process");
      try {
        const branch = execSync("git branch --show-current 2>&1", {
          cwd: ctx.projectRoot,
          timeout: 10000,
          encoding: "utf-8",
        }).trim();
        const status = execSync("git status --short 2>&1", {
          cwd: ctx.projectRoot,
          timeout: 10000,
          encoding: "utf-8",
        }).trim();
        const log = execSync("git log --oneline -5 2>&1", {
          cwd: ctx.projectRoot,
          timeout: 10000,
          encoding: "utf-8",
        }).trim();
        const ahead = execSync(
          "git rev-list --count @{u}..HEAD 2>/dev/null || echo 'no upstream'",
          {
            cwd: ctx.projectRoot,
            timeout: 10000,
            encoding: "utf-8",
          },
        ).trim();

        const lines = [
          `Branch: ${branch}`,
          `Ahead of remote: ${ahead} commits`,
          "",
          "--- Changed Files ---",
          status || "(working tree clean)",
          "",
          "--- Recent Commits ---",
          log,
        ];
        return {
          success: true,
          output: lines.join("\n"),
          data: { branch, changedFiles: status.split("\n").filter(Boolean).length },
        };
      } catch (error: unknown) {
        return { success: false, output: getExecOutput(error) };
      }
    },

    "git-diff": async () => {
      const { execSync } = await import("child_process");
      try {
        const staged = execSync("git diff --cached --stat 2>&1", {
          cwd: ctx.projectRoot,
          timeout: 10000,
          encoding: "utf-8",
        }).trim();
        const unstaged = execSync("git diff --stat 2>&1", {
          cwd: ctx.projectRoot,
          timeout: 10000,
          encoding: "utf-8",
        }).trim();
        const lines = [
          "--- Staged Changes ---",
          staged || "(nothing staged)",
          "",
          "--- Unstaged Changes ---",
          unstaged || "(no unstaged changes)",
        ];
        return { success: true, output: lines.join("\n") };
      } catch (error: unknown) {
        return { success: false, output: getExecOutput(error) };
      }
    },

    "git-log": async () => {
      const { execSync } = await import("child_process");
      try {
        const output = execSync("git log --oneline --graph --decorate -20 2>&1", {
          cwd: ctx.projectRoot,
          timeout: 10000,
          encoding: "utf-8",
        });
        return { success: true, output };
      } catch (error: unknown) {
        return { success: false, output: getExecOutput(error) };
      }
    },

    // ============= Analyze Commands =============

    "analyze-types": async () => {
      const { execSync } = await import("child_process");
      try {
        execSync("npx tsc --noEmit 2>&1", {
          cwd: ctx.projectRoot,
          timeout: 60000,
          encoding: "utf-8",
        });
        return { success: true, output: "TypeScript: 0 errors. All types check out." };
      } catch (error: unknown) {
        const output = getExecOutput(error);
        const errorCount = (output.match(/error TS/g) || []).length;
        return {
          success: false,
          output: `TypeScript: ${errorCount} error(s) found\n\n${output}`,
          data: { errorCount },
        };
      }
    },

    "analyze-lint": async () => {
      const { execSync } = await import("child_process");
      try {
        const output = execSync("npx eslint src --ext .ts,.tsx --format stylish 2>&1", {
          cwd: ctx.projectRoot,
          timeout: 60000,
          encoding: "utf-8",
          maxBuffer: 1024 * 1024 * 5,
        });
        return { success: true, output: output || "ESLint: No issues found." };
      } catch (error: unknown) {
        const output = getExecOutput(error);
        return { success: false, output };
      }
    },

    "analyze-deps": async () => {
      const { execSync } = await import("child_process");
      try {
        const outdated = execSync("npm outdated --json 2>/dev/null || echo '{}'", {
          cwd: ctx.projectRoot,
          timeout: 30000,
          encoding: "utf-8",
        });
        const parsed = JSON.parse(outdated);
        const entries = Object.entries(parsed);
        if (entries.length === 0) {
          return { success: true, output: "All dependencies are up to date." };
        }
        const lines = entries.map(
          ([pkg, info]) => {
            const dep = info as { current?: string; latest?: string; wanted?: string };
            return `${pkg}: ${dep.current} → ${dep.latest} (wanted: ${dep.wanted})`;
          },
        );
        return {
          success: true,
          output: `${entries.length} outdated package(s):\n\n${lines.join("\n")}`,
          data: { outdatedCount: entries.length },
        };
      } catch (error: unknown) {
        return { success: false, output: getExecOutput(error) };
      }
    },

    "analyze-bundle": async () => {
      const { execSync } = await import("child_process");
      try {
        const output = execSync("npx vite build --mode production 2>&1 | tail -30", {
          cwd: ctx.projectRoot,
          timeout: 120000,
          encoding: "utf-8",
          maxBuffer: 1024 * 1024 * 5,
        });
        return { success: true, output };
      } catch (error: unknown) {
        return { success: false, output: getExecOutput(error) };
      }
    },

    // ============= Test Variants =============

    "test-coverage": async () => {
      const { execSync } = await import("child_process");
      try {
        const output = execSync(
          "npx vitest run --coverage --reporter=verbose 2>&1 | tail -40",
          {
            cwd: ctx.projectRoot,
            timeout: 180000,
            encoding: "utf-8",
            maxBuffer: 1024 * 1024 * 5,
          },
        );
        return { success: true, output };
      } catch (error: unknown) {
        return { success: false, output: getExecOutput(error) };
      }
    },

    // ============= Info Commands =============

    "system-info": async () => {
      const { execSync } = await import("child_process");
      const os = await import("os");
      try {
        const nodeVersion = process.version;
        const npmVersion = execSync("npm --version 2>&1", { encoding: "utf-8" }).trim();
        const gitVersion = execSync("git --version 2>&1", { encoding: "utf-8" }).trim();
        const platform = `${os.platform()} ${os.release()}`;
        const memory = `${Math.round(os.totalmem() / 1024 / 1024 / 1024)}GB total, ${Math.round(os.freemem() / 1024 / 1024 / 1024)}GB free`;
        const cpus = `${os.cpus().length} cores (${os.cpus()[0]?.model || "unknown"})`;
        const uptime = `${Math.round(os.uptime() / 3600)}h`;
        const diskUsage = execSync("df -h . 2>&1 | tail -1", {
          cwd: ctx.projectRoot,
          encoding: "utf-8",
        }).trim();

        const lines = [
          "--- Runtime ---",
          `Node.js:  ${nodeVersion}`,
          `npm:      ${npmVersion}`,
          `Git:      ${gitVersion}`,
          "",
          "--- System ---",
          `Platform: ${platform}`,
          `Memory:   ${memory}`,
          `CPUs:     ${cpus}`,
          `Uptime:   ${uptime}`,
          `Disk:     ${diskUsage}`,
        ];
        return { success: true, output: lines.join("\n") };
      } catch (error: unknown) {
        return { success: false, output: getExecOutput(error) };
      }
    },
  };

  router.post("/execute", rateLimit(writeLimiter), async (req, res) => {
    try {
      const { command } = req.body;

      if (!command || typeof command !== "string") {
        return res.status(400).json({
          success: false,
          error: "Missing command ID",
          timestamp: new Date().toISOString(),
        });
      }

      const handler = EXECUTABLE_COMMANDS[command];
      if (!handler) {
        return res.status(404).json({
          success: false,
          error: `Unknown command: ${command}. Available: ${Object.keys(EXECUTABLE_COMMANDS).join(", ")}`,
          timestamp: new Date().toISOString(),
        });
      }

      // Broadcast that command is starting
      ctx.broadcast("command.started", {
        command,
        startedAt: new Date().toISOString(),
      });

      const result = await handler();

      // Broadcast result
      ctx.broadcast(result.success ? "command.completed" : "command.failed", {
        command,
        success: result.success,
        completedAt: new Date().toISOString(),
      });

      res.json({
        success: result.success,
        data: {
          command,
          output: result.output,
          ...(result.data || {}),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      captureException(error instanceof Error ? error : String(error));
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Command execution failed",
        timestamp: new Date().toISOString(),
      });
    }
  });

  return router;
}
