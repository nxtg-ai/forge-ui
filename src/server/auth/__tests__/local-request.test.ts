// @vitest-environment node
/**
 * isLocalRequest decides whether a request comes from this machine. One-time sign-in codes are
 * minted and redeemed only for such requests (GHSA-r49v-8jjx-w5f9).
 *
 * NEXUS: PRM-NXTG-20261123-14 (forge-pm al:58a1f34cd1178771), GoPMO 1.18.7.5.149.
 */
import { describe, it, expect } from "vitest";
import type { IncomingMessage } from "http";
import { isLocalRequest, isLoopbackAddress } from "../ui-auth";

function req(remoteAddress: string | undefined, headers: Record<string, string | string[]> = {}): IncomingMessage {
  return { socket: { remoteAddress }, headers } as unknown as IncomingMessage;
}

describe("isLoopbackAddress", () => {
  it.each(["127.0.0.1", "127.8.9.10", "::1", "::ffff:127.0.0.1", "::ffff:7f00:1", "0:0:0:0:0:0:0:1"])("accepts %s", (a) => {
    expect(isLoopbackAddress(a)).toBe(true);
  });

  it.each(["192.168.1.50", "10.0.0.7", "0.0.0.0", "::", "::ffff:10.0.0.7", "2001:db8::1", "localhost", "unknown", "", "127.0.0.1.example"])(
    "refuses %s",
    (a) => {
      expect(isLoopbackAddress(a)).toBe(false);
    },
  );
});

describe("isLocalRequest", () => {
  it("accepts a loopback peer with no proxy headers", () => {
    expect(isLocalRequest(req("127.0.0.1"))).toBe(true);
    expect(isLocalRequest(req("::ffff:127.0.0.1"))).toBe(true);
  });

  it("refuses a non-loopback peer, whatever the headers say", () => {
    expect(isLocalRequest(req("192.168.1.50"))).toBe(false);
    expect(isLocalRequest(req("192.168.1.50", { "x-forwarded-for": "127.0.0.1" }))).toBe(false);
  });

  it("refuses when the peer address is unknown", () => {
    expect(isLocalRequest(req(undefined))).toBe(false);
  });

  it("accepts a loopback peer whose recorded addresses are all loopback", () => {
    expect(isLocalRequest(req("127.0.0.1", { "x-forwarded-for": "127.0.0.1" }))).toBe(true);
    expect(isLocalRequest(req("127.0.0.1", { "x-forwarded-for": "::1, 127.0.0.1:51234" }))).toBe(true);
    expect(isLocalRequest(req("127.0.0.1", { forwarded: 'for="[::1]:4711";proto=http, for=127.0.0.1' }))).toBe(true);
  });

  it("refuses when any recorded address is another machine (a spoofed first hop cannot hide it)", () => {
    expect(isLocalRequest(req("127.0.0.1", { "x-forwarded-for": "127.0.0.1,192.168.1.50" }))).toBe(false);
    expect(isLocalRequest(req("127.0.0.1", { "x-forwarded-for": ["127.0.0.1", "10.0.0.7"] }))).toBe(false);
    expect(isLocalRequest(req("127.0.0.1", { "x-real-ip": "10.0.0.7" }))).toBe(false);
    expect(isLocalRequest(req("127.0.0.1", { forwarded: "for=127.0.0.1, for=192.168.1.50" }))).toBe(false);
  });

  it("fails closed on addresses it cannot read", () => {
    for (const value of ["unknown", "_hidden", "", " , ", "not-an-ip"]) {
      expect(isLocalRequest(req("127.0.0.1", { "x-forwarded-for": value }))).toBe(false);
    }
    expect(isLocalRequest(req("127.0.0.1", { forwarded: "for=unknown" }))).toBe(false);
    expect(isLocalRequest(req("127.0.0.1", { forwarded: "proto=http" }))).toBe(false);
  });
});
