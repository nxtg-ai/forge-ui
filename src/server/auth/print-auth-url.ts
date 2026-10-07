/**
 * Print the dashboard sign-in link for this install.
 *
 *   npx tsx src/server/auth/print-auth-url.ts      (source checkout)
 *   node dist/server/auth/print-auth-url.js        (built / release archive)
 *
 * This is the one place the secret is written out, and only to the terminal
 * of the user who ran it. The server never logs it.
 */

import { loadOrCreateSecret } from "./ui-auth";

const base = process.env.FORGE_UI_URL || "http://localhost:5050";
const url = new URL(base);
url.searchParams.set("forge_token", loadOrCreateSecret());
process.stdout.write(`${url.toString()}\n`);
