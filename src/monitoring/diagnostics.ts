/**
 * Diagnostic Tools
 * System diagnostics and troubleshooting utilities
 */

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { performance } from "perf_hooks";
import { Logger, LogLevel } from "../utils/logger";
import { HealthMonitor } from "./health";
import { PerformanceMonitor, PerformanceReport } from "./performance";
import { ErrorTracker } from "./errors";

const logger = new Logger("Diagnostics");

// Diagnostic test result
export interface DiagnosticResult {
  name: string;
  category: string;
  passed: boolean;
  duration: number;
  message: string;
  details?: Record<string, unknown>;
  recommendation?: string;
}

// Diagnostic report
export interface DiagnosticReport {
  timestamp: Date;
  projectPath: string;
  totalTests: number;
  passed: number;
  failed: number;
  duration: number;
  results: DiagnosticResult[];
  systemInfo: SystemInfo;
  recommendations: string[];
}

// System information
export interface SystemInfo {
  platform: string;
  nodeVersion: string;
  npmVersion: string;
  memory: {
    total: number;
    free: number;
    used: number;
  };
  disk: {
    total: number;
    free: number;
    used: number;
  };
  cpu: {
    cores: number;
    model: string;
    speed: number;
  };
}

// Debug mode options
export interface DebugOptions {
  verbose: boolean;
  traceErrors: boolean;
  profilePerformance: boolean;
  collectLogs: boolean;
  outputPath?: string;
  [key: string]: unknown;
}

export class DiagnosticTools {
  private projectPath: string;
  private healthMonitor: HealthMonitor;
  private performanceMonitor: PerformanceMonitor;
  private errorTracker: ErrorTracker;
  private debugMode: boolean = false;
  private debugOptions: DebugOptions = {
    verbose: false,
    traceErrors: false,
    profilePerformance: false,
    collectLogs: false,
  };

  constructor(projectPath?: string) {
    this.projectPath = projectPath || process.cwd();
    this.healthMonitor = new HealthMonitor(this.projectPath);
    this.performanceMonitor = new PerformanceMonitor();
    this.errorTracker = new ErrorTracker(this.projectPath);
  }

  /**
   * Run comprehensive diagnostic tests
   */
  async runDiagnostics(): Promise<DiagnosticReport> {
    logger.info("Starting diagnostic tests");
    const startTime = performance.now();
    const results: DiagnosticResult[] = [];

    // Run all diagnostic tests
    const tests = [
      this.testFileSystem(),
      this.testProjectStructure(),
      this.testDependencies(),
      this.testAgentConfiguration(),
      this.testStateManagement(),
      this.testCommandConfiguration(),
      this.testGitRepository(),
      this.testNetworkConnectivity(),
      this.testMemoryUsage(),
      this.testDiskSpace(),
    ];

    // Execute tests
    for (const testPromise of tests) {
      try {
        const result = await testPromise;
        results.push(result);
      } catch (error) {
        results.push({
          name: "Unknown Test",
          category: "system",
          passed: false,
          duration: 0,
          message: `Test failed: ${(error as Error).message}`,
          recommendation: "Check system logs for more details",
        });
      }
    }

    // Collect system info
    const systemInfo = this.getSystemInfo();

    // Generate recommendations
    const recommendations = this.generateRecommendations(results);

    // Calculate summary
    const passed = results.filter((r) => r.passed).length;
    const failed = results.filter((r) => !r.passed).length;
    const duration = performance.now() - startTime;

    const report: DiagnosticReport = {
      timestamp: new Date(),
      projectPath: this.projectPath,
      totalTests: results.length,
      passed,
      failed,
      duration,
      results,
      systemInfo,
      recommendations,
    };

    logger.info("Diagnostic tests completed", { passed, failed, duration });
    return report;
  }

  /**
   * Test file system access
   */
  private async testFileSystem(): Promise<DiagnosticResult> {
    const start = performance.now();
    const testPath = path.join(
      this.projectPath,
      ".claude",
      "diagnostic-test.tmp",
    );

    try {
      // Ensure directory exists
      const dir = path.dirname(testPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Test write
      fs.writeFileSync(testPath, "diagnostic test");

      // Test read
      const content = fs.readFileSync(testPath, "utf-8");

      // Test delete
      fs.unlinkSync(testPath);

      return {
        name: "File System Access",
        category: "system",
        passed: true,
        duration: performance.now() - start,
        message: "File system operations working correctly",
      };
    } catch (error) {
      return {
        name: "File System Access",
        category: "system",
        passed: false,
        duration: performance.now() - start,
        message: `File system error: ${(error as Error).message}`,
        recommendation: "Check file permissions and disk space",
      };
    }
  }

  /**
   * Test project structure
   */
  private async testProjectStructure(): Promise<DiagnosticResult> {
    const start = performance.now();

    const requiredDirs = [
      ".claude",
      ".claude/agents",
      ".claude/commands",
      ".claude/hooks",
      ".claude/skills",
      "src",
      "src/core",
      "src/components",
      "src/monitoring",
    ];

    const missing: string[] = [];
    for (const dir of requiredDirs) {
      const fullPath = path.join(this.projectPath, dir);
      if (!fs.existsSync(fullPath)) {
        missing.push(dir);
      }
    }

    return {
      name: "Project Structure",
      category: "configuration",
      passed: missing.length === 0,
      duration: performance.now() - start,
      message:
        missing.length === 0
          ? "All required directories present"
          : `Missing directories: ${missing.join(", ")}`,
      details: { missing },
      recommendation:
        missing.length > 0
          ? "Run initialization command to create missing directories"
          : undefined,
    };
  }

  /**
   * Test dependencies
   */
  private async testDependencies(): Promise<DiagnosticResult> {
    const start = performance.now();

    try {
      const packageJsonPath = path.join(this.projectPath, "package.json");

      if (!fs.existsSync(packageJsonPath)) {
        return {
          name: "Dependencies",
          category: "configuration",
          passed: false,
          duration: performance.now() - start,
          message: "package.json not found",
          recommendation: 'Initialize npm project with "npm init"',
        };
      }

      // Check for node_modules
      const nodeModulesPath = path.join(this.projectPath, "node_modules");
      const hasNodeModules = fs.existsSync(nodeModulesPath);

      if (!hasNodeModules) {
        return {
          name: "Dependencies",
          category: "configuration",
          passed: false,
          duration: performance.now() - start,
          message: "Dependencies not installed",
          recommendation: 'Run "npm install" to install dependencies',
        };
      }

      // Parse package.json
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
      const dependencies = Object.keys(packageJson.dependencies || {}).length;
      const devDependencies = Object.keys(
        packageJson.devDependencies || {},
      ).length;

      return {
        name: "Dependencies",
        category: "configuration",
        passed: true,
        duration: performance.now() - start,
        message: `${dependencies} dependencies, ${devDependencies} dev dependencies installed`,
        details: { dependencies, devDependencies },
      };
    } catch (error) {
      return {
        name: "Dependencies",
        category: "configuration",
        passed: false,
        duration: performance.now() - start,
        message: `Dependency check failed: ${(error as Error).message}`,
        recommendation: "Check package.json and run npm install",
      };
    }
  }

  /**
   * Test agent configuration
   */
  private async testAgentConfiguration(): Promise<DiagnosticResult> {
    const start = performance.now();

    const agentsPath = path.join(this.projectPath, ".claude", "agents");
    const expectedAgents = [
      "orchestrator.md",
      "architect.md",
      "developer.md",
      "qa.md",
      "devops.md",
    ];

    try {
      if (!fs.existsSync(agentsPath)) {
        return {
          name: "Agent Configuration",
          category: "agents",
          passed: false,
          duration: performance.now() - start,
          message: "Agents directory not found",
          recommendation: "Initialize agents with forge initialization",
        };
      }

      const actualAgents = fs
        .readdirSync(agentsPath)
        .filter((f) => f.endsWith(".md"));
      const missing = expectedAgents.filter((a) => !actualAgents.includes(a));

      return {
        name: "Agent Configuration",
        category: "agents",
        passed: missing.length === 0,
        duration: performance.now() - start,
        message:
          missing.length === 0
            ? `${actualAgents.length} agents configured`
            : `Missing agents: ${missing.join(", ")}`,
        details: { configured: actualAgents.length, missing },
      };
    } catch (error) {
      return {
        name: "Agent Configuration",
        category: "agents",
        passed: false,
        duration: performance.now() - start,
        message: `Agent check failed: ${(error as Error).message}`,
        recommendation: "Check agent configuration files",
      };
    }
  }

  /**
   * Test state management
   */
  private async testStateManagement(): Promise<DiagnosticResult> {
    const start = performance.now();

    try {
      const statePath = path.join(this.projectPath, ".claude", "state");
      const stateFile = path.join(statePath, "current.json");

      if (!fs.existsSync(stateFile)) {
        return {
          name: "State Management",
          category: "state",
          passed: false,
          duration: performance.now() - start,
          message: "State file not found",
          recommendation: "Initialize state management system",
        };
      }

      // Check state file validity
      const stateContent = fs.readFileSync(stateFile, "utf-8");
      const state = JSON.parse(stateContent);

      const hasRequiredFields =
        state.version && state.projectName && state.timestamp;

      return {
        name: "State Management",
        category: "state",
        passed: hasRequiredFields,
        duration: performance.now() - start,
        message: hasRequiredFields
          ? "State management configured correctly"
          : "State file missing required fields",
        details: {
          version: state.version,
          projectName: state.projectName,
        },
      };
    } catch (error) {
      return {
        name: "State Management",
        category: "state",
        passed: false,
        duration: performance.now() - start,
        message: `State check failed: ${(error as Error).message}`,
        recommendation: "Reinitialize state management",
      };
    }
  }

  /**
   * Test command configuration
   */
  private async testCommandConfiguration(): Promise<DiagnosticResult> {
    const start = performance.now();

    try {
      const commandsPath = path.join(this.projectPath, ".claude", "commands");

      if (!fs.existsSync(commandsPath)) {
        return {
          name: "Command Configuration",
          category: "commands",
          passed: false,
          duration: performance.now() - start,
          message: "Commands directory not found",
          recommendation: "Initialize commands directory",
        };
      }

      const commands = fs
        .readdirSync(commandsPath)
        .filter((f) => f.endsWith(".md"));

      return {
        name: "Command Configuration",
        category: "commands",
        passed: commands.length > 0,
        duration: performance.now() - start,
        message: `${commands.length} commands configured`,
        details: { commands: commands.map((c) => c.replace(".md", "")) },
      };
    } catch (error) {
      return {
        name: "Command Configuration",
        category: "commands",
        passed: false,
        duration: performance.now() - start,
        message: `Command check failed: ${(error as Error).message}`,
        recommendation: "Check command configuration files",
      };
    }
  }

  /**
   * Test git repository
   */
  private async testGitRepository(): Promise<DiagnosticResult> {
    const start = performance.now();

    try {
      const gitPath = path.join(this.projectPath, ".git");

      if (!fs.existsSync(gitPath)) {
        return {
          name: "Git Repository",
          category: "version-control",
          passed: false,
          duration: performance.now() - start,
          message: "Not a git repository",
          recommendation: 'Initialize git with "git init"',
        };
      }

      // Check git status
      const status = execSync("git status --porcelain", {
        cwd: this.projectPath,
        encoding: "utf-8",
      });

      const hasChanges = status.trim().length > 0;

      return {
        name: "Git Repository",
        category: "version-control",
        passed: true,
        duration: performance.now() - start,
        message: hasChanges
          ? "Git repository has uncommitted changes"
          : "Git repository is clean",
        details: { hasChanges },
      };
    } catch (error) {
      return {
        name: "Git Repository",
        category: "version-control",
        passed: false,
        duration: performance.now() - start,
        message: `Git check failed: ${(error as Error).message}`,
        recommendation: "Check git installation and repository status",
      };
    }
  }

  /**
   * Test network connectivity
   */
  private async testNetworkConnectivity(): Promise<DiagnosticResult> {
    const start = performance.now();

    try {
      // Simple DNS resolution test
      const dns = require("dns").promises;
      await dns.resolve4("github.com");

      return {
        name: "Network Connectivity",
        category: "network",
        passed: true,
        duration: performance.now() - start,
        message: "Network connectivity verified",
      };
    } catch (error) {
      return {
        name: "Network Connectivity",
        category: "network",
        passed: false,
        duration: performance.now() - start,
        message: `Network test failed: ${(error as Error).message}`,
        recommendation: "Check network connection and DNS settings",
      };
    }
  }

  /**
   * Test memory usage
   */
  private async testMemoryUsage(): Promise<DiagnosticResult> {
    const start = performance.now();
    const os = require("os");

    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const usagePercent = (usedMem / totalMem) * 100;

    const passed = usagePercent < 90;

    return {
      name: "Memory Usage",
      category: "system",
      passed,
      duration: performance.now() - start,
      message: `Memory usage: ${usagePercent.toFixed(1)}%`,
      details: {
        total: Math.round(totalMem / 1024 / 1024),
        free: Math.round(freeMem / 1024 / 1024),
        used: Math.round(usedMem / 1024 / 1024),
        percentage: usagePercent,
      },
      recommendation: !passed
        ? "High memory usage detected. Consider closing other applications."
        : undefined,
    };
  }

  /**
   * Test disk space
   */
  private async testDiskSpace(): Promise<DiagnosticResult> {
    const start = performance.now();

    try {
      // Get disk usage for project path
      const result = execSync(`df -k "${this.projectPath}" | tail -1`, {
        encoding: "utf-8",
      });
      const parts = result.trim().split(/\s+/);

      const total = parseInt(parts[1]) * 1024; // Convert to bytes
      const used = parseInt(parts[2]) * 1024;
      const available = parseInt(parts[3]) * 1024;
      const usagePercent = (used / total) * 100;

      const passed = usagePercent < 90;

      return {
        name: "Disk Space",
        category: "system",
        passed,
        duration: performance.now() - start,
        message: `Disk usage: ${usagePercent.toFixed(1)}%`,
        details: {
          total: Math.round(total / 1024 / 1024 / 1024), // GB
          used: Math.round(used / 1024 / 1024 / 1024),
          available: Math.round(available / 1024 / 1024 / 1024),
          percentage: usagePercent,
        },
        recommendation: !passed
          ? "Low disk space. Clean up unnecessary files."
          : undefined,
      };
    } catch (error) {
      return {
        name: "Disk Space",
        category: "system",
        passed: false,
        duration: performance.now() - start,
        message: `Disk space check failed: ${(error as Error).message}`,
        recommendation: "Check disk usage manually",
      };
    }
  }

  /**
   * Get system information
   */
  private getSystemInfo(): SystemInfo {
    const os = require("os");

    return {
      platform: os.platform(),
      nodeVersion: process.version,
      npmVersion: this.getNpmVersion(),
      memory: {
        total: Math.round(os.totalmem() / 1024 / 1024),
        free: Math.round(os.freemem() / 1024 / 1024),
        used: Math.round((os.totalmem() - os.freemem()) / 1024 / 1024),
      },
      disk: this.getDiskInfo(),
      cpu: {
        cores: os.cpus().length,
        model: os.cpus()[0].model,
        speed: os.cpus()[0].speed,
      },
    };
  }

  /**
   * Get npm version
   */
  private getNpmVersion(): string {
    try {
      return execSync("npm --version", { encoding: "utf-8" }).trim();
    } catch {
      return "unknown";
    }
  }

  /**
   * Get disk information
   */
  private getDiskInfo(): { total: number; free: number; used: number } {
    try {
      const result = execSync(`df -k "${this.projectPath}" | tail -1`, {
        encoding: "utf-8",
      });
      const parts = result.trim().split(/\s+/);

      return {
        total: Math.round(parseInt(parts[1]) / 1024), // MB
        used: Math.round(parseInt(parts[2]) / 1024),
        free: Math.round(parseInt(parts[3]) / 1024),
      };
    } catch {
      return { total: 0, free: 0, used: 0 };
    }
  }

  /**
   * Generate recommendations based on results
   */
  private generateRecommendations(results: DiagnosticResult[]): string[] {
    const recommendations: string[] = [];
    const failed = results.filter((r) => !r.passed);

    if (failed.length === 0) {
      recommendations.push("System is healthy. All diagnostic tests passed.");
      return recommendations;
    }

    // Add specific recommendations from failed tests
    for (const result of failed) {
      if (result.recommendation) {
        recommendations.push(result.recommendation);
      }
    }

    // Add general recommendations based on categories
    const failedCategories = new Set(failed.map((r) => r.category));

    if (failedCategories.has("system")) {
      recommendations.push(
        "System-level issues detected. Check permissions and resources.",
      );
    }

    if (failedCategories.has("configuration")) {
      recommendations.push("Configuration issues found. Review project setup.");
    }

    if (failedCategories.has("agents")) {
      recommendations.push(
        "Agent configuration problems. Reinitialize forge agents.",
      );
    }

    return recommendations;
  }

  /**
   * Enable debug mode
   */
  enableDebugMode(options: Partial<DebugOptions> = {}): void {
    this.debugMode = true;
    this.debugOptions = { ...this.debugOptions, ...options };

    if (this.debugOptions.verbose) {
      Logger.setLevel(LogLevel.DEBUG);
    }

    logger.info("Debug mode enabled", this.debugOptions);
  }

  /**
   * Disable debug mode
   */
  disableDebugMode(): void {
    this.debugMode = false;
    this.debugOptions = {
      verbose: false,
      traceErrors: false,
      profilePerformance: false,
      collectLogs: false,
    };

    Logger.setLevel(LogLevel.INFO);
    logger.info("Debug mode disabled");
  }

  /**
   * Profile performance
   */
  async profilePerformance(duration: number = 60000): Promise<PerformanceReport> {
    logger.info("Starting performance profiling", { duration });

    this.performanceMonitor.start(1000); // Report every second

    return new Promise((resolve) => {
      setTimeout(() => {
        const report = this.performanceMonitor.generateReport();
        this.performanceMonitor.stop();
        resolve(report);
      }, duration);
    });
  }

  /**
   * Collect system logs
   */
  async collectLogs(outputPath?: string): Promise<string> {
    const logsPath =
      outputPath ||
      path.join(
        this.projectPath,
        ".claude",
        "diagnostics",
        `logs-${Date.now()}.json`,
      );

    // Ensure directory exists
    const dir = path.dirname(logsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const logs = {
      timestamp: new Date(),
      health: await this.healthMonitor.performHealthCheck(),
      performance: this.performanceMonitor.generateReport(),
      errors: this.errorTracker.generateReport(),
      diagnostics: await this.runDiagnostics(),
    };

    fs.writeFileSync(logsPath, JSON.stringify(logs, null, 2));
    logger.info("Logs collected", { path: logsPath });

    return logsPath;
  }

  /**
   * Generate diagnostic summary
   */
  formatDiagnosticSummary(report: DiagnosticReport): string {
    const lines: string[] = [];

    lines.push("DIAGNOSTIC REPORT");
    lines.push("=".repeat(50));
    lines.push(`Timestamp: ${report.timestamp.toISOString()}`);
    lines.push(`Project: ${report.projectPath}`);
    lines.push("");

    lines.push("TEST RESULTS");
    lines.push("-".repeat(50));
    lines.push(`Total Tests: ${report.totalTests}`);
    lines.push(`Passed: ${report.passed} ✓`);
    lines.push(`Failed: ${report.failed} ✗`);
    lines.push(`Duration: ${report.duration.toFixed(2)}ms`);
    lines.push("");

    if (report.failed > 0) {
      lines.push("FAILED TESTS");
      lines.push("-".repeat(50));
      for (const result of report.results.filter((r) => !r.passed)) {
        lines.push(`✗ ${result.name}: ${result.message}`);
        if (result.recommendation) {
          lines.push(`  → ${result.recommendation}`);
        }
      }
      lines.push("");
    }

    lines.push("SYSTEM INFO");
    lines.push("-".repeat(50));
    lines.push(`Platform: ${report.systemInfo.platform}`);
    lines.push(`Node: ${report.systemInfo.nodeVersion}`);
    lines.push(`NPM: ${report.systemInfo.npmVersion}`);
    lines.push(
      `Memory: ${report.systemInfo.memory.used}MB / ${report.systemInfo.memory.total}MB`,
    );
    lines.push(
      `CPU: ${report.systemInfo.cpu.model} (${report.systemInfo.cpu.cores} cores)`,
    );
    lines.push("");

    if (report.recommendations.length > 0) {
      lines.push("RECOMMENDATIONS");
      lines.push("-".repeat(50));
      for (const rec of report.recommendations) {
        lines.push(`• ${rec}`);
      }
    }

    return lines.join("\n");
  }
}
