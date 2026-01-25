/**
 * Bootstrap System
 * Self-bootstrap infrastructure for NXTG-Forge
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import simpleGit, { SimpleGit } from 'simple-git';
import { z } from 'zod';
import { Logger } from '../utils/logger';
import { StateManager } from './state';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const logger = new Logger('Bootstrap');

// Bootstrap options schema
export const BootstrapOptionsSchema = z.object({
  projectPath: z.string(),
  githubUrl: z.string().url().default('https://github.com/nxtg-ai/forge.git'),
  shallow: z.boolean().default(true),
  branch: z.string().default('main'),
  force: z.boolean().default(false),
  skipDependencies: z.boolean().default(false),
  parallel: z.boolean().default(true)
});

// Bootstrap result schema
export const BootstrapResultSchema = z.object({
  success: z.boolean(),
  projectPath: z.string(),
  installedComponents: z.array(z.string()),
  duration: z.number(), // milliseconds
  warnings: z.array(z.string()),
  errors: z.array(z.string())
});

export type BootstrapOptions = z.infer<typeof BootstrapOptionsSchema>;
export type BootstrapResult = z.infer<typeof BootstrapResultSchema>;

// Component status
interface ComponentStatus {
  name: string;
  installed: boolean;
  version: string;
  path: string;
}

// Installation step
interface InstallationStep {
  name: string;
  execute: () => Promise<void>;
  rollback: () => Promise<void>;
  critical: boolean;
}

export class BootstrapOrchestrator {
  private git: SimpleGit;
  private stateManager: StateManager;
  private completedSteps: string[] = [];
  private rollbackStack: Array<() => Promise<void>> = [];

  constructor(stateManager: StateManager) {
    this.git = simpleGit();
    this.stateManager = stateManager;
  }

  /**
   * Bootstrap the NXTG-Forge system
   */
  async bootstrap(options: BootstrapOptions): Promise<BootstrapResult> {
    const startTime = Date.now();
    const result: BootstrapResult = {
      success: false,
      projectPath: options.projectPath,
      installedComponents: [],
      duration: 0,
      warnings: [],
      errors: []
    };

    try {
      logger.info('Starting NXTG-Forge bootstrap', options);

      // 1. Detect current state
      const currentState = await this.detectCurrentState(options.projectPath);
      logger.info('Current state detected', currentState);

      // 2. Create installation steps
      const steps = this.createInstallationSteps(options, currentState);

      // 3. Execute steps (parallel where possible)
      if (options.parallel) {
        await this.executeParallel(steps, result);
      } else {
        await this.executeSequential(steps, result);
      }

      // 4. Validate installation
      const validation = await this.validateInstallation(options.projectPath);
      if (!validation.valid) {
        result.errors.push(...validation.errors);
        throw new Error('Installation validation failed');
      }

      // 5. Initialize state
      await this.initializeState(options.projectPath);

      // 6. Health check
      const health = await this.performHealthCheck(options.projectPath);
      if (!health.healthy) {
        result.warnings.push(...health.issues);
      }

      result.success = true;
      result.installedComponents = this.completedSteps;
      logger.info('Bootstrap completed successfully');

    } catch (error) {
      logger.error('Bootstrap failed', error);
      result.errors.push(error instanceof Error ? error.message : String(error));

      // Attempt rollback
      if (!options.force) {
        await this.rollback();
      }
    } finally {
      result.duration = Date.now() - startTime;
    }

    return result;
  }

  /**
   * Detect current installation state
   */
  private async detectCurrentState(projectPath: string): Promise<Record<string, any>> {
    const state: Record<string, any> = {
      exists: false,
      hasGit: false,
      hasNodeModules: false,
      hasClaudeDir: false,
      hasConfig: false,
      version: null
    };

    try {
      // Check if directory exists
      const stats = await fs.stat(projectPath);
      state.exists = stats.isDirectory();

      // Check for .git directory
      const gitPath = path.join(projectPath, '.git');
      try {
        await fs.access(gitPath);
        state.hasGit = true;
      } catch {}

      // Check for node_modules
      const nodeModulesPath = path.join(projectPath, 'node_modules');
      try {
        await fs.access(nodeModulesPath);
        state.hasNodeModules = true;
      } catch {}

      // Check for .claude directory
      const claudePath = path.join(projectPath, '.claude');
      try {
        await fs.access(claudePath);
        state.hasClaudeDir = true;
      } catch {}

      // Check for configuration
      const configPath = path.join(projectPath, '.claude', 'forge.config.json');
      try {
        const config = await fs.readFile(configPath, 'utf-8');
        state.hasConfig = true;
        state.config = JSON.parse(config);
        state.version = state.config.version;
      } catch {}

    } catch {
      // Directory doesn't exist
    }

    return state;
  }

  /**
   * Create installation steps based on current state
   */
  private createInstallationSteps(
    options: BootstrapOptions,
    currentState: Record<string, any>
  ): InstallationStep[] {
    const steps: InstallationStep[] = [];

    // Step 1: Clone from GitHub if needed
    if (!currentState.hasGit && !currentState.exists) {
      steps.push({
        name: 'Clone from GitHub',
        execute: async () => {
          await this.cloneRepository(options);
        },
        rollback: async () => {
          await fs.rm(options.projectPath, { recursive: true, force: true });
        },
        critical: true
      });
    }

    // Step 2: Create directory structure
    steps.push({
      name: 'Create directory structure',
      execute: async () => {
        await this.createDirectoryStructure(options.projectPath);
      },
      rollback: async () => {
        // Directory structure rollback handled by git reset
      },
      critical: false
    });

    // Step 3: Install dependencies
    if (!options.skipDependencies) {
      steps.push({
        name: 'Install dependencies',
        execute: async () => {
          await this.installDependencies(options.projectPath);
        },
        rollback: async () => {
          const nodeModulesPath = path.join(options.projectPath, 'node_modules');
          await fs.rm(nodeModulesPath, { recursive: true, force: true });
        },
        critical: false
      });
    }

    // Step 4: Setup Claude integration
    steps.push({
      name: 'Setup Claude integration',
      execute: async () => {
        await this.setupClaudeIntegration(options.projectPath);
      },
      rollback: async () => {
        // Claude integration rollback
      },
      critical: true
    });

    // Step 5: Initialize configuration
    steps.push({
      name: 'Initialize configuration',
      execute: async () => {
        await this.initializeConfiguration(options.projectPath);
      },
      rollback: async () => {
        const configPath = path.join(options.projectPath, '.claude', 'forge.config.json');
        await fs.unlink(configPath).catch(() => {});
      },
      critical: true
    });

    return steps;
  }

  /**
   * Execute steps in parallel where possible
   */
  private async executeParallel(
    steps: InstallationStep[],
    result: BootstrapResult
  ): Promise<void> {
    // Group steps by dependency
    const criticalSteps = steps.filter(s => s.critical);
    const nonCriticalSteps = steps.filter(s => !s.critical);

    // Execute critical steps sequentially
    for (const step of criticalSteps) {
      try {
        logger.info(`Executing: ${step.name}`);
        await step.execute();
        this.completedSteps.push(step.name);
        this.rollbackStack.push(step.rollback);
      } catch (error) {
        logger.error(`Step failed: ${step.name}`, error);
        throw error;
      }
    }

    // Execute non-critical steps in parallel
    const parallelPromises = nonCriticalSteps.map(async (step) => {
      try {
        logger.info(`Executing parallel: ${step.name}`);
        await step.execute();
        this.completedSteps.push(step.name);
        this.rollbackStack.push(step.rollback);
      } catch (error) {
        logger.error(`Step failed: ${step.name}`, error);
        result.warnings.push(`Non-critical step failed: ${step.name}`);
      }
    });

    await Promise.all(parallelPromises);
  }

  /**
   * Execute steps sequentially
   */
  private async executeSequential(
    steps: InstallationStep[],
    result: BootstrapResult
  ): Promise<void> {
    for (const step of steps) {
      try {
        logger.info(`Executing: ${step.name}`);
        await step.execute();
        this.completedSteps.push(step.name);
        this.rollbackStack.push(step.rollback);
      } catch (error) {
        logger.error(`Step failed: ${step.name}`, error);
        if (step.critical) {
          throw error;
        } else {
          result.warnings.push(`Non-critical step failed: ${step.name}`);
        }
      }
    }
  }

  /**
   * Clone repository from GitHub
   */
  private async cloneRepository(options: BootstrapOptions): Promise<void> {
    const cloneOptions: any = {
      '--branch': options.branch
    };

    if (options.shallow) {
      cloneOptions['--depth'] = 1;
    }

    await this.git.clone(options.githubUrl, options.projectPath, cloneOptions);
    logger.info(`Cloned repository from ${options.githubUrl}`);
  }

  /**
   * Create directory structure
   */
  private async createDirectoryStructure(projectPath: string): Promise<void> {
    const directories = [
      '.claude/agents',
      '.claude/commands',
      '.claude/hooks',
      '.claude/skills',
      '.claude/templates',
      '.claude/workflows',
      'src/core',
      'src/types',
      'src/utils',
      'src/plugins',
      'tests/unit',
      'tests/integration',
      'docs/architecture'
    ];

    for (const dir of directories) {
      const fullPath = path.join(projectPath, dir);
      await fs.mkdir(fullPath, { recursive: true });
    }

    logger.info('Directory structure created');
  }

  /**
   * Install dependencies
   */
  private async installDependencies(projectPath: string): Promise<void> {
    const packageJsonPath = path.join(projectPath, 'package.json');

    try {
      await fs.access(packageJsonPath);
      const { stdout, stderr } = await execAsync('npm install', { cwd: projectPath });
      if (stderr) {
        logger.warn('npm install warnings', { stderr });
      }
      logger.info('Dependencies installed');
    } catch (error) {
      logger.error('Failed to install dependencies', error);
      throw error;
    }
  }

  /**
   * Setup Claude integration
   */
  private async setupClaudeIntegration(projectPath: string): Promise<void> {
    const claudeDir = path.join(projectPath, '.claude');

    // Create plugin.json
    const pluginConfig = {
      name: 'nxtg-forge',
      version: '3.0.0',
      description: 'Ultimate Chief of Staff for Developers',
      main: 'dist/index.js',
      bootstrap: 'dist/bootstrap.js',
      agents: [],
      commands: [],
      hooks: {}
    };

    await fs.writeFile(
      path.join(claudeDir, 'plugin.json'),
      JSON.stringify(pluginConfig, null, 2)
    );

    logger.info('Claude integration setup complete');
  }

  /**
   * Initialize configuration
   */
  private async initializeConfiguration(projectPath: string): Promise<void> {
    const configPath = path.join(projectPath, '.claude', 'forge.config.json');

    const config = {
      version: '3.0.0',
      initialized: new Date().toISOString(),
      projectPath,
      settings: {
        automationLevel: 2,
        parallelExecution: true,
        maxConcurrentAgents: 10,
        stateBackupInterval: 300000, // 5 minutes
        healthCheckInterval: 60000 // 1 minute
      }
    };

    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    logger.info('Configuration initialized');
  }

  /**
   * Initialize state
   */
  private async initializeState(projectPath: string): Promise<void> {
    await this.stateManager.initialize(projectPath);
    logger.info('State initialized');
  }

  /**
   * Validate installation
   */
  private async validateInstallation(projectPath: string): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    // Check required files exist
    const requiredFiles = [
      '.claude/plugin.json',
      '.claude/forge.config.json',
      'package.json'
    ];

    for (const file of requiredFiles) {
      const filePath = path.join(projectPath, file);
      try {
        await fs.access(filePath);
      } catch {
        errors.push(`Missing required file: ${file}`);
      }
    }

    // Check required directories exist
    const requiredDirs = [
      '.claude',
      'src',
      'tests'
    ];

    for (const dir of requiredDirs) {
      const dirPath = path.join(projectPath, dir);
      try {
        const stats = await fs.stat(dirPath);
        if (!stats.isDirectory()) {
          errors.push(`Not a directory: ${dir}`);
        }
      } catch {
        errors.push(`Missing required directory: ${dir}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Perform health check
   */
  private async performHealthCheck(projectPath: string): Promise<{
    healthy: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];

    // Check Node.js version
    try {
      const { stdout } = await execAsync('node --version');
      const version = stdout.trim();
      const major = parseInt(version.split('.')[0].substring(1));
      if (major < 18) {
        issues.push(`Node.js version ${version} is below recommended v18+`);
      }
    } catch {
      issues.push('Could not determine Node.js version');
    }

    // Check git status
    try {
      const status = await this.git.cwd(projectPath).status();
      if (status.files.length > 0) {
        issues.push('Git repository has uncommitted changes');
      }
    } catch {
      issues.push('Could not check git status');
    }

    // Check disk space
    try {
      const { stdout } = await execAsync('df -h .', { cwd: projectPath });
      // Parse disk usage and warn if low
      // This is platform-specific, simplified for now
    } catch {
      // Skip disk check on error
    }

    return {
      healthy: issues.length === 0,
      issues
    };
  }

  /**
   * Rollback failed installation
   */
  async rollback(): Promise<void> {
    logger.warn('Rolling back installation...');

    // Execute rollback functions in reverse order
    while (this.rollbackStack.length > 0) {
      const rollbackFn = this.rollbackStack.pop();
      if (rollbackFn) {
        try {
          await rollbackFn();
        } catch (error) {
          logger.error('Rollback step failed', error);
        }
      }
    }

    logger.info('Rollback completed');
  }
}