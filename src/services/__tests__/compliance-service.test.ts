/**
 * Compliance Service Tests
 * Comprehensive tests for tech stack scanning, license checking, and SBOM generation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ComplianceService } from "../compliance-service";
import * as fs from "fs/promises";
import * as path from "path";
import { tmpdir } from "os";
import { execSync } from "child_process";

// Mock child_process for npm commands
vi.mock("child_process", async () => {
  const actual = await vi.importActual<typeof import("child_process")>("child_process");
  const mocked = {
    ...actual,
    execSync: vi.fn(),
  };
  return {
    ...mocked,
    default: mocked,
  };
});

/**
 * Helper to mock execSync with proper return type handling
 * execSync returns string when encoding option is set, Buffer otherwise
 */
function mockExecSync(fn: (cmd: string) => string): void {
  vi.mocked(execSync).mockImplementation((cmd, options) => {
    const hasEncoding = options && typeof options === "object" && "encoding" in options;
    const output = fn(cmd as string);
    return hasEncoding ? output : Buffer.from(output);
  });
}

describe("ComplianceService", () => {
  let testDir: string;
  let service: ComplianceService;

  beforeEach(async () => {
    testDir = path.join(tmpdir(), `compliance-service-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
    service = new ComplianceService(testDir);

    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("getComplianceReport", () => {
    it("should generate complete compliance report with all compatible licenses", async () => {
      // Setup package.json
      await fs.writeFile(
        path.join(testDir, "package.json"),
        JSON.stringify({
          name: "test-project",
          version: "1.0.0",
          license: "MIT",
          dependencies: {
            "react": "^18.0.0",
            "express": "^4.0.0",
          },
          devDependencies: {
            "vitest": "^1.0.0",
          },
        }),
      );

      // Mock node version
      mockExecSync((cmd) => {
        if (cmd === "node --version") {
          return "v20.10.0";
        }
        if (cmd.includes("npm ls")) {
          return JSON.stringify({
            name: "test-project",
            version: "1.0.0",
            dependencies: {
              react: { version: "18.2.0" },
              express: { version: "4.18.2" },
              vitest: { version: "1.1.0" },
            },
          });
        }
        return "";
      });

      // Create node_modules with package.json files
      const modulesDir = path.join(testDir, "node_modules");
      await fs.mkdir(modulesDir, { recursive: true });

      await fs.mkdir(path.join(modulesDir, "react"), { recursive: true });
      await fs.writeFile(
        path.join(modulesDir, "react", "package.json"),
        JSON.stringify({ name: "react", version: "18.2.0", license: "MIT" }),
      );

      await fs.mkdir(path.join(modulesDir, "express"), { recursive: true });
      await fs.writeFile(
        path.join(modulesDir, "express", "package.json"),
        JSON.stringify({ name: "express", version: "4.18.2", license: "MIT" }),
      );

      await fs.mkdir(path.join(modulesDir, "vitest"), { recursive: true });
      await fs.writeFile(
        path.join(modulesDir, "vitest", "package.json"),
        JSON.stringify({ name: "vitest", version: "1.1.0", license: "MIT" }),
      );

      const result = await service.getComplianceReport();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const report = result.value;

        // Check tech stack
        expect(report.techStack.projectName).toBe("test-project");
        expect(report.techStack.projectVersion).toBe("1.0.0");
        expect(report.techStack.projectLicense).toBe("MIT");
        expect(report.techStack.nodeVersion).toBe("v20.10.0");
        expect(report.techStack.totalDependencies).toBe(3);
        expect(report.techStack.productionDeps).toBe(2);
        expect(report.techStack.devDeps).toBe(1);
        expect(report.techStack.runtimeFrameworks).toContain("react");
        expect(report.techStack.runtimeFrameworks).toContain("express");
        expect(report.techStack.languages).toContain("JavaScript");

        // Check dependencies
        expect(report.dependencies).toHaveLength(3);
        expect(report.dependencies.every((d) => d.licenseRisk === "compatible")).toBe(true);

        // Check summary
        expect(report.summary.compatible).toBe(3);
        expect(report.summary.conditional).toBe(0);
        expect(report.summary.incompatible).toBe(0);
        expect(report.summary.unknown).toBe(0);

        // Check status
        expect(report.status).toBe("pass");
        expect(report.score).toBe(100);

        // Check no conflicts
        expect(report.conflicts).toHaveLength(0);

        // Check timestamp
        expect(report.timestamp).toBeDefined();
        expect(new Date(report.timestamp).getTime()).toBeGreaterThan(0);
      }
    });

    it("should detect incompatible GPL licenses", async () => {
      await fs.writeFile(
        path.join(testDir, "package.json"),
        JSON.stringify({
          name: "test-project",
          version: "1.0.0",
          license: "MIT",
          dependencies: {
            "gpl-package": "^1.0.0",
          },
        }),
      );

      mockExecSync((cmd) => {
        if (cmd === "node --version") {
          return "v20.10.0";
        }
        if (typeof cmd === "string" && cmd.includes("npm ls")) {
          return Buffer.from(JSON.stringify({
            dependencies: {
              "gpl-package": { version: "1.0.0" },
            },
          }));
        }
        return "";
      });

      const modulesDir = path.join(testDir, "node_modules");
      await fs.mkdir(modulesDir, { recursive: true });
      await fs.mkdir(path.join(modulesDir, "gpl-package"), { recursive: true });
      await fs.writeFile(
        path.join(modulesDir, "gpl-package", "package.json"),
        JSON.stringify({ name: "gpl-package", version: "1.0.0", license: "GPL-3.0" }),
      );

      const result = await service.getComplianceReport();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const report = result.value;

        expect(report.status).toBe("fail");
        expect(report.summary.incompatible).toBe(1);
        expect(report.conflicts).toHaveLength(1);
        expect(report.conflicts[0].risk).toBe("incompatible");
        expect(report.conflicts[0].dependency).toBe("gpl-package");
        expect(report.conflicts[0].license).toBe("GPL-3.0");
        expect(report.conflicts[0].reason).toContain("GPL");
        expect(report.conflicts[0].recommendation).toContain("Replace");
        expect(report.score).toBeLessThan(100);
      }
    });

    it("should classify conditional LGPL licenses", async () => {
      await fs.writeFile(
        path.join(testDir, "package.json"),
        JSON.stringify({
          name: "test-project",
          version: "1.0.0",
          license: "MIT",
          dependencies: {
            "lgpl-package": "^1.0.0",
          },
        }),
      );

      mockExecSync((cmd) => {
        if (cmd === "node --version") {
          return "v20.10.0";
        }
        if (typeof cmd === "string" && cmd.includes("npm ls")) {
          return Buffer.from(JSON.stringify({
            dependencies: {
              "lgpl-package": { version: "1.0.0" },
            },
          }));
        }
        return "";
      });

      const modulesDir = path.join(testDir, "node_modules");
      await fs.mkdir(modulesDir, { recursive: true });
      await fs.mkdir(path.join(modulesDir, "lgpl-package"), { recursive: true });
      await fs.writeFile(
        path.join(modulesDir, "lgpl-package", "package.json"),
        JSON.stringify({ name: "lgpl-package", version: "1.0.0", license: "LGPL-2.1" }),
      );

      const result = await service.getComplianceReport();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const report = result.value;

        expect(report.status).toBe("warn");
        expect(report.summary.conditional).toBe(1);
        expect(report.conflicts).toHaveLength(1);
        expect(report.conflicts[0].risk).toBe("conditional");
        expect(report.conflicts[0].reason).toContain("dynamically linked");
        expect(report.score).toBe(98); // 100 - 2 for conditional
      }
    });

    it("should handle unknown licenses", async () => {
      await fs.writeFile(
        path.join(testDir, "package.json"),
        JSON.stringify({
          name: "test-project",
          version: "1.0.0",
          license: "MIT",
          dependencies: {
            "custom-license-package": "^1.0.0",
          },
        }),
      );

      mockExecSync((cmd) => {
        if (cmd === "node --version") {
          return "v20.10.0";
        }
        if (typeof cmd === "string" && cmd.includes("npm ls")) {
          return Buffer.from(JSON.stringify({
            dependencies: {
              "custom-license-package": { version: "1.0.0" },
            },
          }));
        }
        return "";
      });

      const modulesDir = path.join(testDir, "node_modules");
      await fs.mkdir(modulesDir, { recursive: true });
      await fs.mkdir(path.join(modulesDir, "custom-license-package"), { recursive: true });
      await fs.writeFile(
        path.join(modulesDir, "custom-license-package", "package.json"),
        JSON.stringify({ name: "custom-license-package", version: "1.0.0", license: "Custom-Proprietary-1.0" }),
      );

      const result = await service.getComplianceReport();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const report = result.value;

        expect(report.status).toBe("warn");
        expect(report.summary.unknown).toBe(1);
        expect(report.conflicts).toHaveLength(1);
        expect(report.conflicts[0].risk).toBe("unknown");
        expect(report.conflicts[0].reason).toContain("not in the known compatibility database");
        expect(report.score).toBe(97); // 100 - 3 for unknown
      }
    });

    it("should handle missing package.json fields gracefully", async () => {
      await fs.writeFile(
        path.join(testDir, "package.json"),
        JSON.stringify({}),
      );

      mockExecSync((cmd) => {
        if (cmd === "node --version") {
          return "v20.10.0";
        }
        if (typeof cmd === "string" && cmd.includes("npm ls")) {
          return JSON.stringify({});
        }
        return "";
      });

      const result = await service.getComplianceReport();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const report = result.value;
        expect(report.techStack.projectName).toBe("unknown");
        expect(report.techStack.projectVersion).toBe("0.0.0");
        expect(report.techStack.projectLicense).toBe("UNLICENSED");
      }
    });

    it("should handle npm ls errors gracefully", async () => {
      await fs.writeFile(
        path.join(testDir, "package.json"),
        JSON.stringify({ name: "test", version: "1.0.0" }),
      );

      mockExecSync((cmd) => {
        if (cmd === "node --version") {
          return "v20.10.0";
        }
        if (typeof cmd === "string" && cmd.includes("npm ls")) {
          const error: any = new Error("npm ls failed");
          error.stdout = JSON.stringify({ dependencies: {} });
          throw error;
        }
        return "";
      });

      const result = await service.getComplianceReport();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.dependencies).toHaveLength(0);
      }
    });

    it("should detect TypeScript when tsconfig.json exists", async () => {
      await fs.writeFile(
        path.join(testDir, "package.json"),
        JSON.stringify({ name: "test", version: "1.0.0" }),
      );
      await fs.writeFile(
        path.join(testDir, "tsconfig.json"),
        JSON.stringify({}),
      );

      mockExecSync((cmd) => {
        if (cmd === "node --version") {
          return "v20.10.0";
        }
        if (typeof cmd === "string" && cmd.includes("npm ls")) {
          return JSON.stringify({});
        }
        return "";
      });

      const result = await service.getComplianceReport();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.techStack.languages).toContain("TypeScript");
        expect(result.value.techStack.languages).toContain("JavaScript");
      }
    });

    it("should distinguish dev and production dependencies", async () => {
      await fs.writeFile(
        path.join(testDir, "package.json"),
        JSON.stringify({
          name: "test",
          version: "1.0.0",
          dependencies: {
            "prod-dep": "^1.0.0",
          },
          devDependencies: {
            "dev-dep": "^1.0.0",
          },
        }),
      );

      mockExecSync((cmd) => {
        if (cmd === "node --version") {
          return "v20.10.0";
        }
        if (typeof cmd === "string" && cmd.includes("npm ls")) {
          return Buffer.from(JSON.stringify({
            dependencies: {
              "prod-dep": { version: "1.0.0" },
              "dev-dep": { version: "1.0.0" },
            },
          }));
        }
        return "";
      });

      const modulesDir = path.join(testDir, "node_modules");
      await fs.mkdir(modulesDir, { recursive: true });

      await fs.mkdir(path.join(modulesDir, "prod-dep"), { recursive: true });
      await fs.writeFile(
        path.join(modulesDir, "prod-dep", "package.json"),
        JSON.stringify({ name: "prod-dep", version: "1.0.0", license: "GPL-3.0" }),
      );

      await fs.mkdir(path.join(modulesDir, "dev-dep"), { recursive: true });
      await fs.writeFile(
        path.join(modulesDir, "dev-dep", "package.json"),
        JSON.stringify({ name: "dev-dep", version: "1.0.0", license: "GPL-3.0" }),
      );

      const result = await service.getComplianceReport();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const prodDep = result.value.dependencies.find((d) => d.name === "prod-dep");
        const devDep = result.value.dependencies.find((d) => d.name === "dev-dep");

        expect(prodDep?.isDev).toBe(false);
        expect(devDep?.isDev).toBe(true);

        // Dev deps have lower penalty: prod -10, dev -5
        expect(result.value.score).toBe(85); // 100 - 10 (prod) - 5 (dev)
      }
    });

    it("should handle object-format license in package.json", async () => {
      await fs.writeFile(
        path.join(testDir, "package.json"),
        JSON.stringify({
          name: "test",
          version: "1.0.0",
          dependencies: { "pkg": "^1.0.0" },
        }),
      );

      mockExecSync((cmd) => {
        if (cmd === "node --version") {
          return "v20.10.0";
        }
        if (typeof cmd === "string" && cmd.includes("npm ls")) {
          return Buffer.from(JSON.stringify({
            dependencies: { pkg: { version: "1.0.0" } },
          }));
        }
        return "";
      });

      const modulesDir = path.join(testDir, "node_modules");
      await fs.mkdir(modulesDir, { recursive: true });
      await fs.mkdir(path.join(modulesDir, "pkg"), { recursive: true });
      await fs.writeFile(
        path.join(modulesDir, "pkg", "package.json"),
        JSON.stringify({
          name: "pkg",
          version: "1.0.0",
          license: { type: "MIT", url: "https://example.com/license" },
        }),
      );

      const result = await service.getComplianceReport();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.dependencies[0].license).toBe("MIT");
        expect(result.value.dependencies[0].licenseRisk).toBe("compatible");
      }
    });

    it("should handle deprecated licenses array", async () => {
      await fs.writeFile(
        path.join(testDir, "package.json"),
        JSON.stringify({
          name: "test",
          version: "1.0.0",
          dependencies: { "pkg": "^1.0.0" },
        }),
      );

      mockExecSync((cmd) => {
        if (cmd === "node --version") {
          return "v20.10.0";
        }
        if (typeof cmd === "string" && cmd.includes("npm ls")) {
          return Buffer.from(JSON.stringify({
            dependencies: { pkg: { version: "1.0.0" } },
          }));
        }
        return "";
      });

      const modulesDir = path.join(testDir, "node_modules");
      await fs.mkdir(modulesDir, { recursive: true });
      await fs.mkdir(path.join(modulesDir, "pkg"), { recursive: true });
      await fs.writeFile(
        path.join(modulesDir, "pkg", "package.json"),
        JSON.stringify({
          name: "pkg",
          version: "1.0.0",
          licenses: [{ type: "MIT" }, { type: "Apache-2.0" }],
        }),
      );

      const result = await service.getComplianceReport();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.dependencies[0].license).toBe("MIT");
      }
    });

    it("should handle SPDX OR expressions", async () => {
      await fs.writeFile(
        path.join(testDir, "package.json"),
        JSON.stringify({
          name: "test",
          version: "1.0.0",
          dependencies: { "pkg": "^1.0.0" },
        }),
      );

      mockExecSync((cmd) => {
        if (cmd === "node --version") {
          return "v20.10.0";
        }
        if (typeof cmd === "string" && cmd.includes("npm ls")) {
          return Buffer.from(JSON.stringify({
            dependencies: { pkg: { version: "1.0.0" } },
          }));
        }
        return "";
      });

      const modulesDir = path.join(testDir, "node_modules");
      await fs.mkdir(modulesDir, { recursive: true });
      await fs.mkdir(path.join(modulesDir, "pkg"), { recursive: true });
      await fs.writeFile(
        path.join(modulesDir, "pkg", "package.json"),
        JSON.stringify({
          name: "pkg",
          version: "1.0.0",
          license: "(MIT OR Apache-2.0)",
        }),
      );

      const result = await service.getComplianceReport();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // Should be compatible because MIT is an option
        expect(result.value.dependencies[0].licenseRisk).toBe("compatible");
      }
    });

    it("should handle SPDX AND expressions with worst risk", async () => {
      await fs.writeFile(
        path.join(testDir, "package.json"),
        JSON.stringify({
          name: "test",
          version: "1.0.0",
          dependencies: { "pkg": "^1.0.0" },
        }),
      );

      mockExecSync((cmd) => {
        if (cmd === "node --version") {
          return "v20.10.0";
        }
        if (typeof cmd === "string" && cmd.includes("npm ls")) {
          return Buffer.from(JSON.stringify({
            dependencies: { pkg: { version: "1.0.0" } },
          }));
        }
        return "";
      });

      const modulesDir = path.join(testDir, "node_modules");
      await fs.mkdir(modulesDir, { recursive: true });
      await fs.mkdir(path.join(modulesDir, "pkg"), { recursive: true });
      await fs.writeFile(
        path.join(modulesDir, "pkg", "package.json"),
        JSON.stringify({
          name: "pkg",
          version: "1.0.0",
          license: "(MIT AND GPL-3.0)",
        }),
      );

      const result = await service.getComplianceReport();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // Should be incompatible because GPL-3.0 is the worst risk
        expect(result.value.dependencies[0].licenseRisk).toBe("incompatible");
      }
    });

    it("should sanitize repository URLs with credentials", async () => {
      await fs.writeFile(
        path.join(testDir, "package.json"),
        JSON.stringify({
          name: "test",
          version: "1.0.0",
          dependencies: { "pkg": "^1.0.0" },
        }),
      );

      mockExecSync((cmd) => {
        if (cmd === "node --version") {
          return "v20.10.0";
        }
        if (typeof cmd === "string" && cmd.includes("npm ls")) {
          return Buffer.from(JSON.stringify({
            dependencies: { pkg: { version: "1.0.0" } },
          }));
        }
        return "";
      });

      const modulesDir = path.join(testDir, "node_modules");
      await fs.mkdir(modulesDir, { recursive: true });
      await fs.mkdir(path.join(modulesDir, "pkg"), { recursive: true });
      await fs.writeFile(
        path.join(modulesDir, "pkg", "package.json"),
        JSON.stringify({
          name: "pkg",
          version: "1.0.0",
          license: "MIT",
          repository: { type: "git", url: "https://user:password@github.com/user/repo.git" },
        }),
      );

      const result = await service.getComplianceReport();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const dep = result.value.dependencies[0];
        expect(dep.repository).toBe("https://github.com/user/repo.git");
        expect(dep.repository).not.toContain("user:password");
      }
    });

    it("should prevent path traversal attacks", async () => {
      await fs.writeFile(
        path.join(testDir, "package.json"),
        JSON.stringify({
          name: "test",
          version: "1.0.0",
          dependencies: { "../../../etc/passwd": "^1.0.0" },
        }),
      );

      mockExecSync((cmd) => {
        if (cmd === "node --version") {
          return "v20.10.0";
        }
        if (typeof cmd === "string" && cmd.includes("npm ls")) {
          return Buffer.from(JSON.stringify({
            dependencies: { "../../../etc/passwd": { version: "1.0.0" } },
          }));
        }
        return "";
      });

      const result = await service.getComplianceReport();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // Malicious package should be skipped
        expect(result.value.dependencies).toHaveLength(0);
      }
    });

    it("should handle case-insensitive license matching", async () => {
      await fs.writeFile(
        path.join(testDir, "package.json"),
        JSON.stringify({
          name: "test",
          version: "1.0.0",
          dependencies: { "pkg": "^1.0.0" },
        }),
      );

      mockExecSync((cmd) => {
        if (cmd === "node --version") {
          return "v20.10.0";
        }
        if (cmd.includes("npm ls")) {
          return JSON.stringify({
            dependencies: { pkg: { version: "1.0.0" } },
          });
        }
        return "";
      });

      const modulesDir = path.join(testDir, "node_modules");
      await fs.mkdir(modulesDir, { recursive: true });
      await fs.mkdir(path.join(modulesDir, "pkg"), { recursive: true });
      await fs.writeFile(
        path.join(modulesDir, "pkg", "package.json"),
        JSON.stringify({
          name: "pkg",
          version: "1.0.0",
          license: "mit", // lowercase
        }),
      );

      const result = await service.getComplianceReport();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.dependencies[0].licenseRisk).toBe("compatible");
      }
    });

    it("should handle shorthand repository format", async () => {
      await fs.writeFile(
        path.join(testDir, "package.json"),
        JSON.stringify({
          name: "test",
          version: "1.0.0",
          dependencies: { "pkg": "^1.0.0" },
        }),
      );

      mockExecSync((cmd) => {
        if (cmd === "node --version") {
          return "v20.10.0";
        }
        if (cmd.includes("npm ls")) {
          return JSON.stringify({
            dependencies: { pkg: { version: "1.0.0" } },
          });
        }
        return "";
      });

      const modulesDir = path.join(testDir, "node_modules");
      await fs.mkdir(modulesDir, { recursive: true });
      await fs.mkdir(path.join(modulesDir, "pkg"), { recursive: true });
      await fs.writeFile(
        path.join(modulesDir, "pkg", "package.json"),
        JSON.stringify({
          name: "pkg",
          version: "1.0.0",
          license: "MIT",
          repository: "user/repo", // shorthand format
        }),
      );

      const result = await service.getComplianceReport();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.dependencies[0].repository).toBe("user/repo");
      }
    });

    it("should handle SPDX OR with conditional license", async () => {
      await fs.writeFile(
        path.join(testDir, "package.json"),
        JSON.stringify({
          name: "test",
          version: "1.0.0",
          dependencies: { "pkg": "^1.0.0" },
        }),
      );

      mockExecSync((cmd) => {
        if (cmd === "node --version") {
          return "v20.10.0";
        }
        if (cmd.includes("npm ls")) {
          return JSON.stringify({
            dependencies: { pkg: { version: "1.0.0" } },
          });
        }
        return "";
      });

      const modulesDir = path.join(testDir, "node_modules");
      await fs.mkdir(modulesDir, { recursive: true });
      await fs.mkdir(path.join(modulesDir, "pkg"), { recursive: true });
      await fs.writeFile(
        path.join(modulesDir, "pkg", "package.json"),
        JSON.stringify({
          name: "pkg",
          version: "1.0.0",
          license: "(GPL-3.0 OR LGPL-2.1)", // No compatible, but has conditional
        }),
      );

      const result = await service.getComplianceReport();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // Should be conditional because LGPL-2.1 is conditional
        expect(result.value.dependencies[0].licenseRisk).toBe("conditional");
      }
    });
  });

  describe("generateSBOM", () => {
    it("should generate valid CycloneDX 1.5 SBOM", async () => {
      await fs.writeFile(
        path.join(testDir, "package.json"),
        JSON.stringify({
          name: "my-app",
          version: "2.0.0",
          license: "MIT",
          dependencies: {
            "react": "^18.0.0",
          },
          devDependencies: {
            "vitest": "^1.0.0",
          },
        }),
      );

      mockExecSync((cmd) => {
        if (cmd === "node --version") {
          return "v20.10.0";
        }
        if (typeof cmd === "string" && cmd.includes("npm ls")) {
          return Buffer.from(JSON.stringify({
            dependencies: {
              react: { version: "18.2.0" },
              vitest: { version: "1.1.0" },
            },
          }));
        }
        return "";
      });

      const modulesDir = path.join(testDir, "node_modules");
      await fs.mkdir(modulesDir, { recursive: true });

      await fs.mkdir(path.join(modulesDir, "react"), { recursive: true });
      await fs.writeFile(
        path.join(modulesDir, "react", "package.json"),
        JSON.stringify({ name: "react", version: "18.2.0", license: "MIT" }),
      );

      await fs.mkdir(path.join(modulesDir, "vitest"), { recursive: true });
      await fs.writeFile(
        path.join(modulesDir, "vitest", "package.json"),
        JSON.stringify({ name: "vitest", version: "1.1.0", license: "MIT" }),
      );

      const result = await service.generateSBOM();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const sbom = result.value;

        // Check SBOM structure
        expect(sbom.bomFormat).toBe("CycloneDX");
        expect(sbom.specVersion).toBe("1.5");
        expect(sbom.version).toBe(1);
        expect(sbom.serialNumber).toMatch(/^urn:uuid:/);

        // Check metadata
        expect(sbom.metadata.timestamp).toBeDefined();
        expect(sbom.metadata.tools).toHaveLength(1);
        expect(sbom.metadata.tools[0].name).toBe("nxtg-forge");
        expect(sbom.metadata.tools[0].version).toBe("2.0.0");
        expect(sbom.metadata.component.type).toBe("application");
        expect(sbom.metadata.component.name).toBe("my-app");
        expect(sbom.metadata.component.version).toBe("2.0.0");
        expect(sbom.metadata.component.licenses).toHaveLength(1);
        expect(sbom.metadata.component.licenses[0].license.id).toBe("MIT");

        // Check components
        expect(sbom.components).toHaveLength(2);

        const reactComponent = sbom.components.find((c) => c.name === "react");
        expect(reactComponent).toBeDefined();
        if (reactComponent) {
          expect(reactComponent.type).toBe("library");
          expect(reactComponent.version).toBe("18.2.0");
          expect(reactComponent.purl).toBe("pkg:npm/react@18.2.0");
          expect(reactComponent.licenses).toHaveLength(1);
          expect(reactComponent.licenses[0].license.id).toBe("MIT");
          expect(reactComponent.scope).toBe("required");
        }

        const vitestComponent = sbom.components.find((c) => c.name === "vitest");
        expect(vitestComponent).toBeDefined();
        if (vitestComponent) {
          expect(vitestComponent.scope).toBe("optional"); // dev dependency
        }
      }
    });

    it("should save SBOM to .claude/reports directory", async () => {
      await fs.writeFile(
        path.join(testDir, "package.json"),
        JSON.stringify({
          name: "test",
          version: "1.0.0",
          license: "MIT",
        }),
      );

      mockExecSync((cmd) => {
        if (cmd === "node --version") {
          return "v20.10.0";
        }
        if (typeof cmd === "string" && cmd.includes("npm ls")) {
          return JSON.stringify({});
        }
        return "";
      });

      const result = await service.generateSBOM();

      expect(result.isOk()).toBe(true);

      // Check file was created
      const reportsDir = path.join(testDir, ".claude", "reports");
      const files = await fs.readdir(reportsDir);
      const sbomFile = files.find((f) => f.startsWith("sbom-") && f.endsWith(".json"));

      expect(sbomFile).toBeDefined();
      if (sbomFile) {
        const content = await fs.readFile(path.join(reportsDir, sbomFile), "utf-8");
        const saved = JSON.parse(content);
        expect(saved.bomFormat).toBe("CycloneDX");
      }
    });

    it("should handle SBOM generation when file save fails", async () => {
      await fs.writeFile(
        path.join(testDir, "package.json"),
        JSON.stringify({
          name: "test",
          version: "1.0.0",
        }),
      );

      mockExecSync((cmd) => {
        if (cmd === "node --version") {
          return "v20.10.0";
        }
        if (typeof cmd === "string" && cmd.includes("npm ls")) {
          return JSON.stringify({});
        }
        return "";
      });

      // Make .claude directory read-only to cause write failure
      const claudeDir = path.join(testDir, ".claude");
      await fs.mkdir(claudeDir, { recursive: true });
      await fs.chmod(claudeDir, 0o444);

      const result = await service.generateSBOM();

      // Should still succeed even if file save fails
      expect(result.isOk()).toBe(true);

      // Restore permissions for cleanup
      await fs.chmod(claudeDir, 0o755);
    });

    it("should omit licenses for UNLICENSED packages in SBOM", async () => {
      await fs.writeFile(
        path.join(testDir, "package.json"),
        JSON.stringify({
          name: "test",
          version: "1.0.0",
          dependencies: { "pkg": "^1.0.0" },
        }),
      );

      mockExecSync((cmd) => {
        if (cmd === "node --version") {
          return "v20.10.0";
        }
        if (typeof cmd === "string" && cmd.includes("npm ls")) {
          return Buffer.from(JSON.stringify({
            dependencies: { pkg: { version: "1.0.0" } },
          }));
        }
        return "";
      });

      const modulesDir = path.join(testDir, "node_modules");
      await fs.mkdir(modulesDir, { recursive: true });
      await fs.mkdir(path.join(modulesDir, "pkg"), { recursive: true });
      await fs.writeFile(
        path.join(modulesDir, "pkg", "package.json"),
        JSON.stringify({ name: "pkg", version: "1.0.0" }), // No license field
      );

      const result = await service.generateSBOM();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const component = result.value.components[0];
        expect(component.licenses).toHaveLength(0);
      }
    });

    it("should handle errors during SBOM generation", async () => {
      // No package.json - will cause read error
      mockExecSync((cmd) => {
        throw new Error("Failed to execute npm ls");
      });

      const result = await service.generateSBOM();

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(Error);
      }
    });
  });

  describe("formatForCLI", () => {
    it("should format compliance report for CLI output", () => {
      const report = {
        timestamp: "2026-02-06T12:00:00.000Z",
        techStack: {
          projectName: "my-project",
          projectVersion: "1.0.0",
          projectLicense: "MIT",
          nodeVersion: "v20.10.0",
          totalDependencies: 50,
          productionDeps: 40,
          devDeps: 10,
          runtimeFrameworks: ["react", "express", "vite"],
          languages: ["TypeScript", "JavaScript"],
        },
        dependencies: [],
        conflicts: [],
        score: 100,
        status: "pass" as const,
        summary: {
          compatible: 50,
          conditional: 0,
          incompatible: 0,
          unknown: 0,
        },
      };

      const formatted = ComplianceService.formatForCLI(report);

      expect(formatted).toContain("NXTG-Forge Compliance Report");
      expect(formatted).toContain("Name: my-project v1.0.0");
      expect(formatted).toContain("License: MIT");
      expect(formatted).toContain("Node: v20.10.0");
      expect(formatted).toContain("Runtime: react, express, vite");
      expect(formatted).toContain("Languages: TypeScript, JavaScript");
      expect(formatted).toContain("Dependencies: 40 production, 10 development");
      expect(formatted).toContain("Compliance Score: 100/100 [PASS]");
      expect(formatted).toContain("Compatible:    50 deps");
      expect(formatted).toContain("/frg-compliance --sbom");
    });

    it("should show conflicts section when present", () => {
      const report = {
        timestamp: "2026-02-06T12:00:00.000Z",
        techStack: {
          projectName: "test",
          projectVersion: "1.0.0",
          projectLicense: "MIT",
          nodeVersion: "v20.10.0",
          totalDependencies: 1,
          productionDeps: 1,
          devDeps: 0,
          runtimeFrameworks: [],
          languages: ["JavaScript"],
        },
        dependencies: [],
        conflicts: [
          {
            dependency: "gpl-package",
            version: "1.0.0",
            license: "GPL-3.0",
            risk: "incompatible" as const,
            reason: "GPL requires all derivative works to be GPL",
            recommendation: "Replace with MIT alternative",
          },
        ],
        score: 90,
        status: "fail" as const,
        summary: {
          compatible: 0,
          conditional: 0,
          incompatible: 1,
          unknown: 0,
        },
      };

      const formatted = ComplianceService.formatForCLI(report);

      expect(formatted).toContain("LICENSE CONFLICTS");
      expect(formatted).toContain("[INCOMPATIBLE] gpl-package@1.0.0 - GPL-3.0");
      expect(formatted).toContain("Risk: GPL requires all derivative works to be GPL");
      expect(formatted).toContain("Action: Replace with MIT alternative");
    });

    it("should show warning status when conditional licenses present", () => {
      const report = {
        timestamp: "2026-02-06T12:00:00.000Z",
        techStack: {
          projectName: "test",
          projectVersion: "1.0.0",
          projectLicense: "MIT",
          nodeVersion: "v20.10.0",
          totalDependencies: 1,
          productionDeps: 1,
          devDeps: 0,
          runtimeFrameworks: [],
          languages: ["JavaScript"],
        },
        dependencies: [],
        conflicts: [
          {
            dependency: "lgpl-package",
            version: "1.0.0",
            license: "LGPL-2.1",
            risk: "conditional" as const,
            reason: "LGPL requires derivative works to be LGPL",
            recommendation: "Acceptable for npm dependency",
          },
        ],
        score: 98,
        status: "warn" as const,
        summary: {
          compatible: 0,
          conditional: 1,
          incompatible: 0,
          unknown: 0,
        },
      };

      const formatted = ComplianceService.formatForCLI(report);

      expect(formatted).toContain("Compliance Score: 98/100 [WARN]");
      expect(formatted).toContain("[CONDITIONAL] lgpl-package@1.0.0");
    });
  });
});
