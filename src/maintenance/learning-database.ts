/**
 * Learning Database
 *
 * SQLite-based storage for patterns, metrics, and learnings.
 * Provides persistence for the autonomous maintenance system.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { PatternScan } from './pattern-scanner';
import type { HealthCheck } from './health-monitor';

/**
 * Agent metrics data structure
 */
export interface AgentMetricRecord {
  agentId: string;
  date: string;
  tasksCompleted: number;
  successRate: number;
  avgDurationMs: number;
  overrideRate: number;
}

/**
 * Skill update proposal
 */
export interface SkillUpdateRecord {
  id: string;
  skillFile: string;
  changeType: string;
  content: string;
  reason: string;
  confidence: number;
  status: 'pending' | 'applied' | 'rejected' | 'rolled_back';
  createdAt: Date;
  appliedAt?: Date;
}

/**
 * Suggestion record
 */
export interface SuggestionRecord {
  id: string;
  agentId: string;
  suggestion: string;
  confidence: number;
  status: 'pending' | 'applied' | 'rejected';
  createdAt: Date;
}

/**
 * Simple file-based database implementation
 * In production, this would use better-sqlite3 or similar
 */
export class LearningDatabase {
  private dbPath: string;
  private data: {
    patterns: PatternScan[];
    metrics: AgentMetricRecord[];
    skillUpdates: SkillUpdateRecord[];
    suggestions: SuggestionRecord[];
    healthEvents: Array<HealthCheck & { id: string }>;
  };
  private initialized = false;

  constructor(dbPath: string) {
    this.dbPath = path.resolve(dbPath);
    this.data = {
      patterns: [],
      metrics: [],
      skillUpdates: [],
      suggestions: [],
      healthEvents: [],
    };
  }

  /**
   * Initialize the database
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Ensure directory exists
      await fs.mkdir(path.dirname(this.dbPath), { recursive: true });

      // Try to load existing data
      const content = await fs.readFile(this.dbPath, 'utf-8');
      this.data = JSON.parse(content);
    } catch {
      // File doesn't exist or is invalid, start fresh
      await this.save();
    }

    this.initialized = true;
  }

  /**
   * Save database to disk
   */
  private async save(): Promise<void> {
    await fs.writeFile(this.dbPath, JSON.stringify(this.data, null, 2));
  }

  /**
   * Close the database
   */
  async close(): Promise<void> {
    await this.save();
    this.initialized = false;
  }

  // ============================================================
  // PATTERNS
  // ============================================================

  /**
   * Store patterns from a scan
   */
  async storePatterns(patterns: PatternScan[]): Promise<void> {
    for (const pattern of patterns) {
      const existing = this.data.patterns.find(
        p =>
          p.pattern.context === pattern.pattern.context &&
          p.pattern.action === pattern.pattern.action &&
          p.pattern.outcome === pattern.pattern.outcome
      );

      if (existing) {
        existing.frequency += pattern.frequency;
        existing.pattern.confidence =
          (existing.pattern.confidence + pattern.pattern.confidence) / 2;
        existing.lastSeen = pattern.lastSeen;
      } else {
        this.data.patterns.push(pattern);
      }
    }

    await this.save();
  }

  /**
   * Get patterns matching criteria
   */
  async getPatterns(filter?: {
    source?: PatternScan['source'];
    outcome?: 'success' | 'failure';
    minConfidence?: number;
    agentId?: string;
  }): Promise<PatternScan[]> {
    let patterns = [...this.data.patterns];

    if (filter) {
      if (filter.source) {
        patterns = patterns.filter(p => p.source === filter.source);
      }
      if (filter.outcome) {
        patterns = patterns.filter(p => p.pattern.outcome === filter.outcome);
      }
      if (filter.minConfidence !== undefined) {
        patterns = patterns.filter(p => p.pattern.confidence >= filter.minConfidence);
      }
      if (filter.agentId) {
        patterns = patterns.filter(p => p.agentId === filter.agentId);
      }
    }

    return patterns;
  }

  // ============================================================
  // METRICS
  // ============================================================

  /**
   * Store agent metrics
   */
  async storeMetrics(
    metrics: Array<{
      agentId: string;
      successRate: number;
      tasksCompleted: number;
      avgDurationMs?: number;
      overrideRate?: number;
    }>
  ): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    for (const metric of metrics) {
      const existing = this.data.metrics.find(
        m => m.agentId === metric.agentId && m.date === today
      );

      if (existing) {
        existing.tasksCompleted = metric.tasksCompleted;
        existing.successRate = metric.successRate;
        existing.avgDurationMs = metric.avgDurationMs || 0;
        existing.overrideRate = metric.overrideRate || 0;
      } else {
        this.data.metrics.push({
          agentId: metric.agentId,
          date: today,
          tasksCompleted: metric.tasksCompleted,
          successRate: metric.successRate,
          avgDurationMs: metric.avgDurationMs || 0,
          overrideRate: metric.overrideRate || 0,
        });
      }
    }

    await this.save();
  }

  /**
   * Get recent metrics
   */
  async getRecentMetrics(
    days: number
  ): Promise<Array<AgentMetricRecord & { commonFailures: string[] }>> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    const metrics = this.data.metrics
      .filter(m => m.date >= cutoffStr)
      .map(m => ({ ...m, commonFailures: [] as string[] }));

    return metrics;
  }

  /**
   * Get metrics for a specific agent
   */
  async getAgentMetrics(
    agentId: string,
    days?: number
  ): Promise<AgentMetricRecord[]> {
    let metrics = this.data.metrics.filter(m => m.agentId === agentId);

    if (days) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      const cutoffStr = cutoff.toISOString().split('T')[0];
      metrics = metrics.filter(m => m.date >= cutoffStr);
    }

    return metrics.sort((a, b) => a.date.localeCompare(b.date));
  }

  // ============================================================
  // SKILL UPDATES
  // ============================================================

  /**
   * Queue a skill update for review or application
   */
  async queueSkillUpdate(update: Omit<SkillUpdateRecord, 'id' | 'createdAt' | 'status'>): Promise<string> {
    const id = `update-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    this.data.skillUpdates.push({
      ...update,
      id,
      status: 'pending',
      createdAt: new Date(),
    });

    await this.save();
    return id;
  }

  /**
   * Get pending skill updates
   */
  async getPendingUpdates(minConfidence?: number): Promise<SkillUpdateRecord[]> {
    let updates = this.data.skillUpdates.filter(u => u.status === 'pending');

    if (minConfidence !== undefined) {
      updates = updates.filter(u => u.confidence >= minConfidence);
    }

    return updates.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Mark an update as applied
   */
  async markUpdateApplied(id: string): Promise<void> {
    const update = this.data.skillUpdates.find(u => u.id === id);
    if (update) {
      update.status = 'applied';
      update.appliedAt = new Date();
      await this.save();
    }
  }

  /**
   * Mark an update as rejected
   */
  async markUpdateRejected(id: string): Promise<void> {
    const update = this.data.skillUpdates.find(u => u.id === id);
    if (update) {
      update.status = 'rejected';
      await this.save();
    }
  }

  /**
   * Mark an update as rolled back
   */
  async markUpdateRolledBack(id: string): Promise<void> {
    const update = this.data.skillUpdates.find(u => u.id === id);
    if (update) {
      update.status = 'rolled_back';
      await this.save();
    }
  }

  // ============================================================
  // SUGGESTIONS
  // ============================================================

  /**
   * Queue a suggestion
   */
  async queueSuggestion(suggestion: {
    agentId: string;
    suggestion: string;
    confidence: number;
  }): Promise<string> {
    const id = `suggestion-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    this.data.suggestions.push({
      ...suggestion,
      id,
      status: 'pending',
      createdAt: new Date(),
    });

    await this.save();
    return id;
  }

  /**
   * Get pending suggestions
   */
  async getPendingSuggestions(): Promise<SuggestionRecord[]> {
    return this.data.suggestions.filter(s => s.status === 'pending');
  }

  // ============================================================
  // HEALTH EVENTS
  // ============================================================

  /**
   * Log a health check result
   */
  async logHealthEvent(check: HealthCheck): Promise<void> {
    const id = `health-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    this.data.healthEvents.push({
      ...check,
      id,
    });

    // Keep only last 1000 events
    if (this.data.healthEvents.length > 1000) {
      this.data.healthEvents = this.data.healthEvents.slice(-1000);
    }

    await this.save();
  }

  /**
   * Get recent health events
   */
  async getHealthEvents(
    hours?: number,
    category?: string
  ): Promise<Array<HealthCheck & { id: string }>> {
    let events = [...this.data.healthEvents];

    if (hours) {
      const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
      events = events.filter(e => new Date(e.timestamp) >= cutoff);
    }

    if (category) {
      events = events.filter(e => e.category === category);
    }

    return events.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  // ============================================================
  // UTILITIES
  // ============================================================

  /**
   * Get database statistics
   */
  async getStats(): Promise<{
    patternCount: number;
    metricCount: number;
    updateCount: number;
    suggestionCount: number;
    healthEventCount: number;
  }> {
    return {
      patternCount: this.data.patterns.length,
      metricCount: this.data.metrics.length,
      updateCount: this.data.skillUpdates.length,
      suggestionCount: this.data.suggestions.length,
      healthEventCount: this.data.healthEvents.length,
    };
  }

  /**
   * Export all data
   */
  async export(): Promise<typeof this.data> {
    return JSON.parse(JSON.stringify(this.data));
  }

  /**
   * Import data
   */
  async import(data: typeof this.data): Promise<void> {
    this.data = data;
    await this.save();
  }
}
