import { describe, it, expect } from 'vitest';
import * as path from 'path';
import {
  parseAgentFile,
  validateFrontmatter,
  validateSystemPrompt,
  validateAgentFile,
  validateAgentDirectory,
  DEFAULT_CONFIG,
  type AgentFrontmatter
} from './agent-validator';

describe('Agent Validator', () => {
  const AGENTS_DIR = path.resolve(process.cwd(), '.claude/agents');

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
        // missing model and tools
      } as AgentFrontmatter;

      const result = validateFrontmatter(frontmatter);

      // Model and tools are optional, so they should produce warnings not errors
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes('model') || w.includes('tools'))).toBe(true);
    });

    it('should fail validation for invalid model', () => {
      const frontmatter: AgentFrontmatter = {
        name: 'test-agent',
        description: 'A test agent',
        model: 'gpt-4', // invalid model
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

      // Should have no warnings about unknown tools
      expect(result.warnings.filter(w => w.includes('Unknown tool')).length).toBe(0);
    });

    it('should warn for very short agent name', () => {
      const frontmatter: AgentFrontmatter = {
        name: 'ab', // only 2 chars
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
      const testFile = path.join(AGENTS_DIR, '[AFRG]-planner.md');
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
      const testFile = path.join(AGENTS_DIR, '[AFRG]-planner.md');
      const result = await validateAgentFile(testFile);

      expect(result.valid).toBe(true);
      expect(result.agentName).toBe('forge-planner');
      expect(result.errors).toHaveLength(0);
    });

    it('should validate the forge-builder agent', async () => {
      const testFile = path.join(AGENTS_DIR, '[AFRG]-builder.md');
      const result = await validateAgentFile(testFile);

      expect(result.valid).toBe(true);
      expect(result.agentName).toBe('forge-builder');
      expect(result.errors).toHaveLength(0);
    });

    it('should validate the CEO-LOOP agent', async () => {
      const testFile = path.join(AGENTS_DIR, '[NXTG-CEO]-LOOP.md');
      const result = await validateAgentFile(testFile);

      expect(result.valid).toBe(true);
      expect(result.agentName).toBe('NXTG-CEO-LOOP');
      expect(result.errors).toHaveLength(0);
    });

    it('should validate the forge-oracle agent', async () => {
      const testFile = path.join(AGENTS_DIR, 'forge-oracle.md');
      const result = await validateAgentFile(testFile);

      expect(result.valid).toBe(true);
      expect(result.agentName).toBe('forge-oracle');
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateAgentDirectory - All 22 Agents', () => {
    it('should validate all agents in the directory successfully', async () => {
      const results = await validateAgentDirectory(AGENTS_DIR);

      // Should find all 22 agent files
      expect(results.length).toBe(22);

      // All agents should be valid
      const invalidAgents = results.filter(r => !r.valid);
      if (invalidAgents.length > 0) {
        console.log('\nInvalid agents found:');
        for (const agent of invalidAgents) {
          console.log(`\n${path.basename(agent.filePath)} (${agent.agentName}):`);
          console.log('  Errors:', agent.errors);
          console.log('  Warnings:', agent.warnings);
        }
      }

      expect(invalidAgents).toHaveLength(0);
    });

    it('should have no agents with missing required fields', async () => {
      const results = await validateAgentDirectory(AGENTS_DIR);

      const agentsWithMissingFields = results.filter(r =>
        r.errors.some(e => e.includes('Missing required field'))
      );

      expect(agentsWithMissingFields).toHaveLength(0);
    });

    it('should have no agents with invalid models', async () => {
      const results = await validateAgentDirectory(AGENTS_DIR);

      const agentsWithInvalidModels = results.filter(r =>
        r.errors.some(e => e.includes('Invalid model'))
      );

      expect(agentsWithInvalidModels).toHaveLength(0);
    });

    it('should have no agents with empty system prompts', async () => {
      const results = await validateAgentDirectory(AGENTS_DIR);

      const agentsWithEmptyPrompts = results.filter(r =>
        r.errors.some(e => e.includes('System prompt is empty'))
      );

      expect(agentsWithEmptyPrompts).toHaveLength(0);
    });

    it('should have no agents with system prompts that are too short', async () => {
      const results = await validateAgentDirectory(AGENTS_DIR);

      const agentsWithShortPrompts = results.filter(r =>
        r.errors.some(e => e.includes('System prompt too short'))
      );

      expect(agentsWithShortPrompts).toHaveLength(0);
    });

    it('should identify all agent names correctly', async () => {
      const results = await validateAgentDirectory(AGENTS_DIR);

      // All results should have agent names
      const resultsWithoutNames = results.filter(r => !r.agentName);
      expect(resultsWithoutNames).toHaveLength(0);

      // Print summary for visibility
      const agentNames = results.map(r => r.agentName).sort();
      console.log('\nAll agent names found:');
      agentNames.forEach(name => console.log(`  - ${name}`));
    });

    it('should categorize agents by model type', async () => {
      const results = await validateAgentDirectory(AGENTS_DIR);

      const agentsByModel: Record<string, string[]> = {
        sonnet: [],
        opus: [],
        haiku: []
      };

      for (const result of results) {
        const agentFile = await parseAgentFile(result.filePath);
        if (agentFile && agentFile.frontmatter.model) {
          const model = agentFile.frontmatter.model;
          if (model in agentsByModel) {
            agentsByModel[model].push(result.agentName || 'unknown');
          }
        }
      }

      console.log('\nAgents by model:');
      console.log(`  Sonnet: ${agentsByModel.sonnet.length}`);
      console.log(`  Opus: ${agentsByModel.opus.length}`);
      console.log(`  Haiku: ${agentsByModel.haiku.length}`);

      // At least some agents should use each model type (or at least sonnet/opus)
      expect(agentsByModel.sonnet.length).toBeGreaterThan(0);
    });
  });
});
