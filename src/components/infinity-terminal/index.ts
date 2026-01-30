/**
 * Infinity Terminal - Persistent Terminal Sessions
 *
 * Main exports for the Infinity Terminal component system.
 * Provides persistent terminal sessions via Zellij + ttyd with
 * multi-device access and session restoration.
 */

// Main component
export { InfinityTerminal, default as InfinityTerminalDefault } from './InfinityTerminal';

// Mobile components
export { MobileTerminalView } from './MobileTerminalView';
export { DevicePairing } from './DevicePairing';

// Pane management
export { TerminalPaneSwitcher } from './TerminalPaneSwitcher';
export type { TerminalPane } from './TerminalPaneSwitcher';

// Layout components
export { InfinityTerminalLayout } from './layout';

// Session components
export {
  SessionStatusBar,
  SessionRestoreModal,
  SessionPersistenceIndicator,
} from './session';

// Hooks
export {
  useSessionPersistence,
  useResponsiveLayout,
  useTouchGestures,
} from './hooks';

// Types
export type {
  SessionState,
  SessionConfig,
  UseSessionPersistenceReturn,
} from './hooks/useSessionPersistence';

export type {
  Breakpoint,
  LayoutConfig,
  UseResponsiveLayoutReturn,
} from './hooks/useResponsiveLayout';
