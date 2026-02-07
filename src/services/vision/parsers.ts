/**
 * Vision Service - YAML and Markdown Parsing Utilities
 */

import * as yaml from "js-yaml";

/**
 * Vision file format
 */
export interface VisionFile {
  frontmatter: Record<string, unknown>;
  content: string;
}

/**
 * Parse vision file with YAML frontmatter
 */
export function parseVisionFile(content: string): VisionFile {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (match) {
    return {
      frontmatter: yaml.load(match[1]) as Record<string, unknown>,
      content: match[2].trim(),
    };
  }

  return {
    frontmatter: {},
    content: content.trim(),
  };
}

/**
 * Parse markdown sections
 */
export function parseMarkdownSections(
  content: string,
): Record<string, string | string[]> {
  const sections: Record<string, string | string[]> = {};
  const lines = content.split("\n");

  let currentSection = "";
  let sectionContent: string[] = [];

  for (const line of lines) {
    if (line.startsWith("## ")) {
      // Save previous section
      if (currentSection && sectionContent.length > 0) {
        sections[currentSection] = parseSectionContent(sectionContent);
      }

      // Start new section
      currentSection = line.substring(3).toLowerCase().replace(/\s+/g, "");
      sectionContent = [];
    } else if (currentSection) {
      sectionContent.push(line);
    }
  }

  // Save last section
  if (currentSection && sectionContent.length > 0) {
    sections[currentSection] = parseSectionContent(sectionContent);
  }

  return sections;
}

/**
 * Parse section content
 */
export function parseSectionContent(lines: string[]): string | string[] {
  const content = lines.join("\n").trim();

  // Check if it's a list
  if (content.includes("\n- ") || content.startsWith("- ")) {
    return content
      .split("\n")
      .filter((line) => line.startsWith("- "))
      .map((line) => line.substring(2).trim());
  }

  // Otherwise return as string
  return content;
}

/**
 * Extract keywords from text
 */
export function extractKeywords(text: string): string[] {
  const stopWords = [
    "the",
    "a",
    "an",
    "and",
    "or",
    "but",
    "in",
    "on",
    "at",
    "to",
    "for",
  ];
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((word) => word.length > 3 && !stopWords.includes(word));

  return [...new Set(words)];
}
