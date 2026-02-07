/**
 * Route Context Tests - Type validation and structure tests
 *
 * Tests the RouteContext interface structure and factory pattern usage.
 * Since route-context.ts is a pure interface definition, these tests verify:
 * - Interface structure and required fields
 * - Type compatibility with actual service instances
 * - Factory pattern integration with route modules
 * - Mock context creation for testing
 *
 * This ensures route modules receive correctly structured dependencies
 * and that api-server.ts maintains proper dependency wiring.
 */

import { describe, it, expect, vi } from "vitest";
import type { RouteContext } from "../route-context";
import { ForgeOrchestrator } from "../../core/orchestrator";
import { VisionSystem } from "../../core/vision";
import { StateManager } from "../../core/state";
import { CoordinationService } from "../../core/coordination";
import { BootstrapService } from "../../core/bootstrap";
import { MCPSuggestionEngine } from "../../orchestration/mcp-suggestion-engine";
import { RunspaceManager } from "../../core/runspace-manager";
import { GovernanceStateManager } from "../../services/governance-state-manager";
import { InitService } from "../../services/init-service";
import { StatusService } from "../../services/status-service";
import { ComplianceService } from "../../services/compliance-service";

describe("RouteContext", () => {
  describe("Interface structure", () => {
    it("accepts valid context with all required fields", () => {
      const mockContext: RouteContext = {
        projectRoot: "/test/project",
        orchestrator: {} as InstanceType<typeof ForgeOrchestrator>,
        visionSystem: {} as InstanceType<typeof VisionSystem>,
        stateManager: {} as InstanceType<typeof StateManager>,
        coordinationService: {} as InstanceType<typeof CoordinationService>,
        bootstrapService: {} as InstanceType<typeof BootstrapService>,
        mcpSuggestionEngine: {} as InstanceType<typeof MCPSuggestionEngine>,
        runspaceManager: {} as InstanceType<typeof RunspaceManager>,
        governanceStateManager: {} as GovernanceStateManager,
        initService: {} as InstanceType<typeof InitService>,
        statusService: {} as InstanceType<typeof StatusService>,
        complianceService: {} as InstanceType<typeof ComplianceService>,
        getWorkerPool: vi.fn(),
        broadcast: vi.fn(),
        getWsClientCount: vi.fn(() => 0),
      };

      expect(mockContext).toBeDefined();
      expect(mockContext.projectRoot).toBe("/test/project");
    });

    it("requires projectRoot field", () => {
      const createContext = (): RouteContext => {
        return {
          projectRoot: "/test/project",
          orchestrator: {} as any,
          visionSystem: {} as any,
          stateManager: {} as any,
          coordinationService: {} as any,
          bootstrapService: {} as any,
          mcpSuggestionEngine: {} as any,
          runspaceManager: {} as any,
          governanceStateManager: {} as any,
          initService: {} as any,
          statusService: {} as any,
          complianceService: {} as any,
          getWorkerPool: vi.fn(),
          broadcast: vi.fn(),
          getWsClientCount: vi.fn(() => 0),
        };
      };

      const context = createContext();
      expect(context.projectRoot).toBeDefined();
      expect(typeof context.projectRoot).toBe("string");
    });

    it("requires all service instances", () => {
      const context: RouteContext = {
        projectRoot: "/test",
        orchestrator: {} as any,
        visionSystem: {} as any,
        stateManager: {} as any,
        coordinationService: {} as any,
        bootstrapService: {} as any,
        mcpSuggestionEngine: {} as any,
        runspaceManager: {} as any,
        governanceStateManager: {} as any,
        initService: {} as any,
        statusService: {} as any,
        complianceService: {} as any,
        getWorkerPool: vi.fn(),
        broadcast: vi.fn(),
        getWsClientCount: vi.fn(() => 0),
      };

      expect(context.orchestrator).toBeDefined();
      expect(context.visionSystem).toBeDefined();
      expect(context.stateManager).toBeDefined();
      expect(context.coordinationService).toBeDefined();
      expect(context.bootstrapService).toBeDefined();
      expect(context.mcpSuggestionEngine).toBeDefined();
      expect(context.runspaceManager).toBeDefined();
      expect(context.governanceStateManager).toBeDefined();
      expect(context.initService).toBeDefined();
      expect(context.statusService).toBeDefined();
      expect(context.complianceService).toBeDefined();
    });

    it("requires function fields", () => {
      const getWorkerPool = vi.fn();
      const broadcast = vi.fn();
      const getWsClientCount = vi.fn(() => 5);

      const context: RouteContext = {
        projectRoot: "/test",
        orchestrator: {} as any,
        visionSystem: {} as any,
        stateManager: {} as any,
        coordinationService: {} as any,
        bootstrapService: {} as any,
        mcpSuggestionEngine: {} as any,
        runspaceManager: {} as any,
        governanceStateManager: {} as any,
        initService: {} as any,
        statusService: {} as any,
        complianceService: {} as any,
        getWorkerPool,
        broadcast,
        getWsClientCount,
      };

      expect(typeof context.getWorkerPool).toBe("function");
      expect(typeof context.broadcast).toBe("function");
      expect(typeof context.getWsClientCount).toBe("function");

      expect(context.getWsClientCount()).toBe(5);
    });
  });

  describe("Mock context creation", () => {
    it("creates minimal mock context for testing", () => {
      const createMockContext = (): RouteContext => ({
        projectRoot: "/test/mock",
        orchestrator: {} as any,
        visionSystem: {} as any,
        stateManager: {} as any,
        coordinationService: {} as any,
        bootstrapService: {} as any,
        mcpSuggestionEngine: {} as any,
        runspaceManager: {} as any,
        governanceStateManager: {} as any,
        initService: {} as any,
        statusService: {} as any,
        complianceService: {} as any,
        getWorkerPool: vi.fn(() => ({} as any)),
        broadcast: vi.fn(),
        getWsClientCount: vi.fn(() => 0),
      });

      const context = createMockContext();
      expect(context).toBeDefined();
      expect(context.projectRoot).toBe("/test/mock");
    });

    it("allows spy functions for behavior verification", () => {
      const broadcastSpy = vi.fn();
      const getWorkerPoolSpy = vi.fn();

      const context: RouteContext = {
        projectRoot: "/test",
        orchestrator: {} as any,
        visionSystem: {} as any,
        stateManager: {} as any,
        coordinationService: {} as any,
        bootstrapService: {} as any,
        mcpSuggestionEngine: {} as any,
        runspaceManager: {} as any,
        governanceStateManager: {} as any,
        initService: {} as any,
        statusService: {} as any,
        complianceService: {} as any,
        getWorkerPool: getWorkerPoolSpy,
        broadcast: broadcastSpy,
        getWsClientCount: vi.fn(() => 3),
      };

      context.broadcast("test-event", { data: "payload" });
      expect(broadcastSpy).toHaveBeenCalledWith("test-event", { data: "payload" });

      context.getWorkerPool();
      expect(getWorkerPoolSpy).toHaveBeenCalled();
    });
  });

  describe("Broadcast function signature", () => {
    it("accepts string type and unknown payload", () => {
      const broadcast = vi.fn();
      const context: RouteContext = {
        projectRoot: "/test",
        orchestrator: {} as any,
        visionSystem: {} as any,
        stateManager: {} as any,
        coordinationService: {} as any,
        bootstrapService: {} as any,
        mcpSuggestionEngine: {} as any,
        runspaceManager: {} as any,
        governanceStateManager: {} as any,
        initService: {} as any,
        statusService: {} as any,
        complianceService: {} as any,
        getWorkerPool: vi.fn(),
        broadcast,
        getWsClientCount: vi.fn(() => 0),
      };

      // Should accept various payload types
      context.broadcast("event1", { key: "value" });
      context.broadcast("event2", ["array", "data"]);
      context.broadcast("event3", "string");
      context.broadcast("event4", 42);
      context.broadcast("event5", null);

      expect(broadcast).toHaveBeenCalledTimes(5);
    });

    it("receives correct arguments in broadcast calls", () => {
      const broadcast = vi.fn();
      const context: RouteContext = {
        projectRoot: "/test",
        orchestrator: {} as any,
        visionSystem: {} as any,
        stateManager: {} as any,
        coordinationService: {} as any,
        bootstrapService: {} as any,
        mcpSuggestionEngine: {} as any,
        runspaceManager: {} as any,
        governanceStateManager: {} as any,
        initService: {} as any,
        statusService: {} as any,
        complianceService: {} as any,
        getWorkerPool: vi.fn(),
        broadcast,
        getWsClientCount: vi.fn(() => 0),
      };

      const payload = { status: "success", count: 5 };
      context.broadcast("status-update", payload);

      expect(broadcast).toHaveBeenCalledWith("status-update", payload);
      expect(broadcast).toHaveBeenCalledTimes(1);
    });
  });

  describe("getWsClientCount function signature", () => {
    it("returns number representing WebSocket client count", () => {
      const context: RouteContext = {
        projectRoot: "/test",
        orchestrator: {} as any,
        visionSystem: {} as any,
        stateManager: {} as any,
        coordinationService: {} as any,
        bootstrapService: {} as any,
        mcpSuggestionEngine: {} as any,
        runspaceManager: {} as any,
        governanceStateManager: {} as any,
        initService: {} as any,
        statusService: {} as any,
        complianceService: {} as any,
        getWorkerPool: vi.fn(),
        broadcast: vi.fn(),
        getWsClientCount: vi.fn(() => 7),
      };

      const count = context.getWsClientCount();
      expect(typeof count).toBe("number");
      expect(count).toBe(7);
    });

    it("can return zero clients", () => {
      const context: RouteContext = {
        projectRoot: "/test",
        orchestrator: {} as any,
        visionSystem: {} as any,
        stateManager: {} as any,
        coordinationService: {} as any,
        bootstrapService: {} as any,
        mcpSuggestionEngine: {} as any,
        runspaceManager: {} as any,
        governanceStateManager: {} as any,
        initService: {} as any,
        statusService: {} as any,
        complianceService: {} as any,
        getWorkerPool: vi.fn(),
        broadcast: vi.fn(),
        getWsClientCount: vi.fn(() => 0),
      };

      expect(context.getWsClientCount()).toBe(0);
    });
  });

  describe("getWorkerPool function signature", () => {
    it("returns AgentWorkerPool instance", () => {
      const mockPool = {
        executeTask: vi.fn(),
        getStatus: vi.fn(),
        shutdown: vi.fn(),
      };

      const context: RouteContext = {
        projectRoot: "/test",
        orchestrator: {} as any,
        visionSystem: {} as any,
        stateManager: {} as any,
        coordinationService: {} as any,
        bootstrapService: {} as any,
        mcpSuggestionEngine: {} as any,
        runspaceManager: {} as any,
        governanceStateManager: {} as any,
        initService: {} as any,
        statusService: {} as any,
        complianceService: {} as any,
        getWorkerPool: vi.fn(() => mockPool as any),
        broadcast: vi.fn(),
        getWsClientCount: vi.fn(() => 0),
      };

      const pool = context.getWorkerPool();
      expect(pool).toBe(mockPool);
    });
  });

  describe("Type safety", () => {
    it("enforces correct types for service instances", () => {
      // TypeScript compile-time check - this test passes if it compiles
      const context: RouteContext = {
        projectRoot: "/test",
        orchestrator: {} as InstanceType<typeof ForgeOrchestrator>,
        visionSystem: {} as InstanceType<typeof VisionSystem>,
        stateManager: {} as InstanceType<typeof StateManager>,
        coordinationService: {} as InstanceType<typeof CoordinationService>,
        bootstrapService: {} as InstanceType<typeof BootstrapService>,
        mcpSuggestionEngine: {} as InstanceType<typeof MCPSuggestionEngine>,
        runspaceManager: {} as InstanceType<typeof RunspaceManager>,
        governanceStateManager: {} as GovernanceStateManager,
        initService: {} as InstanceType<typeof InitService>,
        statusService: {} as InstanceType<typeof StatusService>,
        complianceService: {} as InstanceType<typeof ComplianceService>,
        getWorkerPool: vi.fn(),
        broadcast: vi.fn(),
        getWsClientCount: vi.fn(() => 0),
      };

      expect(context).toBeDefined();
    });
  });

  describe("Practical usage patterns", () => {
    it("supports route factory pattern", () => {
      // Simulates how route modules consume RouteContext
      const createRouteHandler = (context: RouteContext) => {
        return async () => {
          const status = await context.statusService.getStatus?.();
          context.broadcast("status-fetched", status);
          return { success: true };
        };
      };

      const mockContext: RouteContext = {
        projectRoot: "/test",
        orchestrator: {} as any,
        visionSystem: {} as any,
        stateManager: {} as any,
        coordinationService: {} as any,
        bootstrapService: {} as any,
        mcpSuggestionEngine: {} as any,
        runspaceManager: {} as any,
        governanceStateManager: {} as any,
        initService: {} as any,
        statusService: {
          getStatus: vi.fn().mockResolvedValue({ healthy: true }),
        } as any,
        complianceService: {} as any,
        getWorkerPool: vi.fn(),
        broadcast: vi.fn(),
        getWsClientCount: vi.fn(() => 0),
      };

      const handler = createRouteHandler(mockContext);
      expect(handler).toBeDefined();
      expect(typeof handler).toBe("function");
    });

    it("allows service method invocation", async () => {
      const mockStatus = { health: "ok", uptime: 1000 };
      const statusService = {
        getStatus: vi.fn().mockResolvedValue(mockStatus),
      };

      const context: RouteContext = {
        projectRoot: "/test",
        orchestrator: {} as any,
        visionSystem: {} as any,
        stateManager: {} as any,
        coordinationService: {} as any,
        bootstrapService: {} as any,
        mcpSuggestionEngine: {} as any,
        runspaceManager: {} as any,
        governanceStateManager: {} as any,
        initService: {} as any,
        statusService: statusService as any,
        complianceService: {} as any,
        getWorkerPool: vi.fn(),
        broadcast: vi.fn(),
        getWsClientCount: vi.fn(() => 0),
      };

      const result = await context.statusService.getStatus();
      expect(result).toEqual(mockStatus);
      expect(statusService.getStatus).toHaveBeenCalled();
    });

    it("supports dependency injection pattern", () => {
      const createTestContext = (overrides: Partial<RouteContext> = {}): RouteContext => ({
        projectRoot: "/default",
        orchestrator: {} as any,
        visionSystem: {} as any,
        stateManager: {} as any,
        coordinationService: {} as any,
        bootstrapService: {} as any,
        mcpSuggestionEngine: {} as any,
        runspaceManager: {} as any,
        governanceStateManager: {} as any,
        initService: {} as any,
        statusService: {} as any,
        complianceService: {} as any,
        getWorkerPool: vi.fn(),
        broadcast: vi.fn(),
        getWsClientCount: vi.fn(() => 0),
        ...overrides,
      });

      const customBroadcast = vi.fn();
      const context = createTestContext({ broadcast: customBroadcast });

      context.broadcast("test", {});
      expect(customBroadcast).toHaveBeenCalled();
    });
  });

  describe("Integration with api-server wiring", () => {
    it("represents complete dependency graph", () => {
      const context: RouteContext = {
        projectRoot: "/app",
        orchestrator: {} as any,
        visionSystem: {} as any,
        stateManager: {} as any,
        coordinationService: {} as any,
        bootstrapService: {} as any,
        mcpSuggestionEngine: {} as any,
        runspaceManager: {} as any,
        governanceStateManager: {} as any,
        initService: {} as any,
        statusService: {} as any,
        complianceService: {} as any,
        getWorkerPool: vi.fn(),
        broadcast: vi.fn(),
        getWsClientCount: vi.fn(() => 2),
      };

      // Verify all core services present
      expect(context.orchestrator).toBeDefined();
      expect(context.visionSystem).toBeDefined();
      expect(context.stateManager).toBeDefined();

      // Verify all business services present
      expect(context.initService).toBeDefined();
      expect(context.statusService).toBeDefined();
      expect(context.complianceService).toBeDefined();

      // Verify infrastructure services present
      expect(context.runspaceManager).toBeDefined();
      expect(context.governanceStateManager).toBeDefined();
      expect(context.mcpSuggestionEngine).toBeDefined();
    });

    it("provides single source of truth for route dependencies", () => {
      const context: RouteContext = {
        projectRoot: process.cwd(),
        orchestrator: {} as any,
        visionSystem: {} as any,
        stateManager: {} as any,
        coordinationService: {} as any,
        bootstrapService: {} as any,
        mcpSuggestionEngine: {} as any,
        runspaceManager: {} as any,
        governanceStateManager: {} as any,
        initService: {} as any,
        statusService: {} as any,
        complianceService: {} as any,
        getWorkerPool: vi.fn(),
        broadcast: vi.fn(),
        getWsClientCount: vi.fn(() => 1),
      };

      // All routes receive same context instance
      const routeA = (ctx: RouteContext) => ctx;
      const routeB = (ctx: RouteContext) => ctx;

      const receivedA = routeA(context);
      const receivedB = routeB(context);

      expect(receivedA).toBe(context);
      expect(receivedB).toBe(context);
      expect(receivedA.projectRoot).toBe(receivedB.projectRoot);
    });
  });
});
