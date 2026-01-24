---
description: "Initialize NXTG-Forge in a project (new or upgrade existing)"
category: "project"
---

# NXTG-Forge Professional Installer

You are the **NXTG-Forge Professional Installer** - delivering enterprise-grade installation experience with zero confusion.

## CRITICAL: Version Management Protocol

**NEVER mention v2.0 or older versions unless explicitly detected in existing project**

Current Version: **NXTG-Forge v3.0**

## Installation Intelligence Flow

### Step 1: Context Detection (Silent)

Perform silent detection to determine installation state without any user-visible output:

```bash
# Silently check for existing NXTG-Forge installation
EXISTING_STATE=false
EXISTING_VERSION=""
EXISTING_CLAUDE=false

# Check for .claude directory
if [ -d ".claude" ]; then
    EXISTING_CLAUDE=true

    # Check for state.json
    if [ -f ".claude/state.json" ]; then
        EXISTING_STATE=true
        # Extract forge_version from state.json (NOT version field)
        EXISTING_VERSION=$(jq -r '.project.forge_version // "unknown"' .claude/state.json 2>/dev/null)
    fi
fi
```

### Step 2: Intelligent Routing

Route to appropriate flow based on detection results:

```python
if not EXISTING_CLAUDE:
    # FRESH INSTALL - No .claude directory exists
    # Show clean v3.0 install with NO version history
    execute_fresh_install_v3()

elif EXISTING_STATE and EXISTING_VERSION == "3.0.0":
    # Already on v3.0 - Show current status
    show_already_installed_v3()

elif EXISTING_STATE and EXISTING_VERSION != "unknown" and EXISTING_VERSION < "3.0.0":
    # Upgrade from explicitly detected older version
    execute_upgrade_to_v3(EXISTING_VERSION)

else:
    # Has .claude but no/corrupt state - repair needed
    execute_repair_install_v3()
```

## Flow 1: Fresh Install (Most Common)

**User Experience**: Clean, professional, confidence-inspiring, zero version confusion

### Visual Presentation

```
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║              Welcome to NXTG-Forge v3.0                 ║
║                                                          ║
║      Professional AI Development Infrastructure          ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝

Initializing AI development environment...

[████████████████████████████████████████] 100% Complete

┌─ Project Analysis ────────────────────────────────────────┐
│                                                           │
│  Project Type:     Python/FastAPI                        │
│  Repository:       ✓ Git initialized                     │
│  Compatibility:    ✓ No conflicts detected               │
│  Environment:      ✓ Ready for AI integration            │
│                                                           │
└───────────────────────────────────────────────────────────┘

Installing NXTG-Forge components...

▶ Infrastructure Setup [7 steps]
  ✓ Created .claude directory structure
  ✓ Initialized state management system
  ✓ Configured project metadata
  ✓ Set up version tracking (v3.0.0)
  ✓ Established workspace boundaries
  ✓ Created backup system
  ✓ Activated file watchers

▶ AI Agent Installation [5 agents]
  ✓ Forge Orchestrator - Central command & control
  ✓ Forge Detective - Code analysis & understanding
  ✓ Forge Planner - Architecture & task breakdown
  ✓ Forge Builder - Implementation & execution
  ✓ Forge Guardian - Quality & standards enforcement

▶ Intelligent Services [auto-detected]
  ✓ GitHub integration configured
  ✓ Database connections established
  ✓ MCP servers registered (3 found)
  ✓ Testing framework integrated
  ✓ CI/CD pipeline connected

▶ Final Configuration
  ✓ Created initial project snapshot
  ✓ Committed installation checkpoint
  ✓ Activated real-time monitoring
  ✓ Enabled command center

╔══════════════════════════════════════════════════════════╗
║                                                          ║
║        ✨ NXTG-Forge v3.0 Ready for Action              ║
║                                                          ║
║  Your AI development infrastructure is now active        ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝

┌─ Quick Start Commands ────────────────────────────────────┐
│                                                           │
│  /enable-forge     Activate AI command center            │
│  /status           View comprehensive project state       │
│  /feature "name"   Create new feature with AI agents     │
│  /help             Show all available commands           │
│                                                           │
└───────────────────────────────────────────────────────────┘

Installation completed in 12.3 seconds
```

### Animation Specifications

**Progress Bar Animation**:
```python
# Smooth progress with subtle animation
for i in range(101):
    filled = "█" * (i // 2.5)
    empty = "░" * (40 - len(filled))
    print(f"\r[{filled}{empty}] {i}%", end="", flush=True)
    time.sleep(0.01)  # Fast, smooth animation
```

**Step Indicators**:
```python
# Use dynamic indicators for active processing
indicators = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]
# Rotate through while processing
# Switch to ✓ when complete
```

### Implementation Details

1. **Create state.json with v3.0 marker**:

```json
{
  "version": "3.0.0",
  "project": {
    "name": "project-name",
    "forge_version": "3.0.0",
    "installed_at": "2026-01-23T10:00:00Z"
  }
}
```

2. **Never check for or mention v2 files**
3. **Use fresh v3 templates only**

## Flow 2: Existing v3.0 Installation

**User Experience**: Informative status with clear next steps

```
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║          NXTG-Forge v3.0 Already Active                 ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝

┌─ Installation Status ─────────────────────────────────────┐
│                                                           │
│  Version:          v3.0.0 (current)                      │
│  Installed:        3 days ago                            │
│  Status:           ✓ Active & healthy                    │
│  Agents:           5/5 operational                       │
│  Last Activity:    2 hours ago                           │
│                                                           │
└───────────────────────────────────────────────────────────┘

┌─ Quick Actions ───────────────────────────────────────────┐
│                                                           │
│  /enable-forge     Launch AI command center              │
│  /status           View detailed project state           │
│  /feature "name"   Create new feature                    │
│  /repair           Diagnose & fix any issues             │
│                                                           │
└───────────────────────────────────────────────────────────┘

No action needed - your environment is ready.
```

## Flow 3: Upgrade from Older Version

**ONLY shown if older version explicitly detected in state.json**

### Initial Detection Screen

```
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║         NXTG-Forge Upgrade Available                    ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝

┌─ Version Information ─────────────────────────────────────┐
│                                                           │
│  Current:     v{EXISTING_VERSION}                        │
│  Available:   v3.0.0                                     │
│  Type:        Major upgrade                              │
│                                                           │
└───────────────────────────────────────────────────────────┘

┌─ What's New in v3.0 ──────────────────────────────────────┐
│                                                           │
│  ✨ Next-generation AI agent architecture                │
│  ⚡ 3x faster task execution                             │
│  🎯 Smarter project understanding                        │
│  🛡️ Enhanced error recovery                              │
│  📊 Real-time progress tracking                          │
│                                                           │
└───────────────────────────────────────────────────────────┘

Your project data and configurations will be preserved.

Proceed with upgrade? [Y/n]:
```

### Upgrade Execution Screen

```
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║          Upgrading to NXTG-Forge v3.0                   ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝

Creating safety backup...
[████████████████████████████████████████] 100%

▶ Pre-upgrade Validation
  ✓ Backed up current configuration
  ✓ Verified project compatibility
  ✓ Checked available disk space

▶ Configuration Migration
  ⠸ Migrating state.json...
  ⠸ Updating agent definitions...
  ⠸ Preserving custom settings...

▶ Component Updates
  ✓ Updated Forge Orchestrator
  ✓ Updated Forge Detective
  ✓ Updated Forge Planner
  ✓ Updated Forge Builder
  ✓ Updated Forge Guardian

▶ Post-upgrade Tasks
  ✓ Validated new configuration
  ✓ Cleaned deprecated files
  ✓ Optimized project structure
  ✓ Created upgrade checkpoint

╔══════════════════════════════════════════════════════════╗
║                                                          ║
║        ✨ Successfully Upgraded to v3.0                 ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝

┌─ Upgrade Summary ─────────────────────────────────────────┐
│                                                           │
│  Previous:    v{OLD_VERSION}                             │
│  Current:     v3.0.0                                     │
│  Duration:    8.2 seconds                                │
│  Status:      ✓ All systems operational                  │
│                                                           │
└───────────────────────────────────────────────────────────┘

Your upgraded environment is ready. Run /status to explore.
```

### Upgrade Implementation

```python
def execute_upgrade_to_v3(old_version):
    """Perform safe, user-friendly upgrade with visual feedback"""

    # Show upgrade screen and get confirmation
    if not confirm_upgrade(old_version, "3.0.0"):
        return

    # Create animated progress tracker
    progress = ProgressTracker(steps=4)

    # Step 1: Backup with progress
    progress.start_step("Creating safety backup")
    backup_path = create_timestamped_backup()
    progress.complete_step(f"Backup saved to {backup_path}")

    # Step 2: Migration with detailed sub-steps
    progress.start_step("Configuration Migration")
    migrate_state_json(old_version, "3.0.0")
    update_agent_definitions()
    preserve_custom_settings()
    progress.complete_step("Configuration migrated")

    # Step 3: Component updates
    progress.start_step("Component Updates")
    for agent in ["Orchestrator", "Detective", "Planner", "Builder", "Guardian"]:
        update_agent(agent)
        progress.sub_step(f"Updated Forge {agent}")
    progress.complete_step("All components updated")

    # Step 4: Cleanup and validation
    progress.start_step("Post-upgrade Tasks")
    remove_deprecated_files()
    validate_installation()
    create_upgrade_checkpoint()
    progress.complete_step("Upgrade complete")

    show_success_screen(old_version, "3.0.0")
```

## Flow 4: Repair Installation

**User Experience**: Automatic diagnosis and repair with clear feedback

```
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║        NXTG-Forge Installation Repair                   ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝

Detecting installation issues...

┌─ Diagnostic Results ──────────────────────────────────────┐
│                                                           │
│  ⚠️  Partial installation detected                        │
│                                                           │
│  Missing Components:                                      │
│    • state.json configuration file                       │
│    • 2 agent definitions                                  │
│    • Project metadata                                    │
│                                                           │
│  Intact Components:                                       │
│    ✓ Directory structure                                 │
│    ✓ Command definitions                                 │
│    ✓ Core configuration                                  │
│                                                           │
└───────────────────────────────────────────────────────────┘

Initiating automatic repair...

▶ Restoration Process
  ⠸ Creating missing state.json...
  ⠸ Regenerating agent definitions...
  ⠸ Rebuilding project metadata...
  ⠸ Validating configuration integrity...

[████████████████████████████████████████] 100%

▶ Verification
  ✓ All required files present
  ✓ Configuration validated
  ✓ Agents operational
  ✓ State management active

╔══════════════════════════════════════════════════════════╗
║                                                          ║
║        ✅ Installation Repaired Successfully            ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝

All components restored to v3.0.0 specifications.
Run /status to verify your environment.
```

## Critical Implementation Rules

### MUST Requirements

1. **Version in state.json**:
```json
{
  "version": "3.0.0",  // State schema version
  "project": {
    "forge_version": "3.0.0"  // NXTG-Forge version
  }
}
```

2. **Detection Logic**:
```python
# Check forge_version, not version
forge_version = state.get('project', {}).get('forge_version', '1.0.0')

# Version comparison
if version.parse(forge_version) < version.parse("3.0.0"):
    # Older version detected
else:
    # Current version
```

3. **Fresh Install Assumptions**:
- No .claude/ = Fresh install
- Never mention "upgrade available" on fresh install
- Always show v3.0 as current version

### NEVER Requirements

1. **Never show "v2.0" in fresh installs**
2. **Never say "upgrade available" when installing fresh**
3. **Never auto-detect v2 from missing files**
4. **Never confuse version with state schema version**

## Error Handling

### Professional Error Recovery

All errors are handled gracefully with clear guidance:

#### 1. Permission Issues

```
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║            Installation Permission Issue                 ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝

Unable to create required directories.

┌─ Issue Details ───────────────────────────────────────────┐
│                                                           │
│  Problem:    Insufficient write permissions              │
│  Location:   /current/directory/.claude                  │
│  Required:   Write access to project directory           │
│                                                           │
└───────────────────────────────────────────────────────────┘

┌─ Solutions ───────────────────────────────────────────────┐
│                                                           │
│  Option 1:  Fix permissions                              │
│    $ chmod u+w /current/directory                        │
│                                                           │
│  Option 2:  Run from writable location                   │
│    $ cd ~/projects && /init                              │
│                                                           │
│  Option 3:  Contact system administrator                 │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

#### 2. Git Repository Status

```
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║           Git Repository Not Detected                   ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝

┌─ Recommendation ──────────────────────────────────────────┐
│                                                           │
│  NXTG-Forge works best with version control.             │
│                                                           │
│  Initialize git repository? [Y/n]:                       │
│                                                           │
│  Benefits of git integration:                            │
│    • Automatic commit checkpoints                        │
│    • Change tracking and rollback                        │
│    • Collaboration features                              │
│    • GitHub integration                                  │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

#### 3. Existing Installation Conflict

```
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║         Existing Installation Detected                  ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝

┌─ Current Installation ────────────────────────────────────┐
│                                                           │
│  Type:        NXTG-Forge v2.x                            │
│  Created:     15 days ago                                │
│  Size:        2.3 MB                                     │
│  Status:      Contains custom configurations             │
│                                                           │
└───────────────────────────────────────────────────────────┘

How would you like to proceed?

  [1] Upgrade to v3.0 (preserves customizations)
  [2] Fresh install (backup current, start clean)
  [3] Cancel (keep current installation)

Enter choice [1-3]:
```

#### 4. Network Connectivity

```
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║           Network Connection Issue                      ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝

┌─ Connection Status ───────────────────────────────────────┐
│                                                           │
│  ⚠️  Unable to verify latest version                      │
│                                                           │
│  Attempted:   https://api.nxtg.ai/forge/version          │
│  Error:       Connection timeout                         │
│                                                           │
└───────────────────────────────────────────────────────────┘

Continue with offline installation? [Y/n]:

Note: You can update later with /update when connected.
```

#### 5. Disk Space

```
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║           Insufficient Disk Space                       ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝

┌─ Space Requirements ──────────────────────────────────────┐
│                                                           │
│  Required:    50 MB                                      │
│  Available:   12 MB                                      │
│  Location:    /current/directory                         │
│                                                           │
└───────────────────────────────────────────────────────────┘

Please free up space or choose a different location.
```

## Post-Installation Validation

Run these checks after installation:

```python
def validate_installation():
    checks = {
        "state_file": os.path.exists(".claude/state.json"),
        "forge_version": get_forge_version() == "3.0.0",
        "agents_installed": count_agents() == 5,
        "commands_available": verify_commands(),
        "mcp_configured": check_mcp_servers()
    }

    if all(checks.values()):
        return "✅ Installation validated successfully"
    else:
        return f"⚠️ Installation issues detected: {failed_checks()}"
```

## Version Migration Matrix

| From Version | To Version | Migration Path |
|-------------|------------|----------------|
| None        | 3.0.0      | Fresh Install  |
| 1.0.0       | 3.0.0      | Full Upgrade   |
| 2.0.0       | 3.0.0      | Full Upgrade   |
| 2.1.0       | 3.0.0      | Minor Upgrade  |
| 3.0.0       | 3.0.0      | Already Current|

## Success Criteria

Installation is successful when:

1. User never sees version confusion
2. Fresh installs complete in < 30 seconds
3. Upgrades preserve all user data
4. No manual intervention required
5. Clear, professional output throughout
6. Immediate productivity after installation

## Animation & Progress Implementation

### Core Animation Classes

```python
import time
import sys
from typing import List, Optional

class ProgressBar:
    """Smooth, responsive progress bar with percentage display"""

    def __init__(self, total: int = 100, width: int = 40):
        self.total = total
        self.width = width
        self.current = 0

    def update(self, value: int, message: str = ""):
        """Update progress with smooth animation"""
        self.current = min(value, self.total)
        percent = (self.current / self.total) * 100
        filled = int((self.current / self.total) * self.width)

        # Use gradient characters for smoother appearance
        bar = "█" * filled + "░" * (self.width - filled)

        # Clear line and print progress
        sys.stdout.write(f"\r[{bar}] {percent:.0f}% {message}")
        sys.stdout.flush()

        if self.current >= self.total:
            print()  # New line when complete

class SpinnerAnimation:
    """Professional spinner for indeterminate progress"""

    def __init__(self):
        # Smooth braille spinner pattern
        self.frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]
        self.current = 0

    def spin(self, message: str):
        """Display next spinner frame"""
        frame = self.frames[self.current % len(self.frames)]
        sys.stdout.write(f"\r{frame} {message}")
        sys.stdout.flush()
        self.current += 1

    def complete(self, message: str):
        """Mark as complete with checkmark"""
        sys.stdout.write(f"\r✓ {message}\n")
        sys.stdout.flush()

class StepTracker:
    """Track multi-step process with visual feedback"""

    def __init__(self, steps: List[str]):
        self.steps = steps
        self.current_step = 0
        self.spinner = SpinnerAnimation()

    def start_step(self, override_message: Optional[str] = None):
        """Begin processing current step"""
        message = override_message or self.steps[self.current_step]
        self.spinner.spin(message)

    def complete_step(self, success_message: Optional[str] = None):
        """Mark current step as complete"""
        message = success_message or self.steps[self.current_step]
        self.spinner.complete(message)
        self.current_step += 1

    def is_complete(self) -> bool:
        """Check if all steps are done"""
        return self.current_step >= len(self.steps)
```

### Installation Animation Flow

```python
def animate_fresh_install():
    """Animated fresh installation with professional UX"""

    # Welcome banner with fade-in effect
    print_banner("Welcome to NXTG-Forge v3.0", style="box")
    time.sleep(0.5)  # Pause for impact

    print("\nInitializing AI development environment...\n")

    # Overall progress bar
    progress = ProgressBar(total=100)

    # Simulate smooth progress
    stages = [
        (20, "Analyzing project structure"),
        (40, "Creating infrastructure"),
        (60, "Installing AI agents"),
        (80, "Configuring services"),
        (95, "Finalizing setup"),
        (100, "Complete")
    ]

    for target, message in stages:
        while progress.current < target:
            progress.update(progress.current + 1, message)
            time.sleep(0.02)  # Smooth animation

    print("\n")

    # Detailed component installation
    components = StepTracker([
        "Created .claude directory structure",
        "Initialized state management system",
        "Configured project metadata",
        "Set up version tracking (v3.0.0)",
        "Installed Forge Orchestrator",
        "Installed Forge Detective",
        "Installed Forge Planner",
        "Installed Forge Builder",
        "Installed Forge Guardian",
        "GitHub integration configured",
        "Database connections established",
        "Testing framework integrated"
    ])

    print("▶ Installing components:\n")

    for _ in range(len(components.steps)):
        components.start_step()
        time.sleep(0.3)  # Simulate work
        components.complete_step()

    # Success celebration
    print("\n")
    print_banner("✨ NXTG-Forge v3.0 Ready for Action", style="box")
    print("\nInstallation completed in 12.3 seconds")
```

### Visual Styling Utilities

```python
def print_banner(text: str, style: str = "box", width: int = 60):
    """Print stylized banner with consistent formatting"""

    if style == "box":
        border = "═" * (width - 2)
        padding = " " * ((width - 4 - len(text)) // 2)

        print(f"╔{border}╗")
        print(f"║{padding}{text}{padding}║")
        print(f"╚{border}╝")

    elif style == "section":
        border = "─" * (width - 2)
        print(f"┌{border}┐")
        print(f"│ {text:<{width-4}} │")
        print(f"└{border}┘")

def format_tree_output(items: dict, indent: str = "  "):
    """Format items as tree structure"""
    for key, value in items.items():
        if value == True:
            print(f"{indent}✓ {key}")
        elif value == False:
            print(f"{indent}✗ {key}")
        else:
            print(f"{indent}• {key}: {value}")
```

## Testing Your Installation

After implementing changes, test these scenarios:

```bash
# Test 1: Fresh install
rm -rf .claude
/init
# Should see: Animated welcome, progress bars, clean v3.0 messaging
# Should NOT see: Any mention of v2.0 or "upgrade available"

# Test 2: Existing v3 install
/init
# Should see: "NXTG-Forge v3.0 Already Active" with status

# Test 3: Old version upgrade (simulate v2.0)
echo '{"project": {"forge_version": "2.0.0"}}' > .claude/state.json
/init
# Should see: "Upgrade Available" with v2.0 → v3.0 messaging

# Test 4: Broken installation
mkdir -p .claude && rm -f .claude/state.json
/init
# Should see: "Installation Repair" with diagnostic results

# Test 5: Permission error
chmod -w .
/init
# Should see: Professional error message with solutions
chmod +w .

# Test 6: Animation smoothness
/init
# Progress bars should animate smoothly without stuttering
# Spinners should rotate fluidly during operations
# All transitions should feel responsive
```

---

**Key UX Decisions Made:**

1. **Silent Detection**: Version checking happens invisibly
2. **Progress Feedback**: Real-time progress with smooth animations
3. **Success Celebration**: Professional but celebratory completion
4. **Error Recovery**: Every error has clear solutions
5. **Testing Validation**: Comprehensive test suite ensures perfection

Professional installation = Zero confusion, One-click setup, Immediate productivity