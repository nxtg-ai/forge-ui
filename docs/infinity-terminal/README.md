# Infinity Terminal - User Guide

**Persistent Terminal Sessions for NXTG-Forge**

The Infinity Terminal transforms NXTG-Forge into a persistent, multi-device development environment supporting **20 parallel AI agents** with seamless session continuity.

---

## Quick Start

### 1. Setup (First Time)

```bash
# Install Zellij and ttyd
./scripts/setup-infinity-terminal.sh

# Verify installation
zellij --version  # Should show 0.42+
ttyd --version    # Should show 1.7+
```

### 2. Start the Terminal

```bash
# Start with default layout
./scripts/start-infinity-terminal.sh

# Start with web access (opens browser)
./scripts/start-infinity-terminal.sh --web

# Use a custom layout
./scripts/start-infinity-terminal.sh --layout forge-parallel
```

### 3. Access via Web

Once running, access your terminal from any device:

- **Local:** `http://localhost:7681`
- **Network:** Share via QR code (see Device Pairing below)

---

## Features

### Session Persistence

Sessions survive browser refreshes, network drops, and device switches:

- Close your laptop → Reopen → Resume exactly where you left off
- Start on desktop → Continue on tablet → Monitor from phone
- Long-running agent tasks continue even when disconnected

### Parallel Agent Execution

Run up to 20 AI agents simultaneously:

```typescript
// Submit a task to the worker pool
const taskId = await pool.submitTask({
  type: 'claude-code',
  priority: 'high',
  payload: {
    prompt: 'Implement the user authentication module',
    workingDirectory: '/src/auth'
  }
});
```

### Multi-Device Access

Share your session across devices:

1. Click **Share** in the terminal header
2. Scan the QR code with your mobile device
3. Or copy the session link

### Governance HUD Integration

Real-time visibility into agent operations:

- **Worker Pool Metrics:** Utilization, queue depth, health status
- **Agent Activity Feed:** Live stream of task events
- **Impact Matrix:** Worker assignments per workstream

---

## Configuration

### Runtime Configuration

Edit `.claude/infinity-terminal.yaml`:

```yaml
infinity_terminal:
  enabled: true

  ttyd:
    port: 7681
    interface: "127.0.0.1"  # Change to "0.0.0.0" for network access
    ssl: true

  workers:
    initial_pool_size: 5
    max_pool_size: 20
    memory_limit_mb: 512

  session:
    auto_save: true
    recovery_enabled: true
```

### Zellij Layouts

Create custom layouts in `layouts/`:

```kdl
// layouts/my-layout.kdl
layout {
    pane split_direction="horizontal" {
        pane size="60%" name="Terminal 1" { focus true }
        pane size="40%" name="Terminal 2"
    }
}
```

Use with:
```bash
./scripts/start-infinity-terminal.sh --layout my-layout
```

---

## Mobile Usage

### WSL2 Setup (Windows)

If running NXTG-Forge on WSL2, extra steps are required for mobile access:

**1. Get your Windows LAN IP:**
```powershell
# In PowerShell
(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -eq 'Ethernet' -or $_.InterfaceAlias -eq 'Wi-Fi' }).IPAddress
```

**2. Get your WSL2 IP:**
```bash
# In WSL2
hostname -I | awk '{print $1}'
```

**3. Set up port forwarding (Run PowerShell as Admin):**
```powershell
# Get your WSL2 IP first
$wslIp = (wsl hostname -I).Split()[0]
Write-Host "WSL2 IP: $wslIp"

# Forward all NXTG-Forge ports
netsh interface portproxy add v4tov4 listenport=5050 listenaddress=0.0.0.0 connectport=5050 connectaddress=$wslIp
netsh interface portproxy add v4tov4 listenport=5051 listenaddress=0.0.0.0 connectport=5051 connectaddress=$wslIp
netsh interface portproxy add v4tov4 listenport=5173 listenaddress=0.0.0.0 connectport=5173 connectaddress=$wslIp
netsh interface portproxy add v4tov4 listenport=8003 listenaddress=0.0.0.0 connectport=8003 connectaddress=$wslIp

# Add firewall rule (REQUIRED - without this, mobile access won't work!)
New-NetFirewallRule -DisplayName 'NXTG Forge' -Direction Inbound -LocalPort 5050,5051,5173,8003 -Protocol TCP -Action Allow
```

> **Important:** The firewall rule is essential. Port forwarding alone won't work without it.

**4. Start the dev server with network access:**
```bash
# In WSL2 - run these in your terminal
npm run server:dev &
npx vite --host 0.0.0.0 --port 5050
```

**5. Access from your phone:**
```
http://<WINDOWS_LAN_IP>:5050
```

> **Note:** Your phone must be on the same WiFi network. If your router has AP/Client isolation enabled, device-to-device communication will be blocked.

**Verify port forwarding:**
```powershell
netsh interface portproxy show v4tov4
```

**Remove port forwarding (when done):**
```powershell
netsh interface portproxy reset
```

---

### Touch Gestures

| Gesture | Action |
|---------|--------|
| Double-tap | Toggle fullscreen |
| Pinch | Zoom (font size) |
| Swipe up | Show HUD |
| Swipe down | Hide HUD |
| Long-press | Context menu |

### Keyboard Toolbar

The mobile view includes a keyboard toolbar with common keys:

- Tab, Escape, Ctrl
- Arrow keys (↑ ↓ ← →)

---

## API Endpoints

### Worker Pool

```
POST /api/workers/init         Initialize the worker pool
GET  /api/workers              Get pool status and metrics
POST /api/workers/tasks        Submit a new task
GET  /api/workers/tasks/:id    Get task status
DELETE /api/workers/tasks/:id  Cancel a task
POST /api/workers/scale/up     Add workers
POST /api/workers/scale/down   Remove workers
GET  /api/workers/health       Health check
POST /api/workers/shutdown     Shutdown pool
```

### Example: Submit a Task

```bash
curl -X POST http://localhost:5050/api/workers/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "type": "shell",
    "priority": "high",
    "payload": {
      "command": "npm run build"
    }
  }'
```

---

## Troubleshooting

### Terminal won't connect

1. Check if ttyd is running:
   ```bash
   ps aux | grep ttyd
   ```

2. Check the port:
   ```bash
   curl -I http://localhost:7681
   ```

3. Restart the service:
   ```bash
   ./scripts/start-infinity-terminal.sh --restart
   ```

### Session lost after disconnect

1. Check Zellij sessions:
   ```bash
   zellij list-sessions
   ```

2. Attach manually:
   ```bash
   zellij attach <session-name>
   ```

### Worker pool not scaling

1. Check pool metrics:
   ```bash
   curl http://localhost:5050/api/workers/metrics
   ```

2. View logs:
   ```bash
   cat .claude/logs/worker-pool.log
   ```

### Mobile display issues

1. Clear browser cache
2. Try landscape orientation
3. Use Chrome or Safari for best compatibility

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT DEVICES                            │
│   Desktop (xl+) │ Tablet (md-lg) │ Mobile (xs-sm)           │
└────────┬────────────────┬──────────────────┬────────────────┘
         │                │                  │
         └────────────────┴──────────────────┘
                          │
                    WebSocket (TLS)
                          │
         ┌────────────────┴────────────────┐
         │        ttyd (Port 7681)         │
         │     "The WebSocket Bridge"      │
         └────────────────┬────────────────┘
                          │
         ┌────────────────┴────────────────┐
         │   Zellij Session Manager        │
         │   ┌──────┬──────┬──────┐        │
         │   │Claude│Oracle│ HUD  │        │
         │   │ Code │      │      │        │
         │   └──────┴──────┴──────┘        │
         └────────────────┬────────────────┘
                          │
         ┌────────────────┴────────────────┐
         │     Agent Worker Pool           │
         │   [Worker 1..20 Processes]      │
         └─────────────────────────────────┘
```

---

## Security Notes

- **Always bind to localhost** in development
- Use **JWT authentication** in production
- Never expose ttyd directly to the internet
- Agent commands are sandboxed with command blocklists

See `docs/specs/INFINITY-TERMINAL-SPEC.md` for full security requirements.

---

## Component Reference

| Component | Purpose |
|-----------|---------|
| `InfinityTerminal` | Main terminal component with xterm.js |
| `MobileTerminalView` | Touch-optimized mobile interface |
| `DevicePairing` | QR code sharing modal |
| `TerminalPaneSwitcher` | Layout controls |
| `WorkerPoolMetrics` | Pool monitoring widget |
| `AgentActivityFeed` | Real-time event stream |
| `useTouchGestures` | Touch interaction hook |
| `useSessionPersistence` | Session management hook |
| `useResponsiveLayout` | Breakpoint detection hook |

---

## Related Documentation

- [Technical Specification](../specs/INFINITY-TERMINAL-SPEC.md)
- [Agent Worker Pool Architecture](../architecture/agent-worker-pool.md)
- [Getting Started](../GETTING-STARTED.md)

---

*NXTG-Forge Infinity Terminal v1.0.0*
