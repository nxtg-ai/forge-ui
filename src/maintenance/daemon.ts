/**
 * Maintenance Daemon
 *
 * Background service that runs maintenance tasks on a schedule.
 * Handles pattern scanning, performance analysis, health checks, and updates.
 */

import { EventEmitter } from 'events';
import { PatternScanner } from './pattern-scanner';
import { PerformanceAnalyzer } from './performance-analyzer';
import { HealthMonitor } from './health-monitor';
import { LearningDatabase } from './learning-database';
import { UpdateApplier } from './update-applier';

interface ScheduledTask {
  name: string;
  cronPattern: string;
  handler: () => Promise<void>;
  lastRun?: Date;
  nextRun?: Date;
  enabled: boolean;
}

interface DaemonConfig {
  /** Enable pattern scanning */
  enablePatternScan: boolean;
  /** Enable performance analysis */
  enablePerformanceAnalysis: boolean;
  /** Enable health monitoring */
  enableHealthMonitor: boolean;
  /** Enable automatic updates */
  enableAutoUpdates: boolean;
  /** Database path */
  databasePath: string;
  /** Confidence threshold for auto-applying updates (0-1) */
  autoApplyThreshold: number;
  /** Health check interval in milliseconds */
  healthCheckInterval: number;
  /** Verbose logging */
  verbose: boolean;
}

const DEFAULT_CONFIG: DaemonConfig = {
  enablePatternScan: true,
  enablePerformanceAnalysis: true,
  enableHealthMonitor: true,
  enableAutoUpdates: true,
  databasePath: '.forge/maintenance.db',
  autoApplyThreshold: 0.7,
  healthCheckInterval: 5 * 60 * 1000, // 5 minutes
  verbose: false,
};

/**
 * The Maintenance Daemon coordinates all maintenance activities.
 */
export class MaintenanceDaemon extends EventEmitter {
  private config: DaemonConfig;
  private running = false;
  private tasks: ScheduledTask[] = [];
  private intervals: NodeJS.Timeout[] = [];

  // Sub-components
  private patternScanner: PatternScanner;
  private performanceAnalyzer: PerformanceAnalyzer;
  private healthMonitor: HealthMonitor;
  private learningDatabase: LearningDatabase;
  private updateApplier: UpdateApplier;

  constructor(config: Partial<DaemonConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize sub-components
    this.learningDatabase = new LearningDatabase(this.config.databasePath);
    this.patternScanner = new PatternScanner(this.learningDatabase);
    this.performanceAnalyzer = new PerformanceAnalyzer(this.learningDatabase);
    this.healthMonitor = new HealthMonitor();
    this.updateApplier = new UpdateApplier(
      this.learningDatabase,
      this.config.autoApplyThreshold
    );

    this.setupTasks();
  }

  /**
   * Set up scheduled tasks
   */
  private setupTasks(): void {
    this.tasks = [
      {
        name: 'pattern-scan',
        cronPattern: '0 3 * * *', // Daily at 3 AM
        handler: () => this.runPatternScan(),
        enabled: this.config.enablePatternScan,
      },
      {
        name: 'performance-analysis',
        cronPattern: '0 4 * * 0', // Weekly on Sunday at 4 AM
        handler: () => this.runPerformanceAnalysis(),
        enabled: this.config.enablePerformanceAnalysis,
      },
      {
        name: 'health-check',
        cronPattern: '*/5 * * * *', // Every 5 minutes
        handler: () => this.runHealthChecks(),
        enabled: this.config.enableHealthMonitor,
      },
      {
        name: 'apply-updates',
        cronPattern: '0 4 * * *', // Daily at 4 AM
        handler: () => this.applyUpdates(),
        enabled: this.config.enableAutoUpdates,
      },
    ];
  }

  /**
   * Start the maintenance daemon
   */
  async start(): Promise<void> {
    if (this.running) {
      console.warn('[MaintenanceDaemon] Already running');
      return;
    }

    console.log('[MaintenanceDaemon] Starting...');

    // Initialize database
    await this.learningDatabase.initialize();

    this.running = true;

    // Start health check interval (most frequent task)
    if (this.config.enableHealthMonitor) {
      const healthInterval = setInterval(
        () => this.runHealthChecks(),
        this.config.healthCheckInterval
      );
      this.intervals.push(healthInterval);
    }

    // For other tasks, we use a simple interval-based approach
    // In production, you'd want a proper cron library like node-cron
    this.startScheduledTasks();

    this.emit('started');
    console.log('[MaintenanceDaemon] Started successfully');
  }

  /**
   * Stop the maintenance daemon
   */
  async stop(): Promise<void> {
    if (!this.running) {
      return;
    }

    console.log('[MaintenanceDaemon] Stopping...');

    this.running = false;

    // Clear all intervals
    for (const interval of this.intervals) {
      clearInterval(interval);
    }
    this.intervals = [];

    // Close database
    await this.learningDatabase.close();

    this.emit('stopped');
    console.log('[MaintenanceDaemon] Stopped');
  }

  /**
   * Check if daemon is running
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Run pattern scan manually
   */
  async runPatternScan(): Promise<void> {
    if (!this.running) return;

    this.log('Running pattern scan...');
    this.emit('taskStart', 'pattern-scan');

    try {
      const patterns = await this.patternScanner.scan();
      await this.learningDatabase.storePatterns(patterns);

      this.log(`Pattern scan complete. Found ${patterns.length} patterns.`);
      this.emit('taskComplete', 'pattern-scan', { patternCount: patterns.length });
    } catch (error) {
      console.error('[MaintenanceDaemon] Pattern scan failed:', error);
      this.emit('taskError', 'pattern-scan', error);
    }
  }

  /**
   * Run performance analysis manually
   */
  async runPerformanceAnalysis(): Promise<void> {
    if (!this.running) return;

    this.log('Running performance analysis...');
    this.emit('taskStart', 'performance-analysis');

    try {
      const metrics = await this.performanceAnalyzer.analyze();
      // Transform AgentMetrics to match storeMetrics signature
      const transformedMetrics = metrics.map(m => ({
        agentId: m.agentId,
        successRate: m.metrics.successRate,
        tasksCompleted: m.metrics.tasksCompleted,
        avgDurationMs: m.metrics.avgDuration,
        overrideRate: m.metrics.userOverrideRate,
        commonFailures: m.metrics.commonFailures,
      }));
      await this.learningDatabase.storeMetrics(transformedMetrics);

      // Generate improvement suggestions
      const suggestions = await this.generateSuggestions(transformedMetrics);
      if (suggestions.length > 0) {
        await this.queueSuggestions(suggestions);
      }

      this.log(`Performance analysis complete. Analyzed ${metrics.length} agents.`);
      this.emit('taskComplete', 'performance-analysis', {
        agentCount: metrics.length,
        suggestionCount: suggestions.length,
      });
    } catch (error) {
      console.error('[MaintenanceDaemon] Performance analysis failed:', error);
      this.emit('taskError', 'performance-analysis', error);
    }
  }

  /**
   * Run health checks manually
   */
  async runHealthChecks(): Promise<void> {
    if (!this.running) return;

    this.emit('taskStart', 'health-check');

    try {
      const results = await this.healthMonitor.check();

      for (const result of results) {
        // Log events
        await this.learningDatabase.logHealthEvent(result);

        // Handle based on status
        if (result.status === 'critical') {
          this.emit('healthCritical', result);
          // Auto-fix if possible
          for (const action of result.actions) {
            if (action.type === 'auto_fix' && action.handler) {
              this.log(`Auto-fixing: ${action.description}`);
              try {
                await action.handler();
              } catch (fixError) {
                console.error(`[MaintenanceDaemon] Auto-fix failed:`, fixError);
              }
            }
          }
        } else if (result.status === 'degraded') {
          this.emit('healthDegraded', result);
        }
      }

      this.emit('taskComplete', 'health-check', {
        checkCount: results.length,
        criticalCount: results.filter(r => r.status === 'critical').length,
      });
    } catch (error) {
      console.error('[MaintenanceDaemon] Health check failed:', error);
      this.emit('taskError', 'health-check', error);
    }
  }

  /**
   * Apply pending updates manually
   */
  async applyUpdates(): Promise<void> {
    if (!this.running) return;

    this.log('Applying pending updates...');
    this.emit('taskStart', 'apply-updates');

    try {
      const results = await this.updateApplier.applyPendingUpdates();

      this.log(`Updates complete. Applied: ${results.applied}, Queued for review: ${results.queued}`);
      this.emit('taskComplete', 'apply-updates', results);
    } catch (error) {
      console.error('[MaintenanceDaemon] Update application failed:', error);
      this.emit('taskError', 'apply-updates', error);
    }
  }

  /**
   * Get daemon status
   */
  getStatus(): {
    running: boolean;
    tasks: Array<{
      name: string;
      enabled: boolean;
      lastRun?: Date;
    }>;
    config: DaemonConfig;
  } {
    return {
      running: this.running,
      tasks: this.tasks.map(t => ({
        name: t.name,
        enabled: t.enabled,
        lastRun: t.lastRun,
      })),
      config: this.config,
    };
  }

  /**
   * Update configuration
   */
  configure(config: Partial<DaemonConfig>): void {
    Object.assign(this.config, config);
    this.setupTasks();
  }

  // ============================================================
  // PRIVATE METHODS
  // ============================================================

  private startScheduledTasks(): void {
    // Simple daily check at midnight for daily tasks
    const dailyCheck = setInterval(async () => {
      const hour = new Date().getHours();

      // Pattern scan at 3 AM
      if (hour === 3 && this.config.enablePatternScan) {
        await this.runPatternScan();
      }

      // Updates at 4 AM
      if (hour === 4 && this.config.enableAutoUpdates) {
        await this.applyUpdates();
      }

      // Weekly performance analysis on Sunday at 4 AM
      if (hour === 4 && new Date().getDay() === 0 && this.config.enablePerformanceAnalysis) {
        await this.runPerformanceAnalysis();
      }
    }, 60 * 60 * 1000); // Check every hour

    this.intervals.push(dailyCheck);
  }

  private async generateSuggestions(
    metrics: Array<{ agentId: string; successRate: number; commonFailures: string[] }>
  ): Promise<Array<{ agentId: string; suggestion: string; confidence: number }>> {
    const suggestions: Array<{ agentId: string; suggestion: string; confidence: number }> = [];

    for (const metric of metrics) {
      // Low success rate suggests agent needs improvement
      if (metric.successRate < 0.7) {
        suggestions.push({
          agentId: metric.agentId,
          suggestion: `Agent ${metric.agentId} has ${Math.round(metric.successRate * 100)}% success rate. Consider reviewing common failures.`,
          confidence: 0.8,
        });
      }

      // Common failures suggest specific improvements needed
      if (metric.commonFailures.length > 0) {
        suggestions.push({
          agentId: metric.agentId,
          suggestion: `Common failures for ${metric.agentId}: ${metric.commonFailures.slice(0, 3).join(', ')}`,
          confidence: 0.7,
        });
      }
    }

    return suggestions;
  }

  private async queueSuggestions(
    suggestions: Array<{ agentId: string; suggestion: string; confidence: number }>
  ): Promise<void> {
    for (const suggestion of suggestions) {
      await this.learningDatabase.queueSuggestion(suggestion);
    }
  }

  private log(message: string): void {
    if (this.config.verbose) {
      console.log(`[MaintenanceDaemon] ${message}`);
    }
  }
}

// Singleton instance
let daemonInstance: MaintenanceDaemon | null = null;

/**
 * Get or create the maintenance daemon instance
 */
export function getMaintenanceDaemon(config?: Partial<DaemonConfig>): MaintenanceDaemon {
  if (!daemonInstance) {
    daemonInstance = new MaintenanceDaemon(config);
  }
  return daemonInstance;
}

/**
 * Start the maintenance daemon
 */
export async function startMaintenanceDaemon(config?: Partial<DaemonConfig>): Promise<MaintenanceDaemon> {
  const daemon = getMaintenanceDaemon(config);
  await daemon.start();
  return daemon;
}

/**
 * Stop the maintenance daemon
 */
export async function stopMaintenanceDaemon(): Promise<void> {
  if (daemonInstance) {
    await daemonInstance.stop();
  }
}
