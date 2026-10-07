# Local client authentication

From v3.4.1, every `/api` route and every WebSocket upgrade (`/ws`, `/terminal`) requires this install's access token. That includes health and status routes, because they return project data. The only unauthenticated routes under `/api` are login, logout and one-time-code redemption, each mounted twice: `POST /api/auth/login`, `POST /api/login`, `POST /api/auth/logout`, `POST /api/logout`, `POST /api/auth/redeem` and `POST /api/redeem`.

This page is for **local tools**: test harnesses, scripts, MCP servers and CI jobs that call the forge-ui API directly.

## 1. Where the token comes from

The server resolves the token at startup, in this order:

| Source | When to use it |
|---|---|
| `FORGE_UI_SECRET` env var (at least 32 characters) | **You start the server yourself** (harness, CI, smoke test). Generate a random value and pass it to the child process. |
| `FORGE_UI_SECRET_FILE` env var (a path) | You want the token in a specific file. |
| `$XDG_CONFIG_HOME/nxtg-forge/ui-secret`, else `~/.config/nxtg-forge/ui-secret` | Default. Created on first run with mode `0600` (directory `0700`) and reused after that. |

The server never logs the token. Its startup line names the **source** (`FORGE_UI_SECRET` or the file path), never the value.

## 2. How to send it

Use either header on every request:

```
Authorization: Bearer <token>
X-Forge-Token: <token>
```

WebSocket clients send the same header on the upgrade request. That needs a client that can set upgrade headers, such as the `ws` package this repo's tests use; Node's built-in `WebSocket` and browsers can't. The dashboard therefore uses a session cookie instead.

## 3. Recipes

### You spawn the server (harness, CI)

Generate the token in-process and pass it through the environment. Don't print it, don't write it to fixtures, and don't put it on a command line (argv is visible in `ps`).

```js
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";

const token = randomBytes(32).toString("hex"); // stays in memory
const child = spawn("node", ["--import", tsxLoader, "src/server/api-server.ts"], {
  env: { ...process.env, PORT: String(port), FORGE_UI_SECRET: token },
});

const auth = { Authorization: `Bearer ${token}` };
// Readiness: an authenticated 200, not just "something answered".
const res = await fetch(`http://127.0.0.1:${port}/api/health`, { headers: auth });
```

If the harness isolates `HOME`, pass `FORGE_UI_SECRET` explicitly anyway. An inherited `XDG_CONFIG_HOME` would otherwise point the server at the developer's real token file.

In this repo, `scripts/smoke-built-server.mjs` uses `FORGE_UI_SECRET`. `src/server/__tests__/security-auth.integration.test.ts` uses `FORGE_UI_SECRET_FILE` (a temp path) and reads the token back from that file.

### You talk to a server that's already running

Read the token from the file the server uses, and keep it in memory. With curl, pass the header on stdin (`-K -`) so the token isn't on curl's command line:

```bash
f="${XDG_CONFIG_HOME:-$HOME/.config}/nxtg-forge/ui-secret"
printf 'header = "Authorization: Bearer %s"\n' "$(cat "$f")" | curl -s -K - http://127.0.0.1:5051/api/health
```

```js
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const file = process.env.FORGE_UI_SECRET_FILE
  ?? join(process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config"), "nxtg-forge", "ui-secret");
const token = process.env.FORGE_UI_SECRET ?? readFileSync(file, "utf-8").trim();
```

### You drive a browser from an agent (Playwright MCP, automation)

An agent that drives a browser through tool calls (`browser_navigate`, `browser_type`, …) has every value it passes recorded in its transcript. So never navigate to a `?forge_token=` link and never type the token: both put the token into a tool call. Use a **one-time sign-in link** instead. It is on `main` after v3.4.1 and ships in the next release:

1. On the machine running Forge, mint a link. The script reads the token from its file (or `FORGE_UI_SECRET`), sends it only in a request header to the running server, and prints a link carrying a one-time code, never the token:

   ```bash
   npx tsx src/server/auth/print-login-link.ts      # or: node dist/server/auth/print-login-link.js
   # http://localhost:5050/?forge_login_code=<64 hex>
   ```

   `FORGE_UI_API_URL` (default `http://127.0.0.1:5051`) and `FORGE_UI_URL` (default `http://localhost:5050`) point it at other ports.

2. Navigate the browser to that link (`browser_navigate`). The sign-in screen redeems the code for the normal session cookie and removes it from the address bar. The session then behaves like any signed-in browser.

The code is random, **single-use** and **expires after 60 seconds**. A copy left in a transcript or in browser history is already spent or stale, and it is not the token. Minting requires the token (`POST /api/auth/login-code` sits behind the normal gate); redeeming a used, expired or made-up code returns `401`, and a foreign `Origin` gets `403`. At most 8 unexpired codes can be outstanding (`429` beyond that).

`src/test/e2e/automated-sign-in.e2e.mjs` checks this path with a real headless browser: it signs in, requires the app header, and fails if the token appears in any navigated URL, any process's argv or the server's output. Run with `MODE=token` as a negative control, and it catches the token in the URL history.

## 4. What to expect

| Request | Response |
|---|---|
| No token | `401` `{"success":false,"error":"Authentication required","timestamp":…}` |
| Wrong token | `401` |
| `Origin` header not in `ALLOWED_ORIGINS` (even with a valid token) | `403` `{"success":false,"error":"Origin not allowed","timestamp":…}` |
| Valid token, no `Origin` header (normal for Node `fetch`, curl) | the route's normal response |
| WebSocket upgrade without a token | HTTP `401` on the upgrade, before any socket opens |

A probe that treats "any HTTP response" as "up" sees a 401 and thinks the server is ready. Probe with the token and require a `200`.

## 5. Network

The server listens on `127.0.0.1` unless `FORGE_UI_HOST` is set. Local tools should call `http://127.0.0.1:<port>`. `localhost` can resolve to `::1` first, and the server doesn't listen there.
