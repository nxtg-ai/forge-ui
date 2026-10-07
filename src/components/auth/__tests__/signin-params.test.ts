/**
 * Sign-in params leave the URL once, before anything else reads it.
 * NEXUS: DIRECTIVE-NXTG-20261007-19.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { resetSignInParamsForTests, scrubSignInParams, takeSignInParams } from "../signin-params";

describe("takeSignInParams", () => {
  beforeEach(() => {
    resetSignInParamsForTests();
    window.history.replaceState(null, "", "/");
  });

  it("returns the token and code and strips both from the URL synchronously", () => {
    window.history.replaceState(null, "", "/?forge_token=tok&forge_login_code=c0de&view=terminal#x");
    expect(takeSignInParams()).toEqual({ token: "tok", code: "c0de" });
    expect(window.location.search).toBe("?view=terminal");
    expect(window.location.hash).toBe("#x");
  });

  it("returns the stashed values on later calls, after the URL is clean", () => {
    window.history.replaceState(null, "", "/?forge_login_code=c0de");
    takeSignInParams();
    expect(window.location.search).toBe("");
    expect(takeSignInParams()).toEqual({ token: null, code: "c0de" });
  });

  it("leaves a URL without sign-in params untouched", () => {
    window.history.replaceState(null, "", "/?view=terminal");
    expect(takeSignInParams()).toEqual({ token: null, code: null });
    expect(window.location.search).toBe("?view=terminal");
  });
});

describe("scrubSignInParams", () => {
  it("removes both params from absolute and relative URLs and keeps the rest", () => {
    expect(scrubSignInParams("http://localhost:5050/?forge_token=abc&view=x")).toBe("http://localhost:5050/?view=x");
    expect(scrubSignInParams("/?forge_login_code=c0de")).toBe("/");
    expect(scrubSignInParams("/dash?view=x")).toBe("/dash?view=x");
  });
});
