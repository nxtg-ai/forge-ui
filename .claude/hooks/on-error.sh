#!/bin/bash
#
# NXTG-Forge Error Handler Hook
# Runs when an error occurs during task execution
#
# Environment Variables:
#   ERROR_CODE - Exit code of the failed command
#   ERROR_MESSAGE - Error message (if available)
#   ERROR_FILE - File where error occurred
#   ERROR_LINE - Line number where error occurred
#   TASK_ID - Current task identifier
#

set -e

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
STATE_FILE="$PROJECT_ROOT/.claude/state.json"
ERROR_LOG="$PROJECT_ROOT/.claude/errors.log"

echo -e "${RED}[Error]${NC} Error handler triggered"

# 1. Log error details
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
ERROR_ENTRY="[$TIMESTAMP] Error Code: ${ERROR_CODE:-unknown}"

if [ -n "$ERROR_MESSAGE" ]; then
    ERROR_ENTRY="$ERROR_ENTRY | Message: $ERROR_MESSAGE"
fi

if [ -n "$ERROR_FILE" ]; then
    ERROR_ENTRY="$ERROR_ENTRY | File: $ERROR_FILE"
fi

if [ -n "$ERROR_LINE" ]; then
    ERROR_ENTRY="$ERROR_ENTRY | Line: $ERROR_LINE"
fi

if [ -n "$TASK_ID" ]; then
    ERROR_ENTRY="$ERROR_ENTRY | Task: $TASK_ID"
fi

# Append to error log
echo "$ERROR_ENTRY" >> "$ERROR_LOG"
echo -e "${YELLOW}[Log]${NC} Error logged to .claude/errors.log"

# 2. Update state.json with error status
if [ -f "$STATE_FILE" ] && command -v jq &> /dev/null; then
    jq --arg time "$TIMESTAMP" \
       --arg error "$ERROR_MESSAGE" \
       '.last_session.status = "error" |
        .last_session.error = $error |
        .last_session.error_time = $time' \
       "$STATE_FILE" > "$STATE_FILE.tmp" && mv "$STATE_FILE.tmp" "$STATE_FILE"
fi

# 3. Analyze error type and provide suggestions
echo -e "${BLUE}[Analysis]${NC} Error analysis:"

if [ -n "$ERROR_MESSAGE" ]; then
    case "$ERROR_MESSAGE" in
        *"ModuleNotFoundError"*|*"ImportError"*)
            echo -e "${YELLOW}[Suggestion]${NC} Python import error detected. Try:"
            echo "  " pip install -r requirements.txt"
            echo "  " make dev-install"
            ;;
        *"permission denied"*|*"Permission denied"*)
            echo -e "${YELLOW}[Suggestion]${NC} Permission error. Try:"
            echo "  " chmod +x <file>"
            echo "  " Check file permissions"
            ;;
        *"command not found"*)
            echo -e "${YELLOW}[Suggestion]${NC} Command not found. Install required dependencies:"
            echo "  " Check README.md for prerequisites"
            echo "  " make dev-install"
            ;;
        *"SyntaxError"*|*"IndentationError"*)
            echo -e "${YELLOW}[Suggestion]${NC} Python syntax error. Try:"
            echo "  " Run 'make format' to auto-format code"
            echo "  " Check the file for syntax issues"
            ;;
        *"Connection refused"*|*"connection refused"*)
            echo -e "${YELLOW}[Suggestion]${NC} Connection error. Check:"
            echo "  " Database/service is running"
            echo "  " Correct connection settings in .env"
            ;;
        *)
            echo -e "${YELLOW}[Suggestion]${NC} Check the error message above for details"
            ;;
    esac
else
    echo "  No specific error message available (exit code: ${ERROR_CODE:-unknown})"
fi

# 4. Check recent errors for patterns
if [ -f "$ERROR_LOG" ]; then
    RECENT_ERRORS=$(tail -n 5 "$ERROR_LOG" | grep -c "Error Code" || echo "0")

    if [ "$RECENT_ERRORS" -gt 3 ]; then
        echo -e "${RED}[Warning]${NC} Multiple recent errors detected. Review .claude/errors.log"
    fi
fi

# 5. Suggest recovery actions
echo -e "${BLUE}[Recovery]${NC} Recommended actions:"
echo "  1. Review error message and fix the issue"
echo "  2. Run diagnostics: make test, make lint"
echo "  3. Check logs: cat .claude/errors.log"
echo "  4. Restore from checkpoint if needed: forge restore"

# 6. Create emergency checkpoint (if git is available)
if command -v git &> /dev/null && git rev-parse --git-dir > /dev/null 2>&1; then
    if ! git diff-index --quiet HEAD -- 2>/dev/null; then
        echo -e "${YELLOW}[Checkpoint]${NC} Uncommitted changes detected"
        echo "  Consider creating a checkpoint before major fixes:"
        echo "  " git stash  # Temporarily save changes"
        echo "  " forge checkpoint \"Before error fix\""
    fi
fi

echo -e "${RED}[Error Handler Complete]${NC} Review suggestions above"
exit 0
