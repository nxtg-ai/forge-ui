/**
 * Where the browser sends API requests and opens WebSockets: always the
 * page's own origin.
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
 *
 * NEXUS: DIRECTIVE-NXTG-20261008-03. The same rule for WebSockets: /ws and
 * /terminal are opened on the page's own host and port (a WebSocket handshake
 * carries cookies too). VITE_WS_URL may name another same-origin path for
 * /ws; an absolute value is ignored.
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

export const DEFAULT_WS_PATH = "/ws";
export const TERMINAL_WS_PATH = "/terminal";

type PageLocation = Pick<Location, "protocol" | "host">;

function pageLocation(): PageLocation {
  // Outside a browser there is no page origin; "localhost" with no port is the
  // inert placeholder, never a guess at another server's port.
  return typeof window !== "undefined" ? window.location : { protocol: "http:", host: "localhost" };
}

/** ws(s)://<page host:port><path>: a WebSocket on the page's own origin. */
export function sameOriginWsUrl(path: string, location: PageLocation = pageLocation()): string {
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  const safePath = isSameOriginPath(path) ? path : DEFAULT_WS_PATH;
  return `${protocol}//${location.host}${safePath}`;
}

/** The app's /ws URL, honouring a same-origin VITE_WS_URL path only. */
export function wsUrl(
  env: Record<string, unknown> = import.meta.env,
  location: PageLocation = pageLocation(),
): string {
  const configured = env.VITE_WS_URL;
  const path = typeof configured === "string" && isSameOriginPath(configured) ? configured : DEFAULT_WS_PATH;
  return sameOriginWsUrl(path, location);
}
