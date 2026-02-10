/**
 * Feature Routes - Barrel file
 *
 * Re-exports createFeatureRoutes and validateWSAuthToken for backward compatibility.
 */

export { validateWSAuthToken } from "./auth";

import express from "express";
import type { RouteContext } from "../../route-context";
import { createAuthRoutes } from "./auth";
import { createVisionRoutes } from "./vision";
import { createMcpRoutes } from "./mcp";
import { createStateRoutes } from "./state";
import { createAgentRoutes } from "./agent";
import { createArchitectureRoutes } from "./architecture";
import { createYoloRoutes, createMemoryRoutes } from "./yolo";

export function createFeatureRoutes(ctx: RouteContext): express.Router {
  const router = express.Router();

  router.use("/auth", createAuthRoutes(ctx));
  router.use("/vision", createVisionRoutes(ctx));
  router.use("/mcp", createMcpRoutes(ctx));
  router.use("/state", createStateRoutes(ctx));
  router.use("/agents", createAgentRoutes(ctx));
  router.use("/architecture", createArchitectureRoutes(ctx));
  router.use("/yolo", createYoloRoutes(ctx));
  router.use("/memory", createMemoryRoutes(ctx));

  return router;
}
