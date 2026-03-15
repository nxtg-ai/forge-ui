---
event: PostToolUse
tools: ["Bash", "Edit", "Write", "SlashCommand"]
when: On error, failure, or unexpected behavior
---

# 🛡️ NXTG-Forge Error Recovery System

An error occurred, but NXTG-Forge has your back! Let's handle this gracefully.

## 🔍 Error Response Protocol

1. **Capture Context**
   - Save current state and variables
   - Record the exact operation that failed
   - Preserve any partial progress

2. **Analyze Root Cause**
   - Identify the actual problem (not just symptoms)
   - Check for common patterns
   - Review recent changes

3. **Suggest Solutions**
   - Provide specific fix options
   - Offer alternative approaches
   - Recommend preventive measures

4. **Attempt Recovery**
   - Try automatic fixes when safe
   - Rollback if necessary
   - Preserve user data always

5. **Clear Reporting**
   - Explain what went wrong in plain language
   - Show exactly how to fix it
   - Provide relevant documentation links

## 🎯 NXTG-Forge Specific Recovery

### Command Failures
- `/[FRG]-init` failed? Check if .claude directory exists
- `/[FRG]-status` error? Verify git repository is initialized
- `/[FRG]-feature` blocked? Ensure clean working directory
- `/[FRG]-test` failing? Check test framework installation
- `/[FRG]-deploy` stopped? Verify deployment credentials

### Agent Issues
- Agent not responding? Use `/[FRG]-status` to check health
- Orchestration stuck? Run `/[FRG]-report` for activity log
- Quality gates failing? Review with `/[FRG]-status-enhanced`

## 📊 Common Error Patterns

**Build & Compilation**
- Missing dependencies → Run package manager install
- Syntax errors → Check recent edits with git diff
- Type errors → Verify TypeScript/type configurations

**Testing**
- Test failures → Identify breaking changes
- Coverage drops → Add tests for new code
- Timeout issues → Check for infinite loops or long operations

**Environment**
- Permission denied → Check file ownership and permissions
- Command not found → Verify tool installation
- Port in use → Find and stop conflicting processes

**Git & Version Control**
- Merge conflicts → Use git status to identify files
- Uncommitted changes → Stash or commit before operations
- Detached HEAD → Checkout proper branch

## 🚀 Quick Recovery Commands

```bash
# Check NXTG-Forge health
/[FRG]-status

# Generate full activity report
/[FRG]-report

# Reinitialize if needed
/[FRG]-init --repair

# Check enhanced status with metrics
/[FRG]-status-enhanced
```

## 💪 Remember Your Superpowers

Even when errors occur, NXTG-Forge gives you:
- **Automatic rollback** capabilities
- **State preservation** for recovery
- **Detailed diagnostics** for debugging
- **Agent assistance** for complex issues

**Never let errors stop progress** - NXTG-Forge transforms problems into learning opportunities!

Error handled. Ready to continue forging ahead! 🔨