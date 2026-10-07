# Local client authentication

From v3.4.1, every `/api` route and every WebSocket upgrade (`/ws`, `/terminal`) requires this install's access token. That includes health and status routes, because they return project data. There is **no unauthenticated route** under `/api`, except `POST /api/auth/login` and `POST /api/auth/logout`.

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

WebSocket clients send the same header on the upgrade request. Browsers can't set headers on a WebSocket, so the dashboard uses a session cookie instead. Local tools should use the header.

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

`scripts/smoke-built-server.mjs` and `src/server/__tests__/security-auth.integration.test.ts` in this repo both follow this pattern.

### You talk to a server that's already running

Read the token from the file the server uses, and keep it in memory:

```bash
curl -s -H "Authorization: Bearer $(cat "${XDG_CONFIG_HOME:-$HOME/.config}/nxtg-forge/ui-secret")" \
  http://127.0.0.1:5051/api/health
```

```js
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const file = process.env.FORGE_UI_SECRET_FILE
  ?? join(process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config"), "nxtg-forge", "ui-secret");
const token = process.env.FORGE_UI_SECRET ?? readFileSync(file, "utf-8").trim();
```

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
