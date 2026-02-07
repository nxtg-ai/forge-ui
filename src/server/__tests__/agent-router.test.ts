/**
 * Agent Router Tests
 *
 * Comprehensive test suite for the AgentRouter class that handles
 * agent registration, message routing, discovery, and history management.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AgentRouter } from '../agent-router.js';
import {
  AgentMessage,
  AgentRegistration,
  AgentCapability,
  createMessage,
  isValidMessage,
  isValidRegistration,
} from '../agent-protocol.js';

describe('AgentRouter', () => {
  let router: AgentRouter;

  beforeEach(() => {
    router = new AgentRouter();
  });

  afterEach(() => {
    router.removeAllListeners();
  });

  describe('constructor', () => {
    it('creates router with default history size', () => {
      const defaultRouter = new AgentRouter();
      expect(defaultRouter).toBeInstanceOf(AgentRouter);
    });

    it('creates router with custom history size', () => {
      const customRouter = new AgentRouter(50);
      expect(customRouter).toBeInstanceOf(AgentRouter);
    });
  });

  describe('register', () => {
    it('registers a valid agent', () => {
      const agent: AgentRegistration = {
        name: 'test-agent',
        capabilities: [
          { name: 'testing', description: 'Run tests' },
        ],
        status: 'idle',
        lastSeen: new Date().toISOString(),
      };

      const registeredSpy = vi.fn();
      router.on('registered', registeredSpy);

      router.register(agent);

      const registry = router.getRegistry();
      expect(registry.has('test-agent')).toBe(true);
      expect(registry.get('test-agent')).toEqual(agent);
      expect(registeredSpy).toHaveBeenCalledWith(agent);
    });

    it('throws error for invalid registration data', () => {
      const invalidAgent = {
        name: '',
        capabilities: [],
        status: 'invalid',
        lastSeen: '',
      } as unknown as AgentRegistration;

      expect(() => router.register(invalidAgent)).toThrow('Invalid agent registration data');
    });

    it('throws error when registering duplicate agent', () => {
      const agent: AgentRegistration = {
        name: 'duplicate-agent',
        capabilities: [{ name: 'test', description: 'Test capability' }],
        status: 'idle',
        lastSeen: new Date().toISOString(),
      };

      router.register(agent);
      expect(() => router.register(agent)).toThrow("Agent 'duplicate-agent' is already registered");
    });

    it('creates a copy of the agent data', () => {
      const agent: AgentRegistration = {
        name: 'test-agent',
        capabilities: [{ name: 'test', description: 'Test' }],
        status: 'idle',
        lastSeen: new Date().toISOString(),
      };

      router.register(agent);

      // Modify original
      agent.status = 'busy';

      // Registered copy should be unchanged
      const registered = router.getRegistry().get('test-agent');
      expect(registered?.status).toBe('idle');
    });
  });

  describe('unregister', () => {
    it('unregisters an existing agent', () => {
      const agent: AgentRegistration = {
        name: 'test-agent',
        capabilities: [],
        status: 'idle',
        lastSeen: new Date().toISOString(),
      };

      router.register(agent);

      const unregisteredSpy = vi.fn();
      router.on('unregistered', unregisteredSpy);

      const result = router.unregister('test-agent');

      expect(result).toBe(true);
      expect(router.getRegistry().has('test-agent')).toBe(false);
      expect(unregisteredSpy).toHaveBeenCalledWith('test-agent');
    });

    it('returns false when unregistering non-existent agent', () => {
      const unregisteredSpy = vi.fn();
      router.on('unregistered', unregisteredSpy);

      const result = router.unregister('non-existent');

      expect(result).toBe(false);
      expect(unregisteredSpy).not.toHaveBeenCalled();
    });
  });

  describe('send', () => {
    beforeEach(() => {
      const agent: AgentRegistration = {
        name: 'receiver',
        capabilities: [],
        status: 'idle',
        lastSeen: new Date().toISOString(),
      };
      router.register(agent);
    });

    it('sends a message to a registered agent', () => {
      const message = createMessage('sender', 'receiver', 'request', { task: 'test' });

      const messageSpy = vi.fn();
      const specificMessageSpy = vi.fn();

      router.on('message', messageSpy);
      router.onMessage('receiver', specificMessageSpy);

      router.send(message);

      expect(messageSpy).toHaveBeenCalledWith(message);
      expect(specificMessageSpy).toHaveBeenCalledWith(message);
    });

    it('throws error for invalid message', () => {
      const invalidMessage = {
        id: 'test',
        from: 'sender',
        to: 'receiver',
        type: 'invalid-type',
        payload: {},
        timestamp: new Date().toISOString(),
      } as unknown as AgentMessage;

      const errorSpy = vi.fn();
      router.on('error', errorSpy);

      expect(() => router.send(invalidMessage)).toThrow('Invalid message format');
      expect(errorSpy).toHaveBeenCalled();
    });

    it('throws error when recipient not found', () => {
      const message = createMessage('sender', 'non-existent', 'request', { task: 'test' });

      const errorSpy = vi.fn();
      router.on('error', errorSpy);

      expect(() => router.send(message)).toThrow("Recipient agent 'non-existent' not found");
      expect(errorSpy).toHaveBeenCalled();
    });

    it('adds message to history', () => {
      const message = createMessage('sender', 'receiver', 'request', { task: 'test' });

      router.send(message);

      const history = router.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0]).toEqual(message);
    });

    it('handles broadcast messages', () => {
      const agent2: AgentRegistration = {
        name: 'receiver2',
        capabilities: [],
        status: 'idle',
        lastSeen: new Date().toISOString(),
      };
      router.register(agent2);

      const message = createMessage('sender', '*', 'event', { event: 'test' });

      const receiver1Spy = vi.fn();
      const receiver2Spy = vi.fn();

      router.onMessage('receiver', receiver1Spy);
      router.onMessage('receiver2', receiver2Spy);

      router.send(message);

      expect(receiver1Spy).toHaveBeenCalled();
      expect(receiver2Spy).toHaveBeenCalled();
    });

    it('handles discovery messages', () => {
      const capAgent: AgentRegistration = {
        name: 'capable-agent',
        capabilities: [{ name: 'test-capability', description: 'Test' }],
        status: 'idle',
        lastSeen: new Date().toISOString(),
      };
      router.register(capAgent);

      const sender: AgentRegistration = {
        name: 'sender',
        capabilities: [],
        status: 'idle',
        lastSeen: new Date().toISOString(),
      };
      router.register(sender);

      const message = createMessage('sender', 'router', 'discovery', {
        capability: 'test-capability',
      });

      const senderMessageSpy = vi.fn();
      router.onMessage('sender', senderMessageSpy);

      router.send(message);

      expect(senderMessageSpy).toHaveBeenCalled();
      const responseMessage = senderMessageSpy.mock.calls[0][0] as AgentMessage;
      expect(responseMessage.type).toBe('response');
      expect(responseMessage.from).toBe('router');
      expect(responseMessage.to).toBe('sender');
      expect(responseMessage.replyTo).toBe(message.id);

      const response = responseMessage.payload as { agents: AgentRegistration[] };
      expect(response.agents).toHaveLength(1);
      expect(response.agents[0].name).toBe('capable-agent');
    });
  });

  describe('broadcast', () => {
    beforeEach(() => {
      const agents: AgentRegistration[] = [
        {
          name: 'agent1',
          capabilities: [],
          status: 'idle',
          lastSeen: new Date().toISOString(),
        },
        {
          name: 'agent2',
          capabilities: [],
          status: 'idle',
          lastSeen: new Date().toISOString(),
        },
        {
          name: 'sender',
          capabilities: [],
          status: 'idle',
          lastSeen: new Date().toISOString(),
        },
      ];

      agents.forEach((agent) => router.register(agent));
    });

    it('broadcasts message to all agents except sender', () => {
      const message = createMessage('sender', 'anyone', 'event', { event: 'test' });

      const agent1Spy = vi.fn();
      const agent2Spy = vi.fn();
      const senderSpy = vi.fn();

      router.onMessage('agent1', agent1Spy);
      router.onMessage('agent2', agent2Spy);
      router.onMessage('sender', senderSpy);

      router.broadcast(message);

      expect(agent1Spy).toHaveBeenCalled();
      expect(agent2Spy).toHaveBeenCalled();
      expect(senderSpy).not.toHaveBeenCalled();
    });

    it('sets to field to * in broadcast message', () => {
      const message = createMessage('sender', 'specific-agent', 'event', { event: 'test' });

      const messageSpy = vi.fn();
      router.on('message', messageSpy);

      router.broadcast(message);

      const broadcastMessage = messageSpy.mock.calls[0][0] as AgentMessage;
      expect(broadcastMessage.to).toBe('*');
    });

    it('adds broadcast message to history', () => {
      const message = createMessage('sender', 'anyone', 'event', { event: 'test' });

      router.broadcast(message);

      const history = router.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0].to).toBe('*');
    });
  });

  describe('discover', () => {
    beforeEach(() => {
      const agents: AgentRegistration[] = [
        {
          name: 'tester',
          capabilities: [
            { name: 'testing', description: 'Run tests' },
            { name: 'validation', description: 'Validate code' },
          ],
          status: 'idle',
          lastSeen: new Date().toISOString(),
        },
        {
          name: 'builder',
          capabilities: [{ name: 'building', description: 'Build projects' }],
          status: 'idle',
          lastSeen: new Date().toISOString(),
        },
        {
          name: 'another-tester',
          capabilities: [{ name: 'testing', description: 'Run more tests' }],
          status: 'idle',
          lastSeen: new Date().toISOString(),
        },
      ];

      agents.forEach((agent) => router.register(agent));
    });

    it('discovers agents by capability', () => {
      const matches = router.discover('testing');

      expect(matches).toHaveLength(2);
      expect(matches.map((a) => a.name).sort()).toEqual(['another-tester', 'tester']);
    });

    it('returns empty array when no agents match', () => {
      const matches = router.discover('non-existent-capability');

      expect(matches).toHaveLength(0);
    });

    it('returns copies of agent data', () => {
      const matches = router.discover('testing');

      // Modify the returned data
      matches[0].status = 'busy';

      // Original should be unchanged
      const registry = router.getRegistry();
      const original = registry.get(matches[0].name);
      expect(original?.status).toBe('idle');
    });
  });

  describe('getRegistry', () => {
    it('returns a copy of the registry', () => {
      const agent: AgentRegistration = {
        name: 'test-agent',
        capabilities: [],
        status: 'idle',
        lastSeen: new Date().toISOString(),
      };

      router.register(agent);

      const registry1 = router.getRegistry();
      const registry2 = router.getRegistry();

      expect(registry1).not.toBe(registry2);
      expect(registry1).toEqual(registry2);
    });

    it('prevents external modification', () => {
      const agent: AgentRegistration = {
        name: 'test-agent',
        capabilities: [],
        status: 'idle',
        lastSeen: new Date().toISOString(),
      };

      router.register(agent);

      const registry = router.getRegistry();
      registry.delete('test-agent');

      // Original registry should be unchanged
      expect(router.getRegistry().has('test-agent')).toBe(true);
    });
  });

  describe('getHistory', () => {
    beforeEach(() => {
      const agent: AgentRegistration = {
        name: 'receiver',
        capabilities: [],
        status: 'idle',
        lastSeen: new Date().toISOString(),
      };
      router.register(agent);
    });

    it('returns messages in reverse chronological order', () => {
      const message1 = createMessage('sender', 'receiver', 'request', { id: 1 });
      const message2 = createMessage('sender', 'receiver', 'request', { id: 2 });
      const message3 = createMessage('sender', 'receiver', 'request', { id: 3 });

      router.send(message1);
      router.send(message2);
      router.send(message3);

      const history = router.getHistory();

      expect(history).toHaveLength(3);
      expect((history[0].payload as { id: number }).id).toBe(3);
      expect((history[1].payload as { id: number }).id).toBe(2);
      expect((history[2].payload as { id: number }).id).toBe(1);
    });

    it('limits history when limit parameter provided', () => {
      for (let i = 0; i < 5; i++) {
        router.send(createMessage('sender', 'receiver', 'request', { id: i }));
      }

      const history = router.getHistory(3);

      expect(history).toHaveLength(3);
      expect((history[0].payload as { id: number }).id).toBe(4);
      expect((history[2].payload as { id: number }).id).toBe(2);
    });

    it('enforces maximum history size', () => {
      const smallRouter = new AgentRouter(3);
      const agent: AgentRegistration = {
        name: 'receiver',
        capabilities: [],
        status: 'idle',
        lastSeen: new Date().toISOString(),
      };
      smallRouter.register(agent);

      for (let i = 0; i < 5; i++) {
        smallRouter.send(createMessage('sender', 'receiver', 'request', { id: i }));
      }

      const history = smallRouter.getHistory();

      expect(history).toHaveLength(3);
      expect((history[0].payload as { id: number }).id).toBe(4);
      expect((history[2].payload as { id: number }).id).toBe(2);
    });
  });

  describe('clearHistory', () => {
    it('clears message history', () => {
      const agent: AgentRegistration = {
        name: 'receiver',
        capabilities: [],
        status: 'idle',
        lastSeen: new Date().toISOString(),
      };
      router.register(agent);

      router.send(createMessage('sender', 'receiver', 'request', { test: true }));
      router.send(createMessage('sender', 'receiver', 'request', { test: true }));

      expect(router.getHistory()).toHaveLength(2);

      router.clearHistory();

      expect(router.getHistory()).toHaveLength(0);
    });
  });

  describe('onMessage and offMessage', () => {
    it('subscribes to messages for specific agent', () => {
      const agent: AgentRegistration = {
        name: 'receiver',
        capabilities: [],
        status: 'idle',
        lastSeen: new Date().toISOString(),
      };
      router.register(agent);

      const handler = vi.fn();
      router.onMessage('receiver', handler);

      const message = createMessage('sender', 'receiver', 'request', { test: true });
      router.send(message);

      expect(handler).toHaveBeenCalledWith(message);
    });

    it('unsubscribes from messages', () => {
      const agent: AgentRegistration = {
        name: 'receiver',
        capabilities: [],
        status: 'idle',
        lastSeen: new Date().toISOString(),
      };
      router.register(agent);

      const handler = vi.fn();
      router.onMessage('receiver', handler);
      router.offMessage('receiver', handler);

      router.send(createMessage('sender', 'receiver', 'request', { test: true }));

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('updateStatus', () => {
    it('updates agent status', () => {
      const agent: AgentRegistration = {
        name: 'test-agent',
        capabilities: [],
        status: 'idle',
        lastSeen: new Date('2024-01-01').toISOString(),
      };

      router.register(agent);

      router.updateStatus('test-agent', 'busy');

      const updated = router.getRegistry().get('test-agent');
      expect(updated?.status).toBe('busy');
      expect(updated?.lastSeen).not.toBe(agent.lastSeen);
    });

    it('throws error when agent not found', () => {
      expect(() => router.updateStatus('non-existent', 'busy')).toThrow(
        "Agent 'non-existent' not found"
      );
    });

    it('updates lastSeen timestamp', () => {
      const agent: AgentRegistration = {
        name: 'test-agent',
        capabilities: [],
        status: 'idle',
        lastSeen: new Date('2024-01-01').toISOString(),
      };

      router.register(agent);

      const beforeUpdate = new Date(agent.lastSeen);
      router.updateStatus('test-agent', 'busy');

      const updated = router.getRegistry().get('test-agent');
      const afterUpdate = new Date(updated!.lastSeen);

      expect(afterUpdate.getTime()).toBeGreaterThan(beforeUpdate.getTime());
    });
  });

  describe('event emitter behavior', () => {
    it('emits registered event', () => {
      const agent: AgentRegistration = {
        name: 'test-agent',
        capabilities: [],
        status: 'idle',
        lastSeen: new Date().toISOString(),
      };

      const spy = vi.fn();
      router.on('registered', spy);

      router.register(agent);

      expect(spy).toHaveBeenCalledWith(agent);
    });

    it('emits unregistered event', () => {
      const agent: AgentRegistration = {
        name: 'test-agent',
        capabilities: [],
        status: 'idle',
        lastSeen: new Date().toISOString(),
      };

      router.register(agent);

      const spy = vi.fn();
      router.on('unregistered', spy);

      router.unregister('test-agent');

      expect(spy).toHaveBeenCalledWith('test-agent');
    });

    it('emits error event on invalid message', () => {
      const spy = vi.fn();
      router.on('error', spy);

      const invalidMessage = {
        id: 'test',
        from: 'sender',
        to: 'receiver',
        type: 'invalid',
        payload: {},
        timestamp: new Date().toISOString(),
      } as unknown as AgentMessage;

      try {
        router.send(invalidMessage);
      } catch (e) {
        // Expected to throw
      }

      expect(spy).toHaveBeenCalled();
      const error = spy.mock.calls[0][0];
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Invalid message format');
    });

    it('emits error event when recipient not found', () => {
      const spy = vi.fn();
      router.on('error', spy);

      const message = createMessage('sender', 'non-existent', 'request', { test: true });

      try {
        router.send(message);
      } catch (e) {
        // Expected to throw
      }

      expect(spy).toHaveBeenCalled();
      const error = spy.mock.calls[0][0];
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain('not found');
    });
  });

  describe('edge cases', () => {
    it('handles empty registry gracefully', () => {
      expect(router.getRegistry().size).toBe(0);
      expect(router.discover('any-capability')).toEqual([]);
    });

    it('handles multiple capabilities per agent', () => {
      const agent: AgentRegistration = {
        name: 'multi-capable',
        capabilities: [
          { name: 'cap1', description: 'First capability' },
          { name: 'cap2', description: 'Second capability' },
          { name: 'cap3', description: 'Third capability' },
        ],
        status: 'idle',
        lastSeen: new Date().toISOString(),
      };

      router.register(agent);

      expect(router.discover('cap1')).toHaveLength(1);
      expect(router.discover('cap2')).toHaveLength(1);
      expect(router.discover('cap3')).toHaveLength(1);
    });

    it('handles message with replyTo field', () => {
      const agent: AgentRegistration = {
        name: 'receiver',
        capabilities: [],
        status: 'idle',
        lastSeen: new Date().toISOString(),
      };
      router.register(agent);

      const originalId = 'original-message-id';
      const message = createMessage('sender', 'receiver', 'response', { result: 'ok' }, originalId);

      router.send(message);

      const history = router.getHistory();
      expect(history[0].replyTo).toBe(originalId);
    });

    it('handles broadcast with no registered agents', () => {
      const message = createMessage('sender', '*', 'event', { event: 'test' });

      expect(() => router.broadcast(message)).not.toThrow();

      const history = router.getHistory();
      expect(history).toHaveLength(1);
    });

    it('creates shallow copies of messages in history', () => {
      const agent: AgentRegistration = {
        name: 'receiver',
        capabilities: [],
        status: 'idle',
        lastSeen: new Date().toISOString(),
      };
      router.register(agent);

      const message = createMessage('sender', 'receiver', 'request', { data: 'original' });
      router.send(message);

      // Modify top-level message property
      message.to = 'different-receiver';

      // History should have original top-level values (shallow copy)
      const history = router.getHistory();
      expect(history[0].to).toBe('receiver');

      // Note: payload is NOT deep cloned, so nested objects are shared references
      // This is the actual implementation behavior
      expect(history[0].payload).toBe(message.payload);
    });
  });

  describe('integration scenarios', () => {
    it('supports full request-response cycle', () => {
      const requester: AgentRegistration = {
        name: 'requester',
        capabilities: [],
        status: 'idle',
        lastSeen: new Date().toISOString(),
      };

      const responder: AgentRegistration = {
        name: 'responder',
        capabilities: [{ name: 'process-data', description: 'Process data' }],
        status: 'idle',
        lastSeen: new Date().toISOString(),
      };

      router.register(requester);
      router.register(responder);

      // Request
      const request = createMessage('requester', 'responder', 'request', { task: 'process' });

      const responderHandler = vi.fn();
      router.onMessage('responder', responderHandler);

      router.send(request);

      expect(responderHandler).toHaveBeenCalled();

      // Response
      const response = createMessage(
        'responder',
        'requester',
        'response',
        { result: 'processed' },
        request.id
      );

      const requesterHandler = vi.fn();
      router.onMessage('requester', requesterHandler);

      router.send(response);

      expect(requesterHandler).toHaveBeenCalled();
      expect(requesterHandler.mock.calls[0][0].replyTo).toBe(request.id);
    });

    it('supports agent handoff workflow', () => {
      const agents: AgentRegistration[] = [
        {
          name: 'agent-a',
          capabilities: [{ name: 'task-a', description: 'Do A' }],
          status: 'idle',
          lastSeen: new Date().toISOString(),
        },
        {
          name: 'agent-b',
          capabilities: [{ name: 'task-b', description: 'Do B' }],
          status: 'idle',
          lastSeen: new Date().toISOString(),
        },
      ];

      agents.forEach((agent) => router.register(agent));

      const handoff = createMessage('agent-a', 'agent-b', 'handoff', {
        task: 'continue-processing',
        context: { previousStep: 'completed' },
        reason: 'Specialized capability needed',
      });

      const handlerB = vi.fn();
      router.onMessage('agent-b', handlerB);

      router.send(handoff);

      expect(handlerB).toHaveBeenCalledWith(handoff);
    });

    it('supports status update broadcasts', () => {
      const agents: AgentRegistration[] = [
        {
          name: 'monitor',
          capabilities: [],
          status: 'idle',
          lastSeen: new Date().toISOString(),
        },
        {
          name: 'worker',
          capabilities: [],
          status: 'idle',
          lastSeen: new Date().toISOString(),
        },
      ];

      agents.forEach((agent) => router.register(agent));

      const monitorHandler = vi.fn();
      router.onMessage('monitor', monitorHandler);

      const statusUpdate = createMessage('worker', '*', 'status', {
        status: 'busy',
        message: 'Processing task',
      });

      router.broadcast(statusUpdate);

      expect(monitorHandler).toHaveBeenCalled();
    });
  });
});
