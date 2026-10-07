/**
 * AuthGate — holds the app until the browser has a session with the API.
 *
 * NEXUS: DIRECTIVE-NXTG-20261007-10. Every /api route and WebSocket now needs
 * the per-install access token. The browser exchanges it once for an HttpOnly
 * session cookie (POST /api/auth/login), either from a `?forge_token=` sign-in
 * link or by pasting the token. Automated sessions use a one-time
 * `?forge_login_code=` link instead (POST /api/auth/redeem), so the token never
 * enters a URL (DIRECTIVE-NXTG-20261007-15).
 */

import React, { useCallback, useEffect, useRef, useState } from "react";

type GateState = "checking" | "authenticated" | "signed-out" | "forbidden";

import { takeSignInParams } from "./signin-params";

async function checkSession(): Promise<GateState> {
  const res = await fetch("/api/auth/session", { credentials: "include" });
  if (res.ok) return "authenticated";
  if (res.status === 403) return "forbidden";
  return "signed-out";
}

async function login(token: string): Promise<boolean> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  return res.ok;
}

async function redeem(code: string): Promise<boolean> {
  const res = await fetch("/api/auth/redeem", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  return res.ok;
}


export function AuthGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GateState>("checking");
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  // One sign-in attempt per mount, shared by StrictMode's double effect run, so
  // no session check can race ahead of the redeem/login it depends on.
  const signIn = useRef<Promise<void> | null>(null);

  const refresh = useCallback(async () => {
    try {
      setState(await checkSession());
    } catch {
      setError("The API server is not reachable.");
      setState("signed-out");
    }
  }, []);

  useEffect(() => {
    if (!signIn.current) {
      // Already stripped from the URL by main.tsx; this returns the stashed values.
      const { token: fromUrl, code } = takeSignInParams();
      signIn.current = (async () => {
        if (code) {
          try {
            if (!(await redeem(code))) setError("That one-time sign-in link is used or expired. Create a new one.");
          } catch {
            setError("The API server is not reachable.");
          }
        } else if (fromUrl) {
          try {
            if (!(await login(fromUrl))) setError("That sign-in link is not valid for this install.");
          } catch {
            setError("The API server is not reachable.");
          }
        }
      })();
    }
    void signIn.current.then(refresh);
  }, [refresh]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (await login(token.trim())) {
        setToken("");
        await refresh();
      } else {
        setError("That access token is not valid for this install.");
      }
    } catch {
      setError("The API server is not reachable.");
    }
  };

  if (state === "authenticated") return <>{children}</>;

  if (state === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 text-gray-400" data-testid="auth-gate-checking">
        Connecting…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 p-4" data-testid="auth-gate">
      <form onSubmit={submit} className="w-full max-w-md space-y-4 rounded-xl border border-gray-800 bg-gray-900 p-6 text-gray-200">
        <h1 className="text-lg font-semibold">Sign in to NXTG-Forge</h1>
        {state === "forbidden" ? (
          <p className="text-sm text-amber-400" data-testid="auth-gate-forbidden">
            This address is not an allowed origin for the API server. Open the dashboard at
            http://localhost:5050, or add this origin to ALLOWED_ORIGINS on the server.
          </p>
        ) : (
          <>
            <p className="text-sm text-gray-400">
              The dashboard needs this install's access token. On the machine running Forge, run{" "}
              <code className="rounded bg-gray-800 px-1">npx tsx src/server/auth/print-auth-url.ts</code> and open the
              link it prints, or paste the token from{" "}
              <code className="rounded bg-gray-800 px-1">~/.config/nxtg-forge/ui-secret</code> below.
            </p>
            <input
              type="password"
              autoComplete="off"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Access token"
              className="w-full rounded-md border border-gray-700 bg-gray-950 px-3 py-2 text-sm outline-none focus:border-blue-500"
              data-testid="auth-gate-token"
            />
            <button
              type="submit"
              disabled={token.trim().length === 0}
              className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              data-testid="auth-gate-submit"
            >
              Sign in
            </button>
          </>
        )}
        {error && (
          <p className="text-sm text-red-400" role="alert" data-testid="auth-gate-error">
            {error}
          </p>
        )}
      </form>
    </div>
  );
}
