/**
 * Type definitions for NXTG Forge
 */

export interface ForgeState {
  version: string;
  initialized: string;
  features: Feature[];
  status: 'ready' | 'busy' | 'error';
}

export interface Feature {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  createdAt: string;
  updatedAt?: string;
  tasks: Task[];
}

export interface Task {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  createdAt: string;
  updatedAt?: string;
  assignedTo?: string;
  dependencies?: string[];
}

export interface Agent {
  name: string;
  role: string;
  capabilities: string[];
  status: 'idle' | 'working' | 'blocked';
}

export interface Command {
  name: string;
  description: string;
  handler: (args: any) => Promise<void>;
}