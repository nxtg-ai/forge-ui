#!/bin/bash
# NXTG-Forge Development Server Startup
# Ensures clean, deterministic port binding

set -e

UI_PORT=5050
API_PORT=5051

echo "=== NXTG-Forge Dev Server ==="
echo ""

# Check if ports are in use
check_port() {
    local port=$1
    local name=$2
    if ss -tlnp 2>/dev/null | grep -q ":${port} "; then
        echo "ERROR: Port ${port} (${name}) is already in use!"
        echo ""
        echo "Run this to safely kill Forge dev servers:"
        echo "  pkill -9 -f 'NXTG-Forge/v3'"
        echo ""
        exit 1
    fi
}

echo "Checking ports..."
check_port $UI_PORT "UI/Vite"
check_port $API_PORT "API Server"
echo "  Port ${UI_PORT} (UI): Available"
echo "  Port ${API_PORT} (API): Available"
echo ""

# Verify .env doesn't have hardcoded URLs
if grep -q "^VITE_API_URL=" .env 2>/dev/null; then
    if ! grep -q "^#.*VITE_API_URL=" .env; then
        echo "WARNING: .env has hardcoded VITE_API_URL - multi-device access may break"
    fi
fi

echo "Starting servers..."
echo "  UI:  http://localhost:${UI_PORT}"
echo "  API: http://localhost:${API_PORT}"
echo ""
echo "To stop: Ctrl+C or pkill -9 -f 'NXTG-Forge/v3'"
echo ""

# Start with concurrently
exec npx concurrently \
    --names "API,UI" \
    --prefix-colors "blue,magenta" \
    "npm run server:dev" \
    "npm run ui:dev"
