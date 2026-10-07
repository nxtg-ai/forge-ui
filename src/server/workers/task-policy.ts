/**
 * Worker task policy — what an HTTP-submitted task may execute.
 *
 * NEXUS: DIRECTIVE-NXTG-20261007-10 (GHSA-rc7c-r55p-923j).
 *
 * The worker spawns `task.command` directly, so the request body must not be
 * able to choose an arbitrary program. Rules:
 *   - "claude-code" / "agent" tasks: `command` is a PROMPT, passed as an
 *     argument to the `claude` CLI (argument array, no shell).
 *   - "shell" / "script" tasks: `command` must be one of the agent CLIs below,
 *     by bare name.
 *   - `env` is not accepted over HTTP (NODE_OPTIONS, PATH, BASH_ENV etc. would
 *     re-open execution through an allow-listed binary).
 *
 * The worker process re-checks the final command with assertSpawnAllowed(),
 * so a task that reaches it some other way is held to the same list.
 */

import type { TaskType } from "./types";

export const ALLOWED_TASK_TYPES: readonly TaskType[] = ["claude-code", "agent", "shell", "script"];
export const ALLOWED_WORKER_COMMANDS: readonly string[] = ["claude", "codex", "gemini"];

export type TaskPolicyResult = { ok: true } | { ok: false; error: string };

export function isAllowedWorkerCommand(command: unknown): boolean {
  return typeof command === "string" && ALLOWED_WORKER_COMMANDS.includes(command);
}

export function validateHttpTask(body: {
  type?: unknown;
  command?: unknown;
  args?: unknown;
  env?: unknown;
}): TaskPolicyResult {
  const { type, command, args, env } = body;

  if (typeof type !== "string" || !ALLOWED_TASK_TYPES.includes(type as TaskType)) {
    return { ok: false, error: `type must be one of: ${ALLOWED_TASK_TYPES.join(", ")}` };
  }
  if (typeof command !== "string" || command.length === 0) {
    return { ok: false, error: "command is required" };
  }
  if (args !== undefined && (!Array.isArray(args) || !args.every((a) => typeof a === "string"))) {
    return { ok: false, error: "args must be an array of strings" };
  }
  if (env !== undefined && env !== null && (typeof env !== "object" || Object.keys(env).length > 0)) {
    return { ok: false, error: "env is not accepted for tasks submitted over HTTP" };
  }
  if ((type === "shell" || type === "script") && !isAllowedWorkerCommand(command)) {
    return {
      ok: false,
      error: `command for ${type} tasks must be one of: ${ALLOWED_WORKER_COMMANDS.join(", ")}`,
    };
  }
  return { ok: true };
}

/** Defense in depth for the worker process: refuse to spawn anything off the list. */
export function assertSpawnAllowed(command: string): void {
  if (!isAllowedWorkerCommand(command)) {
    throw new Error(`Refusing to spawn "${command}": not in the worker command allowlist`);
  }
}
