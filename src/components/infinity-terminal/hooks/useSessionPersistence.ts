/**
 * Session Persistence Hook for Infinity Terminal
 * Manages persistent terminal sessions with Zellij + ttyd
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { logger } from "../../../utils/browser-logger";

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
  authToken?: string;
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
  const stabilityTimerRef = useRef<NodeJS.Timeout | null>(null);
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
  const getWsUrl = useCallback((sessionId?: string, authToken?: string) => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const base = `${protocol}//${config.wsHost}:${config.wsPort}${config.wsPath}`;
    const params = new URLSearchParams();
    if (sessionId) {
      params.set("sessionId", sessionId);
    }
    if (authToken) {
      params.set("token", authToken);
    }
    const queryString = params.toString();
    return queryString ? `${base}?${queryString}` : base;
  }, [config.wsHost, config.wsPort, config.wsPath]);

  // Alias for backward compatibility
  const getTtydUrl = getWsUrl;

  // Fetch a bootstrap auth token for new terminal sessions
  const fetchBootstrapToken = useCallback(async (): Promise<string | null> => {
    try {
      const res = await fetch("/api/ws-token", { method: "POST" });
      if (!res.ok) return null;
      const body = await res.json();
      return body?.data?.token ?? null;
    } catch {
      logger.debug("[InfinityTerminal] Failed to fetch auth token");
      return null;
    }
  }, []);

  // Connect to terminal - reuses existing session if available
  const connect = useCallback(() => {
    if (
      wsRef.current?.readyState === WebSocket.CONNECTING ||
      wsRef.current?.readyState === WebSocket.OPEN
    ) {
      return;
    }

    // Check if we've exceeded max reconnect attempts
    if (reconnectAttemptsRef.current >= config.maxReconnectAttempts) {
      setState((prev) => ({
        ...prev,
        error: "Terminal service unavailable. Is the API server running? (npm run dev)",
        connecting: false,
      }));
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
    const storedAuthToken = existingSession?.authToken;

    // For new sessions (no stored token), fetch a bootstrap token first
    const tokenPromise = storedAuthToken
      ? Promise.resolve(storedAuthToken)
      : fetchBootstrapToken();

    tokenPromise.then((authToken) => {
      // Abort if disconnect was called during token fetch
      if (isManualDisconnectRef.current) return;

      // Pass sessionId and token to backend so it can reattach to existing PTY
      const url = getWsUrl(sessionId, authToken ?? undefined);

      if (reconnectAttemptsRef.current > 0) {
        logger.debug(
          `[InfinityTerminal] Reconnecting (attempt ${reconnectAttemptsRef.current + 1}/${config.maxReconnectAttempts})`,
        );
      }

      try {
        const ws = new WebSocket(url);

        ws.binaryType = "arraybuffer";

        ws.onopen = () => {
          // Don't reset reconnect counter immediately — wait for connection to be stable.
          // If server rejects us (e.g. origin check), the connection opens then closes instantly.
          // Resetting on open would create an infinite reconnect loop.
          if (stabilityTimerRef.current) clearTimeout(stabilityTimerRef.current);
          stabilityTimerRef.current = setTimeout(() => {
            reconnectAttemptsRef.current = 0;
            setState((prev) => ({ ...prev, reconnectAttempts: 0 }));
          }, 3000);

          setState((prev) => ({
            ...prev,
            sessionId,
            sessionName,
            connected: true,
            connecting: false,
            error: null,
          }));

          onConnectionChangeRef.current?.(true);
        };

        ws.onclose = (event) => {
          // Cancel stability timer — connection wasn't stable
          if (stabilityTimerRef.current) {
            clearTimeout(stabilityTimerRef.current);
            stabilityTimerRef.current = null;
          }

          setState((prev) => ({ ...prev, connected: false, connecting: false }));
          onConnectionChangeRef.current?.(false);

          // Don't auto-reconnect if manually disconnected
          if (isManualDisconnectRef.current) {
            return;
          }

          // Increment attempts BEFORE the check (not inside setTimeout)
          reconnectAttemptsRef.current += 1;
          setState((prev) => ({
            ...prev,
            reconnectAttempts: reconnectAttemptsRef.current,
          }));

          // Auto-reconnect if enabled and under max attempts
          if (
            config.autoReconnect &&
            reconnectAttemptsRef.current < config.maxReconnectAttempts
          ) {
            const delay =
              config.reconnectDelay * Math.pow(2, reconnectAttemptsRef.current - 1);

            reconnectTimeoutRef.current = setTimeout(() => {
              connect();
            }, delay);
          } else {
            const errorMsg = event.code === 1005
              ? "Terminal connection rejected. Restart the API server."
              : "Terminal service unavailable. Is the API server running? (npm run dev)";
            setState((prev) => ({ ...prev, error: errorMsg }));
          }
        };

        ws.onerror = () => {
          // Don't log or set error here — onclose handles state and reconnection.
          // Logging WebSocket errors just adds noise since the error object is opaque.
        };

        wsRef.current = ws;
      } catch (error) {
        const errorMsg = `Failed to connect: ${error}`;
        setState((prev) => ({ ...prev, error: errorMsg, connecting: false }));
        onErrorRef.current?.(errorMsg);
      }
    }); // close tokenPromise.then()
  }, [
    generateSessionName,
    generateSessionId,
    getStoredSessions,
    getWsUrl,
    fetchBootstrapToken,
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
    if (stabilityTimerRef.current) {
      clearTimeout(stabilityTimerRef.current);
      stabilityTimerRef.current = null;
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
        logger.debug(`[InfinityTerminal] Restoring session: ${sessionName} (id: ${session.sessionId})`);

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
      if (stabilityTimerRef.current) {
        clearTimeout(stabilityTimerRef.current);
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
