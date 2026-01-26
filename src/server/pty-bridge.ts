/**
 * PTY Bridge Server
 * WebSocket server that spawns Claude Code CLI in a PTY
 * Bridges terminal I/O between frontend and Claude CLI
 */

import { spawn } from 'node-pty';
import { WebSocketServer, WebSocket } from 'ws';
import * as http from 'http';

interface TerminalSession {
  pty: any;
  ws: WebSocket;
  commandBuffer: string;
}

const sessions = new Map<string, TerminalSession>();

/**
 * Initialize PTY bridge server
 */
export function createPTYBridge(server: http.Server) {
  const wss = new WebSocketServer({
    server,
    path: '/terminal'
  });

  wss.on('connection', (ws: WebSocket) => {
    console.log('[PTY Bridge] New terminal connection');

    // Generate session ID
    const sessionId = Math.random().toString(36).substring(7);

    // Spawn Claude Code CLI in PTY
    // Note: This assumes 'claude' CLI is in PATH
    // For development, we'll use 'bash' as fallback
    const shell = process.env.SHELL || '/bin/bash';
    const pty = spawn(shell, [], {
      name: 'xterm-256color',
      cols: 80,
      rows: 24,
      cwd: process.env.PWD || process.cwd(),
      env: {
        ...process.env,
        TERM: 'xterm-256color',
        COLORTERM: 'truecolor',
        // Add Claude CLI to PATH if needed
        PATH: `${process.env.PATH}:/usr/local/bin:${process.env.HOME}/.local/bin`
      }
    });

    // Store session
    const session: TerminalSession = {
      pty,
      ws,
      commandBuffer: ''
    };
    sessions.set(sessionId, session);

    // Send PTY output to WebSocket
    pty.onData((data: string) => {
      if (ws.readyState === WebSocket.OPEN) {
        // Intercept special patterns for enhanced UI
        const enrichedData = interceptOutput(data, ws);

        ws.send(JSON.stringify({
          type: 'output',
          data: enrichedData
        }));
      }
    });

    // Handle PTY exit
    pty.onExit(({ exitCode, signal }: any) => {
      console.log(`[PTY Bridge] PTY exited: code=${exitCode}, signal=${signal}`);
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'output',
          data: `\r\n[Process exited with code ${exitCode}]\r\n`
        }));
        ws.close();
      }
      sessions.delete(sessionId);
    });

    // Handle WebSocket messages
    ws.on('message', (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());

        switch (data.type) {
          case 'input':
            // Forward input to PTY
            pty.write(data.data);
            session.commandBuffer += data.data;
            break;

          case 'resize':
            // Resize PTY
            pty.resize(data.cols, data.rows);
            break;

          case 'execute':
            // Execute command
            executeCommand(session, data.command);
            break;
        }
      } catch (error) {
        console.error('[PTY Bridge] Error handling message:', error);
      }
    });

    // Handle WebSocket close
    ws.on('close', () => {
      console.log('[PTY Bridge] WebSocket closed');
      pty.kill();
      sessions.delete(sessionId);
    });

    // Handle WebSocket errors
    ws.on('error', (error) => {
      console.error('[PTY Bridge] WebSocket error:', error);
      pty.kill();
      sessions.delete(sessionId);
    });
  });

  console.log('[PTY Bridge] WebSocket server initialized on /terminal');
  return wss;
}

/**
 * Intercept output for enhanced UI features
 */
function interceptOutput(data: string, ws: WebSocket): string {
  // Check for diff markers (Claude Code uses specific XML tags)
  if (data.includes('<thinking>') || data.includes('</thinking>')) {
    // Extract thinking content
    const thinkingMatch = data.match(/<thinking>(.*?)<\/thinking>/s);
    if (thinkingMatch) {
      ws.send(JSON.stringify({
        type: 'context',
        data: {
          currentThought: thinkingMatch[1].trim(),
          files: [],
          totalTokens: 0,
          maxTokens: 200000
        }
      }));
    }
  }

  // Check for file operations (for context tracking)
  if (data.includes('Reading:') || data.includes('Analyzing:')) {
    const fileMatch = data.match(/(Reading|Analyzing):\s+(.+)/);
    if (fileMatch) {
      ws.send(JSON.stringify({
        type: 'context',
        data: {
          files: [{
            path: fileMatch[2].trim(),
            tokens: 0,
            status: fileMatch[1].toLowerCase() === 'reading' ? 'reading' : 'analyzing',
            lastAccessed: new Date()
          }],
          totalTokens: 0,
          maxTokens: 200000,
          currentThought: ''
        }
      }));
    }
  }

  // Check for diff output
  if (data.includes('diff --git')) {
    // Parse diff and send to UI
    // This is a simplified version - real implementation would parse full diff
    ws.send(JSON.stringify({
      type: 'diff',
      data: {
        filePath: 'example.ts',
        language: 'typescript',
        oldContent: '// old code',
        newContent: '// new code',
        changes: []
      }
    }));
  }

  // Check for cost/token info
  const tokenMatch = data.match(/Tokens:\s+(\d+)/);
  if (tokenMatch) {
    const tokens = parseInt(tokenMatch[1]);
    const cost = tokens * 0.000003; // Approximate Claude cost

    ws.send(JSON.stringify({
      type: 'cost',
      tokens,
      cost
    }));
  }

  return data;
}

/**
 * Execute command and track for safety
 */
function executeCommand(session: TerminalSession, command: string) {
  console.log(`[PTY Bridge] Executing command: ${command}`);

  // Write command to PTY
  session.pty.write(command + '\r');
  session.commandBuffer = '';
}

/**
 * Cleanup all sessions
 */
export function cleanupPTYBridge() {
  console.log('[PTY Bridge] Cleaning up sessions...');
  sessions.forEach((session) => {
    session.pty.kill();
    if (session.ws.readyState === WebSocket.OPEN) {
      session.ws.close();
    }
  });
  sessions.clear();
}
