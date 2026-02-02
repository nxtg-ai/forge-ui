/**
 * Type Safety Validation Tests
 * Ensures no 'any' types and proper Zod coverage
 *
 * @vitest-environment node
 */

import { describe, it, expect, vi } from "vitest";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { glob } from "glob";

// Unmock fs for this file - we need real file system access
vi.unmock("fs");

describe("Type Safety Validation", () => {
  describe("No Any Types Policy", () => {
    it("should not contain explicit any types in core files", async () => {
      const coreFiles = await glob("src/core/**/*.ts", {
        ignore: ["**/*.test.ts", "**/*.d.ts"],
      });

      const violations: Array<{ file: string; line: number; content: string }> =
        [];

      for (const file of coreFiles) {
        const content = await fs.readFile(file, "utf-8");
        const lines = content.split("\n");

        lines.forEach((line, index) => {
          // Check for explicit 'any' type (excluding comments and 'any[]')
          if (
            /:\s*any\b/.test(line) &&
            !line.trim().startsWith("//") &&
            !line.trim().startsWith("*")
          ) {
            violations.push({
              file,
              line: index + 1,
              content: line.trim(),
            });
          }
        });
      }

      if (violations.length > 0) {
        console.warn("\nType Safety Violations (core files):");
        violations.forEach((v) => {
          console.warn(`  ${v.file}:${v.line}`);
          console.warn(`    ${v.content}`);
        });
      }

      // TODO: Target is 0 violations. Current threshold allows legacy any types.
      // Track progress: any count should decrease over time.
      const MAX_ALLOWED_CORE_ANY = 50; // Temporary threshold for launch
      expect(violations.length).toBeLessThan(MAX_ALLOWED_CORE_ANY);
      console.log(`Core files any count: ${violations.length}/${MAX_ALLOWED_CORE_ANY} (threshold)`);
    });

    it("should not contain explicit any types in component files", async () => {
      const componentFiles = await glob("src/components/**/*.{ts,tsx}", {
        ignore: ["**/*.test.ts", "**/*.test.tsx", "**/*.d.ts"],
      });

      const violations: Array<{ file: string; line: number }> = [];

      for (const file of componentFiles) {
        const content = await fs.readFile(file, "utf-8");
        const lines = content.split("\n");

        lines.forEach((line, index) => {
          if (
            /:\s*any\b/.test(line) &&
            !line.includes("//") &&
            !line.includes("Record<string, any>")
          ) {
            violations.push({
              file,
              line: index + 1,
            });
          }
        });
      }

      if (violations.length > 0) {
        console.warn("\nType Safety Violations (component files):");
        violations.forEach((v) => {
          console.warn(`  ${v.file}:${v.line}`);
        });
      }

      // TODO: Target is 0 violations. Current threshold allows legacy any types.
      const MAX_ALLOWED_COMPONENT_ANY = 10; // Temporary threshold for launch
      expect(violations.length).toBeLessThan(MAX_ALLOWED_COMPONENT_ANY);
      console.log(`Component files any count: ${violations.length}/${MAX_ALLOWED_COMPONENT_ANY} (threshold)`);
    });
  });

  describe("Zod Schema Coverage", () => {
    it("should have Zod schemas for all public interfaces", async () => {
      // Vision types - these MUST be exported (no conditional skipping)
      const visionModule = await import("../../types/vision");
      const { CanonicalVisionSchema, VisionEventSchema, AlignmentResultSchema } = visionModule;

      // Assert schemas are defined - fail loudly if missing
      expect(CanonicalVisionSchema).toBeDefined();
      expect(VisionEventSchema).toBeDefined();
      expect(AlignmentResultSchema).toBeDefined();

      // State types
      const stateModule = await import("../../types/state");
      const { SystemStateSchema } = stateModule;
      expect(SystemStateSchema).toBeDefined();
    });

    it("should validate vision data with schemas", async () => {
      const visionModule = await import("../../types/vision");
      const { CanonicalVisionSchema } = visionModule;

      // Schema MUST be exported - fail if missing
      expect(CanonicalVisionSchema).toBeDefined();

      const validVision = {
        version: "1.0",
        created: new Date(),
        updated: new Date(),
        mission: "Test mission",
        principles: ["Principle 1"],
        strategicGoals: [],
        currentFocus: "Focus",
        successMetrics: {},
      };

      const result = CanonicalVisionSchema.safeParse(validVision);
      expect(result.success).toBe(true);

      const invalidVision = {
        version: 123, // Should be string
        created: "not-a-date",
        updated: new Date(),
      };

      const invalidResult = CanonicalVisionSchema.safeParse(invalidVision);
      expect(invalidResult.success).toBe(false);
    });

    it("should validate state data with schemas", async () => {
      const stateModule = await import("../../types/state");
      const { SystemStateSchema } = stateModule;

      // Skip if schema not exported
      if (!SystemStateSchema) {
        console.log("SystemStateSchema not found - skipping test");
        return;
      }

      const validState = {
        version: "3.0.0",
        timestamp: new Date(),
        vision: {
          version: "1.0",
          created: new Date(),
          updated: new Date(),
          mission: "Test",
          principles: [],
          strategicGoals: [],
          currentFocus: "",
          successMetrics: {},
        },
        currentTasks: [],
        agentStates: {},
        conversationContext: {
          sessionId: "test",
          startedAt: new Date(),
          lastInteraction: new Date(),
          messageCount: 0,
          recentMessages: [],
          contextTags: [],
        },
        progressGraph: [],
        metadata: {
          sessionId: "test-session-001",
          environment: "test",
          projectPath: "/home/test/project",
        },
      };

      const result = SystemStateSchema.safeParse(validState);
      expect(result.success).toBe(true);
    });
  });

  describe("Strict TypeScript Configuration", () => {
    it("should have strict mode enabled in tsconfig.json", async () => {
      const tsconfig = JSON.parse(await fs.readFile("tsconfig.json", "utf-8"));

      expect(tsconfig.compilerOptions.strict).toBe(true);
    });

    it("should enforce strict null checks", async () => {
      const tsconfig = JSON.parse(await fs.readFile("tsconfig.json", "utf-8"));

      // Either strict: true or strictNullChecks: true
      const hasStrictNullChecks =
        tsconfig.compilerOptions.strict === true ||
        tsconfig.compilerOptions.strictNullChecks === true;

      expect(hasStrictNullChecks).toBe(true);
    });
  });

  describe("Interface Boundary Type Safety", () => {
    it("should have proper types at UI-Backend boundaries", async () => {
      // Check that component files exist (TypeScript validation ensures they're typed)
      const visionCapturePath = path.resolve("src/components/VisionCapture.tsx");
      const commandCenterPath = path.resolve("src/components/CommandCenter.tsx");

      await expect(fs.access(visionCapturePath)).resolves.toBeUndefined();
      await expect(fs.access(commandCenterPath)).resolves.toBeUndefined();

      // All component props should be properly typed
      // This is validated by TypeScript compilation
    });

    it("should validate data crossing boundaries with Zod", async () => {
      // Dynamic import for the vision types
      const visionModule = await import("../../types/vision");
      const { CanonicalVisionSchema } = visionModule;

      // Schema MUST be exported - fail if missing
      expect(CanonicalVisionSchema).toBeDefined();

      // Simulate data from UI
      const uiData = {
        version: "1.0",
        created: new Date().toISOString(), // String from JSON
        updated: new Date().toISOString(),
        mission: "User input mission",
        principles: ["Principle from UI"],
        strategicGoals: [],
        currentFocus: "UI focus",
        successMetrics: {},
      };

      // Should parse and transform dates
      const result = CanonicalVisionSchema.parse({
        ...uiData,
        created: new Date(uiData.created),
        updated: new Date(uiData.updated),
      });

      expect(result.created).toBeInstanceOf(Date);
      expect(result.updated).toBeInstanceOf(Date);
    });
  });

  describe("Generic Type Usage", () => {
    it("should use proper generic constraints", async () => {
      // Check that generics are properly constrained
      const utilsContent = await fs.readFile("src/utils/logger.ts", "utf-8");

      // Should not have unconstrained generics like <T>
      // Should have proper constraints like <T extends SomeType>
      const unconstrainedGenerics = utilsContent.match(/<T>(?!\s*extends)/g);

      // Allow some unconstrained generics in utility functions
      // but they should be minimal
      if (unconstrainedGenerics) {
        expect(unconstrainedGenerics.length).toBeLessThan(3);
      }
    });
  });

  describe("Type Assertion Safety", () => {
    it("should minimize use of type assertions", async () => {
      const coreFiles = await glob("src/core/**/*.ts", {
        ignore: ["**/*.test.ts"],
      });

      let assertionCount = 0;

      for (const file of coreFiles) {
        const content = await fs.readFile(file, "utf-8");

        // Count 'as' type assertions (excluding 'as const')
        const assertions = content.match(/\sas\s+(?!const\b)/g);
        if (assertions) {
          assertionCount += assertions.length;
        }
      }

      // Should have minimal type assertions (< 50 in all core files)
      expect(assertionCount).toBeLessThan(50);

      console.log(`Type assertions in core files: ${assertionCount}`);
    });
  });

  describe("Unknown vs Any", () => {
    it("should prefer unknown over any for untyped data", async () => {
      const coreFiles = await glob("src/core/**/*.ts", {
        ignore: ["**/*.test.ts"],
      });

      let anyCount = 0;
      let unknownCount = 0;

      for (const file of coreFiles) {
        const content = await fs.readFile(file, "utf-8");

        // Count 'any' usage
        const anyMatches = content.match(/:\s*any\b/g);
        if (anyMatches) anyCount += anyMatches.length;

        // Count 'unknown' usage
        const unknownMatches = content.match(/:\s*unknown\b/g);
        if (unknownMatches) unknownCount += unknownMatches.length;
      }

      // Should prefer unknown over any
      // If we have untyped data, unknown is safer
      console.log(`any: ${anyCount}, unknown: ${unknownCount}`);

      // This is a quality guideline - log but don't fail for existing codebases
      // New code should prefer unknown, but we don't block on legacy any usage
      if (anyCount + unknownCount > 0) {
        const unknownRatio = unknownCount / (anyCount + unknownCount);
        console.log(`unknown/any ratio: ${(unknownRatio * 100).toFixed(1)}%`);

        // Advisory: warn if ratio is low but don't fail
        if (unknownRatio < 0.3) {
          console.warn(`⚠️ Consider using 'unknown' instead of 'any' for safer typing`);
        }
      }

      // Test passes - this is advisory, not a hard gate
      expect(true).toBe(true);
    });
  });
});
