// Core type definitions for NXTG-Forge Meta-Orchestration System

// Vision and Goals
export interface VisionData {
  mission: string;
  goals: Goal[] | string[]; // Can be simple strings or detailed Goal objects
  constraints: string[];
  successMetrics: Metric[] | string[];
  timeframe: string;
  engagementMode?: EngagementMode;
  createdAt?: Date;
  lastUpdated?: Date;
  version?: number;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'blocked';
  progress: number;
  dependencies: string[];
}

export interface Metric {
  id: string;
  name: string;
  current: number;
  target: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
}

export interface ProgressData {
  overallProgress: number;
  phase: string;
  daysElapsed: number;
  estimatedDaysRemaining: number;
  velocity: number;
  blockers: number;
}

// Engagement and Interaction
export type EngagementMode = 'ceo' | 'vp' | 'engineer' | 'builder' | 'founder';

// Project State and Management
export interface ProjectState {
  phase: 'planning' | 'architecting' | 'building' | 'testing' | 'deploying';
  progress: number;
  blockers: Blocker[];
  recentDecisions: Decision[];
  activeAgents: Agent[];
  healthScore: number;
}

export interface ProjectContext {
  name: string;
  phase: string;
  activeAgents: number;
  pendingTasks: number;
  healthScore: number;
  lastActivity: Date;
}

export interface Blocker {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  agent: string;
  needsHuman: boolean;
}

export interface Decision {
  id: string;
  type: 'architecture' | 'implementation' | 'deployment';
  title: string;
  madeBy: string;
  timestamp: Date;
  impact: 'high' | 'medium' | 'low';
}

// Agent System
export interface Agent {
  id: string;
  name: string;
  role: string;
  status: 'idle' | 'thinking' | 'working' | 'blocked' | 'discussing';
  currentTask: string;
  confidence: number;
}

export interface AgentActivity {
  agentId: string;
  action: string;
  timestamp: Date;
  visibility: EngagementMode;
}

export interface Architect {
  id: string;
  name: string;
  specialty: string;
  avatar: string;
  confidence: number;
}

export interface ArchitectureDecision {
  approach: string;
  rationale: string;
  tradeoffs: string[];
  consensus: number;
  signedOffBy: string[];
}

// Command System
export interface Command {
  id: string;
  name: string;
  description: string;
  category: 'forge' | 'git' | 'test' | 'deploy' | 'analyze';
  hotkey?: string;
  requiresConfirmation?: boolean;
  icon: React.ReactNode;
}

// Automation and YOLO Mode
export type AutomationLevel = 'conservative' | 'balanced' | 'aggressive' | 'maximum';

export interface AutomatedAction {
  id: string;
  type: 'fix' | 'optimize' | 'refactor' | 'update' | 'deploy';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'reverted';
  timestamp: Date;
  confidence: number;
  automated: boolean;
}

export interface YoloStatistics {
  actionsToday: number;
  successRate: number;
  timesSaved: number; // in minutes
  issuesFixed: number;
  performanceGain: number; // percentage
  costSaved: number; // in dollars
}

// Messages and Communication
export interface Message {
  id: string;
  architectId: string;
  content: string;
  type: 'proposal' | 'concern' | 'agreement' | 'question' | 'decision';
  timestamp: Date;
  attachments?: Attachment[];
}

export interface Attachment {
  type: 'diagram' | 'code' | 'reference';
  title: string;
  content: string;
}