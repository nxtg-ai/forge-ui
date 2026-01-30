import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Info, CheckCircle, AlertTriangle, XOctagon } from 'lucide-react';
import type { SentinelEntry } from '../../types/governance.types';

interface OracleFeedProps {
  logs: SentinelEntry[];
}

export const OracleFeed: React.FC<OracleFeedProps> = ({ logs }) => {
  const [isPaused, setIsPaused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive (unless paused)
  useEffect(() => {
    if (!isPaused && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isPaused]);

  const getLogColor = (type: string) => {
    switch (type) {
      case 'INFO':
        return 'text-gray-400';
      case 'SUCCESS':
        return 'text-green-400';
      case 'WARN':
        return 'text-yellow-400';
      case 'ERROR':
        return 'text-red-400 animate-pulse';
      case 'CRITICAL':
        return 'text-red-500 animate-pulse';
      default:
        return 'text-gray-400';
    }
  };

  const getLogIcon = (type: string) => {
    const className = "w-3 h-3 flex-shrink-0";
    switch (type) {
      case 'INFO':
        return <Info className={className} />;
      case 'SUCCESS':
        return <CheckCircle className={className} />;
      case 'WARN':
        return <AlertTriangle className={className} />;
      case 'ERROR':
        return <XOctagon className={className} />;
      case 'CRITICAL':
        return <XOctagon className={className} />;
      default:
        return <Info className={className} />;
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-gray-950/50 rounded-lg border border-gray-700/50 p-4"
      data-testid="governance-oracle-feed"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Terminal className="w-5 h-5 text-green-400" />
        <h3 className="font-semibold text-sm">Oracle Feed</h3>
        <div className="ml-auto flex items-center gap-2">
          {isPaused && (
            <span className="text-xs text-yellow-400">Paused</span>
          )}
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        </div>
      </div>

      {/* Terminal Log */}
      <div
        ref={scrollRef}
        className="bg-black/50 rounded-md p-2 h-32 overflow-y-auto font-mono text-xs space-y-1 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        data-testid="oracle-feed-terminal"
      >
        <AnimatePresence mode="popLayout">
          {logs.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              className="text-gray-600 text-center py-8"
            >
              Waiting for Oracle feed...
            </motion.div>
          ) : (
            logs.map((log) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className="flex items-start gap-2 group hover:bg-gray-900/30 px-1 py-0.5 rounded"
                data-testid={`log-entry-${log.type.toLowerCase()}`}
              >
                {/* Timestamp */}
                <span className="text-gray-600 flex-shrink-0 select-none">
                  {formatTimestamp(log.timestamp)}
                </span>

                {/* Icon */}
                <span className={getLogColor(log.type)}>
                  {getLogIcon(log.type)}
                </span>

                {/* Message */}
                <span className={`break-all ${getLogColor(log.type)}`}>
                  {log.message}
                </span>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
        <span>{logs.length} entries</span>
        <span className="text-gray-600">
          {isPaused ? 'Scroll paused' : 'Auto-scrolling'}
        </span>
      </div>
    </motion.div>
  );
};