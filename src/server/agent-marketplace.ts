import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';

/**
 * Agent category classification
 */
export type AgentCategory =
  | 'core'          // orchestrator, planner, builder
  | 'quality'       // guardian, testing, security
  | 'development'   // refactor, api, ui, database
  | 'operations'    // devops, performance, analytics
  | 'governance'    // compliance, oracle, governance-verifier
  | 'intelligence'  // learning, detective, CEO-LOOP
  | 'documentation' // docs, release-sentinel
  | 'integration';  // integration

/**
 * Represents an agent in the marketplace
 */
export interface MarketplaceAgent {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  category: AgentCategory;
  capabilities: string[];
  model: 'sonnet' | 'opus' | 'haiku';
  installPath: string;    // relative to .claude/agents/
  installed: boolean;
  builtIn: boolean;       // true for [AFRG]-* agents
  metadata: {
    createdAt: string;
    updatedAt: string;
    downloads?: number;
    rating?: number;
  };
}

/**
 * Statistics about the agent marketplace
 */
export interface MarketplaceStats {
  totalAgents: number;
  installedAgents: number;
  categoryCounts: Record<AgentCategory, number>;
  modelCounts: Record<'sonnet' | 'opus' | 'haiku', number>;
}

/**
 * Agent Marketplace - Registry and discovery system for NXTG-Forge agents
 */
export class AgentMarketplace {
  private agents: Map<string, MarketplaceAgent> = new Map();
  private agentsDir: string;

  constructor(agentsDir: string = '.claude/agents') {
    this.agentsDir = agentsDir;
  }

  /**
   * Scan the .claude/agents directory and load all installed agents
   */
  async scanInstalled(): Promise<void> {
    this.agents.clear();

    try {
      const files = await fs.readdir(this.agentsDir);
      const agentFiles = files.filter(f => f.endsWith('.md'));

      for (const file of agentFiles) {
        try {
          const agent = await this.parseAgentFile(file);
          this.agents.set(agent.name, agent);
        } catch (error) {
          console.error(`Failed to parse agent file ${file}:`, error);
        }
      }
    } catch (error) {
      throw new Error(`Failed to scan agents directory: ${error}`);
    }
  }

  /**
   * Parse an agent markdown file and extract metadata
   */
  private async parseAgentFile(filename: string): Promise<MarketplaceAgent> {
    const filePath = path.join(this.agentsDir, filename);
    const content = await fs.readFile(filePath, 'utf-8');

    // Parse YAML frontmatter
    const { data } = matter(content);

    // Get file stats for timestamps
    const stats = await fs.stat(filePath);

    // Extract agent name from frontmatter
    const name = data.name as string;
    if (!name) {
      throw new Error(`Agent file ${filename} missing 'name' in frontmatter`);
    }

    // Determine if built-in (AFRG or special agents)
    const builtIn = filename.startsWith('[AFRG]-') ||
                    filename.startsWith('[NXTG-') ||
                    filename === 'forge-oracle.md';

    // Categorize the agent based on name and description
    const category = this.categorizeAgent(name, data.description as string || '');

    // Extract capabilities from description
    const capabilities = this.extractCapabilities(data.description as string || '');

    // Create agent object
    const agent: MarketplaceAgent = {
      id: this.generateId(name),
      name,
      version: '1.0.0', // Default version
      description: (data.description as string || '').trim(),
      author: 'NXTG-Forge',
      category,
      capabilities,
      model: (data.model as 'sonnet' | 'opus' | 'haiku') || 'sonnet',
      installPath: filename,
      installed: true,
      builtIn,
      metadata: {
        createdAt: stats.birthtime.toISOString(),
        updatedAt: stats.mtime.toISOString(),
      }
    };

    return agent;
  }

  /**
   * Categorize an agent based on its name and description
   */
  private categorizeAgent(name: string, description: string): AgentCategory {
    const nameLower = name.toLowerCase();
    const descLower = description.toLowerCase();

    // Core agents
    if (nameLower.includes('orchestrator') || nameLower.includes('planner') || nameLower.includes('builder')) {
      return 'core';
    }

    // Quality agents
    if (nameLower.includes('guardian') || nameLower.includes('testing') || nameLower.includes('security')) {
      return 'quality';
    }

    // Development agents
    if (nameLower.includes('refactor') || nameLower.includes('api') ||
        nameLower.includes('ui') || nameLower.includes('database')) {
      return 'development';
    }

    // Operations agents
    if (nameLower.includes('devops') || nameLower.includes('performance') ||
        nameLower.includes('analytics')) {
      return 'operations';
    }

    // Governance agents
    if (nameLower.includes('compliance') || nameLower.includes('oracle') ||
        nameLower.includes('governance')) {
      return 'governance';
    }

    // Intelligence agents
    if (nameLower.includes('learning') || nameLower.includes('detective') ||
        nameLower.includes('ceo')) {
      return 'intelligence';
    }

    // Documentation agents
    if (nameLower.includes('docs') || nameLower.includes('release') ||
        nameLower.includes('sentinel')) {
      return 'documentation';
    }

    // Integration agents
    if (nameLower.includes('integration')) {
      return 'integration';
    }

    // Default fallback - try to infer from description
    if (descLower.includes('quality') || descLower.includes('test')) {
      return 'quality';
    }
    if (descLower.includes('deploy') || descLower.includes('infrastructure')) {
      return 'operations';
    }
    if (descLower.includes('governance') || descLower.includes('compliance')) {
      return 'governance';
    }

    return 'development'; // Default category
  }

  /**
   * Extract capability keywords from agent description
   */
  private extractCapabilities(description: string): string[] {
    const capabilities: string[] = [];
    const descLower = description.toLowerCase();

    // Common capability keywords
    const keywords = [
      'planning', 'architecture', 'design', 'implementation', 'testing',
      'security', 'quality', 'deployment', 'ci/cd', 'docker', 'monitoring',
      'analytics', 'refactoring', 'api', 'ui', 'database', 'compliance',
      'governance', 'learning', 'analysis', 'documentation', 'release',
      'integration', 'performance', 'optimization', 'debugging'
    ];

    for (const keyword of keywords) {
      if (descLower.includes(keyword)) {
        capabilities.push(keyword);
      }
    }

    // Deduplicate
    return [...new Set(capabilities)];
  }

  /**
   * Generate a unique ID for an agent
   */
  private generateId(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }

  /**
   * Get all agents
   */
  getAll(): MarketplaceAgent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get agents by category
   */
  getByCategory(category: AgentCategory): MarketplaceAgent[] {
    return this.getAll().filter(agent => agent.category === category);
  }

  /**
   * Get agents by capability keyword
   */
  getByCapability(capability: string): MarketplaceAgent[] {
    const capabilityLower = capability.toLowerCase();
    return this.getAll().filter(agent =>
      agent.capabilities.some(cap => cap.toLowerCase().includes(capabilityLower)) ||
      agent.description.toLowerCase().includes(capabilityLower)
    );
  }

  /**
   * Get a single agent by name
   */
  getAgent(name: string): MarketplaceAgent | undefined {
    return this.agents.get(name);
  }

  /**
   * Get marketplace statistics
   */
  getStats(): MarketplaceStats {
    const agents = this.getAll();

    const categoryCounts: Record<AgentCategory, number> = {
      core: 0,
      quality: 0,
      development: 0,
      operations: 0,
      governance: 0,
      intelligence: 0,
      documentation: 0,
      integration: 0,
    };

    const modelCounts: Record<'sonnet' | 'opus' | 'haiku', number> = {
      sonnet: 0,
      opus: 0,
      haiku: 0,
    };

    for (const agent of agents) {
      categoryCounts[agent.category]++;
      modelCounts[agent.model]++;
    }

    return {
      totalAgents: agents.length,
      installedAgents: agents.filter(a => a.installed).length,
      categoryCounts,
      modelCounts,
    };
  }
}
