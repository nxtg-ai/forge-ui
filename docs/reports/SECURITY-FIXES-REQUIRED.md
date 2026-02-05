# Security Fixes Required Before Release

**Status:** BLOCKING PUBLIC RELEASE
**Priority:** CRITICAL
**Timeline:** Must complete before any MIT open-source announcement

---

## Quick Summary

| # | Issue | Severity | File | Lines | Effort | Status |
|----|-------|----------|------|-------|--------|--------|
| 1 | PTY Bridge No Auth | CRITICAL | pty-bridge.ts | 131-183 | 4h | ❌ TODO |
| 2 | Weak Session IDs | HIGH | pty-bridge.ts | 211 | 0.5h | ❌ TODO |
| 3 | No Command Filtering | CRITICAL | pty-bridge.ts | 70-78 | 2h | ❌ TODO |
| 4 | Origin Not Verified | HIGH | pty-bridge.ts | 44-52 | 1h | ❌ TODO |
| 5 | npm HIGH Vuln | HIGH | package.json | - | 0.5h | ❌ TODO |
| 6 | WebSocket No Auth | MEDIUM | api-server.ts | 119-150 | 2h | ❌ TODO |
| 7 | CORS Allow-All | MEDIUM | api-server.ts | 91-96 | 1h | ❌ TODO |
| 8 | Feedback No Validation | MEDIUM | api-server.ts | 2003 | 1h | ❌ TODO |
| 9 | No Rate Limiting | MEDIUM | api-server.ts | - | 2h | ❌ TODO |

**Total Effort:** ~14-15 hours
**Can Release After:** Items 1-8 complete

---

## Issue #1: PTY Bridge Authentication (CRITICAL)

**File:** `/home/axw/projects/NXTG-Forge/v3/src/server/pty-bridge.ts`
**Current Lines:** 131-183

### Current Code (VULNERABLE)

```typescript
wss.on("connection", async (ws: WebSocket, request: http.IncomingMessage) => {
  console.log("[PTY Bridge] New terminal connection");

  try {
    const url = new URL(request.url!, `http://${request.headers.host}`);
    const runspaceId = url.searchParams.get("runspace");
    const requestedSessionId = url.searchParams.get("sessionId");
    // NO AUTHENTICATION CHECK - CRITICAL VULNERABILITY
```

### Required Fix

```typescript
wss.on("connection", async (ws: WebSocket, request: http.IncomingMessage) => {
  console.log("[PTY Bridge] New terminal connection");

  try {
    const url = new URL(request.url!, `http://${request.headers.host}`);

    // ========== NEW: AUTHENTICATION CHECK ==========
    const authToken = url.searchParams.get("token");

    if (!authToken) {
      console.log("[PTY Bridge] Connection rejected: no token");
      ws.close(4001, "Unauthorized: no token");
      return;
    }

    // Validate token (implement based on your auth system)
    if (!validateAuthToken(authToken)) {
      console.log("[PTY Bridge] Connection rejected: invalid token");
      ws.close(4001, "Unauthorized: invalid token");
      return;
    }
    // ================================================

    const runspaceId = url.searchParams.get("runspace");
    const requestedSessionId = url.searchParams.get("sessionId");

    // ... rest of code
```

### Implementation Details

You'll need to implement `validateAuthToken()`:

```typescript
// Add this function to pty-bridge.ts
function validateAuthToken(token: string): boolean {
  // For now: simple token validation
  // In future: implement JWT or session-based auth

  // Option 1: Environment variable token (development)
  if (process.env.PTY_AUTH_TOKEN) {
    return token === process.env.PTY_AUTH_TOKEN;
  }

  // Option 2: Check against active sessions
  // Option 3: Validate JWT signature

  // For now, require token to be present
  return token && token.length > 8;
}
```

### Testing

```bash
# Should fail without token
ws://localhost:5051/terminal?runspace=...

# Should succeed with token
ws://localhost:5051/terminal?runspace=...&token=abc123def456
```

---

## Issue #2: Weak Session IDs (HIGH)

**File:** `/home/axw/projects/NXTG-Forge/v3/src/server/pty-bridge.ts`
**Current Line:** 211

### Current Code (WEAK)

```typescript
const sessionId = requestedSessionId || Math.random().toString(36).substring(7);
// Generates: "a3b4c5d" (7 chars, only 36^7 = 78 billion combinations)
```

### Required Fix

```typescript
import { randomBytes } from "crypto";

const sessionId = requestedSessionId || randomBytes(32).toString("hex");
// Generates: "a3b4c5d6e7f8g9h0..." (64 chars, 256-bit entropy, 2^256 combinations)
```

### Full Context

```typescript
interface TerminalSession {
  runspaceId: string;
  sessionId: string; // Will be 64 chars instead of 7
  ws: WebSocket | null;
  pty: { /* ... */ };
  commandBuffer: string;
  cleanupTimer: ReturnType<typeof setTimeout> | null;
  scrollbackBuffer: string[];
  scrollbackSize: number;
}

const sessions = new Map<string, TerminalSession>();

// In connection handler:
const sessionId = requestedSessionId || randomBytes(32).toString("hex");

const session: TerminalSession = {
  runspaceId: runspace?.id || "default",
  sessionId, // Now cryptographically secure
  ws,
  pty: ptySession,
  commandBuffer: "",
  cleanupTimer: null,
  scrollbackBuffer: [],
  scrollbackSize: 0,
};
sessions.set(sessionId, session);
```

---

## Issue #3: No Command Filtering (CRITICAL)

**File:** `/home/axw/projects/NXTG-Forge/v3/src/server/pty-bridge.ts`
**Current Lines:** 70-78, 365-375

### Current Code (DANGEROUS)

```typescript
ws.on("message", (message: Buffer) => {
  try {
    const data = JSON.parse(message.toString());
    switch (data.type) {
      case "input":
        session.pty.pty.write(data.data);
        session.commandBuffer += data.data;
        break;
      case "execute":
        executeCommand(session.pty, session, data.command); // NO FILTERING
```

### Required Fix - Add Validation

```typescript
// Add this to top of pty-bridge.ts
const DANGEROUS_COMMAND_PATTERNS = [
  // Filesystem destruction
  /\brm\s+-rf\s+\//,
  /\bdd\s+if=.*of=\/dev\/(sda|hda|nvme)/,

  // Process bombs
  /:\(\)\{:\|:\&\};:/,  // Bash fork bomb
  /while.*true.*do.*&/,

  // Disk/memory exhaustion
  /\bfill_disk\b/,
  /\bfork\b\s*\(/,

  // Network attacks
  /\bcurl.*\|\s*bash/,
  /\bwget.*\|\s*sh/,

  // Kernel/system attacks
  /\/etc\/shadow/,
  /\/etc\/passwd/,
];

function isCommandDangerous(command: string): boolean {
  return DANGEROUS_COMMAND_PATTERNS.some(pattern => pattern.test(command));
}

function executeCommand(
  ptySession: { pty: { write: (data: string) => void } },
  session: TerminalSession,
  command: string,
) {
  // ========== NEW: VALIDATION ==========
  if (isCommandDangerous(command)) {
    const ws = session.ws;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: "error",
        data: "Command blocked for safety: contains dangerous pattern"
      }));
    }
    console.log(`[PTY Bridge] Dangerous command blocked: ${command}`);
    return;
  }
  // ====================================

  console.log(`[PTY Bridge] Executing command: ${command}`);
  ptySession.pty.write(command + "\r");
  session.commandBuffer = "";
}
```

### With Message Handler Update

```typescript
ws.on("message", (message: Buffer) => {
  try {
    const data = JSON.parse(message.toString());
    switch (data.type) {
      case "input":
        // Check for dangerous patterns in raw input too
        if (!isCommandDangerous(data.data)) {
          session.pty.pty.write(data.data);
          session.commandBuffer += data.data;
        }
        break;
      case "execute":
        executeCommand(session.pty, session, data.command);
        break;
      // ... rest
    }
  } catch (error) {
    console.error("[PTY Bridge] Error handling message:", error);
  }
});
```

---

## Issue #4: Origin Not Verified (HIGH)

**File:** `/home/axw/projects/NXTG-Forge/v3/src/server/pty-bridge.ts`
**Current Lines:** 44-52

### Current Code (UNVERIFIED)

```typescript
server.on("upgrade", (request, socket, head) => {
  const url = new URL(request.url!, `http://${request.headers.host}`);

  if (url.pathname === "/terminal") {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  }
});
```

### Required Fix

```typescript
// Add at top of pty-bridge.ts
const ALLOWED_ORIGINS = [
  "http://localhost:5050",
  "http://127.0.0.1:5050",
  "ws://localhost:5050",
  "ws://127.0.0.1:5050",
];

server.on("upgrade", (request, socket, head) => {
  const url = new URL(request.url!, `http://${request.headers.host}`);

  // ========== NEW: ORIGIN VERIFICATION ==========
  const origin = request.headers.origin || request.headers.referer;
  if (origin && !ALLOWED_ORIGINS.some(allowed => origin.includes(allowed))) {
    console.log(`[PTY Bridge] Connection rejected: forbidden origin ${origin}`);
    socket.destroy();
    return;
  }
  // =============================================

  if (url.pathname === "/terminal") {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  }
});
```

---

## Issue #5: npm Audit HIGH Vulnerability

**File:** `package.json`
**Severity:** HIGH but FIXABLE

### Quick Fix

```bash
# Run this command
npm audit fix

# Verify it worked
npm audit
```

This will update `@isaacs/brace-expansion` to a patched version.

---

## Issue #6: WebSocket API No Authentication

**File:** `/home/axw/projects/NXTG-Forge/v3/src/server/api-server.ts`
**Current Lines:** 119-150

### Current Code

```typescript
const clients = new Set<WebSocket>();

wss.on("connection", (ws) => {
  clients.add(ws);
  console.log("New WebSocket client connected");

  ws.send(
    JSON.stringify({
      type: "state.update",
      payload: stateManager.getState(),
      timestamp: new Date().toISOString(),
    }),
  );

  ws.on("message", (data) => {
    try {
      const message = JSON.parse(data.toString());
      handleWSMessage(ws, message);
    } catch (error) {
      console.error("Invalid WebSocket message:", error);
    }
  });
```

### Required Fix - Add Message Schema Validation

```typescript
import { z } from "zod";

// Add at top of file
const WSMessageSchema = z.object({
  type: z.enum([
    "ping",
    "state.update",
    "command.execute",
    "pong",
    "heartbeat",
  ]),
  payload: z.unknown().optional(),
  correlationId: z.string().optional(),
});

const MAX_MESSAGE_SIZE = 1024 * 100; // 100KB

const clients = new Set<WebSocket>();

wss.on("connection", (ws) => {
  clients.add(ws);
  console.log("New WebSocket client connected");

  // ========== NEW: ORIGIN CHECK ==========
  const origin = ws.upgradeReq?.headers.origin;
  const allowedOrigins = [
    "http://localhost:5050",
    "http://127.0.0.1:5050",
  ];

  if (origin && !allowedOrigins.includes(origin)) {
    console.log(`[API] WebSocket rejected: forbidden origin ${origin}`);
    ws.close(4003, "Forbidden origin");
    return;
  }
  // ========================================

  ws.send(
    JSON.stringify({
      type: "state.update",
      payload: stateManager.getState(),
      timestamp: new Date().toISOString(),
    }),
  );

  ws.on("message", (data) => {
    try {
      // ========== NEW: SIZE CHECK ==========
      if (data.length > MAX_MESSAGE_SIZE) {
        ws.close(4009, "Message too large");
        return;
      }
      // ====================================

      const message = JSON.parse(data.toString());

      // ========== NEW: SCHEMA VALIDATION ==========
      const validated = WSMessageSchema.parse(message);
      handleWSMessage(ws, validated);
      // ===========================================
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("[API] Invalid WebSocket message schema:", error);
        ws.send(JSON.stringify({
          type: "error",
          message: "Invalid message format"
        }));
      } else {
        console.error("Invalid WebSocket message:", error);
      }
    }
  });

  // ... rest of handler
});
```

---

## Issue #7: CORS Allow-All (MEDIUM)

**File:** `/home/axw/projects/NXTG-Forge/v3/src/server/api-server.ts`
**Current Lines:** 91-96

### Current Code

```typescript
app.use(
  cors({
    origin: true, // ALLOW ALL
    credentials: true,
  }),
);
```

### Required Fix

```typescript
// Add near top of file
const ALLOWED_CORS_ORIGINS = [
  "http://localhost:5050",
  "http://localhost:5051",
  "http://127.0.0.1:5050",
  "http://127.0.0.1:5051",
  // Allow no origin (for curl, Postman, etc.)
  undefined,
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || ALLOWED_CORS_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        console.log(`[CORS] Rejected origin: ${origin}`);
        callback(new Error("CORS not allowed"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 3600, // Cache for 1 hour
  }),
);
```

---

## Issue #8: Feedback API No Validation (MEDIUM)

**File:** `/home/axw/projects/NXTG-Forge/v3/src/server/api-server.ts`
**Current Lines:** 2003-2040

### Current Code

```typescript
app.post("/api/feedback", async (req, res) => {
  try {
    const {
      rating,
      category,
      description,
      url,
      userAgent,
      timestamp,
    } = req.body;

    // Validate required fields
    if (!rating || !category || !description) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: rating, category, description",
        timestamp: new Date().toISOString(),
      });
    }

    // NO VALIDATION ON CONTENT
```

### Required Fix

```typescript
// Add at top of file
import { z } from "zod";

const FeedbackSchema = z.object({
  rating: z.number()
    .min(1, "Rating must be at least 1")
    .max(5, "Rating must be at most 5"),
  category: z.enum([
    "bug",
    "feature-request",
    "performance",
    "ui-ux",
    "documentation",
    "other",
  ], {
    errorMap: () => ({ message: "Invalid category" })
  }),
  description: z.string()
    .min(10, "Description must be at least 10 characters")
    .max(5000, "Description must be less than 5000 characters")
    .refine(
      val => !/[<>{}();&|$`]|<script|javascript:|onerror=/i.test(val),
      "Description contains invalid characters"
    ),
  url: z.string().url("Invalid URL").optional().or(z.literal("")),
  userAgent: z.string().optional(),
  timestamp: z.string().datetime().optional(),
});

// Then update handler:
app.post("/api/feedback", async (req, res) => {
  try {
    // ========== NEW: VALIDATION ==========
    const validated = FeedbackSchema.parse(req.body);
    // ====================================

    // Create feedback entry
    const feedback = {
      id: `feedback-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      rating: validated.rating,
      category: validated.category,
      description: validated.description,
      url: validated.url || "unknown",
      userAgent: validated.userAgent || "unknown",
      timestamp: validated.timestamp || new Date().toISOString(),
      status: "new",
    };

    // Read existing feedback
    await ensureFeedbackFile();
    const data = await fs.readFile(FEEDBACK_FILE, "utf-8");
    const feedbackList = JSON.parse(data);

    // Add new feedback
    feedbackList.push(feedback);

    // Write back to file
    await fs.writeFile(FEEDBACK_FILE, JSON.stringify(feedbackList, null, 2));

    // Broadcast feedback event
    broadcast("feedback.submitted", {
      id: feedback.id,
      category: feedback.category,
      rating: feedback.rating,
      timestamp: feedback.timestamp,
    });

    res.json({
      success: true,
      data: { id: feedback.id },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Invalid feedback data",
        details: error.errors,
        timestamp: new Date().toISOString(),
      });
    }

    console.error("Failed to save feedback:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });
  }
});
```

---

## Issue #9: No Rate Limiting (MEDIUM)

**File:** `/home/axw/projects/NXTG-Forge/v3/src/server/api-server.ts`
**Need to add:** Rate limiting middleware

### Installation

```bash
npm install express-rate-limit
npm install --save-dev @types/express-rate-limit
```

### Implementation

```typescript
// At top of api-server.ts
import rateLimit from "express-rate-limit";

// Default rate limiter: 100 requests per 15 minutes
const defaultLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Don't rate limit health checks
    return req.path === "/api/health";
  },
});

// Strict rate limiter: 5 requests per minute (for feedback)
const strictLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: "Too many feedback submissions, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply default limiter to all API routes
app.use("/api/", defaultLimiter);

// Apply strict limiter to feedback endpoint
app.post("/api/feedback", strictLimiter, async (req, res) => {
  // ... existing code
});
```

---

## Testing Checklist After Fixes

- [ ] Run `npm run lint` (no errors)
- [ ] Run `npm run test:security` (all tests pass)
- [ ] Run `npm audit` (0 vulnerabilities)
- [ ] Manual test: WebSocket without token → should reject
- [ ] Manual test: WebSocket with token → should accept
- [ ] Manual test: Dangerous command → should block
- [ ] Manual test: Normal command → should execute
- [ ] Manual test: CORS from different origin → should reject
- [ ] Manual test: Feedback with invalid rating → should reject
- [ ] Manual test: Rapid feedback submissions → should throttle

---

## Verification Commands

```bash
# Check for all remaining vulnerabilities
npm audit

# Run security tests
npm run test:security

# Lint for issues
npm run lint

# Verify no hardcoded secrets
grep -r "password\|secret\|api.*key" src/ --include="*.ts" --include="*.tsx"

# Check .gitignore has .env
grep "\.env" .gitignore
```

---

## Estimated Timeline

| Issue | Effort | Notes |
|-------|--------|-------|
| PTY Auth | 4h | Most complex, needs validation function |
| Session IDs | 30m | Simple change, needs `import crypto` |
| Command Filter | 2h | Pattern matching, needs testing |
| Origin Check | 1h | Straightforward |
| npm audit | 30m | Automatic fix |
| WS Validation | 2h | Zod schema addition |
| CORS | 1h | Simple configuration |
| Feedback | 1h | Schema validation |
| Rate Limiting | 2h | Package + middleware |
| **Total** | **~14h** | Sequential, can parallelize some |

---

## Success Criteria

✓ All 9 issues fixed
✓ npm audit shows 0 vulnerabilities
✓ npm run test:security passes
✓ No hardcoded secrets in code
✓ All security tests written
✓ SECURITY.md is up-to-date
✓ Code review approved
✓ Ready for public release

---

## Next Steps

1. **Assign ownership** - Who will fix each issue?
2. **Create branches** - One branch per critical issue
3. **Code review** - Security-focused review
4. **Testing** - Verify fixes work
5. **Merge** - All fixes to main
6. **Release** - Tag 3.0.0-security-patched or similar

