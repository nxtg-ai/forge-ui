/**
 * Diagnostic Tools
 * System diagnostics and troubleshooting utilities
 */

import * as fs from "fs";
import * as path from "path";
import { performance } from "perf_hooks";
import { Logger, LogLevel } from "../utils/logger";
import { HealthMonitor } from "./health";
import { PerformanceMonitor, PerformanceReport } from "./performance";
import { ErrorTracker } from "./errors";

// Import test functions
import {
  testFileSystem,
  testProjectStructure,
  testDependencies,
  testAgentConfiguration,
  testStateManagement,
  testCommandConfiguration,
  testGitRepository,
  testNetworkConnectivity,
  testMemoryUsage,
  testDiskSpace,
  generateRecommendations,
} from "./diagnostics/tests";

// Import formatter functions
import {
  getSystemInfo,
  formatDiagnosticSummary,
} from "./diagnostics/formatters";

// Re-export types
export type {
  DiagnosticResult,
  DiagnosticReport,
  SystemInfo,
} from "./diagnostics/formatters";

const logger = new Logger("Diagnostics");

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
  async runDiagnostics() {
    logger.info("Starting diagnostic tests");
    const startTime = performance.now();
    const results = [];

    // Run all diagnostic tests
    const tests = [
      testFileSystem(this.projectPath),
      testProjectStructure(this.projectPath),
      testDependencies(this.projectPath),
      testAgentConfiguration(this.projectPath),
      testStateManagement(this.projectPath),
      testCommandConfiguration(this.projectPath),
      testGitRepository(this.projectPath),
      testNetworkConnectivity(),
      testMemoryUsage(),
      testDiskSpace(this.projectPath),
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
    const systemInfo = getSystemInfo(this.projectPath);

    // Generate recommendations
    const recommendations = generateRecommendations(results);

    // Calculate summary
    const passed = results.filter((r) => r.passed).length;
    const failed = results.filter((r) => !r.passed).length;
    const duration = performance.now() - startTime;

    const report = {
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
  formatDiagnosticSummary(report: ReturnType<typeof this.runDiagnostics> extends Promise<infer R> ? R : never): string {
    return formatDiagnosticSummary(report);
  }
}
