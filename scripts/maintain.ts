#!/usr/bin/env tsx

/**
 * NXTG-Forge Maintenance CLI
 *
 * Standalone script for running maintenance commands.
 * Can be run via: npm run maintain -- --check
 */

import { maintenanceCLI, parseArgs } from '../src/maintenance/cli';

// Parse command line arguments
const args = process.argv.slice(2);
const options = parseArgs(args);

// Run the CLI
maintenanceCLI(options).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
