/**
 * Health Monitor
 *
 * Continuous health checks for NXTG-Forge system components.
 * Auto-fixes common issues and alerts on critical problems.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

/**
 * Action that can be taken in response to a health check
 */
export interface HealthAction {
  /** Type of action */
  type: 'auto_fix' | 'alert' | 'escalate';
  /** Description of the action */
  description: string;
  /** Handler function for auto_fix type */
  handler?: () => Promise<void>;
}

/**
 * Result of a health check
 */
export interface HealthCheck {
  /** Category of the check */
  category: string;
  /** Status result */
  status: 'healthy' | 'degraded' | 'critical';
  /** Detailed message */
  message: string;
  /** Metrics associated with this check */
  metrics: Record<string, number | string>;
  /** Actions that can be taken */
  actions: HealthAction[];
  /** Timestamp of the check */
  timestamp: Date;
}

/**
 * Health check configuration
 */
interface HealthConfig {
  /** Disk space warning threshold (percentage) */
  diskSpaceWarning: number;
  /** Disk space critical threshold (percentage) */
  diskSpaceCritical: number;
  /** Max forge directory size in bytes */
  maxForgeDirSize: number;
  /** Max age for stale sessions (hours) */
  maxSessionAge: number;
  /** Agent success rate warning threshold */
  agentSuccessRateWarning: number;
  /** Forge data directory */
  forgeDir: string;
}

const DEFAULT_CONFIG: HealthConfig = {
  diskSpaceWarning: 85,
  diskSpaceCritical: 95,
  maxForgeDirSize: 1024 * 1024 * 1024, // 1GB
  maxSessionAge: 24,
  agentSuccessRateWarning: 0.7,
  forgeDir: '.forge',
};

/**
 * Monitors system health and triggers auto-fixes
 */
export class HealthMonitor {
  private config: HealthConfig;

  constructor(config: Partial<HealthConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Run all health checks
   */
  async check(): Promise<HealthCheck[]> {
    const results: HealthCheck[] = [];

    // Run all checks concurrently
    const checks = await Promise.allSettled([
      this.checkDiskSpace(),
      this.checkForgeDirSize(),
      this.checkStaleSessions(),
      this.checkDatabaseHealth(),
      this.checkMemoryUsage(),
      this.checkConfigIntegrity(),
    ]);

    for (const check of checks) {
      if (check.status === 'fulfilled') {
        results.push(check.value);
      } else {
        results.push({
          category: 'health_check_error',
          status: 'degraded',
          message: `Health check failed: ${check.reason}`,
          metrics: {},
          actions: [],
          timestamp: new Date(),
        });
      }
    }

    return results;
  }

  /**
   * Check available disk space
   */
  private async checkDiskSpace(): Promise<HealthCheck> {
    const check: HealthCheck = {
      category: 'disk_space',
      status: 'healthy',
      message: '',
      metrics: {},
      actions: [],
      timestamp: new Date(),
    };

    try {
      // Get disk stats (works on Unix-like systems)
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      const { stdout } = await execAsync('df -h . | tail -1');
      const parts = stdout.trim().split(/\s+/);
      const usedPercent = parseInt(parts[4]?.replace('%', '') || '0');

      check.metrics = {
        usedPercent,
        total: parts[1] || 'unknown',
        used: parts[2] || 'unknown',
        available: parts[3] || 'unknown',
      };

      if (usedPercent >= this.config.diskSpaceCritical) {
        check.status = 'critical';
        check.message = `Disk space critically low: ${usedPercent}% used`;
        check.actions.push({
          type: 'alert',
          description: 'Immediate attention required - disk almost full',
        });
      } else if (usedPercent >= this.config.diskSpaceWarning) {
        check.status = 'degraded';
        check.message = `Disk space warning: ${usedPercent}% used`;
        check.actions.push({
          type: 'auto_fix',
          description: 'Clean up old checkpoints and logs',
          handler: () => this.cleanupOldFiles(),
        });
      } else {
        check.message = `Disk space healthy: ${usedPercent}% used`;
      }
    } catch (error) {
      check.status = 'degraded';
      check.message = `Could not check disk space: ${error}`;
    }

    return check;
  }

  /**
   * Check .forge directory size
   */
  private async checkForgeDirSize(): Promise<HealthCheck> {
    const check: HealthCheck = {
      category: 'forge_dir_size',
      status: 'healthy',
      message: '',
      metrics: {},
      actions: [],
      timestamp: new Date(),
    };

    try {
      const forgeDir = path.resolve(this.config.forgeDir);
      const size = await this.getDirectorySize(forgeDir);

      check.metrics = {
        sizeBytes: size,
        sizeMB: Math.round(size / (1024 * 1024)),
        maxMB: Math.round(this.config.maxForgeDirSize / (1024 * 1024)),
      };

      if (size > this.config.maxForgeDirSize) {
        check.status = 'degraded';
        check.message = `Forge directory too large: ${check.metrics.sizeMB}MB (max: ${check.metrics.maxMB}MB)`;
        check.actions.push({
          type: 'auto_fix',
          description: 'Clean up old checkpoints and history',
          handler: () => this.cleanupForgeDir(),
        });
      } else {
        check.message = `Forge directory size OK: ${check.metrics.sizeMB}MB`;
      }
    } catch (error) {
      check.status = 'degraded';
      check.message = `Could not check forge dir size: ${error}`;
    }

    return check;
  }

  /**
   * Check for stale terminal sessions
   */
  private async checkStaleSessions(): Promise<HealthCheck> {
    const check: HealthCheck = {
      category: 'stale_sessions',
      status: 'healthy',
      message: '',
      metrics: {},
      actions: [],
      timestamp: new Date(),
    };

    try {
      const sessionsDir = path.resolve(this.config.forgeDir, 'sessions');
      const exists = await fs.access(sessionsDir).then(() => true).catch(() => false);

      if (!exists) {
        check.message = 'No sessions directory';
        return check;
      }

      const files = await fs.readdir(sessionsDir);
      const cutoff = Date.now() - (this.config.maxSessionAge * 60 * 60 * 1000);
      const staleSessions: string[] = [];

      for (const file of files) {
        const filePath = path.join(sessionsDir, file);
        const stat = await fs.stat(filePath);
        if (stat.mtimeMs < cutoff) {
          staleSessions.push(file);
        }
      }

      check.metrics = {
        totalSessions: files.length,
        staleSessions: staleSessions.length,
      };

      if (staleSessions.length > 0) {
        check.status = 'degraded';
        check.message = `Found ${staleSessions.length} stale sessions`;
        check.actions.push({
          type: 'auto_fix',
          description: 'Clean up stale sessions',
          handler: async () => {
            for (const session of staleSessions) {
              await fs.rm(path.join(sessionsDir, session), { recursive: true, force: true });
            }
          },
        });
      } else {
        check.message = `All ${files.length} sessions are active`;
      }
    } catch (error) {
      check.status = 'degraded';
      check.message = `Could not check sessions: ${error}`;
    }

    return check;
  }

  /**
   * Check database health
   */
  private async checkDatabaseHealth(): Promise<HealthCheck> {
    const check: HealthCheck = {
      category: 'database',
      status: 'healthy',
      message: '',
      metrics: {},
      actions: [],
      timestamp: new Date(),
    };

    try {
      const dbPath = path.resolve(this.config.forgeDir, 'maintenance.db');
      const exists = await fs.access(dbPath).then(() => true).catch(() => false);

      if (!exists) {
        check.message = 'Database not yet created (normal on first run)';
        return check;
      }

      const stat = await fs.stat(dbPath);
      check.metrics = {
        sizeMB: Math.round(stat.size / (1024 * 1024)),
        lastModified: stat.mtime.toISOString(),
      };

      // Check if database is too large (> 100MB)
      if (stat.size > 100 * 1024 * 1024) {
        check.status = 'degraded';
        check.message = 'Database is large, consider vacuuming';
        check.actions.push({
          type: 'auto_fix',
          description: 'Vacuum database',
          handler: () => this.vacuumDatabase(),
        });
      } else {
        check.message = `Database healthy: ${check.metrics.sizeMB}MB`;
      }
    } catch (error) {
      check.status = 'degraded';
      check.message = `Could not check database: ${error}`;
    }

    return check;
  }

  /**
   * Check memory usage
   */
  private async checkMemoryUsage(): Promise<HealthCheck> {
    const check: HealthCheck = {
      category: 'memory',
      status: 'healthy',
      message: '',
      metrics: {},
      actions: [],
      timestamp: new Date(),
    };

    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedPercent = Math.round(((totalMem - freeMem) / totalMem) * 100);

    check.metrics = {
      totalGB: Math.round(totalMem / (1024 * 1024 * 1024)),
      freeGB: Math.round(freeMem / (1024 * 1024 * 1024)),
      usedPercent,
    };

    if (usedPercent > 90) {
      check.status = 'critical';
      check.message = `Memory critically high: ${usedPercent}% used`;
      check.actions.push({
        type: 'alert',
        description: 'System memory is critically low',
      });
    } else if (usedPercent > 80) {
      check.status = 'degraded';
      check.message = `Memory usage high: ${usedPercent}% used`;
    } else {
      check.message = `Memory usage OK: ${usedPercent}% used`;
    }

    return check;
  }

  /**
   * Check configuration file integrity
   */
  private async checkConfigIntegrity(): Promise<HealthCheck> {
    const check: HealthCheck = {
      category: 'config_integrity',
      status: 'healthy',
      message: '',
      metrics: {},
      actions: [],
      timestamp: new Date(),
    };

    const configFiles = [
      'governance.json',
      '.claude/config.json',
      '.forge/config.yml',
    ];

    const issues: string[] = [];

    for (const configFile of configFiles) {
      try {
        const filePath = path.resolve(configFile);
        const content = await fs.readFile(filePath, 'utf-8');

        // Try to parse based on extension
        if (configFile.endsWith('.json')) {
          JSON.parse(content);
        }
        // For YAML, just check it's not empty
        if (configFile.endsWith('.yml') && content.trim().length === 0) {
          issues.push(`${configFile} is empty`);
        }
      } catch (error) {
        // File not existing is OK for optional configs
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          issues.push(`${configFile}: ${error}`);
        }
      }
    }

    check.metrics = {
      filesChecked: configFiles.length,
      issuesFound: issues.length,
    };

    if (issues.length > 0) {
      check.status = 'degraded';
      check.message = `Config issues: ${issues.join('; ')}`;
      check.actions.push({
        type: 'alert',
        description: 'Manual review of configuration files needed',
      });
    } else {
      check.message = 'All configuration files valid';
    }

    return check;
  }

  // ============================================================
  // AUTO-FIX HANDLERS
  // ============================================================

  private async cleanupOldFiles(): Promise<void> {
    // Clean up checkpoints older than 7 days
    const checkpointsDir = path.resolve('.forge/checkpoints');
    await this.cleanupOldFilesInDir(checkpointsDir, 7);

    // Clean up logs older than 30 days
    const logsDir = path.resolve('.forge/logs');
    await this.cleanupOldFilesInDir(logsDir, 30);
  }

  private async cleanupOldFilesInDir(dir: string, maxAgeDays: number): Promise<void> {
    try {
      const exists = await fs.access(dir).then(() => true).catch(() => false);
      if (!exists) return;

      const files = await fs.readdir(dir);
      const cutoff = Date.now() - (maxAgeDays * 24 * 60 * 60 * 1000);

      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = await fs.stat(filePath);
        if (stat.mtimeMs < cutoff) {
          await fs.rm(filePath, { recursive: true, force: true });
        }
      }
    } catch (error) {
      console.warn(`[HealthMonitor] Error cleaning up ${dir}:`, error);
    }
  }

  private async cleanupForgeDir(): Promise<void> {
    // Clean checkpoints first (usually largest)
    await this.cleanupOldFilesInDir('.forge/checkpoints', 3);

    // Clean history
    await this.cleanupOldFilesInDir('.forge/history/tasks', 14);
    await this.cleanupOldFilesInDir('.forge/history/corrections', 30);
  }

  private async vacuumDatabase(): Promise<void> {
    // This would use better-sqlite3 or similar to run VACUUM
    console.log('[HealthMonitor] Database vacuum would run here');
  }

  // ============================================================
  // UTILITIES
  // ============================================================

  private async getDirectorySize(dir: string): Promise<number> {
    let size = 0;

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          size += await this.getDirectorySize(fullPath);
        } else {
          const stat = await fs.stat(fullPath);
          size += stat.size;
        }
      }
    } catch {
      // Directory doesn't exist or not accessible
    }

    return size;
  }

  /**
   * Update configuration
   */
  configure(config: Partial<HealthConfig>): void {
    Object.assign(this.config, config);
  }
}
