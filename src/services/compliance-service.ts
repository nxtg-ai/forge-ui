/**
 * Compliance Service
 * Tech stack scanning, license compatibility checking, and SBOM generation
 */

import { execSync } from "child_process";
import * as fs from "fs/promises";
import * as path from "path";
import * as crypto from "crypto";
import { Result } from "../utils/result.js";
import type {
  LicenseRisk,
  DependencyInfo,
  LicenseConflict,
  TechStackSummary,
  ComplianceReport,
  SBOMDocument,
  SBOMComponent,
} from "../types/compliance.types.js";

/**
 * License compatibility matrix for an MIT-licensed project.
 * Maps SPDX identifiers to their risk classification.
 */
const LICENSE_COMPATIBILITY: Record<string, LicenseRisk> = {
  // Compatible (Green) — no restrictions conflict with MIT
  "MIT": "compatible",
  "ISC": "compatible",
  "BSD-2-Clause": "compatible",
  "BSD-3-Clause": "compatible",
  "Apache-2.0": "compatible",
  "0BSD": "compatible",
  "Unlicense": "compatible",
  "CC0-1.0": "compatible",
  "BlueOak-1.0.0": "compatible",
  "Python-2.0": "compatible",
  "CC-BY-3.0": "compatible",
  "CC-BY-4.0": "compatible",
  "Zlib": "compatible",
  "Artistic-2.0": "compatible",
  "BSL-1.0": "compatible",
  "MIT-0": "compatible",
  "PSF-2.0": "compatible",

  // Conditional (Yellow) — acceptable for npm deps (not statically linked)
  "LGPL-2.1": "conditional",
  "LGPL-2.1-only": "conditional",
  "LGPL-2.1-or-later": "conditional",
  "LGPL-3.0": "conditional",
  "LGPL-3.0-only": "conditional",
  "LGPL-3.0-or-later": "conditional",
  "MPL-2.0": "conditional",

  // Incompatible (Red) — copyleft infects MIT project
  "GPL-2.0": "incompatible",
  "GPL-2.0-only": "incompatible",
  "GPL-2.0-or-later": "incompatible",
  "GPL-3.0": "incompatible",
  "GPL-3.0-only": "incompatible",
  "GPL-3.0-or-later": "incompatible",
  "AGPL-3.0": "incompatible",
  "AGPL-3.0-only": "incompatible",
  "AGPL-3.0-or-later": "incompatible",
  "SSPL-1.0": "incompatible",
  "EUPL-1.2": "incompatible",
};

/**
 * Reasons and recommendations for non-compatible licenses
 */
const LICENSE_REASONS: Record<string, { reason: string; recommendation: string }> = {
  "LGPL-2.1": {
    reason: "LGPL-2.1 requires derivative works to be LGPL, but npm dependencies are dynamically linked",
    recommendation: "Acceptable for npm dependency. Document in license notices.",
  },
  "LGPL-3.0": {
    reason: "LGPL-3.0 requires derivative works to be LGPL, but npm dependencies are dynamically linked",
    recommendation: "Acceptable for npm dependency. Document in license notices.",
  },
  "MPL-2.0": {
    reason: "MPL-2.0 has file-level copyleft — modified files must remain MPL-2.0",
    recommendation: "Acceptable as dependency. Do not modify source files of this package.",
  },
  "GPL-2.0": {
    reason: "GPL-2.0 requires all derivative works to be GPL — incompatible with MIT distribution",
    recommendation: "Replace with an MIT/ISC/BSD-licensed alternative.",
  },
  "GPL-3.0": {
    reason: "GPL-3.0 requires all derivative works to be GPL — incompatible with MIT distribution",
    recommendation: "Replace with an MIT/ISC/BSD-licensed alternative.",
  },
  "AGPL-3.0": {
    reason: "AGPL-3.0 extends GPL to network use — any server using this must provide source",
    recommendation: "Replace immediately. AGPL is the most restrictive common license.",
  },
  "SSPL-1.0": {
    reason: "SSPL requires providing source of entire service stack if offered as a service",
    recommendation: "Replace with an MIT/ISC/BSD-licensed alternative.",
  },
  "EUPL-1.2": {
    reason: "EUPL-1.2 has copyleft requirements incompatible with MIT relicensing",
    recommendation: "Replace with an MIT/ISC/BSD-licensed alternative.",
  },
};

/** Known runtime frameworks to detect in dependencies */
const KNOWN_FRAMEWORKS = [
  "react", "react-dom", "next", "express", "fastify", "koa",
  "vite", "webpack", "rollup", "esbuild", "vue", "angular",
  "svelte", "solid-js", "hono", "nest", "@nestjs/core",
];

/**
 * Represents the structure of npm ls --json output
 */
interface NpmLsOutput {
  name?: string;
  version?: string;
  dependencies?: Record<string, NpmLsDependency>;
}

interface NpmLsDependency {
  version?: string;
  resolved?: string;
  dependencies?: Record<string, NpmLsDependency>;
}

/**
 * Represents the relevant fields from a dependency's package.json
 */
interface DepPackageJson {
  name?: string;
  version?: string;
  license?: string | { type?: string; url?: string };
  licenses?: Array<string | { type?: string; url?: string }>;
  repository?: string | { type?: string; url?: string };
}

export class ComplianceService {
  constructor(private projectRoot: string) {}

  /**
   * Main entry point — gathers all compliance data into a report
   */
  async getComplianceReport(): Promise<Result<ComplianceReport, Error>> {
    try {
      const [techStack, dependencies] = await Promise.all([
        this.getTechStack(),
        this.scanDependencies(),
      ]);

      const conflicts = this.checkLicenseCompatibility(dependencies);
      const score = this.computeComplianceScore(dependencies, conflicts);

      const summary = {
        compatible: dependencies.filter((d) => d.licenseRisk === "compatible").length,
        conditional: dependencies.filter((d) => d.licenseRisk === "conditional").length,
        incompatible: dependencies.filter((d) => d.licenseRisk === "incompatible").length,
        unknown: dependencies.filter((d) => d.licenseRisk === "unknown").length,
      };

      let status: "pass" | "warn" | "fail";
      if (summary.incompatible > 0) {
        status = "fail";
      } else if (summary.conditional > 0 || summary.unknown > 0) {
        status = "warn";
      } else {
        status = "pass";
      }

      const report: ComplianceReport = {
        timestamp: new Date().toISOString(),
        techStack,
        dependencies,
        conflicts,
        score,
        status,
        summary,
      };

      return Result.ok(report);
    } catch (error) {
      return Result.err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Gather tech stack summary from package.json and environment
   */
  private async getTechStack(): Promise<TechStackSummary> {
    const pkgPath = path.join(this.projectRoot, "package.json");
    const pkgData = await fs.readFile(pkgPath, "utf-8");
    const pkg = JSON.parse(pkgData) as {
      name?: string;
      version?: string;
      license?: string;
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    const prodDeps = Object.keys(pkg.dependencies ?? {});
    const devDeps = Object.keys(pkg.devDependencies ?? {});

    // Detect node version
    let nodeVersion = "unknown";
    try {
      nodeVersion = execSync("node --version", { encoding: "utf-8", cwd: this.projectRoot }).trim();
    } catch {
      // node not available
    }

    // Detect runtime frameworks from both prod and dev deps
    const allDepNames = [...prodDeps, ...devDeps];
    const runtimeFrameworks = KNOWN_FRAMEWORKS.filter((fw) =>
      allDepNames.some((dep) => dep === fw || dep.startsWith(fw + "/")),
    );

    // Detect languages from file presence
    const languages: string[] = [];
    try {
      await fs.access(path.join(this.projectRoot, "tsconfig.json"));
      languages.push("TypeScript");
    } catch {
      // no tsconfig
    }
    languages.push("JavaScript"); // always present in a Node project

    return {
      projectName: pkg.name ?? "unknown",
      projectVersion: pkg.version ?? "0.0.0",
      projectLicense: pkg.license ?? "UNLICENSED",
      nodeVersion,
      totalDependencies: prodDeps.length + devDeps.length,
      productionDeps: prodDeps.length,
      devDeps: devDeps.length,
      runtimeFrameworks,
      languages,
    };
  }

  /**
   * Scan all dependencies via npm ls and read individual package.json files
   * for license information. Returns a flat array of DependencyInfo.
   */
  private async scanDependencies(): Promise<DependencyInfo[]> {
    // Read package.json to know which are dev deps
    const pkgPath = path.join(this.projectRoot, "package.json");
    const pkgData = await fs.readFile(pkgPath, "utf-8");
    const pkg = JSON.parse(pkgData) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    const prodDepNames = new Set(Object.keys(pkg.dependencies ?? {}));
    const devDepNames = new Set(Object.keys(pkg.devDependencies ?? {}));

    // Run npm ls to get dependency tree with versions
    let npmLsData: NpmLsOutput = {};
    try {
      // npm ls exits non-zero on peer dep issues but still outputs valid JSON
      const output = execSync("npm ls --json --all 2>/dev/null", {
        encoding: "utf-8",
        cwd: this.projectRoot,
        maxBuffer: 50 * 1024 * 1024, // 50MB buffer for large trees
      });
      npmLsData = JSON.parse(output) as NpmLsOutput;
    } catch (execError: unknown) {
      // npm ls often exits with code 1 due to peer dep issues
      // but stdout still contains valid JSON
      if (execError && typeof execError === "object" && "stdout" in execError) {
        const stdout = (execError as { stdout: string }).stdout;
        if (stdout && stdout.trim()) {
          try {
            npmLsData = JSON.parse(stdout) as NpmLsOutput;
          } catch {
            // Fall through to manual scan below
          }
        }
      }
    }

    // Collect unique top-level dependencies from npm ls
    const depsMap = new Map<string, { name: string; version: string }>();

    if (npmLsData.dependencies) {
      for (const [name, info] of Object.entries(npmLsData.dependencies)) {
        if (info.version) {
          depsMap.set(name, { name, version: info.version });
        }
      }
    }

    // Also ensure all declared deps are in the map even if npm ls missed them
    for (const name of [...prodDepNames, ...devDepNames]) {
      if (!depsMap.has(name)) {
        depsMap.set(name, { name, version: "unknown" });
      }
    }

    // Read each dependency's package.json for license info
    const dependencies: DependencyInfo[] = [];

    for (const [name, depInfo] of depsMap) {
      const depPkgPath = path.join(this.projectRoot, "node_modules", name, "package.json");

      // SECURITY: Validate path stays within node_modules to prevent path traversal
      const normalizedPath = path.normalize(depPkgPath);
      const expectedPrefix = path.join(this.projectRoot, "node_modules");
      if (!normalizedPath.startsWith(expectedPrefix + path.sep)) {
        continue; // Skip packages with traversal attempts
      }

      let depPkg: DepPackageJson = {};

      try {
        const depPkgData = await fs.readFile(depPkgPath, "utf-8");
        depPkg = JSON.parse(depPkgData) as DepPackageJson;
      } catch {
        // package.json not readable — will show as unknown license
      }

      const license = this.extractLicense(depPkg);
      const licenseRisk = this.classifyLicense(license);
      const version = depPkg.version ?? depInfo.version;
      const repository = this.extractRepository(depPkg);

      dependencies.push({
        name,
        version,
        license,
        licenseRisk,
        isDev: devDepNames.has(name) && !prodDepNames.has(name),
        path: path.join("node_modules", name),
        ...(repository ? { repository } : {}),
      });
    }

    // Sort: incompatible first, then conditional, then unknown, then compatible
    const riskOrder: Record<LicenseRisk, number> = {
      incompatible: 0,
      conditional: 1,
      unknown: 2,
      compatible: 3,
    };
    dependencies.sort((a, b) => riskOrder[a.licenseRisk] - riskOrder[b.licenseRisk]);

    return dependencies;
  }

  /**
   * Extract the SPDX license identifier from a dependency's package.json.
   * Handles both string format ("MIT") and object format ({"type": "MIT"}).
   */
  private extractLicense(pkg: DepPackageJson): string {
    // Handle string license field
    if (typeof pkg.license === "string") {
      return pkg.license;
    }

    // Handle object license field: { type: "MIT", url: "..." }
    if (pkg.license && typeof pkg.license === "object" && pkg.license.type) {
      return pkg.license.type;
    }

    // Handle deprecated licenses array
    if (Array.isArray(pkg.licenses) && pkg.licenses.length > 0) {
      const first = pkg.licenses[0];
      if (typeof first === "string") {
        return first;
      }
      if (first && typeof first === "object" && first.type) {
        return first.type;
      }
    }

    return "UNKNOWN";
  }

  /**
   * Extract repository URL from package.json
   */
  private extractRepository(pkg: DepPackageJson): string | undefined {
    if (!pkg.repository) {
      return undefined;
    }

    let repoUrl: string | undefined;
    if (typeof pkg.repository === "string") {
      repoUrl = pkg.repository;
    } else if (typeof pkg.repository === "object" && pkg.repository.url) {
      repoUrl = pkg.repository.url;
    }

    if (!repoUrl) {
      return undefined;
    }

    // SECURITY: Strip credentials from URLs to prevent leakage in reports/SBOM
    try {
      const url = new URL(repoUrl);
      if (url.username || url.password) {
        url.username = "";
        url.password = "";
        return url.toString();
      }
    } catch {
      // Not a parseable URL (e.g., "user/repo" shorthand) — return as-is
    }

    return repoUrl;
  }

  /**
   * Classify a license string against the MIT compatibility matrix
   */
  private classifyLicense(license: string): LicenseRisk {
    if (!license || license === "UNKNOWN" || license === "NOASSERTION") {
      return "unknown";
    }

    // Direct lookup
    const risk = LICENSE_COMPATIBILITY[license];
    if (risk) {
      return risk;
    }

    // Try normalizing: strip trailing "-only" or "-or-later" variants already in map,
    // and try case-insensitive match
    const normalized = license.trim();
    for (const [key, value] of Object.entries(LICENSE_COMPATIBILITY)) {
      if (key.toLowerCase() === normalized.toLowerCase()) {
        return value;
      }
    }

    // Handle SPDX expressions with OR (e.g., "(MIT OR Apache-2.0)")
    if (normalized.includes(" OR ")) {
      const parts = normalized
        .replace(/[()]/g, "")
        .split(" OR ")
        .map((p) => p.trim());
      // If any option is compatible, the expression is compatible
      for (const part of parts) {
        const partRisk = LICENSE_COMPATIBILITY[part];
        if (partRisk === "compatible") {
          return "compatible";
        }
      }
      // If any option is conditional, expression is conditional
      for (const part of parts) {
        const partRisk = LICENSE_COMPATIBILITY[part];
        if (partRisk === "conditional") {
          return "conditional";
        }
      }
    }

    // Handle SPDX expressions with AND (e.g., "(MIT AND BSD-3-Clause)")
    if (normalized.includes(" AND ")) {
      const parts = normalized
        .replace(/[()]/g, "")
        .split(" AND ")
        .map((p) => p.trim());
      // All parts must be classified; return worst risk
      let worstRisk: LicenseRisk = "compatible";
      const riskOrder: LicenseRisk[] = ["compatible", "conditional", "incompatible", "unknown"];
      for (const part of parts) {
        const partRisk = LICENSE_COMPATIBILITY[part] ?? "unknown";
        if (riskOrder.indexOf(partRisk) > riskOrder.indexOf(worstRisk)) {
          worstRisk = partRisk;
        }
      }
      return worstRisk;
    }

    return "unknown";
  }

  /**
   * Check all dependencies for license compatibility issues.
   * Returns conflicts for any non-compatible dependency.
   */
  private checkLicenseCompatibility(deps: DependencyInfo[]): LicenseConflict[] {
    const conflicts: LicenseConflict[] = [];

    for (const dep of deps) {
      if (dep.licenseRisk === "compatible") {
        continue;
      }

      // Look up reason/recommendation by base license name
      const baseLicense = this.getBaseLicenseName(dep.license);
      const info = LICENSE_REASONS[baseLicense];

      let reason: string;
      let recommendation: string;

      if (info) {
        reason = info.reason;
        recommendation = dep.isDev
          ? `${info.recommendation} (dev-only dependency, lower risk)`
          : info.recommendation;
      } else if (dep.licenseRisk === "unknown") {
        reason = `License "${dep.license}" is not in the known compatibility database`;
        recommendation = "Investigate the license terms manually. Check if it is SPDX-compatible.";
      } else {
        reason = `License "${dep.license}" may conflict with MIT project license`;
        recommendation = "Review license terms and assess compatibility.";
      }

      conflicts.push({
        dependency: dep.name,
        version: dep.version,
        license: dep.license,
        risk: dep.licenseRisk,
        reason,
        recommendation,
      });
    }

    return conflicts;
  }

  /**
   * Get base license name for lookup in LICENSE_REASONS
   * e.g., "GPL-3.0-only" -> "GPL-3.0", "LGPL-2.1-or-later" -> "LGPL-2.1"
   */
  private getBaseLicenseName(license: string): string {
    return license
      .replace(/-only$/, "")
      .replace(/-or-later$/, "");
  }

  /**
   * Calculate compliance score (0-100) based on dependency risks and conflicts.
   *
   * Scoring:
   * - Start at 100
   * - -0 per compatible dep
   * - -2 per conditional dep
   * - -10 per incompatible production dep
   * - -5 per incompatible dev dep
   * - -3 per unknown license
   * - Floor at 0
   */
  private computeComplianceScore(deps: DependencyInfo[], _conflicts: LicenseConflict[]): number {
    let score = 100;

    for (const dep of deps) {
      switch (dep.licenseRisk) {
        case "compatible":
          // No penalty
          break;
        case "conditional":
          score -= 2;
          break;
        case "incompatible":
          score -= dep.isDev ? 5 : 10;
          break;
        case "unknown":
          score -= 3;
          break;
      }
    }

    return Math.max(0, score);
  }

  /**
   * Generate a CycloneDX 1.5 SBOM document from the project's dependencies.
   * Also saves the SBOM to .claude/reports/sbom-{date}.json.
   */
  async generateSBOM(): Promise<Result<SBOMDocument, Error>> {
    try {
      const techStack = await this.getTechStack();
      const dependencies = await this.scanDependencies();

      const components: SBOMComponent[] = dependencies.map((dep) => ({
        type: "library" as const,
        name: dep.name,
        version: dep.version,
        purl: `pkg:npm/${dep.name.startsWith("@") ? dep.name : dep.name}@${dep.version}`,
        licenses: dep.license !== "UNKNOWN"
          ? [{ license: { id: dep.license } }]
          : [],
        scope: dep.isDev ? "optional" as const : "required" as const,
      }));

      const sbom: SBOMDocument = {
        bomFormat: "CycloneDX",
        specVersion: "1.5",
        serialNumber: `urn:uuid:${crypto.randomUUID()}`,
        version: 1,
        metadata: {
          timestamp: new Date().toISOString(),
          tools: [
            { name: "nxtg-forge", version: techStack.projectVersion },
          ],
          component: {
            type: "application",
            name: techStack.projectName,
            version: techStack.projectVersion,
            licenses: techStack.projectLicense !== "UNLICENSED"
              ? [{ license: { id: techStack.projectLicense } }]
              : [],
          },
        },
        components,
      };

      // Save to .claude/reports/
      const reportsDir = path.join(this.projectRoot, ".claude", "reports");
      try {
        await fs.mkdir(reportsDir, { recursive: true });
        const dateStr = new Date().toISOString().split("T")[0];
        const sbomPath = path.join(reportsDir, `sbom-${dateStr}.json`);
        await fs.writeFile(sbomPath, JSON.stringify(sbom, null, 2), "utf-8");
      } catch {
        // Non-fatal: SBOM generation succeeds even if file save fails
      }

      return Result.ok(sbom);
    } catch (error) {
      return Result.err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Format a compliance report for CLI output
   */
  static formatForCLI(report: ComplianceReport): string {
    const lines: string[] = [];

    lines.push("NXTG-Forge Compliance Report");
    lines.push("============================");
    lines.push(`Generated: ${report.timestamp}`);
    lines.push("");

    // Project info
    lines.push("PROJECT");
    lines.push(`  Name: ${report.techStack.projectName} v${report.techStack.projectVersion}`);
    lines.push(`  License: ${report.techStack.projectLicense}`);
    lines.push(`  Node: ${report.techStack.nodeVersion}`);
    lines.push("");

    // Tech stack
    lines.push("TECH STACK");
    if (report.techStack.runtimeFrameworks.length > 0) {
      lines.push(`  Runtime: ${report.techStack.runtimeFrameworks.join(", ")}`);
    }
    lines.push(`  Languages: ${report.techStack.languages.join(", ")}`);
    lines.push(`  Dependencies: ${report.techStack.productionDeps} production, ${report.techStack.devDeps} development`);
    lines.push("");

    // License scan
    const statusLabel = report.status.toUpperCase();
    lines.push("LICENSE SCAN");
    lines.push(`  Compliance Score: ${report.score}/100 [${statusLabel}]`);
    lines.push("");
    lines.push(`  Compatible:    ${report.summary.compatible} deps`);
    lines.push(`  Conditional:   ${report.summary.conditional} deps`);
    lines.push(`  Incompatible:  ${report.summary.incompatible} deps`);
    lines.push(`  Unknown:       ${report.summary.unknown} deps`);

    // Conflicts
    if (report.conflicts.length > 0) {
      lines.push("");
      lines.push("LICENSE CONFLICTS");
      for (const conflict of report.conflicts) {
        const severity = conflict.risk.toUpperCase();
        lines.push(`  [${severity}] ${conflict.dependency}@${conflict.version} - ${conflict.license}`);
        lines.push(`    Risk: ${conflict.reason}`);
        lines.push(`    Action: ${conflict.recommendation}`);
      }
    }

    lines.push("");
    lines.push("---");
    lines.push("Quick Actions:");
    lines.push("  /frg-compliance --sbom       Generate SBOM file");
    lines.push("  /frg-compliance --fix        Suggest replacements");
    lines.push("  /frg-deploy --validate-only  Pre-deploy validation");
    lines.push("  /frg-gap-analysis --scope security  Security gap analysis");

    return lines.join("\n");
  }
}
