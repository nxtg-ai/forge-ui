#!/bin/bash

# NXTG-Forge Infinity Terminal Launcher
# Starts persistent Zellij session with ttyd web access
#
# Usage: ./scripts/start-infinity-terminal.sh [--layout <layout>] [--port <port>]
#
# Options:
#   --layout <name>    Layout file (default, minimal, workers)
#   --port <port>      ttyd port (default: 7681)
#   --session <name>   Custom session name
#   --web-only         Only start ttyd (attach to existing session)
#   --no-web           Only start Zellij (no web access)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$PROJECT_ROOT/.claude/logs"
SESSION_DIR="$PROJECT_ROOT/.claude/sessions"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration defaults
LAYOUT="default"
TTYD_PORT=7681
TTYD_INTERFACE="127.0.0.1"
WEB_ONLY=false
NO_WEB=false
CUSTOM_SESSION=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --layout|-l)
            LAYOUT="$2"
            shift 2
            ;;
        --port|-p)
            TTYD_PORT="$2"
            shift 2
            ;;
        --session|-s)
            CUSTOM_SESSION="$2"
            shift 2
            ;;
        --web-only)
            WEB_ONLY=true
            shift
            ;;
        --no-web)
            NO_WEB=true
            shift
            ;;
        --help|-h)
            echo "NXTG-Forge Infinity Terminal"
            echo ""
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --layout, -l <name>   Layout: default, minimal, workers"
            echo "  --port, -p <port>     ttyd port (default: 7681)"
            echo "  --session, -s <name>  Custom session name"
            echo "  --web-only            Only start ttyd (attach to existing)"
            echo "  --no-web              Only start Zellij (no web access)"
            echo "  --help, -h            Show this help"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Derive session name from project
PROJECT_NAME=$(basename "$PROJECT_ROOT" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g')
SESSION_NAME="${CUSTOM_SESSION:-forge-$PROJECT_NAME}"
LAYOUT_FILE="$PROJECT_ROOT/layouts/forge-${LAYOUT}.kdl"

# Create directories
mkdir -p "$LOG_DIR"
mkdir -p "$SESSION_DIR"

echo "═══════════════════════════════════════════════════════════════════"
echo "           INFINITY TERMINAL - STARTING"
echo "═══════════════════════════════════════════════════════════════════"
echo ""
echo -e "${CYAN}Session: ${SESSION_NAME}${NC}"
echo -e "${CYAN}Layout:  ${LAYOUT}${NC}"
echo ""

# Check dependencies
check_dependencies() {
    local missing=()

    if ! command -v zellij &> /dev/null; then
        missing+=("zellij")
    fi

    if [ "$NO_WEB" = false ] && ! command -v ttyd &> /dev/null; then
        missing+=("ttyd")
    fi

    if [ ${#missing[@]} -gt 0 ]; then
        echo -e "${RED}Missing dependencies: ${missing[*]}${NC}"
        echo ""
        echo "Run: ./scripts/setup-infinity-terminal.sh"
        exit 1
    fi
}

# Check if session exists
session_exists() {
    zellij list-sessions 2>/dev/null | grep -q "^$SESSION_NAME"
}

# Get session status
get_session_status() {
    if session_exists; then
        if zellij list-sessions 2>/dev/null | grep "^$SESSION_NAME" | grep -q "(current)"; then
            echo "attached"
        else
            echo "detached"
        fi
    else
        echo "none"
    fi
}

# Create new session
create_session() {
    echo -e "${BLUE}Creating new Zellij session: $SESSION_NAME${NC}"

    if [ -f "$LAYOUT_FILE" ]; then
        cd "$PROJECT_ROOT"
        zellij --session "$SESSION_NAME" --layout "$LAYOUT_FILE" &
        ZELLIJ_PID=$!
        echo -e "${GREEN}✓ Session created with layout: $LAYOUT${NC}"
    else
        echo -e "${YELLOW}Layout file not found: $LAYOUT_FILE${NC}"
        echo -e "${YELLOW}Using default Zellij layout${NC}"
        cd "$PROJECT_ROOT"
        zellij --session "$SESSION_NAME" &
        ZELLIJ_PID=$!
    fi

    # Wait for session to initialize
    sleep 2

    # Log session creation
    log_session_event "created" "Layout: $LAYOUT"
}

# Attach to existing session
attach_session() {
    echo -e "${BLUE}Attaching to existing session: $SESSION_NAME${NC}"
    cd "$PROJECT_ROOT"
    zellij attach "$SESSION_NAME" &
    ZELLIJ_PID=$!
    log_session_event "attached" ""
}

# Start ttyd web server
start_ttyd() {
    local ttyd_log="$LOG_DIR/ttyd.log"

    echo -e "${BLUE}Starting ttyd web server on port $TTYD_PORT...${NC}"

    # Kill existing ttyd on same port
    pkill -f "ttyd.*$TTYD_PORT" 2>/dev/null || true
    sleep 1

    # Start ttyd with Zellij attach command
    ttyd \
        --port "$TTYD_PORT" \
        --interface "$TTYD_INTERFACE" \
        --writable \
        --reconnect 5 \
        --ping-interval 30 \
        zellij attach "$SESSION_NAME" --create \
        > "$ttyd_log" 2>&1 &

    TTYD_PID=$!

    # Wait and verify
    sleep 2
    if kill -0 $TTYD_PID 2>/dev/null; then
        echo -e "${GREEN}✓ ttyd running on http://${TTYD_INTERFACE}:${TTYD_PORT}${NC}"
        log_session_event "ttyd_started" "Port: $TTYD_PORT"
    else
        echo -e "${RED}✗ ttyd failed to start${NC}"
        cat "$ttyd_log"
        exit 1
    fi
}

# Log session event
log_session_event() {
    local event="$1"
    local details="$2"
    local timestamp=$(date -Iseconds)
    local log_file="$LOG_DIR/terminal-sessions.log"

    echo "[$timestamp] Session: $SESSION_NAME | Event: $event | $details" >> "$log_file"
}

# Save session state
save_session_state() {
    local state_file="$SESSION_DIR/${SESSION_NAME}.json"

    cat > "$state_file" << EOF
{
  "session_name": "$SESSION_NAME",
  "layout": "$LAYOUT",
  "ttyd_port": $TTYD_PORT,
  "project_root": "$PROJECT_ROOT",
  "created_at": "$(date -Iseconds)",
  "pid": {
    "zellij": "${ZELLIJ_PID:-null}",
    "ttyd": "${TTYD_PID:-null}"
  }
}
EOF
    echo -e "${GREEN}✓ Session state saved${NC}"
}

# Cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down Infinity Terminal...${NC}"

    if [ -n "$TTYD_PID" ]; then
        kill $TTYD_PID 2>/dev/null || true
        echo -e "${GREEN}✓ ttyd stopped${NC}"
    fi

    # Note: We don't kill Zellij - session persists!
    echo ""
    echo -e "${CYAN}Session '$SESSION_NAME' remains active in background.${NC}"
    echo -e "${CYAN}Reattach with: zellij attach $SESSION_NAME${NC}"

    log_session_event "launcher_stopped" "Session persists"
}

trap cleanup EXIT INT TERM

# Print status
print_status() {
    echo ""
    echo "═══════════════════════════════════════════════════════════════════"
    echo -e "${GREEN}         INFINITY TERMINAL READY${NC}"
    echo "═══════════════════════════════════════════════════════════════════"
    echo ""
    echo "  Session:     $SESSION_NAME"
    echo "  Layout:      $LAYOUT"
    if [ "$NO_WEB" = false ]; then
        echo "  Web Access:  http://${TTYD_INTERFACE}:${TTYD_PORT}"
    fi
    echo "  Project:     $PROJECT_ROOT"
    echo ""
    echo "  Terminal commands:"
    echo "    - Detach: Ctrl+O then D"
    echo "    - Pane navigation: Alt+H/J/K/L"
    echo "    - New pane: Ctrl+P then N"
    echo ""
    echo "  The session persists even when you close this script."
    echo "  Reattach anytime: zellij attach $SESSION_NAME"
    echo ""
    echo "═══════════════════════════════════════════════════════════════════"
    echo ""
    echo "Press Ctrl+C to stop web server (session will persist)"
    echo ""
}

# Main execution
main() {
    check_dependencies

    local status=$(get_session_status)
    echo -e "${BLUE}Session status: $status${NC}"

    if [ "$WEB_ONLY" = true ]; then
        # Only start ttyd, expect session exists
        if [ "$status" = "none" ]; then
            echo -e "${RED}No existing session found. Run without --web-only first.${NC}"
            exit 1
        fi
        start_ttyd
        print_status
        wait $TTYD_PID
    elif [ "$NO_WEB" = true ]; then
        # Only Zellij, no web
        case $status in
            none)
                create_session
                ;;
            detached)
                attach_session
                ;;
            attached)
                echo -e "${YELLOW}Session already attached in another terminal${NC}"
                exit 0
                ;;
        esac
        wait $ZELLIJ_PID
    else
        # Full stack: Zellij + ttyd
        case $status in
            none)
                create_session
                ;;
            detached)
                echo -e "${GREEN}Found existing detached session${NC}"
                ;;
            attached)
                echo -e "${YELLOW}Session attached elsewhere, starting ttyd only${NC}"
                ;;
        esac

        start_ttyd
        save_session_state
        print_status

        # Keep script running for ttyd
        wait $TTYD_PID
    fi
}

main "$@"
