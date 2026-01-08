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

# Load shared library
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib.sh"

# Check if hooks are enabled
if ! hooks_enabled; then
    exit 0
fi

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

log_info "$CHANGE_TYPE: $CHANGED_FILE"

# 1. Auto-format Python files on creation/modification
if [ "$FILE_TYPE" = "py" ] && [ "$CHANGE_TYPE" != "deleted" ]; then
    FORMATTER=$(get_formatter)
    if has_command "$FORMATTER" && [ -f "$CHANGED_FILE" ]; then
        # Quietly format the file
        if format_python_file "$CHANGED_FILE"; then
            log_success "Auto-formatted with $FORMATTER"
        fi
    fi
fi

# 2. Validate JSON files
if [ "$FILE_TYPE" = "json" ] && [ "$CHANGE_TYPE" != "deleted" ]; then
    if validate_json "$CHANGED_FILE"; then
        log_success "JSON syntax is valid"
    else
        log_warning "JSON syntax may be invalid"
    fi
fi

# 3. Validate YAML files
if [[ "$FILE_TYPE" =~ ^(yml|yaml)$ ]] && [ "$CHANGE_TYPE" != "deleted" ]; then
    if has_command python && [ -f "$CHANGED_FILE" ]; then
        if python -c "import yaml; yaml.safe_load(open('$CHANGED_FILE'))" 2>/dev/null; then
            log_success "YAML syntax is valid"
        else
            log_warning "YAML syntax may be invalid"
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
        log_warning "Critical file modified: $critical_file"

        case "$critical_file" in
            "requirements.txt"|"package.json")
                log_info "Consider running: make dev-install"
                ;;
            ".env")
                log_warning "Never commit this file!"
                log_info "Update .env.example if adding new variables"
                ;;
            ".claude/state.json")
                # Validate state.json structure
                if ! validate_json "$CHANGED_FILE"; then
                    log_error "state.json is invalid! Restoring from backup..."
                    if [ -f "$CHANGED_FILE.bak" ]; then
                        cp "$CHANGED_FILE.bak" "$CHANGED_FILE"
                    fi
                fi
                ;;
        esac
    fi
done

# 5. Track file statistics in state.json
if [ -f "$STATE_FILE" ] && has_command jq; then
    # Count total files by type
    if [ "$FILE_TYPE" = "py" ]; then
        PY_COUNT=$(find "$PROJECT_ROOT/forge" -name "*.py" -type f 2>/dev/null | wc -l)
        update_state ".development.stats.python_files = $PY_COUNT" 2>/dev/null || true
    fi
fi

# 6. Suggest running tests if test files are modified
if is_test_file "$CHANGED_FILE"; then
    log_info "Test file modified. Run: make test"
fi

# 7. Auto-generate documentation if docstrings are updated
if [ "$FILE_TYPE" = "py" ] && grep -q '"""' "$CHANGED_FILE" 2>/dev/null; then
    # Future: Auto-generate API docs
    :
fi

log_success "File change processing complete"
exit 0
