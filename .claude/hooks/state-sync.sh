#!/bin/bash
#
# NXTG-Forge State Synchronization Hook
# Synchronizes project state and creates backups
#
# Environment Variables:
#   SYNC_TYPE - Type of sync (auto, manual, checkpoint)
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
BACKUP_DIR="$PROJECT_ROOT/.claude/backups"
CHECKPOINT_DIR="$PROJECT_ROOT/.claude/checkpoints"

echo -e "${BLUE}[State Sync]${NC} Starting state synchronization..."

# 1. Ensure backup directory exists
mkdir -p "$BACKUP_DIR"
mkdir -p "$CHECKPOINT_DIR"

# 2. Create backup of current state.json
if [ -f "$STATE_FILE" ]; then
    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    BACKUP_FILE="$BACKUP_DIR/state_$TIMESTAMP.json"

    cp "$STATE_FILE" "$BACKUP_FILE"
    echo -e "${GREEN}[Backup]${NC} State backed up to: $(basename "$BACKUP_FILE")"

    # Keep only last 10 backups
    BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/state_*.json 2>/dev/null | wc -l)
    if [ "$BACKUP_COUNT" -gt 10 ]; then
        ls -1t "$BACKUP_DIR"/state_*.json | tail -n +11 | xargs rm -f
        echo -e "${YELLOW}[Cleanup]${NC} Removed old backups (keeping last 10)"
    fi
else
    echo -e "${YELLOW}[Warning]${NC} state.json not found, creating from template..."
    if [ -f "$STATE_FILE.template" ]; then
        cp "$STATE_FILE.template" "$STATE_FILE"
        echo -e "${GREEN}[Created]${NC} Initialized state.json from template"
    fi
fi

# 3. Validate state.json structure
if [ -f "$STATE_FILE" ] && command -v jq &> /dev/null; then
    if jq empty "$STATE_FILE" 2>/dev/null; then
        echo -e "${GREEN}[Valid]${NC} state.json structure is valid"
    else
        echo -e "${YELLOW}[Error]${NC} state.json is corrupted! Restoring from latest backup..."

        # Find latest backup
        LATEST_BACKUP=$(ls -1t "$BACKUP_DIR"/state_*.json 2>/dev/null | head -n 1)

        if [ -n "$LATEST_BACKUP" ]; then
            cp "$LATEST_BACKUP" "$STATE_FILE"
            echo -e "${GREEN}[Restored]${NC} State restored from: $(basename "$LATEST_BACKUP")"
        else
            echo -e "${RED}[Error]${NC} No backups available! Creating fresh state..."
            cp "$STATE_FILE.template" "$STATE_FILE"
        fi
    fi
fi

# 4. Sync project statistics
if [ -f "$STATE_FILE" ] && command -v jq &> /dev/null; then
    CURRENT_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    # Count Python files
    PY_FILES=$(find "$PROJECT_ROOT/forge" -name "*.py" -type f 2>/dev/null | wc -l)

    # Count test files
    TEST_FILES=$(find "$PROJECT_ROOT/tests" -name "test_*.py" -type f 2>/dev/null | wc -l)

    # Count total lines of code (Python only)
    if command -v wc &> /dev/null; then
        TOTAL_LINES=$(find "$PROJECT_ROOT/forge" -name "*.py" -type f -exec wc -l {} + 2>/dev/null | tail -1 | awk '{print $1}' || echo "0")
    else
        TOTAL_LINES=0
    fi

    # Update state.json with current stats
    jq --arg time "$CURRENT_TIME" \
       --argjson py_files "$PY_FILES" \
       --argjson test_files "$TEST_FILES" \
       --argjson total_lines "$TOTAL_LINES" \
       '.project.last_updated = $time |
        .development.stats.python_files = $py_files |
        .development.stats.test_files = $test_files |
        .development.stats.total_lines = $total_lines' \
       "$STATE_FILE" > "$STATE_FILE.tmp" && mv "$STATE_FILE.tmp" "$STATE_FILE"

    echo -e "${GREEN}[Updated]${NC} Synced project statistics"
    echo "  " Python files: $PY_FILES"
    echo "  " Test files: $TEST_FILES"
    echo "  " Total lines: $TOTAL_LINES"
fi

# 5. Check Git status and update state
if command -v git &> /dev/null && git rev-parse --git-dir > /dev/null 2>&1; then
    # Get current branch
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")

    # Get latest commit
    LATEST_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

    # Check for uncommitted changes
    if git diff-index --quiet HEAD -- 2>/dev/null; then
        GIT_STATUS="clean"
    else
        GIT_STATUS="uncommitted_changes"
    fi

    if [ -f "$STATE_FILE" ] && command -v jq &> /dev/null; then
        jq --arg branch "$CURRENT_BRANCH" \
           --arg commit "$LATEST_COMMIT" \
           --arg status "$GIT_STATUS" \
           '.development.git.branch = $branch |
            .development.git.commit = $commit |
            .development.git.status = $status' \
           "$STATE_FILE" > "$STATE_FILE.tmp" && mv "$STATE_FILE.tmp" "$STATE_FILE"

        echo -e "${GREEN}[Git]${NC} Branch: $CURRENT_BRANCH | Commit: $LATEST_COMMIT | Status: $GIT_STATUS"
    fi
fi

# 6. Calculate health score
if [ -f "$STATE_FILE" ] && command -v python &> /dev/null; then
    # Use Python to calculate health score (if gap_analyzer is available)
    if [ -f "$PROJECT_ROOT/forge/gap_analyzer.py" ]; then
        HEALTH_SCORE=$(python -c "
from forge.gap_analyzer import GapAnalyzer
try:
    analyzer = GapAnalyzer('$PROJECT_ROOT')
    result = analyzer.analyze()
    print(result.get('health_score', 0))
except:
    print(0)
" 2>/dev/null || echo "0")

        if [ "$HEALTH_SCORE" != "0" ] && command -v jq &> /dev/null; then
            jq --argjson score "$HEALTH_SCORE" \
               '.development.health_score = $score' \
               "$STATE_FILE" > "$STATE_FILE.tmp" && mv "$STATE_FILE.tmp" "$STATE_FILE"

            echo -e "${GREEN}[Health]${NC} Project health score: $HEALTH_SCORE%"
        fi
    fi
fi

# 7. Create checkpoint if requested
if [ "$SYNC_TYPE" = "checkpoint" ]; then
    CHECKPOINT_ID=$(date +"%Y%m%d_%H%M%S")
    CHECKPOINT_FILE="$CHECKPOINT_DIR/checkpoint_$CHECKPOINT_ID.json"

    cp "$STATE_FILE" "$CHECKPOINT_FILE"
    echo -e "${GREEN}[Checkpoint]${NC} Created checkpoint: $CHECKPOINT_ID"

    # Add to checkpoints list in state.json
    if command -v jq &> /dev/null; then
        TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
        DESCRIPTION="${CHECKPOINT_DESCRIPTION:-Manual checkpoint}"

        jq --arg id "$CHECKPOINT_ID" \
           --arg time "$TIMESTAMP" \
           --arg desc "$DESCRIPTION" \
           --arg file "$(basename "$CHECKPOINT_FILE")" \
           '.checkpoints += [{
               "id": $id,
               "timestamp": $time,
               "description": $desc,
               "file": (".claude/checkpoints/" + $file)
           }]' \
           "$STATE_FILE" > "$STATE_FILE.tmp" && mv "$STATE_FILE.tmp" "$STATE_FILE"
    fi
fi

# 8. Verify state integrity
if [ -f "$STATE_FILE" ] && command -v jq &> /dev/null; then
    # Check required fields
    REQUIRED_FIELDS=("version" "project" "development")

    for field in "${REQUIRED_FIELDS[@]}"; do
        if ! jq -e ".$field" "$STATE_FILE" > /dev/null 2>&1; then
            echo -e "${YELLOW}[Warning]${NC} Missing required field: $field"
        fi
    done
fi

echo -e "${GREEN}[Complete]${NC} State synchronization complete"
exit 0
