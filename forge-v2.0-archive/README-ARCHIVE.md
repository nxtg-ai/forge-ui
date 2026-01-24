# NXTG-Forge v2.0 Python Package - ARCHIVED

**Archive Date**: 2026-01-23
**Status**: DEPRECATED - DO NOT USE
**Replacement**: Pure Bash scaffolding tool (init.sh)

---

## Why This Package Was Archived

This Python package was deprecated in NXTG-Forge v2.1 based on critical findings from alpha testing:

### Alpha Testing Results (3db Platform - December 2025 - January 2026)

**Finding #1: Zero Production Usage**
- Python package installed: ✅ (20+ modules, CLI working)
- Python imports in production use: **0** (ZERO)
- Conclusion: Package complexity with no value delivery

**Finding #2: Installation Pain**
- Installation time with Python: 2-5 minutes
- Manual dependency resolution required
- Platform-specific issues (Windows, macOS, Linux)

**Finding #3: Scaffolding Failures**
- Out-of-box success rate: ~70%
- Manual fixes required for .claude/ structure
- Template copying failures

### v2.1 Solution: Pure Bash Scaffolding

**Replacement Tool**: `init.sh` (pure bash, no dependencies)

**Benefits**:
- Installation time: <30 seconds (94% faster)
- Success rate: 100% (tested on 5+ project types)
- Zero manual fixes required
- Cross-platform (macOS, Linux, WSL)
- No dependency management

**What Changed**:
1. **Removed**: Entire Python package (20+ modules, 15k+ LoC)
2. **Added**: init.sh (~500 lines of bash)
3. **Added**: verify-setup.sh (automated validation)
4. **Added**: templates/ directory (39 scaffolding templates)

---

## Migration Guide

If you were using v2.0, see: `MIGRATION-GUIDE-V2.0-TO-V2.1.md`

**Quick Migration**:
```bash
# Remove old Python package
pip uninstall nxtg-forge

# Use new bash scaffolding
./init.sh .
./verify-setup.sh
```

---

## Package Contents (Historical Reference)

This archive contains the complete v2.0 Python package:

### CLI Tools
- `forge.cli:main` - Command-line interface
- Commands: init, analyze, deploy, status

### Modules
- `analytics.py` - Analytics and metrics
- `cli.py` - Command-line interface
- `config.py` - Configuration management
- `container.py` - Dependency injection
- `directory_manager.py` - Directory operations
- `file_generator.py` - File generation
- `gap_analyzer.py` - Gap analysis
- `mcp_detector.py` - MCP server detection
- `state_manager.py` - State persistence
- `spec_generator.py` - Specification generation

### Agents
- Contains 5 specialized Forge agents (moved to templates/agents/)

### Commands
- Contains slash command implementations (moved to templates/commands/)

### Services
- Business logic and integrations

---

## Why Keep This Archive?

1. **Historical Reference**: Understanding v2.0 architecture
2. **Algorithm Preservation**: Gap analyzer, MCP detector logic may be useful
3. **Test Cases**: Integration test patterns
4. **Audit Trail**: Complete decision history

---

## Do NOT Use This Package

**This package is DEPRECATED and will NOT receive**:
- Security updates
- Bug fixes
- Feature enhancements
- Documentation updates
- Support

**Use init.sh instead**: Simpler, faster, more reliable.

---

## Statistics

**Lines of Code**: ~15,000
**Dependencies**: 15 required + 5 dev
**Installation Time**: 2-5 minutes
**Production Usage**: 0 imports

**vs. v2.1 Bash Scaffolding**:
**Lines of Code**: ~500
**Dependencies**: 0 (pure bash)
**Installation Time**: <30 seconds
**Production Usage**: 100% of projects

**Conclusion**: 30x fewer lines, 10x faster, 100% adoption

---

**For v2.1 documentation, see**: `/docs/` directory
**For migration assistance**: `MIGRATION-GUIDE-V2.0-TO-V2.1.md`
