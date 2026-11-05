# 🐕 Dog-Fooding Quick Reference Card

**Keep this handy while dog-fooding!**

---

## 📂 Where Things Go

| Type | Location | Git Status |
|------|----------|-----------|
| UI experiments & prototypes | `.asif/` | 🚫 Gitignored |
| Notes, references, guides | `.forge/` | 🚫 Gitignored |
| Your actual visions | `.claude/VISION.md` | 🚫 Gitignored |
| Session state | `.claude/forge/state.json` | 🚫 Gitignored |
| Product code | `src/` | ✅ Committed |
| Documentation | `docs/` | ✅ Committed |
| Tests | `tests/` | ✅ Committed |

---

## ✅ Pre-Commit Checklist

Before `git commit`, run:

```bash
# 1. Check what's staged
git status

# 2. Verify no personal data
git diff --cached --name-only | grep -E "(\.asif|\.forge|VISION\.md)"

# If the above returns anything, DON'T COMMIT!
```

---

## 🎨 Quick Workflows

### Experiment with UI
```bash
# Copy to .asif, hack away, migrate when ready
cp -r src/components/MyComponent .asif/experiments/
# Edit .asif/experiments/MyComponent
cp .asif/experiments/MyComponent src/components/
```

### Capture a Pattern
```bash
echo "## New Pattern" >> .forge/patterns/my-pattern.md
```

### Document a Decision
```bash
cat > .forge/decisions/$(date +%Y-%m-%d)-my-decision.md << EOF
## Decision: [Title]
**Context:** ...
**Outcome:** ...
EOF
```

### File UAT Feedback
```bash
# Edit this file:
tests/UI/UI-UAT.MD
```

---

## 🚨 Emergency: Accidentally Committed Personal Data

```bash
# If NOT pushed yet:
git reset --soft HEAD~1

# If already pushed:
# See docs/DOGFOODING-BEST-PRACTICES.md
# Section: "Migration Plan"
```

---

## 📖 Full Guides

- **Start here:** [DOG-FOOD-README.md](DOG-FOOD-README.md)
- **Best practices:** [docs/DOGFOODING-BEST-PRACTICES.md](docs/DOGFOODING-BEST-PRACTICES.md)
- **Implementation:** [docs/IMPLEMENTATION-CHECKLIST.md](docs/IMPLEMENTATION-CHECKLIST.md)
- **Strategy:** [PRODUCT-SEPARATION-STRATEGY.md](PRODUCT-SEPARATION-STRATEGY.md)

---

## 💡 Remember

**Golden Rule:** Your content = Your directories (`.asif/`, `.forge/`)

Ship the blueprints, not your flight logs! ✈️
