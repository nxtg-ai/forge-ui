/**
 * Health Monitoring System Tests
 * Integration tests for health checks and monitoring
 */

import { HealthMonitor, HealthStatus, HealthCheckType } from '../health';
import * as fs from 'fs';
import * as path from 'path';

describe('HealthMonitor', () => {
  let healthMonitor: HealthMonitor;
  const testProjectPath = path.join(__dirname, 'test-project');

  beforeEach(() => {
    // Create test project structure
    fs.mkdirSync(testProjectPath, { recursive: true });
    fs.mkdirSync(path.join(testProjectPath, '.claude', 'state'), { recursive: true });
    fs.mkdirSync(path.join(testProjectPath, '.claude', 'agents'), { recursive: true });
    fs.mkdirSync(path.join(testProjectPath, '.claude', 'commands'), { recursive: true });
    fs.mkdirSync(path.join(testProjectPath, 'src', 'components'), { recursive: true });
    fs.mkdirSync(path.join(testProjectPath, 'src', 'core'), { recursive: true });

    // Create test files
    fs.writeFileSync(
      path.join(testProjectPath, '.claude', 'state', 'current.json'),
      JSON.stringify({ version: '1.0.0', projectName: 'test' })
    );

    fs.writeFileSync(
      path.join(testProjectPath, '.claude', 'agents', 'orchestrator.md'),
      '# Test Agent'
    );

    fs.writeFileSync(
      path.join(testProjectPath, '.claude', 'commands', 'test.md'),
      '# Test Command'
    );

    healthMonitor = new HealthMonitor(testProjectPath);
  });

  afterEach(() => {
    healthMonitor.stop();
    // Clean up test directory
    fs.rmSync(testProjectPath, { recursive: true, force: true });
  });

  describe('performHealthCheck', () => {
    it('should perform comprehensive health check', async () => {
      const health = await healthMonitor.performHealthCheck();

      expect(health).toBeDefined();
      expect(health.overallScore).toBeGreaterThanOrEqual(0);
      expect(health.overallScore).toBeLessThanOrEqual(100);
      expect(health.status).toBeDefined();
      expect(health.checks).toBeInstanceOf(Array);
      expect(health.checks.length).toBeGreaterThan(0);
      expect(health.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should check all health check types', async () => {
      const health = await healthMonitor.performHealthCheck();
      const checkTypes = health.checks.map(c => c.type);

      expect(checkTypes).toContain(HealthCheckType.UI_RESPONSIVENESS);
      expect(checkTypes).toContain(HealthCheckType.BACKEND_AVAILABILITY);
      expect(checkTypes).toContain(HealthCheckType.STATE_SYNC);
      expect(checkTypes).toContain(HealthCheckType.AGENT_EXECUTION);
      expect(checkTypes).toContain(HealthCheckType.FILE_SYSTEM);
      expect(checkTypes).toContain(HealthCheckType.MEMORY_USAGE);
      expect(checkTypes).toContain(HealthCheckType.COMMAND_PROCESSING);
      expect(checkTypes).toContain(HealthCheckType.AUTOMATION_SYSTEM);
    });

    it('should calculate correct overall score', async () => {
      const health = await healthMonitor.performHealthCheck();

      // Verify weighted calculation
      let weightedSum = 0;
      let totalWeight = 0;
      const weights = {
        [HealthCheckType.UI_RESPONSIVENESS]: 0.15,
        [HealthCheckType.BACKEND_AVAILABILITY]: 0.20,
        [HealthCheckType.STATE_SYNC]: 0.15,
        [HealthCheckType.AGENT_EXECUTION]: 0.15,
        [HealthCheckType.FILE_SYSTEM]: 0.10,
        [HealthCheckType.MEMORY_USAGE]: 0.10,
        [HealthCheckType.COMMAND_PROCESSING]: 0.10,
        [HealthCheckType.AUTOMATION_SYSTEM]: 0.05
      };

      for (const check of health.checks) {
        const weight = weights[check.type] || 0;
        weightedSum += check.score * weight;
        totalWeight += weight;
      }

      const expectedScore = Math.round(weightedSum / totalWeight);
      expect(health.overallScore).toBe(expectedScore);
    });

    it('should determine correct health status', async () => {
      const health = await healthMonitor.performHealthCheck();

      if (health.overallScore >= 85) {
        expect(health.status).toBe(HealthStatus.HEALTHY);
      } else if (health.overallScore >= 70) {
        expect(health.status).toBe(HealthStatus.DEGRADED);
      } else if (health.overallScore >= 50) {
        expect(health.status).toBe(HealthStatus.CRITICAL);
      } else {
        expect(health.status).toBe(HealthStatus.FAILED);
      }
    });

    it('should generate recommendations for issues', async () => {
      // Remove some files to trigger issues
      fs.unlinkSync(path.join(testProjectPath, '.claude', 'state', 'current.json'));

      const health = await healthMonitor.performHealthCheck();

      expect(health.recommendations).toBeDefined();
      expect(health.recommendations).toBeInstanceOf(Array);
      expect(health.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('start/stop', () => {
    it('should start and stop monitoring', async () => {
      await healthMonitor.start(100); // 100ms interval for testing

      // Wait for at least one check
      await new Promise(resolve => setTimeout(resolve, 150));

      const health = healthMonitor.getCurrentHealth();
      expect(health).toBeDefined();

      healthMonitor.stop();
    });

    it('should emit healthUpdate events', async () => {
      const updates: any[] = [];

      healthMonitor.on('healthUpdate', (health) => {
        updates.push(health);
      });

      await healthMonitor.start(100);
      await new Promise(resolve => setTimeout(resolve, 250));

      healthMonitor.stop();

      expect(updates.length).toBeGreaterThan(0);
      expect(updates[0].overallScore).toBeDefined();
    });

    it('should emit statusChange events on status change', async () => {
      const changes: any[] = [];

      healthMonitor.on('statusChange', (change) => {
        changes.push(change);
      });

      await healthMonitor.start(100);
      await new Promise(resolve => setTimeout(resolve, 250));

      healthMonitor.stop();

      // Changes array may be empty if status doesn't change
      if (changes.length > 0) {
        expect(changes[0].previous).toBeDefined();
        expect(changes[0].current).toBeDefined();
        expect(changes[0].score).toBeDefined();
      }
    });
  });

  describe('getHealthHistory', () => {
    it('should maintain health history', async () => {
      await healthMonitor.start(50);
      await new Promise(resolve => setTimeout(resolve, 200));

      const history = healthMonitor.getHealthHistory();

      expect(history).toBeInstanceOf(Array);
      expect(history.length).toBeGreaterThan(0);
      expect(history.length).toBeLessThanOrEqual(100); // Max history size

      healthMonitor.stop();
    });
  });

  describe('getHealthTrends', () => {
    it('should calculate health trends', async () => {
      // Perform multiple checks
      for (let i = 0; i < 5; i++) {
        await healthMonitor.performHealthCheck();
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const trends = healthMonitor.getHealthTrends();

      expect(trends.averageScore).toBeGreaterThanOrEqual(0);
      expect(trends.averageScore).toBeLessThanOrEqual(100);
      expect(['improving', 'stable', 'degrading']).toContain(trends.trend);
      expect(trends.criticalCount).toBeGreaterThanOrEqual(0);
    });

    it('should return stable trend with insufficient data', () => {
      const trends = healthMonitor.getHealthTrends();

      expect(trends.trend).toBe('stable');
      expect(trends.criticalCount).toBe(0);
    });
  });

  describe('individual health checks', () => {
    it('should check UI responsiveness', async () => {
      const health = await healthMonitor.performHealthCheck();
      const uiCheck = health.checks.find(c => c.type === HealthCheckType.UI_RESPONSIVENESS);

      expect(uiCheck).toBeDefined();
      expect(uiCheck!.score).toBeGreaterThanOrEqual(0);
      expect(uiCheck!.latency).toBeGreaterThan(0);
      expect(uiCheck!.message).toBeDefined();
    });

    it('should check backend availability', async () => {
      // Create backend files
      const corePath = path.join(testProjectPath, 'src', 'core');
      fs.writeFileSync(path.join(corePath, 'orchestrator.ts'), '');
      fs.writeFileSync(path.join(corePath, 'state.ts'), '');
      fs.writeFileSync(path.join(corePath, 'coordination.ts'), '');
      fs.writeFileSync(path.join(corePath, 'vision.ts'), '');

      const health = await healthMonitor.performHealthCheck();
      const backendCheck = health.checks.find(c => c.type === HealthCheckType.BACKEND_AVAILABILITY);

      expect(backendCheck).toBeDefined();
      expect(backendCheck!.score).toBe(100);
      expect(backendCheck!.status).toBe(HealthStatus.HEALTHY);
    });

    it('should check state sync freshness', async () => {
      const health = await healthMonitor.performHealthCheck();
      const stateCheck = health.checks.find(c => c.type === HealthCheckType.STATE_SYNC);

      expect(stateCheck).toBeDefined();
      expect(stateCheck!.details?.ageMinutes).toBeDefined();
      expect(stateCheck!.details?.lastModified).toBeDefined();
    });

    it('should check memory usage', async () => {
      const health = await healthMonitor.performHealthCheck();
      const memCheck = health.checks.find(c => c.type === HealthCheckType.MEMORY_USAGE);

      expect(memCheck).toBeDefined();
      expect(memCheck!.details?.heapUsedMB).toBeGreaterThan(0);
      expect(memCheck!.details?.heapTotalMB).toBeGreaterThan(0);
      expect(memCheck!.details?.heapPercentage).toBeGreaterThan(0);
    });

    it('should check file system access', async () => {
      const health = await healthMonitor.performHealthCheck();
      const fsCheck = health.checks.find(c => c.type === HealthCheckType.FILE_SYSTEM);

      expect(fsCheck).toBeDefined();
      expect(fsCheck!.status).toBe(HealthStatus.HEALTHY);
      expect(fsCheck!.score).toBe(100);
    });
  });
});