/**
 * Mobile Bottom Navigation
 * Bottom navigation bar for mobile devices
 */

import React from "react";
import { History, Search, Layers } from "lucide-react";

interface MobileBottomNavProps {
  historyPanelVisible: boolean;
  queuePanelVisible: boolean;
  toggleHistoryPanel: () => void;
  toggleQueuePanel: () => void;
  onOpenPalette: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  historyPanelVisible,
  queuePanelVisible,
  toggleHistoryPanel,
  toggleQueuePanel,
  onOpenPalette,
}) => {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 h-14 bg-gray-900/95 backdrop-blur-sm
                 border-t border-gray-800 z-50 md:hidden pb-safe"
      role="navigation"
      aria-label="Mobile navigation"
    >
      <div className="h-full flex items-center justify-around px-4">
        <button
          onClick={toggleHistoryPanel}
          className={`flex flex-col items-center gap-1 flex-1 h-full justify-center
                      ${historyPanelVisible ? "text-purple-400" : "text-gray-400"}`}
        >
          <History className="w-5 h-5" />
          <span className="text-xs">History</span>
        </button>
        <button
          onClick={onOpenPalette}
          className="flex flex-col items-center gap-1 flex-1 h-full justify-center text-gray-400"
        >
          <Search className="w-5 h-5" />
          <span className="text-xs">Commands</span>
        </button>
        <button
          onClick={toggleQueuePanel}
          className={`flex flex-col items-center gap-1 flex-1 h-full justify-center
                      ${queuePanelVisible ? "text-purple-400" : "text-gray-400"}`}
        >
          <Layers className="w-5 h-5" />
          <span className="text-xs">Queue</span>
        </button>
      </div>
    </nav>
  );
};
