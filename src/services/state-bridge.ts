/**
 * State Bridge Service
 * Real-time state synchronization between backend and UI
 */

import { z } from 'zod';
import { BaseService, ServiceConfig } from './base-service';
import { Result, StateError, IntegrationError } from '../utils/result';
import {
  ProjectState,
  ProjectContext,
  Blocker,
  Decision,
  Agent,
  AgentActivity,
  EngagementMode
} from '../components/types';

/**
 * State update event types
 */
export enum StateUpdateType {
  PROJECT_STATE = 'project_state',
  AGENT_STATE = 'agent_state',
  BLOCKER_ADDED = 'blocker_added',
  BLOCKER_RESOLVED = 'blocker_resolved',
  DECISION_MADE = 'decision_made',
  PHASE_CHANGED = 'phase_changed',
  PROGRESS_UPDATE = 'progress_update'
}

/**
 * State update event
 */
export interface StateUpdate {
  type: StateUpdateType;
  timestamp: Date;
  data: unknown;
  metadata?: Record<string, unknown>;
}

/**
 * State subscription options
 */
export interface SubscriptionOptions {
  filter?: (update: StateUpdate) => boolean;
  debounceMs?: number;
  bufferSize?: number;
}

/**
 * State snapshot for persistence
 */
export interface StateSnapshot {
  projectState: ProjectState;
  projectContext: ProjectContext;
  timestamp: Date;
  version: number;
}

/**
 * State Bridge Service configuration
 */
export interface StateBridgeConfig extends ServiceConfig {
  pollingInterval?: number;
  maxBufferSize?: number;
  persistenceEnabled?: boolean;
  statePath?: string;
}

/**
 * State synchronization service
 */
export class StateBridgeService extends BaseService {
  private currentState: ProjectState | null = null;
  private projectContext: ProjectContext | null = null;
  private updateBuffer: StateUpdate[] = [];
  private subscribers = new Map<string, (update: StateUpdate) => void>();
  private pollingTimer?: NodeJS.Timer;
  private stateVersion = 0;

  constructor(config: StateBridgeConfig = { name: 'StateBridge' }) {
    super({
      ...config,
      debounceMs: config.debounceMs ?? 100
    });

    this.config = {
      pollingInterval: 1000,
      maxBufferSize: 100,
      persistenceEnabled: true,
      statePath: '.claude/state.json',
      ...config
    };
  }

  /**
   * Perform service initialization
   */
  protected async performInitialization(): Promise<void> {
    // Load initial state
    const stateResult = await this.loadInitialState();
    if (stateResult.isErr()) {
      throw stateResult.error;
    }

    // Start polling for backend state changes
    this.startPolling();
  }

  /**
   * Perform service cleanup
   */
  protected async performDisposal(): Promise<void> {
    this.stopPolling();
    this.subscribers.clear();
    this.updateBuffer = [];

    // Save final state
    if ((this.config as StateBridgeConfig).persistenceEnabled) {
      await this.persistState();
    }
  }

  /**
   * Get current project state
   */
  getProjectState(): Result<ProjectState, StateError> {
    if (!this.currentState) {
      return Result.err(
        new StateError('No project state available')
      );
    }
    return Result.ok(this.currentState);
  }

  /**
   * Get project context
   */
  getProjectContext(): Result<ProjectContext, StateError> {
    if (!this.projectContext) {
      return Result.err(
        new StateError('No project context available')
      );
    }
    return Result.ok(this.projectContext);
  }

  /**
   * Update project state
   */
  async updateProjectState(
    update: Partial<ProjectState>
  ): Promise<Result<ProjectState, IntegrationError>> {
    if (!this.currentState) {
      return Result.err(
        new StateError('No current state to update')
      );
    }

    try {
      // Merge update with current state
      const newState: ProjectState = {
        ...this.currentState,
        ...update
      };

      // Validate the new state
      const validationResult = this.validateProjectState(newState);
      if (validationResult.isErr()) {
        return Result.err(validationResult.error);
      }

      // Apply the update
      this.currentState = newState;
      this.stateVersion++;

      // Emit state update event
      this.emitStateUpdate({
        type: StateUpdateType.PROJECT_STATE,
        timestamp: new Date(),
        data: newState
      });

      // Persist if enabled
      if ((this.config as StateBridgeConfig).persistenceEnabled) {
        await this.persistState();
      }

      return Result.ok(newState);
    } catch (error) {
      return Result.err(
        new IntegrationError(
          `Failed to update state: ${error instanceof Error ? error.message : String(error)}`,
          'STATE_UPDATE_ERROR'
        )
      );
    }
  }

  /**
   * Add a blocker
   */
  async addBlocker(blocker: Blocker): Promise<Result<void, IntegrationError>> {
    const stateResult = this.getProjectState();
    if (stateResult.isErr()) {
      return Result.err(new IntegrationError(stateResult.error.message, 'STATE_ERROR'));
    }

    const state = stateResult.value;
    const newBlockers = [...state.blockers, blocker];

    const updateResult = await this.updateProjectState({
      blockers: newBlockers
    });

    if (updateResult.isOk()) {
      this.emitStateUpdate({
        type: StateUpdateType.BLOCKER_ADDED,
        timestamp: new Date(),
        data: blocker
      });
    }

    return updateResult.map(() => undefined);
  }

  /**
   * Resolve a blocker
   */
  async resolveBlocker(blockerId: string): Promise<Result<void, IntegrationError>> {
    const stateResult = this.getProjectState();
    if (stateResult.isErr()) {
      return Result.err(new IntegrationError(stateResult.error.message, 'STATE_ERROR'));
    }

    const state = stateResult.value;
    const newBlockers = state.blockers.filter(b => b.id !== blockerId);

    const updateResult = await this.updateProjectState({
      blockers: newBlockers
    });

    if (updateResult.isOk()) {
      this.emitStateUpdate({
        type: StateUpdateType.BLOCKER_RESOLVED,
        timestamp: new Date(),
        data: { blockerId }
      });
    }

    return updateResult.map(() => undefined);
  }

  /**
   * Record a decision
   */
  async recordDecision(decision: Decision): Promise<Result<void, IntegrationError>> {
    const stateResult = this.getProjectState();
    if (stateResult.isErr()) {
      return Result.err(new IntegrationError(stateResult.error.message, 'STATE_ERROR'));
    }

    const state = stateResult.value;
    const newDecisions = [decision, ...state.recentDecisions].slice(0, 10); // Keep last 10

    const updateResult = await this.updateProjectState({
      recentDecisions: newDecisions
    });

    if (updateResult.isOk()) {
      this.emitStateUpdate({
        type: StateUpdateType.DECISION_MADE,
        timestamp: new Date(),
        data: decision
      });
    }

    return updateResult.map(() => undefined);
  }

  /**
   * Update agent state
   */
  async updateAgentState(agent: Agent): Promise<Result<void, IntegrationError>> {
    const stateResult = this.getProjectState();
    if (stateResult.isErr()) {
      return Result.err(new IntegrationError(stateResult.error.message, 'STATE_ERROR'));
    }

    const state = stateResult.value;
    const agentIndex = state.activeAgents.findIndex(a => a.id === agent.id);

    if (agentIndex === -1) {
      // Add new agent
      const newAgents = [...state.activeAgents, agent];
      const updateResult = await this.updateProjectState({
        activeAgents: newAgents
      });

      return updateResult.map(() => undefined);
    } else {
      // Update existing agent
      const newAgents = [...state.activeAgents];
      newAgents[agentIndex] = agent;

      const updateResult = await this.updateProjectState({
        activeAgents: newAgents
      });

      if (updateResult.isOk()) {
        this.emitStateUpdate({
          type: StateUpdateType.AGENT_STATE,
          timestamp: new Date(),
          data: agent
        });
      }

      return updateResult.map(() => undefined);
    }
  }

  /**
   * Subscribe to state updates
   */
  subscribe(
    id: string,
    callback: (update: StateUpdate) => void,
    options?: SubscriptionOptions
  ): () => void {
    const wrappedCallback = options?.debounceMs
      ? this.debounce(callback, options.debounceMs)
      : callback;

    const filteredCallback = options?.filter
      ? (update: StateUpdate) => {
          if (options.filter!(update)) {
            wrappedCallback(update);
          }
        }
      : wrappedCallback;

    this.subscribers.set(id, filteredCallback);

    // Return unsubscribe function
    return () => {
      this.subscribers.delete(id);
    };
  }

  /**
   * Get state update history
   */
  getUpdateHistory(limit = 50): StateUpdate[] {
    return this.updateBuffer.slice(-limit);
  }

  /**
   * Clear update history
   */
  clearUpdateHistory(): void {
    this.updateBuffer = [];
  }

  /**
   * Get state snapshot
   */
  getSnapshot(): StateSnapshot | null {
    if (!this.currentState || !this.projectContext) {
      return null;
    }

    return {
      projectState: this.currentState,
      projectContext: this.projectContext,
      timestamp: new Date(),
      version: this.stateVersion
    };
  }

  /**
   * Restore from snapshot
   */
  async restoreFromSnapshot(
    snapshot: StateSnapshot
  ): Promise<Result<void, IntegrationError>> {
    try {
      // Validate snapshot
      const stateValidation = this.validateProjectState(snapshot.projectState);
      if (stateValidation.isErr()) {
        return Result.err(stateValidation.error);
      }

      // Apply snapshot
      this.currentState = snapshot.projectState;
      this.projectContext = snapshot.projectContext;
      this.stateVersion = snapshot.version;

      // Emit full state update
      this.emitStateUpdate({
        type: StateUpdateType.PROJECT_STATE,
        timestamp: new Date(),
        data: snapshot.projectState,
        metadata: { restored: true, version: snapshot.version }
      });

      return Result.ok(undefined);
    } catch (error) {
      return Result.err(
        new IntegrationError(
          `Failed to restore snapshot: ${error instanceof Error ? error.message : String(error)}`,
          'RESTORE_ERROR'
        )
      );
    }
  }

  /**
   * Load initial state from backend or persistence
   */
  private async loadInitialState(): Promise<Result<void, IntegrationError>> {
    try {
      // TODO: Load from actual backend state manager
      // For now, create default state
      this.currentState = {
        phase: 'planning',
        progress: 0,
        blockers: [],
        recentDecisions: [],
        activeAgents: [],
        healthScore: 100
      };

      this.projectContext = {
        name: 'NXTG-Forge',
        phase: 'planning',
        activeAgents: 0,
        pendingTasks: 0,
        healthScore: 100,
        lastActivity: new Date()
      };

      return Result.ok(undefined);
    } catch (error) {
      return Result.err(
        new IntegrationError(
          `Failed to load initial state: ${error instanceof Error ? error.message : String(error)}`,
          'LOAD_ERROR'
        )
      );
    }
  }

  /**
   * Start polling for backend state changes
   */
  private startPolling(): void {
    const config = this.config as StateBridgeConfig;
    if (!config.pollingInterval) return;

    this.pollingTimer = setInterval(async () => {
      await this.pollBackendState();
    }, config.pollingInterval);
  }

  /**
   * Stop polling
   */
  private stopPolling(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer as any);
      this.pollingTimer = undefined;
    }
  }

  /**
   * Poll backend for state changes
   */
  private async pollBackendState(): Promise<void> {
    // TODO: Implement actual backend polling
    // This would connect to the backend orchestrator
  }

  /**
   * Persist current state
   */
  private async persistState(): Promise<Result<void, IntegrationError>> {
    // TODO: Implement state persistence
    return Result.ok(undefined);
  }

  /**
   * Emit state update to all subscribers
   */
  private emitStateUpdate(update: StateUpdate): void {
    // Add to buffer
    const config = this.config as StateBridgeConfig;
    this.updateBuffer.push(update);
    if (this.updateBuffer.length > (config.maxBufferSize ?? 100)) {
      this.updateBuffer.shift();
    }

    // Notify subscribers
    this.subscribers.forEach(callback => {
      try {
        callback(update);
      } catch (error) {
        console.error('Subscriber callback error:', error);
      }
    });

    // Emit event
    this.emit('stateUpdate', update);
  }

  /**
   * Validate project state
   */
  private validateProjectState(
    state: ProjectState
  ): Result<void, IntegrationError> {
    const ProjectStateSchema = z.object({
      phase: z.enum(['planning', 'architecting', 'building', 'testing', 'deploying']),
      progress: z.number().min(0).max(100),
      blockers: z.array(z.any()),
      recentDecisions: z.array(z.any()),
      activeAgents: z.array(z.any()),
      healthScore: z.number().min(0).max(100)
    });

    const result = this.validate(state, ProjectStateSchema);
    if (result.isErr()) {
      return Result.err(
        new IntegrationError(
          `Invalid project state: ${result.error.message}`,
          'VALIDATION_ERROR',
          result.error.details
        )
      );
    }

    return Result.ok(undefined);
  }
}