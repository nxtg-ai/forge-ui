# 🐛 Terminal Connection Debug Guide

## ✅ Backend Status
- Backend server: **RUNNING** on port 5051
- WebSocket endpoint: **WORKING** (`ws://localhost:5051/terminal`)
- PTY bridge: **INITIALIZED**

## 🔍 What to Check in Your Browser

### 1. **Open Browser Console** (F12)
Press F12 in your browser and look for errors. You should see one of these:

**Good:**
```
✅ WebSocket connected successfully
```

**Bad (Connection Blocked):**
```
❌ WebSocket error: ...
❌ Mixed Content: The page at 'https://...' was loaded over HTTPS, but attempted to connect to 'ws://localhost:5051/terminal'
```

**Bad (CORS Issue):**
```
❌ WebSocket connection to 'ws://localhost:5051/terminal' failed
❌ Access to WebSocket ... has been blocked by CORS policy
```

### 2. **Check Network Tab**
- Open DevTools → Network tab
- Filter by "WS" (WebSocket)
- Look for connection to `ws://localhost:5051/terminal`
- Status should be "101 Switching Protocols"

### 3. **Try Direct Connection Test**
Open browser console (F12) and paste this:

```javascript
const ws = new WebSocket('ws://localhost:5051/terminal');
ws.onopen = () => console.log('✅ CONNECTED!');
ws.onerror = (e) => console.error('❌ ERROR:', e);
ws.onclose = () => console.log('⚠️ CLOSED');
```

---

## 🛠️ Common Fixes

### **If seeing "Mixed Content" error:**
- You're accessing the UI via `https://` but WebSocket is `ws://`
- Solution: Access UI via `http://localhost:5052` (not https)

### **If seeing CORS error:**
- Backend might not be allowing WebSocket connections
- Already fixed in code - just refresh

### **If WebSocket connects but terminal still frozen:**
- The PTY might not be spawning correctly
- Check backend logs for PTY errors

---

## 🎯 Quick Test Commands

### Test from Command Line:
```bash
# Test WebSocket connection
node -e "const WebSocket = require('ws'); const ws = new WebSocket('ws://localhost:5051/terminal'); ws.on('open', () => { console.log('✅ WORKS!'); ws.close(); }); ws.on('error', (e) => console.log('❌ FAIL:', e.message));"
```

### Test Backend Health:
```bash
curl http://localhost:5051/api/health
```

---

## 📋 What I Need From You

If it's still not working, please tell me:

1. **What URL are you using?** (e.g., `http://localhost:5052` or `https://localhost:5052`)
2. **What do you see in browser console?** (Press F12, copy errors)
3. **What does Network tab show?** (Filter by WS, screenshot welcome)
4. **Does the manual WebSocket test work?** (paste code above in console)

---

## 💡 Most Likely Issue

You're probably accessing the UI at a different port or protocol than expected. The terminal is hardcoded to connect to `ws://localhost:5051/terminal`.

If you're accessing the UI at:
- ✅ `http://localhost:5052` → Should work fine
- ❌ `https://localhost:5052` → Will be blocked (mixed content)
- ❌ `http://localhost:5050` → Wrong port, might have CORS issues
