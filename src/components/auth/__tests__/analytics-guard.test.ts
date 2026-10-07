/**
 * Analytics is opt-in and its payload never carries a sign-in value.
 * NEXUS: DIRECTIVE-NXTG-20261007-19.
 */
import { describe, it, expect } from "vitest";
import { analyticsEnabled, scrubAnalyticsEvent } from "../analytics-guard";

const TOKEN = "a".repeat(64);
const CODE = "c".repeat(64);
/** The control: does a serialized analytics event contain either secret? */
const leaks = (event: unknown) => {
  const s = JSON.stringify(event);
  return s.includes(TOKEN) || s.includes(CODE);
};

describe("analytics guard", () => {
  it("is off unless the build opts in", () => {
    expect(analyticsEnabled({})).toBe(false);
    expect(analyticsEnabled({ VITE_VERCEL_ANALYTICS: "true" })).toBe(false);
    expect(analyticsEnabled({ VITE_VERCEL_ANALYTICS: "1" })).toBe(true);
  });

  it("control: a raw pageview from a sign-in link DOES leak", () => {
    const raw = { type: "pageview" as const, url: `http://localhost:5050/?forge_token=${TOKEN}&forge_login_code=${CODE}` };
    expect(leaks(raw)).toBe(true);
  });

  it("beforeSend strips the token and code from the payload, and keeps other fields", () => {
    const raw = { type: "pageview" as const, url: `http://localhost:5050/?forge_token=${TOKEN}&forge_login_code=${CODE}&view=x` };
    const sent = scrubAnalyticsEvent(raw);
    expect(leaks(sent)).toBe(false);
    expect(sent).toEqual({ type: "pageview", url: "http://localhost:5050/?view=x" });
  });
});
