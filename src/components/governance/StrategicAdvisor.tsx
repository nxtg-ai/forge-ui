/**
 * Strategic Advisor Component
 * Provides data-driven recommendations based on governance state
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Lightbulb, TrendingUp, AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react';
import type { GovernanceState } from '../../types/governance.types';

interface StrategicAdvisorProps {
  state: GovernanceState;
  className?: string;
}

interface Recommendation {
  priority: 'critical' | 'high' | 'medium' | 'low';
  action: string;
  reasoning: string[];
  impact: string;
  confidence: number;
  nextSteps: string[];
}

export const StrategicAdvisor: React.FC<StrategicAdvisorProps> = ({ state, className }) => {
  const recommendation = analyzeStateAndRecommend(state);

  const priorityConfig = {
    critical: {
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
      text: 'text-red-400',
      icon: AlertTriangle,
    },
    high: {
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/30',
      text: 'text-orange-400',
      icon: TrendingUp,
    },
    medium: {
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/30',
      text: 'text-blue-400',
      icon: Lightbulb,
    },
    low: {
      bg: 'bg-green-500/10',
      border: 'border-green-500/30',
      text: 'text-green-400',
      icon: CheckCircle,
    },
  };

  const config = priorityConfig[recommendation.priority];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-br from-gray-800 to-gray-950 rounded-lg border ${config.border} p-4 ${className || ''}`}
      data-testid="strategic-advisor"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 ${config.bg} rounded-md`}>
            <Icon className={`w-4 h-4 ${config.text}`} />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-gray-200">Strategic Recommendation</h4>
            <p className="text-2xs text-gray-500">AI-driven insights</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-2xs text-gray-500">Confidence:</span>
          <span className={`text-2xs font-mono ${config.text}`}>{recommendation.confidence}%</span>
        </div>
      </div>

      {/* Recommended Action */}
      <div className={`${config.bg} border ${config.border} rounded-md p-3 mb-3`}>
        <div className="flex items-start gap-2">
          <ArrowRight className={`w-4 h-4 ${config.text} mt-0.5 flex-shrink-0`} />
          <div>
            <p className="text-xs font-medium text-gray-200 mb-1">{recommendation.action}</p>
            <p className="text-2xs text-gray-400">{recommendation.impact}</p>
          </div>
        </div>
      </div>

      {/* Reasoning */}
      <div className="mb-3">
        <p className="text-2xs font-medium text-gray-400 mb-1.5">Data-Backed Reasoning:</p>
        <ul className="space-y-1">
          {recommendation.reasoning.map((reason, idx) => (
            <motion.li
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="flex items-start gap-1.5 text-2xs text-gray-300"
            >
              <span className="text-gray-600">•</span>
              <span>{reason}</span>
            </motion.li>
          ))}
        </ul>
      </div>

      {/* Next Steps */}
      <div>
        <p className="text-2xs font-medium text-gray-400 mb-1.5">Next Steps:</p>
        <ol className="space-y-1">
          {recommendation.nextSteps.map((step, idx) => (
            <motion.li
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 + 0.2 }}
              className="flex items-start gap-1.5 text-2xs text-gray-300"
            >
              <span className={`font-mono ${config.text}`}>{idx + 1}.</span>
              <span>{step}</span>
            </motion.li>
          ))}
        </ol>
      </div>
    </motion.div>
  );
};

/**
 * Analyze governance state and generate data-driven recommendation
 */
function analyzeStateAndRecommend(state: GovernanceState): Recommendation {
  const { workstreams, sentinelLog, constitution } = state;

  // Calculate metrics
  const totalWorkstreams = workstreams.length;
  const completedWorkstreams = workstreams.filter(w => w.status === 'completed').length;
  const activeWorkstreams = workstreams.filter(w => w.status === 'active').length;
  const blockedWorkstreams = workstreams.filter(w => w.status === 'blocked').length;
  const averageProgress = workstreams.reduce((sum, w) => sum + w.progress, 0) / totalWorkstreams;

  const criticalEvents = sentinelLog.filter(log => log.type === 'CRITICAL' || log.type === 'ERROR').length;
  const recentEvents = sentinelLog.filter(log => Date.now() - log.timestamp < 3600000).length; // Last hour

  // Decision logic based on state

  // SCENARIO 1: Critical errors detected
  if (criticalEvents > 0) {
    return {
      priority: 'critical',
      action: 'Address Critical Errors Immediately',
      reasoning: [
        `${criticalEvents} critical/error event(s) detected in sentinel log`,
        'System stability at risk',
        'User experience likely degraded',
      ],
      impact: 'High - System reliability compromised',
      confidence: 95,
      nextSteps: [
        'Review sentinel log for critical events',
        'Identify root cause of errors',
        'Deploy hotfix or rollback to stable state',
        'Update error handling protocols',
      ],
    };
  }

  // SCENARIO 2: Blocked workstreams
  if (blockedWorkstreams > 0) {
    return {
      priority: 'high',
      action: 'Unblock Workstreams to Restore Velocity',
      reasoning: [
        `${blockedWorkstreams} workstream(s) currently blocked`,
        'Development velocity impacted',
        `${activeWorkstreams} active workstream(s) may have dependencies`,
      ],
      impact: 'High - Delays cascade across dependent work',
      confidence: 90,
      nextSteps: [
        'Identify blockers for each blocked workstream',
        'Escalate blockers that need external resources',
        'Re-prioritize work to avoid further delays',
        'Update workstream dependencies',
      ],
    };
  }

  // SCENARIO 3: All workstreams complete (like current state)
  if (completedWorkstreams === totalWorkstreams && averageProgress === 100) {
    return {
      priority: 'medium',
      action: 'Ship Completed Work and Start Next Initiative',
      reasoning: [
        `${completedWorkstreams}/${totalWorkstreams} workstreams complete (100% progress)`,
        '0 blockers, 0 critical issues',
        'ROI: Completed work delivers no value until shipped',
        'Opportunity cost: Every day in branch = no usage data',
      ],
      impact: 'Medium - Unlock next value stream',
      confidence: 88,
      nextSteps: [
        'Create pull request for completed work',
        'Merge to main after review',
        'Activate full Forge mode for next feature',
        'Use governance to oversee real development',
      ],
    };
  }

  // SCENARIO 4: Work in progress (normal development)
  if (activeWorkstreams > 0 && averageProgress < 100) {
    const highRiskWorkstreams = workstreams.filter(w => w.risk === 'high' || w.risk === 'critical').length;

    if (highRiskWorkstreams > 0) {
      return {
        priority: 'high',
        action: 'Mitigate High-Risk Workstreams',
        reasoning: [
          `${highRiskWorkstreams} high/critical risk workstream(s) detected`,
          `Average progress: ${averageProgress.toFixed(0)}%`,
          'Risk compounds over time if not addressed',
        ],
        impact: 'High - Prevent failures before completion',
        confidence: 85,
        nextSteps: [
          'Review high-risk workstreams in Impact Matrix',
          'Identify specific risk factors',
          'Add mitigation tasks or reduce scope',
          'Increase monitoring frequency',
        ],
      };
    }

    return {
      priority: 'medium',
      action: 'Continue Current Development with Monitoring',
      reasoning: [
        `${activeWorkstreams} active workstream(s) in progress`,
        `Average progress: ${averageProgress.toFixed(0)}%`,
        `${recentEvents} events in last hour (system active)`,
        'Low risk profile across workstreams',
      ],
      impact: 'Medium - Maintain velocity',
      confidence: 80,
      nextSteps: [
        'Monitor sentinel log for drift or scope violations',
        'Update workstream progress regularly',
        'Flag blockers immediately when detected',
        'Maintain current development pace',
      ],
    };
  }

  // SCENARIO 5: No active work (idle state)
  if (activeWorkstreams === 0 && completedWorkstreams === 0) {
    return {
      priority: 'medium',
      action: 'Define New Strategic Initiative',
      reasoning: [
        'No active workstreams detected',
        'System idle - no value being created',
        'Constitution confidence: ' + constitution.confidence + '%',
      ],
      impact: 'Medium - Activate value creation',
      confidence: 82,
      nextSteps: [
        'Review strategic objectives and update constitution',
        'Define new workstreams with clear directives',
        'Activate Forge orchestrator for feature planning',
        'Set measurable success criteria',
      ],
    };
  }

  // DEFAULT: Continue monitoring
  return {
    priority: 'low',
    action: 'Continue Current Course with Standard Monitoring',
    reasoning: [
      'System operating within normal parameters',
      'No critical issues detected',
      'Progress tracking as expected',
    ],
    impact: 'Low - Maintain status quo',
    confidence: 75,
    nextSteps: [
      'Monitor sentinel log for anomalies',
      'Update workstream progress daily',
      'Review constitution alignment weekly',
    ],
  };
}

export default StrategicAdvisor;
