# Runspace API Reference

**Base URL**: `http://localhost:5051/api`

---

## Endpoints

### 1. Create Runspace

**POST** `/api/runspaces`

Create a new runspace with vision, MCP config, and settings.

**Request Body:**
```json
{
  "name": "my-project",                    // Machine name (required)
  "displayName": "My Awesome Project",     // Human-friendly name (required)
  "path": "/home/user/projects/my-app",    // Absolute path (required)
  "backendType": "wsl",                    // "wsl" | "container" | "vm" (required)
  "tags": ["web", "typescript"],           // Optional
  "color": "#8B5CF6",                      // Hex color (optional)
  "icon": "🚀",                            // Emoji icon (optional)
  "autoStart": true,                       // Start on boot (optional)
  "vision": {                              // Optional
    "mission": "Build something amazing",
    "goals": ["Fast", "Secure"],
    "constraints": ["Budget: $1000"],
    "successMetrics": ["100% uptime"]
  },
  "mcpConfig": {                           // Optional
    "servers": ["github", "postgres"]
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "abc-123-def-456",
    "name": "my-project",
    "displayName": "My Awesome Project",
    "path": "/home/user/projects/my-app",
    "backendType": "wsl",
    "status": "stopped",
    "createdAt": "2026-01-27T...",
    "lastActive": "2026-01-27T...",
    "tags": ["web", "typescript"],
    "color": "#8B5CF6",
    "icon": "🚀"
  },
  "timestamp": "2026-01-27T..."
}
```

**WebSocket Event:** `runspace.created`

---

### 2. List All Runspaces

**GET** `/api/runspaces`

Get all runspaces and the currently active one.

**Response:**
```json
{
  "success": true,
  "data": {
    "runspaces": [
      {
        "id": "abc-123",
        "name": "project-1",
        "displayName": "Project 1",
        "status": "active",
        ...
      },
      {
        "id": "def-456",
        "name": "project-2",
        "displayName": "Project 2",
        "status": "suspended",
        ...
      }
    ],
    "activeRunspaceId": "abc-123"
  },
  "timestamp": "2026-01-27T..."
}
```

---

### 3. Get Runspace Details

**GET** `/api/runspaces/:id`

Get detailed information about a specific runspace.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "abc-123",
    "name": "my-project",
    "displayName": "My Awesome Project",
    "path": "/home/user/projects/my-app",
    "backendType": "wsl",
    "status": "active",
    "vision": { ... },
    "state": { ... },
    "mcpConfig": { ... },
    "ptySessionId": "pty-abc-123-1234567890",
    "pid": 12345,
    "createdAt": "2026-01-27T...",
    "lastActive": "2026-01-27T...",
    "tags": ["web"],
    "color": "#8B5CF6",
    "icon": "🚀"
  },
  "timestamp": "2026-01-27T..."
}
```

**Error Response (404):**
```json
{
  "success": false,
  "error": "Runspace not found: abc-123",
  "timestamp": "2026-01-27T..."
}
```

---

### 4. Update Runspace

**PUT** `/api/runspaces/:id`

Update runspace configuration (partial updates supported).

**Request Body:**
```json
{
  "displayName": "Updated Name",
  "tags": ["web", "production"],
  "color": "#10B981",
  "vision": {
    "mission": "Updated mission"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": { /* updated runspace */ },
  "timestamp": "2026-01-27T..."
}
```

**WebSocket Event:** `runspace.updated`

---

### 5. Delete Runspace

**DELETE** `/api/runspaces/:id?deleteFiles=true`

Delete a runspace. Optionally delete `.forge/` directory.

**Query Parameters:**
- `deleteFiles` (boolean, optional): Delete `.forge/` directory from project

**Response:**
```json
{
  "success": true,
  "data": { "deleted": true },
  "timestamp": "2026-01-27T..."
}
```

**WebSocket Event:** `runspace.deleted`

**Warning:** If `deleteFiles=true`, the entire `.forge/` directory is permanently deleted!

---

### 6. Switch to Runspace

**POST** `/api/runspaces/:id/switch`

Switch to a different runspace (makes it active).

**Behavior:**
- Suspends current active runspace (if `autoSuspend: true`)
- Starts target runspace if stopped/suspended
- Updates `lastActive` timestamp
- Saves to registry

**Response:**
```json
{
  "success": true,
  "data": { /* now-active runspace */ },
  "timestamp": "2026-01-27T..."
}
```

**WebSocket Event:** `runspace.activated`

---

### 7. Start Runspace

**POST** `/api/runspaces/:id/start`

Start a stopped or suspended runspace.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "abc-123",
    "status": "active",
    ...
  },
  "timestamp": "2026-01-27T..."
}
```

**WebSocket Event:** `runspace.updated`

---

### 8. Stop Runspace

**POST** `/api/runspaces/:id/stop`

Stop an active or suspended runspace.

**Behavior:**
- Kills PTY sessions
- Sets status to "stopped"
- Releases resources

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "abc-123",
    "status": "stopped",
    ...
  },
  "timestamp": "2026-01-27T..."
}
```

**WebSocket Event:** `runspace.updated`

---

### 9. Suspend Runspace

**POST** `/api/runspaces/:id/suspend`

Suspend an active runspace (pause without killing).

**Note:** For WSL backend, suspend = stop (no true pause capability).

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "abc-123",
    "status": "suspended",
    ...
  },
  "timestamp": "2026-01-27T..."
}
```

**WebSocket Event:** `runspace.suspended`

---

### 10. Get Runspace Health

**GET** `/api/runspaces/:id/health`

Get health metrics for a runspace.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "cpu": 0,        // TODO: Not implemented yet
    "memory": 0,     // TODO: Not implemented yet
    "disk": 0,       // TODO: Not implemented yet
    "uptime": 123.45,
    "lastCheck": "2026-01-27T..."
  },
  "timestamp": "2026-01-27T..."
}
```

---

## WebSocket Events

Subscribe to `ws://localhost:5051/ws` for real-time updates.

**Event Types:**

1. `runspace.created` - New runspace created
2. `runspace.updated` - Runspace modified
3. `runspace.deleted` - Runspace deleted
4. `runspace.activated` - Runspace switched to
5. `runspace.suspended` - Runspace suspended

**Event Format:**
```json
{
  "type": "runspace.created",
  "payload": { /* runspace data */ },
  "timestamp": "2026-01-27T..."
}
```

---

## Error Responses

All endpoints return this format on error:

```json
{
  "success": false,
  "error": "Error message here",
  "timestamp": "2026-01-27T..."
}
```

**Common Errors:**
- `404`: Runspace not found
- `500`: Internal server error
- `400`: Bad request (validation error)

---

## Terminal WebSocket

**URL:** `ws://localhost:5051/terminal?runspace=<runspace-id>`

**Query Parameters:**
- `runspace` (string, optional): Runspace ID to connect to. Falls back to active runspace.

**Message Types:**

**Client → Server:**

1. Input:
```json
{ "type": "input", "data": "ls -la\n" }
```

2. Resize:
```json
{ "type": "resize", "cols": 80, "rows": 24 }
```

3. Execute:
```json
{ "type": "execute", "command": "npm test" }
```

**Server → Client:**

1. Output:
```json
{ "type": "output", "data": "command output here" }
```

2. Error:
```json
{ "type": "error", "data": "Error message" }
```

3. Context (enhanced UI features):
```json
{
  "type": "context",
  "data": {
    "currentThought": "Analyzing file...",
    "files": [{ "path": "...", "tokens": 100 }],
    "totalTokens": 100,
    "maxTokens": 200000
  }
}
```

4. Diff (code changes):
```json
{
  "type": "diff",
  "data": {
    "filePath": "src/app.ts",
    "language": "typescript",
    "oldContent": "...",
    "newContent": "...",
    "changes": [...]
  }
}
```

5. Cost (token usage):
```json
{ "type": "cost", "tokens": 1000, "cost": 0.003 }
```

---

## Environment Variables (in PTY)

Every runspace terminal sets these environment variables:

- `FORGE_RUNSPACE_ID` - Unique runspace UUID
- `FORGE_RUNSPACE_NAME` - Machine name
- `FORGE_PROJECT_PATH` - Absolute path to project
- `PS1` - Custom prompt: `\[\033[1;36m\]<displayName>\[\033[0m\] \$ `

---

## Quick Testing Script

```bash
#!/bin/bash

# Create runspace
RUNSPACE=$(curl -s -X POST http://localhost:5051/api/runspaces \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test-project",
    "displayName": "Test Project",
    "path": "/tmp/test-project",
    "backendType": "wsl"
  }' | jq -r '.data.id')

echo "Created runspace: $RUNSPACE"

# List all
curl -s http://localhost:5051/api/runspaces | jq '.data'

# Switch to it
curl -s -X POST http://localhost:5051/api/runspaces/$RUNSPACE/switch | jq

# Check health
curl -s http://localhost:5051/api/runspaces/$RUNSPACE/health | jq

# Delete it
curl -s -X DELETE "http://localhost:5051/api/runspaces/$RUNSPACE?deleteFiles=true" | jq
```

---

**Happy Testing!** 🚀
