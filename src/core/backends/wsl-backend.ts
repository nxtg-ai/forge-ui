/**
 * WSL Backend
 *
 * Runspace backend for WSL2 shells
 * Fastest option - uses local bash shells with isolated environments
 */

import { spawn } from "node-pty";
import {
  Runspace,
  IRunspaceBackend,
  PTYSession,
  RunspaceHealth,
} from "../runspace";

export class WSLBackend implements IRunspaceBackend {
  readonly type = "wsl" as const;
  private sessions = new Map<string, PTYSession>();

  async start(runspace: Runspace): Promise<void> {
    console.log(`[WSLBackend] Starting runspace: ${runspace.displayName}`);

    // WSL backend is "always on" - we just note it's active
    // The actual PTY session is created on-demand when terminal is opened
    runspace.status = "active";
  }

  async stop(runspace: Runspace): Promise<void> {
    console.log(`[WSLBackend] Stopping runspace: ${runspace.displayName}`);

    // Kill any active PTY sessions
    const session = this.sessions.get(runspace.id);
    if (session) {
      session.pty.kill();
      this.sessions.delete(runspace.id);
    }

    runspace.status = "stopped";
  }

  async suspend(runspace: Runspace): Promise<void> {
    console.log(`[WSLBackend] Suspending runspace: ${runspace.displayName}`);

    // For WSL, suspend = stop (no true pause capability)
    await this.stop(runspace);
    runspace.status = "suspended";
  }

  async resume(runspace: Runspace): Promise<void> {
    console.log(`[WSLBackend] Resuming runspace: ${runspace.displayName}`);

    // Resume = start
    await this.start(runspace);
  }

  async execute(runspace: Runspace, command: string): Promise<string> {
    console.log(
      `[WSLBackend] Executing in ${runspace.displayName}: ${command}`,
    );

    return new Promise((resolve, reject) => {
      const shell = process.env.SHELL || "/bin/bash";

      const pty = spawn(shell, ["-c", command], {
        name: "xterm-256color",
        cols: 80,
        rows: 24,
        cwd: runspace.path,
        env: {
          ...process.env,
          FORGE_RUNSPACE_ID: runspace.id,
          FORGE_RUNSPACE_NAME: runspace.name,
          FORGE_PROJECT_PATH: runspace.path,
        },
      });

      let output = "";

      pty.onData((data) => {
        output += data;
      });

      pty.onExit(({ exitCode }) => {
        if (exitCode === 0) {
          resolve(output);
        } else {
          reject(
            new Error(`Command failed with exit code ${exitCode}: ${output}`),
          );
        }
      });
    });
  }

  async attachPTY(runspace: Runspace): Promise<PTYSession> {
    console.log(`[WSLBackend] Attaching PTY to: ${runspace.displayName}`);

    // Check if session already exists
    let session = this.sessions.get(runspace.id);
    if (session) {
      console.log(`[WSLBackend] Reusing existing PTY session`);
      return session;
    }

    // Spawn new PTY
    const shell = process.env.SHELL || "/bin/bash";
    const pty = spawn(shell, ["--noprofile", "--norc", "-i"], {
      name: "xterm-256color",
      cols: 80,
      rows: 24,
      cwd: runspace.path,
      env: {
        ...process.env,
        TERM: "xterm-256color",
        COLORTERM: "truecolor",
        PS1: `\\[\\033[1;36m\\]${runspace.displayName}\\[\\033[0m\\] \\$ `,
        FORGE_RUNSPACE_ID: runspace.id,
        FORGE_RUNSPACE_NAME: runspace.name,
        FORGE_PROJECT_PATH: runspace.path,
        HOME: process.env.HOME,
        USER: process.env.USER,
        PATH: `${process.env.PATH}:/usr/local/bin:${process.env.HOME}/.local/bin`,
      },
    });

    session = {
      id: `pty-${runspace.id}-${Date.now()}`,
      runspaceId: runspace.id,
      pty,
      createdAt: new Date(),
    };

    this.sessions.set(runspace.id, session);

    // Update runspace
    runspace.ptySessionId = session.id;
    runspace.pid = pty.pid;

    console.log(`[WSLBackend] PTY attached: ${session.id}, PID: ${pty.pid}`);

    return session;
  }

  async getHealth(runspace: Runspace): Promise<RunspaceHealth> {
    // For WSL backend, health is based on whether PTY is alive
    const session = this.sessions.get(runspace.id);
    const isHealthy =
      runspace.status === "active" &&
      (!session || session.pty.pid !== undefined);

    return {
      status: isHealthy ? "healthy" : "unhealthy",
      cpu: 0, // TODO: Implement actual metrics
      memory: 0,
      disk: 0,
      uptime: session ? (Date.now() - session.createdAt.getTime()) / 1000 : 0,
      lastCheck: new Date(),
    };
  }

  /**
   * Create a default PTY session (no runspace required)
   * Used when no runspaces exist - spawns a basic shell in current directory
   */
  async createDefaultPTY(): Promise<PTYSession> {
    console.log(`[WSLBackend] Creating default PTY session`);

    // Check if default session already exists
    let session = this.sessions.get("default");
    if (session) {
      console.log(`[WSLBackend] Reusing existing default PTY session`);
      return session;
    }

    // Spawn new PTY in current working directory
    const shell = process.env.SHELL || "/bin/bash";
    const pty = spawn(shell, [], {
      name: "xterm-256color",
      cols: 80,
      rows: 24,
      cwd: process.cwd(),
      env: {
        ...process.env,
        TERM: "xterm-256color",
        COLORTERM: "truecolor",
        HOME: process.env.HOME,
        USER: process.env.USER,
        PATH: `${process.env.PATH}:/usr/local/bin:${process.env.HOME}/.local/bin`,
      },
    });

    session = {
      id: `pty-default-${Date.now()}`,
      runspaceId: "default",
      pty,
      createdAt: new Date(),
    };

    this.sessions.set("default", session);

    console.log(
      `[WSLBackend] Default PTY created: ${session.id}, PID: ${pty.pid}`,
    );

    return session;
  }

  /**
   * Get PTY session for a runspace
   */
  getSession(runspaceId: string): PTYSession | undefined {
    return this.sessions.get(runspaceId);
  }

  /**
   * Remove PTY session
   */
  removeSession(runspaceId: string): void {
    const session = this.sessions.get(runspaceId);
    if (session) {
      session.pty.kill();
      this.sessions.delete(runspaceId);
    }
  }
}
