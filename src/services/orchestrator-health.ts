/**
 * Orchestrator Health Bridge
 *
 * Sources the CANONICAL project health score from forge-orchestrator's
 * `forge_get_health` MCP tool, so the dashboard consumes the same number the
 * orchestrator computes instead of fabricating its own.
 *
 * Contract: contracts/dx-journeys.md — "UI health score matches /forge:status
 * output for the same project". Satisfies DIRECTIVE-NXTG-20260718-02 item 2.
 *
 * Integration boundary: MCP only. This spawns the `forge` binary as a stdio
 * JSON-RPC 2.0 subprocess — there is NO code dependency on forge-orchestrator,
 * per the workspace no-cross-repo-dependency rule.
 *
 * Server-side only: uses child_process and must never be bundled into the
 * browser build.
 */

/**
 * `child_process` is imported lazily inside the call path so that merely
 * importing this module (or status-service, which re-exports through it) stays
 * safe in a browser-like test environment. Only an actual health call touches
 * Node APIs.
 */

/** How long to wait for the orchestrator to answer before giving up. */
const MCP_TIMEOUT_MS = 5_000;

/** Health is re-fetched at most this often — each call spawns a subprocess. */
const CACHE_TTL_MS = 15_000;

export interface OrchestratorFinding {
  category: string;
  severity: string;
  message: string;
  suggestion: string | null;
}

export interface OrchestratorHealth {
  score: number;
  summary: string;
  findings: OrchestratorFinding[];
  drift: {
    vision_alignment?: number;
    explanation?: string;
    completed_tasks?: number;
    total_tasks?: number;
  } | null;
}

interface CacheEntry {
  value: OrchestratorHealth | null;
  at: number;
}

const cache = new Map<string, CacheEntry>();

/** Binary is overridable so a project can pin a specific orchestrator build. */
function forgeBinary(): string {
  return process.env.FORGE_BIN || "forge";
}

/**
 * Run a single `tools/call` against the orchestrator's stdio MCP server.
 *
 * Resolves null on ANY failure (binary missing, non-zero exit, timeout,
 * malformed response) — health is a display concern and must degrade to the
 * local estimate rather than break the dashboard.
 */
async function callHealthTool(
  projectRoot: string,
): Promise<OrchestratorHealth | null> {
  let spawn: typeof import("child_process").spawn;
  try {
    ({ spawn } = await import("child_process"));
  } catch {
    return null; // non-Node runtime — no orchestrator reachable
  }

  return new Promise((resolve) => {
    let child: ReturnType<typeof spawn>;

    try {
      child = spawn(forgeBinary(), ["mcp", "--project", projectRoot], {
        stdio: ["pipe", "pipe", "ignore"],
      });
    } catch {
      return resolve(null);
    }

    let stdout = "";
    let settled = false;

    const finish = (value: OrchestratorHealth | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.kill();
      resolve(value);
    };

    const timer = setTimeout(() => finish(null), MCP_TIMEOUT_MS);

    child.on("error", () => finish(null));
    child.on("close", () => finish(parseHealth(stdout)));

    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
      // Answer as soon as the response for id 2 has arrived, rather than
      // waiting for the server to exit on stdin close.
      const parsed = parseHealth(stdout);
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
        clientInfo: { name: "forge-ui", version: "3.3.1" },
      },
    });
    send({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: { name: "forge_get_health", arguments: {} },
    });

    try {
      child.stdin?.end();
    } catch {
      /* stdin already closed — the close handler will settle */
    }
  });
}

/** Pull the id-2 tool result out of a partial JSON-RPC line stream. */
function parseHealth(stdout: string): OrchestratorHealth | null {
  for (const line of stdout.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let envelope: {
      id?: number;
      result?: { content?: { text?: string }[] };
    };
    try {
      envelope = JSON.parse(trimmed);
    } catch {
      continue; // partial line — more data may still arrive
    }
    if (envelope.id !== 2) continue;

    const text = envelope.result?.content?.[0]?.text;
    if (!text) return null;

    try {
      const payload = JSON.parse(text) as {
        health_score?: number;
        summary?: string;
        findings?: OrchestratorFinding[];
        drift?: OrchestratorHealth["drift"];
      };
      if (typeof payload.health_score !== "number") return null;

      return {
        score: Math.max(0, Math.min(100, Math.round(payload.health_score))),
        summary: payload.summary ?? "",
        findings: payload.findings ?? [],
        drift: payload.drift ?? null,
      };
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Canonical health for a project, or null when the orchestrator is
 * unavailable (not installed, not a forge project, timed out).
 */
export async function getOrchestratorHealth(
  projectRoot: string,
): Promise<OrchestratorHealth | null> {
  const hit = cache.get(projectRoot);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return hit.value;
  }

  const value = await callHealthTool(projectRoot);
  cache.set(projectRoot, { value, at: Date.now() });
  return value;
}

/** Test seam — drops memoized health so a fresh call re-spawns. */
export function clearOrchestratorHealthCache(): void {
  cache.clear();
}
