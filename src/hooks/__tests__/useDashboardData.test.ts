/**
 * Tests for useDashboardData Hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useDashboardData } from "../useDashboardData";

// Track WebSocket instances
let wsInstances: any[] = [];

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: (() => void) | null = null;
  readyState = MockWebSocket.OPEN;
  url: string;

  constructor(url: string) {
    this.url = url;
    wsInstances.push(this);
    // Auto-open
    queueMicrotask(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) this.onopen();
    });
  }

  send(_data: string) {}

  close() {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) this.onclose();
  }
}

// Default mock responses
const defaultResponses: Record<string, any> = {
  "/api/forge/status": { git: { hasUncommitted: false, modified: 0, untracked: 0 }, tests: { passing: 10, total: 10 }, build: { status: "success" } },
  "/api/vision": { mission: "Test mission", goals: [], constraints: [], successMetrics: [], timeframe: "Ongoing" },
  "/api/state": { phase: "planning", progress: 0, blockers: [], recentDecisions: [] },
  "/api/agents/active": [],
};

function createFetchMock(overrides: Record<string, any> = {}) {
  const responses = { ...defaultResponses, ...overrides };
  return vi.fn((url: string) => {
    for (const [key, value] of Object.entries(responses)) {
      if (url.includes(key)) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(value),
        });
      }
    }
    return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) });
  });
}

const OriginalWebSocket = global.WebSocket;

describe("useDashboardData", () => {
  beforeEach(() => {
    wsInstances = [];
    global.WebSocket = MockWebSocket as any;
    global.fetch = createFetchMock();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    global.WebSocket = OriginalWebSocket;
    // Close any open WS connections
    wsInstances.forEach(ws => { try { ws.close(); } catch {} });
  });

  it("should initialize with loading state", () => {
    const { result } = renderHook(() => useDashboardData());
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBe(null);
    expect(result.current.projectState).toBeDefined();
    expect(result.current.visionData).toBeDefined();
  });

  it("should fetch data from all endpoints on mount", async () => {
    global.fetch = createFetchMock({
      "/api/forge/status": { git: { hasUncommitted: false, modified: 0, untracked: 0 }, tests: { passing: 10, total: 10 }, build: { status: "success" } },
      "/api/vision": { mission: "Build amazing features", goals: ["Goal 1", "Goal 2"], constraints: ["C1"], successMetrics: ["M1"], timeframe: "Q1 2026" },
      "/api/state": { phase: "building", progress: 50, blockers: [], recentDecisions: [] },
      "/api/agents/active": [{ id: "agent-1", name: "Agent 1", role: "developer" }],
    });

    const { result } = renderHook(() => useDashboardData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.projectState.phase).toBe("building");
    expect(result.current.projectState.progress).toBe(50);
    expect(result.current.visionData.mission).toBe("Build amazing features");
    expect(result.current.visionData.goals).toHaveLength(2);
    expect(result.current.agents).toHaveLength(1);
  });

  it("should handle fetch errors gracefully", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useDashboardData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Individual endpoint failures get fallback values, overall fetch error sets error state
    expect(result.current.projectState).toBeDefined();
  });

  it("should calculate health score correctly", async () => {
    global.fetch = createFetchMock({
      "/api/forge/status": {
        git: { hasUncommitted: true, modified: 5, untracked: 3 },
        tests: { passing: 8, total: 10 },
        build: { status: "success" },
        governance: { status: "ok", workstreamsBlocked: 0 },
      },
    });

    const { result } = renderHook(() => useDashboardData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.projectState.healthScore).toBeLessThan(100);
    expect(result.current.projectState.healthScore).toBeGreaterThanOrEqual(0);
  });

  it("should handle 4xx/5xx response codes gracefully", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({}),
    });

    const { result } = renderHook(() => useDashboardData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.projectState).toBeDefined();
    expect(result.current.visionData).toBeDefined();
  });

  it("should handle manual refresh", async () => {
    const { result } = renderHook(() => useDashboardData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const initialCallCount = (global.fetch as any).mock.calls.length;

    await act(async () => {
      await result.current.refresh();
    });

    expect((global.fetch as any).mock.calls.length).toBeGreaterThan(initialCallCount);
  });

  it("should parse vision goals correctly", async () => {
    global.fetch = createFetchMock({
      "/api/vision": {
        mission: "Test mission",
        goals: [{ title: "Goal 1", description: "Desc 1" }, "Simple goal string"],
        constraints: [],
        successMetrics: [{ name: "Metric 1" }, "Simple metric"],
        timeframe: "2026",
      },
    });

    const { result } = renderHook(() => useDashboardData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.visionData.goals).toContain("Goal 1");
    expect(result.current.visionData.goals).toContain("Simple goal string");
    expect(result.current.visionData.successMetrics).toContain("Metric 1");
    expect(result.current.visionData.successMetrics).toContain("Simple metric");
  });

  it("should use fallback data when API returns null", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(null),
    });

    const { result } = renderHook(() => useDashboardData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.projectState.phase).toBe("planning");
    expect(result.current.visionData.mission).toBe("Building innovative solutions");
  });

  it("should create WebSocket connection", async () => {
    const { result } = renderHook(() => useDashboardData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(wsInstances.length).toBeGreaterThan(0);
  });
});
