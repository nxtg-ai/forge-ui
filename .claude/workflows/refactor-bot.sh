#!/usr/bin/env bash
# Automated Refactoring Bot
# Identifies refactoring opportunities and applies safe refactorings

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
SRC_DIR="$PROJECT_ROOT/forge"
TEST_DIR="$PROJECT_ROOT/tests"
REPORT_DIR="$PROJECT_ROOT/.claude/refactoring-reports"
REPORT_FILE="$REPORT_DIR/refactoring-$(date +%Y%m%d-%H%M%S).md"

# Thresholds (from config or defaults)
MAX_FUNCTION_LENGTH=50
MAX_CLASS_LENGTH=300
MAX_COMPLEXITY=10
MAX_PARAMS=4

#######################################
# Print usage information
#######################################
usage() {
    cat << EOF
Automated Refactoring Bot

Usage: $0 [COMMAND] [OPTIONS]

Commands:
    analyze [path]            Analyze code for refactoring opportunities
    report                    Generate refactoring report
    suggest [file]            Suggest refactorings for specific file
    apply [type] [file]       Apply safe automated refactorings
    verify                    Verify refactoring didn't break tests

Refactoring Types:
    extract-method            Extract long methods into smaller ones
    rename                    Rename variables/functions for clarity
    remove-duplication        Identify and suggest duplicate code removal
    simplify                  Simplify complex conditions

Options:
    -h, --help               Show this help message
    -v, --verbose            Verbose output
    -d, --dry-run            Show what would be done without applying
    -f, --force              Skip confirmation prompts
    --threshold N            Set complexity threshold

Examples:
    # Analyze entire codebase
    $0 analyze

    # Analyze specific directory
    $0 analyze forge/domain/

    # Generate detailed report
    $0 report

    # Suggest refactorings for file
    $0 suggest forge/domain/entities/user.py

    # Apply safe refactorings
    $0 apply extract-method forge/application/use_cases/create_user.py

EOF
    exit 0
}

#######################################
# Initialize report directory
#######################################
init_report_dir() {
    mkdir -p "$REPORT_DIR"
}

#######################################
# Analyze code complexity
#######################################
analyze_complexity() {
    local target="${1:-$SRC_DIR}"

    log_info "Analyzing code complexity for: $target"
    echo

    # Check if radon is available
    if ! command -v radon &> /dev/null; then
        log_warning "radon not found. Install with: pip install radon"
        return 1
    fi

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  Cyclomatic Complexity Analysis"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo

    # Analyze cyclomatic complexity
    radon cc "$target" -a -s | tee -a "$REPORT_FILE"

    echo
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  Maintainability Index"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo

    # Analyze maintainability
    radon mi "$target" -s | tee -a "$REPORT_FILE"

    echo
    log_success "Complexity analysis complete"
}

#######################################
# Find long functions
#######################################
find_long_functions() {
    local target="${1:-$SRC_DIR}"

    log_info "Searching for long functions (> $MAX_FUNCTION_LENGTH lines)"
    echo

    {
        echo "## Long Functions"
        echo
        echo "Functions exceeding $MAX_FUNCTION_LENGTH lines should be extracted:"
        echo
    } >> "$REPORT_FILE"

    local found=0

    # Find Python functions and count lines
    while IFS= read -r file; do
        # Extract function definitions and count lines
        awk '/^[[:space:]]*def [a-zA-Z_]/ {
            func_start = NR
            func_name = $0
            in_func = 1
            line_count = 0
        }
        in_func {
            line_count++
            # Simple heuristic: function ends when indentation returns to function level
            if (NR > func_start && /^[[:space:]]*def [a-zA-Z_]/ || /^[[:space:]]*class [a-zA-Z_]/ || /^[^[:space:]]/) {
                if (line_count > '"$MAX_FUNCTION_LENGTH"') {
                    print FILENAME ":" func_start " - " func_name " (" line_count " lines)"
                    found++
                }
                in_func = 0
            }
        }
        END {
            if (in_func && line_count > '"$MAX_FUNCTION_LENGTH"') {
                print FILENAME ":" func_start " - " func_name " (" line_count " lines)"
            }
        }' "$file" FILENAME="$file"
    done < <(find "$target" -name "*.py" -type f ! -path "*/test_*" ! -path "*/__pycache__/*")

    if [ "$found" -gt 0 ]; then
        log_warning "Found $found long functions"
        {
            echo
            echo "**Recommendation**: Extract these functions into smaller, focused methods"
            echo
        } >> "$REPORT_FILE"
    else
        log_success "No long functions found"
        echo "✅ No long functions found" >> "$REPORT_FILE"
    fi
}

#######################################
# Find code duplication
#######################################
find_duplication() {
    local target="${1:-$SRC_DIR}"

    log_info "Searching for code duplication..."
    echo

    {
        echo "## Code Duplication"
        echo
    } >> "$REPORT_FILE"

    # Check if pylint is available
    if command -v pylint &> /dev/null; then
        log_info "Running pylint duplicate code detection..."
        pylint --disable=all --enable=duplicate-code "$target" 2>&1 | \
            tee -a "$REPORT_FILE" || true
    else
        log_warning "pylint not found. Install with: pip install pylint"
        echo "⚠️  pylint not available for duplication detection" >> "$REPORT_FILE"
    fi

    # Alternative: use simple pattern matching
    log_info "Checking for similar patterns..."
    echo

    # Find files with similar imports (might indicate duplication)
    {
        echo "### Files with Similar Imports"
        echo
    } >> "$REPORT_FILE"

    find "$target" -name "*.py" -type f -exec head -20 {} \; | \
        sort | uniq -c | sort -rn | head -10 >> "$REPORT_FILE" || true
}

#######################################
# Find complex conditionals
#######################################
find_complex_conditionals() {
    local target="${1:-$SRC_DIR}"

    log_info "Searching for complex conditionals..."
    echo

    {
        echo "## Complex Conditionals"
        echo
        echo "Conditionals with multiple 'and'/'or' operators should be simplified:"
        echo
    } >> "$REPORT_FILE"

    # Find complex if statements (multiple and/or)
    local complex_ifs=$(grep -rn "if.*and.*and\|if.*or.*or" "$target" --include="*.py" | \
                       grep -v "test_" | head -20)

    if [ -n "$complex_ifs" ]; then
        echo "$complex_ifs" | tee -a "$REPORT_FILE"
        echo
        log_warning "Found complex conditionals"
        {
            echo
            echo "**Recommendation**: Extract conditions to well-named functions"
            echo
        } >> "$REPORT_FILE"
    else
        log_success "No overly complex conditionals found"
        echo "✅ No overly complex conditionals found" >> "$REPORT_FILE"
    fi
}

#######################################
# Find long parameter lists
#######################################
find_long_parameter_lists() {
    local target="${1:-$SRC_DIR}"

    log_info "Searching for long parameter lists (> $MAX_PARAMS parameters)..."
    echo

    {
        echo "## Long Parameter Lists"
        echo
    } >> "$REPORT_FILE"

    # Find function definitions with many parameters
    local long_params=$(grep -rn "def [a-zA-Z_]*([^)]*," "$target" --include="*.py" | \
                       grep -v "test_" | \
                       awk -F: '{
                           count = gsub(",", ",", $0)
                           if (count >= '"$MAX_PARAMS"') print $0 " (" count+1 " params)"
                       }' | head -20)

    if [ -n "$long_params" ]; then
        echo "$long_params" | tee -a "$REPORT_FILE"
        echo
        log_warning "Found functions with long parameter lists"
        {
            echo
            echo "**Recommendation**: Introduce parameter objects or use kwargs"
            echo
        } >> "$REPORT_FILE"
    else
        log_success "No long parameter lists found"
        echo "✅ No long parameter lists found" >> "$REPORT_FILE"
    fi
}

#######################################
# Find commented code
#######################################
find_commented_code() {
    local target="${1:-$SRC_DIR}"

    log_info "Searching for commented-out code..."
    echo

    {
        echo "## Commented-Out Code"
        echo
    } >> "$REPORT_FILE"

    # Find likely commented code (lines starting with # followed by code patterns)
    local commented=$(grep -rn "^[[:space:]]*#[[:space:]]*\(def\|class\|import\|if\|for\|while\)" \
                     "$target" --include="*.py" | \
                     grep -v "test_" | \
                     grep -v "# type:" | \
                     head -20)

    if [ -n "$commented" ]; then
        echo "$commented" | tee -a "$REPORT_FILE"
        echo
        log_warning "Found commented-out code"
        {
            echo
            echo "**Recommendation**: Remove commented code (use version control instead)"
            echo
        } >> "$REPORT_FILE"
    else
        log_success "No commented-out code found"
        echo "✅ No commented-out code found" >> "$REPORT_FILE"
    fi
}

#######################################
# Find magic numbers
#######################################
find_magic_numbers() {
    local target="${1:-$SRC_DIR}"

    log_info "Searching for magic numbers..."
    echo

    {
        echo "## Magic Numbers"
        echo
    } >> "$REPORT_FILE"

    # Find numeric literals that should be constants
    local magic_numbers=$(grep -rn "[^a-zA-Z0-9_][0-9][0-9][0-9]*[^a-zA-Z0-9_]" \
                         "$target" --include="*.py" | \
                         grep -v "test_" | \
                         grep -v "# " | \
                         grep -v "range(" | \
                         grep -v "\[0\]\|\[1\]\|\[2\]" | \
                         head -20)

    if [ -n "$magic_numbers" ]; then
        echo "$magic_numbers" | tee -a "$REPORT_FILE"
        echo
        log_warning "Found magic numbers"
        {
            echo
            echo "**Recommendation**: Extract magic numbers to named constants"
            echo
        } >> "$REPORT_FILE"
    else
        log_success "No obvious magic numbers found"
        echo "✅ No obvious magic numbers found" >> "$REPORT_FILE"
    fi
}

#######################################
# Generate refactoring suggestions
#######################################
suggest_refactorings() {
    local file="$1"

    if [ ! -f "$file" ]; then
        log_error "File not found: $file"
        exit 1
    fi

    log_info "Analyzing $file for refactoring opportunities..."
    echo

    {
        echo "# Refactoring Suggestions for $file"
        echo
        echo "Generated: $(date)"
        echo
    } > "$REPORT_FILE"

    # Run various checks on the specific file
    analyze_complexity "$file"
    echo

    find_long_functions "$file"
    echo

    find_complex_conditionals "$file"
    echo

    find_long_parameter_lists "$file"
    echo

    log_success "Suggestions saved to: $REPORT_FILE"
    echo
    log_info "Review suggestions and apply manually or use: $0 apply"
}

#######################################
# Generate comprehensive report
#######################################
generate_report() {
    init_report_dir

    log_info "Generating comprehensive refactoring report..."
    echo

    {
        echo "# Code Refactoring Report"
        echo
        echo "**Generated**: $(date)"
        echo "**Project**: NXTG-Forge"
        echo "**Source**: $SRC_DIR"
        echo
        echo "---"
        echo
    } > "$REPORT_FILE"

    # Run all analyses
    analyze_complexity "$SRC_DIR"
    echo

    find_long_functions "$SRC_DIR"
    echo

    find_duplication "$SRC_DIR"
    echo

    find_complex_conditionals "$SRC_DIR"
    echo

    find_long_parameter_lists "$SRC_DIR"
    echo

    find_commented_code "$SRC_DIR"
    echo

    find_magic_numbers "$SRC_DIR"
    echo

    {
        echo
        echo "---"
        echo
        echo "## Summary"
        echo
        echo "Review the issues above and prioritize refactorings:"
        echo
        echo "1. **High Priority**: Complex code (high cyclomatic complexity)"
        echo "2. **Medium Priority**: Long functions, code duplication"
        echo "3. **Low Priority**: Magic numbers, commented code"
        echo
        echo "## Next Steps"
        echo
        echo "1. Review this report"
        echo "2. Create refactoring tasks"
        echo "3. Apply refactorings incrementally"
        echo "4. Run tests after each change"
        echo "5. Commit each refactoring separately"
        echo
    } >> "$REPORT_FILE"

    log_success "Report generated: $REPORT_FILE"
    echo
    log_info "View report: cat $REPORT_FILE"
}

#######################################
# Apply automated refactorings
#######################################
apply_refactoring() {
    local refactoring_type="$1"
    local target="${2:-$SRC_DIR}"
    local dry_run="${3:-false}"

    log_info "Applying refactoring: $refactoring_type"
    echo

    case "$refactoring_type" in
        extract-method)
            log_info "Extract method refactoring requires manual intervention"
            log_info "Use IDE refactoring tools or apply manually"
            log_info "See: .claude/prompts/refactoring.md for guidance"
            ;;
        rename)
            log_info "Rename refactoring requires manual intervention"
            log_info "Use IDE refactoring tools for safe renaming"
            ;;
        remove-duplication)
            log_info "Generating duplication report..."
            find_duplication "$target"
            log_info "Review duplications and extract common code manually"
            ;;
        simplify)
            log_info "Simplification requires manual code review"
            log_info "See suggestions in: $REPORT_FILE"
            ;;
        *)
            log_error "Unknown refactoring type: $refactoring_type"
            exit 1
            ;;
    esac
}

#######################################
# Verify refactoring safety
#######################################
verify_refactoring() {
    log_info "Verifying refactoring didn't break tests..."
    echo

    # Run tests
    if pytest "$TEST_DIR" -v; then
        log_success "✅ All tests passing - refactoring is safe!"
        return 0
    else
        log_error "❌ Tests failing - refactoring broke something!"
        log_info "Undo changes with: git checkout ."
        return 1
    fi
}

#######################################
# Interactive refactoring wizard
#######################################
refactoring_wizard() {
    log_info "Starting interactive refactoring wizard..."
    echo

    # Generate report first
    generate_report

    echo
    log_info "Report generated. Review it and select refactorings to apply."
    echo

    read -p "Open report now? [y/N] " -r
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        ${EDITOR:-vim} "$REPORT_FILE"
    fi

    echo
    log_info "Select a refactoring to apply:"
    echo "  1) Extract long methods"
    echo "  2) Remove code duplication"
    echo "  3) Simplify complex conditions"
    echo "  4) Remove commented code"
    echo "  5) Extract magic numbers to constants"
    echo "  6) Exit"
    echo

    read -p "Selection [1-6]: " -r selection

    case "$selection" in
        1)
            log_info "Extract method refactoring"
            log_info "See .claude/prompts/refactoring.md for guidance"
            ;;
        2)
            find_duplication "$SRC_DIR"
            ;;
        3)
            find_complex_conditionals "$SRC_DIR"
            ;;
        4)
            find_commented_code "$SRC_DIR"
            log_info "Remove commented code manually"
            ;;
        5)
            find_magic_numbers "$SRC_DIR"
            log_info "Extract magic numbers to constants"
            ;;
        6)
            log_info "Exiting wizard"
            exit 0
            ;;
        *)
            log_error "Invalid selection"
            exit 1
            ;;
    esac

    echo
    read -p "Apply changes? [y/N] " -r
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Apply changes manually following the suggestions"
        log_info "Run '$0 verify' after making changes"
    fi
}

#######################################
# Main script
#######################################
main() {
    local command="${1:-}"
    shift || true

    # Parse options
    local target="$SRC_DIR"
    local dry_run=false
    local force=false
    local verbose=false

    while [[ $# -gt 0 ]]; do
        case "$1" in
            -h|--help)
                usage
                ;;
            -d|--dry-run)
                dry_run=true
                shift
                ;;
            -f|--force)
                force=true
                shift
                ;;
            -v|--verbose)
                verbose=true
                shift
                ;;
            --threshold)
                MAX_COMPLEXITY="$2"
                shift 2
                ;;
            *)
                target="$1"
                shift
                ;;
        esac
    done

    # Initialize report directory
    init_report_dir

    # Handle commands
    case "$command" in
        analyze)
            analyze_complexity "$target"
            ;;
        report)
            generate_report
            ;;
        suggest)
            if [ -z "$target" ]; then
                log_error "Usage: $0 suggest <file>"
                exit 1
            fi
            suggest_refactorings "$target"
            ;;
        apply)
            if [ -z "$target" ]; then
                log_error "Usage: $0 apply <type> <file>"
                exit 1
            fi
            apply_refactoring "$target" "${2:-}" "$dry_run"
            ;;
        verify)
            verify_refactoring
            ;;
        wizard)
            refactoring_wizard
            ;;
        "")
            # Default: generate report
            generate_report
            ;;
        *)
            log_error "Unknown command: $command"
            usage
            ;;
    esac
}

# Run main
main "$@"
