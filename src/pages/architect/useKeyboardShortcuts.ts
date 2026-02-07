/**
 * Custom hook for Architect View keyboard shortcuts
 * Handles all keyboard navigation and shortcuts
 */

import { useEffect } from "react";
import type { ArchitectDecision } from "./types";

interface UseKeyboardShortcutsProps {
  historyPanelVisible: boolean;
  impactPanelVisible: boolean;
  showProposalForm: boolean;
  selectedDecision: ArchitectDecision | null;
  toggleHistoryPanel: () => void;
  toggleImpactPanel: () => void;
  setShowProposalForm: (show: boolean) => void;
  setSelectedDecision: (decision: ArchitectDecision | null) => void;
  setAnnouncement: (message: string) => void;
  handleApprove: () => Promise<void>;
  fetchDecisions: () => Promise<void>;
  toast: {
    info: (title: string, options?: { message?: string }) => void;
  };
}

export function useKeyboardShortcuts({
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
}: UseKeyboardShortcutsProps): void {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (e.key !== "Escape") return;
      }

      switch (e.key) {
        case "[":
          e.preventDefault();
          toggleHistoryPanel();
          setAnnouncement(`History panel ${!historyPanelVisible ? "opened" : "closed"}`);
          break;
        case "]":
          e.preventDefault();
          toggleImpactPanel();
          setAnnouncement(`Impact panel ${!impactPanelVisible ? "opened" : "closed"}`);
          break;
        case "n":
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            setShowProposalForm(true);
            setSelectedDecision(null);
            setAnnouncement("New proposal form opened");
          }
          break;
        case "a":
          if (!e.ctrlKey && !e.metaKey && selectedDecision) {
            e.preventDefault();
            handleApprove();
          }
          break;
        case "r":
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            fetchDecisions();
            toast.info("Refreshing decisions...");
          }
          break;
        case "Escape":
          if (showProposalForm) {
            setShowProposalForm(false);
            setAnnouncement("Proposal form closed");
          }
          break;
        case "/":
          e.preventDefault();
          // Focus search input
          const searchInput = document.querySelector('[data-testid="decision-search-input"]') as HTMLInputElement;
          if (searchInput) {
            searchInput.focus();
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
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
  ]);
}
