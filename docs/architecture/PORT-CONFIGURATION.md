# NXTG-Forge Port Configuration

## 🔌 Dedicated Ports

To avoid conflicts with other applications, NXTG-Forge uses dedicated ports:

| Service | Port | URL |
|---------|------|-----|
| **UI (Frontend)** | **5050** | http://localhost:5050 |
| **API (Backend)** | **5051** | http://localhost:5051 |
| **WebSocket** | **5051** | ws://localhost:5051/ws |

---

## 🎯 Why These Ports?

- **Easy to remember**: Sequential ports (5050, 5051)
- **Distinctive**: Not commonly used by other frameworks
- **No conflicts**: Avoids common ports (3000, 5173, 8080, etc.)
- **CEO-friendly**: Managing multiple products? These won't clash!

---

## 🚀 Quick Start

```bash
# Start both UI + API together
npm run dev

# Access points:
# - UI:        http://localhost:5050
# - API:       http://localhost:5051/api
# - WebSocket: ws://localhost:5051/ws
# - Health:    http://localhost:5051/api/health
```

---

## ⚙️ Configuration Files

### 1. **vite.config.ts** (UI Port)
```typescript
server: {
  port: 5050, // NXTG-Forge dedicated UI port
  open: true,
}
```

### 2. **src/server/api-server.ts** (API Port)
```typescript
const PORT = process.env.PORT || 5051; // NXTG-Forge dedicated API port
```

### 3. **.env** (Environment Variables)
```env
# Ports
PORT=5051              # API Server
VITE_PORT=5050         # UI

# URLs
FRONTEND_URL=http://localhost:5050
VITE_API_URL=http://localhost:5051/api
VITE_WS_URL=ws://localhost:5051/ws
```

---

## 🔧 Changing Ports

Need different ports? Update these 3 files:

1. **vite.config.ts**: Change `server.port`
2. **src/server/api-server.ts**: Change `PORT` default
3. **.env**: Update `PORT` and `VITE_PORT`

Example for ports 6000/6001:
```bash
# .env
PORT=6001
VITE_PORT=6000
FRONTEND_URL=http://localhost:6000
VITE_API_URL=http://localhost:6001/api
VITE_WS_URL=ws://localhost:6001/ws
```

---

## 🌐 Production Deployment

For production, use environment variables:

```bash
# Set via environment
export PORT=80
export VITE_PORT=443
export FRONTEND_URL=https://forge.yourdomain.com
export VITE_API_URL=https://api.forge.yourdomain.com
```

Or use a reverse proxy (nginx/caddy):
```nginx
# nginx example
server {
  listen 80;
  server_name forge.yourdomain.com;

  location / {
    proxy_pass http://localhost:5050;
  }

  location /api {
    proxy_pass http://localhost:5051;
  }

  location /ws {
    proxy_pass http://localhost:5051;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
```

---

## 🐛 Troubleshooting

### Port Already in Use?

**Check what's using the port:**
```bash
# Windows (in PowerShell)
netstat -ano | findstr :5050
netstat -ano | findstr :5051

# Linux/WSL
lsof -i :5050
lsof -i :5051
```

**Kill the process:**
```bash
# Windows (PowerShell as Admin)
Stop-Process -Id <PID> -Force

# Linux/WSL
kill -9 <PID>
```

### Can't Access from Browser?

1. **Check if server is running:**
   ```bash
   curl http://localhost:5050
   curl http://localhost:5051/api/health
   ```

2. **Check WSL networking** (if using WSL on Windows):
   ```bash
   # Get WSL IP
   hostname -I

   # Try accessing via IP instead
   http://<wsl-ip>:5050
   ```

3. **Check firewall settings:**
   - Windows Firewall may block ports
   - Add exception for ports 5050-5051

---

## 📊 Port Usage Summary

```
╔═══════════════════════════════════════════════╗
║         NXTG-Forge Port Allocation            ║
╠═══════════════════════════════════════════════╣
║ 🎨 UI (Vite)          → Port 5050             ║
║ ⚙️  API (Express)      → Port 5051             ║
║ 🔌 WebSocket          → Port 5051/ws          ║
║ 💚 Health Check       → Port 5051/api/health  ║
╚═══════════════════════════════════════════════╝
```

---

## 🎯 CEO Multi-Product Setup

Running multiple products? Here's a suggested port scheme:

| Product | UI Port | API Port |
|---------|---------|----------|
| **NXTG-Forge** | 5050 | 5051 |
| Product A | 5060 | 5061 |
| Product B | 5070 | 5071 |
| Product C | 5080 | 5081 |

Benefits:
- ✅ No port conflicts
- ✅ Easy to remember (increments of 10)
- ✅ Clear organization
- ✅ Can run all simultaneously

---

## 💡 Pro Tips

1. **Add to /etc/hosts** for easier access:
   ```
   127.0.0.1 forge.local
   ```
   Then access: http://forge.local:5050

2. **Bookmark the URLs:**
   - UI: http://localhost:5050
   - API Health: http://localhost:5051/api/health

3. **Use PM2** for production:
   ```bash
   pm2 start npm --name "forge-ui" -- run ui:dev
   pm2 start npm --name "forge-api" -- run server:dev
   ```

---

**Questions?** Check the [QUICK-START.md](./QUICK-START.md) or [INTEGRATION-COMPLETE.md](./docs/INTEGRATION-COMPLETE.md)
