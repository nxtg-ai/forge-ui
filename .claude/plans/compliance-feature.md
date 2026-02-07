---
id: c5bc28e0-3f7e-4276-ac05-5a130ed74e6f
name: Production Compliance Feature
status: draft
created: 2026-02-07T04:17:47Z
updated: 2026-02-07T04:17:47Z
estimated_hours: 12
actual_hours: 0
phase: foundation
governance_workstream: ws-compliance-feature
---

# Production Compliance Feature (/frg-compliance)

## Description

Add a `/frg-compliance` slash command that performs tech stack scanning, license compatibility checking, and SBOM (Software Bill of Materials) generation. This is a dog-food feature — NXTG-Forge uses it on itself to ensure production readiness and legal compliance.

The command follows the same pattern as existing commands (`/frg-status`, `/frg-deploy`, `/frg-gap-analysis`): a markdown file in `.claude/commands/` that instructs Claude to use native tools (Bash, Read, Glob, Grep) for all data gathering. No new TypeScript meta-services are needed for the command itself.

A backing `compliance-service.ts` provides reusable logic for the API server endpoints and dashboard integration.

## Requirements

### Must Have
- [x] Tech stack inventory from package.json (dependencies + devDependencies)
- [x] License detection for each dependency via `npm ls --json` and registry metadata
- [x] License compatibility matrix (MIT project → which dep licenses are compatible)
- [x] CycloneDX JSON SBOM generation (industry standard)
- [x] `/frg-compliance` command outputting formatted compliance report
- [x] API endpoints for dashboard integration (`GET /api/compliance/*`)

### Should Have
- [ ] Severity classification for license conflicts (critical/high/medium/low)
- [ ] Cached results to avoid re-scanning on every invocation
- [ ] `--json` flag for machine-readable output
- [ ] `--sbom` flag to generate and save SBOM file

### Could Have
- [ ] SPDX format support (in addition to CycloneDX)
- [ ] Historical compliance tracking (diff between scans)
- [ ] Integration with `/frg-deploy` as a pre-deployment gate

## Architecture Decisions

### Decision 1: Command vs Service separation

**Options:**
- Option A: Pure command (all logic in .md, no TypeScript service)
- Option B: Command + TypeScript service (command delegates to service, API reuses service)

**Recommendation:** Option B — Command + TypeScript service

**Reasoning:** The command `.md` file instructs Claude to use native Bash/Grep tools for interactive CLI output. But the dashboard needs structured JSON data via API endpoints. A `compliance-service.ts` (following `status-service.ts` pattern) provides the shared logic that both the command and API can use. The command CAN also call `npm ls --json` directly through Bash — the service is for the API layer.

### Decision 2: SBOM format

**Options:**
- Option A: CycloneDX JSON (OWASP standard, widely adopted)
- Option B: SPDX (Linux Foundation standard)
- Option C: Both

**Recommendation:** Option A — CycloneDX JSON only (for now)

**Reasoning:** CycloneDX is simpler to generate, has a clean JSON schema, and is the most common format for JavaScript/Node.js projects. SPDX can be added later as a `--format spdx` flag. Starting with one format avoids premature complexity.

### Decision 3: License data source

**Options:**
- Option A: Parse `node_modules/*/package.json` directly
- Option B: Use `npm ls --json --all` for dependency tree + individual `package.json` for license field
- Option C: Use npm registry API to fetch license metadata

**Recommendation:** Option B — `npm ls --json` + local package.json

**Reasoning:** `npm ls --json` gives us the complete dependency tree with versions and paths. We then read each dep's `package.json` for the `license` field. This works offline, is fast, and doesn't need network access. The registry API (Option C) would be a fallback for edge cases but is not needed for v1.

### Decision 4: MIT compatibility ruleset

The project is MIT licensed. MIT is compatible with:
- **COMPATIBLE (Green):** MIT, ISC, BSD-2-Clause, BSD-3-Clause, Apache-2.0, 0BSD, Unlicense, CC0-1.0, BlueOak-1.0.0, Python-2.0
- **COMPATIBLE WITH CONDITIONS (Yellow):** LGPL-2.1, LGPL-3.0 (fine for npm deps since they're not statically linked), MPL-2.0 (file-level copyleft, ok for deps)
- **INCOMPATIBLE (Red):** GPL-2.0-only, GPL-3.0-only, AGPL-3.0 (copyleft infects MIT project), SSPL-1.0, EUPL-1.2
- **UNKNOWN (Gray):** Custom licenses, missing license field, NOASSERTION

This ruleset is hardcoded in the service. It covers 99% of npm packages.

## Service Design: `src/services/compliance-service.ts`

### Interfaces

```typescript
// License classification
export type LicenseRisk = "compatible" | "conditional" | "incompatible" | "unknown";

export interface DependencyInfo {
  name: string;
  version: string;
  license: string;           // SPDX identifier (e.g., "MIT", "Apache-2.0")
  licenseRisk: LicenseRisk;
  isDev: boolean;
  path: string;              // node_modules path
  repository?: string;       // git URL if available
}

export interface LicenseConflict {
  dependency: string;
  version: string;
  license: string;
  risk: LicenseRisk;
  reason: string;            // Human-readable explanation
  recommendation: string;    // What to do about it
}

export interface TechStackSummary {
  projectName: string;
  projectVersion: string;
  projectLicense: string;
  nodeVersion: string;
  totalDependencies: number;
  productionDeps: number;
  devDeps: number;
  runtimeFrameworks: string[];   // e.g., ["react", "express", "vite"]
  languages: string[];           // e.g., ["TypeScript", "JavaScript"]
}

export interface ComplianceReport {
  timestamp: string;
  techStack: TechStackSummary;
  dependencies: DependencyInfo[];
  conflicts: LicenseConflict[];
  score: number;                 // 0-100 compliance score
  status: "pass" | "warn" | "fail";
  summary: {
    compatible: number;
    conditional: number;
    incompatible: number;
    unknown: number;
  };
}

export interface SBOMDocument {
  bomFormat: "CycloneDX";
  specVersion: "1.5";
  serialNumber: string;         // urn:uuid:{uuid}
  version: 1;
  metadata: {
    timestamp: string;
    tools: { name: string; version: string }[];
    component: {
      type: "application";
      name: string;
      version: string;
      licenses: { license: { id: string } }[];
    };
  };
  components: {
    type: "library";
    name: string;
    version: string;
    purl: string;               // pkg:npm/{name}@{version}
    licenses: { license: { id: string } }[];
    scope: "required" | "optional";
  }[];
}
```

### Class: `ComplianceService`

```typescript
export class ComplianceService {
  constructor(private projectRoot: string) {}

  // Main entry point — gathers all compliance data
  async getComplianceReport(): Promise<Result<ComplianceReport, Error>>

  // Sub-methods (all private, called by getComplianceReport)
  private async getTechStack(): Promise<TechStackSummary>
  private async scanDependencies(): Promise<DependencyInfo[]>
  private async checkLicenseCompatibility(deps: DependencyInfo[]): Promise<LicenseConflict[]>
  private computeComplianceScore(deps: DependencyInfo[], conflicts: LicenseConflict[]): number

  // SBOM generation (public, can be called independently)
  async generateSBOM(): Promise<Result<SBOMDocument, Error>>

  // Static formatter for CLI output
  static formatForCLI(report: ComplianceReport): string
}
```

### Key Implementation Details

**`scanDependencies()`:**
1. Run `npm ls --json --all --long 2>/dev/null` via child_process
2. Parse the JSON tree recursively
3. For each dep, read `node_modules/{name}/package.json` to get `license` field
4. Classify license risk using the hardcoded compatibility map
5. Return flat array of `DependencyInfo`

**`checkLicenseCompatibility()`:**
1. Filter deps where `licenseRisk` is not "compatible"
2. For each non-compatible dep, generate a `LicenseConflict` with:
   - Human-readable reason ("GPL-3.0 requires derivative works to also be GPL")
   - Recommendation ("Replace with MIT-licensed alternative" or "Acceptable for dev-only use")
3. Dev dependencies with conditional/incompatible licenses get downgraded severity (dev deps don't ship in production)

**`computeComplianceScore()`:**
- Start at 100
- `-0` per compatible dep (no penalty)
- `-2` per conditional dep (minor concern)
- `-10` per incompatible production dep (serious)
- `-5` per incompatible dev dep (less serious)
- `-3` per unknown license (needs investigation)
- Floor at 0

**`generateSBOM()`:**
- Uses same `scanDependencies()` data
- Formats into CycloneDX 1.5 JSON spec
- Each dependency becomes a `component` with `purl` (package URL) identifier
- Saves to `.claude/reports/sbom-{date}.json`

## API Endpoints

Three endpoints, all under `/api/compliance/`:

### `GET /api/compliance/report`

Returns full compliance report as JSON.

```typescript
app.get("/api/compliance/report", async (req, res) => {
  const service = new ComplianceService(projectRoot);
  const result = await service.getComplianceReport();
  if (result.ok) {
    res.json(result.value);
  } else {
    res.status(500).json({ error: result.error.message });
  }
});
```

**Response:** `ComplianceReport` JSON

### `GET /api/compliance/sbom`

Returns CycloneDX SBOM document.

```typescript
app.get("/api/compliance/sbom", async (req, res) => {
  const service = new ComplianceService(projectRoot);
  const result = await service.generateSBOM();
  if (result.ok) {
    res.setHeader("Content-Type", "application/vnd.cyclonedx+json");
    res.json(result.value);
  } else {
    res.status(500).json({ error: result.error.message });
  }
});
```

**Response:** `SBOMDocument` JSON with CycloneDX content type

### `GET /api/compliance/conflicts`

Returns only license conflicts (lightweight endpoint for dashboard badges).

```typescript
app.get("/api/compliance/conflicts", async (req, res) => {
  const service = new ComplianceService(projectRoot);
  const result = await service.getComplianceReport();
  if (result.ok) {
    res.json({
      status: result.value.status,
      score: result.value.score,
      conflicts: result.value.conflicts,
      summary: result.value.summary,
    });
  } else {
    res.status(500).json({ error: result.error.message });
  }
});
```

**Response:** Subset of `ComplianceReport` with conflicts + score

## Command Structure: `.claude/commands/[FRG]-compliance.md`

The command file follows the exact pattern of `[FRG]-status.md` and `[FRG]-deploy.md`:

```markdown
---
description: "Scan tech stack, check license compatibility, and generate SBOM"
---

# NXTG-Forge Compliance Check

You are the **Compliance Auditor** - scan the project's dependency tree for
license compatibility and generate a Software Bill of Materials.

## Parse Arguments

Arguments received: `$ARGUMENTS`

Options:
- No arguments: Full compliance report
- `--sbom`: Generate CycloneDX SBOM and save to .claude/reports/
- `--json`: Output raw JSON instead of formatted report
- `--conflicts-only`: Show only license conflicts
- `--fix`: Suggest replacements for problematic dependencies

## Step 1: Tech Stack Inventory

Read `package.json` for project metadata:
- Project name, version, license
- Count dependencies vs devDependencies
- Identify key frameworks (react, express, vite, etc.)

Run:
  node --version
  npm --version

## Step 2: Dependency License Scan

Run:
  npm ls --json --all --long 2>/dev/null

For each dependency, check license compatibility with project license (MIT):

COMPATIBLE (no action needed):
  MIT, ISC, BSD-2-Clause, BSD-3-Clause, Apache-2.0, 0BSD,
  Unlicense, CC0-1.0, BlueOak-1.0.0, Python-2.0

CONDITIONAL (acceptable, note in report):
  LGPL-2.1, LGPL-3.0, MPL-2.0

INCOMPATIBLE (flag as conflict):
  GPL-2.0-only, GPL-3.0-only, AGPL-3.0, SSPL-1.0, EUPL-1.2

UNKNOWN (needs investigation):
  Missing license, custom license, NOASSERTION

For each dependency in the npm ls output, also read:
  node_modules/{dep-name}/package.json
to get the license field (npm ls doesn't always include it).

## Step 3: Compliance Score

Calculate score (0-100):
- Start at 100
- -0 per compatible dep
- -2 per conditional dep
- -10 per incompatible production dep
- -5 per incompatible dev dep
- -3 per unknown license

## Step 4: Display Report

Format:
  NXTG-Forge Compliance Report
  ============================
  Generated: {timestamp}

  PROJECT
    Name: {name} v{version}
    License: {license}
    Node: {node_version}

  TECH STACK
    Runtime: {frameworks list}
    Languages: TypeScript, JavaScript
    Dependencies: {prod_count} production, {dev_count} development

  LICENSE SCAN
    Compliance Score: {score}/100 [{PASS|WARN|FAIL}]

    Compatible:    {count} deps
    Conditional:   {count} deps
    Incompatible:  {count} deps
    Unknown:       {count} deps

  {If conflicts exist:}
  LICENSE CONFLICTS
    [{severity}] {dep_name}@{version} - {license}
      Risk: {explanation}
      Action: {recommendation}

  {If --sbom:}
  SBOM
    Format: CycloneDX 1.5 JSON
    Components: {count}
    Saved to: .claude/reports/sbom-{date}.json

  ---
  Quick Actions:
    /frg-compliance --sbom       Generate SBOM file
    /frg-compliance --fix        Suggest replacements
    /frg-deploy --validate-only  Pre-deploy validation
    /frg-gap-analysis --scope security  Security gap analysis

## Step 5: SBOM Generation (if --sbom)

Generate CycloneDX 1.5 JSON with:
- bomFormat: "CycloneDX"
- specVersion: "1.5"
- All dependencies as components with purl identifiers
- Save to .claude/reports/sbom-{YYYY-MM-DD}.json

## Error Handling

If npm ls fails, fall back to reading package.json dependencies
and scanning node_modules directly.
If node_modules doesn't exist, prompt user to run npm install first.
Always show whatever data IS available.
```

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/services/compliance-service.ts` | CREATE | Core compliance logic (scanner, checker, SBOM gen) |
| `src/types/compliance.types.ts` | CREATE | TypeScript interfaces for compliance data |
| `.claude/commands/[FRG]-compliance.md` | CREATE | Slash command definition |
| `src/server/api-server.ts` | MODIFY | Add 3 compliance API endpoints |
| `src/__tests__/services/compliance-service.test.ts` | CREATE | Unit tests for service |

## Tasks

### Task 1: Design & Architecture (THIS PLAN)
**Status:** in_progress
**Phase:** foundation
**Estimated:** 1h
**Dependencies:** None
**Assignee:** forge-planner
**Governance task:** c1

**Subtasks:**
- [x] Read existing command patterns ([FRG]-status.md, [FRG]-deploy.md)
- [x] Read existing service pattern (status-service.ts)
- [x] Read API server endpoint patterns
- [x] Design service interfaces
- [x] Design API endpoints
- [x] Design command structure
- [x] Define SBOM format (CycloneDX 1.5)
- [x] Define license compatibility matrix
- [x] Write plan to .claude/plans/compliance-feature.md

### Task 2: Implement ComplianceService
**Status:** pending
**Phase:** foundation
**Estimated:** 4h
**Dependencies:** Task 1
**Assignee:** forge-builder
**Governance task:** c2 + c3

**Subtasks:**
- [ ] Create `src/types/compliance.types.ts` with all interfaces
- [ ] Create `src/services/compliance-service.ts`
- [ ] Implement `scanDependencies()` using child_process npm ls + fs reads
- [ ] Implement license compatibility map (hardcoded, based on Decision 4)
- [ ] Implement `checkLicenseCompatibility()`
- [ ] Implement `computeComplianceScore()`
- [ ] Implement `generateSBOM()` in CycloneDX 1.5 format
- [ ] Implement `formatForCLI()` static method
- [ ] Implement `getComplianceReport()` main entry point

### Task 3: Create Command & Wire API Endpoints
**Status:** pending
**Phase:** feature_complete
**Estimated:** 2h
**Dependencies:** Task 2
**Assignee:** forge-builder
**Governance task:** c4

**Subtasks:**
- [ ] Create `.claude/commands/[FRG]-compliance.md`
- [ ] Add `GET /api/compliance/report` endpoint to api-server.ts
- [ ] Add `GET /api/compliance/sbom` endpoint to api-server.ts
- [ ] Add `GET /api/compliance/conflicts` endpoint to api-server.ts
- [ ] Import ComplianceService in api-server.ts

### Task 4: Testing
**Status:** pending
**Phase:** feature_complete
**Estimated:** 3h
**Dependencies:** Task 2
**Assignee:** forge-testing

**Subtasks:**
- [ ] Unit test: scanDependencies with mock npm ls output
- [ ] Unit test: license compatibility map (all categories)
- [ ] Unit test: compliance score calculation (edge cases)
- [ ] Unit test: SBOM generation format validation
- [ ] Integration test: API endpoints return correct shapes
- [ ] Dog-food test: Run /frg-compliance on NXTG-Forge itself

### Task 5: Security Review
**Status:** pending
**Phase:** polish
**Estimated:** 2h
**Dependencies:** Task 2, Task 3
**Assignee:** forge-security

**Subtasks:**
- [ ] Review child_process usage (command injection risk in npm ls)
- [ ] Review file system reads (path traversal risk)
- [ ] Verify no secrets leak into SBOM output
- [ ] Check API endpoints for auth/rate limiting

## Risks

### Risk 1: npm ls failures on broken dependency trees
**Probability:** medium
**Impact:** low
**Mitigation:** Fall back to reading `package.json` + scanning `node_modules/*/package.json` directly. npm ls exits non-zero on peer dependency issues, so we must handle partial output.

### Risk 2: Unusual license formats in package.json
**Probability:** medium
**Impact:** low
**Mitigation:** Some packages use `{ "type": "MIT" }` object format instead of string. Some use `licenses` (plural) array. Handle both formats in `scanDependencies()`. Unknown formats classify as "unknown" risk.

### Risk 3: Large dependency tree performance
**Probability:** low
**Impact:** low
**Mitigation:** npm ls is fast even for large trees. If needed, cache results in `.claude/state/compliance-cache.json` with a TTL.

## Testing Strategy

**Unit Tests:**
- Target: 90% coverage of compliance-service.ts
- Focus: License classification logic, score calculation, SBOM format

**Integration Tests:**
- Target: API endpoints return valid JSON with correct shapes
- Focus: Real npm ls output parsing on NXTG-Forge itself

**Dog-food Test:**
- Run `/frg-compliance` on NXTG-Forge
- Verify all 40+ dependencies are scanned
- Verify score reflects known MIT compatibility
- Verify SBOM validates against CycloneDX schema

## Progress

**Completed Tasks:** 1 / 5
**Hours Spent:** 1 / 12
**Status:** Task 1 complete — ready for implementation

## Next Steps

1. Approve plan (team lead)
2. Start Task 2: Implement ComplianceService (forge-builder)
3. Start Task 4: Testing in parallel once Task 2 is done
4. Task 3: Wire command + API (after Task 2)
5. Task 5: Security review (after Tasks 2+3)
