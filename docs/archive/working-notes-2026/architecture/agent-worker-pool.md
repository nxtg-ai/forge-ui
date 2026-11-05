# Agent Worker Pool Architecture

**Version:** 1.0.0
**Status:** Approved
**Date:** 2026-01-30

## Overview

The Agent Worker Pool enables NXTG-Forge to run up to 20 parallel AI agents, each in an isolated execution context. Workers are managed as Node.js child processes with IPC communication.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         AgentWorkerPool                                  │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                     Task Queue (Priority)                         │  │
│  │  [HIGH] ─────► [MEDIUM] ─────► [LOW] ─────► [BACKGROUND]        │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                              │                                          │
│                              ▼                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                     Worker Dispatcher                             │  │
│  │  - Round-robin assignment                                        │  │
│  │  - Affinity-based routing (workstream → worker)                  │  │
│  │  - Load balancing                                                │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                              │                                          │
│       ┌──────────────────────┼──────────────────────┐                  │
│       ▼                      ▼                      ▼                  │
│  ┌─────────┐           ┌─────────┐           ┌─────────┐              │
│  │ Worker 1│           │ Worker 2│    ...    │Worker 20│              │
│  │  (fork) │           │  (fork) │           │  (fork) │              │
│  ├─────────┤           ├─────────┤           ├─────────┤              │
│  │ Context │           │ Context │           │ Context │              │
│  │ - CWD   │           │ - CWD   │           │ - CWD   │              │
│  │ - ENV   │           │ - ENV   │           │ - ENV   │              │
│  │ - Stdio │           │ - Stdio │           │ - Stdio │              │
│  └─────────┘           └─────────┘           └─────────┘              │
│       │                      │                      │                  │
│       └──────────────────────┼──────────────────────┘                  │
│                              │                                          │
│                         IPC Channel                                     │
│                              │                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                     Health Monitor                                │  │
│  │  - Heartbeat check (every 30s)                                   │  │
│  │  - Crash detection & restart                                     │  │
│  │  - Resource monitoring (CPU, memory)                             │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Worker State Machine

```
                    ┌────────────┐
                    │   IDLE     │◄──────────────┐
                    └─────┬──────┘               │
                          │ assignTask()         │ taskComplete()
                          ▼                      │
                    ┌────────────┐               │
         ┌─────────►│   BUSY     │───────────────┤
         │          └─────┬──────┘               │
         │                │ error/timeout        │
         │                ▼                      │
         │          ┌────────────┐               │
         │          │   ERROR    │───────────────┘
         │          └─────┬──────┘  recover()
         │                │
         │                │ maxRetries exceeded
         │                ▼
         │          ┌────────────┐
         └──────────│  CRASHED   │
           restart()└────────────┘
```

### State Definitions

| State | Description | Transitions |
|-------|-------------|-------------|
| IDLE | Worker ready for tasks | → BUSY (on task assign) |
| BUSY | Executing a task | → IDLE (complete), → ERROR (failure) |
| ERROR | Temporary failure, recoverable | → IDLE (recover), → CRASHED (max retries) |
| CRASHED | Unrecoverable, needs restart | → IDLE (restart with new process) |

## Component Design

### AgentWorkerPool

Main orchestrator class managing the worker pool.

```typescript
interface AgentWorkerPool {
  // Lifecycle
  initialize(): Promise<void>;
  shutdown(): Promise<void>;

  // Task Management
  assignTask(task: AgentTask): Promise<string>; // Returns task ID
  cancelTask(taskId: string): Promise<void>;
  getTaskStatus(taskId: string): TaskStatus;

  // Worker Management
  getWorker(workerId: string): WorkerInfo | null;
  getAllWorkers(): WorkerInfo[];
  scaleUp(count: number): Promise<void>;
  scaleDown(count: number): Promise<void>;

  // Metrics
  getPoolMetrics(): PoolMetrics;
  getWorkerMetrics(workerId: string): WorkerMetrics;
}
```

### AgentWorker

Individual worker process wrapper.

```typescript
interface AgentWorker {
  id: string;
  pid: number;
  status: WorkerStatus;
  context: AgentContext;
  currentTask: AgentTask | null;
  metrics: WorkerMetrics;

  // Lifecycle
  spawn(): Promise<void>;
  terminate(): Promise<void>;
  restart(): Promise<void>;

  // Task execution
  execute(task: AgentTask): Promise<TaskResult>;
  abort(): Promise<void>;

  // Health
  heartbeat(): boolean;
  getHealth(): HealthStatus;
}
```

### AgentContext

Isolated execution environment for each worker.

```typescript
interface AgentContext {
  workerId: string;
  workingDirectory: string;      // /tmp/forge-workers/{workerId}
  environmentVariables: Record<string, string>;
  stdoutStream: WritableStream;
  stderrStream: WritableStream;
  commandHistory: string[];
  resourceLimits: {
    memoryMB: number;
    cpuPercent: number;
    maxProcesses: number;
  };
}
```

### AgentTask

Task definition for workers.

```typescript
interface AgentTask {
  id: string;
  type: 'claude-code' | 'shell' | 'script';
  priority: 'high' | 'medium' | 'low' | 'background';
  workstreamId?: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  timeout?: number;  // ms
  retryCount?: number;
  metadata?: Record<string, unknown>;
}
```

## Pool Sizing Strategy

### Dynamic Scaling

```typescript
const POOL_CONFIG = {
  minWorkers: 2,
  maxWorkers: 20,
  initialWorkers: 5,
  scaleUpThreshold: 0.8,    // Scale up when 80% utilized
  scaleDownThreshold: 0.2,  // Scale down when 20% utilized
  scaleUpStep: 2,           // Add 2 workers at a time
  scaleDownStep: 1,         // Remove 1 worker at a time
  scaleInterval: 30000,     // Check every 30s
  cooldownPeriod: 60000,    // Wait 60s between scale operations
};
```

### Scaling Algorithm

```
1. Every 30s, calculate utilization = activeWorkers / totalWorkers
2. If utilization > 0.8 AND totalWorkers < maxWorkers:
   - Scale up by min(scaleUpStep, maxWorkers - totalWorkers)
3. If utilization < 0.2 AND totalWorkers > minWorkers:
   - Scale down by min(scaleDownStep, totalWorkers - minWorkers)
4. Cooldown: No scale operation if last one was < 60s ago
```

## IPC Communication Protocol

### Message Format

```typescript
interface IPCMessage {
  type: 'task' | 'result' | 'heartbeat' | 'log' | 'error' | 'control';
  id: string;           // Message ID for correlation
  timestamp: number;
  payload: unknown;
}
```

### Message Types

| Type | Direction | Purpose |
|------|-----------|---------|
| `task` | Pool → Worker | Assign new task |
| `result` | Worker → Pool | Task completion result |
| `heartbeat` | Bidirectional | Health check |
| `log` | Worker → Pool | Log output |
| `error` | Worker → Pool | Error report |
| `control` | Pool → Worker | Abort, shutdown commands |

## Resource Management

### Per-Worker Limits

```yaml
resources:
  memory_mb: 512          # Max 512MB per worker
  cpu_percent: 25         # Max 25% CPU per worker
  max_processes: 50       # Max child processes
  max_open_files: 1024    # File descriptor limit
  network_disabled: false # Allow network access
```

### Total Pool Limits

```yaml
pool_limits:
  total_memory_mb: 4096   # 4GB total for all workers
  total_cpu_percent: 200  # 200% (2 cores) max
  concurrent_tasks: 20    # Max simultaneous tasks
```

## Error Handling

### Retry Strategy

```typescript
const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelay: 1000,     // 1s
  maxDelay: 30000,        // 30s
  backoffMultiplier: 2,   // Exponential backoff
  retryableErrors: [
    'TIMEOUT',
    'WORKER_CRASH',
    'IPC_FAILURE',
  ],
  nonRetryableErrors: [
    'INVALID_TASK',
    'PERMISSION_DENIED',
    'RESOURCE_EXHAUSTED',
  ],
};
```

### Circuit Breaker

```typescript
const CIRCUIT_BREAKER = {
  failureThreshold: 5,    // Open after 5 failures
  recoveryTimeout: 30000, // Try again after 30s
  halfOpenRequests: 2,    // Allow 2 test requests when half-open
};
```

## Monitoring & Observability

### Metrics Collected

| Metric | Type | Description |
|--------|------|-------------|
| `pool.workers.total` | Gauge | Total workers in pool |
| `pool.workers.active` | Gauge | Workers executing tasks |
| `pool.workers.idle` | Gauge | Workers waiting for tasks |
| `pool.workers.error` | Gauge | Workers in error state |
| `pool.tasks.queued` | Gauge | Tasks waiting in queue |
| `pool.tasks.completed` | Counter | Tasks completed (success) |
| `pool.tasks.failed` | Counter | Tasks failed |
| `pool.tasks.duration_ms` | Histogram | Task execution time |
| `worker.memory_mb` | Gauge | Per-worker memory usage |
| `worker.cpu_percent` | Gauge | Per-worker CPU usage |

### Health Endpoint

```http
GET /api/workers/health

Response:
{
  "status": "healthy" | "degraded" | "unhealthy",
  "workers": {
    "total": 10,
    "active": 7,
    "idle": 2,
    "error": 1
  },
  "queue": {
    "depth": 5,
    "oldestTaskAge": 2500
  },
  "lastCheck": "2026-01-30T12:00:00Z"
}
```

## Security Considerations

### Sandboxing

1. **File System**: Workers can only access:
   - Their own working directory
   - Project directory (read-only for most operations)
   - Temporary files

2. **Environment**: Only whitelisted env vars passed:
   - PATH, HOME, USER, SHELL, TERM
   - FORGE_*, CLAUDE_*, NODE_*, NPM_*

3. **Network**: Workers inherit parent network access
   - Future: Optional network isolation per worker

4. **Blocked Commands**: Dangerous commands intercepted:
   - `rm -rf /`, fork bombs, disk wipers
   - See `.claude/infinity-terminal.yaml` for full list

## Integration Points

### Governance State

Worker pool status is published to governance state:

```typescript
interface GovernanceState {
  // ... existing fields
  workerPool: {
    status: 'running' | 'scaling' | 'degraded' | 'stopped';
    totalWorkers: number;
    activeWorkers: number;
    idleWorkers: number;
    errorWorkers: number;
    tasksQueued: number;
    tasksCompleted24h: number;
    avgTaskDurationMs: number;
    workers: WorkerSummary[];
  };
}
```

### WebSocket Events

Real-time worker updates broadcast to UI:

```typescript
// Worker status change
{ type: 'worker.status', payload: { workerId, status, task? } }

// Task lifecycle
{ type: 'task.assigned', payload: { taskId, workerId } }
{ type: 'task.completed', payload: { taskId, result } }
{ type: 'task.failed', payload: { taskId, error } }

// Pool scaling
{ type: 'pool.scaled', payload: { direction: 'up'|'down', count } }
```

## File Structure

```
src/server/workers/
├── AgentWorkerPool.ts      # Main pool manager
├── AgentWorker.ts          # Worker process wrapper
├── AgentContext.ts         # Execution context
├── TaskQueue.ts            # Priority queue
├── HealthMonitor.ts        # Health checks
├── worker-process.ts       # Child process entry point
├── types.ts                # TypeScript interfaces
└── index.ts                # Exports
```

---

**Document Status:** Approved for Implementation
