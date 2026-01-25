/**
 * NXTG-Forge API Server
 * Express server with WebSocket support for real-time updates
 */

import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import { z } from 'zod';
import { ForgeOrchestrator } from '../core/orchestrator';
import { VisionSystem } from '../core/vision';
import { StateManager } from '../core/state';
import { CoordinationService } from '../core/coordination';
import { BootstrapService } from '../core/bootstrap';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5050', // NXTG-Forge UI
  credentials: true
}));
app.use(express.json());

// Initialize core services
const visionManager = new VisionSystem(process.cwd());
const visionSystem = visionManager; // Alias for API compatibility
const coordinationService = new CoordinationService();
const orchestrator = new ForgeOrchestrator(visionManager, coordinationService);
const stateManager = new StateManager();
const bootstrapService = new BootstrapService(stateManager);

// WebSocket connection management
const clients = new Set<WebSocket>();

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log('New WebSocket client connected');

  // Send initial state
  ws.send(JSON.stringify({
    type: 'state.update',
    payload: stateManager.getState(),
    timestamp: new Date().toISOString()
  }));

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      handleWSMessage(ws, message);
    } catch (error) {
      console.error('Invalid WebSocket message:', error);
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    console.log('WebSocket client disconnected');
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    clients.delete(ws);
  });
});

// Broadcast to all connected clients
function broadcast(type: string, payload: any) {
  const message = JSON.stringify({
    type,
    payload,
    timestamp: new Date().toISOString()
  });

  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Handle WebSocket messages
async function handleWSMessage(ws: WebSocket, message: any) {
  switch (message.type) {
    case 'state.update':
      await stateManager.updateState(message.payload);
      broadcast('state.update', stateManager.getState());
      break;

    case 'command.execute':
      const result = await orchestrator.executeCommand(message.payload);
      ws.send(JSON.stringify({
        type: 'command.result',
        payload: result,
        correlationId: message.correlationId
      }));
      break;

    default:
      console.log('Unknown message type:', message.type);
  }
}

// ============= Vision Endpoints =============

app.get('/api/vision', async (req, res) => {
  try {
    const vision = await visionSystem.getVision();
    res.json({
      success: true,
      data: vision,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

app.put('/api/vision', async (req, res) => {
  try {
    const vision = await visionSystem.updateVision(req.body);
    broadcast('vision.change', vision);
    res.json({
      success: true,
      data: vision,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/vision/capture', async (req, res) => {
  try {
    const { text } = req.body;
    const vision = await visionSystem.captureVision(text);
    broadcast('vision.change', vision);
    res.json({
      success: true,
      data: vision,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// ============= Project State Endpoints =============

app.get('/api/state', async (req, res) => {
  try {
    const state = stateManager.getState();
    res.json({
      success: true,
      data: state,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

app.patch('/api/state/phase', async (req, res) => {
  try {
    const { phase } = req.body;
    const state = await stateManager.updatePhase(phase);
    broadcast('state.update', state);
    res.json({
      success: true,
      data: state,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/state/health', async (req, res) => {
  try {
    const health = await stateManager.getHealthMetrics();
    res.json({
      success: true,
      data: health,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// ============= Agent Endpoints =============

app.get('/api/agents/activities', async (req, res) => {
  try {
    const { page = 1, limit = 50, sortBy = 'timestamp', sortOrder = 'desc' } = req.query;
    const activities = await coordinationService.getAgentActivities({
      page: Number(page),
      limit: Number(limit),
      sortBy: String(sortBy),
      sortOrder: sortOrder as 'asc' | 'desc'
    });
    res.json({
      success: true,
      data: activities,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/agents/active', async (req, res) => {
  try {
    const agents = await coordinationService.getActiveAgents();
    res.json({
      success: true,
      data: agents,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/agents/:agentId/tasks', async (req, res) => {
  try {
    const { agentId } = req.params;
    const task = req.body;
    const result = await coordinationService.assignTask(agentId, task);

    // Broadcast agent activity
    broadcast('agent.activity', {
      agent: agentId,
      action: `Assigned task: ${task.name}`,
      status: 'started',
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// ============= Command Endpoints =============

app.post('/api/commands/execute', async (req, res) => {
  try {
    const command = req.body;
    const result = await orchestrator.executeCommand(command);

    // Broadcast command execution
    broadcast('command.executed', {
      command,
      result,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      data: { result },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/commands/history', async (req, res) => {
  try {
    const history = await orchestrator.getCommandHistory();
    res.json({
      success: true,
      data: history,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/commands/suggestions', async (req, res) => {
  try {
    const { context } = req.body;
    const suggestions = await orchestrator.getCommandSuggestions(context);
    res.json({
      success: true,
      data: suggestions,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// ============= Architecture Endpoints =============

app.get('/api/architecture/decisions', async (req, res) => {
  try {
    const decisions = await coordinationService.getArchitectureDecisions();
    res.json({
      success: true,
      data: decisions,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/architecture/propose', async (req, res) => {
  try {
    const decision = req.body;
    const result = await coordinationService.proposeArchitectureDecision(decision);

    // Broadcast decision
    broadcast('decision.made', result);

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/architecture/decisions/:decisionId/approve', async (req, res) => {
  try {
    const { decisionId } = req.params;
    const result = await coordinationService.approveArchitectureDecision(decisionId);

    // Broadcast approval
    broadcast('decision.made', result);

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// ============= YOLO Mode Endpoints =============

app.get('/api/yolo/statistics', async (req, res) => {
  try {
    const stats = await orchestrator.getYoloStatistics();
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/yolo/execute', async (req, res) => {
  try {
    const action = req.body;
    const result = await orchestrator.executeYoloAction(action);

    // Broadcast YOLO action
    broadcast('yolo.action', {
      action,
      result,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      data: { actionId: result.actionId },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/yolo/history', async (req, res) => {
  try {
    const history = await orchestrator.getYoloHistory();
    res.json({
      success: true,
      data: history,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// ============= Health Check =============

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      orchestrator: orchestrator.isHealthy(),
      vision: visionSystem.isHealthy(),
      state: stateManager.isHealthy(),
      coordination: coordinationService.isHealthy(),
      websocket: clients.size > 0
    }
  });
});

// Start server
const PORT = process.env.PORT || 5051; // NXTG-Forge dedicated API port

server.listen(PORT, () => {
  console.log(`NXTG-Forge API Server running on port ${PORT}`);
  console.log(`WebSocket server available at ws://localhost:${PORT}/ws`);

  // Initialize services
  orchestrator.initialize();
  visionSystem.initialize();
  stateManager.initialize();
  coordinationService.initialize();

  console.log('All services initialized successfully');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');

  // Close WebSocket connections
  clients.forEach(client => {
    client.close();
  });

  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default server;