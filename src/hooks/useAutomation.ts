/**
 * useAutomation Hook
 * React hook for YOLO mode automation control
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  AutomatedAction,
  AutomationLevel,
  YoloStatistics
} from '../components/types';
import {
  AutomationService,
  AutomationRule,
  AutomationResult,
  AutomationContext
} from '../services/automation-service';

/**
 * Automation hook options
 */
export interface UseAutomationOptions {
  autoConnect?: boolean;
  defaultLevel?: AutomationLevel;
  onError?: (error: Error) => void;
  onConfirmationRequired?: (action: AutomatedAction) => void;
}

/**
 * Automation hook return type
 */
export interface UseAutomationReturn {
  level: AutomationLevel;
  statistics: YoloStatistics;
  actionHistory: AutomatedAction[];
  rules: AutomationRule[];
  pendingActions: AutomatedAction[];
  loading: boolean;
  error: Error | null;
  connected: boolean;
  setLevel: (level: AutomationLevel) => void;
  executeAction: (
    action: Omit<AutomatedAction, 'id' | 'status' | 'timestamp'>,
    context?: Partial<AutomationContext>
  ) => Promise<AutomationResult>;
  rollback: (actionId: string) => Promise<void>;
  analyzeSituation: (context: Record<string, unknown>) => Promise<AutomatedAction[]>;
  confirmAction: (actionId: string) => Promise<void>;
  rejectAction: (actionId: string) => void;
  clearHistory: () => void;
}

/**
 * Hook for YOLO mode automation
 */
export function useAutomation(
  options: UseAutomationOptions = {}
): UseAutomationReturn {
  const [level, setLevelState] = useState<AutomationLevel>(
    options.defaultLevel ?? 'balanced'
  );
  const [statistics, setStatistics] = useState<YoloStatistics>({
    actionsToday: 0,
    successRate: 100,
    timesSaved: 0,
    issuesFixed: 0,
    performanceGain: 0,
    costSaved: 0
  });
  const [actionHistory, setActionHistory] = useState<AutomatedAction[]>([]);
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [pendingActions, setPendingActions] = useState<AutomatedAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [connected, setConnected] = useState(false);

  const serviceRef = useRef<AutomationService | null>(null);

  /**
   * Initialize service
   */
  const initializeService = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Create service instance
      const service = new AutomationService({
        name: 'AutomationHook',
        defaultLevel: options.defaultLevel ?? 'balanced'
      });

      serviceRef.current = service;

      // Initialize service
      const initResult = await service.initialize();
      if (initResult.isErr()) {
        throw initResult.error;
      }

      // Get initial data
      setLevelState(service.getAutomationLevel());
      setStatistics(service.getStatistics());
      setActionHistory(service.getActionHistory());
      setRules(service.getRules());

      // Subscribe to events
      service.on('automationLevelChanged', handleLevelChanged);
      service.on('actionCompleted', handleActionCompleted);
      service.on('actionFailed', handleActionFailed);
      service.on('confirmationRequired', handleConfirmationRequired);
      service.on('rollbackCompleted', handleRollbackCompleted);

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
  }, [options.defaultLevel, options.onError]);

  /**
   * Handle level changed
   */
  const handleLevelChanged = useCallback((newLevel: AutomationLevel) => {
    setLevelState(newLevel);
  }, []);

  /**
   * Handle action completed
   */
  const handleActionCompleted = useCallback((action: AutomatedAction) => {
    setActionHistory(prev => [...prev, action]);
    setPendingActions(prev => prev.filter(a => a.id !== action.id));

    // Update statistics
    if (serviceRef.current) {
      setStatistics(serviceRef.current.getStatistics());
    }
  }, []);

  /**
   * Handle action failed
   */
  const handleActionFailed = useCallback(({ action }: { action: AutomatedAction }) => {
    setActionHistory(prev => [...prev, action]);
    setPendingActions(prev => prev.filter(a => a.id !== action.id));

    // Update statistics
    if (serviceRef.current) {
      setStatistics(serviceRef.current.getStatistics());
    }
  }, []);

  /**
   * Handle confirmation required
   */
  const handleConfirmationRequired = useCallback((action: AutomatedAction) => {
    setPendingActions(prev => [...prev, action]);

    if (options.onConfirmationRequired) {
      options.onConfirmationRequired(action);
    }
  }, [options.onConfirmationRequired]);

  /**
   * Handle rollback completed
   */
  const handleRollbackCompleted = useCallback(({ actionId }: { actionId: string }) => {
    setActionHistory(prev =>
      prev.map(action =>
        action.id === actionId
          ? { ...action, status: 'reverted' as const }
          : action
      )
    );
  }, []);

  /**
   * Set automation level
   */
  const setLevel = useCallback((newLevel: AutomationLevel) => {
    if (!serviceRef.current) {
      return;
    }

    serviceRef.current.setAutomationLevel(newLevel);
    setLevelState(newLevel);
  }, []);

  /**
   * Execute action
   */
  const executeAction = useCallback(async (
    action: Omit<AutomatedAction, 'id' | 'status' | 'timestamp'>,
    context?: Partial<AutomationContext>
  ): Promise<AutomationResult> => {
    if (!serviceRef.current) {
      throw new Error('Service not initialized');
    }

    const result = await serviceRef.current.executeAction(action, context);
    if (result.isErr()) {
      throw result.error;
    }

    return result.value;
  }, []);

  /**
   * Rollback action
   */
  const rollback = useCallback(async (actionId: string) => {
    if (!serviceRef.current) {
      throw new Error('Service not initialized');
    }

    const result = await serviceRef.current.rollback(actionId);
    if (result.isErr()) {
      throw result.error;
    }
  }, []);

  /**
   * Analyze situation
   */
  const analyzeSituation = useCallback(async (
    context: Record<string, unknown>
  ): Promise<AutomatedAction[]> => {
    if (!serviceRef.current) {
      throw new Error('Service not initialized');
    }

    const result = await serviceRef.current.analyzeSituation(context);
    if (result.isErr()) {
      throw result.error;
    }

    return result.value;
  }, []);

  /**
   * Confirm pending action
   */
  const confirmAction = useCallback(async (actionId: string) => {
    const action = pendingActions.find(a => a.id === actionId);
    if (!action || !serviceRef.current) {
      return;
    }

    // Remove from pending
    setPendingActions(prev => prev.filter(a => a.id !== actionId));

    // Execute with confirmation
    await executeAction(action, {
      requireConfirmation: false // Already confirmed
    });
  }, [pendingActions, executeAction]);

  /**
   * Reject pending action
   */
  const rejectAction = useCallback((actionId: string) => {
    setPendingActions(prev => prev.filter(a => a.id !== actionId));
  }, []);

  /**
   * Clear history
   */
  const clearHistory = useCallback(() => {
    if (!serviceRef.current) {
      return;
    }

    serviceRef.current.clearHistory();
    setActionHistory([]);
    setStatistics({
      actionsToday: 0,
      successRate: 100,
      timesSaved: 0,
      issuesFixed: 0,
      performanceGain: 0,
      costSaved: 0
    });
  }, []);

  /**
   * Initialize on mount
   */
  useEffect(() => {
    if (options.autoConnect !== false) {
      initializeService();
    }

    return () => {
      if (serviceRef.current) {
        serviceRef.current.off('automationLevelChanged', handleLevelChanged);
        serviceRef.current.off('actionCompleted', handleActionCompleted);
        serviceRef.current.off('actionFailed', handleActionFailed);
        serviceRef.current.off('confirmationRequired', handleConfirmationRequired);
        serviceRef.current.off('rollbackCompleted', handleRollbackCompleted);
        serviceRef.current.dispose();
      }
    };
  }, []);

  return {
    level,
    statistics,
    actionHistory,
    rules,
    pendingActions,
    loading,
    error,
    connected,
    setLevel,
    executeAction,
    rollback,
    analyzeSituation,
    confirmAction,
    rejectAction,
    clearHistory
  };
}