#!/bin/bash

# NXTG-Forge Infinity Terminal Session Recovery
# Monitors and automatically recovers crashed Zellij sessions
#
# Usage: ./scripts/infinity-terminal-recovery.sh [--daemon]
#
# Can run as a background daemon to ensure sessions stay alive

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
NC='\033[0m'

# Configuration
CHECK_INTERVAL=30  # seconds
MAX_RESTART_ATTEMPTS=3
RESTART_COOLDOWN=60  # seconds between restart attempts
DAEMON_MODE=false
PID_FILE="$PROJECT_ROOT/.claude/sessions/recovery-daemon.pid"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --daemon|-d)
            DAEMON_MODE=true
            shift
            ;;
        --interval|-i)
            CHECK_INTERVAL="$2"
            shift 2
            ;;
        --help|-h)
            echo "Infinity Terminal Session Recovery"
            echo ""
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --daemon, -d          Run as background daemon"
            echo "  --interval, -i <sec>  Check interval (default: 30)"
            echo "  --help, -h            Show this help"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Create directories
mkdir -p "$LOG_DIR"
mkdir -p "$SESSION_DIR"

LOG_FILE="$LOG_DIR/recovery.log"

# Logging function
log() {
    local level="$1"
    local message="$2"
    local timestamp=$(date -Iseconds)
    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"

    if [ "$DAEMON_MODE" = false ]; then
        case $level in
            INFO)
                echo -e "${GREEN}[$level]${NC} $message"
                ;;
            WARN)
                echo -e "${YELLOW}[$level]${NC} $message"
                ;;
            ERROR)
                echo -e "${RED}[$level]${NC} $message"
                ;;
            *)
                echo "[$level] $message"
                ;;
        esac
    fi
}

# Get all managed sessions
get_managed_sessions() {
    ls -1 "$SESSION_DIR"/*.json 2>/dev/null | while read state_file; do
        basename "$state_file" .json
    done
}

# Check if Zellij session exists
session_exists() {
    local session_name="$1"
    zellij list-sessions 2>/dev/null | grep -q "^$session_name"
}

# Check if ttyd is running for session
ttyd_running() {
    local session_name="$1"
    pgrep -f "ttyd.*$session_name" >/dev/null 2>&1
}

# Get session state
get_session_state() {
    local session_name="$1"
    local state_file="$SESSION_DIR/${session_name}.json"

    if [ -f "$state_file" ]; then
        cat "$state_file"
    else
        echo "{}"
    fi
}

# Update restart count
update_restart_count() {
    local session_name="$1"
    local count="$2"
    local state_file="$SESSION_DIR/${session_name}.json"

    if [ -f "$state_file" ]; then
        local new_state=$(cat "$state_file" | jq ".restart_count = $count | .last_restart = \"$(date -Iseconds)\"")
        echo "$new_state" > "$state_file"
    fi
}

# Restart Zellij session
restart_zellij_session() {
    local session_name="$1"
    local state_file="$SESSION_DIR/${session_name}.json"

    if [ ! -f "$state_file" ]; then
        log "WARN" "No state file for session: $session_name"
        return 1
    fi

    local state=$(cat "$state_file")
    local layout=$(echo "$state" | jq -r '.layout // "default"')
    local project_root=$(echo "$state" | jq -r '.project_root // "."')
    local restart_count=$(echo "$state" | jq -r '.restart_count // 0')

    # Check restart limit
    if [ "$restart_count" -ge "$MAX_RESTART_ATTEMPTS" ]; then
        local last_restart=$(echo "$state" | jq -r '.last_restart // ""')
        if [ -n "$last_restart" ]; then
            local last_restart_epoch=$(date -d "$last_restart" +%s 2>/dev/null || echo 0)
            local now_epoch=$(date +%s)
            local cooldown_elapsed=$((now_epoch - last_restart_epoch))

            if [ "$cooldown_elapsed" -lt "$RESTART_COOLDOWN" ]; then
                log "WARN" "Session $session_name: Max restarts reached, cooldown active"
                return 1
            else
                # Reset counter after cooldown
                restart_count=0
            fi
        fi
    fi

    log "INFO" "Restarting session: $session_name (attempt $((restart_count + 1)))"

    local layout_file="$project_root/layouts/forge-${layout}.kdl"

    cd "$project_root"
    if [ -f "$layout_file" ]; then
        zellij --session "$session_name" --layout "$layout_file" &
    else
        zellij --session "$session_name" &
    fi

    sleep 2

    if session_exists "$session_name"; then
        log "INFO" "Session $session_name restarted successfully"
        update_restart_count "$session_name" $((restart_count + 1))
        return 0
    else
        log "ERROR" "Failed to restart session: $session_name"
        update_restart_count "$session_name" $((restart_count + 1))
        return 1
    fi
}

# Restart ttyd for session
restart_ttyd() {
    local session_name="$1"
    local state_file="$SESSION_DIR/${session_name}.json"

    if [ ! -f "$state_file" ]; then
        log "WARN" "No state file for session: $session_name"
        return 1
    fi

    local state=$(cat "$state_file")
    local ttyd_port=$(echo "$state" | jq -r '.ttyd_port // 7681')

    log "INFO" "Restarting ttyd for session: $session_name on port $ttyd_port"

    # Kill existing
    pkill -f "ttyd.*$session_name" 2>/dev/null || true
    sleep 1

    # Start new
    ttyd \
        --port "$ttyd_port" \
        --interface "127.0.0.1" \
        --writable \
        --reconnect 5 \
        zellij attach "$session_name" --create \
        >> "$LOG_DIR/ttyd.log" 2>&1 &

    sleep 2

    if ttyd_running "$session_name"; then
        log "INFO" "ttyd restarted for session: $session_name"
        return 0
    else
        log "ERROR" "Failed to restart ttyd for session: $session_name"
        return 1
    fi
}

# Health check for all sessions
health_check() {
    local sessions=$(get_managed_sessions)

    if [ -z "$sessions" ]; then
        log "INFO" "No managed sessions found"
        return 0
    fi

    for session_name in $sessions; do
        log "INFO" "Checking session: $session_name"

        # Check Zellij
        if ! session_exists "$session_name"; then
            log "WARN" "Session $session_name not found, attempting restart"
            restart_zellij_session "$session_name"
        fi

        # Check ttyd
        local state=$(get_session_state "$session_name")
        local ttyd_port=$(echo "$state" | jq -r '.ttyd_port // null')

        if [ "$ttyd_port" != "null" ] && ! ttyd_running "$session_name"; then
            log "WARN" "ttyd not running for $session_name, attempting restart"
            restart_ttyd "$session_name"
        fi
    done
}

# Run as daemon
run_daemon() {
    log "INFO" "Starting recovery daemon (check interval: ${CHECK_INTERVAL}s)"

    # Write PID file
    echo $$ > "$PID_FILE"

    # Cleanup on exit
    trap "rm -f '$PID_FILE'; log 'INFO' 'Daemon stopped'" EXIT INT TERM

    while true; do
        health_check
        sleep "$CHECK_INTERVAL"
    done
}

# One-time check
run_once() {
    echo "═══════════════════════════════════════════════════════════════════"
    echo "           INFINITY TERMINAL - RECOVERY CHECK"
    echo "═══════════════════════════════════════════════════════════════════"
    echo ""

    health_check

    echo ""
    echo -e "${GREEN}Recovery check complete${NC}"
    echo "Log: $LOG_FILE"
}

# Stop daemon
stop_daemon() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            kill "$pid"
            rm -f "$PID_FILE"
            echo -e "${GREEN}Daemon stopped${NC}"
        else
            rm -f "$PID_FILE"
            echo -e "${YELLOW}Daemon was not running${NC}"
        fi
    else
        echo -e "${YELLOW}No daemon PID file found${NC}"
    fi
}

# Main
main() {
    if [ "$DAEMON_MODE" = true ]; then
        # Check if already running
        if [ -f "$PID_FILE" ]; then
            local pid=$(cat "$PID_FILE")
            if kill -0 "$pid" 2>/dev/null; then
                echo -e "${YELLOW}Daemon already running (PID: $pid)${NC}"
                exit 1
            fi
        fi

        # Daemonize
        run_daemon &
        disown
        echo -e "${GREEN}Recovery daemon started (PID: $!)${NC}"
    else
        run_once
    fi
}

main "$@"
