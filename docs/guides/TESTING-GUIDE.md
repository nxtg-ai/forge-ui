# Testing forge-ui

forge-ui's tests run on [Vitest](https://vitest.dev/) with coverage from `@vitest/coverage-v8`.

## Running tests

```bash
npm test                     # vitest (watch mode in a terminal)
npx vitest run               # one run of the whole suite
npm run test:coverage        # one run with coverage and the thresholds below
npm run test:integration     # files named *.integration.test.ts
npm run test:security        # src/test/security/
npm run test:quality         # src/test/quality/
npx vitest run <path>        # one file or folder
npx vitest run -t "<name>"   # tests whose name matches
```

## Where tests live

Tests sit next to the code in `__tests__/` folders and are named `*.test.ts` or `*.test.tsx` (`vitest.config.ts` includes `src/**/*.{test,spec}.{ts,tsx}`). Integration tests are named `*.integration.test.ts`, mostly under `src/server/**/__tests__/`.

`src/test/` holds the shared parts:

| Folder | Contents |
|---|---|
| `setup.ts` | Global test setup |
| `quality/` | Repo checks: the stage text (`check-stage.test.ts`), frontend health, type safety, security-scan calibration and waivers |
| `security/` | Security tests |
| `e2e/` | Browser tests run with Node and Playwright, not Vitest (see below) |
| `fixtures/`, `mocks/` | Test data and mocks |
| `reports/` | The scripts behind `npm run audit:security` and `npm run audit:quality` |

## Coverage

`vitest.config.ts` sets an 80% minimum for lines, functions, branches and statements. `npm run test:coverage` fails below it.

## Browser end-to-end test

```bash
npx playwright install chromium   # once
node src/test/e2e/terminal-roundtrip.e2e.mjs
```

It starts `npm run dev` with a temporary home folder and token, signs in, opens the Infinity Terminal and checks a command round trip. Ports 5050 and 5051 must be free; the test refuses to start otherwise. It prints one JSON line with `"pass": true` or `false`.

## What CI runs

On every pull request, `.github/workflows/quality-gates.yml` runs:

1. the release-stage check (`.github/scripts/check-stage.sh`);
2. `npm ci`, then `npm run build` (type check and Vite build);
3. `npm run lint` (warnings are reported but do not fail the step);
4. `npx vitest run --coverage`, with three tests excluded that need a running server or local agent files;
5. a coverage check that fails below 60% line coverage, on top of the 80% thresholds Vitest applies;
6. `npm audit --omit=dev`, which fails on any known advisory in a production dependency.

`.github/workflows/terminal-e2e.yml` runs the browser test above.

`npm run quality:gates` runs a local superset of these steps: build, server build, a smoke test of the built server, lint, coverage, and the two audit reports.

## Writing tests

- Every test asserts a specific value. Avoid `toBeDefined()` or `toBeTruthy()` when the value is known.
- Mock only external systems such as the network, child processes or the file system. Prefer the real module for forge-ui's own code.
- Do not skip tests. Fix a flaky test, or open an issue for it.
- Do not swallow errors in `catch` blocks: log them or rethrow.
