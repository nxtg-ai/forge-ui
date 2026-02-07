/**
 * Custom hook for Architect View data management
 * Handles decision fetching, WebSocket updates, and state management
 */

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "../../services/api-client";
import { logger } from "../../utils/browser-logger";
import type { ArchitectDecision, ImpactAnalysis } from "./types";

interface UseArchitectDataProps {
  isConnected: boolean;
  sendMessage: (message: Record<string, unknown>) => boolean;
  messages: unknown[];
  clearMessages: () => void;
  toast: {
    success: (title: string, options?: { message: string }) => void;
    error: (title: string, options?: { message: string }) => void;
    info: (title: string, options?: { message: string }) => void;
  };
}

interface UseArchitectDataReturn {
  decisions: ArchitectDecision[];
  loading: boolean;
  selectedDecision: ArchitectDecision | null;
  impactAnalysis: ImpactAnalysis | null;
  impactLoading: boolean;
  fetchDecisions: () => Promise<void>;
  handleSelectDecision: (decision: ArchitectDecision) => void;
  handleProposalSubmit: (proposal: Partial<ArchitectDecision>) => Promise<void>;
  handleApprove: () => Promise<void>;
  handleReject: () => Promise<void>;
  setSelectedDecision: (decision: ArchitectDecision | null) => void;
  setDecisions: React.Dispatch<React.SetStateAction<ArchitectDecision[]>>;
  isSubmitting: boolean;
  isApproving: boolean;
}

export function useArchitectData({
  isConnected,
  sendMessage,
  messages,
  clearMessages,
  toast,
}: UseArchitectDataProps): UseArchitectDataReturn {
  const [decisions, setDecisions] = useState<ArchitectDecision[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDecision, setSelectedDecision] = useState<ArchitectDecision | null>(null);
  const [impactAnalysis, setImpactAnalysis] = useState<ImpactAnalysis | null>(null);
  const [impactLoading, setImpactLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  // Fetch decisions
  const fetchDecisions = useCallback(async () => {
    setLoading(true);
    try {
      interface BackendDecision {
        id?: string;
        title?: string;
        description?: string;
        approach?: string;
        rationale?: string;
        tradeoffs?: string[];
        impact?: string;
        status?: string;
        proposedBy?: string;
        proposedAt?: string;
        approvedBy?: string[];
        consensus?: number;
        votes?: unknown;
        relatedDecisions?: string[];
        tags?: string[];
        signedOffBy?: string[];
      }

      const response = await apiClient.getArchitectureDecisions();
      if (response.success && response.data) {
        const mappedDecisions: ArchitectDecision[] = (response.data as BackendDecision[]).map((d) => ({
          id: d.id || `decision-${Date.now()}`,
          title: d.title || d.approach || "Untitled Decision",
          description: d.description || "",
          approach: d.approach || "",
          rationale: d.rationale || "",
          tradeoffs: d.tradeoffs || [],
          impact: (d.impact as "low" | "medium" | "high" | "critical") || "medium",
          status: (d.status as "proposed" | "discussing" | "approved" | "rejected" | "implemented") || "proposed",
          proposedBy: d.proposedBy || "Unknown",
          proposedAt: d.proposedAt ? new Date(d.proposedAt) : new Date(),
          approvedBy: d.approvedBy,
          consensus: d.consensus ?? 0,
          votes: d.votes as { approve: number; reject: number; abstain: number } | undefined,
          relatedDecisions: d.relatedDecisions,
          tags: d.tags,
          signedOffBy: d.signedOffBy || [],
        }));
        setDecisions(mappedDecisions);
      }
    } catch (error) {
      logger.error("Failed to fetch decisions:", error);
      toast.error("Failed to load decisions", { message: "Please try again" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Handle decision selection
  const handleSelectDecision = useCallback((decision: ArchitectDecision) => {
    setSelectedDecision(decision);

    // Generate mock impact analysis
    setImpactLoading(true);
    setTimeout(() => {
      setImpactAnalysis({
        performance: Math.floor(Math.random() * 30) + 70,
        scalability: Math.floor(Math.random() * 30) + 70,
        maintainability: Math.floor(Math.random() * 30) + 70,
        security: Math.floor(Math.random() * 30) + 70,
        cost: Math.floor(Math.random() * 30) + 70,
        timeline: Math.floor(Math.random() * 30) + 70,
        risks: [
          "Increased complexity in initial implementation",
          "Team learning curve for new patterns",
        ],
        opportunities: [
          "Better long-term maintainability",
          "Improved system resilience",
        ],
      });
      setImpactLoading(false);
    }, 500);
  }, []);

  // Submit proposal
  const handleProposalSubmit = useCallback(async (proposal: Partial<ArchitectDecision>) => {
    setIsSubmitting(true);
    try {
      const response = await apiClient.proposeArchitecture(proposal);
      if (response.success) {
        toast.success("Proposal submitted", { message: "Your architecture decision has been proposed" });
        await fetchDecisions();

        // Broadcast via WebSocket
        if (isConnected) {
          sendMessage({ type: "decision.made", payload: response.data });
        }
      } else {
        throw new Error(response.error);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast.error("Failed to submit proposal", { message: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  }, [fetchDecisions, isConnected, sendMessage, toast]);

  // Approve decision
  const handleApprove = useCallback(async () => {
    if (!selectedDecision) return;

    setIsApproving(true);
    try {
      const response = await apiClient.approveArchitectureDecision(selectedDecision.id);
      if (response.success) {
        toast.success("Decision approved", { message: `"${selectedDecision.title}" has been approved` });
        await fetchDecisions();

        // Broadcast via WebSocket
        if (isConnected) {
          sendMessage({ type: "decision.made", payload: response.data });
        }
      } else {
        throw new Error(response.error);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast.error("Failed to approve", { message: errorMessage });
    } finally {
      setIsApproving(false);
    }
  }, [selectedDecision, fetchDecisions, isConnected, sendMessage, toast]);

  // Reject decision
  const handleReject = useCallback(async () => {
    if (!selectedDecision) return;

    setIsApproving(true);
    try {
      setDecisions((prev) =>
        prev.map((d) =>
          d.id === selectedDecision.id ? { ...d, status: "rejected" as const } : d
        )
      );
      toast.info("Decision rejected", { message: `"${selectedDecision.title}" has been rejected` });
    } finally {
      setIsApproving(false);
    }
  }, [selectedDecision, toast]);

  // Process WebSocket messages
  useEffect(() => {
    if (messages.length > 0) {
      messages.forEach((message: unknown) => {
        const typedMessage = message as { type?: string };
        if (typedMessage.type === "decision.made") {
          fetchDecisions();
          toast.info("Decision updated", { message: "Architecture decisions have been updated" });
        }
      });
      clearMessages();
    }
  }, [messages, clearMessages, fetchDecisions, toast]);

  // Initial data load
  useEffect(() => {
    fetchDecisions();
  }, [fetchDecisions]);

  return {
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
    setDecisions,
    isSubmitting,
    isApproving,
  };
}
