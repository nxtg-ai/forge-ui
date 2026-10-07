/**
 * Print a ONE-TIME dashboard sign-in link for an automated browser session.
 *
 *   npx tsx src/server/auth/print-login-link.ts      (source checkout)
 *   node dist/server/auth/print-login-link.js        (built / release archive)
 *
 * NEXUS: DIRECTIVE-NXTG-20261007-15. The access token is read here (env or the
 * 0600 file) and sent only in a request header to the RUNNING server, which
 * returns a single-use code that expires in 60 s. Only that code is printed,
 * so it is the only thing a transcript, a URL or browser history can hold.
 * Use print-auth-url.ts only for a human opening the dashboard by hand.
 */

import * as fs from "fs";
import { getSecretFilePath } from "./ui-auth";

function readToken(): string {
  if (process.env.FORGE_UI_SECRET) return process.env.FORGE_UI_SECRET;
  const file = getSecretFilePath();
  if (!fs.existsSync(file)) {
    throw new Error(`No access token at ${file}. Start the forge-ui server once to create it.`);
  }
  return fs.readFileSync(file, "utf-8").trim();
}

async function main(): Promise<void> {
  const api = process.env.FORGE_UI_API_URL || "http://127.0.0.1:5051";
  const ui = process.env.FORGE_UI_URL || "http://localhost:5050";

  const res = await fetch(`${api}/api/auth/login-code`, {
    method: "POST",
    headers: { Authorization: `Bearer ${readToken()}` },
  });
  if (!res.ok) {
    throw new Error(`Could not mint a sign-in code: HTTP ${res.status} from ${api}`);
  }
  const body = (await res.json()) as { data?: { code?: string; expiresIn?: number } };
  const code = body.data?.code;
  if (!code) throw new Error("The server returned no sign-in code");

  const url = new URL(ui);
  url.searchParams.set("forge_login_code", code);
  process.stdout.write(`${url.toString()}\n`);
  process.stderr.write(`one-time link: single use, expires in ${Math.round((body.data?.expiresIn ?? 0) / 1000)}s\n`);
}

main().catch((error: unknown) => {
  // The message never includes the token: only paths, URLs and status codes.
  process.stderr.write(`print-login-link: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
