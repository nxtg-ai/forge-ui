#!/bin/bash
# Setup Git Hooks for NXTG-Forge
# Ensures clean commits without artifacts

echo "🔗 Setting up Git hooks for NXTG-Forge..."

# Get project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Create hooks directory if it doesn't exist
mkdir -p "$PROJECT_ROOT/.git/hooks"

# Copy pre-commit hook
if [ -f "$PROJECT_ROOT/.github/hooks/pre-commit" ]; then
    cp "$PROJECT_ROOT/.github/hooks/pre-commit" "$PROJECT_ROOT/.git/hooks/pre-commit"
    chmod +x "$PROJECT_ROOT/.git/hooks/pre-commit"
    echo "✅ Pre-commit hook installed"
else
    echo "⚠️  Pre-commit hook not found at .github/hooks/pre-commit"
fi

echo ""
echo "Git hooks setup complete!"
echo "The pre-commit hook will prevent accidental commits of:"
echo "  • State files (state.json, .state.json)"
echo "  • Build artifacts (__pycache__, *.pyc, dist/, etc.)"