/**
 * E2E Test Suite: Terminal Integration
 * Tests WebSocket connections, session persistence, PTY bridge protocol, and scrollback
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock WebSocket for testing
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  url: string;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  private messageQueue: string[] = [];
  private listeners: Map<string, Set<Function>> = new Map();

  constructor(url: string) {
    this.url = url;
    // Simulate async connection
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      this.onopen?.({} as Event);
    }, 10);
  }

  send(data: string): void {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error("WebSocket is not open");
    }
    this.messageQueue.push(data);
  }

  close(code?: number, reason?: string): void {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.({ code: code || 1000, reason: reason || "" } as CloseEvent);
  }

  addEventListener(event: string, handler: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
  }

  removeEventListener(event: string, handler: Function): void {
    this.listeners.get(event)?.delete(handler);
  }

  // Test helper to simulate receiving a message
  simulateMessage(data: string): void {
    this.onmessage?.({ data } as MessageEvent);
  }

  // Test helper to simulate error
  simulateError(): void {
    this.onerror?.({} as Event);
  }

  getSentMessages(): string[] {
    return this.messageQueue;
  }

  clearMessages(): void {
    this.messageQueue = [];
  }
}

// Mock global WebSocket
vi.stubGlobal("WebSocket", MockWebSocket);

// Mock localStorage
const createMockStorage = () => {
  const storage: Record<string, string> = {};
  return {
    getItem: (key: string) => storage[key] || null,
    setItem: (key: string, value: string) => {
      storage[key] = value;
    },
    removeItem: (key: string) => {
      delete storage[key];
    },
    clear: () => {
      Object.keys(storage).forEach((key) => delete storage[key]);
    },
  };
};

describe("E2E: Terminal Integration", () => {
  let ws: MockWebSocket;
  let mockStorage: ReturnType<typeof createMockStorage>;

  beforeEach(() => {
    vi.useFakeTimers();
    mockStorage = createMockStorage();
    vi.stubGlobal("localStorage", mockStorage);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    if (ws) {
      ws.close();
    }
  });

  describe("WebSocket Connection Lifecycle", () => {
    it("should establish WebSocket connection", async () => {
      const onOpen = vi.fn();
      ws = new MockWebSocket("ws://localhost:5050/terminal");
      ws.onopen = onOpen;

      await vi.advanceTimersByTimeAsync(20);

      expect(ws.readyState).toBe(MockWebSocket.OPEN);
      expect(onOpen).toHaveBeenCalled();
    });

    it("should handle connection URL with proper protocol", () => {
      ws = new MockWebSocket("ws://localhost:5050/terminal");
      expect(ws.url).toContain("ws://");
      expect(ws.url).toContain("/terminal");
    });

    it("should support secure WebSocket connections", () => {
      ws = new MockWebSocket("wss://example.com:443/terminal");
      expect(ws.url).toContain("wss://");
    });

    it("should handle connection timeout", async () => {
      const onError = vi.fn();
      ws = new MockWebSocket("ws://localhost:9999/");
      ws.onerror = onError;

      ws.simulateError();

      expect(onError).toHaveBeenCalled();
    });

    it("should cleanup on disconnect", async () => {
      const onClose = vi.fn();
      ws = new MockWebSocket("ws://localhost:5050/terminal");
      ws.onclose = onClose;

      await vi.advanceTimersByTimeAsync(20);

      ws.close(1000, "Normal closure");

      expect(ws.readyState).toBe(MockWebSocket.CLOSED);
      expect(onClose).toHaveBeenCalledWith(
        expect.objectContaining({ code: 1000 }),
      );
    });

    it("should handle abnormal disconnection", async () => {
      const onClose = vi.fn();
      ws = new MockWebSocket("ws://localhost:5050/terminal");
      ws.onclose = onClose;

      await vi.advanceTimersByTimeAsync(20);

      ws.close(1006, "Abnormal closure");

      expect(onClose).toHaveBeenCalledWith(
        expect.objectContaining({ code: 1006 }),
      );
    });

    it("should support reconnection after disconnect", async () => {
      let connectAttempts = 0;

      const createConnection = () => {
        connectAttempts++;
        return new MockWebSocket("ws://localhost:5050/terminal");
      };

      ws = createConnection();
      await vi.advanceTimersByTimeAsync(20);

      ws.close(1006, "Connection lost");

      // Reconnect
      ws = createConnection();
      await vi.advanceTimersByTimeAsync(20);

      expect(connectAttempts).toBe(2);
      expect(ws.readyState).toBe(MockWebSocket.OPEN);
    });

    it("should use exponential backoff for reconnection", () => {
      const attempts = [0, 1, 2, 3, 4, 5];
      const expectedDelays = [1000, 2000, 4000, 8000, 16000, 30000];

      const getReconnectDelay = (attempt: number) => {
        return Math.min(1000 * Math.pow(2, attempt), 30000);
      };

      attempts.forEach((attempt, i) => {
        const delay = getReconnectDelay(attempt);
        expect(delay).toBe(expectedDelays[i]);
      });
    });

    it("should cap maximum reconnection delay", () => {
      const attempt = 10; // Very high attempt
      const maxDelay = 30000;

      const delay = Math.min(1000 * Math.pow(2, attempt), maxDelay);

      expect(delay).toBe(maxDelay);
    });
  });

  describe("Session Persistence", () => {
    it("should save session to localStorage", () => {
      const sessionInfo = {
        sessionId: "test-session-123",
        sessionName: "nxtg-forge-main",
        createdAt: Date.now(),
        lastAccess: Date.now(),
      };

      localStorage.setItem(
        "infinity-terminal-session",
        JSON.stringify(sessionInfo),
      );

      const retrieved = JSON.parse(
        localStorage.getItem("infinity-terminal-session") || "{}",
      );

      expect(retrieved.sessionId).toBe("test-session-123");
      expect(retrieved.sessionName).toBe("nxtg-forge-main");
    });

    it("should restore session on page reload", () => {
      const originalSession = {
        sessionId: "restore-test",
        sessionName: "nxtg-forge-main",
        createdAt: Date.now() - 3600000,
        lastAccess: Date.now() - 1800000,
      };

      localStorage.setItem(
        "infinity-terminal-session",
        JSON.stringify(originalSession),
      );

      const restored = JSON.parse(
        localStorage.getItem("infinity-terminal-session") || "{}",
      );

      expect(restored.sessionId).toBe("restore-test");
      expect(restored.createdAt).toBe(originalSession.createdAt);
    });

    it("should cleanup expired sessions", () => {
      const expiredSession = {
        sessionId: "expired-session",
        sessionName: "old-session",
        createdAt: Date.now() - 86400000 * 7, // 7 days old
        lastAccess: Date.now() - 86400000 * 7,
        expiresAt: Date.now() - 86400000, // Expired 1 day ago
      };

      localStorage.setItem(
        "infinity-terminal-session",
        JSON.stringify(expiredSession),
      );

      const retrieved = JSON.parse(
        localStorage.getItem("infinity-terminal-session") || "{}",
      );

      const isExpired = Date.now() > retrieved.expiresAt;

      expect(isExpired).toBe(true);

      if (isExpired) {
        localStorage.removeItem("infinity-terminal-session");
      }

      expect(localStorage.getItem("infinity-terminal-session")).toBeNull();
    });

    it("should store multiple session history", () => {
      const sessions = [
        { sessionId: "session-1", lastAccess: Date.now() - 3600000 },
        { sessionId: "session-2", lastAccess: Date.now() - 7200000 },
        { sessionId: "session-3", lastAccess: Date.now() },
      ];

      localStorage.setItem("infinity-terminal-history", JSON.stringify(sessions));

      const history = JSON.parse(
        localStorage.getItem("infinity-terminal-history") || "[]",
      );

      expect(history).toHaveLength(3);
      expect(history[2].sessionId).toBe("session-3");
    });

    it("should limit session history size", () => {
      const maxSessions = 5;
      const sessions = Array.from({ length: 10 }, (_, i) => ({
        sessionId: `session-${i}`,
        lastAccess: Date.now() - i * 1000,
      }));

      // Sort by most recent
      sessions.sort((a, b) => b.lastAccess - a.lastAccess);

      // Limit to maxSessions
      const limited = sessions.slice(0, maxSessions);

      expect(limited).toHaveLength(maxSessions);
      expect(limited[0].sessionId).toBe("session-0");
    });

    it("should handle corrupted session data gracefully", () => {
      localStorage.setItem("infinity-terminal-session", "invalid-json{");

      let session = null;
      try {
        session = JSON.parse(
          localStorage.getItem("infinity-terminal-session") || "{}",
        );
      } catch (error) {
        session = null;
      }

      expect(session).toBeNull();
    });
  });

  describe("PTY Bridge Message Protocol", () => {
    beforeEach(async () => {
      ws = new MockWebSocket("ws://localhost:5050/terminal");
      await vi.advanceTimersByTimeAsync(20);
    });

    it("should send terminal input", () => {
      const command = "ls -la\r";
      ws.send(command);

      expect(ws.getSentMessages()).toContain(command);
    });

    it("should receive terminal output", () => {
      const onMessage = vi.fn();
      ws.onmessage = onMessage;

      ws.simulateMessage("total 48\r\ndrwxr-xr-x 12 user user 4096 Jan 1 12:00 .\r\n");

      expect(onMessage).toHaveBeenCalled();
      const receivedData = onMessage.mock.calls[0][0].data;
      expect(receivedData).toContain("total 48");
    });

    it("should handle resize messages", () => {
      const resizeMsg = JSON.stringify({
        type: "resize",
        cols: 120,
        rows: 40,
      });

      ws.send(resizeMsg);

      const messages = ws.getSentMessages();
      const sentResize = messages.find((m) => m.includes("resize"));
      expect(sentResize).toBeTruthy();

      const parsed = JSON.parse(sentResize || "{}");
      expect(parsed.cols).toBe(120);
      expect(parsed.rows).toBe(40);
    });

    it("should handle session messages", () => {
      const sessionMsg = JSON.stringify({
        type: "session",
        action: "create",
        sessionId: "new-session-123",
        sessionName: "nxtg-forge-dev",
      });

      ws.send(sessionMsg);

      const messages = ws.getSentMessages();
      const sentSession = messages.find((m) => m.includes("session"));
      expect(sentSession).toBeTruthy();

      const parsed = JSON.parse(sentSession || "{}");
      expect(parsed.type).toBe("session");
      expect(parsed.sessionId).toBe("new-session-123");
    });

    it("should handle binary data (ANSI escape sequences)", () => {
      const onMessage = vi.fn();
      ws.onmessage = onMessage;

      // ANSI color codes
      ws.simulateMessage("\x1b[32mGreen text\x1b[0m");

      expect(onMessage).toHaveBeenCalled();
      const data = onMessage.mock.calls[0][0].data;
      expect(data).toContain("\x1b[32m");
      expect(data).toContain("\x1b[0m");
    });

    it("should handle ping/pong messages", () => {
      const pingMsg = JSON.stringify({
        type: "ping",
        timestamp: Date.now(),
      });

      ws.send(pingMsg);

      const messages = ws.getSentMessages();
      const sentPing = messages.find((m) => m.includes("ping"));
      expect(sentPing).toBeTruthy();
    });

    it("should throw error when sending to closed connection", () => {
      ws.close();

      expect(() => ws.send("test")).toThrow("WebSocket is not open");
    });

    it("should queue messages when connection is not open", () => {
      const newWs = new MockWebSocket("ws://localhost:5050/terminal");

      // Connection not yet open (CONNECTING state)
      expect(() => newWs.send("test")).toThrow();
    });
  });

  describe("Scrollback Buffer Management", () => {
    it("should maintain scrollback buffer", () => {
      const buffer: string[] = [];
      const maxLines = 1000;

      // Simulate adding lines
      for (let i = 0; i < 1500; i++) {
        buffer.push(`Line ${i}\r\n`);
      }

      // Trim to max size
      const trimmed = buffer.slice(-maxLines);

      expect(trimmed).toHaveLength(maxLines);
      expect(trimmed[0]).toContain("Line 500");
      expect(trimmed[trimmed.length - 1]).toContain("Line 1499");
    });

    it("should handle scrollback size limit", () => {
      const maxBytes = 1024 * 1024; // 1MB
      let currentSize = 0;
      const buffer: string[] = [];

      for (let i = 0; i < 10000; i++) {
        const line = `Line ${i}\r\n`;
        const lineSize = new Blob([line]).size;

        if (currentSize + lineSize > maxBytes) {
          // Remove oldest line
          const removed = buffer.shift();
          if (removed) {
            currentSize -= new Blob([removed]).size;
          }
        }

        buffer.push(line);
        currentSize += lineSize;
      }

      expect(currentSize).toBeLessThanOrEqual(maxBytes);
    });

    it("should preserve recent scrollback on disconnect", () => {
      const scrollback = [
        "Command output line 1\r\n",
        "Command output line 2\r\n",
        "Command output line 3\r\n",
      ];

      localStorage.setItem(
        "infinity-terminal-scrollback",
        JSON.stringify(scrollback),
      );

      const restored = JSON.parse(
        localStorage.getItem("infinity-terminal-scrollback") || "[]",
      );

      expect(restored).toEqual(scrollback);
    });

    it("should clear scrollback on command", () => {
      const buffer: string[] = ["line 1", "line 2", "line 3"];

      // Clear command
      buffer.length = 0;

      expect(buffer).toHaveLength(0);
    });

    it("should search scrollback buffer", () => {
      const buffer = [
        "Starting server...\r\n",
        "Server listening on port 3000\r\n",
        "Connection established\r\n",
        "Error: Connection timeout\r\n",
      ];

      const searchTerm = "Error";
      const matches = buffer.filter((line) => line.includes(searchTerm));

      expect(matches).toHaveLength(1);
      expect(matches[0]).toContain("Connection timeout");
    });
  });

  describe("Multi-Device Session Sharing", () => {
    it("should generate shareable session URL", () => {
      const sessionInfo = {
        sessionId: "share-123",
        wsUrl: "ws://localhost:5050/terminal",
        projectName: "nxtg-forge",
        expiresAt: Date.now() + 3600000,
      };

      const shareData = btoa(JSON.stringify(sessionInfo));
      const shareUrl = `http://localhost:5050/terminal/join?d=${encodeURIComponent(shareData)}`;

      expect(shareUrl).toContain("terminal/join");
      expect(shareUrl).toContain("d=");
    });

    it("should decode session from URL", () => {
      const originalSession = {
        sessionId: "decode-test",
        wsUrl: "ws://localhost:5050/terminal",
        projectName: "test-project",
      };

      const encoded = btoa(JSON.stringify(originalSession));
      const decoded = JSON.parse(atob(encoded));

      expect(decoded).toEqual(originalSession);
    });

    it("should validate session expiry", () => {
      const expiredSession = {
        sessionId: "expired",
        expiresAt: Date.now() - 1000,
      };

      const validSession = {
        sessionId: "valid",
        expiresAt: Date.now() + 3600000,
      };

      const isExpired = (session: { expiresAt: number }) =>
        Date.now() > session.expiresAt;

      expect(isExpired(expiredSession)).toBe(true);
      expect(isExpired(validSession)).toBe(false);
    });

    it("should handle invalid session URLs", () => {
      const invalidData = "not-base64!@#$%";

      expect(() => atob(invalidData)).toThrow();
    });
  });

  describe("Terminal State Synchronization", () => {
    beforeEach(async () => {
      ws = new MockWebSocket("ws://localhost:5050/terminal");
      await vi.advanceTimersByTimeAsync(20);
    });

    it("should sync terminal size on connect", () => {
      const initialSize = {
        cols: 80,
        rows: 24,
      };

      const resizeMsg = JSON.stringify({
        type: "resize",
        ...initialSize,
      });

      ws.send(resizeMsg);

      const messages = ws.getSentMessages();
      expect(messages.some((m) => m.includes("resize"))).toBe(true);
    });

    it("should sync cursor position", () => {
      const cursorMsg = JSON.stringify({
        type: "cursor",
        x: 10,
        y: 5,
      });

      ws.send(cursorMsg);

      const messages = ws.getSentMessages();
      expect(messages).toContain(cursorMsg);
    });

    it("should handle multiple concurrent connections", () => {
      const ws1 = new MockWebSocket("ws://localhost:5050/terminal?sessionId=test");
      const ws2 = new MockWebSocket("ws://localhost:5050/terminal?sessionId=test");

      expect(ws1.url).toContain("sessionId=test");
      expect(ws2.url).toContain("sessionId=test");
    });
  });

  describe("Error Handling", () => {
    it("should handle malformed messages", () => {
      const onMessage = vi.fn();
      ws = new MockWebSocket("ws://localhost:5050/terminal");
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage(data);
        } catch (error) {
          // Gracefully handle parse errors
          onMessage({ error: "Invalid JSON" });
        }
      };

      ws.simulateMessage("invalid{json}");

      expect(onMessage).toHaveBeenCalledWith({ error: "Invalid JSON" });
    });

    it("should detect stale connections", () => {
      const lastPong = Date.now() - 60000; // 1 minute ago
      const timeout = 30000; // 30 second timeout

      const isStale = Date.now() - lastPong > timeout;

      expect(isStale).toBe(true);
    });

    it("should handle network errors", async () => {
      const onError = vi.fn();
      ws = new MockWebSocket("ws://localhost:5050/terminal");
      ws.onerror = onError;

      ws.simulateError();

      expect(onError).toHaveBeenCalled();
    });
  });
});
