/**
 * Agent Protocol Tests
 *
 * Tests for agent communication protocol and message routing.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  AgentMessage,
  AgentRegistration,
  AgentCapability,
  createMessage,
  isValidMessage,
  isValidRegistration,
  DiscoveryRequest,
  DiscoveryResponse,
} from '../../server/agent-protocol.js';
import { AgentRouter } from '../../server/agent-router.js';

describe('AgentProtocol', () => {
  describe('createMessage', () => {
    it('should create a valid message with all required fields', () => {
      const message = createMessage(
        'agent-a',
        'agent-b',
        'request',
        { task: 'test' }
      );

      expect(message.id).toBeDefined();
      expect(message.from).toBe('agent-a');
      expect(message.to).toBe('agent-b');
      expect(message.type).toBe('request');
      expect(message.payload).toEqual({ task: 'test' });
      expect(message.timestamp).toBeDefined();
      expect(message.replyTo).toBeUndefined();
    });

    it('should create a message with replyTo field', () => {
      const message = createMessage(
        'agent-a',
        'agent-b',
        'response',
        { result: 'success' },
        'msg_123'
      );

      expect(message.replyTo).toBe('msg_123');
    });

    it('should generate unique message IDs', () => {
      const msg1 = createMessage('agent-a', 'agent-b', 'request', {});
      const msg2 = createMessage('agent-a', 'agent-b', 'request', {});

      expect(msg1.id).not.toBe(msg2.id);
    });

    it('should create valid ISO 8601 timestamps', () => {
      const message = createMessage('agent-a', 'agent-b', 'request', {});
      const timestamp = new Date(message.timestamp);

      expect(timestamp.toISOString()).toBe(message.timestamp);
    });
  });

  describe('isValidMessage', () => {
    it('should validate a correct message', () => {
      const message = createMessage('agent-a', 'agent-b', 'request', {});
      expect(isValidMessage(message)).toBe(true);
    });

    it('should reject message with missing fields', () => {
      const invalid = {
        id: 'msg_123',
        from: 'agent-a',
        // missing 'to' field
        type: 'request',
        payload: {},
        timestamp: new Date().toISOString(),
      };

      expect(isValidMessage(invalid)).toBe(false);
    });

    it('should reject message with invalid type', () => {
      const invalid = {
        id: 'msg_123',
        from: 'agent-a',
        to: 'agent-b',
        type: 'invalid-type',
        payload: {},
        timestamp: new Date().toISOString(),
      };

      expect(isValidMessage(invalid)).toBe(false);
    });

    it('should reject non-object messages', () => {
      expect(isValidMessage(null)).toBe(false);
      expect(isValidMessage(undefined)).toBe(false);
      expect(isValidMessage('string')).toBe(false);
      expect(isValidMessage(123)).toBe(false);
    });

    it('should accept message with optional replyTo', () => {
      const message = createMessage(
        'agent-a',
        'agent-b',
        'response',
        {},
        'msg_123'
      );

      expect(isValidMessage(message)).toBe(true);
    });
  });

  describe('isValidRegistration', () => {
    it('should validate correct registration', () => {
      const registration: AgentRegistration = {
        name: 'agent-a',
        capabilities: [
          { name: 'test', description: 'Testing capability' },
        ],
        status: 'idle',
        lastSeen: new Date().toISOString(),
      };

      expect(isValidRegistration(registration)).toBe(true);
    });

    it('should reject registration with empty name', () => {
      const invalid = {
        name: '',
        capabilities: [],
        status: 'idle',
        lastSeen: new Date().toISOString(),
      };

      expect(isValidRegistration(invalid)).toBe(false);
    });

    it('should reject registration with invalid status', () => {
      const invalid = {
        name: 'agent-a',
        capabilities: [],
        status: 'invalid-status',
        lastSeen: new Date().toISOString(),
      };

      expect(isValidRegistration(invalid)).toBe(false);
    });

    it('should reject registration with invalid capabilities', () => {
      const invalid = {
        name: 'agent-a',
        capabilities: [{ name: 'test' }], // missing description
        status: 'idle',
        lastSeen: new Date().toISOString(),
      };

      expect(isValidRegistration(invalid)).toBe(false);
    });
  });
});

describe('AgentRouter', () => {
  let router: AgentRouter;

  beforeEach(() => {
    router = new AgentRouter();
  });

  describe('registration', () => {
    it('should register an agent successfully', () => {
      const agent: AgentRegistration = {
        name: 'builder',
        capabilities: [
          { name: 'code-generation', description: 'Generate code' },
        ],
        status: 'idle',
        lastSeen: new Date().toISOString(),
      };

      router.register(agent);

      const registry = router.getRegistry();
      expect(registry.has('builder')).toBe(true);
      expect(registry.get('builder')).toEqual(agent);
    });

    it('should emit registered event', () => {
      const agent: AgentRegistration = {
        name: 'builder',
        capabilities: [],
        status: 'idle',
        lastSeen: new Date().toISOString(),
      };

      const handler = vi.fn();
      router.on('registered', handler);

      router.register(agent);

      expect(handler).toHaveBeenCalledWith(agent);
    });

    it('should reject duplicate registration', () => {
      const agent: AgentRegistration = {
        name: 'builder',
        capabilities: [],
        status: 'idle',
        lastSeen: new Date().toISOString(),
      };

      router.register(agent);

      expect(() => router.register(agent)).toThrow(
        "Agent 'builder' is already registered"
      );
    });

    it('should reject invalid registration data', () => {
      const invalid = {
        name: '',
        capabilities: [],
        status: 'idle',
        lastSeen: new Date().toISOString(),
      };

      expect(() => router.register(invalid as AgentRegistration)).toThrow(
        'Invalid agent registration data'
      );
    });
  });

  describe('unregistration', () => {
    it('should unregister an agent successfully', () => {
      const agent: AgentRegistration = {
        name: 'builder',
        capabilities: [],
        status: 'idle',
        lastSeen: new Date().toISOString(),
      };

      router.register(agent);
      const result = router.unregister('builder');

      expect(result).toBe(true);
      expect(router.getRegistry().has('builder')).toBe(false);
    });

    it('should emit unregistered event', () => {
      const agent: AgentRegistration = {
        name: 'builder',
        capabilities: [],
        status: 'idle',
        lastSeen: new Date().toISOString(),
      };

      const handler = vi.fn();
      router.on('unregistered', handler);

      router.register(agent);
      router.unregister('builder');

      expect(handler).toHaveBeenCalledWith('builder');
    });

    it('should return false when unregistering non-existent agent', () => {
      const result = router.unregister('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('message routing', () => {
    beforeEach(() => {
      router.register({
        name: 'builder',
        capabilities: [{ name: 'code-generation', description: 'Generate code' }],
        status: 'idle',
        lastSeen: new Date().toISOString(),
      });

      router.register({
        name: 'tester',
        capabilities: [{ name: 'testing', description: 'Run tests' }],
        status: 'idle',
        lastSeen: new Date().toISOString(),
      });
    });

    it('should route point-to-point message successfully', () => {
      const message = createMessage('builder', 'tester', 'request', {
        task: 'run tests',
      });

      const handler = vi.fn();
      router.onMessage('tester', handler);

      router.send(message);

      expect(handler).toHaveBeenCalledWith(message);
    });

    it('should throw error when sending to non-existent agent', () => {
      const message = createMessage('builder', 'non-existent', 'request', {});

      expect(() => router.send(message)).toThrow(
        "Recipient agent 'non-existent' not found"
      );
    });

    it('should throw error on invalid message', () => {
      const invalid = {
        id: 'msg_123',
        from: 'builder',
        // missing required fields
      };

      expect(() => router.send(invalid as AgentMessage)).toThrow(
        'Invalid message format'
      );
    });

    it('should add message to history', () => {
      const message = createMessage('builder', 'tester', 'request', {});

      router.send(message);

      const history = router.getHistory();
      expect(history[0]).toEqual(message);
    });
  });

  describe('broadcast', () => {
    beforeEach(() => {
      router.register({
        name: 'builder',
        capabilities: [],
        status: 'idle',
        lastSeen: new Date().toISOString(),
      });

      router.register({
        name: 'tester',
        capabilities: [],
        status: 'idle',
        lastSeen: new Date().toISOString(),
      });

      router.register({
        name: 'planner',
        capabilities: [],
        status: 'idle',
        lastSeen: new Date().toISOString(),
      });
    });

    it('should broadcast message to all agents except sender', () => {
      const message = createMessage('builder', '*', 'event', {
        event: 'build-complete',
      });

      const testerHandler = vi.fn();
      const plannerHandler = vi.fn();
      const builderHandler = vi.fn();

      router.onMessage('tester', testerHandler);
      router.onMessage('planner', plannerHandler);
      router.onMessage('builder', builderHandler);

      router.broadcast(message);

      expect(testerHandler).toHaveBeenCalledWith(
        expect.objectContaining({ to: '*' })
      );
      expect(plannerHandler).toHaveBeenCalledWith(
        expect.objectContaining({ to: '*' })
      );
      expect(builderHandler).not.toHaveBeenCalled();
    });

    it('should handle broadcast via send with to="*"', () => {
      const message = createMessage('builder', '*', 'event', {});

      const testerHandler = vi.fn();
      router.onMessage('tester', testerHandler);

      router.send(message);

      expect(testerHandler).toHaveBeenCalled();
    });
  });

  describe('discovery', () => {
    beforeEach(() => {
      router.register({
        name: 'builder',
        capabilities: [
          { name: 'code-generation', description: 'Generate code' },
          { name: 'refactoring', description: 'Refactor code' },
        ],
        status: 'idle',
        lastSeen: new Date().toISOString(),
      });

      router.register({
        name: 'tester',
        capabilities: [
          { name: 'testing', description: 'Run tests' },
        ],
        status: 'idle',
        lastSeen: new Date().toISOString(),
      });

      router.register({
        name: 'builder-2',
        capabilities: [
          { name: 'code-generation', description: 'Generate code' },
        ],
        status: 'busy',
        lastSeen: new Date().toISOString(),
      });
    });

    it('should find agents by capability', () => {
      const agents = router.discover('code-generation');

      expect(agents).toHaveLength(2);
      expect(agents.map((a) => a.name)).toContain('builder');
      expect(agents.map((a) => a.name)).toContain('builder-2');
    });

    it('should return empty array for non-existent capability', () => {
      const agents = router.discover('non-existent');
      expect(agents).toHaveLength(0);
    });

    it('should handle discovery via message', () => {
      const message = createMessage('tester', 'router', 'discovery', {
        capability: 'code-generation',
      } as DiscoveryRequest);

      const handler = vi.fn();
      router.onMessage('tester', handler);

      router.send(message);

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'response',
          replyTo: message.id,
        })
      );

      const response = handler.mock.calls[0][0];
      const payload = response.payload as DiscoveryResponse;
      expect(payload.agents).toHaveLength(2);
    });
  });

  describe('handoff', () => {
    beforeEach(() => {
      router.register({
        name: 'planner',
        capabilities: [{ name: 'planning', description: 'Plan features' }],
        status: 'idle',
        lastSeen: new Date().toISOString(),
      });

      router.register({
        name: 'builder',
        capabilities: [{ name: 'code-generation', description: 'Generate code' }],
        status: 'idle',
        lastSeen: new Date().toISOString(),
      });
    });

    it('should route handoff message between agents', () => {
      const message = createMessage('planner', 'builder', 'handoff', {
        task: 'implement feature X',
        context: { planId: 'plan_123' },
        reason: 'plan approved',
      });

      const handler = vi.fn();
      router.onMessage('builder', handler);

      router.send(message);

      expect(handler).toHaveBeenCalledWith(message);
      expect(message.type).toBe('handoff');
    });
  });

  describe('message history', () => {
    beforeEach(() => {
      router.register({
        name: 'agent-a',
        capabilities: [],
        status: 'idle',
        lastSeen: new Date().toISOString(),
      });

      router.register({
        name: 'agent-b',
        capabilities: [],
        status: 'idle',
        lastSeen: new Date().toISOString(),
      });
    });

    it('should maintain message history', () => {
      const msg1 = createMessage('agent-a', 'agent-b', 'request', { id: 1 });
      const msg2 = createMessage('agent-b', 'agent-a', 'response', { id: 2 });

      router.send(msg1);
      router.send(msg2);

      const history = router.getHistory();
      expect(history).toHaveLength(2);
      expect(history[0]).toEqual(msg2); // newest first
      expect(history[1]).toEqual(msg1);
    });

    it('should limit history size', () => {
      const smallRouter = new AgentRouter(5);
      smallRouter.register({
        name: 'agent-a',
        capabilities: [],
        status: 'idle',
        lastSeen: new Date().toISOString(),
      });

      smallRouter.register({
        name: 'agent-b',
        capabilities: [],
        status: 'idle',
        lastSeen: new Date().toISOString(),
      });

      // Send 10 messages
      for (let i = 0; i < 10; i++) {
        const msg = createMessage('agent-a', 'agent-b', 'request', { id: i });
        smallRouter.send(msg);
      }

      const history = smallRouter.getHistory();
      expect(history).toHaveLength(5);
      expect((history[0].payload as { id: number }).id).toBe(9); // newest
      expect((history[4].payload as { id: number }).id).toBe(5); // oldest kept
    });

    it('should limit history retrieval', () => {
      for (let i = 0; i < 10; i++) {
        const msg = createMessage('agent-a', 'agent-b', 'request', { id: i });
        router.send(msg);
      }

      const history = router.getHistory(3);
      expect(history).toHaveLength(3);
    });

    it('should clear history', () => {
      const msg = createMessage('agent-a', 'agent-b', 'request', {});
      router.send(msg);

      router.clearHistory();

      expect(router.getHistory()).toHaveLength(0);
    });
  });

  describe('status updates', () => {
    beforeEach(() => {
      router.register({
        name: 'builder',
        capabilities: [],
        status: 'idle',
        lastSeen: new Date().toISOString(),
      });
    });

    it('should update agent status', () => {
      router.updateStatus('builder', 'busy');

      const agent = router.getRegistry().get('builder');
      expect(agent?.status).toBe('busy');
    });

    it('should update lastSeen timestamp', () => {
      const beforeUpdate = new Date().toISOString();

      // Small delay to ensure timestamp changes
      const startTime = Date.now();
      while (Date.now() - startTime < 2) {
        // wait
      }

      router.updateStatus('builder', 'busy');

      const agent = router.getRegistry().get('builder');
      expect(agent?.lastSeen).not.toBe(beforeUpdate);
    });

    it('should throw error for non-existent agent', () => {
      expect(() => router.updateStatus('non-existent', 'busy')).toThrow(
        "Agent 'non-existent' not found"
      );
    });
  });

  describe('event subscriptions', () => {
    beforeEach(() => {
      router.register({
        name: 'agent-a',
        capabilities: [],
        status: 'idle',
        lastSeen: new Date().toISOString(),
      });

      router.register({
        name: 'agent-b',
        capabilities: [],
        status: 'idle',
        lastSeen: new Date().toISOString(),
      });
    });

    it('should subscribe and unsubscribe from messages', () => {
      const handler = vi.fn();

      router.onMessage('agent-a', handler);

      const msg1 = createMessage('agent-b', 'agent-a', 'request', {});
      router.send(msg1);

      expect(handler).toHaveBeenCalledTimes(1);

      router.offMessage('agent-a', handler);

      const msg2 = createMessage('agent-b', 'agent-a', 'request', {});
      router.send(msg2);

      expect(handler).toHaveBeenCalledTimes(1); // still 1, not called again
    });
  });
});
