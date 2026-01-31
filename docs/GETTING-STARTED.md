# Getting Started with NXTG Forge

## Installation

### Prerequisites

- Node.js 18+ installed
- Claude Desktop with .claude directory support
- Git for version control

### Step 1: Clone and Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/nxtg-forge.git
cd nxtg-forge

# Run initialization
./nxtg-init.sh

# Install dependencies
npm install
```

### Step 2: Initialize in Your Project

Navigate to your project directory and run:

```bash
/nxtg-init
```

This will:
- Create .claude directory structure
- Initialize state management
- Set up forge configuration

## Your First Feature

### Adding a Feature

```bash
/nxtg-feature "User Authentication"
```

The Forge orchestrator will:
1. Analyze requirements
2. Plan implementation
3. Create necessary files
4. Implement business logic
5. Add tests

### Checking Status

```bash
/nxtg-status
```

Shows:
- Current features
- Implementation progress
- Project health
- Next recommended actions

## Understanding Agents

NXTG Forge uses two primary agents:

### Orchestrator
- Manages overall workflow
- Coordinates between agents
- Tracks state and progress

### Architect
- Designs system architecture
- Plans implementation details
- Ensures code quality

## State Management

Forge automatically tracks:
- Features and their status
- Tasks and dependencies
- File changes
- Session history

State is stored in `.claude/state.json` and managed automatically.

## Best Practices

1. **Start Small** - Begin with simple features
2. **Review Output** - Always review AI-generated code
3. **Iterate** - Use feedback to improve results
4. **Track Progress** - Use `/nxtg-status` regularly
5. **Generate Reports** - Use `/nxtg-report` for documentation

## Troubleshooting

### Initialization Fails
- Ensure Node.js 18+ is installed
- Check write permissions in directory
- Verify .claude directory isn't corrupted

### Commands Not Working
- Ensure you're in a Forge-initialized project
- Check Claude Desktop recognizes .claude directory
- Verify command files exist in .claude/commands/

### State Issues
- State file may be corrupted
- Delete `.claude/state.json` and reinitialize
- Check for file permission issues

### Multi-Device Access (Mobile/Tablet/Other PCs)

**Problem**: API calls fail with CORS errors when accessing from devices other than localhost.

**Root Cause**: Hardcoded `localhost` URLs in `.env` file override dynamic URL detection.

**Solution**:
1. Comment out hardcoded API URLs in `.env`:
   ```bash
   # Client - URLs are dynamically determined based on window.location
   # VITE_API_URL=http://localhost:5051/api
   # VITE_WS_URL=ws://localhost:5051/ws
   ```

2. Ensure servers bind to `0.0.0.0`:
   ```typescript
   // vite.config.ts
   server: {
     host: '0.0.0.0',
     port: 5050
   }
   ```

3. Use Vite's proxy for API calls (relative URLs like `/api/...`):
   ```typescript
   // vite.config.ts
   proxy: {
     '/api': {
       target: 'http://localhost:5051',
       changeOrigin: true
     }
   }
   ```

**Why This Works**: Relative URLs (`/api/endpoint`) are served through Vite on the same host the browser accessed. Vite proxies these to the actual API server, avoiding CORS issues entirely.

**Pattern**: Never hardcode `localhost` in client-side code or env vars. Use relative URLs + proxy in development, or dynamic `window.location.host` detection.

## Next Steps

- Explore [ARCHITECTURE.md](ARCHITECTURE.md) for technical details
- Review agent documentation in `.claude/agents/`
- Join our community for support and updates

---

Need help? Open an issue on GitHub or reach out to the community.