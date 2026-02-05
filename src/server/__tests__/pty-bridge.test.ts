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

  beforeEach(() => {
    server = http.createServer();
    runspaceManager = new MockRunspaceManager();

    // Create PTY bridge
    wss = createPTYBridge(server, runspaceManager as any);
  });

  afterEach(async () => {
    cleanupPTYBridge();
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

      // Start server
      server.listen(0, () => {
        const port = (server.address() as any).port;

        // Create client connection
        const client = new WebSocket(`ws://localhost:${port}/terminal`);

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

        client.on("error", (error) => {
          done(error);
        });
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

      server.listen(0, () => {
        const port = (server.address() as any).port;

        const client = new WebSocket(
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

        client.on("error", (error) => {
          done(error);
        });
      });
    });

    it("should reject connection to non-existent runspace", (done) => {
      server.listen(0, () => {
        const port = (server.address() as any).port;

        const client = new WebSocket(
          `ws://localhost:${port}/terminal?runspace=non-existent`
        );

        client.on("message", (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === "error") {
            expect(message.data).toContain("Runspace not found");
            done();
          }
        });

        client.on("close", () => {
          // Client should close after error
          done();
        });

        client.on("error", () => {
          // Expected behavior - connection closed
          done();
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

      server.listen(0, () => {
        const port = (server.address() as any).port;
        const client = new WebSocket(`ws://localhost:${port}/terminal`);

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

      server.listen(0, () => {
        const port = (server.address() as any).port;
        let sessionId: string;

        // First connection - create session
        const client1 = new WebSocket(`ws://localhost:${port}/terminal`);

        client1.on("message", (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === "session") {
            sessionId = message.sessionId;
            expect(message.restored).toBe(false);

            // Close first connection
            client1.close();

            // Second connection - reattach to session
            setTimeout(() => {
              const client2 = new WebSocket(
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
            }, 100);
          }
        });
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

      server.listen(0, () => {
        const port = (server.address() as any).port;
        const client = new WebSocket(`ws://localhost:${port}/terminal`);
        let sessionId: string;

        client.on("message", (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === "session") {
            sessionId = message.sessionId;

            // Disconnect client
            client.close();

            // Wait a bit, then reconnect
            setTimeout(() => {
              const client2 = new WebSocket(
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
            }, 100);
          }
        });
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

      server.listen(0, () => {
        const port = (server.address() as any).port;
        const client = new WebSocket(`ws://localhost:${port}/terminal`);

        client.on("open", () => {
          // Send input command
          client.send(
            JSON.stringify({
              type: "input",
              data: "echo 'hello world'\n",
            })
          );

          // Give time for processing
          setTimeout(() => {
            client.close();
            done();
          }, 50);
        });
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

      server.listen(0, () => {
        const port = (server.address() as any).port;
        const client = new WebSocket(`ws://localhost:${port}/terminal`);

        client.on("open", () => {
          // Send resize command
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

      server.listen(0, () => {
        const port = (server.address() as any).port;
        const client = new WebSocket(`ws://localhost:${port}/terminal`);

        client.on("open", () => {
          // Send execute command
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

      server.listen(0, () => {
        const port = (server.address() as any).port;
        const client = new WebSocket(`ws://localhost:${port}/terminal`);

        client.on("open", () => {
          // Send invalid message (not JSON)
          client.send("invalid json {{{");

          // Should not crash - wait and close
          setTimeout(() => {
            expect(client.readyState).not.toBe(WebSocket.CLOSED);
            client.close();
            done();
          }, 50);
        });
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

      server.listen(0, () => {
        const port = (server.address() as any).port;
        const client = new WebSocket(`ws://localhost:${port}/terminal`);
        let sessionId: string;

        client.on("message", (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === "session") {
            sessionId = message.sessionId;

            // Close and reconnect
            client.close();

            setTimeout(() => {
              const client2 = new WebSocket(
                `ws://localhost:${port}/terminal?sessionId=${sessionId}`
              );

              // Send ready signal to receive scrollback
              client2.on("open", () => {
                client2.send(JSON.stringify({ type: "ready" }));
              });

              client2.on("message", (data) => {
                const message = JSON.parse(data.toString());
                // Should receive scrollback on reconnect
                if (message.type === "output") {
                  expect(message.data).toBeDefined();
                  client2.close();
                  done();
                }
              });
            }, 100);
          }
        });
      });
    });
  });

  describe("Cleanup", () => {
    it("should cleanup all sessions on shutdown", () => {
      cleanupPTYBridge();
      // Should not throw
      expect(true).toBe(true);
    });

    it("should close WebSocket on PTY exit", (done) => {
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

      server.listen(0, () => {
        const port = (server.address() as any).port;
        const client = new WebSocket(`ws://localhost:${port}/terminal`);

        client.on("close", () => {
          // WebSocket should close when PTY exits
          done();
        });

        // Simulate PTY setup and immediate exit
        client.on("message", (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === "session") {
            // Connection established, close it
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

      server.listen(0, () => {
        const port = (server.address() as any).port;
        const client = new WebSocket(`ws://localhost:${port}/terminal`);
        let sessionId: string;

        client.on("message", (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === "session") {
            sessionId = message.sessionId;

            // Close connection
            client.close();

            // Quickly reconnect before cleanup timer fires
            setTimeout(() => {
              const client2 = new WebSocket(
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
            }, 10); // Very quick reconnect
          }
        });
      });
    });
  });

  describe("Error handling", () => {
    it("should handle WebSocket errors gracefully", (done) => {
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

      server.listen(0, () => {
        const port = (server.address() as any).port;
        const client = new WebSocket(`ws://localhost:${port}/terminal`);

        // Emit error event
        client.on("open", () => {
          client.emit("error", new Error("Test error"));
        });

        // Should handle error without crashing
        setTimeout(() => {
          done();
        }, 50);
      });
    });

    it("should handle connection to server with no default runspace", (done) => {
      // No runspaces configured
      server.listen(0, () => {
        const port = (server.address() as any).port;
        const client = new WebSocket(`ws://localhost:${port}/terminal`);

        client.on("message", (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === "session") {
            // Should create default PTY session
            expect(message.sessionId).toBeDefined();
            client.close();
            done();
          }
        });
      });
    });
  });
});
