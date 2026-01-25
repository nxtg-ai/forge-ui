/**
 * NXTG Forge Core
 * Main orchestration engine for AI-driven development
 */

import { ForgeState, Feature, Task } from './types';
import { StateManager } from './state';
import { Logger } from './utils';

export class Forge {
  private state: StateManager;
  private logger: Logger;

  constructor() {
    this.state = new StateManager();
    this.logger = new Logger('Forge');
  }

  /**
   * Initialize forge in a project
   */
  async init(projectPath: string = '.'): Promise<void> {
    this.logger.info('Initializing NXTG Forge...');

    await this.state.initialize(projectPath);

    this.logger.success('Forge initialized successfully');
  }

  /**
   * Add a new feature
   */
  async addFeature(name: string, description: string): Promise<Feature> {
    this.logger.info(`Adding feature: ${name}`);

    const feature: Feature = {
      id: this.generateId(),
      name,
      description,
      status: 'pending',
      createdAt: new Date().toISOString(),
      tasks: []
    };

    await this.state.addFeature(feature);

    this.logger.success(`Feature "${name}" added`);
    return feature;
  }

  /**
   * Get current status
   */
  async getStatus(): Promise<ForgeState> {
    return this.state.getState();
  }

  /**
   * Execute a task
   */
  async executeTask(taskId: string): Promise<void> {
    this.logger.info(`Executing task: ${taskId}`);

    // Task execution logic here
    await this.state.updateTaskStatus(taskId, 'in_progress');

    // Simulate work
    await new Promise(resolve => setTimeout(resolve, 1000));

    await this.state.updateTaskStatus(taskId, 'completed');
    this.logger.success(`Task ${taskId} completed`);
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

export default Forge;