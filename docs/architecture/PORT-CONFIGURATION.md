# Ports

forge-ui uses two ports on the machine that runs it.

| Port | Service | Set in | Default bind |
|---|---|---|---|
| 5050 | Vite dev server (the dashboard) | `vite.config.ts` (`server.port: 5050`, `strictPort: true`) | `127.0.0.1` |
| 5051 | API server, `/ws` and `/terminal` (`src/server/api-server.ts`) | `PORT`, default 5051 | `127.0.0.1` |

The browser talks only to 5050. Vite proxies `/api`, `/ws` and `/terminal` to `127.0.0.1:5051` (`vite.config.ts`, `server.proxy`), so client code uses relative URLs.

`strictPort` means the dev server stops with an error if 5050 is taken, instead of moving to another port.

## Opening the dashboard from another device

Both servers bind to `FORGE_UI_HOST`, default `127.0.0.1`. To reach the dashboard from another device on your network:

```bash
FORGE_UI_HOST=0.0.0.0 \
ALLOWED_ORIGINS=http://localhost:5050,http://127.0.0.1:5050,http://192.0.2.10:5050 \
npm run dev
```

- The API prints a warning when it binds beyond loopback.
- `ALLOWED_ORIGINS` replaces the default list (the 5050 and 5051 origins on `localhost` and `127.0.0.1`). Include every origin you will open the dashboard from. Requests from other origins get 403.
- Every request still needs the access token; see [LOCAL-CLIENT-AUTH.md](../api/LOCAL-CLIENT-AUTH.md).

## Changing the ports

- **API port:** set `PORT`, and change the three proxy targets in `vite.config.ts` to match. They are hard-coded to `127.0.0.1:5051`.
- **Dashboard port:** change `server.port` in `vite.config.ts`.
- **Allowed origins:** after changing either port, set `ALLOWED_ORIGINS` to the new origins. The defaults only cover 5050 and 5051.

## Checking what is running

```bash
ss -tlnp | grep -E ':(5050|5051)'
```

On WSL2 with mirrored networking, a Windows `netsh interface portproxy` rule can hold a port while `ss` inside WSL shows it free. If the dev server reports the port in use, check `netsh interface portproxy show all` on Windows.
