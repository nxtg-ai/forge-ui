/**
 * Vitest Test Setup
 * Global test configuration and utilities
 */

import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// Cleanup after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Mock environment variables
process.env.NODE_ENV = 'test';

// Mock file system paths for tests
vi.mock('fs', () => ({
  promises: {
    mkdir: vi.fn(),
    writeFile: vi.fn(),
    readFile: vi.fn(),
    copyFile: vi.fn(),
    appendFile: vi.fn(),
    access: vi.fn(),
    unlink: vi.fn()
  }
}));

// Extend expect matchers
expect.extend({
  toBeValidZodSchema(schema: any, value: any) {
    const result = schema.safeParse(value);
    return {
      pass: result.success,
      message: () => result.success
        ? `Expected value not to match schema`
        : `Expected value to match schema: ${JSON.stringify(result.error?.errors, null, 2)}`
    };
  },

  toHaveNoAnyTypes(filePath: string, content: string) {
    const hasAny = /:\s*any\b/.test(content);
    return {
      pass: !hasAny,
      message: () => hasAny
        ? `File ${filePath} contains 'any' types which are not allowed`
        : `File ${filePath} has proper type safety`
    };
  }
});

// Global test helpers
global.testHelpers = {
  // Mock Date.now for consistent timestamps
  mockDate: (date: string | Date) => {
    const mockDate = new Date(date);
    vi.spyOn(global.Date, 'now').mockReturnValue(mockDate.getTime());
    return () => vi.restoreAllMocks();
  },

  // Wait for async operations
  waitFor: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

  // Create mock file system
  createMockFS: () => ({
    files: new Map<string, string>(),
    writeFile: vi.fn((path, content) => {
      global.testHelpers.createMockFS().files.set(path, content);
      return Promise.resolve();
    }),
    readFile: vi.fn((path) => {
      const content = global.testHelpers.createMockFS().files.get(path);
      return content ? Promise.resolve(content) : Promise.reject(new Error('ENOENT'));
    })
  })
};

// Type declarations
declare global {
  namespace Vi {
    interface Matchers<R = unknown> {
      toBeValidZodSchema(schema: any): R;
      toHaveNoAnyTypes(filePath: string): R;
    }
  }

  var testHelpers: {
    mockDate: (date: string | Date) => () => void;
    waitFor: (ms: number) => Promise<void>;
    createMockFS: () => {
      files: Map<string, string>;
      writeFile: any;
      readFile: any;
    };
  };
}
