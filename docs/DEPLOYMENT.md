# NXTG-Forge v3 Deployment Guide

Production deployment guide for NXTG-Forge v3 AI-Orchestrated Development System.

## Prerequisites

### System Requirements

- **Node.js**: >= 18.0.0 (specified in package.json engines)
- **npm**: Latest stable version
- **Operating System**: Linux (WSL2), macOS, or Windows
- **Memory**: Minimum 2GB RAM, 4GB recommended
- **Storage**: 500MB for application + node_modules

### Build Tools

For `node-pty` (terminal emulation):
- **Linux/WSL2**: `build-essential`, `python3`
- **macOS**: Xcode Command Line Tools
- **Windows**: Visual Studio Build Tools or windows-build-tools

```bash
# Ubuntu/Debian
sudo apt-get install build-essential python3

# macOS
xcode-select --install

# Windows (PowerShell as Admin)
npm install -g windows-build-tools
```

## Environment Variables

### Core Configuration

Create a `.env` file in the project root. Use `.env.example` as a template:

```bash
cp .env.example .env
```

### Available Environment Variables

#### Port Configuration
```bash
PORT=5051              # API Server port (WebSocket + REST)
VITE_PORT=5050         # UI development server port
```

#### Server Configuration
```bash
NODE_ENV=production    # Environment: development | production | staging
FRONTEND_URL=http://localhost:5050  # Frontend URL for CORS
```

#### API Client Configuration (Development Only)
```bash
# For multi-device access, DO NOT set these in .env
# The UI uses relative URLs (/api, /ws) which are proxied by Vite
# Only set these if you need explicit URL overrides

# VITE_API_URL=http://localhost:5051/api
# VITE_WS_URL=ws://localhost:5051/ws
```

#### Feature Flags
```bash
ENABLE_WEBSOCKET=true     # Enable WebSocket real-time updates
ENABLE_REAL_TIME=true     # Enable real-time activity feed
ENABLE_YOLO_MODE=true     # Enable experimental features
```

#### Logging
```bash
LOG_LEVEL=info            # Log level: error | warn | info | debug
LOG_FILE=logs/forge.log   # Log file path (relative to project root)
```

#### Performance Tuning
```bash
WS_COMPRESSION=true       # Enable WebSocket compression
REQUEST_TIMEOUT=30000     # API request timeout (ms)
SYNC_INTERVAL=5000        # State sync interval (ms)
```

#### Error Tracking (Sentry)
```bash
# Get your DSN from https://sentry.io
SENTRY_DSN=https://your-dsn@sentry.io/project-id          # Server-side tracking
VITE_SENTRY_DSN=https://your-dsn@sentry.io/project-id     # Browser-side tracking (optional)
```

#### Security (Production)
```bash
JWT_SECRET=your-secret-key-here              # JWT signing secret
RATE_LIMIT_WINDOW=900000                     # Rate limit window (ms)
RATE_LIMIT_MAX=100                           # Max requests per window
ALLOWED_ORIGINS=https://yourdomain.com       # Comma-separated allowed origins
```

## Development Setup

### Local Development

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start development servers**
   ```bash
   npm run dev
   ```

   This starts both the API server (port 5051) and Vite UI dev server (port 5050) concurrently.

3. **Access the application**
   - UI: http://localhost:5050
   - API: http://localhost:5051/api
   - API Documentation: http://localhost:5051/api-docs
   - Health Check: http://localhost:5051/api/health

### Port Assignments

| Port | Service | Purpose | Binding |
|------|---------|---------|---------|
| 5050 | Vite UI Dev Server | React frontend (development) | 0.0.0.0 |
| 5051 | API Server | Express + WebSocket | 0.0.0.0 |
| 5173 | Vite (alternate) | Backup UI port | 0.0.0.0 |
| 8003 | Reserved | Future services | 0.0.0.0 |

**Why these ports?**
- Non-standard ports to avoid conflicts with other development tools
- All services bind to `0.0.0.0` for multi-device access (mobile, tablet)

### Manual Start (Without Script)

```bash
# Start API server only
npm run server:dev

# Start UI only
npm run ui:dev

# Start both (raw, no script checks)
npm run dev:raw
```

### Multi-Device Access (WSL2)

To access the UI from mobile devices on your local network:

1. **Get your WSL2 IP address**
   ```bash
   ip addr show eth0 | grep -oP '(?<=inet\s)\d+(\.\d+){3}'
   ```

2. **Configure Windows Firewall** (PowerShell as Admin)
   ```powershell
   New-NetFirewallRule -DisplayName 'NXTG Forge' -Direction Inbound -LocalPort 5050,5051,5173,8003 -Protocol TCP -Action Allow
   ```

3. **Access from mobile device**
   ```
   http://192.168.1.206:5050
   ```

   Replace `192.168.1.206` with your actual WSL2 IP address.

**How it works:**
- Vite proxy forwards `/api/*` and `/ws/*` to `localhost:5051`
- Client uses relative URLs, so it works from any device
- No hardcoded URLs required in `.env`

## Production Build

### Build for Production

1. **Build UI assets**
   ```bash
   npm run build
   ```

   Outputs to `dist-ui/` directory with sourcemaps.

2. **Build server** (optional, if using TypeScript server files)
   ```bash
   npm run build:server
   ```

   Compiles TypeScript server files to `dist/server/`.

3. **Build everything**
   ```bash
   npm run build:all
   ```

   Runs TypeScript compilation + Vite build.

### Verify Build

```bash
# Check build artifacts
ls -la dist-ui/
ls -la dist/server/

# Preview production build locally
npm run preview
```

## Deployment Options

### Option 1: Direct Node.js Deployment

**Best for:** VPS, dedicated servers, simple deployments

1. **Prepare the server**
   ```bash
   # Install Node.js 18+
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs

   # Verify installation
   node --version  # Should be >= 18.0.0
   npm --version
   ```

2. **Deploy application**
   ```bash
   # Clone or upload code
   git clone https://github.com/your-org/nxtg-forge.git
   cd nxtg-forge

   # Install production dependencies
   npm ci --production

   # Build application
   npm run build:all

   # Configure environment
   cp .env.example .env
   nano .env  # Edit for production
   ```

3. **Start the server**
   ```bash
   NODE_ENV=production npm start
   ```

4. **Verify deployment**
   ```bash
   curl http://localhost:5051/api/health
   # Expected: {"status":"healthy","uptime":...}
   ```

### Option 2: Docker Deployment

**Best for:** Containerized environments, cloud platforms, Kubernetes

1. **Create Dockerfile**

   Create `Dockerfile` in project root:

   ```dockerfile
   # Build stage
   FROM node:18-alpine AS builder

   WORKDIR /app

   # Copy package files
   COPY package*.json ./

   # Install dependencies (including devDependencies for build)
   RUN npm ci

   # Copy source code
   COPY . .

   # Build application
   RUN npm run build:all

   # Production stage
   FROM node:18-alpine

   WORKDIR /app

   # Install production dependencies only
   COPY package*.json ./
   RUN npm ci --production

   # Copy built artifacts from builder
   COPY --from=builder /app/dist-ui ./dist-ui
   COPY --from=builder /app/dist ./dist
   COPY .env.example .env.example

   # Create logs directory
   RUN mkdir -p logs

   # Expose ports
   EXPOSE 5051

   # Set environment
   ENV NODE_ENV=production
   ENV PORT=5051

   # Health check
   HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
     CMD node -e "require('http').get('http://localhost:5051/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

   # Start server
   CMD ["npm", "start"]
   ```

2. **Create .dockerignore**

   ```
   node_modules
   dist
   dist-ui
   .env
   logs
   .git
   .claude
   .asif
   .github
   *.log
   ```

3. **Build and run**

   ```bash
   # Build image
   docker build -t nxtg-forge:latest .

   # Run container
   docker run -d \
     --name nxtg-forge \
     -p 5051:5051 \
     -e NODE_ENV=production \
     -e SENTRY_DSN=your-dsn-here \
     -v $(pwd)/logs:/app/logs \
     nxtg-forge:latest

   # Check logs
   docker logs -f nxtg-forge

   # Verify health
   curl http://localhost:5051/api/health
   ```

4. **Docker Compose** (optional)

   Create `docker-compose.yml`:

   ```yaml
   version: '3.8'

   services:
     nxtg-forge:
       build: .
       image: nxtg-forge:latest
       container_name: nxtg-forge
       restart: unless-stopped
       ports:
         - "5051:5051"
       environment:
         NODE_ENV: production
         PORT: 5051
         LOG_LEVEL: info
         ENABLE_WEBSOCKET: "true"
         ENABLE_REAL_TIME: "true"
       volumes:
         - ./logs:/app/logs
         - ./.env:/app/.env
       healthcheck:
         test: ["CMD", "node", "-e", "require('http').get('http://localhost:5051/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
         interval: 30s
         timeout: 3s
         retries: 3
         start_period: 10s
   ```

   ```bash
   docker-compose up -d
   ```

### Option 3: PM2 Process Management

**Best for:** Production servers requiring process monitoring and auto-restart

1. **Install PM2 globally**
   ```bash
   npm install -g pm2
   ```

2. **Create PM2 ecosystem file**

   Create `ecosystem.config.js`:

   ```javascript
   module.exports = {
     apps: [{
       name: 'nxtg-forge',
       script: 'dist/server/api-server.js',
       instances: 1,
       exec_mode: 'cluster',
       watch: false,
       max_memory_restart: '500M',
       env: {
         NODE_ENV: 'production',
         PORT: 5051,
       },
       error_file: 'logs/pm2-error.log',
       out_file: 'logs/pm2-out.log',
       log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
       merge_logs: true,
       autorestart: true,
       max_restarts: 10,
       min_uptime: '10s',
     }]
   };
   ```

3. **Start with PM2**
   ```bash
   # Build application first
   npm run build:all

   # Start with PM2
   pm2 start ecosystem.config.js

   # Save PM2 configuration
   pm2 save

   # Setup PM2 to start on system boot
   pm2 startup
   ```

4. **PM2 Management Commands**
   ```bash
   pm2 list                    # List all processes
   pm2 logs nxtg-forge         # View logs
   pm2 restart nxtg-forge      # Restart application
   pm2 stop nxtg-forge         # Stop application
   pm2 delete nxtg-forge       # Remove from PM2
   pm2 monit                   # Monitor resources
   ```

## Health Checks

### Available Health Endpoints

#### Main Health Check
```bash
curl http://localhost:5051/api/health
```

**Response:**
```json
{
  "status": "healthy",
  "uptime": 123456,
  "timestamp": "2026-02-03T19:30:00.000Z",
  "version": "3.0.0"
}
```

#### State Manager Health
```bash
curl http://localhost:5051/api/state/health
```

**Response:**
```json
{
  "success": true,
  "data": {
    "stateSize": 1234,
    "lastUpdate": "2026-02-03T19:30:00.000Z",
    "isHealthy": true
  }
}
```

#### Worker Pool Health
```bash
curl http://localhost:5051/api/workers/health
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalWorkers": 5,
    "activeWorkers": 3,
    "idleWorkers": 2,
    "queuedTasks": 2,
    "status": "healthy",
    "workers": [...]
  }
}
```

#### Runspace Health (Multi-Project)
```bash
curl http://localhost:5051/api/runspaces/:id/health
```

### Health Check Script

Create `scripts/health-check.sh`:

```bash
#!/bin/bash
# Health check script for monitoring

ENDPOINT="http://localhost:5051/api/health"
TIMEOUT=5

response=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT $ENDPOINT)

if [ "$response" == "200" ]; then
    echo "✅ NXTG-Forge is healthy"
    exit 0
else
    echo "❌ NXTG-Forge is unhealthy (HTTP $response)"
    exit 1
fi
```

```bash
chmod +x scripts/health-check.sh
./scripts/health-check.sh
```

## Monitoring

### Sentry Integration

NXTG-Forge includes built-in Sentry error tracking for both server and browser.

1. **Create Sentry account**
   - Sign up at https://sentry.io
   - Create a new project
   - Copy your DSN

2. **Configure Sentry**
   ```bash
   # .env
   SENTRY_DSN=https://your-key@sentry.io/project-id          # Server-side
   VITE_SENTRY_DSN=https://your-key@sentry.io/project-id     # Browser-side
   ```

3. **Verify integration**
   - Server errors automatically reported to Sentry
   - Browser errors captured with session replay
   - Performance monitoring enabled by default

### Logging

Application logs are managed by Winston:

```bash
# View logs
tail -f logs/forge.log

# View errors only
tail -f logs/forge.log | grep ERROR

# View real-time activity
tail -f logs/forge.log | grep -i "websocket\|agent\|task"
```

### Metrics

Monitor key metrics via API:

```bash
# Worker pool status
curl http://localhost:5051/api/workers/status

# State metrics
curl http://localhost:5051/api/state/health

# Active WebSocket connections
curl http://localhost:5051/api/ws/connections
```

## Troubleshooting

### Port Already in Use

**Problem:** `Error: Port 5051 already in use`

**Solution:**
```bash
# Find process using the port
lsof -i :5051

# Kill the process
kill -9 <PID>

# Or kill all NXTG-Forge processes
pkill -9 -f 'NXTG-Forge/v3'
```

### Build Failures

**Problem:** `node-pty` build fails

**Solution:**
```bash
# Ubuntu/Debian
sudo apt-get install build-essential python3

# macOS
xcode-select --install

# Rebuild node-pty
npm rebuild node-pty
```

**Problem:** TypeScript compilation errors

**Solution:**
```bash
# Clean build
rm -rf dist dist-ui node_modules
npm install
npm run build:all
```

### WebSocket Connection Issues

**Problem:** WebSocket fails to connect from browser

**Solution:**
1. Check firewall allows port 5051
2. Verify API server is running: `curl http://localhost:5051/api/health`
3. Check browser console for CORS errors
4. Ensure `FRONTEND_URL` in `.env` matches your frontend URL

**Problem:** Multi-device access not working (WSL2)

**Solution:**
1. Verify Windows firewall rule exists
2. Ensure `.env` does NOT have hardcoded `VITE_API_URL` or `VITE_WS_URL`
3. Client must use relative URLs (`/api`, `/ws`)
4. Check WSL2 IP hasn't changed: `ip addr show eth0`

### Memory Issues

**Problem:** Application consuming too much memory

**Solution:**
```bash
# Limit worker pool size
# Edit api-server.ts worker pool config
maxWorkers: 10  # Reduce from 20

# Use PM2 with memory limits
pm2 start ecosystem.config.js --max-memory-restart 500M

# Monitor memory usage
pm2 monit
```

### Terminal Sessions Not Persisting

**Problem:** Terminal sessions lost on browser refresh

**Solution:**
1. Verify PTY bridge is running (built into api-server.ts)
2. Check session ID is being stored in browser storage
3. Review logs for PTY errors: `tail -f logs/forge.log | grep PTY`

### Health Check Failures

**Problem:** Health endpoint returns 500 error

**Solution:**
```bash
# Check application logs
tail -n 50 logs/forge.log

# Verify all services initialized
curl http://localhost:5051/api/state/health
curl http://localhost:5051/api/workers/health

# Restart application
pm2 restart nxtg-forge
# or
docker restart nxtg-forge
```

## CI/CD and GitHub Releases

### Release Process

NXTG-Forge uses GitHub Actions for automated releases:

1. **Prepare Release**
   ```bash
   # Run quality checks locally
   npm run quality:gates

   # Verify tests pass
   npm run test -- --run

   # Check security
   npm run audit:security
   ```

2. **Create Release Tag**
   ```bash
   # Update version in package.json
   npm version patch  # or minor, major

   # Push tag to trigger release
   git push --tags
   ```

3. **Manual Release** (Alternative)
   - Go to Actions → "Deploy & Release"
   - Click "Run workflow"
   - Enter version (e.g., `3.0.1`)
   - Optionally mark as pre-release
   - Click "Run workflow"

4. **Verify Release**
   - Check Releases page
   - Download and verify checksums
   - Test installation from release artifacts

### Quality Gates

All releases must pass:

| Gate | Threshold | Enforced |
|------|-----------|----------|
| Tests | 100% pass | ✅ Yes |
| Coverage | ≥85% lines | ✅ Yes |
| Security | 0 critical issues | ✅ Yes |
| Security | ≤5 high issues | ✅ Yes |
| Type Safety | 0 any violations | ✅ Yes |
| Build | Must succeed | ✅ Yes |

## Rollback Procedure

### Manual Rollback

1. **Stop current deployment**
   ```bash
   # PM2
   pm2 stop nxtg-forge

   # Docker
   docker stop nxtg-forge

   # Direct Node.js (find PID)
   ps aux | grep node
   kill <PID>
   ```

2. **Restore previous version**
   ```bash
   # Git-based deployment
   git checkout v3.0.0  # Previous stable tag
   npm ci --production
   npm run build:all

   # Or restore from backup
   cp -r /backups/nxtg-forge-v3.0.0/* .
   ```

3. **Restart services**
   ```bash
   pm2 restart nxtg-forge
   # or
   npm start
   ```

4. **Verify rollback**
   ```bash
   curl http://localhost:5051/api/health
   # Check version in response
   ```

### GitHub Release Rollback

If deployment came from GitHub Releases:

```bash
# Download previous release
VERSION=3.0.0
wget https://github.com/your-org/nxtg-forge/releases/download/v${VERSION}/nxtg-forge-v${VERSION}.tar.gz

# Verify checksum
sha256sum -c nxtg-forge-v${VERSION}.tar.gz.sha256

# Stop current deployment
pm2 stop nxtg-forge

# Backup current version
mv nxtg-forge nxtg-forge-rollback

# Extract previous version
tar -xzf nxtg-forge-v${VERSION}.tar.gz

# Install and start
cd nxtg-forge-v${VERSION}
npm install --production
pm2 start ecosystem.config.js
```

### Emergency Rollback

For critical issues:

```bash
# Immediate: Delete the problematic release
gh release delete vX.Y.Z --yes

# Delete the tag
git tag -d vX.Y.Z
git push origin :refs/tags/vX.Y.Z

# Or mark as pre-release (hides from latest)
gh release edit vX.Y.Z --prerelease
```

## Production Checklist

Before deploying to production:

- [ ] Environment variables configured in `.env`
- [ ] `NODE_ENV=production` set
- [ ] Sentry DSN configured (optional but recommended)
- [ ] Firewall rules allow ports 5050, 5051
- [ ] Health check endpoints verified
- [ ] Logs directory exists and is writable
- [ ] SSL/TLS configured (via reverse proxy if needed)
- [ ] Backup strategy in place
- [ ] Monitoring configured (Sentry, health checks)
- [ ] PM2 or Docker restart policy configured
- [ ] Load balancer health checks point to `/api/health`
- [ ] Database/state persistence configured (if applicable)

## Reverse Proxy (Nginx Example)

For production, use a reverse proxy with SSL:

```nginx
server {
    listen 80;
    server_name forge.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name forge.yourdomain.com;

    ssl_certificate /etc/ssl/certs/forge.crt;
    ssl_certificate_key /etc/ssl/private/forge.key;

    # Serve static UI files
    location / {
        root /var/www/nxtg-forge/dist-ui;
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests
    location /api {
        proxy_pass http://localhost:5051;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket proxy
    location /ws {
        proxy_pass http://localhost:5051;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }

    # Terminal WebSocket
    location /terminal {
        proxy_pass http://localhost:5051;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }
}
```

## Support

For deployment issues:
- Check logs: `tail -f logs/forge.log`
- Review troubleshooting section above
- Check GitHub Issues: https://github.com/your-org/nxtg-forge/issues
- Consult API documentation: http://localhost:5051/api-docs

---

**Version:** 3.0.0
**Last Updated:** 2026-02-03
