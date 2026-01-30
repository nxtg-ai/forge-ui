/**
 * Task Queue - Priority queue for agent tasks
 * Supports priority-based ordering and FIFO within priority levels
 */

import { AgentTask, TaskPriority, TaskStatus } from './types';

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
  background: 3,
};

interface QueuedTask {
  task: AgentTask;
  queuedAt: Date;
}

export class TaskQueue {
  private queues: Map<TaskPriority, QueuedTask[]> = new Map();
  private taskMap: Map<string, QueuedTask> = new Map();
  private completedTasks: Map<string, { task: AgentTask; result: unknown }> = new Map();

  constructor() {
    // Initialize priority queues
    for (const priority of ['high', 'medium', 'low', 'background'] as TaskPriority[]) {
      this.queues.set(priority, []);
    }
  }

  /**
   * Add task to queue
   */
  enqueue(task: AgentTask): void {
    if (this.taskMap.has(task.id)) {
      throw new Error(`Task ${task.id} already exists in queue`);
    }

    const queuedTask: QueuedTask = {
      task: { ...task, createdAt: new Date() },
      queuedAt: new Date(),
    };

    const queue = this.queues.get(task.priority) || [];
    queue.push(queuedTask);
    this.queues.set(task.priority, queue);
    this.taskMap.set(task.id, queuedTask);
  }

  /**
   * Get next task from queue (highest priority first)
   */
  dequeue(): AgentTask | null {
    for (const priority of ['high', 'medium', 'low', 'background'] as TaskPriority[]) {
      const queue = this.queues.get(priority);
      if (queue && queue.length > 0) {
        const queuedTask = queue.shift()!;
        this.taskMap.delete(queuedTask.task.id);
        return queuedTask.task;
      }
    }
    return null;
  }

  /**
   * Peek at next task without removing
   */
  peek(): AgentTask | null {
    for (const priority of ['high', 'medium', 'low', 'background'] as TaskPriority[]) {
      const queue = this.queues.get(priority);
      if (queue && queue.length > 0) {
        return queue[0].task;
      }
    }
    return null;
  }

  /**
   * Get task by ID
   */
  getTask(taskId: string): AgentTask | null {
    const queuedTask = this.taskMap.get(taskId);
    return queuedTask?.task || null;
  }

  /**
   * Remove task from queue
   */
  remove(taskId: string): boolean {
    const queuedTask = this.taskMap.get(taskId);
    if (!queuedTask) return false;

    const queue = this.queues.get(queuedTask.task.priority);
    if (queue) {
      const index = queue.findIndex(qt => qt.task.id === taskId);
      if (index >= 0) {
        queue.splice(index, 1);
      }
    }

    this.taskMap.delete(taskId);
    return true;
  }

  /**
   * Update task priority (re-queue)
   */
  updatePriority(taskId: string, newPriority: TaskPriority): boolean {
    const queuedTask = this.taskMap.get(taskId);
    if (!queuedTask) return false;

    // Remove from current queue
    this.remove(taskId);

    // Re-add with new priority
    queuedTask.task.priority = newPriority;
    this.enqueue(queuedTask.task);

    return true;
  }

  /**
   * Mark task as completed
   */
  complete(taskId: string, result: unknown): void {
    const queuedTask = this.taskMap.get(taskId);
    if (queuedTask) {
      this.completedTasks.set(taskId, { task: queuedTask.task, result });
      this.remove(taskId);
    }
  }

  /**
   * Get queue size
   */
  size(): number {
    return this.taskMap.size;
  }

  /**
   * Get size by priority
   */
  sizeByPriority(): Record<TaskPriority, number> {
    return {
      high: this.queues.get('high')?.length || 0,
      medium: this.queues.get('medium')?.length || 0,
      low: this.queues.get('low')?.length || 0,
      background: this.queues.get('background')?.length || 0,
    };
  }

  /**
   * Check if queue is empty
   */
  isEmpty(): boolean {
    return this.size() === 0;
  }

  /**
   * Get all queued tasks
   */
  getAllTasks(): AgentTask[] {
    return Array.from(this.taskMap.values()).map(qt => qt.task);
  }

  /**
   * Get tasks by workstream
   */
  getTasksByWorkstream(workstreamId: string): AgentTask[] {
    return this.getAllTasks().filter(t => t.workstreamId === workstreamId);
  }

  /**
   * Get average wait time for queued tasks (ms)
   */
  getAverageWaitTime(): number {
    const tasks = Array.from(this.taskMap.values());
    if (tasks.length === 0) return 0;

    const now = Date.now();
    const totalWait = tasks.reduce((sum, qt) => sum + (now - qt.queuedAt.getTime()), 0);
    return totalWait / tasks.length;
  }

  /**
   * Get oldest task age (ms)
   */
  getOldestTaskAge(): number {
    let oldest = 0;
    const now = Date.now();

    for (const priority of ['high', 'medium', 'low', 'background'] as TaskPriority[]) {
      const queue = this.queues.get(priority);
      if (queue && queue.length > 0) {
        const age = now - queue[0].queuedAt.getTime();
        oldest = Math.max(oldest, age);
      }
    }

    return oldest;
  }

  /**
   * Clear all tasks
   */
  clear(): void {
    for (const priority of ['high', 'medium', 'low', 'background'] as TaskPriority[]) {
      this.queues.set(priority, []);
    }
    this.taskMap.clear();
  }

  /**
   * Get completed tasks (limited history)
   */
  getCompletedTasks(limit = 100): { task: AgentTask; result: unknown }[] {
    const entries = Array.from(this.completedTasks.entries()).slice(-limit);
    return entries.map(([_, value]) => value);
  }

  /**
   * Clean up old completed tasks
   */
  cleanupCompleted(maxAge: number = 3600000): void {
    const cutoff = Date.now() - maxAge;
    for (const [taskId, { task }] of this.completedTasks.entries()) {
      if (task.completedAt && task.completedAt.getTime() < cutoff) {
        this.completedTasks.delete(taskId);
      }
    }
  }
}

export default TaskQueue;
