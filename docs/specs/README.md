# NXTG-Forge Specifications

This directory contains comprehensive technical specifications for NXTG-Forge features and capabilities.

## Skill-Pack Marketplace Specifications

A complete marketplace system for distributing skill-packs (agents, skills, templates) across three tiers: FREE, PRO, and ENTERPRISE.

### Core Documents

1. **[SKILL-PACK-FORMAT.md](./SKILL-PACK-FORMAT.md)** (470 lines)
   - Package directory structure
   - Manifest file format (skill-pack.json)
   - Versioning scheme (semver)
   - Dependency declaration
   - License requirements
   - Agent, skill, and template formats

2. **[MARKETPLACE-SPEC.md](./MARKETPLACE-SPEC.md)** (623 lines)
   - Marketplace architecture
   - Catalog format (JSON)
   - API endpoints specification
   - Search and discovery implementation
   - Version resolution algorithm
   - Rating and review system (future)
   - Distribution channels

3. **[MARKETPLACE-COMMANDS.md](./MARKETPLACE-COMMANDS.md)** (684 lines)
   - Complete CLI command reference
   - `/frg-marketplace search` - Search for packs
   - `/frg-marketplace install` - Install packs
   - `/frg-marketplace list` - List installed packs
   - `/frg-marketplace update` - Update packs
   - `/frg-marketplace remove` - Uninstall packs
   - `/frg-marketplace info` - Show pack details
   - `/frg-marketplace publish` - Publish packs
   - Additional utility commands

4. **[SKILL-PACK-TIERS.md](./SKILL-PACK-TIERS.md)** (602 lines)
   - FREE Tier: Open source, common tech stacks
   - PRO Tier: Advanced patterns, pitfall avoidance, industry-specific
   - ENTERPRISE Tier: Custom skill-packs, compliance, private hosting
   - Pricing models and revenue strategy
   - Content scope for each tier
   - Support levels

5. **[INSTALLATION-FLOW.md](./INSTALLATION-FLOW.md)** (739 lines)
   - 8-phase installation process
   - Request parsing and validation
   - Version resolution algorithm
   - Pre-installation checks
   - Download and verification (checksums, signatures)
   - Extraction and validation
   - Integration (symlinks, config updates)
   - Post-installation hooks
   - Rollback mechanism

### Implementation Plan

**[.claude/plans/skill-pack-marketplace.md](../../.claude/plans/skill-pack-marketplace.md)** (429 lines)

Complete implementation plan with 5 tasks:

- **Task 1:** Core Validation Library (12h)
- **Task 2:** Marketplace API Server (20h)
- **Task 3:** CLI Commands Implementation (24h)
- **Task 4:** Example FREE Tier Skill-Packs (16h)
- **Task 5:** Distribution Infrastructure (8h)

**Total Estimated:** 80 hours

### Quick Reference

#### Example Skill-Pack Structure

```
react-19-pack/
├── skill-pack.json          # Package manifest
├── README.md                # Documentation
├── LICENSE                  # MIT/Commercial/Custom
├── agents/
│   ├── react-expert.md
│   └── hooks-specialist.md
├── skills/
│   ├── react-patterns.md
│   ├── hooks-best-practices.md
│   └── server-components.md
└── templates/
    └── component.tsx.j2
```

#### Example skill-pack.json

```json
{
  "$schema": "https://nxtg.ai/schemas/skill-pack/v1.0.json",
  "name": "react-19-pack",
  "version": "1.2.3",
  "description": "React 19 best practices and patterns",
  "tier": "FREE",
  "author": {
    "name": "NXTG Team",
    "email": "packs@nxtg.ai"
  },
  "license": "MIT",
  "requires": {
    "nxtg-forge": ">=3.0.0"
  },
  "dependencies": {
    "typescript-pack": "^5.0.0"
  },
  "provides": {
    "agents": ["react-expert", "hooks-specialist"],
    "skills": ["react-patterns", "hooks-best-practices"],
    "templates": ["component"]
  }
}
```

#### Common Commands

```bash
# Search for packs
/frg-marketplace search react

# Install a pack
/frg-marketplace install react-19-pack

# List installed packs
/frg-marketplace list

# Update a pack
/frg-marketplace update react-19-pack

# Show pack info
/frg-marketplace info react-19-pack
```

### Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                   NXTG-Forge CLI                        │
│  /frg-marketplace <command> [options] [args]            │
└─────────────────────┬───────────────────────────────────┘
                      │
                      │ HTTPS/REST
                      ▼
┌─────────────────────────────────────────────────────────┐
│         Marketplace API (api.nxtg.ai/v1)                │
│  - Catalog endpoints                                    │
│  - Search & discovery                                   │
│  - Version resolution                                   │
│  - License validation (PRO/ENTERPRISE)                  │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│     Distribution Storage (CDN/GitHub Releases)          │
│  - Tarball hosting                                      │
│  - Checksum files                                       │
│  - GPG signatures                                       │
└─────────────────────────────────────────────────────────┘
```

### Tier Comparison

| Feature | FREE | PRO | ENTERPRISE |
|---------|------|-----|------------|
| **License** | Open Source | Commercial | Custom |
| **Price** | $0 | $29-299/mo | Custom |
| **Content** | Common stacks | Advanced + Industry | Custom + Compliance |
| **Support** | Community | Email + Priority | Dedicated + SLA |
| **Distribution** | Public | NXTG CDN | Private |

### Key Features

- **Semver Versioning:** All packs use semantic versioning
- **Dependency Resolution:** Automatic dependency management with conflict detection
- **Security:** Checksum verification, optional GPG signatures
- **Rollback:** Automatic rollback on installation failure
- **Dry Run:** Preview installations without making changes
- **Search:** Full-text search with filters and facets
- **Licensing:** Support for FREE (open source), PRO (commercial), and ENTERPRISE (custom)

---

## Other Specifications

### [INFINITY-TERMINAL-SPEC.md](./INFINITY-TERMINAL-SPEC.md)

Technical specification for the Infinity Terminal (persistent browser-based terminal).

---

## Document Status

All marketplace specifications are in **DRAFT** status as of 2026-02-04.

**Total Documentation:** ~4,100 lines across 6 files

**Next Steps:**
1. Review and approve specifications
2. Begin implementation (Task 1: Validation Library)
3. Create example FREE tier packs
4. Implement marketplace API
5. Implement CLI commands
6. Beta testing

---

**See Also:**
- [Implementation Plan](../../.claude/plans/skill-pack-marketplace.md)
- [Project Documentation](../../docs/)
