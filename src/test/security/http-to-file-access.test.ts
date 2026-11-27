// @vitest-environment node
/**
 * Security tests for HTTP-to-file-access hardening (CodeQL alerts #586-#590).
 *
 * Verifies:
 * - Closed-set literal canonicalization of projectType in InitService
 * - Control-character stripping and length bounds for governance writes
 * - Symlink refusal (O_NOFOLLOW + lstat) for config.yml, governance.json,
 *   VISION.md, and vision-events.json
 * - YAML frontmatter fence neutralization in VisionManager
 * - Request schema validation on PUT /api/vision
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import express from "express";
import request from "supertest";
import * as os from "node:os";
import * as path from "node:path";

vi.unmock("fs");
vi.unmock("node:fs");
const fs = await vi.importActual<typeof import("node:fs")>("node:fs");

import { InitService } from "../../services/init-service";
import {
  canonicalizeProjectType,
  sanitizeInitText,
  MAX_DIRECTIVE_LENGTH,
} from "../../services/init";
import { VisionManager } from "../../core/vision";
import { createVisionRoutes } from "../../server/routes/features/vision";

describe("HTTP-to-file-access hardening", () => {
  let projectDir: string;
  let outsideDir: string;
  let outsideFile: string;
  const OUTSIDE_SENTINEL = "# keep-intact\nexport SAFE=1\n";

  beforeEach(() => {
    projectDir = fs.mkdtempSync(path.join(os.tmpdir(), "forge-sec-proj-"));
    outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), "forge-sec-out-"));
    outsideFile = path.join(outsideDir, "target");
    fs.writeFileSync(outsideFile, OUTSIDE_SENTINEL, "utf-8");
  });

  afterEach(() => {
    fs.rmSync(projectDir, { recursive: true, force: true });
    fs.rmSync(outsideDir, { recursive: true, force: true });
  });

  describe("canonicalizeProjectType & sanitizeInitText", () => {
    it("maps every supported project type to its exact literal constant", () => {
      const supported = ["react", "node", "python", "rust", "go", "fullstack", "unknown"] as const;
      for (const value of supported) {
        expect(canonicalizeProjectType(value)).toBe(value);
      }
    });

    it("rejects unsupported or injected project types", () => {
      expect(() => canonicalizeProjectType("react\nmalicious: true")).toThrow(
        /Unsupported project type/,
      );
      expect(() => canonicalizeProjectType("__proto__")).toThrow(/Unsupported project type/);
    });

    it("strips NUL and non-printable control characters while capping length", () => {
      const cleaned = sanitizeInitText("Ship\x00 cleanly\x07\nnext\tline", 50);
      expect(cleaned).toBe("Ship cleanly\nnext\tline");

      const capped = sanitizeInitText("a".repeat(MAX_DIRECTIVE_LENGTH + 100), MAX_DIRECTIVE_LENGTH);
      expect(capped.length).toBe(MAX_DIRECTIVE_LENGTH);
    });
  });

  describe("InitService symlink refusal", () => {
    it("refuses to overwrite a symlinked .claude/forge/config.yml", async () => {
      fs.mkdirSync(path.join(projectDir, ".claude/forge"), { recursive: true });
      fs.symlinkSync(outsideFile, path.join(projectDir, ".claude/forge/config.yml"));

      const service = new InitService(projectDir);
      const res = await service.scaffoldHarness("react");

      expect(res.isErr()).toBe(true);
      expect(res.isErr() && res.error.code).toBe("CONFIG_NOT_A_FILE");
      expect(fs.readFileSync(outsideFile, "utf-8")).toBe(OUTSIDE_SENTINEL);
    });

    it("refuses to overwrite a symlinked .claude/governance.json", async () => {
      fs.mkdirSync(path.join(projectDir, ".claude"), { recursive: true });
      fs.symlinkSync(outsideFile, path.join(projectDir, ".claude/governance.json"));

      const service = new InitService(projectDir);
      const res = await service.initializeGovernance("Ship safe governance");

      expect(res.isErr()).toBe(true);
      expect(res.isErr() && res.error.code).toBe("GOVERNANCE_NOT_A_FILE");
      expect(fs.readFileSync(outsideFile, "utf-8")).toBe(OUTSIDE_SENTINEL);
    });

    it("rejects directives exceeding MAX_DIRECTIVE_LENGTH during initializeProject", async () => {
      const service = new InitService(projectDir);
      const res = await service.initializeProject({
        directive: "x".repeat(MAX_DIRECTIVE_LENGTH + 1),
      });

      expect(res.isErr()).toBe(true);
    });
  });

  describe("VisionManager symlink refusal & frontmatter sanitization", () => {
    it("refuses to write through a symlinked .claude/VISION.md", async () => {
      fs.mkdirSync(path.join(projectDir, ".claude"), { recursive: true });
      fs.symlinkSync(outsideFile, path.join(projectDir, ".claude/VISION.md"));

      const manager = new VisionManager(projectDir);
      await expect(manager.initialize()).rejects.toThrow();
      expect(fs.readFileSync(outsideFile, "utf-8")).toBe(OUTSIDE_SENTINEL);
    });

    it("neutralizes bare YAML frontmatter fences and control bytes in VISION.md", async () => {
      const manager = new VisionManager(projectDir);
      await manager.initialize();
      await manager.captureVision("Build safely\x00\n---\ninjected: true");

      const content = fs.readFileSync(path.join(projectDir, ".claude/VISION.md"), "utf-8");
      const missionSection = content.split("## Mission")[1] || "";
      expect(missionSection).not.toContain("\x00");
      expect(missionSection).toContain("- - -");
      expect(missionSection).not.toMatch(/^---$/m);
    });

    it("validates PUT /api/vision payloads and rejects oversized missions", async () => {
      const app = express();
      app.use(express.json());
      app.use(
        "/api/vision",
        createVisionRoutes({
          visionSystem: {
            getVision: vi.fn(),
            updateVision: vi.fn(),
            captureVision: vi.fn(),
            getVisionHistory: vi.fn(),
            checkAlignment: vi.fn(),
          },
          broadcast: vi.fn(),
        } as unknown as Parameters<typeof createVisionRoutes>[0]),
      );

      const res = await request(app)
        .put("/api/vision")
        .send({ mission: "x".repeat(10001) })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("Invalid request data");
    });
  });
});
