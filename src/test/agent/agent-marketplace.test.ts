import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import { AgentMarketplace, type AgentCategory } from '../../server/agent-marketplace';

/**
 * Agent Marketplace Integration Tests
 *
 * These tests validate the AgentMarketplace class using inline mock agent
 * files written to a temp directory. Local agent files were removed in the
 * v3 duplicate cleanup (agents live in forge-plugin only).
 */

const MOCK_AGENT_FILES = [
  {
    filename: '[AFRG]-orchestrator.md',
    content: `---
name: forge-orchestrator
description: Plans and coordinates multi-agent workflows for NXTG-Forge feature delivery
model: opus
color: purple
tools: Read, Glob, Grep, Bash, Task
---
# Forge Orchestrator

You coordinate multi-agent workflows and manage complex feature delivery.
`
  },
  {
    filename: '[AFRG]-planner.md',
    content: `---
name: forge-planner
description: Analyzes requirements and creates execution plans with architecture and planning focus
model: opus
color: blue
tools: Read, Glob, Grep, Bash, Task
---
# Forge Planner

You analyze requirements and design execution plans for feature delivery.
`
  },
  {
    filename: '[AFRG]-builder.md',
    content: `---
name: forge-builder
description: Implements features and writes production-quality code with comprehensive tests
model: sonnet
color: green
tools: Read, Write, Edit, Bash, Glob, Grep, Task
---
# Forge Builder

You implement features following SOLID principles.
`
  },
  {
    filename: '[AFRG]-guardian.md',
    content: `---
name: forge-guardian
description: Validates code quality through comprehensive testing, security audits, and quality assurance
model: sonnet
color: red
tools: Read, Bash, Glob, Grep
---
# Forge Guardian

You enforce quality standards and run security checks.
`
  },
  {
    filename: '[AFRG]-detective.md',
    content: `---
name: forge-detective
description: Investigates bugs and performs root cause analysis with learning capabilities
model: sonnet
color: amber
tools: Read, Glob, Grep, Bash
---
# Forge Detective

You investigate bugs and perform root cause analysis.
`
  },
  {
    filename: '[AFRG]-refactor.md',
    content: `---
name: forge-refactor
description: Refactors code for improved maintainability and design patterns
model: sonnet
color: teal
tools: Read, Write, Edit, Glob, Grep
---
# Forge Refactor

You improve code quality through systematic refactoring.
`
  },
  {
    filename: '[AFRG]-api.md',
    content: `---
name: forge-api
description: Designs and implements REST and GraphQL API endpoints
model: sonnet
color: indigo
tools: Read, Write, Edit, Bash, Glob, Grep
---
# Forge API

You design and implement API endpoints with proper error handling.
`
  },
  {
    filename: '[AFRG]-devops.md',
    content: `---
name: forge-devops
description: Manages CI/CD pipelines, deployment automation, and infrastructure
model: haiku
color: orange
tools: Read, Bash, Glob, Grep
---
# Forge DevOps

You manage deployment pipelines and infrastructure.
`
  },
  {
    filename: '[AFRG]-analytics.md',
    content: `---
name: forge-analytics
description: Analyzes metrics, generates reports, and provides analytics insights
model: haiku
color: cyan
tools: Read, Glob, Grep, Bash
---
# Forge Analytics

You analyze project metrics and generate insight reports.
`
  },
  {
    filename: 'forge-oracle.md',
    content: `---
name: forge-oracle
description: Governance oracle that tracks compliance, health metrics, and quality governance
model: sonnet
color: magenta
tools: Read, Glob, Grep, Bash
---
# Forge Oracle

You track project governance and compliance metrics.
`
  },
  {
    filename: '[AFRG]-docs.md',
    content: `---
name: forge-docs
description: Generates and maintains documentation with release management
model: haiku
color: lime
tools: Read, Write, Edit, Glob, Grep
---
# Forge Docs

You generate and maintain project documentation.
`
  },
  {
    filename: '[AFRG]-integration.md',
    content: `---
name: forge-integration
description: Manages system integration testing and cross-service compatibility
model: sonnet
color: pink
tools: Read, Bash, Glob, Grep
---
# Forge Integration

You manage integration testing across services.
`
  },
  {
    filename: '[AFRG]-security.md',
    content: `---
name: forge-security
description: Performs security scanning and vulnerability analysis
model: sonnet
color: red
tools: Read, Bash, Glob, Grep
---
# Forge Security

You perform security audits and vulnerability scanning.
`
  },
  {
    filename: '[AFRG]-testing.md',
    content: `---
name: forge-testing
description: Creates and runs comprehensive test suites for quality assurance and testing
model: sonnet
color: yellow
tools: Read, Write, Edit, Bash, Glob, Grep
---
# Forge Testing

You write and run comprehensive test suites.
`
  },
  {
    filename: '[AFRG]-ui.md',
    content: `---
name: forge-ui
description: Designs and implements user interface components with responsive design
model: sonnet
color: blue
tools: Read, Write, Edit, Glob, Grep
---
# Forge UI

You design and implement UI components.
`
  },
  {
    filename: '[AFRG]-database.md',
    content: `---
name: forge-database
description: Designs database schemas and manages data persistence
model: sonnet
color: green
tools: Read, Write, Edit, Bash, Glob, Grep
---
# Forge Database

You design database schemas and manage persistence.
`
  },
  {
    filename: '[AFRG]-performance.md',
    content: `---
name: forge-performance
description: Analyzes and optimizes application performance metrics
model: haiku
color: orange
tools: Read, Bash, Glob, Grep
---
# Forge Performance

You analyze and optimize performance.
`
  },
  {
    filename: '[AFRG]-compliance.md',
    content: `---
name: forge-compliance
description: Ensures compliance with regulations and governance standards
model: sonnet
color: magenta
tools: Read, Glob, Grep, Bash
---
# Forge Compliance

You enforce compliance standards.
`
  },
  {
    filename: '[AFRG]-governance-verifier.md',
    content: `---
name: forge-governance-verifier
description: Verifies governance state and policy adherence
model: sonnet
tools: Read, Glob, Grep
---
# Forge Governance Verifier

You verify governance policies are followed.
`
  },
  {
    filename: '[AFRG]-learning.md',
    content: `---
name: forge-learning
description: Captures lessons learned and improves knowledge base with learning analytics
model: haiku
color: cyan
tools: Read, Write, Edit, Glob, Grep
---
# Forge Learning

You capture and organize project knowledge.
`
  },
  {
    filename: '[AFRG]-release-sentinel.md',
    content: `---
name: forge-release-sentinel
description: Monitors release readiness and manages release documentation
model: haiku
color: lime
tools: Read, Glob, Grep, Bash
---
# Forge Release Sentinel

You monitor release readiness and track release artifacts.
`
  },
  {
    filename: '[NXTG-CEO]-LOOP.md',
    content: `---
name: NXTG-CEO-LOOP
description: Executive decision loop agent for strategic decisions and project coordination
model: opus
color: purple
tools: Read, Glob, Grep, Bash, Task
---
# NXTG CEO Loop

You handle strategic decisions and executive coordination.
`
  },
];

describe('AgentMarketplace', () => {
  let marketplace: AgentMarketplace;
  let agentsDir: string;

  beforeAll(async () => {
    agentsDir = await fs.mkdtemp(path.join(os.tmpdir(), 'marketplace-test-'));
    for (const agent of MOCK_AGENT_FILES) {
      await fs.writeFile(path.join(agentsDir, agent.filename), agent.content, 'utf-8');
    }
  });

  afterAll(async () => {
    await fs.rm(agentsDir, { recursive: true, force: true });
  });

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

      expect(builtInAgents.length).toBeGreaterThan(0);

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

      expect(stats.categoryCounts.core).toBeGreaterThan(0);
      expect(stats.categoryCounts.quality).toBeGreaterThan(0);
      expect(stats.categoryCounts.development).toBeGreaterThan(0);
    });

    it('should have agents using different models', () => {
      const stats = marketplace.getStats();

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
