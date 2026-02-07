/**
 * Runspace Manager Tests
 * Comprehensive unit tests for multi-project runspace management
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from "vitest";
import * as fs from "fs/promises";
import * as path from "path";
import * as realOs from "os";
import { Runspace, RunspaceStatus, CreateRunspaceConfig } from "../runspace";

// vi.hoisted runs before any vi.mock calls, so testHomeBase is available
const testHomeBase = vi.hoisted(() => {
  const _path = require("path");
  const _os = require("os");
  return _path.join(_os.tmpdir(), "forge-test-home-" + Date.now());
});

// Mock os.homedir() BEFORE RunspaceManager is imported (it reads at module level)
vi.mock("os", async (importOriginal) => {
  const os = await importOriginal<typeof import("os")>();
  return {
    ...os,
    default: { ...os, homedir: () => testHomeBase },
    homedir: () => testHomeBase,
  };
});

// Mock dependencies
vi.mock("uuid");
vi.mock("../backends/wsl-backend");
vi.mock("../../utils/logger", () => ({
  getLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

// Import AFTER mocks are set up
import { RunspaceManager } from "../runspace-manager";
import { WSLBackend } from "../backends/wsl-backend";

describe("RunspaceManager", () => {
  let manager: RunspaceManager;
  let testProjectDir: string;
  let testForgeDir: string;
  let uuidCounter = 0;

  beforeAll(async () => {
    // Create the mocked HOME directory
    await fs.mkdir(testHomeBase, { recursive: true });

    // .forge directory is at testHomeBase/.forge (matches os.homedir() mock)
    testForgeDir = path.join(testHomeBase, ".forge");
  });

  afterAll(async () => {
    // Clean up temp home
    try {
      await fs.rm(testHomeBase, { recursive: true, force: true });
    } catch {
      // Ignore
    }
  });

  beforeEach(async () => {
    // Reset UUID counter and mock
    uuidCounter = 0;
    const { v4 } = await import("uuid");
    vi.mocked(v4).mockImplementation(() => "test-uuid-" + uuidCounter++);

    // Create temp project directory
    const randomId = Math.floor(Math.random() * 1000000);
    testProjectDir = path.join(
      realOs.tmpdir(),
      `test-project-${Date.now()}-${randomId}`,
    );
    await fs.mkdir(testProjectDir, { recursive: true });

    // Mock WSLBackend methods - use vi.mocked properly
    vi.mocked(WSLBackend).mockImplementation(function(this: any) {
      this.type = "wsl";
      this.start = vi.fn().mockResolvedValue(undefined);
      this.stop = vi.fn().mockResolvedValue(undefined);
      this.suspend = vi.fn().mockResolvedValue(undefined);
      this.resume = vi.fn().mockResolvedValue(undefined);
      this.execute = vi.fn().mockResolvedValue("");
      this.attachPTY = vi.fn().mockResolvedValue({
        id: "pty-test",
        runspaceId: "test-id",
        pty: { pid: 1234 },
        createdAt: new Date(),
      });
      this.getHealth = vi.fn().mockResolvedValue({
        status: "healthy",
        cpu: 10,
        memory: 512,
        disk: 1024,
        uptime: 100,
        lastCheck: new Date(),
      });
      return this;
    } as any);

    manager = new RunspaceManager();
  });

  afterEach(async () => {
    if (manager) {
      await manager.shutdown();
    }

    // Clean up test project directory
    try {
      await fs.rm(testProjectDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }

    // Clean up .forge directory for next test
    try {
      await fs.rm(testForgeDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }

    vi.clearAllMocks();
  });

  const createTestConfig = (name: string): CreateRunspaceConfig => ({
    name,
    displayName: `Test ${name}`,
    path: testProjectDir,
    backendType: "wsl",
    tags: ["test"],
    autoStart: false,
  });

  describe("initialize", () => {
    it("should create .forge directory structure", async () => {
      await manager.initialize();

      const forgeExists = await fs.access(testForgeDir).then(() => true).catch(() => false);
      expect(forgeExists).toBe(true);

      const cacheExists = await fs.access(path.join(testForgeDir, "cache")).then(() => true).catch(() => false);
      expect(cacheExists).toBe(true);

      const logsExists = await fs.access(path.join(testForgeDir, "logs")).then(() => true).catch(() => false);
      expect(logsExists).toBe(true);
    });

    it("should load existing registry from disk", async () => {
      // Pre-create registry file
      await fs.mkdir(testForgeDir, { recursive: true });
      const registry = {
        runspaces: [
          {
            id: "existing-id",
            name: "existing",
            displayName: "Existing Project",
            path: testProjectDir,
            backendType: "wsl" as const,
            status: "stopped" as RunspaceStatus,
            createdAt: new Date().toISOString(),
            lastActive: new Date().toISOString(),
            tags: [],
            autoStart: false,
          },
        ],
        activeRunspaceId: null,
        version: "1.0",
        lastSync: new Date().toISOString(),
      };
      await fs.writeFile(
        path.join(testForgeDir, "projects.json"),
        JSON.stringify(registry, null, 2),
      );

      await manager.initialize();

      const runspaces = manager.getAllRunspaces();
      expect(runspaces.length).toBe(1);
      expect(runspaces[0].name).toBe("existing");
      expect(runspaces[0].createdAt).toBeInstanceOf(Date);
      expect(runspaces[0].lastActive).toBeInstanceOf(Date);
    });

    it("should handle missing registry file gracefully", async () => {
      await manager.initialize();

      const runspaces = manager.getAllRunspaces();
      expect(runspaces.length).toBe(0);
    });

    it("should handle corrupted registry file", async () => {
      await fs.mkdir(testForgeDir, { recursive: true });
      await fs.writeFile(
        path.join(testForgeDir, "projects.json"),
        "{ invalid json",
      );

      // Should not throw, just start with empty state
      await expect(manager.initialize()).resolves.not.toThrow();

      const runspaces = manager.getAllRunspaces();
      expect(runspaces.length).toBe(0);
    });
  });

  describe("createRunspace", () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it("should create a new runspace", async () => {
      const config = createTestConfig("test-project");
      const runspace = await manager.createRunspace(config);

      expect(runspace.id).toBeDefined();
      expect(runspace.name).toBe("test-project");
      expect(runspace.displayName).toBe("Test test-project");
      expect(runspace.path).toBe(path.resolve(testProjectDir));
      expect(runspace.backendType).toBe("wsl");
      expect(runspace.status).toBe("stopped");
      expect(runspace.createdAt).toBeInstanceOf(Date);
      expect(runspace.lastActive).toBeInstanceOf(Date);
      expect(runspace.tags).toEqual(["test"]);
      expect(runspace.autoStart).toBe(false);
    });

    it("should generate random color when not provided", async () => {
      const config = createTestConfig("colorful");
      const runspace = await manager.createRunspace(config);

      expect(runspace.color).toBeDefined();
      expect(runspace.color).toMatch(/^#[0-9A-F]{6}$/i);
    });

    it("should use provided color", async () => {
      const config = createTestConfig("custom-color");
      config.color = "#FF0000";
      const runspace = await manager.createRunspace(config);

      expect(runspace.color).toBe("#FF0000");
    });

    it("should default to wsl backend when not specified", async () => {
      const config = createTestConfig("default-backend");
      delete config.backendType;
      const runspace = await manager.createRunspace(config);

      expect(runspace.backendType).toBe("wsl");
    });

    it("should create project directory structure", async () => {
      const config = createTestConfig("with-structure");
      await manager.createRunspace(config);

      const forgeDir = path.join(testProjectDir, ".forge");
      const historyDir = path.join(forgeDir, "history");
      const sessionsDir = path.join(forgeDir, "history", "sessions");
      const gitignore = path.join(forgeDir, ".gitignore");

      expect(await fs.access(forgeDir).then(() => true).catch(() => false)).toBe(true);
      expect(await fs.access(historyDir).then(() => true).catch(() => false)).toBe(true);
      expect(await fs.access(sessionsDir).then(() => true).catch(() => false)).toBe(true);
      expect(await fs.access(gitignore).then(() => true).catch(() => false)).toBe(true);

      const gitignoreContent = await fs.readFile(gitignore, "utf-8");
      expect(gitignoreContent).toContain("history/");
      expect(gitignoreContent).toContain("*.log");
      expect(gitignoreContent).toContain("cache/");
    });

    it("should save vision when provided", async () => {
      const config = createTestConfig("with-vision");
      config.vision = {
        mission: "Test mission",
        goals: ["Goal 1", "Goal 2"],
        constraints: ["Constraint 1"],
        successMetrics: ["Metric 1"],
        timeframe: "Q1 2026",
        engagementMode: "engineer",
      };
      await manager.createRunspace(config);

      const visionFile = path.join(testProjectDir, ".forge", "vision.json");
      const vision = JSON.parse(await fs.readFile(visionFile, "utf-8"));

      expect(vision.mission).toBe("Test mission");
      expect(vision.goals).toEqual(["Goal 1", "Goal 2"]);
    });

    it("should save MCP config when provided", async () => {
      const config = createTestConfig("with-mcp");
      config.mcpConfig = {
        servers: {
          "test-server": {
            command: "node",
            args: ["server.js"],
            enabled: true,
          },
        },
      };
      await manager.createRunspace(config);

      const mcpFile = path.join(testProjectDir, ".forge", "mcp-config.json");
      const mcpConfig = JSON.parse(await fs.readFile(mcpFile, "utf-8"));

      expect(mcpConfig.servers["test-server"].command).toBe("node");
    });

    it("should throw error for non-existent path", async () => {
      const config = createTestConfig("invalid-path");
      config.path = "/non/existent/path/that/should/not/exist";

      await expect(manager.createRunspace(config)).rejects.toThrow(
        "Path does not exist",
      );
    });

    it("should throw error for duplicate name", async () => {
      const config1 = createTestConfig("duplicate");
      await manager.createRunspace(config1);

      const config2 = createTestConfig("duplicate");
      await expect(manager.createRunspace(config2)).rejects.toThrow(
        'Runspace with name "duplicate" already exists',
      );
    });

    it("should emit runspace.created event", async () => {
      const eventSpy = vi.fn();
      manager.on("runspace.created", eventSpy);

      const config = createTestConfig("event-test");
      const runspace = await manager.createRunspace(config);

      expect(eventSpy).toHaveBeenCalledWith({
        type: "runspace.created",
        runspace,
      });
    });

    it("should persist to disk", async () => {
      const config = createTestConfig("persist-test");
      await manager.createRunspace(config);

      const registryPath = path.join(testForgeDir, "projects.json");
      const registry = JSON.parse(await fs.readFile(registryPath, "utf-8"));

      expect(registry.runspaces.length).toBe(1);
      expect(registry.runspaces[0].name).toBe("persist-test");
    });
  });

  describe("getRunspace", () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it("should return runspace by ID", async () => {
      const config = createTestConfig("get-test");
      const created = await manager.createRunspace(config);

      const retrieved = manager.getRunspace(created.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe("get-test");
    });

    it("should return undefined for non-existent ID", () => {
      const retrieved = manager.getRunspace("non-existent");
      expect(retrieved).toBeUndefined();
    });
  });

  describe("getAllRunspaces", () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it("should return all runspaces", async () => {
      await manager.createRunspace(createTestConfig("project-1"));
      await manager.createRunspace(createTestConfig("project-2"));
      await manager.createRunspace(createTestConfig("project-3"));

      const runspaces = manager.getAllRunspaces();
      expect(runspaces.length).toBe(3);
    });

    it("should return empty array when no runspaces", () => {
      const runspaces = manager.getAllRunspaces();
      expect(runspaces).toEqual([]);
    });
  });

  describe("getActiveRunspace", () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it("should return null when no active runspace", () => {
      const active = manager.getActiveRunspace();
      expect(active).toBeNull();
    });

    it("should return active runspace after switch", async () => {
      const config = createTestConfig("active-test");
      const runspace = await manager.createRunspace(config);
      await manager.switchRunspace(runspace.id);

      const active = manager.getActiveRunspace();
      expect(active).toBeDefined();
      expect(active?.id).toBe(runspace.id);
    });
  });

  describe("switchRunspace", () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it("should switch to a runspace", async () => {
      const config = createTestConfig("switch-test");
      const runspace = await manager.createRunspace(config);

      await manager.switchRunspace(runspace.id);

      const active = manager.getActiveRunspace();
      expect(active?.id).toBe(runspace.id);
    });

    it("should throw error for non-existent runspace", async () => {
      await expect(manager.switchRunspace("non-existent")).rejects.toThrow(
        "Runspace not found",
      );
    });

    it("should update lastActive timestamp", async () => {
      const config = createTestConfig("timestamp-test");
      const runspace = await manager.createRunspace(config);
      const originalTime = runspace.lastActive;

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      await manager.switchRunspace(runspace.id);

      const updated = manager.getRunspace(runspace.id);
      expect(updated?.lastActive.getTime()).toBeGreaterThan(originalTime.getTime());
    });

    it("should start runspace if stopped", async () => {
      const config = createTestConfig("start-on-switch");
      const runspace = await manager.createRunspace(config);

      await manager.switchRunspace(runspace.id);

      const updated = manager.getRunspace(runspace.id);
      expect(updated?.status).toBe("active");
    });

    it("should emit runspace.activated event", async () => {
      const eventSpy = vi.fn();
      manager.on("runspace.activated", eventSpy);

      const config = createTestConfig("activate-event");
      const runspace = await manager.createRunspace(config);
      await manager.switchRunspace(runspace.id);

      expect(eventSpy).toHaveBeenCalledWith({
        type: "runspace.activated",
        runspaceId: runspace.id,
      });
    });

    it("should suspend previous runspace if autoSuspend is true", async () => {
      const config1 = createTestConfig("auto-suspend");
      config1.autoStart = false;
      const runspace1 = await manager.createRunspace(config1);
      await manager.switchRunspace(runspace1.id);

      // Set autoSuspend after creation
      await manager.updateRunspace(runspace1.id, { autoSuspend: true });

      const config2 = createTestConfig("new-active");
      const runspace2 = await manager.createRunspace(config2);
      await manager.switchRunspace(runspace2.id);

      const suspended = manager.getRunspace(runspace1.id);
      expect(suspended?.status).toBe("suspended");
    });
  });

  describe("startRunspace", () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it("should start a stopped runspace", async () => {
      const config = createTestConfig("start-test");
      const runspace = await manager.createRunspace(config);

      await manager.startRunspace(runspace.id);

      const updated = manager.getRunspace(runspace.id);
      expect(updated?.status).toBe("active");
    });

    it("should throw error for non-existent runspace", async () => {
      await expect(manager.startRunspace("non-existent")).rejects.toThrow(
        "Runspace not found",
      );
    });

    it("should not throw if already active", async () => {
      const config = createTestConfig("already-active");
      const runspace = await manager.createRunspace(config);
      await manager.startRunspace(runspace.id);

      await expect(manager.startRunspace(runspace.id)).resolves.not.toThrow();
    });

    it("should call backend start method", async () => {
      const config = createTestConfig("backend-start");
      const runspace = await manager.createRunspace(config);

      const mockBackend = (manager as any).backends.get("wsl");
      await manager.startRunspace(runspace.id);

      expect(mockBackend.start).toHaveBeenCalledWith(
        expect.objectContaining({ id: runspace.id }),
      );
    });

    it("should emit runspace.updated event", async () => {
      const eventSpy = vi.fn();
      manager.on("runspace.updated", eventSpy);

      const config = createTestConfig("update-event");
      const runspace = await manager.createRunspace(config);
      await manager.startRunspace(runspace.id);

      expect(eventSpy).toHaveBeenCalledWith({
        type: "runspace.updated",
        runspace: expect.objectContaining({ id: runspace.id }),
      });
    });

    it("should throw for unavailable backend", async () => {
      const config = createTestConfig("bad-backend");
      const runspace = await manager.createRunspace(config);

      // Manually set invalid backend type
      runspace.backendType = "container" as any;

      await expect(manager.startRunspace(runspace.id)).rejects.toThrow(
        "Backend not available",
      );
    });
  });

  describe("stopRunspace", () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it("should stop an active runspace", async () => {
      const config = createTestConfig("stop-test");
      const runspace = await manager.createRunspace(config);
      await manager.startRunspace(runspace.id);

      await manager.stopRunspace(runspace.id);

      const updated = manager.getRunspace(runspace.id);
      expect(updated?.status).toBe("stopped");
      expect(updated?.ptySessionId).toBeUndefined();
      expect(updated?.wsRoomId).toBeUndefined();
      expect(updated?.pid).toBeUndefined();
    });

    it("should throw error for non-existent runspace", async () => {
      await expect(manager.stopRunspace("non-existent")).rejects.toThrow(
        "Runspace not found",
      );
    });

    it("should not throw if already stopped", async () => {
      const config = createTestConfig("already-stopped");
      const runspace = await manager.createRunspace(config);

      await expect(manager.stopRunspace(runspace.id)).resolves.not.toThrow();
    });

    it("should call backend stop method", async () => {
      const config = createTestConfig("backend-stop");
      const runspace = await manager.createRunspace(config);
      await manager.startRunspace(runspace.id);

      const mockBackend = (manager as any).backends.get("wsl");
      await manager.stopRunspace(runspace.id);

      expect(mockBackend.stop).toHaveBeenCalled();
    });

    it("should clear active runspace if stopped", async () => {
      const config = createTestConfig("clear-active");
      const runspace = await manager.createRunspace(config);
      await manager.switchRunspace(runspace.id);

      await manager.stopRunspace(runspace.id);

      const active = manager.getActiveRunspace();
      expect(active).toBeNull();
    });

    it("should emit runspace.updated event", async () => {
      const eventSpy = vi.fn();
      manager.on("runspace.updated", eventSpy);

      const config = createTestConfig("stop-event");
      const runspace = await manager.createRunspace(config);
      await manager.startRunspace(runspace.id);
      await manager.stopRunspace(runspace.id);

      expect(eventSpy).toHaveBeenCalledWith({
        type: "runspace.updated",
        runspace: expect.objectContaining({ id: runspace.id, status: "stopped" }),
      });
    });
  });

  describe("suspendRunspace", () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it("should suspend an active runspace", async () => {
      const config = createTestConfig("suspend-test");
      const runspace = await manager.createRunspace(config);
      await manager.startRunspace(runspace.id);

      await manager.suspendRunspace(runspace.id);

      const updated = manager.getRunspace(runspace.id);
      expect(updated?.status).toBe("suspended");
    });

    it("should throw error for non-existent runspace", async () => {
      await expect(manager.suspendRunspace("non-existent")).rejects.toThrow(
        "Runspace not found",
      );
    });

    it("should call backend suspend method", async () => {
      const config = createTestConfig("backend-suspend");
      const runspace = await manager.createRunspace(config);

      const mockBackend = (manager as any).backends.get("wsl");
      await manager.suspendRunspace(runspace.id);

      expect(mockBackend.suspend).toHaveBeenCalled();
    });

    it("should emit runspace.suspended event", async () => {
      const eventSpy = vi.fn();
      manager.on("runspace.suspended", eventSpy);

      const config = createTestConfig("suspend-event");
      const runspace = await manager.createRunspace(config);
      await manager.suspendRunspace(runspace.id);

      expect(eventSpy).toHaveBeenCalledWith({
        type: "runspace.suspended",
        runspaceId: runspace.id,
      });
    });
  });

  describe("deleteRunspace", () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it("should delete a runspace", async () => {
      const config = createTestConfig("delete-test");
      const runspace = await manager.createRunspace(config);

      await manager.deleteRunspace(runspace.id);

      const retrieved = manager.getRunspace(runspace.id);
      expect(retrieved).toBeUndefined();
    });

    it("should throw error for non-existent runspace", async () => {
      await expect(manager.deleteRunspace("non-existent")).rejects.toThrow(
        "Runspace not found",
      );
    });

    it("should stop runspace if active before deleting", async () => {
      const config = createTestConfig("delete-active");
      const runspace = await manager.createRunspace(config);
      await manager.startRunspace(runspace.id);

      const mockBackend = (manager as any).backends.get("wsl");
      await manager.deleteRunspace(runspace.id);

      expect(mockBackend.stop).toHaveBeenCalled();
    });

    it("should delete project files when deleteFiles is true", async () => {
      const config = createTestConfig("delete-files");
      const runspace = await manager.createRunspace(config);

      const forgeDir = path.join(testProjectDir, ".forge");
      expect(await fs.access(forgeDir).then(() => true).catch(() => false)).toBe(true);

      await manager.deleteRunspace(runspace.id, true);

      expect(await fs.access(forgeDir).then(() => true).catch(() => false)).toBe(false);
    });

    it("should not delete project files when deleteFiles is false", async () => {
      const config = createTestConfig("keep-files");
      const runspace = await manager.createRunspace(config);

      const forgeDir = path.join(testProjectDir, ".forge");
      await manager.deleteRunspace(runspace.id, false);

      expect(await fs.access(forgeDir).then(() => true).catch(() => false)).toBe(true);
    });

    it("should clear active runspace if deleted", async () => {
      const config = createTestConfig("delete-active-clear");
      const runspace = await manager.createRunspace(config);
      await manager.switchRunspace(runspace.id);

      await manager.deleteRunspace(runspace.id);

      const active = manager.getActiveRunspace();
      expect(active).toBeNull();
    });

    it("should emit runspace.deleted event", async () => {
      const eventSpy = vi.fn();
      manager.on("runspace.deleted", eventSpy);

      const config = createTestConfig("delete-event");
      const runspace = await manager.createRunspace(config);
      await manager.deleteRunspace(runspace.id);

      expect(eventSpy).toHaveBeenCalledWith({
        type: "runspace.deleted",
        runspaceId: runspace.id,
      });
    });

    it("should persist deletion to disk", async () => {
      const config = createTestConfig("persist-delete");
      const runspace = await manager.createRunspace(config);
      await manager.deleteRunspace(runspace.id);

      const registryPath = path.join(testForgeDir, "projects.json");
      const registry = JSON.parse(await fs.readFile(registryPath, "utf-8"));

      expect(registry.runspaces.length).toBe(0);
    });
  });

  describe("updateRunspace", () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it("should update runspace properties", async () => {
      const config = createTestConfig("update-test");
      const runspace = await manager.createRunspace(config);

      const updated = await manager.updateRunspace(runspace.id, {
        displayName: "Updated Name",
        tags: ["updated", "test"],
      });

      expect(updated.displayName).toBe("Updated Name");
      expect(updated.tags).toEqual(["updated", "test"]);
    });

    it("should throw error for non-existent runspace", async () => {
      await expect(
        manager.updateRunspace("non-existent", { displayName: "Test" }),
      ).rejects.toThrow("Runspace not found");
    });

    it("should emit runspace.updated event", async () => {
      const eventSpy = vi.fn();
      manager.on("runspace.updated", eventSpy);

      const config = createTestConfig("update-event");
      const runspace = await manager.createRunspace(config);
      await manager.updateRunspace(runspace.id, { displayName: "New Name" });

      expect(eventSpy).toHaveBeenCalledWith({
        type: "runspace.updated",
        runspace: expect.objectContaining({ displayName: "New Name" }),
      });
    });

    it("should persist updates to disk", async () => {
      const config = createTestConfig("persist-update");
      const runspace = await manager.createRunspace(config);
      await manager.updateRunspace(runspace.id, { displayName: "Persisted" });

      const registryPath = path.join(testForgeDir, "projects.json");
      const registry = JSON.parse(await fs.readFile(registryPath, "utf-8"));

      expect(registry.runspaces[0].displayName).toBe("Persisted");
    });
  });

  describe("getRunspaceHealth", () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it("should return health status from backend", async () => {
      const config = createTestConfig("health-test");
      const runspace = await manager.createRunspace(config);

      const health = await manager.getRunspaceHealth(runspace.id);

      expect(health.status).toBe("healthy");
      expect(health.cpu).toBeDefined();
      expect(health.memory).toBeDefined();
      expect(health.uptime).toBeDefined();
    });

    it("should throw error for non-existent runspace", async () => {
      await expect(manager.getRunspaceHealth("non-existent")).rejects.toThrow(
        "Runspace not found",
      );
    });

    it("should throw error if backend not available", async () => {
      const config = createTestConfig("bad-backend-health");
      const runspace = await manager.createRunspace(config);

      // Set invalid backend
      runspace.backendType = "vm" as any;

      await expect(manager.getRunspaceHealth(runspace.id)).rejects.toThrow(
        "Backend not found for type",
      );
    });
  });

  describe("shutdown", () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it("should stop all active runspaces", async () => {
      const config1 = createTestConfig("shutdown-1");
      const runspace1 = await manager.createRunspace(config1);
      await manager.startRunspace(runspace1.id);

      const config2 = createTestConfig("shutdown-2");
      const runspace2 = await manager.createRunspace(config2);
      await manager.startRunspace(runspace2.id);

      await manager.shutdown();

      const updated1 = manager.getRunspace(runspace1.id);
      const updated2 = manager.getRunspace(runspace2.id);

      expect(updated1?.status).toBe("stopped");
      expect(updated2?.status).toBe("stopped");
    });

    it("should save final registry state", async () => {
      const config = createTestConfig("shutdown-persist");
      await manager.createRunspace(config);

      await manager.shutdown();

      const registryPath = path.join(testForgeDir, "projects.json");
      const registry = JSON.parse(await fs.readFile(registryPath, "utf-8"));

      expect(registry.runspaces.length).toBe(1);
    });
  });

  describe("registry persistence", () => {
    it("should maintain registry version", async () => {
      await manager.initialize();
      const config = createTestConfig("version-test");
      await manager.createRunspace(config);

      const registryPath = path.join(testForgeDir, "projects.json");
      const registry = JSON.parse(await fs.readFile(registryPath, "utf-8"));

      expect(registry.version).toBe("1.0");
    });

    it("should save lastSync timestamp", async () => {
      await manager.initialize();
      const config = createTestConfig("sync-test");
      await manager.createRunspace(config);

      const registryPath = path.join(testForgeDir, "projects.json");
      const registry = JSON.parse(await fs.readFile(registryPath, "utf-8"));

      expect(registry.lastSync).toBeDefined();
      expect(new Date(registry.lastSync)).toBeInstanceOf(Date);
    });

    it("should handle concurrent operations", async () => {
      await manager.initialize();

      // Create multiple runspaces concurrently
      const configs = [
        createTestConfig("concurrent-1"),
        createTestConfig("concurrent-2"),
        createTestConfig("concurrent-3"),
      ];

      await Promise.all(configs.map((c) => manager.createRunspace(c)));

      const runspaces = manager.getAllRunspaces();
      expect(runspaces.length).toBe(3);
    });
  });

  describe("edge cases", () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it("should handle very long runspace names", async () => {
      const longName = "a".repeat(500);
      const config = createTestConfig(longName);

      const runspace = await manager.createRunspace(config);
      expect(runspace.name).toBe(longName);
    });

    it("should handle special characters in names", async () => {
      const specialName = "test-project_v2.0 (copy) [final]";
      const config = createTestConfig(specialName);

      const runspace = await manager.createRunspace(config);
      expect(runspace.name).toBe(specialName);
    });

    it("should handle empty tags array", async () => {
      const config = createTestConfig("no-tags");
      config.tags = [];

      const runspace = await manager.createRunspace(config);
      expect(runspace.tags).toEqual([]);
    });

    it("should handle missing optional config fields", async () => {
      const minimalConfig: CreateRunspaceConfig = {
        name: "minimal",
        path: testProjectDir,
      };

      const runspace = await manager.createRunspace(minimalConfig);
      expect(runspace.displayName).toBe("minimal");
      expect(runspace.backendType).toBe("wsl");
      expect(runspace.tags).toEqual([]);
    });

    it("should handle rapid create/delete cycles", async () => {
      for (let i = 0; i < 5; i++) {
        const config = createTestConfig(`cycle-${i}`);
        const runspace = await manager.createRunspace(config);
        await manager.deleteRunspace(runspace.id);
      }

      const runspaces = manager.getAllRunspaces();
      expect(runspaces.length).toBe(0);
    });
  });
});
