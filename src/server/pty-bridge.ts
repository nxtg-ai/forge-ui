/**
 * PTY Bridge Server
 * WebSocket server that spawns shells in PTYs for runspaces
 * Bridges terminal I/O between frontend and runspace shells
 * Supports multi-project runspace isolation
 */

import { WebSocketServer, WebSocket } from "ws";
import * as http from "http";
import type { RunspaceManager } from "../core/runspace-manager";
import type { Runspace } from "../core/runspace";
import { WSLBackend } from "../core/backends/wsl-backend";

interface TerminalSession {
  runspaceId: string;
  sessionId: string;
  ws: WebSocket;
  commandBuffer: string;
}

const sessions = new Map<string, TerminalSession>();
const wslBackend = new WSLBackend();

/**
 * Initialize PTY bridge server with runspace support
 */
export function createPTYBridge(
  server: http.Server,
  runspaceManager: RunspaceManager,
) {
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
    console.error("[PTY Bridge] WebSocket server error:", error);
  });

  wss.on("connection", async (ws: WebSocket, request: http.IncomingMessage) => {
    console.log("[PTY Bridge] New terminal connection");

    try {
      // Extract runspace ID from query params
      const url = new URL(request.url!, `http://${request.headers.host}`);
      const runspaceId = url.searchParams.get("runspace");

      // Get runspace (use active runspace if not specified)
      let runspace: Runspace | null | undefined = null;
      let useDefaultShell = false;

      if (runspaceId) {
        runspace = runspaceManager.getRunspace(runspaceId);
        if (!runspace) {
          console.error(`[PTY Bridge] Runspace not found: ${runspaceId}`);
          ws.send(
            JSON.stringify({
              type: "error",
              data: `Runspace not found: ${runspaceId}`,
            }),
          );
          ws.close();
          return;
        }
      } else {
        // Try to use active runspace
        runspace = runspaceManager.getActiveRunspace();
        if (!runspace) {
          // No runspace specified and none active - use default shell mode
          console.log(
            "[PTY Bridge] No active runspace, using default shell mode",
          );
          useDefaultShell = true;
        }
      }

      let ptySession: any;

      if (useDefaultShell) {
        // Default mode: spawn a basic PTY in current working directory
        console.log("[PTY Bridge] Creating default PTY session");
        ptySession = await wslBackend.createDefaultPTY();
      } else {
        // Runspace mode: attach PTY to specific runspace
        console.log(
          `[PTY Bridge] Attaching PTY to runspace: ${runspace!.displayName} (${runspace!.id})`,
        );
        ptySession = await wslBackend.attachPTY(runspace!);
      }

      // Generate session ID
      const sessionId = Math.random().toString(36).substring(7);

      // Store session
      const session: TerminalSession = {
        runspaceId: runspace?.id || "default",
        sessionId,
        ws,
        commandBuffer: "",
      };
      sessions.set(sessionId, session);

      // Send PTY output to WebSocket
      ptySession.pty.onData((data: string) => {
        // Only log errors, not every keystroke/output
        if (ws.readyState === WebSocket.OPEN) {
          // Intercept special patterns for enhanced UI
          const enrichedData = interceptOutput(data, ws);

          ws.send(
            JSON.stringify({
              type: "output",
              data: enrichedData,
            }),
          );
        } else {
          console.error(
            `[PTY Bridge] Cannot send data, WebSocket state: ${ws.readyState}`,
          );
        }
      });

      // Handle PTY exit
      ptySession.pty.onExit(({ exitCode, signal }: any) => {
        console.log(
          `[PTY Bridge] PTY exited: code=${exitCode}, signal=${signal}`,
        );
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: "output",
              data: `\r\n[Process exited with code ${exitCode}]\r\n`,
            }),
          );
          ws.close();
        }
        sessions.delete(sessionId);
        wslBackend.removeSession(runspace.id);
      });

      // Handle WebSocket messages
      ws.on("message", (message: Buffer) => {
        try {
          const data = JSON.parse(message.toString());

          switch (data.type) {
            case "input":
              // Forward input to PTY
              ptySession.pty.write(data.data);
              session.commandBuffer += data.data;
              break;

            case "resize":
              // Resize PTY
              ptySession.pty.resize(data.cols, data.rows);
              break;

            case "execute":
              // Execute command
              executeCommand(ptySession, session, data.command);
              break;
          }
        } catch (error) {
          console.error("[PTY Bridge] Error handling message:", error);
        }
      });

      // Handle WebSocket close
      ws.on("close", () => {
        console.log("[PTY Bridge] WebSocket closed");
        ptySession.pty.kill();
        sessions.delete(sessionId);
        // Remove session from backend (use 'default' if no runspace)
        wslBackend.removeSession(runspace?.id || "default");
      });

      // Handle WebSocket errors
      ws.on("error", (error) => {
        console.error("[PTY Bridge] WebSocket error:", error);
        ptySession.pty.kill();
        sessions.delete(sessionId);
        // Remove session from backend (use 'default' if no runspace)
        wslBackend.removeSession(runspace?.id || "default");
      });
    } catch (error) {
      console.error("[PTY Bridge] Fatal error in connection handler:", error);
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    }
  });

  console.log("[PTY Bridge] WebSocket server initialized on /terminal");
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
  ptySession: any,
  session: TerminalSession,
  command: string,
) {
  console.log(`[PTY Bridge] Executing command: ${command}`);

  // Write command to PTY
  ptySession.pty.write(command + "\r");
  session.commandBuffer = "";
}

/**
 * Cleanup all sessions
 */
export function cleanupPTYBridge() {
  console.log("[PTY Bridge] Cleaning up sessions...");
  sessions.forEach((session) => {
    // Close WebSocket
    if (session.ws.readyState === WebSocket.OPEN) {
      session.ws.close();
    }
    // Remove runspace session from backend
    wslBackend.removeSession(session.runspaceId);
  });
  sessions.clear();
}
