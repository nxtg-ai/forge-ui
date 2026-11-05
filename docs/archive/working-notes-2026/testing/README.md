# Testing Documentation

This directory contains all testing-related documentation for NXTG-Forge v3.

## Data-TestID Implementation

### Core Documents

| Document | Purpose | Audience |
|----------|---------|----------|
| **[data-testid-process.md](./data-testid-process.md)** | **START HERE** - Complete process guide | Developers, QA |
| [data-testid-implementation-report.md](./data-testid-implementation-report.md) | Initial implementation details (4 components) | Historical reference |
| [data-testid-uat-report.md](./data-testid-uat-report.md) | Complete UAT coverage report (13 components) | QA, Product |

### Supporting Files

| File | Location | Purpose |
|------|----------|---------|
| **Requirements Spec** | `../../.forge/Design-System/UI/data-testid-prompt.md` | What to tag, naming rules |
| **Add Script** | `../../scripts/testing/add-testids.ts` | Automated batch updates |
| **Check Script** | `../../scripts/testing/check-testids.sh` | Verification tool |

---

## Quick Start

### For Developers

**Adding testids to new component:**

1. Read the process: `docs/testing/data-testid-process.md`
2. Review naming convention in `.forge/Design-System/UI/data-testid-prompt.md`
3. Add `data-testid` attributes manually
4. Verify: `bash scripts/testing/check-testids.sh`

### For QA/UAT

**Current coverage:**

```
✅ 13 components fully tagged
✅ 141+ unique testids
✅ 0 duplicates
✅ 100% naming standard compliance
```

See complete coverage in: [data-testid-uat-report.md](./data-testid-uat-report.md)

---

## Testing Types

### E2E Testing

Use data-testid for reliable selectors:

```javascript
// Cypress
cy.get('[data-testid="vision-capture-save-btn"]').click();

// Playwright
await page.locator('[data-testid="command-center-search-input"]').fill('status');

// Testing Library
const saveBtn = screen.getByTestId('vision-capture-save-btn');
```

### UAT Testing

Manual testers can:
- Identify elements consistently across test runs
- Document bugs with stable element references
- Create test scripts with exact selectors

---

## Coverage Status

### ✅ Fully Implemented (13 components)

1. VisionCapture (25+ testids)
2. ChiefOfStaffDashboard (20+ testids)
3. CommandCenter (15+ testids)
4. VisionDisplay (18+ testids)
5. YoloMode (16+ testids)
6. ArchitectDiscussion (14+ testids)
7. LiveActivityFeed (12+ testids)
8. AgentCollaborationView (10+ testids)
9. ToastSystem (8+ testids)
10. ProgressBar (4 testids with prefix support)
11. dashboard-live.tsx (10+ testids)
12. monitoring/dashboard.tsx (8+ testids)
13. App.integrated.tsx (8+ testids)

### Quality Metrics

```
Total testids: 141+
Duplicate count: 0
Naming compliance: 100%
Components without testids: 0 (core UI)
```

---

## Maintenance

### Regular Checks

```bash
# Verify no duplicates
bash scripts/testing/check-testids.sh

# Find components without testids
find src/components src/pages -name "*.tsx" | while read f; do
  grep -q "data-testid" "$f" || echo "⚠️  $f"
done
```

### Quarterly Audit

Run full coverage audit and update reports.

---

## Contributing

When adding new UI components:

1. Add `data-testid` attributes following naming convention
2. Run verification: `bash scripts/testing/check-testids.sh`
3. Update implementation report if significant
4. Ensure no duplicates

---

## Links

- [Testing Process](./data-testid-process.md) - **Complete guide**
- [Requirements Spec](../../.forge/Design-System/UI/data-testid-prompt.md)
- [UAT Report](./data-testid-uat-report.md)
- [Scripts](../../scripts/testing/)

---

**Last Updated:** 2026-01-29
