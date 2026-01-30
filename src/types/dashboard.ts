/**
 * Dashboard Type Definitions
 * Chief of Staff dashboard and metrics types
 */

export type DashboardMode =
  | "overview"
  | "health"
  | "blockers"
  | "activity"
  | "progress";

export interface ProjectHealth {
  overall: HealthStatus;
  categories: {
    code: HealthStatus;
    tests: HealthStatus;
    documentation: HealthStatus;
    dependencies: HealthStatus;
    performance: HealthStatus;
    security: HealthStatus;
  };
  score: number; // 0-100
  trend: "improving" | "stable" | "declining";
}

export interface HealthStatus {
  status: "excellent" | "good" | "warning" | "critical";
  score: number; // 0-100
  issues: HealthIssue[];
  lastChecked: Date;
}

export interface HealthIssue {
  id: string;
  type: "error" | "warning" | "info";
  category: string;
  title: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low";
  suggestion?: string;
  autoFixAvailable: boolean;
}

export interface Blocker {
  id: string;
  title: string;
  description: string;
  type: "technical" | "dependency" | "resource" | "decision" | "external";
  priority: "critical" | "high" | "medium" | "low";
  status: "active" | "investigating" | "resolved";
  blockedItems: Array<{
    type: "goal" | "task" | "agent" | "feature";
    id: string;
    name: string;
  }>;
  assignedTo?: string[];
  createdAt: Date;
  resolvedAt?: Date;
  estimatedResolution?: Date;
  resolution?: string;
}

export interface AgentActivity {
  agentId: string;
  agentName: string;
  status: "idle" | "working" | "blocked" | "error" | "offline";
  currentTask?: {
    id: string;
    title: string;
    progress: number;
    startedAt: Date;
    estimatedCompletion?: Date;
  };
  recentActions: AgentAction[];
  performance: {
    tasksCompleted: number;
    successRate: number;
    averageTime: number;
    efficiency: number; // 0-100
  };
}

export interface AgentAction {
  id: string;
  timestamp: Date;
  type:
    | "task_started"
    | "task_completed"
    | "error"
    | "decision"
    | "collaboration";
  description: string;
  details?: Record<string, any>;
  impact?: "low" | "medium" | "high";
}

export interface ProgressMetric {
  id: string;
  name: string;
  category:
    | "development"
    | "testing"
    | "deployment"
    | "documentation"
    | "custom";
  value: number;
  target: number;
  unit: string;
  percentComplete: number;
  trend: Array<{
    timestamp: Date;
    value: number;
  }>;
  forecast?: {
    estimatedCompletion: Date;
    confidence: number; // 0-100
  };
}

export interface DependencyGraph {
  nodes: Array<{
    id: string;
    type: "goal" | "task" | "milestone" | "deliverable";
    name: string;
    status: "pending" | "in-progress" | "completed" | "blocked";
    progress: number;
  }>;
  edges: Array<{
    from: string;
    to: string;
    type: "blocks" | "requires" | "influences";
    strength: "strong" | "weak";
  }>;
}

export interface DashboardCard {
  id: string;
  type: "metric" | "chart" | "list" | "graph" | "alert" | "activity";
  title: string;
  size: "small" | "medium" | "large" | "full";
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  content: any; // Specific to card type
  refreshInterval?: number; // in seconds
  interactive: boolean;
}

export interface DashboardNotification {
  id: string;
  type: "success" | "warning" | "error" | "info";
  title: string;
  message: string;
  timestamp: Date;
  source: "agent" | "system" | "user";
  actionable: boolean;
  actions?: Array<{
    label: string;
    action: string;
    primary?: boolean;
  }>;
  dismissed: boolean;
}

export interface DashboardFilter {
  timeRange: "hour" | "day" | "week" | "month" | "all";
  agents?: string[];
  categories?: string[];
  priorities?: Array<"critical" | "high" | "medium" | "low">;
  statuses?: string[];
}

export interface DashboardState {
  mode: DashboardMode;
  filters: DashboardFilter;
  cards: DashboardCard[];
  notifications: DashboardNotification[];
  lastRefresh: Date;
  autoRefresh: boolean;
  refreshInterval: number;
}
