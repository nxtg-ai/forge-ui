/**
 * NXTG Forge - Entry Point
 */

export { Forge } from './forge';
export { StateManager } from './state';
export { CheckpointManager, TaskCheckpoint } from './core/checkpoint-manager';
export { Logger } from './utils';
export * from './types';

// CLI entry point
if (require.main === module) {
  console.log('🚀 NXTG Forge v3.0.0');
  console.log('Run ./init.sh to initialize in your project');
}