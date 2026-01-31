# NXTG-Forge Quick Start

## 1. Start Servers

```bash
# Kill any existing processes first (important!)
pkill -f "vite|tsx.*api-server" 2>/dev/null; sleep 1

# Start both UI and API servers
npm run dev

# Or start separately:
npm run server:dev  # API on port 5051
npm run ui:dev      # UI on port 5050
```

**If you see "Port in use" errors:** Run the pkill command above first.

## 2. Verify Everything is Running

```bash
# Check ports are listening
ss -tlnp | grep -E '5050|5051'

# Expected output:
# LISTEN 0.0.0.0:5050 (Vite UI)
# LISTEN 0.0.0.0:5051 (API Server)

# Test API health
curl http://localhost:5050/api/health
```

## 3. Access Locally

- **UI:** http://localhost:5050
- **API:** http://localhost:5051 (proxied through UI at /api)

---

## Multi-Device / LAN Access (WSL2)

### One-Time Setup (Run as Admin in PowerShell)

```powershell
# Option A: Run the setup script
.\scripts\setup-wsl2-mobile-access.ps1

# Option B: Manual setup
$wslIp = (wsl hostname -I).Split()[0]

# Port forwarding
netsh interface portproxy add v4tov4 listenport=5050 listenaddress=0.0.0.0 connectport=5050 connectaddress=$wslIp
netsh interface portproxy add v4tov4 listenport=5051 listenaddress=0.0.0.0 connectport=5051 connectaddress=$wslIp

# Firewall rule (REQUIRED!)
New-NetFirewallRule -DisplayName 'NXTG Forge' -Direction Inbound -LocalPort 5050,5051,5173,8003 -Protocol TCP -Action Allow
```

### Get Your LAN IP

```powershell
# PowerShell
(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -match 'Ethernet|Wi-Fi' }).IPAddress
```

### Access from Phone/Other PC

```
http://<YOUR_WINDOWS_IP>:5050
```

Example: `http://192.168.1.206:5050`

### Verify Port Forwarding

```powershell
netsh interface portproxy show v4tov4
```

### Remove Setup (When Done)

```powershell
.\scripts\setup-wsl2-mobile-access.ps1 -Remove
# Or: netsh interface portproxy reset
```

---

## Troubleshooting

### "Connection Issues" on Remote Device

1. **Check servers are running:** `ss -tlnp | grep 505`
2. **Check firewall rule exists:** `Get-NetFirewallRule -DisplayName 'NXTG Forge'`
3. **Check port forwarding:** `netsh interface portproxy show v4tov4`
4. **Verify .env doesn't hardcode URLs:** `VITE_API_URL` and `VITE_WS_URL` should be commented out

### API Server Crashes

```bash
# Restart API server
npm run server:dev
```

### WSL2 IP Changed (After Reboot)

Re-run the setup script or update port forwarding manually.

---

## Port Reference

| Port | Service | Purpose |
|------|---------|---------|
| 5050 | Vite | UI + API Proxy |
| 5051 | API Server | Backend + WebSocket |
| 5173 | Vite (alt) | Alternative UI port |
| 8003 | Reserved | Future use |

---

## Quick Health Check

```bash
# All-in-one diagnostic
echo "=== Ports ===" && ss -tlnp | grep -E '5050|5051' && \
echo "=== API Health ===" && curl -s http://localhost:5050/api/health | head -c 100
```
