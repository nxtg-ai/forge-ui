import { describe, it, expect, beforeEach } from 'vitest';
import path from 'path';
import { AgentMarketplace, MarketplaceAgent, AgentCategory } from '../../server/agent-marketplace';

describe('AgentMarketplace', () => {
  let marketplace: AgentMarketplace;
  const agentsDir = path.join(process.cwd(), '.claude', 'agents');

  beforeEach(async () => {
    marketplace = new AgentMarketplace(agentsDir);
    await marketplace.scanInstalled();
  });

  describe('scanInstalled', () => {
    it('should find all 22 installed agents', async () => {
      const agents = marketplace.getAll();
      expect(agents).toHaveLength(22);
    });

    it('should parse agent frontmatter correctly', () => {
      const orchestrator = marketplace.getAgent('forge-orchestrator');
      expect(orchestrator).toBeDefined();
      expect(orchestrator?.name).toBe('forge-orchestrator');
      expect(orchestrator?.model).toBe('opus');
      expect(orchestrator?.description).toContain('NXTG-Forge');
    });

    it('should identify built-in agents correctly', () => {
      const agents = marketplace.getAll();
      const builtInAgents = agents.filter(a => a.builtIn);

      // All agents should be built-in for this test
      expect(builtInAgents.length).toBeGreaterThan(0);

      // Check specific built-in agents
      const orchestrator = marketplace.getAgent('forge-orchestrator');
      const guardian = marketplace.getAgent('forge-guardian');
      const oracle = marketplace.getAgent('forge-oracle');

      expect(orchestrator?.builtIn).toBe(true);
      expect(guardian?.builtIn).toBe(true);
      expect(oracle?.builtIn).toBe(true);
    });

    it('should set all agents as installed', () => {
      const agents = marketplace.getAll();
      agents.forEach(agent => {
        expect(agent.installed).toBe(true);
      });
    });

    it('should extract metadata timestamps', () => {
      const agents = marketplace.getAll();
      agents.forEach(agent => {
        expect(agent.metadata.createdAt).toBeTruthy();
        expect(agent.metadata.updatedAt).toBeTruthy();
        // Timestamps should be valid ISO strings
        expect(() => new Date(agent.metadata.createdAt)).not.toThrow();
        expect(() => new Date(agent.metadata.updatedAt)).not.toThrow();
      });
    });
  });

  describe('getByCategory', () => {
    it('should find core agents', () => {
      const coreAgents = marketplace.getByCategory('core');
      expect(coreAgents.length).toBeGreaterThan(0);

      const agentNames = coreAgents.map(a => a.name);
      expect(agentNames).toContain('forge-orchestrator');
      expect(agentNames).toContain('forge-planner');
      expect(agentNames).toContain('forge-builder');
    });

    it('should find quality agents', () => {
      const qualityAgents = marketplace.getByCategory('quality');
      expect(qualityAgents.length).toBeGreaterThan(0);

      const agentNames = qualityAgents.map(a => a.name);
      expect(agentNames).toContain('forge-guardian');
    });

    it('should find development agents', () => {
      const devAgents = marketplace.getByCategory('development');
      expect(devAgents.length).toBeGreaterThan(0);

      const agentNames = devAgents.map(a => a.name);
      // Should include refactor, api, ui, database agents
      const hasDevAgents = agentNames.some(name =>
        name.includes('refactor') ||
        name.includes('api') ||
        name.includes('ui') ||
        name.includes('database')
      );
      expect(hasDevAgents).toBe(true);
    });

    it('should find operations agents', () => {
      const opsAgents = marketplace.getByCategory('operations');
      expect(opsAgents.length).toBeGreaterThan(0);

      const agentNames = opsAgents.map(a => a.name);
      // Should include devops, performance, analytics
      const hasOpsAgents = agentNames.some(name =>
        name.includes('devops') ||
        name.includes('performance') ||
        name.includes('analytics')
      );
      expect(hasOpsAgents).toBe(true);
    });

    it('should find governance agents', () => {
      const govAgents = marketplace.getByCategory('governance');
      expect(govAgents.length).toBeGreaterThan(0);

      const agentNames = govAgents.map(a => a.name);
      // Should include oracle, compliance, governance-verifier
      const hasGovAgents = agentNames.some(name =>
        name.includes('oracle') ||
        name.includes('compliance') ||
        name.includes('governance')
      );
      expect(hasGovAgents).toBe(true);
    });

    it('should find intelligence agents', () => {
      const intelAgents = marketplace.getByCategory('intelligence');
      expect(intelAgents.length).toBeGreaterThan(0);

      const agentNames = intelAgents.map(a => a.name);
      expect(agentNames).toContain('forge-detective');
    });

    it('should find documentation agents', () => {
      const docAgents = marketplace.getByCategory('documentation');
      expect(docAgents.length).toBeGreaterThan(0);

      const agentNames = docAgents.map(a => a.name);
      // Should include docs, release-sentinel
      const hasDocAgents = agentNames.some(name =>
        name.includes('docs') ||
        name.includes('release')
      );
      expect(hasDocAgents).toBe(true);
    });

    it('should find integration agents', () => {
      const integrationAgents = marketplace.getByCategory('integration');
      expect(integrationAgents.length).toBeGreaterThan(0);

      const agentNames = integrationAgents.map(a => a.name);
      const hasIntegrationAgents = agentNames.some(name =>
        name.includes('integration')
      );
      expect(hasIntegrationAgents).toBe(true);
    });
  });

  describe('getByCapability', () => {
    it('should find agents by planning capability', () => {
      const planningAgents = marketplace.getByCapability('planning');
      expect(planningAgents.length).toBeGreaterThan(0);

      const agentNames = planningAgents.map(a => a.name);
      expect(agentNames).toContain('forge-planner');
    });

    it('should find agents by security capability', () => {
      const securityAgents = marketplace.getByCapability('security');
      expect(securityAgents.length).toBeGreaterThan(0);

      const agentNames = securityAgents.map(a => a.name);
      // Should find guardian and/or security agent
      const hasSecurityAgents = agentNames.some(name =>
        name.includes('security') ||
        name.includes('guardian')
      );
      expect(hasSecurityAgents).toBe(true);
    });

    it('should find agents by testing capability', () => {
      const testingAgents = marketplace.getByCapability('testing');
      expect(testingAgents.length).toBeGreaterThan(0);
    });

    it('should find agents by deployment capability', () => {
      const deploymentAgents = marketplace.getByCapability('deployment');
      expect(deploymentAgents.length).toBeGreaterThan(0);
    });

    it('should find agents by analytics capability', () => {
      const analyticsAgents = marketplace.getByCapability('analytics');
      expect(analyticsAgents.length).toBeGreaterThan(0);

      const agentNames = analyticsAgents.map(a => a.name);
      expect(agentNames).toContain('forge-analytics');
    });

    it('should find agents by api capability', () => {
      const apiAgents = marketplace.getByCapability('api');
      expect(apiAgents.length).toBeGreaterThan(0);
    });

    it('should find agents by documentation capability', () => {
      const docAgents = marketplace.getByCapability('documentation');
      expect(docAgents.length).toBeGreaterThan(0);
    });

    it('should support partial capability matches', () => {
      const testAgents = marketplace.getByCapability('test');
      expect(testAgents.length).toBeGreaterThan(0);

      // Should match 'testing' capability
      const hasTestingCapability = testAgents.some(agent =>
        agent.capabilities.some(cap => cap.includes('test'))
      );
      expect(hasTestingCapability).toBe(true);
    });

    it('should be case-insensitive', () => {
      const upperCase = marketplace.getByCapability('SECURITY');
      const lowerCase = marketplace.getByCapability('security');
      expect(upperCase.length).toBe(lowerCase.length);
    });
  });

  describe('getAgent', () => {
    it('should retrieve specific agent by name', () => {
      const orchestrator = marketplace.getAgent('forge-orchestrator');
      expect(orchestrator).toBeDefined();
      expect(orchestrator?.name).toBe('forge-orchestrator');
    });

    it('should return undefined for non-existent agent', () => {
      const nonExistent = marketplace.getAgent('non-existent-agent');
      expect(nonExistent).toBeUndefined();
    });

    it('should return agent with all required properties', () => {
      const guardian = marketplace.getAgent('forge-guardian');
      expect(guardian).toBeDefined();

      if (guardian) {
        expect(guardian.id).toBeTruthy();
        expect(guardian.name).toBeTruthy();
        expect(guardian.version).toBeTruthy();
        expect(guardian.description).toBeTruthy();
        expect(guardian.author).toBeTruthy();
        expect(guardian.category).toBeTruthy();
        expect(Array.isArray(guardian.capabilities)).toBe(true);
        expect(['sonnet', 'opus', 'haiku']).toContain(guardian.model);
        expect(guardian.installPath).toBeTruthy();
        expect(guardian.installed).toBe(true);
        expect(typeof guardian.builtIn).toBe('boolean');
        expect(guardian.metadata).toBeDefined();
        expect(guardian.metadata.createdAt).toBeTruthy();
        expect(guardian.metadata.updatedAt).toBeTruthy();
      }
    });
  });

  describe('getStats', () => {
    it('should return accurate total agent count', () => {
      const stats = marketplace.getStats();
      expect(stats.totalAgents).toBe(22);
    });

    it('should return accurate installed agent count', () => {
      const stats = marketplace.getStats();
      expect(stats.installedAgents).toBe(22);
    });

    it('should have counts for all categories', () => {
      const stats = marketplace.getStats();
      const categories: AgentCategory[] = [
        'core', 'quality', 'development', 'operations',
        'governance', 'intelligence', 'documentation', 'integration'
      ];

      categories.forEach(category => {
        expect(stats.categoryCounts[category]).toBeDefined();
        expect(typeof stats.categoryCounts[category]).toBe('number');
        expect(stats.categoryCounts[category]).toBeGreaterThanOrEqual(0);
      });
    });

    it('should have category counts sum to total', () => {
      const stats = marketplace.getStats();
      const categorySum = Object.values(stats.categoryCounts).reduce((a, b) => a + b, 0);
      expect(categorySum).toBe(stats.totalAgents);
    });

    it('should have counts for all models', () => {
      const stats = marketplace.getStats();
      expect(stats.modelCounts.sonnet).toBeDefined();
      expect(stats.modelCounts.opus).toBeDefined();
      expect(stats.modelCounts.haiku).toBeDefined();

      expect(typeof stats.modelCounts.sonnet).toBe('number');
      expect(typeof stats.modelCounts.opus).toBe('number');
      expect(typeof stats.modelCounts.haiku).toBe('number');
    });

    it('should have model counts sum to total', () => {
      const stats = marketplace.getStats();
      const modelSum = stats.modelCounts.sonnet +
                       stats.modelCounts.opus +
                       stats.modelCounts.haiku;
      expect(modelSum).toBe(stats.totalAgents);
    });

    it('should have at least one agent in each major category', () => {
      const stats = marketplace.getStats();

      // Core categories should have agents
      expect(stats.categoryCounts.core).toBeGreaterThan(0);
      expect(stats.categoryCounts.quality).toBeGreaterThan(0);
      expect(stats.categoryCounts.development).toBeGreaterThan(0);
    });

    it('should have agents using different models', () => {
      const stats = marketplace.getStats();

      // Should have at least one agent using each model
      expect(stats.modelCounts.sonnet).toBeGreaterThan(0);
      expect(stats.modelCounts.opus).toBeGreaterThan(0);
      expect(stats.modelCounts.haiku).toBeGreaterThan(0);
    });
  });

  describe('categorization', () => {
    it('should categorize all agents', () => {
      const agents = marketplace.getAll();
      agents.forEach(agent => {
        expect(agent.category).toBeDefined();
        const validCategories: AgentCategory[] = [
          'core', 'quality', 'development', 'operations',
          'governance', 'intelligence', 'documentation', 'integration'
        ];
        expect(validCategories).toContain(agent.category);
      });
    });

    it('should assign core category to orchestrator, planner, and builder', () => {
      const orchestrator = marketplace.getAgent('forge-orchestrator');
      const planner = marketplace.getAgent('forge-planner');
      const builder = marketplace.getAgent('forge-builder');

      expect(orchestrator?.category).toBe('core');
      expect(planner?.category).toBe('core');
      expect(builder?.category).toBe('core');
    });

    it('should assign quality category to guardian', () => {
      const guardian = marketplace.getAgent('forge-guardian');
      expect(guardian?.category).toBe('quality');
    });

    it('should assign intelligence category to detective', () => {
      const detective = marketplace.getAgent('forge-detective');
      expect(detective?.category).toBe('intelligence');
    });

    it('should assign governance category to oracle', () => {
      const oracle = marketplace.getAgent('forge-oracle');
      expect(oracle?.category).toBe('governance');
    });
  });

  describe('capabilities extraction', () => {
    it('should extract capabilities from descriptions', () => {
      const agents = marketplace.getAll();
      agents.forEach(agent => {
        expect(Array.isArray(agent.capabilities)).toBe(true);
      });
    });

    it('should have relevant capabilities for planner', () => {
      const planner = marketplace.getAgent('forge-planner');
      expect(planner?.capabilities).toBeDefined();

      if (planner) {
        const hasRelevantCapabilities = planner.capabilities.some(cap =>
          cap.includes('planning') ||
          cap.includes('architecture') ||
          cap.includes('design')
        );
        expect(hasRelevantCapabilities).toBe(true);
      }
    });

    it('should have relevant capabilities for guardian', () => {
      const guardian = marketplace.getAgent('forge-guardian');
      expect(guardian?.capabilities).toBeDefined();

      if (guardian) {
        const hasRelevantCapabilities = guardian.capabilities.some(cap =>
          cap.includes('quality') ||
          cap.includes('testing') ||
          cap.includes('security')
        );
        expect(hasRelevantCapabilities).toBe(true);
      }
    });
  });
});
