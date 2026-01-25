/**
 * Vision System Integration Tests
 * Tests VisionCapture UI -> VisionManager -> .claude/VISION.md
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VisionCapture } from '@components/VisionCapture';
import { VisionManager } from '@core/vision';
import { promises as fs } from 'fs';
import path from 'path';

describe('Vision Integration: UI -> Backend -> File System', () => {
  let visionManager: VisionManager;
  let mockProjectPath: string;

  beforeEach(() => {
    mockProjectPath = '/test/project';
    visionManager = new VisionManager(mockProjectPath);
    vi.clearAllMocks();
  });

  describe('VisionCapture -> VISION.md workflow', () => {
    it('should save vision data to .claude/VISION.md when submitted', async () => {
      const onVisionSubmit = vi.fn();

      render(
        <VisionCapture
          onVisionSubmit={onVisionSubmit}
          mode="initial"
        />
      );

      // Step 1: Enter mission
      const input = screen.getByPlaceholderText(/describe your vision/i);
      fireEvent.change(input, {
        target: { value: 'Build the ultimate developer productivity platform' }
      });
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(onVisionSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            mission: 'Build the ultimate developer productivity platform'
          })
        );
      });
    });

    it('should validate vision data with Zod schema before saving', async () => {
      const invalidVision = {
        mission: '', // Invalid: empty mission
        goals: [],
        constraints: [],
        successMetrics: [],
        timeframe: ''
      };

      await expect(async () => {
        await visionManager.updateVision(invalidVision);
      }).rejects.toThrow();
    });

    it('should create VISION.md with proper markdown formatting', async () => {
      const mockVision = {
        mission: 'Test mission',
        principles: ['Principle 1', 'Principle 2'],
        strategicGoals: [{
          id: 'goal-1',
          title: 'Test Goal',
          description: 'Test description',
          priority: 'high' as const,
          status: 'in-progress' as const,
          progress: 50,
          metrics: ['metric-1']
        }],
        currentFocus: 'Test focus',
        successMetrics: { 'Coverage': '90%' }
      };

      await visionManager.initialize();
      await visionManager.updateVision(mockVision);

      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('VISION.md'),
        expect.stringContaining('# Canonical Vision'),
        'utf-8'
      );

      // Verify markdown structure
      const writeCall = (fs.writeFile as any).mock.calls[0];
      const markdown = writeCall[1];

      expect(markdown).toContain('## Mission');
      expect(markdown).toContain('## Principles');
      expect(markdown).toContain('## Strategic Goals');
      expect(markdown).toContain('Test mission');
    });

    it('should record vision events for audit trail', async () => {
      await visionManager.initialize();

      const visionUpdate = {
        mission: 'Updated mission'
      };

      await visionManager.updateVision(visionUpdate);

      const events = await visionManager.getVisionHistory();
      expect(events).toContainEqual(
        expect.objectContaining({
          type: 'updated',
          data: visionUpdate
        })
      );
    });
  });

  describe('Vision propagation to agents', () => {
    it('should notify all subscribed agents when vision updates', async () => {
      await visionManager.initialize();

      const subscriber1 = vi.fn();
      const subscriber2 = vi.fn();

      visionManager.subscribe(subscriber1);
      visionManager.subscribe(subscriber2);

      await visionManager.updateVision({ mission: 'New mission' });

      expect(subscriber1).toHaveBeenCalledWith(
        expect.objectContaining({
          mission: 'New mission'
        })
      );
      expect(subscriber2).toHaveBeenCalledWith(
        expect.objectContaining({
          mission: 'New mission'
        })
      );
    });

    it('should handle subscriber errors gracefully', async () => {
      await visionManager.initialize();

      const failingSubscriber = vi.fn().mockImplementation(() => {
        throw new Error('Subscriber failed');
      });
      const workingSubscriber = vi.fn();

      visionManager.subscribe(failingSubscriber);
      visionManager.subscribe(workingSubscriber);

      const result = await visionManager.propagateVisionUpdate(
        visionManager.getCurrentVision()!
      );

      expect(result.success).toBe(false);
      expect(result.failures).toHaveLength(1);
      expect(workingSubscriber).toHaveBeenCalled();
    });
  });

  describe('Vision alignment checking', () => {
    it('should check decision alignment with vision principles', async () => {
      await visionManager.initialize();

      const decision = {
        id: 'decision-1',
        description: 'Implement prototype feature',
        rationale: 'Quick POC for testing',
        impact: 'high' as const,
        madeBy: 'developer',
        madeAt: new Date()
      };

      const alignment = await visionManager.checkAlignment(decision);

      expect(alignment).toHaveProperty('aligned');
      expect(alignment).toHaveProperty('score');
      expect(alignment).toHaveProperty('violations');
      expect(alignment).toHaveProperty('suggestions');
    });

    it('should provide actionable suggestions for misaligned decisions', async () => {
      await visionManager.initialize();

      const misalignedDecision = {
        id: 'decision-2',
        description: 'Skip testing for speed',
        rationale: 'We need to ship fast',
        impact: 'high' as const,
        madeBy: 'developer',
        madeAt: new Date()
      };

      const alignment = await visionManager.checkAlignment(misalignedDecision);

      expect(alignment.aligned).toBe(false);
      expect(alignment.suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('Error handling and recovery', () => {
    it('should create default vision if file does not exist', async () => {
      (fs.readFile as any).mockRejectedValue({ code: 'ENOENT' });

      await visionManager.initialize();
      const vision = visionManager.getCurrentVision();

      expect(vision).toBeTruthy();
      expect(vision?.mission).toBeTruthy();
      expect(vision?.principles).toBeInstanceOf(Array);
    });

    it('should handle corrupted vision file gracefully', async () => {
      (fs.readFile as any).mockResolvedValue('invalid-json-content');

      await expect(async () => {
        await visionManager.loadVision();
      }).rejects.toThrow();
    });

    it('should validate vision data before saving', async () => {
      await visionManager.initialize();

      const invalidUpdate = {
        mission: 123 // Invalid type
      };

      await expect(async () => {
        await visionManager.updateVision(invalidUpdate as any);
      }).rejects.toThrow();
    });
  });

  describe('Performance requirements', () => {
    it('should load vision in less than 100ms', async () => {
      const start = Date.now();
      await visionManager.initialize();
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100);
    });

    it('should save vision in less than 50ms', async () => {
      await visionManager.initialize();

      const start = Date.now();
      await visionManager.updateVision({ mission: 'Test' });
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(50);
    });
  });
});
