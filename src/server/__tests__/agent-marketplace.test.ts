/**
 * Agent Marketplace Tests
 * Comprehensive tests for agent discovery, parsing, categorization, and statistics
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AgentMarketplace, type AgentCategory } from '../agent-marketplace';

// Create hoisted mocks before imports
const mockReaddir = vi.hoisted(() => vi.fn());
const mockReadFile = vi.hoisted(() => vi.fn());
const mockStat = vi.hoisted(() => vi.fn());

// Mock fs/promises module
vi.mock('fs/promises', () => ({
  default: {
    readdir: mockReaddir,
    readFile: mockReadFile,
    stat: mockStat,
  },
}));

// Mock gray-matter
vi.mock('gray-matter', () => ({
  default: vi.fn((content: string) => {
    // Parse frontmatter from markdown content
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
      return { data: {}, content };
    }

    const yamlContent = frontmatterMatch[1];
    const data: Record<string, string> = {};

    yamlContent.split('\n').forEach(line => {
      const match = line.match(/^(\w+):\s*(.+)$/);
      if (match) {
        data[match[1]] = match[2].replace(/^["'](.*)["']$/, '$1');
      }
    });

    return { data, content: content.replace(/^---\n[\s\S]*?\n---\n/, '') };
  }),
}));

describe('AgentMarketplace', () => {
  let marketplace: AgentMarketplace;
  const mockAgentsDir = '/mock/.claude/agents';

  beforeEach(() => {
    marketplace = new AgentMarketplace(mockAgentsDir);
    vi.clearAllMocks();
  });

  describe('scanInstalled', () => {
    it('scans directory and loads agent files', async () => {
      const mockFiles = ['[AFRG]-orchestrator.md', '[AFRG]-builder.md', 'custom-agent.md'];
      mockReaddir.mockResolvedValue(mockFiles as any);

      mockReadFile.mockImplementation(async (path: any) => {
        const filename = path.split('/').pop();
        if (filename === '[AFRG]-orchestrator.md') {
          return `---
name: orchestrator
description: Plans and coordinates multi-agent workflows
model: opus
---
# Orchestrator Agent`;
        }
        if (filename === '[AFRG]-builder.md') {
          return `---
name: builder
description: Implements features and writes code
model: sonnet
---
# Builder Agent`;
        }
        if (filename === 'custom-agent.md') {
          return `---
name: custom-testing-agent
description: Custom agent for testing quality
model: haiku
---
# Custom Agent`;
        }
        throw new Error('File not found');
      });

      mockStat.mockResolvedValue({
        birthtime: new Date('2024-01-01'),
        mtime: new Date('2024-01-15'),
      } as any);

      await marketplace.scanInstalled();

      const agents = marketplace.getAll();
      expect(agents).toHaveLength(3);
      expect(agents.map(a => a.name)).toContain('orchestrator');
      expect(agents.map(a => a.name)).toContain('builder');
      expect(agents.map(a => a.name)).toContain('custom-testing-agent');
    });

    it('filters non-markdown files', async () => {
      const mockFiles = ['agent.md', 'README.txt', 'config.json', 'agent2.md'];
      mockReaddir.mockResolvedValue(mockFiles as any);

      mockReadFile.mockImplementation(async (path: any) => {
        const filename = path.split('/').pop().replace('.md', '');
        return `---
name: ${filename}
description: Test agent
model: sonnet
---
# Test`;
      });

      mockStat.mockResolvedValue({
        birthtime: new Date('2024-01-01'),
        mtime: new Date('2024-01-15'),
      } as any);

      await marketplace.scanInstalled();

      const agents = marketplace.getAll();
      expect(agents).toHaveLength(2); // Only .md files
      expect(mockReadFile).toHaveBeenCalledTimes(2);
    });

    it('skips invalid agent files without crashing', async () => {
      const mockFiles = ['valid.md', 'invalid.md'];
      mockReaddir.mockResolvedValue(mockFiles as any);

      mockReadFile.mockImplementation(async (path: any) => {
        if (path.includes('valid.md')) {
          return `---
name: valid-agent
description: Valid agent
model: sonnet
---
# Valid`;
        }
        // invalid.md has no name in frontmatter
        return `---
description: Invalid agent missing name
---
# Invalid`;
      });

      mockStat.mockResolvedValue({
        birthtime: new Date('2024-01-01'),
        mtime: new Date('2024-01-15'),
      } as any);

      await marketplace.scanInstalled();

      const agents = marketplace.getAll();
      expect(agents).toHaveLength(1);
      expect(agents[0].name).toBe('valid-agent');
    });

    it('throws error if directory cannot be read', async () => {
      mockReaddir.mockRejectedValue(new Error('ENOENT: directory not found'));

      await expect(marketplace.scanInstalled()).rejects.toThrow(
        'Failed to scan agents directory'
      );
    });

    it('clears existing agents before scanning', async () => {
      const mockFiles = ['agent1.md'];
      mockReaddir.mockResolvedValue(mockFiles as any);
      mockReadFile.mockResolvedValue(`---
name: agent1
description: First agent
model: sonnet
---
# Agent`);
      mockStat.mockResolvedValue({
        birthtime: new Date('2024-01-01'),
        mtime: new Date('2024-01-15'),
      } as any);

      await marketplace.scanInstalled();
      expect(marketplace.getAll()).toHaveLength(1);

      // Scan again with different file
      mockReaddir.mockResolvedValue(['agent2.md'] as any);
      mockReadFile.mockResolvedValue(`---
name: agent2
description: Second agent
model: sonnet
---
# Agent`);

      await marketplace.scanInstalled();

      const agents = marketplace.getAll();
      expect(agents).toHaveLength(1);
      expect(agents[0].name).toBe('agent2');
    });
  });

  describe('parseAgentFile', () => {
    beforeEach(() => {
      mockStat.mockResolvedValue({
        birthtime: new Date('2024-01-01'),
        mtime: new Date('2024-01-15'),
      } as any);
    });

    it('parses agent frontmatter correctly', async () => {
      mockReaddir.mockResolvedValue(['test.md'] as any);
      mockReadFile.mockResolvedValue(`---
name: test-agent
description: A testing agent with quality checks
model: opus
---
# Test Agent

This agent performs testing.`);

      await marketplace.scanInstalled();
      const agent = marketplace.getAgent('test-agent');

      expect(agent).toBeDefined();
      expect(agent!.name).toBe('test-agent');
      expect(agent!.description).toBe('A testing agent with quality checks');
      expect(agent!.model).toBe('opus');
    });

    it('defaults to sonnet model if not specified', async () => {
      mockReaddir.mockResolvedValue(['test.md'] as any);
      mockReadFile.mockResolvedValue(`---
name: test-agent
description: Test
---
# Test`);

      await marketplace.scanInstalled();
      const agent = marketplace.getAgent('test-agent');

      expect(agent!.model).toBe('sonnet');
    });

    it('marks AFRG agents as built-in', async () => {
      mockReaddir.mockResolvedValue(['[AFRG]-test.md'] as any);
      mockReadFile.mockResolvedValue(`---
name: test-agent
description: Test
---
# Test`);

      await marketplace.scanInstalled();
      const agent = marketplace.getAgent('test-agent');

      expect(agent!.builtIn).toBe(true);
    });

    it('marks NXTG agents as built-in', async () => {
      mockReaddir.mockResolvedValue(['[NXTG-test].md'] as any);
      mockReadFile.mockResolvedValue(`---
name: nxtg-agent
description: Test
---
# Test`);

      await marketplace.scanInstalled();
      const agent = marketplace.getAgent('nxtg-agent');

      expect(agent!.builtIn).toBe(true);
    });

    it('marks forge-oracle as built-in', async () => {
      mockReaddir.mockResolvedValue(['forge-oracle.md'] as any);
      mockReadFile.mockResolvedValue(`---
name: forge-oracle
description: Oracle agent
---
# Oracle`);

      await marketplace.scanInstalled();
      const agent = marketplace.getAgent('forge-oracle');

      expect(agent!.builtIn).toBe(true);
    });

    it('marks custom agents as not built-in', async () => {
      mockReaddir.mockResolvedValue(['custom.md'] as any);
      mockReadFile.mockResolvedValue(`---
name: custom-agent
description: Custom
---
# Custom`);

      await marketplace.scanInstalled();
      const agent = marketplace.getAgent('custom-agent');

      expect(agent!.builtIn).toBe(false);
    });

    it('includes file metadata timestamps', async () => {
      const birthtime = new Date('2024-01-01T10:00:00Z');
      const mtime = new Date('2024-01-15T15:30:00Z');

      mockReaddir.mockResolvedValue(['test.md'] as any);
      mockReadFile.mockResolvedValue(`---
name: test-agent
description: Test
---
# Test`);
      mockStat.mockResolvedValue({
        birthtime,
        mtime,
      } as any);

      await marketplace.scanInstalled();
      const agent = marketplace.getAgent('test-agent');

      expect(agent!.metadata.createdAt).toBe(birthtime.toISOString());
      expect(agent!.metadata.updatedAt).toBe(mtime.toISOString());
    });

    it('generates ID from agent name', async () => {
      mockReaddir.mockResolvedValue(['test.md'] as any);
      mockReadFile.mockResolvedValue(`---
name: Test Agent with Spaces
description: Test
---
# Test`);

      await marketplace.scanInstalled();
      const agent = marketplace.getAgent('Test Agent with Spaces');

      expect(agent!.id).toBe('test-agent-with-spaces');
    });

    it('marks all agents as installed', async () => {
      mockReaddir.mockResolvedValue(['test.md'] as any);
      mockReadFile.mockResolvedValue(`---
name: test-agent
description: Test
---
# Test`);

      await marketplace.scanInstalled();
      const agent = marketplace.getAgent('test-agent');

      expect(agent!.installed).toBe(true);
    });
  });

  describe('categorizeAgent', () => {
    beforeEach(() => {
      mockStat.mockResolvedValue({
        birthtime: new Date('2024-01-01'),
        mtime: new Date('2024-01-15'),
      } as any);
    });

    const createAgentWithName = (name: string, description: string = '') => {
      return `---
name: ${name}
description: ${description}
---
# Agent`;
    };

    it('categorizes core agents by name', async () => {
      const coreAgents = ['orchestrator', 'planner', 'builder'];

      for (const name of coreAgents) {
        mockReaddir.mockResolvedValue([`${name}.md`] as any);
        mockReadFile.mockResolvedValue(createAgentWithName(name));

        await marketplace.scanInstalled();
        const agent = marketplace.getAgent(name);

        expect(agent!.category).toBe('core');
      }
    });

    it('categorizes quality agents by name', async () => {
      const qualityAgents = ['guardian', 'testing-agent', 'security-checker'];

      for (const name of qualityAgents) {
        mockReaddir.mockResolvedValue([`${name}.md`] as any);
        mockReadFile.mockResolvedValue(createAgentWithName(name));

        await marketplace.scanInstalled();
        const agent = marketplace.getAgent(name);

        expect(agent!.category).toBe('quality');
      }
    });

    it('categorizes development agents by name', async () => {
      const devAgents = ['refactor-agent', 'api-agent', 'ui-designer', 'database-expert'];

      for (const name of devAgents) {
        mockReaddir.mockResolvedValue([`${name}.md`] as any);
        mockReadFile.mockResolvedValue(createAgentWithName(name));

        await marketplace.scanInstalled();
        const agent = marketplace.getAgent(name);

        expect(agent!.category).toBe('development');
      }
    });

    it('categorizes operations agents by name', async () => {
      const opsAgents = ['devops-agent', 'performance-analyzer', 'analytics-agent'];

      for (const name of opsAgents) {
        mockReaddir.mockResolvedValue([`${name}.md`] as any);
        mockReadFile.mockResolvedValue(createAgentWithName(name));

        await marketplace.scanInstalled();
        const agent = marketplace.getAgent(name);

        expect(agent!.category).toBe('operations');
      }
    });

    it('categorizes governance agents by name', async () => {
      const govAgents = ['compliance-checker', 'oracle', 'governance-verifier'];

      for (const name of govAgents) {
        mockReaddir.mockResolvedValue([`${name}.md`] as any);
        mockReadFile.mockResolvedValue(createAgentWithName(name));

        await marketplace.scanInstalled();
        const agent = marketplace.getAgent(name);

        expect(agent!.category).toBe('governance');
      }
    });

    it('categorizes intelligence agents by name', async () => {
      const intelAgents = ['learning-agent', 'detective', 'ceo-loop'];

      for (const name of intelAgents) {
        mockReaddir.mockResolvedValue([`${name}.md`] as any);
        mockReadFile.mockResolvedValue(createAgentWithName(name));

        await marketplace.scanInstalled();
        const agent = marketplace.getAgent(name);

        expect(agent!.category).toBe('intelligence');
      }
    });

    it('categorizes documentation agents by name', async () => {
      const docAgents = ['docs-generator', 'release-sentinel'];

      for (const name of docAgents) {
        mockReaddir.mockResolvedValue([`${name}.md`] as any);
        mockReadFile.mockResolvedValue(createAgentWithName(name));

        await marketplace.scanInstalled();
        const agent = marketplace.getAgent(name);

        expect(agent!.category).toBe('documentation');
      }
    });

    it('categorizes integration agents by name', async () => {
      mockReaddir.mockResolvedValue(['integration-agent.md'] as any);
      mockReadFile.mockResolvedValue(createAgentWithName('integration-agent'));

      await marketplace.scanInstalled();
      const agent = marketplace.getAgent('integration-agent');

      expect(agent!.category).toBe('integration');
    });

    it('categorizes by description when name is generic', async () => {
      mockReaddir.mockResolvedValue(['agent.md'] as any);
      mockReadFile.mockResolvedValue(
        createAgentWithName('agent', 'An agent focused on quality assurance and testing')
      );

      await marketplace.scanInstalled();
      const agent = marketplace.getAgent('agent');

      expect(agent!.category).toBe('quality');
    });

    it('uses description for deployment context', async () => {
      mockReaddir.mockResolvedValue(['agent.md'] as any);
      mockReadFile.mockResolvedValue(
        createAgentWithName('agent', 'Handles deployment and infrastructure setup')
      );

      await marketplace.scanInstalled();
      const agent = marketplace.getAgent('agent');

      expect(agent!.category).toBe('operations');
    });

    it('uses description for governance context', async () => {
      mockReaddir.mockResolvedValue(['agent.md'] as any);
      mockReadFile.mockResolvedValue(
        createAgentWithName('agent', 'Ensures compliance with regulations')
      );

      await marketplace.scanInstalled();
      const agent = marketplace.getAgent('agent');

      expect(agent!.category).toBe('governance');
    });

    it('defaults to development category', async () => {
      mockReaddir.mockResolvedValue(['agent.md'] as any);
      mockReadFile.mockResolvedValue(
        createAgentWithName('generic-agent', 'A generic agent')
      );

      await marketplace.scanInstalled();
      const agent = marketplace.getAgent('generic-agent');

      expect(agent!.category).toBe('development');
    });
  });

  describe('extractCapabilities', () => {
    beforeEach(() => {
      mockStat.mockResolvedValue({
        birthtime: new Date('2024-01-01'),
        mtime: new Date('2024-01-15'),
      } as any);
    });

    it('extracts capabilities from description', async () => {
      mockReaddir.mockResolvedValue(['agent.md'] as any);
      mockReadFile.mockResolvedValue(`---
name: test-agent
description: Handles planning, testing, and deployment with Docker and CI/CD
---
# Agent`);

      await marketplace.scanInstalled();
      const agent = marketplace.getAgent('test-agent');

      expect(agent!.capabilities).toContain('planning');
      expect(agent!.capabilities).toContain('testing');
      expect(agent!.capabilities).toContain('deployment');
      expect(agent!.capabilities).toContain('docker');
      expect(agent!.capabilities).toContain('ci/cd');
    });

    it('deduplicates capabilities', async () => {
      mockReaddir.mockResolvedValue(['agent.md'] as any);
      mockReadFile.mockResolvedValue(`---
name: test-agent
description: Testing and quality testing with test automation
---
# Agent`);

      await marketplace.scanInstalled();
      const agent = marketplace.getAgent('test-agent');

      const testingCount = agent!.capabilities.filter(c => c === 'testing').length;
      expect(testingCount).toBe(1);
    });

    it('returns empty array when no capabilities found', async () => {
      mockReaddir.mockResolvedValue(['agent.md'] as any);
      mockReadFile.mockResolvedValue(`---
name: test-agent
description: A simple helper
---
# Agent`);

      await marketplace.scanInstalled();
      const agent = marketplace.getAgent('test-agent');

      expect(agent!.capabilities).toEqual([]);
    });

    it('extracts all supported capability keywords', async () => {
      mockReaddir.mockResolvedValue(['agent.md'] as any);
      mockReadFile.mockResolvedValue(`---
name: test-agent
description: Architecture planning design implementation testing security quality deployment CI/CD Docker monitoring analytics refactoring API UI database compliance governance learning analysis documentation release integration performance optimization debugging
---
# Agent`);

      await marketplace.scanInstalled();
      const agent = marketplace.getAgent('test-agent');

      expect(agent!.capabilities.length).toBeGreaterThan(15);
      expect(agent!.capabilities).toContain('architecture');
      expect(agent!.capabilities).toContain('planning');
      expect(agent!.capabilities).toContain('design');
      expect(agent!.capabilities).toContain('security');
      expect(agent!.capabilities).toContain('debugging');
    });
  });

  describe('getAll', () => {
    beforeEach(() => {
      mockStat.mockResolvedValue({
        birthtime: new Date('2024-01-01'),
        mtime: new Date('2024-01-15'),
      } as any);
    });

    it('returns empty array when no agents loaded', () => {
      const agents = marketplace.getAll();
      expect(agents).toEqual([]);
    });

    it('returns all loaded agents', async () => {
      mockReaddir.mockResolvedValue(['a.md', 'b.md', 'c.md'] as any);
      mockReadFile.mockImplementation(async (path: any) => {
        const filename = path.split('/').pop().replace('.md', '');
        return `---
name: agent-${filename}
description: Test
---
# Agent`;
      });

      await marketplace.scanInstalled();
      const agents = marketplace.getAll();

      expect(agents).toHaveLength(3);
      expect(agents.map(a => a.name)).toContain('agent-a');
      expect(agents.map(a => a.name)).toContain('agent-b');
      expect(agents.map(a => a.name)).toContain('agent-c');
    });
  });

  describe('getByCategory', () => {
    beforeEach(async () => {
      mockStat.mockResolvedValue({
        birthtime: new Date('2024-01-01'),
        mtime: new Date('2024-01-15'),
      } as any);

      mockReaddir.mockResolvedValue([
        'orchestrator.md',
        'testing-agent.md',
        'refactor-agent.md',
        'builder.md',
      ] as any);

      mockReadFile.mockImplementation(async (path: any) => {
        const filename = path.split('/').pop();
        if (filename === 'orchestrator.md') {
          return `---
name: orchestrator
description: Core orchestrator
---
# Orchestrator`;
        }
        if (filename === 'testing-agent.md') {
          return `---
name: testing-agent
description: Testing agent
---
# Testing`;
        }
        if (filename === 'refactor-agent.md') {
          return `---
name: refactor-agent
description: Refactor code
---
# Refactor`;
        }
        if (filename === 'builder.md') {
          return `---
name: builder
description: Build features
---
# Builder`;
        }
        throw new Error('Unknown file');
      });

      await marketplace.scanInstalled();
    });

    it('returns agents matching category', () => {
      const coreAgents = marketplace.getByCategory('core');
      expect(coreAgents).toHaveLength(2);
      expect(coreAgents.map(a => a.name)).toContain('orchestrator');
      expect(coreAgents.map(a => a.name)).toContain('builder');
    });

    it('returns empty array for category with no agents', () => {
      const docAgents = marketplace.getByCategory('documentation');
      expect(docAgents).toEqual([]);
    });

    it('only returns agents from specified category', () => {
      const qualityAgents = marketplace.getByCategory('quality');
      expect(qualityAgents).toHaveLength(1);
      expect(qualityAgents[0].name).toBe('testing-agent');
    });
  });

  describe('getByCapability', () => {
    beforeEach(async () => {
      mockStat.mockResolvedValue({
        birthtime: new Date('2024-01-01'),
        mtime: new Date('2024-01-15'),
      } as any);

      mockReaddir.mockResolvedValue(['a.md', 'b.md', 'c.md'] as any);

      mockReadFile.mockImplementation(async (path: any) => {
        const filename = path.split('/').pop();
        if (filename === 'a.md') {
          return `---
name: agent-a
description: Handles testing and quality assurance
---
# A`;
        }
        if (filename === 'b.md') {
          return `---
name: agent-b
description: Manages deployment and CI/CD pipelines
---
# B`;
        }
        if (filename === 'c.md') {
          return `---
name: agent-c
description: Performs security testing and vulnerability analysis
---
# C`;
        }
        throw new Error('Unknown file');
      });

      await marketplace.scanInstalled();
    });

    it('returns agents with matching capability', () => {
      const testingAgents = marketplace.getByCapability('testing');
      expect(testingAgents).toHaveLength(2);
      expect(testingAgents.map(a => a.name)).toContain('agent-a');
      expect(testingAgents.map(a => a.name)).toContain('agent-c');
    });

    it('matches capability in description even if not in capabilities list', () => {
      const deployAgents = marketplace.getByCapability('deployment');
      expect(deployAgents).toHaveLength(1);
      expect(deployAgents[0].name).toBe('agent-b');
    });

    it('is case-insensitive', () => {
      const testingAgents1 = marketplace.getByCapability('TESTING');
      const testingAgents2 = marketplace.getByCapability('Testing');
      const testingAgents3 = marketplace.getByCapability('testing');

      expect(testingAgents1).toHaveLength(testingAgents2.length);
      expect(testingAgents2).toHaveLength(testingAgents3.length);
    });

    it('returns empty array when no matches', () => {
      const agents = marketplace.getByCapability('nonexistent');
      expect(agents).toEqual([]);
    });

    it('supports partial matching', () => {
      const securityAgents = marketplace.getByCapability('secur');
      expect(securityAgents).toHaveLength(1);
      expect(securityAgents[0].name).toBe('agent-c');
    });
  });

  describe('getAgent', () => {
    beforeEach(async () => {
      mockStat.mockResolvedValue({
        birthtime: new Date('2024-01-01'),
        mtime: new Date('2024-01-15'),
      } as any);

      mockReaddir.mockResolvedValue(['test.md'] as any);
      mockReadFile.mockResolvedValue(`---
name: test-agent
description: Test
---
# Test`);

      await marketplace.scanInstalled();
    });

    it('returns agent by name', () => {
      const agent = marketplace.getAgent('test-agent');
      expect(agent).toBeDefined();
      expect(agent!.name).toBe('test-agent');
    });

    it('returns undefined for non-existent agent', () => {
      const agent = marketplace.getAgent('nonexistent');
      expect(agent).toBeUndefined();
    });

    it('is case-sensitive', () => {
      const agent = marketplace.getAgent('TEST-AGENT');
      expect(agent).toBeUndefined();
    });
  });

  describe('getStats', () => {
    beforeEach(async () => {
      mockStat.mockResolvedValue({
        birthtime: new Date('2024-01-01'),
        mtime: new Date('2024-01-15'),
      } as any);
    });

    it('returns zero stats when no agents loaded', () => {
      const stats = marketplace.getStats();

      expect(stats.totalAgents).toBe(0);
      expect(stats.installedAgents).toBe(0);
      expect(Object.values(stats.categoryCounts).every(c => c === 0)).toBe(true);
      expect(Object.values(stats.modelCounts).every(c => c === 0)).toBe(true);
    });

    it('counts total agents correctly', async () => {
      mockReaddir.mockResolvedValue(['a.md', 'b.md', 'c.md'] as any);
      mockReadFile.mockImplementation(async (path: any) => {
        const filename = path.split('/').pop().replace('.md', '');
        return `---
name: agent-${filename}
description: Test
---
# Agent`;
      });

      await marketplace.scanInstalled();
      const stats = marketplace.getStats();

      expect(stats.totalAgents).toBe(3);
    });

    it('counts installed agents correctly', async () => {
      mockReaddir.mockResolvedValue(['a.md', 'b.md'] as any);
      mockReadFile.mockImplementation(async (path: any) => {
        const filename = path.split('/').pop().replace('.md', '');
        return `---
name: agent-${filename}
description: Test
---
# Agent`;
      });

      await marketplace.scanInstalled();
      const stats = marketplace.getStats();

      expect(stats.installedAgents).toBe(2);
    });

    it('counts agents by category', async () => {
      mockReaddir.mockResolvedValue([
        'orchestrator.md',
        'builder.md',
        'testing.md',
        'guardian.md',
      ] as any);

      mockReadFile.mockImplementation(async (path: any) => {
        const filename = path.split('/').pop();
        return `---
name: ${filename.replace('.md', '')}
description: Test
---
# Agent`;
      });

      await marketplace.scanInstalled();
      const stats = marketplace.getStats();

      expect(stats.categoryCounts.core).toBe(2); // orchestrator, builder
      expect(stats.categoryCounts.quality).toBe(2); // testing, guardian
      expect(stats.categoryCounts.development).toBe(0);
    });

    it('counts agents by model', async () => {
      mockReaddir.mockResolvedValue(['a.md', 'b.md', 'c.md'] as any);

      mockReadFile.mockImplementation(async (path: any) => {
        const filename = path.split('/').pop();
        if (filename === 'a.md') {
          return `---
name: agent-a
description: Test
model: opus
---
# A`;
        }
        if (filename === 'b.md') {
          return `---
name: agent-b
description: Test
model: sonnet
---
# B`;
        }
        if (filename === 'c.md') {
          return `---
name: agent-c
description: Test
model: haiku
---
# C`;
        }
        throw new Error('Unknown file');
      });

      await marketplace.scanInstalled();
      const stats = marketplace.getStats();

      expect(stats.modelCounts.opus).toBe(1);
      expect(stats.modelCounts.sonnet).toBe(1);
      expect(stats.modelCounts.haiku).toBe(1);
    });

    it('includes all category keys even with zero counts', async () => {
      mockReaddir.mockResolvedValue(['orchestrator.md'] as any);
      mockReadFile.mockResolvedValue(`---
name: orchestrator
description: Test
---
# Agent`);

      await marketplace.scanInstalled();
      const stats = marketplace.getStats();

      const expectedCategories: AgentCategory[] = [
        'core', 'quality', 'development', 'operations',
        'governance', 'intelligence', 'documentation', 'integration'
      ];

      for (const category of expectedCategories) {
        expect(stats.categoryCounts).toHaveProperty(category);
        expect(typeof stats.categoryCounts[category]).toBe('number');
      }
    });

    it('includes all model keys even with zero counts', async () => {
      mockReaddir.mockResolvedValue(['agent.md'] as any);
      mockReadFile.mockResolvedValue(`---
name: test-agent
description: Test
model: opus
---
# Agent`);

      await marketplace.scanInstalled();
      const stats = marketplace.getStats();

      expect(stats.modelCounts).toHaveProperty('opus');
      expect(stats.modelCounts).toHaveProperty('sonnet');
      expect(stats.modelCounts).toHaveProperty('haiku');
      expect(stats.modelCounts.opus).toBe(1);
      expect(stats.modelCounts.sonnet).toBe(0);
      expect(stats.modelCounts.haiku).toBe(0);
    });
  });

  describe('generateId', () => {
    beforeEach(async () => {
      mockStat.mockResolvedValue({
        birthtime: new Date('2024-01-01'),
        mtime: new Date('2024-01-15'),
      } as any);
    });

    it('converts to lowercase', async () => {
      mockReaddir.mockResolvedValue(['agent.md'] as any);
      mockReadFile.mockResolvedValue(`---
name: TEST AGENT
description: Test
---
# Agent`);

      await marketplace.scanInstalled();
      const agent = marketplace.getAgent('TEST AGENT');

      expect(agent!.id).toBe('test-agent');
    });

    it('replaces spaces with hyphens', async () => {
      mockReaddir.mockResolvedValue(['agent.md'] as any);
      mockReadFile.mockResolvedValue(`---
name: my test agent
description: Test
---
# Agent`);

      await marketplace.scanInstalled();
      const agent = marketplace.getAgent('my test agent');

      expect(agent!.id).toBe('my-test-agent');
    });

    it('removes special characters', async () => {
      mockReaddir.mockResolvedValue(['agent.md'] as any);
      mockReadFile.mockResolvedValue(`---
name: test@agent#123
description: Test
---
# Agent`);

      await marketplace.scanInstalled();
      const agent = marketplace.getAgent('test@agent#123');

      expect(agent!.id).toBe('test-agent-123');
    });

    it('handles multiple consecutive special characters', async () => {
      mockReaddir.mockResolvedValue(['agent.md'] as any);
      mockReadFile.mockResolvedValue(`---
name: test___agent
description: Test
---
# Agent`);

      await marketplace.scanInstalled();
      const agent = marketplace.getAgent('test___agent');

      expect(agent!.id).toBe('test-agent');
    });
  });

  describe('edge cases', () => {
    beforeEach(() => {
      mockStat.mockResolvedValue({
        birthtime: new Date('2024-01-01'),
        mtime: new Date('2024-01-15'),
      } as any);
    });

    it('handles empty agents directory', async () => {
      mockReaddir.mockResolvedValue([] as any);

      await marketplace.scanInstalled();
      const agents = marketplace.getAll();

      expect(agents).toEqual([]);
    });

    it('handles agents with empty descriptions', async () => {
      mockReaddir.mockResolvedValue(['agent.md'] as any);
      mockReadFile.mockResolvedValue(`---
name: test-agent
description:
---
# Agent`);

      await marketplace.scanInstalled();
      const agent = marketplace.getAgent('test-agent');

      expect(agent).toBeDefined();
      expect(agent!.description).toBe('');
      expect(agent!.capabilities).toEqual([]);
    });

    it('handles custom agents directory path', () => {
      const customMarketplace = new AgentMarketplace('/custom/path');
      expect(customMarketplace).toBeDefined();
    });

    it('uses default agents directory if not provided', () => {
      const defaultMarketplace = new AgentMarketplace();
      expect(defaultMarketplace).toBeDefined();
    });

    it('handles multiple scans without memory leak', async () => {
      mockReaddir.mockResolvedValue(['agent.md'] as any);
      mockReadFile.mockResolvedValue(`---
name: test-agent
description: Test
---
# Agent`);

      await marketplace.scanInstalled();
      await marketplace.scanInstalled();
      await marketplace.scanInstalled();

      const agents = marketplace.getAll();
      expect(agents).toHaveLength(1);
    });
  });
});
