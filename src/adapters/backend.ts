/**
 * Agent Backend Interface
 *
 * Abstracts how worker processes are spawned. Each backend knows
 * how to detect its CLI tool and produce a SpawnConfig that the
 * AgentWorkerPool can use to launch worker processes.
 *
 * Backends:
 *  - ClaudeCodeBackend  → native Agent Teams (pool disabled)
 *  - CodexBackend       → `codex --agent` via spawn + JSON lines
 *  - GeminiBackend      → `gemini --agent` via spawn + JSON lines
 *  - NodeWorkerBackend  → fork worker-process.ts (default fallback)
 */

import { execSync } from "child_process";
import * as path from "path";
import * as fs from "fs";
import { getLogger } from "../utils/logger";

const logger = getLogger("agent-backend");

// ============= Interfaces =============

export interface SpawnConfig {
  /** How to launch the process */
  mode: "fork" | "spawn";
  /** Executable command (absolute path or PATH-resolvable name) */
  command: string;
  /** CLI arguments */
  args: string[];
  /** Extra environment variables */
  env?: Record<string, string>;
  /** How the pool communicates with the worker */
  communicationProtocol: "ipc" | "jsonlines";
}

export interface AgentBackend {
  /** Human-readable backend name */
  readonly name: string;
  /** Check if this backend's CLI tool is installed and usable */
  isAvailable(): Promise<boolean>;
  /** Return the spawn configuration for the worker pool */
  getSpawnConfig(): SpawnConfig;
}

// ============= Helpers =============

function whichSync(command: string): string | null {
  try {
    return execSync(`which ${command}`, { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim();
  } catch {
    return null;
  }
}

function claudeDirExists(): boolean {
  const claudeDir = path.join(process.env.HOME || "~", ".claude");
  try {
    return fs.statSync(claudeDir).isDirectory();
  } catch {
    return false;
  }
}

// ============= Implementations =============

/**
 * Claude Code backend.
 *
 * When running inside Claude Code, the worker pool is disabled because
 * Claude uses native Agent Teams (Task tool + TeamCreate) instead.
 * getSpawnConfig() still returns a valid fork config for edge cases
 * where the pool is explicitly forced on.
 */
export class ClaudeCodeBackend implements AgentBackend {
  readonly name = "claude-code" as const;

  async isAvailable(): Promise<boolean> {
    if (process.env.CLAUDE_CODE) return true;
    if (process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS) return true;
    return claudeDirExists();
  }

  getSpawnConfig(): SpawnConfig {
    return {
      mode: "fork",
      command: path.join(__dirname, "../server/workers/worker-process"),
      args: [],
      communicationProtocol: "ipc",
    };
  }
}

/**
 * OpenAI Codex CLI backend.
 * Spawns `codex --agent` and communicates via JSON lines over stdin/stdout.
 */
export class CodexBackend implements AgentBackend {
  readonly name = "codex" as const;

  async isAvailable(): Promise<boolean> {
    const found = whichSync("codex");
    if (found) {
      logger.info(`Codex CLI found at ${found}`);
    }
    return found !== null;
  }

  getSpawnConfig(): SpawnConfig {
    return {
      mode: "spawn",
      command: "codex",
      args: ["--agent"],
      communicationProtocol: "jsonlines",
    };
  }
}

/**
 * Google Gemini CLI backend.
 * Spawns `gemini --agent` and communicates via JSON lines over stdin/stdout.
 */
export class GeminiBackend implements AgentBackend {
  readonly name = "gemini" as const;

  async isAvailable(): Promise<boolean> {
    const found = whichSync("gemini");
    if (found) {
      logger.info(`Gemini CLI found at ${found}`);
    }
    return found !== null;
  }

  getSpawnConfig(): SpawnConfig {
    return {
      mode: "spawn",
      command: "gemini",
      args: ["--agent"],
      communicationProtocol: "jsonlines",
    };
  }
}

/**
 * Default Node.js worker backend.
 * Forks worker-process.ts and communicates over Node IPC.
 * Always available as the fallback.
 */
export class NodeWorkerBackend implements AgentBackend {
  readonly name = "node-worker" as const;

  async isAvailable(): Promise<boolean> {
    return true;
  }

  getSpawnConfig(): SpawnConfig {
    return {
      mode: "fork",
      command: path.join(__dirname, "../server/workers/worker-process"),
      args: [],
      communicationProtocol: "ipc",
    };
  }
}
