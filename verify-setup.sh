#!/usr/bin/env bash

#############################################
# NXTG-Forge Setup Verification Script
#############################################
# Validates .claude/ directory structure
# Checks frontmatter in all agents
# Verifies agents appear in Claude Code
# Auto-fixes common issues
#
# Usage:
#   ./verify-setup.sh [--fix]
#############################################

set -e
set -u

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNINGS=0
FIXES_APPLIED=0

# Flags
AUTO_FIX=false
if [[ "${1:-}" == "--fix" ]]; then
    AUTO_FIX=true
fi

#############################################
# Helper Functions
#############################################

log_info() {
    echo -e "${BLUE}ℹ${NC}  $1"
}

log_success() {
    echo -e "${GREEN}✓${NC}  $1"
    ((PASSED_CHECKS++))
}

log_warning() {
    echo -e "${YELLOW}⚠${NC}  $1"
    ((WARNINGS++))
}

log_error() {
    echo -e "${RED}✗${NC}  $1"
    ((FAILED_CHECKS++))
}

log_fixed() {
    echo -e "${GREEN}🔧${NC} Fixed: $1"
    ((FIXES_APPLIED++))
}

check_start() {
    ((TOTAL_CHECKS++))
}

#############################################
# Validation Functions
#############################################

check_directory_structure() {
    log_info "Checking directory structure..."
    echo ""

    local required_dirs=(
        ".claude"
        ".claude/agents"
        ".claude/commands"
        ".claude/hooks"
        ".claude/skills"
        ".claude/templates"
        ".claude/forge"
    )

    for dir in "${required_dirs[@]}"; do
        check_start
        if [ -d "$dir" ]; then
            log_success "Directory exists: $dir"
        else
            log_error "Missing directory: $dir"
            if [ "$AUTO_FIX" = true ]; then
                mkdir -p "$dir"
                log_fixed "Created $dir"
            fi
        fi
    done

    echo ""
}

check_canonical_docs() {
    log_info "Checking canonical documentation structure..."
    echo ""

    local required_docs=(
        "docs/architecture"
        "docs/design"
        "docs/features"
        "docs/testing"
        "docs/workflow"
        "docs/sessions"
        "docs/guides"
        "docs/api"
    )

    for dir in "${required_docs[@]}"; do
        check_start
        if [ -d "$dir" ]; then
            log_success "Documentation directory exists: $dir"
        else
            log_warning "Missing documentation directory: $dir (optional)"
        fi
    done

    echo ""
}

check_frontmatter() {
    local file="$1"
    local filename=$(basename "$file")

    check_start

    # Check if file starts with ---
    if ! head -1 "$file" | grep -q "^---$"; then
        log_error "Missing frontmatter in $filename"
        return 1
    fi

    # Extract frontmatter (between first two ---)
    local frontmatter=$(sed -n '/^---$/,/^---$/p' "$file" | sed '1d;$d')

    # Check for required fields
    local required_fields=("name:" "description:")
    local missing_fields=()

    for field in "${required_fields[@]}"; do
        if ! echo "$frontmatter" | grep -q "^$field"; then
            missing_fields+=("${field%:}")
        fi
    done

    if [ ${#missing_fields[@]} -eq 0 ]; then
        log_success "Valid frontmatter: $filename"
        return 0
    else
        log_error "Missing required fields in $filename: ${missing_fields[*]}"
        return 1
    fi
}

check_agents() {
    log_info "Checking agent frontmatter..."
    echo ""

    if [ ! -d ".claude/agents" ]; then
        log_error "No .claude/agents/ directory found"
        echo ""
        return
    fi

    local agent_count=0
    local valid_agents=0

    for agent_file in .claude/agents/*.md; do
        if [ -f "$agent_file" ]; then
            ((agent_count++))
            if check_frontmatter "$agent_file"; then
                ((valid_agents++))
            fi
        fi
    done

    echo ""
    if [ $agent_count -eq 0 ]; then
        log_warning "No agents found in .claude/agents/"
    else
        log_info "Validated $valid_agents out of $agent_count agents"
    fi
    echo ""
}

check_commands() {
    log_info "Checking command frontmatter..."
    echo ""

    if [ ! -d ".claude/commands" ]; then
        log_error "No .claude/commands/ directory found"
        echo ""
        return
    fi

    local command_count=0
    local valid_commands=0

    for cmd_file in .claude/commands/*.md; do
        if [ -f "$cmd_file" ] && [[ ! "$cmd_file" =~ Zone.Identifier$ ]]; then
            ((command_count++))
            if check_frontmatter "$cmd_file"; then
                ((valid_commands++))
            fi
        fi
    done

    echo ""
    if [ $command_count -eq 0 ]; then
        log_warning "No commands found in .claude/commands/"
    else
        log_info "Validated $valid_commands out of $command_count commands"
    fi
    echo ""
}

check_state_management() {
    log_info "Checking state management..."
    echo ""

    check_start
    if [ -f ".claude/forge/state.json" ]; then
        # Validate JSON syntax
        if python3 -m json.tool .claude/forge/state.json > /dev/null 2>&1 || \
           node -e "JSON.parse(require('fs').readFileSync('.claude/forge/state.json'))" > /dev/null 2>&1; then
            log_success "state.json is valid JSON"
        else
            log_error "state.json has invalid JSON syntax"
        fi
    else
        log_warning "No state.json found (will be created on first run)"
    fi

    check_start
    if [ -f ".claude/forge/state.schema.json" ]; then
        log_success "state.schema.json exists"
    else
        log_warning "No state.schema.json found"
    fi

    echo ""
}

check_non_standard_folders() {
    log_info "Checking for non-standard folders..."
    echo ""

    # .claude/features/ is NOT a Claude Code standard
    check_start
    if [ -d ".claude/features" ]; then
        log_error "Non-standard folder found: .claude/features/"
        log_info "   Standard location: docs/features/"
        if [ "$AUTO_FIX" = true ]; then
            if [ ! -d "docs/features" ]; then
                mkdir -p docs/features
            fi
            if [ -n "$(ls -A .claude/features 2>/dev/null)" ]; then
                mv .claude/features/* docs/features/ 2>/dev/null || true
                log_fixed "Moved .claude/features/ → docs/features/"
            fi
            rmdir .claude/features 2>/dev/null || true
        fi
    else
        log_success "No non-standard folders in .claude/"
    fi

    echo ""
}

check_gitignore() {
    log_info "Checking .gitignore entries..."
    echo ""

    check_start
    if [ ! -f ".gitignore" ]; then
        log_warning "No .gitignore file found"
        if [ "$AUTO_FIX" = true ]; then
            touch .gitignore
            log_fixed "Created .gitignore"
        fi
    else
        if grep -q ".claude/forge/state.json" .gitignore 2>/dev/null; then
            log_success ".gitignore has Forge entries"
        else
            log_warning ".gitignore missing Forge entries"
            if [ "$AUTO_FIX" = true ]; then
                cat >> .gitignore <<'EOF'

# NXTG-Forge
.claude/forge/state.json
.claude/forge/*.log
EOF
                log_fixed "Added Forge entries to .gitignore"
            fi
        fi
    fi

    echo ""
}

#############################################
# Summary Report
#############################################

display_summary() {
    echo ""
    echo -e "${BLUE}════════════════════════════════════════════${NC}"
    echo -e "${BLUE}           Verification Summary${NC}"
    echo -e "${BLUE}════════════════════════════════════════════${NC}"
    echo ""

    local total_validated=$((PASSED_CHECKS + FAILED_CHECKS))
    local success_rate=0
    if [ $total_validated -gt 0 ]; then
        success_rate=$((PASSED_CHECKS * 100 / total_validated))
    fi

    echo -e "  Total Checks:     ${TOTAL_CHECKS}"
    echo -e "  ${GREEN}Passed:${NC}           ${PASSED_CHECKS}"
    echo -e "  ${RED}Failed:${NC}           ${FAILED_CHECKS}"
    echo -e "  ${YELLOW}Warnings:${NC}         ${WARNINGS}"

    if [ "$AUTO_FIX" = true ]; then
        echo -e "  ${GREEN}Fixes Applied:${NC}    ${FIXES_APPLIED}"
    fi

    echo ""
    echo -e "  Success Rate:     ${success_rate}%"
    echo ""

    if [ $FAILED_CHECKS -eq 0 ]; then
        echo -e "${GREEN}✓ Setup verification passed!${NC}"
        echo ""
        echo -e "  Next steps:"
        echo -e "    • Run ${YELLOW}/enable-forge${NC} to access command center"
        echo -e "    • Run ${YELLOW}/status${NC} to view project state"
        echo -e "    • Start with ${YELLOW}/feature${NC} to begin development"
    else
        echo -e "${RED}✗ Setup verification failed${NC}"
        echo ""
        if [ "$AUTO_FIX" = false ]; then
            echo -e "  Run with ${YELLOW}--fix${NC} flag to automatically fix issues:"
            echo -e "    ${BLUE}./verify-setup.sh --fix${NC}"
        else
            echo -e "  Some issues could not be auto-fixed."
            echo -e "  Please review the errors above and fix manually."
        fi
    fi

    echo ""
    echo -e "${BLUE}════════════════════════════════════════════${NC}"
    echo ""
}

#############################################
# Main Execution
#############################################

main() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║                                            ║${NC}"
    echo -e "${BLUE}║    NXTG-Forge Setup Verification          ║${NC}"
    if [ "$AUTO_FIX" = true ]; then
        echo -e "${BLUE}║    Mode: Auto-fix enabled                  ║${NC}"
    else
        echo -e "${BLUE}║    Mode: Validation only                   ║${NC}"
    fi
    echo -e "${BLUE}║                                            ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
    echo ""

    check_directory_structure
    check_canonical_docs
    check_agents
    check_commands
    check_state_management
    check_non_standard_folders
    check_gitignore

    display_summary

    # Exit code based on failures
    if [ $FAILED_CHECKS -eq 0 ]; then
        exit 0
    else
        exit 1
    fi
}

main "$@"
