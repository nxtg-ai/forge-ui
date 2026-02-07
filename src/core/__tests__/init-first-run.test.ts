/**
 * Tests for First-Run Initialization
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type * as fsTypes from "fs";

// Mock the logger module
vi.mock("../../utils/logger", () => ({
  getLogger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  })),
}));

describe("init-first-run", () => {
  // Import after mocks are set up
  let fs: typeof fsTypes.promises;
  let path: typeof import("path");
  let ensureExists: any;
  let ensureDir: any;
  let copyIfNotExists: any;
  let initializeUserEnvironment: any;
  let isInitialized: any;
  let getInitializationInfo: any;

  const CLAUDE_DIR = ".claude";

  beforeEach(async () => {
    vi.clearAllMocks();

    // Import modules
    const pathModule = await import("path");
    path = pathModule;

    const fsModule = await import("fs");
    fs = fsModule.promises;

    const initModule = await import("../init-first-run");
    ensureExists = initModule.ensureExists;
    ensureDir = initModule.ensureDir;
    copyIfNotExists = initModule.copyIfNotExists;
    initializeUserEnvironment = initModule.initializeUserEnvironment;
    isInitialized = initModule.isInitialized;
    getInitializationInfo = initModule.getInitializationInfo;
  });

  describe("ensureExists", () => {
    it("should return true if file exists", async () => {
      const mockAccess = vi.mocked(fs.access);
      mockAccess.mockResolvedValueOnce(undefined);

      const result = await ensureExists("/some/path");

      expect(result).toBe(true);
      expect(mockAccess).toHaveBeenCalledWith("/some/path");
    });

    it("should return false if file does not exist", async () => {
      const mockAccess = vi.mocked(fs.access);
      mockAccess.mockRejectedValueOnce(new Error("ENOENT"));

      const result = await ensureExists("/nonexistent/path");

      expect(result).toBe(false);
      expect(mockAccess).toHaveBeenCalledWith("/nonexistent/path");
    });

    it("should handle permission errors gracefully", async () => {
      const mockAccess = vi.mocked(fs.access);
      mockAccess.mockRejectedValueOnce(new Error("EACCES"));

      const result = await ensureExists("/forbidden/path");

      expect(result).toBe(false);
    });
  });

  describe("ensureDir", () => {
    it("should create directory with recursive option", async () => {
      const mockMkdir = vi.mocked(fs.mkdir);
      mockMkdir.mockResolvedValueOnce(undefined);

      await ensureDir("/new/directory");

      expect(mockMkdir).toHaveBeenCalledWith("/new/directory", {
        recursive: true,
      });
    });

    it("should handle existing directory gracefully", async () => {
      const mockMkdir = vi.mocked(fs.mkdir);
      mockMkdir.mockRejectedValueOnce(
        Object.assign(new Error("EEXIST"), { code: "EEXIST" }),
      );

      await expect(ensureDir("/existing/directory")).resolves.not.toThrow();
      expect(mockMkdir).toHaveBeenCalledWith("/existing/directory", {
        recursive: true,
      });
    });

    it("should handle permission errors gracefully", async () => {
      const mockMkdir = vi.mocked(fs.mkdir);
      mockMkdir.mockRejectedValueOnce(new Error("EACCES"));

      await expect(ensureDir("/forbidden/directory")).resolves.not.toThrow();
    });
  });

  describe("copyIfNotExists", () => {
    it("should copy file if destination does not exist", async () => {
      const mockAccess = vi.mocked(fs.access);
      const mockCopyFile = vi.mocked(fs.copyFile);

      mockAccess.mockRejectedValueOnce(new Error("ENOENT"));
      mockCopyFile.mockResolvedValueOnce(undefined);

      const result = await copyIfNotExists("/src/file.txt", "/dest/file.txt");

      expect(result).toBe(true);
      expect(mockAccess).toHaveBeenCalledWith("/dest/file.txt");
      expect(mockCopyFile).toHaveBeenCalledWith(
        "/src/file.txt",
        "/dest/file.txt",
      );
    });

    it("should not copy file if destination exists", async () => {
      const mockAccess = vi.mocked(fs.access);
      const mockCopyFile = vi.mocked(fs.copyFile);

      mockAccess.mockResolvedValueOnce(undefined);

      const result = await copyIfNotExists("/src/file.txt", "/dest/file.txt");

      expect(result).toBe(false);
      expect(mockAccess).toHaveBeenCalledWith("/dest/file.txt");
      expect(mockCopyFile).not.toHaveBeenCalled();
    });

    it("should propagate copy errors", async () => {
      const mockAccess = vi.mocked(fs.access);
      const mockCopyFile = vi.mocked(fs.copyFile);

      mockAccess.mockRejectedValueOnce(new Error("ENOENT"));
      mockCopyFile.mockRejectedValueOnce(new Error("Copy failed"));

      await expect(
        copyIfNotExists("/src/file.txt", "/dest/file.txt"),
      ).rejects.toThrow("Copy failed");
    });
  });

  describe("initializeUserEnvironment", () => {
    it("should skip initialization if already initialized", async () => {
      const mockAccess = vi.mocked(fs.access);
      const mockMkdir = vi.mocked(fs.mkdir);
      const mockCopyFile = vi.mocked(fs.copyFile);
      const mockWriteFile = vi.mocked(fs.writeFile);

      mockAccess.mockResolvedValue(undefined);

      await initializeUserEnvironment();

      const FORGE_ENABLED_MARKER = path.join(CLAUDE_DIR, "FORGE-ENABLED");

      expect(mockAccess).toHaveBeenCalledTimes(1);
      expect(mockAccess).toHaveBeenCalledWith(FORGE_ENABLED_MARKER);
      expect(mockMkdir).not.toHaveBeenCalled();
      expect(mockCopyFile).not.toHaveBeenCalled();
      expect(mockWriteFile).not.toHaveBeenCalled();
    });

    it("should create runtime directories on first run", async () => {
      const mockAccess = vi.mocked(fs.access);
      const mockMkdir = vi.mocked(fs.mkdir);
      const mockWriteFile = vi.mocked(fs.writeFile);

      let accessCallCount = 0;
      mockAccess.mockImplementation(async () => {
        accessCallCount++;
        if (accessCallCount === 1) {
          throw new Error("ENOENT");
        }
        throw new Error("ENOENT");
      });

      mockMkdir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);

      await initializeUserEnvironment();

      const expectedDirs = [
        path.join(CLAUDE_DIR, "memory"),
        path.join(CLAUDE_DIR, "checkpoints"),
        path.join(CLAUDE_DIR, "features"),
        path.join(CLAUDE_DIR, "reports"),
        path.join(CLAUDE_DIR, "state"),
      ];

      expect(mockMkdir).toHaveBeenCalledTimes(expectedDirs.length);
      for (const dir of expectedDirs) {
        expect(mockMkdir).toHaveBeenCalledWith(dir, { recursive: true });
      }
    });

    it("should copy template files if they exist", async () => {
      const mockAccess = vi.mocked(fs.access);
      const mockMkdir = vi.mocked(fs.mkdir);
      const mockCopyFile = vi.mocked(fs.copyFile);
      const mockWriteFile = vi.mocked(fs.writeFile);

      let accessCallCount = 0;
      mockAccess.mockImplementation(async () => {
        accessCallCount++;
        if (accessCallCount === 1) {
          throw new Error("ENOENT"); // FORGE-ENABLED doesn't exist
        }
        if (accessCallCount === 2) {
          return undefined; // VISION.template.md exists
        }
        if (accessCallCount === 3) {
          throw new Error("ENOENT"); // VISION.md doesn't exist
        }
        if (accessCallCount === 4) {
          return undefined; // state.json.template exists
        }
        if (accessCallCount === 5) {
          throw new Error("ENOENT"); // state.json doesn't exist
        }
        throw new Error("ENOENT");
      });

      mockMkdir.mockResolvedValue(undefined);
      mockCopyFile.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);

      await initializeUserEnvironment();

      expect(mockCopyFile).toHaveBeenCalledTimes(2);
      expect(mockCopyFile).toHaveBeenCalledWith(
        path.join(CLAUDE_DIR, "VISION.template.md"),
        path.join(CLAUDE_DIR, "VISION.md"),
      );
      expect(mockCopyFile).toHaveBeenCalledWith(
        path.join(CLAUDE_DIR, "state.json.template"),
        path.join(CLAUDE_DIR, "forge", "state.json"),
      );
    });

    it("should skip copying if template files don't exist", async () => {
      const mockAccess = vi.mocked(fs.access);
      const mockMkdir = vi.mocked(fs.mkdir);
      const mockCopyFile = vi.mocked(fs.copyFile);
      const mockWriteFile = vi.mocked(fs.writeFile);

      mockAccess.mockImplementation(async () => {
        throw new Error("ENOENT");
      });

      mockMkdir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);

      await initializeUserEnvironment();

      expect(mockCopyFile).not.toHaveBeenCalled();
    });

    it("should skip copying if destination files already exist", async () => {
      const mockAccess = vi.mocked(fs.access);
      const mockMkdir = vi.mocked(fs.mkdir);
      const mockCopyFile = vi.mocked(fs.copyFile);
      const mockWriteFile = vi.mocked(fs.writeFile);

      let accessCallCount = 0;
      mockAccess.mockImplementation(async () => {
        accessCallCount++;
        if (accessCallCount === 1) {
          throw new Error("ENOENT"); // FORGE-ENABLED doesn't exist
        }
        // All other files exist (templates and destinations)
        return undefined;
      });

      mockMkdir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);

      await initializeUserEnvironment();

      expect(mockCopyFile).not.toHaveBeenCalled();
    });

    it("should create FORGE-ENABLED marker with correct metadata", async () => {
      const mockAccess = vi.mocked(fs.access);
      const mockMkdir = vi.mocked(fs.mkdir);
      const mockWriteFile = vi.mocked(fs.writeFile);

      const mockDate = new Date("2026-02-06T12:00:00Z");
      vi.useFakeTimers();
      vi.setSystemTime(mockDate);

      mockAccess.mockImplementation(async () => {
        throw new Error("ENOENT");
      });

      mockMkdir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);

      await initializeUserEnvironment();

      const expectedContent = JSON.stringify(
        {
          initialized: mockDate.toISOString(),
          version: "3.0.0",
        },
        null,
        2,
      );

      const FORGE_ENABLED_MARKER = path.join(CLAUDE_DIR, "FORGE-ENABLED");
      expect(mockWriteFile).toHaveBeenCalledWith(
        FORGE_ENABLED_MARKER,
        expectedContent,
      );

      vi.useRealTimers();
    });

    it("should handle errors during directory creation gracefully", async () => {
      const mockAccess = vi.mocked(fs.access);
      const mockMkdir = vi.mocked(fs.mkdir);
      const mockWriteFile = vi.mocked(fs.writeFile);

      mockAccess.mockImplementation(async () => {
        throw new Error("ENOENT");
      });

      let mkdirCallCount = 0;
      mockMkdir.mockImplementation(async () => {
        mkdirCallCount++;
        if (mkdirCallCount === 2) {
          throw new Error("Permission denied");
        }
        return undefined;
      });

      mockWriteFile.mockResolvedValue(undefined);

      await expect(initializeUserEnvironment()).resolves.not.toThrow();

      const FORGE_ENABLED_MARKER = path.join(CLAUDE_DIR, "FORGE-ENABLED");
      expect(mockWriteFile).toHaveBeenCalledWith(
        FORGE_ENABLED_MARKER,
        expect.stringMatching(/"initialized":/),
      );
    });
  });

  describe("isInitialized", () => {
    it("should return true if marker file exists", async () => {
      const mockAccess = vi.mocked(fs.access);
      mockAccess.mockResolvedValueOnce(undefined);

      const result = await isInitialized();

      const FORGE_ENABLED_MARKER = path.join(CLAUDE_DIR, "FORGE-ENABLED");
      expect(result).toBe(true);
      expect(mockAccess).toHaveBeenCalledWith(FORGE_ENABLED_MARKER);
    });

    it("should return false if marker file does not exist", async () => {
      const mockAccess = vi.mocked(fs.access);
      mockAccess.mockRejectedValueOnce(new Error("ENOENT"));

      const result = await isInitialized();

      const FORGE_ENABLED_MARKER = path.join(CLAUDE_DIR, "FORGE-ENABLED");
      expect(result).toBe(false);
      expect(mockAccess).toHaveBeenCalledWith(FORGE_ENABLED_MARKER);
    });
  });

  describe("getInitializationInfo", () => {
    it("should return initialization metadata if marker exists", async () => {
      const mockReadFile = vi.mocked(fs.readFile);
      const mockData = {
        initialized: "2026-02-06T12:00:00Z",
        version: "3.0.0",
      };

      mockReadFile.mockResolvedValueOnce(JSON.stringify(mockData));

      const result = await getInitializationInfo();

      const FORGE_ENABLED_MARKER = path.join(CLAUDE_DIR, "FORGE-ENABLED");
      expect(result).toEqual(mockData);
      expect(mockReadFile).toHaveBeenCalledWith(FORGE_ENABLED_MARKER, "utf-8");
    });

    it("should return null if marker file does not exist", async () => {
      const mockReadFile = vi.mocked(fs.readFile);
      mockReadFile.mockRejectedValueOnce(new Error("ENOENT"));

      const result = await getInitializationInfo();

      expect(result).toBeNull();
    });

    it("should return null if marker file contains invalid JSON", async () => {
      const mockReadFile = vi.mocked(fs.readFile);
      mockReadFile.mockResolvedValueOnce("invalid json {" as any);

      const result = await getInitializationInfo();

      expect(result).toBeNull();
    });

    it("should handle read permission errors", async () => {
      const mockReadFile = vi.mocked(fs.readFile);
      mockReadFile.mockRejectedValueOnce(new Error("EACCES"));

      const result = await getInitializationInfo();

      expect(result).toBeNull();
    });
  });

  describe("edge cases and integration", () => {
    it("should handle process.cwd() being called for relative paths", async () => {
      const mockAccess = vi.mocked(fs.access);
      const mockMkdir = vi.mocked(fs.mkdir);
      const mockWriteFile = vi.mocked(fs.writeFile);
      const mockCwd = "/home/user/project";

      vi.spyOn(process, "cwd").mockReturnValue(mockCwd);

      mockAccess.mockImplementation(async () => {
        throw new Error("ENOENT");
      });

      mockMkdir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);

      await initializeUserEnvironment();

      const FORGE_ENABLED_MARKER = path.join(CLAUDE_DIR, "FORGE-ENABLED");
      expect(mockWriteFile).toHaveBeenCalledWith(
        FORGE_ENABLED_MARKER,
        expect.stringMatching(/"initialized":/),
      );
    });

    it("should maintain correct state across multiple initialization attempts", async () => {
      const mockAccess = vi.mocked(fs.access);
      const mockMkdir = vi.mocked(fs.mkdir);
      const mockWriteFile = vi.mocked(fs.writeFile);

      // First run - not initialized
      mockAccess.mockRejectedValue(new Error("ENOENT"));
      mockMkdir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);

      await initializeUserEnvironment();

      expect(mockWriteFile).toHaveBeenCalledTimes(1);

      vi.clearAllMocks();

      // Second run - already initialized
      mockAccess.mockResolvedValue(undefined);

      await initializeUserEnvironment();

      expect(mockWriteFile).not.toHaveBeenCalled();
    });

    it("should handle partial initialization gracefully", async () => {
      const mockAccess = vi.mocked(fs.access);
      const mockMkdir = vi.mocked(fs.mkdir);
      const mockWriteFile = vi.mocked(fs.writeFile);

      mockAccess.mockImplementation(async () => {
        throw new Error("ENOENT");
      });

      let mkdirCallCount = 0;
      mockMkdir.mockImplementation(async () => {
        mkdirCallCount++;
        if (mkdirCallCount === 3) {
          throw new Error("Disk full");
        }
        return undefined;
      });

      mockWriteFile.mockResolvedValue(undefined);

      await expect(initializeUserEnvironment()).resolves.not.toThrow();

      const FORGE_ENABLED_MARKER = path.join(CLAUDE_DIR, "FORGE-ENABLED");
      expect(mockWriteFile).toHaveBeenCalledWith(
        FORGE_ENABLED_MARKER,
        expect.stringMatching(/"initialized":/),
      );
    });

    it("should respect file system case sensitivity", async () => {
      const mockAccess = vi.mocked(fs.access);
      const mockMkdir = vi.mocked(fs.mkdir);
      const mockWriteFile = vi.mocked(fs.writeFile);

      mockAccess.mockImplementation(async () => {
        throw new Error("ENOENT");
      });

      mockMkdir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);

      await initializeUserEnvironment();

      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining("FORGE-ENABLED"),
        expect.stringMatching(/"initialized":/),
      );

      const createDirCalls = mockMkdir.mock.calls;
      expect(createDirCalls.some((call) => call[0].includes("memory"))).toBe(
        true,
      );
      expect(
        createDirCalls.some((call) => call[0].includes("checkpoints")),
      ).toBe(true);
    });
  });
});
