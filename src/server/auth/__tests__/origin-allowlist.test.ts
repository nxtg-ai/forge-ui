// @vitest-environment node
/**
 * One origin allowlist for every gate.
 *
 * forge-pm security finding al:802d7317c90eb745 (GHSA-rc7c-r55p-923j class):
 * the default list allowed http://localhost:5173, Vite's default port for any
 * other project. The terminal bridge kept its own list, so the two drifted.
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import * as path from "node:path";

vi.unmock("fs");
const fs = await vi.importActual<typeof import("node:fs")>("node:fs");

import { DEFAULT_ALLOWED_ORIGINS, isAllowedOrigin, authorize } from "../ui-auth";
import { validateOrigin } from "../../pty-bridge";
import type { IncomingMessage } from "node:http";

const SERVER_DIR = path.resolve(__dirname, "../..");

const PROBES = [
  "http://localhost:5050",
  "http://127.0.0.1:5050",
  "http://localhost:5051",
  "http://127.0.0.1:5051",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "ws://localhost:5050",
  "http://localhost:5050.attacker.com",
  "https://evil.example",
  "https://forge.example.com",
  "null",
  "",
];

function originOnly(origin: string): IncomingMessage {
  return { headers: { origin } } as unknown as IncomingMessage;
}

/** Same verdict from the shared check, the /terminal bridge and authorize()'s Origin rule. */
function expectGatesAgree(): void {
  for (const origin of PROBES) {
    const allowed = isAllowedOrigin(origin);
    expect(validateOrigin(origin), origin).toBe(allowed);
    // authorize() answers 403 only for a refused Origin; an allowed one moves on to 401 (no credential).
    expect(authorize(originOnly(origin)).ok === false && (authorize(originOnly(origin)) as { status: number }).status === 403, origin).toBe(!allowed);
  }
}

afterEach(() => {
  delete process.env.ALLOWED_ORIGINS;
});

describe("origin allowlist", () => {
  it("defaults to only the origins forge-ui serves", () => {
    delete process.env.ALLOWED_ORIGINS;
    expect([...DEFAULT_ALLOWED_ORIGINS].sort()).toEqual([
      "http://127.0.0.1:5050",
      "http://127.0.0.1:5051",
      "http://localhost:5050",
      "http://localhost:5051",
    ]);
    expect(isAllowedOrigin("http://localhost:5173")).toBe(false);
    expect(isAllowedOrigin("http://localhost:4173")).toBe(false);
  });

  it("gives the same verdict at every gate with the defaults", () => {
    delete process.env.ALLOWED_ORIGINS;
    expectGatesAgree();
  });

  it("gives the same verdict at every gate with ALLOWED_ORIGINS set", () => {
    process.env.ALLOWED_ORIGINS = "https://forge.example.com, http://localhost:5050";
    expect(isAllowedOrigin("https://forge.example.com")).toBe(true);
    expect(isAllowedOrigin("http://127.0.0.1:5050")).toBe(false);
    expectGatesAgree();
  });

  it("is defined in ui-auth.ts only; no other server file keeps an origin list", () => {
    const offenders: string[] = [];
    const walk = (dir: string): void => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== "__tests__") walk(full);
        } else if (/\.ts$/.test(entry.name) && !/\.test\.ts$/.test(entry.name)) {
          if (full === path.join(SERVER_DIR, "auth", "ui-auth.ts")) continue;
          const src = fs.readFileSync(full, "utf-8");
          if (/process\.env\.ALLOWED_ORIGINS|\bALLOWED_ORIGINS\s*=|\ballowedOrigins\s*=/.test(src)) {
            offenders.push(path.relative(SERVER_DIR, full));
          }
        }
      }
    };
    walk(SERVER_DIR);
    expect(offenders).toEqual([]);
  });
});
