import React from 'react';
import { motion } from 'framer-motion';
import { Briefcase, AlertTriangle, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import type { Workstream } from '../../types/governance.types';

interface ImpactMatrixProps {
  workstreams: Workstream[];
}

export const ImpactMatrix: React.FC<ImpactMatrixProps> = ({ workstreams }) => {
  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-500';
      case 'medium': return 'text-yellow-500';
      case 'high': return 'text-red-500';
      case 'critical': return 'text-red-600 animate-pulse';
      default: return 'text-gray-500';
    }
  };

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case 'low': return <CheckCircle className="w-3.5 h-3.5" />;
      case 'medium': return <AlertCircle className="w-3.5 h-3.5" />;
      case 'high': return <AlertTriangle className="w-3.5 h-3.5" />;
      case 'critical': return <AlertTriangle className="w-3.5 h-3.5" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'pending': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      case 'completed': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'blocked': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress < 30) return 'bg-red-500';
    if (progress < 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const activeCount = workstreams.filter(ws => ws.status === 'active').length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-gray-800/50 rounded-lg border border-gray-700/50 p-4"
      data-testid="governance-impact-matrix"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Briefcase className="w-5 h-5 text-blue-400" />
        <h3 className="font-semibold text-sm">Impact Matrix</h3>
        <span className="ml-auto text-xs text-gray-500">
          {activeCount} active
        </span>
      </div>

      {/* Workstreams */}
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {workstreams.map((ws) => (
          <motion.div
            key={ws.id}
            className="bg-gray-950/50 rounded-md p-3 border border-gray-700/30 hover:border-purple-500/30 transition-all"
            whileHover={{ scale: 1.02 }}
            data-testid={`workstream-${ws.id}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium truncate flex-1 text-gray-200">
                {ws.name}
              </span>
              <div className="flex items-center gap-2">
                <div className={`${getRiskColor(ws.risk)}`} title={`Risk: ${ws.risk}`}>
                  {getRiskIcon(ws.risk)}
                </div>
                <div className={`px-2 py-0.5 rounded text-xs border ${getStatusColor(ws.status)}`}>
                  {ws.status}
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
              <motion.div
                className={getProgressColor(ws.progress)}
                initial={{ width: 0 }}
                animate={{ width: `${ws.progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <div className="mt-1 flex justify-between text-xs text-gray-500">
              <span>{ws.progress}% complete</span>
              {ws.metrics && (
                <span>{ws.metrics.tasksCompleted}/{ws.metrics.totalTasks} tasks</span>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};