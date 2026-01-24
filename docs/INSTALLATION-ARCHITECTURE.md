# NXTG-Forge Installation Architecture

## Executive Summary

Professional installation system for NXTG-Forge v3.0 that eliminates version confusion and provides enterprise-grade user experience.

## Problem Statement

CEO encountered confusing installation experience:
- Fresh v3 install detected old v2 state
- Showed "v2.0 installed, upgrade to v3.0 available"
- Expected: Clean v3.0 installation
- Got: Confusing upgrade prompt

## Architectural Solution

### Core Principles

1. **Zero Version Confusion**: Fresh installs NEVER mention old versions
2. **Intelligent Detection**: Smart context awareness without user confusion
3. **Professional Polish**: Enterprise-grade installation experience
4. **Data Preservation**: Safe upgrades that preserve user data
5. **Fast & Reliable**: < 30 second installation with validation

### Version Management Strategy

```json
// state.json structure (v3.0+)
{
  "version": "3.0.0",        // State schema version
  "project": {
    "forge_version": "3.0.0"  // NXTG-Forge version (what we check)
  }
}
```

**Critical**: Always check `project.forge_version`, never just `version`

### Installation Flow Decision Tree

```
START
  |
  ├─ No .claude/ directory?
  │   └─ FRESH INSTALL (v3.0)
  │       Never mention v2.0
  │
  ├─ Has .claude/ but no state.json?
  │   └─ REPAIR INSTALL
  │       Fix broken installation
  │
  └─ Has state.json?
      |
      ├─ forge_version == "3.0.0"?
      │   └─ ALREADY INSTALLED
      │       Show commands, no action
      │
      ├─ forge_version < "3.0.0"?
      │   └─ UPGRADE PATH
      │       Show version upgrade
      │
      └─ forge_version > "3.0.0"?
          └─ ERROR
              Installer out of date
```

## Implementation Components

### 1. Version Detector (`version-detector.sh`)

```bash
# Silent detection, returns status code
./version-detector.sh
# Exit codes:
# 0 = Fresh or current
# 1 = Partial install
# 2 = Upgrade available
# 3 = Newer version
# 4 = Unknown
```

### 2. Professional Installer (`professional-installer.py`)

```python
# Handles all installation scenarios
python professional-installer.py

# Features:
# - Auto-detects context
# - Professional UI
# - Progress indicators
# - Error recovery
# - Validation
```

### 3. Init Command (`init.md`)

Enhanced `/init` command with:
- Intelligent routing
- Professional output
- No version confusion
- Clear success criteria

## User Experience Flows

### Fresh Install (Most Common)

```
User: Copies .claude/ to new project
User: Runs /init
System: Detects no existing installation
System: Shows "Installing NXTG-Forge v3.0"
System: Never mentions v2.0
System: Completes in < 30 seconds
User: Sees success, ready to work
```

### Existing v3 Installation

```
User: Runs /init on v3 project
System: Detects v3.0 already installed
System: Shows "Already installed" with commands
User: Proceeds with development
```

### Upgrade from v2.x (Only if detected)

```
User: Has actual v2.x installation
User: Runs /init
System: Detects old version
System: Shows "Upgrade from v2.x to v3.0?"
User: Confirms upgrade
System: Migrates data safely
System: Shows success
```

## Repository Structure Decision

### Chosen: Single Repository with Version Isolation

**Rationale**:
- Industry standard practice
- Easier maintenance
- Single source of truth
- Clear upgrade paths

**Implementation**:
- v3/ directory contains clean v3.0 code
- No v2.0 references in v3 code
- State files use semantic versioning
- Migration scripts handle upgrades

### Rejected Alternatives

1. **Separate Repositories**
   - Pro: Complete isolation
   - Con: Maintenance overhead, sync issues

2. **Git Branches**
   - Pro: Version control native
   - Con: Merge conflicts, complexity

3. **Monorepo with Workspaces**
   - Pro: Organized
   - Con: Over-engineering

## State Detection Logic

### Rules

1. **Check Order**:
   ```
   1. Check .claude/ exists
   2. Check state.json exists
   3. Check forge_version field
   4. Route to appropriate flow
   ```

2. **Version Comparison**:
   ```python
   # Semantic versioning
   if forge_version == "3.0.0":
       # Current
   elif forge_version < "3.0.0":
       # Needs upgrade
   else:
       # Error: installer outdated
   ```

3. **Fallback Logic**:
   ```python
   # If forge_version missing
   if not forge_version:
       # Check legacy locations
       forge_version = state.get('forge_version', '1.0.0')
   ```

## Migration Strategy

### For v2.x Users

1. **Detection**: Check forge_version < 3.0.0
2. **Prompt**: Show upgrade benefits
3. **Backup**: Save current state
4. **Migrate**: Transform to v3 structure
5. **Validate**: Ensure success
6. **Report**: Show what changed

### Data Preservation

```python
# Always preserve:
- User configurations
- Project state
- Custom skills
- Agent history
- MCP configurations

# Always update:
- Version markers
- Agent architectures
- Command structures
- Hook systems
```

## Testing Matrix

### Test Scenarios

| Scenario | Setup | Expected Result |
|----------|-------|-----------------|
| Fresh Install | No .claude/ | "Installing v3.0", no v2 mention |
| Existing v3 | .claude/ with v3 state | "Already installed v3.0" |
| Old v2 Install | .claude/ with v2 state | "Upgrade from v2 to v3?" |
| Broken Install | .claude/ no state | "Repairing installation" |
| Newer Version | v4.0 in state | "Error: Update installer" |

### Validation Commands

```bash
# Test fresh install
rm -rf .claude && /init
# Should NOT see v2.0 anywhere

# Test existing v3
/init
# Should see "Already installed"

# Test upgrade path
echo '{"project":{"forge_version":"2.0.0"}}' > .claude/state.json && /init
# Should see upgrade prompt

# Test repair
mkdir -p .claude && rm -f .claude/state.json && /init
# Should see repair message
```

## Success Metrics

### Installation Success

1. **Time**: < 30 seconds for fresh install
2. **Clarity**: Zero version confusion
3. **Reliability**: 100% success rate
4. **Recovery**: Automatic error handling
5. **Validation**: All components verified

### User Experience Success

1. **First Run**: Works perfectly
2. **No Manual Steps**: Fully automated
3. **Clear Messaging**: Professional output
4. **Immediate Productivity**: Ready to code
5. **No Surprises**: Predictable behavior

## Error Handling

### Common Errors

1. **Permission Denied**
   ```
   Solution: Check permissions, provide fix command
   Never: Fail silently
   ```

2. **Git Not Found**
   ```
   Solution: Continue without git, warn user
   Never: Block installation
   ```

3. **Corrupted State**
   ```
   Solution: Backup and recreate
   Never: Lose user data
   ```

## Rollout Plan

### Phase 1: Immediate Fix
1. ✅ Update init.md with new logic
2. ✅ Fix state.json forge_version to 3.0.0
3. ✅ Create version detector script
4. ✅ Create professional installer

### Phase 2: Testing
1. Test fresh installations
2. Test upgrade scenarios
3. Test error conditions
4. Validate user experience

### Phase 3: Documentation
1. Update README
2. Create migration guide
3. Document version strategy
4. Publish release notes

## Maintenance

### Version Bumping

When releasing new versions:

1. Update `CURRENT_VERSION` in:
   - professional-installer.py
   - version-detector.sh
   - init.md

2. Update state.json template

3. Test all scenarios

4. Document changes

### Backward Compatibility

- Always support n-1 version upgrades
- Preserve user data
- Provide rollback capability
- Document breaking changes

## Conclusion

This architecture provides:
- Zero confusion for fresh installs
- Clean upgrade path for existing users
- Professional enterprise experience
- Maintainable codebase
- Clear version management

The system ensures users never see confusing version messages during fresh installations while properly handling upgrades when needed.