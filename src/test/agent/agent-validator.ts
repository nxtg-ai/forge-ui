import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';

/**
 * Validation result for a single agent file
 */
export interface AgentValidationResult {
  filePath: string;
  agentName: string | null;
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Parsed agent file structure
 */
export interface AgentFile {
  frontmatter: AgentFrontmatter;
  systemPrompt: string;
  filePath: string;
}

/**
 * Agent frontmatter structure
 */
export interface AgentFrontmatter {
  name: string;
  description: string;
  model: string;
  color: string;
  tools: string;
}

/**
 * Validation configuration
 */
export interface ValidationConfig {
  requiredFields: string[];
  validModels: string[];
  validTools: string[];
  minPromptLength: number;
}

/**
 * Default validation configuration
 */
export const DEFAULT_CONFIG: ValidationConfig = {
  requiredFields: ['name', 'description'],
  validModels: ['sonnet', 'opus', 'haiku'],
  validTools: [
    'Glob',
    'Grep',
    'Read',
    'Write',
    'Edit',
    'Bash',
    'TodoWrite',
    'Task',
    'WebSearch',
    'WebFetch'
  ],
  minPromptLength: 100
};

/**
 * Parse an agent markdown file
 */
export async function parseAgentFile(filePath: string): Promise<AgentFile | null> {
  try {
    let content = await fs.readFile(filePath, 'utf-8');

    // Normalize line endings (handle both \r\n and \n)
    content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Extract YAML frontmatter - match both \n and \r\n styles
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
      return null;
    }

    const frontmatterYaml = frontmatterMatch[1];

    // Try to parse YAML with safe load options
    let frontmatter: any;
    try {
      frontmatter = yaml.load(frontmatterYaml) as AgentFrontmatter;
    } catch (yamlError) {
      // If YAML parsing fails, return null
      console.error(`YAML parse error in ${filePath}:`, yamlError);
      return null;
    }

    // Extract system prompt (everything after frontmatter)
    const systemPrompt = content.slice(frontmatterMatch[0].length).trim();

    return {
      frontmatter,
      systemPrompt,
      filePath
    };
  } catch (error) {
    return null;
  }
}

/**
 * Validate an agent frontmatter
 */
export function validateFrontmatter(
  frontmatter: AgentFrontmatter,
  config: ValidationConfig = DEFAULT_CONFIG
): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required fields
  for (const field of config.requiredFields) {
    if (!(field in frontmatter) || !frontmatter[field as keyof AgentFrontmatter]) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Validate model (optional, but if present must be valid)
  if (frontmatter.model) {
    if (!config.validModels.includes(frontmatter.model)) {
      errors.push(
        `Invalid model: ${frontmatter.model}. Must be one of: ${config.validModels.join(', ')}`
      );
    }
  } else {
    warnings.push('No model specified');
  }

  // Validate tools (optional, but if present should be valid)
  if (frontmatter.tools) {
    const tools = frontmatter.tools
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    for (const tool of tools) {
      if (!config.validTools.includes(tool)) {
        warnings.push(
          `Unknown tool: ${tool}. Valid tools: ${config.validTools.join(', ')}`
        );
      }
    }

    if (tools.length === 0) {
      warnings.push('No tools specified');
    }
  } else {
    warnings.push('No tools field specified');
  }

  // Validate name format
  if (frontmatter.name) {
    if (frontmatter.name.length < 3) {
      errors.push('Agent name too short (minimum 3 characters)');
    }
    if (frontmatter.name.length > 50) {
      warnings.push('Agent name is very long (over 50 characters)');
    }
  }

  // Validate description
  if (frontmatter.description) {
    if (frontmatter.description.length < 20) {
      warnings.push('Agent description is very short (under 20 characters)');
    }
  }

  // Validate color (optional)
  if (frontmatter.color) {
    const validColors = [
      'red', 'green', 'blue', 'yellow', 'cyan', 'magenta',
      'orange', 'purple', 'pink', 'teal', 'lime', 'indigo', 'amber'
    ];
    if (!validColors.includes(frontmatter.color)) {
      warnings.push(
        `Unusual color: ${frontmatter.color}. Common colors: ${validColors.join(', ')}`
      );
    }
  } else {
    warnings.push('No color specified');
  }

  return { errors, warnings };
}

/**
 * Validate system prompt
 */
export function validateSystemPrompt(
  systemPrompt: string,
  config: ValidationConfig = DEFAULT_CONFIG
): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if prompt exists
  if (!systemPrompt || systemPrompt.trim().length === 0) {
    errors.push('System prompt is empty');
    return { errors, warnings };
  }

  // Check minimum length
  if (systemPrompt.length < config.minPromptLength) {
    errors.push(
      `System prompt too short (${systemPrompt.length} chars, minimum ${config.minPromptLength})`
    );
  }

  // Check for common issues
  if (systemPrompt.includes('TODO') || systemPrompt.includes('FIXME')) {
    warnings.push('System prompt contains TODO/FIXME markers');
  }

  if (systemPrompt.includes('{{') || systemPrompt.includes('}}')) {
    warnings.push('System prompt contains template placeholders');
  }

  // Check structure
  const hasHeader = systemPrompt.includes('#');
  if (!hasHeader) {
    warnings.push('System prompt lacks markdown headers for structure');
  }

  return { errors, warnings };
}

/**
 * Validate a complete agent file
 */
export async function validateAgentFile(
  filePath: string,
  config: ValidationConfig = DEFAULT_CONFIG
): Promise<AgentValidationResult> {
  const result: AgentValidationResult = {
    filePath,
    agentName: null,
    valid: false,
    errors: [],
    warnings: []
  };

  // Parse the file
  const agentFile = await parseAgentFile(filePath);
  if (!agentFile) {
    result.errors.push('Failed to parse agent file (missing or invalid frontmatter)');
    return result;
  }

  result.agentName = agentFile.frontmatter.name || null;

  // Validate frontmatter
  const frontmatterValidation = validateFrontmatter(agentFile.frontmatter, config);
  result.errors.push(...frontmatterValidation.errors);
  result.warnings.push(...frontmatterValidation.warnings);

  // Validate system prompt
  const promptValidation = validateSystemPrompt(agentFile.systemPrompt, config);
  result.errors.push(...promptValidation.errors);
  result.warnings.push(...promptValidation.warnings);

  // Determine overall validity
  result.valid = result.errors.length === 0;

  return result;
}

/**
 * Validate all agent files in a directory
 */
export async function validateAgentDirectory(
  dirPath: string,
  config: ValidationConfig = DEFAULT_CONFIG
): Promise<AgentValidationResult[]> {
  const results: AgentValidationResult[] = [];

  try {
    const files = await fs.readdir(dirPath);
    const mdFiles = files.filter(f => f.endsWith('.md'));

    for (const file of mdFiles) {
      const filePath = path.join(dirPath, file);
      const result = await validateAgentFile(filePath, config);
      results.push(result);
    }
  } catch (error) {
    console.error(`Failed to read directory: ${dirPath}`, error);
  }

  return results;
}

/**
 * Generate a validation summary report
 */
export function generateValidationReport(results: AgentValidationResult[]): string {
  const total = results.length;
  const valid = results.filter(r => r.valid).length;
  const invalid = total - valid;

  const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
  const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);

  let report = `Agent Validation Report\n`;
  report += `${'='.repeat(50)}\n\n`;
  report += `Total agents: ${total}\n`;
  report += `Valid: ${valid}\n`;
  report += `Invalid: ${invalid}\n`;
  report += `Total errors: ${totalErrors}\n`;
  report += `Total warnings: ${totalWarnings}\n\n`;

  if (invalid > 0) {
    report += `Invalid Agents:\n`;
    report += `${'-'.repeat(50)}\n`;
    for (const result of results.filter(r => !r.valid)) {
      report += `\n${path.basename(result.filePath)}\n`;
      report += `  Agent: ${result.agentName || 'Unknown'}\n`;
      for (const error of result.errors) {
        report += `  ❌ ${error}\n`;
      }
      for (const warning of result.warnings) {
        report += `  ⚠️  ${warning}\n`;
      }
    }
  }

  if (totalWarnings > 0 && invalid === 0) {
    report += `\nWarnings:\n`;
    report += `${'-'.repeat(50)}\n`;
    for (const result of results.filter(r => r.warnings.length > 0)) {
      report += `\n${path.basename(result.filePath)}\n`;
      report += `  Agent: ${result.agentName || 'Unknown'}\n`;
      for (const warning of result.warnings) {
        report += `  ⚠️  ${warning}\n`;
      }
    }
  }

  return report;
}
