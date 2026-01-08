#!/usr/bin/env bash
# TDD Workflow Automation Script
# Automates Test-Driven Development red-green-refactor cycle

set -euo pipefail

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Source shared library
if [ -f "$SCRIPT_DIR/../hooks/lib.sh" ]; then
    source "$SCRIPT_DIR/../hooks/lib.sh"
else
    echo "Error: Cannot find lib.sh" >&2
    exit 1
fi

# Configuration
CONFIG_FILE="$PROJECT_ROOT/.claude/config.json"
COVERAGE_TARGET=$(get_config ".testing.coverage_target" "86")
TEST_DIR="$PROJECT_ROOT/tests"
SRC_DIR="$PROJECT_ROOT/forge"

# Colors (from lib.sh)
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# State tracking
STATE_FILE="$PROJECT_ROOT/.claude/tdd-state.json"
CURRENT_PHASE="red"  # red, green, or refactor

#######################################
# Print usage information
#######################################
usage() {
    cat << EOF
TDD Workflow Automation

Usage: $0 [COMMAND] [OPTIONS]

Commands:
    init [test-file]          Initialize TDD workflow for new feature
    red                       Write failing test (RED phase)
    green                     Implement minimal code to pass (GREEN phase)
    refactor                  Improve code while keeping tests passing (REFACTOR phase)
    cycle                     Run complete red-green-refactor cycle
    status                    Show current TDD state
    reset                     Reset TDD state

Options:
    -h, --help               Show this help message
    -v, --verbose            Verbose output
    -f, --file FILE          Specify test file to work with
    -c, --coverage           Show coverage report after tests
    -w, --watch              Watch mode (rerun on file changes)

Examples:
    # Initialize TDD for new feature
    $0 init tests/unit/test_new_feature.py

    # Run complete TDD cycle
    $0 cycle -f tests/unit/test_new_feature.py

    # Run individual phases
    $0 red
    $0 green
    $0 refactor

    # Watch mode for continuous testing
    $0 --watch

EOF
    exit 0
}

#######################################
# Initialize TDD state
#######################################
init_tdd_state() {
    local test_file="$1"

    cat > "$STATE_FILE" <<EOF
{
    "version": "1.0.0",
    "current_phase": "red",
    "test_file": "$test_file",
    "cycle_count": 0,
    "last_run": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "phases": {
        "red": {
            "status": "pending",
            "test_count": 0,
            "last_run": null
        },
        "green": {
            "status": "pending",
            "implementation_file": null,
            "last_run": null
        },
        "refactor": {
            "status": "pending",
            "changes": [],
            "last_run": null
        }
    },
    "history": []
}
EOF

    log_success "TDD state initialized for $test_file"
    log_info "Current phase: RED - Write a failing test"
}

#######################################
# Load TDD state
#######################################
load_tdd_state() {
    if [ ! -f "$STATE_FILE" ]; then
        log_error "TDD state not initialized. Run: $0 init <test-file>"
        exit 1
    fi

    CURRENT_PHASE=$(jq -r '.current_phase' "$STATE_FILE")
    TEST_FILE=$(jq -r '.test_file' "$STATE_FILE")
}

#######################################
# Update TDD state
#######################################
update_tdd_state() {
    local phase="$1"
    local status="$2"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    if [ ! -f "$STATE_FILE" ]; then
        log_error "TDD state not initialized"
        return 1
    fi

    jq ".current_phase = \"$phase\" | \
        .phases.$phase.status = \"$status\" | \
        .phases.$phase.last_run = \"$timestamp\" | \
        .last_run = \"$timestamp\"" \
        "$STATE_FILE" > "$STATE_FILE.tmp" && mv "$STATE_FILE.tmp" "$STATE_FILE"
}

#######################################
# Record cycle completion
#######################################
record_cycle() {
    local success="$1"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    jq ".cycle_count = (.cycle_count + 1) | \
        .history += [{
            \"cycle\": .cycle_count,
            \"timestamp\": \"$timestamp\",
            \"success\": $success
        }]" \
        "$STATE_FILE" > "$STATE_FILE.tmp" && mv "$STATE_FILE.tmp" "$STATE_FILE"
}

#######################################
# RED Phase: Write failing test
#######################################
phase_red() {
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}  RED PHASE: Write a Failing Test${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo

    load_tdd_state

    # Verify test file exists
    if [ ! -f "$PROJECT_ROOT/$TEST_FILE" ]; then
        log_error "Test file not found: $TEST_FILE"
        log_info "Create it first or specify with: $0 init <test-file>"
        exit 1
    fi

    log_info "Test file: $TEST_FILE"
    echo

    # Show test file content
    log_info "Current test content:"
    echo -e "${BLUE}$(cat "$PROJECT_ROOT/$TEST_FILE")${NC}"
    echo

    # Prompt for test implementation
    log_info "Write a test that FAILS (tests behavior that doesn't exist yet)"
    log_info "Press Enter when you've added the failing test..."
    read -r

    # Run the test (should fail)
    log_info "Running tests to verify failure..."
    echo

    if pytest "$PROJECT_ROOT/$TEST_FILE" -v; then
        log_error "❌ Test passed! In RED phase, test should FAIL"
        log_info "Add a test that checks unimplemented functionality"
        update_tdd_state "red" "invalid"
        return 1
    else
        log_success "✅ Test failed as expected! Ready for GREEN phase"
        update_tdd_state "green" "pending"

        # Save test count
        local test_count=$(pytest "$PROJECT_ROOT/$TEST_FILE" --collect-only -q | grep -c "test_" || echo "0")
        jq ".phases.red.test_count = $test_count" \
            "$STATE_FILE" > "$STATE_FILE.tmp" && mv "$STATE_FILE.tmp" "$STATE_FILE"

        echo
        log_info "Next step: Run '$0 green' to implement minimal code"
        return 0
    fi
}

#######################################
# GREEN Phase: Make test pass
#######################################
phase_green() {
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}  GREEN PHASE: Make the Test Pass${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo

    load_tdd_state

    if [ "$CURRENT_PHASE" != "green" ]; then
        log_error "Not in GREEN phase. Current phase: $CURRENT_PHASE"
        log_info "Run '$0 $CURRENT_PHASE' first"
        exit 1
    fi

    log_info "Implement MINIMAL code to make the test pass"
    log_info "Don't worry about perfection - just make it work"
    echo

    # Show failing test
    log_info "Running tests to see what's failing..."
    pytest "$PROJECT_ROOT/$TEST_FILE" -v || true
    echo

    log_info "Press Enter when you've implemented the code..."
    read -r

    # Run tests (should pass now)
    log_info "Running tests to verify implementation..."
    echo

    if pytest "$PROJECT_ROOT/$TEST_FILE" -v; then
        log_success "✅ Tests passed! Ready for REFACTOR phase"
        update_tdd_state "refactor" "pending"

        echo
        log_info "Next step: Run '$0 refactor' to improve the code"
        return 0
    else
        log_error "❌ Tests still failing. Keep implementing!"
        log_info "Re-run '$0 green' when you've made more progress"
        return 1
    fi
}

#######################################
# REFACTOR Phase: Improve code
#######################################
phase_refactor() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  REFACTOR PHASE: Improve the Code${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo

    load_tdd_state

    if [ "$CURRENT_PHASE" != "refactor" ]; then
        log_error "Not in REFACTOR phase. Current phase: $CURRENT_PHASE"
        log_info "Run '$0 $CURRENT_PHASE' first"
        exit 1
    fi

    log_info "Improve the code while keeping tests passing:"
    echo "  - Remove duplication"
    echo "  - Improve naming"
    echo "  - Extract methods"
    echo "  - Simplify logic"
    echo

    log_info "Press Enter when ready to verify refactoring..."
    read -r

    # Run all tests to ensure nothing broke
    log_info "Running all tests to verify refactoring..."
    echo

    if pytest "$TEST_DIR" -v; then
        log_success "✅ All tests still passing after refactoring!"

        # Check coverage
        echo
        log_info "Checking test coverage..."
        local coverage=$(pytest "$TEST_DIR" --cov="$SRC_DIR" --cov-report=term-missing | \
                        grep "^TOTAL" | awk '{print $4}' | tr -d '%')

        echo
        if [ "$coverage" -ge "$COVERAGE_TARGET" ]; then
            log_success "✅ Coverage: ${coverage}% (target: ${COVERAGE_TARGET}%)"
        else
            log_warning "⚠️  Coverage: ${coverage}% (target: ${COVERAGE_TARGET}%)"
            log_info "Consider adding more tests in next cycle"
        fi

        # Complete cycle
        record_cycle "true"
        update_tdd_state "red" "pending"

        echo
        log_success "🎉 TDD Cycle Complete!"
        log_info "Start next cycle: '$0 red' to add another test"

        return 0
    else
        log_error "❌ Tests broken by refactoring! Undo changes and try again"
        log_info "Use 'git diff' to see what changed"
        log_info "Refactor in smaller steps"
        return 1
    fi
}

#######################################
# Run complete TDD cycle
#######################################
run_cycle() {
    local test_file="$1"

    log_info "Running complete TDD cycle for $test_file"
    echo

    # Initialize if needed
    if [ ! -f "$STATE_FILE" ]; then
        init_tdd_state "$test_file"
    fi

    # RED phase
    if ! phase_red; then
        log_error "RED phase failed. Fix and retry."
        return 1
    fi

    echo
    read -p "Press Enter to continue to GREEN phase..." -r
    echo

    # GREEN phase
    if ! phase_green; then
        log_error "GREEN phase failed. Fix and retry."
        return 1
    fi

    echo
    read -p "Press Enter to continue to REFACTOR phase..." -r
    echo

    # REFACTOR phase
    if ! phase_refactor; then
        log_error "REFACTOR phase failed. Fix and retry."
        return 1
    fi

    log_success "Complete TDD cycle finished successfully!"
}

#######################################
# Show TDD status
#######################################
show_status() {
    if [ ! -f "$STATE_FILE" ]; then
        log_info "TDD workflow not initialized"
        log_info "Run: $0 init <test-file> to start"
        return 0
    fi

    local phase=$(jq -r '.current_phase' "$STATE_FILE")
    local test_file=$(jq -r '.test_file' "$STATE_FILE")
    local cycle_count=$(jq -r '.cycle_count' "$STATE_FILE")
    local last_run=$(jq -r '.last_run' "$STATE_FILE")

    echo
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  TDD Workflow Status"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo
    echo "Test File:     $test_file"
    echo "Current Phase: $phase"
    echo "Cycle Count:   $cycle_count"
    echo "Last Run:      $last_run"
    echo

    # Show phase status
    echo "Phase Status:"
    jq -r '.phases | to_entries[] |
           "  " + .key + ": " + .value.status' \
           "$STATE_FILE"

    echo
    echo "Next Step: Run '$0 $phase'"
    echo
}

#######################################
# Reset TDD state
#######################################
reset_state() {
    if [ -f "$STATE_FILE" ]; then
        mv "$STATE_FILE" "$STATE_FILE.backup"
        log_success "TDD state reset (backup saved)"
    else
        log_info "No TDD state to reset"
    fi
}

#######################################
# Watch mode
#######################################
watch_mode() {
    log_info "Starting watch mode..."
    log_info "Tests will re-run on file changes"
    log_info "Press Ctrl+C to stop"
    echo

    # Use pytest-watch if available, otherwise fallback
    if command -v ptw &> /dev/null; then
        ptw "$TEST_DIR" -- -v --cov="$SRC_DIR"
    elif command -v inotifywait &> /dev/null; then
        while true; do
            pytest "$TEST_DIR" -v --cov="$SRC_DIR"
            echo
            log_info "Waiting for changes..."
            inotifywait -qre modify "$SRC_DIR" "$TEST_DIR"
            echo
            log_info "Changes detected, re-running tests..."
        done
    else
        log_error "Watch mode requires 'pytest-watch' or 'inotifywait'"
        log_info "Install with: pip install pytest-watch"
        exit 1
    fi
}

#######################################
# Main script
#######################################
main() {
    local command="${1:-}"
    shift || true

    # Parse options
    local test_file=""
    local show_coverage=false
    local watch=false
    local verbose=false

    while [[ $# -gt 0 ]]; do
        case "$1" in
            -h|--help)
                usage
                ;;
            -f|--file)
                test_file="$2"
                shift 2
                ;;
            -c|--coverage)
                show_coverage=true
                shift
                ;;
            -w|--watch)
                watch=true
                shift
                ;;
            -v|--verbose)
                verbose=true
                shift
                ;;
            *)
                log_error "Unknown option: $1"
                usage
                ;;
        esac
    done

    # Handle commands
    case "$command" in
        init)
            if [ -z "$test_file" ]; then
                log_error "Usage: $0 init <test-file>"
                exit 1
            fi
            init_tdd_state "$test_file"
            ;;
        red)
            phase_red
            ;;
        green)
            phase_green
            ;;
        refactor)
            phase_refactor
            ;;
        cycle)
            if [ -z "$test_file" ]; then
                log_error "Usage: $0 cycle -f <test-file>"
                exit 1
            fi
            run_cycle "$test_file"
            ;;
        status)
            show_status
            ;;
        reset)
            reset_state
            ;;
        "")
            if [ "$watch" = true ]; then
                watch_mode
            else
                usage
            fi
            ;;
        *)
            log_error "Unknown command: $command"
            usage
            ;;
    esac
}

# Run main
main "$@"
