/**
 * State Manager
 * Context continuity and state persistence system
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { EventEmitter } from 'events';
import { z } from 'zod';
import { Logger } from '../utils/logger';
import {
  SystemState,
  SystemStateSchema,
  ContextGraph,
  ContextNode,
  ContextEdge,
  ContextPath,
  SituationReport,
  Task,
  AgentState,
  ConversationContext,
  ProgressNode
} from '../types/state';
import { CanonicalVision } from '../types/vision';

const logger = new Logger('StateManager');

// State file paths
interface StatePaths {
  current: string;
  backup: string;
  events: string;
  graph: string;
}

// State event for event sourcing
interface StateEvent {
  id: string;
  timestamp: Date;
  type: string;
  data: any;
  metadata?: Record<string, any>;
}

// State snapshot
interface StateSnapshot {
  state: SystemState;
  timestamp: Date;
  checksum: string;
  compressed: boolean;
}

export class StateManager extends EventEmitter {
  private projectPath: string;
  private paths: StatePaths;
  private currentState: SystemState | null = null;
  private events: StateEvent[] = [];
  private contextGraph: ContextGraph | null = null;
  private autoSaveInterval: NodeJS.Timeout | null = null;
  private isDirty: boolean = false;

  constructor(projectPath?: string) {
    super();
    this.projectPath = projectPath || process.cwd();
    this.paths = this.initializePaths();
  }

  /**
   * Initialize file paths
   */
  private initializePaths(): StatePaths {
    const stateDir = path.join(this.projectPath, '.claude', 'state');
    return {
      current: path.join(stateDir, 'current.json'),
      backup: path.join(stateDir, 'backup.json'),
      events: path.join(stateDir, 'events.jsonl'),
      graph: path.join(stateDir, 'context-graph.json')
    };
  }

  /**
   * Initialize state manager
   */
  async initialize(projectPath?: string): Promise<void> {
    if (projectPath) {
      this.projectPath = projectPath;
      this.paths = this.initializePaths();
    }

    // Ensure state directory exists
    const stateDir = path.dirname(this.paths.current);
    await fs.mkdir(stateDir, { recursive: true });

    // Try to restore existing state
    const restored = await this.restoreState();

    if (!restored) {
      // Create initial state
      await this.createInitialState();
    }

    // Start auto-save
    this.startAutoSave();

    logger.info('State manager initialized');
  }

  /**
   * Create initial state
   */
  private async createInitialState(): Promise<void> {
    const initialState: SystemState = {
      version: '3.0.0',
      timestamp: new Date(),
      vision: this.createDefaultVision(),
      currentTasks: [],
      agentStates: {},
      conversationContext: this.createDefaultContext(),
      progressGraph: [],
      metadata: {
        sessionId: crypto.randomBytes(8).toString('hex'),
        environment: process.env.NODE_ENV || 'development',
        projectPath: this.projectPath
      }
    };

    this.currentState = initialState;
    await this.saveState(initialState);

    this.recordEvent({
      id: crypto.randomBytes(8).toString('hex'),
      timestamp: new Date(),
      type: 'state-initialized',
      data: initialState
    });
  }

  /**
   * Create default vision
   */
  private createDefaultVision(): CanonicalVision {
    return {
      version: '1.0',
      created: new Date(),
      updated: new Date(),
      mission: 'Build amazing software',
      principles: [],
      strategicGoals: [],
      currentFocus: '',
      successMetrics: {}
    };
  }

  /**
   * Create default conversation context
   */
  private createDefaultContext(): ConversationContext {
    return {
      sessionId: crypto.randomBytes(8).toString('hex'),
      startedAt: new Date(),
      lastInteraction: new Date(),
      messageCount: 0,
      recentMessages: [],
      contextTags: []
    };
  }

  /**
   * Save current state
   */
  async saveState(state?: SystemState): Promise<void> {
    const stateToSave = state || this.currentState;
    if (!stateToSave) {
      throw new Error('No state to save');
    }

    try {
      // Backup existing state
      try {
        await fs.copyFile(this.paths.current, this.paths.backup);
      } catch {
        // No existing state to backup
      }

      // Calculate checksum
      const checksum = this.calculateChecksum(stateToSave);

      // Create snapshot
      const snapshot: StateSnapshot = {
        state: stateToSave,
        timestamp: new Date(),
        checksum,
        compressed: false
      };

      // Save to file
      await fs.writeFile(
        this.paths.current,
        JSON.stringify(snapshot, null, 2),
        'utf-8'
      );

      this.isDirty = false;
      logger.debug('State saved', { checksum });

      this.emit('stateSaved', stateToSave);

    } catch (error) {
      logger.error('Failed to save state', error);
      throw error;
    }
  }

  /**
   * Restore state from disk
   */
  async restoreState(): Promise<SystemState | null> {
    const startTime = Date.now();

    try {
      const content = await fs.readFile(this.paths.current, 'utf-8');
      const snapshot = JSON.parse(content) as StateSnapshot;

      // Verify checksum
      const calculatedChecksum = this.calculateChecksum(snapshot.state);
      if (calculatedChecksum !== snapshot.checksum) {
        logger.warn('State checksum mismatch, trying backup');
        return await this.restoreFromBackup();
      }

      // Parse dates
      this.parseDates(snapshot.state);

      // Validate with schema
      const validatedState = SystemStateSchema.parse(snapshot.state);

      this.currentState = validatedState;

      // Rebuild context graph
      await this.buildContextGraph();

      const duration = Date.now() - startTime;
      logger.info(`State restored in ${duration}ms`);

      this.emit('stateRestored', validatedState);

      return validatedState;

    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        logger.info('No existing state found');
        return null;
      }

      logger.error('Failed to restore state', error);
      return await this.restoreFromBackup();
    }
  }

  /**
   * Restore from backup
   */
  private async restoreFromBackup(): Promise<SystemState | null> {
    try {
      const content = await fs.readFile(this.paths.backup, 'utf-8');
      const snapshot = JSON.parse(content) as StateSnapshot;

      this.parseDates(snapshot.state);
      const validatedState = SystemStateSchema.parse(snapshot.state);

      this.currentState = validatedState;
      logger.info('State restored from backup');

      return validatedState;

    } catch (error) {
      logger.error('Failed to restore from backup', error);
      return null;
    }
  }

  /**
   * Build context graph from current state
   */
  async buildContextGraph(): Promise<ContextGraph> {
    if (!this.currentState) {
      throw new Error('No state available');
    }

    const nodes: ContextNode[] = [];
    const edges: ContextEdge[] = [];

    // Add vision as root node
    nodes.push({
      id: 'vision',
      type: 'vision',
      title: 'Canonical Vision',
      data: this.currentState.vision
    });

    // Add goals
    for (const goal of this.currentState.vision.strategicGoals) {
      nodes.push({
        id: `goal-${goal.id}`,
        type: 'goal',
        title: goal.title,
        data: goal
      });

      edges.push({
        from: 'vision',
        to: `goal-${goal.id}`,
        type: 'implements'
      });
    }

    // Add tasks
    for (const task of this.currentState.currentTasks) {
      nodes.push({
        id: `task-${task.id}`,
        type: 'task',
        title: task.title,
        data: task
      });

      // Link tasks to goals (simplified)
      if (this.currentState.vision.strategicGoals.length > 0) {
        edges.push({
          from: `goal-${this.currentState.vision.strategicGoals[0].id}`,
          to: `task-${task.id}`,
          type: 'implements'
        });
      }

      // Add task dependencies
      for (const depId of task.dependencies) {
        edges.push({
          from: `task-${depId}`,
          to: `task-${task.id}`,
          type: 'depends-on'
        });
      }
    }

    this.contextGraph = { nodes, edges };

    // Save graph
    await fs.writeFile(
      this.paths.graph,
      JSON.stringify(this.contextGraph, null, 2),
      'utf-8'
    );

    logger.info(`Context graph built with ${nodes.length} nodes and ${edges.length} edges`);

    return this.contextGraph;
  }

  /**
   * Get current situation report
   */
  async getSituation(): Promise<SituationReport> {
    if (!this.currentState) {
      throw new Error('No state available');
    }

    const tasks = this.currentState.currentTasks;
    const tasksInProgress = tasks.filter(t => t.status === 'in_progress').length;
    const tasksCompleted = tasks.filter(t => t.status === 'completed').length;

    const blockingIssues = tasks
      .filter(t => t.status === 'blocked')
      .map(t => ({
        id: t.id,
        description: `Task ${t.title} is blocked`,
        impact: 'medium' as const,
        suggestedAction: 'Review dependencies and unblock'
      }));

    const nextActions = tasks
      .filter(t => t.status === 'pending')
      .slice(0, 3)
      .map(t => `Start task: ${t.title}`);

    return {
      timestamp: new Date(),
      summary: `${tasksInProgress} tasks in progress, ${tasksCompleted} completed`,
      activeGoals: this.currentState.vision.strategicGoals
        .filter(g => g.status === 'in-progress')
        .map(g => g.id),
      tasksInProgress,
      tasksCompleted,
      blockingIssues,
      nextActions,
      estimatedCompletion: this.estimateCompletion()
    };
  }

  /**
   * Get context path from task to vision
   */
  getTaskVisionPath(taskId: string): ContextPath | null {
    if (!this.contextGraph) {
      return null;
    }

    const path: string[] = [];
    const relationships: Array<{ from: string; to: string; type: string }> = [];

    // Simplified path finding - in production use graph algorithms
    const taskNode = this.contextGraph.nodes.find(n => n.id === `task-${taskId}`);
    if (!taskNode) {
      return null;
    }

    path.push(taskNode.id);

    // Find edges leading to this task
    const incomingEdges = this.contextGraph.edges.filter(e => e.to === taskNode.id);

    for (const edge of incomingEdges) {
      relationships.push({
        from: edge.from,
        to: edge.to,
        type: edge.type
      });

      // Add parent node to path
      const parentNode = this.contextGraph.nodes.find(n => n.id === edge.from);
      if (parentNode) {
        path.push(parentNode.id);
      }
    }

    path.push('vision');

    return {
      path: path.reverse(),
      relationships
    };
  }

  /**
   * Update task status
   */
  updateTaskStatus(taskId: string, status: Task['status']): void {
    if (!this.currentState) return;

    const task = this.currentState.currentTasks.find(t => t.id === taskId);
    if (task) {
      task.status = status;
      this.isDirty = true;

      this.recordEvent({
        id: crypto.randomBytes(8).toString('hex'),
        timestamp: new Date(),
        type: 'task-status-changed',
        data: { taskId, status }
      });

      this.emit('taskStatusChanged', { taskId, status });
    }
  }

  /**
   * Update agent state
   */
  updateAgentState(agentId: string, state: Partial<AgentState>): void {
    if (!this.currentState) return;

    const agentState = this.currentState.agentStates[agentId];
    if (agentState) {
      Object.assign(agentState, state);
      this.isDirty = true;

      this.recordEvent({
        id: crypto.randomBytes(8).toString('hex'),
        timestamp: new Date(),
        type: 'agent-state-changed',
        data: { agentId, state }
      });

      this.emit('agentStateChanged', { agentId, state });
    }
  }

  /**
   * Record state event
   */
  private recordEvent(event: StateEvent): void {
    this.events.push(event);

    // Append to event log (async, non-blocking)
    const eventLine = JSON.stringify(event) + '\n';
    fs.appendFile(this.paths.events, eventLine).catch(error => {
      logger.error('Failed to write event', error);
    });
  }

  /**
   * Calculate checksum for state
   */
  private calculateChecksum(state: SystemState): string {
    const hash = crypto.createHash('sha256');
    hash.update(JSON.stringify(state));
    return hash.digest('hex');
  }

  /**
   * Parse dates in state object
   */
  private parseDates(obj: any): void {
    if (obj === null || obj === undefined) return;

    if (typeof obj === 'string' && this.isISODate(obj)) {
      return;
    }

    if (Array.isArray(obj)) {
      obj.forEach(item => this.parseDates(item));
    } else if (typeof obj === 'object') {
      for (const key in obj) {
        if (key === 'createdAt' || key === 'updatedAt' || key === 'timestamp' ||
            key === 'created' || key === 'updated' || key === 'deadline' ||
            key === 'startedAt' || key === 'completedAt' || key === 'lastInteraction' ||
            key === 'lastActive') {
          if (typeof obj[key] === 'string') {
            obj[key] = new Date(obj[key]);
          }
        } else {
          this.parseDates(obj[key]);
        }
      }
    }
  }

  /**
   * Check if string is ISO date
   */
  private isISODate(str: string): boolean {
    return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(str);
  }

  /**
   * Estimate completion time
   */
  private estimateCompletion(): Date | undefined {
    if (!this.currentState) return undefined;

    const pendingTasks = this.currentState.currentTasks.filter(
      t => t.status === 'pending' || t.status === 'in_progress'
    );

    if (pendingTasks.length === 0) return undefined;

    // Simplified estimation - in production use historical data
    const averageTaskDuration = 30 * 60 * 1000; // 30 minutes
    const estimatedMs = pendingTasks.length * averageTaskDuration;

    return new Date(Date.now() + estimatedMs);
  }

  /**
   * Start auto-save interval
   */
  private startAutoSave(): void {
    this.autoSaveInterval = setInterval(() => {
      if (this.isDirty) {
        this.saveState().catch(error => {
          logger.error('Auto-save failed', error);
        });
      }
    }, 60000); // Save every minute if dirty
  }

  /**
   * Stop auto-save
   */
  stopAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  /**
   * Get current state
   */
  getCurrentState(): SystemState | null {
    return this.currentState;
  }

  /**
   * Get context graph
   */
  getContextGraph(): ContextGraph | null {
    return this.contextGraph;
  }

  /**
   * Get events
   */
  getEvents(): StateEvent[] {
    return [...this.events];
  }

  // API compatibility methods
  getState(): SystemState | null {
    return this.currentState;
  }

  async updateState(updates: Partial<SystemState>): Promise<SystemState> {
    if (!this.currentState) {
      throw new Error('No state to update');
    }

    // Apply updates
    Object.assign(this.currentState, updates);
    this.currentState.timestamp = new Date();

    // Save state
    await this.saveState(this.currentState);

    return this.currentState;
  }

  async updatePhase(phase: string): Promise<SystemState> {
    if (!this.currentState) {
      throw new Error('No state available');
    }

    // Update metadata with phase
    this.currentState.metadata = {
      ...this.currentState.metadata,
      currentPhase: phase
    };

    await this.saveState(this.currentState);
    return this.currentState;
  }

  async getHealthMetrics(): Promise<any> {
    const tasks = this.currentState?.currentTasks || [];
    const completed = tasks.filter(t => t.status === 'completed').length;
    const failed = tasks.filter(t => t.status === 'failed').length;
    const total = tasks.length;

    return {
      healthy: failed === 0,
      taskCompletion: total > 0 ? completed / total : 0,
      failedTasks: failed,
      totalTasks: total,
      timestamp: new Date()
    };
  }

  isHealthy(): boolean {
    return this.currentState !== null;
  }
}