#!/usr/bin/env node
/**
 * Stand-in for forge-plugin's governance-mcp stdio server.
 *
 * Lets the health-contract tests drive the REAL spawn + JSON-RPC path for the
 * plugin-only (L1) tier without mocking child_process, mirroring
 * forge-mcp-stub.mjs. Behavior is selected by FORGE_GOV_STUB_MODE:
 *
 *   ok         — `{score, grade}` (score from FORGE_GOV_STUB_SCORE, default 72)
 *   no-score   — valid envelope, missing `score`
 *   garbage    — non-JSON output
 *   exit       — non-zero exit, no output
 */

const mode = process.env.FORGE_GOV_STUB_MODE || "ok";

if (mode === "exit") process.exit(3);

if (mode === "garbage") {
  process.stdout.write("this is not json\n");
  process.exit(0);
}

const score = Number(process.env.FORGE_GOV_STUB_SCORE ?? 72);

const payload =
  mode === "no-score"
    ? { grade: "B", checks: [] }
    : { score, grade: "B", checks: [{ name: "governance", status: "ok" }] };

process.stdout.write(
  JSON.stringify({
    jsonrpc: "2.0",
    id: 2,
    result: { content: [{ type: "text", text: JSON.stringify(payload) }] },
  }) + "\n",
);
