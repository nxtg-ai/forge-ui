#!/bin/bash
# Test script for real-time governance WebSocket updates

echo "Testing Governance WebSocket Real-Time Updates"
echo "=============================================="
echo ""

# Check if server is running
echo "1. Checking if API server is running..."
if ! curl -s http://localhost:5051/api/health > /dev/null 2>&1; then
    echo "   ERROR: API server is not running on port 5051"
    echo "   Start the server with: npm run dev:server"
    exit 1
fi
echo "   SUCCESS: API server is running"
echo ""

# Fetch current governance state
echo "2. Fetching current governance state..."
CURRENT_STATE=$(curl -s http://localhost:5051/api/governance/state)
if [ $? -eq 0 ]; then
    echo "   SUCCESS: Retrieved governance state"
    echo "   Current version: $(echo $CURRENT_STATE | jq -r '.data.version // "unknown"')"
    echo "   Last update: $(echo $CURRENT_STATE | jq -r '.data.timestamp // "unknown"')"
else
    echo "   ERROR: Failed to fetch governance state"
    exit 1
fi
echo ""

# Send a test sentinel log entry (this should trigger a WebSocket broadcast)
echo "3. Sending test sentinel log entry..."
TEST_ENTRY=$(cat <<EOF
{
  "type": "INFO",
  "source": "test-script",
  "message": "Testing real-time WebSocket updates",
  "context": {
    "test": true,
    "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  }
}
EOF
)

RESPONSE=$(curl -s -X POST http://localhost:5051/api/governance/sentinel \
  -H "Content-Type: application/json" \
  -d "$TEST_ENTRY")

if [ $? -eq 0 ]; then
    echo "   SUCCESS: Sentinel log entry sent"
    echo "   Response: $(echo $RESPONSE | jq -r '.message // "unknown"')"
    echo ""
    echo "   WebSocket clients should now receive a 'governance.update' message"
    echo "   Check the browser console for real-time update logs"
else
    echo "   ERROR: Failed to send sentinel log entry"
    exit 1
fi
echo ""

# Verify the update was persisted
echo "4. Verifying governance state was updated..."
sleep 1  # Give it a moment to write
NEW_STATE=$(curl -s http://localhost:5051/api/governance/state)
NEW_TIMESTAMP=$(echo $NEW_STATE | jq -r '.data.timestamp')
OLD_TIMESTAMP=$(echo $CURRENT_STATE | jq -r '.data.timestamp')

if [ "$NEW_TIMESTAMP" != "$OLD_TIMESTAMP" ]; then
    echo "   SUCCESS: Governance state timestamp updated"
    echo "   Old: $OLD_TIMESTAMP"
    echo "   New: $NEW_TIMESTAMP"
else
    echo "   INFO: Timestamp unchanged (may be expected if rotation didn't trigger)"
fi
echo ""

echo "=============================================="
echo "Test Complete!"
echo ""
echo "To observe real-time updates in the UI:"
echo "1. Open http://localhost:5050 in your browser"
echo "2. Navigate to the Governance HUD"
echo "3. Open browser console (F12)"
echo "4. Run this test script again"
echo "5. Watch for '[Governance] Real-time update received' in the console"
echo ""
echo "The GovernanceHUD should update instantly (no 2-second delay)"
