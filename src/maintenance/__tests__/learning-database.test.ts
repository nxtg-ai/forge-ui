/**
 * Learning Database Tests
 *
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LearningDatabase } from '../learning-database';
import type { PatternScan } from '../pattern-scanner';
import type { HealthCheck } from '../health-monitor';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('LearningDatabase', () => {
  let database: LearningDatabase;
  const testDbPath = '.forge-test-learning/learning-test.db';

  beforeEach(async () => {
    // Clean up before each test
    try {
      await fs.rm(path.dirname(testDbPath), { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist
    }

    database = new LearningDatabase(testDbPath);
  });

  afterEach(async () => {
    try {
      await database.close();
    } catch (error) {
      // Database might not be initialized
    }

    // Clean up test files
    try {
      await fs.rm(path.dirname(testDbPath), { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist
    }
  });

  describe('initialize', () => {
    it('should initialize with empty data', async () => {
      await database.initialize();

      const stats = await database.getStats();
      expect(stats.patternCount).toBe(0);
      expect(stats.metricCount).toBe(0);
      expect(stats.updateCount).toBe(0);
      expect(stats.suggestionCount).toBe(0);
      expect(stats.healthEventCount).toBe(0);
    });

    it('should create database directory', async () => {
      await database.initialize();

      const exists = await fs
        .access(path.dirname(testDbPath))
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);
    });

    it('should create database file', async () => {
      await database.initialize();
      await database.close();

      const exists = await fs
        .access(testDbPath)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);
    });

    it('should load existing data', async () => {
      // Create initial database
      await database.initialize();
      await database.storePatterns([
        {
          source: 'task_completion',
          pattern: {
            context: 'test',
            action: 'test',
            outcome: 'success',
            confidence: 0.8,
          },
          frequency: 1,
          lastSeen: new Date(),
        },
      ]);
      const stats1 = await database.getStats();
      expect(stats1.patternCount).toBe(1);

      await database.close();

      // Create new instance and load
      database = new LearningDatabase(testDbPath);
      await database.initialize();

      const stats = await database.getStats();
      expect(stats.patternCount).toBe(1);
    });

    it('should not re-initialize if already initialized', async () => {
      await database.initialize();
      const stats1 = await database.getStats();

      await database.initialize();
      const stats2 = await database.getStats();

      expect(stats1).toEqual(stats2);
    });

    it('should handle corrupted database file gracefully', async () => {
      // Create corrupt file
      await fs.mkdir(path.dirname(testDbPath), { recursive: true });
      await fs.writeFile(testDbPath, 'invalid json {}}');

      await database.initialize();

      const stats = await database.getStats();
      expect(stats.patternCount).toBe(0);
    });
  });

  describe('patterns', () => {
    beforeEach(async () => {
      await database.initialize();
    });

    it('should store patterns', async () => {
      const patterns: PatternScan[] = [
        {
          source: 'task_completion',
          pattern: {
            context: 'test context',
            action: 'test action',
            outcome: 'success',
            confidence: 0.9,
          },
          frequency: 5,
          lastSeen: new Date(),
        },
      ];

      await database.storePatterns(patterns);

      const stored = await database.getPatterns();
      expect(stored.length).toBe(1);
      expect(stored[0].pattern.context).toBe('test context');
    });

    it('should merge duplicate patterns', async () => {
      const pattern1: PatternScan = {
        source: 'task_completion',
        pattern: {
          context: 'same',
          action: 'same',
          outcome: 'success',
          confidence: 0.8,
        },
        frequency: 3,
        lastSeen: new Date('2024-01-01'),
      };

      const pattern2: PatternScan = {
        source: 'task_completion',
        pattern: {
          context: 'same',
          action: 'same',
          outcome: 'success',
          confidence: 0.9,
        },
        frequency: 5,
        lastSeen: new Date('2024-01-02'),
      };

      await database.storePatterns([pattern1]);
      await database.storePatterns([pattern2]);

      const stored = await database.getPatterns();
      expect(stored.length).toBe(1);
      expect(stored[0].frequency).toBe(8); // 3 + 5
      expect(stored[0].pattern.confidence).toBeCloseTo(0.85, 2); // Average of 0.8 and 0.9
    });

    it('should update lastSeen on merge', async () => {
      const date1 = new Date('2024-01-01');
      const date2 = new Date('2024-01-02');

      const pattern1: PatternScan = {
        source: 'task_completion',
        pattern: {
          context: 'test',
          action: 'test',
          outcome: 'success',
          confidence: 0.8,
        },
        frequency: 1,
        lastSeen: date1,
      };

      const pattern2: PatternScan = {
        source: 'task_completion',
        pattern: {
          context: 'test',
          action: 'test',
          outcome: 'success',
          confidence: 0.8,
        },
        frequency: 1,
        lastSeen: date2,
      };

      await database.storePatterns([pattern1]);
      await database.close();

      // Reopen database for second store
      database = new LearningDatabase(testDbPath);
      await database.initialize();
      await database.storePatterns([pattern2]);

      const stored = await database.getPatterns();
      expect(stored[0].lastSeen).toEqual(date2);
    });

    it('should filter patterns by source', async () => {
      await database.storePatterns([
        {
          source: 'task_completion',
          pattern: {
            context: 'test1',
            action: 'action1',
            outcome: 'success',
            confidence: 0.8,
          },
          frequency: 1,
          lastSeen: new Date(),
        },
        {
          source: 'user_correction',
          pattern: {
            context: 'test2',
            action: 'action2',
            outcome: 'success',
            confidence: 0.8,
          },
          frequency: 1,
          lastSeen: new Date(),
        },
      ]);

      const filtered = await database.getPatterns({ source: 'task_completion' });
      expect(filtered.length).toBe(1);
      expect(filtered[0].source).toBe('task_completion');
    });

    it('should filter patterns by outcome', async () => {
      await database.storePatterns([
        {
          source: 'task_completion',
          pattern: {
            context: 'test1',
            action: 'action1',
            outcome: 'success',
            confidence: 0.8,
          },
          frequency: 1,
          lastSeen: new Date(),
        },
        {
          source: 'task_completion',
          pattern: {
            context: 'test2',
            action: 'action2',
            outcome: 'failure',
            confidence: 0.8,
          },
          frequency: 1,
          lastSeen: new Date(),
        },
      ]);

      const filtered = await database.getPatterns({ outcome: 'failure' });
      expect(filtered.length).toBe(1);
      expect(filtered[0].pattern.outcome).toBe('failure');
    });

    it('should filter patterns by minimum confidence', async () => {
      await database.storePatterns([
        {
          source: 'task_completion',
          pattern: {
            context: 'test1',
            action: 'action1',
            outcome: 'success',
            confidence: 0.5,
          },
          frequency: 1,
          lastSeen: new Date(),
        },
        {
          source: 'task_completion',
          pattern: {
            context: 'test2',
            action: 'action2',
            outcome: 'success',
            confidence: 0.9,
          },
          frequency: 1,
          lastSeen: new Date(),
        },
      ]);

      const filtered = await database.getPatterns({ minConfidence: 0.7 });
      expect(filtered.length).toBe(1);
      expect(filtered[0].pattern.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('should filter patterns by agentId', async () => {
      await database.storePatterns([
        {
          source: 'task_completion',
          pattern: {
            context: 'test1',
            action: 'action1',
            outcome: 'success',
            confidence: 0.8,
          },
          frequency: 1,
          lastSeen: new Date(),
          agentId: 'agent1',
        },
        {
          source: 'task_completion',
          pattern: {
            context: 'test2',
            action: 'action2',
            outcome: 'success',
            confidence: 0.8,
          },
          frequency: 1,
          lastSeen: new Date(),
          agentId: 'agent2',
        },
      ]);

      const filtered = await database.getPatterns({ agentId: 'agent1' });
      expect(filtered.length).toBe(1);
      expect(filtered[0].agentId).toBe('agent1');
    });

    it('should support multiple filters', async () => {
      await database.storePatterns([
        {
          source: 'task_completion',
          pattern: {
            context: 'test1',
            action: 'action1',
            outcome: 'success',
            confidence: 0.9,
          },
          frequency: 1,
          lastSeen: new Date(),
          agentId: 'agent1',
        },
        {
          source: 'user_correction',
          pattern: {
            context: 'test2',
            action: 'action2',
            outcome: 'success',
            confidence: 0.5,
          },
          frequency: 1,
          lastSeen: new Date(),
          agentId: 'agent1',
        },
      ]);

      const filtered = await database.getPatterns({
        agentId: 'agent1',
        source: 'task_completion',
        minConfidence: 0.8,
      });

      expect(filtered.length).toBe(1);
      expect(filtered[0].source).toBe('task_completion');
    });
  });

  describe('metrics', () => {
    beforeEach(async () => {
      await database.initialize();
    });

    it('should store metrics', async () => {
      await database.storeMetrics([
        {
          agentId: 'agent1',
          successRate: 0.85,
          tasksCompleted: 10,
          avgDurationMs: 1500,
          overrideRate: 0.1,
        },
      ]);

      const metrics = await database.getRecentMetrics(7);
      expect(metrics.length).toBe(1);
      expect(metrics[0].agentId).toBe('agent1');
      expect(metrics[0].successRate).toBe(0.85);
    });

    it('should update existing metrics for same agent and date', async () => {
      await database.storeMetrics([
        {
          agentId: 'agent1',
          successRate: 0.8,
          tasksCompleted: 10,
        },
      ]);

      await database.storeMetrics([
        {
          agentId: 'agent1',
          successRate: 0.9,
          tasksCompleted: 15,
        },
      ]);

      const metrics = await database.getRecentMetrics(7);
      expect(metrics.length).toBe(1);
      expect(metrics[0].successRate).toBe(0.9);
      expect(metrics[0].tasksCompleted).toBe(15);
    });

    it('should default optional fields to 0', async () => {
      await database.storeMetrics([
        {
          agentId: 'agent1',
          successRate: 0.8,
          tasksCompleted: 5,
        },
      ]);

      const metrics = await database.getRecentMetrics(7);
      expect(metrics[0].avgDurationMs).toBe(0);
      expect(metrics[0].overrideRate).toBe(0);
    });

    it('should filter metrics by days', async () => {
      // Mock date to control test timing
      const today = new Date('2024-01-15');
      vi.setSystemTime(today);

      await database.storeMetrics([
        {
          agentId: 'agent1',
          successRate: 0.8,
          tasksCompleted: 10,
        },
      ]);

      // Move to future and add more metrics
      vi.setSystemTime(new Date('2024-01-20'));

      await database.storeMetrics([
        {
          agentId: 'agent2',
          successRate: 0.9,
          tasksCompleted: 15,
        },
      ]);

      const recentMetrics = await database.getRecentMetrics(3);
      expect(recentMetrics.length).toBe(1);
      expect(recentMetrics[0].agentId).toBe('agent2');

      vi.useRealTimers();
    });

    it('should get agent-specific metrics', async () => {
      await database.storeMetrics([
        {
          agentId: 'agent1',
          successRate: 0.8,
          tasksCompleted: 10,
        },
        {
          agentId: 'agent2',
          successRate: 0.9,
          tasksCompleted: 15,
        },
      ]);

      const metrics = await database.getAgentMetrics('agent1');
      expect(metrics.length).toBe(1);
      expect(metrics[0].agentId).toBe('agent1');
    });

    it('should sort agent metrics by date', async () => {
      vi.setSystemTime(new Date('2024-01-10'));

      await database.storeMetrics([
        {
          agentId: 'agent1',
          successRate: 0.8,
          tasksCompleted: 10,
        },
      ]);

      vi.setSystemTime(new Date('2024-01-15'));

      await database.storeMetrics([
        {
          agentId: 'agent1',
          successRate: 0.9,
          tasksCompleted: 15,
        },
      ]);

      const metrics = await database.getAgentMetrics('agent1');
      expect(metrics[0].date).toBe('2024-01-10');
      expect(metrics[1].date).toBe('2024-01-15');

      vi.useRealTimers();
    });

    it('should filter agent metrics by days', async () => {
      vi.setSystemTime(new Date('2024-01-10'));

      await database.storeMetrics([
        {
          agentId: 'agent1',
          successRate: 0.8,
          tasksCompleted: 10,
        },
      ]);

      vi.setSystemTime(new Date('2024-01-20'));

      await database.storeMetrics([
        {
          agentId: 'agent1',
          successRate: 0.9,
          tasksCompleted: 15,
        },
      ]);

      const metrics = await database.getAgentMetrics('agent1', 5);
      expect(metrics.length).toBe(1);
      expect(metrics[0].date).toBe('2024-01-20');

      vi.useRealTimers();
    });
  });

  describe('skill updates', () => {
    beforeEach(async () => {
      await database.initialize();
    });

    it('should queue skill update', async () => {
      const id = await database.queueSkillUpdate({
        skillFile: 'agent1.md',
        changeType: 'improvement',
        content: 'Updated skill',
        reason: 'Performance improvement',
        confidence: 0.9,
      });

      expect(id).toMatch(/^update-/);

      const updates = await database.getPendingUpdates();
      expect(updates.length).toBe(1);
      expect(updates[0].id).toBe(id);
      expect(updates[0].status).toBe('pending');
    });

    it('should generate unique IDs', async () => {
      const id1 = await database.queueSkillUpdate({
        skillFile: 'agent1.md',
        changeType: 'improvement',
        content: 'Update 1',
        reason: 'Reason 1',
        confidence: 0.9,
      });

      const id2 = await database.queueSkillUpdate({
        skillFile: 'agent2.md',
        changeType: 'improvement',
        content: 'Update 2',
        reason: 'Reason 2',
        confidence: 0.9,
      });

      expect(id1).not.toBe(id2);
    });

    it('should filter pending updates by confidence', async () => {
      await database.queueSkillUpdate({
        skillFile: 'agent1.md',
        changeType: 'improvement',
        content: 'Low confidence',
        reason: 'Test',
        confidence: 0.5,
      });

      await database.queueSkillUpdate({
        skillFile: 'agent2.md',
        changeType: 'improvement',
        content: 'High confidence',
        reason: 'Test',
        confidence: 0.9,
      });

      const updates = await database.getPendingUpdates(0.8);
      expect(updates.length).toBe(1);
      expect(updates[0].confidence).toBeGreaterThanOrEqual(0.8);
    });

    it('should sort pending updates by confidence', async () => {
      await database.queueSkillUpdate({
        skillFile: 'agent1.md',
        changeType: 'improvement',
        content: 'Low',
        reason: 'Test',
        confidence: 0.6,
      });

      await database.queueSkillUpdate({
        skillFile: 'agent2.md',
        changeType: 'improvement',
        content: 'High',
        reason: 'Test',
        confidence: 0.9,
      });

      const updates = await database.getPendingUpdates();
      expect(updates[0].confidence).toBe(0.9);
      expect(updates[1].confidence).toBe(0.6);
    });

    it('should mark update as applied', async () => {
      const id = await database.queueSkillUpdate({
        skillFile: 'agent1.md',
        changeType: 'improvement',
        content: 'Update',
        reason: 'Test',
        confidence: 0.9,
      });

      await database.markUpdateApplied(id);

      const pending = await database.getPendingUpdates();
      expect(pending.length).toBe(0);

      const allData = await database.export();
      const update = allData.skillUpdates.find(u => u.id === id);
      expect(update?.status).toBe('applied');
      expect(update?.appliedAt).toBeDefined();
    });

    it('should mark update as rejected', async () => {
      const id = await database.queueSkillUpdate({
        skillFile: 'agent1.md',
        changeType: 'improvement',
        content: 'Update',
        reason: 'Test',
        confidence: 0.9,
      });

      await database.markUpdateRejected(id);

      const allData = await database.export();
      const update = allData.skillUpdates.find(u => u.id === id);
      expect(update?.status).toBe('rejected');
    });

    it('should mark update as rolled back', async () => {
      const id = await database.queueSkillUpdate({
        skillFile: 'agent1.md',
        changeType: 'improvement',
        content: 'Update',
        reason: 'Test',
        confidence: 0.9,
      });

      await database.markUpdateApplied(id);
      await database.markUpdateRolledBack(id);

      const allData = await database.export();
      const update = allData.skillUpdates.find(u => u.id === id);
      expect(update?.status).toBe('rolled_back');
    });

    it('should handle non-existent update ID gracefully', async () => {
      await database.markUpdateApplied('non-existent-id');
      await database.markUpdateRejected('non-existent-id');
      await database.markUpdateRolledBack('non-existent-id');

      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('suggestions', () => {
    beforeEach(async () => {
      await database.initialize();
    });

    it('should queue suggestion', async () => {
      const id = await database.queueSuggestion({
        agentId: 'agent1',
        suggestion: 'Improve error handling',
        confidence: 0.85,
      });

      expect(id).toMatch(/^suggestion-/);

      const suggestions = await database.getPendingSuggestions();
      expect(suggestions.length).toBe(1);
      expect(suggestions[0].id).toBe(id);
      expect(suggestions[0].status).toBe('pending');
    });

    it('should get pending suggestions', async () => {
      await database.queueSuggestion({
        agentId: 'agent1',
        suggestion: 'Suggestion 1',
        confidence: 0.8,
      });

      await database.queueSuggestion({
        agentId: 'agent2',
        suggestion: 'Suggestion 2',
        confidence: 0.9,
      });

      const suggestions = await database.getPendingSuggestions();
      expect(suggestions.length).toBe(2);
    });

    it('should not return non-pending suggestions', async () => {
      const id = await database.queueSuggestion({
        agentId: 'agent1',
        suggestion: 'Test',
        confidence: 0.8,
      });

      // Manually update status
      const allData = await database.export();
      const suggestion = allData.suggestions.find(s => s.id === id);
      if (suggestion) {
        suggestion.status = 'applied';
      }
      await database.import(allData);

      const pending = await database.getPendingSuggestions();
      expect(pending.length).toBe(0);
    });
  });

  describe('health events', () => {
    beforeEach(async () => {
      await database.initialize();
    });

    it('should log health event', async () => {
      const event: HealthCheck = {
        category: 'disk_space',
        status: 'healthy',
        message: 'Disk space OK',
        metrics: { usage: 50 },
        actions: [],
        timestamp: new Date().toISOString(),
      };

      await database.logHealthEvent(event);

      const events = await database.getHealthEvents();
      expect(events.length).toBe(1);
      expect(events[0].category).toBe('disk_space');
    });

    it('should limit health events to 1000', async () => {
      const event: HealthCheck = {
        category: 'test',
        status: 'healthy',
        message: 'Test',
        metrics: {},
        actions: [],
        timestamp: new Date().toISOString(),
      };

      // Add 1100 events
      for (let i = 0; i < 1100; i++) {
        await database.logHealthEvent(event);
      }

      const allData = await database.export();
      expect(allData.healthEvents.length).toBe(1000);
    });

    it('should filter health events by hours', async () => {
      const oldEvent: HealthCheck = {
        category: 'test',
        status: 'healthy',
        message: 'Old',
        metrics: {},
        actions: [],
        timestamp: new Date('2024-01-01').toISOString(),
      };

      const recentEvent: HealthCheck = {
        category: 'test',
        status: 'healthy',
        message: 'Recent',
        metrics: {},
        actions: [],
        timestamp: new Date().toISOString(),
      };

      await database.logHealthEvent(oldEvent);
      await database.logHealthEvent(recentEvent);

      const recent = await database.getHealthEvents(1);
      expect(recent.length).toBe(1);
      expect(recent[0].message).toBe('Recent');
    });

    it('should filter health events by category', async () => {
      await database.logHealthEvent({
        category: 'disk',
        status: 'healthy',
        message: 'Disk OK',
        metrics: {},
        actions: [],
        timestamp: new Date().toISOString(),
      });

      await database.logHealthEvent({
        category: 'memory',
        status: 'healthy',
        message: 'Memory OK',
        metrics: {},
        actions: [],
        timestamp: new Date().toISOString(),
      });

      const diskEvents = await database.getHealthEvents(undefined, 'disk');
      expect(diskEvents.length).toBe(1);
      expect(diskEvents[0].category).toBe('disk');
    });

    it('should sort health events by timestamp descending', async () => {
      const event1: HealthCheck = {
        category: 'test',
        status: 'healthy',
        message: 'Event 1',
        metrics: {},
        actions: [],
        timestamp: new Date('2024-01-10').toISOString(),
      };

      const event2: HealthCheck = {
        category: 'test',
        status: 'healthy',
        message: 'Event 2',
        metrics: {},
        actions: [],
        timestamp: new Date('2024-01-15').toISOString(),
      };

      await database.logHealthEvent(event1);
      await database.logHealthEvent(event2);

      const events = await database.getHealthEvents();
      expect(events[0].message).toBe('Event 2'); // Most recent first
      expect(events[1].message).toBe('Event 1');
    });
  });

  describe('utilities', () => {
    beforeEach(async () => {
      await database.initialize();
    });

    it('should get database statistics', async () => {
      await database.storePatterns([
        {
          source: 'task_completion',
          pattern: {
            context: 'test',
            action: 'test',
            outcome: 'success',
            confidence: 0.8,
          },
          frequency: 1,
          lastSeen: new Date(),
        },
      ]);

      await database.storeMetrics([
        {
          agentId: 'agent1',
          successRate: 0.8,
          tasksCompleted: 10,
        },
      ]);

      const stats = await database.getStats();
      expect(stats.patternCount).toBe(1);
      expect(stats.metricCount).toBe(1);
      expect(stats.updateCount).toBe(0);
      expect(stats.suggestionCount).toBe(0);
      expect(stats.healthEventCount).toBe(0);
    });

    it('should export all data', async () => {
      await database.storePatterns([
        {
          source: 'task_completion',
          pattern: {
            context: 'test',
            action: 'test',
            outcome: 'success',
            confidence: 0.8,
          },
          frequency: 1,
          lastSeen: new Date(),
        },
      ]);

      const exported = await database.export();
      expect(exported.patterns.length).toBe(1);
      expect(exported.metrics).toBeDefined();
      expect(exported.skillUpdates).toBeDefined();
      expect(exported.suggestions).toBeDefined();
      expect(exported.healthEvents).toBeDefined();
    });

    it('should import data', async () => {
      const importData = {
        patterns: [
          {
            source: 'task_completion' as const,
            pattern: {
              context: 'imported',
              action: 'test',
              outcome: 'success' as const,
              confidence: 0.8,
            },
            frequency: 5,
            lastSeen: new Date(),
          },
        ],
        metrics: [],
        skillUpdates: [],
        suggestions: [],
        healthEvents: [],
      };

      await database.import(importData);

      const patterns = await database.getPatterns();
      expect(patterns.length).toBe(1);
      expect(patterns[0].pattern.context).toBe('imported');
      expect(patterns[0].frequency).toBe(5);
    });

    it('should export and import preserve data integrity', async () => {
      await database.storePatterns([
        {
          source: 'task_completion',
          pattern: {
            context: 'test',
            action: 'test',
            outcome: 'success',
            confidence: 0.8,
          },
          frequency: 3,
          lastSeen: new Date(),
        },
      ]);

      await database.storeMetrics([
        {
          agentId: 'agent1',
          successRate: 0.85,
          tasksCompleted: 10,
        },
      ]);

      const exported = await database.export();

      // Create new database and import
      const database2 = new LearningDatabase('.forge-test-learning/learning-test2.db');
      await database2.initialize();
      await database2.import(exported);

      const stats = await database2.getStats();
      expect(stats.patternCount).toBe(1);
      expect(stats.metricCount).toBe(1);

      await database2.close();
      await fs.rm('.forge-test-learning/learning-test2.db', { force: true });
    });
  });

  describe('persistence', () => {
    it('should persist data across close/reopen', async () => {
      await database.initialize();

      await database.storePatterns([
        {
          source: 'task_completion',
          pattern: {
            context: 'persistent',
            action: 'test',
            outcome: 'success',
            confidence: 0.8,
          },
          frequency: 1,
          lastSeen: new Date(),
        },
      ]);

      await database.close();

      // Reopen database
      const database2 = new LearningDatabase(testDbPath);
      await database2.initialize();

      const patterns = await database2.getPatterns();
      expect(patterns.length).toBe(1);
      expect(patterns[0].pattern.context).toBe('persistent');

      await database2.close();
    });
  });
});
