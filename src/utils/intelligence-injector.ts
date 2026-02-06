/**
 * Intelligence Injector
 * Selects and formats the most relevant intelligence cards
 * for injection into agent task prompts.
 *
 * Design goal: Smallest possible token footprint with maximum intelligence value.
 */

import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { Result } from "./result";

/**
 * Intelligence card priority levels
 */
export type IntelligencePriority = "critical" | "high" | "medium" | "low";

/**
 * Intelligence card categories
 */
export type IntelligenceCategory =
  | "RULE"
  | "DECISION"
  | "PATTERN"
  | "LEARNING"
  | "WARNING"
  | "STATUS";

/**
 * Intelligence card extracted from MEMORY.md
 */
export interface IntelligenceCard {
  category: IntelligenceCategory;
  priority: IntelligencePriority;
  content: string;
  tags: string[];
  source: string; // Section in MEMORY.md
}

/**
 * Options for intelligence context generation
 */
export interface IntelligenceOptions {
  maxTokens?: number; // Approximate token limit (default: 500)
  categories?: IntelligenceCategory[]; // Filter by category
  minPriority?: IntelligencePriority; // Minimum priority level
  contextKeywords?: string[]; // Keywords for relevance matching
}

/**
 * Priority weights for card selection
 */
const PRIORITY_WEIGHTS: Record<IntelligencePriority, number> = {
  critical: 100,
  high: 50,
  medium: 25,
  low: 10,
};

/**
 * Priority threshold mapping
 */
const PRIORITY_THRESHOLD: Record<IntelligencePriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

/**
 * Approximate token estimation (4 chars ≈ 1 token)
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Extract priority from content markers
 */
function extractPriority(content: string): IntelligencePriority {
  const lower = content.toLowerCase();
  if (lower.includes("critical") || lower.includes("must")) {
    return "critical";
  }
  if (lower.includes("important") || lower.includes("should")) {
    return "high";
  }
  if (lower.includes("recommend")) {
    return "medium";
  }
  return "low";
}

/**
 * Extract tags from content (simple keyword extraction)
 */
function extractTags(content: string): string[] {
  const tags = new Set<string>();
  const lower = content.toLowerCase();

  // Common technical keywords
  const keywords = [
    "api",
    "memory",
    "result",
    "error",
    "test",
    "governance",
    "command",
    "worker",
    "agent",
    "typescript",
    "claude",
    "zellij",
    "terminal",
    "session",
    "ui",
  ];

  for (const keyword of keywords) {
    if (lower.includes(keyword)) {
      tags.add(keyword);
    }
  }

  return Array.from(tags);
}

/**
 * Parse intelligence cards from MEMORY.md content
 */
function parseMemoryContent(content: string): IntelligenceCard[] {
  const cards: IntelligenceCard[] = [];
  const lines = content.split("\n");
  let currentSection = "unknown";
  let inRule = false;
  let ruleBuffer: string[] = [];
  let ruleTitle = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Track section headings
    if (line.startsWith("##")) {
      currentSection = line.replace(/^#+\s*/, "").toLowerCase();
      continue;
    }

    // Rule blocks
    if (line.startsWith("###")) {
      // Save previous rule if exists
      if (inRule && ruleBuffer.length > 0) {
        const content = ruleBuffer.join(" ").trim();
        cards.push({
          category: "RULE",
          priority: extractPriority(ruleTitle + " " + content),
          content: `${ruleTitle}: ${content}`,
          tags: extractTags(content),
          source: currentSection,
        });
      }

      // Start new rule
      inRule = true;
      ruleTitle = line.replace(/^#+\s*/, "");
      ruleBuffer = [];
      continue;
    }

    // Collect rule content
    if (inRule && line && !line.startsWith("#")) {
      // Skip markdown headers and bullet formatting
      const cleaned = line
        .replace(/^\*\*.*?\*\*:?\s*/, "")
        .replace(/^-\s*/, "")
        .replace(/^>\s*/, "");
      if (cleaned && !cleaned.startsWith("```") && !cleaned.startsWith("|")) {
        ruleBuffer.push(cleaned);
      }
    }

    // Decision statements
    if (
      line.includes("Decision") ||
      line.includes("Recommendation") ||
      line.includes("Architecture:")
    ) {
      cards.push({
        category: "DECISION",
        priority: "high",
        content: line.replace(/^-\s*/, "").replace(/^\*\*/, "").replace(/\*\*$/, ""),
        tags: extractTags(line),
        source: currentSection,
      });
    }

    // Status information
    if (line.includes("Status:") || line.includes("EXISTS") || line.includes("WORKS")) {
      cards.push({
        category: "STATUS",
        priority: "medium",
        content: line.replace(/^-\s*/, ""),
        tags: extractTags(line),
        source: currentSection,
      });
    }

    // Warnings/Issues
    if (
      line.includes("EMPTY") ||
      line.includes("PARTIAL") ||
      line.includes("broken") ||
      line.includes("violation")
    ) {
      cards.push({
        category: "WARNING",
        priority: "high",
        content: line.replace(/^-\s*/, ""),
        tags: extractTags(line),
        source: currentSection,
      });
    }
  }

  // Save final rule if exists
  if (inRule && ruleBuffer.length > 0) {
    const content = ruleBuffer.join(" ").trim();
    cards.push({
      category: "RULE",
      priority: extractPriority(ruleTitle + " " + content),
      content: `${ruleTitle}: ${content}`,
      tags: extractTags(content),
      source: currentSection,
    });
  }

  return cards;
}

/**
 * Get the path to Claude's MEMORY.md for this project
 */
async function getMemoryPath(): Promise<Result<string, string>> {
  try {
    // Claude Code stores memories at ~/.claude/projects/{hash}/memory/MEMORY.md
    const claudeDir = path.join(os.homedir(), ".claude", "projects");

    // For NXTG-Forge, the hash is -home-axw-projects-NXTG-Forge-v3
    // But we should try to find it dynamically
    const projectName = "NXTG-Forge";
    const cwd = process.cwd();

    // Try the known path first
    const knownPath = path.join(
      claudeDir,
      "-home-axw-projects-NXTG-Forge-v3",
      "memory",
      "MEMORY.md",
    );

    try {
      await fs.access(knownPath);
      return Result.ok(knownPath);
    } catch {
      // Known path doesn't exist, try to find it
    }

    // Scan for matching project directories
    try {
      const projects = await fs.readdir(claudeDir);
      for (const project of projects) {
        if (project.includes(projectName.toLowerCase())) {
          const memoryPath = path.join(claudeDir, project, "memory", "MEMORY.md");
          try {
            await fs.access(memoryPath);
            return Result.ok(memoryPath);
          } catch {
            continue;
          }
        }
      }
    } catch {
      // Claude directory doesn't exist or is not accessible
    }

    return Result.err("MEMORY.md not found in Claude project directories");
  } catch (error) {
    return Result.err(
      error instanceof Error ? error.message : "Failed to locate MEMORY.md",
    );
  }
}

/**
 * Read and parse intelligence cards from MEMORY.md
 */
async function readIntelligenceCards(): Promise<Result<IntelligenceCard[], string>> {
  const pathResult = await getMemoryPath();
  if (pathResult.isErr()) {
    return Result.err(pathResult.error);
  }

  try {
    const content = await fs.readFile(pathResult.value, "utf-8");
    const cards = parseMemoryContent(content);
    return Result.ok(cards);
  } catch (error) {
    return Result.err(
      error instanceof Error ? error.message : "Failed to read MEMORY.md",
    );
  }
}

/**
 * Calculate relevance score for a card given context keywords
 */
function calculateRelevance(card: IntelligenceCard, keywords: string[]): number {
  if (keywords.length === 0) {
    return PRIORITY_WEIGHTS[card.priority];
  }

  const keywordLower = keywords.map((k) => k.toLowerCase());
  const cardText = card.content.toLowerCase();
  const cardTags = card.tags.map((t) => t.toLowerCase());

  let matchScore = 0;

  // Exact tag matches are highly valuable
  for (const tag of cardTags) {
    if (keywordLower.includes(tag)) {
      matchScore += 50;
    }
  }

  // Keyword presence in content
  for (const keyword of keywordLower) {
    if (cardText.includes(keyword)) {
      matchScore += 20;
    }
  }

  // Priority weight
  matchScore += PRIORITY_WEIGHTS[card.priority];

  return matchScore;
}

/**
 * Filter cards by priority threshold
 */
function filterByPriority(
  cards: IntelligenceCard[],
  minPriority: IntelligencePriority,
): IntelligenceCard[] {
  const threshold = PRIORITY_THRESHOLD[minPriority];
  return cards.filter((card) => PRIORITY_THRESHOLD[card.priority] <= threshold);
}

/**
 * Filter cards by categories
 */
function filterByCategories(
  cards: IntelligenceCard[],
  categories: IntelligenceCategory[],
): IntelligenceCard[] {
  if (categories.length === 0) {
    return cards;
  }
  return cards.filter((card) => categories.includes(card.category));
}

/**
 * Select the most relevant cards within token budget
 */
export function selectRelevantCards(
  cards: IntelligenceCard[],
  context: string,
  maxTokens: number,
): IntelligenceCard[] {
  // Extract keywords from context
  const keywords = context
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 3);

  // Calculate relevance scores
  const scored = cards.map((card) => ({
    card,
    score: calculateRelevance(card, keywords),
  }));

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Select cards within token budget
  const selected: IntelligenceCard[] = [];
  let tokenCount = 0;
  const overhead = estimateTokens("[INTELLIGENCE]\n[/INTELLIGENCE]\n");

  for (const { card } of scored) {
    const cardTokens = estimateTokens(formatCardForInjection(card) + "\n");
    if (tokenCount + cardTokens + overhead <= maxTokens) {
      selected.push(card);
      tokenCount += cardTokens;
    } else {
      break;
    }
  }

  return selected;
}

/**
 * Format a single card for injection
 */
export function formatCardForInjection(card: IntelligenceCard): string {
  // Truncate content to 100 chars if needed
  let content = card.content;
  if (content.length > 100) {
    content = content.substring(0, 97) + "...";
  }

  return `- ${card.category}: ${content} [${card.priority}]`;
}

/**
 * Get intelligence context for agent task injection
 */
export async function getIntelligenceContext(
  options: IntelligenceOptions = {},
): Promise<string> {
  const {
    maxTokens = 500,
    categories = [],
    minPriority = "high",
    contextKeywords = [],
  } = options;

  // Read intelligence cards
  const cardsResult = await readIntelligenceCards();
  if (cardsResult.isErr()) {
    // Silently fail - no intelligence available
    return "";
  }

  let cards = cardsResult.value;

  // Apply filters
  cards = filterByPriority(cards, minPriority);
  cards = filterByCategories(cards, categories);

  if (cards.length === 0) {
    return "";
  }

  // Select relevant cards within budget
  const context = contextKeywords.join(" ");
  const selected = selectRelevantCards(cards, context, maxTokens);

  if (selected.length === 0) {
    return "";
  }

  // Format injection block
  const lines = ["[INTELLIGENCE]"];
  for (const card of selected) {
    lines.push(formatCardForInjection(card));
  }
  lines.push("[/INTELLIGENCE]");

  return lines.join("\n");
}

/**
 * Inject intelligence context into task command/args
 */
export function injectIntelligence(
  command: string,
  args: string[] | undefined,
  intelligence: string,
): { command: string; args: string[] | undefined } {
  if (!intelligence) {
    return { command, args };
  }

  // Prepend intelligence to the first argument if args exist, otherwise to command
  if (args && args.length > 0) {
    return {
      command,
      args: [intelligence + "\n\n" + args[0], ...args.slice(1)],
    };
  }

  return {
    command: intelligence + "\n\n" + command,
    args,
  };
}
