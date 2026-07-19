#!/usr/bin/env node
/**
 * Build-artifact smoke gate — boot the SHIPPED server and prove it serves.
 *
 * NEXUS: DIRECTIVE-NXTG-20260718-15 item 2.
 *
 * `tsc` exiting 0 says the code type-checks. It says nothing about whether the
 * emitted artifact can boot: `npm start` died on ERR_MODULE_NOT_FOUND and
 * shipped that way in v3.3.2, because every gate we had tested SOURCE (via tsx)
 * and none tested the ARTIFACT. This gate closes that class structurally —
 * deploy-truth applied to our own build.
 *
 * It runs the real `node dist/server/api-server.js` on an ephemeral port and
 * requires a shaped `/api/forge/status`, then tears the process down. A 200 with
 * the wrong shape fails, so it cannot pass while testing nothing.
 */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { createServer } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const ENTRY = path.join(ROOT, "dist", "server", "api-server.js");

const BOOT_TIMEOUT_MS = 60_000;
const POLL_INTERVAL_MS = 500;

const fail = (msg) => {
  console.error(`smoke-built-server: FAIL — ${msg}`);
  process.exit(1);
};

/** An ephemeral port, so the gate never collides with a live dashboard. */
function freePort() {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.once("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

/** SIGTERM, then SIGKILL — never leave an orphan holding the port. */
function shutdown(child) {
  return new Promise((resolve) => {
    if (child.exitCode !== null || child.signalCode !== null) return resolve();
    const kill = setTimeout(() => child.kill("SIGKILL"), 3_000);
    child.once("close", () => {
      clearTimeout(kill);
      resolve();
    });
    child.kill("SIGTERM");
  });
}

async function main() {
  if (!existsSync(ENTRY)) {
    fail(`built server not found at ${path.relative(ROOT, ENTRY)} — run \`npm run build:server\` first`);
  }

  const port = await freePort();
  const child = spawn(process.execPath, [ENTRY], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(port), NODE_ENV: "production" },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stderr = "";
  child.stderr?.on("data", (c) => (stderr += c.toString()));
  child.stdout?.on("data", () => {});

  let exitedEarly = null;
  child.once("exit", (code) => {
    exitedEarly = code;
  });

  const deadline = Date.now() + BOOT_TIMEOUT_MS;
  let payload = null;

  while (Date.now() < deadline) {
    if (exitedEarly !== null) {
      // The precise failure this gate exists to catch: the artifact cannot even
      // start. Surface the loader error rather than a bare timeout.
      fail(
        `built server exited (code ${exitedEarly}) before serving.\n${stderr.trim().slice(0, 800)}`,
      );
    }

    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/forge/status`);
      if (res.ok) {
        payload = await res.json();
        break;
      }
    } catch {
      // Not listening yet — keep polling until the deadline.
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  if (!payload) {
    await shutdown(child);
    fail(
      `no shaped response from /api/forge/status within ${BOOT_TIMEOUT_MS}ms.\n${stderr.trim().slice(0, 800)}`,
    );
  }

  // Shape assertions — a 200 carrying the wrong body must not pass.
  const problems = [];
  const data = payload?.data;

  if (payload?.success !== true) problems.push("payload.success is not true");
  if (!data || typeof data !== "object") problems.push("payload.data missing");
  if (typeof data?.project?.name !== "string") problems.push("data.project.name is not a string");
  if (typeof data?.health?.score !== "number") problems.push("data.health.score is not a number");
  if (!["orchestrator", "governance", "estimate"].includes(data?.health?.source)) {
    problems.push(`data.health.source invalid: ${JSON.stringify(data?.health?.source)}`);
  }

  await shutdown(child);

  if (problems.length > 0) fail(`shaped-payload check failed:\n  ${problems.join("\n  ")}`);

  console.log(
    `smoke-built-server: PASS — artifact booted on :${port}, ` +
      `project="${data.project.name}" health=${data.health.score} source=${data.health.source}`,
  );
}

main().catch((error) => {
  console.error("smoke-built-server: FAIL —", error);
  process.exit(1);
});
