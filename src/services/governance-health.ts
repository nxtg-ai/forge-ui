/**
 * Governance Health Bridge (plugin-only / L1 mode)
 *
 * NEXUS: DIRECTIVE-NXTG-20260718-14 item 1.
 *
 * Health precedence, per `contracts/dx-journeys.md` ("UI health score matches
 * /forge:status output for the same project"):
 *
 *   1. orchestrator  — forge-orchestrator `forge_get_health` (L2/L3, canonical)
 *   2. governance    — forge-plugin governance-mcp `forge_get_governance_health`
 *                      (L1, plugin-only: the orchestrator binary is absent)
 *   3. estimate      — locally derived, MUST be labeled in the UI
 *
 * Tiers 1 and 2 are both canonical MCP surfaces and are never mixed: the score
 * shown is whichever tier answered, tagged via `source` so the UI can say which.
 *
 * Discovery, not hardcoding: forge-ui has no code dependency on forge-plugin
 * (MCP is the only integration layer), so the server is located by reading the
 * PROJECT's own `.mcp.json` — the same file Claude Code loads — and spawning
 * the declared command verbatim. A project with no governance server simply has
 * no tier 2, and health falls through to a labeled estimate.
 *
 * Server-side only: spawns a subprocess, so it is imported lazily by callers.
 */

import { reapChild } from "./orchestrator-health";

/** How long the governance server gets to answer before we give up. */
const MCP_TIMEOUT_MS = 5_000;

/** Health is re-fetched at most this often — each call spawns a subprocess. */
const CACHE_TTL_MS = 15_000;

export interface GovernanceMcpHealth {
  score: number;
  grade?: string;
}

interface CacheEntry {
  value: GovernanceMcpHealth | null;
  at: number;
}

const cache = new Map<string, CacheEntry>();

/**
 * In-flight calls, keyed by project root.
 *
 * Without this, concurrent callers arriving on a cold or expired entry each
 * spawn their own server — the exact fan-out defect the Codex wave-1 gate found
 * in the orchestrator bridge (20 concurrent callers, 20 spawns). The settled
 * cache alone only ever throttles SEQUENTIAL callers, and the dashboard's real
 * load shape is concurrent.
 */
const inflight = new Map<string, Promise<GovernanceMcpHealth | null>>();

interface McpServerSpec {
  command: string;
  args?: string[];
  /**
   * The server's declared environment.
   *
   * Part of the CONTRACT, not decoration: a spec routinely carries the only
   * configuration that makes the server address the right project. Dropping it
   * silently launches a DIFFERENT server than the one declared — it starts
   * fine and answers with defaults, which is why the omission survived tests
   * that happened to set the same variables in the parent process.
   * NEXUS: Codex re-gate 13 [P1].
   */
  env?: Record<string, string>;
}

/**
 * Expand `${VAR}` and `${VAR:-default}` against the inherited environment.
 *
 * Returns null when a placeholder has no value and no default — a spec we
 * cannot faithfully execute must make the tier unavailable rather than run a
 * half-configured server.
 */
function expandPlaceholders(
  value: string,
  env: NodeJS.ProcessEnv,
): string | null {
  let unresolved = false;

  const out = value.replace(
    /\$\{([A-Za-z_][A-Za-z0-9_]*)(?::-([^}]*))?\}/g,
    (_match, name: string, fallback?: string) => {
      const resolved = env[name];
      if (resolved !== undefined && resolved !== "") return resolved;
      if (fallback !== undefined) return fallback;
      unresolved = true;
      return "";
    },
  );

  return unresolved ? null : out;
}

/**
 * Locate the governance server declared by the project's `.mcp.json`.
 *
 * Matched by KEY (a name containing "governance"), deliberately not by probing
 * every declared server for the tool: `.mcp.json` routinely declares unrelated
 * servers (playwright, etc.), and spawning those to ask what they expose would
 * be an unacceptable side effect for a health read.
 */
async function findGovernanceServer(
  projectRoot: string,
): Promise<McpServerSpec | null> {
  let readFile: typeof import("node:fs/promises").readFile;
  let path: typeof import("node:path");
  try {
    ({ readFile } = await import("node:fs/promises"));
    path = await import("node:path");
  } catch {
    return null; // non-Node runtime
  }

  try {
    const raw = await readFile(
      path.join(projectRoot, ".mcp.json"),
      "utf-8",
    );
    const servers = JSON.parse(raw)?.mcpServers;
    if (!servers || typeof servers !== "object") return null;

    for (const [name, spec] of Object.entries(servers)) {
      if (!/governance/i.test(name)) continue;
      const s = spec as McpServerSpec;
      if (typeof s?.command !== "string" || !s.command) continue;

      const rawArgs = Array.isArray(s.args) ? s.args : [];
      const rawEnv =
        s.env && typeof s.env === "object" ? s.env : ({} as Record<string, string>);

      // Placeholders are expanded against the inherited environment rather
      // than rejected outright, so a spec written the way Claude Code writes
      // them is executed as declared. An UNRESOLVABLE placeholder still makes
      // the tier unavailable — running a half-configured server would answer
      // with defaults and look healthy.
      const command = expandPlaceholders(s.command, process.env);
      if (command === null) return null;

      const args: string[] = [];
      for (const arg of rawArgs) {
        const expanded = expandPlaceholders(String(arg), process.env);
        if (expanded === null) return null;
        args.push(expanded);
      }

      const env: Record<string, string> = {};
      for (const [key, value] of Object.entries(rawEnv)) {
        const expanded = expandPlaceholders(String(value), process.env);
        if (expanded === null) return null;
        env[key] = expanded;
      }

      return { command, args, env };
    }
  } catch {
    // No .mcp.json, unreadable, or malformed — no governance tier.
  }

  return null;
}

/** Extract the governance score from the tool's JSON-RPC response. */
function parseGovernanceHealth(stdout: string): GovernanceMcpHealth | null {
  for (const line of stdout.split("\n")) {
    if (!line.trim()) continue;
    try {
      const msg = JSON.parse(line);
      if (msg?.id !== 2 || !msg?.result) continue;

      const text = msg.result?.content?.[0]?.text;
      if (typeof text !== "string") return null;

      const payload = JSON.parse(text);
      const score = payload?.score;
      if (typeof score !== "number" || Number.isNaN(score)) return null;

      return {
        // Same normalization the orchestrator tier applies, so the two tiers
        // are comparable and neither can render a fractional or out-of-range
        // number the contract test would flag as drift.
        score: Math.round(Math.min(100, Math.max(0, score))),
        grade: typeof payload?.grade === "string" ? payload.grade : undefined,
      };
    } catch {
      // Partial or non-JSON line — keep scanning.
    }
  }
  return null;
}

async function callGovernanceTool(
  projectRoot: string,
): Promise<GovernanceMcpHealth | null> {
  const server = await findGovernanceServer(projectRoot);
  if (!server) return null;

  let spawn: typeof import("child_process").spawn;
  let appVersion: string;
  try {
    ({ spawn } = await import("child_process"));
    ({ appVersion } = await import("./app-version"));
  } catch {
    return null; // non-Node runtime
  }

  return new Promise((resolve) => {
    let child: ReturnType<typeof spawn>;

    try {
      child = spawn(server.command, server.args ?? [], {
        cwd: projectRoot,
        // The spec's env layers OVER the inherited environment: the server
        // still needs PATH and friends, but its declared configuration wins.
        env: { ...process.env, ...(server.env ?? {}) },
        stdio: ["pipe", "pipe", "ignore"],
      });
    } catch {
      return resolve(null);
    }

    let stdout = "";
    let settled = false;

    const finish = (value: GovernanceMcpHealth | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      // Answer now; guarantee the child dies in the background.
      void reapChild(child);
      resolve(value);
    };

    const timer = setTimeout(() => finish(null), MCP_TIMEOUT_MS);

    child.on("error", () => finish(null));
    child.on("close", () => finish(parseGovernanceHealth(stdout)));

    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
      const parsed = parseGovernanceHealth(stdout);
      if (parsed) finish(parsed);
    });

    const send = (msg: unknown) => {
      try {
        child.stdin?.write(JSON.stringify(msg) + "\n");
      } catch {
        finish(null);
      }
    };

    send({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "forge-ui", version: appVersion },
      },
    });
    send({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: { name: "forge_get_governance_health", arguments: {} },
    });

    try {
      child.stdin?.end();
    } catch {
      /* already closed — the close handler will settle */
    }
  });
}

/**
 * Governance health for a project, or null when no governance server is
 * reachable (in which case the caller falls through to a labeled estimate).
 */
export async function getGovernanceHealth(
  projectRoot: string,
): Promise<GovernanceMcpHealth | null> {
  const hit = cache.get(projectRoot);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;

  const running = inflight.get(projectRoot);
  if (running) return running;

  const call = callGovernanceTool(projectRoot)
    .then((value) => {
      cache.set(projectRoot, { value, at: Date.now() });
      return value;
    })
    .finally(() => {
      inflight.delete(projectRoot);
    });

  inflight.set(projectRoot, call);
  return call;
}

/** Test seam — drops memoized governance health so a fresh call re-spawns. */
export function clearGovernanceHealthCache(): void {
  cache.clear();
  inflight.clear();
}
