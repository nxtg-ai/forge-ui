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
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        'dist/'
      ],
      all: true,
      reportOnFailure: true,
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 60,
        statements: 60
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
