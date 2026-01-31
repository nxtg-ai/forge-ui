# User Critical Instructions - NEVER FORGET

**Date:** January 29, 2026  
**Context:** Overnight autonomous operation session

## Core Principles (BURNED INTO MEMORY)

### 1. Dog-Food or Die
**Rule:** Use Claude Code's native capabilities. DON'T build TypeScript meta-services when agents can do the work.

**EXCEPTION:** TypeScript IS appropriate for **UI abstractions** - code that provides interface between UI and Claude Code CLI.

**Examples:**
- ❌ WRONG: `src/services/plan-executor.ts` - orchestration service
- ❌ WRONG: `src/services/forge-builder-service.ts` - meta-service  
- ✅ RIGHT: `src/services/state-bridge.ts` - UI abstraction for CLI
- ✅ RIGHT: Agents use Write/Edit/Bash tools directly

### 2. Run Agents in Parallel (Up to 20)
**Rule:** When multiple independent tasks exist, launch agents in PARALLEL using multiple Task tool calls in a SINGLE message.

**Example:**
```typescript
// Send ONE message with multiple Task invocations
Task(developer, "Implement types")
Task(developer, "Implement methods")
Task(qa, "Write tests")
Task(developer, "Add CLI command")
```

### 3. Real Logs, No Mocking
**Rule:** QA/testing agents must see REAL web logs. Don't fuck around with mocks.

**Requirements:**
- Real running web servers
- Real log outputs
- Real integration tests
- No simulated/mocked testing data

### 4. CEO Token Usage
**Problem:** CEO-LOOP is sucking up information and better remember it. NOT require 1 million tokens every invoke.

**Solution:** Use persistent memory system (claude-mem) to store:
- Project context
- Previous decisions
- Vision alignment
- Critical learnings

### 5. Everything Goes to Memory
**Rule:** User said "i want everything i'm saying to stay persistent in your memory"

**Action:** Store ALL user instructions, feedback, corrections in persistent memory system.

## Critical Corrections Made

### Correction #1: TypeScript Services (violated twice)
- Built `planner-service.ts` instead of using `[AFRG]-planner.md` agent
- Built `forge-builder-service.ts` instead of using `[AFRG]-builder.md` agent
- **Fixed:** Modified agents to output REAL files using Write/Edit tools

### Correction #2: CEO-LOOP Missing Task Tool
- CEO couldn't delegate to other agents
- **Fixed:** Added Task tool to CEO-LOOP frontmatter

### Correction #3: Execute, Don't Ask
- Stopped to ask permission after decisions made
- **Fixed:** Execute immediately after CEO-LOOP decides

### Correction #4: Infinity Terminal Misinformation (2026-01-31)
- Wrongly claimed Zellij was needed for session persistence
- Wrongly suggested the Infinity Terminal didn't have persistence built-in
- **Fact:** Session persistence is BUILT INTO the PTY Bridge + useSessionPersistence.ts
- **Fact:** Zellij is OPTIONAL local enhancement, not a dependency
- **Fixed:** Created CLAUDE.md with correct architecture documentation

### Correction #5: Multi-Device Access (2026-01-31)
- Spent too long on scattered fixes instead of finding root cause
- Root cause was `.env` file hardcoding `VITE_API_URL=http://localhost:5051/api`
- **Fixed:** Removed hardcoded URLs, documented proper Vite proxy approach

## Current Status

**Week 1:** COMPLETE ✅
- Real approval queue (37 tests)
- Forge-Planner agent (outputs real plans)
- CEO-LOOP validated (autonomous decisions)
- Task-level checkpoints (22 tests)
- 4 critical gaps closed

**Next:** Continue autonomous overnight operation with parallel agents.
