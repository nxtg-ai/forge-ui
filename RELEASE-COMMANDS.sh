#!/bin/bash
#
# NXTG-Forge v1.0.0 Release Commands
#
# Quick reference of commands for releasing v1.0.0
# Review and execute these commands step-by-step
#
# See RELEASE-INSTRUCTIONS.md for detailed explanations
#

set -e  # Exit on error

echo "========================================="
echo "NXTG-Forge v1.0.0 Release Script"
echo "========================================="
echo ""
echo "IMPORTANT: Review each section before running!"
echo "This script is for reference - run commands manually"
echo ""

# ============================================================================
# PRE-RELEASE
# ============================================================================

echo "# PRE-RELEASE CHECKS"
echo "# =================="

# Checkout main
git checkout main

# Run quality checks
make quality

# Clean build artifacts
rm -rf build/ dist/ *.egg-info .coverage htmlcov/
find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true

echo "✓ Pre-release checks complete"
echo ""

# ============================================================================
# BUILD
# ============================================================================

echo "# BUILD PACKAGE"
echo "# =============="

# Install build tools
pip install --upgrade build twine

# Build package
python -m build

# Validate
twine check dist/*

echo "✓ Package built and validated"
echo ""

# ============================================================================
# GIT COMMIT
# ============================================================================

echo "# GIT OPERATIONS"
echo "# =============="

# Stage all changes
git add .

# Create commit (copy and run manually - heredoc won't work in script mode)
cat << 'COMMIT_MESSAGE'

# Run this command manually:

git commit -m "$(cat <<'EOF'
chore: prepare v1.0.0 release

Release Highlights:
- Complete agent orchestration system (6 specialized AI agents)
- Automated lifecycle hooks for validation and error handling
- Intelligent state management with backups and checkpoints
- Template-driven project generation
- Comprehensive documentation (110KB+ agent guidance)
- Production-ready Docker and CI/CD setup

Files Added:
- LICENSE (MIT)
- CONTRIBUTING.md, CHANGELOG.md, SECURITY.md
- .gitignore, .env.example
- .github/ templates (issues, PRs)
- .claude/hooks/ (5 lifecycle hooks)
- .claude/state.json.template
- .claude/hooks/README.md

Files Updated:
- README.md (badges, hooks section)
- package.json (repository URLs)
- pyproject.toml (URLs, enabled readme)
- docs/ARCHITECTURE.md (hooks system)

🤖 Generated with Claude Code
https://claude.com/claude-code

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"

COMMIT_MESSAGE

# Create tag (copy and run manually)
cat << 'TAG_MESSAGE'

# Run this command manually:

git tag -a v1.0.0 -m "$(cat <<'EOF'
NXTG-Forge v1.0.0 - Foundation Release

The first public release of NXTG-Forge, establishing the foundation
for AI-assisted development infrastructure.

Highlights:
- 6 specialized AI agents for development tasks
- Automated lifecycle hooks for quality and error handling
- Intelligent state management with automatic backups
- Template-driven code generation
- Claude Code integration with slash commands
- Production-ready Docker and CI/CD

Full changelog: https://github.com/nxtg-ai/nxtg-forge/blob/main/CHANGELOG.md
EOF
)"

TAG_MESSAGE

echo "✓ Review and run the above commit/tag commands"
echo ""

# ============================================================================
# PUSH TO GITHUB
# ============================================================================

echo "# PUSH TO GITHUB"
echo "# =============="

# Verify remote (run manually to check)
echo "git remote -v"

# Push (uncomment when ready)
# git push origin main
# git push origin v1.0.0

cat << 'PUSH_COMMANDS'

# Verify your remote points to nxtg-ai/nxtg-forge, then run:

git push origin main
git push origin v1.0.0

PUSH_COMMANDS

echo ""

# ============================================================================
# GITHUB RELEASE
# ============================================================================

echo "# CREATE GITHUB RELEASE"
echo "# ====================="

cat << 'RELEASE_COMMANDS'

# Option A: Using GitHub CLI (recommended)

gh auth login  # If not already authenticated

gh release create v1.0.0 \
  --title "v1.0.0 - Foundation Release" \
  --notes-file CHANGELOG.md \
  --latest \
  dist/nxtg-forge-1.0.0.tar.gz \
  dist/nxtg_forge-1.0.0-py3-none-any.whl

# Option B: Use GitHub web interface
# Go to: https://github.com/nxtg-ai/nxtg-forge/releases/new

RELEASE_COMMANDS

echo ""

# ============================================================================
# VERIFICATION
# ============================================================================

echo "# VERIFICATION"
echo "# ============"

cat << 'VERIFY_COMMANDS'

# Verify tag on GitHub
gh release view v1.0.0

# Test installation
pip install https://github.com/nxtg-ai/nxtg-forge/releases/download/v1.0.0/nxtg_forge-1.0.0-py3-none-any.whl

# Test CLI
forge --help

VERIFY_COMMANDS

echo ""

# ============================================================================
# REPOSITORY CONFIGURATION
# ============================================================================

echo "# REPOSITORY CONFIGURATION"
echo "# ========================"

cat << 'CONFIG_STEPS'

Complete these steps via GitHub web interface:

1. Repository Settings (https://github.com/nxtg-ai/nxtg-forge/settings):

   About Section:
   - Description: Self-Deploying AI Development Infrastructure with Claude Code integration
   - Topics: ai, development-tools, infrastructure, claude, mcp, automation, python, devops, template-engine

   Features:
   - ✅ Wikis
   - ✅ Issues
   - ✅ Discussions
   - ✅ Projects

   Social Preview:
   - Upload: docs/nxtg-forge.png

2. Branch Protection (Settings → Branches):
   - Branch: main
   - ✅ Require pull request reviews (1 approval)
   - ✅ Require status checks to pass
   - ✅ Require conversation resolution

3. Enable Discussions:
   - Create categories: General, Ideas, Q&A, Show and Tell, Announcements

4. Create v1.1 Roadmap project

CONFIG_STEPS

echo ""

# ============================================================================
# POST-RELEASE
# ============================================================================

echo "# POST-RELEASE"
echo "# ============"

cat << 'POST_RELEASE'

1. Create announcement in Discussions → Announcements
2. (Optional) Share on social media
3. Monitor Issues and Discussions for feedback

POST_RELEASE

echo ""
echo "========================================="
echo "Release commands reference complete!"
echo "========================================="
echo ""
echo "Next: Review RELEASE-CHECKLIST.md and execute commands step-by-step"
echo ""
