/**
 * Quality Metrics Dashboard
 * Real-time quality metrics and reporting
 */

import { promises as fs } from "fs";
import * as path from "path";
import { glob } from "glob";

export interface QualityMetrics {
  timestamp: Date;
  coverage: {
    lines: number;
    functions: number;
    branches: number;
    statements: number;
  };
  codeQuality: {
    totalFiles: number;
    averageComplexity: number;
    lintWarnings: number;
    lintErrors: number;
    typeErrors: number;
  };
  security: {
    score: number;
    criticalIssues: number;
    highIssues: number;
    mediumIssues: number;
    lowIssues: number;
  };
  performance: {
    buildTime: number;
    bundleSize: number;
    averageTestDuration: number;
    slowestTests: Array<{ name: string; duration: number }>;
  };
  testing: {
    totalTests: number;
    passing: number;
    failing: number;
    skipped: number;
    testCoverage: number;
  };
  documentation: {
    documentedFunctions: number;
    totalFunctions: number;
    documentationCoverage: number;
  };
  overallGrade: "A" | "B" | "C" | "D" | "F";
  overallScore: number;
}

export class QualityDashboard {
  async generateMetrics(
    projectPath: string = process.cwd(),
  ): Promise<QualityMetrics> {
    const srcPath = path.join(projectPath, "src");

    const [
      coverage,
      codeQuality,
      security,
      performance,
      testing,
      documentation,
    ] = await Promise.all([
      this.analyzeCoverage(projectPath),
      this.analyzeCodeQuality(srcPath),
      this.analyzeSecurityScore(projectPath),
      this.analyzePerformance(projectPath),
      this.analyzeTestResults(projectPath),
      this.analyzeDocumentation(srcPath),
    ]);

    const overallScore = this.calculateOverallScore({
      coverage,
      codeQuality,
      security,
      performance,
      testing,
      documentation,
    });

    const overallGrade = this.scoreToGrade(overallScore);

    const metrics: QualityMetrics = {
      timestamp: new Date(),
      coverage,
      codeQuality,
      security,
      performance,
      testing,
      documentation,
      overallScore,
      overallGrade,
    };

    await this.saveMetrics(metrics, projectPath);
    await this.generateDashboardHTML(metrics, projectPath);

    return metrics;
  }

  private async analyzeCoverage(
    projectPath: string,
  ): Promise<QualityMetrics["coverage"]> {
    try {
      const coveragePath = path.join(
        projectPath,
        "coverage",
        "coverage-summary.json",
      );
      const coverageData = JSON.parse(await fs.readFile(coveragePath, "utf-8"));

      const total = coverageData.total;
      return {
        lines: total.lines.pct,
        functions: total.functions.pct,
        branches: total.branches.pct,
        statements: total.statements.pct,
      };
    } catch {
      // No coverage data yet
      return {
        lines: 0,
        functions: 0,
        branches: 0,
        statements: 0,
      };
    }
  }

  private async analyzeCodeQuality(
    srcPath: string,
  ): Promise<QualityMetrics["codeQuality"]> {
    const files = await new Promise<string[]>((resolve, reject) => {
      glob(
        "**/*.{ts,tsx}",
        {
          cwd: srcPath,
          ignore: ["**/*.test.ts", "**/*.test.tsx", "**/*.d.ts"],
        },
        (err, matches) => {
          if (err) reject(err);
          else resolve(matches);
        },
      );
    });

    let totalComplexity = 0;
    let functionCount = 0;

    for (const file of files) {
      const fullPath = path.join(srcPath, file);
      const content = await fs.readFile(fullPath, "utf-8");

      // Simple cyclomatic complexity estimation
      const functionMatches =
        content.match(/function\s+\w+|=>\s*{|const\s+\w+\s*=\s*\(/g) || [];
      functionCount += functionMatches.length;

      // Count decision points (if, for, while, case, &&, ||, ?)
      const decisionPoints = (
        content.match(/\b(if|for|while|case)\b|\?\?|\|\||&&/g) || []
      ).length;
      totalComplexity += decisionPoints;
    }

    const averageComplexity =
      functionCount > 0 ? totalComplexity / functionCount : 0;

    return {
      totalFiles: files.length,
      averageComplexity: Math.round(averageComplexity * 10) / 10,
      lintWarnings: 0, // Would be populated from ESLint
      lintErrors: 0,
      typeErrors: 0,
    };
  }

  private async analyzeSecurityScore(
    projectPath: string,
  ): Promise<QualityMetrics["security"]> {
    try {
      const reportPath = path.join(
        projectPath,
        ".claude",
        "reports",
        "security-audit.json",
      );
      const report = JSON.parse(await fs.readFile(reportPath, "utf-8"));

      return {
        score: report.summary.overallScore,
        criticalIssues: report.summary.violations.critical,
        highIssues: report.summary.violations.high,
        mediumIssues: report.summary.violations.medium,
        lowIssues: report.summary.violations.low,
      };
    } catch {
      return {
        score: 100,
        criticalIssues: 0,
        highIssues: 0,
        mediumIssues: 0,
        lowIssues: 0,
      };
    }
  }

  private async analyzePerformance(
    projectPath: string,
  ): Promise<QualityMetrics["performance"]> {
    // These would be populated from actual build and test runs
    return {
      buildTime: 0,
      bundleSize: 0,
      averageTestDuration: 0,
      slowestTests: [],
    };
  }

  private async analyzeTestResults(
    projectPath: string,
  ): Promise<QualityMetrics["testing"]> {
    // Would be populated from vitest results
    return {
      totalTests: 0,
      passing: 0,
      failing: 0,
      skipped: 0,
      testCoverage: 0,
    };
  }

  private async analyzeDocumentation(
    srcPath: string,
  ): Promise<QualityMetrics["documentation"]> {
    const files = await new Promise<string[]>((resolve, reject) => {
      glob(
        "**/*.{ts,tsx}",
        {
          cwd: srcPath,
          ignore: ["**/*.test.ts", "**/*.test.tsx", "**/*.d.ts"],
        },
        (err, matches) => {
          if (err) reject(err);
          else resolve(matches);
        },
      );
    });

    let totalFunctions = 0;
    let documentedFunctions = 0;

    for (const file of files) {
      const fullPath = path.join(srcPath, file);
      const content = await fs.readFile(fullPath, "utf-8");
      const lines = content.split("\n");

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Check for function declarations
        if (
          /(?:export\s+)?(?:async\s+)?function\s+\w+|(?:export\s+)?const\s+\w+\s*=\s*(?:async\s+)?\(/.test(
            line,
          )
        ) {
          totalFunctions++;

          // Check if previous lines have JSDoc comment
          let hasDoc = false;
          for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
            if (
              lines[j].trim().startsWith("/**") ||
              lines[j].trim().startsWith("*")
            ) {
              hasDoc = true;
              break;
            }
          }

          if (hasDoc) {
            documentedFunctions++;
          }
        }
      }
    }

    const documentationCoverage =
      totalFunctions > 0
        ? Math.round((documentedFunctions / totalFunctions) * 100)
        : 100;

    return {
      documentedFunctions,
      totalFunctions,
      documentationCoverage,
    };
  }

  private calculateOverallScore(metrics: Partial<QualityMetrics>): number {
    const weights = {
      coverage: 0.25,
      security: 0.25,
      codeQuality: 0.2,
      testing: 0.15,
      documentation: 0.1,
      performance: 0.05,
    };

    let score = 0;

    // Coverage score (average of all metrics)
    if (metrics.coverage) {
      const coverageAvg =
        (metrics.coverage.lines +
          metrics.coverage.functions +
          metrics.coverage.branches +
          metrics.coverage.statements) /
        4;
      score += coverageAvg * weights.coverage;
    }

    // Security score
    if (metrics.security) {
      score += metrics.security.score * weights.security;
    }

    // Code quality score (inverse of complexity, max 100)
    if (metrics.codeQuality) {
      const complexityScore = Math.max(
        0,
        100 - metrics.codeQuality.averageComplexity * 5,
      );
      const lintScore = Math.max(
        0,
        100 -
          metrics.codeQuality.lintErrors * 10 -
          metrics.codeQuality.lintWarnings * 2,
      );
      const qualityScore = (complexityScore + lintScore) / 2;
      score += qualityScore * weights.codeQuality;
    }

    // Testing score
    if (metrics.testing) {
      const testPassRate =
        metrics.testing.totalTests > 0
          ? (metrics.testing.passing / metrics.testing.totalTests) * 100
          : 100;
      score += testPassRate * weights.testing;
    }

    // Documentation score
    if (metrics.documentation) {
      score +=
        metrics.documentation.documentationCoverage * weights.documentation;
    }

    // Performance score (placeholder)
    score += 80 * weights.performance;

    return Math.round(score);
  }

  private scoreToGrade(score: number): "A" | "B" | "C" | "D" | "F" {
    if (score >= 90) return "A";
    if (score >= 80) return "B";
    if (score >= 70) return "C";
    if (score >= 60) return "D";
    return "F";
  }

  private async saveMetrics(
    metrics: QualityMetrics,
    projectPath: string,
  ): Promise<void> {
    const reportsDir = path.join(projectPath, ".claude", "reports");
    await fs.mkdir(reportsDir, { recursive: true });

    const metricsPath = path.join(reportsDir, "quality-metrics.json");
    await fs.writeFile(metricsPath, JSON.stringify(metrics, null, 2));

    // Also save history
    const historyPath = path.join(reportsDir, "metrics-history.jsonl");
    await fs.appendFile(historyPath, JSON.stringify(metrics) + "\n");
  }

  private async generateDashboardHTML(
    metrics: QualityMetrics,
    projectPath: string,
  ): Promise<void> {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NXTG-Forge Quality Dashboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 2rem;
      min-height: 100vh;
    }
    .dashboard {
      max-width: 1400px;
      margin: 0 auto;
      background: white;
      border-radius: 20px;
      padding: 2rem;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    h1 {
      color: #333;
      margin-bottom: 0.5rem;
      font-size: 2.5rem;
    }
    .timestamp {
      color: #666;
      font-size: 0.9rem;
      margin-bottom: 2rem;
    }
    .grade {
      font-size: 6rem;
      font-weight: bold;
      text-align: center;
      margin: 2rem 0;
      padding: 2rem;
      border-radius: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
    }
    .grade-label {
      font-size: 1.2rem;
      margin-top: 1rem;
      opacity: 0.9;
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1.5rem;
      margin: 2rem 0;
    }
    .metric-card {
      background: #f8f9fa;
      padding: 1.5rem;
      border-radius: 12px;
      border-left: 4px solid #667eea;
    }
    .metric-title {
      font-size: 0.9rem;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 0.5rem;
    }
    .metric-value {
      font-size: 2.5rem;
      font-weight: bold;
      color: #333;
    }
    .metric-subtitle {
      font-size: 0.9rem;
      color: #888;
      margin-top: 0.5rem;
    }
    .progress-bar {
      width: 100%;
      height: 10px;
      background: #e0e0e0;
      border-radius: 5px;
      overflow: hidden;
      margin-top: 0.5rem;
    }
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
      transition: width 0.3s ease;
    }
    .status-badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 600;
      margin-top: 0.5rem;
    }
    .status-good { background: #d4edda; color: #155724; }
    .status-warning { background: #fff3cd; color: #856404; }
    .status-danger { background: #f8d7da; color: #721c24; }
    .footer {
      text-align: center;
      margin-top: 3rem;
      padding-top: 2rem;
      border-top: 1px solid #e0e0e0;
      color: #666;
      font-size: 0.9rem;
    }
  </style>
</head>
<body>
  <div class="dashboard">
    <h1>Quality Dashboard</h1>
    <div class="timestamp">Generated: ${metrics.timestamp.toLocaleString()}</div>

    <div class="grade">
      ${metrics.overallGrade}
      <div class="grade-label">Overall Score: ${metrics.overallScore}/100</div>
    </div>

    <div class="metrics-grid">
      <!-- Coverage -->
      <div class="metric-card">
        <div class="metric-title">Test Coverage</div>
        <div class="metric-value">${Math.round((metrics.coverage.lines + metrics.coverage.statements) / 2)}%</div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${(metrics.coverage.lines + metrics.coverage.statements) / 2}%"></div>
        </div>
        <div class="metric-subtitle">
          Lines: ${metrics.coverage.lines}% | Functions: ${metrics.coverage.functions}% | Branches: ${metrics.coverage.branches}%
        </div>
        <span class="status-badge ${metrics.coverage.lines >= 85 ? "status-good" : metrics.coverage.lines >= 70 ? "status-warning" : "status-danger"}">
          ${metrics.coverage.lines >= 85 ? "Excellent" : metrics.coverage.lines >= 70 ? "Good" : "Needs Work"}
        </span>
      </div>

      <!-- Security -->
      <div class="metric-card">
        <div class="metric-title">Security Score</div>
        <div class="metric-value">${metrics.security.score}/100</div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${metrics.security.score}%"></div>
        </div>
        <div class="metric-subtitle">
          Critical: ${metrics.security.criticalIssues} | High: ${metrics.security.highIssues} | Medium: ${metrics.security.mediumIssues}
        </div>
        <span class="status-badge ${metrics.security.criticalIssues === 0 && metrics.security.highIssues === 0 ? "status-good" : metrics.security.criticalIssues > 0 ? "status-danger" : "status-warning"}">
          ${metrics.security.criticalIssues === 0 && metrics.security.highIssues === 0 ? "Secure" : metrics.security.criticalIssues > 0 ? "Critical Issues" : "Review Needed"}
        </span>
      </div>

      <!-- Code Quality -->
      <div class="metric-card">
        <div class="metric-title">Code Quality</div>
        <div class="metric-value">${metrics.codeQuality.averageComplexity.toFixed(1)}</div>
        <div class="metric-subtitle">
          Average Complexity | ${metrics.codeQuality.totalFiles} files
        </div>
        <span class="status-badge ${metrics.codeQuality.averageComplexity < 5 ? "status-good" : metrics.codeQuality.averageComplexity < 10 ? "status-warning" : "status-danger"}">
          ${metrics.codeQuality.averageComplexity < 5 ? "Simple" : metrics.codeQuality.averageComplexity < 10 ? "Moderate" : "Complex"}
        </span>
      </div>

      <!-- Documentation -->
      <div class="metric-card">
        <div class="metric-title">Documentation</div>
        <div class="metric-value">${metrics.documentation.documentationCoverage}%</div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${metrics.documentation.documentationCoverage}%"></div>
        </div>
        <div class="metric-subtitle">
          ${metrics.documentation.documentedFunctions}/${metrics.documentation.totalFunctions} functions documented
        </div>
        <span class="status-badge ${metrics.documentation.documentationCoverage >= 80 ? "status-good" : metrics.documentation.documentationCoverage >= 60 ? "status-warning" : "status-danger"}">
          ${metrics.documentation.documentationCoverage >= 80 ? "Well Documented" : metrics.documentation.documentationCoverage >= 60 ? "Adequate" : "Lacking"}
        </span>
      </div>
    </div>

    <div class="footer">
      NXTG-Forge Quality Dashboard | Forge Guardian v3.0
    </div>
  </div>
</body>
</html>
`;

    const htmlPath = path.join(
      projectPath,
      ".claude",
      "reports",
      "quality-dashboard.html",
    );
    await fs.writeFile(htmlPath, html);

    console.log(`\nQuality dashboard generated: ${htmlPath}`);
    console.log(`Open in browser: file://${htmlPath}`);
  }
}

// CLI usage
if (require.main === module) {
  const dashboard = new QualityDashboard();
  dashboard
    .generateMetrics()
    .then((metrics) => {
      console.log("\n=== Quality Metrics ===");
      console.log(
        `Overall Grade: ${metrics.overallGrade} (${metrics.overallScore}/100)`,
      );
      console.log(
        `Coverage: ${Math.round((metrics.coverage.lines + metrics.coverage.statements) / 2)}%`,
      );
      console.log(`Security Score: ${metrics.security.score}/100`);
      console.log(
        `Documentation: ${metrics.documentation.documentationCoverage}%`,
      );
    })
    .catch((error) => {
      console.error("Failed to generate metrics:", error);
      process.exit(1);
    });
}
