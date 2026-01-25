/**
 * Agent Protocol Type Definitions
 * Inter-agent communication and coordination schemas
 */

import { z } from 'zod';
import { Task, TaskSchema } from './state';

// Agent capability types
export enum Capability {
  PLANNING = 'planning',
  ARCHITECTURE = 'architecture',
  CODING = 'coding',
  TESTING = 'testing',
  DEPLOYMENT = 'deployment',
  MONITORING = 'monitoring',
  DOCUMENTATION = 'documentation',
  REVIEW = 'review',
  OPTIMIZATION = 'optimization',
  SECURITY = 'security'
}

// Message types for inter-agent communication
export enum MessageType {
  REQUEST = 'request',
  RESPONSE = 'response',
  NOTIFICATION = 'notification',
  SIGN_OFF = 'sign-off',
  ESCALATION = 'escalation',
  BROADCAST = 'broadcast'
}

// Agent schema
export const AgentSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  capabilities: z.array(z.nativeEnum(Capability)),
  priority: z.number().min(1).max(10),
  maxConcurrentTasks: z.number(),
  timeout: z.number(), // milliseconds
  retryPolicy: z.object({
    maxRetries: z.number(),
    retryDelay: z.number(),
    backoffMultiplier: z.number()
  }),
  metadata: z.record(z.string(), z.any()).optional()
});

// Message schema for inter-agent communication
export const MessageSchema = z.object({
  id: z.string(),
  from: z.string(),
  to: z.string(),
  type: z.nativeEnum(MessageType),
  subject: z.string(),
  payload: z.any(),
  timestamp: z.date(),
  correlationId: z.string().optional(),
  replyTo: z.string().optional(),
  ttl: z.number().optional(), // time to live in ms
  priority: z.number().min(1).max(10).optional()
});

// Sign-off request schema
export const SignOffRequestSchema = z.object({
  artifactId: z.string(),
  artifactType: z.string(),
  description: z.string(),
  checkpoints: z.array(z.object({
    name: z.string(),
    passed: z.boolean(),
    details: z.string().optional()
  })),
  requestedBy: z.string(),
  deadline: z.date().optional()
});

// Sign-off result schema
export const SignOffResultSchema = z.object({
  approved: z.boolean(),
  reviewer: z.string(),
  timestamp: z.date(),
  comments: z.string().optional(),
  conditions: z.array(z.string()).optional(),
  suggestions: z.array(z.string()).optional()
});

// Coordination request schema
export const CoordinationRequestSchema = z.object({
  id: z.string(),
  task: z.lazy(() => TaskSchema),
  requiredCapabilities: z.array(z.nativeEnum(Capability)),
  agents: z.array(z.string()),
  strategy: z.enum(['sequential', 'parallel', 'hierarchical', 'round-robin']),
  timeout: z.number(),
  dependencies: z.record(z.string(), z.array(z.string()))
});

// Coordination result schema
export const CoordinationResultSchema = z.object({
  requestId: z.string(),
  success: z.boolean(),
  duration: z.number(), // milliseconds
  agentResults: z.array(z.object({
    agentId: z.string(),
    status: z.enum(['success', 'failure', 'timeout', 'skipped']),
    result: z.any().optional(),
    error: z.string().optional(),
    duration: z.number()
  })),
  artifacts: z.array(z.string()),
  metadata: z.record(z.string(), z.any()).optional()
});

// Dependency graph for task coordination
export const DependencyGraphSchema = z.object({
  tasks: z.record(z.string(), z.array(z.string()))
});

// Parallel execution request
export const ParallelRequestSchema = z.object({
  tasks: z.array(TaskSchema),
  maxParallel: z.number().optional(),
  failFast: z.boolean().optional(),
  timeout: z.number().optional()
});

// Parallel execution result
export const ParallelResultSchema = z.object({
  totalTasks: z.number(),
  succeeded: z.number(),
  failed: z.number(),
  duration: z.number(),
  results: z.array(z.object({
    taskId: z.string(),
    status: z.enum(['success', 'failure', 'timeout']),
    result: z.any().optional(),
    error: z.string().optional(),
    duration: z.number()
  }))
});

// Type exports
export type Agent = z.infer<typeof AgentSchema>;
export type Message = z.infer<typeof MessageSchema>;
export type SignOffRequest = z.infer<typeof SignOffRequestSchema>;
export type SignOffResult = z.infer<typeof SignOffResultSchema>;
export type CoordinationRequest = z.infer<typeof CoordinationRequestSchema>;
export type CoordinationResult = z.infer<typeof CoordinationResultSchema>;
export type DependencyGraph = z.infer<typeof DependencyGraphSchema>;
export type ParallelRequest = z.infer<typeof ParallelRequestSchema>;
export type ParallelResult = z.infer<typeof ParallelResultSchema>;

// Artifact interface for sign-offs
export interface Artifact {
  id: string;
  type: 'code' | 'design' | 'test' | 'documentation' | 'deployment';
  path: string;
  checksum: string;
  createdBy: string;
  createdAt: Date;
  signOffs: SignOffResult[];
}

// Agent execution context
export interface ExecutionContext {
  task: Task;
  agent: Agent;
  dependencies: string[];
  environment: Record<string, any>;
  timeout: number;
}

// Agent response
export interface AgentResponse {
  success: boolean;
  result?: any;
  error?: string;
  artifacts?: string[];
  nextSteps?: string[];
  duration: number;
}