/**
 * Diagnostic Test Functions
 * Individual diagnostic tests for system, configuration, and environment
 */

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import * as os from "os";
import * as dns from "dns";
import { performance } from "perf_hooks";

export interface DiagnosticResult {
  name: string;
  category: string;
  passed: boolean;
  duration: number;
  message: string;
  details?: Record<string, unknown>;
  recommendation?: string;
}

/**
 * Test file system access
 */
export async function testFileSystem(
  projectPath: string,
): Promise<DiagnosticResult> {
  const start = performance.now();
  const testPath = path.join(
    projectPath,
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
export async function testProjectStructure(
  projectPath: string,
): Promise<DiagnosticResult> {
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
    const fullPath = path.join(projectPath, dir);
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
export async function testDependencies(
  projectPath: string,
): Promise<DiagnosticResult> {
  const start = performance.now();

  try {
    const packageJsonPath = path.join(projectPath, "package.json");

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
    const nodeModulesPath = path.join(projectPath, "node_modules");
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
export async function testAgentConfiguration(
  projectPath: string,
): Promise<DiagnosticResult> {
  const start = performance.now();

  const agentsPath = path.join(projectPath, ".claude", "agents");
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
export async function testStateManagement(
  projectPath: string,
): Promise<DiagnosticResult> {
  const start = performance.now();

  try {
    const statePath = path.join(projectPath, ".claude", "state");
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

    const hasRequiredFields = Boolean(
      state.version && state.projectName && state.timestamp,
    );

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
export async function testCommandConfiguration(
  projectPath: string,
): Promise<DiagnosticResult> {
  const start = performance.now();

  try {
    const commandsPath = path.join(projectPath, ".claude", "commands");

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
export async function testGitRepository(
  projectPath: string,
): Promise<DiagnosticResult> {
  const start = performance.now();

  try {
    const gitPath = path.join(projectPath, ".git");

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
      cwd: projectPath,
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
export async function testNetworkConnectivity(): Promise<DiagnosticResult> {
  const start = performance.now();

  try {
    // Simple DNS resolution test
    await dns.promises.resolve4("github.com");

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
export async function testMemoryUsage(): Promise<DiagnosticResult> {
  const start = performance.now();

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
export async function testDiskSpace(
  projectPath: string,
): Promise<DiagnosticResult> {
  const start = performance.now();

  try {
    // Get disk usage for project path
    const result = execSync(`df -k "${projectPath}" | tail -1`, {
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
 * Generate recommendations based on test results
 */
export function generateRecommendations(results: DiagnosticResult[]): string[] {
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
