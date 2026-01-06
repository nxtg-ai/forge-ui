#!/bin/bash
#
# NXTG-Forge File Change Hook
# Runs when files are modified during task execution
#
# Environment Variables:
#   CHANGED_FILE - Path to the changed file
#   CHANGE_TYPE - Type of change (created, modified, deleted)
#   FILE_TYPE - File extension/type
#

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
STATE_FILE="$PROJECT_ROOT/.claude/state.json"

# Only log significant changes (skip frequent/temporary changes)
if [ -n "$CHANGED_FILE" ]; then
    # Skip temporary files and caches
    case "$CHANGED_FILE" in
        */__pycache__/*|*.pyc|*.pyo|*~|*.swp|*.tmp)
            exit 0
            ;;
        */.pytest_cache/*|*/htmlcov/*|*/.coverage)
            exit 0
            ;;
    esac
fi

echo -e "${BLUE}[File Change]${NC} $CHANGE_TYPE: $CHANGED_FILE"

# 1. Auto-format Python files on creation/modification
if [ "$FILE_TYPE" = "py" ] && [ "$CHANGE_TYPE" != "deleted" ]; then
    if command -v black &> /dev/null && [ -f "$CHANGED_FILE" ]; then
        # Quietly format the file
        if black "$CHANGED_FILE" --quiet 2>/dev/null; then
            echo -e "${GREEN}[Format]${NC} Auto-formatted Python file"
        fi
    fi
fi

# 2. Validate JSON files
if [ "$FILE_TYPE" = "json" ] && [ "$CHANGE_TYPE" != "deleted" ]; then
    if command -v jq &> /dev/null && [ -f "$CHANGED_FILE" ]; then
        if jq empty "$CHANGED_FILE" 2>/dev/null; then
            echo -e "${GREEN}[Valid]${NC} JSON syntax is valid"
        else
            echo -e "${YELLOW}[Warning]${NC} JSON syntax may be invalid"
        fi
    fi
fi

# 3. Validate YAML files
if [[ "$FILE_TYPE" =~ ^(yml|yaml)$ ]] && [ "$CHANGE_TYPE" != "deleted" ]; then
    if command -v python &> /dev/null && [ -f "$CHANGED_FILE" ]; then
        if python -c "import yaml; yaml.safe_load(open('$CHANGED_FILE'))" 2>/dev/null; then
            echo -e "${GREEN}[Valid]${NC} YAML syntax is valid"
        else
            echo -e "${YELLOW}[Warning]${NC} YAML syntax may be invalid"
        fi
    fi
fi

# 4. Check if critical files are being modified
CRITICAL_FILES=(
    ".env"
    "requirements.txt"
    "pyproject.toml"
    "package.json"
    ".claude/state.json"
)

for critical_file in "${CRITICAL_FILES[@]}"; do
    if [[ "$CHANGED_FILE" == *"$critical_file" ]]; then
        echo -e "${YELLOW}[Critical File]${NC} Modified: $critical_file"

        case "$critical_file" in
            "requirements.txt"|"package.json")
                echo "  Consider running: make dev-install"
                ;;
            ".env")
                echo "  Reminder: Never commit this file!"
                echo "  Update .env.example if adding new variables"
                ;;
            ".claude/state.json")
                # Validate state.json structure
                if command -v jq &> /dev/null && [ -f "$CHANGED_FILE" ]; then
                    if ! jq empty "$CHANGED_FILE" 2>/dev/null; then
                        echo -e "${YELLOW}[Error]${NC} state.json is invalid! Restoring from backup..."
                        if [ -f "$CHANGED_FILE.bak" ]; then
                            cp "$CHANGED_FILE.bak" "$CHANGED_FILE"
                        fi
                    fi
                fi
                ;;
        esac
    fi
done

# 5. Track file statistics in state.json
if [ -f "$STATE_FILE" ] && command -v jq &> /dev/null; then
    CURRENT_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    # Count total files by type
    if [ "$FILE_TYPE" = "py" ]; then
        PY_COUNT=$(find "$PROJECT_ROOT/forge" -name "*.py" -type f 2>/dev/null | wc -l)
        jq --argjson count "$PY_COUNT" \
           '.development.stats.python_files = $count' \
           "$STATE_FILE" > "$STATE_FILE.tmp" 2>/dev/null && mv "$STATE_FILE.tmp" "$STATE_FILE" || true
    fi
fi

# 6. Suggest running tests if test files are modified
if [[ "$CHANGED_FILE" == */tests/* ]] || [[ "$CHANGED_FILE" == *test_*.py ]]; then
    echo -e "${BLUE}[Suggestion]${NC} Test file modified. Run: make test"
fi

# 7. Auto-generate documentation if docstrings are updated
if [ "$FILE_TYPE" = "py" ] && grep -q '"""' "$CHANGED_FILE" 2>/dev/null; then
    # Future: Auto-generate API docs
    :
fi

echo -e "${GREEN}[File Change]${NC} Processing complete"
exit 0
