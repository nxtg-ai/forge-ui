# Autonomous Maintenance System

The NXTG-Forge Autonomous Maintenance System provides self-healing capabilities, pattern learning, and continuous system health monitoring.

## Features

### 1. Health Monitoring
Continuous health checks across multiple dimensions:
- **Disk Space**: Monitor disk usage and automatically clean up old files when space is low
- **Memory Usage**: Track system memory consumption
- **Configuration Integrity**: Validate JSON/YAML config files
- **Database Health**: Monitor database size and performance
- **Stale Sessions**: Detect and clean up abandoned terminal sessions
- **Forge Directory Size**: Keep the `.forge` directory manageable

### 2. Pattern Scanner
Automatically extracts learnings from:
- Completed task history
- User corrections and feedback
- Agent performance data

Patterns are deduplicated, aggregated, and scored by confidence and frequency.

### 3. Performance Analyzer
Tracks agent performance metrics:
- Success rates
- Task completion times
- User override rates
- Performance trends (improving/degrading/stable)

Generates actionable recommendations for improvement.

### 4. Update Applier
Applies learned improvements to agent specs:
- Automatic backup before changes
- Confidence-based auto-apply threshold
- Manual review queue for low-confidence updates
- Rollback capability

### 5. Learning Database
Persistent storage for:
- Discovered patterns
- Performance metrics
- Health events
- Skill update proposals
- Improvement suggestions

## CLI Usage

### Basic Commands

```bash
# Run health checks
npm run maintain:check

# Start the daemon (background monitoring)
npm run maintain:start

# Scan for patterns
npm run maintain:patterns

# Analyze agent performance
npm run maintain:performance

# Show status
npm run maintain -- --status

# Stop daemon (Ctrl+C when running)
```

### Advanced Options

```bash
# Start with verbose logging
npm run maintain -- --start --verbose

# Change health check interval (minutes)
npm run maintain -- --start --interval 10

# Run manual pattern scan
npm run maintain -- --patterns

# Compare agent performance
npm run maintain -- --performance
```

## Daemon Operation

When started, the daemon runs:

1. **Health Checks** - Every 5 minutes
   - Monitors system resources
   - Detects issues
   - Auto-fixes when possible

2. **Pattern Scans** - Daily at 3 AM
   - Scans task history
   - Extracts patterns
   - Updates learning database

3. **Performance Analysis** - Weekly on Sundays at 4 AM
   - Analyzes agent metrics
   - Generates recommendations
   - Identifies improvement opportunities

4. **Apply Updates** - Daily at 4 AM
   - Applies high-confidence improvements
   - Queues low-confidence for review
   - Creates backups automatically

## Health Check Results

Health checks return structured results:

```typescript
interface HealthCheck {
  category: string;          // e.g., "disk_space", "memory"
  status: 'healthy' | 'degraded' | 'critical';
  message: string;           // Human-readable description
  metrics: Record<string, any>;  // Quantitative data
  actions: HealthAction[];   // Remediation steps
  timestamp: Date;
}
```

### Auto-Fix Actions

When health issues are detected, the system can automatically:
- Clean up old checkpoints (>7 days)
- Remove stale sessions (>24 hours)
- Clean up old logs (>30 days)
- Vacuum database when too large
- Free up disk space

## Pattern Learning

Patterns are learned from:

1. **Task Completions**
   - Successful approaches → reinforce
   - Failed approaches → avoid

2. **User Corrections**
   - Original action → failure pattern
   - Corrected action → success pattern

3. **Performance Data**
   - High success rate → good pattern
   - Low success rate → problematic pattern

### Pattern Structure

```typescript
interface PatternScan {
  source: 'task_completion' | 'user_correction' | 'performance';
  pattern: {
    context: string;     // When this applies
    action: string;      // What was done
    outcome: 'success' | 'failure';
    confidence: number;  // 0-1 confidence score
  };
  frequency: number;     // How many times observed
  lastSeen: Date;
  agentId?: string;
}
```

## Performance Metrics

Tracks for each agent:
- **Tasks Completed**: Total task count
- **Success Rate**: Percentage of successful tasks
- **Average Duration**: Mean task completion time
- **User Override Rate**: How often user corrects/overrides

### Performance Trends

Analyzes trends over time:
- **Improving**: Performance increasing >5%
- **Degrading**: Performance decreasing >5%
- **Stable**: Performance within ±5%

### Recommendations

Generated based on:
- Low success rate (<70%) → Review and improve
- High override rate (>20%) → Learn from corrections
- Degrading performance → Investigate recent changes
- Slow performance (>60s avg) → Optimize

## Configuration

Configure the daemon behavior:

```typescript
const daemon = new MaintenanceDaemon({
  // Enable/disable features
  enablePatternScan: true,
  enablePerformanceAnalysis: true,
  enableHealthMonitor: true,
  enableAutoUpdates: true,

  // Database location
  databasePath: '.forge/maintenance.db',

  // Auto-apply threshold (0-1)
  // Updates with confidence >= threshold are auto-applied
  autoApplyThreshold: 0.7,

  // Health check frequency
  healthCheckInterval: 5 * 60 * 1000, // 5 minutes

  // Logging
  verbose: false,
});
```

## Integration

### In Code

```typescript
import { MaintenanceDaemon, HealthMonitor } from '@/maintenance';

// Start daemon
const daemon = new MaintenanceDaemon();
await daemon.start();

// Run manual health check
const monitor = new HealthMonitor();
const results = await monitor.check();

// Check for critical issues
const critical = results.filter(r => r.status === 'critical');
if (critical.length > 0) {
  console.warn('Critical issues detected:', critical);
}
```

### Events

The daemon emits events:

```typescript
daemon.on('started', () => {
  console.log('Daemon started');
});

daemon.on('healthCritical', (result) => {
  console.error('Critical health issue:', result);
  // Alert ops team
});

daemon.on('taskComplete', (taskName, data) => {
  console.log(`Task ${taskName} completed:`, data);
});

daemon.on('taskError', (taskName, error) => {
  console.error(`Task ${taskName} failed:`, error);
});
```

## Testing

Comprehensive test suite:

```bash
# Run all maintenance tests
npm test src/maintenance/__tests__/

# Run specific test file
npm test src/maintenance/__tests__/health-monitor.test.ts

# Watch mode
npm run test:watch src/maintenance/
```

## Architecture

```
src/maintenance/
├── daemon.ts              # Main orchestrator
├── health-monitor.ts      # System health checks
├── pattern-scanner.ts     # Pattern extraction
├── performance-analyzer.ts # Agent performance tracking
├── update-applier.ts      # Apply learned improvements
├── learning-database.ts   # Persistent storage
├── cli.ts                 # Command-line interface
├── index.ts               # Module exports
└── __tests__/             # Test suite
    ├── daemon.test.ts
    └── health-monitor.test.ts
```

## Best Practices

1. **Run health checks regularly**: Use `npm run maintain:check` in CI/CD
2. **Monitor daemon events**: Set up alerting for critical health issues
3. **Review queued updates**: Check low-confidence updates before applying
4. **Backup before updates**: The system does this automatically, but verify
5. **Clean up periodically**: Let auto-cleanup run or trigger manually
6. **Analyze patterns**: Use insights to improve agent specs manually

## Troubleshooting

### Daemon won't start
- Check if port/process already running
- Verify `.forge` directory permissions
- Check disk space

### Health checks failing
- Review error messages in output
- Check system resources (disk, memory)
- Validate config files manually

### No patterns detected
- Ensure task history exists in `.forge/history/tasks`
- Check that tasks are completing successfully
- Verify database is writeable

### Performance data missing
- Run tasks to generate metrics
- Check database has metrics stored
- Ensure minimum task threshold met (default: 5)

## Future Enhancements

- [ ] Machine learning-based pattern recognition
- [ ] Automated A/B testing of agent specs
- [ ] Integration with external monitoring systems
- [ ] Historical trend visualization
- [ ] Anomaly detection
- [ ] Predictive maintenance
- [ ] Multi-project learning aggregation

## License

MIT License - See LICENSE file for details
