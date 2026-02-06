/**
 * Runspace Manager
 *
 * Central orchestrator for multi-project management
 * Handles creation, switching, lifecycle, and persistence of runspaces
 */

import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { EventEmitter } from "events";
import { v4 as uuidv4 } from "uuid";
import {
  Runspace,
  RunspaceRegistry,
  CreateRunspaceConfig,
  RunspaceEvent,
  RunspaceBackendType,
  IRunspaceBackend,
} from "./runspace";
import { WSLBackend } from "./backends/wsl-backend";
import { getLogger } from "../utils/logger";

const logger = getLogger('runspace-manager');

const FORGE_HOME = path.join(os.homedir(), ".forge");
const REGISTRY_FILE = path.join(FORGE_HOME, "projects.json");

export class RunspaceManager extends EventEmitter {
  private runspaces = new Map<string, Runspace>();
  private activeRunspaceId: string | null = null;
  private backends = new Map<RunspaceBackendType, IRunspaceBackend>();

  constructor() {
    super();

    // Register available backends
    // WSL is the primary backend for development environments
    // Container and VM backends planned for v3.2+ multi-environment support
    this.backends.set("wsl", new WSLBackend());
  }

  /**
   * Initialize the runspace manager
   * Loads existing runspaces from disk
   */
  async initialize(): Promise<void> {
    logger.info("[RunspaceManager] Initializing...");

    // Ensure .forge directory exists
    await fs.mkdir(FORGE_HOME, { recursive: true });
    await fs.mkdir(path.join(FORGE_HOME, "cache"), { recursive: true });
    await fs.mkdir(path.join(FORGE_HOME, "logs"), { recursive: true });

    // Load registry
    await this.loadRegistry();

    logger.info(`[RunspaceManager] Loaded ${this.runspaces.size} runspaces`);

    // Auto-start runspaces if configured
    for (const runspace of this.runspaces.values()) {
      if (runspace.autoStart) {
        logger.info(`[RunspaceManager] Auto-starting: ${runspace.displayName}`);
        await this.startRunspace(runspace.id).catch((err) => {
          logger.error(`Failed to auto-start ${runspace.displayName}:`, err);
        });
      }
    }
  }

  /**
   * Create a new runspace
   */
  async createRunspace(config: CreateRunspaceConfig): Promise<Runspace> {
    logger.info(`[RunspaceManager] Creating runspace: ${config.name}`);

    // Validate path exists
    try {
      await fs.access(config.path);
    } catch (error) {
      throw new Error(`Path does not exist: ${config.path}`);
    }

    // Check for duplicate name
    for (const runspace of this.runspaces.values()) {
      if (runspace.name === config.name) {
        throw new Error(`Runspace with name "${config.name}" already exists`);
      }
    }

    const runspace: Runspace = {
      id: uuidv4(),
      name: config.name,
      displayName: config.displayName || config.name,
      path: path.resolve(config.path),
      backendType: config.backendType || "wsl",
      status: "stopped",
      vision: config.vision,
      mcpConfig: config.mcpConfig,
      createdAt: new Date(),
      lastActive: new Date(),
      tags: config.tags || [],
      color: config.color || this.generateRandomColor(),
      icon: config.icon,
      autoStart: config.autoStart || false,
    };

    // Create project directory structure
    await this.createProjectStructure(runspace);

    // Store in memory
    this.runspaces.set(runspace.id, runspace);

    // Persist to disk
    await this.saveRegistry();

    // Emit event
    this.emit("runspace.created", { type: "runspace.created", runspace });

    logger.info(`[RunspaceManager] Created runspace: ${runspace.id}`);
    return runspace;
  }

  /**
   * Get a runspace by ID
   */
  getRunspace(id: string): Runspace | undefined {
    return this.runspaces.get(id);
  }

  /**
   * Get all runspaces
   */
  getAllRunspaces(): Runspace[] {
    return Array.from(this.runspaces.values());
  }

  /**
   * Get active runspace
   */
  getActiveRunspace(): Runspace | null {
    if (!this.activeRunspaceId) return null;
    return this.runspaces.get(this.activeRunspaceId) || null;
  }

  /**
   * Switch to a different runspace
   */
  async switchRunspace(id: string): Promise<void> {
    const runspace = this.runspaces.get(id);
    if (!runspace) {
      throw new Error(`Runspace not found: ${id}`);
    }

    logger.info(
      `[RunspaceManager] Switching to runspace: ${runspace.displayName}`,
    );

    // Suspend current runspace if configured
    if (this.activeRunspaceId && this.activeRunspaceId !== id) {
      const current = this.runspaces.get(this.activeRunspaceId);
      if (current?.autoSuspend && current.status === "active") {
        await this.suspendRunspace(this.activeRunspaceId);
      }
    }

    // Set as active
    this.activeRunspaceId = id;
    runspace.lastActive = new Date();

    // Start if not active
    if (runspace.status === "stopped" || runspace.status === "suspended") {
      await this.startRunspace(id);
    }

    await this.saveRegistry();
    this.emit("runspace.activated", {
      type: "runspace.activated",
      runspaceId: id,
    });
  }

  /**
   * Start a runspace
   */
  async startRunspace(id: string): Promise<void> {
    const runspace = this.runspaces.get(id);
    if (!runspace) {
      throw new Error(`Runspace not found: ${id}`);
    }

    if (runspace.status === "active") {
      logger.info(
        `[RunspaceManager] Runspace already active: ${runspace.displayName}`,
      );
      return;
    }

    logger.info(`[RunspaceManager] Starting runspace: ${runspace.displayName}`);

    const backend = this.backends.get(runspace.backendType);
    if (!backend) {
      throw new Error(`Backend not available: ${runspace.backendType}`);
    }

    await backend.start(runspace);
    runspace.status = "active";
    runspace.lastActive = new Date();

    await this.saveRegistry();
    this.emit("runspace.updated", { type: "runspace.updated", runspace });
  }

  /**
   * Stop a runspace
   */
  async stopRunspace(id: string): Promise<void> {
    const runspace = this.runspaces.get(id);
    if (!runspace) {
      throw new Error(`Runspace not found: ${id}`);
    }

    if (runspace.status === "stopped") {
      logger.info(
        `[RunspaceManager] Runspace already stopped: ${runspace.displayName}`,
      );
      return;
    }

    logger.info(`[RunspaceManager] Stopping runspace: ${runspace.displayName}`);

    const backend = this.backends.get(runspace.backendType);
    if (backend) {
      await backend.stop(runspace);
    }

    runspace.status = "stopped";
    runspace.ptySessionId = undefined;
    runspace.wsRoomId = undefined;
    runspace.pid = undefined;

    // If this was active, clear active
    if (this.activeRunspaceId === id) {
      this.activeRunspaceId = null;
    }

    await this.saveRegistry();
    this.emit("runspace.updated", { type: "runspace.updated", runspace });
  }

  /**
   * Suspend a runspace (pause, save state)
   */
  async suspendRunspace(id: string): Promise<void> {
    const runspace = this.runspaces.get(id);
    if (!runspace) {
      throw new Error(`Runspace not found: ${id}`);
    }

    logger.info(
      `[RunspaceManager] Suspending runspace: ${runspace.displayName}`,
    );

    const backend = this.backends.get(runspace.backendType);
    if (backend) {
      await backend.suspend(runspace);
    }

    runspace.status = "suspended";

    await this.saveRegistry();
    this.emit("runspace.suspended", {
      type: "runspace.suspended",
      runspaceId: id,
    });
  }

  /**
   * Delete a runspace
   */
  async deleteRunspace(
    id: string,
    deleteFiles: boolean = false,
  ): Promise<void> {
    const runspace = this.runspaces.get(id);
    if (!runspace) {
      throw new Error(`Runspace not found: ${id}`);
    }

    logger.info(`[RunspaceManager] Deleting runspace: ${runspace.displayName}`);

    // Stop if active
    if (runspace.status === "active") {
      await this.stopRunspace(id);
    }

    // Delete project files if requested
    if (deleteFiles) {
      const projectForgeDir = path.join(runspace.path, ".forge");
      await fs.rm(projectForgeDir, { recursive: true, force: true });
    }

    // Remove from memory
    this.runspaces.delete(id);

    // Clear active if this was active
    if (this.activeRunspaceId === id) {
      this.activeRunspaceId = null;
    }

    await this.saveRegistry();
    this.emit("runspace.deleted", { type: "runspace.deleted", runspaceId: id });
  }

  /**
   * Update runspace configuration
   */
  async updateRunspace(
    id: string,
    updates: Partial<Runspace>,
  ): Promise<Runspace> {
    const runspace = this.runspaces.get(id);
    if (!runspace) {
      throw new Error(`Runspace not found: ${id}`);
    }

    Object.assign(runspace, updates);
    await this.saveRegistry();
    this.emit("runspace.updated", { type: "runspace.updated", runspace });

    return runspace;
  }

  /**
   * Get health status of a runspace
   */
  async getRunspaceHealth(id: string) {
    const runspace = this.runspaces.get(id);
    if (!runspace) {
      throw new Error(`Runspace not found: ${id}`);
    }

    const backend = this.backends.get(runspace.backendType);
    if (!backend) {
      throw new Error(`Backend not found for type: ${runspace.backendType}`);
    }

    return await backend.getHealth(runspace);
  }

  /**
   * Create project directory structure
   */
  private async createProjectStructure(runspace: Runspace): Promise<void> {
    const forgeDir = path.join(runspace.path, ".forge");

    await fs.mkdir(forgeDir, { recursive: true });
    await fs.mkdir(path.join(forgeDir, "history"), { recursive: true });
    await fs.mkdir(path.join(forgeDir, "history/sessions"), {
      recursive: true,
    });

    // Save initial vision if provided
    if (runspace.vision) {
      await fs.writeFile(
        path.join(forgeDir, "vision.json"),
        JSON.stringify(runspace.vision, null, 2),
      );
    }

    // Save MCP config if provided
    if (runspace.mcpConfig) {
      await fs.writeFile(
        path.join(forgeDir, "mcp-config.json"),
        JSON.stringify(runspace.mcpConfig, null, 2),
      );
    }

    // Create .gitignore
    const gitignore = `# NXTG-Forge
history/
*.log
cache/
`;
    await fs.writeFile(path.join(forgeDir, ".gitignore"), gitignore);
  }

  /**
   * Load registry from disk
   */
  private async loadRegistry(): Promise<void> {
    try {
      const data = await fs.readFile(REGISTRY_FILE, "utf-8");
      const registry: RunspaceRegistry = JSON.parse(data);

      // Convert date strings back to Date objects
      for (const runspace of registry.runspaces) {
        runspace.createdAt = new Date(runspace.createdAt);
        runspace.lastActive = new Date(runspace.lastActive);
        if (runspace.state?.lastUpdate) {
          runspace.state.lastUpdate = new Date(runspace.state.lastUpdate);
        }
        this.runspaces.set(runspace.id, runspace);
      }

      this.activeRunspaceId = registry.activeRunspaceId;
    } catch (error: unknown) {
      const isNodeError = error instanceof Error && "code" in error;
      if (!isNodeError || (error as NodeJS.ErrnoException).code !== "ENOENT") {
        logger.error("[RunspaceManager] Error loading registry:", error);
      }
      // File doesn't exist yet, that's fine
    }
  }

  /**
   * Save registry to disk
   */
  private async saveRegistry(): Promise<void> {
    const registry: RunspaceRegistry = {
      runspaces: Array.from(this.runspaces.values()),
      activeRunspaceId: this.activeRunspaceId,
      version: "1.0",
      lastSync: new Date(),
    };

    await fs.writeFile(REGISTRY_FILE, JSON.stringify(registry, null, 2));
  }

  /**
   * Generate a random color for visual identification
   */
  private generateRandomColor(): string {
    const colors = [
      "#8B5CF6", // Purple
      "#3B82F6", // Blue
      "#10B981", // Green
      "#F59E0B", // Orange
      "#EF4444", // Red
      "#EC4899", // Pink
      "#14B8A6", // Teal
      "#F97316", // Orange-red
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  /**
   * Cleanup on shutdown
   */
  async shutdown(): Promise<void> {
    logger.info("[RunspaceManager] Shutting down...");

    // Stop all active runspaces
    for (const [id, runspace] of this.runspaces.entries()) {
      if (runspace.status === "active") {
        await this.stopRunspace(id);
      }
    }

    await this.saveRegistry();
  }
}
