#!/bin/bash

# Test script for Beta Feedback API endpoints
# Usage: ./test-feedback-api.sh

echo "🧪 Testing Beta Feedback API Endpoints"
echo "======================================="
echo ""

API_URL="http://localhost:5051"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Submit feedback
echo -e "${YELLOW}Test 1: Submit feedback${NC}"
RESPONSE=$(curl -s -X POST ${API_URL}/api/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "rating": 5,
    "category": "Feature Request",
    "description": "Test feedback submission from script",
    "url": "http://localhost:5050/dashboard",
    "userAgent": "test-script/1.0",
    "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")'"
  }')

if echo "$RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✓ Feedback submitted successfully${NC}"
  FEEDBACK_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
  echo "  Feedback ID: $FEEDBACK_ID"
else
  echo -e "${RED}✗ Failed to submit feedback${NC}"
  echo "  Response: $RESPONSE"
fi
echo ""

# Test 2: Get all feedback
echo -e "${YELLOW}Test 2: Get all feedback${NC}"
RESPONSE=$(curl -s ${API_URL}/api/feedback)

if echo "$RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✓ Retrieved feedback successfully${NC}"
  COUNT=$(echo "$RESPONSE" | grep -o '"count":[0-9]*' | cut -d':' -f2)
  echo "  Total feedback entries: $COUNT"
else
  echo -e "${RED}✗ Failed to retrieve feedback${NC}"
  echo "  Response: $RESPONSE"
fi
echo ""

# Test 3: Get feedback statistics
echo -e "${YELLOW}Test 3: Get feedback statistics${NC}"
RESPONSE=$(curl -s ${API_URL}/api/feedback/stats)

if echo "$RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✓ Retrieved statistics successfully${NC}"
  TOTAL=$(echo "$RESPONSE" | grep -o '"totalCount":[0-9]*' | cut -d':' -f2)
  AVG_RATING=$(echo "$RESPONSE" | grep -o '"averageRating":[0-9.]*' | cut -d':' -f2)
  echo "  Total entries: $TOTAL"
  echo "  Average rating: $AVG_RATING"
else
  echo -e "${RED}✗ Failed to retrieve statistics${NC}"
  echo "  Response: $RESPONSE"
fi
echo ""

# Test 4: Submit another feedback (different category)
echo -e "${YELLOW}Test 4: Submit bug report${NC}"
RESPONSE=$(curl -s -X POST ${API_URL}/api/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "rating": 4,
    "category": "Bug Report",
    "description": "Found a minor UI glitch",
    "url": "http://localhost:5050/terminal",
    "userAgent": "test-script/1.0",
    "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")'"
  }')

if echo "$RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✓ Bug report submitted successfully${NC}"
  FEEDBACK_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
  echo "  Feedback ID: $FEEDBACK_ID"
else
  echo -e "${RED}✗ Failed to submit bug report${NC}"
  echo "  Response: $RESPONSE"
fi
echo ""

# Test 5: Verify data file exists
echo -e "${YELLOW}Test 5: Verify data file${NC}"
if [ -f "data/feedback.json" ]; then
  echo -e "${GREEN}✓ Feedback data file exists${NC}"
  ENTRIES=$(grep -o '"id":' data/feedback.json | wc -l)
  echo "  File location: data/feedback.json"
  echo "  Entries in file: $ENTRIES"

  echo ""
  echo "  Latest entries:"
  tail -20 data/feedback.json
else
  echo -e "${RED}✗ Feedback data file not found${NC}"
fi
echo ""

echo "======================================="
echo -e "${GREEN}✓ All tests complete${NC}"
echo ""
echo "To view all feedback in browser:"
echo "  http://localhost:5051/api/feedback"
echo ""
echo "To view statistics in browser:"
echo "  http://localhost:5051/api/feedback/stats"
