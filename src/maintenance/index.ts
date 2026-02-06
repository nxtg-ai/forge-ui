/**
 * Maintenance Module
 *
 * Autonomous maintenance system for NXTG-Forge.
 * Handles pattern scanning, performance analysis, health monitoring, and self-improvement.
 */

export { MaintenanceDaemon, getMaintenanceDaemon, startMaintenanceDaemon, stopMaintenanceDaemon } from './daemon';
export { PatternScanner, type PatternScan } from './pattern-scanner';
export { PerformanceAnalyzer, type AgentMetrics } from './performance-analyzer';
export { HealthMonitor, type HealthCheck, type HealthAction } from './health-monitor';
export { LearningDatabase } from './learning-database';
export { UpdateApplier, type SkillUpdate, createUpdateProposal } from './update-applier';
export { maintenanceCLI, parseArgs } from './cli';
