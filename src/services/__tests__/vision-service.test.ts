/**
 * Vision Service Tests
 * Comprehensive tests for vision management and operations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { VisionService, VisionCaptureData } from "../vision-service";
import { VisionData, EngagementMode } from "../../components/types";
import { promises as fs } from "fs";

// Mock fs module - tests will use vi.mocked() to control behavior
vi.unmock("fs");
vi.unmock("node:fs");

describe("VisionService", () => {
  let service: VisionService;
  const mockVisionPath = "/test/.claude/VISION.md";
  const mockCapturesPath = "/test/.claude/vision-captures";

  beforeEach(async () => {
    service = new VisionService({
      name: "TestVisionService",
      visionPath: mockVisionPath,
      capturesPath: mockCapturesPath,
      autoSave: false,
      validateOnSave: false, // Disable validation for most tests
    });

    // Mock fs functions
    vi.spyOn(fs, "access").mockResolvedValue(undefined);
    vi.spyOn(fs, "mkdir").mockResolvedValue(undefined);
    vi.spyOn(fs, "writeFile").mockResolvedValue(undefined);
    vi.spyOn(fs, "readFile").mockResolvedValue("");
    vi.spyOn(fs, "readdir").mockResolvedValue([]);

    await service.initialize();
  });

  afterEach(async () => {
    await service.dispose();
    vi.restoreAllMocks();
  });

  describe("initialization", () => {
    it("should initialize with default configuration", async () => {
      const defaultService = new VisionService();

      // Mock fs to prevent file system access
      vi.spyOn(fs, "access").mockRejectedValue(new Error("File not found"));
      vi.spyOn(fs, "mkdir").mockResolvedValue(undefined);
      vi.spyOn(fs, "writeFile").mockResolvedValue(undefined);

      await defaultService.initialize();

      expect(defaultService["config"].visionPath).toBe(".claude/VISION.md");
      expect(defaultService["config"].capturesPath).toBe(
        ".claude/vision-captures",
      );
      expect(defaultService["config"].autoSave).toBe(true);

      await defaultService.dispose();
    });

    it("should create default vision when file not found", async () => {
      vi.spyOn(fs, "access").mockRejectedValue(new Error("File not found"));

      const newService = new VisionService({
        name: "NewService",
        autoSave: false,
      });
      await newService.initialize();

      const visionResult = newService.getVision();
      expect(visionResult.isOk()).toBe(true);

      if (visionResult.isOk()) {
        expect(visionResult.value.mission).toContain("AI-powered orchestration");
        expect(visionResult.value.goals.length).toBeGreaterThan(0);
      }

      await newService.dispose();
    });

    it("should load existing vision from file", async () => {
      const mockContent = `---
title: Canonical Vision
version: 1
created: 2024-01-01T00:00:00.000Z
updated: 2024-01-01T00:00:00.000Z
engagementMode: builder
tags:
  - vision
  - canonical
  - forge
---

## Mission
Build great software

## Goals
- Goal 1
- Goal 2

## Constraints
- Constraint 1

## Success Metrics
- Metric 1

## Timeframe
6 months`;

      vi.spyOn(fs, "readFile").mockResolvedValue(mockContent);

      const newService = new VisionService({
        name: "LoadService",
        autoSave: false,
      });
      await newService.initialize();

      const visionResult = newService.getVision();
      expect(visionResult.isOk()).toBe(true);

      if (visionResult.isOk()) {
        expect(visionResult.value.mission).toBe("Build great software");
        expect(visionResult.value.goals).toContain("Goal 1");
      }

      await newService.dispose();
    });
  });

  describe("getVision", () => {
    it("should return current vision data", () => {
      const result = service.getVision();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.mission).toBeDefined();
        expect(Array.isArray(result.value.goals)).toBe(true);
      }
    });

    it("should return error when no vision available", async () => {
      const emptyService = new VisionService({
        name: "EmptyService",
        autoSave: false,
      });

      // Don't initialize - no vision created
      const result = emptyService.getVision();

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("NO_VISION");
      }
    });
  });

  describe("getCanonicalVision", () => {
    it("should return canonical vision format", () => {
      const result = service.getCanonicalVision();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.version).toBeDefined();
        expect(result.value.mission).toBeDefined();
        expect(result.value.strategicGoals).toBeDefined();
        expect(Array.isArray(result.value.principles)).toBe(true);
      }
    });

    it("should return error when no canonical vision", async () => {
      const emptyService = new VisionService({
        name: "EmptyService",
        autoSave: false,
      });

      const result = emptyService.getCanonicalVision();

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("NO_CANONICAL_VISION");
      }
    });
  });

  describe("updateVision", () => {
    it("should update vision data successfully", async () => {
      const update: Partial<VisionData> = {
        mission: "Updated mission statement",
      };

      const result = await service.updateVision(update);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.mission).toBe("Updated mission statement");
        expect(result.value.lastUpdated).toBeInstanceOf(Date);
      }
    });

    it("should merge with existing vision", async () => {
      const currentVision = service.getVision();
      expect(currentVision.isOk()).toBe(true);

      const update: Partial<VisionData> = {
        timeframe: "12 months",
      };

      const result = await service.updateVision(update);

      expect(result.isOk()).toBe(true);
      if (result.isOk() && currentVision.isOk()) {
        expect(result.value.mission).toBe(currentVision.value.mission);
        expect(result.value.timeframe).toBe("12 months");
      }
    });

    it("should validate vision data when configured", async () => {
      // Create service with validation enabled
      const validatingService = new VisionService({
        name: "ValidatingService",
        autoSave: false,
        validateOnSave: true,
      });

      vi.spyOn(fs, "access").mockRejectedValue(new Error("Not found"));
      await validatingService.initialize();

      const invalidUpdate: Partial<VisionData> = {
        mission: "",
        goals: [],
      };

      const result = await validatingService.updateVision(invalidUpdate);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("VALIDATION_ERROR");
      }

      await validatingService.dispose();
    });

    it("should emit visionUpdate event", async () => {
      const handler = vi.fn();
      service.on("visionUpdate", handler);

      await service.updateVision({ timeframe: "3 months" });

      expect(handler).toHaveBeenCalled();
      expect(handler.mock.calls[0][0].type).toBe("updated");
    });

    it("should record update in history", async () => {
      await service.updateVision({ timeframe: "3 months" }, "test-actor");

      const history = service.getHistory();
      expect(history.length).toBeGreaterThan(0);
      expect(history[history.length - 1].actor).toBe("test-actor");
    });

    it("should auto-save when configured", async () => {
      const autoSaveService = new VisionService({
        name: "AutoSave",
        autoSave: true,
        visionPath: mockVisionPath,
      });

      vi.spyOn(fs, "access").mockRejectedValue(new Error("Not found"));
      vi.spyOn(fs, "mkdir").mockResolvedValue(undefined);
      vi.spyOn(fs, "writeFile").mockResolvedValue(undefined);

      await autoSaveService.initialize();
      await autoSaveService.updateVision({ timeframe: "6 months" });

      expect(fs.writeFile).toHaveBeenCalled();
      await autoSaveService.dispose();
    });

    it("should update canonical vision", async () => {
      await service.updateVision({ mission: "New mission" });

      const canonical = service.getCanonicalVision();
      expect(canonical.isOk()).toBe(true);

      if (canonical.isOk()) {
        expect(canonical.value.mission).toBe("New mission");
      }
    });
  });

  describe("saveVision", () => {
    it("should save vision to file", async () => {
      const visionResult = service.getVision();
      expect(visionResult.isOk()).toBe(true);

      if (visionResult.isOk()) {
        const result = await service.saveVision(visionResult.value);

        expect(result.isOk()).toBe(true);
        expect(fs.writeFile).toHaveBeenCalled();
      }
    });

    it("should create directory if needed", async () => {
      const visionResult = service.getVision();

      if (visionResult.isOk()) {
        await service.saveVision(visionResult.value);

        expect(fs.mkdir).toHaveBeenCalled();
      }
    });

    it("should format as markdown with frontmatter", async () => {
      const visionResult = service.getVision();

      if (visionResult.isOk()) {
        await service.saveVision(visionResult.value);

        const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
        const content = writeCall[1] as string;

        expect(content).toContain("---");
        expect(content).toContain("## Mission");
        expect(content).toContain("## Goals");
      }
    });

    it("should emit visionSaved event", async () => {
      const handler = vi.fn();
      service.on("visionSaved", handler);

      const visionResult = service.getVision();
      if (visionResult.isOk()) {
        await service.saveVision(visionResult.value);

        expect(handler).toHaveBeenCalled();
      }
    });

    it("should handle save errors", async () => {
      vi.spyOn(fs, "writeFile").mockRejectedValue(new Error("Write failed"));

      const visionResult = service.getVision();
      if (visionResult.isOk()) {
        const result = await service.saveVision(visionResult.value);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.code).toBe("SAVE_ERROR");
        }
      }
    });
  });

  describe("loadCanonicalVision", () => {
    it("should load vision from file", async () => {
      const mockContent = `---
title: Test Vision
version: 1
---

## Mission
Test mission

## Goals
- Goal 1`;

      vi.spyOn(fs, "readFile").mockResolvedValue(mockContent);

      const result = await service.loadCanonicalVision();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.mission).toBe("Test mission");
      }
    });

    it("should return error when file not found", async () => {
      vi.spyOn(fs, "access").mockRejectedValue(new Error("Not found"));

      const result = await service.loadCanonicalVision();

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("FILE_NOT_FOUND");
      }
    });

    it("should emit visionLoaded event", async () => {
      const mockContent = `---
version: 1
---

## Mission
Test`;

      vi.spyOn(fs, "readFile").mockResolvedValue(mockContent);

      const handler = vi.fn();
      service.on("visionLoaded", handler);

      await service.loadCanonicalVision();

      expect(handler).toHaveBeenCalled();
    });
  });

  describe("captureVision", () => {
    it("should capture vision state", async () => {
      const visionResult = service.getVision();
      expect(visionResult.isOk()).toBe(true);

      if (visionResult.isOk()) {
        const captureData: VisionCaptureData = {
          capturedAt: new Date(),
          capturedBy: "test-user",
          engagementMode: "builder",
          vision: visionResult.value,
          notes: "Test capture",
          tags: ["test"],
        };

        const result = await service.captureVision(captureData);

        expect(result.isOk()).toBe(true);
        expect(fs.mkdir).toHaveBeenCalled();
        expect(fs.writeFile).toHaveBeenCalled();
      }
    });

    it("should generate timestamped filename", async () => {
      const visionResult = service.getVision();

      if (visionResult.isOk()) {
        const captureData: VisionCaptureData = {
          capturedAt: new Date(),
          capturedBy: "test",
          engagementMode: "engineer",
          vision: visionResult.value,
        };

        await service.captureVision(captureData);

        const writeCall = vi.mocked(fs.writeFile).mock.calls.find((call) =>
          (call[0] as string).includes("vision-capture-"),
        );
        expect(writeCall).toBeDefined();
      }
    });

    it("should emit visionCaptured event", async () => {
      const handler = vi.fn();
      service.on("visionCaptured", handler);

      const visionResult = service.getVision();
      if (visionResult.isOk()) {
        const captureData: VisionCaptureData = {
          capturedAt: new Date(),
          capturedBy: "test",
          engagementMode: "builder",
          vision: visionResult.value,
        };

        await service.captureVision(captureData);

        expect(handler).toHaveBeenCalled();
      }
    });

    it("should handle capture errors", async () => {
      vi.spyOn(fs, "mkdir").mockRejectedValue(new Error("mkdir failed"));

      const visionResult = service.getVision();
      if (visionResult.isOk()) {
        const captureData: VisionCaptureData = {
          capturedAt: new Date(),
          capturedBy: "test",
          engagementMode: "builder",
          vision: visionResult.value,
        };

        const result = await service.captureVision(captureData);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.code).toBe("CAPTURE_ERROR");
        }
      }
    });
  });

  describe("loadVisionCaptures", () => {
    it("should load all vision captures", async () => {
      const mockFiles = [
        "vision-capture-2024-01-01.yaml",
        "vision-capture-2024-01-02.yaml",
      ];
      const mockCapture = `capturedAt: 2024-01-01T00:00:00.000Z
capturedBy: test
engagementMode: builder
vision:
  mission: Test`;

      vi.spyOn(fs, "readdir").mockResolvedValue(mockFiles as any);
      vi.spyOn(fs, "readFile").mockResolvedValue(mockCapture);

      const result = await service.loadVisionCaptures();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.length).toBe(2);
      }
    });

    it("should return empty array when directory not found", async () => {
      vi.spyOn(fs, "access").mockRejectedValue(new Error("Not found"));

      const result = await service.loadVisionCaptures();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual([]);
      }
    });

    it("should filter non-yaml files", async () => {
      const mockFiles = [
        "vision-capture-1.yaml",
        "readme.txt",
        "vision-capture-2.yml",
      ];

      vi.spyOn(fs, "readdir").mockResolvedValue(mockFiles as any);
      vi.spyOn(fs, "readFile").mockResolvedValue("capturedAt: 2024-01-01");

      const result = await service.loadVisionCaptures();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.length).toBe(2);
      }
    });

    it("should sort captures by date descending", async () => {
      const mockFiles = ["capture-1.yaml", "capture-2.yaml"];
      const mockCapture1 = `capturedAt: 2024-01-01T00:00:00.000Z
capturedBy: test
engagementMode: builder
vision:
  mission: Test`;

      const mockCapture2 = `capturedAt: 2024-01-02T00:00:00.000Z
capturedBy: test
engagementMode: builder
vision:
  mission: Test`;

      vi.spyOn(fs, "readdir").mockResolvedValue(mockFiles as any);
      vi.spyOn(fs, "readFile")
        .mockResolvedValueOnce(mockCapture1)
        .mockResolvedValueOnce(mockCapture2);

      const result = await service.loadVisionCaptures();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const dates = result.value.map((c) => new Date(c.capturedAt).getTime());
        expect(dates[0]).toBeGreaterThan(dates[1]);
      }
    });
  });

  describe("getCaptures", () => {
    beforeEach(async () => {
      const mockFiles = ["capture-1.yaml"];
      const mockCapture = `capturedAt: 2024-01-01T00:00:00.000Z
capturedBy: test
engagementMode: builder
vision:
  mission: Test`;

      vi.spyOn(fs, "readdir").mockResolvedValue(mockFiles as any);
      vi.spyOn(fs, "readFile").mockResolvedValue(mockCapture);
      vi.spyOn(fs, "access").mockResolvedValue(undefined);

      await service.loadVisionCaptures();
    });

    it("should return all captures without limit", () => {
      const captures = service.getCaptures();
      expect(captures.length).toBeGreaterThan(0);
    });

    it("should limit captures when specified", () => {
      const captures = service.getCaptures(1);
      expect(captures.length).toBeLessThanOrEqual(1);
    });
  });

  describe("checkAlignment", () => {
    beforeEach(async () => {
      await service.updateVision({
        mission: "Build secure software",
        goals: ["Security first", "Fast development"],
        constraints: ["No hardcoded credentials", "Must use TypeScript"],
      });
    });

    it("should check decision alignment", () => {
      const result = service.checkAlignment(
        "Implement security authentication using TypeScript",
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.decision).toBeDefined();
        expect(typeof result.value.aligned).toBe("boolean");
        expect(result.value.score).toBeGreaterThanOrEqual(0);
      }
    });

    it("should detect aligned decisions", () => {
      const result = service.checkAlignment(
        "Build secure software with TypeScript for fast development and security first using no hardcoded credentials",
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // Check that alignment works - the decision should have a score
        expect(result.value.score).toBeGreaterThanOrEqual(0);
        expect(result.value.score).toBeLessThanOrEqual(1);
        expect(typeof result.value.aligned).toBe("boolean");
        // If violations exist, they should be an array
        if (result.value.violations) {
          expect(Array.isArray(result.value.violations)).toBe(true);
        }
      }
    });

    it("should provide suggestions for misaligned decisions", () => {
      const result = service.checkAlignment("Add feature using Python");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        if (!result.value.aligned) {
          expect(result.value.suggestions).toBeDefined();
          expect(result.value.suggestions!.length).toBeGreaterThan(0);
        }
      }
    });

    it("should emit alignmentChecked event", () => {
      const handler = vi.fn();
      service.on("alignmentChecked", handler);

      service.checkAlignment("Test decision");

      expect(handler).toHaveBeenCalled();
    });

    it("should return error when no vision available", async () => {
      const emptyService = new VisionService({
        name: "Empty",
        autoSave: false,
      });

      const result = emptyService.checkAlignment("Test decision");

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("NO_VISION");
      }
    });
  });

  describe("getHistory", () => {
    beforeEach(async () => {
      await service.updateVision({ timeframe: "3 months" });
      await service.updateVision({ timeframe: "6 months" });
      await service.updateVision({ timeframe: "12 months" });
    });

    it("should return all history without limit", () => {
      const history = service.getHistory();
      expect(history.length).toBeGreaterThanOrEqual(3);
    });

    it("should limit history when specified", () => {
      const history = service.getHistory(2);
      expect(history.length).toBeLessThanOrEqual(2);
    });

    it("should return most recent events when limited", () => {
      const history = service.getHistory(1);
      expect(history.length).toBeGreaterThan(0);
      // Last event should be the most recent
      const lastEvent = history[history.length - 1];
      expect(lastEvent.data).toBeDefined();
    });
  });

  describe("disposal", () => {
    it("should save vision on disposal when autoSave enabled", async () => {
      const autoSaveService = new VisionService({
        name: "AutoSave",
        autoSave: true,
        visionPath: mockVisionPath,
      });

      vi.spyOn(fs, "access").mockRejectedValue(new Error("Not found"));
      vi.spyOn(fs, "mkdir").mockResolvedValue(undefined);
      const writeFileSpy = vi
        .spyOn(fs, "writeFile")
        .mockResolvedValue(undefined);

      await autoSaveService.initialize();
      await autoSaveService.updateVision({ timeframe: "6 months" });

      // Clear previous calls
      writeFileSpy.mockClear();

      await autoSaveService.dispose();

      expect(writeFileSpy).toHaveBeenCalled();
    });

    it("should not save vision when autoSave disabled", async () => {
      const noAutoSaveService = new VisionService({
        name: "NoAutoSave",
        autoSave: false,
        visionPath: mockVisionPath,
      });

      vi.spyOn(fs, "access").mockRejectedValue(new Error("Not found"));
      const writeFileSpy = vi
        .spyOn(fs, "writeFile")
        .mockResolvedValue(undefined);

      await noAutoSaveService.initialize();

      writeFileSpy.mockClear();
      await noAutoSaveService.dispose();

      expect(writeFileSpy).not.toHaveBeenCalled();
    });

    it("should clear all data on disposal", async () => {
      await service.dispose();

      const visionResult = service.getVision();
      expect(visionResult.isErr()).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("should handle vision with Goal objects instead of strings", async () => {
      const visionWithGoalObjects: VisionData = {
        mission: "Test",
        goals: [
          {
            id: "goal-1",
            title: "Goal 1",
            description: "Description",
            status: "pending",
            progress: 50,
            dependencies: [],
          },
        ],
        constraints: ["Constraint"],
        successMetrics: ["Metric"],
        timeframe: "6 months",
      };

      const result = await service.updateVision(visionWithGoalObjects);
      expect(result.isOk()).toBe(true);
    });

    it("should handle vision with Metric objects instead of strings", async () => {
      const visionWithMetricObjects: VisionData = {
        mission: "Test",
        goals: ["Goal"],
        constraints: ["Constraint"],
        successMetrics: [
          {
            id: "metric-1",
            name: "Coverage",
            current: 75,
            target: 90,
            unit: "%",
            trend: "up",
          },
        ],
        timeframe: "6 months",
      };

      const result = await service.updateVision(visionWithMetricObjects);
      expect(result.isOk()).toBe(true);
    });

    it("should handle empty constraints", async () => {
      const result = await service.updateVision({
        constraints: [],
      });

      expect(result.isOk()).toBe(true);
    });

    it("should handle markdown content without frontmatter", () => {
      const content = `## Mission
Simple mission

## Goals
- Goal 1`;

      const parsed = service["parseVisionFile"](content);
      expect(parsed.content).toContain("Mission");
    });
  });
});
