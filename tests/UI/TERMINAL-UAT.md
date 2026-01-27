# Terminal Integration UAT Guide

**Date:** 2026-01-26
**Feature:** Claude Code Terminal Integration
**Status:** ✅ Ready for Testing

---

## 🎯 What to Test

You're testing the **complete Claude Code terminal integration** - a GUI wrapper around Claude CLI with:
- Live terminal with xterm.js
- PTY bridge for real terminal I/O
- Diff visualization (side-by-side code reviews)
- Context window (showing what Claude is analyzing)
- Cost tracking (live tokens/$ display)

---

## 🚀 Quick Start

### 1. **Access the UI**
Open your browser and navigate to:
```
http://localhost:5052
```

### 2. **Navigate to Terminal View**
Click the **💻 Terminal** button in the top navigation bar

### 3. **Verify Terminal Loading**
You should see three panels:
- **Left:** Context Window HUD (file analysis, token usage)
- **Center:** Terminal (black background with prompt)
- **Right:** Diff Visualization (empty until diffs appear)

---

## ✅ Test Checklist

### **Terminal Basic Functionality**
- [ ] Terminal renders with proper styling
- [ ] Can see shell prompt (e.g., `user@host:~$`)
- [ ] Can type commands in the terminal
- [ ] Commands execute and show output
- [ ] Terminal scrolls properly
- [ ] Terminal supports ANSI colors
- [ ] Can use arrow keys for history
- [ ] Can use Tab for autocomplete

### **WebSocket Connection**
- [ ] Connection status shows "Connected" in header
- [ ] Terminal receives live output
- [ ] No connection errors in browser console
- [ ] Reconnects automatically if disconnected

### **Context Window HUD (Left Panel)**
- [ ] Token usage bar displays
- [ ] Token percentage updates
- [ ] File list shows files being analyzed
- [ ] Current thought displays (when available)
- [ ] Heat map colors work (intensity based on tokens)
- [ ] Panel can be toggled ON/OFF

### **Diff Visualization (Right Panel)**
- [ ] Panel renders correctly
- [ ] Shows "No diffs yet" message initially
- [ ] Panel can be toggled ON/OFF
- [ ] Side-by-side layout works
- [ ] Apply/Reject buttons visible

### **Navigation & UI**
- [ ] Can navigate between Dashboard, Vision, Terminal, etc.
- [ ] Terminal view persists state when navigating away and back
- [ ] Header shows connection status
- [ ] Toggle buttons work (Context ON/OFF, Diffs ON/OFF)

### **Cost Tracking**
- [ ] Cost ticker appears when commands execute
- [ ] Token count updates in real-time
- [ ] Dollar amount calculates correctly
- [ ] Cost display is visible and readable

---

## 🧪 Test Scenarios

### **Scenario 1: Basic Terminal Usage**
```bash
# In the terminal, try these commands:
echo "Hello NXTG-Forge!"
ls -la
pwd
cd ..
pwd
```

**Expected Result:**
- All commands execute
- Output appears in terminal
- Shell prompt updates with directory changes

---

### **Scenario 2: Test Context Window**
```bash
# Commands that might trigger context updates:
cat README.md
grep -r "function" src/
find . -name "*.ts"
```

**Expected Result:**
- Context window shows files being read
- Token usage increases
- File list updates with analyzed files

---

### **Scenario 3: Long-Running Command**
```bash
# Try a command that takes time:
npm run build
# or
find / -name "*.log" 2>/dev/null | head -20
```

**Expected Result:**
- Terminal shows output as it streams
- Can see real-time progress
- No freezing or blocking

---

### **Scenario 4: Toggle Panels**
1. Click "Context OFF" button
2. Verify left panel disappears
3. Click "Context ON" button
4. Verify left panel reappears
5. Repeat for "Diffs" toggle

**Expected Result:**
- Panels toggle smoothly
- Terminal remains responsive
- Layout adjusts properly

---

### **Scenario 5: Navigation Test**
1. Go to Terminal view
2. Run a command (e.g., `ls`)
3. Navigate to Dashboard
4. Navigate back to Terminal
5. Check if terminal state persists

**Expected Result:**
- Terminal reconnects if needed
- Previous output still visible (if implemented)
- No errors in console

---

## 🐛 Known Issues / Limitations

### **Expected Behavior:**
- Terminal spawns a **bash shell**, not Claude CLI directly
- To test Claude Code integration, you'd need to run `claude` command manually
- Diff visualization only populates when Claude outputs diffs
- Context window only populates when intercepting Claude CLI output

### **Not Yet Implemented:**
- Dangerous command gatekeeper (modal alerts for `rm -rf`, `git push --force`, etc.)
- Actual Claude CLI auto-spawning (currently spawns bash)
- Diff parsing from Claude output (intercept logic exists but needs Claude CLI running)

---

## 📊 Test Data / Test IDs

Use these `data-testid` attributes for automated testing:

```typescript
// Terminal View
"terminal-view-container"

// Terminal Component
"claude-terminal-container"
"claude-terminal"

// Context Window
"context-window-hud"
"context-token-bar"
"context-file-list"

// Diff Visualization
"diff-visualization-panel"
"diff-file-list"
"diff-content"
```

---

## 🔍 How to Debug Issues

### **Check Backend Logs:**
```bash
# In the terminal where you ran npm run dev
# Look for:
[PTY Bridge] New terminal connection
[PTY Bridge] WebSocket server initialized
```

### **Check Browser Console:**
```javascript
// Open DevTools (F12)
// Look for:
WebSocket connected successfully
PTY Bridge is working
```

### **Check WebSocket Connection:**
```bash
# In a separate terminal, test the WebSocket:
node test-pty-bridge.mjs
# Should show: ✅ PTY Bridge test PASSED!
```

### **Check Network Tab:**
1. Open DevTools → Network tab
2. Filter by "WS" (WebSocket)
3. Look for connection to `ws://localhost:5051/terminal`
4. Should show "101 Switching Protocols" status

---

## 🎯 Success Criteria

The terminal integration is considered **PASSING UAT** if:

✅ Terminal renders and connects to backend
✅ Can execute bash commands and see output
✅ WebSocket stays connected during usage
✅ Context window displays correctly
✅ Diff panel displays correctly
✅ Navigation works without breaking terminal
✅ No console errors during normal usage
✅ Toggle buttons work for panels

---

## 📝 Bug Reporting Template

If you find issues, report them like this:

```markdown
### Bug: [Short description]

**Steps to Reproduce:**
1. Go to Terminal view
2. Run command: `xyz`
3. Observe behavior

**Expected:** [What should happen]
**Actual:** [What actually happened]
**Browser:** Chrome/Firefox/Safari
**Console Errors:** [Paste any errors]
**Screenshot:** [Attach if helpful]
```

---

## 🚀 Next Steps After UAT

Once UAT passes, we can:
1. Enable dangerous command gatekeeper
2. Auto-spawn Claude CLI instead of bash
3. Implement diff parsing from Claude output
4. Add keyboard shortcuts (Ctrl+L to clear, etc.)
5. Add session persistence
6. Add terminal themes

---

**Happy Testing! Let's make sure this terminal is rock solid! 💪🔥**
