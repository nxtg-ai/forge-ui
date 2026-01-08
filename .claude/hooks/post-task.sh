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

# Load shared library
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib.sh"

# Check if hooks are enabled
if ! hooks_enabled; then
    exit 0
fi

log_info "Post-task hook triggered"

# 1. Update state.json with completion status
if [ -n "$TASK_ID" ] && has_command jq && [ -f "$STATE_FILE" ]; then
    CURRENT_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    STATUS="${TASK_STATUS:-completed}"

    jq --arg status "$STATUS" \
       --arg time "$CURRENT_TIME" \
       '.last_session.status = $status |
        .last_session.completed = $time |
        .project.last_updated = $time' \
       "$STATE_FILE" > "$STATE_FILE.tmp" && mv "$STATE_FILE.tmp" "$STATE_FILE"

    if [ "$STATUS" = "success" ]; then
        log_success "Task completed successfully"
    elif [ "$STATUS" = "failed" ]; then
        log_error "Task failed"
    else
        log_info "Task status: $STATUS"
    fi
fi

# 2. Run quality checks if tests exist
if [ -d "$PROJECT_ROOT/tests" ] && has_command python; then
    log_info "Running quick test validation..."

    # Quick smoke test (timeout after 10 seconds)
    if timeout 10 python -m pytest tests/ --tb=no -q --maxfail=1 2>/dev/null; then
        log_success "Quick validation passed"
    else
        log_warning "Some tests may need attention (run 'make test' for details)"
    fi
fi

# 3. Check code quality (if modified Python files)
if [ -n "$FILES_MODIFIED" ] && [ "$FILES_MODIFIED" -gt 0 ]; then
    LINTER=$(get_linter)
    if has_command "$LINTER"; then
        log_info "Running $LINTER on modified files..."
        if lint_python_files; then
            log_success "No linting issues found"
        else
            log_warning "Linting issues detected (run 'make lint' for details)"
        fi
    fi
fi

# 4. Update quality metrics in state.json
if has_command python && [ -f "$STATE_FILE" ]; then
    # Get test count
    if [ -d "$PROJECT_ROOT/tests" ]; then
        TEST_COUNT=$(find "$PROJECT_ROOT/tests" -name "test_*.py" -type f | wc -l)

        if has_command jq; then
            jq --argjson count "$TEST_COUNT" \
               '.quality.tests.unit.total = $count' \
               "$STATE_FILE" > "$STATE_FILE.tmp" && mv "$STATE_FILE.tmp" "$STATE_FILE"
        fi
    fi
fi

# 5. Check safety constraints
if [ -n "$FILES_MODIFIED" ] && [ "$FILES_MODIFIED" -gt 0 ]; then
    MAX_CHANGES=$(get_max_file_changes)
    if [ "$FILES_MODIFIED" -gt "$MAX_CHANGES" ]; then
        log_warning "Modified $FILES_MODIFIED files (limit: $MAX_CHANGES from config)"
        log_info "Consider breaking this into smaller commits"
    fi
fi

# 6. Suggest next steps based on task status
if [ "$TASK_STATUS" = "success" ]; then
    COVERAGE_TARGET=$(get_test_coverage_target)
    log_info "Consider running:"
    echo "  - make test    # Run full test suite (target: ${COVERAGE_TARGET}%)"
    echo "  - make quality # Run all quality checks"
    echo "  - git status   # Review changes"
fi

# 7. Create automatic checkpoint for major milestones
if [ -n "$TASK_ID" ] && [ "$TASK_STATUS" = "success" ]; then
    # Check if this is a significant task (more than 5 files modified)
    if [ -n "$FILES_MODIFIED" ] && [ "$FILES_MODIFIED" -gt 5 ]; then
        log_info "Major task completed. Consider creating a checkpoint:"
        echo "  - python -m forge.cli checkpoint \"After $TASK_ID\""
    fi
fi

log_success "Post-task checks complete"
exit 0
