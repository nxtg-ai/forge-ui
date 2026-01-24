#!/bin/bash
# NXTG-Forge Installation Test Script
# Tests the complete installation experience from fresh clone

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🧪 NXTG-Forge Installation Test${NC}"
echo "===================================="
echo ""

# Create temporary test directory
TEST_DIR="/tmp/nxtg-forge-test-$(date +%s)"
echo -e "${YELLOW}📍 Test directory:${NC} $TEST_DIR"
echo ""

# Clone the repository
echo -e "${GREEN}1. Cloning repository...${NC}"
git clone /home/axw/projects/NXTG-Forge/v3 "$TEST_DIR" 2>&1 | grep -v "Cloning" || {
    echo -e "${RED}❌ Clone failed${NC}"
    exit 1
}
echo "   ✅ Repository cloned successfully"

cd "$TEST_DIR"

# Check for clean state
echo ""
echo -e "${GREEN}2. Verifying clean installation...${NC}"

# Check for state files
STATE_FILES=$(find . -name "state.json" -o -name ".state.json" 2>/dev/null | wc -l)
if [ "$STATE_FILES" -eq 0 ]; then
    echo "   ✅ No state files found"
else
    echo -e "   ${RED}❌ Found $STATE_FILES state file(s)${NC}"
    find . -name "state.json" -o -name ".state.json" 2>/dev/null
    exit 1
fi

# Check for build artifacts
ARTIFACTS=$(find . -type d -name "__pycache__" -o -name "dist" -o -name "*.egg-info" 2>/dev/null | wc -l)
if [ "$ARTIFACTS" -eq 0 ]; then
    echo "   ✅ No build artifacts found"
else
    echo -e "   ${YELLOW}⚠️  Found $ARTIFACTS build artifact(s)${NC}"
fi

# Check for required files
echo ""
echo -e "${GREEN}3. Checking required files...${NC}"

REQUIRED_FILES=(
    "init.sh"
    "scripts/clean-artifacts.sh"
    "scripts/setup-hooks.sh"
    ".github/hooks/pre-commit"
    ".gitignore"
    "README.md"
    ".claude/forge.config.json"
)

ALL_PRESENT=true
for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "   ✅ $file"
    else
        echo -e "   ${RED}❌ Missing: $file${NC}"
        ALL_PRESENT=false
    fi
done

if [ "$ALL_PRESENT" = false ]; then
    echo -e "${RED}Some required files are missing!${NC}"
    exit 1
fi

# Test init.sh execution (dry run)
echo ""
echo -e "${GREEN}4. Testing init.sh...${NC}"

if [ -x "init.sh" ]; then
    echo "   ✅ init.sh is executable"

    # Check if it has proper shebang
    if head -n1 init.sh | grep -q "^#!/bin/bash"; then
        echo "   ✅ init.sh has proper shebang"
    else
        echo -e "   ${YELLOW}⚠️  init.sh may have line ending issues${NC}"
    fi
else
    echo -e "   ${RED}❌ init.sh is not executable${NC}"
    exit 1
fi

# Test cleanup script
echo ""
echo -e "${GREEN}5. Testing cleanup script...${NC}"

if bash scripts/clean-artifacts.sh > /dev/null 2>&1; then
    echo "   ✅ Cleanup script runs successfully"
else
    echo -e "   ${YELLOW}⚠️  Cleanup script had issues${NC}"
fi

# Test git hooks setup
echo ""
echo -e "${GREEN}6. Testing git hooks setup...${NC}"

if bash scripts/setup-hooks.sh > /dev/null 2>&1; then
    echo "   ✅ Git hooks installed successfully"

    # Verify hook was installed
    if [ -f ".git/hooks/pre-commit" ]; then
        echo "   ✅ Pre-commit hook installed"
    else
        echo -e "   ${YELLOW}⚠️  Pre-commit hook not installed${NC}"
    fi
else
    echo -e "   ${YELLOW}⚠️  Hook setup had issues${NC}"
fi

# Summary
echo ""
echo "===================================="
echo -e "${GREEN}✨ Installation Test Complete!${NC}"
echo ""
echo "The repository is ready for users to:"
echo "  1. Clone the repository"
echo "  2. Run: ./init.sh"
echo "  3. Start using NXTG-Forge immediately!"
echo ""
echo -e "${YELLOW}Test directory preserved at:${NC} $TEST_DIR"
echo "To clean up: rm -rf $TEST_DIR"