/**
 * Command View Page - Main Orchestrator
 * Coordinates command center functionality with state management and API integration
 *
 * Features:
 * - Three-panel architecture (History | Main | Queue)
 * - Real-time WebSocket updates
 * - Command palette with keyboard shortcuts
 * - Full responsive design with mobile support
 * - Accessibility and screen reader support
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Command } from "lucide-react";

import { AppShell } from "../components/layout";
import { useLayout } from "../contexts/LayoutContext";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { ToastProvider, useToast } from "../components/feedback/ToastSystem";
import {
  useRealtimeConnection,
} from "../hooks/useRealtimeConnection";
import { apiClient } from "../services/api-client";
import type { OracleMessage } from "../components/infinity-terminal/OracleFeedMarquee";
import type { Command as CommandType } from "../components/types";

// Import sub-components
import {
  CommandHistoryPanel,
  CommandQueuePanel,
  CommandPalette,
  MainContent,
  MobileBottomNav,
  type ExecutedCommand,
  type ProjectContext,
  COMMAND_SHORTCUTS,
  DEFAULT_COMMANDS,
} from "./command";

// ============= WebSocket Message Type =============

interface CommandMessage {
  type: string;
  payload?: {
    command?: { name: string };
  };
}

// ============= Main Component =============

const CommandView: React.FC = () => {
  const { toast } = useToast();

  // Layout management from centralized context
  const {
    contextPanelVisible: historyPanelVisible,
    governancePanelVisible: queuePanelVisible,
    footerVisible,
    toggleContextPanel: toggleHistoryPanel,
    toggleGovernancePanel: toggleQueuePanel,
  } = useLayout();

  // State
  const [commandHistory, setCommandHistory] = useState<ExecutedCommand[]>([]);
  const [commandQueue, setCommandQueue] = useState<ExecutedCommand[]>([]);
  const [runningCommand, setRunningCommand] = useState<ExecutedCommand | null>(null);
  const [activeResult, setActiveResult] = useState<ExecutedCommand | null>(null);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  // Project context (would come from API in real implementation)
  const [projectContext] = useState<ProjectContext>({
    name: "NXTG-Forge",
    phase: "building",
    activeAgents: 3,
    pendingTasks: 12,
    healthScore: 87,
    lastActivity: new Date(),
  });

  // Oracle messages for footer
  const [oracleMessages] = useState<OracleMessage[]>([
    {
      id: "1",
      type: "info",
      message: "Command center active",
      timestamp: new Date(),
    },
  ]);

  // WebSocket connection
  const { isConnected, sendMessage, messages, clearMessages } = useRealtimeConnection({
    url: import.meta.env.VITE_WS_URL || `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`,
    onOpen: () => {
      toast.success("Connected to Forge", { message: "Real-time updates enabled" });
    },
  });

  // Execute command
  const executeCommand = useCallback(async (command: CommandType) => {
    // Confirmation if needed
    if (command.requiresConfirmation) {
      const confirmed = window.confirm(`Execute "${command.name}"?\n${command.description}`);
      if (!confirmed) return;
    }

    const executedCommand: ExecutedCommand = {
      id: `exec-${Date.now()}`,
      command,
      status: "running",
      startedAt: new Date(),
    };

    setIsExecuting(true);
    setRunningCommand(executedCommand);
    setActiveResult(executedCommand);
    setAnnouncement(`Executing ${command.name}`);

    try {
      const startTime = Date.now();
      const response = await apiClient.executeCommand(command);
      const duration = Date.now() - startTime;

      const completedCommand: ExecutedCommand = {
        ...executedCommand,
        status: response.success ? "success" : "failed",
        completedAt: new Date(),
        result: response.data,
        error: response.error,
        duration,
      };

      setCommandHistory((prev) => [completedCommand, ...prev].slice(0, 50));
      setActiveResult(completedCommand);

      if (response.success) {
        toast.success(`${command.name} completed`, {
          message: `Executed in ${duration}ms`,
          duration: 3000,
        });
      } else {
        throw new Error(response.error || "Command failed");
      }

      // Broadcast via WebSocket
      if (isConnected) {
        sendMessage({ type: "command.executed", payload: { command: command.id, result: response.data } });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const failedCommand: ExecutedCommand = {
        ...executedCommand,
        status: "failed",
        completedAt: new Date(),
        error: errorMessage,
        duration: Date.now() - executedCommand.startedAt.getTime(),
      };

      setCommandHistory((prev) => [failedCommand, ...prev].slice(0, 50));
      setActiveResult(failedCommand);
      toast.error(`${command.name} failed`, {
        message: errorMessage,
        actions: [
          { label: "Retry", onClick: () => executeCommand(command) },
        ],
      });
    } finally {
      setIsExecuting(false);
      setRunningCommand(null);
    }
  }, [isConnected, sendMessage, toast]);

  // Cancel command
  const cancelCommand = useCallback((id: string) => {
    if (runningCommand?.id === id) {
      // Would need backend support for actual cancellation
      setRunningCommand(null);
      setIsExecuting(false);
      toast.info("Command cancelled");
    } else {
      setCommandQueue((prev) => prev.filter((c) => c.id !== id));
    }
  }, [runningCommand, toast]);

  // Clear history
  const clearHistory = useCallback(() => {
    setCommandHistory([]);
    toast.info("History cleared");
  }, [toast]);

  // Process WebSocket messages
  const toastRef = useRef(toast);
  useEffect(() => { toastRef.current = toast; }, [toast]);

  useEffect(() => {
    if (messages.length > 0) {
      messages.forEach((message: CommandMessage) => {
        if (message.type === "command.executed") {
          toastRef.current.info("Command executed", { message: message.payload?.command?.name });
        }
      });
      clearMessages();
    }
  }, [messages, clearMessages]);

  // Keyboard shortcuts (AppShell handles panel toggles, we just handle command palette)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (e.key !== "Escape") return;
      }

      switch (e.key) {
        case "/":
          e.preventDefault();
          setIsPaletteOpen(true);
          break;
        case "Escape":
          if (isPaletteOpen) {
            setIsPaletteOpen(false);
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPaletteOpen]);

  return (
    <>
      {/* Screen reader announcements */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      <AppShell
        // Page identity
        title="Command Center"
        icon={<Command className="w-6 h-6" />}
        badge="Live"

        // Left Panel - History
        leftPanel={
          <CommandHistoryPanel
            history={commandHistory}
            loading={false}
            onRerun={executeCommand}
            onClear={clearHistory}
          />
        }
        showLeftPanel={historyPanelVisible}
        leftPanelTitle="Command History"

        // Right Panel - Queue
        rightPanel={
          <ErrorBoundary fallbackMessage="Queue panel error">
            <CommandQueuePanel
              queue={commandQueue}
              running={runningCommand}
              onCancel={cancelCommand}
            />
          </ErrorBoundary>
        }
        showRightPanel={queuePanelVisible}
        rightPanelTitle="Execution Queue"

        // Footer
        showFooter={footerVisible}
        sessionName="command"
        isConnected={isConnected}
        oracleMessages={oracleMessages}
        onToggleContext={toggleHistoryPanel}
        onToggleGovernance={toggleQueuePanel}
        contextVisible={historyPanelVisible}
        governanceVisible={queuePanelVisible}

        // Keyboard shortcuts
        customShortcuts={COMMAND_SHORTCUTS}
      >
        {/* Main Content */}
        <MainContent
          activeResult={activeResult}
          commandHistory={commandHistory}
          categories={DEFAULT_COMMANDS}
          isExecuting={isExecuting}
          onExecute={executeCommand}
          onDismissResult={() => setActiveResult(null)}
          onShowResult={setActiveResult}
        />
      </AppShell>

      {/* Command Palette */}
      <CommandPalette
        isOpen={isPaletteOpen}
        onClose={() => setIsPaletteOpen(false)}
        categories={DEFAULT_COMMANDS}
        onExecute={executeCommand}
        isExecuting={isExecuting}
        projectContext={projectContext}
      />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        historyPanelVisible={historyPanelVisible}
        queuePanelVisible={queuePanelVisible}
        toggleHistoryPanel={toggleHistoryPanel}
        toggleQueuePanel={toggleQueuePanel}
        onOpenPalette={() => setIsPaletteOpen(true)}
      />
    </>
  );
};

// Wrap with providers
const CommandPage: React.FC = () => {
  return (
    <ToastProvider>
      <CommandView />
    </ToastProvider>
  );
};

export default CommandPage;
