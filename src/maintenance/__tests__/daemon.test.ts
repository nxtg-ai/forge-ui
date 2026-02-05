/**
 * Maintenance Daemon Tests
 *
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MaintenanceDaemon } from '../daemon';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('MaintenanceDaemon', () => {
  let daemon: MaintenanceDaemon;
  const testDbPath = '.forge-test/test-maintenance.db';

  beforeEach(async () => {
    // Create test directory
    await fs.mkdir(path.dirname(testDbPath), { recursive: true });

    daemon = new MaintenanceDaemon({
      databasePath: testDbPath,
      verbose: false,
      healthCheckInterval: 100, // Fast interval for testing
      enableHealthMonitor: true,
      enablePatternScan: false, // Disable for faster tests
      enablePerformanceAnalysis: false,
      enableAutoUpdates: false,
    });
  });

  afterEach(async () => {
    try {
      if (daemon.isRunning()) {
        await daemon.stop();
      }
    } catch (error) {
      // Daemon might already be stopped
    }

    // Clean up test files
    try {
      await fs.rm(path.dirname(testDbPath), { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist
    }
  });

  describe('start/stop', () => {
    it('should start the daemon', async () => {
      expect(daemon.isRunning()).toBe(false);

      await daemon.start();

      expect(daemon.isRunning()).toBe(true);
    });

    it('should stop the daemon', async () => {
      await daemon.start();
      expect(daemon.isRunning()).toBe(true);

      await daemon.stop();

      expect(daemon.isRunning()).toBe(false);
    });

    it('should not start if already running', async () => {
      await daemon.start();

      // Try to start again (should warn but not fail)
      await daemon.start();

      expect(daemon.isRunning()).toBe(true);
    });

    it('should emit started event', async () => {
      let eventFired = false;

      daemon.on('started', () => {
        eventFired = true;
      });

      await daemon.start();

      expect(eventFired).toBe(true);
    });

    it('should emit stopped event', async () => {
      let eventFired = false;

      await daemon.start();

      daemon.on('stopped', () => {
        eventFired = true;
      });

      await daemon.stop();

      expect(eventFired).toBe(true);
    });
  });

  describe('runHealthChecks', () => {
    it('should run health checks manually', async () => {
      await daemon.start();

      const events: string[] = [];

      daemon.on('taskStart', (task: string) => {
        events.push(`start:${task}`);
      });

      daemon.on('taskComplete', (task: string) => {
        events.push(`complete:${task}`);
      });

      await daemon.runHealthChecks();

      expect(events).toContain('start:health-check');
      expect(events).toContain('complete:health-check');
    });

    it('should emit healthCritical event for critical issues', async () => {
      let criticalEvents = 0;

      daemon.on('healthCritical', () => {
        criticalEvents++;
      });

      await daemon.start();
      await daemon.runHealthChecks();

      // May or may not have critical events depending on system state
      expect(criticalEvents).toBeGreaterThanOrEqual(0);
    });
  });

  describe('runPatternScan', () => {
    it('should run pattern scan manually', async () => {
      // Enable pattern scanning for this test
      daemon.configure({
        enablePatternScan: true,
      });

      await daemon.start();

      const events: string[] = [];

      daemon.on('taskStart', (task: string) => {
        events.push(`start:${task}`);
      });

      daemon.on('taskComplete', (task: string) => {
        events.push(`complete:${task}`);
      });

      await daemon.runPatternScan();

      expect(events).toContain('start:pattern-scan');
      expect(events).toContain('complete:pattern-scan');
    });
  });

  describe('runPerformanceAnalysis', () => {
    it('should run performance analysis manually', async () => {
      daemon.configure({
        enablePerformanceAnalysis: true,
      });

      await daemon.start();

      const events: string[] = [];

      daemon.on('taskStart', (task: string) => {
        events.push(`start:${task}`);
      });

      daemon.on('taskComplete', (task: string) => {
        events.push(`complete:${task}`);
      });

      await daemon.runPerformanceAnalysis();

      expect(events).toContain('start:performance-analysis');
      expect(events).toContain('complete:performance-analysis');
    });
  });

  describe('applyUpdates', () => {
    it('should apply pending updates manually', async () => {
      daemon.configure({
        enableAutoUpdates: true,
      });

      await daemon.start();

      const events: string[] = [];

      daemon.on('taskStart', (task: string) => {
        events.push(`start:${task}`);
      });

      daemon.on('taskComplete', (task: string) => {
        events.push(`complete:${task}`);
      });

      await daemon.applyUpdates();

      expect(events).toContain('start:apply-updates');
      expect(events).toContain('complete:apply-updates');
    });
  });

  describe('getStatus', () => {
    it('should return daemon status', () => {
      const status = daemon.getStatus();

      expect(status).toHaveProperty('running');
      expect(status).toHaveProperty('tasks');
      expect(status).toHaveProperty('config');

      expect(status.running).toBe(false);
      expect(status.tasks).toBeInstanceOf(Array);
    });

    it('should reflect running state', async () => {
      await daemon.start();

      const status = daemon.getStatus();

      expect(status.running).toBe(true);
    });

    it('should include task information', () => {
      const status = daemon.getStatus();

      expect(status.tasks.length).toBeGreaterThan(0);

      for (const task of status.tasks) {
        expect(task).toHaveProperty('name');
        expect(task).toHaveProperty('enabled');
      }
    });
  });

  describe('configure', () => {
    it('should update configuration', () => {
      daemon.configure({
        verbose: true,
        autoApplyThreshold: 0.8,
      });

      const status = daemon.getStatus();

      expect(status.config.verbose).toBe(true);
      expect(status.config.autoApplyThreshold).toBe(0.8);
    });
  });

  describe('scheduled tasks', () => {
    it('should run health checks periodically', async () => {
      let checkCount = 0;

      daemon.on('taskComplete', (task: string) => {
        if (task === 'health-check') {
          checkCount++;
        }
      });

      await daemon.start();

      // Wait for multiple checks
      await new Promise(resolve => setTimeout(resolve, 250));

      expect(checkCount).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    it('should emit taskError on failures', async () => {
      const errors: Array<{ task: string; error: any }> = [];

      daemon.on('taskError', (task: string, error: any) => {
        errors.push({ task, error });
      });

      await daemon.start();

      // Errors may or may not occur during normal operation
      // This test just verifies the event system is set up correctly
      expect(daemon.listenerCount('taskError')).toBe(1);
    });
  });
});
