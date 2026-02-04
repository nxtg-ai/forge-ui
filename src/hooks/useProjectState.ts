/**
 * useProjectState Hook
 * React hook for live project state synchronization
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  ProjectState,
  ProjectContext,
  Blocker,
  Decision,
} from "../components/types";
import {
  StateBridgeService,
  StateUpdate,
  StateUpdateType,
} from "../services/state-bridge";
import { Result } from "../utils/result";

/**
 * Project state hook options
 */
export interface UseProjectStateOptions {
  autoConnect?: boolean;
  pollingInterval?: number;
  onError?: (error: Error) => void;
}

/**
 * Project state hook return type
 */
export interface UseProjectStateReturn {
  state: ProjectState | null;
  context: ProjectContext | null;
  loading: boolean;
  error: Error | null;
  connected: boolean;
  updateState: (update: Partial<ProjectState>) => Promise<void>;
  addBlocker: (blocker: Blocker) => Promise<void>;
  resolveBlocker: (blockerId: string) => Promise<void>;
  recordDecision: (decision: Decision) => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Hook for managing project state
 */
export function useProjectState(
  options: UseProjectStateOptions = {},
): UseProjectStateReturn {
  const [state, setState] = useState<ProjectState | null>(null);
  const [context, setContext] = useState<ProjectContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [connected, setConnected] = useState(false);

  const serviceRef = useRef<StateBridgeService | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  /**
   * Initialize service
   */
  const initializeService = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Create service instance
      const service = new StateBridgeService({
        name: "ProjectStateHook",
        pollingInterval: options.pollingInterval,
      });

      serviceRef.current = service;

      // Initialize service
      const initResult = await service.initialize();
      if (initResult.isErr()) {
        throw initResult.error;
      }

      // Get initial state
      const stateResult = service.getProjectState();
      if (stateResult.isOk()) {
        setState(stateResult.value);
      }

      const contextResult = service.getProjectContext();
      if (contextResult.isOk()) {
        setContext(contextResult.value);
      }

      // Subscribe to updates
      unsubscribeRef.current = service.subscribe(
        "useProjectState",
        handleStateUpdate,
        {
          debounceMs: 100,
        },
      );

      setConnected(true);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      if (options.onError) {
        options.onError(error);
      }
    } finally {
      setLoading(false);
    }
  }, [options.pollingInterval, options.onError]);

  /**
   * Handle state update from service
   */
  const handleStateUpdate = useCallback((update: StateUpdate) => {
    switch (update.type) {
      case StateUpdateType.PROJECT_STATE:
        setState(update.data as ProjectState);
        break;
      case StateUpdateType.PHASE_CHANGED:
        setState((prev) =>
          prev ? { ...prev, phase: update.data as ProjectState["phase"] } : null,
        );
        break;
      case StateUpdateType.PROGRESS_UPDATE:
        setState((prev) =>
          prev ? { ...prev, progress: update.data as number } : null,
        );
        break;
      case StateUpdateType.BLOCKER_ADDED:
      case StateUpdateType.BLOCKER_RESOLVED:
        // State will be updated through PROJECT_STATE update
        break;
    }
  }, []);

  /**
   * Update state
   */
  const updateState = useCallback(async (update: Partial<ProjectState>) => {
    if (!serviceRef.current) {
      throw new Error("Service not initialized");
    }

    const result = await serviceRef.current.updateProjectState(update);
    if (result.isErr()) {
      throw result.error;
    }

    setState(result.value);
  }, []);

  /**
   * Add blocker
   */
  const addBlocker = useCallback(async (blocker: Blocker) => {
    if (!serviceRef.current) {
      throw new Error("Service not initialized");
    }

    const result = await serviceRef.current.addBlocker(blocker);
    if (result.isErr()) {
      throw result.error;
    }
  }, []);

  /**
   * Resolve blocker
   */
  const resolveBlocker = useCallback(async (blockerId: string) => {
    if (!serviceRef.current) {
      throw new Error("Service not initialized");
    }

    const result = await serviceRef.current.resolveBlocker(blockerId);
    if (result.isErr()) {
      throw result.error;
    }
  }, []);

  /**
   * Record decision
   */
  const recordDecision = useCallback(async (decision: Decision) => {
    if (!serviceRef.current) {
      throw new Error("Service not initialized");
    }

    const result = await serviceRef.current.recordDecision(decision);
    if (result.isErr()) {
      throw result.error;
    }
  }, []);

  /**
   * Refresh state
   */
  const refresh = useCallback(async () => {
    if (!serviceRef.current) {
      return;
    }

    const stateResult = serviceRef.current.getProjectState();
    if (stateResult.isOk()) {
      setState(stateResult.value);
    }

    const contextResult = serviceRef.current.getProjectContext();
    if (contextResult.isOk()) {
      setContext(contextResult.value);
    }
  }, []);

  /**
   * Initialize on mount
   */
  useEffect(() => {
    if (options.autoConnect !== false) {
      initializeService();
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      if (serviceRef.current) {
        serviceRef.current.dispose();
      }
    };
  }, []);

  return {
    state,
    context,
    loading,
    error,
    connected,
    updateState,
    addBlocker,
    resolveBlocker,
    recordDecision,
    refresh,
  };
}
