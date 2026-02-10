import React from "react";
import { MessageSquare, Layers } from "lucide-react";

export interface PanelTogglesProps {
  onToggleContextPanel?: () => void;
  onToggleGovernancePanel?: () => void;
  contextPanelVisible?: boolean;
  governancePanelVisible?: boolean;
}

/**
 * Panel Toggle Buttons Component
 */
export const PanelToggles: React.FC<PanelTogglesProps> = ({
  onToggleContextPanel,
  onToggleGovernancePanel,
  contextPanelVisible,
  governancePanelVisible,
}) => {
  return (
    <div className="hidden md:flex items-center gap-2">
      {onToggleContextPanel && (
        <button
          onClick={onToggleContextPanel}
          aria-label={`${contextPanelVisible ? "Hide" : "Show"} context panel`}
          aria-pressed={contextPanelVisible}
          className={`p-2 rounded-lg transition-colors ${
            contextPanelVisible
              ? "bg-purple-500/20 text-purple-400"
              : "text-gray-400 hover:bg-gray-800"
          }`}
          data-testid="toggle-context-panel"
        >
          <MessageSquare className="w-5 h-5" />
        </button>
      )}
      {onToggleGovernancePanel && (
        <button
          onClick={onToggleGovernancePanel}
          aria-label={`${governancePanelVisible ? "Hide" : "Show"} governance panel`}
          aria-pressed={governancePanelVisible}
          className={`p-2 rounded-lg transition-colors ${
            governancePanelVisible
              ? "bg-purple-500/20 text-purple-400"
              : "text-gray-400 hover:bg-gray-800"
          }`}
          data-testid="toggle-governance-panel"
        >
          <Layers className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};
