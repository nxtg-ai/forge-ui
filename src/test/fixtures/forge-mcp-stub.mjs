#!/usr/bin/env node
/**
 * Stand-in for the `forge` binary's stdio MCP server.
 *
 * Lets orchestrator-health tests drive the REAL spawn + JSON-RPC parse path
 * without mocking child_process. Behavior is selected by FORGE_STUB_MODE:
 *
 *   ok         — well-formed result carrying a 95 health score
 *   high / low / fractional — out-of-range or fractional scores (clamp/round)
 *   no-score   — valid envelope, missing health_score
 *   garbage    — non-JSON output
 *   exit       — non-zero exit, no output
 *   counted    — increments FORGE_STUB_COUNTER and reports the count as the
 *                score, so a caller can prove how many times it was spawned
 *   stubborn   — answers, writes its pid to FORGE_STUB_PIDFILE, then IGNORES
 *                SIGTERM and stays alive, so a caller can prove the bridge
 *                escalates to SIGKILL instead of leaking the process
 */

import { appendFileSync, readFileSync, writeFileSync } from "node:fs";

const mode = process.env.FORGE_STUB_MODE || "ok";

if (mode === "exit") process.exit(3);

if (mode === "garbage") {
  process.stdout.write("this is not json\n");
  process.exit(0);
}

const payloads = {
  ok: {
    health_score: 95,
    summary: "Health: 95/100 | 0 critical, 1 warnings, 7 info",
    findings: [
      {
        category: "documentation",
        severity: "warning",
        message: "No SPEC.md found",
        suggestion: "Create SPEC.md",
      },
    ],
    drift: null,
  },
  high: { health_score: 142.6 },
  low: { health_score: -8 },
  fractional: { health_score: 87.4 },
  "no-score": { summary: "nothing here" },
};

let payload = payloads[mode];

if (mode === "stubborn") {
  writeFileSync(process.env.FORGE_STUB_PIDFILE, String(process.pid));
  // Refuse to die politely. Only SIGKILL can end this process.
  process.on("SIGTERM", () => {});
  // Keep the event loop alive after stdin closes.
  setInterval(() => {}, 1_000);
  payload = { health_score: 50 };
}

if (mode === "counted") {
  const counter = process.env.FORGE_STUB_COUNTER;
  appendFileSync(counter, "x");
  payload = { health_score: readFileSync(counter, "utf-8").length };
}

process.stdout.write(
  JSON.stringify({
    jsonrpc: "2.0",
    id: 2,
    result: { content: [{ type: "text", text: JSON.stringify(payload) }] },
  }) + "\n",
);
