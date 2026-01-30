/**
 * Session Restore Modal Component
 * Displayed when a previous session is detected on page load
 */

import React from "react";
import { Cloud, History, ArrowRight, X, Clock, Layout } from "lucide-react";

interface StoredSession {
  sessionId: string;
  sessionName: string;
  layout: string;
  projectRoot: string;
  createdAt: string;
  lastAccess: string;
}

interface SessionRestoreModalProps {
  session: StoredSession;
  onRestore: () => void;
  onNewSession: () => void;
  onClose: () => void;
}

export const SessionRestoreModal: React.FC<SessionRestoreModalProps> = ({
  session,
  onRestore,
  onNewSession,
  onClose,
}) => {
  const lastAccessDate = new Date(session.lastAccess);
  const formattedDate = lastAccessDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
              <History className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                Previous Session Found
              </h2>
              <p className="text-sm text-gray-400">
                Would you like to restore it?
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-800 rounded transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Session Info */}
        <div className="p-6 space-y-4">
          <div className="bg-gray-800/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4 text-green-400" />
              <span className="font-mono text-sm text-gray-300">
                {session.sessionName}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2 text-gray-400">
                <Layout className="w-3.5 h-3.5" />
                <span>Layout: {session.layout}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <Clock className="w-3.5 h-3.5" />
                <span>{formattedDate}</span>
              </div>
            </div>
          </div>

          <p className="text-sm text-gray-400">
            Restoring will reconnect you to your previous terminal session with
            all history and state intact.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onRestore}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition-all"
          >
            <History className="w-4 h-4" />
            Restore Session
          </button>
          <button
            onClick={onNewSession}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-all"
          >
            New Session
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionRestoreModal;
