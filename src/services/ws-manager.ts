/**
 * WebSocket Manager - Singleton
 * Single shared WebSocket connection for the entire application.
 * All components subscribe to message types instead of creating their own connections.
 */

import { logger } from "../utils/browser-logger";

// --- URL Helper ---
const getWsUrl = (): string => {
  if (typeof import.meta !== "undefined" && import.meta.env?.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL;
  }
  if (typeof window === "undefined") return "ws://localhost:5050/ws";
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws`;
};

// --- Types ---
export type ConnectionStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "reconnecting";

export interface WSConnectionState {
  status: ConnectionStatus;
  reconnectAttempt: number;
  latency: number;
  lastConnected?: Date;
}

type MessageHandler = (data: unknown) => void;
type StateHandler = (state: WSConnectionState) => void;

// --- Singleton ---
class WSManager {
  private static instance: WSManager | null = null;

  private ws: WebSocket | null = null;
  private subscribers = new Map<string, Set<MessageHandler>>();
  private stateListeners = new Set<StateHandler>();
  private state: WSConnectionState = {
    status: "disconnected",
    reconnectAttempt: 0,
    latency: 0,
  };

  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private stabilityTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimestamp = 0;
  private messageQueue: string[] = [];
  private isConnecting = false;
  private visibilityHandler: (() => void) | null = null;

  private constructor() {
    // Listen for tab visibility changes to pause/resume reconnection
    if (typeof document !== "undefined") {
      this.visibilityHandler = () => {
        if (!document.hidden && this.state.status === "disconnected") {
          this.connect();
        }
      };
      document.addEventListener("visibilitychange", this.visibilityHandler);
    }
  }

  static getInstance(): WSManager {
    if (!WSManager.instance) {
      WSManager.instance = new WSManager();
    }
    return WSManager.instance;
  }

  /** Connect to the WebSocket server. Safe to call multiple times. */
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) return;
    this.isConnecting = true;

    this.updateState({
      status: this.state.reconnectAttempt > 0 ? "reconnecting" : "connecting",
    });

    try {
      const url = getWsUrl();
      logger.debug("[WS] Connecting to", url);
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.isConnecting = false;
        logger.debug("[WS] Connected");
        this.updateState({ status: "connected", lastConnected: new Date() });
        this.startHeartbeat();
        this.flushQueue();

        // Only reset attempt counter after connection is stable for 5s
        this.stabilityTimer = setTimeout(() => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.updateState({ reconnectAttempt: 0 });
          }
        }, 5000);
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          // Handle pong (heartbeat response)
          if (message.type === "pong") {
            if (this.pingTimestamp) {
              this.updateState({ latency: Date.now() - this.pingTimestamp });
            }
            return;
          }

          // Dispatch to type-specific subscribers
          const payload = message.payload ?? message.data ?? message;
          this.dispatch(message.type, payload);
          // Also dispatch to wildcard subscribers
          this.dispatch("*", message);
        } catch {
          // Silently ignore malformed messages
        }
      };

      this.ws.onerror = () => {
        this.isConnecting = false;
        // onclose will handle reconnection
      };

      this.ws.onclose = () => {
        this.isConnecting = false;
        this.ws = null;
        this.stopHeartbeat();
        this.clearStabilityTimer();
        logger.debug("[WS] Disconnected");
        this.updateState({ status: "disconnected" });
        this.scheduleReconnect();
      };
    } catch {
      this.isConnecting = false;
      this.updateState({ status: "disconnected" });
      this.scheduleReconnect();
    }
  }

  /** Cleanly disconnect. No reconnection will be attempted. */
  disconnect(): void {
    this.clearTimers();
    if (this.ws) {
      this.ws.onclose = null; // Prevent auto-reconnect
      this.ws.close();
      this.ws = null;
    }
    this.updateState({
      status: "disconnected",
      reconnectAttempt: 0,
      latency: 0,
    });
  }

  /**
   * Subscribe to a WebSocket message type.
   * Use '*' to receive all messages.
   * Returns an unsubscribe function.
   * Auto-connects on first subscription.
   */
  subscribe(eventType: string, handler: MessageHandler): () => void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }
    this.subscribers.get(eventType)!.add(handler);

    // Auto-connect when first subscriber appears
    if (this.state.status === "disconnected" && !this.isConnecting) {
      this.connect();
    }

    return () => {
      const handlers = this.subscribers.get(eventType);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.subscribers.delete(eventType);
        }
      }
    };
  }

  /**
   * Listen for connection state changes.
   * Handler is called immediately with current state.
   * Returns an unsubscribe function.
   */
  onStateChange(handler: StateHandler): () => void {
    this.stateListeners.add(handler);
    handler({ ...this.state }); // Immediate call with current state
    return () => this.stateListeners.delete(handler);
  }

  /** Send a message. Returns true if sent, false if queued. */
  send(message: Record<string, unknown>): boolean {
    const data = JSON.stringify(message);
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(data);
      return true;
    }
    this.messageQueue.push(data);
    return false;
  }

  /** Get current connection state snapshot. */
  getState(): WSConnectionState {
    return { ...this.state };
  }

  // --- Private ---

  private dispatch(type: string, data: unknown): void {
    const handlers = this.subscribers.get(type);
    if (!handlers) return;
    handlers.forEach((handler) => {
      try {
        handler(data);
      } catch {
        // Ignore handler errors to prevent cascading failures
      }
    });
  }

  private updateState(partial: Partial<WSConnectionState>): void {
    this.state = { ...this.state, ...partial };
    const snapshot = { ...this.state };
    this.stateListeners.forEach((handler) => {
      try {
        handler(snapshot);
      } catch {
        // Ignore listener errors
      }
    });
  }

  private scheduleReconnect(): void {
    if (this.state.reconnectAttempt >= 5) {
      logger.debug("[WS] Max reconnect attempts reached");
      return;
    }

    // Don't reconnect if tab is hidden
    if (typeof document !== "undefined" && document.hidden) {
      logger.debug("[WS] Tab hidden, deferring reconnect");
      return;
    }

    // Don't schedule if already scheduled
    if (this.reconnectTimer) return;

    const attempt = this.state.reconnectAttempt + 1;
    const delay = Math.min(1000 * Math.pow(2, attempt - 1), 30000);

    this.updateState({ reconnectAttempt: attempt, status: "reconnecting" });
    logger.debug(`[WS] Reconnecting in ${delay}ms (attempt ${attempt}/5)`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.pingTimestamp = Date.now();
        this.ws.send(JSON.stringify({ type: "ping" }));
      }
    }, 30000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private flushQueue(): void {
    while (
      this.messageQueue.length > 0 &&
      this.ws?.readyState === WebSocket.OPEN
    ) {
      const data = this.messageQueue.shift()!;
      this.ws.send(data);
    }
  }

  private clearStabilityTimer(): void {
    if (this.stabilityTimer) {
      clearTimeout(this.stabilityTimer);
      this.stabilityTimer = null;
    }
  }

  private clearTimers(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.clearStabilityTimer();
    this.stopHeartbeat();
  }
}

export const wsManager = WSManager.getInstance();
