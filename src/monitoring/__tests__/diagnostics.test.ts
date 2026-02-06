/**
 * Diagnostic Tools Tests
 * Comprehensive tests for system diagnostics and troubleshooting utilities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { DiagnosticTools, DiagnosticReport, DiagnosticResult } from "../diagnostics";
import * as fs from "fs";
import * as path from "path";
import * as childProcess from "child_process";
import * as os from "os";
import * as dns from "dns";
import { HealthMonitor } from "../health";
import { PerformanceMonitor } from "../performance";
import { ErrorTracker } from "../errors";

// Mock local module dependencies
vi.mock("../health", () => {
  class MockHealthMonitor {
    constructor(public projectPath: string) {}
    async performHealthCheck() {
      return { score: 95 };
    }
  }
  return { HealthMonitor: MockHealthMonitor };
});

vi.mock("../performance", () => {
  class MockPerformanceMonitor {
    start() {}
    stop() {}
    generateReport() {
      return { duration: 1000, metrics: [] };
    }
  }
  return { PerformanceMonitor: MockPerformanceMonitor };
});

vi.mock("../errors", () => {
  class MockErrorTracker {
    constructor(public projectPath: string) {}
    generateReport() {
      return { totalErrors: 0 };
    }
  }
  return { ErrorTracker: MockErrorTracker };
});

// Mock Node built-in modules with factories
vi.mock("fs", async () => {
  const actual = await vi.importActual<typeof import("fs")>("fs");
  return {
    default: actual,
    ...actual,
    existsSync: vi.fn(),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
    readFileSync: vi.fn(),
    unlinkSync: vi.fn(),
    readdirSync: vi.fn(),
  };
});

vi.mock("child_process", async () => {
  const actual = await vi.importActual<typeof import("child_process")>("child_process");
  const mocked = {
    ...actual,
    execSync: vi.fn(),
  };
  return {
    ...mocked,
    default: mocked,
  };
});

vi.mock("os", async () => {
  const actual = await vi.importActual<typeof import("os")>("os");
  const mocked = {
    ...actual,
    totalmem: vi.fn().mockReturnValue(16 * 1024 * 1024 * 1024),
    freemem: vi.fn().mockReturnValue(8 * 1024 * 1024 * 1024),
    platform: vi.fn().mockReturnValue('linux'),
    cpus: vi.fn().mockReturnValue([{ model: 'Test CPU', speed: 2400, times: { user: 0, nice: 0, sys: 0, idle: 0, irq: 0 } }]),
  };
  return {
    ...mocked,
    default: mocked,
  };
});

const { mockDnsResolve4 } = vi.hoisted(() => ({
  mockDnsResolve4: vi.fn().mockResolvedValue(["127.0.0.1"]),
}));
vi.mock("dns", async () => {
  const actual = await vi.importActual<typeof import("dns")>("dns");
  const mocked = {
    ...actual,
    promises: {
      ...actual.promises,
      resolve4: mockDnsResolve4,
    },
  };
  return {
    ...mocked,
    default: mocked,
  };
});

describe("DiagnosticTools", () => {
  let diagnosticTools: DiagnosticTools;
  let mockProjectPath: string;

  beforeEach(() => {
    mockProjectPath = "/test/project";
    vi.clearAllMocks();

    // Set up fs mocks
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.mkdirSync).mockReturnValue(undefined);
    vi.mocked(fs.writeFileSync).mockReturnValue(undefined);
    vi.mocked(fs.readFileSync).mockReturnValue("test content");
    vi.mocked(fs.unlinkSync).mockReturnValue(undefined);
    vi.mocked(fs.readdirSync).mockReturnValue([] as any);

    // Set up child_process mock
    vi.mocked(childProcess.execSync).mockReturnValue("");

    // Set up os mocks
    vi.mocked(os.totalmem).mockReturnValue(16 * 1024 * 1024 * 1024);
    vi.mocked(os.freemem).mockReturnValue(8 * 1024 * 1024 * 1024);
    vi.mocked(os.platform).mockReturnValue('linux' as NodeJS.Platform);
    vi.mocked(os.cpus).mockReturnValue([{ model: 'Test CPU', speed: 2400, times: { user: 0, nice: 0, sys: 0, idle: 0, irq: 0 } }]);

    // Set up dns mock
    mockDnsResolve4.mockResolvedValue(["127.0.0.1"]);

    // Create diagnosticTools after mocks are set up
    diagnosticTools = new DiagnosticTools(mockProjectPath);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should create with default project path", () => {
      const tools = new DiagnosticTools();
      expect(tools).toBeDefined();
    });

    it("should create with custom project path", () => {
      const tools = new DiagnosticTools("/custom/path");
      expect(tools).toBeDefined();
    });
  });

  describe("runDiagnostics", () => {
    beforeEach(() => {
      // Ensure all mocks are set for successful test run
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.mkdirSync).mockReturnValue(undefined);
      vi.mocked(fs.writeFileSync).mockReturnValue(undefined);
      vi.mocked(fs.readFileSync).mockReturnValue("test content");
      vi.mocked(fs.unlinkSync).mockReturnValue(undefined);
      vi.mocked(fs.readdirSync).mockReturnValue([] as any);

      vi.mocked(childProcess.execSync).mockReturnValue("");

      mockDnsResolve4.mockResolvedValue(["127.0.0.1"]);
    });

    it("should run all diagnostic tests", async () => {
      const report = await diagnosticTools.runDiagnostics();

      expect(report).toBeDefined();
      expect(report.timestamp).toBeInstanceOf(Date);
      expect(report.projectPath).toBe(mockProjectPath);
      expect(report.results).toBeInstanceOf(Array);
      expect(report.results.length).toBeGreaterThan(0);
    });

    it("should include system info", async () => {
      const report = await diagnosticTools.runDiagnostics();

      expect(report.systemInfo).toBeDefined();
      expect(report.systemInfo.platform).toBeDefined();
      expect(report.systemInfo.nodeVersion).toBeDefined();
      expect(report.systemInfo.memory).toBeDefined();
      expect(report.systemInfo.cpu).toBeDefined();
    });

    it("should calculate test statistics", async () => {
      const report = await diagnosticTools.runDiagnostics();

      expect(report.totalTests).toBe(report.results.length);
      expect(report.passed).toBeGreaterThanOrEqual(0);
      expect(report.failed).toBeGreaterThanOrEqual(0);
      expect(report.passed + report.failed).toBe(report.totalTests);
      expect(report.duration).toBeGreaterThan(0);
    });

    it("should generate recommendations", async () => {
      const report = await diagnosticTools.runDiagnostics();

      expect(report.recommendations).toBeInstanceOf(Array);
    });

    it("should handle test failures gracefully", async () => {
      vi.mocked(fs.existsSync).mockImplementation(() => {
        throw new Error("File system error");
      });

      const report = await diagnosticTools.runDiagnostics();

      expect(report.failed).toBeGreaterThan(0);
      expect(report.results.some((r) => !r.passed)).toBe(true);
    });

    it("should measure test duration", async () => {
      const report = await diagnosticTools.runDiagnostics();

      expect(report.duration).toBeGreaterThan(0);
      expect(report.results.every((r) => r.duration >= 0)).toBe(true);
    });
  });

  describe("testFileSystem", () => {
    it("should pass when file operations work", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.mkdirSync).mockReturnValue(undefined);
      vi.mocked(fs.writeFileSync).mockReturnValue(undefined);
      vi.mocked(fs.readFileSync).mockReturnValue("diagnostic test");
      vi.mocked(fs.unlinkSync).mockReturnValue(undefined);

      const report = await diagnosticTools.runDiagnostics();
      const fsTest = report.results.find((r) => r.name === "File System Access");

      expect(fsTest).toBeDefined();
      expect(fsTest?.passed).toBe(true);
      expect(fsTest?.message).toContain("working correctly");
    });

    it("should fail when directory doesn't exist and cannot be created", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.mkdirSync).mockImplementation(() => {
        throw new Error("Permission denied");
      });

      const report = await diagnosticTools.runDiagnostics();
      const fsTest = report.results.find((r) => r.name === "File System Access");

      expect(fsTest?.passed).toBe(false);
      expect(fsTest?.message).toContain("error");
    });

    it("should fail when write fails", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.writeFileSync).mockImplementation(() => {
        throw new Error("Write failed");
      });

      const report = await diagnosticTools.runDiagnostics();
      const fsTest = report.results.find((r) => r.name === "File System Access");

      expect(fsTest?.passed).toBe(false);
    });
  });

  describe("testProjectStructure", () => {
    it("should pass when all required directories exist", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      const report = await diagnosticTools.runDiagnostics();
      const structureTest = report.results.find((r) => r.name === "Project Structure");

      expect(structureTest?.passed).toBe(true);
      expect(structureTest?.message).toContain("All required directories present");
    });

    it("should fail when directories are missing", async () => {
      vi.mocked(fs.existsSync).mockImplementation((filePath: any) => {
        return !filePath.includes(".claude");
      });

      const report = await diagnosticTools.runDiagnostics();
      const structureTest = report.results.find((r) => r.name === "Project Structure");

      expect(structureTest?.passed).toBe(false);
      expect(structureTest?.message).toContain("Missing directories");
      expect(structureTest?.details?.missing).toBeDefined();
    });

    it("should provide recommendation when directories are missing", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const report = await diagnosticTools.runDiagnostics();
      const structureTest = report.results.find((r) => r.name === "Project Structure");

      expect(structureTest?.recommendation).toContain("initialization");
    });
  });

  describe("testDependencies", () => {
    it("should pass when package.json and node_modules exist", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({
          dependencies: { react: "^18.0.0", express: "^4.0.0" },
          devDependencies: { vitest: "^1.0.0", typescript: "^5.0.0" },
        })
      );

      const report = await diagnosticTools.runDiagnostics();
      const depTest = report.results.find((r) => r.name === "Dependencies");

      expect(depTest?.passed).toBe(true);
      expect(depTest?.message).toContain("dependencies");
    });

    it("should fail when package.json doesn't exist", async () => {
      vi.mocked(fs.existsSync).mockImplementation((filePath: any) => {
        return !filePath.includes("package.json");
      });

      const report = await diagnosticTools.runDiagnostics();
      const depTest = report.results.find((r) => r.name === "Dependencies");

      expect(depTest?.passed).toBe(false);
      expect(depTest?.message).toContain("package.json not found");
    });

    it("should fail when node_modules doesn't exist", async () => {
      vi.mocked(fs.existsSync).mockImplementation((filePath: any) => {
        return !filePath.includes("node_modules");
      });

      const report = await diagnosticTools.runDiagnostics();
      const depTest = report.results.find((r) => r.name === "Dependencies");

      expect(depTest?.passed).toBe(false);
      expect(depTest?.message).toContain("not installed");
    });

    it("should count dependencies correctly", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({
          dependencies: { a: "1", b: "2", c: "3" },
          devDependencies: { d: "1", e: "2" },
        })
      );

      const report = await diagnosticTools.runDiagnostics();
      const depTest = report.results.find((r) => r.name === "Dependencies");

      expect(depTest?.details?.dependencies).toBe(3);
      expect(depTest?.details?.devDependencies).toBe(2);
    });
  });

  describe("testAgentConfiguration", () => {
    it("should pass when all agents are configured", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue([
        "orchestrator.md",
        "architect.md",
        "developer.md",
        "qa.md",
        "devops.md",
      ] as any);

      const report = await diagnosticTools.runDiagnostics();
      const agentTest = report.results.find((r) => r.name === "Agent Configuration");

      expect(agentTest?.passed).toBe(true);
      expect(agentTest?.message).toContain("agents configured");
    });

    it("should fail when agents directory doesn't exist", async () => {
      vi.mocked(fs.existsSync).mockImplementation((filePath: any) => {
        return !filePath.includes("agents");
      });

      const report = await diagnosticTools.runDiagnostics();
      const agentTest = report.results.find((r) => r.name === "Agent Configuration");

      expect(agentTest?.passed).toBe(false);
      expect(agentTest?.message).toContain("not found");
    });

    it("should detect missing agents", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue(["orchestrator.md", "architect.md"] as any);

      const report = await diagnosticTools.runDiagnostics();
      const agentTest = report.results.find((r) => r.name === "Agent Configuration");

      expect(agentTest?.passed).toBe(false);
      expect(agentTest?.message).toContain("Missing agents");
    });
  });

  describe("testStateManagement", () => {
    it("should pass when state file is valid", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockImplementation((filePath: any) => {
        if (filePath.includes('current.json')) {
          return JSON.stringify({
            version: "1.0.0",
            projectName: "test-project",
            timestamp: new Date().toISOString(),
          });
        }
        return "test content";
      });
      const tools = new DiagnosticTools(mockProjectPath);

      const report = await tools.runDiagnostics();
      const stateTest = report.results.find((r) => r.name === "State Management");

      expect(stateTest?.passed).toBe(true);
      expect(stateTest?.message).toContain("configured correctly");
    });

    it("should fail when state file doesn't exist", async () => {
      vi.mocked(fs.existsSync).mockImplementation((filePath: any) => {
        return !filePath.includes("current.json");
      });

      const report = await diagnosticTools.runDiagnostics();
      const stateTest = report.results.find((r) => r.name === "State Management");

      expect(stateTest?.passed).toBe(false);
      expect(stateTest?.message).toContain("not found");
    });

    it("should fail when state file is missing required fields", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockImplementation((filePath: any) => {
        if (filePath.includes('current.json')) {
          return JSON.stringify({ version: "1.0.0" });
        }
        return "test content";
      });
      const tools = new DiagnosticTools(mockProjectPath);

      const report = await tools.runDiagnostics();
      const stateTest = report.results.find((r) => r.name === "State Management");

      expect(stateTest?.passed).toBe(false);
      expect(stateTest?.message).toContain("missing required fields");
    });
  });

  describe("testCommandConfiguration", () => {
    it("should pass when commands exist", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue(["status.md", "init.md", "deploy.md"] as any);

      const report = await diagnosticTools.runDiagnostics();
      const cmdTest = report.results.find((r) => r.name === "Command Configuration");

      expect(cmdTest?.passed).toBe(true);
      expect(cmdTest?.message).toContain("3 commands configured");
    });

    it("should fail when commands directory doesn't exist", async () => {
      vi.mocked(fs.existsSync).mockImplementation((filePath: any) => {
        return !filePath.includes("commands");
      });

      const report = await diagnosticTools.runDiagnostics();
      const cmdTest = report.results.find((r) => r.name === "Command Configuration");

      expect(cmdTest?.passed).toBe(false);
    });

    it("should fail when no commands are configured", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue([] as any);

      const report = await diagnosticTools.runDiagnostics();
      const cmdTest = report.results.find((r) => r.name === "Command Configuration");

      expect(cmdTest?.passed).toBe(false);
    });
  });

  describe("testGitRepository", () => {
    it("should pass when git repository is clean", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(childProcess.execSync).mockImplementation((cmd) => {
        if (cmd.toString().includes('git status')) {
          return "";
        }
        return "";
      });
      const tools = new DiagnosticTools(mockProjectPath);

      const report = await tools.runDiagnostics();
      const gitTest = report.results.find((r) => r.name === "Git Repository");

      expect(gitTest?.passed).toBe(true);
      expect(gitTest?.message).toContain("clean");
    });

    it("should pass when git repository has changes", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(childProcess.execSync).mockImplementation((cmd) => {
        if (cmd.toString().includes('git status')) {
          return " M file.txt\n?? newfile.txt";
        }
        return "";
      });
      const tools = new DiagnosticTools(mockProjectPath);

      const report = await tools.runDiagnostics();
      const gitTest = report.results.find((r) => r.name === "Git Repository");

      expect(gitTest?.passed).toBe(true);
      expect(gitTest?.message).toContain("uncommitted changes");
    });

    it("should fail when not a git repository", async () => {
      vi.mocked(fs.existsSync).mockImplementation((filePath: any) => {
        return !filePath.includes(".git");
      });

      const report = await diagnosticTools.runDiagnostics();
      const gitTest = report.results.find((r) => r.name === "Git Repository");

      expect(gitTest?.passed).toBe(false);
      expect(gitTest?.message).toContain("Not a git repository");
    });
  });

  describe("testNetworkConnectivity", () => {
    it("should pass when network is available", async () => {
      mockDnsResolve4.mockResolvedValue(["192.168.1.1"]);
      const tools = new DiagnosticTools(mockProjectPath);

      const report = await tools.runDiagnostics();
      const netTest = report.results.find((r) => r.name === "Network Connectivity");

      expect(netTest?.passed).toBe(true);
      expect(netTest?.message).toContain("verified");
    });

    it("should fail when network is unavailable", async () => {
      mockDnsResolve4.mockRejectedValue(new Error("ENOTFOUND"));
      const tools = new DiagnosticTools(mockProjectPath);

      const report = await tools.runDiagnostics();
      const netTest = report.results.find((r) => r.name === "Network Connectivity");

      expect(netTest?.passed).toBe(false);
      expect(netTest?.message).toContain("failed");
    });
  });

  describe("testMemoryUsage", () => {
    it("should pass when memory usage is normal", async () => {
      vi.mocked(os.totalmem).mockReturnValue(16 * 1024 * 1024 * 1024); // 16GB
      vi.mocked(os.freemem).mockReturnValue(8 * 1024 * 1024 * 1024); // 8GB free

      const report = await diagnosticTools.runDiagnostics();
      const memTest = report.results.find((r) => r.name === "Memory Usage");

      expect(memTest?.passed).toBe(true);
      expect(memTest?.message).toContain("Memory usage");
    });

    it("should fail when memory usage is high", async () => {
      const totalMem = 16 * 1024 * 1024 * 1024; // 16GB
      const freeMem = 1 * 1024 * 1024 * 1024; // 1GB free (93.75% used)
      vi.mocked(os.totalmem).mockReturnValue(totalMem);
      vi.mocked(os.freemem).mockReturnValue(freeMem);
      const tools = new DiagnosticTools(mockProjectPath);

      const report = await tools.runDiagnostics();
      const memTest = report.results.find((r) => r.name === "Memory Usage");

      expect(memTest?.passed).toBe(false);
      expect(memTest?.recommendation).toContain("High memory usage");
    });
  });

  describe("testDiskSpace", () => {
    it("should pass when disk space is sufficient", async () => {
      // Mock df command - returns last line only due to 'tail -1' in command
      vi.mocked(childProcess.execSync).mockImplementation((cmd) => {
        if (cmd.toString().includes('df')) {
          return "/dev/sda1     1000000000 500000000 500000000  50%";
        }
        return "";
      });
      const tools = new DiagnosticTools(mockProjectPath);

      const report = await tools.runDiagnostics();
      const diskTest = report.results.find((r) => r.name === "Disk Space");

      expect(diskTest?.passed).toBe(true);
    });

    it("should fail when disk space is low", async () => {
      // Mock df command - returns last line only due to 'tail -1' in command
      vi.mocked(childProcess.execSync).mockImplementation((cmd) => {
        if (cmd.toString().includes('df')) {
          return "/dev/sda1     1000000000 920000000  80000000  92%";
        }
        return "";
      });
      const tools = new DiagnosticTools(mockProjectPath);

      const report = await tools.runDiagnostics();
      const diskTest = report.results.find((r) => r.name === "Disk Space");

      expect(diskTest?.passed).toBe(false);
      expect(diskTest?.recommendation).toContain("Low disk space");
    });
  });

  describe("enableDebugMode", () => {
    it("should enable debug mode with default options", () => {
      diagnosticTools.enableDebugMode();

      // Debug mode should be enabled (internal state)
      expect(() => diagnosticTools.enableDebugMode()).not.toThrow();
    });

    it("should enable debug mode with custom options", () => {
      diagnosticTools.enableDebugMode({
        verbose: true,
        traceErrors: true,
        profilePerformance: true,
        collectLogs: true,
      });

      expect(() => diagnosticTools.enableDebugMode()).not.toThrow();
    });

    it("should enable debug mode with output path", () => {
      diagnosticTools.enableDebugMode({
        verbose: true,
        outputPath: "/tmp/debug",
      });

      expect(() => diagnosticTools.enableDebugMode()).not.toThrow();
    });
  });

  describe("disableDebugMode", () => {
    it("should disable debug mode", () => {
      diagnosticTools.enableDebugMode();
      diagnosticTools.disableDebugMode();

      expect(() => diagnosticTools.disableDebugMode()).not.toThrow();
    });

    it("should disable debug mode when not enabled", () => {
      diagnosticTools.disableDebugMode();

      expect(() => diagnosticTools.disableDebugMode()).not.toThrow();
    });
  });

  describe("profilePerformance", () => {
    it("should profile performance for specified duration", async () => {
      vi.useFakeTimers();

      const profilePromise = diagnosticTools.profilePerformance(1000);
      vi.advanceTimersByTime(1000);
      const report = await profilePromise;

      expect(report).toBeDefined();

      vi.useRealTimers();
    });

    it("should use default duration", async () => {
      vi.useFakeTimers();

      const profilePromise = diagnosticTools.profilePerformance();
      vi.advanceTimersByTime(60000);
      const report = await profilePromise;

      expect(report).toBeDefined();

      vi.useRealTimers();
    });
  });

  describe("collectLogs", () => {
    it("should collect logs to default path", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.mkdirSync).mockReturnValue(undefined);
      vi.mocked(fs.writeFileSync).mockReturnValue(undefined);

      const logPath = await diagnosticTools.collectLogs();

      expect(logPath).toBeDefined();
      expect(fs.mkdirSync).toHaveBeenCalled();
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it("should collect logs to custom path", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.mkdirSync).mockReturnValue(undefined);
      vi.mocked(fs.writeFileSync).mockReturnValue(undefined);

      const customPath = "/custom/logs.json";
      const logPath = await diagnosticTools.collectLogs(customPath);

      expect(logPath).toBe(customPath);
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        customPath,
        expect.any(String)
      );
    });
  });

  describe("formatDiagnosticSummary", () => {
    it("should format diagnostic report", async () => {
      // Create a real diagnostics instance for this test
      const tools = new DiagnosticTools(mockProjectPath);

      const report: DiagnosticReport = {
        timestamp: new Date("2024-01-01T00:00:00Z"),
        projectPath: mockProjectPath,
        totalTests: 10,
        passed: 8,
        failed: 2,
        duration: 1500.25,
        results: [
          {
            name: "Test 1",
            category: "system",
            passed: true,
            duration: 100,
            message: "Success",
          },
          {
            name: "Test 2",
            category: "configuration",
            passed: false,
            duration: 50,
            message: "Failed",
            recommendation: "Fix configuration",
          },
        ],
        systemInfo: {
          platform: "linux",
          nodeVersion: "v20.0.0",
          npmVersion: "10.0.0",
          memory: { total: 16000, free: 8000, used: 8000 },
          disk: { total: 500000, free: 250000, used: 250000 },
          cpu: { cores: 8, model: "Intel Core i7", speed: 2800 },
        },
        recommendations: ["Fix issue 1", "Improve performance"],
      };

      const summary = tools.formatDiagnosticSummary(report);

      expect(summary).toContain("DIAGNOSTIC REPORT");
      expect(summary).toContain("Project: " + mockProjectPath);
      expect(summary).toContain("Total Tests: 10");
      expect(summary).toContain("Passed: 8");
      expect(summary).toContain("Failed: 2");
      expect(summary).toContain("FAILED TESTS");
      expect(summary).toContain("Test 2");
      expect(summary).toContain("Fix configuration");
      expect(summary).toContain("SYSTEM INFO");
      expect(summary).toContain("RECOMMENDATIONS");
    });

    it("should format report with all tests passing", () => {
      const tools = new DiagnosticTools(mockProjectPath);

      const report: DiagnosticReport = {
        timestamp: new Date("2024-01-01T00:00:00Z"),
        projectPath: mockProjectPath,
        totalTests: 5,
        passed: 5,
        failed: 0,
        duration: 500,
        results: [
          {
            name: "Test 1",
            category: "system",
            passed: true,
            duration: 100,
            message: "Success",
          },
        ],
        systemInfo: {
          platform: "linux",
          nodeVersion: "v20.0.0",
          npmVersion: "10.0.0",
          memory: { total: 16000, free: 8000, used: 8000 },
          disk: { total: 500000, free: 250000, used: 250000 },
          cpu: { cores: 8, model: "Intel Core i7", speed: 2800 },
        },
        recommendations: [],
      };

      const summary = tools.formatDiagnosticSummary(report);

      expect(summary).toContain("Passed: 5");
      expect(summary).toContain("Failed: 0");
      expect(summary).not.toContain("FAILED TESTS");
    });
  });

  describe("generateRecommendations", () => {
    it("should recommend system is healthy when all tests pass", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.mkdirSync).mockReturnValue(undefined);
      vi.mocked(fs.writeFileSync).mockReturnValue(undefined);
      vi.mocked(fs.readFileSync).mockImplementation((filePath: any) => {
        if (filePath.includes('package.json')) {
          return JSON.stringify({
            dependencies: { react: "^18.0.0" },
            devDependencies: { vitest: "^1.0.0" }
          });
        }
        if (filePath.includes('current.json')) {
          return JSON.stringify({
            version: "1.0.0",
            projectName: "test-project",
            timestamp: new Date().toISOString(),
          });
        }
        return "test content";
      });
      vi.mocked(fs.unlinkSync).mockReturnValue(undefined);
      vi.mocked(fs.readdirSync).mockImplementation((dirPath: any) => {
        if (dirPath.includes('agents')) {
          return [
            "orchestrator.md",
            "architect.md",
            "developer.md",
            "qa.md",
            "devops.md",
          ] as any;
        }
        if (dirPath.includes('commands')) {
          return ["status.md"] as any;
        }
        return [] as any;
      });
      vi.mocked(childProcess.execSync).mockImplementation((cmd) => {
        if (cmd.toString().includes('df')) {
          return "/dev/sda1     1000000000 500000000 500000000  50%";
        }
        if (cmd.toString().includes('npm --version')) {
          return "10.0.0";
        }
        return "";
      });
      mockDnsResolve4.mockResolvedValue(["127.0.0.1"]);

      const tools = new DiagnosticTools(mockProjectPath);
      const report = await tools.runDiagnostics();

      expect(report.recommendations).toContain(
        "System is healthy. All diagnostic tests passed."
      );
    });

    it("should generate specific recommendations for failures", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const report = await diagnosticTools.runDiagnostics();

      expect(report.recommendations.length).toBeGreaterThan(0);
      expect(report.failed).toBeGreaterThan(0);
    });
  });
});
