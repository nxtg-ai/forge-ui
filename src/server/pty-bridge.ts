/**
 * PTY Bridge Server
 * WebSocket server that spawns shells in PTYs for runspaces
 * Bridges terminal I/O between frontend and runspace shells
 * Supports multi-project runspace isolation
 */

import { WebSocketServer, WebSocket } from "ws";
import * as http from "http";
import * as crypto from "crypto";
import type { RunspaceManager } from "../core/runspace-manager";
import type { Runspace } from "../core/runspace";
import { WSLBackend } from "../core/backends/wsl-backend";
import { getLogger } from "../utils/logger";

const logger = getLogger('pty-bridge');

interface TerminalSession {
  runspaceId: string;
  sessionId: string;
  ws: WebSocket | null;
  pty: { pty: { onData: (cb: (data: string) => void) => void; onExit: (cb: (info: { exitCode: number; signal?: number }) => void) => void; write: (data: string) => void; resize: (cols: number, rows: number) => void; kill: () => void } };
  commandBuffer: string;
  cleanupTimer: ReturnType<typeof setTimeout> | null;
  scrollbackBuffer: string[];
  scrollbackSize: number;
  authToken: string;
}

// How long to keep a PTY alive after WebSocket disconnects (5 minutes)
const SESSION_KEEPALIVE_MS = 5 * 60 * 1000;
// Max scrollback buffer size in bytes (~100KB)
const MAX_SCROLLBACK_SIZE = 100 * 1024;

const sessions = new Map<string, TerminalSession>();
const wslBackend = new WSLBackend();

// Security: Token-based authentication
const authTokens = new Map<string, { sessionId: string; createdAt: number }>();
const TOKEN_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

// Security: Allowed origins (configurable via environment)
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map(o => o.trim())
  : [
      "http://localhost:5050",
      "http://localhost:5051",
      "http://127.0.0.1:5050",
      "http://127.0.0.1:5051",
      "ws://localhost:5050",
      "ws://localhost:5051",
      "ws://127.0.0.1:5050",
      "ws://127.0.0.1:5051",
    ];

// Security: Dangerous command patterns to block
const DANGEROUS_COMMANDS = [
  /rm\s+-rf\s+\//,  // rm -rf /
  /dd\s+if=/,  // dd commands
  /:\(\)\{:\|:&\};:/,  // Fork bombs
  /mkfs\./,  // Filesystem formatting
  />\s*\/dev\/sd[a-z]/,  // Direct disk writes
  /chmod\s+-R\s+777\s+\//,  // Recursive 777 on root
  /wget.*\|\s*bash/,  // Pipe to bash
  /curl.*\|\s*bash/,  // Pipe to bash
  /nc.*-e\s+\/bin\/(ba)?sh/,  // Netcat reverse shells
];

/**
 * Generate secure authentication token
 */
function generateAuthToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Generate secure session ID
 */
function generateSessionId(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Validate origin header
 */
function validateOrigin(origin: string | undefined): boolean {
  if (!origin) {
    // Allow requests without origin (same-origin or native clients)
    return true;
  }

  // Check if origin is in allowed list
  return ALLOWED_ORIGINS.some(allowed => {
    if (allowed === "*") return true;
    return origin === allowed || origin.startsWith(allowed);
  });
}

/**
 * Check if command contains dangerous patterns
 */
function isDangerousCommand(command: string): boolean {
  return DANGEROUS_COMMANDS.some(pattern => pattern.test(command));
}

/**
 * Initialize PTY bridge server with runspace support
 */
export function createPTYBridge(
  server: http.Server,
  runspaceManager: RunspaceManager,
) {
  // Security: Periodic cleanup of expired tokens
  const tokenCleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [token, data] of authTokens.entries()) {
      if (now - data.createdAt > TOKEN_EXPIRY_MS) {
        authTokens.delete(token);
      }
    }
  }, 60000); // Run every minute

  // Create WebSocket server without auto-attach
  const wss = new WebSocketServer({ noServer: true });

  // Handle upgrade manually for /terminal path
  server.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url!, `http://${request.headers.host}`);

    if (url.pathname === "/terminal") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    }
  });

  wss.on("error", (error) => {
    logger.error("[PTY Bridge] WebSocket server error:", error);
  });

  /**
   * Wire a WebSocket to a session: message forwarding, close/error handling.
   * Does NOT register PTY onData/onExit — those are registered once at session creation
   * and read from session.ws which gets swapped on reattach.
   */
  function wireWebSocket(ws: WebSocket, session: TerminalSession, pendingScrollback?: string) {
    // Forward WebSocket messages to PTY
    ws.on("message", (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());
        switch (data.type) {
          case "input":
            session.pty.pty.write(data.data);
            session.commandBuffer += data.data;
            break;
          case "resize":
            session.pty.pty.resize(data.cols, data.rows);
            break;
          case "execute":
            executeCommand(session.pty, session, data.command);
            break;
          case "ready":
            // Client signals its message handler is attached — safe to send scrollback
            if (pendingScrollback) {
              ws.send(JSON.stringify({ type: "output", data: pendingScrollback }));
              pendingScrollback = undefined;
            }
            break;
        }
      } catch (error) {
        logger.error("[PTY Bridge] Error handling message:", error);
      }
    });

    // On close: only act if this ws is still the active one for the session.
    // If session.ws has already been swapped to a new ws (reattach), this is a no-op.
    ws.on("close", () => {
      if (session.ws !== ws) {
        logger.info(`[PTY Bridge] Stale WebSocket closed for session ${session.sessionId}, ignoring`);
        return;
      }
      logger.info(`[PTY Bridge] WebSocket closed for session ${session.sessionId}, keeping PTY alive`);
      session.ws = null;

      session.cleanupTimer = setTimeout(() => {
        logger.info(`[PTY Bridge] Session ${session.sessionId} timed out, cleaning up`);
        session.pty.pty.kill();
        sessions.delete(session.sessionId);
        wslBackend.removeSession(session.runspaceId);
      }, SESSION_KEEPALIVE_MS);
    });

    ws.on("error", (error) => {
      logger.error(`[PTY Bridge] WebSocket error for session ${session.sessionId}:`, error);
      if (session.ws === ws) {
        session.ws = null;
      }
    });
  }

  /**
   * Append data to session scrollback buffer (capped at MAX_SCROLLBACK_SIZE).
   */
  function appendScrollback(session: TerminalSession, data: string) {
    session.scrollbackBuffer.push(data);
    session.scrollbackSize += data.length;
    // Trim from front if over limit
    while (session.scrollbackSize > MAX_SCROLLBACK_SIZE && session.scrollbackBuffer.length > 1) {
      const removed = session.scrollbackBuffer.shift()!;
      session.scrollbackSize -= removed.length;
    }
  }

  wss.on("connection", async (ws: WebSocket, request: http.IncomingMessage) => {
    logger.info("[PTY Bridge] New terminal connection");

    try {
      // Security: Validate origin
      const origin = request.headers.origin;
      if (!validateOrigin(origin)) {
        logger.error(`[PTY Bridge] Blocked connection from unauthorized origin: ${origin}`);
        ws.send(JSON.stringify({ type: "error", data: "Unauthorized origin" }));
        ws.close();
        return;
      }

      const url = new URL(request.url!, `http://${request.headers.host}`);
      const runspaceId = url.searchParams.get("runspace");
      const requestedSessionId = url.searchParams.get("sessionId");
      const authToken = url.searchParams.get("token");

      // Security: Validate auth token for session reattachment
      if (requestedSessionId && authToken) {
        const tokenData = authTokens.get(authToken);
        if (!tokenData) {
          logger.error(`[PTY Bridge] Invalid or expired auth token`);
          ws.send(JSON.stringify({ type: "error", data: "Invalid or expired token" }));
          ws.close();
          return;
        }

        if (tokenData.sessionId !== requestedSessionId) {
          logger.error(`[PTY Bridge] Token/session mismatch`);
          ws.send(JSON.stringify({ type: "error", data: "Token does not match session" }));
          ws.close();
          return;
        }

        // Check token expiry
        if (Date.now() - tokenData.createdAt > TOKEN_EXPIRY_MS) {
          logger.error(`[PTY Bridge] Expired auth token`);
          authTokens.delete(authToken);
          ws.send(JSON.stringify({ type: "error", data: "Token expired" }));
          ws.close();
          return;
        }
      }

      // --- REATTACH to existing session ---
      if (requestedSessionId) {
        const existingSession = sessions.get(requestedSessionId);
        if (existingSession) {
          logger.info(`[PTY Bridge] Reattaching to session: ${requestedSessionId}`);

          // Cancel cleanup timer
          if (existingSession.cleanupTimer) {
            clearTimeout(existingSession.cleanupTimer);
            existingSession.cleanupTimer = null;
          }

          // Swap WebSocket — old ws close handler will see session.ws !== ws and no-op
          const oldWs = existingSession.ws;
          existingSession.ws = ws;

          // Close old WebSocket after swapping (its close handler is now a no-op)
          if (oldWs && oldWs.readyState === WebSocket.OPEN) {
            oldWs.close();
          }

          // Send session info with existing auth token
          ws.send(JSON.stringify({
            type: "session",
            sessionId: requestedSessionId,
            token: existingSession.authToken,
            restored: true,
          }));

          // Collect scrollback — will be sent when client sends "ready" message
          const scrollback = existingSession.scrollbackBuffer.length > 0
            ? existingSession.scrollbackBuffer.join("")
            : undefined;

          // Wire new WebSocket (message forwarding + close/error handlers)
          wireWebSocket(ws, existingSession, scrollback);

          return;
        } else {
          logger.info(`[PTY Bridge] Session ${requestedSessionId} not found, creating new`);
        }
      }

      // --- NEW session ---
      let runspace: Runspace | null | undefined = null;
      let useDefaultShell = false;

      if (runspaceId) {
        runspace = runspaceManager.getRunspace(runspaceId);
        if (!runspace) {
          logger.error(`[PTY Bridge] Runspace not found: ${runspaceId}`);
          ws.send(JSON.stringify({ type: "error", data: `Runspace not found: ${runspaceId}` }));
          ws.close();
          return;
        }
      } else {
        runspace = runspaceManager.getActiveRunspace();
        if (!runspace) {
          logger.info("[PTY Bridge] No active runspace, using default shell mode");
          useDefaultShell = true;
        }
      }

      let ptySession: { pty: { onData: (cb: (data: string) => void) => void; onExit: (cb: (info: { exitCode: number; signal?: number }) => void) => void; write: (data: string) => void; kill: () => void; resize: (cols: number, rows: number) => void } };

      if (useDefaultShell) {
        logger.info("[PTY Bridge] Creating default PTY session");
        ptySession = await wslBackend.createDefaultPTY();
      } else {
        logger.info(`[PTY Bridge] Attaching PTY to runspace: ${runspace!.displayName} (${runspace!.id})`);
        ptySession = await wslBackend.attachPTY(runspace!);
      }

      // Security: Generate cryptographically secure session ID
      const sessionId = requestedSessionId || generateSessionId();

      // Security: Generate auth token for this session
      const newAuthToken = generateAuthToken();
      authTokens.set(newAuthToken, { sessionId, createdAt: Date.now() });

      const session: TerminalSession = {
        runspaceId: runspace?.id || "default",
        sessionId,
        ws,
        pty: ptySession,
        commandBuffer: "",
        cleanupTimer: null,
        scrollbackBuffer: [],
        scrollbackSize: 0,
        authToken: newAuthToken,
      };
      sessions.set(sessionId, session);

      // Send session info with auth token
      ws.send(JSON.stringify({ type: "session", sessionId, token: newAuthToken, restored: false }));

      // PTY output → active WebSocket (registered ONCE, reads session.ws on each call)
      ptySession.pty.onData((data: string) => {
        // Always buffer for scrollback replay
        appendScrollback(session, data);

        const currentWs = session.ws;
        if (currentWs && currentWs.readyState === WebSocket.OPEN) {
          const enrichedData = interceptOutput(data, currentWs);
          currentWs.send(JSON.stringify({ type: "output", data: enrichedData }));
        }
      });

      // PTY exit → cleanup
      ptySession.pty.onExit(({ exitCode, signal }: { exitCode: number; signal?: number }) => {
        logger.info(`[PTY Bridge] PTY exited: code=${exitCode}, signal=${signal ?? 'none'}`);
        const currentWs = session.ws;
        if (currentWs && currentWs.readyState === WebSocket.OPEN) {
          currentWs.send(JSON.stringify({
            type: "output",
            data: `\r\n[Process exited with code ${exitCode}]\r\n`,
          }));
          currentWs.close();
        }
        if (session.cleanupTimer) {
          clearTimeout(session.cleanupTimer);
        }
        sessions.delete(sessionId);
        if (runspace) {
          wslBackend.removeSession(runspace.id);
        }
      });

      // Wire WebSocket (message forwarding + close/error handlers)
      wireWebSocket(ws, session);

    } catch (error) {
      logger.error("[PTY Bridge] Fatal error in connection handler:", error);
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    }
  });

  logger.info("[PTY Bridge] WebSocket server initialized on /terminal");
  return wss;
}

/**
 * Intercept output for enhanced UI features
 */
function interceptOutput(data: string, ws: WebSocket): string {
  // Check for diff markers (Claude Code uses specific XML tags)
  if (data.includes("<thinking>") || data.includes("</thinking>")) {
    // Extract thinking content
    const thinkingMatch = data.match(/<thinking>(.*?)<\/thinking>/s);
    if (thinkingMatch) {
      ws.send(
        JSON.stringify({
          type: "context",
          data: {
            currentThought: thinkingMatch[1].trim(),
            files: [],
            totalTokens: 0,
            maxTokens: 200000,
          },
        }),
      );
    }
  }

  // Check for file operations (for context tracking)
  if (data.includes("Reading:") || data.includes("Analyzing:")) {
    const fileMatch = data.match(/(Reading|Analyzing):\s+(.+)/);
    if (fileMatch) {
      ws.send(
        JSON.stringify({
          type: "context",
          data: {
            files: [
              {
                path: fileMatch[2].trim(),
                tokens: 0,
                status:
                  fileMatch[1].toLowerCase() === "reading"
                    ? "reading"
                    : "analyzing",
                lastAccessed: new Date(),
              },
            ],
            totalTokens: 0,
            maxTokens: 200000,
            currentThought: "",
          },
        }),
      );
    }
  }

  // Check for diff output
  if (data.includes("diff --git")) {
    // Parse diff and send to UI
    // This is a simplified version - real implementation would parse full diff
    ws.send(
      JSON.stringify({
        type: "diff",
        data: {
          filePath: "example.ts",
          language: "typescript",
          oldContent: "// old code",
          newContent: "// new code",
          changes: [],
        },
      }),
    );
  }

  // Check for cost/token info
  const tokenMatch = data.match(/Tokens:\s+(\d+)/);
  if (tokenMatch) {
    const tokens = parseInt(tokenMatch[1]);
    const cost = tokens * 0.000003; // Approximate Claude cost

    ws.send(
      JSON.stringify({
        type: "cost",
        tokens,
        cost,
      }),
    );
  }

  return data;
}

/**
 * Execute command and track for safety
 */
function executeCommand(
  ptySession: { pty: { write: (data: string) => void } },
  session: TerminalSession,
  command: string,
) {
  logger.info(`[PTY Bridge] Executing command: ${command}`);

  // Security: Check for dangerous commands
  if (isDangerousCommand(command)) {
    logger.error(`[PTY Bridge] Blocked dangerous command: ${command}`);
    const errorMsg = "\r\n\x1b[31m[SECURITY] Dangerous command blocked\x1b[0m\r\n";
    if (session.ws && session.ws.readyState === WebSocket.OPEN) {
      session.ws.send(JSON.stringify({ type: "output", data: errorMsg }));
    }
    return;
  }

  // Write command to PTY
  ptySession.pty.write(command + "\r");
  session.commandBuffer = "";
}

/**
 * Cleanup all sessions
 */
export function cleanupPTYBridge() {
  logger.info("[PTY Bridge] Cleaning up sessions...");
  sessions.forEach((session) => {
    // Cancel cleanup timers
    if (session.cleanupTimer) {
      clearTimeout(session.cleanupTimer);
    }
    // Kill PTY
    try {
      session.pty.pty.kill();
    } catch {
      // PTY may already be dead
    }
    // Close WebSocket
    if (session.ws && session.ws.readyState === WebSocket.OPEN) {
      session.ws.close();
    }
    // Remove runspace session from backend
    wslBackend.removeSession(session.runspaceId);
  });
  sessions.clear();
  authTokens.clear();
}
