#!/bin/bash
# NXTG-Forge Smoke Test — Real Server, Real Requests
#
# This script exists because on 2026-02-06, 2326 mock tests passed
# while the actual Command Center was completely broken.
# It starts the real server and verifies real endpoints.
#
# Usage:
#   ./scripts/smoke-test.sh          # Run smoke tests
#   ./scripts/smoke-test.sh --quick  # Health check only (for pre-commit)
#
# Exit codes:
#   0 = All endpoints working
#   1 = One or more endpoints broken

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PORT=${SMOKE_TEST_PORT:-15099}
BASE_URL="http://localhost:${PORT}"
QUICK_MODE="${1:-}"
PASS=0
FAIL=0
ERRORS=""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

cleanup() {
  if [ -n "${SERVER_PID:-}" ]; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
  # Force kill anything on our port
  lsof -ti:"$PORT" 2>/dev/null | xargs kill -9 2>/dev/null || true
}
trap cleanup EXIT

echo -e "${BOLD}NXTG-Forge Smoke Test${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Port: $PORT"
echo ""

# Kill anything already on the port
lsof -ti:"$PORT" 2>/dev/null | xargs kill -9 2>/dev/null || true
sleep 0.5

# Start the real server
echo -n "Starting server... "
PORT=$PORT npx tsx "$PROJECT_ROOT/src/server/api-server.ts" > /tmp/nxtg-smoke-server.log 2>&1 &
SERVER_PID=$!

# Wait for server to be ready
READY=false
for i in $(seq 1 30); do
  if curl -s "$BASE_URL/api/health" > /dev/null 2>&1; then
    READY=true
    break
  fi
  sleep 0.5
done

if [ "$READY" = false ]; then
  echo -e "${RED}FAILED${NC} — server did not start"
  echo "Server log:"
  cat /tmp/nxtg-smoke-server.log 2>/dev/null || echo "(no log)"
  exit 1
fi
echo -e "${GREEN}OK${NC} (PID: $SERVER_PID)"
echo ""

# Test helper
test_endpoint() {
  local name="$1"
  local method="$2"
  local url="$3"
  local body="${4:-}"
  local expect_status="${5:-200}"
  local expect_contains="${6:-}"

  echo -n "  $name... "

  local args=(-s -o /tmp/nxtg-smoke-response.json -w "%{http_code}" -X "$method")
  if [ -n "$body" ]; then
    args+=(-H "Content-Type: application/json" -d "$body")
  fi

  local status
  status=$(curl "${args[@]}" "$url" 2>/dev/null || echo "000")

  if [ "$status" != "$expect_status" ]; then
    echo -e "${RED}FAIL${NC} (expected $expect_status, got $status)"
    FAIL=$((FAIL + 1))
    ERRORS="$ERRORS\n  $name: expected status $expect_status, got $status"
    return
  fi

  if [ -n "$expect_contains" ]; then
    if ! grep -q "$expect_contains" /tmp/nxtg-smoke-response.json 2>/dev/null; then
      echo -e "${RED}FAIL${NC} (response missing: $expect_contains)"
      FAIL=$((FAIL + 1))
      ERRORS="$ERRORS\n  $name: response missing '$expect_contains'"
      return
    fi
  fi

  # Check it's not the placeholder response
  if grep -q "Command executed:" /tmp/nxtg-smoke-response.json 2>/dev/null; then
    echo -e "${RED}FAIL${NC} (PLACEHOLDER response detected!)"
    FAIL=$((FAIL + 1))
    ERRORS="$ERRORS\n  $name: GOT PLACEHOLDER RESPONSE — a fake handler is intercepting real commands"
    return
  fi

  echo -e "${GREEN}PASS${NC}"
  PASS=$((PASS + 1))
}

# ========== Tests ==========

echo -e "${BOLD}Health${NC}"
test_endpoint "Health check" GET "$BASE_URL/api/health" "" "200" "healthy"
echo ""

if [ "$QUICK_MODE" = "--quick" ]; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━"
  if [ "$FAIL" -gt 0 ]; then
    echo -e "${RED}${BOLD}SMOKE TEST FAILED${NC}"
    exit 1
  fi
  echo -e "${GREEN}${BOLD}Quick check passed${NC}"
  exit 0
fi

echo -e "${BOLD}Command Execution${NC}"
test_endpoint "frg-status" POST "$BASE_URL/api/commands/execute" '{"command":"frg-status"}' "200" "NXTG-Forge"
test_endpoint "git-status" POST "$BASE_URL/api/commands/execute" '{"command":"git-status"}' "200" "Branch:"
test_endpoint "git-diff" POST "$BASE_URL/api/commands/execute" '{"command":"git-diff"}' "200" "Staged Changes"
test_endpoint "git-log" POST "$BASE_URL/api/commands/execute" '{"command":"git-log"}' "200" "success"
test_endpoint "system-info" POST "$BASE_URL/api/commands/execute" '{"command":"system-info"}' "200" "Node.js"
test_endpoint "analyze-types" POST "$BASE_URL/api/commands/execute" '{"command":"analyze-types"}' "200" "TypeScript"
echo ""

echo -e "${BOLD}Error Handling${NC}"
test_endpoint "Unknown command → 404" POST "$BASE_URL/api/commands/execute" '{"command":"__nonexistent__"}' "404" "Available"
test_endpoint "Missing command → 400" POST "$BASE_URL/api/commands/execute" '{}' "400" ""
echo ""

echo -e "${BOLD}Protocol Agreement${NC}"
# The old broken client used to send the full Command object
# This MUST NOT succeed with placeholder data
test_endpoint "Old client format rejected" POST "$BASE_URL/api/commands/execute" '{"name":"Status Report","id":"frg-status"}' "400" ""
echo ""

echo -e "${BOLD}State Endpoints${NC}"
test_endpoint "Governance state" GET "$BASE_URL/api/governance/state" "" "200" "success"
echo ""

# ========== Summary ==========

echo "━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "Results: ${GREEN}$PASS passed${NC}, ${RED}$FAIL failed${NC}"

if [ "$FAIL" -gt 0 ]; then
  echo -e "\n${RED}${BOLD}SMOKE TEST FAILED${NC}"
  echo -e "${RED}Failures:${NC}$ERRORS"
  echo ""
  echo "The real server returned broken responses."
  echo "Unit tests DO NOT catch this. Fix the actual server."
  exit 1
fi

echo -e "\n${GREEN}${BOLD}ALL SMOKE TESTS PASSED${NC}"
echo "The real server returns real data for all endpoints."
exit 0
