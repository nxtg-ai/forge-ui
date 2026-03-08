import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/test/',        // test utilities, mocks, reporters — not production code
        '**/*.d.ts',        // type declarations only — no executable code
        '**/*.config.*',    // build/config files — not runtime logic
        '**/mockData',      // test fixture data — not production code
        'dist/'             // build artifacts — coverage of source, not output
      ],
      all: true,
      reportOnFailure: true,
      thresholds: {
        // CRUCIBLE Gate 8 — raised from 60% per DIRECTIVE-FPL-20260307-01 (2026-03-08)
        // Branch coverage at 74.83% — target 80% requires dedicated branch hardening sprint
        lines: 80,
        functions: 80,
        branches: 75,       // P1 gap: 74.83% actual — target 80% in next sprint
        statements: 80
      }
    },
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['**/node_modules/**', 'dist', '.claude', '.asif'],
    testTimeout: 10000,
    hookTimeout: 10000,
    isolate: true,
    pool: 'threads'
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@core': path.resolve(__dirname, './src/core'),
      '@types': path.resolve(__dirname, './src/types'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@test': path.resolve(__dirname, './src/test'),
      // Mock @sentry/node for tests (not installed as dependency)
      '@sentry/node': path.resolve(__dirname, './src/test/mocks/sentry.ts'),
      // Mock @sentry/react for tests (not installed as dependency)
      '@sentry/react': path.resolve(__dirname, './src/test/mocks/sentry-react.ts')
    }
  }
});
