/**
 * useVision Hook
 * React hook for canonical vision management
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { VisionData, Goal, Metric, EngagementMode } from "../components/types";
import {
  VisionService,
  VisionUpdateEvent,
  VisionCaptureData,
  AlignmentCheck,
} from "../services/vision-service";
import { CanonicalVision } from "../types/vision";

/**
 * Vision hook options
 */
export interface UseVisionOptions {
  autoLoad?: boolean;
  autoSave?: boolean;
  onError?: (error: Error) => void;
}

/**
 * Vision hook return type
 */
export interface UseVisionReturn {
  vision: VisionData | null;
  canonicalVision: CanonicalVision | null;
  history: VisionUpdateEvent[];
  captures: VisionCaptureData[];
  loading: boolean;
  error: Error | null;
  updateVision: (update: Partial<VisionData>) => Promise<void>;
  saveVision: () => Promise<void>;
  captureVision: (data: VisionCaptureData) => Promise<void>;
  checkAlignment: (decision: string) => AlignmentCheck | null;
  refresh: () => Promise<void>;
}

/**
 * Hook for managing canonical vision
 */
export function useVision(options: UseVisionOptions = {}): UseVisionReturn {
  const [vision, setVision] = useState<VisionData | null>(null);
  const [canonicalVision, setCanonicalVision] =
    useState<CanonicalVision | null>(null);
  const [history, setHistory] = useState<VisionUpdateEvent[]>([]);
  const [captures, setCaptures] = useState<VisionCaptureData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const serviceRef = useRef<VisionService | null>(null);

  /**
   * Initialize service
   */
  const initializeService = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Create service instance
      const service = new VisionService({
        name: "VisionHook",
        autoSave: options.autoSave ?? true,
        validateOnSave: true,
      });

      serviceRef.current = service;

      // Initialize service
      const initResult = await service.initialize();
      if (initResult.isErr()) {
        throw initResult.error;
      }

      // Get initial data
      const visionResult = service.getVision();
      if (visionResult.isOk()) {
        setVision(visionResult.value);
      }

      const canonicalResult = service.getCanonicalVision();
      if (canonicalResult.isOk()) {
        setCanonicalVision(canonicalResult.value);
      }

      const visionHistory = service.getHistory();
      setHistory(visionHistory);

      const visionCaptures = service.getCaptures();
      setCaptures(visionCaptures);

      // Subscribe to vision updates
      service.on("visionUpdate", handleVisionUpdate);
      service.on("visionCaptured", handleVisionCaptured);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      if (options.onError) {
        options.onError(error);
      }
    } finally {
      setLoading(false);
    }
  }, [options.autoSave, options.onError]);

  /**
   * Handle vision update event
   */
  const handleVisionUpdate = useCallback((event: VisionUpdateEvent) => {
    setHistory((prev) => [...prev, event]);

    // Update vision state
    if (serviceRef.current) {
      const visionResult = serviceRef.current.getVision();
      if (visionResult.isOk()) {
        setVision(visionResult.value);
      }

      const canonicalResult = serviceRef.current.getCanonicalVision();
      if (canonicalResult.isOk()) {
        setCanonicalVision(canonicalResult.value);
      }
    }
  }, []);

  /**
   * Handle vision captured event
   */
  const handleVisionCaptured = useCallback((data: VisionCaptureData) => {
    setCaptures((prev) => [data, ...prev]);
  }, []);

  /**
   * Update vision
   */
  const updateVision = useCallback(async (update: Partial<VisionData>) => {
    if (!serviceRef.current) {
      throw new Error("Service not initialized");
    }

    const result = await serviceRef.current.updateVision(update);
    if (result.isErr()) {
      throw result.error;
    }

    setVision(result.value);
  }, []);

  /**
   * Save vision
   */
  const saveVision = useCallback(async () => {
    if (!serviceRef.current || !vision) {
      throw new Error("Service not initialized or no vision data");
    }

    const result = await serviceRef.current.saveVision(vision);
    if (result.isErr()) {
      throw result.error;
    }
  }, [vision]);

  /**
   * Capture vision
   */
  const captureVision = useCallback(async (data: VisionCaptureData) => {
    if (!serviceRef.current) {
      throw new Error("Service not initialized");
    }

    const result = await serviceRef.current.captureVision(data);
    if (result.isErr()) {
      throw result.error;
    }
  }, []);

  /**
   * Check alignment
   */
  const checkAlignment = useCallback(
    (decision: string): AlignmentCheck | null => {
      if (!serviceRef.current) {
        return null;
      }

      const result = serviceRef.current.checkAlignment(decision);
      if (result.isOk()) {
        return result.value;
      }

      return null;
    },
    [],
  );

  /**
   * Refresh vision data
   */
  const refresh = useCallback(async () => {
    if (!serviceRef.current) {
      return;
    }

    const loadResult = await serviceRef.current.loadCanonicalVision();
    if (loadResult.isOk()) {
      setCanonicalVision(loadResult.value);
    }

    const visionResult = serviceRef.current.getVision();
    if (visionResult.isOk()) {
      setVision(visionResult.value);
    }

    const capturesResult = await serviceRef.current.loadVisionCaptures();
    if (capturesResult.isOk()) {
      setCaptures(capturesResult.value);
    }

    const visionHistory = serviceRef.current.getHistory();
    setHistory(visionHistory);
  }, []);

  /**
   * Initialize on mount
   */
  useEffect(() => {
    if (options.autoLoad !== false) {
      initializeService();
    }

    return () => {
      if (serviceRef.current) {
        serviceRef.current.off("visionUpdate", handleVisionUpdate);
        serviceRef.current.off("visionCaptured", handleVisionCaptured);
        serviceRef.current.dispose();
      }
    };
  }, []);

  return {
    vision,
    canonicalVision,
    history,
    captures,
    loading,
    error,
    updateVision,
    saveVision,
    captureVision,
    checkAlignment,
    refresh,
  };
}
