/**
 * Compliance System Type Definitions
 * Defines data structures for tech stack scanning, license checking, and SBOM generation
 * @module compliance.types
 */

/**
 * License risk classification levels
 * - compatible: License is fully compatible with project license (MIT)
 * - conditional: License has conditions but is acceptable for npm dependencies
 * - incompatible: License conflicts with project license (copyleft)
 * - unknown: License could not be determined or is non-standard
 */
export type LicenseRisk = "compatible" | "conditional" | "incompatible" | "unknown";

/**
 * Information about a single dependency's license and metadata
 */
export interface DependencyInfo {
  /** Package name (e.g., "react", "@types/node") */
  name: string;
  /** Semver version string */
  version: string;
  /** SPDX license identifier (e.g., "MIT", "Apache-2.0") */
  license: string;
  /** Classified risk level based on compatibility with project license */
  licenseRisk: LicenseRisk;
  /** Whether this is a devDependency */
  isDev: boolean;
  /** Path within node_modules */
  path: string;
  /** Git repository URL if available */
  repository?: string;
}

/**
 * A specific license conflict requiring attention
 */
export interface LicenseConflict {
  /** Package name */
  dependency: string;
  /** Package version */
  version: string;
  /** SPDX license identifier */
  license: string;
  /** Risk classification */
  risk: LicenseRisk;
  /** Human-readable explanation of the conflict */
  reason: string;
  /** Recommended action to resolve the conflict */
  recommendation: string;
}

/**
 * Summary of the project's technology stack
 */
export interface TechStackSummary {
  /** Project name from package.json */
  projectName: string;
  /** Project version from package.json */
  projectVersion: string;
  /** Project license from package.json */
  projectLicense: string;
  /** Node.js version string */
  nodeVersion: string;
  /** Total number of dependencies (prod + dev) */
  totalDependencies: number;
  /** Number of production dependencies */
  productionDeps: number;
  /** Number of development dependencies */
  devDeps: number;
  /** Key runtime frameworks detected (e.g., ["react", "express", "vite"]) */
  runtimeFrameworks: string[];
  /** Programming languages used (e.g., ["TypeScript", "JavaScript"]) */
  languages: string[];
}

/**
 * Complete compliance report combining all scan results
 */
export interface ComplianceReport {
  /** ISO 8601 timestamp of report generation */
  timestamp: string;
  /** Technology stack summary */
  techStack: TechStackSummary;
  /** All scanned dependencies with license info */
  dependencies: DependencyInfo[];
  /** License conflicts requiring attention */
  conflicts: LicenseConflict[];
  /** Overall compliance score (0-100) */
  score: number;
  /** Overall compliance status */
  status: "pass" | "warn" | "fail";
  /** Count of dependencies by risk classification */
  summary: {
    compatible: number;
    conditional: number;
    incompatible: number;
    unknown: number;
  };
}

/**
 * CycloneDX 1.5 SBOM (Software Bill of Materials) document
 * Follows the OWASP CycloneDX specification
 */
export interface SBOMDocument {
  /** SBOM format identifier */
  bomFormat: "CycloneDX";
  /** CycloneDX specification version */
  specVersion: "1.5";
  /** Unique SBOM serial number (urn:uuid:{uuid}) */
  serialNumber: string;
  /** SBOM document version */
  version: 1;
  /** SBOM metadata including tool and subject component info */
  metadata: {
    /** ISO 8601 timestamp of SBOM generation */
    timestamp: string;
    /** Tools used to generate this SBOM */
    tools: { name: string; version: string }[];
    /** The component this SBOM describes */
    component: {
      type: "application";
      name: string;
      version: string;
      licenses: { license: { id: string } }[];
    };
  };
  /** List of dependency components */
  components: SBOMComponent[];
}

/**
 * A single component entry in the CycloneDX SBOM
 */
export interface SBOMComponent {
  /** Component type (always "library" for npm deps) */
  type: "library";
  /** Package name */
  name: string;
  /** Package version */
  version: string;
  /** Package URL identifier (pkg:npm/{name}@{version}) */
  purl: string;
  /** License information */
  licenses: { license: { id: string } }[];
  /** Dependency scope */
  scope: "required" | "optional";
}
