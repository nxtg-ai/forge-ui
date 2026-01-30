# Data-TestID Implementation Process

## Overview

This document defines the **consistent, repeatable process** for adding and maintaining `data-testid` attributes across the NXTG-Forge UI. Follow this protocol to ensure quality, consistency, and testability.

---

## Quick Reference

| Resource | Location | Purpose |
|----------|----------|---------|
| **Requirements Spec** | `.forge/Design-System/UI/data-testid-prompt.md` | What to tag, naming standards, rules |
| **Add Script** | `scripts/testing/add-testids.ts` | Automated batch updates |
| **Check Script** | `scripts/testing/check-testids.sh` | Verification and duplicate detection |
| **Implementation Report** | `docs/testing/data-testid-implementation-report.md` | Initial implementation details |
| **UAT Report** | `docs/testing/data-testid-uat-report.md` | Complete coverage report |

---

## Process: Adding data-testid to New Components

### 1. Review Requirements

Read the requirements spec:
```bash
cat .forge/Design-System/UI/data-testid-prompt.md
```

**Key Rules:**
- Format: `{component}-{section}-{element}-{variant}`
- Lowercase kebab-case only
- No dynamic values (IDs, timestamps, user data)
- Must be globally unique

### 2. Manual Implementation (Recommended)

For **new components** or **individual updates**:

```tsx
// ✅ GOOD - Interactive element
<button
  onClick={handleSave}
  data-testid="vision-capture-save-btn"
>
  Save
</button>

// ✅ GOOD - Container
<div
  className="dashboard-container"
  data-testid="dashboard-main"
>

// ✅ GOOD - Form input
<input
  type="text"
  name="mission"
  data-testid="vision-capture-mission-input"
/>

// ✅ GOOD - List items with stable variant
<div data-testid="agent-list">
  {agents.map((agent, index) => (
    <div
      key={agent.id}
      data-testid={`agent-card-${index}`}  // ⚠️ Only if list order is stable
    >
```

**What to Tag:**
- ✅ Buttons, links, inputs, selects, toggles
- ✅ Navigation elements
- ✅ Modals, headers, key containers
- ✅ Loading states, error messages
- ✅ List containers and items

**What NOT to Tag:**
- ❌ Purely presentational wrappers
- ❌ Deep nested layout divs
- ❌ Every child in repeated rows

### 3. Automated Batch Updates (For Multiple Components)

For **large-scale updates** across many files:

**Step 1: Update the script**

Edit `scripts/testing/add-testids.ts`:

```typescript
const componentUpdates: ComponentUpdate[] = [
  {
    file: 'src/components/MyNewComponent.tsx',
    updates: [
      {
        search: '<div className="container',
        replace: '<div className="container" data-testid="my-component-container"'
      },
      {
        search: '<button onClick={handleClick}',
        replace: '<button onClick={handleClick} data-testid="my-component-action-btn"'
      }
    ]
  }
];
```

**Step 2: Run the script**

```bash
npx ts-node scripts/testing/add-testids.ts
```

**Step 3: Verify output**

The script will show:
- Files updated
- Number of changes per file
- Summary statistics

### 4. Verification

**Check for duplicates:**

```bash
bash scripts/testing/check-testids.sh
```

Look for:
- ✅ No duplicate `data-testid` values
- ✅ All testids follow naming convention
- ✅ Components without testids (if intentional)

**Manual verification:**

```bash
# Find all testids in a component
grep -n "data-testid=" src/components/MyComponent.tsx

# Find duplicate testids
grep -roh 'data-testid="[^"]*"' src/ | sort | uniq -d
```

### 5. Testing

**TypeScript build:**

```bash
npm run build
```

Ensure no type errors introduced.

**Visual verification:**

1. Start dev server: `npm run dev`
2. Open browser DevTools
3. Inspect elements to verify `data-testid` attributes present

**Write a test (optional):**

```typescript
import { render, screen } from '@testing-library/react';

test('renders save button with testid', () => {
  render(<VisionCapture />);
  const saveBtn = screen.getByTestId('vision-capture-save-btn');
  expect(saveBtn).toBeInTheDocument();
});
```

### 6. Documentation

Update reports if needed:
- `docs/testing/data-testid-implementation-report.md` - Add new components
- `docs/testing/data-testid-uat-report.md` - Update statistics

---

## Process: Reviewing Existing Implementation

### 1. Check Coverage

```bash
bash scripts/testing/check-testids.sh
```

Review output:
- Files with testids
- Total count
- Duplicates (if any)
- Components without testids

### 2. Audit Naming Consistency

```bash
# List all testids
grep -roh 'data-testid="[^"]*"' src/ | sort -u

# Check for violations
grep -roh 'data-testid="[^"]*"' src/ | grep -E '[A-Z]|_|[0-9]{10,}|${'
```

**Common issues:**
- CamelCase instead of kebab-case
- Underscores instead of hyphens
- Dynamic values embedded
- UUIDs or timestamps

### 3. Fix Duplicates

If duplicates found:

```bash
# Find which files have duplicate
grep -rn 'data-testid="duplicate-id"' src/
```

**Resolution strategies:**
1. Add page/component prefix
2. Add section suffix
3. Pass `testIdPrefix` prop for reusable components

Example fix:
```tsx
// Before (duplicate)
<ProgressBar data-testid="progress-bar-container" />

// After (unique per usage)
<ProgressBar testIdPrefix="dashboard-health" />
// Renders: data-testid="dashboard-health-container"
```

---

## Naming Convention Reference

### Format

```
{component}-{section}-{element}-{variant}
```

### Component Examples

**VisionCapture:**
```
vision-capture-container
vision-capture-header
vision-capture-step-1
vision-capture-mode-ceo-btn
vision-capture-mission-input
vision-capture-next-btn
```

**Dashboard:**
```
dashboard-container
dashboard-header
dashboard-mode-select
dashboard-health-score
dashboard-agent-card
dashboard-blocker-alert
```

**CommandCenter:**
```
command-center-trigger-btn
command-center-modal
command-center-search-input
command-center-command-item
command-center-execute-btn
```

### Reusable Components

For components used in multiple places:

**Option 1: Accept testIdPrefix prop**

```tsx
interface ProgressBarProps {
  value: number;
  testIdPrefix?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  testIdPrefix = 'progress-bar'
}) => (
  <div data-testid={`${testIdPrefix}-container`}>
    <div data-testid={`${testIdPrefix}-track`}>
      <div data-testid={`${testIdPrefix}-fill`} style={{ width: `${value}%` }} />
    </div>
  </div>
);
```

**Usage:**
```tsx
<ProgressBar value={75} testIdPrefix="dashboard-health" />
// Renders: dashboard-health-container, dashboard-health-track, dashboard-health-fill

<ProgressBar value={50} testIdPrefix="vision-goal-1" />
// Renders: vision-goal-1-container, vision-goal-1-track, vision-goal-1-fill
```

---

## Quality Gates

Before committing:

### ✅ Checklist

- [ ] All interactive elements tagged
- [ ] Key containers tagged
- [ ] Naming follows convention (lowercase kebab-case)
- [ ] No duplicate testids
- [ ] No dynamic values in testids
- [ ] TypeScript build passes
- [ ] Manually verified in browser DevTools

### ✅ Commands

```bash
# Check for duplicates
bash scripts/testing/check-testids.sh

# Verify TypeScript
npm run build

# Run tests (if exists)
npm test
```

---

## Common Pitfalls

### ❌ DON'T: Use dynamic values

```tsx
// ❌ BAD - contains user ID
<div data-testid={`user-card-${user.id}`}>

// ❌ BAD - contains timestamp
<div data-testid={`toast-${Date.now()}`}>

// ✅ GOOD - stable identifier
<div data-testid="user-card">
<div data-testid="toast-item">
```

### ❌ DON'T: Use CamelCase or underscores

```tsx
// ❌ BAD
<button data-testid="saveButton">
<button data-testid="save_button">

// ✅ GOOD
<button data-testid="save-btn">
```

### ❌ DON'T: Create duplicates across components

```tsx
// ❌ BAD - same testid in two files
// File 1: src/components/Header.tsx
<button data-testid="close-btn">

// File 2: src/components/Modal.tsx
<button data-testid="close-btn">

// ✅ GOOD - unique per component
// File 1:
<button data-testid="header-close-btn">

// File 2:
<button data-testid="modal-close-btn">
```

### ❌ DON'T: Over-tag every element

```tsx
// ❌ BAD - too granular
<div data-testid="card-wrapper">
  <div data-testid="card-inner">
    <div data-testid="card-content-wrapper">
      <div data-testid="card-content-inner">
        <button data-testid="card-button">Click</button>
      </div>
    </div>
  </div>
</div>

// ✅ GOOD - tag meaningful elements only
<div data-testid="card">
  <button data-testid="card-action-btn">Click</button>
</div>
```

---

## Troubleshooting

### Issue: Library component doesn't accept data-testid

**Solution:** Wrap with a div

```tsx
// ❌ Library component without testid support
<LibraryButton onClick={handler}>Save</LibraryButton>

// ✅ Wrap with testid
<div data-testid="save-btn-wrapper">
  <LibraryButton onClick={handler}>Save</LibraryButton>
</div>
```

### Issue: Animated components with Framer Motion

**Solution:** Add testid to wrapper or motion.div

```tsx
import { motion } from 'framer-motion';

// ✅ Add to motion component
<motion.div
  data-testid="animated-panel"
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
>
  Content
</motion.div>
```

### Issue: Conditional rendering causes testid to disappear

**Solution:** Ensure testid stays consistent

```tsx
// ❌ BAD - testid changes based on state
<button data-testid={isLoading ? 'loading-btn' : 'save-btn'}>
  {isLoading ? 'Loading...' : 'Save'}
</button>

// ✅ GOOD - stable testid, state via aria-busy
<button
  data-testid="save-btn"
  aria-busy={isLoading}
>
  {isLoading ? 'Loading...' : 'Save'}
</button>
```

---

## Maintenance

### When to Update

- **New component created** → Add testids immediately
- **Component refactored** → Verify testids still correct
- **Bug found** → Check if testid would help reproduce
- **UAT feedback** → Add missing testids for tested flows

### Periodic Audits

Run quarterly:

```bash
# Full audit
bash scripts/testing/check-testids.sh

# Check for new components without testids
find src/components src/pages -name "*.tsx" -type f | while read file; do
  if ! grep -q "data-testid" "$file"; then
    echo "⚠️  $file"
  fi
done
```

---

## Examples

See complete examples in:
- `docs/testing/data-testid-implementation-report.md` - Initial 4 components
- `docs/testing/data-testid-uat-report.md` - All 13 components

---

## Support

Questions? Check:
1. `.forge/Design-System/UI/data-testid-prompt.md` - Full requirements
2. `docs/testing/data-testid-uat-report.md` - Complete examples
3. `scripts/testing/check-testids.sh` - Run verification

---

**Last Updated:** 2026-01-29
**Maintained By:** NXTG-Forge Team
**Status:** ACTIVE
