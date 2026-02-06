#!/usr/bin/env bash
# NXTG-Forge: Browser Debugging Setup
#
# NOTE: Chrome DevTools MCP has WSL2 NAT networking issues.
# We use Playwright MCP instead (configured in .mcp.json).
# Playwright runs its own headless Chromium inside WSL — no networking needed.
#
# This script is kept for reference if running on native Linux or macOS.
#
# For WSL users: Playwright MCP is already configured. Just ensure servers are running:
#   npx tsx src/server/api-server.ts &   # API on port 5051
#   npx vite --host 0.0.0.0 --port 5050 &  # UI on port 5050
#
# Then in Claude Code, the Playwright tools are available automatically.

set -euo pipefail

echo "=== NXTG-Forge Browser Debugging ==="
echo ""
echo "Checking servers..."

if curl -sf http://localhost:5051/api/health >/dev/null 2>&1; then
    echo "  API Server (5051): UP"
else
    echo "  API Server (5051): DOWN - start with: npx tsx src/server/api-server.ts"
fi

if curl -sf http://localhost:5050 >/dev/null 2>&1; then
    echo "  Vite UI (5050): UP"
else
    echo "  Vite UI (5050): DOWN - start with: npx vite --host 0.0.0.0 --port 5050"
fi

echo ""
echo "Playwright MCP is configured in .mcp.json"
echo "It runs headless Chromium inside WSL automatically."
echo ""
echo "In Claude Code, you can now ask:"
echo "  - 'Check the browser console for errors'"
echo "  - 'Take a screenshot of the UI'"
echo "  - 'Navigate to the Command Center and click Forge Status'"
