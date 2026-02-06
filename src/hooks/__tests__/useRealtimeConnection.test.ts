/**
 * Tests for useRealtimeConnection Hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useRealtimeConnection, useOptimisticUpdate, useAdaptivePolling } from "../useRealtimeConnection";
import type { WSConnectionState, ConnectionStatus } from "../../services/ws-manager";

// Mock ws-manager module
vi.mock("../../services/ws-manager", () => {
  const mockSubscribe = vi.fn();
  const mockOnStateChange = vi.fn();
  const mockConnect = vi.fn();
  const mockDisconnect = vi.fn();
  const mockSend = vi.fn();
  const mockGetState = vi.fn();

  return {
    wsManager: {
      subscribe: mockSubscribe,
      onStateChange: mockOnStateChange,
      connect: mockConnect,
      disconnect: mockDisconnect,
      send: mockSend,
      getState: mockGetState,
    },
  };
});

// Get the mocked functions
const { wsManager } = await import("../../services/ws-manager");
const mockSubscribe = wsManager.subscribe as ReturnType<typeof vi.fn>;
const mockOnStateChange = wsManager.onStateChange as ReturnType<typeof vi.fn>;
const mockConnect = wsManager.connect as ReturnType<typeof vi.fn>;
const mockDisconnect = wsManager.disconnect as ReturnType<typeof vi.fn>;
const mockSend = wsManager.send as ReturnType<typeof vi.fn>;
const mockGetState = wsManager.getState as ReturnType<typeof vi.fn>;

describe("useRealtimeConnection", () => {
  let stateChangeHandler: ((state: WSConnectionState) => void) | null = null;
  let messageHandler: ((msg: unknown) => void) | null = null;

  beforeEach(() => {
    vi.clearAllMocks();

    stateChangeHandler = null;
    messageHandler = null;

    // Mock initial state as disconnected
    mockGetState.mockReturnValue({
      status: "disconnected" as ConnectionStatus,
      reconnectAttempt: 0,
      latency: 0,
    });

    // Capture handlers when subscribed
    mockOnStateChange.mockImplementation((handler: (state: WSConnectionState) => void) => {
      stateChangeHandler = handler;
      // Immediately call with current state (as real wsManager does)
      handler({
        status: "disconnected" as ConnectionStatus,
        reconnectAttempt: 0,
        latency: 0,
      });
      return vi.fn(); // Return unsubscribe function
    });

    mockSubscribe.mockImplementation((eventType: string, handler: (msg: unknown) => void) => {
      if (eventType === "*") {
        messageHandler = handler;
      }
      return vi.fn(); // Return unsubscribe function
    });

    mockSend.mockReturnValue(true);
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

  it("should subscribe to wsManager on mount and call onOpen on connected transition", async () => {
    const onOpen = vi.fn();

    renderHook(() =>
      useRealtimeConnection({
        url: "ws://localhost:5051/ws",
        onOpen,
      })
    );

    // Verify subscriptions were set up
    expect(mockOnStateChange).toHaveBeenCalledTimes(1);
    expect(mockSubscribe).toHaveBeenCalledWith("*", expect.any(Function));

    // Simulate state transition to connected
    act(() => {
      stateChangeHandler?.({
        status: "connected" as ConnectionStatus,
        reconnectAttempt: 0,
        latency: 0,
        lastConnected: new Date(),
      });
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

    // Simulate state change to connected
    act(() => {
      stateChangeHandler?.({
        status: "connected" as ConnectionStatus,
        reconnectAttempt: 0,
        latency: 0,
        lastConnected: new Date(),
      });
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

    // Simulate state change to connected
    act(() => {
      stateChangeHandler?.({
        status: "connected" as ConnectionStatus,
        reconnectAttempt: 0,
        latency: 0,
      });
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    // Simulate receiving a message through wsManager
    act(() => {
      messageHandler?.({ type: "test", payload: "data" });
    });

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0].type).toBe("test");
    });
  });

  it("should update latency from wsManager state", async () => {
    const { result } = renderHook(() =>
      useRealtimeConnection({
        url: "ws://localhost:5051/ws",
        heartbeatInterval: 100, // Ignored by hook, but kept for compatibility
      })
    );

    // Simulate state change to connected
    act(() => {
      stateChangeHandler?.({
        status: "connected" as ConnectionStatus,
        reconnectAttempt: 0,
        latency: 0,
      });
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    // Simulate latency update from wsManager
    act(() => {
      stateChangeHandler?.({
        status: "connected" as ConnectionStatus,
        reconnectAttempt: 0,
        latency: 42,
      });
    });

    await waitFor(() => {
      expect(result.current.connectionState.latency).toBe(42);
    });
  });

  it("should send messages through wsManager", async () => {
    const { result } = renderHook(() =>
      useRealtimeConnection({
        url: "ws://localhost:5051/ws",
      })
    );

    // Simulate state change to connected
    act(() => {
      stateChangeHandler?.({
        status: "connected" as ConnectionStatus,
        reconnectAttempt: 0,
        latency: 0,
      });
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    act(() => {
      result.current.sendMessage({ type: "test", data: "hello" });
    });

    expect(mockSend).toHaveBeenCalledWith({ type: "test", data: "hello" });
  });

  it("should delegate sendMessage to wsManager regardless of connection state", async () => {
    const { result } = renderHook(() =>
      useRealtimeConnection({
        url: "ws://localhost:5051/ws",
      })
    );

    // wsManager handles queueing when disconnected
    mockSend.mockReturnValue(false); // Simulate queued (not sent immediately)

    const success = result.current.sendMessage({ type: "test" });
    expect(mockSend).toHaveBeenCalledWith({ type: "test" });
    expect(success).toBe(false);
  });

  it("should clear messages", async () => {
    const { result } = renderHook(() =>
      useRealtimeConnection({
        url: "ws://localhost:5051/ws",
      })
    );

    // Simulate state change to connected
    act(() => {
      stateChangeHandler?.({
        status: "connected" as ConnectionStatus,
        reconnectAttempt: 0,
        latency: 0,
      });
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    // Add a message
    act(() => {
      messageHandler?.({ type: "test" });
    });

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(1);
    });

    act(() => {
      result.current.clearMessages();
    });

    expect(result.current.messages).toEqual([]);
  });

  it("should call onReconnect callback on reconnecting state", async () => {
    const onReconnect = vi.fn();

    const { result } = renderHook(() =>
      useRealtimeConnection({
        url: "ws://localhost:5051/ws",
        reconnectDelay: 100, // Ignored, but kept for compatibility
        onReconnect,
      })
    );

    // Simulate state change to connected
    act(() => {
      stateChangeHandler?.({
        status: "connected" as ConnectionStatus,
        reconnectAttempt: 0,
        latency: 0,
      });
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    // Simulate connection close
    act(() => {
      stateChangeHandler?.({
        status: "disconnected" as ConnectionStatus,
        reconnectAttempt: 0,
        latency: 0,
      });
    });

    await waitFor(() => {
      expect(result.current.connectionState.status).toBe("disconnected");
    });

    // Simulate reconnection attempt
    act(() => {
      stateChangeHandler?.({
        status: "reconnecting" as ConnectionStatus,
        reconnectAttempt: 1,
        latency: 0,
      });
    });

    await waitFor(() => {
      expect(onReconnect).toHaveBeenCalledWith(1);
    });
  });

  it("should track reconnect attempts from wsManager", async () => {
    const { result, unmount } = renderHook(() =>
      useRealtimeConnection({
        url: "ws://localhost:5051/ws",
        reconnectDelay: 100, // Ignored, but kept for compatibility
        maxReconnectAttempts: 3,
      })
    );

    // Simulate state change to connected
    act(() => {
      stateChangeHandler?.({
        status: "connected" as ConnectionStatus,
        reconnectAttempt: 0,
        latency: 0,
      });
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    // Simulate reconnection attempt
    act(() => {
      stateChangeHandler?.({
        status: "reconnecting" as ConnectionStatus,
        reconnectAttempt: 1,
        latency: 0,
      });
    });

    await waitFor(() => {
      expect(result.current.connectionState.reconnectAttempt).toBe(1);
    });

    // Clean up to prevent further reconnections
    unmount();
  });

  it("should cleanup subscriptions on unmount", async () => {
    const unsubState = vi.fn();
    const unsubMessages = vi.fn();

    mockOnStateChange.mockReturnValue(unsubState);
    mockSubscribe.mockReturnValue(unsubMessages);

    const { unmount } = renderHook(() =>
      useRealtimeConnection({
        url: "ws://localhost:5051/ws",
      })
    );

    // Verify subscriptions were set up
    expect(mockOnStateChange).toHaveBeenCalledTimes(1);
    expect(mockSubscribe).toHaveBeenCalledWith("*", expect.any(Function));

    unmount();

    // Verify unsubscribe functions were called
    expect(unsubState).toHaveBeenCalled();
    expect(unsubMessages).toHaveBeenCalled();
  });

  it("should call onClose callback on disconnected transition", async () => {
    const onClose = vi.fn();

    renderHook(() =>
      useRealtimeConnection({
        url: "ws://localhost:5051/ws",
        onClose,
      })
    );

    // Simulate state change to connected first
    act(() => {
      stateChangeHandler?.({
        status: "connected" as ConnectionStatus,
        reconnectAttempt: 0,
        latency: 0,
      });
    });

    await waitFor(() => {
      expect(onClose).not.toHaveBeenCalled();
    });

    // Simulate connection close
    act(() => {
      stateChangeHandler?.({
        status: "disconnected" as ConnectionStatus,
        reconnectAttempt: 0,
        latency: 0,
      });
    });

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
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
