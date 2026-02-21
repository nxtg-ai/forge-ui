import { describe, it, expect } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { parseAgentFile, validateAgentDirectory } from './agent-validator';

describe('Agent Registry Integration', () => {
  const AGENTS_DIR = path.resolve(process.cwd(), '.claude/agents');

  describe('Agent Loading', () => {
    it('should be able to load all agents from the directory', async () => {
      const files = await fs.readdir(AGENTS_DIR);
      const mdFiles = files.filter(f => f.endsWith('.md'));

      expect(mdFiles.length).toBe(22);

      const loadedAgents = [];
      for (const file of mdFiles) {
        const filePath = path.join(AGENTS_DIR, file);
        const agent = await parseAgentFile(filePath);
        if (agent) {
          loadedAgents.push(agent);
        }
      }

      expect(loadedAgents.length).toBe(22);
    });

    it('should successfully parse all agent frontmatter', async () => {
      const files = await fs.readdir(AGENTS_DIR);
      const mdFiles = files.filter(f => f.endsWith('.md'));

      for (const file of mdFiles) {
        const filePath = path.join(AGENTS_DIR, file);
        const agent = await parseAgentFile(filePath);

        expect(agent).not.toBeNull();
        expect(agent?.frontmatter).toBeDefined();
        expect(agent?.frontmatter.name).toBeDefined();
        expect(agent?.frontmatter.description).toBeDefined();
        // model and tools are optional (some agents like governance-verifier use different formats)
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
      const results = await validateAgentDirectory(AGENTS_DIR);

      const names = results.map(r => r.agentName).filter(n => n !== null);
      const uniqueNames = new Set(names);

      // Check for duplicates
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

      if (duplicates.length > 0) {
        console.log('\nDuplicate agent names found:', duplicates);
      }

      expect(duplicates).toHaveLength(0);
      expect(uniqueNames.size).toBe(names.length);
    });
  });

  describe('Agent Colors', () => {
    it('should track color usage across all agents', async () => {
      const files = await fs.readdir(AGENTS_DIR);
      const mdFiles = files.filter(f => f.endsWith('.md'));

      const colorMap = new Map<string, string[]>();

      for (const file of mdFiles) {
        const filePath = path.join(AGENTS_DIR, file);
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

      console.log('\nColor usage across agents:');
      for (const [color, agents] of colorMap.entries()) {
        console.log(`  ${color}: ${agents.length} agent(s) - ${agents.join(', ')}`);
      }

      // Check for duplicate colors
      const duplicateColors = Array.from(colorMap.entries()).filter(
        ([, agents]) => agents.length > 1
      );

      if (duplicateColors.length > 0) {
        console.log('\nWarning: Multiple agents share the same color:');
        for (const [color, agents] of duplicateColors) {
          console.log(`  ${color}: ${agents.join(', ')}`);
        }
      }

      // This is a warning, not a failure - agents can share colors
      expect(colorMap.size).toBeGreaterThan(0);
    });

    it('should have unique colors for most agents', async () => {
      const files = await fs.readdir(AGENTS_DIR);
      const mdFiles = files.filter(f => f.endsWith('.md'));

      const colorMap = new Map<string, string[]>();

      for (const file of mdFiles) {
        const filePath = path.join(AGENTS_DIR, file);
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

      // Count how many colors are unique
      const uniqueColors = Array.from(colorMap.values()).filter(
        agents => agents.length === 1
      ).length;

      const totalAgents = mdFiles.length;
      const uniquePercentage = (uniqueColors / totalAgents) * 100;

      console.log(`\nColor uniqueness: ${uniqueColors}/${totalAgents} agents have unique colors (${uniquePercentage.toFixed(1)}%)`);

      // At least 50% of agents should have unique colors for visual distinction
      expect(uniquePercentage).toBeGreaterThan(50);
    });
  });

  describe('Agent Naming Conventions', () => {
    it('should follow naming conventions for most agents', async () => {
      const files = await fs.readdir(AGENTS_DIR);
      const mdFiles = files.filter(f => f.endsWith('.md'));

      const followsConvention: string[] = [];
      const exceptions: string[] = [];

      // Expected patterns:
      // - [AFRG]-*.md for standard agents
      // - [NXTG-CEO]-*.md for CEO agent
      // - forge-oracle.md as specific exception

      const conventionPatterns = [
        /^\[AFRG\]-.*\.md$/,
        /^\[NXTG-CEO\]-.*\.md$/,
        /^forge-oracle\.md$/
      ];

      for (const file of mdFiles) {
        const matchesPattern = conventionPatterns.some(pattern => pattern.test(file));

        if (matchesPattern) {
          followsConvention.push(file);
        } else {
          exceptions.push(file);
        }
      }

      console.log(`\nNaming convention compliance:`);
      console.log(`  Follows convention: ${followsConvention.length}/${mdFiles.length}`);
      console.log(`  Exceptions: ${exceptions.length}`);

      if (exceptions.length > 0) {
        console.log(`  Exception files:`, exceptions);
      }

      // Most agents should follow the convention
      const conventionPercentage = (followsConvention.length / mdFiles.length) * 100;
      expect(conventionPercentage).toBeGreaterThan(80);
    });

    it('should categorize agents by prefix', async () => {
      const files = await fs.readdir(AGENTS_DIR);
      const mdFiles = files.filter(f => f.endsWith('.md'));

      const categories = {
        'AFRG (Forge)': [] as string[],
        'NXTG-CEO': [] as string[],
        'Other': [] as string[]
      };

      for (const file of mdFiles) {
        if (file.startsWith('[AFRG]')) {
          categories['AFRG (Forge)'].push(file);
        } else if (file.startsWith('[NXTG-CEO]')) {
          categories['NXTG-CEO'].push(file);
        } else {
          categories['Other'].push(file);
        }
      }

      console.log('\nAgent categories:');
      for (const [category, files] of Object.entries(categories)) {
        console.log(`  ${category}: ${files.length} agent(s)`);
        if (files.length > 0 && files.length <= 5) {
          files.forEach(f => console.log(`    - ${f}`));
        }
      }

      // Most agents should be AFRG agents
      expect(categories['AFRG (Forge)'].length).toBeGreaterThan(15);
      expect(categories['NXTG-CEO'].length).toBeGreaterThan(0);
    });
  });

  describe('Agent Tools Distribution', () => {
    it('should analyze tool usage across all agents', async () => {
      const files = await fs.readdir(AGENTS_DIR);
      const mdFiles = files.filter(f => f.endsWith('.md'));

      const toolUsage = new Map<string, number>();

      for (const file of mdFiles) {
        const filePath = path.join(AGENTS_DIR, file);
        const agent = await parseAgentFile(filePath);

        if (agent && agent.frontmatter.tools) {
          const tools = agent.frontmatter.tools
            .split(',')
            .map(t => t.trim())
            .filter(t => t.length > 0);

          for (const tool of tools) {
            toolUsage.set(tool, (toolUsage.get(tool) || 0) + 1);
          }
        }
      }

      console.log('\nTool usage across all agents:');
      const sortedTools = Array.from(toolUsage.entries()).sort((a, b) => b[1] - a[1]);
      for (const [tool, count] of sortedTools) {
        const percentage = ((count / mdFiles.length) * 100).toFixed(1);
        console.log(`  ${tool}: ${count}/${mdFiles.length} agents (${percentage}%)`);
      }

      // At least some common tools should be used
      expect(toolUsage.size).toBeGreaterThan(0);
      expect(toolUsage.get('Read')).toBeGreaterThan(0);
    });

    it('should ensure agents have appropriate tool access', async () => {
      const files = await fs.readdir(AGENTS_DIR);
      const mdFiles = files.filter(f => f.endsWith('.md'));

      const agentsWithoutRead: string[] = [];
      const agentsWithWrite: string[] = [];
      const agentsWithTask: string[] = [];

      for (const file of mdFiles) {
        const filePath = path.join(AGENTS_DIR, file);
        const agent = await parseAgentFile(filePath);

        if (agent && agent.frontmatter.tools) {
          const tools = agent.frontmatter.tools
            .split(',')
            .map(t => t.trim())
            .filter(t => t.length > 0);

          const agentName = agent.frontmatter.name;

          if (!tools.includes('Read')) {
            agentsWithoutRead.push(agentName);
          }
          if (tools.includes('Write')) {
            agentsWithWrite.push(agentName);
          }
          if (tools.includes('Task')) {
            agentsWithTask.push(agentName);
          }
        }
      }

      console.log('\nTool access patterns:');
      console.log(`  Agents without Read access: ${agentsWithoutRead.length}`);
      if (agentsWithoutRead.length > 0) {
        console.log(`    ${agentsWithoutRead.join(', ')}`);
      }
      console.log(`  Agents with Write access: ${agentsWithWrite.length}`);
      console.log(`  Agents with Task access: ${agentsWithTask.length}`);

      // Most agents should have Read access
      expect(agentsWithoutRead.length).toBeLessThan(5);
    });
  });

  describe('Agent Description Quality', () => {
    it('should ensure all agents have meaningful descriptions', async () => {
      const files = await fs.readdir(AGENTS_DIR);
      const mdFiles = files.filter(f => f.endsWith('.md'));

      const descriptionLengths: Array<{ name: string; length: number }> = [];

      for (const file of mdFiles) {
        const filePath = path.join(AGENTS_DIR, file);
        const agent = await parseAgentFile(filePath);

        if (agent) {
          descriptionLengths.push({
            name: agent.frontmatter.name,
            length: agent.frontmatter.description.length
          });
        }
      }

      const avgLength =
        descriptionLengths.reduce((sum, d) => sum + d.length, 0) /
        descriptionLengths.length;

      const shortDescriptions = descriptionLengths.filter(d => d.length < 50);

      console.log(`\nAgent description statistics:`);
      console.log(`  Average length: ${avgLength.toFixed(0)} characters`);
      console.log(`  Shortest: ${Math.min(...descriptionLengths.map(d => d.length))} characters`);
      console.log(`  Longest: ${Math.max(...descriptionLengths.map(d => d.length))} characters`);

      if (shortDescriptions.length > 0) {
        console.log(`  Agents with short descriptions (< 50 chars):`);
        shortDescriptions.forEach(d => console.log(`    - ${d.name}: ${d.length} chars`));
      }

      // Average description length should be reasonable
      expect(avgLength).toBeGreaterThan(100);
    });
  });

  describe('Agent System Prompt Quality', () => {
    it('should ensure all agents have substantial system prompts', async () => {
      const files = await fs.readdir(AGENTS_DIR);
      const mdFiles = files.filter(f => f.endsWith('.md'));

      const promptStats: Array<{ name: string; length: number; hasExamples: boolean }> = [];

      for (const file of mdFiles) {
        const filePath = path.join(AGENTS_DIR, file);
        const agent = await parseAgentFile(filePath);

        if (agent) {
          const fullContent = (agent.frontmatter.description + '\n' + agent.systemPrompt).toLowerCase();
          const hasExamples =
            fullContent.includes('example') ||
            fullContent.includes('usage');

          promptStats.push({
            name: agent.frontmatter.name,
            length: agent.systemPrompt.length,
            hasExamples
          });
        }
      }

      const avgLength =
        promptStats.reduce((sum, p) => sum + p.length, 0) / promptStats.length;

      const withExamples = promptStats.filter(p => p.hasExamples).length;
      const shortPrompts = promptStats.filter(p => p.length < 500);

      console.log(`\nSystem prompt statistics:`);
      console.log(`  Average length: ${avgLength.toFixed(0)} characters`);
      console.log(`  Agents with examples: ${withExamples}/${promptStats.length}`);
      console.log(`  Shortest prompt: ${Math.min(...promptStats.map(p => p.length))} characters`);
      console.log(`  Longest prompt: ${Math.max(...promptStats.map(p => p.length))} characters`);

      if (shortPrompts.length > 0) {
        console.log(`  Agents with short prompts (< 500 chars):`);
        shortPrompts.forEach(p => console.log(`    - ${p.name}: ${p.length} chars`));
      }

      // Average prompt length should be substantial
      expect(avgLength).toBeGreaterThan(1000);

      // At least half of agents should have examples (in description or system prompt)
      expect(withExamples / promptStats.length).toBeGreaterThan(0.5);
    });
  });

  describe('Agent Registry Summary', () => {
    it('should generate a comprehensive agent registry report', async () => {
      const results = await validateAgentDirectory(AGENTS_DIR);

      console.log('\n' + '='.repeat(60));
      console.log('AGENT REGISTRY SUMMARY');
      console.log('='.repeat(60));

      console.log(`\nTotal Agents: ${results.length}`);
      console.log(`Valid Agents: ${results.filter(r => r.valid).length}`);
      console.log(`Invalid Agents: ${results.filter(r => !r.valid).length}`);

      const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
      const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);

      console.log(`Total Errors: ${totalErrors}`);
      console.log(`Total Warnings: ${totalWarnings}`);

      console.log('\nAll agents:');
      const sortedResults = results.sort((a, b) => {
        const nameA = a.agentName || '';
        const nameB = b.agentName || '';
        return nameA.localeCompare(nameB);
      });

      for (const result of sortedResults) {
        const status = result.valid ? '✓' : '✗';
        const warnings = result.warnings.length > 0 ? ` (${result.warnings.length} warnings)` : '';
        console.log(`  ${status} ${result.agentName}${warnings}`);
      }

      console.log('\n' + '='.repeat(60));

      // All agents should be valid
      expect(results.filter(r => !r.valid).length).toBe(0);
    });
  });
});
