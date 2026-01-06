# NXTG-Forge v1.0.0 Release Instructions

Complete step-by-step guide to build, package, and deploy NXTG-Forge v1.0.0 to GitHub.

## Table of Contents

1. [Pre-Release Checklist](#pre-release-checklist)
2. [Build & Package](#build--package)
3. [Git & Version Control](#git--version-control)
4. [GitHub Release](#github-release)
5. [Repository Configuration](#repository-configuration)
6. [Post-Release](#post-release)
7. [Troubleshooting](#troubleshooting)

---

## Pre-Release Checklist

### Step 1: Verify Project State

```bash
# Ensure you're on the main branch
git checkout main

# Pull latest changes (if working with remote)
git pull origin main

# Check current status
git status

# Verify working directory is clean (or has only release changes)
```

### Step 2: Run All Quality Checks

```bash
# Run complete test suite
make test

# Expected: 38 tests passing (or current count)
# Note: 29% coverage is acceptable for v1.0.0 (targeting 85% for v1.1)
```

```bash
# Run linting
make lint

# Expected: No critical errors
# Warnings are acceptable if they don't affect functionality
```

```bash
# Run formatter (auto-fix)
make format

# Expected: Files formatted successfully
```

```bash
# Run type checking
make typecheck

# Expected: No critical type errors
```

```bash
# Run ALL quality checks
make quality

# This runs: lint, format, typecheck, and tests
```

### Step 3: Verify Package Configuration

```bash
# Check package.json
cat package.json | grep -A 3 "repository"

# Should show:
#   "repository": {
#     "type": "git",
#     "url": "https://github.com/nxtg-ai/nxtg-forge.git"
#   }
```

```bash
# Check pyproject.toml
cat pyproject.toml | grep -A 5 "\[project.urls\]"

# Should show all URLs pointing to nxtg-ai/nxtg-forge
```

### Step 4: Verify Required Files Exist

```bash
# Check all release files are present
ls -la LICENSE CONTRIBUTING.md CHANGELOG.md SECURITY.md .gitignore .env.example

# Check GitHub templates
ls -la .github/ISSUE_TEMPLATE/ .github/pull_request_template.md .github/FUNDING.yml

# Check hooks
ls -la .claude/hooks/*.sh .claude/state.json.template
```

### Step 5: Clean Build Artifacts

```bash
# Remove any existing build artifacts
rm -rf build/ dist/ *.egg-info .coverage htmlcov/

# Remove Python cache
find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
find . -type f -name "*.pyc" -delete
find . -type f -name "*.pyo" -delete

# Verify cleanup
git status
```

---

## Build & Package

### Step 6: Build Python Package

```bash
# Install build tools (if not already installed)
pip install --upgrade build twine

# Build the package
python -m build

# Expected output:
# - dist/nxtg_forge-1.0.0-py3-none-any.whl
# - dist/nxtg-forge-1.0.0.tar.gz
```

### Step 7: Verify Package

```bash
# Check package contents
tar -tzf dist/nxtg-forge-1.0.0.tar.gz | head -20

# Should include:
# - forge/ directory
# - pyproject.toml
# - README.md
# - LICENSE
```

```bash
# Validate package with twine
twine check dist/*

# Expected: "PASSED" for all checks
```

### Step 8: Test Installation (Optional but Recommended)

```bash
# Create a test virtual environment
python -m venv test-venv
source test-venv/bin/activate  # On Windows: test-venv\Scripts\activate

# Install the built package
pip install dist/nxtg_forge-1.0.0-py3-none-any.whl

# Test CLI
forge --help
python -m forge.cli --help

# Test imports
python -c "from forge.state_manager import StateManager; print('✓ Imports work')"

# Deactivate and remove test environment
deactivate
rm -rf test-venv
```

---

## Git & Version Control

### Step 9: Stage All Changes

```bash
# Add all new and modified files
git add .

# Review what will be committed
git status

# Review actual changes
git diff --cached
```

### Step 10: Create Release Commit

```bash
# Create commit with proper message
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
```

### Step 11: Create Git Tag

```bash
# Create annotated tag for v1.0.0
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
```

### Step 12: Verify Tag

```bash
# List tags
git tag -l

# Show tag details
git show v1.0.0

# Verify tag points to correct commit
git log -1 --oneline
```

---

## GitHub Release

### Step 13: Push to GitHub

**IMPORTANT**: Ensure you have a remote configured for nxtg-ai/nxtg-forge

```bash
# Check current remotes
git remote -v

# If origin doesn't point to nxtg-ai/nxtg-forge, update it:
# git remote set-url origin https://github.com/nxtg-ai/nxtg-forge.git

# Or add new remote:
# git remote add upstream https://github.com/nxtg-ai/nxtg-forge.git
```

```bash
# Push main branch
git push origin main

# Push tag
git push origin v1.0.0

# Verify on GitHub
# Visit: https://github.com/nxtg-ai/nxtg-forge/tags
```

### Step 14: Create GitHub Release

**Option A: Using GitHub CLI (Recommended)**

```bash
# Install gh CLI if not already installed
# macOS: brew install gh
# Linux: See https://github.com/cli/cli#installation
# Windows: See https://github.com/cli/cli#installation

# Authenticate (if first time)
gh auth login

# Create release
gh release create v1.0.0 \
  --title "v1.0.0 - Foundation Release" \
  --notes-file CHANGELOG.md \
  --latest \
  dist/nxtg-forge-1.0.0.tar.gz \
  dist/nxtg_forge-1.0.0-py3-none-any.whl

# Expected output: Release URL
```

**Option B: Using GitHub Web Interface**

1. Go to: https://github.com/nxtg-ai/nxtg-forge/releases/new

2. **Choose a tag**: Select `v1.0.0` from dropdown

3. **Release title**: `v1.0.0 - Foundation Release`

4. **Description**: Copy from CHANGELOG.md (entire v1.0.0 section)

5. **Attach binaries**:
   - Upload `dist/nxtg-forge-1.0.0.tar.gz`
   - Upload `dist/nxtg_forge-1.0.0-py3-none-any.whl`

6. **Options**:
   - ✅ Set as the latest release
   - ❌ Set as a pre-release (leave unchecked)

7. Click **"Publish release"**

### Step 15: Verify Release

```bash
# Using GitHub CLI
gh release view v1.0.0

# Or visit in browser
# https://github.com/nxtg-ai/nxtg-forge/releases/tag/v1.0.0
```

---

## Repository Configuration

### Step 16: Configure Repository Settings

**Via GitHub Web Interface:**

1. **Go to Settings**: https://github.com/nxtg-ai/nxtg-forge/settings

2. **About Section** (right sidebar on main repo page):
   ```
   Description: Self-Deploying AI Development Infrastructure with Claude Code integration
   Website: (leave blank or add your website)
   Topics: ai, development-tools, infrastructure, claude, mcp, automation, python, devops, template-engine, agent-orchestration
   ```

3. **Features** (Settings → General):
   - ✅ Wikis
   - ✅ Issues
   - ✅ Discussions
   - ✅ Projects

4. **Social Preview** (Settings → General):
   - Click "Upload an image"
   - Upload: `docs/nxtg-forge.png`
   - Preview should show your logo

### Step 17: Set Up Branch Protection

**Settings → Branches → Add branch protection rule:**

```
Branch name pattern: main

Settings:
✅ Require a pull request before merging
  ✅ Require approvals: 1
  ✅ Dismiss stale pull request approvals when new commits are pushed
✅ Require status checks to pass before merging
  ⬜ Require branches to be up to date before merging
✅ Require conversation resolution before merging
⬜ Require signed commits (optional)
✅ Include administrators (optional, but recommended)
```

### Step 18: Enable GitHub Discussions

**Settings → Features:**

1. Enable Discussions
2. Go to Discussions tab
3. Create categories:
   - **General** - General discussion
   - **Ideas** - Feature ideas and suggestions
   - **Q&A** - Questions and answers
   - **Show and Tell** - Share your projects built with NXTG-Forge
   - **Announcements** - Project updates

### Step 19: Create GitHub Project

**Projects → New project:**

```
Name: NXTG-Forge v1.1 Roadmap
Description: Planned features and improvements for v1.1

Template: Roadmap

Add items from v1.1 roadmap (CHANGELOG.md):
- Enhanced agent coordination with parallel execution
- Advanced MCP integration capabilities
- Expanded framework template library
- Web UI for project management
- Increased test coverage to 85%
```

---

## Post-Release

### Step 20: Test Installation from GitHub

```bash
# In a fresh directory
cd /tmp
python -m venv test-install
source test-install/bin/activate

# Install from GitHub release
pip install https://github.com/nxtg-ai/nxtg-forge/releases/download/v1.0.0/nxtg_forge-1.0.0-py3-none-any.whl

# Test
forge --help

# Or install from git
pip uninstall nxtg-forge -y
pip install git+https://github.com/nxtg-ai/nxtg-forge.git@v1.0.0

# Cleanup
deactivate
cd -
rm -rf /tmp/test-install
```

### Step 21: Publish to PyPI (Optional)

**Only do this if you want the package on PyPI:**

```bash
# Create PyPI account at https://pypi.org/account/register/
# Create API token at https://pypi.org/manage/account/token/

# Configure credentials
cat > ~/.pypirc << 'EOF'
[pypi]
username = __token__
password = pypi-YOUR-API-TOKEN-HERE
EOF

# Upload to PyPI
twine upload dist/*

# Verify on PyPI
# https://pypi.org/project/nxtg-forge/

# Test installation
pip install nxtg-forge
```

### Step 22: Update Documentation Links

If you published to PyPI, update these badges in README.md:

```markdown
[![PyPI version](https://img.shields.io/pypi/v/nxtg-forge)](https://pypi.org/project/nxtg-forge/)
[![PyPI downloads](https://img.shields.io/pypi/dm/nxtg-forge)](https://pypi.org/project/nxtg-forge/)
```

### Step 23: Announce the Release

**Create Announcement Discussion:**

1. Go to Discussions → Announcements
2. Create new discussion:

```markdown
# 🎉 NXTG-Forge v1.0.0 Released!

We're excited to announce the first public release of NXTG-Forge!

## What is NXTG-Forge?

NXTG-Forge is a self-deploying AI development infrastructure platform that enables rapid project setup, development, and deployment with seamless Claude Code integration.

## Highlights

- ✨ **6 Specialized AI Agents** - Lead Architect, Backend Master, CLI Artisan, Platform Builder, Integration Specialist, QA Sentinel
- 🪝 **Automated Lifecycle Hooks** - Quality checks, formatting, error recovery
- 💾 **Intelligent State Management** - Automatic backups, checkpoints, recovery
- ⚡ **Template-Driven Generation** - Production-ready code from templates
- 📚 **Comprehensive Documentation** - 110KB+ of agent guidance

## Quick Start

```bash
git clone https://github.com/nxtg-ai/nxtg-forge.git
cd nxtg-forge
make install

# Using Claude Code
/init nxtg-forge --new
```

## Documentation

- [README](https://github.com/nxtg-ai/nxtg-forge#readme)
- [Architecture Guide](https://github.com/nxtg-ai/nxtg-forge/blob/main/docs/ARCHITECTURE.md)
- [Contributing](https://github.com/nxtg-ai/nxtg-forge/blob/main/CONTRIBUTING.md)
- [Changelog](https://github.com/nxtg-ai/nxtg-forge/blob/main/CHANGELOG.md)

## What's Next?

See our [v1.1 Roadmap](link-to-project) for planned features!

## Feedback

We'd love to hear from you! Share your thoughts, questions, or issues in the Discussions or Issues.

Thank you to everyone who contributed! 🙏
```

### Step 24: Share on Social Media (Optional)

**Twitter/X:**
```
🎉 Excited to announce NXTG-Forge v1.0.0!

Self-Deploying AI Development Infrastructure with:
✨ 6 AI Agents for specialized tasks
🪝 Automated quality & error handling
💾 Smart state management
⚡ Template-driven generation

Built with @AnthropicAI Claude Code

https://github.com/nxtg-ai/nxtg-forge
```

**LinkedIn:**
```
I'm thrilled to announce the release of NXTG-Forge v1.0.0 - a comprehensive platform for rapid AI-assisted project development.

Key features:
• 6 specialized AI agents (Lead Architect, Backend Master, CLI Artisan, Platform Builder, Integration Specialist, QA Sentinel)
• Automated lifecycle hooks for validation, formatting, and intelligent error recovery
• State management with automatic backups and checkpoints
• Template-driven code generation
• Seamless Claude Code integration

This open-source project represents months of development to create a professional-grade development infrastructure that accelerates project setup and maintains code quality throughout the development lifecycle.

Check it out: https://github.com/nxtg-ai/nxtg-forge

#AI #Development #OpenSource #ClaudeCode #DevTools
```

---

## Troubleshooting

### Issue: Tests Failing

```bash
# Run verbose tests to see details
pytest -v

# Run specific failing test
pytest tests/unit/test_specific.py -v

# Skip failing tests temporarily (NOT recommended for release)
# pytest -k "not test_that_fails"

# Fix issues before releasing
```

### Issue: Git Push Rejected

```bash
# If you don't have write access to nxtg-ai/nxtg-forge:
# 1. Fork the repository
# 2. Push to your fork
# 3. Create a pull request to nxtg-ai/nxtg-forge

# Or ask for collaborator access from repository owner
```

### Issue: Package Build Fails

```bash
# Check pyproject.toml syntax
python -c "import tomllib; tomllib.load(open('pyproject.toml', 'rb'))"  # Python 3.11+
# Or
python -c "import toml; toml.load('pyproject.toml')"

# Ensure setuptools is up to date
pip install --upgrade setuptools build wheel

# Try building again
python -m build
```

### Issue: GitHub CLI Not Working

```bash
# Re-authenticate
gh auth logout
gh auth login

# Use web interface instead (Option B in Step 14)
```

### Issue: Hooks Not Executable

```bash
# Make hooks executable
chmod +x .claude/hooks/*.sh

# Verify
ls -la .claude/hooks/*.sh

# Commit the permission change
git add .claude/hooks/*.sh
git commit -m "fix: ensure hooks are executable"
```

---

## Verification Checklist

After completing all steps, verify:

- ✅ GitHub repository has v1.0.0 tag
- ✅ Release page shows v1.0.0 with binaries
- ✅ README badges display correctly
- ✅ All documentation links work
- ✅ Installation from GitHub works
- ✅ Branch protection is enabled
- ✅ Discussions are enabled
- ✅ Repository topics are set
- ✅ Social preview image displays
- ✅ PyPI package available (if published)

---

## Next Steps

After v1.0.0 release:

1. Monitor Issues and Discussions for feedback
2. Start development on v1.1 features (see roadmap)
3. Improve test coverage toward 85% target
4. Engage with community contributors
5. Create additional examples and tutorials

---

**Congratulations on releasing NXTG-Forge v1.0.0!** 🎉

For questions or issues with the release process, check:
- [GitHub Docs - Managing Releases](https://docs.github.com/en/repositories/releasing-projects-on-github)
- [Python Packaging Guide](https://packaging.python.org/)
- NXTG-Forge Discussions: https://github.com/nxtg-ai/nxtg-forge/discussions
