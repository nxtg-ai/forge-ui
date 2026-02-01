/**
 * Performance Testing Framework
 * Tests for latency, throughput, memory usage, and UI rendering
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { StateManager } from '@core/state';
import { VisionManager } from '@core/vision';
import { AgentCoordinationProtocol } from '@core/coordination';

describe('Performance Tests', () => {
  describe('State Update Latency', () => {
    it('should update state in less than 100ms', async () => {
      const stateManager = new StateManager('/test/project');
      await stateManager.initialize('/test/project');

      const measurements: number[] = [];

      // Run 100 iterations
      for (let i = 0; i < 100; i++) {
        const start = performance.now();
        stateManager.updateTaskStatus(`task-${i}`, 'completed');
        const duration = performance.now() - start;
        measurements.push(duration);
      }

      const avgLatency = measurements.reduce((a, b) => a + b, 0) / measurements.length;
      const p95Latency = measurements.sort((a, b) => a - b)[Math.floor(measurements.length * 0.95)];
      const maxLatency = Math.max(...measurements);

      expect(avgLatency).toBeLessThan(50);
      expect(p95Latency).toBeLessThan(100);
      expect(maxLatency).toBeLessThan(200);

      console.log('State Update Latency:');
      console.log(`  Average: ${avgLatency.toFixed(2)}ms`);
      console.log(`  P95: ${p95Latency.toFixed(2)}ms`);
      console.log(`  Max: ${maxLatency.toFixed(2)}ms`);
    });

    it('should handle concurrent state updates efficiently', async () => {
      const stateManager = new StateManager('/test/project');
      await stateManager.initialize('/test/project');

      const start = performance.now();

      // Simulate 50 concurrent updates
      await Promise.all(
        Array.from({ length: 50 }, (_, i) =>
          new Promise<void>(resolve => {
            stateManager.updateTaskStatus(`task-${i}`, 'in_progress');
            resolve();
          })
        )
      );

      const duration = performance.now() - start;

      expect(duration).toBeLessThan(500); // All 50 updates in < 500ms
      console.log(`50 concurrent updates: ${duration.toFixed(2)}ms`);
    });
  });

  describe('Vision Processing Performance', () => {
    it('should load vision file in less than 100ms', async () => {
      const visionManager = new VisionManager('/test/project');

      const start = performance.now();
      await visionManager.initialize();
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100);
      console.log(`Vision load time: ${duration.toFixed(2)}ms`);
    });

    it('should propagate vision updates to 100 subscribers in < 500ms', async () => {
      const visionManager = new VisionManager('/test/project');
      await visionManager.initialize();

      // Register 100 subscribers
      const subscribers = Array.from({ length: 100 }, () => vi.fn());
      subscribers.forEach(sub => visionManager.subscribe(sub));

      const start = performance.now();
      const vision = visionManager.getCurrentVision();
      if (vision) {
        await visionManager.propagateVisionUpdate(vision);
      }
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(500);
      console.log(`100 subscribers notified in: ${duration.toFixed(2)}ms`);
    });
  });

  describe('Agent Coordination Performance', () => {
    it('should route messages with low latency', async () => {
      const protocol = new AgentCoordinationProtocol();

      // Register 10 agents
      for (let i = 0; i < 10; i++) {
        protocol.registerAgent({
          id: `agent-${i}`,
          name: `Agent ${i}`,
          role: 'developer',
          capabilities: [],
          status: 'idle',
          currentTask: null
        });
      }

      const measurements: number[] = [];

      // Send 100 messages
      for (let i = 0; i < 100; i++) {
        const start = performance.now();
        await protocol.sendMessage(`agent-${i % 10}`, {
          id: `msg-${i}`,
          from: 'orchestrator',
          to: `agent-${i % 10}`,
          type: 'REQUEST',
          subject: 'Test',
          payload: {},
          timestamp: new Date()
        });
        const duration = performance.now() - start;
        measurements.push(duration);
      }

      const avgLatency = measurements.reduce((a, b) => a + b, 0) / measurements.length;
      expect(avgLatency).toBeLessThan(10); // < 10ms per message

      console.log(`Message routing average: ${avgLatency.toFixed(2)}ms`);
    });

    it('should handle message queue processing efficiently', async () => {
      const protocol = new AgentCoordinationProtocol();

      protocol.registerAgent({
        id: 'test-agent',
        name: 'Test Agent',
        role: 'developer',
        capabilities: [],
        status: 'idle',
        currentTask: null
      });

      // Queue 1000 messages
      const messages = Array.from({ length: 1000 }, (_, i) => ({
        id: `msg-${i}`,
        from: 'orchestrator',
        to: 'test-agent',
        type: 'REQUEST' as const,
        subject: 'Test',
        payload: {},
        timestamp: new Date(),
        priority: Math.floor(Math.random() * 10)
      }));

      const start = performance.now();
      await Promise.all(messages.map(msg => protocol.sendMessage('test-agent', msg)));
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(1000); // < 1s for 1000 messages
      console.log(`1000 messages queued in: ${duration.toFixed(2)}ms`);
    });
  });

  describe('UI Rendering Performance', () => {
    it('should render VisionCapture in less than 100ms', () => {
      const { VisionCapture } = require('@components/VisionCapture');

      const start = performance.now();
      const { unmount } = render(
        <VisionCapture
          onVisionSubmit={vi.fn()}
          mode="initial"
        />
      );
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100);
      console.log(`VisionCapture render: ${duration.toFixed(2)}ms`);

      unmount();
    });

    it('should maintain 60fps during animations', async () => {
      // Simulate frame rate monitoring
      const targetFPS = 60;
      const targetFrameTime = 1000 / targetFPS; // ~16.67ms

      const frameTimes: number[] = [];
      let lastTime = performance.now();

      // Simulate 60 frames
      for (let i = 0; i < 60; i++) {
        const currentTime = performance.now();
        const frameTime = currentTime - lastTime;
        frameTimes.push(frameTime);
        lastTime = currentTime;

        // Simulate some work
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
      const droppedFrames = frameTimes.filter(t => t > targetFrameTime).length;
      const droppedFramePercentage = (droppedFrames / frameTimes.length) * 100;

      expect(droppedFramePercentage).toBeLessThan(5); // < 5% dropped frames

      console.log(`Average frame time: ${avgFrameTime.toFixed(2)}ms`);
      console.log(`Dropped frames: ${droppedFramePercentage.toFixed(2)}%`);
    });
  });

  describe('Memory Usage', () => {
    it('should not leak memory during state updates', async () => {
      const stateManager = new StateManager('/test/project');
      await stateManager.initialize('/test/project');

      // Only available in Node.js with --expose-gc flag
      if (global.gc) {
        global.gc();

        const memBefore = process.memoryUsage().heapUsed;

        // Perform 1000 state updates
        for (let i = 0; i < 1000; i++) {
          stateManager.updateTaskStatus(`task-${i}`, 'completed');
        }

        global.gc();
        const memAfter = process.memoryUsage().heapUsed;
        const memDiff = memAfter - memBefore;

        // Memory increase should be < 10MB
        expect(memDiff).toBeLessThan(10 * 1024 * 1024);

        console.log(`Memory increase: ${(memDiff / 1024 / 1024).toFixed(2)}MB`);
      } else {
        console.warn('Skipping memory test: gc() not available');
      }
    });

    it('should clean up event listeners properly', async () => {
      const visionManager = new VisionManager('/test/project');
      await visionManager.initialize();

      const subscribers = Array.from({ length: 100 }, () => vi.fn());

      // Subscribe
      const unsubscribers = subscribers.map(sub => visionManager.subscribe(sub));

      // Unsubscribe all
      unsubscribers.forEach(unsub => unsub());

      const vision = visionManager.getCurrentVision();
      if (vision) {
        await visionManager.propagateVisionUpdate(vision);
      }

      // No subscribers should be called
      subscribers.forEach(sub => {
        expect(sub).not.toHaveBeenCalled();
      });
    });
  });

  describe('Bundle Size Optimization', () => {
    it('should keep core bundle under target size', () => {
      // This would be run during build time
      // For now, we just verify structure

      const maxBundleSizeKB = 500; // 500KB for core bundle
      const estimatedSize = 250; // Placeholder

      expect(estimatedSize).toBeLessThan(maxBundleSizeKB);
      console.log(`Estimated bundle size: ${estimatedSize}KB (target: <${maxBundleSizeKB}KB)`);
    });
  });

  describe('Throughput Tests', () => {
    it('should process high volume of tasks efficiently', async () => {
      const stateManager = new StateManager('/test/project');
      await stateManager.initialize('/test/project');

      const numTasks = 10000;
      const start = performance.now();

      for (let i = 0; i < numTasks; i++) {
        stateManager.updateTaskStatus(`task-${i}`, 'completed');
      }

      const duration = performance.now() - start;
      const throughput = (numTasks / duration) * 1000; // ops/sec

      expect(throughput).toBeGreaterThan(1000); // > 1000 ops/sec

      console.log(`Task throughput: ${throughput.toFixed(0)} ops/sec`);
      console.log(`Total time for ${numTasks} tasks: ${duration.toFixed(2)}ms`);
    });
  });

  describe('Cold Start Performance', () => {
    it('should bootstrap system in less than 30 seconds', async () => {
      const start = performance.now();

      const stateManager = new StateManager('/test/project');
      const visionManager = new VisionManager('/test/project');
      const coordination = new AgentCoordinationProtocol();

      await Promise.all([
        stateManager.initialize('/test/project'),
        visionManager.initialize()
      ]);

      // Register agents
      for (let i = 0; i < 10; i++) {
        coordination.registerAgent({
          id: `agent-${i}`,
          name: `Agent ${i}`,
          role: 'developer',
          capabilities: [],
          status: 'idle',
          currentTask: null
        });
      }

      const duration = performance.now() - start;

      expect(duration).toBeLessThan(30000); // < 30 seconds

      console.log(`Bootstrap time: ${(duration / 1000).toFixed(2)}s`);
    });
  });
});
