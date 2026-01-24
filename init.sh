#!/usr/bin/env bash

#############################################
# NXTG-Forge v2.1 Initialization Script
#############################################
# Pure scaffolding tool - NO Python dependencies
# Creates .claude/ directory structure for Claude Code enhancement
#
# Usage:
#   ./init.sh [project-type]
#
# Project types: python, typescript, fullstack, minimal
#############################################

set -e  # Exit on error
set -u  # Exit on undefined variable

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATES_DIR="${SCRIPT_DIR}/templates"

# Target directory (current directory by default)
TARGET_DIR="${1:-.}"
PROJECT_TYPE="${2:-python}"

#############################################
# Helper Functions
#############################################

log_info() {
    echo -e "${BLUE}ℹ${NC}  $1"
}

log_success() {
    echo -e "${GREEN}✓${NC}  $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC}  $1"
}

log_error() {
    echo -e "${RED}✗${NC}  $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check if we're in a git repository
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        log_warning "Not in a git repository. Consider running 'git init' first."
    fi

    log_success "Prerequisites check complete"
}

create_directory_structure() {
    log_info "Creating .claude/ directory structure..."

    local claude_dir="${TARGET_DIR}/.claude"

    # Create standard Claude Code directories
    mkdir -p "${claude_dir}/agents"
    mkdir -p "${claude_dir}/commands"
    mkdir -p "${claude_dir}/hooks"
    mkdir -p "${claude_dir}/skills"
    mkdir -p "${claude_dir}/templates"
    mkdir -p "${claude_dir}/forge"

    # Create canonical documentation structure
    mkdir -p "${TARGET_DIR}/docs/architecture"
    mkdir -p "${TARGET_DIR}/docs/design"
    mkdir -p "${TARGET_DIR}/docs/features"
    mkdir -p "${TARGET_DIR}/docs/testing"
    mkdir -p "${TARGET_DIR}/docs/workflow"
    mkdir -p "${TARGET_DIR}/docs/sessions"
    mkdir -p "${TARGET_DIR}/docs/guides"
    mkdir -p "${TARGET_DIR}/docs/api"

    log_success "Directory structure created"
}

install_agents() {
    log_info "Installing Forge agents..."

    local agents_dir="${TARGET_DIR}/.claude/agents"

    # Copy agent templates
    if [ -d "${TEMPLATES_DIR}/agents" ]; then
        cp -r "${TEMPLATES_DIR}/agents/"* "${agents_dir}/"
        log_success "Agents installed"
    else
        log_warning "Agent templates not found at ${TEMPLATES_DIR}/agents"
    fi
}

install_commands() {
    log_info "Installing slash commands..."

    local commands_dir="${TARGET_DIR}/.claude/commands"

    # Copy command templates
    if [ -d "${TEMPLATES_DIR}/commands" ]; then
        cp -r "${TEMPLATES_DIR}/commands/"* "${commands_dir}/"
        log_success "Commands installed"
    else
        log_warning "Command templates not found at ${TEMPLATES_DIR}/commands"
    fi
}

install_hooks() {
    log_info "Installing hooks..."

    local hooks_dir="${TARGET_DIR}/.claude/hooks"

    # Copy hook templates
    if [ -d "${TEMPLATES_DIR}/hooks" ]; then
        cp -r "${TEMPLATES_DIR}/hooks/"* "${hooks_dir}/"

        # Make hooks executable
        chmod +x "${hooks_dir}"/*.sh 2>/dev/null || true

        log_success "Hooks installed"
    else
        log_warning "Hook templates not found at ${TEMPLATES_DIR}/hooks"
    fi
}

install_skills() {
    log_info "Installing skills..."

    local skills_dir="${TARGET_DIR}/.claude/skills"

    # Copy skill templates
    if [ -d "${TEMPLATES_DIR}/skills" ]; then
        cp -r "${TEMPLATES_DIR}/skills/"* "${skills_dir}/"
        log_success "Skills installed"
    else
        log_warning "Skill templates not found at ${TEMPLATES_DIR}/skills"
    fi
}

initialize_state() {
    log_info "Initializing state management..."

    local forge_dir="${TARGET_DIR}/.claude/forge"
    local state_file="${forge_dir}/state.json"

    # Copy state schema
    if [ -f "${SCRIPT_DIR}/.claude/forge/state.schema.json" ]; then
        cp "${SCRIPT_DIR}/.claude/forge/state.schema.json" "${forge_dir}/"
    fi

    # Create initial state.json
    if [ ! -f "${state_file}" ]; then
        local session_id=$(uuidgen 2>/dev/null || echo "$(date +%s)-$$-$RANDOM")
        local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

        cat > "${state_file}" <<EOF
{
  "version": "2.0",
  "session": {
    "id": "${session_id}",
    "started": "${timestamp}",
    "last_updated": "${timestamp}",
    "token_usage": {
      "current": 0,
      "limit": 200000,
      "last_compact": null
    }
  },
  "context": {
    "current_goal": "Project initialization",
    "completed_work": [],
    "pending_todos": [],
    "key_decisions": [],
    "discoveries": []
  },
  "recovery": {
    "instructions": "Project just initialized with NXTG-Forge. Ready to start development.",
    "checkpoint": "initial",
    "next_steps": [
      "Run /enable-forge to access command center",
      "Run /status to view project state",
      "Start first feature with /feature command"
    ],
    "blockers": [],
    "context_summary": "Fresh NXTG-Forge initialization - ready to begin"
  },
  "engagement_quality": {
    "current_score": 100,
    "metrics": {
      "contextAwareness": 100,
      "updateRichness": 100,
      "progressClarity": 100,
      "insightCapture": 100
    },
    "history": []
  },
  "agents_used": []
}
EOF
        log_success "State management initialized"
    else
        log_warning "State file already exists - skipping initialization"
    fi
}

create_canonical_docs() {
    log_info "Creating canonical documentation templates..."

    # Architecture doc
    cat > "${TARGET_DIR}/docs/architecture/canonical-arch.md" <<'EOF'
# Canonical Architecture Documentation

**Purpose**: Single source of truth for all architectural decisions and system design.

**Last Updated**: $(date +"%Y-%m-%d")

---

## System Overview

[Describe your system's high-level architecture]

## Key Architectural Decisions

### Decision 1: [Decision Title]
**Date**: YYYY-MM-DD
**Decision**: [What was decided]
**Rationale**: [Why this decision was made]
**Alternatives Considered**: [What else was considered]
**Trade-offs**: [What trade-offs were made]

---

## Component Architecture

[Describe your system's components and their relationships]

## Data Flow

[Describe how data flows through your system]

## Integration Points

[Describe external integrations]

## Scalability & Performance

[Describe scalability considerations]

## Security Architecture

[Describe security measures and considerations]

---

**Note**: This document is automatically loaded in new Claude Code sessions. Keep it updated!
EOF

    # Design doc
    cat > "${TARGET_DIR}/docs/design/canonical-design.md" <<'EOF'
# Canonical Design Documentation

**Purpose**: Single source of truth for UI/UX patterns, design decisions, and frontend architecture.

**Last Updated**: $(date +"%Y-%m-%d")

---

## Design System

[Describe your design system, component library, etc.]

## UI/UX Patterns

[Document common UI/UX patterns]

## Component Architecture

[Describe frontend component structure]

## Design Decisions

### Decision 1: [Decision Title]
**Date**: YYYY-MM-DD
**Decision**: [What was decided]
**Rationale**: [Why this decision was made]

---

**Note**: This document is automatically loaded in new Claude Code sessions. Keep it updated!
EOF

    # Testing doc
    cat > "${TARGET_DIR}/docs/testing/canonical-testing.md" <<'EOF'
# Canonical Testing Documentation

**Purpose**: Single source of truth for testing philosophy, patterns, and practices.

**Last Updated**: $(date +"%Y-%m-%d")

---

## Testing Philosophy

### NO MOCKING Principle
We prioritize real data testing over mocking:
- Use real database connections (with test database)
- Use real Pydantic models via `.model_copy()`
- Use real async operations
- Mock only when absolutely necessary (external APIs, slow operations)

### Three-Pillar Testing Approach
1. **Unit Tests** (60-70%): Test individual functions and classes
2. **Integration Tests** (20-30%): Test component interactions
3. **Runtime Validation** (5-10%): Monitor production logs for errors

---

## Testing Patterns

[Document your testing patterns and best practices]

## Test Coverage Goals

- Overall: >80%
- Critical paths: >95%
- New code: >90%

---

**Note**: This document is automatically loaded in new Claude Code sessions. Keep it updated!
EOF

    # Workflow doc
    cat > "${TARGET_DIR}/docs/workflow/canonical-workflow.md" <<'EOF'
# Canonical Workflow Documentation

**Purpose**: Single source of truth for development workflows, Forge usage patterns, and team processes.

**Last Updated**: $(date +"%Y-%m-%d")

---

## Forge Agent Workflow

### Recommended Pattern
1. **forge-orchestrator**: Plan and strategize
2. **Parallel agents**: Execute work
   - nxtg-master-architect: Architecture & design
   - forge-builder: Implementation
   - nxtg-design-vanguard: UI/UX
3. **forge-guardian**: Verify and validate

### Agent Specialization
- **forge-orchestrator**: Planning, coordination, strategic decisions
- **nxtg-master-architect**: Architecture, system design, code review
- **forge-builder**: Implementation, coding, refactoring
- **nxtg-design-vanguard**: UI/UX design, frontend patterns
- **forge-guardian**: Quality assurance, testing, security

---

## Development Workflow

[Document your team's development workflow]

## Code Review Process

[Document code review expectations]

## Release Process

[Document release workflow]

---

**Note**: This document is automatically loaded in new Claude Code sessions. Keep it updated!
EOF

    log_success "Canonical documentation created"
}

create_gitignore_entries() {
    log_info "Adding .gitignore entries..."

    local gitignore="${TARGET_DIR}/.gitignore"

    # Create .gitignore if it doesn't exist
    if [ ! -f "${gitignore}" ]; then
        touch "${gitignore}"
    fi

    # Add Forge-specific entries if they don't exist
    if ! grep -q ".claude/forge/state.json" "${gitignore}" 2>/dev/null; then
        cat >> "${gitignore}" <<'EOF'

# NXTG-Forge
.claude/forge/state.json
.claude/forge/*.log
EOF
        log_success ".gitignore entries added"
    else
        log_warning ".gitignore entries already exist - skipping"
    fi
}

display_next_steps() {
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                        ║${NC}"
    echo -e "${GREEN}║  🚀 NXTG-Forge Initialization Complete!                ║${NC}"
    echo -e "${GREEN}║                                                        ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BLUE}Next Steps:${NC}"
    echo ""
    echo -e "  1. ${YELLOW}/enable-forge${NC} - Access the command center"
    echo -e "  2. ${YELLOW}/status${NC} - View current project state"
    echo -e "  3. ${YELLOW}/verify-setup${NC} - Validate installation"
    echo ""
    echo -e "${BLUE}Available Agents:${NC}"
    echo -e "  • ${GREEN}forge-orchestrator${NC} - Planning & coordination"
    echo -e "  • ${GREEN}nxtg-master-architect${NC} - Architecture & design"
    echo -e "  • ${GREEN}forge-builder${NC} - Implementation"
    echo -e "  • ${GREEN}nxtg-design-vanguard${NC} - UI/UX"
    echo -e "  • ${GREEN}forge-guardian${NC} - Quality assurance"
    echo ""
    echo -e "${BLUE}Capabilities:${NC}"
    echo -e "  ✨ Run up to 20 agents in parallel"
    echo -e "  📊 Runtime validation monitoring"
    echo -e "  🔄 Automatic state persistence"
    echo -e "  📚 Canonical documentation system"
    echo ""
    echo -e "${BLUE}Documentation:${NC}"
    echo -e "  📁 ${GREEN}docs/architecture/canonical-arch.md${NC}"
    echo -e "  📁 ${GREEN}docs/design/canonical-design.md${NC}"
    echo -e "  📁 ${GREEN}docs/testing/canonical-testing.md${NC}"
    echo -e "  📁 ${GREEN}docs/workflow/canonical-workflow.md${NC}"
    echo ""
}

#############################################
# Main Execution
#############################################

main() {
    echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║                                                        ║${NC}"
    echo -e "${BLUE}║        NXTG-Forge v2.1 Initialization                  ║${NC}"
    echo -e "${BLUE}║        Pure Scaffolding Tool - No Python Required      ║${NC}"
    echo -e "${BLUE}║                                                        ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
    echo ""

    check_prerequisites
    create_directory_structure
    install_agents
    install_commands
    install_hooks
    install_skills
    initialize_state
    create_canonical_docs
    create_gitignore_entries
    display_next_steps
}

# Run main function
main "$@"
