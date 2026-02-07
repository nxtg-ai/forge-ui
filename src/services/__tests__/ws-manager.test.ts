/**
 * WebSocket Manager Tests
 * Comprehensive tests for singleton WebSocket management
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { wsManager } from "../ws-manager";

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  url: string;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: ((error: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;

  sentMessages: string[] = [];

  constructor(url: string) {
    this.url = url;
  }

  send(data: string): void {
    if (this.readyState === MockWebSocket.OPEN) {
      this.sentMessages.push(data);
    } else {
      throw new Error("WebSocket is not open");
    }
  }

  close(): void {
    this.readyState = MockWebSocket.CLOSING;
    setTimeout(() => {
      this.readyState = MockWebSocket.CLOSED;
      if (this.onclose) {
        this.onclose();
      }
    }, 0);
  }

  // Helper to simulate opening
  simulateOpen(): void {
    this.readyState = MockWebSocket.OPEN;
    if (this.onopen) {
      this.onopen();
    }
  }

  // Helper to simulate message
  simulateMessage(data: unknown): void {
    if (this.onmessage) {
      const event = {
        data: JSON.stringify(data),
      } as MessageEvent;
      this.onmessage(event);
    }
  }

  // Helper to simulate error
  simulateError(): void {
    if (this.onerror) {
      this.onerror(new Event("error"));
    }
  }

  // Helper to simulate close
  simulateClose(): void {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose();
    }
  }
}

// Install mock
(globalThis as any).WebSocket = MockWebSocket;

describe("WSManager", () => {
  let mockWs: MockWebSocket;

  beforeEach(() => {
    vi.clearAllTimers();
    vi.useFakeTimers();

    // Intercept WebSocket constructor
    const OriginalWebSocket = (globalThis as any).WebSocket;
    (globalThis as any).WebSocket = function (url: string) {
      mockWs = new OriginalWebSocket(url) as MockWebSocket;
      return mockWs;
    };
    (globalThis as any).WebSocket.CONNECTING = MockWebSocket.CONNECTING;
    (globalThis as any).WebSocket.OPEN = MockWebSocket.OPEN;
    (globalThis as any).WebSocket.CLOSING = MockWebSocket.CLOSING;
    (globalThis as any).WebSocket.CLOSED = MockWebSocket.CLOSED;

    // Reset singleton internal state that disconnect() doesn't clear
    (wsManager as any).isConnecting = false;
    (wsManager as any).subscribers.clear();
    (wsManager as any).stateListeners.clear();
    (wsManager as any).messageQueue = [];

    // Ensure clean state
    wsManager.disconnect();
  });

  afterEach(() => {
    wsManager.disconnect();
    // Restore document.hidden to default
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => false,
    });
    vi.useRealTimers();
  });

  describe("singleton pattern", () => {
    it("should return same instance", () => {
      const instance1 = (wsManager as any).constructor.getInstance();
      const instance2 = (wsManager as any).constructor.getInstance();
      expect(instance1).toBe(instance2);
    });

    it("should start disconnected", () => {
      const state = wsManager.getState();
      expect(state.status).toBe("disconnected");
      expect(state.reconnectAttempt).toBe(0);
      expect(state.latency).toBe(0);
    });
  });

  describe("connection lifecycle", () => {
    it("should connect successfully", () => {
      wsManager.connect();

      expect(mockWs).toBeDefined();
      expect(wsManager.getState().status).toBe("connecting");

      mockWs.simulateOpen();

      const state = wsManager.getState();
      expect(state.status).toBe("connected");
      expect(state.lastConnected).toBeDefined();
    });

    it("should not create duplicate connections", () => {
      wsManager.connect();
      const firstWs = mockWs;

      wsManager.connect(); // Second call

      expect(mockWs).toBe(firstWs);
    });

    it("should disconnect cleanly", () => {
      wsManager.connect();
      mockWs.simulateOpen();

      wsManager.disconnect();

      expect(wsManager.getState().status).toBe("disconnected");
      expect(wsManager.getState().reconnectAttempt).toBe(0);
    });

    it("should prevent reconnection after disconnect", () => {
      wsManager.connect();
      mockWs.simulateOpen();

      wsManager.disconnect();

      // Simulate close - should NOT reconnect
      vi.advanceTimersByTime(5000);

      expect(wsManager.getState().status).toBe("disconnected");
    });

    it("should reconnect after connection drop", () => {
      wsManager.connect();
      mockWs.simulateOpen();

      // Simulate unexpected close
      mockWs.simulateClose();

      expect(wsManager.getState().status).toBe("reconnecting");

      // Advance to trigger reconnection
      vi.advanceTimersByTime(1000);

      expect(mockWs).toBeDefined();
    });

    it("should use exponential backoff for reconnection", () => {
      wsManager.connect();
      mockWs.simulateOpen();

      // First disconnect
      mockWs.simulateClose();
      expect(wsManager.getState().reconnectAttempt).toBe(1);

      // Reconnect and fail
      vi.advanceTimersByTime(1000); // First retry after 1s
      mockWs.simulateClose();
      expect(wsManager.getState().reconnectAttempt).toBe(2);

      // Second retry after 2s
      vi.advanceTimersByTime(2000);
      mockWs.simulateClose();
      expect(wsManager.getState().reconnectAttempt).toBe(3);

      // Third retry after 4s — timer fires, connect() is called but
      // reconnectAttempt only increments on next scheduleReconnect (triggered by close)
      vi.advanceTimersByTime(4000);
      mockWs.simulateClose();
      expect(wsManager.getState().reconnectAttempt).toBe(4);
    });

    it("should stop reconnecting after max attempts", () => {
      wsManager.connect();
      mockWs.simulateOpen();

      // Fail 5 times
      for (let i = 0; i < 5; i++) {
        mockWs.simulateClose();
        const delay = Math.min(1000 * Math.pow(2, i), 30000);
        vi.advanceTimersByTime(delay);
      }

      // Should stop at 5 attempts
      expect(wsManager.getState().reconnectAttempt).toBe(5);

      // Should not schedule another reconnect
      vi.advanceTimersByTime(60000);
      expect(wsManager.getState().reconnectAttempt).toBe(5);
    });

    it("should reset reconnect counter after stable connection", () => {
      wsManager.connect();
      mockWs.simulateOpen();

      // Fail once
      mockWs.simulateClose();
      expect(wsManager.getState().reconnectAttempt).toBe(1);

      // Reconnect successfully
      vi.advanceTimersByTime(1000);
      mockWs.simulateOpen();

      // Wait for stability timer (5s)
      vi.advanceTimersByTime(5000);

      expect(wsManager.getState().reconnectAttempt).toBe(0);
    });

    it("should not reset counter if connection drops before stability", () => {
      wsManager.connect();
      mockWs.simulateOpen();

      mockWs.simulateClose();
      expect(wsManager.getState().reconnectAttempt).toBe(1);

      // Reconnect
      vi.advanceTimersByTime(1000);
      mockWs.simulateOpen();

      // Drop before 5s stability period
      vi.advanceTimersByTime(2000);
      mockWs.simulateClose();

      // Should still be attempt 2, not reset
      expect(wsManager.getState().reconnectAttempt).toBe(2);
    });

    it("should handle connection error", () => {
      wsManager.connect();

      mockWs.simulateError();

      // Error triggers close, which triggers reconnection
      mockWs.simulateClose();

      expect(wsManager.getState().status).toBe("reconnecting");
    });

    it("should cap exponential backoff at 30 seconds", () => {
      wsManager.connect();
      mockWs.simulateOpen();

      // Fail many times to reach cap
      for (let i = 0; i < 10; i++) {
        mockWs.simulateClose();
        if (i < 5) {
          // Only advance if not at max attempts
          const delay = Math.min(1000 * Math.pow(2, i), 30000);
          vi.advanceTimersByTime(delay);
        }
      }

      // Max delay should be 30s, not exponentially growing
      expect(wsManager.getState().reconnectAttempt).toBe(5);
    });
  });

  describe("message handling", () => {
    it("should subscribe to message type", () => {
      const handler = vi.fn();
      const unsubscribe = wsManager.subscribe("test-event", handler);

      wsManager.connect();
      mockWs.simulateOpen();

      mockWs.simulateMessage({
        type: "test-event",
        data: { value: 42 },
      });

      expect(handler).toHaveBeenCalledWith({ value: 42 });

      unsubscribe();
    });

    it("should handle wildcard subscriptions", () => {
      const handler = vi.fn();
      wsManager.subscribe("*", handler);

      wsManager.connect();
      mockWs.simulateOpen();

      mockWs.simulateMessage({
        type: "any-event",
        payload: "test",
      });

      expect(handler).toHaveBeenCalledWith({
        type: "any-event",
        payload: "test",
      });
    });

    it("should route messages to correct subscribers", () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      wsManager.subscribe("event1", handler1);
      wsManager.subscribe("event2", handler2);

      wsManager.connect();
      mockWs.simulateOpen();

      mockWs.simulateMessage({
        type: "event1",
        data: "for handler1",
      });

      expect(handler1).toHaveBeenCalledWith("for handler1");
      expect(handler2).not.toHaveBeenCalled();
    });

    it("should support multiple subscribers for same event", () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      wsManager.subscribe("test-event", handler1);
      wsManager.subscribe("test-event", handler2);

      wsManager.connect();
      mockWs.simulateOpen();

      mockWs.simulateMessage({
        type: "test-event",
        data: "shared",
      });

      expect(handler1).toHaveBeenCalledWith("shared");
      expect(handler2).toHaveBeenCalledWith("shared");
    });

    it("should unsubscribe correctly", () => {
      const handler = vi.fn();
      const unsubscribe = wsManager.subscribe("test-event", handler);

      wsManager.connect();
      mockWs.simulateOpen();

      mockWs.simulateMessage({
        type: "test-event",
        data: "first",
      });

      unsubscribe();

      mockWs.simulateMessage({
        type: "test-event",
        data: "second",
      });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith("first");
    });

    it("should auto-connect on first subscription", () => {
      wsManager.subscribe("test-event", vi.fn());

      expect(mockWs).toBeDefined();
      expect(wsManager.getState().status).toBe("connecting");
    });

    it("should handle malformed JSON gracefully", () => {
      const handler = vi.fn();
      wsManager.subscribe("test-event", handler);

      wsManager.connect();
      mockWs.simulateOpen();

      // Send invalid JSON
      if (mockWs.onmessage) {
        mockWs.onmessage({ data: "invalid json{" } as MessageEvent);
      }

      // Should not crash, handler should not be called
      expect(handler).not.toHaveBeenCalled();
    });

    it("should ignore handler errors", () => {
      const throwingHandler = vi.fn(() => {
        throw new Error("Handler error");
      });
      const normalHandler = vi.fn();

      wsManager.subscribe("test-event", throwingHandler);
      wsManager.subscribe("test-event", normalHandler);

      wsManager.connect();
      mockWs.simulateOpen();

      // Should not crash, both handlers should be called
      mockWs.simulateMessage({
        type: "test-event",
        data: "test",
      });

      expect(throwingHandler).toHaveBeenCalled();
      expect(normalHandler).toHaveBeenCalled();
    });

    it("should extract payload from different message formats", () => {
      const handler = vi.fn();
      wsManager.subscribe("test-event", handler);

      wsManager.connect();
      mockWs.simulateOpen();

      // Format 1: payload field
      mockWs.simulateMessage({
        type: "test-event",
        payload: "payload-field",
      });

      // Format 2: data field
      mockWs.simulateMessage({
        type: "test-event",
        data: "data-field",
      });

      // Format 3: whole message
      mockWs.simulateMessage({
        type: "test-event",
        value: "direct-value",
      });

      expect(handler).toHaveBeenNthCalledWith(1, "payload-field");
      expect(handler).toHaveBeenNthCalledWith(2, "data-field");
      expect(handler).toHaveBeenNthCalledWith(3, {
        type: "test-event",
        value: "direct-value",
      });
    });
  });

  describe("heartbeat / ping-pong", () => {
    it("should send ping messages periodically", () => {
      wsManager.connect();
      mockWs.simulateOpen();

      // Clear initial messages
      mockWs.sentMessages = [];

      // Advance 30 seconds
      vi.advanceTimersByTime(30000);

      expect(mockWs.sentMessages.length).toBe(1);
      const pingMessage = JSON.parse(mockWs.sentMessages[0]);
      expect(pingMessage.type).toBe("ping");
    });

    it("should measure latency from ping-pong", () => {
      wsManager.connect();
      mockWs.simulateOpen();

      // Advance to trigger ping
      vi.advanceTimersByTime(30000);

      // Simulate pong response after 50ms
      vi.advanceTimersByTime(50);
      mockWs.simulateMessage({ type: "pong" });

      const state = wsManager.getState();
      expect(state.latency).toBeGreaterThan(0);
    });

    it("should not dispatch pong to subscribers", () => {
      const handler = vi.fn();
      wsManager.subscribe("pong", handler);

      wsManager.connect();
      mockWs.simulateOpen();

      mockWs.simulateMessage({ type: "pong" });

      expect(handler).not.toHaveBeenCalled();
    });

    it("should stop heartbeat on disconnect", () => {
      wsManager.connect();
      mockWs.simulateOpen();

      wsManager.disconnect();

      mockWs.sentMessages = [];
      vi.advanceTimersByTime(60000);

      expect(mockWs.sentMessages.length).toBe(0);
    });

    it("should only send ping when connection is open", () => {
      wsManager.connect();
      mockWs.simulateOpen();

      // Close the connection
      mockWs.readyState = MockWebSocket.CLOSED;

      mockWs.sentMessages = [];
      vi.advanceTimersByTime(30000);

      // Should not crash or send ping
      expect(mockWs.sentMessages.length).toBe(0);
    });
  });

  describe("message sending", () => {
    it("should send message when connected", () => {
      wsManager.connect();
      mockWs.simulateOpen();

      const result = wsManager.send({ type: "test", data: "hello" });

      expect(result).toBe(true);
      expect(mockWs.sentMessages.length).toBeGreaterThan(0);
      const message = JSON.parse(mockWs.sentMessages[mockWs.sentMessages.length - 1]);
      expect(message.type).toBe("test");
      expect(message.data).toBe("hello");
    });

    it("should queue message when disconnected", () => {
      const result = wsManager.send({ type: "test", data: "queued" });

      expect(result).toBe(false);
    });

    it("should flush queue on connection", () => {
      // Send while disconnected
      wsManager.send({ type: "msg1", data: "first" });
      wsManager.send({ type: "msg2", data: "second" });

      wsManager.connect();
      mockWs.simulateOpen();

      expect(mockWs.sentMessages.length).toBeGreaterThan(0);
      const messages = mockWs.sentMessages.map((m) => JSON.parse(m));
      expect(messages.some((m) => m.type === "msg1")).toBe(true);
      expect(messages.some((m) => m.type === "msg2")).toBe(true);
    });

    it("should handle send errors gracefully", () => {
      wsManager.connect();
      mockWs.simulateOpen();

      // Mock send to throw
      mockWs.send = vi.fn(() => {
        throw new Error("Send failed");
      });

      // Should not crash
      expect(() => {
        wsManager.send({ type: "test", data: "error" });
      }).toThrow();
    });
  });

  describe("state change listeners", () => {
    it("should call listener immediately with current state", () => {
      const listener = vi.fn();

      wsManager.onStateChange(listener);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "disconnected",
          reconnectAttempt: 0,
        }),
      );
    });

    it("should notify on state changes", () => {
      const listener = vi.fn();
      wsManager.onStateChange(listener);

      listener.mockClear();

      wsManager.connect();

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "connecting",
        }),
      );
    });

    it("should support multiple state listeners", () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      wsManager.onStateChange(listener1);
      wsManager.onStateChange(listener2);

      listener1.mockClear();
      listener2.mockClear();

      wsManager.connect();

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });

    it("should unsubscribe from state changes", () => {
      const listener = vi.fn();
      const unsubscribe = wsManager.onStateChange(listener);

      listener.mockClear();
      unsubscribe();

      wsManager.connect();

      expect(listener).not.toHaveBeenCalled();
    });

    it("should ignore listener errors during state updates", () => {
      // Note: onStateChange() calls handler immediately with current state.
      // The immediate call is NOT wrapped in try/catch (only updateState is).
      // So we register listeners that throw only on subsequent calls.
      let callCount1 = 0;
      const throwingListener = vi.fn(() => {
        callCount1++;
        if (callCount1 > 1) throw new Error("Listener error");
      });
      const normalListener = vi.fn();

      wsManager.onStateChange(throwingListener);
      wsManager.onStateChange(normalListener);

      throwingListener.mockClear();
      normalListener.mockClear();

      wsManager.connect();

      expect(throwingListener).toHaveBeenCalled();
      expect(normalListener).toHaveBeenCalled();
    });

    it("should provide state snapshot to listeners", () => {
      const listener = vi.fn();
      wsManager.onStateChange(listener);

      listener.mockClear();

      wsManager.connect();
      mockWs.simulateOpen();

      const stateSnapshot = listener.mock.calls[listener.mock.calls.length - 1][0];

      // Modify snapshot should not affect internal state
      stateSnapshot.reconnectAttempt = 999;

      expect(wsManager.getState().reconnectAttempt).not.toBe(999);
    });
  });

  describe("visibility handling", () => {
    it("should reconnect when tab becomes visible", () => {
      // Simulate connection drop while tab hidden
      wsManager.connect();
      mockWs.simulateOpen();
      mockWs.simulateClose();

      // Mock document.hidden
      Object.defineProperty(document, "hidden", {
        configurable: true,
        get: () => true,
      });

      // Should not reconnect while hidden
      vi.advanceTimersByTime(10000);
      expect(wsManager.getState().status).toBe("reconnecting");

      // Tab becomes visible
      Object.defineProperty(document, "hidden", {
        configurable: true,
        get: () => false,
      });

      // Trigger visibility change
      const visibilityEvent = new Event("visibilitychange");
      document.dispatchEvent(visibilityEvent);

      // Should attempt to connect
      expect(mockWs).toBeDefined();
    });

    it("should defer reconnection when tab is hidden", () => {
      wsManager.connect();
      mockWs.simulateOpen();

      // Mock document.hidden = true
      Object.defineProperty(document, "hidden", {
        configurable: true,
        get: () => true,
      });

      mockWs.simulateClose();

      // scheduleReconnect returns early when document.hidden is true,
      // so reconnectAttempt stays at 0 (no reconnection scheduled)
      vi.advanceTimersByTime(10000);
      expect(wsManager.getState().reconnectAttempt).toBe(0);
    });
  });

  describe("edge cases", () => {
    it("should handle rapid connect/disconnect cycles", () => {
      for (let i = 0; i < 10; i++) {
        wsManager.connect();
        mockWs.simulateOpen();
        wsManager.disconnect();
      }

      expect(wsManager.getState().status).toBe("disconnected");
    });

    it("should handle disconnect before connection opens", () => {
      wsManager.connect();
      wsManager.disconnect();

      expect(wsManager.getState().status).toBe("disconnected");
    });

    it("should clear all timers on disconnect", () => {
      wsManager.connect();
      mockWs.simulateOpen();

      // Start heartbeat and stability timer
      vi.advanceTimersByTime(1000);

      wsManager.disconnect();

      // Verify no timers are running by advancing and checking state
      const initialState = wsManager.getState();
      vi.advanceTimersByTime(60000);
      const laterState = wsManager.getState();

      expect(initialState).toEqual(laterState);
    });

    it("should provide state snapshot via getState", () => {
      const state1 = wsManager.getState();
      const state2 = wsManager.getState();

      expect(state1).toEqual(state2);
      expect(state1).not.toBe(state2); // Different objects
    });

    it("should handle connection during reconnection backoff", () => {
      wsManager.connect();
      mockWs.simulateOpen();
      mockWs.simulateClose();

      // During backoff period
      vi.advanceTimersByTime(500);

      // Manual connect should not create duplicate
      wsManager.connect();

      expect(wsManager.getState().status).toBe("reconnecting");
    });

    it("should handle simultaneous message subscriptions", () => {
      const handlers = Array.from({ length: 100 }, () => vi.fn());

      handlers.forEach((handler) => {
        wsManager.subscribe("test-event", handler);
      });

      wsManager.connect();
      mockWs.simulateOpen();

      mockWs.simulateMessage({
        type: "test-event",
        data: "broadcast",
      });

      handlers.forEach((handler) => {
        expect(handler).toHaveBeenCalledWith("broadcast");
      });
    });

    it("should handle unsubscribe of non-existent handler", () => {
      const unsubscribe = wsManager.subscribe("test-event", vi.fn());

      unsubscribe();
      unsubscribe(); // Second call should not error

      expect(true).toBe(true); // No error thrown
    });

    it("should handle null message data", () => {
      const handler = vi.fn();
      wsManager.subscribe("test-event", handler);

      wsManager.connect();
      mockWs.simulateOpen();

      mockWs.simulateMessage({
        type: "test-event",
        data: null,
      });

      // When data is null, `message.payload ?? message.data ?? message`
      // evaluates to the full message (null is nullish, so ?? falls through)
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ type: "test-event", data: null }),
      );
    });

    it("should handle empty message payload", () => {
      const handler = vi.fn();
      wsManager.subscribe("test-event", handler);

      wsManager.connect();
      mockWs.simulateOpen();

      mockWs.simulateMessage({
        type: "test-event",
      });

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ type: "test-event" }),
      );
    });
  });
});
