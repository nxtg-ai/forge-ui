/**
 * Mobile Terminal View Component
 * Optimized terminal experience for mobile devices
 */

import React, { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Terminal,
  Maximize2,
  Minimize2,
  RotateCcw,
  ChevronUp,
  ChevronDown,
  Keyboard,
  Settings,
  Share2,
  Wifi,
  WifiOff,
  Menu,
} from "lucide-react";
import { InfinityTerminal } from "./InfinityTerminal";
import { useTouchGestures } from "./hooks/useTouchGestures";
import { useResponsiveLayout } from "./hooks/useResponsiveLayout";

interface MobileTerminalViewProps {
  projectName?: string;
  ttydPort?: number;
  ttydHost?: string;
  onShare?: () => void;
  className?: string;
}

export const MobileTerminalView: React.FC<MobileTerminalViewProps> = ({
  projectName = "nxtg-forge",
  ttydPort = 7681,
  ttydHost = "127.0.0.1",
  onShare,
  className = "",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [showHUD, setShowHUD] = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const [isConnected, setIsConnected] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const { layout } = useResponsiveLayout();

  // Touch gesture handlers
  const touchState = useTouchGestures(containerRef, {
    onSwipeUp: () => {
      if (!showHUD) setShowHUD(true);
    },
    onSwipeDown: () => {
      if (showHUD) setShowHUD(false);
    },
    onPinchOut: (scale) => {
      setFontSize((prev) => Math.min(24, Math.round(prev * scale)));
    },
    onPinchIn: (scale) => {
      setFontSize((prev) => Math.max(10, Math.round(prev * scale)));
    },
    onDoubleTap: () => {
      setIsFullscreen((prev) => !prev);
    },
    onLongPress: () => {
      setShowMenu(true);
    },
  });

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  }, []);

  // Handle connection status
  const handleConnectionChange = useCallback((connected: boolean) => {
    setIsConnected(connected);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`flex flex-col h-full bg-gray-950 ${className}`}
      data-testid="mobile-terminal-view"
    >
      {/* Compact Mobile Header */}
      <header className="flex items-center justify-between px-3 py-2 bg-gray-900 border-b border-gray-800 safe-area-top">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-purple-400" />
          <span className="text-sm font-semibold truncate max-w-[120px]">
            {projectName}
          </span>
          {/* Connection indicator */}
          <div
            className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}
          />
        </div>

        <div className="flex items-center gap-1">
          {/* Quick actions */}
          <button
            onClick={() => setShowKeyboard(!showKeyboard)}
            className={`p-2 rounded-lg transition-colors ${
              showKeyboard
                ? "bg-purple-500/20 text-purple-400"
                : "text-gray-400"
            }`}
            aria-label="Toggle keyboard"
          >
            <Keyboard className="w-5 h-5" />
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2 text-gray-400 rounded-lg"
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isFullscreen ? (
              <Minimize2 className="w-5 h-5" />
            ) : (
              <Maximize2 className="w-5 h-5" />
            )}
          </button>

          <button
            onClick={() => setShowMenu(true)}
            className="p-2 text-gray-400 rounded-lg"
            aria-label="Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Terminal Container */}
      <div className="flex-1 relative">
        <InfinityTerminal
          projectName={projectName}
          ttydPort={ttydPort}
          ttydHost={ttydHost}
          onConnectionChange={handleConnectionChange}
          className="h-full"
        />

        {/* Gesture hint overlay (shows briefly on first load) */}
        {touchState.isPinching && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 pointer-events-none">
            <div className="px-4 py-2 bg-gray-800 rounded-lg text-sm text-white">
              Font size: {fontSize}px
            </div>
          </div>
        )}
      </div>

      {/* Bottom HUD Sheet (swipe up to show) */}
      <AnimatePresence>
        {showHUD && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="absolute bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 rounded-t-xl shadow-xl safe-area-bottom"
          >
            {/* Handle */}
            <div className="flex justify-center py-2">
              <button
                onClick={() => setShowHUD(false)}
                className="w-10 h-1 bg-gray-700 rounded-full"
              />
            </div>

            {/* HUD Content */}
            <div className="px-4 pb-4 max-h-[40vh] overflow-y-auto">
              <QuickStatsPanel isConnected={isConnected} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Swipe indicator when HUD is hidden */}
      {!showHUD && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 text-gray-600 text-xs">
          <ChevronUp className="w-3 h-3" />
          <span>Swipe for HUD</span>
        </div>
      )}

      {/* Virtual Keyboard Area (optional) */}
      <AnimatePresence>
        {showKeyboard && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="bg-gray-900 border-t border-gray-800 overflow-hidden safe-area-bottom"
          >
            <MobileKeyboardBar onClose={() => setShowKeyboard(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Context Menu */}
      <AnimatePresence>
        {showMenu && (
          <MobileContextMenu
            onClose={() => setShowMenu(false)}
            onShare={onShare}
            onFontSizeChange={setFontSize}
            fontSize={fontSize}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// Quick stats panel for the bottom HUD
const QuickStatsPanel: React.FC<{ isConnected: boolean }> = ({
  isConnected,
}) => (
  <div className="space-y-3">
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-400">Connection</span>
      <div className="flex items-center gap-1">
        {isConnected ? (
          <>
            <Wifi className="w-4 h-4 text-green-400" />
            <span className="text-sm text-green-400">Connected</span>
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4 text-red-400" />
            <span className="text-sm text-red-400">Disconnected</span>
          </>
        )}
      </div>
    </div>

    <div className="grid grid-cols-2 gap-2">
      <div className="bg-gray-800/50 rounded-lg p-3">
        <p className="text-xs text-gray-500">Session</p>
        <p className="text-sm font-mono text-white truncate">nxtg-forge-main</p>
      </div>
      <div className="bg-gray-800/50 rounded-lg p-3">
        <p className="text-xs text-gray-500">Uptime</p>
        <p className="text-sm font-mono text-white">2h 34m</p>
      </div>
    </div>

    <p className="text-[10px] text-gray-600 text-center">
      Double-tap: Fullscreen | Pinch: Zoom | Long-press: Menu
    </p>
  </div>
);

// Mobile keyboard toolbar with common keys
const MobileKeyboardBar: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const commonKeys = [
    { label: "Tab", key: "\t" },
    { label: "Esc", key: "\x1b" },
    { label: "Ctrl", key: "ctrl", modifier: true },
    { label: "↑", key: "\x1b[A" },
    { label: "↓", key: "\x1b[B" },
    { label: "←", key: "\x1b[D" },
    { label: "→", key: "\x1b[C" },
  ];

  return (
    <div className="flex items-center gap-1 p-2 overflow-x-auto">
      {commonKeys.map((k) => (
        <button
          key={k.label}
          className="px-3 py-2 bg-gray-800 rounded text-sm text-gray-300 whitespace-nowrap active:bg-purple-500/30"
        >
          {k.label}
        </button>
      ))}
      <div className="flex-1" />
      <button
        onClick={onClose}
        className="px-3 py-2 bg-gray-800 rounded text-sm text-gray-400"
      >
        Done
      </button>
    </div>
  );
};

// Context menu for mobile
interface MobileContextMenuProps {
  onClose: () => void;
  onShare?: () => void;
  onFontSizeChange: (size: number) => void;
  fontSize: number;
}

const MobileContextMenu: React.FC<MobileContextMenuProps> = ({
  onClose,
  onShare,
  onFontSizeChange,
  fontSize,
}) => (
  <>
    {/* Backdrop */}
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50"
      onClick={onClose}
    />

    {/* Menu */}
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="fixed bottom-0 left-0 right-0 bg-gray-900 rounded-t-xl z-50 safe-area-bottom"
    >
      <div className="flex justify-center py-2">
        <div className="w-10 h-1 bg-gray-700 rounded-full" />
      </div>

      <div className="px-4 pb-4 space-y-4">
        {/* Font Size */}
        <div>
          <p className="text-sm text-gray-400 mb-2">Font Size</p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onFontSizeChange(Math.max(10, fontSize - 2))}
              className="p-2 bg-gray-800 rounded-lg text-white"
            >
              A-
            </button>
            <span className="flex-1 text-center text-white">{fontSize}px</span>
            <button
              onClick={() => onFontSizeChange(Math.min(24, fontSize + 2))}
              className="p-2 bg-gray-800 rounded-lg text-white"
            >
              A+
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          {onShare && (
            <button
              onClick={() => {
                onShare();
                onClose();
              }}
              className="w-full flex items-center gap-3 p-3 bg-gray-800 rounded-lg text-white"
            >
              <Share2 className="w-5 h-5" />
              <span>Share Session</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="w-full flex items-center gap-3 p-3 bg-gray-800 rounded-lg text-white"
          >
            <Settings className="w-5 h-5" />
            <span>Settings</span>
          </button>

          <button
            onClick={onClose}
            className="w-full flex items-center gap-3 p-3 bg-gray-800 rounded-lg text-white"
          >
            <RotateCcw className="w-5 h-5" />
            <span>Reconnect</span>
          </button>
        </div>

        {/* Cancel */}
        <button
          onClick={onClose}
          className="w-full p-3 bg-gray-800/50 rounded-lg text-gray-400"
        >
          Cancel
        </button>
      </div>
    </motion.div>
  </>
);

export default MobileTerminalView;
