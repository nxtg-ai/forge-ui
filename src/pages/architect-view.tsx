/**
 * Architect View Page - SOTA Implementation
 * Real API integration with architecture decision management
 *
 * Features:
 * - Left panel: Decision History (collapsible, 320px)
 * - Center: Main architect discussion/decision interface
 * - Right panel: Impact Analysis + Tradeoffs (collapsible, 320px)
 * - Footer: Oracle Feed + panel toggles
 * - Responsive: Mobile (full-screen + overlays), Tablet (2-col), Desktop (3-col)
 * - Full keyboard navigation and screen reader support
 * - Real WebSocket updates for collaborative decisions
 */

import React, { useState } from "react";
import { motion } from "framer-motion";
import { SafeAnimatePresence as AnimatePresence } from "../components/ui/SafeAnimatePresence";
import { Building2, Plus } from "lucide-react";

import { AppShell } from "../components/layout";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { type KeyboardShortcut } from "../components/ui/KeyboardShortcutsHelp";
import { ToastProvider, useToast } from "../components/feedback/ToastSystem";
import { useRealtimeConnection } from "../hooks/useRealtimeConnection";
import type { OracleMessage } from "../components/infinity-terminal/OracleFeedMarquee";
import { useLayout } from "../contexts/LayoutContext";

// Import sub-components and hooks
import {
  DecisionHistoryPanel,
  ImpactAnalysisPanel,
  ProposalForm,
  DecisionDetailView,
} from "./architect";
import { useArchitectData } from "./architect/useArchitectData";
import { useKeyboardShortcuts } from "./architect/useKeyboardShortcuts";

// Architect-specific keyboard shortcuts
const ARCHITECT_SHORTCUTS: KeyboardShortcut[] = [
  { key: "[", description: "Toggle History panel", category: "navigation" },
  { key: "]", description: "Toggle Impact panel", category: "navigation" },
  { key: "n", description: "New decision proposal", category: "actions" },
  { key: "a", description: "Approve selected decision", category: "actions" },
  { key: "r", description: "Refresh decisions", category: "actions" },
  { key: "Escape", description: "Close panels / Cancel", category: "general" },
  { key: "?", description: "Show keyboard shortcuts", category: "general" },
  { key: "/", description: "Focus search", category: "navigation" },
];

// ============= Main Component =============

const ArchitectView: React.FC = () => {
  const { toast } = useToast();

  // Layout management from centralized LayoutContext
  const {
    contextPanelVisible: historyPanelVisible,
    governancePanelVisible: impactPanelVisible,
    footerVisible,
    toggleContextPanel: toggleHistoryPanel,
    toggleGovernancePanel: toggleImpactPanel,
  } = useLayout();

  // Local UI state
  const [showProposalForm, setShowProposalForm] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [announcement, setAnnouncement] = useState("");

  // Oracle messages for footer
  const [oracleMessages] = useState<OracleMessage[]>([
    {
      id: "1",
      type: "info",
      message: "Architecture decision system active",
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

  // Data management with custom hook
  const {
    decisions,
    loading,
    selectedDecision,
    impactAnalysis,
    impactLoading,
    fetchDecisions,
    handleSelectDecision,
    handleProposalSubmit,
    handleApprove,
    handleReject,
    setSelectedDecision,
    isSubmitting,
    isApproving,
  } = useArchitectData({
    isConnected,
    sendMessage,
    messages,
    clearMessages,
    toast,
  });

  // Keyboard shortcuts with custom hook
  useKeyboardShortcuts({
    historyPanelVisible,
    impactPanelVisible,
    showProposalForm,
    selectedDecision,
    toggleHistoryPanel,
    toggleImpactPanel,
    setShowProposalForm,
    setSelectedDecision,
    setAnnouncement,
    handleApprove,
    fetchDecisions,
    toast,
  });

  // Wrapper for proposal submit that also closes the form
  const handleProposalSubmitWrapper = async (proposal: Parameters<typeof handleProposalSubmit>[0]) => {
    await handleProposalSubmit(proposal);
    setShowProposalForm(false);
  };

  // Wrapper for decision selection that also closes the form
  const handleSelectDecisionWrapper = (decision: Parameters<typeof handleSelectDecision>[0]) => {
    handleSelectDecision(decision);
    setShowProposalForm(false);
  };

  return (
    <>
      {/* Screen reader announcements */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      <AppShell
        // Page identity
        title="Architecture Decisions"
        icon={<Building2 className="w-6 h-6" />}
        badge={`${decisions.filter(d => d.status === 'proposed').length} Pending`}

        // Left Panel - History
        leftPanel={
          <DecisionHistoryPanel
            decisions={decisions}
            loading={loading}
            selectedId={selectedDecision?.id || null}
            onSelect={handleSelectDecisionWrapper}
            filter={searchFilter}
            onFilterChange={setSearchFilter}
          />
        }
        showLeftPanel={historyPanelVisible}
        leftPanelTitle="Decision History"

        // Right Panel - Impact Analysis
        rightPanel={
          <ErrorBoundary fallbackMessage="Impact panel error">
            <ImpactAnalysisPanel
              decision={selectedDecision}
              analysis={impactAnalysis}
              loading={impactLoading}
            />
          </ErrorBoundary>
        }
        showRightPanel={impactPanelVisible}
        rightPanelTitle="Impact Analysis"

        // Footer
        showFooter={footerVisible}
        sessionName="architect"
        isConnected={isConnected}
        oracleMessages={oracleMessages}
        onToggleContext={toggleHistoryPanel}
        onToggleGovernance={toggleImpactPanel}
        contextVisible={historyPanelVisible}
        governanceVisible={impactPanelVisible}

        // Keyboard shortcuts
        customShortcuts={ARCHITECT_SHORTCUTS}

        className="h-screen"
        data-testid="architect-view-container"
      >
        {/* Main Content */}
        <div className="max-w-4xl mx-auto px-6 py-8">
          <AnimatePresence mode="wait">
            {showProposalForm ? (
              <ProposalForm
                key="proposal-form"
                onSubmit={handleProposalSubmitWrapper}
                onCancel={() => setShowProposalForm(false)}
                isSubmitting={isSubmitting}
              />
            ) : selectedDecision ? (
              <DecisionDetailView
                key={selectedDecision.id}
                decision={selectedDecision}
                onApprove={handleApprove}
                onReject={handleReject}
                isApproving={isApproving}
              />
            ) : (
              <motion.div
                key="empty-state"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16"
              >
                <Building2 className="w-16 h-16 mx-auto text-gray-700 mb-4" />
                <h2 className="text-2xl font-bold text-gray-400 mb-2">
                  Architecture Decision Records
                </h2>
                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                  Select a decision from the history panel or create a new proposal
                  to start making architecture decisions.
                </p>
                <button
                  onClick={() => setShowProposalForm(true)}
                  className="px-6 py-3 bg-purple-500 hover:bg-purple-600
                             text-white rounded-lg font-medium transition-all inline-flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Create New Proposal
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </AppShell>
    </>
  );
};

// Wrap with providers
const ArchitectPage: React.FC = () => {
  return (
    <ToastProvider>
      <ArchitectView />
    </ToastProvider>
  );
};

export default ArchitectPage;
