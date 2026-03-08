import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import {
  parseAgentFile,
  validateFrontmatter,
  validateSystemPrompt,
  validateAgentFile,
  validateAgentDirectory,
  DEFAULT_CONFIG,
  type AgentFrontmatter
} from './agent-validator';

/**
 * Agent Validator Tests
 *
 * These tests validate the agent parsing and validation utilities using
 * inline mock agent files. Local agent files were removed in the v3
 * duplicate cleanup (agents live in forge-plugin only).
 */

async function createTempAgentDir(agents: Array<{ filename: string; content: string }>): Promise<string> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-validator-test-'));
  for (const agent of agents) {
    await fs.writeFile(path.join(tmpDir, agent.filename), agent.content, 'utf-8');
  }
  return tmpDir;
}

const MOCK_PLANNER = {
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
};

const MOCK_BUILDER = {
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
};

const MOCK_CEO = {
  filename: '[NXTG-CEO]-LOOP.md',
  content: `---
name: NXTG-CEO-LOOP
description: Executive decision loop agent that handles strategic decisions and project coordination
model: opus
color: purple
tools: Read, Glob, Grep, Bash, Task
---
# NXTG CEO Loop

You are the CEO Loop agent. You handle strategic decisions and project-level coordination.

## Your Role

- Make strategic decisions about project direction
- Coordinate between workstreams
- Review and approve major changes

## Examples

When presented with a decision, you analyze trade-offs and make a recommendation.
`
};

const MOCK_ORACLE = {
  filename: 'forge-oracle.md',
  content: `---
name: forge-oracle
description: Governance oracle that tracks project health, compliance, and quality metrics
model: sonnet
color: cyan
tools: Read, Glob, Grep, Bash
---
# Forge Oracle

You are the Forge Oracle agent. You track project health and governance metrics.

## Your Role

- Monitor project health metrics
- Track compliance with governance policies
- Generate health reports

## Examples

When asked for a health check, you analyze all governance dimensions and report findings.
`
};

const ALL_MOCK_AGENTS = [MOCK_PLANNER, MOCK_BUILDER, MOCK_CEO, MOCK_ORACLE];

describe('Agent Validator', () => {
  let agentsDir: string;

  beforeAll(async () => {
    agentsDir = await createTempAgentDir(ALL_MOCK_AGENTS);
  });

  afterAll(async () => {
    await fs.rm(agentsDir, { recursive: true, force: true });
  });

  describe('validateFrontmatter', () => {
    it('should pass validation for valid frontmatter', () => {
      const frontmatter: AgentFrontmatter = {
        name: 'test-agent',
        description: 'A test agent for validation',
        model: 'sonnet',
        color: 'blue',
        tools: 'Read, Write, Edit'
      };

      const result = validateFrontmatter(frontmatter);

      expect(result.errors).toHaveLength(0);
    });

    it('should warn for missing optional fields', () => {
      const frontmatter = {
        name: 'test-agent',
        description: 'A test agent'
      } as AgentFrontmatter;

      const result = validateFrontmatter(frontmatter);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes('model') || w.includes('tools'))).toBe(true);
    });

    it('should fail validation for invalid model', () => {
      const frontmatter: AgentFrontmatter = {
        name: 'test-agent',
        description: 'A test agent',
        model: 'gpt-4',
        color: 'blue',
        tools: 'Read, Write'
      };

      const result = validateFrontmatter(frontmatter);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('Invalid model'))).toBe(true);
    });

    it('should warn for unknown tools', () => {
      const frontmatter: AgentFrontmatter = {
        name: 'test-agent',
        description: 'A test agent',
        model: 'sonnet',
        color: 'blue',
        tools: 'Read, Write, UnknownTool, AnotherBadTool'
      };

      const result = validateFrontmatter(frontmatter);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes('UnknownTool'))).toBe(true);
    });

    it('should accept all valid models', () => {
      const models = ['sonnet', 'opus', 'haiku'];

      for (const model of models) {
        const frontmatter: AgentFrontmatter = {
          name: 'test-agent',
          description: 'A test agent',
          model,
          color: 'blue',
          tools: 'Read, Write'
        };

        const result = validateFrontmatter(frontmatter);
        expect(result.errors).toHaveLength(0);
      }
    });

    it('should accept all valid tools', () => {
      const validTools = DEFAULT_CONFIG.validTools.join(', ');

      const frontmatter: AgentFrontmatter = {
        name: 'test-agent',
        description: 'A test agent',
        model: 'sonnet',
        color: 'blue',
        tools: validTools
      };

      const result = validateFrontmatter(frontmatter);

      expect(result.warnings.filter(w => w.includes('Unknown tool')).length).toBe(0);
    });

    it('should warn for very short agent name', () => {
      const frontmatter: AgentFrontmatter = {
        name: 'ab',
        description: 'A test agent',
        model: 'sonnet',
        color: 'blue',
        tools: 'Read, Write'
      };

      const result = validateFrontmatter(frontmatter);

      expect(result.errors.some(e => e.includes('name too short'))).toBe(true);
    });
  });

  describe('validateSystemPrompt', () => {
    it('should pass validation for valid system prompt', () => {
      const prompt = `
# Test Agent

You are a test agent with a clear purpose and structure.

## Your Role

You perform test operations with the following guidelines:
- Guideline 1
- Guideline 2

## Examples

Here are some examples of how to use this agent effectively.
      `.trim();

      const result = validateSystemPrompt(prompt);

      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation for empty system prompt', () => {
      const result = validateSystemPrompt('');

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('empty'))).toBe(true);
    });

    it('should fail validation for system prompt that is too short', () => {
      const shortPrompt = 'This is a very short prompt.';

      const result = validateSystemPrompt(shortPrompt);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('too short'))).toBe(true);
    });

    it('should warn for system prompt with TODO markers', () => {
      const prompt = `
# Test Agent

You are a test agent.

TODO: Add more details here
FIXME: This section needs work

## Your Role

You perform test operations.
      `.trim();

      const result = validateSystemPrompt(prompt);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes('TODO/FIXME'))).toBe(true);
    });

    it('should warn for system prompt with template placeholders', () => {
      const prompt = `
# Test Agent

You are a {{agent_type}} agent with {{capabilities}}.

## Your Role

You perform {{operations}} with the following guidelines.
      `.trim();

      const result = validateSystemPrompt(prompt);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes('template placeholders'))).toBe(true);
    });

    it('should warn for system prompt without structure', () => {
      const prompt = `
This is a plain text prompt without any markdown headers or structure.
It just contains paragraphs of text explaining what the agent should do.
While it meets the minimum length requirement, it lacks clear organization.
      `.trim();

      const result = validateSystemPrompt(prompt);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes('headers'))).toBe(true);
    });
  });

  describe('parseAgentFile', () => {
    it('should successfully parse existing agent files', async () => {
      const testFile = path.join(agentsDir, '[AFRG]-planner.md');
      const result = await parseAgentFile(testFile);

      expect(result).not.toBeNull();
      expect(result?.frontmatter).toBeDefined();
      expect(result?.systemPrompt).toBeDefined();
      expect(result?.frontmatter.name).toBe('forge-planner');
    });

    it('should return null for non-existent file', async () => {
      const result = await parseAgentFile('/non/existent/file.md');
      expect(result).toBeNull();
    });
  });

  describe('validateAgentFile', () => {
    it('should validate the forge-planner agent', async () => {
      const testFile = path.join(agentsDir, '[AFRG]-planner.md');
      const result = await validateAgentFile(testFile);

      expect(result.valid).toBe(true);
      expect(result.agentName).toBe('forge-planner');
      expect(result.errors).toHaveLength(0);
    });

    it('should validate the forge-builder agent', async () => {
      const testFile = path.join(agentsDir, '[AFRG]-builder.md');
      const result = await validateAgentFile(testFile);

      expect(result.valid).toBe(true);
      expect(result.agentName).toBe('forge-builder');
      expect(result.errors).toHaveLength(0);
    });

    it('should validate the CEO-LOOP agent', async () => {
      const testFile = path.join(agentsDir, '[NXTG-CEO]-LOOP.md');
      const result = await validateAgentFile(testFile);

      expect(result.valid).toBe(true);
      expect(result.agentName).toBe('NXTG-CEO-LOOP');
      expect(result.errors).toHaveLength(0);
    });

    it('should validate the forge-oracle agent', async () => {
      const testFile = path.join(agentsDir, 'forge-oracle.md');
      const result = await validateAgentFile(testFile);

      expect(result.valid).toBe(true);
      expect(result.agentName).toBe('forge-oracle');
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateAgentDirectory', () => {
    it('should validate all agents in the directory successfully', async () => {
      const results = await validateAgentDirectory(agentsDir);

      expect(results.length).toBe(4);

      const invalidAgents = results.filter(r => !r.valid);
      expect(invalidAgents).toHaveLength(0);
    });

    it('should have no agents with missing required fields', async () => {
      const results = await validateAgentDirectory(agentsDir);

      const agentsWithMissingFields = results.filter(r =>
        r.errors.some(e => e.includes('Missing required field'))
      );

      expect(agentsWithMissingFields).toHaveLength(0);
    });

    it('should have no agents with invalid models', async () => {
      const results = await validateAgentDirectory(agentsDir);

      const agentsWithInvalidModels = results.filter(r =>
        r.errors.some(e => e.includes('Invalid model'))
      );

      expect(agentsWithInvalidModels).toHaveLength(0);
    });

    it('should have no agents with empty system prompts', async () => {
      const results = await validateAgentDirectory(agentsDir);

      const agentsWithEmptyPrompts = results.filter(r =>
        r.errors.some(e => e.includes('System prompt is empty'))
      );

      expect(agentsWithEmptyPrompts).toHaveLength(0);
    });

    it('should have no agents with system prompts that are too short', async () => {
      const results = await validateAgentDirectory(agentsDir);

      const agentsWithShortPrompts = results.filter(r =>
        r.errors.some(e => e.includes('System prompt too short'))
      );

      expect(agentsWithShortPrompts).toHaveLength(0);
    });

    it('should identify all agent names correctly', async () => {
      const results = await validateAgentDirectory(agentsDir);

      const resultsWithoutNames = results.filter(r => !r.agentName);
      expect(resultsWithoutNames).toHaveLength(0);

      const agentNames = results.map(r => r.agentName).sort();
      expect(agentNames).toEqual([
        'NXTG-CEO-LOOP',
        'forge-builder',
        'forge-oracle',
        'forge-planner'
      ]);
    });
  });
});
