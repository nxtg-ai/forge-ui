#!/bin/bash

# Forge - Install into any project
# Usage: curl -fsSL https://raw.githubusercontent.com/nxtg-ai/forge/main/init.sh | bash
# Or:    git clone https://github.com/nxtg-ai/forge.git && cd forge && ./init.sh

set -e

FORGE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_DIR="${1:-.}"

echo "Installing Forge into ${TARGET_DIR}..."

# Create .claude structure if missing
mkdir -p "${TARGET_DIR}/.claude/commands"
mkdir -p "${TARGET_DIR}/.claude/agents"
mkdir -p "${TARGET_DIR}/.claude/skills"
mkdir -p "${TARGET_DIR}/.claude/hooks"
mkdir -p "${TARGET_DIR}/.claude/state"

# Copy plugin components
if [ -d "${FORGE_DIR}/.claude/commands" ]; then
  cp -r "${FORGE_DIR}/.claude/commands/"* "${TARGET_DIR}/.claude/commands/" 2>/dev/null || true
  CMD_COUNT=$(ls "${TARGET_DIR}/.claude/commands/" | wc -l)
  echo "  Commands: ${CMD_COUNT} installed"
fi

if [ -d "${FORGE_DIR}/.claude/agents" ]; then
  cp -r "${FORGE_DIR}/.claude/agents/"* "${TARGET_DIR}/.claude/agents/" 2>/dev/null || true
  AGENT_COUNT=$(ls "${TARGET_DIR}/.claude/agents/" | wc -l)
  echo "  Agents:   ${AGENT_COUNT} installed"
fi

if [ -d "${FORGE_DIR}/.claude/skills" ]; then
  cp -r "${FORGE_DIR}/.claude/skills/"* "${TARGET_DIR}/.claude/skills/" 2>/dev/null || true
  SKILL_COUNT=$(find "${TARGET_DIR}/.claude/skills/" -name "*.md" | wc -l)
  echo "  Skills:   ${SKILL_COUNT} installed"
fi

if [ -d "${FORGE_DIR}/.claude/hooks" ]; then
  cp -r "${FORGE_DIR}/.claude/hooks/"* "${TARGET_DIR}/.claude/hooks/" 2>/dev/null || true
  HOOK_COUNT=$(ls "${TARGET_DIR}/.claude/hooks/" | wc -l)
  echo "  Hooks:    ${HOOK_COUNT} installed"
fi

# Copy CLAUDE.md if target doesn't have one
if [ ! -f "${TARGET_DIR}/CLAUDE.md" ] && [ -f "${FORGE_DIR}/CLAUDE.md" ]; then
  cp "${FORGE_DIR}/CLAUDE.md" "${TARGET_DIR}/CLAUDE.md"
  echo "  CLAUDE.md: installed"
fi

# Copy manifest
if [ -f "${FORGE_DIR}/claude.json" ]; then
  cp "${FORGE_DIR}/claude.json" "${TARGET_DIR}/claude.json"
fi

echo ""
echo "Forge installed. Open Claude Code and type /[FRG]-status to verify."
