/**
 * Terminal View Page
 * Full-screen view with Claude Code Terminal + Governance HUD + Context Window HUD
 */

import React, { useState } from 'react';
import { ClaudeTerminal, ContextWindowHUD } from '../components/terminal';
import { GovernanceHUD } from '../components/governance';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, X, Layout, Maximize2, Info } from 'lucide-react';
import { useToast } from '../components/feedback/ToastSystem';

const TerminalView: React.FC = () => {
  const [showGovernancePanel, setShowGovernancePanel] = useState(true);
  const [showContextPanel, setShowContextPanel] = useState(true);
  const [showHelpOverlay, setShowHelpOverlay] = useState(false);
  const { toast } = useToast();

  const handleDangerousCommand = async (command: string): Promise<boolean> => {
    // This returns true if user approves, false if they cancel
    // The ClaudeTerminal component already shows the modal
    return true;
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white" data-testid="terminal-view-container">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-30">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Terminal className="w-6 h-6 text-purple-400" />
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                Agentic Command Center
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowContextPanel(!showContextPanel)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  showContextPanel
                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
                title="Toggle Context Window"
              >
                Context {showContextPanel ? 'ON' : 'OFF'}
              </button>
              <button
                onClick={() => setShowGovernancePanel(!showGovernancePanel)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  showGovernancePanel
                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
                title="Toggle Governance Panel"
              >
                Governance {showGovernancePanel ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex h-[calc(100vh-73px)]">
        {/* Left Sidebar - Context Window */}
        {showContextPanel && (
          <motion.aside
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            className="w-80 border-r border-gray-800 bg-gray-950 flex-shrink-0"
            data-testid="context-window-hud"
          >
            <div className="h-full overflow-hidden p-4">
              <ContextWindowHUD className="h-full" />
            </div>
          </motion.aside>
        )}

        {/* Center - Terminal */}
        <main className="flex-1 min-w-0 bg-black">
          <ClaudeTerminal
            onCommandExecute={(cmd) => console.log('Command executed:', cmd)}
            onDangerousCommand={handleDangerousCommand}
            className="h-full"
          />
        </main>

        {/* Right Sidebar - Governance HUD */}
        {showGovernancePanel && (
          <ErrorBoundary fallbackMessage="Governance HUD encountered an error. The terminal remains functional.">
            <GovernanceHUD />
          </ErrorBoundary>
        )}
      </div>

      {/* Help Overlay - Collapsible */}
      <div className="fixed bottom-4 left-4 z-20" data-testid="help-overlay">
        <AnimatePresence mode="wait">
          {showHelpOverlay ? (
            /* Expanded - Keyboard Shortcuts */
            <motion.div
              key="expanded"
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              transition={{ duration: 0.2 }}
              className="bg-gray-900/90 backdrop-blur-sm border border-gray-800 rounded-lg px-4 py-3"
              data-testid="help-overlay-expanded"
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-gray-300">Keyboard Shortcuts</h4>
                <button
                  onClick={() => setShowHelpOverlay(false)}
                  className="p-0.5 rounded hover:bg-gray-800 transition-colors"
                  data-testid="help-overlay-close-btn"
                  title="Close"
                >
                  <X className="w-3.5 h-3.5 text-gray-500" />
                </button>
              </div>
              <div className="text-xs space-y-1">
                <div className="flex items-center gap-2 text-gray-400">
                  <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-xs">Ctrl+C</kbd>
                  <span>Cancel command</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-xs">Ctrl+L</kbd>
                  <span>Clear terminal</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-xs">↑/↓</kbd>
                  <span>Command history</span>
                </div>
              </div>
            </motion.div>
          ) : (
            /* Collapsed - Info Icon */
            <motion.button
              key="collapsed"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              onClick={() => setShowHelpOverlay(true)}
              className="p-3 bg-gray-900/90 backdrop-blur-sm border border-gray-800 rounded-full
                       hover:bg-gray-800 hover:border-purple-500/30 transition-all group"
              data-testid="help-overlay-toggle-btn"
              title="Show keyboard shortcuts"
            >
              <Info className="w-5 h-5 text-gray-500 group-hover:text-purple-400 transition-colors" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default TerminalView;
