/**
 * The release stage, as surfaces display it (app header, /api/health).
 *
 * NEXUS: DIRECTIVE-NXTG-20261007-11; two axes since DIRECTIVE-NXTG-20261013-17.
 * The root `STAGE` file is the one constant. It records two fields of the
 * ASIF registry's `forge-ui` row (`distribution`, `maturity`); the displayed label is derived from both and
 * never stored (release-stage skill §2). These literals exist because the
 * values are needed in the browser bundle and on the server, and neither build
 * can read a file above `src/`. `.github/scripts/check-stage.sh` (in Quality
 * Gates) and app-stage.test.ts both fail if they differ from `STAGE`.
 */

export const DISTRIBUTIONS = ["internal", "public"] as const;
export type Distribution = (typeof DISTRIBUTIONS)[number];

export const MATURITIES = ["pre-alpha", "dogfood", "alpha", "beta", "rc", "ga"] as const;
export type Maturity = (typeof MATURITIES)[number];

export type StageLabel = "Public preview" | "Alpha" | "Beta" | "Release candidate" | "GA";

/**
 * The outward label for a distribution and maturity. An internal product has
 * no outward label, so this returns null for it.
 */
export function stageLabel(distribution: Distribution, maturity: Maturity): StageLabel | null {
  if (distribution === "internal") return null;
  switch (maturity) {
    case "pre-alpha":
    case "dogfood":
      return "Public preview";
    case "alpha":
      return "Alpha";
    case "beta":
      return "Beta";
    case "rc":
      return "Release candidate";
    case "ga":
      return "GA";
  }
}

export const APP_DISTRIBUTION: Distribution = "public";
export const APP_MATURITY: Maturity = "pre-alpha";
export const APP_STAGE = stageLabel(APP_DISTRIBUTION, APP_MATURITY);
