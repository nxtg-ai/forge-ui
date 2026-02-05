# 🚀 NXTG-Forge Quick Start - Dogfooding Guide

**Welcome, CEO! Let's get you playing with your Chief of Staff system RIGHT NOW.**

---

## 🎯 What You're About to Experience

You have a **complete Meta-Orchestration System** with:
- 6 production-grade UI components
- 8 core infrastructure systems
- Self-bootstrapping capabilities
- Canonical vision management
- 10+ parallel agent orchestration

**This guide gets you from zero to dogfooding in under 10 minutes.**

---

## 🏁 Quick Start (Choose Your Path)

### Path 1: Play with UI Components (Immediate)

**See the beautiful UI in action:**

```bash
# Install dependencies (if not already)
npm install

# Start the development server
npm run dev

# Open browser to http://localhost:5173
```

**What you'll see:**
- VisionCapture wizard (4-step beautiful form)
- ChiefOfStaffDashboard (adaptive to your mode)
- CommandCenter (Cmd+K palette)
- All components with spring animations

### Path 2: Use the Agents (Claude Code)

**Activate the agents in this project:**

```bash
# The agents are already here in .claude/agents/
# Just invoke them from Claude Code

# Try this:
"/[FRG]-enable-forge"

# Or directly invoke an agent:
"@[AFRG]-orchestrator help me plan a new feature"
```

**Available Agents:**
- `[AFRG]-orchestrator` - Meta-coordination
- `[AFRG]-planner` - Strategic planning
- `[AFRG]-builder` - Implementation
- `[AFRG]-detective` - Problem solving
- `[AFRG]-guardian` - Quality & security
- `[AFRG]-release-sentinel` - Documentation

### Path 3: Test the Bootstrap System

**Test self-installation:**

```bash
# Run the bootstrap test
npm run bootstrap:test

# This will:
# - Simulate fresh installation
# - Clone from GitHub (in test mode)
# - Set up directory structure
# - Validate installation
# - Report results
```

---

## 📚 Core Concepts to Understand

### 1. Canonical Vision

**Where:** `.claude/VISION.md`

Your vision drives EVERYTHING. Update it:

```bash
# Edit your vision
vim .claude/VISION.md

# Or use the VisionCapture UI
npm run dev
# Navigate to VisionCapture component
```

**Vision Structure:**
```yaml
---
version: 1.0
engagementMode: ceo  # or vp, engineer, builder, founder
---

# Mission
Build the ultimate Chief of Staff for developers

# Principles
- CEO time is sacred
- Elegant complexity
- Constant alignment
...
```

### 2. Engagement Modes

**The system adapts to how you're thinking:**

| Mode | What You See | When to Use |
|------|-------------|-------------|
| CEO | High-level progress only | Strategic decisions |
| VP | Strategic overview | Progress checks |
| Engineer | Technical deep-dives | Architecture review |
| Builder | Implementation details | Hands-on coding |
| Founder | Full spectrum | Need to see everything |

**Change mode:**
```typescript
// In code
visionManager.updateEngagementMode('founder');

// Or edit .claude/VISION.md
engagementMode: founder
```

### 3. Meta-Orchestration Patterns

**How agents work together:**

**Sequential with Sign-Off:**
```
You: "Build user authentication"
↓
Orchestrator → Planner (creates plan)
↓
Orchestrator → Architect (reviews plan, signs off)
↓
Orchestrator → Builder (implements)
↓
Orchestrator → Guardian (validates, tests)
↓
Orchestrator → You (reports completion)
```

**Parallel Execution:**
```
You: "Analyze the codebase"
↓
Orchestrator launches in parallel:
- Detective (finds issues)
- Guardian (security scan)
- Planner (improvement suggestions)
↓
Orchestrator synthesizes results → Reports to you
```

---

## 🎮 Playground Mode

**Test individual systems:**

### Test 1: Vision System

```typescript
// In Node REPL or create a test file
import { VisionManager } from './src/core/vision';

const vision = new VisionManager('/path/to/.claude');

// Load vision
const currentVision = await vision.loadVision();
console.log(currentVision);

// Update vision
await vision.updateVision({
  currentFocus: "Building the dogfooding experience"
});

// Check alignment
const decision = {
  description: "Add new authentication method",
  rationale: "Users requested OAuth support"
};
const alignment = await vision.checkAlignment(decision);
console.log('Alignment score:', alignment.score);
```

### Test 2: Orchestrator

```typescript
import { MetaOrchestrator } from './src/core/orchestrator';

const orchestrator = new MetaOrchestrator();

// Sequential workflow
const result = await orchestrator.execute({
  id: 'test-task',
  type: 'feature',
  description: 'Add dark mode toggle',
  priority: 'high'
}, 'sequential');

console.log('Workflow result:', result);
```

### Test 3: Bootstrap System

```typescript
import { BootstrapOrchestrator } from './src/core/bootstrap';

const bootstrap = new BootstrapOrchestrator();

// Test bootstrap (dry run)
const result = await bootstrap.bootstrap({
  projectPath: '/tmp/test-forge',
  githubUrl: 'https://github.com/nxtg-ai/forge.git',
  dryRun: true
});

console.log('Bootstrap result:', result);
```

---

## 🛠️ Development Workflow

### 1. Start Development Server

```bash
# Terminal 1: TypeScript compiler watch mode
npm run dev

# Terminal 2: Start UI dev server
npm run ui:dev

# Terminal 3: Run tests in watch mode
npm run test:watch
```

### 2. Make Changes

```bash
# Edit any file
vim src/core/orchestrator.ts

# TypeScript recompiles automatically
# UI hot-reloads automatically
# Tests re-run automatically
```

### 3. Test Changes

```bash
# Run all tests
npm test

# Run specific test
npm test -- orchestrator

# Build production
npm run build
```

---

## 🎯 Dogfooding Scenarios

### Scenario 1: Use Orchestrator to Plan Next Feature

**Goal:** Let the orchestrator help you plan what to build next

```bash
# In Claude Code chat:
"@[AFRG]-orchestrator I want to add a real-time collaboration
feature where multiple developers can work together in the same
session. Help me plan this."

# Orchestrator will:
# 1. Analyze requirements
# 2. Invoke Planner for architecture
# 3. Get Architect sign-off
# 4. Create implementation plan
# 5. Present to you for approval
```

### Scenario 2: Use Guardian to Validate Code Quality

```bash
"@[AFRG]-guardian Review the orchestrator code and ensure it follows
our canonical vision and coding standards"

# Guardian will:
# 1. Load canonical vision
# 2. Analyze code quality
# 3. Run security scans
# 4. Generate test suggestions
# 5. Report findings with alignment scores
```

### Scenario 3: Use Detective to Debug

```bash
"@[AFRG]-detective The bootstrap system seems slow.
Help me find bottlenecks and optimize it."

# Detective will:
# 1. Profile the code
# 2. Identify slow operations
# 3. Suggest optimizations
# 4. Provide implementation plan
```

---

## 📊 Dashboard & Monitoring

### View System Status

**Option A: UI Dashboard**
```bash
npm run dev
# Navigate to ChiefOfStaffDashboard component
# Select your engagement mode
# View real-time stats
```

**Option B: CLI Status**
```bash
# Check system health
npm run status

# View current vision
cat .claude/VISION.md

# View state
cat .claude/STATE.json

# View logs
tail -f logs/forge.log
```

---

## 🔥 YOLO Mode (Aggressive Automation)

**Let the system handle things autonomously:**

### Enable YOLO Mode

```typescript
// Edit .claude/forge.config.json
{
  "automation": {
    "level": "maximum",  // conservative | balanced | aggressive | maximum
    "autoExecuteThreshold": 0.9,
    "enableLearning": true
  }
}
```

**What happens in Maximum YOLO:**
- Detects needs automatically
- Executes high-confidence actions without asking
- Learns from your corrections
- Self-heals errors
- Proactively suggests improvements

**Safety:**
- Never pushes to git without confirmation
- Never deletes data without backup
- Never executes shell commands marked dangerous
- Always logs every action for rollback

---

## 🎓 Learning Path

**Day 1: Explore**
- [ ] Start UI dev server, play with components
- [ ] Read your canonical vision in `.claude/VISION.md`
- [ ] Try invoking one agent manually

**Day 2: Basic Usage**
- [ ] Use orchestrator to plan a feature
- [ ] Let guardian review some code
- [ ] Watch the agents collaborate

**Day 3: Advanced**
- [ ] Enable YOLO mode (conservative first)
- [ ] Create a custom agent
- [ ] Modify the vision and see propagation

**Week 1: Power User**
- [ ] Dogfood the entire development workflow
- [ ] Customize engagement modes
- [ ] Add domain-specific agents

---

## 🆘 Troubleshooting

### "Components don't show up"
```bash
# Check if dev server is running
npm run dev

# Check console for errors
# Open browser DevTools
```

### "Agents not responding"
```bash
# Verify agent files exist
ls -la .claude/agents/

# Check agent frontmatter
head -20 .claude/agents/[AFRG]-orchestrator.md
```

### "Bootstrap fails"
```bash
# Check logs
cat logs/bootstrap.log

# Run with debug
DEBUG=* npm run bootstrap:test

# Verify GitHub access
git ls-remote https://github.com/nxtg-ai/forge.git
```

### "Build errors"
```bash
# Clean and rebuild
npm run clean
npm install
npm run build

# Check TypeScript errors
npx tsc --noEmit
```

---

## 📁 Key Files Reference

**Configuration:**
- `.claude/VISION.md` - Your canonical vision
- `.claude/forge.config.json` - Forge settings
- `.claude/STATE.json` - Current system state

**Core Systems:**
- `src/core/bootstrap.ts` - Self-installation
- `src/core/vision.ts` - Vision management
- `src/core/orchestrator.ts` - Agent coordination
- `src/core/state.ts` - State persistence

**UI Components:**
- `src/components/VisionCapture.tsx` - Vision wizard
- `src/components/ChiefOfStaffDashboard.tsx` - Main dashboard
- `src/components/CommandCenter.tsx` - Cmd+K palette

**Agents:**
- `.claude/agents/[AFRG]-orchestrator.md` - Master coordinator
- `.claude/agents/[AFRG]-planner.md` - Strategic planner
- `.claude/agents/[AFRG]-builder.md` - Implementation
- `.claude/agents/[AFRG]-detective.md` - Problem solver
- `.claude/agents/[AFRG]-guardian.md` - Quality & security
- `.claude/agents/[AFRG]-release-sentinel.md` - Docs & releases

---

## 🎯 Next Steps

1. **Start the UI:** `npm run dev`
2. **Play with VisionCapture** - Define your vision
3. **Try the Dashboard** - See it adapt to modes
4. **Invoke an Agent** - Ask orchestrator for help
5. **Enable YOLO** - Let it automate (conservative first)
6. **Dogfood a Real Feature** - Build something using the system

---

## 💡 Pro Tips

**Tip 1:** Start in CEO mode. Less overwhelming.

**Tip 2:** Your canonical vision is EVERYTHING. Keep it updated.

**Tip 3:** Use Cmd+K command center for fast navigation.

**Tip 4:** Watch agent conversations in Founder mode (it's educational).

**Tip 5:** YOLO mode learns. The more you use it, the smarter it gets.

**Tip 6:** Rollback is built-in. Don't be afraid to experiment.

---

## 🚀 You're Ready!

**The system is live. Your Chief of Staff is waiting.**

Start with: `npm run dev`

Then: Play. Explore. Break things. This is YOUR system now.

---

**Questions? Issues?**
- Check `docs/` for detailed architecture docs
- Read `IMPLEMENTATION_STATUS.md` for what's complete
- File issues on GitHub: https://github.com/nxtg-ai/forge/issues

**Let's build superpowers. Let's go NXTG.** 🔥
