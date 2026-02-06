/**
 * useRealtimeConnection Hook
 * Thin wrapper around the shared wsManager singleton.
 * Provides React-friendly API with connection state and message handling.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  wsManager,
  type WSConnectionState,
  type ConnectionStatus,
} from "../services/ws-manager";

interface WebSocketConfig {
  url?: string; // Ignored - wsManager handles URL
  reconnectDelay?: number; // Ignored - wsManager handles reconnection
  maxReconnectAttempts?: number; // Ignored - wsManager handles reconnection
  heartbeatInterval?: number; // Ignored - wsManager handles heartbeat
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  onReconnect?: (attempt: number) => void;
}

interface ConnectionState {
  status: ConnectionStatus;
  lastConnected?: Date;
  reconnectAttempt: number;
  latency: number;
}

export const useRealtimeConnection = <T = any>(config: WebSocketConfig) => {
  const { onOpen, onClose, onReconnect } = config;

  const [connectionState, setConnectionState] = useState<ConnectionState>({
    status: "disconnected",
    reconnectAttempt: 0,
    latency: 0,
  });

  const [messages, setMessages] = useState<T[]>([]);

  // Store callbacks in refs to avoid dependency issues
  const onOpenRef = useRef(onOpen);
  const onCloseRef = useRef(onClose);
  const onReconnectRef = useRef(onReconnect);
  const prevStatusRef = useRef<ConnectionStatus>("disconnected");

  useEffect(() => {
    onOpenRef.current = onOpen;
  }, [onOpen]);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    onReconnectRef.current = onReconnect;
  }, [onReconnect]);

  // Subscribe to wsManager state changes and messages
  useEffect(() => {
    // State change listener
    const unsubState = wsManager.onStateChange((state: WSConnectionState) => {
      const newStatus = state.status;
      const oldStatus = prevStatusRef.current;

      setConnectionState({
        status: state.status,
        lastConnected: state.lastConnected,
        reconnectAttempt: state.reconnectAttempt,
        latency: state.latency,
      });

      // Fire callbacks on transitions
      if (newStatus === "connected" && oldStatus !== "connected") {
        onOpenRef.current?.();
      } else if (
        newStatus === "disconnected" &&
        oldStatus === "connected"
      ) {
        onCloseRef.current?.();
      } else if (newStatus === "reconnecting" && oldStatus !== "reconnecting") {
        onReconnectRef.current?.(state.reconnectAttempt);
      }

      prevStatusRef.current = newStatus;
    });

    // Subscribe to all messages for the messages array
    const unsubMessages = wsManager.subscribe("*", (msg: unknown) => {
      setMessages((prev) => [...prev, msg as T]);
    });

    return () => {
      unsubState();
      unsubMessages();
    };
  }, []);

  const sendMessage = useCallback((message: Record<string, unknown>) => {
    return wsManager.send(message);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const connect = useCallback(() => {
    wsManager.connect();
  }, []);

  const disconnect = useCallback(() => {
    wsManager.disconnect();
  }, []);

  return {
    connectionState,
    messages,
    sendMessage,
    clearMessages,
    connect,
    disconnect,
    isConnected: connectionState.status === "connected",
    isReconnecting: connectionState.status === "reconnecting",
  };
};

// Hook for optimistic updates with rollback
export const useOptimisticUpdate = <T>(
  initialValue: T,
  updateFn: (value: T) => Promise<T>,
) => {
  const [value, setValue] = useState(initialValue);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const previousValueRef = useRef(initialValue);

  const update = useCallback(
    async (newValue: T | ((prev: T) => T)) => {
      const nextValue =
        typeof newValue === "function"
          ? (newValue as (prev: T) => T)(value)
          : newValue;

      previousValueRef.current = value;
      setValue(nextValue);
      setIsUpdating(true);
      setError(null);

      try {
        const result = await updateFn(nextValue);
        setValue(result);
        return result;
      } catch (err) {
        setValue(previousValueRef.current);
        setError(err as Error);
        throw err;
      } finally {
        setIsUpdating(false);
      }
    },
    [value, updateFn],
  );

  const reset = useCallback(() => {
    setValue(initialValue);
    setError(null);
  }, [initialValue]);

  return {
    value,
    update,
    reset,
    isUpdating,
    error,
    rollback: () => setValue(previousValueRef.current),
  };
};

// Hook for adaptive polling
export const useAdaptivePolling = (
  fetchFn: () => Promise<void>,
  options: {
    baseInterval?: number;
    maxInterval?: number;
    enabled?: boolean;
    onError?: (error: Error) => void;
  } = {},
) => {
  const {
    baseInterval = 1000,
    maxInterval = 30000,
    enabled = true,
    onError,
  } = options;

  const [isPolling, setIsPolling] = useState(false);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const [errorCount, setErrorCount] = useState(0);

  const intervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const currentIntervalRef = useRef(baseInterval);

  const fetchFnRef = useRef(fetchFn);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    fetchFnRef.current = fetchFn;
  }, [fetchFn]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const adjustInterval = useCallback(
    (success: boolean) => {
      if (success) {
        currentIntervalRef.current = baseInterval;
        setErrorCount(0);
      } else {
        currentIntervalRef.current = Math.min(
          currentIntervalRef.current * 2,
          maxInterval,
        );
        setErrorCount((prev) => prev + 1);
      }
    },
    [baseInterval, maxInterval],
  );

  const poll = useCallback(async () => {
    setIsPolling(true);
    try {
      await fetchFnRef.current();
      setLastFetch(new Date());
      adjustInterval(true);
    } catch (error) {
      adjustInterval(false);
      onErrorRef.current?.(error as Error);
    } finally {
      setIsPolling(false);
    }

    intervalRef.current = setTimeout(poll, currentIntervalRef.current);
  }, [adjustInterval]);

  useEffect(() => {
    if (enabled) {
      poll();
    }

    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
      }
    };
  }, [enabled, poll]);

  return {
    isPolling,
    lastFetch,
    errorCount,
    currentInterval: currentIntervalRef.current,
    forceRefresh: poll,
  };
};
