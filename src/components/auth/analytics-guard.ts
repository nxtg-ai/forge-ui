/**
 * Vercel Web Analytics: opt-in, and never carrying a sign-in value.
 *
 * NEXUS: DIRECTIVE-NXTG-20261007-19. forge-ui is a local-first developer tool.
 * Vercel Analytics only reports on a Vercel deployment; in a local install it
 * just requests /_vercel/insights/script.js from the local server. So it is
 * OFF unless the build sets VITE_VERCEL_ANALYTICS=1 (e.g. a hosted demo).
 * When on, beforeSend strips forge_token / forge_login_code from every event.
 */

import { scrubSignInParams } from "./signin-params";

export function analyticsEnabled(env: Record<string, unknown> = import.meta.env): boolean {
  return env.VITE_VERCEL_ANALYTICS === "1";
}

/** beforeSend for @vercel/analytics: same event, URL without sign-in params. */
export function scrubAnalyticsEvent<T extends { url: string }>(event: T): T {
  return { ...event, url: scrubSignInParams(event.url) };
}
