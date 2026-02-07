/**
 * Agent Protocol Tests
 *
 * Comprehensive test suite for the agent communication protocol,
 * including message creation, validation, and type guards.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  AgentMessageType,
  AgentMessage,
  AgentCapability,
  AgentRegistration,
  DiscoveryRequest,
  DiscoveryResponse,
  StatusUpdate,
  HandoffRequest,
  createMessage,
  isValidMessage,
  isValidRegistration,
} from '../agent-protocol.js';

describe('agent-protocol', () => {
  describe('createMessage', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('creates a basic message with all required fields', () => {
      const message = createMessage('sender', 'receiver', 'request', { task: 'test' });

      expect(message).toHaveProperty('id');
      expect(message.from).toBe('sender');
      expect(message.to).toBe('receiver');
      expect(message.type).toBe('request');
      expect(message.payload).toEqual({ task: 'test' });
      expect(message.timestamp).toBe('2024-01-01T00:00:00.000Z');
      expect(message.replyTo).toBeUndefined();
    });

    it('creates a message with replyTo field', () => {
      const originalMessageId = 'msg_123';
      const message = createMessage(
        'responder',
        'requester',
        'response',
        { result: 'success' },
        originalMessageId
      );

      expect(message.replyTo).toBe(originalMessageId);
    });

    it('generates unique message IDs', () => {
      const message1 = createMessage('sender', 'receiver', 'request', {});
      const message2 = createMessage('sender', 'receiver', 'request', {});

      expect(message1.id).not.toBe(message2.id);
    });

    it('creates message ID with expected format', () => {
      const message = createMessage('sender', 'receiver', 'request', {});

      expect(message.id).toMatch(/^msg_\d+_[a-z0-9]+$/);
    });

    it('handles all message types', () => {
      const types: AgentMessageType[] = [
        'request',
        'response',
        'event',
        'handoff',
        'status',
        'discovery',
      ];

      types.forEach((type) => {
        const message = createMessage('sender', 'receiver', type, {});
        expect(message.type).toBe(type);
      });
    });

    it('creates broadcast message with wildcard recipient', () => {
      const message = createMessage('sender', '*', 'event', { event: 'update' });

      expect(message.to).toBe('*');
      expect(message.type).toBe('event');
    });

    it('handles empty payload', () => {
      const message = createMessage('sender', 'receiver', 'request', {});

      expect(message.payload).toEqual({});
    });

    it('handles complex nested payload', () => {
      const payload = {
        task: 'process',
        data: {
          items: [1, 2, 3],
          metadata: {
            timestamp: Date.now(),
            source: 'test',
          },
        },
        options: {
          retry: true,
          timeout: 5000,
        },
      };

      const message = createMessage('sender', 'receiver', 'request', payload);

      expect(message.payload).toEqual(payload);
    });

    it('sets timestamp to current ISO time', () => {
      const testDate = new Date('2024-06-15T12:30:45.123Z');
      vi.setSystemTime(testDate);

      const message = createMessage('sender', 'receiver', 'request', {});

      expect(message.timestamp).toBe(testDate.toISOString());
    });
  });

  describe('isValidMessage', () => {
    it('validates a valid message', () => {
      const validMessage: AgentMessage = {
        id: 'msg_123',
        from: 'sender',
        to: 'receiver',
        type: 'request',
        payload: { task: 'test' },
        timestamp: new Date().toISOString(),
      };

      expect(isValidMessage(validMessage)).toBe(true);
    });

    it('validates a message with replyTo field', () => {
      const validMessage: AgentMessage = {
        id: 'msg_456',
        from: 'responder',
        to: 'requester',
        type: 'response',
        payload: { result: 'ok' },
        timestamp: new Date().toISOString(),
        replyTo: 'msg_123',
      };

      expect(isValidMessage(validMessage)).toBe(true);
    });

    it('validates all message types', () => {
      const types: AgentMessageType[] = [
        'request',
        'response',
        'event',
        'handoff',
        'status',
        'discovery',
      ];

      types.forEach((type) => {
        const message: AgentMessage = {
          id: 'msg_test',
          from: 'sender',
          to: 'receiver',
          type,
          payload: {},
          timestamp: new Date().toISOString(),
        };

        expect(isValidMessage(message)).toBe(true);
      });
    });

    it('rejects null', () => {
      expect(isValidMessage(null)).toBe(false);
    });

    it('rejects undefined', () => {
      expect(isValidMessage(undefined)).toBe(false);
    });

    it('rejects non-object values', () => {
      expect(isValidMessage('string')).toBe(false);
      expect(isValidMessage(123)).toBe(false);
      expect(isValidMessage(true)).toBe(false);
      expect(isValidMessage([])).toBe(false);
    });

    it('rejects message with missing id', () => {
      const invalidMessage = {
        from: 'sender',
        to: 'receiver',
        type: 'request',
        payload: {},
        timestamp: new Date().toISOString(),
      };

      expect(isValidMessage(invalidMessage)).toBe(false);
    });

    it('rejects message with non-string id', () => {
      const invalidMessage = {
        id: 123,
        from: 'sender',
        to: 'receiver',
        type: 'request',
        payload: {},
        timestamp: new Date().toISOString(),
      };

      expect(isValidMessage(invalidMessage)).toBe(false);
    });

    it('rejects message with missing from', () => {
      const invalidMessage = {
        id: 'msg_123',
        to: 'receiver',
        type: 'request',
        payload: {},
        timestamp: new Date().toISOString(),
      };

      expect(isValidMessage(invalidMessage)).toBe(false);
    });

    it('rejects message with non-string from', () => {
      const invalidMessage = {
        id: 'msg_123',
        from: 123,
        to: 'receiver',
        type: 'request',
        payload: {},
        timestamp: new Date().toISOString(),
      };

      expect(isValidMessage(invalidMessage)).toBe(false);
    });

    it('rejects message with missing to', () => {
      const invalidMessage = {
        id: 'msg_123',
        from: 'sender',
        type: 'request',
        payload: {},
        timestamp: new Date().toISOString(),
      };

      expect(isValidMessage(invalidMessage)).toBe(false);
    });

    it('rejects message with non-string to', () => {
      const invalidMessage = {
        id: 'msg_123',
        from: 'sender',
        to: 123,
        type: 'request',
        payload: {},
        timestamp: new Date().toISOString(),
      };

      expect(isValidMessage(invalidMessage)).toBe(false);
    });

    it('rejects message with missing type', () => {
      const invalidMessage = {
        id: 'msg_123',
        from: 'sender',
        to: 'receiver',
        payload: {},
        timestamp: new Date().toISOString(),
      };

      expect(isValidMessage(invalidMessage)).toBe(false);
    });

    it('rejects message with invalid type', () => {
      const invalidMessage = {
        id: 'msg_123',
        from: 'sender',
        to: 'receiver',
        type: 'invalid-type',
        payload: {},
        timestamp: new Date().toISOString(),
      };

      expect(isValidMessage(invalidMessage)).toBe(false);
    });

    it('rejects message with non-string type', () => {
      const invalidMessage = {
        id: 'msg_123',
        from: 'sender',
        to: 'receiver',
        type: 123,
        payload: {},
        timestamp: new Date().toISOString(),
      };

      expect(isValidMessage(invalidMessage)).toBe(false);
    });

    it('rejects message with missing payload', () => {
      const invalidMessage = {
        id: 'msg_123',
        from: 'sender',
        to: 'receiver',
        type: 'request',
        timestamp: new Date().toISOString(),
      };

      expect(isValidMessage(invalidMessage)).toBe(false);
    });

    it('rejects message with null payload', () => {
      const invalidMessage = {
        id: 'msg_123',
        from: 'sender',
        to: 'receiver',
        type: 'request',
        payload: null,
        timestamp: new Date().toISOString(),
      };

      expect(isValidMessage(invalidMessage)).toBe(false);
    });

    it('rejects message with non-object payload', () => {
      const invalidMessage = {
        id: 'msg_123',
        from: 'sender',
        to: 'receiver',
        type: 'request',
        payload: 'string',
        timestamp: new Date().toISOString(),
      };

      expect(isValidMessage(invalidMessage)).toBe(false);
    });

    it('accepts message with array payload (arrays are objects in JS)', () => {
      const message = {
        id: 'msg_123',
        from: 'sender',
        to: 'receiver',
        type: 'request',
        payload: [],
        timestamp: new Date().toISOString(),
      };

      // In JavaScript, typeof [] === 'object', so this passes validation
      // even though TypeScript type is Record<string, unknown>
      expect(isValidMessage(message)).toBe(true);
    });

    it('rejects message with missing timestamp', () => {
      const invalidMessage = {
        id: 'msg_123',
        from: 'sender',
        to: 'receiver',
        type: 'request',
        payload: {},
      };

      expect(isValidMessage(invalidMessage)).toBe(false);
    });

    it('rejects message with non-string timestamp', () => {
      const invalidMessage = {
        id: 'msg_123',
        from: 'sender',
        to: 'receiver',
        type: 'request',
        payload: {},
        timestamp: Date.now(),
      };

      expect(isValidMessage(invalidMessage)).toBe(false);
    });

    it('rejects message with non-string replyTo', () => {
      const invalidMessage = {
        id: 'msg_123',
        from: 'sender',
        to: 'receiver',
        type: 'request',
        payload: {},
        timestamp: new Date().toISOString(),
        replyTo: 123,
      };

      expect(isValidMessage(invalidMessage)).toBe(false);
    });

    it('accepts message with empty string fields', () => {
      const message = {
        id: '',
        from: '',
        to: '',
        type: 'request',
        payload: {},
        timestamp: '',
      };

      expect(isValidMessage(message)).toBe(true);
    });

    it('accepts message with extra fields', () => {
      const message = {
        id: 'msg_123',
        from: 'sender',
        to: 'receiver',
        type: 'request',
        payload: {},
        timestamp: new Date().toISOString(),
        extraField: 'should be ignored',
      };

      expect(isValidMessage(message)).toBe(true);
    });
  });

  describe('isValidRegistration', () => {
    it('validates a valid registration', () => {
      const validRegistration: AgentRegistration = {
        name: 'test-agent',
        capabilities: [
          { name: 'testing', description: 'Run tests' },
        ],
        status: 'idle',
        lastSeen: new Date().toISOString(),
      };

      expect(isValidRegistration(validRegistration)).toBe(true);
    });

    it('validates registration with multiple capabilities', () => {
      const registration: AgentRegistration = {
        name: 'multi-agent',
        capabilities: [
          { name: 'test', description: 'Test' },
          { name: 'build', description: 'Build' },
          { name: 'deploy', description: 'Deploy' },
        ],
        status: 'idle',
        lastSeen: new Date().toISOString(),
      };

      expect(isValidRegistration(registration)).toBe(true);
    });

    it('validates registration with no capabilities', () => {
      const registration: AgentRegistration = {
        name: 'basic-agent',
        capabilities: [],
        status: 'idle',
        lastSeen: new Date().toISOString(),
      };

      expect(isValidRegistration(registration)).toBe(true);
    });

    it('validates all status types', () => {
      const statuses: Array<'idle' | 'busy' | 'offline'> = ['idle', 'busy', 'offline'];

      statuses.forEach((status) => {
        const registration: AgentRegistration = {
          name: 'test-agent',
          capabilities: [],
          status,
          lastSeen: new Date().toISOString(),
        };

        expect(isValidRegistration(registration)).toBe(true);
      });
    });

    it('validates capability with optional inputSchema', () => {
      const registration: AgentRegistration = {
        name: 'test-agent',
        capabilities: [
          {
            name: 'process',
            description: 'Process data',
            inputSchema: {
              type: 'object',
              properties: {
                input: { type: 'string' },
              },
            },
          },
        ],
        status: 'idle',
        lastSeen: new Date().toISOString(),
      };

      expect(isValidRegistration(registration)).toBe(true);
    });

    it('rejects null', () => {
      expect(isValidRegistration(null)).toBe(false);
    });

    it('rejects undefined', () => {
      expect(isValidRegistration(undefined)).toBe(false);
    });

    it('rejects non-object values', () => {
      expect(isValidRegistration('string')).toBe(false);
      expect(isValidRegistration(123)).toBe(false);
      expect(isValidRegistration(true)).toBe(false);
      expect(isValidRegistration([])).toBe(false);
    });

    it('rejects registration with missing name', () => {
      const registration = {
        capabilities: [],
        status: 'idle',
        lastSeen: new Date().toISOString(),
      };

      expect(isValidRegistration(registration)).toBe(false);
    });

    it('rejects registration with empty name', () => {
      const registration = {
        name: '',
        capabilities: [],
        status: 'idle',
        lastSeen: new Date().toISOString(),
      };

      expect(isValidRegistration(registration)).toBe(false);
    });

    it('rejects registration with non-string name', () => {
      const registration = {
        name: 123,
        capabilities: [],
        status: 'idle',
        lastSeen: new Date().toISOString(),
      };

      expect(isValidRegistration(registration)).toBe(false);
    });

    it('rejects registration with missing capabilities', () => {
      const registration = {
        name: 'test-agent',
        status: 'idle',
        lastSeen: new Date().toISOString(),
      };

      expect(isValidRegistration(registration)).toBe(false);
    });

    it('rejects registration with non-array capabilities', () => {
      const registration = {
        name: 'test-agent',
        capabilities: 'not-an-array',
        status: 'idle',
        lastSeen: new Date().toISOString(),
      };

      expect(isValidRegistration(registration)).toBe(false);
    });

    it('rejects registration with invalid capability (missing name)', () => {
      const registration = {
        name: 'test-agent',
        capabilities: [
          { description: 'Test' },
        ],
        status: 'idle',
        lastSeen: new Date().toISOString(),
      };

      expect(isValidRegistration(registration)).toBe(false);
    });

    it('rejects registration with invalid capability (non-string name)', () => {
      const registration = {
        name: 'test-agent',
        capabilities: [
          { name: 123, description: 'Test' },
        ],
        status: 'idle',
        lastSeen: new Date().toISOString(),
      };

      expect(isValidRegistration(registration)).toBe(false);
    });

    it('rejects registration with invalid capability (missing description)', () => {
      const registration = {
        name: 'test-agent',
        capabilities: [
          { name: 'test' },
        ],
        status: 'idle',
        lastSeen: new Date().toISOString(),
      };

      expect(isValidRegistration(registration)).toBe(false);
    });

    it('rejects registration with invalid capability (non-string description)', () => {
      const registration = {
        name: 'test-agent',
        capabilities: [
          { name: 'test', description: 123 },
        ],
        status: 'idle',
        lastSeen: new Date().toISOString(),
      };

      expect(isValidRegistration(registration)).toBe(false);
    });

    it('rejects registration with invalid capability (non-object)', () => {
      const registration = {
        name: 'test-agent',
        capabilities: ['string'],
        status: 'idle',
        lastSeen: new Date().toISOString(),
      };

      expect(isValidRegistration(registration)).toBe(false);
    });

    it('rejects registration with invalid capability (null)', () => {
      const registration = {
        name: 'test-agent',
        capabilities: [null],
        status: 'idle',
        lastSeen: new Date().toISOString(),
      };

      expect(isValidRegistration(registration)).toBe(false);
    });

    it('rejects registration with missing status', () => {
      const registration = {
        name: 'test-agent',
        capabilities: [],
        lastSeen: new Date().toISOString(),
      };

      expect(isValidRegistration(registration)).toBe(false);
    });

    it('rejects registration with invalid status', () => {
      const registration = {
        name: 'test-agent',
        capabilities: [],
        status: 'invalid-status',
        lastSeen: new Date().toISOString(),
      };

      expect(isValidRegistration(registration)).toBe(false);
    });

    it('rejects registration with non-string status', () => {
      const registration = {
        name: 'test-agent',
        capabilities: [],
        status: 123,
        lastSeen: new Date().toISOString(),
      };

      expect(isValidRegistration(registration)).toBe(false);
    });

    it('rejects registration with missing lastSeen', () => {
      const registration = {
        name: 'test-agent',
        capabilities: [],
        status: 'idle',
      };

      expect(isValidRegistration(registration)).toBe(false);
    });

    it('rejects registration with non-string lastSeen', () => {
      const registration = {
        name: 'test-agent',
        capabilities: [],
        status: 'idle',
        lastSeen: Date.now(),
      };

      expect(isValidRegistration(registration)).toBe(false);
    });

    it('accepts registration with extra fields', () => {
      const registration = {
        name: 'test-agent',
        capabilities: [],
        status: 'idle',
        lastSeen: new Date().toISOString(),
        extraField: 'should be ignored',
      };

      expect(isValidRegistration(registration)).toBe(true);
    });
  });

  describe('type definitions', () => {
    it('AgentMessageType includes all expected types', () => {
      const types: AgentMessageType[] = [
        'request',
        'response',
        'event',
        'handoff',
        'status',
        'discovery',
      ];

      // TypeScript compilation validates this
      expect(types).toHaveLength(6);
    });

    it('AgentMessage structure matches expected interface', () => {
      const message: AgentMessage = {
        id: 'msg_123',
        from: 'sender',
        to: 'receiver',
        type: 'request',
        payload: { task: 'test' },
        timestamp: new Date().toISOString(),
        replyTo: 'msg_original',
      };

      expect(message).toHaveProperty('id');
      expect(message).toHaveProperty('from');
      expect(message).toHaveProperty('to');
      expect(message).toHaveProperty('type');
      expect(message).toHaveProperty('payload');
      expect(message).toHaveProperty('timestamp');
      expect(message).toHaveProperty('replyTo');
    });

    it('AgentCapability structure matches expected interface', () => {
      const capability: AgentCapability = {
        name: 'test',
        description: 'Test capability',
        inputSchema: {
          type: 'object',
          properties: {
            input: { type: 'string' },
          },
        },
      };

      expect(capability).toHaveProperty('name');
      expect(capability).toHaveProperty('description');
      expect(capability).toHaveProperty('inputSchema');
    });

    it('AgentRegistration structure matches expected interface', () => {
      const registration: AgentRegistration = {
        name: 'test-agent',
        capabilities: [
          { name: 'test', description: 'Test' },
        ],
        status: 'idle',
        lastSeen: new Date().toISOString(),
      };

      expect(registration).toHaveProperty('name');
      expect(registration).toHaveProperty('capabilities');
      expect(registration).toHaveProperty('status');
      expect(registration).toHaveProperty('lastSeen');
    });

    it('DiscoveryRequest structure matches expected interface', () => {
      const request: DiscoveryRequest = {
        capability: 'testing',
      };

      expect(request).toHaveProperty('capability');
    });

    it('DiscoveryResponse structure matches expected interface', () => {
      const response: DiscoveryResponse = {
        agents: [
          {
            name: 'test-agent',
            capabilities: [],
            status: 'idle',
            lastSeen: new Date().toISOString(),
          },
        ],
      };

      expect(response).toHaveProperty('agents');
      expect(Array.isArray(response.agents)).toBe(true);
    });

    it('StatusUpdate structure matches expected interface', () => {
      const update: StatusUpdate = {
        status: 'busy',
        message: 'Processing task',
      };

      expect(update).toHaveProperty('status');
      expect(update).toHaveProperty('message');
    });

    it('HandoffRequest structure matches expected interface', () => {
      const handoff: HandoffRequest = {
        task: 'complete-processing',
        context: { step: 1, data: 'test' },
        reason: 'Specialized capability needed',
      };

      expect(handoff).toHaveProperty('task');
      expect(handoff).toHaveProperty('context');
      expect(handoff).toHaveProperty('reason');
    });
  });

  describe('integration scenarios', () => {
    it('supports request-response message flow', () => {
      const request = createMessage('client', 'service', 'request', {
        task: 'process-data',
        data: [1, 2, 3],
      });

      expect(isValidMessage(request)).toBe(true);

      const response = createMessage(
        'service',
        'client',
        'response',
        { result: [2, 4, 6] },
        request.id
      );

      expect(isValidMessage(response)).toBe(true);
      expect(response.replyTo).toBe(request.id);
      expect(response.from).toBe(request.to);
      expect(response.to).toBe(request.from);
    });

    it('supports discovery workflow', () => {
      const registration: AgentRegistration = {
        name: 'test-agent',
        capabilities: [
          { name: 'testing', description: 'Run tests' },
        ],
        status: 'idle',
        lastSeen: new Date().toISOString(),
      };

      expect(isValidRegistration(registration)).toBe(true);

      const discoveryRequest = createMessage('client', 'router', 'discovery', {
        capability: 'testing',
      } as DiscoveryRequest);

      expect(isValidMessage(discoveryRequest)).toBe(true);

      const discoveryResponse = createMessage(
        'router',
        'client',
        'response',
        { agents: [registration] } as DiscoveryResponse,
        discoveryRequest.id
      );

      expect(isValidMessage(discoveryResponse)).toBe(true);
    });

    it('supports status update broadcast', () => {
      const statusMessage = createMessage('worker', '*', 'status', {
        status: 'busy',
        message: 'Processing task 123',
      } as StatusUpdate);

      expect(isValidMessage(statusMessage)).toBe(true);
      expect(statusMessage.to).toBe('*');
      expect(statusMessage.type).toBe('status');
    });

    it('supports handoff workflow', () => {
      const handoffMessage = createMessage('agent-a', 'agent-b', 'handoff', {
        task: 'continue-processing',
        context: {
          step: 2,
          previousResults: { status: 'partial' },
        },
        reason: 'Agent A reached capacity limit',
      } as HandoffRequest);

      expect(isValidMessage(handoffMessage)).toBe(true);
      expect(handoffMessage.type).toBe('handoff');
    });

    it('supports event broadcast', () => {
      const event = createMessage('monitor', '*', 'event', {
        eventType: 'health-check',
        timestamp: Date.now(),
        status: 'healthy',
      });

      expect(isValidMessage(event)).toBe(true);
      expect(event.to).toBe('*');
    });
  });

  describe('edge cases', () => {
    it('handles message with very large payload', () => {
      const largePayload = {
        data: new Array(1000).fill(null).map((_, i) => ({
          id: i,
          value: `item-${i}`,
        })),
      };

      const message = createMessage('sender', 'receiver', 'request', largePayload);

      expect(isValidMessage(message)).toBe(true);
      expect(message.payload.data).toHaveLength(1000);
    });

    it('handles registration with many capabilities', () => {
      const capabilities: AgentCapability[] = new Array(50).fill(null).map((_, i) => ({
        name: `capability-${i}`,
        description: `Description for capability ${i}`,
      }));

      const registration: AgentRegistration = {
        name: 'super-agent',
        capabilities,
        status: 'idle',
        lastSeen: new Date().toISOString(),
      };

      expect(isValidRegistration(registration)).toBe(true);
      expect(registration.capabilities).toHaveLength(50);
    });

    it('handles capability with complex input schema', () => {
      const capability: AgentCapability = {
        name: 'complex-task',
        description: 'Complex processing',
        inputSchema: {
          type: 'object',
          properties: {
            input: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  data: { type: 'string' },
                },
                required: ['id', 'data'],
              },
            },
            options: {
              type: 'object',
              properties: {
                timeout: { type: 'number' },
                retry: { type: 'boolean' },
              },
            },
          },
          required: ['input'],
        },
      };

      const registration: AgentRegistration = {
        name: 'test-agent',
        capabilities: [capability],
        status: 'idle',
        lastSeen: new Date().toISOString(),
      };

      expect(isValidRegistration(registration)).toBe(true);
    });

    it('handles special characters in agent names', () => {
      const names = [
        'agent-with-dashes',
        'agent_with_underscores',
        'agent.with.dots',
        'agent@with@at',
        'agent:with:colons',
      ];

      names.forEach((name) => {
        const registration: AgentRegistration = {
          name,
          capabilities: [],
          status: 'idle',
          lastSeen: new Date().toISOString(),
        };

        expect(isValidRegistration(registration)).toBe(true);
      });
    });

    it('handles unicode characters in payload', () => {
      const message = createMessage('sender', 'receiver', 'request', {
        text: '你好世界 🌍 مرحبا העולם',
        emoji: '🚀 🎉 ✅',
      });

      expect(isValidMessage(message)).toBe(true);
    });

    it('creates messages with minimal valid data', () => {
      const message = createMessage('a', 'b', 'event', {});

      expect(isValidMessage(message)).toBe(true);
      expect(message.from).toBe('a');
      expect(message.to).toBe('b');
    });

    it('validates registration with minimal name', () => {
      const registration: AgentRegistration = {
        name: 'x',
        capabilities: [],
        status: 'idle',
        lastSeen: new Date().toISOString(),
      };

      expect(isValidRegistration(registration)).toBe(true);
    });
  });
});
