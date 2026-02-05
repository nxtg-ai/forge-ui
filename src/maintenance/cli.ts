/**
 * Maintenance CLI
 *
 * Command-line interface for the autonomous maintenance daemon.
 * Usage: nxtg-forge maintain --check
 */

import { MaintenanceDaemon } from './daemon';
import { HealthMonitor } from './health-monitor';
import { PatternScanner } from './pattern-scanner';
import { PerformanceAnalyzer } from './performance-analyzer';
import { LearningDatabase } from './learning-database';

interface CLIOptions {
  check?: boolean;
  start?: boolean;
  stop?: boolean;
  status?: boolean;
  patterns?: boolean;
  performance?: boolean;
  health?: boolean;
  verbose?: boolean;
  interval?: number;
}

/**
 * Main CLI handler
 */
export async function maintenanceCLI(options: CLIOptions): Promise<void> {
  const { check, start, stop, status, patterns, performance, health, verbose } = options;

  try {
    if (check) {
      await runHealthCheck();
    } else if (start) {
      await startDaemon(options);
    } else if (stop) {
      await stopDaemon();
    } else if (status) {
      await showStatus();
    } else if (patterns) {
      await scanPatterns();
    } else if (performance) {
      await analyzePerformance();
    } else if (health) {
      await runHealthCheck();
    } else {
      showHelp();
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/**
 * Run health check
 */
async function runHealthCheck(): Promise<void> {
  console.log('Running health checks...\n');

  const monitor = new HealthMonitor();
  const results = await monitor.check();

  let healthyCount = 0;
  let degradedCount = 0;
  let criticalCount = 0;

  for (const result of results) {
    const icon = result.status === 'healthy' ? '✓' : result.status === 'degraded' ? '⚠' : '✗';
    const color = result.status === 'healthy' ? '\x1b[32m' : result.status === 'degraded' ? '\x1b[33m' : '\x1b[31m';

    console.log(`${color}${icon}\x1b[0m ${result.category}: ${result.message}`);

    if (result.actions.length > 0) {
      for (const action of result.actions) {
        console.log(`  → ${action.description}`);
      }
    }

    if (result.status === 'healthy') healthyCount++;
    else if (result.status === 'degraded') degradedCount++;
    else criticalCount++;
  }

  console.log('');
  console.log(`Summary: ${healthyCount} healthy, ${degradedCount} degraded, ${criticalCount} critical`);

  if (criticalCount > 0) {
    console.log('\n\x1b[31mCritical issues detected. Immediate attention required.\x1b[0m');
    process.exit(1);
  } else if (degradedCount > 0) {
    console.log('\n\x1b[33mSome issues detected. Review recommended.\x1b[0m');
    process.exit(0);
  } else {
    console.log('\n\x1b[32mAll systems healthy.\x1b[0m');
    process.exit(0);
  }
}

/**
 * Start the maintenance daemon
 */
async function startDaemon(options: CLIOptions): Promise<void> {
  console.log('Starting maintenance daemon...');

  const daemon = new MaintenanceDaemon({
    verbose: options.verbose || false,
    healthCheckInterval: options.interval ? options.interval * 60 * 1000 : undefined,
  });

  await daemon.start();

  console.log('Daemon started successfully.');
  console.log('');
  console.log('The daemon will run:');
  console.log('  - Health checks every 5 minutes');
  console.log('  - Pattern scans daily at 3 AM');
  console.log('  - Performance analysis weekly on Sundays at 4 AM');
  console.log('  - Apply updates daily at 4 AM');
  console.log('');
  console.log('Press Ctrl+C to stop the daemon.');

  // Keep the process running
  await new Promise(() => {
    // Event loop keeps running
    process.on('SIGINT', async () => {
      console.log('\nStopping daemon...');
      await daemon.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\nStopping daemon...');
      await daemon.stop();
      process.exit(0);
    });
  });
}

/**
 * Stop the maintenance daemon
 */
async function stopDaemon(): Promise<void> {
  console.log('Stopping maintenance daemon...');

  // In a real implementation, this would communicate with the running daemon
  // via IPC or a PID file
  console.log('Note: Use Ctrl+C to stop a running daemon or kill the process.');
}

/**
 * Show daemon status
 */
async function showStatus(): Promise<void> {
  console.log('Maintenance Daemon Status\n');

  // Check if daemon is running
  // In a real implementation, this would check for a PID file or running process
  console.log('Status: Not running');
  console.log('');
  console.log('Use `nxtg-forge maintain --start` to start the daemon.');
}

/**
 * Scan for patterns
 */
async function scanPatterns(): Promise<void> {
  console.log('Scanning for patterns...\n');

  const database = new LearningDatabase('.forge/maintenance.db');
  await database.initialize();

  const scanner = new PatternScanner(database);
  const patterns = await scanner.scan();

  await database.close();

  console.log(`Found ${patterns.length} patterns:\n`);

  const successPatterns = patterns.filter(p => p.pattern.outcome === 'success');
  const failurePatterns = patterns.filter(p => p.pattern.outcome === 'failure');

  console.log(`✓ ${successPatterns.length} successful patterns`);
  console.log(`✗ ${failurePatterns.length} failure patterns\n`);

  // Show top patterns
  const topPatterns = patterns
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 10);

  if (topPatterns.length > 0) {
    console.log('Top patterns:');
    for (const pattern of topPatterns) {
      const icon = pattern.pattern.outcome === 'success' ? '✓' : '✗';
      const confidence = Math.round(pattern.pattern.confidence * 100);
      console.log(`  ${icon} [${pattern.frequency}x, ${confidence}%] ${pattern.pattern.context}`);
    }
  }
}

/**
 * Analyze performance
 */
async function analyzePerformance(): Promise<void> {
  console.log('Analyzing agent performance...\n');

  const database = new LearningDatabase('.forge/maintenance.db');
  await database.initialize();

  const analyzer = new PerformanceAnalyzer(database);
  const summary = await analyzer.getSummary();

  await database.close();

  console.log(`Total agents analyzed: ${summary.totalAgents}`);
  console.log(`Average success rate: ${Math.round(summary.avgSuccessRate * 100)}%\n`);

  if (summary.topPerformers.length > 0) {
    console.log('Top performers:');
    for (const agentId of summary.topPerformers) {
      console.log(`  ✓ ${agentId}`);
    }
    console.log('');
  }

  if (summary.needsAttention.length > 0) {
    console.log('Needs attention:');
    for (const agentId of summary.needsAttention) {
      console.log(`  ⚠ ${agentId}`);
    }
    console.log('');
  }

  if (summary.totalAgents === 0) {
    console.log('No performance data available yet.');
    console.log('Run some tasks to collect performance metrics.');
  }
}

/**
 * Show help
 */
function showHelp(): void {
  console.log('NXTG-Forge Maintenance System\n');
  console.log('Usage: nxtg-forge maintain [options]\n');
  console.log('Options:');
  console.log('  --check         Run health checks');
  console.log('  --start         Start the maintenance daemon');
  console.log('  --stop          Stop the maintenance daemon');
  console.log('  --status        Show daemon status');
  console.log('  --patterns      Scan and display learned patterns');
  console.log('  --performance   Analyze agent performance');
  console.log('  --health        Run health checks (same as --check)');
  console.log('  --verbose       Enable verbose logging');
  console.log('  --interval N    Health check interval in minutes (default: 5)');
  console.log('');
  console.log('Examples:');
  console.log('  nxtg-forge maintain --check');
  console.log('  nxtg-forge maintain --start --verbose');
  console.log('  nxtg-forge maintain --patterns');
  console.log('  nxtg-forge maintain --performance');
}

/**
 * Parse command line arguments
 */
export function parseArgs(args: string[]): CLIOptions {
  const options: CLIOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--check':
        options.check = true;
        break;
      case '--start':
        options.start = true;
        break;
      case '--stop':
        options.stop = true;
        break;
      case '--status':
        options.status = true;
        break;
      case '--patterns':
        options.patterns = true;
        break;
      case '--performance':
        options.performance = true;
        break;
      case '--health':
        options.health = true;
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case '--interval':
        i++;
        options.interval = parseInt(args[i] || '5', 10);
        break;
    }
  }

  return options;
}

/**
 * Main entry point
 * Note: This check is for CommonJS environments. For ES modules, direct execution is handled by the wrapper script.
 */
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  const options = parseArgs(process.argv.slice(2));
  maintenanceCLI(options).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
