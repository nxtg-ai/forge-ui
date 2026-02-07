/**
 * Pattern Scanner Tests
 *
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PatternScanner, type PatternScan } from '../pattern-scanner';
import { LearningDatabase } from '../learning-database';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock logger
vi.mock('../utils/logger', () => ({
  getLogger: () => ({
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  }),
}));

describe('PatternScanner', () => {
  let scanner: PatternScanner;
  let database: LearningDatabase;
  const testDbPath = '.forge-test-scanner/scanner-test.db';
  const testTaskDir = '.forge-test-scanner/history/tasks';
  const testCorrectionDir = '.forge-test-scanner/history/corrections';

  beforeEach(async () => {
    // Clean up before each test
    try {
      await fs.rm(path.resolve('.forge-test-scanner'), { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist
    }

    // Create test directories
    await fs.mkdir(path.resolve(testTaskDir), { recursive: true });
    await fs.mkdir(path.resolve(testCorrectionDir), { recursive: true });

    database = new LearningDatabase(testDbPath);
    await database.initialize();

    scanner = new PatternScanner(database, {
      taskHistoryDir: path.resolve(testTaskDir),
      correctionLogsDir: path.resolve(testCorrectionDir),
      minFrequency: 1,
      minConfidence: 0,
    });
  });

  afterEach(async () => {
    try {
      await database.close();
    } catch (error) {
      // Database might not be initialized
    }

    // Clean up test files
    try {
      await fs.rm(path.resolve('.forge-test-scanner'), { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist
    }
  });

  describe('initialization', () => {
    it('should create scanner with default config', () => {
      const defaultScanner = new PatternScanner(database);
      expect(defaultScanner).toBeDefined();
    });

    it('should merge custom config with defaults', () => {
      const customScanner = new PatternScanner(database, {
        minFrequency: 5,
        minConfidence: 0.8,
      });
      expect(customScanner).toBeDefined();
    });

    it('should update config via configure method', () => {
      scanner.configure({ minFrequency: 10 });
      // Configuration updated (no direct way to verify, but should not throw)
      expect(true).toBe(true);
    });
  });

  describe('scanTaskCompletions', () => {
    it('should scan completed tasks', async () => {
      const task = {
        context: 'test context',
        objective: 'test objective',
        approach: 'test approach',
        type: 'test',
        success: true,
        completedAt: new Date().toISOString(),
        agentId: 'agent1',
      };

      await fs.writeFile(path.resolve(testTaskDir, 'task1.json'), JSON.stringify(task));

      const patterns = await scanner.scan();

      expect(patterns.length).toBeGreaterThan(0);
      const taskPattern = patterns.find(p => p.source === 'task_completion');
      expect(taskPattern).toBeDefined();
      expect(taskPattern?.pattern.outcome).toBe('success');
    });

    it('should handle successful tasks', async () => {
      const task = {
        context: 'success context',
        approach: 'good approach',
        success: true,
        completedAt: new Date().toISOString(),
        agentId: 'agent1',
      };

      await fs.writeFile(path.resolve(testTaskDir, 'task1.json'), JSON.stringify(task));

      const patterns = await scanner.scan();

      const successPattern = patterns.find(
        p => p.source === 'task_completion' && p.pattern.outcome === 'success'
      );
      expect(successPattern).toBeDefined();
      expect(successPattern?.pattern.confidence).toBeGreaterThanOrEqual(0.8);
    });

    it('should handle failed tasks', async () => {
      const task = {
        context: 'failure context',
        approach: 'bad approach',
        success: false,
        completedAt: new Date().toISOString(),
        agentId: 'agent1',
      };

      await fs.writeFile(path.resolve(testTaskDir, 'task1.json'), JSON.stringify(task));

      const patterns = await scanner.scan();

      const failurePattern = patterns.find(
        p => p.source === 'task_completion' && p.pattern.outcome === 'failure'
      );
      expect(failurePattern).toBeDefined();
      expect(failurePattern?.pattern.confidence).toBeLessThan(0.8);
    });

    it('should skip old tasks based on maxAgeDays', async () => {
      const oldTask = {
        context: 'old context',
        approach: 'old approach',
        success: true,
        completedAt: new Date('2020-01-01').toISOString(),
        agentId: 'agent1',
      };

      await fs.writeFile(path.resolve(testTaskDir, 'old-task.json'), JSON.stringify(oldTask));

      scanner.configure({ maxAgeDays: 30 });
      const patterns = await scanner.scan();

      expect(patterns.length).toBe(0);
    });

    it('should skip non-JSON files', async () => {
      await fs.writeFile(path.resolve(testTaskDir, 'not-json.txt'), 'not a json file');

      const patterns = await scanner.scan();

      expect(patterns.length).toBe(0);
    });

    it('should skip invalid JSON files', async () => {
      await fs.writeFile(path.resolve(testTaskDir, 'invalid.json'), 'invalid {json}');

      const patterns = await scanner.scan();

      expect(patterns.length).toBe(0);
    });

    it('should handle missing task history directory', async () => {
      await fs.rm(path.resolve(testTaskDir), { recursive: true, force: true });

      const patterns = await scanner.scan();

      expect(patterns).toBeInstanceOf(Array);
    });

    it('should use objective as context fallback', async () => {
      const task = {
        objective: 'fallback objective',
        type: 'test type',
        success: true,
        completedAt: new Date().toISOString(),
        agentId: 'agent1',
      };

      await fs.writeFile(path.resolve(testTaskDir, 'task1.json'), JSON.stringify(task));

      const patterns = await scanner.scan();

      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns[0].pattern.context).toBe('fallback objective');
    });

    it('should use type as action fallback', async () => {
      const task = {
        context: 'test context',
        type: 'fallback type',
        success: true,
        completedAt: new Date().toISOString(),
        agentId: 'agent1',
      };

      await fs.writeFile(path.resolve(testTaskDir, 'task1.json'), JSON.stringify(task));

      const patterns = await scanner.scan();

      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns[0].pattern.action).toBe('fallback type');
    });
  });

  describe('scanUserCorrections', () => {
    it('should scan user corrections', async () => {
      const correction = {
        context: 'correction context',
        originalAction: 'wrong action',
        correctedAction: 'right action',
        timestamp: new Date().toISOString(),
        agentId: 'agent1',
      };

      await fs.writeFile(
        path.resolve(testCorrectionDir, 'correction1.json'),
        JSON.stringify(correction)
      );

      const patterns = await scanner.scan();

      const correctionPatterns = patterns.filter(p => p.source === 'user_correction');
      expect(correctionPatterns.length).toBeGreaterThan(0);
    });

    it('should create failure pattern for original action', async () => {
      const correction = {
        context: 'test context',
        originalAction: 'bad action',
        correctedAction: 'good action',
        timestamp: new Date().toISOString(),
        agentId: 'agent1',
      };

      await fs.writeFile(
        path.resolve(testCorrectionDir, 'correction1.json'),
        JSON.stringify(correction)
      );

      const patterns = await scanner.scan();

      const failurePattern = patterns.find(
        p =>
          p.source === 'user_correction' &&
          p.pattern.action === 'bad action' &&
          p.pattern.outcome === 'failure'
      );

      expect(failurePattern).toBeDefined();
      expect(failurePattern?.pattern.confidence).toBe(0.9);
    });

    it('should create success pattern for corrected action', async () => {
      const correction = {
        context: 'test context',
        originalAction: 'bad action',
        correctedAction: 'good action',
        timestamp: new Date().toISOString(),
        agentId: 'agent1',
      };

      await fs.writeFile(
        path.resolve(testCorrectionDir, 'correction1.json'),
        JSON.stringify(correction)
      );

      const patterns = await scanner.scan();

      const successPattern = patterns.find(
        p =>
          p.source === 'user_correction' &&
          p.pattern.action === 'good action' &&
          p.pattern.outcome === 'success'
      );

      expect(successPattern).toBeDefined();
      expect(successPattern?.pattern.confidence).toBe(0.95);
    });

    it('should handle missing correction directory', async () => {
      await fs.rm(path.resolve(testCorrectionDir), { recursive: true, force: true });

      const patterns = await scanner.scan();

      expect(patterns).toBeInstanceOf(Array);
    });

    it('should skip invalid correction files', async () => {
      await fs.writeFile(
        path.resolve(testCorrectionDir, 'invalid.json'),
        'invalid {json}'
      );

      const patterns = await scanner.scan();

      expect(patterns).toBeInstanceOf(Array);
    });
  });

  describe('scanPerformanceData', () => {
    it('should scan high performance metrics', async () => {
      await database.storeMetrics([
        {
          agentId: 'high-performer',
          successRate: 0.9,
          tasksCompleted: 10,
        },
      ]);

      const patterns = await scanner.scan();

      const perfPattern = patterns.find(
        p => p.source === 'performance' && p.agentId === 'high-performer'
      );

      expect(perfPattern).toBeDefined();
      expect(perfPattern?.pattern.outcome).toBe('success');
      expect(perfPattern?.pattern.confidence).toBe(0.9);
    });

    it('should scan low performance metrics', async () => {
      await database.storeMetrics([
        {
          agentId: 'low-performer',
          successRate: 0.5,
          tasksCompleted: 10,
        },
      ]);

      scanner.configure({ minFrequency: 1, minConfidence: 0.4 });
      const patterns = await scanner.scan();

      const perfPattern = patterns.find(
        p => p.source === 'performance' && p.agentId === 'low-performer' && p.pattern.outcome === 'failure'
      );

      expect(perfPattern).toBeDefined();
      expect(perfPattern?.pattern.outcome).toBe('failure');
      expect(perfPattern?.pattern.confidence).toBe(0.5); // 1 - successRate
    });

    it('should only flag metrics above 85% as success', async () => {
      await database.storeMetrics([
        {
          agentId: 'agent1',
          successRate: 0.84,
          tasksCompleted: 10,
        },
      ]);

      const patterns = await scanner.scan();

      const perfPattern = patterns.find(
        p => p.source === 'performance' && p.agentId === 'agent1'
      );

      // Should not be flagged as success (< 0.85)
      expect(perfPattern?.pattern.outcome).not.toBe('success');
    });

    it('should only flag metrics below 60% as failure', async () => {
      await database.storeMetrics([
        {
          agentId: 'agent1',
          successRate: 0.61,
          tasksCompleted: 10,
        },
      ]);

      const patterns = await scanner.scan();

      const perfPattern = patterns.find(
        p =>
          p.source === 'performance' &&
          p.agentId === 'agent1' &&
          p.pattern.outcome === 'failure'
      );

      // Should not be flagged as failure (> 0.6)
      expect(perfPattern).toBeUndefined();
    });

    it('should use tasks completed as frequency', async () => {
      await database.storeMetrics([
        {
          agentId: 'agent1',
          successRate: 0.9,
          tasksCompleted: 25,
        },
      ]);

      const patterns = await scanner.scan();

      const perfPattern = patterns.find(p => p.agentId === 'agent1');
      expect(perfPattern?.frequency).toBe(25);
    });

    it('should handle database errors gracefully', async () => {
      // Close database to cause error
      await database.close();

      const patterns = await scanner.scan();

      expect(patterns).toBeInstanceOf(Array);
    });
  });

  describe('mergePatterns', () => {
    beforeEach(async () => {
      // Ensure directories exist for these tests
      await fs.mkdir(path.resolve(testTaskDir), { recursive: true });
      await fs.mkdir(path.resolve(testCorrectionDir), { recursive: true });
    });

    it('should merge similar patterns', async () => {
      const task1 = {
        context: 'same context',
        approach: 'same action',
        success: true,
        completedAt: new Date().toISOString(),
        agentId: 'agent1',
      };

      const task2 = {
        context: 'same context',
        approach: 'same action',
        success: true,
        completedAt: new Date().toISOString(),
        agentId: 'agent1',
      };

      await fs.writeFile(path.resolve(testTaskDir, 'task1.json'), JSON.stringify(task1));
      await fs.writeFile(path.resolve(testTaskDir, 'task2.json'), JSON.stringify(task2));

      // Configure to allow low frequency
      scanner.configure({ minFrequency: 1 });
      const patterns = await scanner.scan();

      // Should be merged into one pattern with frequency 2
      const merged = patterns.find(
        p => p.pattern.context === 'same context' && p.pattern.action === 'same action'
      );

      expect(merged).toBeDefined();
      expect(merged?.frequency).toBeGreaterThanOrEqual(2);
    });

    it('should average confidence on merge', async () => {
      // Create patterns manually for precise control
      await database.storeMetrics([
        {
          agentId: 'agent1',
          successRate: 0.9,
          tasksCompleted: 5,
        },
      ]);

      await database.storeMetrics([
        {
          agentId: 'agent1',
          successRate: 0.86,
          tasksCompleted: 3,
        },
      ]);

      const patterns = await scanner.scan();

      // Find the merged pattern
      const merged = patterns.find(p => p.agentId === 'agent1');
      expect(merged).toBeDefined();

      // Confidence should be averaged
      expect(merged?.pattern.confidence).toBeGreaterThan(0.85);
      expect(merged?.pattern.confidence).toBeLessThan(0.91);
    });

    it('should update lastSeen to most recent', async () => {
      const now = new Date();
      const oldDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
      const newDate = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000); // 1 day ago

      const task1 = {
        context: 'test',
        approach: 'test',
        success: true,
        completedAt: oldDate.toISOString(),
        agentId: 'agent1',
      };

      const task2 = {
        context: 'test',
        approach: 'test',
        success: true,
        completedAt: newDate.toISOString(),
        agentId: 'agent1',
      };

      await fs.writeFile(path.resolve(testTaskDir, 'task1.json'), JSON.stringify(task1));
      await fs.writeFile(path.resolve(testTaskDir, 'task2.json'), JSON.stringify(task2));

      scanner.configure({ minFrequency: 1, minConfidence: 0.7 });
      const patterns = await scanner.scan();

      expect(patterns.length).toBeGreaterThan(0);
      const merged = patterns[0];
      expect(new Date(merged.lastSeen).getTime()).toBeGreaterThanOrEqual(newDate.getTime());
    });

    it('should filter by minimum frequency', async () => {
      const task = {
        context: 'low frequency',
        approach: 'test',
        success: true,
        completedAt: new Date().toISOString(),
        agentId: 'agent1',
      };

      await fs.writeFile(path.resolve(testTaskDir, 'task1.json'), JSON.stringify(task));

      scanner.configure({ minFrequency: 5 });
      const patterns = await scanner.scan();

      // Should be filtered out (frequency = 1)
      expect(patterns.length).toBe(0);
    });

    it('should filter by minimum confidence', async () => {
      const task = {
        context: 'test',
        approach: 'test',
        success: false, // Low confidence
        completedAt: new Date().toISOString(),
        agentId: 'agent1',
      };

      await fs.writeFile(path.resolve(testTaskDir, 'task1.json'), JSON.stringify(task));

      scanner.configure({ minFrequency: 1, minConfidence: 0.7 });
      const patterns = await scanner.scan();

      // Failed tasks have confidence 0.6, should be filtered out
      expect(patterns.length).toBe(0);
    });

    it('should sort patterns by frequency', async () => {
      await database.storeMetrics([
        {
          agentId: 'agent1',
          successRate: 0.9,
          tasksCompleted: 5,
        },
        {
          agentId: 'agent2',
          successRate: 0.9,
          tasksCompleted: 10,
        },
      ]);

      const patterns = await scanner.scan();

      if (patterns.length > 1) {
        expect(patterns[0].frequency).toBeGreaterThanOrEqual(patterns[1].frequency);
      }
    });

    it('should not merge patterns with different outcomes', async () => {
      const success = {
        context: 'same',
        approach: 'same',
        success: true,
        completedAt: new Date().toISOString(),
        agentId: 'agent1',
      };

      const failure = {
        context: 'same',
        approach: 'same',
        success: false,
        completedAt: new Date().toISOString(),
        agentId: 'agent1',
      };

      await fs.writeFile(path.resolve(testTaskDir, 'success.json'), JSON.stringify(success));
      await fs.writeFile(path.resolve(testTaskDir, 'failure.json'), JSON.stringify(failure));

      scanner.configure({ minFrequency: 1 });
      const patterns = await scanner.scan();

      const successPattern = patterns.find(p => p.pattern.outcome === 'success');
      const failurePattern = patterns.find(p => p.pattern.outcome === 'failure');

      expect(successPattern).toBeDefined();
      expect(failurePattern).toBeDefined();
    });
  });

  describe('full scan', () => {
    beforeEach(async () => {
      // Ensure directories exist for these tests
      await fs.mkdir(path.resolve(testTaskDir), { recursive: true });
      await fs.mkdir(path.resolve(testCorrectionDir), { recursive: true });
    });

    it('should combine all scan sources', async () => {
      // Add task
      const task = {
        context: 'task context',
        approach: 'task action',
        success: true,
        completedAt: new Date().toISOString(),
        agentId: 'agent1',
      };

      await fs.writeFile(path.resolve(testTaskDir, 'task1.json'), JSON.stringify(task));

      // Add correction
      const correction = {
        context: 'correction context',
        originalAction: 'wrong',
        correctedAction: 'right',
        timestamp: new Date().toISOString(),
        agentId: 'agent2',
      };

      await fs.writeFile(
        path.resolve(testCorrectionDir, 'correction1.json'),
        JSON.stringify(correction)
      );

      // Add performance data
      await database.storeMetrics([
        {
          agentId: 'agent3',
          successRate: 0.9,
          tasksCompleted: 10,
        },
      ]);

      const patterns = await scanner.scan();

      const sources = new Set(patterns.map(p => p.source));
      expect(sources.has('task_completion')).toBe(true);
      expect(sources.has('user_correction')).toBe(true);
      expect(sources.has('performance')).toBe(true);
    });

    it('should persist scanned patterns to database', async () => {
      const task = {
        context: 'test',
        approach: 'test',
        success: true,
        completedAt: new Date().toISOString(),
        agentId: 'agent1',
      };

      await fs.writeFile(path.resolve(testTaskDir, 'task1.json'), JSON.stringify(task));

      scanner.configure({ minFrequency: 1, minConfidence: 0.7 });
      const patterns = await scanner.scan();

      await database.storePatterns(patterns);

      const stored = await database.getPatterns();
      expect(stored.length).toBeGreaterThan(0);
    });

    it('should handle empty scan gracefully', async () => {
      scanner.configure({ minFrequency: 100 }); // Very high threshold

      const patterns = await scanner.scan();

      expect(patterns).toBeInstanceOf(Array);
      expect(patterns.length).toBe(0);
    });
  });

  describe('configuration', () => {
    it('should allow updating minFrequency', () => {
      scanner.configure({ minFrequency: 10 });
      expect(true).toBe(true); // No error
    });

    it('should allow updating minConfidence', () => {
      scanner.configure({ minConfidence: 0.9 });
      expect(true).toBe(true); // No error
    });

    it('should allow updating maxAgeDays', () => {
      scanner.configure({ maxAgeDays: 60 });
      expect(true).toBe(true); // No error
    });

    it('should allow updating directories', () => {
      scanner.configure({
        taskHistoryDir: '/custom/tasks',
        correctionLogsDir: '/custom/corrections',
      });
      expect(true).toBe(true); // No error
    });

    it('should allow partial config updates', () => {
      scanner.configure({ minFrequency: 7 });
      scanner.configure({ minConfidence: 0.75 });
      expect(true).toBe(true); // No error
    });
  });
});
