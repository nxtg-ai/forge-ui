/**
 * Agent Communication Protocol
 *
 * Defines the message types and interfaces for inter-agent communication
 * in NXTG-Forge v3. Agents can request work, respond, broadcast events,
 * and discover other agents by capability.
 */

/**
 * Message types for agent-to-agent communication
 */
export type AgentMessageType =
  | 'request'      // ask another agent to do something
  | 'response'     // reply to a request
  | 'event'        // broadcast an event
  | 'handoff'      // transfer task to another agent
  | 'status'       // report agent status
  | 'discovery';   // find agents by capability

/**
 * Core message structure for agent communication
 */
export interface AgentMessage {
  /** Unique message identifier */
  id: string;
  /** Source agent name */
  from: string;
  /** Target agent name or '*' for broadcast */
  to: string;
  /** Message type */
  type: AgentMessageType;
  /** Message payload (type-specific data) */
  payload: Record<string, unknown>;
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Optional reference to message being replied to */
  replyTo?: string;
}

/**
 * Describes a capability that an agent provides
 */
export interface AgentCapability {
  /** Capability name (e.g., "code-generation", "testing", "planning") */
  name: string;
  /** Human-readable description */
  description: string;
  /** Optional JSON schema for input validation */
  inputSchema?: Record<string, unknown>;
}

/**
 * Agent registration information
 */
export interface AgentRegistration {
  /** Unique agent name */
  name: string;
  /** List of capabilities this agent provides */
  capabilities: AgentCapability[];
  /** Current agent status */
  status: 'idle' | 'busy' | 'offline';
  /** ISO 8601 timestamp of last activity */
  lastSeen: string;
}

/**
 * Request payload for capability discovery
 */
export interface DiscoveryRequest {
  /** Capability name to search for */
  capability: string;
}

/**
 * Response payload for capability discovery
 */
export interface DiscoveryResponse {
  /** List of agents that provide the requested capability */
  agents: AgentRegistration[];
}

/**
 * Status update payload
 */
export interface StatusUpdate {
  /** New status */
  status: 'idle' | 'busy' | 'offline';
  /** Optional status message */
  message?: string;
}

/**
 * Handoff request payload
 */
export interface HandoffRequest {
  /** Task description */
  task: string;
  /** Context data for the receiving agent */
  context: Record<string, unknown>;
  /** Reason for handoff */
  reason?: string;
}

/**
 * Create a new agent message with generated ID and timestamp
 */
export function createMessage(
  from: string,
  to: string,
  type: AgentMessageType,
  payload: Record<string, unknown>,
  replyTo?: string
): AgentMessage {
  return {
    id: generateMessageId(),
    from,
    to,
    type,
    payload,
    timestamp: new Date().toISOString(),
    replyTo,
  };
}

/**
 * Validate that a message has all required fields
 */
export function isValidMessage(message: unknown): message is AgentMessage {
  if (typeof message !== 'object' || message === null) {
    return false;
  }

  const msg = message as Record<string, unknown>;

  return (
    typeof msg.id === 'string' &&
    typeof msg.from === 'string' &&
    typeof msg.to === 'string' &&
    typeof msg.type === 'string' &&
    ['request', 'response', 'event', 'handoff', 'status', 'discovery'].includes(msg.type as string) &&
    typeof msg.payload === 'object' &&
    msg.payload !== null &&
    typeof msg.timestamp === 'string' &&
    (msg.replyTo === undefined || typeof msg.replyTo === 'string')
  );
}

/**
 * Validate agent registration data
 */
export function isValidRegistration(registration: unknown): registration is AgentRegistration {
  if (typeof registration !== 'object' || registration === null) {
    return false;
  }

  const reg = registration as Record<string, unknown>;

  return (
    typeof reg.name === 'string' &&
    reg.name.length > 0 &&
    Array.isArray(reg.capabilities) &&
    reg.capabilities.every(
      (cap: unknown) =>
        typeof cap === 'object' &&
        cap !== null &&
        typeof (cap as Record<string, unknown>).name === 'string' &&
        typeof (cap as Record<string, unknown>).description === 'string'
    ) &&
    typeof reg.status === 'string' &&
    ['idle', 'busy', 'offline'].includes(reg.status as string) &&
    typeof reg.lastSeen === 'string'
  );
}

/**
 * Generate a unique message ID
 */
function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}
