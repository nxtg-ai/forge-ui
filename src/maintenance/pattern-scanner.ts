/**
 * Pattern Scanner
 *
 * Scans completed tasks and user corrections to extract patterns
 * that can be used to improve agent behavior.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { LearningDatabase } from './learning-database';

/**
 * A discovered pattern from task analysis
 */
export interface PatternScan {
  /** Source of the pattern */
  source: 'task_completion' | 'user_correction' | 'performance';
  /** The pattern details */
  pattern: {
    /** Context in which this pattern applies */
    context: string;
    /** Action that was taken */
    action: string;
    /** Outcome of the action */
    outcome: 'success' | 'failure';
    /** Confidence in this pattern (0-1) */
    confidence: number;
  };
  /** How often this pattern has been observed */
  frequency: number;
  /** When this pattern was last observed */
  lastSeen: Date;
  /** Associated agent ID if applicable */
  agentId?: string;
}

/**
 * Configuration for pattern scanning
 */
interface ScanConfig {
  /** Minimum frequency to consider a pattern significant */
  minFrequency: number;
  /** Minimum confidence to consider a pattern significant */
  minConfidence: number;
  /** Maximum age of tasks to scan (in days) */
  maxAgeDays: number;
  /** Directory to scan for task history */
  taskHistoryDir: string;
  /** Directory to scan for correction logs */
  correctionLogsDir: string;
}

const DEFAULT_CONFIG: ScanConfig = {
  minFrequency: 3,
  minConfidence: 0.6,
  maxAgeDays: 30,
  taskHistoryDir: '.forge/history/tasks',
  correctionLogsDir: '.forge/history/corrections',
};

/**
 * Scans for patterns in task history and user corrections
 */
export class PatternScanner {
  private config: ScanConfig;
  private database: LearningDatabase;

  constructor(database: LearningDatabase, config: Partial<ScanConfig> = {}) {
    this.database = database;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Perform a full pattern scan
   */
  async scan(): Promise<PatternScan[]> {
    const patterns: PatternScan[] = [];

    // Scan task completions
    const taskPatterns = await this.scanTaskCompletions();
    patterns.push(...taskPatterns);

    // Scan user corrections
    const correctionPatterns = await this.scanUserCorrections();
    patterns.push(...correctionPatterns);

    // Scan performance data
    const performancePatterns = await this.scanPerformanceData();
    patterns.push(...performancePatterns);

    // Deduplicate and merge patterns
    return this.mergePatterns(patterns);
  }

  /**
   * Scan completed tasks for success/failure patterns
   */
  private async scanTaskCompletions(): Promise<PatternScan[]> {
    const patterns: PatternScan[] = [];

    try {
      const historyDir = path.resolve(this.config.taskHistoryDir);
      const exists = await fs.access(historyDir).then(() => true).catch(() => false);

      if (!exists) {
        return patterns;
      }

      const files = await fs.readdir(historyDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.maxAgeDays);

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        try {
          const content = await fs.readFile(path.join(historyDir, file), 'utf-8');
          const task = JSON.parse(content);

          // Skip old tasks
          if (new Date(task.completedAt) < cutoffDate) continue;

          // Extract pattern
          patterns.push({
            source: 'task_completion',
            pattern: {
              context: task.context || task.objective,
              action: task.approach || task.type,
              outcome: task.success ? 'success' : 'failure',
              confidence: task.success ? 0.8 : 0.6,
            },
            frequency: 1,
            lastSeen: new Date(task.completedAt),
            agentId: task.agentId,
          });
        } catch {
          // Skip invalid files
        }
      }
    } catch (error) {
      console.warn('[PatternScanner] Error scanning task completions:', error);
    }

    return patterns;
  }

  /**
   * Scan user corrections to learn from mistakes
   */
  private async scanUserCorrections(): Promise<PatternScan[]> {
    const patterns: PatternScan[] = [];

    try {
      const correctionsDir = path.resolve(this.config.correctionLogsDir);
      const exists = await fs.access(correctionsDir).then(() => true).catch(() => false);

      if (!exists) {
        return patterns;
      }

      const files = await fs.readdir(correctionsDir);

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        try {
          const content = await fs.readFile(path.join(correctionsDir, file), 'utf-8');
          const correction = JSON.parse(content);

          // Correction indicates the original was wrong
          patterns.push({
            source: 'user_correction',
            pattern: {
              context: correction.context,
              action: correction.originalAction,
              outcome: 'failure', // Original was corrected
              confidence: 0.9, // High confidence - user explicitly corrected
            },
            frequency: 1,
            lastSeen: new Date(correction.timestamp),
            agentId: correction.agentId,
          });

          // The correction itself is a success pattern
          patterns.push({
            source: 'user_correction',
            pattern: {
              context: correction.context,
              action: correction.correctedAction,
              outcome: 'success',
              confidence: 0.95, // Very high - user chose this
            },
            frequency: 1,
            lastSeen: new Date(correction.timestamp),
            agentId: correction.agentId,
          });
        } catch {
          // Skip invalid files
        }
      }
    } catch (error) {
      console.warn('[PatternScanner] Error scanning corrections:', error);
    }

    return patterns;
  }

  /**
   * Scan performance data for patterns
   */
  private async scanPerformanceData(): Promise<PatternScan[]> {
    const patterns: PatternScan[] = [];

    try {
      // Get recent metrics from database
      const metrics = await this.database.getRecentMetrics(this.config.maxAgeDays);

      for (const metric of metrics) {
        // High success rate indicates good patterns
        if (metric.successRate > 0.85) {
          patterns.push({
            source: 'performance',
            pattern: {
              context: `Agent ${metric.agentId} operations`,
              action: 'current_approach',
              outcome: 'success',
              confidence: metric.successRate,
            },
            frequency: metric.tasksCompleted,
            lastSeen: new Date(metric.date),
            agentId: metric.agentId,
          });
        }

        // Low success rate indicates problematic patterns
        if (metric.successRate < 0.6) {
          patterns.push({
            source: 'performance',
            pattern: {
              context: `Agent ${metric.agentId} operations`,
              action: 'current_approach',
              outcome: 'failure',
              confidence: 1 - metric.successRate,
            },
            frequency: metric.tasksCompleted,
            lastSeen: new Date(metric.date),
            agentId: metric.agentId,
          });
        }
      }
    } catch (error) {
      console.warn('[PatternScanner] Error scanning performance data:', error);
    }

    return patterns;
  }

  /**
   * Merge similar patterns and calculate aggregate statistics
   */
  private mergePatterns(patterns: PatternScan[]): PatternScan[] {
    const merged = new Map<string, PatternScan>();

    for (const pattern of patterns) {
      // Create a key for grouping similar patterns
      const key = `${pattern.pattern.context}:${pattern.pattern.action}:${pattern.pattern.outcome}`;

      const existing = merged.get(key);
      if (existing) {
        // Update existing pattern
        existing.frequency += pattern.frequency;
        existing.pattern.confidence = (existing.pattern.confidence + pattern.pattern.confidence) / 2;
        if (pattern.lastSeen > existing.lastSeen) {
          existing.lastSeen = pattern.lastSeen;
        }
      } else {
        merged.set(key, { ...pattern });
      }
    }

    // Filter by minimum frequency and confidence
    return Array.from(merged.values())
      .filter(p =>
        p.frequency >= this.config.minFrequency &&
        p.pattern.confidence >= this.config.minConfidence
      )
      .sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * Update configuration
   */
  configure(config: Partial<ScanConfig>): void {
    Object.assign(this.config, config);
  }
}
