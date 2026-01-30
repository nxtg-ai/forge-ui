/**
 * useCommands Hook
 * React hook for command execution and management
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  CommandService,
  CommandResult,
  CommandOptions,
  CommandStreamEvent,
  CommandMetadata,
  ForgeCommand,
} from "../services/command-service";

/**
 * Commands hook options
 */
export interface UseCommandsOptions {
  autoConnect?: boolean;
  maxConcurrentCommands?: number;
  onError?: (error: Error) => void;
}

/**
 * Command execution state
 */
export interface CommandExecution {
  commandId: string;
  command: string;
  status: CommandResult["status"];
  output: string[];
  progress?: number;
  startTime: Date;
}

/**
 * Commands hook return type
 */
export interface UseCommandsReturn {
  activeCommands: CommandExecution[];
  commandHistory: CommandResult[];
  availableCommands: CommandMetadata[];
  loading: boolean;
  error: Error | null;
  connected: boolean;
  execute: (
    command: string,
    options?: CommandOptions,
  ) => Promise<CommandResult>;
  executeStreaming: (
    command: string,
    onStream: (event: CommandStreamEvent) => void,
    options?: CommandOptions,
  ) => Promise<CommandResult>;
  cancel: (commandId: string) => Promise<void>;
  getResult: (commandId: string) => CommandResult | null;
  clearHistory: () => void;
}

/**
 * Hook for command execution
 */
export function useCommands(
  options: UseCommandsOptions = {},
): UseCommandsReturn {
  const [activeCommands, setActiveCommands] = useState<CommandExecution[]>([]);
  const [commandHistory, setCommandHistory] = useState<CommandResult[]>([]);
  const [availableCommands, setAvailableCommands] = useState<CommandMetadata[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [connected, setConnected] = useState(false);

  const serviceRef = useRef<CommandService | null>(null);
  const streamHandlersRef = useRef<Map<string, () => void>>(new Map());

  /**
   * Initialize service
   */
  const initializeService = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Create service instance
      const service = new CommandService({
        name: "CommandsHook",
        maxConcurrentCommands: options.maxConcurrentCommands ?? 5,
      });

      serviceRef.current = service;

      // Initialize service
      const initResult = await service.initialize();
      if (initResult.isErr()) {
        throw initResult.error;
      }

      // Get available commands
      const commands = service.getAvailableCommands();
      setAvailableCommands(commands);

      // Subscribe to command events
      service.on("commandComplete", handleCommandComplete);
      service.on("commandFailed", handleCommandFailed);
      service.on("commandCancelled", handleCommandCancelled);
      service.on("commandStream", handleCommandStream);

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
  }, [options.maxConcurrentCommands, options.onError]);

  /**
   * Handle command complete
   */
  const handleCommandComplete = useCallback((result: CommandResult) => {
    setActiveCommands((prev) =>
      prev.filter((cmd) => cmd.commandId !== result.commandId),
    );
    setCommandHistory((prev) => [...prev, result]);
  }, []);

  /**
   * Handle command failed
   */
  const handleCommandFailed = useCallback((result: CommandResult) => {
    setActiveCommands((prev) =>
      prev.filter((cmd) => cmd.commandId !== result.commandId),
    );
    setCommandHistory((prev) => [...prev, result]);
  }, []);

  /**
   * Handle command cancelled
   */
  const handleCommandCancelled = useCallback((result: CommandResult) => {
    setActiveCommands((prev) =>
      prev.filter((cmd) => cmd.commandId !== result.commandId),
    );
    setCommandHistory((prev) => [...prev, result]);
  }, []);

  /**
   * Handle command stream event
   */
  const handleCommandStream = useCallback((event: CommandStreamEvent) => {
    setActiveCommands((prev) => {
      const index = prev.findIndex((cmd) => cmd.commandId === event.commandId);
      if (index === -1) return prev;

      const updated = [...prev];
      const command = { ...updated[index] };

      if (event.type === "stdout" || event.type === "stderr") {
        command.output = [...command.output, event.data as string];
      } else if (event.type === "exit") {
        command.status = event.data === 0 ? "completed" : "failed";
      }

      updated[index] = command;
      return updated;
    });
  }, []);

  /**
   * Execute command
   */
  const execute = useCallback(
    async (
      command: string,
      options?: CommandOptions,
    ): Promise<CommandResult> => {
      if (!serviceRef.current) {
        throw new Error("Service not initialized");
      }

      // Add to active commands
      const execution: CommandExecution = {
        commandId: "", // Will be set by service
        command,
        status: "pending",
        output: [],
        startTime: new Date(),
      };

      setActiveCommands((prev) => [...prev, execution]);

      try {
        const result = await serviceRef.current.execute(command, options);
        if (result.isErr()) {
          throw result.error;
        }

        // Update execution with actual command ID
        setActiveCommands((prev) => {
          const index = prev.findIndex(
            (cmd) => cmd.command === command && !cmd.commandId,
          );
          if (index >= 0) {
            const updated = [...prev];
            updated[index].commandId = result.value.commandId;
            updated[index].status = result.value.status;
            return updated;
          }
          return prev;
        });

        return result.value;
      } catch (error) {
        // Remove from active commands on error
        setActiveCommands((prev) =>
          prev.filter((cmd) => cmd.command !== command || cmd.commandId),
        );
        throw error;
      }
    },
    [],
  );

  /**
   * Execute command with streaming
   */
  const executeStreaming = useCallback(
    async (
      command: string,
      onStream: (event: CommandStreamEvent) => void,
      options?: CommandOptions,
    ): Promise<CommandResult> => {
      if (!serviceRef.current) {
        throw new Error("Service not initialized");
      }

      // Add to active commands
      const execution: CommandExecution = {
        commandId: "", // Will be set by service
        command,
        status: "pending",
        output: [],
        startTime: new Date(),
      };

      setActiveCommands((prev) => [...prev, execution]);

      try {
        // Execute with streaming
        const result = await serviceRef.current.execute(command, {
          ...options,
          stream: true,
        });

        if (result.isErr()) {
          throw result.error;
        }

        // Update execution with actual command ID
        const commandId = result.value.commandId;
        setActiveCommands((prev) => {
          const index = prev.findIndex(
            (cmd) => cmd.command === command && !cmd.commandId,
          );
          if (index >= 0) {
            const updated = [...prev];
            updated[index].commandId = commandId;
            updated[index].status = "running";
            return updated;
          }
          return prev;
        });

        // Subscribe to stream
        const unsubscribe = serviceRef.current.streamOutput(
          commandId,
          (event) => {
            onStream(event);
            handleCommandStream(event);
          },
        );

        streamHandlersRef.current.set(commandId, unsubscribe);

        return result.value;
      } catch (error) {
        // Remove from active commands on error
        setActiveCommands((prev) =>
          prev.filter((cmd) => cmd.command !== command || cmd.commandId),
        );
        throw error;
      }
    },
    [handleCommandStream],
  );

  /**
   * Cancel command
   */
  const cancel = useCallback(async (commandId: string) => {
    if (!serviceRef.current) {
      throw new Error("Service not initialized");
    }

    const result = await serviceRef.current.cancel(commandId);
    if (result.isErr()) {
      throw result.error;
    }

    // Clean up stream handler if exists
    const unsubscribe = streamHandlersRef.current.get(commandId);
    if (unsubscribe) {
      unsubscribe();
      streamHandlersRef.current.delete(commandId);
    }
  }, []);

  /**
   * Get command result
   */
  const getResult = useCallback((commandId: string): CommandResult | null => {
    if (!serviceRef.current) {
      return null;
    }

    const result = serviceRef.current.getResult(commandId);
    if (result.isOk()) {
      return result.value;
    }

    return null;
  }, []);

  /**
   * Clear command history
   */
  const clearHistory = useCallback(() => {
    setCommandHistory([]);
  }, []);

  /**
   * Initialize on mount
   */
  useEffect(() => {
    if (options.autoConnect !== false) {
      initializeService();
    }

    return () => {
      // Clean up stream handlers
      streamHandlersRef.current.forEach((unsubscribe) => unsubscribe());
      streamHandlersRef.current.clear();

      if (serviceRef.current) {
        serviceRef.current.off("commandComplete", handleCommandComplete);
        serviceRef.current.off("commandFailed", handleCommandFailed);
        serviceRef.current.off("commandCancelled", handleCommandCancelled);
        serviceRef.current.off("commandStream", handleCommandStream);
        serviceRef.current.dispose();
      }
    };
  }, []);

  return {
    activeCommands,
    commandHistory,
    availableCommands,
    loading,
    error,
    connected,
    execute,
    executeStreaming,
    cancel,
    getResult,
    clearHistory,
  };
}
