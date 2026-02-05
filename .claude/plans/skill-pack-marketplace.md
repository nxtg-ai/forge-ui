---
id: skill-pack-marketplace-001
name: Skill-Pack Format and Marketplace Implementation
status: draft
created: 2026-02-04T21:00:00Z
updated: 2026-02-04T21:00:00Z
estimated_hours: 80
actual_hours: 0
---

# Skill-Pack Format and Marketplace Implementation

## Requirements

- [x] Define skill-pack package format specification
- [x] Define marketplace catalog specification
- [x] Define CLI commands specification
- [x] Define tier boundaries and pricing model
- [x] Define installation flow specification
- [ ] Implement skill-pack validation library
- [ ] Implement marketplace API server
- [ ] Implement CLI commands
- [ ] Create example FREE tier skill-packs
- [ ] Set up distribution infrastructure

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                      NXTG-Forge CLI                          │
│  /frg-marketplace search|install|list|update|remove|info     │
└─────────────────────────┬────────────────────────────────────┘
                          │
                          │ HTTPS/REST
                          ▼
┌──────────────────────────────────────────────────────────────┐
│              Marketplace API (api.nxtg.ai/v1)                │
│  - Catalog management                                        │
│  - Search & discovery                                        │
│  - Version resolution                                        │
│  - License validation (PRO/ENTERPRISE)                       │
└─────────────────────────┬────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│          Distribution Storage (CDN/GitHub Releases)          │
│  - Tarball hosting                                           │
│  - Checksum files                                            │
│  - GPG signatures                                            │
└──────────────────────────────────────────────────────────────┘
```

## Tasks

### Task 1: Core Validation Library

**Status:** pending
**Estimated:** 12h
**Dependencies:** None
**Subtasks:**

- [ ] Create `src/lib/skill-pack/` directory
- [ ] Implement manifest schema validator
  - JSON Schema for skill-pack.json
  - Validate required fields
  - Validate version format (semver)
  - Validate tier (FREE/PRO/ENTERPRISE)
  - Validate license compatibility
- [ ] Implement package structure validator
  - Check required files (skill-pack.json, README.md, LICENSE)
  - Validate agent files exist
  - Validate skill files exist
  - Validate template files exist
  - Check for path traversal attempts
- [ ] Implement dependency resolver
  - Parse version ranges
  - Resolve compatible versions
  - Build dependency graph
  - Detect circular dependencies
  - Handle peer dependencies
- [ ] Write comprehensive unit tests
  - Test all validation rules
  - Test edge cases
  - Test malformed manifests
  - Test dependency resolution scenarios

**Files to Create:**
- `/home/axw/projects/NXTG-Forge/v3/src/lib/skill-pack/validator.ts`
- `/home/axw/projects/NXTG-Forge/v3/src/lib/skill-pack/schema.ts`
- `/home/axw/projects/NXTG-Forge/v3/src/lib/skill-pack/dependency-resolver.ts`
- `/home/axw/projects/NXTG-Forge/v3/src/lib/skill-pack/types.ts`
- `/home/axw/projects/NXTG-Forge/v3/tests/lib/skill-pack/validator.test.ts`

---

### Task 2: Marketplace API Server

**Status:** pending
**Estimated:** 20h
**Dependencies:** Task 1
**Subtasks:**

- [ ] Set up Express/Fastify API server
- [ ] Implement catalog endpoints
  - GET /v1/marketplace/catalog
  - GET /v1/marketplace/packs/:name
  - GET /v1/marketplace/packs/:name/versions
  - GET /v1/marketplace/packs/:name/:version
- [ ] Implement search endpoint
  - Full-text search implementation
  - Filter by tier, category, tag, maturity
  - Ranking algorithm (relevance, downloads, rating)
  - Faceted search results
  - Pagination
- [ ] Implement version resolution API
  - POST /v1/marketplace/resolve (version resolution service)
- [ ] Implement license validation (PRO/ENTERPRISE)
  - License key verification
  - Seat limit enforcement
  - Expiration checks
- [ ] Set up catalog storage
  - JSON files or database
  - Catalog update mechanism
  - Cache layer (Redis)
- [ ] Write API tests
  - Endpoint tests
  - Search tests
  - License validation tests

**Files to Create:**
- `/home/axw/projects/NXTG-Forge/v3/src/api/marketplace/` (new directory)
- `/home/axw/projects/NXTG-Forge/v3/src/api/marketplace/server.ts`
- `/home/axw/projects/NXTG-Forge/v3/src/api/marketplace/routes/catalog.ts`
- `/home/axw/projects/NXTG-Forge/v3/src/api/marketplace/routes/search.ts`
- `/home/axw/projects/NXTG-Forge/v3/src/api/marketplace/routes/packs.ts`
- `/home/axw/projects/NXTG-Forge/v3/src/api/marketplace/services/search.ts`
- `/home/axw/projects/NXTG-Forge/v3/src/api/marketplace/services/license.ts`
- `/home/axw/projects/NXTG-Forge/v3/tests/api/marketplace/` (tests)

---

### Task 3: CLI Commands Implementation

**Status:** pending
**Estimated:** 24h
**Dependencies:** Task 1, Task 2
**Subtasks:**

- [ ] Implement `/frg-marketplace search`
  - API integration
  - Result formatting
  - Filter options
  - JSON output mode
- [ ] Implement `/frg-marketplace install`
  - Version resolution
  - Dependency resolution
  - Download with progress
  - Checksum verification
  - Extraction
  - Integration (symlinks, config updates)
  - Post-install hooks
  - Rollback on failure
- [ ] Implement `/frg-marketplace list`
  - Show installed packs
  - Filter by tier
  - Show outdated packs
  - JSON output mode
- [ ] Implement `/frg-marketplace update`
  - Check for updates
  - Update single pack
  - Update all packs
  - Show changelog before update
- [ ] Implement `/frg-marketplace remove`
  - Pre-uninstall hooks
  - Remove symlinks
  - Clean up files
  - Update config
  - Check dependents (warn if other packs depend on it)
- [ ] Implement `/frg-marketplace info`
  - Fetch pack details
  - Display formatted info
  - Show README/changelog options
- [ ] Implement `/frg-marketplace publish`
  - Validate pack
  - Build tarball
  - Generate checksum
  - Sign with GPG
  - Upload to registry
- [ ] Implement `/frg-marketplace login/logout`
  - Credential storage
  - Token management
  - License key management
- [ ] Implement `/frg-marketplace config`
  - Get/set config values
- [ ] Implement `/frg-marketplace doctor`
  - System diagnostics
  - Pack health checks
- [ ] Write CLI tests
  - Command parsing tests
  - Integration tests
  - E2E tests

**Files to Create:**
- `/home/axw/projects/NXTG-Forge/v3/src/cli/commands/marketplace/` (new directory)
- `/home/axw/projects/NXTG-Forge/v3/src/cli/commands/marketplace/search.ts`
- `/home/axw/projects/NXTG-Forge/v3/src/cli/commands/marketplace/install.ts`
- `/home/axw/projects/NXTG-Forge/v3/src/cli/commands/marketplace/list.ts`
- `/home/axw/projects/NXTG-Forge/v3/src/cli/commands/marketplace/update.ts`
- `/home/axw/projects/NXTG-Forge/v3/src/cli/commands/marketplace/remove.ts`
- `/home/axw/projects/NXTG-Forge/v3/src/cli/commands/marketplace/info.ts`
- `/home/axw/projects/NXTG-Forge/v3/src/cli/commands/marketplace/publish.ts`
- `/home/axw/projects/NXTG-Forge/v3/src/cli/commands/marketplace/auth.ts`
- `/home/axw/projects/NXTG-Forge/v3/src/cli/commands/marketplace/config.ts`
- `/home/axw/projects/NXTG-Forge/v3/src/cli/commands/marketplace/doctor.ts`
- `/home/axw/projects/NXTG-Forge/v3/tests/cli/commands/marketplace/` (tests)

---

### Task 4: Example FREE Tier Skill-Packs

**Status:** pending
**Estimated:** 16h
**Dependencies:** Task 1
**Subtasks:**

- [ ] Create `react-19-pack` (FREE)
  - skill-pack.json manifest
  - README.md
  - LICENSE (MIT)
  - 2 agents: react-expert, hooks-specialist
  - 5 skills: react-patterns, hooks-best-practices, server-components, performance, testing
  - 3 templates: component, custom-hook, server-component
- [ ] Create `typescript-pack` (FREE)
  - skill-pack.json manifest
  - README.md
  - LICENSE (MIT)
  - 1 agent: typescript-expert
  - 3 skills: type-safety, generics, configuration
- [ ] Create `nodejs-api-pack` (FREE)
  - skill-pack.json manifest
  - README.md
  - LICENSE (MIT)
  - 2 agents: nodejs-expert, api-architect
  - 4 skills: express-patterns, fastify-patterns, authentication, testing
  - 2 templates: express-route, fastify-route
- [ ] Validate all packs with validation library
- [ ] Package as tarballs
- [ ] Generate checksums

**Files to Create:**
- `/home/axw/projects/NXTG-Forge/v3/skill-packs/react-19-pack/` (new directory)
- `/home/axw/projects/NXTG-Forge/v3/skill-packs/typescript-pack/` (new directory)
- `/home/axw/projects/NXTG-Forge/v3/skill-packs/nodejs-api-pack/` (new directory)

---

### Task 5: Distribution Infrastructure

**Status:** pending
**Estimated:** 8h
**Dependencies:** Task 2, Task 4
**Subtasks:**

- [ ] Set up CDN hosting (or use GitHub Releases)
  - Configure storage bucket
  - Set up CDN distribution
  - Configure CORS headers
- [ ] Implement catalog generation
  - Script to generate catalog.json from packs
  - Update catalog on new pack publish
- [ ] Set up checksum generation
  - Automated SHA-256 generation
- [ ] Set up GPG signing (optional)
  - Generate signing key
  - Automated signing on publish
- [ ] Configure CI/CD for pack publishing
  - Automated validation on PR
  - Automated publish on merge to main
  - Automated catalog update
- [ ] Set up monitoring
  - Download metrics
  - API health checks
  - Error tracking

**Files to Create:**
- `/home/axw/projects/NXTG-Forge/v3/scripts/marketplace/publish-pack.sh`
- `/home/axw/projects/NXTG-Forge/v3/scripts/marketplace/generate-catalog.ts`
- `/home/axw/projects/NXTG-Forge/v3/.github/workflows/publish-skill-packs.yml`

---

## Implementation Strategy

### Phase 1: Foundation (Week 1)

**Goal:** Core validation library and example packs

- Task 1: Core Validation Library
- Task 4: Example FREE Tier Skill-Packs

**Milestone:** Can validate skill-packs locally

### Phase 2: Marketplace API (Week 2)

**Goal:** Functioning marketplace API

- Task 2: Marketplace API Server

**Milestone:** API serves catalog and handles search

### Phase 3: CLI Implementation (Week 3-4)

**Goal:** Full CLI functionality

- Task 3: CLI Commands Implementation

**Milestone:** Users can search, install, and manage skill-packs

### Phase 4: Distribution & Polish (Week 5)

**Goal:** Production-ready marketplace

- Task 5: Distribution Infrastructure
- Documentation
- Testing
- Bug fixes

**Milestone:** Marketplace ready for public beta

---

## Testing Strategy

### Unit Tests

- Validation library (100% coverage)
- Dependency resolver (100% coverage)
- API endpoints (90% coverage)

### Integration Tests

- CLI commands (E2E tests)
- Install/uninstall flow
- Update flow
- Dependency resolution

### Manual Testing

- Install on fresh NXTG-Forge instance
- Test all CLI commands
- Test error scenarios
- Test PRO/ENTERPRISE license validation

---

## Risk Analysis

### Risk: Dependency Resolution Conflicts

**Probability:** Medium  
**Impact:** High  
**Mitigation:**
- Implement robust version resolution algorithm
- Provide clear error messages with suggested resolutions
- Support multiple versions of same pack (if needed)

### Risk: Malicious Packs

**Probability:** Low (with proper review)  
**Impact:** Critical  
**Mitigation:**
- Review process for all packs before publication
- Checksum and signature verification
- Sandboxed post-install hooks
- Community reporting system

### Risk: API Scaling

**Probability:** Medium  
**Impact:** Medium  
**Mitigation:**
- Implement caching layer (Redis)
- Use CDN for static assets
- Rate limiting
- Horizontal scaling of API servers

### Risk: License Key Leakage

**Probability:** Medium  
**Impact:** High  
**Mitigation:**
- Server-side validation only
- Short-lived tokens
- Seat limit enforcement
- Automated abuse detection

---

## Success Criteria

- [ ] All 5 specification documents created and reviewed
- [ ] Validation library with 100% test coverage
- [ ] Marketplace API serving catalog with <100ms p95 latency
- [ ] CLI commands functional for all operations
- [ ] At least 3 FREE tier packs available
- [ ] End-to-end installation flow working
- [ ] Documentation complete
- [ ] Beta testing with 10+ users successful

---

**Next Steps:**

1. Review all specification documents
2. Begin Task 1: Core Validation Library
3. Create skill-pack examples (Task 4 in parallel)
4. Implement marketplace API (Task 2)
5. Implement CLI commands (Task 3)
6. Set up distribution (Task 5)
7. Beta testing and iteration

---

**Related Documents:**
- [Skill-Pack Format Specification](/home/axw/projects/NXTG-Forge/v3/docs/specs/SKILL-PACK-FORMAT.md)
- [Marketplace Specification](/home/axw/projects/NXTG-Forge/v3/docs/specs/MARKETPLACE-SPEC.md)
- [Marketplace Commands](/home/axw/projects/NXTG-Forge/v3/docs/specs/MARKETPLACE-COMMANDS.md)
- [Skill-Pack Tiers](/home/axw/projects/NXTG-Forge/v3/docs/specs/SKILL-PACK-TIERS.md)
- [Installation Flow](/home/axw/projects/NXTG-Forge/v3/docs/specs/INSTALLATION-FLOW.md)
