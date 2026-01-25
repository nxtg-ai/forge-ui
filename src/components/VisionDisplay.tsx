import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target, Sparkles, CheckCircle, Clock, TrendingUp,
  AlertTriangle, Edit3, Lock, Unlock, GitBranch,
  Flag, Compass, Mountain, Trophy, Zap
} from 'lucide-react';
import { ProgressBar } from './ui/ProgressBar';

interface VisionDisplayProps {
  vision: VisionData;
  progress: ProgressData;
  onVisionUpdate?: (vision: VisionData) => void;
  isLocked?: boolean;
  compactMode?: boolean;
}

interface VisionData {
  mission: string;
  goals: Goal[];
  constraints: string[];
  successMetrics: Metric[];
  timeframe: string;
  createdAt: Date;
  lastUpdated: Date;
  version: number;
}

interface Goal {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'blocked';
  progress: number;
  dependencies: string[];
}

interface Metric {
  id: string;
  name: string;
  current: number;
  target: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
}

interface ProgressData {
  overallProgress: number;
  phase: string;
  daysElapsed: number;
  estimatedDaysRemaining: number;
  velocity: number;
  blockers: number;
}

export const VisionDisplay: React.FC<VisionDisplayProps> = ({
  vision,
  progress,
  onVisionUpdate,
  isLocked = false,
  compactMode = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null);
  const [showMetrics, setShowMetrics] = useState(!compactMode);

  const getGoalStatusColor = (status: Goal['status']) => {
    const colors = {
      'pending': 'text-gray-400 bg-gray-500/10 border-gray-500/20',
      'in-progress': 'text-blue-400 bg-blue-500/10 border-blue-500/20',
      'completed': 'text-green-400 bg-green-500/10 border-green-500/20',
      'blocked': 'text-red-400 bg-red-500/10 border-red-500/20'
    };
    return colors[status];
  };

  const getTrendIcon = (trend: Metric['trend']) => {
    if (trend === 'up') return '↑';
    if (trend === 'down') return '↓';
    return '→';
  };

  const getTrendColor = (trend: Metric['trend']) => {
    if (trend === 'up') return 'text-green-400';
    if (trend === 'down') return 'text-red-400';
    return 'text-gray-400';
  };

  if (compactMode) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-4 rounded-xl bg-gradient-to-r from-purple-900/10 to-blue-900/10 border border-purple-500/20"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Compass className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-200 line-clamp-1">
                {vision.mission}
              </div>
              <div className="text-xs text-gray-500">
                {progress.overallProgress}% complete • {vision.goals.length} goals
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowMetrics(!showMetrics)}
            className="text-xs text-gray-400 hover:text-gray-200 transition-colors"
          >
            {showMetrics ? 'Hide' : 'Show'} Details
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Mission Statement */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-900/20 via-blue-900/10 to-cyan-900/10 border border-purple-500/20">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <Mountain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                North Star Vision
              </h2>
              <div className="text-xs text-gray-500">
                v{vision.version} • Updated {new Date(vision.lastUpdated).toLocaleDateString()}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isLocked ? (
              <div className="px-3 py-1 rounded-lg bg-gray-800 text-gray-400 text-xs flex items-center gap-1">
                <Lock className="w-3 h-3" />
                Locked
              </div>
            ) : (
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="px-3 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs flex items-center gap-1 transition-all"
              >
                <Edit3 className="w-3 h-3" />
                Edit Vision
              </button>
            )}
          </div>
        </div>

        <p className="text-lg text-gray-200 leading-relaxed mb-4">
          {vision.mission}
        </p>

        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className="text-gray-400">Timeframe:</span>
            <span className="text-gray-200 font-medium">{vision.timeframe}</span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="w-4 h-4 text-gray-500" />
            <span className="text-gray-400">Progress:</span>
            <span className="text-gray-200 font-medium">{progress.overallProgress}%</span>
          </div>
          <div className="flex items-center gap-1">
            <Zap className="w-4 h-4 text-gray-500" />
            <span className="text-gray-400">Velocity:</span>
            <span className="text-gray-200 font-medium">{progress.velocity}x</span>
          </div>
        </div>
      </div>

      {/* Goals Grid */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-blue-400" />
          Strategic Goals
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {vision.goals.map((goal) => (
            <motion.div
              key={goal.id}
              layout
              className="p-4 rounded-xl bg-gray-900/50 border border-gray-800 hover:border-gray-700 transition-all cursor-pointer"
              onClick={() => setExpandedGoal(expandedGoal === goal.id ? null : goal.id)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`
                    px-2 py-1 rounded-lg text-xs font-medium
                    ${getGoalStatusColor(goal.status)}
                  `}>
                    {goal.status.replace('-', ' ')}
                  </div>
                  {goal.dependencies.length > 0 && (
                    <div className="px-2 py-1 rounded-lg bg-gray-800 text-gray-500 text-xs flex items-center gap-1">
                      <GitBranch className="w-3 h-3" />
                      {goal.dependencies.length}
                    </div>
                  )}
                </div>
                <div className="text-sm font-medium text-gray-300">
                  {goal.progress}%
                </div>
              </div>

              <h4 className="font-medium text-gray-200 mb-1">{goal.title}</h4>
              <p className="text-sm text-gray-400 line-clamp-2">{goal.description}</p>

              {/* Progress Bar */}
              <ProgressBar
                value={goal.progress}
                max={100}
                className="mt-3 h-1"
                animated={true}
              />

              <AnimatePresence>
                {expandedGoal === goal.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-4 pt-4 border-t border-gray-800"
                  >
                    {goal.dependencies.length > 0 && (
                      <div className="mb-3">
                        <div className="text-xs text-gray-500 mb-2">Dependencies</div>
                        <div className="flex flex-wrap gap-2">
                          {goal.dependencies.map(dep => (
                            <div key={dep} className="px-2 py-1 rounded bg-gray-800 text-xs text-gray-400">
                              {dep}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Success Metrics */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-400" />
          Success Metrics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {vision.successMetrics.map((metric) => (
            <div
              key={metric.id}
              className="p-4 rounded-xl bg-gray-900/50 border border-gray-800"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">{metric.name}</span>
                <span className={`text-lg font-bold ${getTrendColor(metric.trend)}`}>
                  {getTrendIcon(metric.trend)}
                </span>
              </div>
              <div className="text-2xl font-bold text-gray-200 mb-1">
                {metric.current}{metric.unit}
              </div>
              <div className="text-xs text-gray-500">
                Target: {metric.target}{metric.unit}
              </div>
              <ProgressBar
                value={metric.current}
                max={metric.target}
                className="mt-2 h-1"
                fillColor="bg-gradient-to-r from-green-500 to-emerald-500"
                animated={false}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Constraints */}
      {vision.constraints.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            Constraints & Boundaries
          </h3>
          <div className="p-4 rounded-xl bg-amber-900/10 border border-amber-500/20">
            <ul className="space-y-2">
              {vision.constraints.map((constraint, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <span className="text-amber-400 mt-0.5">•</span>
                  <span className="text-gray-300">{constraint}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Timeline Progress */}
      <div className="p-4 rounded-xl bg-gray-900/50 border border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-gray-300">Timeline Progress</span>
          </div>
          <div className="text-sm text-gray-400">
            Day {progress.daysElapsed} of estimated {progress.daysElapsed + progress.estimatedDaysRemaining}
          </div>
        </div>
        <ProgressBar
          value={progress.daysElapsed}
          max={progress.daysElapsed + progress.estimatedDaysRemaining}
          className="h-2"
          animated={false}
        />
        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
          <span>Started {progress.daysElapsed} days ago</span>
          <span>{progress.estimatedDaysRemaining} days remaining</span>
        </div>
      </div>

      {/* Blockers Alert */}
      {progress.blockers > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 rounded-xl bg-red-900/10 border border-red-500/20"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <div className="font-medium text-red-400">
                {progress.blockers} Blocker{progress.blockers !== 1 ? 's' : ''} Detected
              </div>
              <div className="text-xs text-gray-400">
                Your Chief of Staff is working to resolve these issues
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};