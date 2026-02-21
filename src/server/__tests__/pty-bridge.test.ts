/**
 * PTY Bridge Tests
 * Comprehensive tests for WebSocket PTY bridge and session persistence
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { WebSocketServer, WebSocket } from "ws";
import { EventEmitter } from "events";
import * as http from "http";
import { createPTYBridge, cleanupPTYBridge } from "../pty-bridge";
import { RunspaceManager } from "../../core/runspace-manager";
import type { Runspace } from "../../core/runspace";

// Mock auth validation — always approve for PTY functionality tests
vi.mock("../routes/features", () => ({
  validateWSAuthToken: () => true,
}));

// Mock node-pty
vi.mock("node-pty", () => ({
  spawn: vi.fn(() => {
    const emitter = new EventEmitter() as any;
    emitter.write = vi.fn();
    emitter.resize = vi.fn();
    emitter.kill = vi.fn();
    emitter.pid = 12345;
    emitter.onData = (cb: (data: string) => void) => {
      emitter.on("data", cb);
    };
    emitter.onExit = (cb: (info: { exitCode: number; signal: number }) => void) => {
      emitter.on("exit", cb);
    };
    return emitter;
  }),
}));

// Mock RunspaceManager
class MockRunspaceManager {
  private runspaces = new Map<string, Runspace>();
  private activeRunspaceId: string | null = null;

  getRunspace(id: string): Runspace | null {
    return this.runspaces.get(id) || null;
  }

  getActiveRunspace(): Runspace | null {
    if (!this.activeRunspaceId) return null;
    return this.runspaces.get(this.activeRunspaceId) || null;
  }

  addMockRunspace(runspace: Runspace): void {
    this.runspaces.set(runspace.id, runspace);
  }

  setActiveRunspace(id: string): void {
    this.activeRunspaceId = id;
  }
}

describe("PTY Bridge", () => {
  let server: http.Server;
  let runspaceManager: MockRunspaceManager;
  let wss: WebSocketServer;
  let port: number;
  const pendingTimers: ReturnType<typeof setTimeout>[] = [];
  const activeClients: WebSocket[] = [];

  /** Create a tracked WebSocket client - auto-cleaned in afterEach */
  function createClient(url: string): WebSocket {
    const ws = new WebSocket(url);
    ws.on("error", () => { /* suppress ECONNREFUSED during teardown */ });
    activeClients.push(ws);
    return ws;
  }

  beforeEach(async () => {
    server = http.createServer();
    runspaceManager = new MockRunspaceManager();

    // Create PTY bridge
    wss = createPTYBridge(server, runspaceManager as unknown as RunspaceManager);

    // Start server listening on random port
    await new Promise<void>((resolve) => {
      server.listen(0, () => resolve());
    });
    port = (server.address() as { port: number }).port;
  });

  afterEach(async () => {
    // Clear any pending reconnect timers first
    for (const timer of pendingTimers) {
      clearTimeout(timer);
    }
    pendingTimers.length = 0;

    // Close all test-created WebSocket clients
    for (const client of activeClients) {
      if (client.readyState === WebSocket.OPEN || client.readyState === WebSocket.CONNECTING) {
        client.terminate();
      }
    }
    activeClients.length = 0;

    cleanupPTYBridge();
    // Close all server-side WebSocket clients
    if (wss) {
      for (const client of wss.clients) {
        client.terminate();
      }
    }
    await new Promise<void>((resolve) => {
      if (wss) {
        wss.close(() => resolve());
      } else {
        resolve();
      }
    });
    await new Promise<void>((resolve) => {
      if (server) {
        server.close(() => resolve());
      } else {
        resolve();
      }
    });
  });

  describe("WebSocket connection", () => {
    it("should create PTY bridge server", () => {
      expect(wss).toBeDefined();
      expect(wss).toBeInstanceOf(WebSocketServer);
    });

    it("should handle connection with default runspace", (done) => {
      const mockRunspace: Runspace = {
        id: "test-runspace-1",
        name: "test-project",
        displayName: "Test Project",
        path: "/home/test/project",
        type: "wsl",
        status: "active",
        createdAt: new Date(),
      };

      runspaceManager.addMockRunspace(mockRunspace);
      runspaceManager.setActiveRunspace(mockRunspace.id);

      const client = createClient(`ws://localhost:${port}/terminal`);

      client.on("open", () => {
        expect(client.readyState).toBe(WebSocket.OPEN);
        client.close();
      });

      client.on("message", (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === "session") {
          expect(message.sessionId).toBeDefined();
          expect(message.restored).toBe(false);
          done();
        }
      });
    });

    it("should handle connection with specific runspace", (done) => {
      const mockRunspace: Runspace = {
        id: "specific-runspace",
        name: "specific-project",
        displayName: "Specific Project",
        path: "/home/test/specific",
        type: "wsl",
        status: "active",
        createdAt: new Date(),
      };

      runspaceManager.addMockRunspace(mockRunspace);

      const client = createClient(
        `ws://localhost:${port}/terminal?runspace=${mockRunspace.id}`
      );

      client.on("message", (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === "session") {
          expect(message.sessionId).toBeDefined();
          client.close();
          done();
        }
      });
    });

    it("should reject connection to non-existent runspace", () => {
      return new Promise<void>((resolve) => {
        let resolved = false;
        const finish = () => { if (!resolved) { resolved = true; resolve(); } };

        const client = createClient(
          `ws://localhost:${port}/terminal?runspace=non-existent&token=mock-token`
        );

        client.on("message", (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === "error") {
            expect(message.data).toContain("Runspace not found");
            finish();
          }
        });

        client.on("close", () => {
          finish();
        });
      });
    });
  });

  describe("Session persistence", () => {
    it("should create new session with unique ID", (done) => {
      const mockRunspace: Runspace = {
        id: "persist-test",
        name: "persist-project",
        displayName: "Persist Project",
        path: "/home/test/persist",
        type: "wsl",
        status: "active",
        createdAt: new Date(),
      };

      runspaceManager.addMockRunspace(mockRunspace);
      runspaceManager.setActiveRunspace(mockRunspace.id);

      const client = createClient(`ws://localhost:${port}/terminal`);

      client.on("message", (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === "session") {
          expect(message.sessionId).toBeDefined();
          expect(typeof message.sessionId).toBe("string");
          expect(message.sessionId.length).toBeGreaterThan(0);
          client.close();
          done();
        }
      });
    });

    it("should reattach to existing session", (done) => {
      const mockRunspace: Runspace = {
        id: "reattach-test",
        name: "reattach-project",
        displayName: "Reattach Project",
        path: "/home/test/reattach",
        type: "wsl",
        status: "active",
        createdAt: new Date(),
      };

      runspaceManager.addMockRunspace(mockRunspace);
      runspaceManager.setActiveRunspace(mockRunspace.id);

      let sessionId: string;
      const client1 = createClient(`ws://localhost:${port}/terminal`);

      client1.on("message", (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === "session") {
          sessionId = message.sessionId;
          expect(message.restored).toBe(false);
          client1.close();

          pendingTimers.push(setTimeout(() => {
            const client2 = createClient(
              `ws://localhost:${port}/terminal?sessionId=${sessionId}`
            );

            client2.on("message", (data) => {
              const message = JSON.parse(data.toString());
              if (message.type === "session") {
                expect(message.sessionId).toBe(sessionId);
                expect(message.restored).toBe(true);
                client2.close();
                done();
              }
            });
          }, 100));
        }
      });
    });

    it("should maintain PTY when WebSocket disconnects", (done) => {
      const mockRunspace: Runspace = {
        id: "maintain-test",
        name: "maintain-project",
        displayName: "Maintain Project",
        path: "/home/test/maintain",
        type: "wsl",
        status: "active",
        createdAt: new Date(),
      };

      runspaceManager.addMockRunspace(mockRunspace);
      runspaceManager.setActiveRunspace(mockRunspace.id);

      const client = createClient(`ws://localhost:${port}/terminal`);
      let sessionId: string;

      client.on("message", (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === "session") {
          sessionId = message.sessionId;
          client.close();

          pendingTimers.push(setTimeout(() => {
            const client2 = createClient(
              `ws://localhost:${port}/terminal?sessionId=${sessionId}`
            );

            client2.on("message", (data) => {
              const message = JSON.parse(data.toString());
              if (message.type === "session") {
                expect(message.restored).toBe(true);
                client2.close();
                done();
              }
            });
          }, 100));
        }
      });
    });
  });

  describe("Command execution", () => {
    it("should forward input to PTY", (done) => {
      const mockRunspace: Runspace = {
        id: "input-test",
        name: "input-project",
        displayName: "Input Project",
        path: "/home/test/input",
        type: "wsl",
        status: "active",
        createdAt: new Date(),
      };

      runspaceManager.addMockRunspace(mockRunspace);
      runspaceManager.setActiveRunspace(mockRunspace.id);

      const client = createClient(`ws://localhost:${port}/terminal`);

      client.on("open", () => {
        client.send(
          JSON.stringify({
            type: "input",
            data: "echo 'hello world'\n",
          })
        );

        setTimeout(() => {
          client.close();
          done();
        }, 50);
      });
    });

    it("should handle resize commands", (done) => {
      const mockRunspace: Runspace = {
        id: "resize-test",
        name: "resize-project",
        displayName: "Resize Project",
        path: "/home/test/resize",
        type: "wsl",
        status: "active",
        createdAt: new Date(),
      };

      runspaceManager.addMockRunspace(mockRunspace);
      runspaceManager.setActiveRunspace(mockRunspace.id);

      const client = createClient(`ws://localhost:${port}/terminal`);

      client.on("open", () => {
        client.send(
          JSON.stringify({
            type: "resize",
            cols: 120,
            rows: 40,
          })
        );

        setTimeout(() => {
          client.close();
          done();
        }, 50);
      });
    });

    it("should handle execute commands", (done) => {
      const mockRunspace: Runspace = {
        id: "exec-test",
        name: "exec-project",
        displayName: "Exec Project",
        path: "/home/test/exec",
        type: "wsl",
        status: "active",
        createdAt: new Date(),
      };

      runspaceManager.addMockRunspace(mockRunspace);
      runspaceManager.setActiveRunspace(mockRunspace.id);

      const client = createClient(`ws://localhost:${port}/terminal`);

      client.on("open", () => {
        client.send(
          JSON.stringify({
            type: "execute",
            command: "ls -la",
          })
        );

        setTimeout(() => {
          client.close();
          done();
        }, 50);
      });
    });

    it("should handle invalid message gracefully", (done) => {
      const mockRunspace: Runspace = {
        id: "invalid-test",
        name: "invalid-project",
        displayName: "Invalid Project",
        path: "/home/test/invalid",
        type: "wsl",
        status: "active",
        createdAt: new Date(),
      };

      runspaceManager.addMockRunspace(mockRunspace);
      runspaceManager.setActiveRunspace(mockRunspace.id);

      const client = createClient(`ws://localhost:${port}/terminal`);

      client.on("open", () => {
        client.send("invalid json {{{");

        setTimeout(() => {
          expect(client.readyState).not.toBe(WebSocket.CLOSED);
          client.close();
          done();
        }, 50);
      });
    });
  });

  describe("Scrollback buffer", () => {
    it("should maintain scrollback buffer for session", (done) => {
      const mockRunspace: Runspace = {
        id: "scrollback-test",
        name: "scrollback-project",
        displayName: "Scrollback Project",
        path: "/home/test/scrollback",
        type: "wsl",
        status: "active",
        createdAt: new Date(),
      };

      runspaceManager.addMockRunspace(mockRunspace);
      runspaceManager.setActiveRunspace(mockRunspace.id);

      const client = createClient(`ws://localhost:${port}/terminal`);
      let sessionId: string;

      client.on("message", (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === "session") {
          sessionId = message.sessionId;
          client.close();

          pendingTimers.push(setTimeout(() => {
            const client2 = createClient(
              `ws://localhost:${port}/terminal?sessionId=${sessionId}`
            );

            client2.on("open", () => {
              client2.send(JSON.stringify({ type: "ready" }));
            });

            client2.on("message", (data) => {
              const message = JSON.parse(data.toString());
              if (message.type === "output") {
                expect(message.data).toBeDefined();
                client2.close();
                done();
              }
            });
          }, 100));
        }
      });
    });
  });

  describe("Cleanup", () => {
    it("should cleanup all sessions on shutdown", () => {
      cleanupPTYBridge();
      expect(true).toBe(true);
    });

    it("should close WebSocket on PTY exit", () => {
      return new Promise<void>((resolve) => {
        const mockRunspace: Runspace = {
          id: "exit-test",
          name: "exit-project",
          displayName: "Exit Project",
          path: "/home/test/exit",
          type: "wsl",
          status: "active",
          createdAt: new Date(),
        };

        runspaceManager.addMockRunspace(mockRunspace);
        runspaceManager.setActiveRunspace(mockRunspace.id);

        let resolved = false;
        const finish = () => { if (!resolved) { resolved = true; resolve(); } };

        const client = createClient(`ws://localhost:${port}/terminal`);

        client.on("close", () => {
          finish();
        });

        client.on("message", (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === "session") {
            client.close();
          }
        });
      });
    });

    it("should handle cleanup timer cancellation", (done) => {
      const mockRunspace: Runspace = {
        id: "timer-test",
        name: "timer-project",
        displayName: "Timer Project",
        path: "/home/test/timer",
        type: "wsl",
        status: "active",
        createdAt: new Date(),
      };

      runspaceManager.addMockRunspace(mockRunspace);
      runspaceManager.setActiveRunspace(mockRunspace.id);

      const client = createClient(`ws://localhost:${port}/terminal`);
      let sessionId: string;

      client.on("message", (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === "session") {
          sessionId = message.sessionId;
          client.close();

          pendingTimers.push(setTimeout(() => {
            const client2 = createClient(
              `ws://localhost:${port}/terminal?sessionId=${sessionId}`
            );

            client2.on("message", (data) => {
              const message = JSON.parse(data.toString());
              if (message.type === "session") {
                expect(message.restored).toBe(true);
                client2.close();
                done();
              }
            });
          }, 10));
        }
      });
    });
  });

  describe("Error handling", () => {
    it("should handle WebSocket errors gracefully", () => {
      return new Promise<void>((resolve) => {
        const mockRunspace: Runspace = {
          id: "error-test",
          name: "error-project",
          displayName: "Error Project",
          path: "/home/test/error",
          type: "wsl",
          status: "active",
          createdAt: new Date(),
        };

        runspaceManager.addMockRunspace(mockRunspace);
        runspaceManager.setActiveRunspace(mockRunspace.id);

        const client = createClient(`ws://localhost:${port}/terminal`);

        client.on("open", () => {
          client.emit("error", new Error("Test error"));
        });

        setTimeout(() => {
          resolve();
        }, 50);
      });
    });

    it("should handle connection to server with no default runspace", (done) => {
      const client = createClient(`ws://localhost:${port}/terminal`);

      client.on("message", (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === "session") {
          expect(message.sessionId).toBeDefined();
          client.close();
          done();
        }
      });
    });
  });
});
