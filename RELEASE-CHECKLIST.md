# NXTG-Forge v1.0.0 Release Checklist

Quick reference checklist for releasing v1.0.0 to GitHub.

See [RELEASE-INSTRUCTIONS.md](RELEASE-INSTRUCTIONS.md) for detailed explanations.

## Pre-Release

- [ ] On main branch: `git checkout main`
- [ ] Working directory clean or only has release changes
- [ ] Run tests: `make test` (expect 38 passing)
- [ ] Run quality checks: `make quality` (no critical errors)
- [ ] Verify package.json points to `nxtg-ai/nxtg-forge`
- [ ] Verify pyproject.toml points to `nxtg-ai/nxtg-forge`
- [ ] All required files exist (LICENSE, CONTRIBUTING.md, CHANGELOG.md, SECURITY.md, etc.)
- [ ] Clean build artifacts: `rm -rf build/ dist/ *.egg-info .coverage htmlcov/`

## Build

- [ ] Install build tools: `pip install --upgrade build twine`
- [ ] Build package: `python -m build`
- [ ] Verify dist/ contains: `nxtg-forge-1.0.0.tar.gz` and `nxtg_forge-1.0.0-py3-none-any.whl`
- [ ] Validate package: `twine check dist/*` (expect PASSED)
- [ ] (Optional) Test install in venv

## Git Operations

- [ ] Stage changes: `git add .`
- [ ] Review changes: `git status` and `git diff --cached`
- [ ] Create commit with release message (see RELEASE-INSTRUCTIONS.md Step 10)
- [ ] Create tag v1.0.0 (see RELEASE-INSTRUCTIONS.md Step 11)
- [ ] Verify tag: `git tag -l` and `git show v1.0.0`

## GitHub Push

- [ ] Verify remote: `git remote -v` points to `nxtg-ai/nxtg-forge`
- [ ] Push main: `git push origin main`
- [ ] Push tag: `git push origin v1.0.0`
- [ ] Verify on GitHub: https://github.com/nxtg-ai/nxtg-forge/tags

## GitHub Release

**Using GitHub CLI:**
- [ ] Install gh CLI (if needed)
- [ ] Authenticate: `gh auth login`
- [ ] Create release: (see RELEASE-INSTRUCTIONS.md Step 14)
- [ ] Verify: `gh release view v1.0.0`

**Using Web Interface:**
- [ ] Go to: https://github.com/nxtg-ai/nxtg-forge/releases/new
- [ ] Select tag: v1.0.0
- [ ] Title: "v1.0.0 - Foundation Release"
- [ ] Description: Copy from CHANGELOG.md
- [ ] Upload: `nxtg-forge-1.0.0.tar.gz` and `nxtg_forge-1.0.0-py3-none-any.whl`
- [ ] Check "Set as the latest release"
- [ ] Publish release

## Repository Configuration

- [ ] Set About section (description, topics)
- [ ] Enable Features (Wikis, Issues, Discussions, Projects)
- [ ] Upload social preview image (`docs/nxtg-forge.png`)
- [ ] Configure branch protection for main
- [ ] Enable Discussions with categories
- [ ] (Optional) Create v1.1 Roadmap project

## Post-Release

- [ ] Test installation from GitHub release
- [ ] (Optional) Publish to PyPI
- [ ] Create announcement in Discussions
- [ ] (Optional) Share on social media
- [ ] Monitor Issues and Discussions

## Verification

- [ ] Tag visible on GitHub
- [ ] Release page shows v1.0.0 with binaries
- [ ] README badges display correctly
- [ ] All documentation links work
- [ ] Can install: `pip install https://github.com/nxtg-ai/nxtg-forge/releases/download/v1.0.0/nxtg_forge-1.0.0-py3-none-any.whl`
- [ ] CLI works: `forge --help`

---

**Status**: Ready to release! ✅

**Date**: _____________

**Released by**: _____________

**Release URL**: https://github.com/nxtg-ai/nxtg-forge/releases/tag/v1.0.0
