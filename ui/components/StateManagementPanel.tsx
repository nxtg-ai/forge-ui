import { forwardRef, type HTMLAttributes } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { Button } from './Button';

/**
 * State Management Panel
 *
 * Visual representation of current session state.
 * Addresses the critical "wtf is remembering where we are at" pain point.
 *
 * Features:
 * - Progress visualization
 * - Task summary (active/completed)
 * - Recent decisions display
 * - Engagement quality score
 * - Quick actions (save checkpoint, continue, view details)
 * - Real-time updates via WebSocket
 *
 * This component will be connected to .claude/forge/state.json
 */

interface Todo {
  content: string;
  activeForm: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority?: 'P0' | 'P1' | 'P2' | 'P3';
}

interface Decision {
  decision: string;
  rationale: string;
  timestamp: string;
  alternatives_considered?: string[];
}

interface StateManagementPanelProps extends HTMLAttributes<HTMLDivElement> {
  /** Current goal/objective */
  currentGoal?: string;
  /** Progress percentage (0-100) */
  progress?: number;
  /** Active todos */
  activeTodos?: Todo[];
  /** Completed todos */
  completedTodos?: Todo[];
  /** Recent decisions */
  recentDecisions?: Decision[];
  /** Engagement quality score (0-100) */
  engagementScore?: number;
  /** Last state save timestamp */
  lastSaved?: string;
  /** Callbacks */
  onViewDetails?: () => void;
  onSaveCheckpoint?: () => void;
  onContinue?: () => void;
}

export const StateManagementPanel = forwardRef<HTMLDivElement, StateManagementPanelProps>(
  (
    {
      currentGoal = 'No active goal set',
      progress = 0,
      activeTodos = [],
      completedTodos = [],
      recentDecisions = [],
      engagementScore = 100,
      lastSaved = 'Never',
      onViewDetails,
      onSaveCheckpoint,
      onContinue,
      className,
      ...props
    },
    ref
  ) => {
    return (
      <Card
        ref={ref}
        variant="glass"
        padding="lg"
        className={`max-w-2xl ${className || ''}`}
        {...props}
      >
        {/* Header */}
        <CardHeader className="mb-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="mb-2">Session State</CardTitle>
              <p className="text-sm text-surface-300">{currentGoal}</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-surface-400">
              <div className={`h-2 w-2 rounded-full ${getStatusColor(lastSaved)} animate-pulse`} />
              <span>Last saved: {lastSaved}</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-surface-300">Overall Progress</span>
              <span className="text-brand-400 font-mono">{progress}%</span>
            </div>
            <div className="h-2 bg-surface-700/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-brand-500 to-brand-400 rounded-full transition-all duration-slow ease-spring"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Task Summary */}
          <div className="grid grid-cols-2 gap-4">
            <Card variant="bordered" padding="md" hoverable>
              <div className="text-center">
                <div className="text-3xl font-bold text-warning-400">
                  {activeTodos.length}
                </div>
                <div className="text-sm text-surface-400 mt-1">Active Tasks</div>
                {activeTodos.length > 0 && (
                  <div className="mt-3 text-xs text-left space-y-1">
                    {activeTodos.slice(0, 2).map((todo, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-surface-300">
                        <div className="h-1.5 w-1.5 rounded-full bg-warning-400" />
                        <span className="truncate">{todo.content}</span>
                      </div>
                    ))}
                    {activeTodos.length > 2 && (
                      <div className="text-surface-500 pl-3.5">
                        +{activeTodos.length - 2} more
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>

            <Card variant="bordered" padding="md" hoverable>
              <div className="text-center">
                <div className="text-3xl font-bold text-success-400">
                  {completedTodos.length}
                </div>
                <div className="text-sm text-surface-400 mt-1">Completed</div>
                {completedTodos.length > 0 && (
                  <div className="mt-3 text-xs text-left space-y-1">
                    {completedTodos.slice(-2).map((todo, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-surface-300">
                        <div className="h-1.5 w-1.5 rounded-full bg-success-400" />
                        <span className="truncate line-through opacity-70">{todo.content}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Recent Decisions */}
          {recentDecisions.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-surface-200">Recent Decisions</h4>
              <div className="space-y-2">
                {recentDecisions.slice(0, 3).map((decision, idx) => (
                  <Card key={idx} variant="default" padding="sm">
                    <div className="flex items-start gap-2">
                      <div className="mt-1 h-1.5 w-1.5 rounded-full bg-brand-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-surface-200 font-medium">
                          {decision.decision}
                        </p>
                        <p className="text-xs text-surface-400 mt-1">
                          {decision.rationale}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Engagement Quality Score */}
          <Card variant="neon" padding="md">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-surface-300">Engagement Quality</div>
                <div className="text-xs text-surface-500 mt-0.5">
                  Maintains high-quality updates
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-neon-blue">
                  {engagementScore}%
                </div>
                <div className="text-xs text-surface-400 mt-0.5">
                  {getEngagementLabel(engagementScore)}
                </div>
              </div>
            </div>
          </Card>

          {/* Quick Actions */}
          <div className="flex items-center gap-3 pt-4 border-t border-surface-700/50">
            <Button
              variant="primary"
              size="md"
              onClick={onViewDetails}
              fullWidth
            >
              View Details
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={onSaveCheckpoint}
              fullWidth
            >
              Save Checkpoint
            </Button>
            <Button
              variant="success"
              size="md"
              onClick={onContinue}
              fullWidth
            >
              Continue
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
);

StateManagementPanel.displayName = 'StateManagementPanel';

// Helper functions
function getStatusColor(lastSaved: string): string {
  if (lastSaved === 'Never') return 'bg-error-500';
  if (lastSaved.includes('second') || lastSaved.includes('minute')) return 'bg-success-500';
  if (lastSaved.includes('hour')) return 'bg-warning-500';
  return 'bg-error-500';
}

function getEngagementLabel(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 80) return 'Very Good';
  if (score >= 70) return 'Good';
  if (score >= 60) return 'Fair';
  return 'Needs Improvement';
}

/**
 * Minimal State Indicator
 *
 * A compact floating indicator for always-visible state awareness.
 * Addresses the "black box" feeling identified by design-vanguard.
 */
export const MinimalStateIndicator = forwardRef<
  HTMLDivElement,
  {
    progress: number;
    engagementScore: number;
    lastSaved: string;
    onClick?: () => void;
  }
>(({ progress, engagementScore, lastSaved, onClick }, ref) => {
  return (
    <div
      ref={ref}
      onClick={onClick}
      className="fixed bottom-4 right-4 z-50 cursor-pointer"
    >
      <Card variant="glass" padding="sm" hoverable className="shadow-glow">
        <div className="flex items-center gap-3">
          {/* Progress Ring */}
          <div className="relative h-10 w-10">
            <svg className="h-10 w-10 -rotate-90">
              <circle
                cx="20"
                cy="20"
                r="16"
                stroke="currentColor"
                strokeWidth="3"
                fill="none"
                className="text-surface-700"
              />
              <circle
                cx="20"
                cy="20"
                r="16"
                stroke="currentColor"
                strokeWidth="3"
                fill="none"
                className="text-brand-500 transition-all duration-slow"
                strokeDasharray={`${2 * Math.PI * 16}`}
                strokeDashoffset={`${2 * Math.PI * 16 * (1 - progress / 100)}`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-surface-200">
              {progress}%
            </div>
          </div>

          {/* Metrics */}
          <div className="text-xs space-y-0.5">
            <div className="flex items-center gap-1.5">
              <div className={`h-1.5 w-1.5 rounded-full ${getStatusColor(lastSaved)} animate-pulse`} />
              <span className="text-surface-300">{lastSaved}</span>
            </div>
            <div className="text-surface-400">
              Engagement: {engagementScore}%
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
});

MinimalStateIndicator.displayName = 'MinimalStateIndicator';
