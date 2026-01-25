/**
 * NXTG-Forge API Integration Tests
 * Tests full UI-Backend integration flow
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { WebSocket } from 'ws';

const API_BASE_URL = 'http://localhost:3000/api';
const WS_URL = 'ws://localhost:3000/ws';

// Helper function to wait for condition
const waitFor = (condition: () => boolean, timeout = 5000): Promise<void> => {
  return new Promise((resolve, reject) => {
    const interval = setInterval(() => {
      if (condition()) {
        clearInterval(interval);
        resolve();
      }
    }, 100);

    setTimeout(() => {
      clearInterval(interval);
      reject(new Error('Timeout waiting for condition'));
    }, timeout);
  });
};

describe('NXTG-Forge API Integration', () => {
  let ws: WebSocket;
  let wsMessages: any[] = [];

  beforeAll(() => {
    // Setup WebSocket connection
    ws = new WebSocket(WS_URL);

    ws.on('message', (data) => {
      wsMessages.push(JSON.parse(data.toString()));
    });

    return new Promise((resolve) => {
      ws.on('open', resolve);
    });
  });

  afterAll(() => {
    ws.close();
  });

  describe('Vision Management', () => {
    it('should capture and retrieve vision', async () => {
      const visionText = 'Build an AI-powered development platform that eliminates burnout';

      // Capture vision
      const captureResponse = await fetch(`${API_BASE_URL}/vision/capture`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: visionText })
      });

      expect(captureResponse.ok).toBe(true);
      const captureData = await captureResponse.json();
      expect(captureData.success).toBe(true);
      expect(captureData.data).toBeDefined();
      expect(captureData.data.mission).toContain('AI-powered');

      // Retrieve vision
      const getResponse = await fetch(`${API_BASE_URL}/vision`);
      const getData = await getResponse.json();

      expect(getData.success).toBe(true);
      expect(getData.data.mission).toBe(captureData.data.mission);

      // Check WebSocket broadcast
      await waitFor(() =>
        wsMessages.some(msg => msg.type === 'vision.change')
      );

      const visionChangeMsg = wsMessages.find(msg => msg.type === 'vision.change');
      expect(visionChangeMsg).toBeDefined();
      expect(visionChangeMsg.payload.mission).toBe(captureData.data.mission);
    });

    it('should update vision goals', async () => {
      const updates = {
        goals: [
          {
            id: '1',
            title: 'Reduce Cognitive Load',
            description: 'Minimize mental overhead by 80%',
            status: 'in-progress',
            progress: 45
          }
        ]
      };

      const response = await fetch(`${API_BASE_URL}/vision`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.goals).toHaveLength(1);
      expect(data.data.goals[0].progress).toBe(45);
    });
  });

  describe('Project State Management', () => {
    it('should get project state', async () => {
      const response = await fetch(`${API_BASE_URL}/state`);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.phase).toBeDefined();
      expect(data.data.progress).toBeGreaterThanOrEqual(0);
      expect(data.data.progress).toBeLessThanOrEqual(100);
      expect(data.data.healthScore).toBeGreaterThanOrEqual(0);
      expect(data.data.healthScore).toBeLessThanOrEqual(100);
    });

    it('should update project phase', async () => {
      const response = await fetch(`${API_BASE_URL}/state/phase`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase: 'building' })
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.phase).toBe('building');

      // Check WebSocket broadcast
      await waitFor(() =>
        wsMessages.some(msg =>
          msg.type === 'state.update' && msg.payload.phase === 'building'
        )
      );
    });

    it('should get health metrics', async () => {
      const response = await fetch(`${API_BASE_URL}/state/health`);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(typeof data.data).toBe('number');
      expect(data.data).toBeGreaterThanOrEqual(0);
      expect(data.data).toBeLessThanOrEqual(100);
    });
  });

  describe('Agent Management', () => {
    it('should get agent activities', async () => {
      const response = await fetch(`${API_BASE_URL}/agents/activities?limit=10`);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);

      if (data.data.length > 0) {
        const activity = data.data[0];
        expect(activity.agent).toBeDefined();
        expect(activity.action).toBeDefined();
        expect(activity.status).toBeDefined();
      }
    });

    it('should get active agents', async () => {
      const response = await fetch(`${API_BASE_URL}/agents/active`);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);

      if (data.data.length > 0) {
        const agent = data.data[0];
        expect(agent.id).toBeDefined();
        expect(agent.name).toBeDefined();
        expect(agent.status).toBeDefined();
      }
    });

    it('should assign task to agent', async () => {
      const task = {
        name: 'Test Integration',
        description: 'Verify API integration',
        priority: 'high'
      };

      const response = await fetch(`${API_BASE_URL}/agents/orchestrator/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task)
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.taskId).toBeDefined();

      // Check WebSocket broadcast
      await waitFor(() =>
        wsMessages.some(msg =>
          msg.type === 'agent.activity' &&
          msg.payload.action.includes('Test Integration')
        )
      );
    });
  });

  describe('Command Execution', () => {
    it('should execute command', async () => {
      const command = {
        id: 'test-cmd-1',
        type: 'status',
        name: 'Get Status',
        description: 'Get project status',
        category: 'info'
      };

      const response = await fetch(`${API_BASE_URL}/commands/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(command)
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.result).toBeDefined();

      // Check WebSocket broadcast
      await waitFor(() =>
        wsMessages.some(msg =>
          msg.type === 'command.executed' &&
          msg.payload.command.id === 'test-cmd-1'
        )
      );
    });

    it('should get command history', async () => {
      const response = await fetch(`${API_BASE_URL}/commands/history`);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });

    it('should get command suggestions', async () => {
      const response = await fetch(`${API_BASE_URL}/commands/suggestions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: 'testing' })
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });
  });

  describe('Architecture Decisions', () => {
    it('should propose architecture decision', async () => {
      const decision = {
        title: 'Use microservices architecture',
        type: 'structural',
        description: 'Split monolith into microservices',
        rationale: 'Better scalability and maintainability',
        impact: 'high',
        proposedBy: 'lead-architect'
      };

      const response = await fetch(`${API_BASE_URL}/architecture/propose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(decision)
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.id).toBeDefined();
      expect(data.data.title).toBe(decision.title);
      expect(data.data.status).toBe('proposed');

      // Check WebSocket broadcast
      await waitFor(() =>
        wsMessages.some(msg =>
          msg.type === 'decision.made' &&
          msg.payload.title === decision.title
        )
      );
    });

    it('should get architecture decisions', async () => {
      const response = await fetch(`${API_BASE_URL}/architecture/decisions`);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);

      if (data.data.length > 0) {
        const decision = data.data[0];
        expect(decision.id).toBeDefined();
        expect(decision.title).toBeDefined();
        expect(decision.status).toBeDefined();
      }
    });

    it('should approve architecture decision', async () => {
      // First, get a decision to approve
      const getResponse = await fetch(`${API_BASE_URL}/architecture/decisions`);
      const getData = await getResponse.json();

      if (getData.data.length > 0) {
        const decisionId = getData.data[0].id;

        const approveResponse = await fetch(
          `${API_BASE_URL}/architecture/decisions/${decisionId}/approve`,
          { method: 'POST' }
        );

        expect(approveResponse.ok).toBe(true);
        const approveData = await approveResponse.json();
        expect(approveData.success).toBe(true);
        expect(approveData.data.status).toBe('approved');
      }
    });
  });

  describe('YOLO Mode', () => {
    it('should get YOLO statistics', async () => {
      const response = await fetch(`${API_BASE_URL}/yolo/statistics`);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(typeof data.data.totalActions).toBe('number');
      expect(typeof data.data.successRate).toBe('number');
      expect(typeof data.data.averageTime).toBe('number');
      expect(typeof data.data.savedHours).toBe('number');
    });

    it('should execute YOLO action', async () => {
      const action = {
        id: 'yolo-1',
        type: 'optimization',
        description: 'Auto-optimize database queries',
        risk: 'low',
        estimatedTime: 300
      };

      const response = await fetch(`${API_BASE_URL}/yolo/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action)
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.actionId).toBeDefined();

      // Check WebSocket broadcast
      await waitFor(() =>
        wsMessages.some(msg =>
          msg.type === 'yolo.action' &&
          msg.payload.action.id === 'yolo-1'
        )
      );
    });

    it('should get YOLO history', async () => {
      const response = await fetch(`${API_BASE_URL}/yolo/history`);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });
  });

  describe('WebSocket Real-time Updates', () => {
    it('should receive real-time state updates', async () => {
      // Clear messages
      wsMessages = [];

      // Send a WebSocket message
      ws.send(JSON.stringify({
        type: 'state.update',
        payload: { testField: 'testValue' }
      }));

      // Wait for broadcast
      await waitFor(() =>
        wsMessages.some(msg =>
          msg.type === 'state.update' &&
          msg.payload.testField === 'testValue'
        )
      );

      const stateMsg = wsMessages.find(msg =>
        msg.type === 'state.update' && msg.payload.testField === 'testValue'
      );
      expect(stateMsg).toBeDefined();
    });

    it('should handle command execution via WebSocket', async () => {
      // Clear messages
      wsMessages = [];

      const command = {
        id: 'ws-cmd-1',
        type: 'status',
        name: 'WS Status'
      };

      // Send command via WebSocket
      ws.send(JSON.stringify({
        type: 'command.execute',
        payload: command,
        correlationId: 'test-correlation-1'
      }));

      // Wait for result
      await waitFor(() =>
        wsMessages.some(msg =>
          msg.type === 'command.result' &&
          msg.correlationId === 'test-correlation-1'
        )
      );

      const resultMsg = wsMessages.find(msg =>
        msg.type === 'command.result' && msg.correlationId === 'test-correlation-1'
      );
      expect(resultMsg).toBeDefined();
      expect(resultMsg.payload).toBeDefined();
    });
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await fetch(`${API_BASE_URL}/health`);
      const data = await response.json();

      expect(data.status).toBe('healthy');
      expect(data.services).toBeDefined();
      expect(data.services.orchestrator).toBe(true);
      expect(data.services.vision).toBe(true);
      expect(data.services.state).toBe(true);
      expect(data.services.coordination).toBe(true);
      expect(typeof data.services.websocket).toBe('boolean');
    });
  });
});