/**
 * Session Persistence Hook for Infinity Terminal
 * Manages persistent terminal sessions with Zellij + ttyd
 */

import { useState, useEffect, useCallback, useRef } from "react";

export interface SessionState {
  sessionId: string;
  sessionName: string;
  connected: boolean;
  connecting: boolean;
  error: string | null;
  layout: string;
  projectRoot: string;
  createdAt: Date | null;
  lastActivity: Date | null;
  reconnectAttempts: number;
}

export interface SessionConfig {
  /** WebSocket port for terminal connection */
  wsPort: number;
  /** WebSocket host */
  wsHost: string;
  /** WebSocket path (e.g., '/terminal' for PTY bridge) */
  wsPath: string;
  sessionPrefix: string;
  autoReconnect: boolean;
  maxReconnectAttempts: number;
  reconnectDelay: number; // ms
}

const DEFAULT_CONFIG: SessionConfig = {
  // Use Vite's proxy - connects through current host:port which proxies to API server
  wsPort: typeof window !== 'undefined' ? parseInt(window.location.port) || (window.location.protocol === 'https:' ? 443 : 80) : 5050,
  wsHost: typeof window !== 'undefined' ? window.location.hostname : 'localhost',
  wsPath: "/terminal",
  sessionPrefix: "forge",
  autoReconnect: true,
  maxReconnectAttempts: 3,
  reconnectDelay: 2000,
};

interface UseSessionPersistenceOptions {
  projectName?: string;
  layout?: string;
  config?: Partial<SessionConfig>;
  onSessionRestore?: (sessionId: string) => void;
  onConnectionChange?: (connected: boolean) => void;
  onError?: (error: string) => void;
}

interface StoredSession {
  sessionId: string;
  sessionName: string;
  layout: string;
  projectRoot: string;
  createdAt: string;
  lastAccess: string;
}

const STORAGE_KEY = "infinity-terminal-sessions";

export function useSessionPersistence(
  options: UseSessionPersistenceOptions = {},
) {
  const {
    projectName = "nxtg-forge",
    layout = "default",
    config: userConfig = {},
    onSessionRestore,
    onConnectionChange,
    onError,
  } = options;

  const config = { ...DEFAULT_CONFIG, ...userConfig };

  // Store callbacks in refs to avoid dependency issues causing infinite loops
  const onConnectionChangeRef = useRef(onConnectionChange);
  const onSessionRestoreRef = useRef(onSessionRestore);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onConnectionChangeRef.current = onConnectionChange;
    onSessionRestoreRef.current = onSessionRestore;
    onErrorRef.current = onError;
  });

  const [state, setState] = useState<SessionState>({
    sessionId: "",
    sessionName: "",
    connected: false,
    connecting: false,
    error: null,
    layout,
    projectRoot: "",
    createdAt: null,
    lastActivity: null,
    reconnectAttempts: 0,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isManualDisconnectRef = useRef(false);

  // Generate session name from project
  const generateSessionName = useCallback(() => {
    const sanitized = projectName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    return `${config.sessionPrefix}-${sanitized}`;
  }, [projectName, config.sessionPrefix]);

  // Generate unique session ID
  const generateSessionId = useCallback(() => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Get stored sessions from localStorage
  const getStoredSessions = useCallback((): StoredSession[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, []);

  // Save session to localStorage
  const saveSession = useCallback(
    (session: Partial<StoredSession>) => {
      const sessions = getStoredSessions();
      const existing = sessions.findIndex(
        (s) => s.sessionName === session.sessionName,
      );

      const updated: StoredSession = {
        sessionId: session.sessionId || generateSessionId(),
        sessionName: session.sessionName || generateSessionName(),
        layout: session.layout || layout,
        projectRoot: session.projectRoot || "",
        createdAt: session.createdAt || new Date().toISOString(),
        lastAccess: new Date().toISOString(),
      };

      if (existing >= 0) {
        sessions[existing] = updated;
      } else {
        sessions.push(updated);
      }

      // Keep only last 10 sessions
      const trimmed = sessions.slice(-10);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));

      return updated;
    },
    [getStoredSessions, generateSessionId, generateSessionName, layout],
  );

  // Remove session from localStorage
  const removeSession = useCallback(
    (sessionName: string) => {
      const sessions = getStoredSessions();
      const filtered = sessions.filter((s) => s.sessionName !== sessionName);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    },
    [getStoredSessions],
  );

  // Get terminal WebSocket URL (with optional sessionId for reconnection)
  const getWsUrl = useCallback((sessionId?: string) => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const base = `${protocol}//${config.wsHost}:${config.wsPort}${config.wsPath}`;
    if (sessionId) {
      return `${base}?sessionId=${encodeURIComponent(sessionId)}`;
    }
    return base;
  }, [config.wsHost, config.wsPort, config.wsPath]);

  // Alias for backward compatibility
  const getTtydUrl = getWsUrl;

  // Connect to terminal - reuses existing session if available
  const connect = useCallback(() => {
    if (
      wsRef.current?.readyState === WebSocket.CONNECTING ||
      wsRef.current?.readyState === WebSocket.OPEN
    ) {
      console.log("[InfinityTerminal] Already connected");
      return;
    }

    // Check if we've exceeded max reconnect attempts
    if (reconnectAttemptsRef.current >= config.maxReconnectAttempts) {
      console.log(
        "[InfinityTerminal] Max reconnect attempts reached, stopping",
      );
      const errorMsg =
        "Terminal service unavailable. Is the API server running? (npm run dev)";
      setState((prev) => ({ ...prev, error: errorMsg, connecting: false }));
      return;
    }

    isManualDisconnectRef.current = false;
    setState((prev) => ({ ...prev, connecting: true, error: null }));

    const sessionName = generateSessionName();

    // Check for existing stored session to reconnect to
    const storedSessions = getStoredSessions();
    const existingSession = storedSessions.find(
      (s) => s.sessionName === sessionName,
    );
    const sessionId = existingSession?.sessionId || generateSessionId();

    // Pass sessionId to backend so it can reattach to existing PTY
    const url = getWsUrl(sessionId);

    console.log(
      `[InfinityTerminal] Connecting to ${url} (attempt ${reconnectAttemptsRef.current + 1}/${config.maxReconnectAttempts})${existingSession ? " [reconnecting]" : " [new]"}`,
    );

    try {
      const ws = new WebSocket(url);

      ws.binaryType = "arraybuffer";

      ws.onopen = () => {
        console.log("[InfinityTerminal] Connected");
        reconnectAttemptsRef.current = 0;

        const session = saveSession({
          sessionId,
          sessionName,
          layout,
          projectRoot: window.location.pathname,
        });

        setState((prev) => ({
          ...prev,
          sessionId: session.sessionId,
          sessionName: session.sessionName,
          connected: true,
          connecting: false,
          error: null,
          createdAt: new Date(session.createdAt),
          lastActivity: new Date(),
          reconnectAttempts: 0,
        }));

        onConnectionChangeRef.current?.(true);
      };

      ws.onclose = (event) => {
        console.log(`[InfinityTerminal] Disconnected: ${event.code}`);

        setState((prev) => ({ ...prev, connected: false, connecting: false }));
        onConnectionChangeRef.current?.(false);

        // Don't auto-reconnect if manually disconnected or max attempts reached
        if (isManualDisconnectRef.current) {
          return;
        }

        // Auto-reconnect if enabled and under max attempts
        if (
          config.autoReconnect &&
          reconnectAttemptsRef.current < config.maxReconnectAttempts
        ) {
          const delay =
            config.reconnectDelay * Math.pow(2, reconnectAttemptsRef.current);
          console.log(
            `[InfinityTerminal] Reconnecting in ${delay}ms... (attempt ${reconnectAttemptsRef.current + 1}/${config.maxReconnectAttempts})`,
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current += 1;
            setState((prev) => ({
              ...prev,
              reconnectAttempts: reconnectAttemptsRef.current,
            }));
            connect();
          }, delay);
        } else if (
          reconnectAttemptsRef.current >= config.maxReconnectAttempts
        ) {
          const errorMsg =
            "Terminal service unavailable. Is the API server running? (npm run dev)";
          setState((prev) => ({ ...prev, error: errorMsg }));
        }
      };

      ws.onerror = (error) => {
        console.error("[InfinityTerminal] WebSocket error:", error);
        // Don't set error here - let onclose handle the state
      };

      wsRef.current = ws;
    } catch (error) {
      const errorMsg = `Failed to connect: ${error}`;
      setState((prev) => ({ ...prev, error: errorMsg, connecting: false }));
      onErrorRef.current?.(errorMsg);
    }
  }, [
    generateSessionName,
    generateSessionId,
    getStoredSessions,
    getWsUrl,
    saveSession,
    layout,
    config.autoReconnect,
    config.maxReconnectAttempts,
    config.reconnectDelay,
  ]);

  // Disconnect
  const disconnect = useCallback(() => {
    isManualDisconnectRef.current = true;
    reconnectAttemptsRef.current = 0;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setState((prev) => ({
      ...prev,
      connected: false,
      connecting: false,
      reconnectAttempts: 0,
    }));
  }, []);

  // Reset reconnect counter (allows manual retry)
  const resetReconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    isManualDisconnectRef.current = false;
    setState((prev) => ({ ...prev, reconnectAttempts: 0, error: null }));
  }, []);

  // Restore session - reconnects to existing PTY via stored sessionId
  const restoreSession = useCallback(
    (sessionName: string) => {
      const sessions = getStoredSessions();
      const session = sessions.find((s) => s.sessionName === sessionName);

      if (session) {
        console.log(`[InfinityTerminal] Restoring session: ${sessionName} (id: ${session.sessionId})`);

        setState((prev) => ({
          ...prev,
          sessionId: session.sessionId,
          sessionName: session.sessionName,
          layout: session.layout,
          projectRoot: session.projectRoot,
          createdAt: new Date(session.createdAt),
        }));

        onSessionRestore?.(session.sessionId);
        // connect() will find this session in localStorage and pass sessionId to backend
        connect();
      }
    },
    [getStoredSessions, connect, onSessionRestore],
  );

  // Get available sessions
  const getAvailableSessions = useCallback(() => {
    return getStoredSessions().sort(
      (a, b) =>
        new Date(b.lastAccess).getTime() - new Date(a.lastAccess).getTime(),
    );
  }, [getStoredSessions]);

  // Update last activity timestamp
  const updateActivity = useCallback(() => {
    setState((prev) => ({ ...prev, lastActivity: new Date() }));
  }, []);

  // Cleanup on unmount — close WebSocket to prevent zombie reconnection loops.
  // The PTY session persists on the backend; reconnecting with the stored sessionId restores it.
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      isManualDisconnectRef.current = true;
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  // Expose WebSocket for terminal component
  const getWebSocket = useCallback(() => wsRef.current, []);

  return {
    state,
    config,
    connect,
    disconnect,
    resetReconnect,
    restoreSession,
    removeSession,
    getAvailableSessions,
    updateActivity,
    getWebSocket,
    getWsUrl,
    getTtydUrl, // Alias for backward compatibility
  };
}

export type UseSessionPersistenceReturn = ReturnType<
  typeof useSessionPersistence
>;
