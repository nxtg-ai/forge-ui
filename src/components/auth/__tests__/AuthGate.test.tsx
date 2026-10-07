/**
 * AuthGate — the app renders only after the browser holds an API session.
 * NEXUS: DIRECTIVE-NXTG-20261007-10.
 */
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AuthGate } from "../AuthGate";
import { resetSignInParamsForTests } from "../signin-params";

function response(status: number): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => ({}) } as Response;
}

describe("AuthGate", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    window.history.replaceState(null, "", "/");
    resetSignInParamsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the sign-in form, not the app, when the session is missing", async () => {
    fetchMock.mockResolvedValue(response(401));
    render(<AuthGate><div data-testid="app">app</div></AuthGate>);

    expect(await screen.findByTestId("auth-gate")).toBeInTheDocument();
    expect(screen.queryByTestId("app")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/session", { credentials: "include" });
  });

  it("renders the app when a session already exists", async () => {
    fetchMock.mockResolvedValue(response(200));
    render(<AuthGate><div data-testid="app">app</div></AuthGate>);
    expect(await screen.findByTestId("app")).toBeInTheDocument();
  });

  it("signs in from a ?forge_token= link and strips the token from the URL", async () => {
    window.history.replaceState(null, "", "/?forge_token=abc123&view=terminal");
    fetchMock.mockImplementation(async (url: string) => (url === "/api/auth/login" ? response(200) : response(200)));

    render(<AuthGate><div data-testid="app">app</div></AuthGate>);

    expect(await screen.findByTestId("app")).toBeInTheDocument();
    const loginCall = fetchMock.mock.calls.find(([url]) => url === "/api/auth/login");
    expect(loginCall?.[1]).toMatchObject({ method: "POST", credentials: "include", body: JSON.stringify({ token: "abc123" }) });
    expect(window.location.search).toBe("?view=terminal");
  });

  it("redeems a one-time ?forge_login_code= link, strips it, and never calls /login", async () => {
    window.history.replaceState(null, "", "/?forge_login_code=c0de&view=terminal");
    fetchMock.mockResolvedValue(response(200));

    render(<AuthGate><div data-testid="app">app</div></AuthGate>);

    expect(await screen.findByTestId("app")).toBeInTheDocument();
    const redeemCall = fetchMock.mock.calls.find(([url]) => url === "/api/auth/redeem");
    expect(redeemCall?.[1]).toMatchObject({ method: "POST", credentials: "include", body: JSON.stringify({ code: "c0de" }) });
    expect(fetchMock.mock.calls.some(([url]) => url === "/api/auth/login")).toBe(false);
    expect(window.location.search).toBe("?view=terminal");
  });

  it("under StrictMode, redeems once and checks the session only after redeeming", async () => {
    window.history.replaceState(null, "", "/?forge_login_code=c0de");
    const order: string[] = [];
    let releaseRedeem: () => void = () => {};
    fetchMock.mockImplementation((url: string) => {
      order.push(url);
      if (url === "/api/auth/redeem") {
        return new Promise<Response>((r) => (releaseRedeem = () => r(response(200))));
      }
      return Promise.resolve(response(200));
    });

    render(
      <React.StrictMode>
        <AuthGate><div data-testid="app">app</div></AuthGate>
      </React.StrictMode>,
    );
    await waitFor(() => expect(order).toContain("/api/auth/redeem"));
    expect(order).not.toContain("/api/auth/session");
    releaseRedeem();

    expect(await screen.findByTestId("app")).toBeInTheDocument();
    expect(order.filter((u) => u === "/api/auth/redeem")).toHaveLength(1);
    expect(order.indexOf("/api/auth/session")).toBeGreaterThan(order.indexOf("/api/auth/redeem"));
  });

  it("says a spent or expired one-time link must be recreated", async () => {
    window.history.replaceState(null, "", "/?forge_login_code=spent");
    fetchMock.mockResolvedValue(response(401));

    render(<AuthGate><div data-testid="app">app</div></AuthGate>);

    expect(await screen.findByTestId("auth-gate-error")).toHaveTextContent("used or expired");
    expect(window.location.search).toBe("");
  });

  it("submits a pasted token and reports a rejected one", async () => {
    fetchMock.mockImplementation(async (url: string) => (url === "/api/auth/login" ? response(401) : response(401)));
    render(<AuthGate><div data-testid="app">app</div></AuthGate>);

    fireEvent.change(await screen.findByTestId("auth-gate-token"), { target: { value: "wrong" } });
    fireEvent.click(screen.getByTestId("auth-gate-submit"));

    expect(await screen.findByTestId("auth-gate-error")).toHaveTextContent("not valid for this install");
    expect(screen.queryByTestId("app")).not.toBeInTheDocument();
  });

  it("explains a forbidden origin", async () => {
    fetchMock.mockResolvedValue(response(403));
    render(<AuthGate><div data-testid="app">app</div></AuthGate>);
    expect(await screen.findByTestId("auth-gate-forbidden")).toHaveTextContent("ALLOWED_ORIGINS");
  });

  it("does not render the app while the session check is pending", async () => {
    let resolveSession: (r: Response) => void = () => {};
    fetchMock.mockReturnValue(new Promise<Response>((r) => (resolveSession = r)));
    render(<AuthGate><div data-testid="app">app</div></AuthGate>);
    expect(screen.getByTestId("auth-gate-checking")).toBeInTheDocument();
    expect(screen.queryByTestId("app")).not.toBeInTheDocument();
    resolveSession(response(200));
    await waitFor(() => expect(screen.getByTestId("app")).toBeInTheDocument());
  });
});
