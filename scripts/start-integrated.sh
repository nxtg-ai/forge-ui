#!/bin/bash

# NXTG-Forge Integrated Startup Script
# Launches both backend API server and frontend with full integration

set -e

echo "═══════════════════════════════════════════════════════════════════"
echo "           NXTG-FORGE INTEGRATED SYSTEM STARTUP"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check dependencies
echo -e "${BLUE}Checking dependencies...${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed${NC}"
    exit 1
fi

# Install packages if needed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
fi

# Environment setup
echo -e "${BLUE}Setting up environment...${NC}"

# Create .env if it doesn't exist
if [ ! -f ".env" ]; then
    cat > .env << 'EOF'
# NXTG-Forge Environment Configuration
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173
VITE_API_URL=http://localhost:3000/api
VITE_WS_URL=ws://localhost:3000/ws

# Logging
LOG_LEVEL=info
LOG_FILE=forge.log

# Features
ENABLE_WEBSOCKET=true
ENABLE_REAL_TIME=true
ENABLE_YOLO_MODE=true
EOF
    echo -e "${GREEN}Created .env file${NC}"
fi

# Create necessary directories
mkdir -p dist
mkdir -p logs
mkdir -p .claude/state

# Build TypeScript if needed
if [ ! -d "dist" ] || [ -z "$(ls -A dist)" ]; then
    echo -e "${YELLOW}Building TypeScript...${NC}"
    npm run build:server 2>/dev/null || npx tsc
fi

# Start services
echo ""
echo -e "${GREEN}Starting NXTG-Forge Services...${NC}"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down services...${NC}"
    kill $(jobs -p) 2>/dev/null || true
    echo -e "${GREEN}Services stopped${NC}"
}

trap cleanup EXIT INT TERM

# Start API server
echo -e "${BLUE}Starting API Server on port 3000...${NC}"
npm run server:dev &
SERVER_PID=$!

# Wait for server to start
echo -e "${BLUE}Waiting for API server to be ready...${NC}"
for i in {1..10}; do
    if curl -s http://localhost:3000/api/health > /dev/null; then
        echo -e "${GREEN}✓ API Server ready${NC}"
        break
    fi
    sleep 1
done

# Start frontend
echo -e "${BLUE}Starting Frontend on port 5173...${NC}"
npm run ui:dev &
UI_PID=$!

# Wait for frontend to start
echo -e "${BLUE}Waiting for frontend to be ready...${NC}"
sleep 3

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo -e "${GREEN}         NXTG-FORGE IS READY!${NC}"
echo "═══════════════════════════════════════════════════════════════════"
echo ""
echo "  Frontend:    http://localhost:5173"
echo "  API Server:  http://localhost:3000"
echo "  WebSocket:   ws://localhost:3000/ws"
echo "  Health:      http://localhost:3000/api/health"
echo ""
echo "  Press Ctrl+C to stop all services"
echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo ""

# Keep script running
wait $SERVER_PID $UI_PID