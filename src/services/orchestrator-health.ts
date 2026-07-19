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

/**
 * How long a child gets to honour SIGTERM before we escalate to SIGKILL.
 *
 * The orchestrator exits promptly on stdin close, so this grace period is for
 * the pathological case only: a build that ignores, blocks, or never receives
 * the signal. Without escalation such a child outlives the request.
 */
const REAP_GRACE_MS = 1_000;

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

/**
 * Calls that have been issued but have not settled yet, keyed by project root.
 *
 * The value cache alone only throttles SEQUENTIAL callers: concurrent readers
 * arriving on a cold or expired entry all miss the lookup and each spawn their
 * own subprocess. The dashboard's real load shape is concurrent (multiple
 * clients, parallel API requests), so coalescing in-flight work — not the TTL —
 * is what actually bounds process fan-out.
 */
const inflight = new Map<string, Promise<OrchestratorHealth | null>>();

/**
 * Reaps still running in the background, exposed for tests via
 * `awaitPendingReaps()`. A request answers as soon as it has a value; killing
 * the child is deliberately NOT on that path, so nothing here is awaited by
 * production code.
 */
const pendingReaps = new Set<Promise<void>>();

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
/**
 * Terminate a child and do not stop chasing it until it is actually gone.
 *
 * SIGTERM first, then SIGKILL if it has not closed within the grace period.
 * Resolves on `close`, which Node emits only after it has reaped the process,
 * so a resolved reap means the pid is genuinely released rather than a zombie.
 *
 * Runs in the background: the caller already has its answer, and making every
 * health request wait on process teardown would tax the common path to fix a
 * rare one.
 */
function reapChild(child: {
  exitCode: number | null;
  signalCode: NodeJS.Signals | null;
  once: (event: string, cb: () => void) => unknown;
  kill: (signal?: NodeJS.Signals) => unknown;
}): Promise<void> {
  const done = new Promise<void>((settleReap) => {
    // Already exited — nothing to chase.
    if (child.exitCode !== null || child.signalCode !== null) return settleReap();

    // Registered before the timers exist, so it clears whatever has been
    // scheduled by the time the child actually closes.
    const timers: ReturnType<typeof setTimeout>[] = [];

    child.once("close", () => {
      timers.forEach(clearTimeout);
      settleReap();
    });

    const signal = (sig: NodeJS.Signals) => {
      try {
        child.kill(sig);
      } catch {
        /* already gone — `close` has fired or will fire */
      }
    };

    signal("SIGTERM");

    const escalation = setTimeout(() => signal("SIGKILL"), REAP_GRACE_MS);
    // SIGKILL cannot be caught, so `close` is guaranteed to follow. This only
    // exists so a wedged handle can never leave the promise dangling forever.
    const backstop = setTimeout(() => settleReap(), REAP_GRACE_MS * 2);

    escalation.unref?.();
    backstop.unref?.();
    timers.push(escalation, backstop);
  });

  pendingReaps.add(done);
  void done.finally(() => pendingReaps.delete(done));
  return done;
}

async function callHealthTool(
  projectRoot: string,
): Promise<OrchestratorHealth | null> {
  let spawn: typeof import("child_process").spawn;
  // Loaded lazily alongside child_process, and for the same reason: app-version
  // resolves package.json through `node:module` at load time, so a static
  // import would break this module's "safe to import in a browser-like
  // environment" contract.
  let appVersion: string;
  try {
    ({ spawn } = await import("child_process"));
    ({ appVersion } = await import("./app-version"));
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
      // Answer now; guarantee the child dies in the background.
      void reapChild(child);
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
        clientInfo: { name: "forge-ui", version: appVersion },
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

  // A call for this root is already running — join it instead of spawning a
  // second orchestrator. This is what bounds fan-out under concurrent load.
  const existing = inflight.get(projectRoot);
  if (existing) return existing;

  const pending = callHealthTool(projectRoot)
    .then((value) => {
      cache.set(projectRoot, { value, at: Date.now() });
      return value;
    })
    .finally(() => {
      inflight.delete(projectRoot);
    });

  inflight.set(projectRoot, pending);
  return pending;
}

/**
 * Test seam — resolves once every background reap has finished, so a test can
 * assert the child is actually gone rather than assuming it.
 */
export async function awaitPendingReaps(): Promise<void> {
  await Promise.all([...pendingReaps]);
}

/** Test seam — drops memoized health so a fresh call re-spawns. */
export function clearOrchestratorHealthCache(): void {
  cache.clear();
  inflight.clear();
}
