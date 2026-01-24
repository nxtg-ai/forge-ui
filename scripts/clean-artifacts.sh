#!/bin/bash
# NXTG-Forge Clean Artifacts Script
# Purpose: Remove all generated artifacts for clean installation experience
# This ensures users clone a pristine repository without any build artifacts

set -e

echo "🧹 NXTG-Forge Artifact Cleanup"
echo "================================"
echo ""

# Get the project root (parent of scripts directory)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

echo "📍 Cleaning artifacts in: $PROJECT_ROOT"
echo ""

# Counter for cleaned items
CLEANED_COUNT=0

# Function to safely remove items
safe_remove() {
    local item="$1"
    local type="$2"

    if [ -e "$item" ]; then
        echo "  ✓ Removing $type: $item"
        rm -rf "$item"
        ((CLEANED_COUNT++))
    fi
}

echo "🔍 Searching for artifacts to clean..."
echo ""

# 1. Python build artifacts
echo "📦 Python Build Artifacts:"
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find . -type f -name "*.pyc" -delete 2>/dev/null || true
find . -type f -name "*.pyo" -delete 2>/dev/null || true
find . -type f -name "*.pyd" -delete 2>/dev/null || true
find . -type f -name ".coverage" -delete 2>/dev/null || true
find . -type f -name "*.egg-info" -exec rm -rf {} + 2>/dev/null || true
find . -type f -name "*.egg" -delete 2>/dev/null || true
echo "  ✓ Python artifacts cleaned"

# 2. Build directories
echo ""
echo "🏗️  Build Directories:"
safe_remove "dist" "distribution directory"
safe_remove "build" "build directory"
safe_remove "htmlcov" "coverage HTML reports"
safe_remove "nxtg_forge.egg-info" "egg info directory"
safe_remove ".eggs" "eggs directory"

# 3. Testing artifacts
echo ""
echo "🧪 Testing Artifacts:"
safe_remove ".pytest_cache" "pytest cache"
safe_remove ".coverage" "coverage data"
safe_remove ".tox" "tox environments"
safe_remove ".hypothesis" "hypothesis data"

# 4. Type checking and linting
echo ""
echo "🔍 Type Checking & Linting:"
safe_remove ".mypy_cache" "mypy cache"
safe_remove ".ruff_cache" "ruff cache"
safe_remove ".pytype" "pytype cache"

# 5. State files (CRITICAL for clean install)
echo ""
echo "💾 State Files:"
safe_remove ".claude/state.json" "Claude state file"
safe_remove ".claude/forge/state.json" "Forge state file"
safe_remove ".nxtg-forge/state.json" "NXTG state file"
safe_remove "state.json" "root state file"
safe_remove ".state.json" "hidden state file"

# 6. Log files
echo ""
echo "📝 Log Files:"
find . -type f -name "*.log" -delete 2>/dev/null || true
find . -type f -name "*.log.*" -delete 2>/dev/null || true
echo "  ✓ Log files cleaned"

# 7. IDE and editor files
echo ""
echo "💻 IDE/Editor Files:"
safe_remove ".vscode" "VS Code settings"
safe_remove ".idea" "IntelliJ IDEA settings"
safe_remove "*.swp" "Vim swap files"
safe_remove "*.swo" "Vim swap files"
safe_remove "*~" "backup files"
safe_remove ".DS_Store" "macOS metadata"

# 8. Virtual environments (should not be in repo)
echo ""
echo "🐍 Virtual Environments:"
safe_remove "venv" "virtual environment"
safe_remove "env" "virtual environment"
safe_remove ".venv" "virtual environment"
safe_remove ".env" "virtual environment"

# 9. Node modules (if any)
echo ""
echo "📦 Node Artifacts:"
safe_remove "node_modules" "node modules"
safe_remove "package-lock.json" "npm lock file"

echo ""
echo "================================"
echo "✨ Cleanup Complete!"
echo "📊 Removed $CLEANED_COUNT artifact(s)"
echo ""
echo "Repository is now in a clean state for:"
echo "  • Fresh installations"
echo "  • Clean git commits"
echo "  • Template cloning"
echo ""
echo "To verify cleanliness, run:"
echo "  git status --ignored"