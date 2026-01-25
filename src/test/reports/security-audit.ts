/**
 * Security Audit Report Generator
 * Comprehensive security analysis and reporting
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { glob } from 'glob';

export interface SecurityViolation {
  file: string;
  line: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  description: string;
  recommendation: string;
}

export interface SecurityAuditReport {
  timestamp: Date;
  summary: {
    totalFiles: number;
    filesScanned: number;
    violations: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
    passedChecks: number;
    failedChecks: number;
    overallScore: number; // 0-100
  };
  violations: SecurityViolation[];
  recommendations: string[];
  complianceStatus: {
    inputValidation: boolean;
    xssPrevention: boolean;
    commandInjectionPrevention: boolean;
    pathTraversalPrevention: boolean;
    secretManagement: boolean;
    accessControl: boolean;
  };
}

export class SecurityAuditor {
  private violations: SecurityViolation[] = [];
  private passedChecks = 0;
  private failedChecks = 0;

  async runAudit(projectPath: string = process.cwd()): Promise<SecurityAuditReport> {
    this.violations = [];
    this.passedChecks = 0;
    this.failedChecks = 0;

    const srcPath = path.join(projectPath, 'src');

    // Scan all TypeScript files
    const files = await new Promise<string[]>((resolve, reject) => {
      glob('**/*.{ts,tsx}', {
        cwd: srcPath,
        ignore: ['**/*.test.ts', '**/*.test.tsx', '**/*.d.ts', '**/node_modules/**']
      }, (err, matches) => {
        if (err) reject(err);
        else resolve(matches);
      });
    });

    console.log(`Scanning ${files.length} files for security issues...`);

    for (const file of files) {
      const fullPath = path.join(srcPath, file);
      await this.scanFile(fullPath, file);
    }

    const report = this.generateReport(files.length);
    await this.saveReport(report, projectPath);

    return report;
  }

  private async scanFile(filePath: string, relativePath: string): Promise<void> {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      this.checkHardcodedSecrets(line, index + 1, relativePath);
      this.checkSqlInjection(line, index + 1, relativePath);
      this.checkXssVulnerabilities(line, index + 1, relativePath);
      this.checkCommandInjection(line, index + 1, relativePath);
      this.checkPathTraversal(line, index + 1, relativePath);
      this.checkInsecureCrypto(line, index + 1, relativePath);
    });

    // File-level checks
    this.checkInputValidation(content, relativePath);
    this.checkAccessControl(content, relativePath);
  }

  private checkHardcodedSecrets(line: string, lineNum: number, file: string): void {
    const secretPatterns = [
      { pattern: /api[_-]?key\s*=\s*['"][a-zA-Z0-9]{20,}['"]/i, name: 'API Key' },
      { pattern: /secret[_-]?key\s*=\s*['"][a-zA-Z0-9]{20,}['"]/i, name: 'Secret Key' },
      { pattern: /password\s*=\s*['"][^'"]{8,}['"]/i, name: 'Password' },
      { pattern: /token\s*=\s*['"][a-zA-Z0-9]{20,}['"]/i, name: 'Token' },
      { pattern: /sk-[a-zA-Z0-9]{48}/, name: 'OpenAI API Key' },
      { pattern: /github_pat_[a-zA-Z0-9]{82}/, name: 'GitHub PAT' },
      { pattern: /AIza[a-zA-Z0-9_\-]{35}/, name: 'Google API Key' },
    ];

    // Skip comments
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
      return;
    }

    for (const { pattern, name } of secretPatterns) {
      if (pattern.test(line)) {
        this.violations.push({
          file,
          line: lineNum,
          severity: 'critical',
          category: 'Hardcoded Secrets',
          description: `Potential hardcoded ${name} detected`,
          recommendation: 'Use environment variables or secure secret management instead'
        });
        this.failedChecks++;
        return;
      }
    }

    this.passedChecks++;
  }

  private checkSqlInjection(line: string, lineNum: number, file: string): void {
    // Check for string concatenation in SQL queries
    const sqlConcatPattern = /[`'"]SELECT|INSERT|UPDATE|DELETE.*\+.*[`'"]/i;
    const templateLiteralSql = /`SELECT|INSERT|UPDATE|DELETE.*\${/i;

    if (sqlConcatPattern.test(line)) {
      this.violations.push({
        file,
        line: lineNum,
        severity: 'high',
        category: 'SQL Injection',
        description: 'Potential SQL injection via string concatenation',
        recommendation: 'Use parameterized queries or prepared statements'
      });
      this.failedChecks++;
    } else if (templateLiteralSql.test(line)) {
      this.violations.push({
        file,
        line: lineNum,
        severity: 'high',
        category: 'SQL Injection',
        description: 'Potential SQL injection via template literals',
        recommendation: 'Use parameterized queries with proper escaping'
      });
      this.failedChecks++;
    } else {
      this.passedChecks++;
    }
  }

  private checkXssVulnerabilities(line: string, lineNum: number, file: string): void {
    // Check for dangerous innerHTML usage
    if (/\.innerHTML\s*=/.test(line) && !line.includes('DOMPurify') && !line.includes('sanitize')) {
      this.violations.push({
        file,
        line: lineNum,
        severity: 'high',
        category: 'XSS Vulnerability',
        description: 'Unsafe innerHTML assignment without sanitization',
        recommendation: 'Use textContent or sanitize HTML with DOMPurify'
      });
      this.failedChecks++;
    }

    // Check for dangerouslySetInnerHTML in React
    if (/dangerouslySetInnerHTML/.test(line) && !line.includes('DOMPurify')) {
      this.violations.push({
        file,
        line: lineNum,
        severity: 'high',
        category: 'XSS Vulnerability',
        description: 'dangerouslySetInnerHTML used without sanitization',
        recommendation: 'Sanitize HTML content before rendering'
      });
      this.failedChecks++;
    }
  }

  private checkCommandInjection(line: string, lineNum: number, file: string): void {
    // Check for command execution with user input
    const dangerousFunctions = ['exec', 'spawn', 'execSync', 'execFile', 'eval'];

    for (const func of dangerousFunctions) {
      if (new RegExp(`\\b${func}\\s*\\(`).test(line)) {
        // Check if input validation is nearby (simplified check)
        if (!line.includes('validate') && !line.includes('sanitize') && !line.includes('escape')) {
          this.violations.push({
            file,
            line: lineNum,
            severity: 'critical',
            category: 'Command Injection',
            description: `Potentially unsafe ${func}() call`,
            recommendation: 'Validate and sanitize all inputs before executing commands'
          });
          this.failedChecks++;
        }
      }
    }
  }

  private checkPathTraversal(line: string, lineNum: number, file: string): void {
    // Check for path operations without validation
    if (/path\.join\(|fs\.(readFile|writeFile|unlink)/.test(line)) {
      if (!line.includes('validate') && !line.includes('.claude') && line.includes('..')) {
        this.violations.push({
          file,
          line: lineNum,
          severity: 'high',
          category: 'Path Traversal',
          description: 'Potential path traversal vulnerability',
          recommendation: 'Validate paths and restrict to allowed directories'
        });
        this.failedChecks++;
      }
    }
  }

  private checkInsecureCrypto(line: string, lineNum: number, file: string): void {
    // Check for weak cryptographic algorithms
    const weakAlgorithms = ['md5', 'sha1', 'des', 'rc4'];

    for (const algo of weakAlgorithms) {
      if (new RegExp(`['"]${algo}['"]`, 'i').test(line)) {
        this.violations.push({
          file,
          line: lineNum,
          severity: 'medium',
          category: 'Weak Cryptography',
          description: `Weak cryptographic algorithm detected: ${algo}`,
          recommendation: 'Use modern algorithms like SHA-256, SHA-512, or bcrypt'
        });
        this.failedChecks++;
      }
    }
  }

  private checkInputValidation(content: string, file: string): void {
    // Check for Zod schema validation
    const hasZodValidation = /import.*zod|from\s+['"]zod['"]/.test(content);
    const hasUserInput = /input|req\.|query|params|body/.test(content);

    if (hasUserInput && !hasZodValidation && !content.includes('validate')) {
      this.violations.push({
        file,
        line: 0,
        severity: 'medium',
        category: 'Input Validation',
        description: 'File handles user input without explicit validation',
        recommendation: 'Add Zod schema validation for all user inputs'
      });
      this.failedChecks++;
    }
  }

  private checkAccessControl(content: string, file: string): void {
    // Check for access control in API routes
    if (file.includes('route') || file.includes('api') || file.includes('handler')) {
      const hasAuthCheck = /auth|authenticate|authorize|permission|role/.test(content);

      if (!hasAuthCheck) {
        this.violations.push({
          file,
          line: 0,
          severity: 'high',
          category: 'Access Control',
          description: 'API endpoint may lack authentication/authorization',
          recommendation: 'Implement proper authentication and authorization checks'
        });
        this.failedChecks++;
      }
    }
  }

  private generateReport(totalFiles: number): SecurityAuditReport {
    const violationsBySeverity = {
      critical: this.violations.filter(v => v.severity === 'critical').length,
      high: this.violations.filter(v => v.severity === 'high').length,
      medium: this.violations.filter(v => v.severity === 'medium').length,
      low: this.violations.filter(v => v.severity === 'low').length
    };

    // Calculate overall score (0-100)
    const totalChecks = this.passedChecks + this.failedChecks;
    const baseScore = totalChecks > 0 ? (this.passedChecks / totalChecks) * 100 : 0;

    // Deduct points for violations
    const criticalPenalty = violationsBySeverity.critical * 10;
    const highPenalty = violationsBySeverity.high * 5;
    const mediumPenalty = violationsBySeverity.medium * 2;
    const lowPenalty = violationsBySeverity.low * 1;

    const overallScore = Math.max(
      0,
      baseScore - criticalPenalty - highPenalty - mediumPenalty - lowPenalty
    );

    const recommendations: string[] = [];

    if (violationsBySeverity.critical > 0) {
      recommendations.push('CRITICAL: Address all hardcoded secrets and command injection vulnerabilities immediately');
    }
    if (violationsBySeverity.high > 0) {
      recommendations.push('HIGH: Implement input validation and XSS prevention measures');
    }
    if (violationsBySeverity.medium > 0) {
      recommendations.push('MEDIUM: Replace weak cryptographic algorithms and improve access controls');
    }

    if (overallScore >= 90) {
      recommendations.push('Excellent security posture. Continue monitoring and testing.');
    } else if (overallScore >= 70) {
      recommendations.push('Good security foundation. Address high and critical issues.');
    } else if (overallScore >= 50) {
      recommendations.push('Security needs improvement. Prioritize critical vulnerabilities.');
    } else {
      recommendations.push('URGENT: Significant security gaps detected. Immediate action required.');
    }

    return {
      timestamp: new Date(),
      summary: {
        totalFiles,
        filesScanned: totalFiles,
        violations: violationsBySeverity,
        passedChecks: this.passedChecks,
        failedChecks: this.failedChecks,
        overallScore: Math.round(overallScore)
      },
      violations: this.violations.sort((a, b) => {
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      }),
      recommendations,
      complianceStatus: {
        inputValidation: this.violations.filter(v => v.category === 'Input Validation').length === 0,
        xssPrevention: this.violations.filter(v => v.category === 'XSS Vulnerability').length === 0,
        commandInjectionPrevention: this.violations.filter(v => v.category === 'Command Injection').length === 0,
        pathTraversalPrevention: this.violations.filter(v => v.category === 'Path Traversal').length === 0,
        secretManagement: this.violations.filter(v => v.category === 'Hardcoded Secrets').length === 0,
        accessControl: this.violations.filter(v => v.category === 'Access Control').length === 0
      }
    };
  }

  private async saveReport(report: SecurityAuditReport, projectPath: string): Promise<void> {
    const reportsDir = path.join(projectPath, '.claude', 'reports');
    await fs.mkdir(reportsDir, { recursive: true });

    const reportPath = path.join(reportsDir, 'security-audit.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    // Also save markdown version
    const markdown = this.reportToMarkdown(report);
    const markdownPath = path.join(reportsDir, 'security-audit.md');
    await fs.writeFile(markdownPath, markdown);

    console.log(`Security audit report saved to ${reportPath}`);
  }

  private reportToMarkdown(report: SecurityAuditReport): string {
    const lines: string[] = [];

    lines.push('# Security Audit Report');
    lines.push('');
    lines.push(`Generated: ${report.timestamp.toISOString()}`);
    lines.push('');

    // Summary
    lines.push('## Summary');
    lines.push('');
    lines.push(`- Files Scanned: ${report.summary.filesScanned}`);
    lines.push(`- Overall Security Score: **${report.summary.overallScore}/100**`);
    lines.push(`- Passed Checks: ${report.summary.passedChecks}`);
    lines.push(`- Failed Checks: ${report.summary.failedChecks}`);
    lines.push('');

    // Violations by Severity
    lines.push('### Violations by Severity');
    lines.push('');
    lines.push(`- Critical: ${report.summary.violations.critical}`);
    lines.push(`- High: ${report.summary.violations.high}`);
    lines.push(`- Medium: ${report.summary.violations.medium}`);
    lines.push(`- Low: ${report.summary.violations.low}`);
    lines.push('');

    // Compliance Status
    lines.push('## Compliance Status');
    lines.push('');
    Object.entries(report.complianceStatus).forEach(([check, passed]) => {
      const icon = passed ? '✅' : '❌';
      lines.push(`${icon} ${check.replace(/([A-Z])/g, ' $1').trim()}`);
    });
    lines.push('');

    // Recommendations
    lines.push('## Recommendations');
    lines.push('');
    report.recommendations.forEach(rec => {
      lines.push(`- ${rec}`);
    });
    lines.push('');

    // Detailed Violations
    if (report.violations.length > 0) {
      lines.push('## Detailed Violations');
      lines.push('');

      const violationsByCategory = report.violations.reduce((acc, v) => {
        if (!acc[v.category]) acc[v.category] = [];
        acc[v.category].push(v);
        return acc;
      }, {} as Record<string, SecurityViolation[]>);

      Object.entries(violationsByCategory).forEach(([category, violations]) => {
        lines.push(`### ${category}`);
        lines.push('');

        violations.forEach(v => {
          lines.push(`**${v.severity.toUpperCase()}** - ${v.file}:${v.line}`);
          lines.push(`- Description: ${v.description}`);
          lines.push(`- Recommendation: ${v.recommendation}`);
          lines.push('');
        });
      });
    }

    return lines.join('\n');
  }
}

// CLI usage
if (require.main === module) {
  const auditor = new SecurityAuditor();
  auditor.runAudit()
    .then(report => {
      console.log('\n=== Security Audit Complete ===');
      console.log(`Overall Score: ${report.summary.overallScore}/100`);
      console.log(`Critical Issues: ${report.summary.violations.critical}`);
      console.log(`High Issues: ${report.summary.violations.high}`);
      console.log(`Medium Issues: ${report.summary.violations.medium}`);
      console.log(`Low Issues: ${report.summary.violations.low}`);

      if (report.summary.violations.critical > 0) {
        console.error('\n⚠️  CRITICAL security issues detected!');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Audit failed:', error);
      process.exit(1);
    });
}
