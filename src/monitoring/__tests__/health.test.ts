/**
 * Health Monitoring System Tests
 * Integration tests for health checks and monitoring
 *
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  HealthMonitor,
  HealthStatus,
  HealthCheckType,
  type HealthCheckResult,
} from "../health";
import * as fs from "fs";
import * as path from "node:path";
import { performance } from "perf_hooks";
import { Logger } from "../../utils/logger";

// Build a minimal, interface-valid HealthCheckResult for direct unit tests
// against the private calculateOverallScore/generateRecommendations methods.
function makeCheck(
  type: HealthCheckType,
  status: HealthStatus,
  score = 0,
): HealthCheckResult {
  return { type, status, score, latency: 1, message: "test", timestamp: new Date() };
}

// Force process.memoryUsage() to report a specific heap percentage so
// checkMemoryUsage's bucket ternary can be driven deterministically.
function mockMemoryUsage(heapPercentage: number) {
  return (vi.spyOn(process, "memoryUsage") as any).mockReturnValue({
    heapUsed: heapPercentage,
    heapTotal: 100,
    rss: 50 * 1024 * 1024,
    external: 0,
    arrayBuffers: 0,
  });
}

// The global test setup replaces "fs" with a bare-bones stub. This file needs
// real file system access for integration tests, PLUS the ability to force
// specific calls to throw (for catch-block branch coverage) without hitting
// Vite/vitest's "Cannot redefine property" error on the frozen ESM module
// namespace (vi.spyOn on the raw "fs" import fails for that reason). The fix:
// re-mock "fs" here with a factory that wraps only the functions we need to
// override in `vi.fn(actual.fn)` — a real, mutable, call-through-by-default
// mock — while every other export stays the genuine node:fs implementation.
vi.mock("fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("fs")>();
  return {
    ...actual,
    existsSync: vi.fn(actual.existsSync),
    statSync: vi.fn(actual.statSync),
    readFileSync: vi.fn(actual.readFileSync),
    writeFileSync: vi.fn(actual.writeFileSync),
    readdirSync: vi.fn(actual.readdirSync),
  };
});

describe("HealthMonitor", () => {
  let healthMonitor: HealthMonitor;
  const testProjectPath = path.join(__dirname, "test-project");

  beforeEach(() => {
    // Create test project structure
    fs.mkdirSync(testProjectPath, { recursive: true });
    fs.mkdirSync(path.join(testProjectPath, ".claude", "state"), {
      recursive: true,
    });
    fs.mkdirSync(path.join(testProjectPath, ".claude", "agents"), {
      recursive: true,
    });
    fs.mkdirSync(path.join(testProjectPath, ".claude", "commands"), {
      recursive: true,
    });
    fs.mkdirSync(path.join(testProjectPath, "src", "components"), {
      recursive: true,
    });
    fs.mkdirSync(path.join(testProjectPath, "src", "core"), {
      recursive: true,
    });

    // Create test files
    fs.writeFileSync(
      path.join(testProjectPath, ".claude", "state", "current.json"),
      JSON.stringify({ version: "1.0.0", projectName: "test" }),
    );

    fs.writeFileSync(
      path.join(testProjectPath, ".claude", "agents", "orchestrator.md"),
      "# Test Agent",
    );

    fs.writeFileSync(
      path.join(testProjectPath, ".claude", "commands", "test.md"),
      "# Test Command",
    );

    healthMonitor = new HealthMonitor(testProjectPath);
  });

  afterEach(() => {
    healthMonitor.stop();
    // Clean up test directory
    fs.rmSync(testProjectPath, { recursive: true, force: true });
  });

  describe("performHealthCheck", () => {
    it("should perform comprehensive health check", async () => {
      const health = await healthMonitor.performHealthCheck();

      expect(health).toBeDefined();
      expect(health.overallScore).toBeGreaterThanOrEqual(0);
      expect(health.overallScore).toBeLessThanOrEqual(100);
      expect(health.status).toBeDefined();
      expect(health.checks).toBeInstanceOf(Array);
      expect(health.checks.length).toBeGreaterThan(0);
      expect(health.uptime).toBeGreaterThanOrEqual(0);
    });

    it("should check all health check types", async () => {
      const health = await healthMonitor.performHealthCheck();
      const checkTypes = health.checks.map((c) => c.type);

      expect(checkTypes).toContain(HealthCheckType.UI_RESPONSIVENESS);
      expect(checkTypes).toContain(HealthCheckType.BACKEND_AVAILABILITY);
      expect(checkTypes).toContain(HealthCheckType.STATE_SYNC);
      expect(checkTypes).toContain(HealthCheckType.AGENT_EXECUTION);
      expect(checkTypes).toContain(HealthCheckType.FILE_SYSTEM);
      expect(checkTypes).toContain(HealthCheckType.MEMORY_USAGE);
      expect(checkTypes).toContain(HealthCheckType.COMMAND_PROCESSING);
      expect(checkTypes).toContain(HealthCheckType.AUTOMATION_SYSTEM);
    });

    it("should calculate correct overall score", async () => {
      const health = await healthMonitor.performHealthCheck();

      // Verify weighted calculation
      let weightedSum = 0;
      let totalWeight = 0;
      const weights = {
        [HealthCheckType.UI_RESPONSIVENESS]: 0.15,
        [HealthCheckType.BACKEND_AVAILABILITY]: 0.2,
        [HealthCheckType.STATE_SYNC]: 0.15,
        [HealthCheckType.AGENT_EXECUTION]: 0.15,
        [HealthCheckType.FILE_SYSTEM]: 0.1,
        [HealthCheckType.MEMORY_USAGE]: 0.1,
        [HealthCheckType.COMMAND_PROCESSING]: 0.1,
        [HealthCheckType.AUTOMATION_SYSTEM]: 0.05,
      };

      for (const check of health.checks) {
        const weight = weights[check.type] || 0;
        weightedSum += check.score * weight;
        totalWeight += weight;
      }

      const expectedScore = Math.round(weightedSum / totalWeight);
      expect(health.overallScore).toBe(expectedScore);
    });

    it("should determine correct health status", async () => {
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

    it("should generate recommendations for issues", async () => {
      // Remove some files to trigger issues
      fs.unlinkSync(
        path.join(testProjectPath, ".claude", "state", "current.json"),
      );

      const health = await healthMonitor.performHealthCheck();

      expect(health.recommendations).toBeDefined();
      expect(health.recommendations).toBeInstanceOf(Array);
      expect(health.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe("start/stop", () => {
    it("should start and stop monitoring", async () => {
      await healthMonitor.start(100); // 100ms interval for testing

      // Wait for at least one check
      await new Promise((resolve) => setTimeout(resolve, 150));

      const health = healthMonitor.getCurrentHealth();
      expect(health).toBeDefined();

      healthMonitor.stop();
    });

    it("should emit healthUpdate events", async () => {
      const updates: any[] = [];

      healthMonitor.on("healthUpdate", (health) => {
        updates.push(health);
      });

      await healthMonitor.start(100);
      await new Promise((resolve) => setTimeout(resolve, 250));

      healthMonitor.stop();

      expect(updates.length).toBeGreaterThan(0);
      expect(updates[0].overallScore).toBeDefined();
    });

    it("should emit statusChange events on status change", async () => {
      const changes: any[] = [];

      healthMonitor.on("statusChange", (change) => {
        changes.push(change);
      });

      await healthMonitor.start(100);
      await new Promise((resolve) => setTimeout(resolve, 250));

      healthMonitor.stop();

      // Changes array may be empty if status doesn't change
      if (changes.length > 0) {
        expect(changes[0].previous).toBeDefined();
        expect(changes[0].current).toBeDefined();
        expect(changes[0].score).toBeDefined();
      }
    });
  });

  describe("getHealthHistory", () => {
    it("should maintain health history", async () => {
      await healthMonitor.start(50);
      await new Promise((resolve) => setTimeout(resolve, 200));

      const history = healthMonitor.getHealthHistory();

      expect(history).toBeInstanceOf(Array);
      expect(history.length).toBeGreaterThan(0);
      expect(history.length).toBeLessThanOrEqual(100); // Max history size

      healthMonitor.stop();
    });
  });

  describe("getHealthTrends", () => {
    it("should calculate health trends", async () => {
      // Perform multiple checks
      for (let i = 0; i < 5; i++) {
        await healthMonitor.performHealthCheck();
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      const trends = healthMonitor.getHealthTrends();

      expect(trends.averageScore).toBeGreaterThanOrEqual(0);
      expect(trends.averageScore).toBeLessThanOrEqual(100);
      expect(["improving", "stable", "degrading"]).toContain(trends.trend);
      expect(trends.criticalCount).toBeGreaterThanOrEqual(0);
    });

    it("should return stable trend with insufficient data", () => {
      const trends = healthMonitor.getHealthTrends();

      expect(trends.trend).toBe("stable");
      expect(trends.criticalCount).toBe(0);
    });
  });

  describe("individual health checks", () => {
    it("should check UI responsiveness", async () => {
      const health = await healthMonitor.performHealthCheck();
      const uiCheck = health.checks.find(
        (c) => c.type === HealthCheckType.UI_RESPONSIVENESS,
      );

      expect(uiCheck).toBeDefined();
      expect(uiCheck!.score).toBeGreaterThanOrEqual(0);
      expect(uiCheck!.latency).toBeGreaterThan(0);
      expect(uiCheck!.message).toBeDefined();
    });

    it("should check backend availability", async () => {
      // Create backend files
      const corePath = path.join(testProjectPath, "src", "core");
      fs.writeFileSync(path.join(corePath, "orchestrator.ts"), "");
      fs.writeFileSync(path.join(corePath, "state.ts"), "");
      fs.writeFileSync(path.join(corePath, "coordination.ts"), "");
      fs.writeFileSync(path.join(corePath, "vision.ts"), "");

      const health = await healthMonitor.performHealthCheck();
      const backendCheck = health.checks.find(
        (c) => c.type === HealthCheckType.BACKEND_AVAILABILITY,
      );

      expect(backendCheck).toBeDefined();
      expect(backendCheck!.score).toBe(100);
      expect(backendCheck!.status).toBe(HealthStatus.HEALTHY);
    });

    it("should check state sync freshness", async () => {
      const health = await healthMonitor.performHealthCheck();
      const stateCheck = health.checks.find(
        (c) => c.type === HealthCheckType.STATE_SYNC,
      );

      expect(stateCheck).toBeDefined();
      expect(stateCheck!.details?.ageMinutes).toBeDefined();
      expect(stateCheck!.details?.lastModified).toBeDefined();
    });

    it("should check memory usage", async () => {
      const health = await healthMonitor.performHealthCheck();
      const memCheck = health.checks.find(
        (c) => c.type === HealthCheckType.MEMORY_USAGE,
      );

      expect(memCheck).toBeDefined();
      expect(memCheck!.details?.heapUsedMB).toBeGreaterThan(0);
      expect(memCheck!.details?.heapTotalMB).toBeGreaterThan(0);
      expect(memCheck!.details?.heapPercentage).toBeGreaterThan(0);
    });

    it("should check file system access", async () => {
      const health = await healthMonitor.performHealthCheck();
      const fsCheck = health.checks.find(
        (c) => c.type === HealthCheckType.FILE_SYSTEM,
      );

      expect(fsCheck).toBeDefined();
      expect(fsCheck!.status).toBe(HealthStatus.HEALTHY);
      expect(fsCheck!.score).toBe(100);
    });
  });

  // ------------------------------------------------------------------------
  // Branch-coverage hardening (NEXUS: P-03a forge-ui coverage sprint)
  // ------------------------------------------------------------------------

  describe("constructor projectPath fallback", () => {
    it("falls back to process.cwd() when no projectPath is given", async () => {
      vi.spyOn(Math, "random").mockReturnValue(0.1);
      const cwdMonitor = new HealthMonitor();
      const result = await (cwdMonitor as any).checkUIResponsiveness();
      // process.cwd() during `vitest run` is the forge-ui package root, which
      // has a real src/components directory, so the existence check passes.
      expect(result.status).toBe(HealthStatus.HEALTHY);
      expect(result.score).toBe(100);
      vi.restoreAllMocks();
    });
  });

  describe("start() default interval", () => {
    it("uses the 30000ms default when intervalMs is omitted", async () => {
      vi.useFakeTimers();
      const setIntervalSpy = vi.spyOn(global, "setInterval");

      await healthMonitor.start();
      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 30000);

      healthMonitor.stop();
      vi.useRealTimers();
    });
  });

  describe("stop() branches", () => {
    it("does nothing when checkInterval was never set", () => {
      const freshMonitor = new HealthMonitor(testProjectPath);
      const infoSpy = vi.spyOn(Logger.prototype, "info");

      expect(() => freshMonitor.stop()).not.toThrow();
      expect(infoSpy).not.toHaveBeenCalledWith("Health monitoring stopped");
      infoSpy.mockRestore();
    });

    it("clears the interval and logs when checkInterval is set", async () => {
      const infoSpy = vi.spyOn(Logger.prototype, "info");

      await healthMonitor.start(5000);
      healthMonitor.stop();

      expect(infoSpy).toHaveBeenCalledWith("Health monitoring stopped");
      infoSpy.mockRestore();
    });
  });

  describe("checkUIResponsiveness branches", () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("fails with the Error message when src/components is missing", async () => {
      fs.rmSync(path.join(testProjectPath, "src", "components"), {
        recursive: true,
        force: true,
      });
      const result = await (healthMonitor as any).checkUIResponsiveness();
      expect(result.status).toBe(HealthStatus.FAILED);
      expect(result.score).toBe(0);
      expect(result.message).toBe("UI check failed: UI components not found");
    });

    it("reports String(error) when existsSync throws a non-Error", async () => {
      (fs.existsSync as any).mockImplementationOnce(() => {
        throw "ui probe exploded";
      });
      const result = await (healthMonitor as any).checkUIResponsiveness();
      expect(result.message).toBe("UI check failed: ui probe exploded");
    });

    it("scores 100 (healthy) when simulated response time is under 50ms", async () => {
      vi.spyOn(Math, "random").mockReturnValue(0.1); // responseTime = 10ms
      const result = await (healthMonitor as any).checkUIResponsiveness();
      expect(result.score).toBe(100);
      expect(result.status).toBe(HealthStatus.HEALTHY);
    });

    it("scores 85 (healthy) when simulated response time is 50-99ms", async () => {
      vi.spyOn(Math, "random").mockReturnValue(0.6); // responseTime = 60ms
      const result = await (healthMonitor as any).checkUIResponsiveness();
      expect(result.score).toBe(85);
      expect(result.status).toBe(HealthStatus.HEALTHY);
    });

    it("scores 70 (degraded) when simulated response time reaches 100ms", async () => {
      // Math.random() is spec'd to [0,1), so responseTime = Math.random()*100
      // can never naturally reach 100 — this mock value is unrealistic but is
      // the only way to exercise the final ternary arm as written in source.
      vi.spyOn(Math, "random").mockReturnValue(1);
      const result = await (healthMonitor as any).checkUIResponsiveness();
      expect(result.score).toBe(70);
      expect(result.status).toBe(HealthStatus.DEGRADED);
    });
  });

  describe("checkBackendAvailability branches", () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });
    const corePath = () => path.join(testProjectPath, "src", "core");

    it("scores 0 and CRITICAL when no core files exist", async () => {
      const result = await (healthMonitor as any).checkBackendAvailability();
      expect(result.score).toBe(0);
      expect(result.status).toBe(HealthStatus.CRITICAL);
      expect(result.message).toBe("Backend systems: 0/4 available");
    });

    it("scores 50 and DEGRADED when half of the core files exist", async () => {
      fs.writeFileSync(path.join(corePath(), "orchestrator.ts"), "");
      fs.writeFileSync(path.join(corePath(), "state.ts"), "");
      const result = await (healthMonitor as any).checkBackendAvailability();
      expect(result.score).toBe(50);
      expect(result.status).toBe(HealthStatus.DEGRADED);
    });

    it("reports the Error message when existsSync throws an Error", async () => {
      (fs.existsSync as any).mockImplementationOnce(() => {
        throw new Error("core probe failed");
      });
      const result = await (healthMonitor as any).checkBackendAvailability();
      expect(result.message).toBe("Backend check failed: core probe failed");
    });

    it("reports String(error) when existsSync throws a non-Error", async () => {
      (fs.existsSync as any).mockImplementationOnce(() => {
        throw "core probe raw";
      });
      const result = await (healthMonitor as any).checkBackendAvailability();
      expect(result.message).toBe("Backend check failed: core probe raw");
    });
  });

  describe("checkStateSync branches", () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });
    const stateFile = () =>
      path.join(testProjectPath, ".claude", "state", "current.json");

    it("throws when the state file is missing", async () => {
      fs.rmSync(stateFile());
      const result = await (healthMonitor as any).checkStateSync();
      expect(result.status).toBe(HealthStatus.FAILED);
      expect(result.message).toBe(
        "State sync check failed: State file not found",
      );
    });

    it("scores 100 (healthy) when state is under 1 minute old", async () => {
      const now = new Date();
      fs.utimesSync(stateFile(), now, new Date(now.getTime() - 30 * 1000));
      const result = await (healthMonitor as any).checkStateSync();
      expect(result.score).toBe(100);
      expect(result.status).toBe(HealthStatus.HEALTHY);
    });

    it("scores 85 (healthy) when state is 1-4 minutes old", async () => {
      const now = new Date();
      fs.utimesSync(
        stateFile(),
        now,
        new Date(now.getTime() - 3 * 60 * 1000),
      );
      const result = await (healthMonitor as any).checkStateSync();
      expect(result.score).toBe(85);
      expect(result.status).toBe(HealthStatus.HEALTHY);
    });

    it("scores 70 (degraded) when state is 5-14 minutes old", async () => {
      const now = new Date();
      fs.utimesSync(
        stateFile(),
        now,
        new Date(now.getTime() - 10 * 60 * 1000),
      );
      const result = await (healthMonitor as any).checkStateSync();
      expect(result.score).toBe(70);
      expect(result.status).toBe(HealthStatus.DEGRADED);
    });

    it("scores 50 (critical) when state is 15+ minutes old", async () => {
      const now = new Date();
      fs.utimesSync(
        stateFile(),
        now,
        new Date(now.getTime() - 20 * 60 * 1000),
      );
      const result = await (healthMonitor as any).checkStateSync();
      expect(result.score).toBe(50);
      expect(result.status).toBe(HealthStatus.CRITICAL);
    });

    it("reports String(error) when statSync throws a non-Error", async () => {
      (fs.statSync as any).mockImplementationOnce(() => {
        throw "stat probe raw";
      });
      const result = await (healthMonitor as any).checkStateSync();
      expect(result.message).toBe("State sync check failed: stat probe raw");
    });
  });

  describe("checkAgentExecution branches", () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });
    const agentsPath = () => path.join(testProjectPath, ".claude", "agents");

    it("scores 20 and CRITICAL when only 1 of 5 agent files exist", async () => {
      // beforeEach only creates orchestrator.md
      const result = await (healthMonitor as any).checkAgentExecution();
      expect(result.score).toBe(20);
      expect(result.status).toBe(HealthStatus.CRITICAL);
    });

    it("scores 60 and DEGRADED when 3 of 5 agent files exist", async () => {
      fs.writeFileSync(path.join(agentsPath(), "architect.md"), "");
      fs.writeFileSync(path.join(agentsPath(), "developer.md"), "");
      const result = await (healthMonitor as any).checkAgentExecution();
      expect(result.score).toBe(60);
      expect(result.status).toBe(HealthStatus.DEGRADED);
    });

    it("scores 80 and HEALTHY when 4 of 5 agent files exist", async () => {
      fs.writeFileSync(path.join(agentsPath(), "architect.md"), "");
      fs.writeFileSync(path.join(agentsPath(), "developer.md"), "");
      fs.writeFileSync(path.join(agentsPath(), "qa.md"), "");
      const result = await (healthMonitor as any).checkAgentExecution();
      expect(result.score).toBe(80);
      expect(result.status).toBe(HealthStatus.HEALTHY);
    });

    it("reports the Error message when existsSync throws an Error", async () => {
      (fs.existsSync as any).mockImplementationOnce(() => {
        throw new Error("agent probe failed");
      });
      const result = await (healthMonitor as any).checkAgentExecution();
      expect(result.message).toBe("Agent check failed: agent probe failed");
    });

    it("reports String(error) when existsSync throws a non-Error", async () => {
      (fs.existsSync as any).mockImplementationOnce(() => {
        throw "agent probe raw";
      });
      const result = await (healthMonitor as any).checkAgentExecution();
      expect(result.message).toBe("Agent check failed: agent probe raw");
    });
  });

  describe("checkFileSystem branches", () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("throws when read content does not match written content", async () => {
      (fs.readFileSync as any).mockReturnValueOnce("corrupted");
      const result = await (healthMonitor as any).checkFileSystem();
      expect(result.status).toBe(HealthStatus.FAILED);
      expect(result.message).toBe(
        "File system check failed: File system read/write mismatch",
      );
    });

    it("reports String(error) when writeFileSync throws a non-Error", async () => {
      (fs.writeFileSync as any).mockImplementationOnce(() => {
        throw "disk full";
      });
      const result = await (healthMonitor as any).checkFileSystem();
      expect(result.message).toBe("File system check failed: disk full");
    });
  });

  describe("checkMemoryUsage branches", () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("scores 100 (healthy) when heap usage is below 70%", async () => {
      mockMemoryUsage(50);
      const result = await (healthMonitor as any).checkMemoryUsage();
      expect(result.score).toBe(100);
      expect(result.status).toBe(HealthStatus.HEALTHY);
    });

    it("scores 75 (healthy) when heap usage is between 70% and 85%", async () => {
      mockMemoryUsage(80);
      const result = await (healthMonitor as any).checkMemoryUsage();
      expect(result.score).toBe(75);
      expect(result.status).toBe(HealthStatus.HEALTHY);
    });

    it("scores 50 (degraded) when heap usage is between 85% and 95%", async () => {
      mockMemoryUsage(90);
      const result = await (healthMonitor as any).checkMemoryUsage();
      expect(result.score).toBe(50);
      expect(result.status).toBe(HealthStatus.DEGRADED);
    });

    it("scores 25 (critical) when heap usage is 95% or above", async () => {
      mockMemoryUsage(97);
      const result = await (healthMonitor as any).checkMemoryUsage();
      expect(result.score).toBe(25);
      expect(result.status).toBe(HealthStatus.CRITICAL);
    });

    it("reports the Error message when memoryUsage() throws an Error", async () => {
      (vi.spyOn(process, "memoryUsage") as any).mockImplementation(() => {
        throw new Error("mem read fail");
      });
      const result = await (healthMonitor as any).checkMemoryUsage();
      expect(result.status).toBe(HealthStatus.FAILED);
      expect(result.score).toBe(0);
      expect(result.message).toBe("Memory check failed: mem read fail");
    });

    it("reports String(error) when memoryUsage() throws a non-Error", async () => {
      (vi.spyOn(process, "memoryUsage") as any).mockImplementation(() => {
        throw "raw mem failure";
      });
      const result = await (healthMonitor as any).checkMemoryUsage();
      expect(result.message).toBe("Memory check failed: raw mem failure");
    });
  });

  describe("checkCommandProcessing branches", () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });
    const commandsPath = () =>
      path.join(testProjectPath, ".claude", "commands");

    it("throws when the commands directory does not exist", async () => {
      fs.rmSync(commandsPath(), { recursive: true, force: true });
      const result = await (healthMonitor as any).checkCommandProcessing();
      expect(result.status).toBe(HealthStatus.FAILED);
      expect(result.message).toBe(
        "Command check failed: Commands directory not found",
      );
    });

    it("scores 0 and FAILED when the commands directory has no .md files", async () => {
      fs.rmSync(path.join(commandsPath(), "test.md"));
      fs.writeFileSync(path.join(commandsPath(), "notes.txt"), "not a command");
      const result = await (healthMonitor as any).checkCommandProcessing();
      expect(result.score).toBe(0);
      expect(result.status).toBe(HealthStatus.FAILED);
      expect(result.message).toBe("Commands available: 0");
    });

    it("reports String(error) when readdirSync throws a non-Error", async () => {
      (fs.readdirSync as any).mockImplementationOnce(() => {
        throw "listing failed";
      });
      const result = await (healthMonitor as any).checkCommandProcessing();
      expect(result.message).toBe("Command check failed: listing failed");
    });
  });

  describe("checkAutomationSystem branches", () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });
    const configPath = () => path.join(testProjectPath, "claude.json");

    it("scores 100 and reports configured when claude.json exists", async () => {
      fs.writeFileSync(configPath(), "{}");
      const result = await (healthMonitor as any).checkAutomationSystem();
      expect(result.score).toBe(100);
      expect(result.status).toBe(HealthStatus.HEALTHY);
      expect(result.message).toBe("Automation configured");
    });

    it("scores 75 and reports not configured when claude.json is absent", async () => {
      const result = await (healthMonitor as any).checkAutomationSystem();
      expect(result.score).toBe(75);
      expect(result.message).toBe("Automation not configured");
    });

    it("degrades with the Error message when existsSync throws an Error", async () => {
      (fs.existsSync as any).mockImplementationOnce(() => {
        throw new Error("automation probe failed");
      });
      const result = await (healthMonitor as any).checkAutomationSystem();
      expect(result.status).toBe(HealthStatus.DEGRADED);
      expect(result.score).toBe(50);
      expect(result.message).toBe(
        "Automation check warning: automation probe failed",
      );
    });

    it("degrades with String(error) when existsSync throws a non-Error", async () => {
      (fs.existsSync as any).mockImplementationOnce(() => {
        throw "raw probe failure";
      });
      const result = await (healthMonitor as any).checkAutomationSystem();
      expect(result.message).toBe(
        "Automation check warning: raw probe failure",
      );
    });
  });

  describe("performHealthCheck orchestration branches", () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("converts a rejected check into a synthetic BACKEND_AVAILABILITY failure carrying the Error message", async () => {
      let callCount = 0;
      const realNow = performance.now.bind(performance);
      vi.spyOn(performance, "now").mockImplementation(() => {
        callCount++;
        // Call #2 is checkUIResponsiveness's `const start = performance.now()`,
        // which sits before its own try/catch — throwing here escapes the
        // async function entirely, producing a genuine Promise rejection.
        if (callCount === 2) {
          throw new Error("clock failure");
        }
        return realNow();
      });

      const health = await healthMonitor.performHealthCheck();

      expect(health.checks).toHaveLength(8);
      expect(
        health.checks.find((c) => c.type === HealthCheckType.UI_RESPONSIVENESS),
      ).toBeUndefined();
      const failure = health.checks.find(
        (c) =>
          c.type === HealthCheckType.BACKEND_AVAILABILITY &&
          c.status === HealthStatus.FAILED,
      );
      expect(failure).not.toBeUndefined();
      expect(failure!.score).toBe(0);
      expect(failure!.message).toBe("Health check failed");
      expect(failure!.details?.error).toBe("clock failure");
    });

    it("falls back to 'Unknown error' when the rejection reason is nullish", async () => {
      let callCount = 0;
      const realNow = performance.now.bind(performance);
      vi.spyOn(performance, "now").mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          throw null;
        }
        return realNow();
      });

      const health = await healthMonitor.performHealthCheck();
      const failure = health.checks.find(
        (c) =>
          c.type === HealthCheckType.BACKEND_AVAILABILITY &&
          c.status === HealthStatus.FAILED,
      );
      expect(failure!.details?.error).toBe("Unknown error");
    });

    it("caps healthHistory at 100 entries, discarding the oldest", async () => {
      vi.spyOn(Math, "random").mockReturnValue(0.1);
      for (let i = 0; i < 101; i++) {
        await healthMonitor.performHealthCheck();
      }
      expect(healthMonitor.getHealthHistory().length).toBe(100);
    }, 20000);

    it("emits statusChange only when overall status actually changes", async () => {
      vi.spyOn(Math, "random").mockReturnValue(0.1);
      const changes: Array<{
        previous: HealthStatus;
        current: HealthStatus;
        score: number;
      }> = [];
      healthMonitor.on("statusChange", (change) => changes.push(change));

      const first = await healthMonitor.performHealthCheck();
      const second = await healthMonitor.performHealthCheck();
      expect(second.status).toBe(first.status);
      expect(changes).toHaveLength(0);

      // Shift the score decisively by completing the backend + agent file sets
      fs.writeFileSync(
        path.join(testProjectPath, "src", "core", "orchestrator.ts"),
        "",
      );
      fs.writeFileSync(path.join(testProjectPath, "src", "core", "state.ts"), "");
      fs.writeFileSync(
        path.join(testProjectPath, "src", "core", "coordination.ts"),
        "",
      );
      fs.writeFileSync(path.join(testProjectPath, "src", "core", "vision.ts"), "");
      fs.writeFileSync(
        path.join(testProjectPath, ".claude", "agents", "architect.md"),
        "",
      );
      fs.writeFileSync(
        path.join(testProjectPath, ".claude", "agents", "developer.md"),
        "",
      );
      fs.writeFileSync(
        path.join(testProjectPath, ".claude", "agents", "qa.md"),
        "",
      );
      fs.writeFileSync(
        path.join(testProjectPath, ".claude", "agents", "devops.md"),
        "",
      );

      const third = await healthMonitor.performHealthCheck();
      expect(third.status).not.toBe(second.status);
      expect(changes).toHaveLength(1);
      expect(changes[0].previous).toBe(second.status);
      expect(changes[0].current).toBe(third.status);
      expect(changes[0].score).toBe(third.overallScore);
    });
  });

  describe("calculateOverallScore (direct)", () => {
    it("returns 0 when the checks array is empty (totalWeight never exceeds 0)", () => {
      const result = (healthMonitor as any).calculateOverallScore([]);
      expect(result).toBe(0);
    });

    it("falls back to weight 0 for an unrecognized check type", () => {
      const known = makeCheck(
        HealthCheckType.UI_RESPONSIVENESS,
        HealthStatus.HEALTHY,
        100,
      );
      const unknown = makeCheck(
        "bogus_type" as unknown as HealthCheckType,
        HealthStatus.HEALTHY,
        100,
      );
      const result = (healthMonitor as any).calculateOverallScore([
        known,
        unknown,
      ]);
      // weightedSum = 100*.15 + 100*0 = 15; totalWeight = .15 + 0 = .15
      // round(15 / .15) = 100
      expect(result).toBe(100);
    });
  });

  describe("determineStatus (direct)", () => {
    it.each([
      [90, HealthStatus.HEALTHY],
      [85, HealthStatus.HEALTHY],
      [84, HealthStatus.DEGRADED],
      [70, HealthStatus.DEGRADED],
      [69, HealthStatus.CRITICAL],
      [50, HealthStatus.CRITICAL],
      [49, HealthStatus.FAILED],
      [0, HealthStatus.FAILED],
    ])("determineStatus(%i) -> %s", (score, expected) => {
      expect((healthMonitor as any).determineStatus(score)).toBe(expected);
    });
  });

  describe("generateRecommendations (direct)", () => {
    const typeMessages: Array<[HealthCheckType, string]> = [
      [
        HealthCheckType.UI_RESPONSIVENESS,
        "Optimize UI components for better performance",
      ],
      [
        HealthCheckType.BACKEND_AVAILABILITY,
        "Verify backend services are running and accessible",
      ],
      [
        HealthCheckType.STATE_SYNC,
        "Check state synchronization - may need to refresh state",
      ],
      [
        HealthCheckType.AGENT_EXECUTION,
        "Ensure all agent files are properly configured",
      ],
      [
        HealthCheckType.FILE_SYSTEM,
        "Check file system permissions and disk space",
      ],
      [
        HealthCheckType.MEMORY_USAGE,
        "High memory usage detected - consider restarting or optimizing",
      ],
      [
        HealthCheckType.COMMAND_PROCESSING,
        "Verify command configurations are properly set up",
      ],
      [
        HealthCheckType.AUTOMATION_SYSTEM,
        "Configure automation system for enhanced functionality",
      ],
    ];

    it.each(typeMessages)(
      "adds the recommendation for %s when status is FAILED",
      (type, expectedMsg) => {
        const result = (healthMonitor as any).generateRecommendations([
          makeCheck(type, HealthStatus.FAILED),
        ]);
        expect(result).toEqual([expectedMsg]);
      },
    );

    it("also adds a recommendation when status is CRITICAL (OR right-hand branch)", () => {
      const result = (healthMonitor as any).generateRecommendations([
        makeCheck(HealthCheckType.MEMORY_USAGE, HealthStatus.CRITICAL),
      ]);
      expect(result).toEqual([
        "High memory usage detected - consider restarting or optimizing",
      ]);
    });

    it("adds no recommendation for HEALTHY or DEGRADED status", () => {
      const result = (healthMonitor as any).generateRecommendations([
        makeCheck(HealthCheckType.MEMORY_USAGE, HealthStatus.HEALTHY),
        makeCheck(HealthCheckType.FILE_SYSTEM, HealthStatus.DEGRADED),
      ]);
      expect(result).toEqual([]);
    });

    it("produces no recommendation text for an unrecognized check type, even when FAILED", () => {
      const result = (healthMonitor as any).generateRecommendations([
        makeCheck("bogus_type" as unknown as HealthCheckType, HealthStatus.FAILED),
      ]);
      expect(result).toEqual([]);
    });
  });

  describe("getHealthTrends branches", () => {
    function seedHistory(scores: number[], statuses: HealthStatus[]) {
      const history = scores.map((overallScore, i) => ({
        overallScore,
        status: statuses[i],
        checks: [],
        timestamp: new Date(),
        uptime: 0,
      }));
      (healthMonitor as any).healthHistory = history;
      (healthMonitor as any).lastHealth = history[history.length - 1];
    }

    it("reports 'improving' when the second half of recent scores rises more than 5 points", () => {
      seedHistory(
        [50, 50, 90, 90, 90],
        [
          HealthStatus.CRITICAL,
          HealthStatus.CRITICAL,
          HealthStatus.HEALTHY,
          HealthStatus.HEALTHY,
          HealthStatus.HEALTHY,
        ],
      );
      const trends = healthMonitor.getHealthTrends();
      expect(trends.trend).toBe("improving");
      expect(trends.averageScore).toBe(74); // (50+50+90+90+90)/5 = 74
    });

    it("reports 'degrading' when the second half of recent scores falls more than 5 points", () => {
      seedHistory(
        [90, 90, 50, 50, 50],
        [
          HealthStatus.HEALTHY,
          HealthStatus.HEALTHY,
          HealthStatus.CRITICAL,
          HealthStatus.CRITICAL,
          HealthStatus.CRITICAL,
        ],
      );
      const trends = healthMonitor.getHealthTrends();
      expect(trends.trend).toBe("degrading");
    });

    it("reports 'stable' when scores hold within a 5 point band", () => {
      seedHistory(
        [80, 80, 80, 80, 80],
        [
          HealthStatus.HEALTHY,
          HealthStatus.HEALTHY,
          HealthStatus.HEALTHY,
          HealthStatus.HEALTHY,
          HealthStatus.HEALTHY,
        ],
      );
      const trends = healthMonitor.getHealthTrends();
      expect(trends.trend).toBe("stable");
    });

    it("counts CRITICAL and FAILED entries toward criticalCount, but not HEALTHY", () => {
      seedHistory(
        [90, 55, 30],
        [HealthStatus.HEALTHY, HealthStatus.CRITICAL, HealthStatus.FAILED],
      );
      const trends = healthMonitor.getHealthTrends();
      expect(trends.criticalCount).toBe(2);
      expect(trends.trend).toBe("degrading");
    });

    it("treats exactly one history entry as insufficient data (stable, uses lastHealth score)", () => {
      seedHistory([42], [HealthStatus.CRITICAL]);
      const trends = healthMonitor.getHealthTrends();
      expect(trends.trend).toBe("stable");
      expect(trends.averageScore).toBe(42);
      expect(trends.criticalCount).toBe(0);
    });
  });
});
