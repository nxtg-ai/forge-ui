import { describe, it, expect } from 'vitest';
import {
  parseAgentFile,
  validateFrontmatter,
  validateSystemPrompt,
  validateAgentDirectory,
  DEFAULT_CONFIG,
  type AgentFrontmatter
} from './agent-validator';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

/**
 * Agent Registry Integration Tests
 *
 * These tests validate the agent parsing and validation utilities using
 * inline mock agent files. Local agent files were removed in the v3
 * duplicate cleanup (agents live in forge-plugin only).
 */

async function createTempAgentDir(agents: Array<{ filename: string; content: string }>): Promise<string> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-test-'));
  for (const agent of agents) {
    await fs.writeFile(path.join(tmpDir, agent.filename), agent.content, 'utf-8');
  }
  return tmpDir;
}

const MOCK_AGENTS = [
  {
    filename: '[AFRG]-planner.md',
    content: `---
name: forge-planner
description: Plans and coordinates multi-step feature implementations with dependency analysis
model: opus
color: blue
tools: Read, Glob, Grep, Bash, Task
---
# Forge Planner

You are the Forge Planner agent. You analyze requirements, break them into tasks,
identify dependencies, and create execution plans for the builder agents.

## Your Role

- Analyze feature requests and break them into actionable tasks
- Identify dependencies between tasks
- Create execution plans with proper ordering

## Examples

When given a feature request, you produce a structured plan with tasks and dependencies.
`
  },
  {
    filename: '[AFRG]-builder.md',
    content: `---
name: forge-builder
description: Implements features and writes production-quality code with tests
model: sonnet
color: green
tools: Read, Write, Edit, Bash, Glob, Grep, Task
---
# Forge Builder

You are the Forge Builder agent. You implement features following SOLID principles
and write comprehensive tests alongside your implementation.

## Your Role

- Write clean, maintainable, well-documented code
- Follow SOLID principles and design patterns
- Generate comprehensive tests alongside implementation

## Examples

When assigned a task, you implement it with full test coverage.
`
  },
  {
    filename: '[AFRG]-testing.md',
    content: `---
name: forge-testing
description: Validates code quality through comprehensive test suites and coverage analysis
model: sonnet
color: yellow
tools: Read, Bash, Glob, Grep
---
# Forge Testing

You are the Forge Testing agent. You write and run tests to validate code quality.

## Your Role

- Write unit, integration, and end-to-end tests
- Analyze test coverage and identify gaps
- Validate edge cases and error handling

## Examples

When reviewing code, you identify untested paths and write tests for them.
`
  }
];

describe('Agent Registry Integration', () => {
  let agentsDir: string;

  beforeAll(async () => {
    agentsDir = await createTempAgentDir(MOCK_AGENTS);
  });

  afterAll(async () => {
    await fs.rm(agentsDir, { recursive: true, force: true });
  });

  describe('Agent Loading', () => {
    it('should be able to load all agents from the directory', async () => {
      const files = await fs.readdir(agentsDir);
      const mdFiles = files.filter(f => f.endsWith('.md'));

      expect(mdFiles.length).toBe(3);

      const loadedAgents = [];
      for (const file of mdFiles) {
        const filePath = path.join(agentsDir, file);
        const agent = await parseAgentFile(filePath);
        if (agent) {
          loadedAgents.push(agent);
        }
      }

      expect(loadedAgents.length).toBe(3);
    });

    it('should successfully parse all agent frontmatter', async () => {
      const files = await fs.readdir(agentsDir);
      const mdFiles = files.filter(f => f.endsWith('.md'));

      for (const file of mdFiles) {
        const filePath = path.join(agentsDir, file);
        const agent = await parseAgentFile(filePath);

        expect(agent).not.toBeNull();
        expect(agent?.frontmatter).toBeDefined();
        expect(agent?.frontmatter.name).toBeDefined();
        expect(agent?.frontmatter.description).toBeDefined();
        if (agent?.frontmatter.model) {
          expect(typeof agent.frontmatter.model).toBe('string');
        }
        if (agent?.frontmatter.tools) {
          expect(typeof agent.frontmatter.tools).toBe('string');
        }
      }
    });
  });

  describe('Unique Agent Names', () => {
    it('should have no duplicate agent names', async () => {
      const results = await validateAgentDirectory(agentsDir);

      const names = results.map(r => r.agentName).filter(n => n !== null);
      const uniqueNames = new Set(names);

      const duplicates: string[] = [];
      const seen = new Set<string>();

      for (const name of names) {
        if (name && seen.has(name)) {
          duplicates.push(name);
        }
        if (name) {
          seen.add(name);
        }
      }

      expect(duplicates).toHaveLength(0);
      expect(uniqueNames.size).toBe(names.length);
    });
  });

  describe('Agent Colors', () => {
    it('should track color usage across all agents', async () => {
      const files = await fs.readdir(agentsDir);
      const mdFiles = files.filter(f => f.endsWith('.md'));

      const colorMap = new Map<string, string[]>();

      for (const file of mdFiles) {
        const filePath = path.join(agentsDir, file);
        const agent = await parseAgentFile(filePath);

        if (agent && agent.frontmatter.color) {
          const color = agent.frontmatter.color;
          const agentName = agent.frontmatter.name;

          if (!colorMap.has(color)) {
            colorMap.set(color, []);
          }
          colorMap.get(color)?.push(agentName);
        }
      }

      expect(colorMap.size).toBeGreaterThan(0);
    });

    it('should have unique colors for most agents', async () => {
      const files = await fs.readdir(agentsDir);
      const mdFiles = files.filter(f => f.endsWith('.md'));

      const colorMap = new Map<string, string[]>();

      for (const file of mdFiles) {
        const filePath = path.join(agentsDir, file);
        const agent = await parseAgentFile(filePath);

        if (agent && agent.frontmatter.color) {
          const color = agent.frontmatter.color;
          const agentName = agent.frontmatter.name;

          if (!colorMap.has(color)) {
            colorMap.set(color, []);
          }
          colorMap.get(color)?.push(agentName);
        }
      }

      const uniqueColors = Array.from(colorMap.values()).filter(
        agents => agents.length === 1
      ).length;

      const totalAgents = mdFiles.length;
      const uniquePercentage = (uniqueColors / totalAgents) * 100;

      // All 3 mock agents have unique colors
      expect(uniquePercentage).toBe(100);
    });
  });

  describe('Agent Naming Conventions', () => {
    it('should follow naming conventions for AFRG agents', async () => {
      const files = await fs.readdir(agentsDir);
      const mdFiles = files.filter(f => f.endsWith('.md'));

      const conventionPatterns = [
        /^\[AFRG\]-.*\.md$/,
        /^\[NXTG-CEO\]-.*\.md$/,
        /^forge-oracle\.md$/
      ];

      const followsConvention: string[] = [];
      for (const file of mdFiles) {
        const matchesPattern = conventionPatterns.some(pattern => pattern.test(file));
        if (matchesPattern) {
          followsConvention.push(file);
        }
      }

      const conventionPercentage = (followsConvention.length / mdFiles.length) * 100;
      expect(conventionPercentage).toBe(100);
    });
  });

  describe('Agent Registry Summary', () => {
    it('should validate all agents in the directory successfully', async () => {
      const results = await validateAgentDirectory(agentsDir);

      expect(results.length).toBe(3);

      const invalidAgents = results.filter(r => !r.valid);
      expect(invalidAgents).toHaveLength(0);
    });
  });
});
