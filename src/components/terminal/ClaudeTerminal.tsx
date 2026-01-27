/**
 * Claude Code Terminal Component
 * Embedded xterm.js terminal with PTY bridge to Claude Code CLI
 */

import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { SearchAddon } from '@xterm/addon-search';
import '@xterm/xterm/css/xterm.css';
import {
  Terminal as TerminalIcon,
  Maximize2,
  Minimize2,
  X,
  AlertTriangle,
  Zap,
  DollarSign
} from 'lucide-react';

interface ClaudeTerminalProps {
  onCommandExecute?: (command: string) => void;
  onDangerousCommand?: (command: string) => Promise<boolean>;
  className?: string;
}

interface CommandInterceptor {
  pattern: RegExp;
  riskLevel: 'high' | 'medium' | 'low';
  message: string;
}

// Dangerous command patterns (Gatekeeper Layer)
const DANGEROUS_COMMANDS: CommandInterceptor[] = [
  {
    pattern: /rm\s+-rf\s+/,
    riskLevel: 'high',
    message: 'This will PERMANENTLY DELETE files. Are you absolutely sure?'
  },
  {
    pattern: /git\s+push\s+.*--force/,
    riskLevel: 'high',
    message: 'Force push will rewrite history. This can break others\' work!'
  },
  {
    pattern: /chmod\s+777/,
    riskLevel: 'medium',
    message: 'Setting 777 permissions is a security risk!'
  },
  {
    pattern: /sudo\s+/,
    riskLevel: 'medium',
    message: 'Running with sudo can affect system-wide settings.'
  },
  {
    pattern: /npm\s+publish/,
    riskLevel: 'high',
    message: 'This will publish to NPM registry. Ready to go live?'
  }
];

export const ClaudeTerminal: React.FC<ClaudeTerminalProps> = ({
  onCommandExecute,
  onDangerousCommand,
  className = ''
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const commandBufferRef = useRef<string>('');
  const initializedRef = useRef(false);

  const [isConnected, setIsConnected] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [commandCost, setCommandCost] = useState(0);
  const [tokensUsed, setTokensUsed] = useState(0);
  const [showDangerAlert, setShowDangerAlert] = useState(false);
  const [pendingCommand, setPendingCommand] = useState<string>('');
  const [dangerMessage, setDangerMessage] = useState<string>('');
  const [dangerLevel, setDangerLevel] = useState<'high' | 'medium' | 'low'>('medium');

  // Initialize terminal
  useEffect(() => {
    if (!terminalRef.current) return;

    // Prevent duplicate initialization in React Strict Mode
    if (initializedRef.current) {
      console.log('[Terminal] Already initialized, skipping');
      return;
    }
    initializedRef.current = true;

    // Create terminal instance
    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: '"Cascadia Code", "Fira Code", "Consolas", monospace',
      theme: {
        background: '#0a0a0a',
        foreground: '#e5e7eb',
        cursor: '#818cf8',
        cursorAccent: '#1e1b4b',
        selectionBackground: '#3730a3',
        black: '#1e1b4b',
        red: '#ef4444',
        green: '#10b981',
        yellow: '#f59e0b',
        blue: '#3b82f6',
        magenta: '#a855f7',
        cyan: '#06b6d4',
        white: '#e5e7eb',
        brightBlack: '#374151',
        brightRed: '#f87171',
        brightGreen: '#34d399',
        brightYellow: '#fbbf24',
        brightBlue: '#60a5fa',
        brightMagenta: '#c084fc',
        brightCyan: '#22d3ee',
        brightWhite: '#f3f4f6'
      },
      allowProposedApi: true
    });

    // Add addons
    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    const searchAddon = new SearchAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    term.loadAddon(searchAddon);

    // Open terminal
    term.open(terminalRef.current);
    fitAddon.fit();

    // Store refs
    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Welcome message
    term.writeln('\x1b[1;36m╔═══════════════════════════════════════════════════════════════╗\x1b[0m');
    term.writeln('\x1b[1;36m║\x1b[0m \x1b[1;35m🚀 NXTG-Forge Agentic Command Center\x1b[0m                        \x1b[1;36m║\x1b[0m');
    term.writeln('\x1b[1;36m║\x1b[0m \x1b[36mPowered by Claude Code CLI\x1b[0m                               \x1b[1;36m║\x1b[0m');
    term.writeln('\x1b[1;36m╚═══════════════════════════════════════════════════════════════╝\x1b[0m');
    term.writeln('');
    term.writeln('\x1b[90mConnecting to localhost PTY bridge...\x1b[0m');
    term.writeln('');

    // Connect to WebSocket PTY bridge
    connectToBackend(term);

    // Handle data from terminal (user typing)
    term.onData((data) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        return;
      }

      // Build command buffer for dangerous command checking
      if (data === '\r') {
        // Enter pressed - check for dangerous commands before sending
        const command = commandBufferRef.current.trim();

        const dangerCheck = checkDangerousCommand(command);
        if (dangerCheck) {
          // Block and ask for confirmation
          setDangerMessage(dangerCheck.message);
          setDangerLevel(dangerCheck.riskLevel);
          setPendingCommand(command);
          setShowDangerAlert(true);
          commandBufferRef.current = '';
          return; // Don't send to PTY
        }

        // Clear buffer after Enter
        commandBufferRef.current = '';
      } else if (data === '\x7f') {
        // Backspace - update buffer
        if (commandBufferRef.current.length > 0) {
          commandBufferRef.current = commandBufferRef.current.slice(0, -1);
        }
      } else if (data >= ' ' && data <= '~') {
        // Printable character - add to buffer
        commandBufferRef.current += data;
      }

      // Always send raw input to PTY (let bash handle echo)
      wsRef.current.send(JSON.stringify({
        type: 'input',
        data
      }));
    });

    // Handle window resize
    const handleResize = () => {
      fitAddon.fit();
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'resize',
          cols: term.cols,
          rows: term.rows
        }));
      }
    };

    window.addEventListener('resize', handleResize);

    // Cleanup - Don't cleanup if we're preventing re-init
    return () => {
      window.removeEventListener('resize', handleResize);
      // Don't dispose terminal/websocket since we prevent re-initialization
    };
  }, []);

  const connectToBackend = (term: Terminal) => {
    // Prevent duplicate connections
    if (wsRef.current?.readyState === WebSocket.CONNECTING ||
        wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('[Terminal] WebSocket already connected, skipping');
      return;
    }

    const ws = new WebSocket('ws://localhost:5051/terminal');

    ws.onopen = () => {
      setIsConnected(true);
      term.writeln('\x1b[32m✓ Connected to Claude Code CLI\x1b[0m');
      term.writeln('');
      term.write('$ ');
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case 'output':
          term.write(message.data);
          break;
        case 'cost':
          setCommandCost(message.cost);
          setTokensUsed(message.tokens);
          break;
        case 'diff':
          // Intercept diff output - will be handled by DiffVisualization component
          window.dispatchEvent(new CustomEvent('claude-diff', { detail: message.data }));
          break;
        case 'context':
          // Intercept context info - will be handled by ContextWindow component
          window.dispatchEvent(new CustomEvent('claude-context', { detail: message.data }));
          break;
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      term.writeln('\x1b[31m✗ Connection error\x1b[0m');
    };

    ws.onclose = () => {
      setIsConnected(false);
      term.writeln('');
      term.writeln('\x1b[33m⚠ Disconnected from backend\x1b[0m');

      // Attempt reconnect after 3 seconds
      setTimeout(() => {
        term.writeln('\x1b[90mReconnecting...\x1b[0m');
        connectToBackend(term);
      }, 3000);
    };

    wsRef.current = ws;
  };

  const checkDangerousCommand = (command: string): CommandInterceptor | null => {
    for (const interceptor of DANGEROUS_COMMANDS) {
      if (interceptor.pattern.test(command)) {
        return interceptor;
      }
    }
    return null;
  };

  const executeCommand = (command: string) => {
    if (onCommandExecute) {
      onCommandExecute(command);
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'execute',
        command
      }));
    }
  };

  const handleDangerConfirm = async () => {
    if (onDangerousCommand) {
      const approved = await onDangerousCommand(pendingCommand);
      if (!approved) {
        xtermRef.current?.writeln('\x1b[31m✗ Command cancelled by user\x1b[0m');
        xtermRef.current?.write('$ ');
        setShowDangerAlert(false);
        return;
      }
    }

    executeCommand(pendingCommand);
    setShowDangerAlert(false);
  };

  const handleDangerCancel = () => {
    xtermRef.current?.writeln('\x1b[33m⚠ Command cancelled\x1b[0m');
    xtermRef.current?.write('$ ');
    setShowDangerAlert(false);
  };

  return (
    <div className={`flex flex-col ${isExpanded ? 'fixed inset-4 z-50' : 'relative'} ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900/90 backdrop-blur-sm border-b border-gray-800">
        <div className="flex items-center gap-3">
          <TerminalIcon className="w-5 h-5 text-blue-400" />
          <span className="font-semibold text-sm">Claude Code Terminal</span>
          <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs ${
            isConnected ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
          }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            {isConnected ? 'Live' : 'Disconnected'}
          </div>
        </div>

        {/* Cost Ticker */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs">
            <Zap className="w-3.5 h-3.5 text-yellow-400" />
            <span className="text-gray-400">{tokensUsed.toLocaleString()} tokens</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <DollarSign className="w-3.5 h-3.5 text-green-400" />
            <span className="text-gray-400">${commandCost.toFixed(4)}</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 hover:bg-gray-800 rounded transition-all"
              title={isExpanded ? 'Minimize' : 'Maximize'}
            >
              {isExpanded ? (
                <Minimize2 className="w-4 h-4 text-gray-400" />
              ) : (
                <Maximize2 className="w-4 h-4 text-gray-400" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Terminal */}
      <div
        ref={terminalRef}
        className="flex-1 bg-[#0a0a0a] p-2"
        style={{ minHeight: isExpanded ? 'calc(100vh - 120px)' : '400px' }}
      />

      {/* Danger Alert Modal */}
      {showDangerAlert && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60]">
          <div className="bg-gradient-to-br from-red-900/20 to-red-800/10 border-2 border-red-500 rounded-xl p-6 max-w-md">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-red-400 mb-2">
                  {dangerLevel === 'high' ? '⚠️ HIGH RISK COMMAND' : '⚠️ CAUTION REQUIRED'}
                </h3>
                <p className="text-gray-300 mb-4">{dangerMessage}</p>
                <div className="bg-gray-900/50 p-3 rounded-lg mb-4">
                  <code className="text-sm text-red-300">{pendingCommand}</code>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleDangerConfirm}
                    className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-all"
                  >
                    Execute Anyway
                  </button>
                  <button
                    onClick={handleDangerCancel}
                    className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
