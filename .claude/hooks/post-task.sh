#!/bin/bash
#
# NXTG-Forge Post-Task Hook
# Runs after Claude Code completes a task
#
# Environment Variables:
#   TASK_ID - Unique identifier for the task
#   TASK_STATUS - Status of completed task (success, failed, cancelled)
#   TASK_DURATION - Duration in seconds
#   FILES_MODIFIED - Number of files modified
#

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
STATE_FILE="$PROJECT_ROOT/.claude/state.json"

echo -e "${BLUE}[NXTG-Forge]${NC} Post-task hook triggered"

# 1. Update state.json with completion status
if [ -n "$TASK_ID" ] && command -v jq &> /dev/null && [ -f "$STATE_FILE" ]; then
    CURRENT_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    STATUS="${TASK_STATUS:-completed}"

    jq --arg status "$STATUS" \
       --arg time "$CURRENT_TIME" \
       '.last_session.status = $status |
        .last_session.completed = $time |
        .project.last_updated = $time' \
       "$STATE_FILE" > "$STATE_FILE.tmp" && mv "$STATE_FILE.tmp" "$STATE_FILE"

    if [ "$STATUS" = "success" ]; then
        echo -e "${GREEN}[Success]${NC} Task completed successfully"
    elif [ "$STATUS" = "failed" ]; then
        echo -e "${RED}[Failed]${NC} Task failed"
    else
        echo -e "${YELLOW}[Info]${NC} Task status: $STATUS"
    fi
fi

# 2. Run quality checks if tests exist
if [ -d "$PROJECT_ROOT/tests" ] && command -v python &> /dev/null; then
    echo -e "${BLUE}[Info]${NC} Running quick test validation..."

    # Quick smoke test (timeout after 10 seconds)
    if timeout 10 python -m pytest tests/ --tb=no -q --maxfail=1 2>/dev/null; then
        echo -e "${GREEN}[Tests]${NC} Quick validation passed"
    else
        echo -e "${YELLOW}[Tests]${NC} Some tests may need attention (run 'make test' for details)"
    fi
fi

# 3. Check code quality (if modified Python files)
if [ -n "$FILES_MODIFIED" ] && [ "$FILES_MODIFIED" -gt 0 ]; then
    if command -v ruff &> /dev/null; then
        echo -e "${BLUE}[Info]${NC} Running linter on modified files..."
        if ruff check "$PROJECT_ROOT/forge" --quiet 2>/dev/null; then
            echo -e "${GREEN}[Lint]${NC} No linting issues found"
        else
            echo -e "${YELLOW}[Lint]${NC} Linting issues detected (run 'make lint' for details)"
        fi
    fi
fi

# 4. Update quality metrics in state.json
if command -v python &> /dev/null && [ -f "$STATE_FILE" ]; then
    # Get test count
    if [ -d "$PROJECT_ROOT/tests" ]; then
        TEST_COUNT=$(find "$PROJECT_ROOT/tests" -name "test_*.py" -type f | wc -l)

        if command -v jq &> /dev/null; then
            jq --argjson count "$TEST_COUNT" \
               '.quality.tests.unit.total = $count' \
               "$STATE_FILE" > "$STATE_FILE.tmp" && mv "$STATE_FILE.tmp" "$STATE_FILE"
        fi
    fi
fi

# 5. Suggest next steps based on task status
if [ "$TASK_STATUS" = "success" ]; then
    echo -e "${GREEN}[Next]${NC} Consider running:"
    echo "  " make test    - Run full test suite"
    echo "  " make quality - Run all quality checks"
    echo "  " git status   - Review changes"
fi

# 6. Create automatic checkpoint for major milestones
if [ -n "$TASK_ID" ] && [ "$TASK_STATUS" = "success" ]; then
    # Check if this is a significant task (more than 5 files modified)
    if [ -n "$FILES_MODIFIED" ] && [ "$FILES_MODIFIED" -gt 5 ]; then
        echo -e "${BLUE}[Checkpoint]${NC} Major task completed. Consider creating a checkpoint:"
        echo "  " python -m forge.cli checkpoint \"After $TASK_ID\""
    fi
fi

echo -e "${GREEN}[Complete]${NC} Post-task checks complete"
exit 0
