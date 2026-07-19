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

# Load shared library
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib.sh"
require_git

# Check if hooks are enabled
if ! hooks_enabled; then
    log_info "Hooks are disabled in config.json"
    exit 0
fi

log_info "Pre-task hook triggered"

# 1. Validate config.json (skip silently if not present — it's optional)
if [ -f "$CONFIG_FILE" ]; then
    validate_config || log_warning "Config validation failed"
fi

# 2. Check for project.json (optional — session tracking)
if [ -f "$PROJECT_STATE_FILE" ]; then
    log_debug "project.json found"
fi

# 3. Update last session info
#
# Session tracking is RUNTIME state — it changed on every task and dirtied the
# tracked .claude/project.json. It now lives in the untracked runtime file
# (DIRECTIVE-NXTG-20260718-04 item 3); project.json stays versioned config.
if [ -n "$TASK_ID" ] && has_command jq && ensure_runtime_file "$PROJECT_RUNTIME_FILE"; then
    CURRENT_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    if jq --arg id "$TASK_ID" \
       --arg time "$CURRENT_TIME" \
       --arg task "${TASK_DESCRIPTION:-Unknown task}" \
       --arg agent "${AGENT_TYPE:-general}" \
       '.last_session.id = $id |
        .last_session.started = $time |
        .last_session.task = $task |
        .last_session.agent = $agent |
        .last_session.status = "in_progress" |
        .last_updated = $time' \
       "$PROJECT_RUNTIME_FILE" > "$PROJECT_RUNTIME_FILE.tmp" 2>/dev/null \
       && [ -s "$PROJECT_RUNTIME_FILE.tmp" ]; then
        mv "$PROJECT_RUNTIME_FILE.tmp" "$PROJECT_RUNTIME_FILE"
        log_success "Updated runtime session info"
    else
        rm -f "$PROJECT_RUNTIME_FILE.tmp"
    fi
fi

# 4. Check for uncommitted changes
if has_uncommitted_changes; then
    log_info "You have uncommitted changes. Consider committing before major tasks."
fi

# 5. Check Python tools (only for Python projects)
if [ -f "$PROJECT_ROOT/pyproject.toml" ] || [ -f "$PROJECT_ROOT/setup.py" ] || [ -f "$PROJECT_ROOT/requirements.txt" ]; then
    check_python_tools || log_info "Install tools with: pip install $(get_formatter) $(get_linter) $(get_type_checker)"
fi

# 7. Post session start to sentinel (non-blocking)
BRANCH=$(get_current_branch)
UNCOMMITTED=$(count_uncommitted_files)
post_sentinel_event "INFO" "session-hook" "Session started on branch $BRANCH ($UNCOMMITTED uncommitted files)" "low" &

log_success "Pre-task checks complete"
exit 0
