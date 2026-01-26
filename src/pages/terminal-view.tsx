/**
 * Terminal View Page
 * Full-screen view with Claude Code Terminal + Diff Visualization + Context Window HUD
 */

import React, { useState } from 'react';
import { ClaudeTerminal, DiffVisualization, ContextWindowHUD } from '../components/terminal';
import { motion } from 'framer-motion';
import { Terminal, X, Layout, Maximize2 } from 'lucide-react';

const TerminalView: React.FC = () => {
  const [showDiffPanel, setShowDiffPanel] = useState(true);
  const [showContextPanel, setShowContextPanel] = useState(true);

  const handleApplyDiff = (filePath: string) => {
    console.log('Applying diff for:', filePath);
    // TODO: Send apply command to backend
  };

  const handleRejectDiff = (filePath: string) => {
    console.log('Rejecting diff for:', filePath);
    // TODO: Send reject command to backend
  };

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
                onClick={() => setShowDiffPanel(!showDiffPanel)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  showDiffPanel
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
                title="Toggle Diff Panel"
              >
                Diffs {showDiffPanel ? 'ON' : 'OFF'}
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

        {/* Right Sidebar - Diff Visualization */}
        {showDiffPanel && (
          <DiffVisualization
            onApply={handleApplyDiff}
            onReject={handleRejectDiff}
          />
        )}
      </div>

      {/* Help Overlay */}
      <div className="fixed bottom-4 left-4 z-20">
        <div className="bg-gray-900/90 backdrop-blur-sm border border-gray-800 rounded-lg px-4 py-2">
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
        </div>
      </div>
    </div>
  );
};

export default TerminalView;
