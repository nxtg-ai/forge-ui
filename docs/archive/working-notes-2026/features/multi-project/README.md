# Multi-Project Runspace System

**Version**: 1.0.0
**Status**: ✅ Production Ready (Phase 1 Complete)
**Release Date**: 2026-01-27

---

## 📖 Overview

The Multi-Project Runspace System enables you to manage multiple projects simultaneously within a single NXTG-Forge instance. Switch between projects in <100ms with complete isolation of vision, state, MCP configuration, and terminal sessions.

**Vision**: ONE NXTG FORGE TO RULE THEM ALL

---

## 📚 Documentation

### Getting Started
1. **[Architecture Overview](./MULTI-PROJECT-ARCHITECTURE.md)** - Complete system design and architecture
2. **[Testing Guide](./PHASE-1-IMPLEMENTATION-SUMMARY.md)** - Hands-on guide with examples
3. **[API Reference](../../api/RUNSPACE-API.md)** - Complete REST API documentation

### Release Information
4. **[Changelog v1.0](./CHANGELOG-v1.0-RUNSPACES.md)** - Release notes and version history

---

## 🚀 Quick Start

### 1. Create Your First Runspace

```bash
curl -X POST http://localhost:5051/api/runspaces \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-project",
    "displayName": "My Awesome Project",
    "path": "/home/user/projects/my-app",
    "backendType": "wsl",
    "tags": ["web", "typescript"],
    "icon": "🚀",
    "color": "#8B5CF6"
  }'
```

### 2. List All Runspaces

```bash
curl http://localhost:5051/api/runspaces
```

### 3. Switch to a Runspace

```bash
curl -X POST http://localhost:5051/api/runspaces/<runspace-id>/switch
```

### 4. Open UI

Navigate to `http://localhost:5050` and see the **ProjectSwitcher** in the header!

---

## 🎯 Key Features

### ✅ Phase 1 (Shipped)
- Create unlimited project runspaces
- <100ms context switching
- Isolated terminal sessions per project
- Per-project vision, state, and MCP config
- Visual project selector in UI
- Complete REST API (10 endpoints)
- WebSocket events for real-time updates
- WSL backend for fast local execution

### 🔜 Phase 2 (Planned)
- Project creation wizard
- "Manage Projects" view
- Project templates
- Auto-detect existing projects
- Runspace cloning
- Quick switcher (Cmd+K)
- Advanced health monitoring

### 🚧 Phase 3 (Future)
- Container backend (Docker isolation)
- VM backend (enterprise isolation)
- Cloud sync
- Project groups/workspaces
- Snapshot/restore

---

## 📁 File Structure

### Global Registry
```
~/.forge/
├── projects.json          # Registry of all runspaces
├── cache/                 # Shared caches
└── logs/                  # System logs
```

### Per-Project
```
{project}/.forge/
├── vision.json            # Project vision
├── state.json             # Current state
├── mcp-config.json        # MCP servers
├── history/               # Decision history
└── .gitignore             # Auto-generated
```

---

## 🔌 API Endpoints

**Base URL**: `http://localhost:5051/api`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/runspaces` | Create runspace |
| GET | `/runspaces` | List all runspaces |
| GET | `/runspaces/:id` | Get runspace details |
| PUT | `/runspaces/:id` | Update runspace |
| DELETE | `/runspaces/:id` | Delete runspace |
| POST | `/runspaces/:id/switch` | Switch to runspace |
| POST | `/runspaces/:id/start` | Start runspace |
| POST | `/runspaces/:id/stop` | Stop runspace |
| POST | `/runspaces/:id/suspend` | Suspend runspace |
| GET | `/runspaces/:id/health` | Get health status |

**Full API Reference**: See [RUNSPACE-API.md](../../api/RUNSPACE-API.md)

---

## 🎨 UI Components

### ProjectSwitcher
**Location**: Header, between logo and navigation
**File**: `src/components/ProjectSwitcher.tsx`

**Features**:
- Dropdown with all runspaces
- Status indicators (🟢 active, 🟡 suspended, ⚪ stopped)
- Visual color coding and icons
- Quick actions: "New Project", "Manage Projects"

---

## 🔧 Core Implementation

### Architecture
- **RunspaceManager** (`src/core/runspace-manager.ts`) - Central orchestrator
- **WSL Backend** (`src/core/backends/wsl-backend.ts`) - Fast local execution
- **PTY Bridge** (`src/server/pty-bridge.ts`) - Multi-session terminal support
- **API Server** (`src/server/api-server.ts`) - REST endpoints + WebSocket

### Type Definitions
```typescript
interface Runspace {
  id: string;                    // UUID
  name: string;                  // Machine name
  displayName: string;           // Human-friendly
  path: string;                  // Absolute path
  backendType: 'wsl' | 'container' | 'vm';
  status: 'active' | 'suspended' | 'stopped';
  vision?: VisionData;
  state?: ProjectState;
  mcpConfig?: MCPConfiguration;
  tags: string[];
  color?: string;
  icon?: string;
}
```

---

## 📊 Performance

- **Runspace creation**: ~50ms
- **Switch time**: <100ms (WSL backend)
- **Memory per runspace**: ~50MB
- **Disk per runspace**: ~1MB
- **Concurrent runspaces tested**: 10+

---

## 🔐 Security

### WSL Backend (Phase 1)
- ✅ Process isolation
- ⚠️ Filesystem access (same user)
- ✅ Environment variables
- ⚠️ Network (shared)

### Future Backends
- **Container**: Full filesystem and network isolation
- **VM**: Complete OS-level isolation

---

## 🐛 Troubleshooting

### "No active runspace" error
**Solution**: Create and switch to a runspace first.

### ProjectSwitcher not showing
**Check**:
1. API server running: `curl http://localhost:5051/api/health`
2. Browser console for errors
3. Runspaces exist: `curl http://localhost:5051/api/runspaces`

### Terminal not connecting
**Check**:
1. Runspace exists and is active
2. WebSocket URL includes `?runspace=<id>`
3. API server logs for PTY bridge errors

---

## 📖 Learn More

### For Developers
- Start: [Testing Guide](./PHASE-1-IMPLEMENTATION-SUMMARY.md)
- Reference: [API Documentation](../../api/RUNSPACE-API.md)
- Deep Dive: [Architecture](./MULTI-PROJECT-ARCHITECTURE.md)

### For Architects
- Start: [Architecture](./MULTI-PROJECT-ARCHITECTURE.md)
- Reference: [Changelog](./CHANGELOG-v1.0-RUNSPACES.md)

### For QA/Testers
- Start: [Testing Guide](./PHASE-1-IMPLEMENTATION-SUMMARY.md)

---

## 🤝 Contributing

Want to contribute to Phase 2? Read:
1. [Architecture](./MULTI-PROJECT-ARCHITECTURE.md) - Understand the system
2. [Changelog](./CHANGELOG-v1.0-RUNSPACES.md) - See what's next
3. Submit proposals for new features

---

## 📜 Version History

- **v1.0.0** (2026-01-27) - Initial release
  - Multi-project runspace management
  - WSL backend
  - Complete API integration
  - UI integration
  - **Status**: ✅ Production Ready

---

**Built with ❤️ by NXTG-Forge Team** 🚀
