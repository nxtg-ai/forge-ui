// @vitest-environment node
/**
 * Security-scan enforcement — FPL ruling NEXUS 621005a, DIRECTIVE-NXTG-20260718-17.
 *
 * The scanner runs REPORT-ONLY because its rule classes are uncalibrated, but
 * "report-only" is exactly the state that decays into a permanently ignored
 * gate. Two things stop that, and both are tested here rather than promised in
 * a comment:
 *
 *   1. It announces itself loudly on every run. This scanner previously exited
 *      0 having scanned nothing; a quiet gate is what made that invisible.
 *   2. The window EXPIRES by version. At v3.5.0 the scanner returns to blocking
 *      on its own, whether or not anyone did the calibration work.
 */

import { describe, it, expect } from "vitest";

import {
  resolveScanEnforcement,
  formatReportOnlyBanner,
  SECURITY_SCAN_BLOCKING_FROM,
  SECURITY_SCAN_CALIBRATED,
} from "../reports/security-audit";

describe("scan enforcement", () => {
  it("is report-only on the current train while uncalibrated", () => {
    const e = resolveScanEnforcement({ version: "3.4.0", calibrated: false });

    expect(e.blocking).toBe(false);
    expect(e.reason).toBe("report-only");
  });

  it("returns to BLOCKING at the expiry version even if calibration never lands", () => {
    // The teeth. Nobody has to remember to re-enable it.
    const e = resolveScanEnforcement({ version: "3.5.0", calibrated: false });

    expect(e.blocking).toBe(true);
    expect(e.reason).toBe("expired");
  });

  it("stays blocking past the expiry version", () => {
    expect(
      resolveScanEnforcement({ version: "3.5.1", calibrated: false }).blocking,
    ).toBe(true);
    expect(
      resolveScanEnforcement({ version: "4.0.0", calibrated: false }).blocking,
    ).toBe(true);
  });

  it("blocks as soon as calibration lands, without waiting for the expiry", () => {
    const e = resolveScanEnforcement({ version: "3.4.1", calibrated: true });

    expect(e.blocking).toBe(true);
    expect(e.reason).toBe("calibrated");
  });

  it("does not expire early on a patch release inside the window", () => {
    expect(
      resolveScanEnforcement({ version: "3.4.9", calibrated: false }).blocking,
    ).toBe(false);
  });

  it("pins the declared expiry so widening the window is a deliberate edit", () => {
    // Bumping this constant should be a visible, reviewed change — not a quiet
    // slide of the deadline.
    expect(SECURITY_SCAN_BLOCKING_FROM).toBe("3.5.0");
    expect(SECURITY_SCAN_CALIBRATED).toBe(false);
  });
});

describe("report-only banner", () => {
  it("states the mode, the finding count, and where the calibration work lives", () => {
    const banner = formatReportOnlyBanner(728, "3.4.0");

    expect(banner).toContain("SECURITY SCAN: REPORT-ONLY");
    expect(banner).toContain("uncalibrated");
    expect(banner).toContain("728 findings");
    expect(banner).toContain("DIRECTIVE-NXTG-20260718-17");
    // The expiry has to be visible to whoever reads the build log.
    expect(banner).toContain("BLOCKING at v3.5.0");
  });

  it("says the findings are not a security posture", () => {
    // Without this the number travels as fact — it is the whole reason the
    // banner exists rather than a bare count.
    expect(formatReportOnlyBanner(1, "3.4.0")).toContain(
      "NOT a security posture",
    );
  });
});
