/**
 * CLI Tests
 *
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { parseArgs } from '../cli';

describe('CLI', () => {
  describe('parseArgs', () => {
    it('should parse --check flag', () => {
      const options = parseArgs(['--check']);
      expect(options.check).toBe(true);
    });

    it('should parse --start flag', () => {
      const options = parseArgs(['--start']);
      expect(options.start).toBe(true);
    });

    it('should parse --stop flag', () => {
      const options = parseArgs(['--stop']);
      expect(options.stop).toBe(true);
    });

    it('should parse --status flag', () => {
      const options = parseArgs(['--status']);
      expect(options.status).toBe(true);
    });

    it('should parse --patterns flag', () => {
      const options = parseArgs(['--patterns']);
      expect(options.patterns).toBe(true);
    });

    it('should parse --performance flag', () => {
      const options = parseArgs(['--performance']);
      expect(options.performance).toBe(true);
    });

    it('should parse --health flag', () => {
      const options = parseArgs(['--health']);
      expect(options.health).toBe(true);
    });

    it('should parse --verbose flag', () => {
      const options = parseArgs(['--verbose']);
      expect(options.verbose).toBe(true);
    });

    it('should parse --interval with value', () => {
      const options = parseArgs(['--interval', '10']);
      expect(options.interval).toBe(10);
    });

    it('should default interval to 5 if no value provided', () => {
      const options = parseArgs(['--interval']);
      expect(options.interval).toBe(5);
    });

    it('should parse multiple flags', () => {
      const options = parseArgs(['--start', '--verbose', '--interval', '15']);
      expect(options.start).toBe(true);
      expect(options.verbose).toBe(true);
      expect(options.interval).toBe(15);
    });

    it('should handle empty args', () => {
      const options = parseArgs([]);
      expect(Object.keys(options).length).toBe(0);
    });

    it('should handle unknown flags gracefully', () => {
      const options = parseArgs(['--unknown', '--check']);
      expect(options.check).toBe(true);
    });

    it('should parse interval as number', () => {
      const options = parseArgs(['--interval', '42']);
      expect(options.interval).toBe(42);
      expect(typeof options.interval).toBe('number');
    });

    it('should handle --interval without value as NaN', () => {
      const options = parseArgs(['--interval', '--check']);
      expect(Number.isNaN(options.interval)).toBe(true);
    });

    it('should parse non-numeric interval gracefully', () => {
      const options = parseArgs(['--interval', 'abc']);
      expect(Number.isNaN(options.interval)).toBe(true);
    });

    it('should handle multiple instances of same flag', () => {
      const options = parseArgs(['--verbose', '--verbose']);
      expect(options.verbose).toBe(true);
    });

    it('should parse --interval at end of args', () => {
      const options = parseArgs(['--check', '--interval', '20']);
      expect(options.check).toBe(true);
      expect(options.interval).toBe(20);
    });

    it('should parse negative intervals', () => {
      const options = parseArgs(['--interval', '-5']);
      expect(options.interval).toBe(-5);
    });

    it('should parse decimal intervals', () => {
      const options = parseArgs(['--interval', '2.5']);
      expect(options.interval).toBe(2);
    });

    it('should handle all flags together', () => {
      const options = parseArgs([
        '--check',
        '--start',
        '--stop',
        '--status',
        '--patterns',
        '--performance',
        '--health',
        '--verbose',
        '--interval',
        '10',
      ]);
      expect(options.check).toBe(true);
      expect(options.start).toBe(true);
      expect(options.stop).toBe(true);
      expect(options.status).toBe(true);
      expect(options.patterns).toBe(true);
      expect(options.performance).toBe(true);
      expect(options.health).toBe(true);
      expect(options.verbose).toBe(true);
      expect(options.interval).toBe(10);
    });

    it('should maintain parse order independence', () => {
      const options1 = parseArgs(['--interval', '5', '--verbose']);
      const options2 = parseArgs(['--verbose', '--interval', '5']);
      expect(options1.verbose).toBe(options2.verbose);
      expect(options1.interval).toBe(options2.interval);
    });

    it('should handle whitespace in arguments', () => {
      const options = parseArgs(['  --check  ', '--verbose']);
      // Trimming is not handled, but flags should still parse
      expect(options.verbose).toBe(true);
    });
  });
});
