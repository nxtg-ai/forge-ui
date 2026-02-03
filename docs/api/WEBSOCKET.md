# NXTG-Forge WebSocket Protocol

## Overview

NXTG-Forge provides two WebSocket endpoints for real-time communication:

| Endpoint | Purpose |
|----------|---------|
| `ws://localhost:5051/ws` | Application state updates and events |
| `ws://localhost:5051/terminal` | PTY terminal sessions |

## Main WebSocket (`/ws`)

### Connection

```javascript
const ws = new WebSocket('ws://localhost:5051/ws');

ws.onopen = () => {
  console.log('Connected to NXTG-Forge');
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Received:', message.type, message.payload);
};

ws.onclose = () => {
  console.log('Disconnected');
};
```

### Message Format

All messages follow this structure:

```typescript
interface WebSocketMessage {
  type: string;           // Message type identifier
  payload: any;           // Message data
  timestamp: string;      // ISO 8601 timestamp
  correlationId?: string; // Optional request correlation
}
```

### Client → Server Messages

#### Ping (Heartbeat)

```json
{
  "type": "ping"
}
```

Response:
```json
{
  "type": "pong",
  "timestamp": 1706918400000
}
```

#### State Update

```json
{
  "type": "state.update",
  "payload": {
    "phase": "development",
    "activeAgents": ["builder", "guardian"]
  }
}
```

#### Command Execute

```json
{
  "type": "command.execute",
  "payload": {
    "type": "build",
    "args": ["--watch"]
  },
  "correlationId": "cmd-123"
}
```

Response:
```json
{
  "type": "command.result",
  "payload": {
    "success": true,
    "output": "Build started"
  },
  "correlationId": "cmd-123"
}
```

### Server → Client Messages

#### State Update Broadcast

```json
{
  "type": "state.update",
  "payload": {
    "phase": "development",
    "health": "healthy",
    "activeAgents": 3
  },
  "timestamp": "2026-02-03T00:00:00Z"
}
```

#### Vision Change

```json
{
  "type": "vision.change",
  "payload": {
    "mission": "Build the Ultimate Chief of Staff",
    "goals": ["Launch v3.0", "Build Agent Ecosystem"],
    "version": "1.1"
  },
  "timestamp": "2026-02-03T00:00:00Z"
}
```

#### Agent Activity

```json
{
  "type": "agent.activity",
  "payload": {
    "agent": "forge-builder",
    "action": "Building feature authentication",
    "status": "started",
    "timestamp": "2026-02-03T00:00:00Z"
  },
  "timestamp": "2026-02-03T00:00:00Z"
}
```

#### Command Executed

```json
{
  "type": "command.executed",
  "payload": {
    "command": { "type": "test", "args": ["--watch"] },
    "result": { "success": true }
  },
  "timestamp": "2026-02-03T00:00:00Z"
}
```

#### Decision Made

```json
{
  "type": "decision.made",
  "payload": {
    "id": "adr-001",
    "title": "Use TypeScript for all code",
    "status": "accepted"
  },
  "timestamp": "2026-02-03T00:00:00Z"
}
```

#### YOLO Action

```json
{
  "type": "yolo.action",
  "payload": {
    "action": { "type": "auto-fix", "target": "lint-errors" },
    "result": { "actionId": "yolo-123", "success": true }
  },
  "timestamp": "2026-02-03T00:00:00Z"
}
```

#### Diff Events

```json
{
  "type": "diff.applied",
  "payload": {
    "filePath": "src/index.ts",
    "timestamp": "2026-02-03T00:00:00Z"
  },
  "timestamp": "2026-02-03T00:00:00Z"
}
```

```json
{
  "type": "diff.rejected",
  "payload": {
    "filePath": "src/index.ts",
    "timestamp": "2026-02-03T00:00:00Z"
  },
  "timestamp": "2026-02-03T00:00:00Z"
}
```

#### Runspace Events

```json
{
  "type": "runspace.created",
  "payload": {
    "id": "rs-001",
    "name": "my-project",
    "status": "running"
  },
  "timestamp": "2026-02-03T00:00:00Z"
}
```

```json
{
  "type": "runspace.activated",
  "payload": {
    "runspaceId": "rs-001"
  },
  "timestamp": "2026-02-03T00:00:00Z"
}
```

#### Worker Events

```json
{
  "type": "worker.event",
  "payload": {
    "type": "task.completed",
    "workerId": "worker-1",
    "taskId": "task-123",
    "result": { "success": true }
  },
  "timestamp": "2026-02-03T00:00:00Z"
}
```

#### Error Reported

```json
{
  "type": "error.reported",
  "payload": {
    "message": "Failed to load component",
    "timestamp": "2026-02-03T00:00:00Z"
  },
  "timestamp": "2026-02-03T00:00:00Z"
}
```

---

## Terminal WebSocket (`/terminal`)

### Connection

Connect with optional session ID for persistence:

```javascript
// New session
const ws = new WebSocket('ws://localhost:5051/terminal');

// Resume session
const ws = new WebSocket('ws://localhost:5051/terminal?sessionId=abc123');

// With runspace
const ws = new WebSocket('ws://localhost:5051/terminal?runspaceId=rs-001');
```

### Message Format

Terminal uses binary frames for PTY data and JSON for control messages.

#### Control Messages (JSON)

**Resize Terminal**
```json
{
  "type": "resize",
  "cols": 120,
  "rows": 40
}
```

**Session Info Response**
```json
{
  "type": "session",
  "sessionId": "abc123",
  "pid": 12345
}
```

#### PTY Data (Binary/Text)

Input and output are sent as raw text/binary frames:

```javascript
// Send input
ws.send('ls -la\n');

// Receive output
ws.onmessage = (event) => {
  if (typeof event.data === 'string') {
    try {
      const json = JSON.parse(event.data);
      if (json.type === 'session') {
        // Handle session info
      }
    } catch {
      // Raw terminal output
      terminal.write(event.data);
    }
  }
};
```

### Session Persistence

Sessions persist across disconnects:

1. On connect, server sends session info with `sessionId`
2. Store `sessionId` for reconnection
3. On reconnect, pass `sessionId` as query parameter
4. Server restores terminal state and history

### Example: Complete Terminal Setup

```javascript
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';

const terminal = new Terminal();
const fitAddon = new FitAddon();
terminal.loadAddon(fitAddon);
terminal.open(document.getElementById('terminal'));
fitAddon.fit();

let sessionId = localStorage.getItem('terminalSessionId');
const url = sessionId
  ? `ws://localhost:5051/terminal?sessionId=${sessionId}`
  : 'ws://localhost:5051/terminal';

const ws = new WebSocket(url);

ws.onopen = () => {
  // Send initial size
  ws.send(JSON.stringify({
    type: 'resize',
    cols: terminal.cols,
    rows: terminal.rows
  }));
};

ws.onmessage = (event) => {
  if (typeof event.data === 'string') {
    try {
      const msg = JSON.parse(event.data);
      if (msg.type === 'session') {
        sessionId = msg.sessionId;
        localStorage.setItem('terminalSessionId', sessionId);
        return;
      }
    } catch {}
  }
  terminal.write(event.data);
};

terminal.onData((data) => {
  ws.send(data);
});

window.addEventListener('resize', () => {
  fitAddon.fit();
  ws.send(JSON.stringify({
    type: 'resize',
    cols: terminal.cols,
    rows: terminal.rows
  }));
});
```

---

## Error Handling

### Connection Errors

```javascript
ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onclose = (event) => {
  if (event.code !== 1000) {
    console.error('Abnormal close:', event.code, event.reason);
    // Implement reconnection logic
  }
};
```

### Reconnection Strategy

```javascript
class ReconnectingWebSocket {
  constructor(url, options = {}) {
    this.url = url;
    this.maxRetries = options.maxRetries || 5;
    this.retryDelay = options.retryDelay || 1000;
    this.retries = 0;
    this.connect();
  }

  connect() {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.retries = 0;
      this.onopen?.();
    };

    this.ws.onclose = (event) => {
      if (event.code !== 1000 && this.retries < this.maxRetries) {
        this.retries++;
        setTimeout(() => this.connect(), this.retryDelay * this.retries);
      }
      this.onclose?.(event);
    };

    this.ws.onmessage = (event) => this.onmessage?.(event);
    this.ws.onerror = (error) => this.onerror?.(error);
  }

  send(data) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    }
  }

  close() {
    this.maxRetries = 0;
    this.ws.close(1000);
  }
}
```

---

## Best Practices

1. **Heartbeat**: Send ping messages every 30 seconds to keep connection alive
2. **Reconnection**: Implement exponential backoff for reconnection
3. **Session Storage**: Store terminal sessionId for persistence
4. **Error Handling**: Always handle `onerror` and `onclose` events
5. **Message Validation**: Validate message structure before processing
6. **Binary Data**: Use appropriate encoding for terminal data
