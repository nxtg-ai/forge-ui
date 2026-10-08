/**
 * The browser's API base is the serving origin, in a production build too.
 *
 * NEXUS: DIRECTIVE-NXTG-20261008-01. A production build called
 * http://<host>:5051/api with credentials, so the session cookie reached
 * whatever held port 5051. Vitest runs with DEV=true, where the old code was
 * already relative, so every wiring test below stubs a production env first.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { resolve } from "path";
import { renderHook, waitFor } from "@testing-library/react";
import { apiBase, DEFAULT_API_BASE } from "../api-base";
import { ApiClient } from "../api-client";
import { applyDiff, getPendingDiffs, rejectDiff } from "../../api/diff-service";
import { useDashboardData } from "../../hooks/useDashboardData";

vi.mock("../ws-manager", () => ({
  wsManager: {
    subscribe: vi.fn(() => () => {}),
    onStateChange: vi.fn(() => () => {}),
    connect: vi.fn(),
    disconnect: vi.fn(),
    send: vi.fn(() => true),
    getState: vi.fn(() => ({ status: "connected" })),
  },
}));

vi.mock("../../utils/browser-logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

/** Absolute (scheme or protocol-relative) or carrying a port: names another origin. */
function namesAnotherOrigin(url: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith("//") || /:\d+/.test(url);
}

describe("apiBase()", () => {
  it("defaults to the same-origin /api", () => {
    expect(apiBase({})).toBe(DEFAULT_API_BASE);
    expect(DEFAULT_API_BASE).toBe("/api");
  });

  it("accepts another path on the same origin", () => {
    expect(apiBase({ VITE_API_URL: "/forge/api/" })).toBe("/forge/api");
  });

  it("ignores a VITE_API_URL that names another origin", () => {
    for (const value of [
      "http://localhost:5051/api",
      "https://api.example.com/api",
      "//localhost:5051/api",
      "/\\evil.example/api",
    ]) {
      expect(apiBase({ VITE_API_URL: value })).toBe("/api");
    }
  });
});

describe("production build: every API client stays on the serving origin", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.stubEnv("DEV", false);
    vi.stubEnv("PROD", true);
    vi.stubEnv("MODE", "production");
    vi.stubEnv("VITE_API_URL", "");
    fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: [], timestamp: "t" }),
    }));
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  function assertSameOrigin(calls: unknown[][]): void {
    expect(calls.length).toBeGreaterThan(0);
    for (const [url, init] of calls) {
      expect(String(url)).toMatch(/^\/api\//);
      expect(namesAnotherOrigin(String(url))).toBe(false);
      expect((init as RequestInit | undefined)?.credentials).not.toBe("include");
    }
  }

  it("api-client", async () => {
    await new ApiClient().get("/state");
    assertSameOrigin(fetchMock.mock.calls);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/state");
  });

  it("diff-service", async () => {
    await applyDiff("a.ts");
    await rejectDiff("a.ts");
    await getPendingDiffs();
    assertSameOrigin(fetchMock.mock.calls);
    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual([
      "/api/diffs/apply",
      "/api/diffs/reject",
      "/api/diffs/pending",
    ]);
  });

  it("useDashboardData", async () => {
    const { unmount } = renderHook(() => useDashboardData());
    await waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(4));
    unmount();
    assertSameOrigin(fetchMock.mock.calls);
    expect(fetchMock.mock.calls.map((c) => c[0])).toContain("/api/state");
  });
});

describe("index.html referrer policy", () => {
  it("sets strict-origin before any asset is requested", async () => {
    // The test setup mocks "fs"; read the real file.
    const fs = await vi.importActual<typeof import("fs")>("fs");
    const html = fs.readFileSync(resolve(__dirname, "../../../index.html"), "utf-8");
    const meta = html.search(/<meta\s+name="referrer"\s+content="strict-origin"\s*\/?>/);
    const firstAsset = html.search(/<(link|script)\b/);
    expect(meta).toBeGreaterThan(-1);
    expect(firstAsset).toBeGreaterThan(-1);
    expect(meta).toBeLessThan(firstAsset);
  });
});
