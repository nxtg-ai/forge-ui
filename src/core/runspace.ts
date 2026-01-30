/**
 * Runspace - Core abstraction for multi-project management
 *
 * A runspace represents a single project with its own:
 * - Vision and state
 * - Terminal session (PTY)
 * - MCP configuration
 * - Isolated context
 */

export type RunspaceBackendType = "wsl" | "container" | "vm";
export type RunspaceStatus = "active" | "suspended" | "stopped";

export interface Runspace {
  // Identity
  id: string; // Unique identifier (uuid)
  name: string; // Machine name (e.g., "nxtg-forge-v3")
  displayName: string; // Human-friendly (e.g., "NXTG-Forge v3")
  path: string; // Absolute path to project root

  // Backend configuration
  backendType: RunspaceBackendType;
  status: RunspaceStatus;

  // Project context
  vision?: VisionData;
  state?: ProjectState;
  mcpConfig?: MCPConfiguration;

  // Runtime state
  ptySessionId?: string; // Active PTY session ID
  wsRoomId?: string; // WebSocket room for this runspace
  pid?: number; // Backend process ID (for WSL)
  containerId?: string; // Container ID (for Docker)
  vmId?: string; // VM ID (for future)

  // Metadata
  createdAt: Date;
  lastActive: Date;
  tags: string[]; // User-defined tags
  color?: string; // Visual identifier (hex color)
  icon?: string; // Emoji or icon identifier

  // Settings
  autoStart?: boolean; // Start on Forge launch
  autoSuspend?: boolean; // Suspend when inactive
  suspendTimeout?: number; // Minutes before auto-suspend
}

export interface VisionData {
  mission: string;
  goals: string[];
  constraints: string[];
  successMetrics: string[];
  timeframe: string;
  engagementMode: "ceo" | "vp" | "engineer" | "builder" | "founder";
  version?: string;
}

export interface ProjectState {
  phase: "planning" | "building" | "testing" | "deploying" | "maintenance";
  progress: number; // 0-100
  blockers: string[];
  recentDecisions: Decision[];
  activeAgents: string[];
  healthScore: number; // 0-100
  lastUpdate: Date;
}

export interface Decision {
  id: string;
  title: string;
  description: string;
  status: "proposed" | "approved" | "rejected";
  proposedBy: string;
  timestamp: Date;
}

export interface MCPConfiguration {
  servers: Record<string, MCPServerConfig>;
  setupGuide?: string;
}

export interface MCPServerConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
  enabled: boolean;
}

/**
 * Runspace Backend Interface
 * Abstract interface for different backend types (WSL, Container, VM)
 */
export interface IRunspaceBackend {
  readonly type: RunspaceBackendType;

  /**
   * Start the runspace backend
   */
  start(runspace: Runspace): Promise<void>;

  /**
   * Stop the runspace backend
   */
  stop(runspace: Runspace): Promise<void>;

  /**
   * Suspend the runspace (pause, save state)
   */
  suspend(runspace: Runspace): Promise<void>;

  /**
   * Resume the runspace from suspended state
   */
  resume(runspace: Runspace): Promise<void>;

  /**
   * Execute a command in the runspace
   */
  execute(runspace: Runspace, command: string): Promise<string>;

  /**
   * Attach a PTY session to the runspace
   */
  attachPTY(runspace: Runspace): Promise<PTYSession>;

  /**
   * Get runspace health/status
   */
  getHealth(runspace: Runspace): Promise<RunspaceHealth>;
}

export interface PTYSession {
  id: string;
  runspaceId: string;
  pty: any; // IPty from node-pty
  ws?: any; // WebSocket connection
  createdAt: Date;
}

export interface RunspaceHealth {
  status: "healthy" | "degraded" | "unhealthy";
  cpu: number; // Percentage
  memory: number; // MB used
  disk: number; // MB used
  uptime: number; // Seconds
  lastCheck: Date;
}

/**
 * Runspace Registry
 * Manages the global list of all runspaces
 */
export interface RunspaceRegistry {
  runspaces: Runspace[];
  activeRunspaceId: string | null;
  version: string;
  lastSync: Date;
}

/**
 * Runspace Events
 */
export type RunspaceEvent =
  | { type: "runspace.created"; runspace: Runspace }
  | { type: "runspace.deleted"; runspaceId: string }
  | { type: "runspace.activated"; runspaceId: string }
  | { type: "runspace.suspended"; runspaceId: string }
  | { type: "runspace.resumed"; runspaceId: string }
  | { type: "runspace.updated"; runspace: Runspace }
  | { type: "runspace.health"; runspaceId: string; health: RunspaceHealth };

/**
 * Runspace Creation Config
 */
export interface CreateRunspaceConfig {
  name: string;
  displayName?: string;
  path: string;
  backendType?: RunspaceBackendType;
  vision?: VisionData;
  mcpConfig?: MCPConfiguration;
  tags?: string[];
  color?: string;
  icon?: string;
  autoStart?: boolean;
}
