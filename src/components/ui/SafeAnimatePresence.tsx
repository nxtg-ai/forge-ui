/**
 * Drop-in replacement for framer-motion's AnimatePresence.
 *
 * AnimatePresence uses the `usePresence` hook which has a conditional hook-call
 * pattern that breaks in React 19 (hooks order changes between useMemo/useId).
 * This causes "prevDeps is undefined" crashes.
 *
 * SafeAnimatePresence renders children directly. Enter/animate transitions on
 * motion.div still work; only exit animations are lost (children unmount
 * immediately instead of animating out).
 */
import type { ReactNode } from "react";

interface SafeAnimatePresenceProps {
  children: ReactNode;
  mode?: "wait" | "popLayout" | "sync";
  initial?: boolean;
  onExitComplete?: () => void;
}

export function SafeAnimatePresence({ children }: SafeAnimatePresenceProps) {
  return <>{children}</>;
}

export default SafeAnimatePresence;
