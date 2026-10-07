#!/usr/bin/env node
/**
 * Automated-browser sign-in with zero token exposure (DIRECTIVE-NXTG-20261007-15).
 *
 * Drives a real headless Chromium to the dashboard and requires the app header,
 * then checks that the access token appears in none of the recorded channels:
 * any URL the browser navigated to, any process's argv (/proc/<pid>/cmdline),
 * the server's output, or this script's stdout.
 *
 *   MODE=code   (default) sign in through print-login-link.ts. Must PASS.
 *   MODE=token  negative control: sign in through the ?forge_token= link.
 *               The detector must catch the token in the URL history (exit 1).
 *
 * Needs: a running forge-ui (API + Vite UI), the API's token file in
 * FORGE_UI_SECRET_FILE, SERVER_LOG pointing at the API server's output, and
 * Playwright from outside this repo: PLAYWRIGHT_MODULE=/path/to/node_modules/playwright.
 */
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const MODE = process.env.MODE || "code";
const UI = process.env.FORGE_UI_URL || "http://localhost:5050";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

const token = readFileSync(process.env.FORGE_UI_SECRET_FILE, "utf-8").trim();

function loginLink() {
  if (MODE === "token") {
    const url = new URL(UI);
    url.searchParams.set("forge_token", token); // the recorded channel under test
    return Promise.resolve(url.toString());
  }
  return new Promise((resolve, reject) => {
    const cli = spawn("npx", ["tsx", path.join(REPO_ROOT, "src/server/auth/print-login-link.ts")], {
      cwd: REPO_ROOT,
      env: { ...process.env, FORGE_UI_SECRET: "" },
      stdio: ["ignore", "pipe", "inherit"],
    });
    let out = "";
    cli.stdout.on("data", (d) => (out += d));
    cli.on("close", (code) => (code === 0 ? resolve(out.trim()) : reject(new Error(`print-login-link exited ${code}`))));
  });
}

function argvHolders() {
  const hits = [];
  for (const pid of readdirSync("/proc").filter((d) => /^\d+$/.test(d))) {
    try {
      if (readFileSync(`/proc/${pid}/cmdline`, "utf-8").includes(token)) hits.push(pid);
    } catch {
      // process exited or is not readable: nothing to check
    }
  }
  return hits;
}

const link = await loginLink();
const navigated = [];
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.on("framenavigated", (frame) => {
  if (frame === page.mainFrame()) navigated.push(frame.url());
});
await page.goto(link);
let signedIn = true;
try {
  await page.getByTestId("app-header").waitFor({ timeout: 30_000 });
} catch {
  signedIn = false;
}
const finalUrl = page.url();
const argvDuringSession = argvHolders();
await browser.close();

const serverLog = process.env.SERVER_LOG ? readFileSync(process.env.SERVER_LOG, "utf-8") : "";
const exposures = {
  urlHistory: [link, ...navigated, finalUrl].some((u) => u.includes(token)),
  argv: argvDuringSession.length > 0,
  serverOutput: serverLog.includes(token),
};

console.log(`mode=${MODE} signedIn=${signedIn} navigations=${navigated.length} finalUrlHasParams=${new URL(finalUrl).search !== ""}`);
console.log(`token exposure: urlHistory=${exposures.urlHistory} argv=${exposures.argv} serverOutput=${exposures.serverOutput}`);
const exposed = Object.values(exposures).some(Boolean);
console.log(signedIn && !exposed ? "PASS" : "FAIL");
process.exit(signedIn && !exposed ? 0 : 1);
