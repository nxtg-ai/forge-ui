/**
 * State Management for NXTG Forge
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { ForgeState, Feature, Task } from './types';

export class StateManager {
  private statePath: string = '.claude/state.json';
  private state: ForgeState | null = null;

  async initialize(projectPath: string): Promise<void> {
    this.statePath = path.join(projectPath, this.statePath);

    try {
      await this.loadState();
    } catch {
      await this.createInitialState();
    }
  }

  async getState(): Promise<ForgeState> {
    if (!this.state) {
      await this.loadState();
    }
    return this.state!;
  }

  async addFeature(feature: Feature): Promise<void> {
    const state = await this.getState();
    state.features.push(feature);
    await this.saveState();
  }

  async updateTaskStatus(taskId: string, status: Task['status']): Promise<void> {
    const state = await this.getState();

    for (const feature of state.features) {
      const task = feature.tasks?.find(t => t.id === taskId);
      if (task) {
        task.status = status;
        task.updatedAt = new Date().toISOString();
        break;
      }
    }

    await this.saveState();
  }

  private async loadState(): Promise<void> {
    const content = await fs.readFile(this.statePath, 'utf-8');
    this.state = JSON.parse(content);
  }

  private async saveState(): Promise<void> {
    await fs.writeFile(
      this.statePath,
      JSON.stringify(this.state, null, 2)
    );
  }

  private async createInitialState(): Promise<void> {
    this.state = {
      version: '3.0.0',
      initialized: new Date().toISOString(),
      features: [],
      status: 'ready'
    };

    await this.saveState();
  }
}

export default StateManager;