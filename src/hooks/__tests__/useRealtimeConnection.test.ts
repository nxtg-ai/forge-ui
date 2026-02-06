/**
 * Tests for useRealtimeConnection Hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useRealtimeConnection, useOptimisticUpdate, useAdaptivePolling } from "../useRealtimeConnection";

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  onopen: (() => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: (() => void) | null = null;
  readyState = MockWebSocket.CONNECTING;

  constructor(public url: string) {
    (global as any).lastWebSocketInstance = this;
  }

  send(data: string) {
    // Mock send
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    setTimeout(() => {
      if (this.onclose) this.onclose();
    }, 0);
  }
}

global.WebSocket = MockWebSocket as any;

describe("useRealtimeConnection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("should initialize with disconnected state", () => {
    const { result } = renderHook(() =>
      useRealtimeConnection({
        url: "ws://localhost:5051/ws",
      })
    );

    expect(result.current.connectionState.status).toBe("disconnected");
    expect(result.current.isConnected).toBe(false);
    expect(result.current.messages).toEqual([]);
  });

  it("should connect to WebSocket on mount", async () => {
    const onOpen = vi.fn();

    renderHook(() =>
      useRealtimeConnection({
        url: "ws://localhost:5051/ws",
        onOpen,
      })
    );

    // Fast-forward connection delay
    act(() => {
      vi.advanceTimersByTime(500);
    });

    const wsInstance = (global as any).lastWebSocketInstance;
    expect(wsInstance).toBeDefined();
    expect(wsInstance.url).toBe("ws://localhost:5051/ws");

    // Simulate connection opening
    act(() => {
      wsInstance.readyState = MockWebSocket.OPEN;
      if (wsInstance.onopen) wsInstance.onopen();
    });

    await waitFor(() => {
      expect(onOpen).toHaveBeenCalledTimes(1);
    });
  });

  it("should update connection state on open", async () => {
    const { result } = renderHook(() =>
      useRealtimeConnection({
        url: "ws://localhost:5051/ws",
      })
    );

    act(() => {
      vi.advanceTimersByTime(500);
    });

    const wsInstance = (global as any).lastWebSocketInstance;

    act(() => {
      wsInstance.readyState = MockWebSocket.OPEN;
      if (wsInstance.onopen) wsInstance.onopen();
    });

    await waitFor(() => {
      expect(result.current.connectionState.status).toBe("connected");
      expect(result.current.isConnected).toBe(true);
    });
  });

  it("should receive and parse messages", async () => {
    const { result } = renderHook(() =>
      useRealtimeConnection<{ type: string; payload: any }>({
        url: "ws://localhost:5051/ws",
      })
    );

    act(() => {
      vi.advanceTimersByTime(500);
    });

    const wsInstance = (global as any).lastWebSocketInstance;

    act(() => {
      wsInstance.readyState = MockWebSocket.OPEN;
      if (wsInstance.onopen) wsInstance.onopen();
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    // Simulate receiving a message
    act(() => {
      const event = new MessageEvent("message", {
        data: JSON.stringify({ type: "test", payload: "data" }),
      });
      if (wsInstance.onmessage) wsInstance.onmessage(event);
    });

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0].type).toBe("test");
    });
  });

  it("should handle pong messages and calculate latency", async () => {
    const { result } = renderHook(() =>
      useRealtimeConnection({
        url: "ws://localhost:5051/ws",
        heartbeatInterval: 1000,
      })
    );

    act(() => {
      vi.advanceTimersByTime(500);
    });

    const wsInstance = (global as any).lastWebSocketInstance;

    act(() => {
      wsInstance.readyState = MockWebSocket.OPEN;
      if (wsInstance.onopen) wsInstance.onopen();
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    // Advance to trigger heartbeat
    act(() => {
      vi.advanceTimersByTime(1100);
    });

    // Simulate pong response
    act(() => {
      const event = new MessageEvent("message", {
        data: JSON.stringify({ type: "pong" }),
      });
      if (wsInstance.onmessage) wsInstance.onmessage(event);
    });

    await waitFor(() => {
      expect(result.current.connectionState.latency).toBeGreaterThanOrEqual(0);
    });
  });

  it("should send messages through WebSocket", async () => {
    const { result } = renderHook(() =>
      useRealtimeConnection({
        url: "ws://localhost:5051/ws",
      })
    );

    act(() => {
      vi.advanceTimersByTime(500);
    });

    const wsInstance = (global as any).lastWebSocketInstance;
    const sendSpy = vi.spyOn(wsInstance, "send");

    act(() => {
      wsInstance.readyState = MockWebSocket.OPEN;
      if (wsInstance.onopen) wsInstance.onopen();
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    act(() => {
      result.current.sendMessage({ type: "test", data: "hello" });
    });

    expect(sendSpy).toHaveBeenCalledWith(
      JSON.stringify({ type: "test", data: "hello" })
    );
  });

  it("should not send messages when disconnected", async () => {
    const { result } = renderHook(() =>
      useRealtimeConnection({
        url: "ws://localhost:5051/ws",
      })
    );

    const success = result.current.sendMessage({ type: "test" });
    expect(success).toBe(false);
  });

  it("should clear messages", async () => {
    const { result } = renderHook(() =>
      useRealtimeConnection({
        url: "ws://localhost:5051/ws",
      })
    );

    act(() => {
      vi.advanceTimersByTime(500);
    });

    const wsInstance = (global as any).lastWebSocketInstance;

    act(() => {
      wsInstance.readyState = MockWebSocket.OPEN;
      if (wsInstance.onopen) wsInstance.onopen();
    });

    // Add a message
    act(() => {
      const event = new MessageEvent("message", {
        data: JSON.stringify({ type: "test" }),
      });
      if (wsInstance.onmessage) wsInstance.onmessage(event);
    });

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(1);
    });

    act(() => {
      result.current.clearMessages();
    });

    expect(result.current.messages).toEqual([]);
  });

  it("should reconnect after connection loss", async () => {
    const onReconnect = vi.fn();

    const { result } = renderHook(() =>
      useRealtimeConnection({
        url: "ws://localhost:5051/ws",
        reconnectDelay: 1000,
        onReconnect,
      })
    );

    act(() => {
      vi.advanceTimersByTime(500);
    });

    const wsInstance = (global as any).lastWebSocketInstance;

    act(() => {
      wsInstance.readyState = MockWebSocket.OPEN;
      if (wsInstance.onopen) wsInstance.onopen();
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    // Simulate connection close
    act(() => {
      wsInstance.close();
    });

    await waitFor(() => {
      expect(result.current.connectionState.status).toBe("disconnected");
    });

    // Advance time for reconnection
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(onReconnect).toHaveBeenCalledWith(1);
    });
  });

  it("should use exponential backoff for reconnection", async () => {
    const { result } = renderHook(() =>
      useRealtimeConnection({
        url: "ws://localhost:5051/ws",
        reconnectDelay: 1000,
        maxReconnectAttempts: 3,
      })
    );

    act(() => {
      vi.advanceTimersByTime(500);
    });

    const wsInstance = (global as any).lastWebSocketInstance;

    act(() => {
      wsInstance.readyState = MockWebSocket.OPEN;
      if (wsInstance.onopen) wsInstance.onopen();
    });

    // Close and trigger reconnections
    for (let i = 0; i < 3; i++) {
      act(() => {
        const ws = (global as any).lastWebSocketInstance;
        ws.close();
      });

      await waitFor(() => {
        expect(result.current.connectionState.reconnectAttempt).toBe(i + 1);
      });

      // Advance with exponential backoff
      act(() => {
        vi.advanceTimersByTime(1000 * Math.pow(2, i));
      });
    }

    expect(result.current.connectionState.reconnectAttempt).toBeLessThanOrEqual(3);
  });

  it("should cleanup on unmount", async () => {
    const { unmount } = renderHook(() =>
      useRealtimeConnection({
        url: "ws://localhost:5051/ws",
      })
    );

    act(() => {
      vi.advanceTimersByTime(500);
    });

    const wsInstance = (global as any).lastWebSocketInstance;
    const closeSpy = vi.spyOn(wsInstance, "close");

    unmount();

    expect(closeSpy).toHaveBeenCalled();
  });
});

describe("useOptimisticUpdate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize with initial value", () => {
    const { result } = renderHook(() =>
      useOptimisticUpdate(42, async (v) => v)
    );

    expect(result.current.value).toBe(42);
    expect(result.current.isUpdating).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it("should optimistically update value", async () => {
    const updateFn = vi.fn(async (v: number) => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      return v;
    });

    const { result } = renderHook(() =>
      useOptimisticUpdate(10, updateFn)
    );

    act(() => {
      result.current.update(20);
    });

    // Value should update immediately
    expect(result.current.value).toBe(20);
    expect(result.current.isUpdating).toBe(true);

    await waitFor(() => {
      expect(result.current.isUpdating).toBe(false);
    });

    expect(updateFn).toHaveBeenCalledWith(20);
  });

  it("should rollback on update failure", async () => {
    const updateFn = vi.fn(async () => {
      throw new Error("Update failed");
    });

    const { result } = renderHook(() =>
      useOptimisticUpdate(10, updateFn)
    );

    await act(async () => {
      try {
        await result.current.update(20);
      } catch (err) {
        // Expected error
      }
    });

    // Should rollback to original value
    expect(result.current.value).toBe(10);
    expect(result.current.error).toBeTruthy();
  });

  it("should support function updates", async () => {
    const { result } = renderHook(() =>
      useOptimisticUpdate(10, async (v) => v)
    );

    await act(async () => {
      await result.current.update((prev) => prev + 5);
    });

    expect(result.current.value).toBe(15);
  });
});

describe("useAdaptivePolling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should poll at base interval when enabled", async () => {
    const fetchFn = vi.fn(async () => {});

    renderHook(() =>
      useAdaptivePolling(fetchFn, {
        baseInterval: 1000,
        enabled: true,
      })
    );

    await waitFor(() => {
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(fetchFn).toHaveBeenCalledTimes(2);
    });
  });

  it("should not poll when disabled", async () => {
    const fetchFn = vi.fn(async () => {});

    renderHook(() =>
      useAdaptivePolling(fetchFn, {
        baseInterval: 1000,
        enabled: false,
      })
    );

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("should increase interval on failure", async () => {
    let callCount = 0;
    const fetchFn = vi.fn(async () => {
      callCount++;
      if (callCount <= 2) {
        throw new Error("Fetch failed");
      }
    });

    const { result } = renderHook(() =>
      useAdaptivePolling(fetchFn, {
        baseInterval: 1000,
        maxInterval: 30000,
      })
    );

    await waitFor(() => {
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });

    // After first failure, interval should double
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    await waitFor(() => {
      expect(fetchFn).toHaveBeenCalledTimes(2);
    });

    expect(result.current.errorCount).toBeGreaterThan(0);
  });

  it("should reset interval on success", async () => {
    let callCount = 0;
    const fetchFn = vi.fn(async () => {
      callCount++;
      if (callCount === 1) {
        throw new Error("Fetch failed");
      }
    });

    const { result } = renderHook(() =>
      useAdaptivePolling(fetchFn, {
        baseInterval: 1000,
      })
    );

    await waitFor(() => {
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });

    // After failure
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    await waitFor(() => {
      expect(fetchFn).toHaveBeenCalledTimes(2);
    });

    // After success, should reset to base interval
    await waitFor(() => {
      expect(result.current.errorCount).toBe(0);
    });
  });
});
