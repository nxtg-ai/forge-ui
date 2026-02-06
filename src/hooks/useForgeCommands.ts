/**
 * useForgeCommands Hook
 * Fetches and manages NXTG-Forge commands from the API
 */

import { useState, useEffect } from "react";
import type { Command } from "../components/types";
import { renderIcon } from "../utils/icon-mapper";
import { logger } from "../utils/browser-logger";

interface CommandDTO {
  id: string;
  name: string;
  description: string;
  category: "forge" | "git" | "test" | "deploy" | "analyze";
  hotkey?: string;
  requiresConfirmation?: boolean;
  severity?: "safe" | "warning" | "danger";
  iconName?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
  error?: string;
}

/**
 * Fetch available commands from API
 */
export function useForgeCommands() {
  const [commands, setCommands] = useState<Command[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCommands = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch("/api/commands");
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result: ApiResponse<CommandDTO[]> = await response.json();

        if (!result.success) {
          throw new Error(result.error || "Failed to fetch commands");
        }

        // Transform DTOs to Command objects with React icon components
        const transformedCommands: Command[] = result.data.map((dto) => ({
          id: dto.id,
          name: dto.name,
          description: dto.description,
          category: dto.category,
          hotkey: dto.hotkey,
          requiresConfirmation: dto.requiresConfirmation,
          icon: renderIcon(dto.iconName, { className: "w-4 h-4" }),
        }));

        setCommands(transformedCommands);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);
        logger.error("[useForgeCommands] Failed to fetch commands:", err);

        // Fallback to empty array on error
        setCommands([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCommands();
  }, []);

  return {
    commands,
    isLoading,
    error,
  };
}
