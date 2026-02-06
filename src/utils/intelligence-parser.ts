/**
 * Intelligence Card Parser
 * Parses Claude Code's native MEMORY.md and governance.json into structured intelligence cards
 */

import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";

export interface IntelligenceCard {
  id: string;
  title: string;
  category: "rule" | "decision" | "pattern" | "discovery" | "architecture";
  content: string;
  priority: "critical" | "high" | "medium" | "low";
  estimatedTokens: number;
  source: "native-memory" | "governance" | "project-state";
  tags: string[];
  lastUpdated: string;
}

export interface IntelligenceCardBudget {
  cards: IntelligenceCard[];
  totalTokens: number;
  cardCount: number;
  categoryCounts: Record<string, number>;
  priorityCounts: Record<string, number>;
}

/**
 * Estimate token count from text (words * 1.3 is a rough approximation)
 */
function estimateTokens(text: string): number {
  const words = text.trim().split(/\s+/).length;
  return Math.ceil(words * 1.3);
}

/**
 * Extract tags from markdown heading text
 */
function extractTags(heading: string, content: string): string[] {
  const tags: string[] = [];

  // Extract from heading
  const headingLower = heading.toLowerCase();
  if (headingLower.includes("critical")) tags.push("critical");
  if (headingLower.includes("rule")) tags.push("rule");
  if (headingLower.includes("decision")) tags.push("decision");
  if (headingLower.includes("architecture")) tags.push("architecture");
  if (headingLower.includes("discovered") || headingLower.includes("discovery")) tags.push("discovery");

  // Extract dates in YYYY-MM-DD format
  const datePattern = /\b20\d{2}-\d{2}-\d{2}\b/g;
  const dates = content.match(datePattern);
  if (dates && dates.length > 0) {
    tags.push(dates[0]); // Add first date as tag
  }

  // Extract common project keywords
  const contentLower = content.toLowerCase();
  if (contentLower.includes("claude code")) tags.push("claude-code");
  if (contentLower.includes("nxtg-forge")) tags.push("nxtg-forge");
  if (contentLower.includes("typescript")) tags.push("typescript");
  if (contentLower.includes("agent")) tags.push("agents");
  if (contentLower.includes("memory")) tags.push("memory");
  if (contentLower.includes("governance")) tags.push("governance");

  return Array.from(new Set(tags)); // Deduplicate
}

/**
 * Determine priority from heading level and keywords
 */
function determinePriority(heading: string, content: string): IntelligenceCard["priority"] {
  const headingLower = heading.toLowerCase();
  const contentLower = content.toLowerCase();

  if (headingLower.includes("critical") || contentLower.includes("blocking")) {
    return "critical";
  }
  if (headingLower.includes("rule") || headingLower.includes("must")) {
    return "critical";
  }
  if (headingLower.includes("decision") || headingLower.includes("architecture")) {
    return "high";
  }
  if (headingLower.includes("discovery") || headingLower.includes("pattern")) {
    return "medium";
  }
  return "low";
}

/**
 * Determine category from heading and content
 */
function determineCategory(heading: string, content: string): IntelligenceCard["category"] {
  const headingLower = heading.toLowerCase();
  const contentLower = content.toLowerCase();

  if (headingLower.includes("rule")) return "rule";
  if (headingLower.includes("decision")) return "decision";
  if (headingLower.includes("pattern")) return "pattern";
  if (headingLower.includes("discovery") || headingLower.includes("discovered")) return "discovery";
  if (headingLower.includes("architecture")) return "architecture";

  // Content-based fallback
  if (contentLower.includes("must") || contentLower.includes("never")) return "rule";
  if (contentLower.includes("decided") || contentLower.includes("choice")) return "decision";

  return "pattern";
}

/**
 * Parse a markdown section into an intelligence card
 */
function parseSection(
  heading: string,
  content: string,
  headingLevel: number,
  source: IntelligenceCard["source"],
  lastUpdated: string
): IntelligenceCard | null {
  // Skip empty sections
  const trimmedContent = content.trim();
  if (!trimmedContent || trimmedContent.length < 20) {
    return null;
  }

  // Create distilled content (first 2-3 sentences or 200 chars, whichever is shorter)
  let distilledContent = trimmedContent;
  const sentences = trimmedContent.split(/[.!?]\s+/);
  if (sentences.length > 3) {
    distilledContent = sentences.slice(0, 3).join(". ") + ".";
  }
  if (distilledContent.length > 250) {
    distilledContent = distilledContent.substring(0, 247) + "...";
  }

  const category = determineCategory(heading, content);
  const priority = determinePriority(heading, content);
  const tags = extractTags(heading, content);

  return {
    id: `intel-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    title: heading.replace(/^#+\s*/, "").trim(),
    category,
    content: distilledContent,
    priority,
    estimatedTokens: estimateTokens(distilledContent),
    source,
    tags,
    lastUpdated,
  };
}

/**
 * Parse MEMORY.md file into intelligence cards
 */
export async function parseMemoryMd(memoryPath: string): Promise<IntelligenceCard[]> {
  const cards: IntelligenceCard[] = [];

  try {
    const content = await fs.readFile(memoryPath, "utf-8");
    const stats = await fs.stat(memoryPath);
    const lastUpdated = stats.mtime.toISOString();

    // Split by headings (## or ###)
    const sections = content.split(/^(#{2,3}\s+.+)$/gm);

    for (let i = 1; i < sections.length; i += 2) {
      const heading = sections[i];
      const sectionContent = sections[i + 1] || "";

      // Determine heading level
      const headingLevel = heading.match(/^#+/)?.[0].length || 2;

      const card = parseSection(
        heading,
        sectionContent,
        headingLevel,
        "native-memory",
        lastUpdated
      );

      if (card) {
        cards.push(card);
      }
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      // File not found - return empty array
      return [];
    }
    throw error;
  }

  return cards;
}

/**
 * Parse governance.json into intelligence cards
 */
export async function parseGovernanceJson(governancePath: string): Promise<IntelligenceCard[]> {
  const cards: IntelligenceCard[] = [];

  try {
    const content = await fs.readFile(governancePath, "utf-8");
    const governance = JSON.parse(content);
    const lastUpdated = governance.constitution?.updatedAt || new Date().toISOString();

    // Parse constitution directive
    if (governance.constitution?.directive) {
      cards.push({
        id: `gov-constitution-${Date.now()}`,
        title: "Constitution Directive",
        category: "architecture",
        content: governance.constitution.directive,
        priority: "critical",
        estimatedTokens: estimateTokens(governance.constitution.directive),
        source: "governance",
        tags: ["constitution", "directive"],
        lastUpdated,
      });
    }

    // Parse vision (as single card)
    if (governance.constitution?.vision && Array.isArray(governance.constitution.vision)) {
      const visionText = governance.constitution.vision.join(" | ");
      cards.push({
        id: `gov-vision-${Date.now()}`,
        title: "Vision Statement",
        category: "architecture",
        content: visionText,
        priority: "high",
        estimatedTokens: estimateTokens(visionText),
        source: "governance",
        tags: ["vision", "strategy"],
        lastUpdated,
      });
    }

    // Parse blocked workstreams
    if (governance.workstreams && Array.isArray(governance.workstreams)) {
      governance.workstreams
        .filter((ws: { status: string }) => ws.status === "blocked")
        .forEach((ws: { name: string; description: string; id: string }) => {
          cards.push({
            id: `gov-blocked-${ws.id}`,
            title: `BLOCKED: ${ws.name}`,
            category: "decision",
            content: ws.description,
            priority: "critical",
            estimatedTokens: estimateTokens(ws.description),
            source: "governance",
            tags: ["blocked", "workstream"],
            lastUpdated,
          });
        });
    }

    // Parse critical sentinel logs (only last 5)
    if (governance.sentinelLog && Array.isArray(governance.sentinelLog)) {
      governance.sentinelLog
        .filter((log: { severity: string }) => log.severity === "critical")
        .slice(-5)
        .forEach((log: { message: string; id: string; timestamp: number }) => {
          cards.push({
            id: `gov-sentinel-${log.id}`,
            title: "Critical Governance Alert",
            category: "rule",
            content: log.message,
            priority: "critical",
            estimatedTokens: estimateTokens(log.message),
            source: "governance",
            tags: ["sentinel", "critical"],
            lastUpdated: new Date(log.timestamp).toISOString(),
          });
        });
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      // File not found - return empty array
      return [];
    }
    throw error;
  }

  return cards;
}

/**
 * Get intelligence cards from all sources
 */
export async function getAllIntelligenceCards(
  projectRoot: string
): Promise<IntelligenceCardBudget> {
  // Determine memory path (Claude Code native location)
  const homeDir = os.homedir();
  const projectHash = path.basename(projectRoot).replace(/[^a-zA-Z0-9]/g, "-");
  const memoryPath = path.join(
    homeDir,
    ".claude",
    "projects",
    `-home-axw-projects-NXTG-Forge-v3`,
    "memory",
    "MEMORY.md"
  );

  // Governance path
  const governancePath = path.join(projectRoot, ".claude", "governance.json");

  // Parse all sources
  const [memoryCards, governanceCards] = await Promise.all([
    parseMemoryMd(memoryPath),
    parseGovernanceJson(governancePath),
  ]);

  // Combine and sort by priority
  const allCards = [...memoryCards, ...governanceCards];

  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  allCards.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  // Calculate statistics
  const totalTokens = allCards.reduce((sum, card) => sum + card.estimatedTokens, 0);

  const categoryCounts: Record<string, number> = {};
  const priorityCounts: Record<string, number> = {};

  allCards.forEach((card) => {
    categoryCounts[card.category] = (categoryCounts[card.category] || 0) + 1;
    priorityCounts[card.priority] = (priorityCounts[card.priority] || 0) + 1;
  });

  return {
    cards: allCards,
    totalTokens,
    cardCount: allCards.length,
    categoryCounts,
    priorityCounts,
  };
}

/**
 * Get compact intelligence cards for agent context injection (only critical and high priority)
 */
export async function getCompactIntelligenceCards(
  projectRoot: string
): Promise<IntelligenceCardBudget> {
  const fullBudget = await getAllIntelligenceCards(projectRoot);

  // Filter to only critical and high priority
  const compactCards = fullBudget.cards.filter(
    (card) => card.priority === "critical" || card.priority === "high"
  );

  // Recalculate statistics
  const totalTokens = compactCards.reduce((sum, card) => sum + card.estimatedTokens, 0);

  const categoryCounts: Record<string, number> = {};
  const priorityCounts: Record<string, number> = {};

  compactCards.forEach((card) => {
    categoryCounts[card.category] = (categoryCounts[card.category] || 0) + 1;
    priorityCounts[card.priority] = (priorityCounts[card.priority] || 0) + 1;
  });

  return {
    cards: compactCards,
    totalTokens,
    cardCount: compactCards.length,
    categoryCounts,
    priorityCounts,
  };
}
