/**
 * Tests for useActivityData Hook
 *
 * Covers: fetch success/failure, non-OK HTTP status, malformed/empty
 * payload shapes, every `||`/`??` fallback branch in transformApiActivity,
 * the WebSocket "agent.activity" handler's own fallback branches, the
 * onStateChange connected/reconnecting/idle branches, maxItems slicing,
 * autoScroll scrollTo gating, the isNew timeout flip, and unmount cleanup.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useActivityData } from "../useActivityData";
import { wsManager } from "../../services/ws-manager";

// --- wsManager mock (captures handlers so tests can drive them directly) ---
const { mockUnsubscribe, mockSubscribe, mockOnStateChange } = vi.hoisted(() => {
  const mockUnsubscribe = vi.fn();
  return {
    mockUnsubscribe,
    mockSubscribe: vi.fn(() => mockUnsubscribe),
    mockOnStateChange: vi.fn(() => mockUnsubscribe),
  };
});

vi.mock("../../services/ws-manager", () => ({
  wsManager: {
    subscribe: mockSubscribe,
    onStateChange: mockOnStateChange,
  },
}));

function createFetchMock(body: unknown, ok = true, status = 200, statusText = "OK") {
  return vi.fn(() =>
    Promise.resolve({
      ok,
      status,
      statusText,
      json: () => Promise.resolve(body),
    }),
  );
}

/** Grabs the handler registered for wsManager.subscribe("agent.activity", handler). */
function getActivityHandler() {
  const call = mockSubscribe.mock.calls.find(([type]) => type === "agent.activity");
  if (!call) throw new Error("agent.activity handler was not registered");
  return call[1] as (payload: unknown) => void;
}

/** Grabs the handler registered for wsManager.onStateChange(handler). */
function getStateHandler() {
  const call = mockOnStateChange.mock.calls[0];
  if (!call) throw new Error("onStateChange handler was not registered");
  return call[0] as (state: { status: string }) => void;
}

describe("useActivityData", () => {
  beforeEach(() => {
    mockUnsubscribe.mockClear();
    mockSubscribe.mockClear();
    mockOnStateChange.mockClear();
    global.fetch = createFetchMock({ success: true, data: [] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  const scrollRefNull = { current: null };

  it("initializes with loading true, empty activities, no error, disconnected state", () => {
    const { result } = renderHook(() => useActivityData(10, false, scrollRefNull));
    expect(result.current.isLoading).toBe(true);
    expect(result.current.activities).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(result.current.isConnected).toBe(false);
    expect(result.current.isReconnecting).toBe(false);
  });

  it("fetches the correct URL with maxItems/sort params", async () => {
    const { result } = renderHook(() => useActivityData(15, false, scrollRefNull));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/agents/activities?limit=15&sortBy=timestamp&sortOrder=desc"),
    );
  });

  it("fully populates every field when the raw item has all properties set", async () => {
    global.fetch = createFetchMock({
      success: true,
      data: [
        {
          id: "act-1",
          agentId: "agent-a",
          agentName: "Agent A",
          type: "thinking",
          status: "completed",
          action: "Doing thing",
          message: "ignored message",
          details: "Detail text",
          description: "ignored description",
          confidence: 0.87,
          timestamp: "2026-01-01T00:00:00.000Z",
          relatedAgents: ["agent-b"],
        },
      ],
    });

    const { result } = renderHook(() => useActivityData(10, false, scrollRefNull));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.activities).toHaveLength(1);
    const item = result.current.activities[0];
    expect(item.id).toBe("act-1");
    expect(item.agentId).toBe("agent-a");
    expect(item.agentName).toBe("Agent A");
    // item.type is truthy ("thinking"), so the status-derived ternary
    // is never evaluated even though status === "completed".
    expect(item.type).toBe("thinking");
    expect(item.action).toBe("Doing thing");
    expect(item.details).toBe("Detail text");
    expect(item.confidence).toBe(0.87);
    expect(item.timestamp).toEqual(new Date("2026-01-01T00:00:00.000Z"));
    expect(item.relatedAgents).toEqual(["agent-b"]);
  });

  it("falls back through agent/message/description and derives type from status=completed when id/agentId/agentName/type/action/details/timestamp/relatedAgents are absent", async () => {
    global.fetch = createFetchMock({
      success: true,
      data: [
        {
          agent: "agent-x",
          status: "completed",
          message: "message text",
          description: "description text",
        },
      ],
    });

    const { result } = renderHook(() => useActivityData(10, false, scrollRefNull));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const item = result.current.activities[0];
    expect(item.id).toMatch(/^\d+-[a-z0-9]+$/);
    expect(item.agentId).toBe("agent-x");
    expect(item.agentName).toBe("agent-x");
    expect(item.type).toBe("completed");
    expect(item.action).toBe("message text");
    expect(item.details).toBe("description text");
    expect(item.confidence).toBeUndefined();
    expect(item.timestamp).toBeInstanceOf(Date);
    expect(item.relatedAgents).toBeUndefined();
  });

  it("derives type=blocked from status=blocked when no explicit type is given", async () => {
    global.fetch = createFetchMock({
      success: true,
      data: [{ status: "blocked" }],
    });

    const { result } = renderHook(() => useActivityData(10, false, scrollRefNull));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const item = result.current.activities[0];
    expect(item.type).toBe("blocked");
    expect(item.agentId).toBe("unknown");
    expect(item.agentName).toBe("Agent");
    expect(item.action).toBe("Activity");
    expect(item.details).toBeUndefined();
  });

  it("falls back to type=working when neither type nor a recognized status is present", async () => {
    global.fetch = createFetchMock({
      success: true,
      data: [{ status: "some-other-status" }],
    });

    const { result } = renderHook(() => useActivityData(10, false, scrollRefNull));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.activities[0].type).toBe("working");
  });

  it("sets activities to [] when result.success is false", async () => {
    global.fetch = createFetchMock({ success: false, data: [{ id: "x" }] });

    const { result } = renderHook(() => useActivityData(10, false, scrollRefNull));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.activities).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it("sets activities to [] when result.data is not an array", async () => {
    global.fetch = createFetchMock({ success: true, data: { not: "an array" } });

    const { result } = renderHook(() => useActivityData(10, false, scrollRefNull));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.activities).toEqual([]);
  });

  it("throws and records the status-text error when the HTTP response is not ok", async () => {
    global.fetch = createFetchMock({}, false, 503, "Service Unavailable");

    const { result } = renderHook(() => useActivityData(10, false, scrollRefNull));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe("Failed to fetch activities: Service Unavailable");
    expect(result.current.activities).toEqual([]);
  });

  it("records the Error's message when fetch rejects with a real Error", async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error("Network down")));

    const { result } = renderHook(() => useActivityData(10, false, scrollRefNull));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe("Network down");
    expect(result.current.activities).toEqual([]);
  });

  it('records "Unknown error" when fetch rejects with a non-Error value', async () => {
    global.fetch = vi.fn(() => Promise.reject("boom"));

    const { result } = renderHook(() => useActivityData(10, false, scrollRefNull));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe("Unknown error");
    expect(result.current.activities).toEqual([]);
  });

  it("refresh() re-invokes fetch and can recover from a prior error", async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error("first failure")));
    const { result } = renderHook(() => useActivityData(10, false, scrollRefNull));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe("first failure");

    global.fetch = createFetchMock({ success: true, data: [{ id: "recovered" }] });
    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.activities).toHaveLength(1);
    expect(result.current.activities[0].id).toBe("recovered");
  });

  it("clearActivities empties the activities list", async () => {
    global.fetch = createFetchMock({ success: true, data: [{ id: "a" }] });
    const { result } = renderHook(() => useActivityData(10, false, scrollRefNull));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.activities).toHaveLength(1);

    act(() => {
      result.current.clearActivities();
    });

    expect(result.current.activities).toEqual([]);
  });

  it("registers exactly one agent.activity subscription and one onStateChange listener per mount", async () => {
    const { result } = renderHook(() => useActivityData(10, false, scrollRefNull));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockSubscribe).toHaveBeenCalledWith("agent.activity", expect.any(Function));
    expect(mockSubscribe).toHaveBeenCalledTimes(1);
    expect(mockOnStateChange).toHaveBeenCalledTimes(1);
  });

  describe("WebSocket agent.activity handler", () => {
    it("ignores a null payload without adding an activity", async () => {
      const { result } = renderHook(() => useActivityData(10, false, scrollRefNull));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        getActivityHandler()(null);
      });

      expect(result.current.activities).toEqual([]);
    });

    it("uses payload.agent as agentId/agentName fallback and derives type=completed from status", async () => {
      const { result } = renderHook(() => useActivityData(10, false, scrollRefNull));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        getActivityHandler()({ agent: "agent-z", status: "completed" });
      });

      const item = result.current.activities[0];
      expect(item.agentId).toBe("agent-z");
      expect(item.agentName).toBe("agent-z");
      expect(item.type).toBe("completed");
      expect(item.action).toBe("Activity");
      expect(item.details).toBeUndefined();
      expect(item.id).toMatch(/^\d+-[a-z0-9]+$/);
    });

    it("prefers payload.agentName over payload.agent when both are present, derives type=blocked", async () => {
      const { result } = renderHook(() => useActivityData(10, false, scrollRefNull));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        getActivityHandler()({
          id: "ws-1",
          agent: "agent-y",
          agentName: "Agent Y Display",
          status: "blocked",
          action: "Stuck",
          details: "waiting on review",
          timestamp: "2026-02-02T00:00:00.000Z",
        });
      });

      const item = result.current.activities[0];
      expect(item.id).toBe("ws-1");
      expect(item.agentId).toBe("agent-y");
      expect(item.agentName).toBe("Agent Y Display");
      expect(item.type).toBe("blocked");
      expect(item.action).toBe("Stuck");
      expect(item.details).toBe("waiting on review");
      expect(item.timestamp).toEqual(new Date("2026-02-02T00:00:00.000Z"));
    });

    it("falls back to agentId='unknown'/agentName='Agent'/type='working' when nothing is provided", async () => {
      const { result } = renderHook(() => useActivityData(10, false, scrollRefNull));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        getActivityHandler()({});
      });

      const item = result.current.activities[0];
      expect(item.agentId).toBe("unknown");
      expect(item.agentName).toBe("Agent");
      expect(item.type).toBe("working");
      expect(item.action).toBe("Activity");
      expect(item.timestamp).toBeInstanceOf(Date);
    });

    it("caps the activity list at maxItems, keeping the newest item first", async () => {
      global.fetch = createFetchMock({
        success: true,
        data: [{ id: "old-1" }, { id: "old-2" }],
      });
      const { result } = renderHook(() => useActivityData(2, false, scrollRefNull));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.activities).toHaveLength(2);

      act(() => {
        getActivityHandler()({ id: "new-1" });
      });

      expect(result.current.activities).toHaveLength(2);
      expect(result.current.activities[0].id).toBe("new-1");
      expect(result.current.activities[1].id).toBe("old-1");
    });

    it("flips isNew from true to false 2000ms after arrival", async () => {
      vi.useFakeTimers();
      const { result } = renderHook(() => useActivityData(10, false, scrollRefNull));
      await vi.waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        getActivityHandler()({ id: "timed-1" });
      });
      expect(result.current.activities[0].isNew).toBe(true);

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(result.current.activities[0].isNew).toBe(false);
    });

    it("only flips isNew on the matching id, leaving other activities untouched when the timeout fires", async () => {
      global.fetch = createFetchMock({
        success: true,
        data: [{ id: "already-here" }],
      });
      vi.useFakeTimers();
      const { result } = renderHook(() => useActivityData(10, false, scrollRefNull));
      await vi.waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.activities[0].isNew).toBeUndefined();

      act(() => {
        getActivityHandler()({ id: "timed-2" });
      });
      expect(result.current.activities).toHaveLength(2);
      expect(result.current.activities[0].isNew).toBe(true);

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      // The new item's isNew flips to false; the pre-existing item (never
      // matching activity.id in the map) is returned unchanged.
      expect(result.current.activities[0].id).toBe("timed-2");
      expect(result.current.activities[0].isNew).toBe(false);
      expect(result.current.activities[1].id).toBe("already-here");
      expect(result.current.activities[1].isNew).toBeUndefined();
    });

    it("calls scrollRef.current.scrollTo when autoScroll is true and the ref is attached", async () => {
      const scrollTo = vi.fn();
      const scrollRef = { current: { scrollTo } as unknown as HTMLDivElement };
      const { result } = renderHook(() => useActivityData(10, true, scrollRef));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        getActivityHandler()({ id: "scroll-1" });
      });

      expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
    });

    it("does not scroll when autoScroll is false even though the ref is attached", async () => {
      const scrollTo = vi.fn();
      const scrollRef = { current: { scrollTo } as unknown as HTMLDivElement };
      const { result } = renderHook(() => useActivityData(10, false, scrollRef));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        getActivityHandler()({ id: "no-scroll-1" });
      });

      expect(scrollTo).not.toHaveBeenCalled();
    });

    it("does not throw when autoScroll is true but scrollRef.current is null", async () => {
      const { result } = renderHook(() => useActivityData(10, true, scrollRefNull));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(() => {
        act(() => {
          getActivityHandler()({ id: "null-ref-1" });
        });
      }).not.toThrow();
      expect(result.current.activities).toHaveLength(1);
    });
  });

  describe("connection state handler", () => {
    it("sets isConnected true and isReconnecting false on status=connected", async () => {
      const { result } = renderHook(() => useActivityData(10, false, scrollRefNull));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        getStateHandler()({ status: "connected" });
      });

      expect(result.current.isConnected).toBe(true);
      expect(result.current.isReconnecting).toBe(false);
    });

    it("sets isReconnecting true and isConnected false on status=reconnecting", async () => {
      const { result } = renderHook(() => useActivityData(10, false, scrollRefNull));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        getStateHandler()({ status: "reconnecting" });
      });

      expect(result.current.isReconnecting).toBe(true);
      expect(result.current.isConnected).toBe(false);
    });

    it("sets both isConnected and isReconnecting false on status=disconnected", async () => {
      const { result } = renderHook(() => useActivityData(10, false, scrollRefNull));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        getStateHandler()({ status: "connected" });
      });
      expect(result.current.isConnected).toBe(true);

      act(() => {
        getStateHandler()({ status: "disconnected" });
      });

      expect(result.current.isConnected).toBe(false);
      expect(result.current.isReconnecting).toBe(false);
    });
  });

  describe("unmount cleanup", () => {
    it("calls both unsubscribe functions on unmount", async () => {
      const { result, unmount } = renderHook(() => useActivityData(10, false, scrollRefNull));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      unmount();

      // One unsubscribe from the message subscription, one from onStateChange.
      expect(mockUnsubscribe).toHaveBeenCalledTimes(2);
    });

    it("clears pending isNew timeouts on unmount without throwing", async () => {
      vi.useFakeTimers();
      const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");
      const { result, unmount } = renderHook(() => useActivityData(10, false, scrollRefNull));
      await vi.waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        getActivityHandler()({ id: "pending-timeout-1" });
      });

      const callsBeforeUnmount = clearTimeoutSpy.mock.calls.length;
      expect(() => unmount()).not.toThrow();
      expect(clearTimeoutSpy.mock.calls.length).toBeGreaterThan(callsBeforeUnmount);

      // Advancing timers post-unmount must not flip state or throw.
      expect(() => vi.advanceTimersByTime(5000)).not.toThrow();
    });
  });
});
