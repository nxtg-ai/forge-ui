# NXTG-Forge Auto-Setup Guide

**For Claude Code**: This file tells you how to detect and setup nxtg-forge automatically.

---

## Detection Protocol

When Claude Code starts in any directory, check if nxtg-forge is available:

### 1. Check if nxtg-forge is installed

```bash
python -c "import forge; print(forge.__version__)" 2>/dev/null
```

If this succeeds, nxtg-forge is installed and available.

### 2. Check if project is initialized

```bash
ls .nxtg-forge/ 2>/dev/null
# or
ls .claude/ 2>/dev/null  # Legacy location
```

If `.nxtg-forge/` exists → Project is initialized, proceed normally
If not → Trigger interactive setup

---

## Interactive Setup Flow

When nxtg-forge is detected but project is not initialized, start the onboarding:

### Welcome Message

```
🎯 NXTG-Forge Detected!

I see you have nxtg-forge installed. This gives me powerful capabilities:
  • Intelligent agent orchestration (6 specialized agents)
  • Automated TDD workflows
  • Project analytics and health tracking
  • Smart refactoring suggestions
  • Gap analysis and quality monitoring
  • Zero-context recovery from interruptions

Would you like me to set up nxtg-forge for this project?
  [Yes] - I'll configure everything for you
  [No] - Skip for now (you can run /init later)
  [Learn More] - Tell me about the capabilities
```

### If User Says "Yes" → Start Setup Wizard

**Step 1: Detect Project Type**

```
Let me analyze your project...

[Analyzing .git, package.json, requirements.txt, etc.]

I detected:
  • Language: Python
  • Framework: FastAPI (detected from requirements.txt)
  • Database: PostgreSQL (detected from DATABASE_URL in .env)
  • Git Repository: Yes (GitHub)

Is this correct?
  [Yes] - Proceed with this configuration
  [No] - Let me ask you some questions
```

**Step 2: Choose Features** (if auto-detection unclear)

```
What kind of project is this?
  1. API/Backend Service (REST, GraphQL)
  2. CLI Tool
  3. Web Application (Full-stack)
  4. Platform (Multiple services)
  5. Library/Package
  6. Other/Custom

→ User selects: 1

Which nxtg-forge features do you want?
  ✓ Agent Orchestration (6 specialized AI agents)
  ✓ TDD Workflow Automation (red-green-refactor cycles)
  ✓ Project Analytics (track coverage, velocity, quality)
  ✓ Refactoring Bot (auto-detect code smells)
  ✓ Gap Analysis (improvement recommendations)
  ✓ Auto MCP Detection (detect and configure MCP servers)

[All selected by default - user can deselect]
```

**Step 3: Configure Preferences**

```
Quick preferences:

1. Test Framework:
   → Detected: pytest (from requirements.txt)
   Change? [No]

2. Code Style:
   → Auto-detected: ruff + mypy
   Change? [No]

3. Git Workflow:
   → Trunk-based development with feature branches
   Change? [No]

4. Agent Preferences:
   → All 6 agents enabled
   Customize? [No]
```

**Step 4: Auto-Configuration**

```
Perfect! I'm setting up nxtg-forge for you...

✓ Creating .nxtg-forge/ directory structure
✓ Initializing state management (state.json)
✓ Configuring agents (6 specialists ready)
✓ Setting up hooks (pre-task, post-task, on-error, on-file-change)
✓ Creating skills library (15 skill documents)
✓ Installing workflow automation (TDD, refactoring)
✓ Setting up analytics tracking
✓ Configuring MCP servers (detected: github, postgres)
✓ Generating project specification
✓ Creating initial checkpoint

Setup complete! 🎉
```

**Step 5: Ready to Use**

```
NXTG-Forge is now fully configured! Here's what I can do:

🤖 AGENTS AT YOUR SERVICE:
  • Lead Architect - System design and architecture
  • Backend Master - Backend implementation
  • CLI Artisan - Command-line tools
  • Platform Builder - Infrastructure and deployment
  • Integration Specialist - Third-party integrations
  • QA Sentinel - Testing and quality assurance

📋 QUICK COMMANDS:
  /status - Show complete project state
  /feature "name" - Create new feature (auto-orchestrated)
  /gap-analysis - Identify improvements
  /checkpoint "msg" - Save current state

🎯 WHAT WOULD YOU LIKE TO DO?

  1. Start a new feature
  2. Review existing code
  3. Run tests and improve coverage
  4. Analyze project health
  5. Just explore the codebase
  6. Something else (tell me what)

→ [User chooses or describes their goal]
```

---

## Auto-Configuration Details

### Directory Structure Created

```
.nxtg-forge/
├── config.json              # Central configuration
├── state.json               # Project state tracking
├── skills/                  # Agent skill documents
│   ├── architecture.md
│   ├── testing-strategy.md
│   ├── coding-standards.md
│   └── agents/              # Per-agent skills
├── hooks/                   # Lifecycle hooks
│   ├── pre-task.sh
│   ├── post-task.sh
│   ├── on-error.sh
│   └── on-file-change.sh
├── prompts/                 # Reusable templates
│   ├── feature-implementation.md
│   ├── bug-fix.md
│   ├── refactoring.md
│   └── code-review.md
├── workflows/               # Automation scripts
│   ├── tdd-workflow.sh
│   └── refactor-bot.sh
├── analytics/               # Metrics storage
│   └── metrics.json
├── checkpoints/             # State checkpoints
└── commands/                # Custom slash commands
    ├── feature.md
    ├── gap-analysis.md
    └── status.md
```

### Config.json Template

Based on project detection, generate appropriate config:

```json
{
  "version": "1.0.0",
  "project": {
    "name": "${PROJECT_NAME}",
    "type": "${DETECTED_TYPE}",
    "language": "${DETECTED_LANGUAGE}",
    "framework": "${DETECTED_FRAMEWORK}"
  },
  "agents": {
    "orchestration": {
      "enabled": true,
      "max_parallel": 3,
      "learning_enabled": true
    },
    "available": [
      "lead-architect",
      "backend-master",
      "cli-artisan",
      "platform-builder",
      "integration-specialist",
      "qa-sentinel"
    ]
  },
  "features": {
    "tdd_workflow": true,
    "refactoring_bot": true,
    "analytics": true,
    "gap_analysis": true,
    "mcp_auto_detect": true
  },
  "quality": {
    "targets": {
      "coverage": 85,
      "type_checking": true,
      "linting": true
    }
  }
}
```

---

## Ongoing Behavior

### On Every Claude Code Start

1. **Detect nxtg-forge**: Check if installed
2. **Load config**: Read `.nxtg-forge/config.json`
3. **Load state**: Read `.nxtg-forge/state.json`
4. **Load skills**: Import all skill documents into context
5. **Register commands**: Make /status, /feature, etc. available
6. **Check recovery**: Look for interrupted sessions
7. **Greet user**: Context-aware greeting

### Example: Returning User

```
Welcome back! NXTG-Forge is ready.

📊 Project Health: 94/100 (Excellent)
🎯 Phase: Testing
✅ Recent: Fixed all type errors, added analytics tests
📝 In Progress: Nothing currently

What would you like to work on?
```

### Example: Interrupted Session Detected

```
⚠️  I detected an interrupted session from 2 hours ago.

You were working on: "Add user authentication feature"
Progress: Design complete, implementation 60% done
Last checkpoint: cp-003 (1 hour ago)

Would you like to:
  1. Resume where you left off
  2. Restore from last checkpoint
  3. Start fresh (save progress for later)

→ [User chooses]
```

---

## Agent Auto-Engagement

Claude should automatically engage appropriate agents:

### User: "I want to add user authentication"

```
I'll orchestrate this feature for you using multiple specialized agents:

1. 🏗️ Lead Architect - Design authentication architecture
2. 💻 Backend Master - Implement auth endpoints
3. 🔒 Integration Specialist - Configure auth providers (OAuth, JWT)
4. ✅ QA Sentinel - Write authentication tests

This will happen automatically. I'll coordinate between agents
and keep you updated on progress.

Shall I proceed?
```

### User: "Can you review my code?"

```
I'll have our code review team take a look:

1. 🏗️ Lead Architect - Architecture compliance review
2. 💻 Backend Master - Implementation quality check
3. ✅ QA Sentinel - Test coverage analysis

Running comprehensive review...
[Agent coordination happens automatically]

Review complete! Here's what we found...
```

### User: "The tests are failing"

```
Let me engage QA Sentinel to investigate...

🔍 Analyzing test failures...
✓ Found 3 failing tests in test_auth.py
✓ Root cause: Database migration missing

I'll fix this by:
  1. Creating missing migration
  2. Updating test fixtures
  3. Re-running test suite

Shall I proceed with the fix?
```

---

## Smart Suggestions

Claude should proactively suggest nxtg-forge features:

### When user commits code without tests

```
I notice you just implemented a new feature but didn't add tests.

Would you like me to:
  1. Run the TDD workflow (I'll write tests for you)
  2. Check test coverage with analytics
  3. Skip for now

→ [User chooses]
```

### When code smells detected

```
I detected some code that could be refactored:
  • 3 functions with high complexity
  • 2 code duplication instances

Should I run the refactoring bot to generate suggestions?
```

### When coverage drops

```
📉 Test coverage dropped from 85% to 78%

Would you like me to:
  1. Analyze which files lost coverage
  2. Generate tests for uncovered code
  3. Run gap analysis

→ [User chooses]
```

---

## Zero-Manual-Configuration Examples

### Example 1: Brand New Project

```bash
$ mkdir my-api
$ cd my-api
$ claude

# Claude detects nxtg-forge installed
# Claude sees empty directory
# Claude offers to initialize project

Claude: "I see nxtg-forge is installed! This looks like a new project.
Would you like me to help you set it up?"

User: "Yes"

Claude: "Great! What are you building?"

User: "A REST API for managing tasks"

Claude: [Auto-configures everything]
       "Perfect! I've set up:
        • FastAPI project structure
        • PostgreSQL database config
        • Test framework (pytest)
        • CI/CD pipeline
        • All nxtg-forge features

        Ready to start coding?"
```

### Example 2: Existing Project

```bash
$ cd existing-project/
$ claude

Claude: "I see nxtg-forge is installed but not initialized.
         I detected a Python/FastAPI project.

         Shall I add nxtg-forge to this project?
         (This will add .nxtg-forge/ directory with configs)"

User: "Yes"

Claude: [Scans codebase, detects patterns, auto-configures]
       "Done! I've configured nxtg-forge for your FastAPI project.

        I noticed:
        • Test coverage is 45% (target: 85%)
        • 12 functions could be refactored
        • No MCP servers configured

        Would you like me to:
        1. Improve test coverage
        2. Run refactoring analysis
        3. Configure MCP servers
        4. All of the above"
```

### Example 3: Ongoing Work

```bash
$ cd my-project/
$ claude

# .nxtg-forge/ already exists
# Claude loads everything automatically

Claude: "Welcome back! NXTG-Forge ready.

        Last session: You were adding user authentication
        Status: 60% complete

        Should I resume where we left off?"

User: "Yes"

Claude: [Loads checkpoint, restores context]
       "Resuming authentication feature...

        Completed:
        ✓ Architecture design
        ✓ Database schema
        ✓ User model

        Next:
        ☐ Implement login endpoint
        ☐ Add JWT token handling
        ☐ Write tests

        Shall I continue with the login endpoint?"
```

---

## Key Principles

1. **Zero Manual Setup**: Everything is automatic
2. **Smart Defaults**: Works great out-of-box
3. **Progressive Disclosure**: Advanced features when needed
4. **Context Awareness**: Claude knows project state always
5. **Proactive Assistance**: Suggestions before user asks
6. **Seamless Integration**: Feels like native Claude feature

---

## Implementation Checklist

For Claude Code to implement this:

### Detection Phase

- [ ] Check if `forge` module importable
- [ ] Check for `.nxtg-forge/` or `.claude/` directory
- [ ] Load config.json if exists
- [ ] Load state.json if exists
- [ ] Import all skill documents

### Setup Phase (if not initialized)

- [ ] Show welcome message
- [ ] Detect project type automatically
- [ ] Ask for user preferences
- [ ] Generate config.json
- [ ] Create directory structure
- [ ] Write all skill files
- [ ] Setup hooks and workflows
- [ ] Initialize state.json
- [ ] Create first checkpoint

### Runtime Phase (always)

- [ ] Load nxtg-forge context at startup
- [ ] Make agents available
- [ ] Register slash commands
- [ ] Monitor for triggers (commits, test failures, etc.)
- [ ] Suggest features proactively
- [ ] Coordinate agents automatically
- [ ] Track analytics continuously
- [ ] Save checkpoints periodically

---

**For Claude Code Implementers**: This file defines the UX contract.
When nxtg-forge is detected, this is the experience users should get.
Everything else in the documentation is implementation detail.
