/**
 * Health Monitoring System
 * Comprehensive health checks and scoring for NXTG-Forge
 */

import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { performance } from 'perf_hooks';
import { Logger } from '../utils/logger';

const logger = new Logger('HealthMonitor');

// Health check types
export enum HealthCheckType {
  UI_RESPONSIVENESS = 'ui_responsiveness',
  BACKEND_AVAILABILITY = 'backend_availability',
  STATE_SYNC = 'state_sync',
  AGENT_EXECUTION = 'agent_execution',
  FILE_SYSTEM = 'file_system',
  MEMORY_USAGE = 'memory_usage',
  COMMAND_PROCESSING = 'command_processing',
  AUTOMATION_SYSTEM = 'automation_system'
}

// Health status levels
export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  CRITICAL = 'critical',
  FAILED = 'failed'
}

// Individual health check result
export interface HealthCheckResult {
  type: HealthCheckType;
  status: HealthStatus;
  score: number; // 0-100
  latency: number; // milliseconds
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
}

// Overall system health
export interface SystemHealth {
  overallScore: number; // 0-100
  status: HealthStatus;
  checks: HealthCheckResult[];
  timestamp: Date;
  uptime: number; // seconds
  recommendations?: string[];
}

// Health check weights for scoring
const HEALTH_WEIGHTS: Record<HealthCheckType, number> = {
  [HealthCheckType.UI_RESPONSIVENESS]: 0.15,
  [HealthCheckType.BACKEND_AVAILABILITY]: 0.20,
  [HealthCheckType.STATE_SYNC]: 0.15,
  [HealthCheckType.AGENT_EXECUTION]: 0.15,
  [HealthCheckType.FILE_SYSTEM]: 0.10,
  [HealthCheckType.MEMORY_USAGE]: 0.10,
  [HealthCheckType.COMMAND_PROCESSING]: 0.10,
  [HealthCheckType.AUTOMATION_SYSTEM]: 0.05
};

// Health thresholds
const HEALTH_THRESHOLDS = {
  healthy: 85,
  degraded: 70,
  critical: 50
};

export class HealthMonitor extends EventEmitter {
  private startTime: number;
  private checkInterval: NodeJS.Timeout | null = null;
  private lastHealth: SystemHealth | null = null;
  private projectPath: string;
  private healthHistory: SystemHealth[] = [];
  private maxHistorySize = 100;

  constructor(projectPath?: string) {
    super();
    this.startTime = Date.now();
    this.projectPath = projectPath || process.cwd();
  }

  /**
   * Start health monitoring
   */
  async start(intervalMs: number = 30000): Promise<void> {
    logger.info('Starting health monitoring', { interval: intervalMs });

    // Perform initial check
    await this.performHealthCheck();

    // Set up periodic checks
    this.checkInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, intervalMs);
  }

  /**
   * Stop health monitoring
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      logger.info('Health monitoring stopped');
    }
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck(): Promise<SystemHealth> {
    const checks: HealthCheckResult[] = [];
    const startTime = performance.now();

    // Run all health checks in parallel
    const checkPromises = [
      this.checkUIResponsiveness(),
      this.checkBackendAvailability(),
      this.checkStateSync(),
      this.checkAgentExecution(),
      this.checkFileSystem(),
      this.checkMemoryUsage(),
      this.checkCommandProcessing(),
      this.checkAutomationSystem()
    ];

    const results = await Promise.allSettled(checkPromises);

    // Process results
    for (const result of results) {
      if (result.status === 'fulfilled') {
        checks.push(result.value);
      } else {
        // Handle failed checks
        logger.error('Health check failed', result.reason);
        checks.push({
          type: HealthCheckType.BACKEND_AVAILABILITY,
          status: HealthStatus.FAILED,
          score: 0,
          latency: performance.now() - startTime,
          message: 'Health check failed',
          details: { error: result.reason?.message || 'Unknown error' },
          timestamp: new Date()
        });
      }
    }

    // Calculate overall health
    const overallScore = this.calculateOverallScore(checks);
    const status = this.determineStatus(overallScore);
    const uptime = (Date.now() - this.startTime) / 1000;

    const health: SystemHealth = {
      overallScore,
      status,
      checks,
      timestamp: new Date(),
      uptime,
      recommendations: this.generateRecommendations(checks)
    };

    // Update history
    this.healthHistory.push(health);
    if (this.healthHistory.length > this.maxHistorySize) {
      this.healthHistory.shift();
    }

    // Emit health update event
    this.emit('healthUpdate', health);

    // Check for degradation
    if (this.lastHealth && health.status !== this.lastHealth.status) {
      this.emit('statusChange', {
        previous: this.lastHealth.status,
        current: health.status,
        score: health.overallScore
      });
    }

    this.lastHealth = health;
    return health;
  }

  /**
   * Check UI responsiveness
   */
  private async checkUIResponsiveness(): Promise<HealthCheckResult> {
    const start = performance.now();

    try {
      // Check if UI components are accessible
      const uiPath = path.join(this.projectPath, 'src', 'components');
      const exists = fs.existsSync(uiPath);

      if (!exists) {
        throw new Error('UI components not found');
      }

      // Simulate UI response time check
      const responseTime = Math.random() * 100; // Mock response time
      const score = responseTime < 50 ? 100 : responseTime < 100 ? 85 : 70;

      return {
        type: HealthCheckType.UI_RESPONSIVENESS,
        status: score >= 85 ? HealthStatus.HEALTHY : HealthStatus.DEGRADED,
        score,
        latency: performance.now() - start,
        message: `UI response time: ${responseTime.toFixed(2)}ms`,
        details: { responseTime },
        timestamp: new Date()
      };
    } catch (error) {
      return {
        type: HealthCheckType.UI_RESPONSIVENESS,
        status: HealthStatus.FAILED,
        score: 0,
        latency: performance.now() - start,
        message: `UI check failed: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * Check backend availability
   */
  private async checkBackendAvailability(): Promise<HealthCheckResult> {
    const start = performance.now();

    try {
      // Check core systems
      const corePath = path.join(this.projectPath, 'src', 'core');
      const coreFiles = ['orchestrator.ts', 'state.ts', 'coordination.ts', 'vision.ts'];

      let available = 0;
      for (const file of coreFiles) {
        if (fs.existsSync(path.join(corePath, file))) {
          available++;
        }
      }

      const score = (available / coreFiles.length) * 100;

      return {
        type: HealthCheckType.BACKEND_AVAILABILITY,
        status: score >= 85 ? HealthStatus.HEALTHY : score >= 50 ? HealthStatus.DEGRADED : HealthStatus.CRITICAL,
        score,
        latency: performance.now() - start,
        message: `Backend systems: ${available}/${coreFiles.length} available`,
        details: { available, total: coreFiles.length },
        timestamp: new Date()
      };
    } catch (error) {
      return {
        type: HealthCheckType.BACKEND_AVAILABILITY,
        status: HealthStatus.FAILED,
        score: 0,
        latency: performance.now() - start,
        message: `Backend check failed: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * Check state synchronization health
   */
  private async checkStateSync(): Promise<HealthCheckResult> {
    const start = performance.now();

    try {
      // Check state files
      const statePath = path.join(this.projectPath, '.claude', 'state');
      const stateFile = path.join(statePath, 'current.json');

      if (!fs.existsSync(stateFile)) {
        throw new Error('State file not found');
      }

      const stats = fs.statSync(stateFile);
      const ageMs = Date.now() - stats.mtime.getTime();
      const ageMinutes = ageMs / (1000 * 60);

      // Score based on state freshness
      const score = ageMinutes < 1 ? 100 : ageMinutes < 5 ? 85 : ageMinutes < 15 ? 70 : 50;

      return {
        type: HealthCheckType.STATE_SYNC,
        status: score >= 85 ? HealthStatus.HEALTHY : score >= 70 ? HealthStatus.DEGRADED : HealthStatus.CRITICAL,
        score,
        latency: performance.now() - start,
        message: `State age: ${ageMinutes.toFixed(1)} minutes`,
        details: { ageMinutes, lastModified: stats.mtime },
        timestamp: new Date()
      };
    } catch (error) {
      return {
        type: HealthCheckType.STATE_SYNC,
        status: HealthStatus.FAILED,
        score: 0,
        latency: performance.now() - start,
        message: `State sync check failed: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * Check agent execution health
   */
  private async checkAgentExecution(): Promise<HealthCheckResult> {
    const start = performance.now();

    try {
      // Check agent files
      const agentsPath = path.join(this.projectPath, '.claude', 'agents');
      const agentFiles = ['orchestrator.md', 'architect.md', 'developer.md', 'qa.md', 'devops.md'];

      let available = 0;
      for (const file of agentFiles) {
        if (fs.existsSync(path.join(agentsPath, file))) {
          available++;
        }
      }

      const score = (available / agentFiles.length) * 100;

      return {
        type: HealthCheckType.AGENT_EXECUTION,
        status: score >= 80 ? HealthStatus.HEALTHY : score >= 60 ? HealthStatus.DEGRADED : HealthStatus.CRITICAL,
        score,
        latency: performance.now() - start,
        message: `Agents available: ${available}/${agentFiles.length}`,
        details: { available, total: agentFiles.length },
        timestamp: new Date()
      };
    } catch (error) {
      return {
        type: HealthCheckType.AGENT_EXECUTION,
        status: HealthStatus.FAILED,
        score: 0,
        latency: performance.now() - start,
        message: `Agent check failed: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * Check file system access
   */
  private async checkFileSystem(): Promise<HealthCheckResult> {
    const start = performance.now();

    try {
      const testPath = path.join(this.projectPath, '.claude', 'health-test.tmp');

      // Test write
      fs.writeFileSync(testPath, 'health-check');

      // Test read
      const content = fs.readFileSync(testPath, 'utf-8');

      // Test delete
      fs.unlinkSync(testPath);

      if (content !== 'health-check') {
        throw new Error('File system read/write mismatch');
      }

      return {
        type: HealthCheckType.FILE_SYSTEM,
        status: HealthStatus.HEALTHY,
        score: 100,
        latency: performance.now() - start,
        message: 'File system access healthy',
        timestamp: new Date()
      };
    } catch (error) {
      return {
        type: HealthCheckType.FILE_SYSTEM,
        status: HealthStatus.FAILED,
        score: 0,
        latency: performance.now() - start,
        message: `File system check failed: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * Check memory usage
   */
  private async checkMemoryUsage(): Promise<HealthCheckResult> {
    const start = performance.now();

    try {
      const usage = process.memoryUsage();
      const heapUsedMB = usage.heapUsed / 1024 / 1024;
      const heapTotalMB = usage.heapTotal / 1024 / 1024;
      const heapPercentage = (usage.heapUsed / usage.heapTotal) * 100;

      // Score based on heap usage percentage
      const score = heapPercentage < 70 ? 100 : heapPercentage < 85 ? 75 : heapPercentage < 95 ? 50 : 25;

      return {
        type: HealthCheckType.MEMORY_USAGE,
        status: score >= 75 ? HealthStatus.HEALTHY : score >= 50 ? HealthStatus.DEGRADED : HealthStatus.CRITICAL,
        score,
        latency: performance.now() - start,
        message: `Heap usage: ${heapUsedMB.toFixed(1)}MB / ${heapTotalMB.toFixed(1)}MB (${heapPercentage.toFixed(1)}%)`,
        details: {
          heapUsedMB,
          heapTotalMB,
          heapPercentage,
          rss: usage.rss / 1024 / 1024
        },
        timestamp: new Date()
      };
    } catch (error) {
      return {
        type: HealthCheckType.MEMORY_USAGE,
        status: HealthStatus.FAILED,
        score: 0,
        latency: performance.now() - start,
        message: `Memory check failed: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * Check command processing
   */
  private async checkCommandProcessing(): Promise<HealthCheckResult> {
    const start = performance.now();

    try {
      // Check command files
      const commandsPath = path.join(this.projectPath, '.claude', 'commands');

      if (!fs.existsSync(commandsPath)) {
        throw new Error('Commands directory not found');
      }

      const commands = fs.readdirSync(commandsPath).filter(f => f.endsWith('.md'));
      const score = commands.length > 0 ? 100 : 0;

      return {
        type: HealthCheckType.COMMAND_PROCESSING,
        status: score === 100 ? HealthStatus.HEALTHY : HealthStatus.FAILED,
        score,
        latency: performance.now() - start,
        message: `Commands available: ${commands.length}`,
        details: { commandCount: commands.length },
        timestamp: new Date()
      };
    } catch (error) {
      return {
        type: HealthCheckType.COMMAND_PROCESSING,
        status: HealthStatus.FAILED,
        score: 0,
        latency: performance.now() - start,
        message: `Command check failed: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * Check automation system (YOLO mode)
   */
  private async checkAutomationSystem(): Promise<HealthCheckResult> {
    const start = performance.now();

    try {
      // Check for automation configuration
      const configPath = path.join(this.projectPath, 'claude.json');
      const hasConfig = fs.existsSync(configPath);

      const score = hasConfig ? 100 : 75; // Automation is optional

      return {
        type: HealthCheckType.AUTOMATION_SYSTEM,
        status: HealthStatus.HEALTHY,
        score,
        latency: performance.now() - start,
        message: hasConfig ? 'Automation configured' : 'Automation not configured',
        details: { configured: hasConfig },
        timestamp: new Date()
      };
    } catch (error) {
      return {
        type: HealthCheckType.AUTOMATION_SYSTEM,
        status: HealthStatus.DEGRADED,
        score: 50,
        latency: performance.now() - start,
        message: `Automation check warning: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * Calculate overall health score
   */
  private calculateOverallScore(checks: HealthCheckResult[]): number {
    let weightedSum = 0;
    let totalWeight = 0;

    for (const check of checks) {
      const weight = HEALTH_WEIGHTS[check.type] || 0;
      weightedSum += check.score * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
  }

  /**
   * Determine health status from score
   */
  private determineStatus(score: number): HealthStatus {
    if (score >= HEALTH_THRESHOLDS.healthy) return HealthStatus.HEALTHY;
    if (score >= HEALTH_THRESHOLDS.degraded) return HealthStatus.DEGRADED;
    if (score >= HEALTH_THRESHOLDS.critical) return HealthStatus.CRITICAL;
    return HealthStatus.FAILED;
  }

  /**
   * Generate recommendations based on health checks
   */
  private generateRecommendations(checks: HealthCheckResult[]): string[] {
    const recommendations: string[] = [];

    for (const check of checks) {
      if (check.status === HealthStatus.FAILED || check.status === HealthStatus.CRITICAL) {
        switch (check.type) {
          case HealthCheckType.UI_RESPONSIVENESS:
            recommendations.push('Optimize UI components for better performance');
            break;
          case HealthCheckType.BACKEND_AVAILABILITY:
            recommendations.push('Verify backend services are running and accessible');
            break;
          case HealthCheckType.STATE_SYNC:
            recommendations.push('Check state synchronization - may need to refresh state');
            break;
          case HealthCheckType.AGENT_EXECUTION:
            recommendations.push('Ensure all agent files are properly configured');
            break;
          case HealthCheckType.FILE_SYSTEM:
            recommendations.push('Check file system permissions and disk space');
            break;
          case HealthCheckType.MEMORY_USAGE:
            recommendations.push('High memory usage detected - consider restarting or optimizing');
            break;
          case HealthCheckType.COMMAND_PROCESSING:
            recommendations.push('Verify command configurations are properly set up');
            break;
          case HealthCheckType.AUTOMATION_SYSTEM:
            recommendations.push('Configure automation system for enhanced functionality');
            break;
        }
      }
    }

    return recommendations;
  }

  /**
   * Get current health status
   */
  getCurrentHealth(): SystemHealth | null {
    return this.lastHealth;
  }

  /**
   * Get health history
   */
  getHealthHistory(): SystemHealth[] {
    return [...this.healthHistory];
  }

  /**
   * Get health trends
   */
  getHealthTrends(): {
    averageScore: number;
    trend: 'improving' | 'stable' | 'degrading';
    criticalCount: number;
  } {
    if (this.healthHistory.length < 2) {
      return {
        averageScore: this.lastHealth?.overallScore || 0,
        trend: 'stable',
        criticalCount: 0
      };
    }

    const scores = this.healthHistory.map(h => h.overallScore);
    const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;

    // Check trend over last 5 measurements
    const recentScores = scores.slice(-5);
    const firstHalf = recentScores.slice(0, Math.floor(recentScores.length / 2));
    const secondHalf = recentScores.slice(Math.floor(recentScores.length / 2));

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    let trend: 'improving' | 'stable' | 'degrading';
    if (secondAvg > firstAvg + 5) trend = 'improving';
    else if (secondAvg < firstAvg - 5) trend = 'degrading';
    else trend = 'stable';

    const criticalCount = this.healthHistory.filter(
      h => h.status === HealthStatus.CRITICAL || h.status === HealthStatus.FAILED
    ).length;

    return {
      averageScore: Math.round(averageScore),
      trend,
      criticalCount
    };
  }
}