# PyPI Publication Guide for NXTG-Forge

**Current Status**: Package NOT published to PyPI
**Package Name**: `nxtg-forge`
**Current Version**: 1.0.0

---

## Executive Summary

The package is **fully configured and ready** for PyPI publication, but has **never been published**. This document outlines the publication process and current status.

### Package Configuration Status

✅ **Ready for Publication**:

- `pyproject.toml` properly configured with all metadata
- Package structure follows Python packaging standards
- Entry points configured (`nxtg-forge` and `forge` CLI commands)
- Dependencies properly declared
- Version number set (1.0.0)
- License specified (MIT)
- README.md exists for PyPI description

❌ **Not Yet Done**:

- Package has never been built
- Package has never been uploaded to PyPI
- PyPI account not configured
- No distribution artifacts exist

---

## Current Installation Method

**ONLY WORKING METHOD** (as of 2026-01-07):

```bash
# Clone the repository
git clone https://github.com/nxtg-ai/nxtg-forge.git
cd nxtg-forge/v3

# Install in editable mode from source
pip install -e .
```

**DOES NOT WORK** (will fail):

```bash
pip install nxtg-forge  # ❌ Package not found on PyPI
```

---

## How to Publish to PyPI

### Prerequisites

1. **Create PyPI Account**:
   - Register at <https://pypi.org/account/register/>
   - Enable 2FA (required for publishing)
   - Create API token at <https://pypi.org/manage/account/token/>

2. **Install Build Tools**:

   ```bash
   pip install --upgrade build twine
   ```

### Publication Steps

#### Step 1: Verify Package Configuration

```bash
cd /home/axw/projects/NXTG-Forge/v3

# Verify package imports
python -c "import forge; print(f'Version: {forge.__version__}')"

# Check pyproject.toml is valid
python -c "import tomllib; tomllib.load(open('pyproject.toml', 'rb'))"
```

#### Step 2: Build Distribution Packages

```bash
# Clean previous builds
rm -rf dist/ build/ *.egg-info

# Build wheel and source distribution
python -m build

# Verify artifacts created
ls -lh dist/
# Should see:
# - nxtg_forge-1.0.0-py3-none-any.whl
# - nxtg_forge-1.0.0.tar.gz
```

#### Step 3: Test Installation Locally

```bash
# Create test virtual environment
python -m venv /tmp/test-nxtg-forge
source /tmp/test-nxtg-forge/bin/activate

# Install from local wheel
pip install dist/nxtg_forge-1.0.0-py3-none-any.whl

# Verify installation
python -c "import forge; print(forge.__version__)"
forge --version

# Clean up
deactivate
rm -rf /tmp/test-nxtg-forge
```

#### Step 4: Upload to TestPyPI (Recommended First)

```bash
# Upload to TestPyPI first for validation
twine upload --repository testpypi dist/*

# Test installation from TestPyPI
pip install --index-url https://test.pypi.org/simple/ nxtg-forge
```

#### Step 5: Upload to PyPI (Production)

```bash
# Upload to production PyPI
twine upload dist/*

# Verify on PyPI
# Visit: https://pypi.org/project/nxtg-forge/

# Test installation
pip install nxtg-forge
```

---

## Post-Publication Tasks

After successfully publishing to PyPI:

1. **Update Documentation**:
   - Change installation instructions from source install to `pip install nxtg-forge`
   - Update README.md, GETTING-STARTED.md, and all docs
   - Remove "install from source" warnings

2. **Create Git Tag**:

   ```bash
   git tag -a v1.0.0 -m "Release v1.0.0 - First PyPI publication"
   git push origin v1.0.0
   ```

3. **Create GitHub Release**:
   - Go to <https://github.com/nxtg-ai/nxtg-forge/releases/new>
   - Tag: v1.0.0
   - Title: "v1.0.0 - First PyPI Release"
   - Upload dist/ artifacts
   - Publish release

4. **Announce**:
   - Update project status from "install from source" to "available on PyPI"
   - Update badges in README.md
   - Announce on relevant channels

---

## Package Metadata (from pyproject.toml)

```toml
[project]
name = "nxtg-forge"
version = "1.0.0"
description = "Self-Deploying AI Development Infrastructure"
requires-python = ">=3.9"
license = {text = "MIT"}
authors = [{name = "NXTG-Forge Contributors"}]

[project.scripts]
nxtg-forge = "forge.cli:main"
forge = "forge.cli:main"

[project.urls]
Homepage = "https://github.com/nxtg-ai/nxtg-forge"
Repository = "https://github.com/nxtg-ai/nxtg-forge.git"
```

---

## Troubleshooting

### Build Fails

**Problem**: `python -m build` fails

**Solutions**:

```bash
# Install/upgrade build tools
pip install --upgrade setuptools build wheel

# Check pyproject.toml syntax
python -c "import tomllib; tomllib.load(open('pyproject.toml', 'rb'))"

# Verify package imports
python -c "import forge"
```

### Upload Fails

**Problem**: `twine upload` authentication fails

**Solutions**:

1. Verify PyPI API token is correct
2. Use `.pypirc` configuration:

   ```ini
   [pypi]
   username = __token__
   password = pypi-AgEIcHlwaS5vcmc...your-token-here...
   ```

3. Or use environment variable:

   ```bash
   export TWINE_PASSWORD=pypi-AgEIcHlwaS5vcmc...your-token-here...
   twine upload --username __token__ dist/*
   ```

### Package Name Conflict

**Problem**: Package name `nxtg-forge` already taken on PyPI

**Solutions**:

1. Check current ownership: <https://pypi.org/project/nxtg-forge/>
2. If you own it, proceed with upload
3. If someone else owns it, choose different name:
   - Update `name` in pyproject.toml
   - Consider: `nxtg-forge-ai`, `forge-ai`, `nxtg-dev`, etc.

---

## Version Management

### Current Version: 1.0.0

**For Future Releases**:

1. Update version in **THREE** places:
   - `pyproject.toml` → `[project] version = "X.Y.Z"`
   - `forge/__init__.py` → `__version__ = "X.Y.Z"`
   - Git tag → `git tag vX.Y.Z`

2. Follow Semantic Versioning:
   - **MAJOR** (X.0.0): Breaking changes
   - **MINOR** (1.X.0): New features, backwards compatible
   - **PATCH** (1.0.X): Bug fixes only

3. Build and publish:

   ```bash
   # Update version numbers
   vim pyproject.toml forge/__init__.py

   # Build new distribution
   rm -rf dist/
   python -m build

   # Upload to PyPI
   twine upload dist/*

   # Tag release
   git tag -a vX.Y.Z -m "Release vX.Y.Z"
   git push origin vX.Y.Z
   ```

---

## Security Considerations

1. **API Tokens**:
   - NEVER commit PyPI tokens to git
   - Use environment variables or `.pypirc` (add to .gitignore)
   - Rotate tokens if compromised

2. **Package Signing**:
   - Consider GPG signing releases
   - Add `--sign` flag to `twine upload`

3. **Dependencies**:
   - Pin dependency versions for security
   - Run `safety check` before publishing
   - Keep dependencies updated

---

## Quick Reference Commands

```bash
# Build package
python -m build

# Check distribution
twine check dist/*

# Upload to TestPyPI
twine upload --repository testpypi dist/*

# Upload to PyPI
twine upload dist/*

# Install from PyPI (after publication)
pip install nxtg-forge

# Install specific version
pip install nxtg-forge==1.0.0

# Upgrade to latest
pip install --upgrade nxtg-forge
```

---

## Status Checklist

Pre-Publication:

- ✅ pyproject.toml configured correctly
- ✅ Package imports successfully
- ✅ Version numbers consistent
- ✅ README.md exists
- ✅ LICENSE file exists
- ❌ PyPI account created
- ❌ API token generated
- ❌ Build tools installed
- ❌ Package built
- ❌ Package uploaded

Post-Publication:

- ❌ Package available on PyPI
- ❌ `pip install nxtg-forge` works
- ❌ Documentation updated
- ❌ GitHub release created
- ❌ Git tag created

---

## Next Steps

**To publish NXTG-Forge to PyPI**:

1. Create PyPI account and API token (5 minutes)
2. Install build tools: `pip install --upgrade build twine`
3. Build package: `python -m build`
4. Test on TestPyPI first (recommended)
5. Upload to PyPI: `twine upload dist/*`
6. Update all documentation to reference PyPI installation
7. Celebrate! 🎉

**Estimated Time to Publish**: 30-60 minutes (mostly account setup)

**Complexity**: Low - Package is ready, just needs upload

---

## Contact

For questions about PyPI publication:

- Email: <axw@nxtg.ai>
- Issues: <https://github.com/nxtg-ai/nxtg-forge/issues>
