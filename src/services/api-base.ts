/**
 * Where the browser sends API requests: always the page's own origin.
 *
 * NEXUS: DIRECTIVE-NXTG-20261008-01. A production build used to call
 * http://<host>:5051/api directly with credentials, so the session cookie
 * (cookies are not port-scoped) went to whatever process held 5051 on that
 * machine. The serving origin proxies /api, /ws and /terminal to the API
 * server (Vite dev server and `vite preview` alike), so a relative path is
 * correct in every mode.
 *
 * VITE_API_URL may move the API under another path on the same origin
 * (e.g. "/forge/api"). An absolute or protocol-relative value is ignored:
 * the API base never names another origin.
 */

export const DEFAULT_API_BASE = "/api";

export function isSameOriginPath(value: string): boolean {
  return value.startsWith("/") && !value.startsWith("//") && !value.includes("\\");
}

export function apiBase(env: Record<string, unknown> = import.meta.env): string {
  const configured = env.VITE_API_URL;
  if (typeof configured === "string" && isSameOriginPath(configured)) {
    return configured.replace(/\/+$/, "");
  }
  return DEFAULT_API_BASE;
}
