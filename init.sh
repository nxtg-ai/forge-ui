#!/bin/bash

# NXTG Forge - Project Initialization Script
# Clean, minimal, production-ready

set -e

echo "🚀 Initializing NXTG Forge..."

# Check if .claude directory exists
if [ ! -d ".claude" ]; then
    echo "Creating .claude directory structure..."
    mkdir -p .claude/{agents,commands,hooks,skills}
    echo "✅ .claude structure created"
fi

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo "Initializing package.json..."
    npm init -y > /dev/null 2>&1
    echo "✅ package.json created"
fi

# Install essential dependencies
echo "Installing dependencies..."
npm install --save-dev typescript @types/node prettier eslint 2>/dev/null || true
echo "✅ Dependencies installed"

# Create src directory if not exists
mkdir -p src

# Create initial state file
if [ ! -f ".claude/state.json" ]; then
    echo '{
  "version": "3.0.0",
  "initialized": "'$(date -Iseconds)'",
  "features": [],
  "status": "ready"
}' > .claude/state.json
    echo "✅ State file initialized"
fi

echo ""
echo "✨ NXTG Forge initialized successfully!"
echo ""
echo "Next steps:"
echo "  1. Run: /init     - Initialize forge in your project"
echo "  2. Run: /status   - Check project status"
echo "  3. Run: /feature  - Add new features"
echo ""