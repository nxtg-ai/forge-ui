# /docs-status

**Agent**: Release Sentinel
**Purpose**: Show documentation health and pending updates

---

## Execution
````python
#!/usr/bin/env python3
"""Documentation status checker"""

import json
from pathlib import Path
from datetime import datetime, timedelta

def load_state():
    with open('.claude/state.json') as f:
        return json.load(f)

def check_doc_health(state):
    docs = state.get('documentation', {}).get('files', {})
    
    current = []
    stale = []
    critical = []
    
    for doc_path, info in docs.items():
        health = info.get('health', 'unknown')
        if health == 'current':
            current.append(doc_path)
        elif health == 'stale':
            stale.append((doc_path, info.get('sections_stale', [])))
        else:
            critical.append(doc_path)
    
    return current, stale, critical

def main():
    state = load_state()
    current, stale, critical = check_doc_health(state)
    
    coverage = state.get('documentation', {}).get('coverage_score', 0)
    pending = state.get('documentation', {}).get('pending_updates', [])
    
    print("📚 Documentation Status")
    print("=" * 50)
    print()
    
    # Coverage score
    if coverage >= 90:
        print(f"  Coverage: {coverage}% ✅ Excellent")
    elif coverage >= 70:
        print(f"  Coverage: {coverage}% 🟡 Good")
    else:
        print(f"  Coverage: {coverage}% ❌ Needs attention")
    print()
    
    # Health breakdown
    print(f"  📗 Current: {len(current)} files")
    print(f"  📙 Stale: {len(stale)} files")
    print(f"  📕 Critical: {len(critical)} files")
    print()
    
    # Stale details
    if stale:
        print("  Stale Documentation:")
        for doc, sections in stale[:5]:
            print(f"    • {doc}")
            for section in sections[:3]:
                print(f"      - {section}")
        if len(stale) > 5:
            print(f"    ... and {len(stale) - 5} more")
        print()
    
    # Pending updates
    if pending:
        print("  Pending Updates:")
        for update in pending[:5]:
            priority_icon = "🔴" if update['priority'] == 'high' else "🟡"
            print(f"    {priority_icon} {update['file']}")
            print(f"       Reason: {update['reason']}")
        print()
    
    # Recommendations
    print("  Recommendations:")
    if critical:
        print("    1. Run '/docs-update --critical' to fix critical issues")
    if stale:
        print("    2. Run '/docs-update' to update stale sections")
    if not critical and not stale:
        print("    ✅ Documentation is healthy!")
    
    print()
    print("  Run '/docs-audit' for detailed analysis")

if __name__ == '__main__':
    main()
````

---

## Output Example
````
📚 Documentation Status
==================================================

  Coverage: 87% 🟡 Good

  📗 Current: 12 files
  📙 Stale: 3 files
  📕 Critical: 0 files

  Stale Documentation:
    • docs/api/users.md
      - POST /users
      - DELETE /users/{id}
    • docs/components/button.md
      - Props table
    • README.md
      - Installation section

  Pending Updates:
    🔴 docs/api/users.md
       Reason: New endpoint added: PATCH /users/{id}/avatar
    🟡 docs/cli.md
       Reason: New command added: forge export

  Recommendations:
    1. Run '/docs-update' to update stale sections

  Run '/docs-audit' for detailed analysis
````