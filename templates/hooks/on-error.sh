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

# Load shared library
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib.sh"

# Check if hooks are enabled
if ! hooks_enabled; then
    exit 0
fi

ERROR_LOG="$CLAUDE_DIR/errors.log"

log_error "Error handler triggered"

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
log_info "Error logged to .claude/errors.log"

# 2. Update state.json with error status
if [ -f "$STATE_FILE" ] && has_command jq; then
    update_state ".last_session.status = \"error\" |
                   .last_session.error = \"$ERROR_MESSAGE\" |
                   .last_session.error_time = \"$TIMESTAMP\""
fi

# 3. Analyze error type and provide suggestions
log_info "Error analysis:"

if [ -n "$ERROR_MESSAGE" ]; then
    case "$ERROR_MESSAGE" in
        *"ModuleNotFoundError"*|*"ImportError"*)
            log_warning "Python import error detected. Try:"
            echo "  - pip install -r requirements.txt"
            echo "  - make dev-install"
            ;;
        *"permission denied"*|*"Permission denied"*)
            log_warning "Permission error. Try:"
            echo "  - chmod +x <file>"
            echo "  - Check file permissions"
            ;;
        *"command not found"*)
            log_warning "Command not found. Install required dependencies:"
            echo "  - Check README.md for prerequisites"
            echo "  - make dev-install"
            ;;
        *"SyntaxError"*|*"IndentationError"*)
            FORMATTER=$(get_formatter)
            log_warning "Python syntax error. Try:"
            echo "  - Run 'make format' to auto-format with $FORMATTER"
            echo "  - Check the file for syntax issues"
            ;;
        *"Connection refused"*|*"connection refused"*)
            log_warning "Connection error. Check:"
            echo "  - Database/service is running"
            echo "  - Correct connection settings in .env"
            ;;
        *)
            log_warning "Check the error message above for details"
            ;;
    esac
else
    log_info "No specific error message available (exit code: ${ERROR_CODE:-unknown})"
fi

# 4. Check recent errors for patterns
if [ -f "$ERROR_LOG" ]; then
    RECENT_ERRORS=$(tail -n 5 "$ERROR_LOG" | grep -c "Error Code" || echo "0")

    if [ "$RECENT_ERRORS" -gt 3 ]; then
        log_error "Multiple recent errors detected. Review .claude/errors.log"
    fi
fi

# 5. Suggest recovery actions
log_info "Recommended recovery actions:"
echo "  1. Review error message and fix the issue"
echo "  2. Run diagnostics: make test, make lint"
echo "  3. Check logs: cat .claude/errors.log"
echo "  4. Restore from checkpoint if needed: forge restore"

# 6. Create emergency checkpoint (if git is available)
if has_uncommitted_changes; then
    log_warning "Uncommitted changes detected"
    log_info "Consider creating a checkpoint before major fixes:"
    echo "  - git stash  # Temporarily save changes"
    echo "  - forge checkpoint \"Before error fix\""
fi

log_error "Error handler complete. Review suggestions above"
exit 0
