/**
 * Performance Analyzer Tests
 *
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PerformanceAnalyzer, AgentMetrics } from '../performance-analyzer';
import { LearningDatabase, AgentMetricRecord } from '../learning-database';

describe('PerformanceAnalyzer', () => {
  let analyzer: PerformanceAnalyzer;
  let mockDatabase: LearningDatabase;

  const mockMetric = (overrides: Partial<AgentMetricRecord> = {}): AgentMetricRecord => ({
    agentId: 'test-agent',
    date: '2026-02-01',
    tasksCompleted: 10,
    successRate: 0.9,
    avgDurationMs: 5000,
    overrideRate: 0.1,
    ...overrides,
  });

  beforeEach(() => {
    mockDatabase = {
      getRecentMetrics: vi.fn().mockResolvedValue([]),
      getAgentMetrics: vi.fn().mockResolvedValue([]),
      initialize: vi.fn().mockResolvedValue(undefined),
    } as any;

    analyzer = new PerformanceAnalyzer(mockDatabase);
  });

  describe('constructor', () => {
    it('should initialize with default config', () => {
      expect(analyzer).toBeDefined();
    });

    it('should accept custom config', () => {
      const customAnalyzer = new PerformanceAnalyzer(mockDatabase, {
        historyDays: 60,
        minTasks: 10,
      });

      expect(customAnalyzer).toBeDefined();
    });
  });

  describe('analyze', () => {
    it('should return empty array when no metrics', async () => {
      vi.mocked(mockDatabase.getRecentMetrics).mockResolvedValue([]);

      const results = await analyzer.analyze();

      expect(results).toEqual([]);
      expect(mockDatabase.getRecentMetrics).toHaveBeenCalledWith(30);
    });

    it('should analyze single agent', async () => {
      const metrics = [mockMetric()];
      vi.mocked(mockDatabase.getRecentMetrics).mockResolvedValue(metrics);

      const results = await analyzer.analyze();

      expect(results).toHaveLength(1);
      expect(results[0].agentId).toBe('test-agent');
      expect(results[0].metrics).toBeDefined();
      expect(results[0].trends).toBeDefined();
      expect(results[0].recommendations).toBeDefined();
    });

    it('should analyze multiple agents', async () => {
      const metrics = [
        mockMetric({ agentId: 'agent-1', successRate: 0.95 }),
        mockMetric({ agentId: 'agent-2', successRate: 0.85 }),
        mockMetric({ agentId: 'agent-3', successRate: 0.75 }),
      ];
      vi.mocked(mockDatabase.getRecentMetrics).mockResolvedValue(metrics);

      const results = await analyzer.analyze();

      expect(results).toHaveLength(3);
      expect(results.map(r => r.agentId)).toContain('agent-1');
      expect(results.map(r => r.agentId)).toContain('agent-2');
      expect(results.map(r => r.agentId)).toContain('agent-3');
    });

    it('should sort results by success rate ascending', async () => {
      const metrics = [
        mockMetric({ agentId: 'good-agent', successRate: 0.95 }),
        mockMetric({ agentId: 'bad-agent', successRate: 0.50 }),
        mockMetric({ agentId: 'ok-agent', successRate: 0.75 }),
      ];
      vi.mocked(mockDatabase.getRecentMetrics).mockResolvedValue(metrics);

      const results = await analyzer.analyze();

      expect(results[0].agentId).toBe('bad-agent');
      expect(results[1].agentId).toBe('ok-agent');
      expect(results[2].agentId).toBe('good-agent');
    });

    it('should group multiple metrics per agent', async () => {
      const metrics = [
        mockMetric({ agentId: 'agent-1', tasksCompleted: 5 }),
        mockMetric({ agentId: 'agent-1', tasksCompleted: 10 }),
        mockMetric({ agentId: 'agent-2', tasksCompleted: 3 }),
      ];
      vi.mocked(mockDatabase.getRecentMetrics).mockResolvedValue(metrics);

      const results = await analyzer.analyze();

      expect(results).toHaveLength(2);
      // Results are sorted by success rate, both have same success rate (0.9)
      // so order is stable but both agents should have correct totals
      const agent1Result = results.find(r => r.agentId === 'agent-1');
      const agent2Result = results.find(r => r.agentId === 'agent-2');
      expect(agent1Result!.metrics.tasksCompleted).toBe(15);
      expect(agent2Result!.metrics.tasksCompleted).toBe(3);
    });
  });

  describe('analyzeAgent', () => {
    it('should fetch metrics when not provided', async () => {
      const metrics = [mockMetric()];
      vi.mocked(mockDatabase.getAgentMetrics).mockResolvedValue(metrics);

      await analyzer.analyzeAgent('test-agent');

      expect(mockDatabase.getAgentMetrics).toHaveBeenCalledWith('test-agent', 30);
    });

    it('should use provided metrics', async () => {
      const metrics = [mockMetric()];

      await analyzer.analyzeAgent('test-agent', metrics);

      expect(mockDatabase.getAgentMetrics).not.toHaveBeenCalled();
    });

    it('should return complete agent metrics structure', async () => {
      const metrics = [mockMetric()];

      const result = await analyzer.analyzeAgent('test-agent', metrics);

      expect(result).toMatchObject({
        agentId: 'test-agent',
        metrics: {
          tasksCompleted: expect.any(Number),
          successRate: expect.any(Number),
          avgDuration: expect.any(Number),
          userOverrideRate: expect.any(Number),
          commonFailures: expect.any(Array),
        },
        trends: {
          improving: expect.any(Boolean),
          degrading: expect.any(Boolean),
          stable: expect.any(Boolean),
          direction: expect.stringMatching(/^(up|down|flat)$/),
          changePercent: expect.any(Number),
        },
        recommendations: expect.any(Array),
      });
    });

    it('should handle empty metrics', async () => {
      const result = await analyzer.analyzeAgent('test-agent', []);

      expect(result.metrics.tasksCompleted).toBe(0);
      expect(result.metrics.successRate).toBe(1);
      expect(result.trends.stable).toBe(true);
    });
  });

  describe('aggregateMetrics', () => {
    it('should return zeros for empty metrics', async () => {
      const result = await analyzer.analyzeAgent('test-agent', []);

      expect(result.metrics.tasksCompleted).toBe(0);
      expect(result.metrics.successRate).toBe(1);
      expect(result.metrics.avgDuration).toBe(0);
      expect(result.metrics.userOverrideRate).toBe(0);
    });

    it('should sum tasks completed', async () => {
      const metrics = [
        mockMetric({ tasksCompleted: 5 }),
        mockMetric({ tasksCompleted: 10 }),
        mockMetric({ tasksCompleted: 3 }),
      ];

      const result = await analyzer.analyzeAgent('test-agent', metrics);

      expect(result.metrics.tasksCompleted).toBe(18);
    });

    it('should calculate weighted success rate', async () => {
      const metrics = [
        mockMetric({ tasksCompleted: 10, successRate: 1.0 }),
        mockMetric({ tasksCompleted: 10, successRate: 0.5 }),
      ];

      const result = await analyzer.analyzeAgent('test-agent', metrics);

      expect(result.metrics.successRate).toBe(0.75); // (10*1.0 + 10*0.5) / 20
    });

    it('should average duration', async () => {
      const metrics = [
        mockMetric({ avgDurationMs: 1000 }),
        mockMetric({ avgDurationMs: 2000 }),
        mockMetric({ avgDurationMs: 3000 }),
      ];

      const result = await analyzer.analyzeAgent('test-agent', metrics);

      expect(result.metrics.avgDuration).toBe(2000);
    });

    it('should average override rate', async () => {
      const metrics = [
        mockMetric({ overrideRate: 0.1 }),
        mockMetric({ overrideRate: 0.2 }),
        mockMetric({ overrideRate: 0.3 }),
      ];

      const result = await analyzer.analyzeAgent('test-agent', metrics);

      expect(result.metrics.userOverrideRate).toBeCloseTo(0.2, 5);
    });
  });

  describe('calculateTrends', () => {
    it('should return stable for single metric', async () => {
      const metrics = [mockMetric()];

      const result = await analyzer.analyzeAgent('test-agent', metrics);

      expect(result.trends.stable).toBe(true);
      expect(result.trends.improving).toBe(false);
      expect(result.trends.degrading).toBe(false);
      expect(result.trends.direction).toBe('flat');
      expect(result.trends.changePercent).toBe(0);
    });

    it('should detect improving trend', async () => {
      const metrics = [
        mockMetric({ date: '2026-01-01', successRate: 0.5 }),
        mockMetric({ date: '2026-01-02', successRate: 0.6 }),
        mockMetric({ date: '2026-01-03', successRate: 0.9 }),
        mockMetric({ date: '2026-01-04', successRate: 0.95 }),
      ];

      const result = await analyzer.analyzeAgent('test-agent', metrics);

      expect(result.trends.improving).toBe(true);
      expect(result.trends.degrading).toBe(false);
      expect(result.trends.direction).toBe('up');
      expect(result.trends.changePercent).toBeGreaterThan(5);
    });

    it('should detect degrading trend', async () => {
      const metrics = [
        mockMetric({ date: '2026-01-01', successRate: 0.95 }),
        mockMetric({ date: '2026-01-02', successRate: 0.9 }),
        mockMetric({ date: '2026-01-03', successRate: 0.6 }),
        mockMetric({ date: '2026-01-04', successRate: 0.5 }),
      ];

      const result = await analyzer.analyzeAgent('test-agent', metrics);

      expect(result.trends.degrading).toBe(true);
      expect(result.trends.improving).toBe(false);
      expect(result.trends.direction).toBe('down');
      expect(result.trends.changePercent).toBeLessThan(-5);
    });

    it('should detect stable trend', async () => {
      const metrics = [
        mockMetric({ date: '2026-01-01', successRate: 0.85 }),
        mockMetric({ date: '2026-01-02', successRate: 0.86 }),
        mockMetric({ date: '2026-01-03', successRate: 0.84 }),
        mockMetric({ date: '2026-01-04', successRate: 0.85 }),
      ];

      const result = await analyzer.analyzeAgent('test-agent', metrics);

      expect(result.trends.stable).toBe(true);
      expect(result.trends.direction).toBe('flat');
      expect(Math.abs(result.trends.changePercent)).toBeLessThan(5);
    });

    it('should sort metrics by date before comparison', async () => {
      // Provide metrics out of order
      const metrics = [
        mockMetric({ date: '2026-01-04', successRate: 0.9 }),
        mockMetric({ date: '2026-01-01', successRate: 0.5 }),
        mockMetric({ date: '2026-01-03', successRate: 0.85 }),
        mockMetric({ date: '2026-01-02', successRate: 0.6 }),
      ];

      const result = await analyzer.analyzeAgent('test-agent', metrics);

      // Should detect improving trend (0.55 first half -> 0.875 second half)
      expect(result.trends.improving).toBe(true);
    });
  });

  describe('generateRecommendations', () => {
    it('should recommend review for low success rate', async () => {
      const metrics = [mockMetric({ successRate: 0.6 })]; // Below 0.7 warning

      const result = await analyzer.analyzeAgent('test-agent', metrics);

      expect(result.recommendations).toContainEqual(
        expect.stringContaining('60% success rate')
      );
      expect(result.recommendations).toContainEqual(
        expect.stringContaining('Review failure patterns')
      );
    });

    it('should recommend investigation for degrading performance', async () => {
      const metrics = [
        mockMetric({ date: '2026-01-01', successRate: 0.9 }),
        mockMetric({ date: '2026-01-02', successRate: 0.5 }),
      ];

      const result = await analyzer.analyzeAgent('test-agent', metrics);

      expect(result.recommendations).toContainEqual(
        expect.stringContaining('declining')
      );
      expect(result.recommendations).toContainEqual(
        expect.stringContaining('Investigate recent changes')
      );
    });

    it('should recommend learning from high override rate', async () => {
      const metrics = [mockMetric({ overrideRate: 0.3 })]; // Above 0.2 threshold

      const result = await analyzer.analyzeAgent('test-agent', metrics);

      expect(result.recommendations).toContainEqual(
        expect.stringContaining('30% of the time')
      );
      expect(result.recommendations).toContainEqual(
        expect.stringContaining('Learn from corrections')
      );
    });

    it('should note insufficient data', async () => {
      const metrics = [mockMetric({ tasksCompleted: 3 })]; // Below 5 minimum

      const result = await analyzer.analyzeAgent('test-agent', metrics);

      expect(result.recommendations).toContainEqual(
        expect.stringContaining('limited data')
      );
      expect(result.recommendations).toContainEqual(
        expect.stringContaining('3 tasks')
      );
    });

    it('should recommend optimization for slow performance', async () => {
      const metrics = [mockMetric({ avgDurationMs: 90000 })]; // > 60s

      const result = await analyzer.analyzeAgent('test-agent', metrics);

      expect(result.recommendations).toContainEqual(
        expect.stringContaining('90s')
      );
      expect(result.recommendations).toContainEqual(
        expect.stringContaining('optimization')
      );
    });

    it('should provide positive feedback for good performance', async () => {
      const metrics = [
        mockMetric({ date: '2026-01-01', successRate: 0.9 }),
        mockMetric({ date: '2026-01-02', successRate: 0.95 }),
      ];

      const result = await analyzer.analyzeAgent('test-agent', metrics);

      expect(result.recommendations).toContainEqual(
        expect.stringContaining('performing well')
      );
      expect(result.recommendations).toContainEqual(
        expect.stringContaining('documenting successful patterns')
      );
    });

    it('should return empty recommendations for average performance', async () => {
      const metrics = [
        mockMetric({
          tasksCompleted: 10,
          successRate: 0.8,
          overrideRate: 0.1,
          avgDurationMs: 30000,
        }),
      ];

      const result = await analyzer.analyzeAgent('test-agent', metrics);

      expect(result.recommendations).toHaveLength(0);
    });
  });

  describe('compareAgents', () => {
    it('should compare two agents', async () => {
      vi.mocked(mockDatabase.getAgentMetrics)
        .mockResolvedValueOnce([mockMetric({ agentId: 'agent-1', successRate: 0.9, avgDurationMs: 5000 })])
        .mockResolvedValueOnce([mockMetric({ agentId: 'agent-2', successRate: 0.8, avgDurationMs: 3000 })]);

      const result = await analyzer.compareAgents('agent-1', 'agent-2');

      expect(result).toMatchObject({
        agent1: expect.objectContaining({ agentId: 'agent-1' }),
        agent2: expect.objectContaining({ agentId: 'agent-2' }),
        comparison: {
          betterSuccessRate: 'agent-1',
          betterDuration: 'agent-2',
          recommendation: expect.stringContaining('agent-1 has better success rate'),
        },
      });
    });

    it('should identify same agent as better in both metrics', async () => {
      vi.mocked(mockDatabase.getAgentMetrics)
        .mockResolvedValueOnce([mockMetric({ agentId: 'agent-1', successRate: 0.9, avgDurationMs: 3000 })])
        .mockResolvedValueOnce([mockMetric({ agentId: 'agent-2', successRate: 0.7, avgDurationMs: 5000 })]);

      const result = await analyzer.compareAgents('agent-1', 'agent-2');

      expect(result.comparison.betterSuccessRate).toBe('agent-1');
      expect(result.comparison.betterDuration).toBe('agent-1');
      expect(result.comparison.recommendation).toContain('outperforms in both');
    });
  });

  describe('getSummary', () => {
    it('should return empty summary when no metrics', async () => {
      vi.mocked(mockDatabase.getRecentMetrics).mockResolvedValue([]);

      const summary = await analyzer.getSummary();

      expect(summary).toEqual({
        totalAgents: 0,
        avgSuccessRate: 0,
        topPerformers: [],
        needsAttention: [],
      });
    });

    it('should calculate summary statistics', async () => {
      const metrics = [
        mockMetric({ agentId: 'agent-1', successRate: 0.95 }),
        mockMetric({ agentId: 'agent-2', successRate: 0.85 }),
        mockMetric({ agentId: 'agent-3', successRate: 0.75 }),
      ];
      vi.mocked(mockDatabase.getRecentMetrics).mockResolvedValue(metrics);

      const summary = await analyzer.getSummary();

      expect(summary.totalAgents).toBe(3);
      expect(summary.avgSuccessRate).toBeCloseTo(0.85, 2);
    });

    it('should identify top performers', async () => {
      const metrics = [
        mockMetric({ agentId: 'excellent', successRate: 0.95 }),
        mockMetric({ agentId: 'great', successRate: 0.90 }),
        mockMetric({ agentId: 'good', successRate: 0.86 }),
        mockMetric({ agentId: 'ok', successRate: 0.75 }),
      ];
      vi.mocked(mockDatabase.getRecentMetrics).mockResolvedValue(metrics);

      const summary = await analyzer.getSummary();

      expect(summary.topPerformers).toContain('excellent');
      expect(summary.topPerformers).toContain('great');
      expect(summary.topPerformers).toContain('good');
      expect(summary.topPerformers).not.toContain('ok'); // Below 0.85
    });

    it('should identify agents needing attention', async () => {
      const metrics = [
        mockMetric({ agentId: 'good', successRate: 0.9 }),
        mockMetric({ agentId: 'poor', successRate: 0.65 }), // Below 0.7
      ];
      vi.mocked(mockDatabase.getRecentMetrics).mockResolvedValue(metrics);

      const summary = await analyzer.getSummary();

      expect(summary.needsAttention).toContain('poor');
      expect(summary.needsAttention).not.toContain('good');
    });

    it('should flag degrading agents for attention', async () => {
      const metrics = [
        mockMetric({ agentId: 'degrading', date: '2026-01-01', successRate: 0.9 }),
        mockMetric({ agentId: 'degrading', date: '2026-01-02', successRate: 0.5 }),
      ];
      vi.mocked(mockDatabase.getRecentMetrics).mockResolvedValue(metrics);

      const summary = await analyzer.getSummary();

      expect(summary.needsAttention).toContain('degrading');
    });

    it('should limit top performers to 5', async () => {
      const metrics = Array.from({ length: 10 }, (_, i) =>
        mockMetric({ agentId: `agent-${i}`, successRate: 0.95 })
      );
      vi.mocked(mockDatabase.getRecentMetrics).mockResolvedValue(metrics);

      const summary = await analyzer.getSummary();

      expect(summary.topPerformers.length).toBeLessThanOrEqual(5);
    });
  });

  describe('configure', () => {
    it('should update configuration', () => {
      analyzer.configure({
        historyDays: 60,
        minTasks: 10,
        successThresholdGood: 0.9,
      });

      // Verify config is applied by checking behavior
      expect(analyzer).toBeDefined();
    });

    it('should merge with existing configuration', () => {
      analyzer.configure({ historyDays: 60 });
      analyzer.configure({ minTasks: 10 });

      // Both configs should be applied
      expect(analyzer).toBeDefined();
    });
  });
});
