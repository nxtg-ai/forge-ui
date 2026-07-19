/**
 * Single source of truth for the running forge-ui version.
 *
 * NEXUS: DIRECTIVE-NXTG-20260718-12 item 2.
 *
 * Before this module the MCP handshake carried a hardcoded semver literal. It
 * silently drifted through a whole release — a 3.3.2 client reported "3.3.1" to
 * the orchestrator — because nothing coupled the literal to package.json and no
 * test could notice.
 *
 * Why `createRequire` rather than `import pkg from "../../package.json"`:
 * both tsconfigs set `rootDir: "./src"`, so a static import of a file above
 * `src/` fails the build with TS6059. `createRequire` resolves at runtime and
 * sidesteps rootDir entirely.
 *
 * Server-side only. `import.meta.url` resolves to `src/services/` in dev and
 * `dist/services/` after `build:server`; `../../package.json` is the repo root
 * in both. This module must never enter the browser bundle — it is reached only
 * through orchestrator-health, which spawns `forge mcp` and is server-only.
 */

import { createRequire } from "node:module";

const requireFromHere = createRequire(import.meta.url);

const pkg = requireFromHere("../../package.json") as { version?: unknown };

if (typeof pkg.version !== "string" || pkg.version.length === 0) {
  // Fail loudly rather than shipping `undefined` onto the wire. A missing
  // version means the resolution above broke, and a silent fallback would
  // recreate exactly the drift this module exists to prevent.
  throw new Error(
    "app-version: package.json resolved without a usable `version` field",
  );
}

export const appVersion: string = pkg.version;
