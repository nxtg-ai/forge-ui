/**
 * The release stage, as surfaces display it (app header, /api/health).
 *
 * NEXUS: DIRECTIVE-NXTG-20261007-11. The root `STAGE` file is the one
 * constant. This literal exists because the value is needed in the browser
 * bundle and on the server, and neither build can read a file above `src/`.
 * `.github/scripts/check-stage.sh` (in Quality Gates) and app-stage.test.ts
 * both fail if it differs from `STAGE`.
 */

export const RELEASE_STAGES = ["internal", "dogfood", "alpha", "beta", "rc", "ga"] as const;
export type ReleaseStage = (typeof RELEASE_STAGES)[number];

export const APP_STAGE: ReleaseStage = "internal";
