#!/bin/bash
#
# NXTG-Forge Pre-Task Hook
# Runs before Claude Code starts executing a task
#
# Environment Variables:
#   TASK_ID - Unique identifier for the task
#   TASK_DESCRIPTION - Description of the task
#   AGENT_TYPE - Type of agent handling the task (if applicable)
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

echo -e "${BLUE}[NXTG-Forge]${NC} Pre-task hook triggered"

# 1. Ensure state.json exists
if [ ! -f "$STATE_FILE" ]; then
    echo -e "${YELLOW}[Warning]${NC} state.json not found, creating from template..."
    if [ -f "$STATE_FILE.template" ]; then
        cp "$STATE_FILE.template" "$STATE_FILE"
        # Update timestamps
        CURRENT_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
        if command -v jq &> /dev/null; then
            jq --arg time "$CURRENT_TIME" \
                '.project.created_at = $time | .project.last_updated = $time' \
                "$STATE_FILE" > "$STATE_FILE.tmp" && mv "$STATE_FILE.tmp" "$STATE_FILE"
        fi
        echo -e "${GREEN}[Success]${NC} Created state.json from template"
    else
        echo -e "${YELLOW}[Warning]${NC} state.json.template not found"
    fi
fi

# 2. Update last session info
if [ -n "$TASK_ID" ] && command -v jq &> /dev/null && [ -f "$STATE_FILE" ]; then
    CURRENT_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    jq --arg id "$TASK_ID" \
       --arg time "$CURRENT_TIME" \
       --arg task "${TASK_DESCRIPTION:-Unknown task}" \
       --arg agent "${AGENT_TYPE:-general}" \
       '.last_session.id = $id |
        .last_session.started = $time |
        .last_session.task = $task |
        .last_session.agent = $agent |
        .last_session.status = "in_progress" |
        .project.last_updated = $time' \
       "$STATE_FILE" > "$STATE_FILE.tmp" && mv "$STATE_FILE.tmp" "$STATE_FILE"

    echo -e "${GREEN}[Success]${NC} Updated state.json with task info"
fi

# 3. Check for uncommitted changes (optional warning)
if command -v git &> /dev/null && git rev-parse --git-dir > /dev/null 2>&1; then
    if ! git diff-index --quiet HEAD -- 2>/dev/null; then
        echo -e "${YELLOW}[Info]${NC} You have uncommitted changes. Consider committing before major tasks."
    fi
fi

# 4. Validate project structure
REQUIRED_DIRS=("forge" ".claude/skills" ".claude/commands")
for dir in "${REQUIRED_DIRS[@]}"; do
    if [ ! -d "$PROJECT_ROOT/$dir" ]; then
        echo -e "${YELLOW}[Warning]${NC} Required directory missing: $dir"
    fi
done

echo -e "${GREEN}[Ready]${NC} Pre-task checks complete"
exit 0
