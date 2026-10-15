#!/usr/bin/env node
/**
 * Infinity Terminal browser round trip. NEXUS: DIRECTIVE-NXTG-20261014-15 item 1.
 *
 * The terminal shipped broken for every new browser session (v3.4.1, v3.5.0)
 * because no gate ever opened it in a browser. This one does, in CI:
 *
 *   1. starts the dev stack (UI :5050, API :5051) in its own process group,
 *      with a scratch HOME and secret file, so no real install is touched;
 *   2. signs in through a one-time link (print-login-link.ts);
 *   3. opens the Infinity Terminal, types `echo FORGE_E2E_$((6*7))` and
 *      requires the shell's output, FORGE_E2E_42, in the terminal. The input
 *      text does not contain "42", so only a real round trip can pass;
 *   4. fails on any console or page error.
 *
 * Exit 0 = PASS. Prints a JSON summary; never prints the sign-in link.
 * Playwright comes from devDependencies (override with PLAYWRIGHT_MODULE).
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");

const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "forge-terminal-e2e-"));
const home = path.join(scratch, "home");
fs.mkdirSync(home);
const env = { ...process.env, HOME: home, FORGE_UI_SECRET_FILE: path.join(scratch, "ui-secret") };
const logFile = process.env.E2E_LOG || path.join(scratch, "dev.log");
const log = fs.openSync(logFile, "a");
const report = { signed_in: false, terminal_opened: false, terminal_roundtrip: false, console_errors: [], page_errors: [] };

// A busy port would make the test drive some other server, so refuse to start.
for (const port of [5050, 5051]) {
  if (await portOpen(port)) {
    console.log(JSON.stringify({ pass: false, error: `port ${port} is already in use; stop that server first` }));
    process.exit(1);
  }
}

const stack = spawn("npm", ["run", "dev"], { cwd: ROOT, env, detached: true, stdio: ["ignore", log, log] });
// Ctrl-C or a CI cancel must not leave the dev stack running.
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    stopStack();
    process.exit(130);
  });
}

function portOpen(port) {
  return new Promise((resolve) => {
    const socket = net.connect(port, "127.0.0.1");
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
  });
}

async function waitFor(check, timeoutMs, what) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await check()) return;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`timed out waiting for ${what}`);
}

function signInLink() {
  return new Promise((resolve, reject) => {
    const child = spawn("npx", ["tsx", "src/server/auth/print-login-link.ts"], { cwd: ROOT, env, stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    child.stdout.on("data", (d) => {
      out += d;
    });
    child.stderr.on("data", (d) => fs.writeSync(log, d));
    child.on("close", (code) => {
      const link = out.match(/https?:\/\/\S+/g)?.pop();
      if (code === 0 && link) resolve(link);
      else reject(new Error(`print-login-link exited ${code} without a link`));
    });
  });
}

function stopStack() {
  try {
    process.kill(-stack.pid, "SIGTERM");
  } catch {
    // already gone
  }
}

let exitCode = 1;
let browser;
try {
  await waitFor(async () => (await portOpen(5050)) && (await portOpen(5051)), 180_000, "the dev stack on 5050 and 5051");
  // The API answers 401 to an unauthenticated health check once it is ready.
  await waitFor(
    async () => (await fetch("http://127.0.0.1:5051/api/health").catch(() => null))?.status === 401,
    60_000,
    "the API",
  );
  const link = await signInLink();

  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on("console", (m) => {
    if (m.type() === "error") report.console_errors.push(m.text().slice(0, 300));
  });
  page.on("pageerror", (e) => report.page_errors.push(String(e).slice(0, 300)));

  await page.goto(link);
  await page.getByTestId("app-header").waitFor({ timeout: 30_000 });
  report.signed_in = true;

  await page.getByTestId("app-nav-btn-infinity-terminal").first().click();
  const term = page.locator(".xterm").first();
  await term.waitFor({ timeout: 30_000 });
  report.terminal_opened = true;

  // Wait for the shell itself: terminal text beyond the client's own
  // "Connecting" line means the PTY is sending output.
  const rows = () => page.evaluate(() => document.querySelector(".xterm-rows")?.textContent || "");
  await waitFor(
    async () => (await rows()).replace(/connecting[^\n]*/gi, "").replace(/\s+/g, "").length > 0,
    30_000,
    "shell output in the terminal",
  );
  await new Promise((r) => setTimeout(r, 1000));
  await term.click();
  await page.keyboard.type("echo FORGE_E2E_$((6*7))\n", { delay: 20 });
  await waitFor(async () => (await rows()).includes("FORGE_E2E_42"), 30_000, "the echo");
  report.terminal_roundtrip = true;
} catch (error) {
  report.error = String(error?.message || error).slice(0, 300);
} finally {
  if (browser) await browser.close();
  stopStack();
  await new Promise((r) => setTimeout(r, 2000));
  try {
    process.kill(-stack.pid, "SIGKILL");
  } catch {
    // already gone
  }
  if (!process.env.E2E_LOG) fs.rmSync(scratch, { recursive: true, force: true });
}

if (report.terminal_roundtrip && report.console_errors.length === 0 && report.page_errors.length === 0) exitCode = 0;
console.log(JSON.stringify({ pass: exitCode === 0, ...report }));
process.exit(exitCode);
