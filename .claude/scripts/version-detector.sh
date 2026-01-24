#!/bin/bash

# NXTG-Forge Version Detection Script
# Professional version detection with zero confusion

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Current version constant
CURRENT_VERSION="3.0.0"

# Detection functions
detect_installation() {
    local status="none"
    local version="none"

    # Check for .claude directory
    if [ -d ".claude" ]; then
        # Check for state.json
        if [ -f ".claude/state.json" ]; then
            # Extract forge_version (NOT version field)
            version=$(jq -r '.project.forge_version // "unknown"' .claude/state.json 2>/dev/null || echo "unknown")

            if [ "$version" = "unknown" ] || [ "$version" = "null" ]; then
                # Try legacy version field for very old installations
                version=$(jq -r '.forge_version // "1.0.0"' .claude/state.json 2>/dev/null || echo "1.0.0")
            fi

            status="installed"
        else
            status="partial"
        fi
    else
        status="fresh"
    fi

    echo "$status|$version"
}

# Version comparison (semantic versioning)
version_compare() {
    local version1=$1
    local version2=$2

    if [ "$version1" = "$version2" ]; then
        echo "equal"
    elif [ "$version1" = "unknown" ]; then
        echo "unknown"
    else
        # Simple comparison for x.y.z format
        IFS='.' read -r -a v1_parts <<< "$version1"
        IFS='.' read -r -a v2_parts <<< "$version2"

        for i in 0 1 2; do
            v1_part="${v1_parts[$i]:-0}"
            v2_part="${v2_parts[$i]:-0}"

            if [ "$v1_part" -lt "$v2_part" ]; then
                echo "older"
                return
            elif [ "$v1_part" -gt "$v2_part" ]; then
                echo "newer"
                return
            fi
        done

        echo "equal"
    fi
}

# Main detection logic
main() {
    local result=$(detect_installation)
    IFS='|' read -r status version <<< "$result"

    case "$status" in
        "fresh")
            echo -e "${GREEN}Fresh Installation Detected${NC}"
            echo "Status: No existing NXTG-Forge installation found"
            echo "Action: Ready for clean v${CURRENT_VERSION} installation"
            exit 0
            ;;

        "partial")
            echo -e "${YELLOW}Partial Installation Detected${NC}"
            echo "Status: .claude directory exists but state.json missing"
            echo "Action: Repair required before proceeding"
            exit 1
            ;;

        "installed")
            comparison=$(version_compare "$version" "$CURRENT_VERSION")

            case "$comparison" in
                "equal")
                    echo -e "${GREEN}NXTG-Forge v${CURRENT_VERSION} Installed${NC}"
                    echo "Status: Current version already installed"
                    echo "Action: No action required"
                    exit 0
                    ;;

                "older")
                    echo -e "${YELLOW}Older Version Detected${NC}"
                    echo "Current: v${version}"
                    echo "Available: v${CURRENT_VERSION}"
                    echo "Action: Upgrade available"
                    exit 2
                    ;;

                "newer")
                    echo -e "${RED}Newer Version Detected${NC}"
                    echo "Installed: v${version}"
                    echo "Script Version: v${CURRENT_VERSION}"
                    echo "Action: Script update required"
                    exit 3
                    ;;

                "unknown")
                    echo -e "${YELLOW}Unknown Version${NC}"
                    echo "Status: Cannot determine installed version"
                    echo "Action: Manual inspection required"
                    exit 4
                    ;;
            esac
            ;;
    esac
}

# Run if executed directly
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi