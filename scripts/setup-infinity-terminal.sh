#!/bin/bash

# NXTG-Forge Infinity Terminal Setup Script
# Installs and configures Zellij + ttyd for persistent terminal sessions
#
# Usage: ./scripts/setup-infinity-terminal.sh [--force]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
ZELLIJ_VERSION="0.40.1"
TTYD_VERSION="1.7.4"
FORCE_INSTALL=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --force|-f)
            FORCE_INSTALL=true
            shift
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

echo "═══════════════════════════════════════════════════════════════════"
echo "           INFINITY TERMINAL SETUP"
echo "═══════════════════════════════════════════════════════════════════"
echo ""
echo -e "${CYAN}Installing persistent terminal infrastructure${NC}"
echo ""

# Detect OS
detect_os() {
    case "$(uname -s)" in
        Linux*)
            if grep -q Microsoft /proc/version 2>/dev/null; then
                echo "wsl"
            else
                echo "linux"
            fi
            ;;
        Darwin*)
            echo "macos"
            ;;
        *)
            echo "unknown"
            ;;
    esac
}

OS=$(detect_os)
echo -e "${BLUE}Detected OS: ${OS}${NC}"

# Check if command exists
command_exists() {
    command -v "$1" &> /dev/null
}

# Install Zellij
install_zellij() {
    echo ""
    echo -e "${BLUE}═══ Installing Zellij ═══${NC}"

    if command_exists zellij && [ "$FORCE_INSTALL" = false ]; then
        CURRENT_VERSION=$(zellij --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' || echo "unknown")
        echo -e "${GREEN}✓ Zellij already installed (v${CURRENT_VERSION})${NC}"
        return 0
    fi

    case $OS in
        linux|wsl)
            echo -e "${YELLOW}Installing Zellij for Linux...${NC}"

            # Try cargo first (most reliable)
            if command_exists cargo; then
                echo "Using cargo install..."
                cargo install --locked zellij
            # Try binary download
            else
                echo "Downloading Zellij binary..."
                ARCH=$(uname -m)
                case $ARCH in
                    x86_64)
                        ZELLIJ_ARCH="x86_64-unknown-linux-musl"
                        ;;
                    aarch64)
                        ZELLIJ_ARCH="aarch64-unknown-linux-musl"
                        ;;
                    *)
                        echo -e "${RED}Unsupported architecture: $ARCH${NC}"
                        echo "Please install Zellij manually: https://zellij.dev/documentation/installation"
                        return 1
                        ;;
                esac

                DOWNLOAD_URL="https://github.com/zellij-org/zellij/releases/download/v${ZELLIJ_VERSION}/zellij-${ZELLIJ_ARCH}.tar.gz"
                TEMP_DIR=$(mktemp -d)

                curl -fsSL "$DOWNLOAD_URL" | tar -xzf - -C "$TEMP_DIR"
                sudo mv "$TEMP_DIR/zellij" /usr/local/bin/
                rm -rf "$TEMP_DIR"
            fi
            ;;
        macos)
            echo -e "${YELLOW}Installing Zellij for macOS...${NC}"

            if command_exists brew; then
                brew install zellij
            elif command_exists cargo; then
                cargo install --locked zellij
            else
                echo -e "${RED}Please install Homebrew or Cargo first${NC}"
                echo "  brew: https://brew.sh"
                echo "  cargo: https://rustup.rs"
                return 1
            fi
            ;;
        *)
            echo -e "${RED}Unsupported OS. Please install Zellij manually.${NC}"
            echo "https://zellij.dev/documentation/installation"
            return 1
            ;;
    esac

    if command_exists zellij; then
        echo -e "${GREEN}✓ Zellij installed successfully${NC}"
        zellij --version
    else
        echo -e "${RED}✗ Zellij installation failed${NC}"
        return 1
    fi
}

# Install ttyd
install_ttyd() {
    echo ""
    echo -e "${BLUE}═══ Installing ttyd ═══${NC}"

    if command_exists ttyd && [ "$FORCE_INSTALL" = false ]; then
        CURRENT_VERSION=$(ttyd --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' || echo "unknown")
        echo -e "${GREEN}✓ ttyd already installed (v${CURRENT_VERSION})${NC}"
        return 0
    fi

    case $OS in
        linux|wsl)
            echo -e "${YELLOW}Installing ttyd for Linux...${NC}"

            # Try apt first
            if command_exists apt; then
                sudo apt update
                sudo apt install -y ttyd || {
                    # If apt fails, try binary download
                    echo "apt install failed, trying binary download..."
                    ARCH=$(uname -m)
                    case $ARCH in
                        x86_64)
                            TTYD_ARCH="x86_64"
                            ;;
                        aarch64)
                            TTYD_ARCH="aarch64"
                            ;;
                        *)
                            echo -e "${RED}Unsupported architecture: $ARCH${NC}"
                            return 1
                            ;;
                    esac

                    DOWNLOAD_URL="https://github.com/tsl0922/ttyd/releases/download/${TTYD_VERSION}/ttyd.${TTYD_ARCH}"
                    sudo curl -fsSL "$DOWNLOAD_URL" -o /usr/local/bin/ttyd
                    sudo chmod +x /usr/local/bin/ttyd
                }
            else
                # Binary download
                ARCH=$(uname -m)
                case $ARCH in
                    x86_64)
                        TTYD_ARCH="x86_64"
                        ;;
                    aarch64)
                        TTYD_ARCH="aarch64"
                        ;;
                    *)
                        echo -e "${RED}Unsupported architecture: $ARCH${NC}"
                        return 1
                        ;;
                esac

                DOWNLOAD_URL="https://github.com/tsl0922/ttyd/releases/download/${TTYD_VERSION}/ttyd.${TTYD_ARCH}"
                sudo curl -fsSL "$DOWNLOAD_URL" -o /usr/local/bin/ttyd
                sudo chmod +x /usr/local/bin/ttyd
            fi
            ;;
        macos)
            echo -e "${YELLOW}Installing ttyd for macOS...${NC}"

            if command_exists brew; then
                brew install ttyd
            else
                echo -e "${RED}Please install Homebrew first: https://brew.sh${NC}"
                return 1
            fi
            ;;
        *)
            echo -e "${RED}Unsupported OS. Please install ttyd manually.${NC}"
            echo "https://github.com/tsl0922/ttyd"
            return 1
            ;;
    esac

    if command_exists ttyd; then
        echo -e "${GREEN}✓ ttyd installed successfully${NC}"
        ttyd --version
    else
        echo -e "${RED}✗ ttyd installation failed${NC}"
        return 1
    fi
}

# Create directory structure
setup_directories() {
    echo ""
    echo -e "${BLUE}═══ Setting up directories ═══${NC}"

    # Create necessary directories
    mkdir -p "$PROJECT_ROOT/layouts"
    mkdir -p "$PROJECT_ROOT/.claude/logs"
    mkdir -p "$PROJECT_ROOT/.claude/sessions"
    mkdir -p "$PROJECT_ROOT/.claude/agent-workers"

    echo -e "${GREEN}✓ Created directory structure${NC}"
}

# Generate Zellij configuration
setup_zellij_config() {
    echo ""
    echo -e "${BLUE}═══ Configuring Zellij ═══${NC}"

    ZELLIJ_CONFIG_DIR="${HOME}/.config/zellij"
    mkdir -p "$ZELLIJ_CONFIG_DIR"

    # Create main config if it doesn't exist
    if [ ! -f "$ZELLIJ_CONFIG_DIR/config.kdl" ]; then
        cat > "$ZELLIJ_CONFIG_DIR/config.kdl" << 'EOF'
// Zellij Configuration for NXTG-Forge Infinity Terminal
// See: https://zellij.dev/documentation/configuration

keybinds clear-defaults=true {
    normal {
        // Pane management
        bind "Alt h" { MoveFocusOrTab "Left"; }
        bind "Alt l" { MoveFocusOrTab "Right"; }
        bind "Alt j" { MoveFocus "Down"; }
        bind "Alt k" { MoveFocus "Up"; }

        // Quick pane switching (1-3 for main panes)
        bind "Alt 1" { GoToTab 1; }
        bind "Alt 2" { GoToTab 2; }
        bind "Alt 3" { GoToTab 3; }

        // Session management
        bind "Ctrl g" { SwitchToMode "locked"; }
        bind "Ctrl p" { SwitchToMode "pane"; }
        bind "Ctrl t" { SwitchToMode "tab"; }
        bind "Ctrl s" { SwitchToMode "scroll"; }
        bind "Ctrl o" { SwitchToMode "session"; }
        bind "Ctrl q" { Quit; }
    }

    pane {
        bind "Esc" { SwitchToMode "Normal"; }
        bind "h" { MoveFocus "Left"; }
        bind "l" { MoveFocus "Right"; }
        bind "j" { MoveFocus "Down"; }
        bind "k" { MoveFocus "Up"; }
        bind "n" { NewPane; SwitchToMode "Normal"; }
        bind "d" { NewPane "Down"; SwitchToMode "Normal"; }
        bind "r" { NewPane "Right"; SwitchToMode "Normal"; }
        bind "x" { CloseFocus; SwitchToMode "Normal"; }
        bind "f" { ToggleFocusFullscreen; SwitchToMode "Normal"; }
        bind "z" { TogglePaneFrames; SwitchToMode "Normal"; }
    }

    tab {
        bind "Esc" { SwitchToMode "Normal"; }
        bind "h" "Left" { GoToPreviousTab; }
        bind "l" "Right" { GoToNextTab; }
        bind "n" { NewTab; SwitchToMode "Normal"; }
        bind "x" { CloseTab; SwitchToMode "Normal"; }
        bind "1" { GoToTab 1; SwitchToMode "Normal"; }
        bind "2" { GoToTab 2; SwitchToMode "Normal"; }
        bind "3" { GoToTab 3; SwitchToMode "Normal"; }
    }

    scroll {
        bind "Esc" { SwitchToMode "Normal"; }
        bind "j" "Down" { ScrollDown; }
        bind "k" "Up" { ScrollUp; }
        bind "Ctrl d" { HalfPageScrollDown; }
        bind "Ctrl u" { HalfPageScrollUp; }
        bind "G" { ScrollToBottom; SwitchToMode "Normal"; }
        bind "g" { ScrollToTop; SwitchToMode "Normal"; }
    }

    session {
        bind "Esc" { SwitchToMode "Normal"; }
        bind "d" { Detach; }
    }

    locked {
        bind "Ctrl g" { SwitchToMode "Normal"; }
    }
}

// Theme for NXTG-Forge
themes {
    forge {
        fg "#d4d4d4"
        bg "#1e1e1e"
        black "#1e1e1e"
        red "#f44747"
        green "#6a9955"
        yellow "#dcdcaa"
        blue "#569cd6"
        magenta "#c586c0"
        cyan "#4ec9b0"
        white "#d4d4d4"
        orange "#ce9178"
    }
}

theme "forge"

// Default layout
default_layout "compact"

// Session settings
session_serialization true
pane_frames false

// Copy settings
copy_command "pbcopy"    // macOS
// copy_command "xclip -selection clipboard"  // Linux

// Performance
scrollback_lines 10000

// UI settings
ui {
    pane_frames {
        rounded_corners true
    }
}
EOF
        echo -e "${GREEN}✓ Created Zellij config${NC}"
    else
        echo -e "${YELLOW}Zellij config already exists, skipping${NC}"
    fi
}

# Verify installation
verify_installation() {
    echo ""
    echo -e "${BLUE}═══ Verifying Installation ═══${NC}"

    local all_good=true

    if command_exists zellij; then
        echo -e "${GREEN}✓ Zellij: $(zellij --version)${NC}"
    else
        echo -e "${RED}✗ Zellij not found${NC}"
        all_good=false
    fi

    if command_exists ttyd; then
        echo -e "${GREEN}✓ ttyd: $(ttyd --version)${NC}"
    else
        echo -e "${RED}✗ ttyd not found${NC}"
        all_good=false
    fi

    if [ -d "$PROJECT_ROOT/layouts" ]; then
        echo -e "${GREEN}✓ layouts/ directory exists${NC}"
    else
        echo -e "${RED}✗ layouts/ directory missing${NC}"
        all_good=false
    fi

    if [ "$all_good" = true ]; then
        echo ""
        echo -e "${GREEN}═══════════════════════════════════════════════════════════════════${NC}"
        echo -e "${GREEN}         INFINITY TERMINAL SETUP COMPLETE!${NC}"
        echo -e "${GREEN}═══════════════════════════════════════════════════════════════════${NC}"
        echo ""
        echo "Next steps:"
        echo "  1. Run: ./scripts/start-infinity-terminal.sh"
        echo "  2. Open: http://localhost:7681"
        echo ""
        return 0
    else
        echo ""
        echo -e "${RED}═══════════════════════════════════════════════════════════════════${NC}"
        echo -e "${RED}         SETUP INCOMPLETE - Please fix errors above${NC}"
        echo -e "${RED}═══════════════════════════════════════════════════════════════════${NC}"
        return 1
    fi
}

# Main execution
main() {
    install_zellij
    install_ttyd
    setup_directories
    setup_zellij_config
    verify_installation
}

main "$@"
