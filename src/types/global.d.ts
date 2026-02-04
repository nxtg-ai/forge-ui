/**
 * Global type declarations for NXTG-Forge
 */

// Augment Window interface for __forgeWS
declare global {
  interface Window {
    __forgeWS?: WebSocket;
  }

  // Custom DOM events
  interface WindowEventMap {
    'claude-diff': CustomEvent<ClaudeDiffEventDetail>;
    'context-window-update': CustomEvent<ContextWindowUpdateEventDetail>;
  }
}

// Custom event details
export interface ClaudeDiffEventDetail {
  file: string;
  changes: Array<{
    type: 'add' | 'remove' | 'modify';
    line: number;
    content: string;
  }>;
  timestamp: Date;
}

export interface ContextWindowUpdateEventDetail {
  tokenCount: number;
  files: string[];
  context: string;
  timestamp: Date;
}

export {};
