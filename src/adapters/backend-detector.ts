/**
 * Backend Detector
 *
 * Auto-detects which AI CLI backend is available and returns the
 * appropriate AgentBackend instance for the worker pool.
 *
 * Detection priority:
 *  1. FORGE_BACKEND env var (explicit override)
 *  2. Claude Code (native Agent Teams)
 *  3. Codex CLI
 *  4. Gemini CLI
 *  5. NodeWorker (fallback)
 */

import {
  AgentBackend,
  ClaudeCodeBackend,
  CodexBackend,
  GeminiBackend,
  NodeWorkerBackend,
} from "./backend";
import { getLogger } from "../utils/logger";

const logger = getLogger("backend-detector");

const BACKEND_MAP: Record<string, () => AgentBackend> = {
  "claude-code": () => new ClaudeCodeBackend(),
  "codex": () => new CodexBackend(),
  "gemini": () => new GeminiBackend(),
  "node-worker": () => new NodeWorkerBackend(),
};

export async function detectBackend(): Promise<AgentBackend> {
  // 1. Explicit override via env var
  const override = process.env.FORGE_BACKEND;
  if (override && BACKEND_MAP[override]) {
    const backend = BACKEND_MAP[override]();
    logger.info(`Backend override via FORGE_BACKEND: ${backend.name}`);
    return backend;
  }
  if (override) {
    logger.warn(`Unknown FORGE_BACKEND "${override}", falling back to auto-detect`);
  }

  // 2. Claude Code (native Agent Teams)
  const claude = new ClaudeCodeBackend();
  if (await claude.isAvailable()) {
    logger.info("Detected Claude Code environment");
    return claude;
  }

  // 3. Codex CLI
  const codex = new CodexBackend();
  if (await codex.isAvailable()) {
    logger.info("Detected Codex CLI");
    return codex;
  }

  // 4. Gemini CLI
  const gemini = new GeminiBackend();
  if (await gemini.isAvailable()) {
    logger.info("Detected Gemini CLI");
    return gemini;
  }

  // 5. Fallback
  logger.info("No AI CLI detected, using default Node worker backend");
  return new NodeWorkerBackend();
}
