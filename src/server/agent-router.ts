/**
 * Agent Router
 *
 * Routes messages between registered agents, provides discovery,
 * and maintains message history for debugging and audit purposes.
 */

import { EventEmitter } from 'events';
import {
  AgentMessage,
  AgentRegistration,
  createMessage,
  isValidMessage,
  isValidRegistration,
  DiscoveryRequest,
  DiscoveryResponse,
} from './agent-protocol.js';

/**
 * Events emitted by the AgentRouter
 */
export interface AgentRouterEvents {
  message: (message: AgentMessage) => void;
  registered: (agent: AgentRegistration) => void;
  unregistered: (name: string) => void;
  error: (error: Error) => void;
}

/**
 * Message router for agent-to-agent communication
 */
export class AgentRouter extends EventEmitter {
  private registry: Map<string, AgentRegistration> = new Map();
  private messageHistory: AgentMessage[] = [];
  private readonly maxHistorySize: number;

  /**
   * Create a new agent router
   *
   * @param maxHistorySize Maximum number of messages to keep in history (default: 100)
   */
  constructor(maxHistorySize = 100) {
    super();
    this.maxHistorySize = maxHistorySize;
  }

  /**
   * Register an agent with the router
   *
   * @param agent Agent registration information
   * @throws Error if registration data is invalid or agent already registered
   */
  register(agent: AgentRegistration): void {
    if (!isValidRegistration(agent)) {
      throw new Error('Invalid agent registration data');
    }

    if (this.registry.has(agent.name)) {
      throw new Error(`Agent '${agent.name}' is already registered`);
    }

    this.registry.set(agent.name, { ...agent });
    this.emit('registered', agent);
  }

  /**
   * Unregister an agent from the router
   *
   * @param name Agent name to unregister
   * @returns true if agent was unregistered, false if not found
   */
  unregister(name: string): boolean {
    const existed = this.registry.delete(name);
    if (existed) {
      this.emit('unregistered', name);
    }
    return existed;
  }

  /**
   * Send a message to a specific agent
   *
   * @param message Message to route
   * @throws Error if message is invalid or recipient not found
   */
  send(message: AgentMessage): void {
    if (!isValidMessage(message)) {
      const error = new Error('Invalid message format');
      this.emit('error', error);
      throw error;
    }

    // Add to history
    this.addToHistory(message);

    // Handle broadcast
    if (message.to === '*') {
      this.broadcast(message);
      return;
    }

    // Handle discovery requests
    if (message.type === 'discovery') {
      this.handleDiscovery(message);
      return;
    }

    // Verify recipient exists
    if (!this.registry.has(message.to)) {
      const error = new Error(`Recipient agent '${message.to}' not found`);
      this.emit('error', error);
      throw error;
    }

    // Emit message event for the specific agent
    this.emit(`message:${message.to}`, message);
    this.emit('message', message);
  }

  /**
   * Broadcast a message to all registered agents
   *
   * @param message Message to broadcast (to field can be '*' or will be set to '*')
   */
  broadcast(message: AgentMessage): void {
    const broadcastMessage: AgentMessage = {
      ...message,
      to: '*',
    };

    this.addToHistory(broadcastMessage);

    // Send to all registered agents except the sender
    for (const agentName of this.registry.keys()) {
      if (agentName !== message.from) {
        this.emit(`message:${agentName}`, broadcastMessage);
      }
    }

    this.emit('message', broadcastMessage);
  }

  /**
   * Discover agents by capability
   *
   * @param capability Capability name to search for
   * @returns List of agents that provide the capability
   */
  discover(capability: string): AgentRegistration[] {
    const matches: AgentRegistration[] = [];

    for (const agent of this.registry.values()) {
      if (agent.capabilities.some((cap) => cap.name === capability)) {
        matches.push({ ...agent });
      }
    }

    return matches;
  }

  /**
   * Get the full agent registry
   *
   * @returns Map of agent name to registration data
   */
  getRegistry(): Map<string, AgentRegistration> {
    // Return a copy to prevent external modification
    return new Map(this.registry);
  }

  /**
   * Get message history
   *
   * @param limit Maximum number of messages to return (default: all)
   * @returns Array of messages, newest first
   */
  getHistory(limit?: number): AgentMessage[] {
    const history = [...this.messageHistory].reverse();
    return limit ? history.slice(0, limit) : history;
  }

  /**
   * Clear message history
   */
  clearHistory(): void {
    this.messageHistory = [];
  }

  /**
   * Subscribe to messages for a specific agent
   *
   * @param agentName Agent name to listen for messages to
   * @param handler Message handler function
   */
  onMessage(agentName: string, handler: (message: AgentMessage) => void): void {
    this.on(`message:${agentName}`, handler);
  }

  /**
   * Unsubscribe from messages for a specific agent
   *
   * @param agentName Agent name to stop listening for
   * @param handler Message handler function to remove
   */
  offMessage(agentName: string, handler: (message: AgentMessage) => void): void {
    this.off(`message:${agentName}`, handler);
  }

  /**
   * Update agent status
   *
   * @param name Agent name
   * @param status New status
   * @throws Error if agent not found
   */
  updateStatus(name: string, status: 'idle' | 'busy' | 'offline'): void {
    const agent = this.registry.get(name);
    if (!agent) {
      throw new Error(`Agent '${name}' not found`);
    }

    agent.status = status;
    agent.lastSeen = new Date().toISOString();
    this.registry.set(name, agent);
  }

  /**
   * Handle discovery requests
   */
  private handleDiscovery(message: AgentMessage): void {
    const request = message.payload as unknown as DiscoveryRequest;
    const agents = this.discover(request.capability);

    const response: DiscoveryResponse = {
      agents,
    };

    const responseMessage = createMessage(
      'router',
      message.from,
      'response',
      response as unknown as Record<string, unknown>,
      message.id
    );

    this.send(responseMessage);
  }

  /**
   * Add a message to history, enforcing size limit
   */
  private addToHistory(message: AgentMessage): void {
    this.messageHistory.push({ ...message });

    // Trim history if needed (remove oldest messages)
    if (this.messageHistory.length > this.maxHistorySize) {
      this.messageHistory.splice(0, this.messageHistory.length - this.maxHistorySize);
    }
  }
}
