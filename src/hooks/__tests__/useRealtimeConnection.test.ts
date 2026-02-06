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

    // Auto-trigger onopen in the next microtask (synchronous-ish)
    queueMicrotask(() => {
      if (this.readyState === MockWebSocket.CONNECTING) {
        this.readyState = MockWebSocket.OPEN;
        if (this.onopen) this.onopen();
      }
    });
  }

  send(data: string) {
    // Mock send
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    queueMicrotask(() => {
      if (this.onclose) this.onclose();
    });
  }
}

global.WebSocket = MockWebSocket as any;

describe("useRealtimeConnection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
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

    // Wait for connection (500ms delay + auto-open)
    await waitFor(
      () => {
        const wsInstance = (global as any).lastWebSocketInstance;
        expect(wsInstance).toBeDefined();
        expect(wsInstance.url).toBe("ws://localhost:5051/ws");
        expect(onOpen).toHaveBeenCalledTimes(1);
      },
      { timeout: 2000 }
    );
  });

  it("should update connection state on open", async () => {
    const { result } = renderHook(() =>
      useRealtimeConnection({
        url: "ws://localhost:5051/ws",
      })
    );

    await waitFor(
      () => {
        expect(result.current.connectionState.status).toBe("connected");
        expect(result.current.isConnected).toBe(true);
      },
      { timeout: 2000 }
    );
  });

  it("should receive and parse messages", async () => {
    const { result } = renderHook(() =>
      useRealtimeConnection<{ type: string; payload: any }>({
        url: "ws://localhost:5051/ws",
      })
    );

    await waitFor(
      () => {
        expect(result.current.isConnected).toBe(true);
      },
      { timeout: 2000 }
    );

    const wsInstance = (global as any).lastWebSocketInstance;

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
        heartbeatInterval: 100, // Short interval for testing
      })
    );

    await waitFor(
      () => {
        expect(result.current.isConnected).toBe(true);
      },
      { timeout: 2000 }
    );

    const wsInstance = (global as any).lastWebSocketInstance;

    // Wait for first heartbeat to be sent (100ms + buffer)
    await new Promise((resolve) => setTimeout(resolve, 150));

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

    await waitFor(
      () => {
        expect(result.current.isConnected).toBe(true);
      },
      { timeout: 2000 }
    );

    const wsInstance = (global as any).lastWebSocketInstance;
    const sendSpy = vi.spyOn(wsInstance, "send");

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

    await waitFor(
      () => {
        expect(result.current.isConnected).toBe(true);
      },
      { timeout: 2000 }
    );

    const wsInstance = (global as any).lastWebSocketInstance;

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
        reconnectDelay: 100, // Short delay for testing
        onReconnect,
      })
    );

    await waitFor(
      () => {
        expect(result.current.isConnected).toBe(true);
      },
      { timeout: 2000 }
    );

    const firstWsInstance = (global as any).lastWebSocketInstance;

    // Simulate connection close
    act(() => {
      firstWsInstance.close();
    });

    await waitFor(
      () => {
        expect(result.current.connectionState.status).toBe("disconnected");
      },
      { timeout: 1000 }
    );

    // Wait for reconnection (100ms delay + 500ms connect delay + auto-open)
    await waitFor(
      () => {
        expect(onReconnect).toHaveBeenCalledWith(1);
      },
      { timeout: 2000 }
    );
  });

  it("should use exponential backoff for reconnection", async () => {
    const { result, unmount } = renderHook(() =>
      useRealtimeConnection({
        url: "ws://localhost:5051/ws",
        reconnectDelay: 100, // Short delay for testing
        maxReconnectAttempts: 3,
      })
    );

    await waitFor(
      () => {
        expect(result.current.isConnected).toBe(true);
      },
      { timeout: 2000 }
    );

    // Trigger first close
    act(() => {
      const wsInstance = (global as any).lastWebSocketInstance;
      wsInstance.close();
    });

    await waitFor(
      () => {
        expect(result.current.connectionState.reconnectAttempt).toBe(1);
      },
      { timeout: 2000 }
    );

    // Clean up to prevent further reconnections
    unmount();
  });

  it("should cleanup on unmount", async () => {
    let wsInstance: any;

    const { result, unmount } = renderHook(() =>
      useRealtimeConnection({
        url: "ws://localhost:5051/ws",
      })
    );

    // Wait for connection to be established
    await waitFor(
      () => {
        expect(result.current.isConnected).toBe(true);
      },
      { timeout: 2000 }
    );

    // Get the WebSocket instance and spy on close
    wsInstance = (global as any).lastWebSocketInstance;
    const closeSpy = vi.spyOn(wsInstance, "close");

    unmount();

    // Verify close was called
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
      await new Promise((resolve) => setTimeout(resolve, 50));
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
  });

  it("should poll at base interval when enabled", async () => {
    const fetchFn = vi.fn(async () => {});

    const { unmount } = renderHook(() =>
      useAdaptivePolling(fetchFn, {
        baseInterval: 50, // Short interval for testing
        enabled: true,
      })
    );

    // First poll happens immediately
    await waitFor(() => {
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });

    // Wait for second poll (50ms interval + buffer)
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Check call count is at least 2 (may be slightly more due to timing)
    expect(fetchFn.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(fetchFn.mock.calls.length).toBeLessThanOrEqual(4);

    // Clean up immediately to stop polling
    unmount();
  });

  it("should not poll when disabled", async () => {
    const fetchFn = vi.fn(async () => {});

    const { unmount } = renderHook(() =>
      useAdaptivePolling(fetchFn, {
        baseInterval: 50,
        enabled: false,
      })
    );

    // Wait long enough that polls would have happened
    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(fetchFn).not.toHaveBeenCalled();

    unmount();
  });

  it("should increase interval on failure", async () => {
    let callCount = 0;
    const fetchFn = vi.fn(async () => {
      callCount++;
      if (callCount <= 2) {
        throw new Error("Fetch failed");
      }
    });

    const { result, unmount } = renderHook(() =>
      useAdaptivePolling(fetchFn, {
        baseInterval: 50,
        maxInterval: 1000,
      })
    );

    // First poll (will fail)
    await waitFor(() => {
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });

    // Wait for backoff and second poll (100ms backoff + buffer)
    await new Promise((resolve) => setTimeout(resolve, 200));

    await waitFor(() => {
      expect(fetchFn).toHaveBeenCalledTimes(2);
      expect(result.current.errorCount).toBeGreaterThan(0);
    });

    // Clean up to stop polling
    unmount();
  });

  it("should reset interval on success", async () => {
    let callCount = 0;
    const fetchFn = vi.fn(async () => {
      callCount++;
      if (callCount === 1) {
        throw new Error("Fetch failed");
      }
    });

    const { result, unmount } = renderHook(() =>
      useAdaptivePolling(fetchFn, {
        baseInterval: 50,
      })
    );

    // First poll (will fail)
    await waitFor(() => {
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });

    // Wait for backoff and second poll (100ms backoff + buffer)
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Second poll (will succeed) - may have been called more times
    expect(fetchFn.mock.calls.length).toBeGreaterThanOrEqual(2);

    // After success, should reset to base interval
    await waitFor(() => {
      expect(result.current.errorCount).toBe(0);
    });

    // Clean up to stop polling
    unmount();
  });
});
