/**
 * Context Window HUD
 * Visualizes what files Claude is analyzing and token usage heat map
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Brain,
  Activity,
  TrendingUp,
  Folder,
  Eye,
  Layers
} from 'lucide-react';

interface ContextFile {
  path: string;
  tokens: number;
  status: 'reading' | 'analyzing' | 'complete';
  lastAccessed: Date;
}

interface ContextData {
  files: ContextFile[];
  totalTokens: number;
  maxTokens: number;
  currentThought: string;
}

interface ContextWindowHUDProps {
  className?: string;
}

export const ContextWindowHUD: React.FC<ContextWindowHUDProps> = ({
  className = ''
}) => {
  const [contextData, setContextData] = useState<ContextData>({
    files: [],
    totalTokens: 0,
    maxTokens: 200000,
    currentThought: ''
  });

  useEffect(() => {
    // Listen for context events from ClaudeTerminal
    const handleContext = (event: CustomEvent) => {
      const data = event.detail as ContextData;
      setContextData(data);
    };

    window.addEventListener('claude-context' as any, handleContext);

    return () => {
      window.removeEventListener('claude-context' as any, handleContext);
    };
  }, []);

  const tokenPercentage = (contextData.totalTokens / contextData.maxTokens) * 100;
  const getTokenColor = () => {
    if (tokenPercentage < 50) return 'bg-green-500';
    if (tokenPercentage < 75) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getFileIntensity = (tokens: number) => {
    const maxFileTokens = Math.max(...contextData.files.map(f => f.tokens), 1);
    const intensity = (tokens / maxFileTokens) * 100;

    if (intensity < 25) return 'bg-blue-500/20 border-blue-500/30';
    if (intensity < 50) return 'bg-yellow-500/20 border-yellow-500/30';
    if (intensity < 75) return 'bg-orange-500/20 border-orange-500/30';
    return 'bg-red-500/20 border-red-500/30';
  };

  const getStatusIcon = (status: ContextFile['status']) => {
    switch (status) {
      case 'reading':
        return <Eye className="w-3.5 h-3.5 text-blue-400 animate-pulse" />;
      case 'analyzing':
        return <Brain className="w-3.5 h-3.5 text-purple-400 animate-pulse" />;
      case 'complete':
        return <Activity className="w-3.5 h-3.5 text-green-400" />;
    }
  };

  if (contextData.files.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`bg-gray-900/95 backdrop-blur-sm border border-gray-800 rounded-xl shadow-2xl ${className}`}
      data-testid="context-window-hud"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-800">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-400" />
            <h3 className="font-semibold text-sm">Context Window</h3>
          </div>
          <div className="text-xs text-gray-500">
            {contextData.files.length} files loaded
          </div>
        </div>

        {/* Token Usage Bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">Token Usage</span>
            <span className="font-mono text-gray-300">
              {contextData.totalTokens.toLocaleString()} / {contextData.maxTokens.toLocaleString()}
            </span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              className={`h-full ${getTokenColor()}`}
              initial={{ width: 0 }}
              animate={{ width: `${tokenPercentage}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
          <div className="text-xs text-gray-500">
            {tokenPercentage.toFixed(1)}% capacity
          </div>
        </div>
      </div>

      {/* Current Thought */}
      {contextData.currentThought && (
        <div className="px-4 py-3 border-b border-gray-800 bg-purple-500/5">
          <div className="flex items-start gap-2">
            <TrendingUp className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-purple-400 mb-1">Claude is thinking...</div>
              <p className="text-sm text-gray-300 italic">{contextData.currentThought}</p>
            </div>
          </div>
        </div>
      )}

      {/* Files Heat Map */}
      <div className="max-h-96 overflow-y-auto">
        <div className="p-2 space-y-1">
          <AnimatePresence mode="popLayout">
            {contextData.files.map((file, index) => (
              <motion.div
                key={file.path}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
                className={`p-2 rounded-lg border ${getFileIntensity(file.tokens)} transition-all`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {getStatusIcon(file.status)}
                    <FileText className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span className="text-xs font-mono text-gray-300 truncate">
                      {file.path}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <span className="text-xs text-gray-500 font-mono">
                      {file.tokens.toLocaleString()}
                    </span>
                    <div
                      className="w-12 h-1.5 bg-gray-800 rounded-full overflow-hidden"
                      title={`${((file.tokens / contextData.maxTokens) * 100).toFixed(1)}% of total`}
                    >
                      <div
                        className={`h-full ${getTokenColor()}`}
                        style={{ width: `${(file.tokens / contextData.maxTokens) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer Stats */}
      <div className="px-4 py-2 border-t border-gray-800 bg-gray-950/50">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-xs text-gray-500 mb-1">Reading</div>
            <div className="text-sm font-semibold text-blue-400">
              {contextData.files.filter(f => f.status === 'reading').length}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Analyzing</div>
            <div className="text-sm font-semibold text-purple-400">
              {contextData.files.filter(f => f.status === 'analyzing').length}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Complete</div>
            <div className="text-sm font-semibold text-green-400">
              {contextData.files.filter(f => f.status === 'complete').length}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
