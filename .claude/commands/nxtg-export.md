---
name: nxtg-export
description: Export project state to JSON, Markdown, or PDF for sharing/archival
category: advanced
---

# NXTG-Forge State Export

**Export your project state in multiple formats for sharing, documentation, or archival.**

## When I Execute This Command

I will export your complete project state, work history, decisions, and insights in your chosen format—beautifully formatted and ready to share.

## Export Formats

### 1. JSON (Machine-Readable)
```bash
/nxtg-export json
```

Perfect for:
- Backup and archival
- Data analysis
- Integration with tools
- State migration

### 2. Markdown (Human-Readable)
```bash
/nxtg-export markdown
```

Perfect for:
- Documentation
- Team sharing
- GitHub/GitLab
- Knowledge base

### 3. PDF (Professional Reports)
```bash
/nxtg-export pdf
```

Perfect for:
- Stakeholder reports
- Project summaries
- Presentations
- Client deliverables

### 4. HTML (Interactive)
```bash
/nxtg-export html
```

Perfect for:
- Internal dashboards
- Interactive exploration
- Web viewing
- Rich visualization

## JSON Export

### Basic Export
```bash
/nxtg-export json
```

**Output**: `.claude/forge/exports/state-export-20260123-143052.json`

```json
{
  "export_metadata": {
    "exported_at": "2026-01-23T14:30:52Z",
    "export_version": "3.0",
    "project_name": "my-awesome-project",
    "export_format": "json"
  },
  "session": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "started_at": "2026-01-23T10:00:00Z",
    "duration_hours": 4.5,
    "token_usage": {
      "current": 94205,
      "limit": 200000,
      "percentage": 47
    }
  },
  "context": {
    "current_goal": "Implement OAuth2 authentication with Google and GitHub",
    "completed_work": [
      {
        "task": "User model with password hashing",
        "completed_at": "2026-01-23T11:30:00Z",
        "artifacts": ["models/user.py", "tests/test_user.py"]
      },
      // ... 41 more items
    ],
    "pending_todos": [
      {
        "task": "Implement password reset flow",
        "priority": "high",
        "blocked": false
      },
      // ... 7 more items
    ],
    "key_decisions": [
      {
        "decision": "Using JWT for sessions",
        "rationale": "Stateless architecture, horizontal scaling",
        "made_at": "2026-01-23T10:45:00Z",
        "alternatives_considered": ["Session cookies", "Redis sessions"]
      },
      // ... 14 more items
    ],
    "discoveries": [
      {
        "insight": "bcrypt rounds = 12 for optimal security/performance",
        "source": "Security audit",
        "discovered_at": "2026-01-23T12:15:00Z"
      }
    ]
  },
  "engagement_quality": {
    "current_score": 94,
    "metrics": {
      "context_awareness": 96,
      "update_richness": 93,
      "progress_clarity": 94,
      "insight_capture": 95
    },
    "trend": "improving"
  },
  "statistics": {
    "total_files_created": 23,
    "total_files_modified": 47,
    "total_tests_written": 156,
    "total_tests_passing": 156,
    "code_coverage": "96%",
    "total_commands_executed": 89
  }
}
```

### Compressed JSON
```bash
/nxtg-export json --compress
```
**Output**: `.claude/forge/exports/state-export-20260123-143052.json.gz`
**Size**: ~15KB (was 450KB)

## Markdown Export

### Full Report
```bash
/nxtg-export markdown
```

**Output**: `.claude/forge/exports/project-report-20260123-143052.md`

```markdown
# Project Report: my-awesome-project

**Generated**: 2026-01-23 14:30:52
**Session Duration**: 4.5 hours
**Token Usage**: 94,205 / 200,000 (47%)
**Engagement Quality**: 94/100 (EXCELLENT)

---

## 🎯 Current Goal

Implement OAuth2 authentication with Google and GitHub

---

## ✅ Completed Work (42 items)

### User Authentication
- **User model with password hashing** *(Completed: 2026-01-23 11:30)*
  - Files: `models/user.py`, `tests/test_user.py`
  - Tests: 12/12 passing
  - Coverage: 100%

- **JWT token service** *(Completed: 2026-01-23 12:15)*
  - Files: `services/token_service.py`, `tests/test_tokens.py`
  - Features: Access + refresh tokens, blacklisting
  - Tests: 18/18 passing

- **Login/register endpoints** *(Completed: 2026-01-23 13:00)*
  - Files: `api/auth.py`, `tests/test_auth_api.py`
  - Endpoints: POST /login, POST /register, POST /refresh
  - Tests: 24/24 passing

... [39 more items]

---

## ☐ Pending Work (8 items)

### High Priority
- [ ] Implement password reset flow
- [ ] Add email verification
- [ ] Set up rate limiting

### Medium Priority
- [ ] Add OAuth2 provider abstraction
- [ ] Implement token rotation

### Low Priority
- [ ] Add session management dashboard
- [ ] Implement device tracking
- [ ] Add login history

---

## 🔑 Key Decisions (15 items)

### 1. JWT for Session Management
**Decision**: Use JWT tokens (access + refresh) instead of server-side sessions

**Rationale**:
- Stateless architecture enables horizontal scaling
- Reduces database load
- Simplifies microservices architecture

**Alternatives Considered**:
- Session cookies (rejected: requires sticky sessions)
- Redis sessions (rejected: adds infrastructure complexity)

**Made**: 2026-01-23 10:45

---

### 2. bcrypt with 12 rounds
**Decision**: Use bcrypt for password hashing with 12 rounds

**Rationale**:
- OWASP recommended
- Optimal security/performance balance
- Future-proof against hardware improvements

**Made**: 2026-01-23 11:00

---

... [13 more decisions]

---

## 💡 Discoveries & Insights

### Security
- bcrypt rounds = 12 provides ~250ms hash time (acceptable UX, secure)
- JWT expiry: 15 min access, 7 day refresh (industry standard)
- Email verification prevents 99% of spam accounts

### Performance
- Async/await reduces API latency by 60%
- Database connection pooling essential (10 connections optimal)
- Caching JWT public keys improves validation 10x

### Architecture
- Repository pattern makes testing 3x easier
- Dependency injection simplifies mocking
- Service layer separation enables reusability

---

## 📊 Statistics

- **Files Created**: 23
- **Files Modified**: 47
- **Tests Written**: 156
- **Tests Passing**: 156 (100%)
- **Code Coverage**: 96%
- **Commands Executed**: 89

---

## 📈 Engagement Quality: 94/100 (EXCELLENT)

| Metric | Score | Trend |
|--------|-------|-------|
| Context Awareness | 96% | ↗️ Improving |
| Update Richness | 93% | → Stable |
| Progress Clarity | 94% | ↗️ Improving |
| Insight Capture | 95% | → Stable |

---

## 🚀 Next Steps

1. Complete password reset flow (2-3 hours)
2. Implement email verification (1-2 hours)
3. Add rate limiting (1 hour)
4. Security audit (30 minutes)
5. Performance testing (1 hour)

---

**Report generated by NXTG-Forge v3.0**
**From Exhaustion to Empowerment**
```

### Summary Only
```bash
/nxtg-export markdown --summary
```

Brief 1-page overview instead of full report.

## PDF Export

### Professional Report
```bash
/nxtg-export pdf
```

**Output**: `.claude/forge/exports/project-report-20260123-143052.pdf`

**Features**:
- Professional formatting
- Table of contents
- Syntax-highlighted code blocks
- Charts and graphs
- Page numbers and headers
- Branded footer

**Perfect for**: Stakeholder presentations, client deliverables

### Executive Summary
```bash
/nxtg-export pdf --executive
```

High-level overview for non-technical stakeholders:
- Goal and progress
- Key achievements
- Metrics and statistics
- Next steps
- No technical details

## HTML Export

### Interactive Dashboard
```bash
/nxtg-export html
```

**Output**: `.claude/forge/exports/dashboard-20260123-143052.html`

**Features**:
- Interactive timeline
- Collapsible sections
- Search functionality
- Syntax highlighting
- Responsive design
- Dark/light mode toggle

**Open in browser**:
```bash
open .claude/forge/exports/dashboard-20260123-143052.html
```

## Export Options

### Include Code Artifacts
```bash
/nxtg-export markdown --include-code
```

Embeds full code files in export:
```markdown
### User Model (`models/user.py`)

\`\`\`python
from sqlalchemy import Column, String, DateTime
from sqlalchemy.ext.hybrid import hybrid_property
import bcrypt

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True)
    email = Column(String, unique=True, nullable=False)
    _password_hash = Column("password_hash", String, nullable=False)

    @hybrid_property
    def password(self):
        return self._password_hash

    @password.setter
    def password(self, value):
        self._password_hash = bcrypt.hashpw(
            value.encode('utf-8'),
            bcrypt.gensalt(rounds=12)
        )
\`\`\`
```

### Filter by Date Range
```bash
/nxtg-export json --from "2026-01-20" --to "2026-01-23"
```

Export only work from specific date range.

### Filter by Category
```bash
/nxtg-export markdown --category "completed"
```

Export only completed work, pending work, or decisions.

### Custom Filename
```bash
/nxtg-export pdf --output "oauth2-implementation-summary.pdf"
```

Specify custom output filename.

## Automated Exports

### On Checkpoint
```bash
# Auto-export when creating checkpoints
/nxtg-checkpoint "feature complete" --export markdown
```

Creates checkpoint AND exports report.

### Scheduled Exports
```bash
# Daily exports (configured in hooks)
/nxtg-export json --schedule daily

# Weekly reports
/nxtg-export pdf --schedule weekly --executive
```

## Export Locations

All exports saved to:
```
.claude/forge/exports/
├── state-export-20260123-143052.json
├── state-export-20260123-143052.json.gz
├── project-report-20260123-143052.md
├── project-report-20260123-143052.pdf
└── dashboard-20260123-143052.html
```

**Note**: Add to `.gitignore` - exports contain sensitive data

## Use Cases

### 1. End-of-Sprint Report
```bash
/nxtg-export pdf --executive
```
Share with stakeholders showing progress.

### 2. Knowledge Transfer
```bash
/nxtg-export markdown --include-code
```
Document for team members or future developers.

### 3. Backup Before Major Changes
```bash
/nxtg-checkpoint "pre-refactor" --export json
```
Safety net for risky operations.

### 4. Client Deliverable
```bash
/nxtg-export pdf --include-code --executive
```
Professional handoff documentation.

### 5. Personal Archive
```bash
/nxtg-export json --compress
```
Long-term archival in minimal space.

## See Also

- `/nxtg-checkpoint` - Create named checkpoints
- `/nxtg-status` - View current state
- `/nxtg-report` - Session summary
- `/nxtg-compact` - Optimize before export

---

**Make knowledge sharing effortless and beautiful.**
