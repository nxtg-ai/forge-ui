/**
 * Performance Analyzer
 *
 * Analyzes agent performance metrics to identify trends,
 * issues, and opportunities for improvement.
 */

import { LearningDatabase, AgentMetricRecord } from './learning-database';

/**
 * Aggregated metrics for an agent
 */
export interface AgentMetrics {
  agentId: string;
  metrics: {
    tasksCompleted: number;
    successRate: number;
    avgDuration: number;
    userOverrideRate: number;
    commonFailures: string[];
  };
  trends: {
    improving: boolean;
    degrading: boolean;
    stable: boolean;
    direction: 'up' | 'down' | 'flat';
    changePercent: number;
  };
  recommendations: string[];
}

/**
 * Configuration for performance analysis
 */
interface AnalyzerConfig {
  /** Days of history to analyze */
  historyDays: number;
  /** Minimum tasks to consider for analysis */
  minTasks: number;
  /** Success rate threshold for "good" */
  successThresholdGood: number;
  /** Success rate threshold for "warning" */
  successThresholdWarning: number;
  /** Trend significance threshold (%) */
  trendThreshold: number;
}

const DEFAULT_CONFIG: AnalyzerConfig = {
  historyDays: 30,
  minTasks: 5,
  successThresholdGood: 0.85,
  successThresholdWarning: 0.7,
  trendThreshold: 5,
};

/**
 * Analyzes agent performance and identifies improvement opportunities
 */
export class PerformanceAnalyzer {
  private config: AnalyzerConfig;
  private database: LearningDatabase;

  constructor(database: LearningDatabase, config: Partial<AnalyzerConfig> = {}) {
    this.database = database;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Analyze all agents' performance
   */
  async analyze(): Promise<AgentMetrics[]> {
    const results: AgentMetrics[] = [];

    // Get all metrics from the database
    const allMetrics = await this.database.getRecentMetrics(this.config.historyDays);

    // Group by agent
    const agentGroups = new Map<string, AgentMetricRecord[]>();
    for (const metric of allMetrics) {
      const existing = agentGroups.get(metric.agentId) || [];
      existing.push(metric);
      agentGroups.set(metric.agentId, existing);
    }

    // Analyze each agent
    for (const [agentId, metrics] of agentGroups) {
      const analysis = await this.analyzeAgent(agentId, metrics);
      results.push(analysis);
    }

    return results.sort((a, b) => a.metrics.successRate - b.metrics.successRate);
  }

  /**
   * Analyze a specific agent
   */
  async analyzeAgent(agentId: string, metrics?: AgentMetricRecord[]): Promise<AgentMetrics> {
    // Get metrics if not provided
    if (!metrics) {
      metrics = await this.database.getAgentMetrics(agentId, this.config.historyDays);
    }

    // Calculate aggregated metrics
    const aggregated = this.aggregateMetrics(metrics);

    // Calculate trends
    const trends = this.calculateTrends(metrics);

    // Generate recommendations
    const recommendations = this.generateRecommendations(agentId, aggregated, trends);

    return {
      agentId,
      metrics: {
        ...aggregated,
        commonFailures: [], // Would be populated from failure logs
      },
      trends,
      recommendations,
    };
  }

  /**
   * Aggregate metrics over time period
   */
  private aggregateMetrics(metrics: AgentMetricRecord[]): {
    tasksCompleted: number;
    successRate: number;
    avgDuration: number;
    userOverrideRate: number;
  } {
    if (metrics.length === 0) {
      return {
        tasksCompleted: 0,
        successRate: 1,
        avgDuration: 0,
        userOverrideRate: 0,
      };
    }

    const totalTasks = metrics.reduce((sum, m) => sum + m.tasksCompleted, 0);
    const weightedSuccessRate = metrics.reduce(
      (sum, m) => sum + m.successRate * m.tasksCompleted,
      0
    ) / Math.max(totalTasks, 1);
    const avgDuration = metrics.reduce(
      (sum, m) => sum + m.avgDurationMs,
      0
    ) / metrics.length;
    const avgOverrideRate = metrics.reduce(
      (sum, m) => sum + m.overrideRate,
      0
    ) / metrics.length;

    return {
      tasksCompleted: totalTasks,
      successRate: weightedSuccessRate,
      avgDuration,
      userOverrideRate: avgOverrideRate,
    };
  }

  /**
   * Calculate performance trends
   */
  private calculateTrends(metrics: AgentMetricRecord[]): {
    improving: boolean;
    degrading: boolean;
    stable: boolean;
    direction: 'up' | 'down' | 'flat';
    changePercent: number;
  } {
    if (metrics.length < 2) {
      return {
        improving: false,
        degrading: false,
        stable: true,
        direction: 'flat',
        changePercent: 0,
      };
    }

    // Sort by date
    const sorted = [...metrics].sort((a, b) => a.date.localeCompare(b.date));

    // Compare first and second half
    const midpoint = Math.floor(sorted.length / 2);
    const firstHalf = sorted.slice(0, midpoint);
    const secondHalf = sorted.slice(midpoint);

    const firstAvg = firstHalf.reduce((sum, m) => sum + m.successRate, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, m) => sum + m.successRate, 0) / secondHalf.length;

    const changePercent = ((secondAvg - firstAvg) / Math.max(firstAvg, 0.01)) * 100;

    const improving = changePercent > this.config.trendThreshold;
    const degrading = changePercent < -this.config.trendThreshold;
    const stable = !improving && !degrading;

    return {
      improving,
      degrading,
      stable,
      direction: improving ? 'up' : degrading ? 'down' : 'flat',
      changePercent: Math.round(changePercent * 10) / 10,
    };
  }

  /**
   * Generate improvement recommendations
   */
  private generateRecommendations(
    agentId: string,
    metrics: { tasksCompleted: number; successRate: number; avgDuration: number; userOverrideRate: number },
    trends: { improving: boolean; degrading: boolean; direction: string; changePercent: number }
  ): string[] {
    const recommendations: string[] = [];

    // Low success rate
    if (metrics.successRate < this.config.successThresholdWarning) {
      recommendations.push(
        `${agentId} has ${Math.round(metrics.successRate * 100)}% success rate. ` +
        `Review failure patterns and update agent spec.`
      );
    }

    // Degrading performance
    if (trends.degrading) {
      recommendations.push(
        `${agentId} performance is declining (${trends.changePercent}% change). ` +
        `Investigate recent changes.`
      );
    }

    // High override rate
    if (metrics.userOverrideRate > 0.2) {
      recommendations.push(
        `${agentId} is being corrected ${Math.round(metrics.userOverrideRate * 100)}% of the time. ` +
        `Learn from corrections to improve.`
      );
    }

    // Low task volume
    if (metrics.tasksCompleted < this.config.minTasks) {
      recommendations.push(
        `${agentId} has limited data (${metrics.tasksCompleted} tasks). ` +
        `More usage needed for accurate analysis.`
      );
    }

    // Slow performance
    if (metrics.avgDuration > 60000) { // > 1 minute average
      recommendations.push(
        `${agentId} average task time is ${Math.round(metrics.avgDuration / 1000)}s. ` +
        `Consider optimization.`
      );
    }

    // Positive feedback
    if (metrics.successRate >= this.config.successThresholdGood && trends.improving) {
      recommendations.push(
        `${agentId} is performing well (${Math.round(metrics.successRate * 100)}% success, improving). ` +
        `Consider documenting successful patterns.`
      );
    }

    return recommendations;
  }

  /**
   * Compare two agents' performance
   */
  async compareAgents(agentId1: string, agentId2: string): Promise<{
    agent1: AgentMetrics;
    agent2: AgentMetrics;
    comparison: {
      betterSuccessRate: string;
      betterDuration: string;
      recommendation: string;
    };
  }> {
    const [agent1, agent2] = await Promise.all([
      this.analyzeAgent(agentId1),
      this.analyzeAgent(agentId2),
    ]);

    const betterSuccessRate =
      agent1.metrics.successRate > agent2.metrics.successRate ? agentId1 : agentId2;
    const betterDuration =
      agent1.metrics.avgDuration < agent2.metrics.avgDuration ? agentId1 : agentId2;

    let recommendation: string;
    if (betterSuccessRate === betterDuration) {
      recommendation = `${betterSuccessRate} outperforms in both success rate and speed`;
    } else {
      recommendation = `${betterSuccessRate} has better success rate, ${betterDuration} is faster`;
    }

    return {
      agent1,
      agent2,
      comparison: {
        betterSuccessRate,
        betterDuration,
        recommendation,
      },
    };
  }

  /**
   * Get summary statistics across all agents
   */
  async getSummary(): Promise<{
    totalAgents: number;
    avgSuccessRate: number;
    topPerformers: string[];
    needsAttention: string[];
  }> {
    const allMetrics = await this.analyze();

    if (allMetrics.length === 0) {
      return {
        totalAgents: 0,
        avgSuccessRate: 0,
        topPerformers: [],
        needsAttention: [],
      };
    }

    const avgSuccessRate =
      allMetrics.reduce((sum, m) => sum + m.metrics.successRate, 0) / allMetrics.length;

    const sorted = [...allMetrics].sort(
      (a, b) => b.metrics.successRate - a.metrics.successRate
    );

    const topPerformers = sorted
      .filter(m => m.metrics.successRate >= this.config.successThresholdGood)
      .slice(0, 5)
      .map(m => m.agentId);

    const needsAttention = sorted
      .filter(m => m.metrics.successRate < this.config.successThresholdWarning || m.trends.degrading)
      .map(m => m.agentId);

    return {
      totalAgents: allMetrics.length,
      avgSuccessRate: Math.round(avgSuccessRate * 100) / 100,
      topPerformers,
      needsAttention,
    };
  }

  /**
   * Update configuration
   */
  configure(config: Partial<AnalyzerConfig>): void {
    Object.assign(this.config, config);
  }
}
