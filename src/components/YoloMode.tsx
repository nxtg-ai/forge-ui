import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, Shield, AlertTriangle, CheckCircle, XCircle,
  Activity, TrendingUp, RefreshCw, Cpu, GitBranch,
  Package, Terminal, Code2, Settings, Lock, Unlock,
  Sparkles, Brain, Target, ChevronRight, Info
} from 'lucide-react';

interface YoloModeProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  automationLevel: AutomationLevel;
  onLevelChange: (level: AutomationLevel) => void;
  recentActions: AutomatedAction[];
  statistics: YoloStatistics;
}

type AutomationLevel = 'conservative' | 'balanced' | 'aggressive' | 'maximum';

interface AutomatedAction {
  id: string;
  type: 'fix' | 'optimize' | 'refactor' | 'update' | 'deploy';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'reverted';
  timestamp: Date;
  confidence: number;
  automated: boolean;
}

interface YoloStatistics {
  actionsToday: number;
  successRate: number;
  timesSaved: number; // in minutes
  issuesFixed: number;
  performanceGain: number; // percentage
  costSaved: number; // in dollars
}

export const YoloMode: React.FC<YoloModeProps> = ({
  enabled,
  onToggle,
  automationLevel,
  onLevelChange,
  recentActions,
  statistics
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [selectedAction, setSelectedAction] = useState<AutomatedAction | null>(null);
  const [pulseAnimation, setPulseAnimation] = useState(false);

  useEffect(() => {
    if (enabled) {
      setPulseAnimation(true);
      const timer = setTimeout(() => setPulseAnimation(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [enabled]);

  const automationLevels: Record<AutomationLevel, {
    label: string;
    description: string;
    color: string;
    icon: JSX.Element;
    permissions: string[];
  }> = {
    conservative: {
      label: 'Conservative',
      description: 'Only auto-fix critical issues with high confidence',
      color: 'blue',
      icon: <Shield className="w-4 h-4" />,
      permissions: ['Fix syntax errors', 'Update dependencies', 'Apply linting']
    },
    balanced: {
      label: 'Balanced',
      description: 'Fix issues and apply safe optimizations',
      color: 'green',
      icon: <Activity className="w-4 h-4" />,
      permissions: ['All Conservative', 'Performance optimizations', 'Code refactoring', 'Test generation']
    },
    aggressive: {
      label: 'Aggressive',
      description: 'Proactive improvements and architecture decisions',
      color: 'orange',
      icon: <Zap className="w-4 h-4" />,
      permissions: ['All Balanced', 'Architecture changes', 'Feature enhancements', 'Auto-deploy to staging']
    },
    maximum: {
      label: 'Maximum YOLO',
      description: 'Full autonomous operation with learning',
      color: 'red',
      icon: <Brain className="w-4 h-4" />,
      permissions: ['All Aggressive', 'Production deploys', 'API redesigns', 'Database migrations', 'Self-evolution']
    }
  };

  const getActionIcon = (type: AutomatedAction['type']) => {
    const icons = {
      fix: <AlertTriangle className="w-4 h-4" />,
      optimize: <TrendingUp className="w-4 h-4" />,
      refactor: <Code2 className="w-4 h-4" />,
      update: <Package className="w-4 h-4" />,
      deploy: <GitBranch className="w-4 h-4" />
    };
    return icons[type];
  };

  const getStatusColor = (status: AutomatedAction['status']) => {
    const colors = {
      pending: 'text-gray-400 bg-gray-500/10',
      executing: 'text-yellow-400 bg-yellow-500/10',
      completed: 'text-green-400 bg-green-500/10',
      failed: 'text-red-400 bg-red-500/10',
      reverted: 'text-orange-400 bg-orange-500/10'
    };
    return colors[status];
  };

  const getImpactColor = (impact: AutomatedAction['impact']) => {
    const colors = {
      low: 'border-gray-600',
      medium: 'border-yellow-500',
      high: 'border-red-500'
    };
    return colors[impact];
  };

  const currentLevel = automationLevels[automationLevel];

  return (
    <div data-testid="yolo-panel" className="space-y-6">
      {/* Main Control Panel */}
      <motion.div
        data-testid="yolo-control-panel"
        className={`
          p-6 rounded-2xl border transition-all duration-500
          ${enabled
            ? 'bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-purple-500/30'
            : 'bg-gray-900/50 border-gray-800'}
        `}
        animate={pulseAnimation ? { scale: [1, 1.02, 1] } : {}}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              data-testid="yolo-toggle-btn"
              onClick={() => onToggle(!enabled)}
              className={`
                relative w-20 h-10 rounded-full transition-all duration-300
                ${enabled ? 'bg-gradient-to-r from-purple-500 to-blue-500' : 'bg-gray-700'}
              `}
            >
              <motion.div
                className="absolute top-1 w-8 h-8 bg-white rounded-full shadow-lg"
                animate={{ left: enabled ? '44px' : '4px' }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
              {enabled && (
                <motion.div
                  className="absolute inset-0 rounded-full"
                  animate={{ boxShadow: ['0 0 0 0 rgba(168, 85, 247, 0.4)', '0 0 0 20px rgba(168, 85, 247, 0)'] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}
            </button>

            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                YOLO Mode
                {enabled && (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  >
                    <Zap className="w-6 h-6 text-yellow-400" />
                  </motion.div>
                )}
              </h2>
              <p className="text-sm text-gray-400">
                {enabled ? 'Autonomous operations active' : 'Manual control mode'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowDetails(!showDetails)}
            className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm transition-all"
          >
            {showDetails ? 'Hide' : 'Show'} Details
          </button>
        </div>

        {/* Automation Level Selector */}
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-400">Automation Level</span>
            <div className="flex items-center gap-2">
              {currentLevel.icon}
              <span className={`text-sm font-medium text-${currentLevel.color}-400`}>
                {currentLevel.label}
              </span>
            </div>
          </div>

          <div data-testid="yolo-level-grid" className="grid grid-cols-4 gap-2">
            {Object.entries(automationLevels).map(([level, config]) => (
              <button
                key={level}
                data-testid={`yolo-level-btn-${level}`}
                onClick={() => onLevelChange(level as AutomationLevel)}
                disabled={!enabled}
                className={`
                  p-3 rounded-lg border transition-all relative
                  ${automationLevel === level
                    ? `bg-${config.color}-500/20 border-${config.color}-500/40 text-${config.color}-400`
                    : enabled
                    ? 'bg-gray-900/50 border-gray-800 hover:border-gray-700 text-gray-400'
                    : 'bg-gray-900/30 border-gray-800 text-gray-600 cursor-not-allowed'}
                `}
              >
                <div className="flex flex-col items-center gap-1">
                  {config.icon}
                  <span className="text-xs font-medium">{config.label}</span>
                </div>
                {automationLevel === level && (
                  <motion.div
                    className="absolute inset-0 rounded-lg border-2 border-current"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  />
                )}
              </button>
            ))}
          </div>

          {enabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="p-3 rounded-lg bg-gray-900/50 border border-gray-800"
            >
              <p className="text-sm text-gray-300 mb-2">{currentLevel.description}</p>
              <div className="space-y-1">
                <div className="text-xs text-gray-500">Permissions:</div>
                {currentLevel.permissions.map((permission, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs text-gray-400">
                    <CheckCircle className="w-3 h-3 text-green-400" />
                    {permission}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Statistics Dashboard */}
      {enabled && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"
        >
          <div className="p-4 rounded-xl bg-gray-900/50 border border-gray-800">
            <div className="text-2xl font-bold text-blue-400">{statistics.actionsToday}</div>
            <div className="text-xs text-gray-500">Actions Today</div>
          </div>
          <div className="p-4 rounded-xl bg-gray-900/50 border border-gray-800">
            <div className="text-2xl font-bold text-green-400">{statistics.successRate}%</div>
            <div className="text-xs text-gray-500">Success Rate</div>
          </div>
          <div className="p-4 rounded-xl bg-gray-900/50 border border-gray-800">
            <div className="text-2xl font-bold text-purple-400">{statistics.timesSaved}m</div>
            <div className="text-xs text-gray-500">Time Saved</div>
          </div>
          <div className="p-4 rounded-xl bg-gray-900/50 border border-gray-800">
            <div className="text-2xl font-bold text-yellow-400">{statistics.issuesFixed}</div>
            <div className="text-xs text-gray-500">Issues Fixed</div>
          </div>
          <div className="p-4 rounded-xl bg-gray-900/50 border border-gray-800">
            <div className="text-2xl font-bold text-cyan-400">+{statistics.performanceGain}%</div>
            <div className="text-xs text-gray-500">Performance</div>
          </div>
          <div className="p-4 rounded-xl bg-gray-900/50 border border-gray-800">
            <div className="text-2xl font-bold text-emerald-400">${statistics.costSaved}</div>
            <div className="text-xs text-gray-500">Cost Saved</div>
          </div>
        </motion.div>
      )}

      {/* Recent Automated Actions */}
      {enabled && showDetails && recentActions.length > 0 && (
        <motion.div
          data-testid="yolo-actions-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-2xl bg-gray-900/50 border border-gray-800"
        >
          <h3 data-testid="yolo-actions-title" className="text-lg font-semibold mb-4 flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-blue-400" />
            Recent Automated Actions
          </h3>

          <div data-testid="yolo-actions-list" className="space-y-3">
            <AnimatePresence>
              {recentActions.slice(0, 5).map((action, idx) => (
                <motion.div
                  key={action.id}
                  data-testid={`yolo-action-item-${action.id}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => setSelectedAction(action)}
                  className={`
                    p-4 rounded-xl border cursor-pointer transition-all
                    ${getImpactColor(action.impact)}
                    hover:bg-gray-900
                  `}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center">
                        {getActionIcon(action.type)}
                      </div>
                      <div>
                        <div className="font-medium text-sm flex items-center gap-2">
                          {action.title}
                          {action.automated && (
                            <div className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-xs">
                              Auto
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{action.description}</div>
                        <div className="flex items-center gap-3 mt-2 text-xs">
                          <div className={`px-2 py-1 rounded-lg ${getStatusColor(action.status)}`}>
                            {action.status}
                          </div>
                          <div className="text-gray-500">
                            Confidence: {action.confidence}%
                          </div>
                          <div className="text-gray-500">
                            {new Date(action.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      )}

      {/* Action Detail Modal */}
      <AnimatePresence>
        {selectedAction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-6"
            onClick={() => setSelectedAction(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl bg-gray-900 rounded-2xl border border-gray-800 p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Action Details</h2>
                <button
                  onClick={() => setSelectedAction(null)}
                  className="text-gray-500 hover:text-gray-300"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="text-sm text-gray-400 mb-1">Action</div>
                  <div className="font-medium text-lg">{selectedAction.title}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400 mb-1">Description</div>
                  <div className="text-gray-300">{selectedAction.description}</div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-400 mb-1">Type</div>
                    <div className="capitalize">{selectedAction.type}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400 mb-1">Impact</div>
                    <div className="capitalize">{selectedAction.impact}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400 mb-1">Status</div>
                    <div className={`inline-flex px-3 py-1 rounded-lg ${getStatusColor(selectedAction.status)}`}>
                      {selectedAction.status}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400 mb-1">Confidence</div>
                    <div>{selectedAction.confidence}%</div>
                  </div>
                </div>

                {selectedAction.status === 'failed' && (
                  <div className="p-4 rounded-xl bg-red-900/20 border border-red-500/30">
                    <div className="flex items-center gap-2 text-red-400 mb-2">
                      <XCircle className="w-4 h-4" />
                      <span className="font-medium">Action Failed</span>
                    </div>
                    <p className="text-sm text-gray-300">
                      The system will analyze the failure and adjust future automation decisions.
                    </p>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  {selectedAction.status === 'completed' && (
                    <button data-testid="yolo-rollback-btn" className="px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 transition-all">
                      Revert Action
                    </button>
                  )}
                  <button data-testid="yolo-view-logs-btn" className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-all">
                    View Logs
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};