/**
 * First-Run Initialization
 *
 * Ensures users get a fresh, clean experience when they first run NXTG-Forge.
 * This separates PRODUCT files (agents, commands, hooks) from RUNTIME files (vision, state).
 */

import { promises as fs } from 'fs';
import * as path from 'path';

const CLAUDE_DIR = '.claude';
const FORGE_ENABLED_MARKER = path.join(CLAUDE_DIR, 'FORGE-ENABLED');

export async function ensureExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    // Directory might already exist, that's OK
  }
}

export async function copyIfNotExists(src: string, dest: string): Promise<boolean> {
  const exists = await ensureExists(dest);
  if (!exists) {
    await fs.copyFile(src, dest);
    return true; // File was copied
  }
  return false; // File already existed
}

/**
 * Initialize user environment on first run
 * Creates runtime directories and copies templates to user files
 */
export async function initializeUserEnvironment(): Promise<void> {
  // Check if this is first run
  const isFirstRun = !(await ensureExists(FORGE_ENABLED_MARKER));

  if (!isFirstRun) {
    // Already initialized, nothing to do
    return;
  }

  console.log('🎉 Welcome to NXTG-Forge! Setting up your environment...\n');

  // 1. Ensure runtime directories exist
  const runtimeDirs = [
    path.join(CLAUDE_DIR, 'memory'),
    path.join(CLAUDE_DIR, 'checkpoints'),
    path.join(CLAUDE_DIR, 'features'),
    path.join(CLAUDE_DIR, 'reports'),
    path.join(CLAUDE_DIR, 'state'),
  ];

  for (const dir of runtimeDirs) {
    await ensureDir(dir);
  }

  // 2. Copy templates to user files
  const templateCopies: Array<[string, string]> = [
    [
      path.join(CLAUDE_DIR, 'VISION.template.md'),
      path.join(CLAUDE_DIR, 'VISION.md'),
    ],
    [
      path.join(CLAUDE_DIR, 'state.json.template'),
      path.join(CLAUDE_DIR, 'forge', 'state.json'),
    ],
  ];

  let copiedCount = 0;
  for (const [src, dest] of templateCopies) {
    const srcExists = await ensureExists(src);
    if (srcExists) {
      const wasCopied = await copyIfNotExists(src, dest);
      if (wasCopied) {
        copiedCount++;
        console.log(`  ✓ Created ${path.relative(process.cwd(), dest)}`);
      }
    }
  }

  // 3. Create marker file
  await fs.writeFile(
    FORGE_ENABLED_MARKER,
    JSON.stringify({
      initialized: new Date().toISOString(),
      version: '3.0.0',
    }, null, 2)
  );

  console.log('\n✨ NXTG-Forge initialized successfully!');
  console.log('  • Runtime directories created');
  console.log(`  • ${copiedCount} template file(s) copied`);
  console.log('  • Ready to capture your vision!\n');
}

/**
 * Check if the environment has been initialized
 */
export async function isInitialized(): Promise<boolean> {
  return ensureExists(FORGE_ENABLED_MARKER);
}

/**
 * Get initialization info
 */
export async function getInitializationInfo(): Promise<{ initialized: string; version: string } | null> {
  try {
    const content = await fs.readFile(FORGE_ENABLED_MARKER, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}
