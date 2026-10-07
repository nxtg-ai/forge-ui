/**
 * Sign-in values carried in the page URL, taken out of it exactly once.
 *
 * NEXUS: DIRECTIVE-NXTG-20261007-19. `main.tsx` calls takeSignInParams()
 * before analytics or React load, so no later script, beacon or Referer sees
 * `?forge_token=` / `?forge_login_code=`. AuthGate reads the stashed values.
 */

export const TOKEN_PARAM = "forge_token";
export const CODE_PARAM = "forge_login_code";

export interface SignInParams {
  token: string | null;
  code: string | null;
}

let taken: SignInParams | null = null;

/** Read and strip the sign-in params on first call; later calls return the same values. */
export function takeSignInParams(): SignInParams {
  if (taken) return taken;
  const url = new URL(window.location.href);
  taken = { token: url.searchParams.get(TOKEN_PARAM), code: url.searchParams.get(CODE_PARAM) };
  if (url.searchParams.has(TOKEN_PARAM) || url.searchParams.has(CODE_PARAM)) {
    url.searchParams.delete(TOKEN_PARAM);
    url.searchParams.delete(CODE_PARAM);
    window.history.replaceState(window.history.state, "", url.toString());
  }
  return taken;
}

/** Test hook. */
export function resetSignInParamsForTests(): void {
  taken = null;
}

/** Remove sign-in params from any URL string (for analytics payloads). */
export function scrubSignInParams(raw: string): string {
  try {
    const url = new URL(raw, "http://scrub.invalid");
    if (!url.searchParams.has(TOKEN_PARAM) && !url.searchParams.has(CODE_PARAM)) return raw;
    url.searchParams.delete(TOKEN_PARAM);
    url.searchParams.delete(CODE_PARAM);
    return raw.startsWith("http") ? url.toString() : `${url.pathname}${url.search}${url.hash}`;
  } catch {
    // Unparseable: drop the query entirely rather than risk forwarding it.
    return raw.split("?")[0];
  }
}
