# Commands

## Forge slash commands

The Forge slash commands (`/frg-*`) and agents ship in [forge-plugin](https://github.com/nxtg-ai/forge-plugin), not in this repo. See that repo for the current list.

The dashboard's command center runs a fixed set of these from the browser (`src/server/routes/commands.ts`): project status, tests (`npx vitest run`), a deploy pre-flight (`npx tsc --noEmit`, then `npx vite build`), and a gap analysis. `GET /api/commands` lists them.

## npm scripts

From `package.json`:

| Script | What it runs |
|---|---|
| `npm run dev` | `scripts/dev-start.sh`: the API server (5051) and the Vite dev server (5050) |
| `npm run build` | `tsc --noEmit && vite build` |
| `npm run build:server` | Compiles the server (`tsconfig.server.json`) |
| `npm start` | `node dist/server/api-server.js` (after `npm run build:server`) |
| `npm test` | `vitest` |
| `npm run test:coverage` | `vitest run --coverage`, with the 80% thresholds |
| `npm run test:integration` / `test:security` / `test:quality` | Subsets of the suite |
| `npm run lint` | `eslint src` |
| `npm run format` | `prettier --write` on `src/**/*.{ts,tsx}` |
| `npm run audit:security` / `audit:quality` | The security audit and quality dashboard reports |
| `npm run quality:gates` | build, build:server, smoke:built, lint, test:coverage, audit:security, audit:quality |
| `npm run smoke:built` | `scripts/smoke-built-server.mjs` |
| `npm run auth:login-link` | Prints a one-time sign-in link (see [LOCAL-CLIENT-AUTH.md](../api/LOCAL-CLIENT-AUTH.md)) |
| `npm run maintain` (and `maintain:check`, `:start`, `:patterns`, `:performance`) | The maintenance daemon (see [maintenance](../maintenance/README.md)) |
| `npm run clean` | Deletes `dist` and `node_modules`, then reinstalls |

Testing details are in [the testing guide](../guides/TESTING-GUIDE.md).
