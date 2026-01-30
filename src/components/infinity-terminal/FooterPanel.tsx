/**
 * Footer Panel
 * 3-column layout: Status | Oracle Feed | Quick Actions
 */

import React from "react";
import { Brain, Layout } from "lucide-react";
import { OracleFeedMarquee, type OracleMessage } from "./OracleFeedMarquee";

interface FooterPanelProps {
  sessionName?: string;
  isConnected?: boolean;
  oracleMessages?: OracleMessage[];
  onToggleContext?: () => void;
  onToggleGovernance?: () => void;
  contextVisible?: boolean;
  governanceVisible?: boolean;
  isMobile?: boolean;
  className?: string;
}

export const FooterPanel: React.FC<FooterPanelProps> = ({
  sessionName = "default-session",
  isConnected = true,
  oracleMessages = [],
  onToggleContext,
  onToggleGovernance,
  contextVisible = false,
  governanceVisible = false,
  isMobile = false,
  className = "",
}) => {
  return (
    <footer
      className={`border-t border-gray-800 bg-gray-950/95 backdrop-blur-sm ${
        isMobile ? "h-16" : "h-20"
      } flex-shrink-0 ${className}`}
      data-testid="footer-panel"
    >
      <div className="h-full flex items-center px-4 gap-4">
        {/* Status Section */}
        <div className="flex items-center gap-3 min-w-0 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
              }`}
              title={isConnected ? "Connected" : "Disconnected"}
            />
            <span className="text-xs text-gray-400 truncate max-w-[120px]">
              {sessionName}
            </span>
          </div>
        </div>

        {/* Oracle Feed Section - Center (flexible) */}
        <div className="flex-1 min-w-0">
          <OracleFeedMarquee messages={oracleMessages} />
        </div>

        {/* Quick Actions Section */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {onToggleContext && (
            <button
              onClick={onToggleContext}
              className={`p-2 rounded-lg transition-all ${
                contextVisible
                  ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
              title="Toggle Memory & Context"
              aria-label="Toggle Memory & Context"
            >
              <Brain className={isMobile ? "w-4 h-4" : "w-5 h-5"} />
            </button>
          )}

          {onToggleGovernance && (
            <button
              onClick={onToggleGovernance}
              className={`p-2 rounded-lg transition-all ${
                governanceVisible
                  ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
              title="Toggle Governance HUD"
              aria-label="Toggle Governance HUD"
            >
              <Layout className={isMobile ? "w-4 h-4" : "w-5 h-5"} />
            </button>
          )}
        </div>
      </div>
    </footer>
  );
};

export default FooterPanel;
