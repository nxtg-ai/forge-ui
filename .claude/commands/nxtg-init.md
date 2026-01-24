---
name: nxtg-init
description: Initialize NXTG-Forge in your project (pure Claude Code, zero bash scripts)
category: core
---

# NXTG-Forge Initialization Command

**This command runs entirely within Claude Code - no external scripts required.**

## When I Execute This Command

I will initialize NXTG-Forge v3.0 with beautiful visual progress, zero manual intervention, and pure empowerment.

## Step-by-Step Implementation

### 1. Welcome Banner
Display beautiful ASCII art banner with NXTG-Forge branding and "From Exhaustion to Empowerment" tagline.

### 2. Project Analysis
- Detect project type (Python/TypeScript/Fullstack)
- Check for existing .claude/ directory
- Verify git repository
- Count existing files

### 3. Directory Creation
Create complete .claude/ structure:
- agents/ commands/ hooks/ skills/ templates/ forge/
- Use Write tool for each directory and file

### 4. Agent Installation
Copy 5 agents from templates/agents/ to .claude/agents/ with progress bars

### 5. Command Registration  
Copy 17+ commands from templates/commands/ to .claude/commands/ with visual feedback

### 6. Hook Configuration
Copy 13 hooks from templates/hooks/ to .claude/hooks/ and make executable

### 7. State Initialization
Create state.json with v3.0 schema, generated UUID, timestamp

### 8. Documentation Structure
Create docs/ with architecture/, design/, testing/, workflow/, sessions/, features/, guides/, api/

### 9. .gitignore Update
Append Forge entries if not present

### 10. MCP Auto-Detection
Scan for GitHub/PostgreSQL/AWS/Stripe and suggest MCPs

### 11. Success Summary
Display beautiful completion message with stats, next steps, celebration

### 12. Immediate Actions
Offer quick start options: /status, /feature, /help

## Visual Output Example

```
╔══════════════════════════════════════════════════════════╗
║              NXTG-FORGE v3.0 INSTALLER                    ║
║           From Exhaustion to Empowerment                  ║
╚══════════════════════════════════════════════════════════╝

📋 Analyzing your project...
   └─ Detected: Python/FastAPI project
   └─ Found: 42 existing files
   └─ Status: Ready for enhancement

🏗️ Creating infrastructure...
   ├─ .claude/ structure              [████████████] ✅
   ├─ State management                [████████████] ✅
   └─ Documentation                   [████████████] ✅

🤖 Installing agents (5)...           [████████████] ✅
⚡ Registering commands (17)...       [████████████] ✅
🎯 Configuring hooks (13)...          [████████████] ✅

╔══════════════════════════════════════════════════════════╗
║                ✅ INITIALIZATION COMPLETE                 ║
║  Time: 8 seconds | Files: 156 | Commands: 17             ║
╚══════════════════════════════════════════════════════════╝

🎉 Your project is FORGE-ENABLED!

Next: /status to see your project state
```

## Error Handling

- If .claude/ exists → Offer /upgrade-to-native
- If not git repo → Warn, offer to continue anyway
- If templates missing → Show git clone instructions

## Critical Requirements

✅ NO bash script execution (except chmod for hooks)
✅ Beautiful ASCII art and progress bars
✅ <30 seconds total execution
✅ Celebration on success
✅ Clear next steps always provided

**This command IS the v3.0 experience. Make it magical.**
