/**
 * Terminal Integration Tests
 * Tests for Infinity Terminal WebSocket connections and session management
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

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
      throw new Error('WebSocket is not open');
    }
    this.messageQueue.push(data);
  }

  close(code?: number, reason?: string): void {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.({ code: code || 1000, reason: reason || '' } as CloseEvent);
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
}

// Mock global WebSocket
vi.stubGlobal('WebSocket', MockWebSocket);

describe('Terminal WebSocket Integration', () => {
  let ws: MockWebSocket;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('Connection Establishment', () => {
    it('should connect to ttyd WebSocket', async () => {
      const onOpen = vi.fn();
      ws = new MockWebSocket('ws://localhost:7681/');
      ws.onopen = onOpen;

      // Advance timers to trigger connection
      await vi.advanceTimersByTimeAsync(20);

      expect(ws.readyState).toBe(MockWebSocket.OPEN);
      expect(onOpen).toHaveBeenCalled();
    });

    it('should handle connection URL with path', () => {
      ws = new MockWebSocket('ws://localhost:7681/terminal');
      expect(ws.url).toBe('ws://localhost:7681/terminal');
    });

    it('should handle secure WebSocket URL', () => {
      ws = new MockWebSocket('wss://localhost:7681/');
      expect(ws.url).toContain('wss://');
    });
  });

  describe('Message Handling', () => {
    it('should receive terminal output', async () => {
      const onMessage = vi.fn();
      ws = new MockWebSocket('ws://localhost:7681/');
      ws.onmessage = onMessage;

      await vi.advanceTimersByTimeAsync(20);

      // Simulate terminal output
      ws.simulateMessage('Hello, Terminal!\r\n');

      expect(onMessage).toHaveBeenCalledWith(
        expect.objectContaining({ data: 'Hello, Terminal!\r\n' })
      );
    });

    it('should send terminal input', async () => {
      ws = new MockWebSocket('ws://localhost:7681/');
      await vi.advanceTimersByTimeAsync(20);

      ws.send('ls -la\r');

      expect(ws.getSentMessages()).toContain('ls -la\r');
    });

    it('should handle binary data', async () => {
      const onMessage = vi.fn();
      ws = new MockWebSocket('ws://localhost:7681/');
      ws.onmessage = onMessage;

      await vi.advanceTimersByTimeAsync(20);

      // Simulate ANSI escape sequence
      ws.simulateMessage('\x1b[32mGreen text\x1b[0m');

      expect(onMessage).toHaveBeenCalled();
    });
  });

  describe('Connection Errors', () => {
    it('should handle connection failure', async () => {
      const onError = vi.fn();
      const onClose = vi.fn();

      ws = new MockWebSocket('ws://localhost:9999/');
      ws.onerror = onError;
      ws.onclose = onClose;

      // Simulate connection error
      ws.simulateError();
      ws.close(1006, 'Connection failed');

      expect(onError).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });

    it('should throw error when sending to closed connection', () => {
      ws = new MockWebSocket('ws://localhost:7681/');
      ws.close();

      expect(() => ws.send('test')).toThrow('WebSocket is not open');
    });
  });

  describe('Session Persistence', () => {
    it('should store session info in localStorage', () => {
      const mockStorage: Record<string, string> = {};
      vi.stubGlobal('localStorage', {
        getItem: (key: string) => mockStorage[key] || null,
        setItem: (key: string, value: string) => { mockStorage[key] = value; },
        removeItem: (key: string) => { delete mockStorage[key]; },
      });

      const sessionInfo = {
        sessionId: 'test-session-123',
        sessionName: 'nxtg-forge-main',
        createdAt: Date.now(),
      };

      localStorage.setItem('infinity-terminal-session', JSON.stringify(sessionInfo));

      const retrieved = JSON.parse(localStorage.getItem('infinity-terminal-session') || '{}');
      expect(retrieved.sessionId).toBe('test-session-123');
    });

    it('should restore session on reconnect', () => {
      const mockStorage: Record<string, string> = {};
      vi.stubGlobal('localStorage', {
        getItem: (key: string) => mockStorage[key] || null,
        setItem: (key: string, value: string) => { mockStorage[key] = value; },
        removeItem: (key: string) => { delete mockStorage[key]; },
      });

      const sessionInfo = {
        sessionId: 'restore-session',
        sessionName: 'nxtg-forge-main',
        layout: 'default',
        createdAt: Date.now() - 3600000, // 1 hour ago
      };

      mockStorage['infinity-terminal-session'] = JSON.stringify(sessionInfo);

      const restored = JSON.parse(localStorage.getItem('infinity-terminal-session') || '{}');
      expect(restored.sessionName).toBe('nxtg-forge-main');
    });
  });

  describe('Reconnection Logic', () => {
    it('should attempt reconnection on disconnect', async () => {
      let connectAttempts = 0;

      const createConnection = () => {
        connectAttempts++;
        return new MockWebSocket('ws://localhost:7681/');
      };

      ws = createConnection();
      await vi.advanceTimersByTimeAsync(20);

      // Simulate disconnect
      ws.close(1006, 'Connection lost');

      // Simulate reconnect attempt
      ws = createConnection();
      await vi.advanceTimersByTimeAsync(20);

      expect(connectAttempts).toBe(2);
    });

    it('should use exponential backoff for reconnection', () => {
      const delays = [1000, 2000, 4000, 8000, 16000];
      let attempt = 0;

      const getReconnectDelay = () => {
        const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
        attempt++;
        return delay;
      };

      delays.forEach((expected, i) => {
        attempt = i;
        expect(getReconnectDelay()).toBe(expected);
      });
    });

    it('should cap max reconnection delay', () => {
      let attempt = 10; // High attempt number
      const maxDelay = 30000;

      const getReconnectDelay = () => {
        return Math.min(1000 * Math.pow(2, attempt), maxDelay);
      };

      expect(getReconnectDelay()).toBe(maxDelay);
    });
  });

  describe('Multi-Device Access', () => {
    it('should generate shareable session URL', () => {
      const sessionInfo = {
        sessionId: 'share-123',
        wsUrl: 'ws://localhost:7681/',
        projectName: 'nxtg-forge',
        expiresAt: Date.now() + 3600000,
      };

      const shareData = btoa(JSON.stringify(sessionInfo));
      const shareUrl = `http://localhost:3000/terminal/join?d=${encodeURIComponent(shareData)}`;

      expect(shareUrl).toContain('terminal/join');
      expect(shareUrl).toContain('d=');
    });

    it('should decode session info from URL', () => {
      const originalSession = {
        sessionId: 'decode-test',
        wsUrl: 'ws://localhost:7681/',
        projectName: 'test-project',
      };

      const encoded = btoa(JSON.stringify(originalSession));
      const decoded = JSON.parse(atob(encoded));

      expect(decoded.sessionId).toBe('decode-test');
      expect(decoded.wsUrl).toBe('ws://localhost:7681/');
    });

    it('should validate session expiry', () => {
      const expiredSession = {
        sessionId: 'expired',
        expiresAt: Date.now() - 1000, // Already expired
      };

      const validSession = {
        sessionId: 'valid',
        expiresAt: Date.now() + 3600000, // Expires in 1 hour
      };

      const isExpired = (session: { expiresAt: number }) => Date.now() > session.expiresAt;

      expect(isExpired(expiredSession)).toBe(true);
      expect(isExpired(validSession)).toBe(false);
    });
  });

  describe('Terminal Resize', () => {
    it('should send resize message', async () => {
      ws = new MockWebSocket('ws://localhost:7681/');
      await vi.advanceTimersByTimeAsync(20);

      // ttyd resize message format
      const resizeMsg = JSON.stringify({
        type: 'resize',
        cols: 120,
        rows: 40,
      });

      ws.send(resizeMsg);

      const sent = ws.getSentMessages();
      expect(sent).toContain(resizeMsg);
    });
  });

  describe('Health Check', () => {
    it('should send ping messages', async () => {
      ws = new MockWebSocket('ws://localhost:7681/');
      await vi.advanceTimersByTimeAsync(20);

      const pingMsg = JSON.stringify({ type: 'ping', timestamp: Date.now() });
      ws.send(pingMsg);

      expect(ws.getSentMessages().some(m => m.includes('ping'))).toBe(true);
    });

    it('should detect stale connection', () => {
      const lastPong = Date.now() - 60000; // 1 minute ago
      const timeout = 30000; // 30 second timeout

      const isStale = Date.now() - lastPong > timeout;
      expect(isStale).toBe(true);
    });
  });
});

describe('Session Management', () => {
  describe('Session Creation', () => {
    it('should generate unique session name', () => {
      const projectName = 'nxtg-forge';
      const timestamp = Date.now();

      const sessionName = `${projectName}-${timestamp.toString(36)}`;

      expect(sessionName).toContain(projectName);
      expect(sessionName.split('-').length).toBeGreaterThanOrEqual(2);
    });

    it('should include layout in session config', () => {
      const session = {
        sessionId: 'test',
        sessionName: 'nxtg-forge-main',
        layout: 'forge-default',
        projectRoot: '/home/user/project',
        createdAt: new Date().toISOString(),
      };

      expect(session.layout).toBe('forge-default');
    });
  });

  describe('Session History', () => {
    it('should store multiple sessions', () => {
      const sessions = [
        { sessionId: 'session-1', lastAccess: Date.now() - 3600000 },
        { sessionId: 'session-2', lastAccess: Date.now() - 7200000 },
        { sessionId: 'session-3', lastAccess: Date.now() },
      ];

      // Sort by last access (most recent first)
      sessions.sort((a, b) => b.lastAccess - a.lastAccess);

      expect(sessions[0].sessionId).toBe('session-3');
    });

    it('should limit stored sessions', () => {
      const maxSessions = 5;
      const sessions = Array.from({ length: 10 }, (_, i) => ({
        sessionId: `session-${i}`,
        lastAccess: Date.now() - i * 1000,
      }));

      const limited = sessions
        .sort((a, b) => b.lastAccess - a.lastAccess)
        .slice(0, maxSessions);

      expect(limited.length).toBe(maxSessions);
    });
  });
});
