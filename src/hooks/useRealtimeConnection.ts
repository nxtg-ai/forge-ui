import { useState, useEffect, useCallback, useRef } from "react";

interface WebSocketConfig {
  url: string;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  onReconnect?: (attempt: number) => void;
}

interface ConnectionState {
  status:
    | "connecting"
    | "connected"
    | "disconnected"
    | "reconnecting"
    | "error";
  lastConnected?: Date;
  reconnectAttempt: number;
  latency: number;
}

export const useRealtimeConnection = <T = any>(config: WebSocketConfig) => {
  const {
    url,
    reconnectDelay = 5000,
    maxReconnectAttempts = 5,
    heartbeatInterval = 30000,
    onOpen,
    onClose,
    onError,
    onReconnect,
  } = config;

  const [connectionState, setConnectionState] = useState<ConnectionState>({
    status: "disconnected",
    reconnectAttempt: 0,
    latency: 0,
  });

  const [messages, setMessages] = useState<T[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const pingTimestampRef = useRef<number>(0);

  // Store callbacks in refs to avoid dependency issues
  const onOpenRef = useRef(onOpen);
  const onCloseRef = useRef(onClose);
  const onErrorRef = useRef(onError);
  const onReconnectRef = useRef(onReconnect);

  useEffect(() => {
    onOpenRef.current = onOpen;
  }, [onOpen]);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);
  useEffect(() => {
    onReconnectRef.current = onReconnect;
  }, [onReconnect]);

  // Exponential backoff for reconnection
  const getReconnectDelay = (attempt: number) => {
    return Math.min(reconnectDelay * Math.pow(2, attempt), 30000);
  };

  // Heartbeat/ping mechanism
  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    heartbeatIntervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        pingTimestampRef.current = Date.now();
        wsRef.current.send(JSON.stringify({ type: "ping" }));
      }
    }, heartbeatInterval);
  }, [heartbeatInterval]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
  }, []);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setConnectionState((prev) => ({
      ...prev,
      status: prev.reconnectAttempt > 0 ? "reconnecting" : "connecting",
    }));

    try {
      wsRef.current = new WebSocket(url);

      wsRef.current.onopen = () => {
        setConnectionState({
          status: "connected",
          lastConnected: new Date(),
          reconnectAttempt: 0,
          latency: 0,
        });
        startHeartbeat();
        onOpenRef.current?.();
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Handle pong response
          if (data.type === "pong" && pingTimestampRef.current) {
            const latency = Date.now() - pingTimestampRef.current;
            setConnectionState((prev) => ({ ...prev, latency }));
            return;
          }

          // Add message to queue
          setMessages((prev) => [...prev, data as T]);
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
        }
      };

      wsRef.current.onerror = (event) => {
        setConnectionState((prev) => ({
          ...prev,
          status: "error",
        }));
        onErrorRef.current?.(event);
      };

      wsRef.current.onclose = () => {
        setConnectionState((prev) => ({
          ...prev,
          status: "disconnected",
        }));
        stopHeartbeat();
        onCloseRef.current?.();

        // Attempt to reconnect
        if (connectionState.reconnectAttempt < maxReconnectAttempts) {
          const attempt = connectionState.reconnectAttempt + 1;
          const delay = getReconnectDelay(attempt);

          setConnectionState((prev) => ({
            ...prev,
            reconnectAttempt: attempt,
          }));

          onReconnectRef.current?.(attempt);

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };
    } catch (error) {
      console.error("WebSocket connection failed:", error);
      setConnectionState((prev) => ({
        ...prev,
        status: "error",
      }));
    }
  }, [url, connectionState.reconnectAttempt, maxReconnectAttempts, startHeartbeat, stopHeartbeat]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    stopHeartbeat();

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setConnectionState({
      status: "disconnected",
      reconnectAttempt: 0,
      latency: 0,
    });
  }, [stopHeartbeat]);

  // Send message through WebSocket
  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, []);

  // Clear message queue
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // Auto-connect on mount with delay to allow API server to start
  useEffect(() => {
    // Small delay to allow API server to be ready (race condition fix)
    const connectTimeout = setTimeout(() => {
      connect();
    }, 500);

    return () => {
      clearTimeout(connectTimeout);
      disconnect();
    };
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

      // Store previous value for rollback
      previousValueRef.current = value;

      // Optimistically update UI
      setValue(nextValue);
      setIsUpdating(true);
      setError(null);

      try {
        // Perform actual update
        const result = await updateFn(nextValue);
        setValue(result); // Sync with server response
        return result;
      } catch (err) {
        // Rollback on failure
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

  // Store fetchFn and onError in refs to avoid dependency issues
  const fetchFnRef = useRef(fetchFn);
  const onErrorRef = useRef(onError);

  // Update refs when props change
  useEffect(() => {
    fetchFnRef.current = fetchFn;
  }, [fetchFn]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const adjustInterval = useCallback(
    (success: boolean) => {
      if (success) {
        // Reset to base interval on success
        currentIntervalRef.current = baseInterval;
        setErrorCount(0);
      } else {
        // Exponential backoff on failure
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
      console.error("Polling error:", error);
      adjustInterval(false);
      onErrorRef.current?.(error as Error);
    } finally {
      setIsPolling(false);
    }

    // Schedule next poll
    intervalRef.current = setTimeout(poll, currentIntervalRef.current);
  }, [adjustInterval]);

  // Start/stop polling based on enabled state
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
