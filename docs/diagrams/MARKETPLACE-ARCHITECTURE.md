# Skill-Pack Marketplace Architecture Diagram

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         NXTG-Forge User                                 │
│                                                                         │
│  "I want to build a React 19 app with best practices"                  │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    NXTG-Forge CLI Interface                             │
│                                                                         │
│  /frg-marketplace search react                                          │
│  /frg-marketplace install react-19-pack                                 │
│  /frg-marketplace list                                                  │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             │ HTTPS REST API
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   Marketplace API Server                                │
│                   (api.nxtg.ai/v1/marketplace)                          │
│                                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │   Catalog    │  │    Search    │  │   License    │                  │
│  │  Management  │  │    Engine    │  │  Validation  │                  │
│  └──────────────┘  └──────────────┘  └──────────────┘                  │
│                                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │   Version    │  │  Dependency  │  │   Analytics  │                  │
│  │  Resolution  │  │  Resolver    │  │   Tracking   │                  │
│  └──────────────┘  └──────────────┘  └──────────────┘                  │
└────────┬────────────────────┬────────────────────┬─────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│  Catalog DB      │ │   Redis Cache    │ │  License DB      │
│  (PostgreSQL)    │ │  (Search index)  │ │  (PostgreSQL)    │
└──────────────────┘ └──────────────────┘ └──────────────────┘
                             │
                             │ Download Links
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      Distribution Storage                               │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  CDN (cdn.nxtg.ai)                                              │   │
│  │                                                                 │   │
│  │  /packs/react-19-pack-1.2.3.tar.gz                             │   │
│  │  /packs/react-19-pack-1.2.3.tar.gz.sha256                      │   │
│  │  /packs/react-19-pack-1.2.3.tar.gz.sig                         │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  GitHub Releases (FREE tier)                                    │   │
│  │                                                                 │   │
│  │  github.com/nxtg-ai/skill-packs/releases/download/...          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             │ Download & Verify
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    Local Installation Process                           │
│                                                                         │
│  1. Download tarball                                                   │
│  2. Verify checksum (SHA-256)                                          │
│  3. Verify signature (GPG, optional)                                   │
│  4. Extract to temp directory                                          │
│  5. Validate skill-pack.json                                           │
│  6. Move to .claude/forge/skill-packs/<pack-name>/                     │
│  7. Create symlinks: .claude/agents/ ← agents/                         │
│  8. Register skills in skill index                                     │
│  9. Install templates                                                  │
│ 10. Update .claude/forge/config.yml                                    │
│ 11. Run post-install hooks                                             │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     NXTG-Forge Integration                              │
│                                                                         │
│  .claude/                                                               │
│    ├── agents/                                                          │
│    │   ├── react-expert.md ─────────┐  (symlink)                       │
│    │   └── hooks-specialist.md ─────┤  (symlink)                       │
│    │                                │                                   │
│    └── forge/                       │                                   │
│        ├── config.yml (updated)     │                                   │
│        ├── skill-index.json         │                                   │
│        └── skill-packs/             │                                   │
│            └── react-19-pack/ ◄─────┘                                   │
│                ├── skill-pack.json                                      │
│                ├── agents/                                              │
│                │   ├── react-expert.md                                  │
│                │   └── hooks-specialist.md                              │
│                ├── skills/                                              │
│                │   ├── react-patterns.md                                │
│                │   └── hooks-best-practices.md                          │
│                └── templates/                                           │
│                    └── component.tsx.j2                                 │
└─────────────────────────────────────────────────────────────────────────┘
```

---

**See Also:**
- [Marketplace Specification](/home/axw/projects/NXTG-Forge/v3/docs/specs/MARKETPLACE-SPEC.md)
- [Installation Flow](/home/axw/projects/NXTG-Forge/v3/docs/specs/INSTALLATION-FLOW.md)
- [Implementation Plan](/home/axw/projects/NXTG-Forge/v3/.claude/plans/skill-pack-marketplace.md)
