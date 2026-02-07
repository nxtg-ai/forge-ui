/**
 * Route Context - Shared dependencies for all route modules
 *
 * Each route module exports a factory function that receives this context.
 * This avoids hardcoding service references inside route files and
 * keeps api-server.ts as the single source of dependency wiring.
 */

import { ForgeOrchestrator } from "../core/orchestrator";
import { VisionSystem } from "../core/vision";
import { StateManager } from "../core/state";
import { CoordinationService } from "../core/coordination";
import { BootstrapService } from "../core/bootstrap";
import { MCPSuggestionEngine } from "../orchestration/mcp-suggestion-engine";
import { RunspaceManager } from "../core/runspace-manager";
import { GovernanceStateManager } from "../services/governance-state-manager";
import { InitService } from "../services/init-service";
import { StatusService } from "../services/status-service";
import { ComplianceService } from "../services/compliance-service";
import type { AgentWorkerPool } from "./workers";

export interface RouteContext {
  projectRoot: string;
  orchestrator: InstanceType<typeof ForgeOrchestrator>;
  visionSystem: InstanceType<typeof VisionSystem>;
  stateManager: InstanceType<typeof StateManager>;
  coordinationService: InstanceType<typeof CoordinationService>;
  bootstrapService: InstanceType<typeof BootstrapService>;
  mcpSuggestionEngine: InstanceType<typeof MCPSuggestionEngine>;
  runspaceManager: InstanceType<typeof RunspaceManager>;
  governanceStateManager: GovernanceStateManager;
  initService: InstanceType<typeof InitService>;
  statusService: InstanceType<typeof StatusService>;
  complianceService: InstanceType<typeof ComplianceService>;
  getWorkerPool: () => AgentWorkerPool;
  broadcast: (type: string, payload: unknown) => void;
  getWsClientCount: () => number;
}
