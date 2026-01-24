# /docs-audit

**Agent**: Release Sentinel  
**Purpose**: Comprehensive documentation quality audit

---

## Checks Performed

### 1. Coverage Analysis
- Which code files have documentation?
- Which exports are undocumented?
- Which public APIs lack examples?

### 2. Freshness Analysis
- When was each doc last updated?
- Which docs are older than their source files?
- Version mismatches?

### 3. Quality Analysis
- Broken links (internal and external)
- Code examples that don't compile
- Missing required sections
- Outdated screenshots

### 4. Consistency Analysis
- Terminology consistency
- Formatting consistency
- Style guide compliance

---

## Output Report
````markdown
# Documentation Audit Report
Generated: 2026-01-08 14:30:00

## Summary

| Metric | Score | Status |
|--------|-------|--------|
| Coverage | 87% | 🟡 Good |
| Freshness | 72% | 🟡 Good |
| Quality | 94% | ✅ Excellent |
| Consistency | 88% | 🟡 Good |
| **Overall** | **85%** | 🟡 Good |

## Coverage Details

### Fully Documented (12 files)
- src/api/routes/users.ts ✅
- src/api/routes/projects.ts ✅
- src/components/ui/button.tsx ✅
...

### Partially Documented (3 files)
- src/api/routes/webhooks.ts (60%)
  - Missing: DELETE endpoint, error responses
- src/services/avatar.ts (40%)
  - Missing: Public methods documentation
...

### Undocumented (2 files)
- src/utils/crypto.ts ❌
- src/services/cache.ts ❌

## Freshness Details

### Recently Updated (< 7 days)
- docs/api/users.md (2 days ago)
- CHANGELOG.md (1 day ago)

### Potentially Stale (> 30 days)
- docs/architecture/overview.md (45 days)
  - Source changed: 12 days ago
  - ⚠️ May need update

### Definitely Stale (> 90 days)
- docs/deployment.md (120 days)
  - ❌ Needs immediate attention

## Quality Issues

### Broken Links (2)
- docs/api/overview.md:45 -> /api/legacy (404)
- README.md:12 -> https://old-domain.com/docs (404)

### Failing Examples (1)
- docs/getting-started.md:89
```typescript
  // This import no longer exists
  import { oldFunction } from './utils';
```

### Missing Sections (3)
- docs/api/webhooks.md: Missing "Error Responses"
- docs/components/input.md: Missing "Accessibility"
- docs/cli.md: Missing "Examples"

## Recommendations

### High Priority
1. Fix broken links in docs/api/overview.md
2. Update stale docs/deployment.md
3. Add documentation for src/utils/crypto.ts

### Medium Priority
4. Update failing code example in getting-started.md
5. Add missing sections to API docs
6. Review architecture docs for accuracy

### Low Priority
7. Improve consistency in terminology
8. Add more examples to component docs

## Action Items

Run these commands to address issues:
```bash
# Fix high priority
/docs-update --file docs/api/overview.md
/docs-update --file docs/deployment.md
/docs-generate api src/utils/crypto.ts

# Fix medium priority
/docs-validate --fix-examples
/docs-update --add-sections
```
````
````

---

## Complete Agent Ecosystem for Documentation
````
┌─────────────────────────────────────────────────────────────────┐
│                    DOCUMENTATION FLOW                           │
└─────────────────────────────────────────────────────────────────┘

  Developer writes code
         │
         ▼
  ┌──────────────┐
  │ Any Agent    │  Creates/modifies code
  │ (Backend,    │  with proper annotations
  │  Frontend,   │  (JSDoc, TSDoc, decorators)
  │  CLI, etc)   │
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │ QA Sentinel  │  Validates code quality
  │              │  Checks doc annotations present
  └──────┬───────┘
         │
         ▼
  ┌──────────────────────────────────────────────────────────────┐
  │                    RELEASE SENTINEL                          │
  │                                                              │
  │  1. Detect changed files                                     │
  │  2. Check doc mappings                                       │
  │  3. Run appropriate generators:                              │
  │     • API docs from OpenAPI/annotations                      │
  │     • Component docs from TypeScript                         │
  │     • CLI docs from command decorators                       │
  │  4. Update CHANGELOG from commits                            │
  │  5. Flag manual updates needed                               │
  │  6. Validate all docs (links, examples)                      │
  │  7. Update state.json                                        │
  │  8. Generate commit message                                  │
  │                                                              │
  └──────────────────────────────────────────────────────────────┘
         │
         ▼
  Documentation stays in sync! ✅