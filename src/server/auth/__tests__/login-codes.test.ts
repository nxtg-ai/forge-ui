/**
 * One-time sign-in codes. NEXUS: DIRECTIVE-NXTG-20261007-15.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  CODE_TTL_MS,
  MAX_OUTSTANDING_CODES,
  mintLoginCode,
  redeemLoginCode,
  resetLoginCodesForTests,
} from "../login-codes";

describe("login codes", () => {
  beforeEach(() => resetLoginCodesForTests());

  it("mints a 64-hex code that redeems exactly once", () => {
    const minted = mintLoginCode(1_000)!;
    expect(minted.code).toMatch(/^[0-9a-f]{64}$/);
    expect(minted.expiresIn).toBe(CODE_TTL_MS);
    expect(redeemLoginCode(minted.code, 1_001)).toBe(true);
    expect(redeemLoginCode(minted.code, 1_002)).toBe(false);
  });

  it("refuses an expired code, and spends it anyway", () => {
    const { code } = mintLoginCode(0)!;
    expect(redeemLoginCode(code, CODE_TTL_MS)).toBe(false);
    expect(redeemLoginCode(code, 1)).toBe(false);
  });

  it("refuses unknown, malformed and non-string codes", () => {
    expect(redeemLoginCode("0".repeat(64))).toBe(false);
    expect(redeemLoginCode("not-a-code")).toBe(false);
    expect(redeemLoginCode(undefined)).toBe(false);
    expect(redeemLoginCode({ code: "x" })).toBe(false);
  });

  it("caps outstanding codes, and frees slots as codes expire", () => {
    for (let i = 0; i < MAX_OUTSTANDING_CODES; i++) expect(mintLoginCode(0)).not.toBeNull();
    expect(mintLoginCode(0)).toBeNull();
    expect(mintLoginCode(CODE_TTL_MS + 1)).not.toBeNull();
  });

  it("never returns the same code twice", () => {
    const a = mintLoginCode()!.code;
    const b = mintLoginCode()!.code;
    expect(a).not.toBe(b);
  });
});
