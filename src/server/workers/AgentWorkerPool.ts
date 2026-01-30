/**
 * Agent Worker Pool - Main pool manager
 * Orchestrates multiple agent workers for parallel execution
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import {
  PoolConfig,
  PoolMetrics,
  PoolStatus,
  PoolEvent,
  AgentTask,
  TaskResult,
  TaskStatus,
  TaskAssignment,
  WorkerInfo,
  DEFAULT_POOL_CONFIG,
  DEFAULT_RESOURCE_LIMITS,
} from './types';
import { AgentWorker } from './AgentWorker';
import { TaskQueue } from './TaskQueue';

export class AgentWorkerPool extends EventEmitter {
  private config: PoolConfig;
  private workers: Map<string, AgentWorker> = new Map();
  private taskQueue: TaskQueue;
  private taskAssignments: Map<string, TaskAssignment> = new Map();
  private runningTasks: Map<string, { task: AgentTask; workerId: string; startTime: number }> = new Map();

  private _status: PoolStatus['status'] = 'stopped';
  private startedAt: Date | null = null;
  private lastScaleOperation: PoolStatus['lastScaleOperation'];

  private scaleTimer: NodeJS.Timeout | null = null;
  private healthTimer: NodeJS.Timeout | null = null;
  private dispatchTimer: NodeJS.Timeout | null = null;

  private totalTasksCompleted = 0;
  private totalTasksFailed = 0;
  private taskDurations: number[] = [];

  constructor(config: Partial<PoolConfig> = {}) {
    super();
    this.config = { ...DEFAULT_POOL_CONFIG, ...config };
    this.taskQueue = new TaskQueue();
  }

  /**
   * Initialize and start the pool
   */
  async initialize(): Promise<void> {
    if (this._status !== 'stopped') {
      throw new Error('Pool already initialized');
    }

    this._status = 'starting';
    this.startedAt = new Date();
    this.emitEvent({ type: 'pool.status', status: this.getStatus() });

    console.log(`[WorkerPool] Initializing with ${this.config.initialWorkers} workers`);

    // Spawn initial workers
    const spawnPromises: Promise<void>[] = [];
    for (let i = 0; i < this.config.initialWorkers; i++) {
      spawnPromises.push(this.spawnWorker());
    }

    await Promise.all(spawnPromises);

    this._status = 'running';
    this.emitEvent({ type: 'pool.status', status: this.getStatus() });

    // Start background processes
    this.startScaleMonitor();
    this.startHealthMonitor();
    this.startTaskDispatcher();

    console.log(`[WorkerPool] Initialized with ${this.workers.size} workers`);
  }

  /**
   * Shutdown the pool
   */
  async shutdown(): Promise<void> {
    console.log('[WorkerPool] Shutting down...');

    this._status = 'stopped';
    this.stopTimers();

    // Terminate all workers
    const terminatePromises = Array.from(this.workers.values()).map(w => w.terminate());
    await Promise.all(terminatePromises);

    this.workers.clear();
    this.taskQueue.clear();
    this.taskAssignments.clear();
    this.runningTasks.clear();

    this.emitEvent({ type: 'pool.status', status: this.getStatus() });
    console.log('[WorkerPool] Shutdown complete');
  }

  /**
   * Submit a task for execution
   */
  async submitTask(task: Omit<AgentTask, 'id' | 'createdAt'>): Promise<string> {
    const fullTask: AgentTask = {
      ...task,
      id: uuidv4(),
      createdAt: new Date(),
      maxRetries: task.maxRetries ?? 3,
      retryCount: 0,
    };

    this.taskQueue.enqueue(fullTask);
    this.emitEvent({ type: 'task.queued', task: fullTask });

    console.log(`[WorkerPool] Task queued: ${fullTask.id} (${fullTask.type}: ${fullTask.command})`);

    // Trigger immediate dispatch
    this.dispatchTasks();

    return fullTask.id;
  }

  /**
   * Cancel a task
   */
  async cancelTask(taskId: string): Promise<boolean> {
    // Check if in queue
    if (this.taskQueue.remove(taskId)) {
      this.emitEvent({ type: 'task.cancelled', taskId });
      return true;
    }

    // Check if running
    const running = this.runningTasks.get(taskId);
    if (running) {
      const worker = this.workers.get(running.workerId);
      if (worker) {
        await worker.abort();
        this.runningTasks.delete(taskId);
        this.emitEvent({ type: 'task.cancelled', taskId });
        return true;
      }
    }

    return false;
  }

  /**
   * Get task status
   */
  getTaskStatus(taskId: string): TaskStatus | null {
    if (this.taskQueue.getTask(taskId)) return 'queued';
    if (this.runningTasks.has(taskId)) return 'running';
    const assignment = this.taskAssignments.get(taskId);
    return assignment?.status || null;
  }

  /**
   * Get worker by ID
   */
  getWorker(workerId: string): WorkerInfo | null {
    const worker = this.workers.get(workerId);
    return worker?.getInfo() || null;
  }

  /**
   * Get all workers
   */
  getAllWorkers(): WorkerInfo[] {
    return Array.from(this.workers.values()).map(w => w.getInfo());
  }

  /**
   * Get pool status
   */
  getStatus(): PoolStatus {
    return {
      status: this._status,
      metrics: this.getMetrics(),
      workers: this.getAllWorkers(),
      lastScaleOperation: this.lastScaleOperation,
    };
  }

  /**
   * Get pool metrics
   */
  getMetrics(): PoolMetrics {
    const workers = Array.from(this.workers.values());
    const activeWorkers = workers.filter(w => w.status === 'busy').length;
    const idleWorkers = workers.filter(w => w.status === 'idle').length;
    const errorWorkers = workers.filter(w => w.status === 'error' || w.status === 'crashed').length;

    const avgDuration = this.taskDurations.length > 0
      ? this.taskDurations.reduce((a, b) => a + b, 0) / this.taskDurations.length
      : 0;

    return {
      totalWorkers: workers.length,
      activeWorkers,
      idleWorkers,
      errorWorkers,
      tasksQueued: this.taskQueue.size(),
      tasksRunning: this.runningTasks.size,
      tasksCompleted: this.totalTasksCompleted,
      tasksFailed: this.totalTasksFailed,
      avgTaskDuration: avgDuration,
      avgQueueWaitTime: this.taskQueue.getAverageWaitTime(),
      utilization: workers.length > 0 ? activeWorkers / workers.length : 0,
      uptime: this.startedAt ? Date.now() - this.startedAt.getTime() : 0,
    };
  }

  /**
   * Scale up the pool
   */
  async scaleUp(count: number = this.config.scaleUpStep): Promise<void> {
    const currentCount = this.workers.size;
    const targetCount = Math.min(currentCount + count, this.config.maxWorkers);
    const toAdd = targetCount - currentCount;

    if (toAdd <= 0) return;

    this._status = 'scaling';
    console.log(`[WorkerPool] Scaling up: adding ${toAdd} workers`);

    const promises: Promise<void>[] = [];
    for (let i = 0; i < toAdd; i++) {
      promises.push(this.spawnWorker());
    }

    await Promise.all(promises);

    this.lastScaleOperation = { direction: 'up', count: toAdd, timestamp: new Date() };
    this._status = 'running';
    this.emitEvent({ type: 'pool.scaled', direction: 'up', count: toAdd });
  }

  /**
   * Scale down the pool
   */
  async scaleDown(count: number = this.config.scaleDownStep): Promise<void> {
    const currentCount = this.workers.size;
    const targetCount = Math.max(currentCount - count, this.config.minWorkers);
    const toRemove = currentCount - targetCount;

    if (toRemove <= 0) return;

    this._status = 'scaling';
    console.log(`[WorkerPool] Scaling down: removing ${toRemove} workers`);

    // Remove idle workers first
    const idleWorkers = Array.from(this.workers.values())
      .filter(w => w.status === 'idle')
      .slice(0, toRemove);

    for (const worker of idleWorkers) {
      await worker.terminate();
      this.workers.delete(worker.id);
    }

    this.lastScaleOperation = { direction: 'down', count: idleWorkers.length, timestamp: new Date() };
    this._status = 'running';
    this.emitEvent({ type: 'pool.scaled', direction: 'down', count: idleWorkers.length });
  }

  // Private methods

  private async spawnWorker(): Promise<void> {
    const workerId = `worker-${uuidv4().slice(0, 8)}`;
    const worker = new AgentWorker(workerId, DEFAULT_RESOURCE_LIMITS);

    // Set up event handlers
    worker.on('status', (status) => {
      this.emitEvent({ type: 'worker.status', workerId, status });
    });

    worker.on('task.completed', ({ taskId, result }) => {
      this.handleTaskComplete(taskId, result);
    });

    worker.on('task.failed', ({ taskId, error }) => {
      this.handleTaskFailed(taskId, error);
    });

    worker.on('crashed', () => {
      this.handleWorkerCrash(workerId);
    });

    worker.on('error', (error) => {
      console.error(`[WorkerPool] Worker ${workerId} error:`, error);
      this.emitEvent({ type: 'worker.error', workerId, error: String(error) });
    });

    try {
      await worker.spawn();
      this.workers.set(workerId, worker);
      this.emitEvent({ type: 'worker.started', workerId, pid: worker.pid });
      console.log(`[WorkerPool] Worker ${workerId} spawned (pid: ${worker.pid})`);
    } catch (error) {
      console.error(`[WorkerPool] Failed to spawn worker ${workerId}:`, error);
    }
  }

  private dispatchTasks(): void {
    while (!this.taskQueue.isEmpty()) {
      // Find idle worker
      const idleWorker = Array.from(this.workers.values()).find(w => w.status === 'idle');
      if (!idleWorker) break;

      const task = this.taskQueue.dequeue();
      if (!task) break;

      this.assignTaskToWorker(task, idleWorker);
    }
  }

  private async assignTaskToWorker(task: AgentTask, worker: AgentWorker): Promise<void> {
    const assignment: TaskAssignment = {
      taskId: task.id,
      workerId: worker.id,
      assignedAt: new Date(),
      status: 'assigned',
    };

    this.taskAssignments.set(task.id, assignment);
    this.runningTasks.set(task.id, {
      task,
      workerId: worker.id,
      startTime: Date.now(),
    });

    this.emitEvent({ type: 'task.assigned', taskId: task.id, workerId: worker.id });
    console.log(`[WorkerPool] Task ${task.id} assigned to worker ${worker.id}`);

    // Execute (don't await - runs async)
    worker.execute(task).catch(error => {
      console.error(`[WorkerPool] Task ${task.id} execution error:`, error);
    });
  }

  private handleTaskComplete(taskId: string, result: TaskResult): void {
    const running = this.runningTasks.get(taskId);
    if (!running) return;

    this.runningTasks.delete(taskId);
    this.totalTasksCompleted++;
    this.taskDurations.push(result.duration);

    // Keep only last 100 durations
    if (this.taskDurations.length > 100) {
      this.taskDurations.shift();
    }

    const assignment = this.taskAssignments.get(taskId);
    if (assignment) {
      assignment.status = 'completed';
    }

    this.emitEvent({ type: 'task.completed', taskId, result });
    console.log(`[WorkerPool] Task ${taskId} completed (${result.duration}ms)`);

    // Dispatch more tasks
    this.dispatchTasks();
  }

  private handleTaskFailed(taskId: string, error: string): void {
    const running = this.runningTasks.get(taskId);
    if (!running) return;

    const task = running.task;
    this.runningTasks.delete(taskId);

    // Check for retry
    if ((task.retryCount || 0) < (task.maxRetries || 0)) {
      console.log(`[WorkerPool] Retrying task ${taskId} (attempt ${(task.retryCount || 0) + 1})`);
      task.retryCount = (task.retryCount || 0) + 1;
      this.taskQueue.enqueue(task);
    } else {
      this.totalTasksFailed++;
      const assignment = this.taskAssignments.get(taskId);
      if (assignment) {
        assignment.status = 'failed';
      }
      this.emitEvent({ type: 'task.failed', taskId, error });
      console.log(`[WorkerPool] Task ${taskId} failed: ${error}`);
    }

    // Dispatch more tasks
    this.dispatchTasks();
  }

  private async handleWorkerCrash(workerId: string): Promise<void> {
    console.log(`[WorkerPool] Worker ${workerId} crashed, respawning...`);

    const worker = this.workers.get(workerId);
    if (worker) {
      // Find any task assigned to this worker and re-queue
      for (const [taskId, running] of this.runningTasks.entries()) {
        if (running.workerId === workerId) {
          this.runningTasks.delete(taskId);
          running.task.retryCount = (running.task.retryCount || 0) + 1;
          this.taskQueue.enqueue(running.task);
        }
      }

      // Respawn worker
      try {
        await worker.restart();
        this.emitEvent({ type: 'worker.started', workerId, pid: worker.pid });
      } catch (error) {
        console.error(`[WorkerPool] Failed to respawn worker ${workerId}:`, error);
        this.workers.delete(workerId);
        this.emitEvent({ type: 'worker.stopped', workerId, reason: 'respawn_failed' });

        // Spawn replacement if below minimum
        if (this.workers.size < this.config.minWorkers) {
          await this.spawnWorker();
        }
      }
    }
  }

  private startScaleMonitor(): void {
    this.scaleTimer = setInterval(() => {
      this.checkScaling();
    }, this.config.scaleInterval);
  }

  private checkScaling(): void {
    if (this._status !== 'running') return;

    // Check cooldown
    if (this.lastScaleOperation) {
      const timeSinceLastScale = Date.now() - this.lastScaleOperation.timestamp.getTime();
      if (timeSinceLastScale < this.config.cooldownPeriod) return;
    }

    const metrics = this.getMetrics();

    if (metrics.utilization > this.config.scaleUpThreshold && this.workers.size < this.config.maxWorkers) {
      this.scaleUp();
    } else if (metrics.utilization < this.config.scaleDownThreshold && this.workers.size > this.config.minWorkers) {
      this.scaleDown();
    }
  }

  private startHealthMonitor(): void {
    this.healthTimer = setInterval(() => {
      this.checkHealth();
    }, this.config.healthCheckInterval);
  }

  private async checkHealth(): Promise<void> {
    for (const worker of this.workers.values()) {
      const health = await worker.checkHealth();
      if (!health.healthy) {
        console.warn(`[WorkerPool] Worker ${worker.id} unhealthy:`, health.issues);
        if (health.issues.includes('Process not running')) {
          await this.handleWorkerCrash(worker.id);
        }
      }
    }

    // Check for degraded state
    const errorCount = Array.from(this.workers.values())
      .filter(w => w.status === 'error' || w.status === 'crashed').length;

    if (errorCount > this.workers.size * 0.5) {
      this._status = 'degraded';
    } else if (this._status === 'degraded') {
      this._status = 'running';
    }
  }

  private startTaskDispatcher(): void {
    this.dispatchTimer = setInterval(() => {
      this.dispatchTasks();
    }, 1000);
  }

  private stopTimers(): void {
    if (this.scaleTimer) clearInterval(this.scaleTimer);
    if (this.healthTimer) clearInterval(this.healthTimer);
    if (this.dispatchTimer) clearInterval(this.dispatchTimer);
    this.scaleTimer = null;
    this.healthTimer = null;
    this.dispatchTimer = null;
  }

  private emitEvent(event: PoolEvent): void {
    this.emit(event.type, event);
    this.emit('event', event);
  }
}

export default AgentWorkerPool;
