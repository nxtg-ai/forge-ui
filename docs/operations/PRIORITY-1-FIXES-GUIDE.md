# Priority 1 Fixes Guide - Documentation Completeness

**Status:** Critical items blocking open-source release
**Effort:** 3-4 hours total
**Target Completion:** Before release

---

## Overview

Two Priority 1 items must be completed before NXTG-Forge can be released as open-source:

1. **Complete REST API Documentation** (~2 hours)
2. **Update GETTING-STARTED.md** (~1.5 hours)

This guide provides step-by-step instructions for completing both.

---

## Priority 1.1: Complete REST API Documentation

### Current State

**File:** `/home/axw/projects/NXTG-Forge/v3/docs/api/RUNSPACE-API.md`

**Currently Documented:** 60%
- ✅ POST /api/runspaces (Create)
- ✅ GET /api/runspaces (List)
- ✅ GET /api/runspaces/:id (Get single)
- ✅ PATCH /api/runspaces/:id (Update)
- ✅ DELETE /api/runspaces/:id (Delete)

**Missing Endpoints:** 8+
- ❌ GET /api/health (Health check)
- ❌ POST /api/init (Project initialization)
- ❌ GET /api/init/status (Init status)
- ❌ POST /api/agents/task (Task submission)
- ❌ GET /api/agents/status (Agent status)
- ❌ POST /api/memory/store (Memory operations)
- ❌ GET /api/governance/state (Governance state)
- ❌ GET /api/workers/status (Worker pool status)
- ❌ WebSocket routes (terminal, ws)

### Step 1: Audit Actual Endpoints

Open `/home/axw/projects/NXTG-Forge/v3/src/server/api-server.ts` and search for all route handlers:

**Command:**
```bash
grep -n "app\.\(get\|post\|put\|delete\|patch\|ws\)" /home/axw/projects/NXTG-Forge/v3/src/server/api-server.ts
```

**Record each endpoint:**
1. HTTP method (GET, POST, PUT, PATCH, DELETE, WebSocket)
2. Route path
3. Request parameters (query, body, path)
4. Response format
5. Error cases
6. Curl examples

### Step 2: Extract Documentation from Code

For each endpoint, read the implementation to understand:

**Example: Health endpoint**
```typescript
// In api-server.ts, search for app.get('/health') or similar
app.get('/api/health', async (req, res) => {
  // What data is returned?
  // What checks are performed?
  // How long does it take?
  res.json({ status: 'ok', uptime: process.uptime(), ... });
});
```

Extract:
- Request format
- Response format
- Error conditions
- Authentication required?
- Rate limiting?

### Step 3: Write Endpoint Documentation

Follow the format of existing endpoints in `RUNSPACE-API.md`.

**Template:**
```markdown
### N. Endpoint Name

**METHOD** `/api/path`

Description of what this endpoint does.

**Request:**
- Path parameters: `id` (string) - Description
- Query parameters: `filter` (string, optional) - Description
- Body:
  ```json
  {
    "field": "description"
  }
  ```

**Response (200 OK):**
```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2026-02-05T10:00:00Z"
}
```

**Error Responses:**
- **400 Bad Request** - Invalid input
- **401 Unauthorized** - Authentication required
- **500 Internal Server Error** - Unexpected error

**Example:**
```bash
curl -X POST http://localhost:5051/api/endpoint \
  -H "Content-Type: application/json" \
  -d '{"field": "value"}'
```

**WebSocket Event:** (if applicable)
```
endpoint.event_name
```
```

### Step 4: Verify with Curl Examples

Test each documented endpoint:

```bash
# Health check
curl http://localhost:5051/api/health

# Create runspace (already documented)
curl -X POST http://localhost:5051/api/runspaces \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test-project",
    "displayName": "Test Project",
    "path": "/home/user/test",
    "backendType": "wsl"
  }'

# List runspaces
curl http://localhost:5051/api/runspaces
```

### Step 5: Update OpenAPI Specification

**File:** `/home/axw/projects/NXTG-Forge/v3/docs/api/openapi.yaml`

Add/update endpoint definitions:

```yaml
paths:
  /api/health:
    get:
      summary: Health Check
      description: Returns server health status
      responses:
        '200':
          description: Server is healthy
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                  uptime:
                    type: number

  /api/init:
    post:
      summary: Initialize Project
      description: Initialize Forge in a project
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/InitRequest'
      responses:
        '200':
          description: Project initialized
```

### Step 6: Verify Links

Ensure all documentation links work:

- ✅ RUNSPACE-API.md referenced in README.md
- ✅ WEBSOCKET.md referenced in README.md
- ✅ All curl examples point to correct URLs
- ✅ Cross-links between API docs work

### Testing Your Work

**Before submitting, verify:**

1. All 8+ missing endpoints documented
2. Each endpoint has curl example
3. All error codes documented
4. OpenAPI spec is valid

```bash
# Validate OpenAPI spec (if you have swagger-cli)
swagger-cli validate docs/api/openapi.yaml

# Or just check it's valid YAML
npm install -g swagger-cli
swagger-cli validate docs/api/openapi.yaml
```

---

## Priority 1.2: Update GETTING-STARTED.md

### Current State

**File:** `/home/axw/projects/NXTG-Forge/v3/docs/GETTING-STARTED.md`

**Issues:**
1. ❌ Outdated command names (/nxtg-* instead of /[FRG]-*)
2. ❌ Only mentions 2 agents (real system has 22)
3. ❌ No multi-project/Runspace information
4. ❌ Doesn't mention key features (engagement modes, marketplace, etc.)
5. ❌ Examples don't match current implementation

**Status:** Needs complete rewrite

### Step 1: Review Current Document

Read what's currently in GETTING-STARTED.md:
- What's accurate? Keep it.
- What's outdated? Replace it.
- What's missing? Add it.

### Step 2: Rewrite Section by Section

#### Section: Installation

**Current:**
```bash
./nxtg-init.sh
npm install
```

**Should be:**
```bash
# Clone repository
git clone https://github.com/nxtg-ai/forge.git
cd forge/v3

# Install dependencies
npm install

# Start development
npm run dev
```

#### Section: Quick Start Command

**Current:**
```bash
/nxtg-init
```

**Should be:**
```bash
# Initialize Forge in your project
/[FRG]-init

# Check status
/[FRG]-status

# Build a feature
/[FRG]-feature "Add user authentication"
```

#### Section: Understanding Agents

**Current:**
```markdown
NXTG Forge uses two primary agents:
- Orchestrator
- Architect
```

**Should be:**
```markdown
NXTG-Forge uses a **22-agent ecosystem** for specialized work:

### Core Agents (6)
- [AFRG]-orchestrator - Master coordinator
- [AFRG]-planner - Strategic planning
- [AFRG]-builder - Implementation
- [AFRG]-detective - Problem solving
- [AFRG]-guardian - Quality assurance
- [AFRG]-release-sentinel - Documentation

### Specialist Agents (16)
Testing, security, database, API, UI, DevOps, documentation, and more.

See: docs/agents/README.md for complete list and capabilities.
```

#### Section: Multi-Project Management (NEW)

**Add new section:**
```markdown
## Multi-Project Management

One of NXTG-Forge's most powerful features is working on multiple projects simultaneously.

### Create a New Project

```bash
# In Forge UI, click "New Project" or use the API
POST /api/runspaces
{
  "name": "project-name",
  "displayName": "Project Display Name",
  "path": "/path/to/project"
}
```

### Switch Between Projects

The UI shows a project switcher in the top header. Click to switch between any of your projects.

Each project gets:
- Independent terminal session
- Isolated agent context
- Separate vision/goals
- Own configuration

### Share Terminal Across Devices

Within a project's terminal:
1. Click "Share" button
2. Scan QR code with mobile device
3. Or copy session link

Session persists across browser refreshes and network disconnections.
```

#### Section: Engagement Modes (NEW)

**Add new section:**
```markdown
## Engagement Modes

Control how much detail you want to see. Switch via the top header.

| Mode | Best For | Details |
|------|----------|---------|
| CEO | Executive overview | Health + blockers only |
| VP | Strategic guidance | Recent decisions + top issues |
| Engineer | Development work | Full technical details |
| Builder | Implementation | All agent activity visible |
| Founder | Complete control | Everything, no filters |
```

#### Section: Key Features

**Add section explaining:**
- Session persistence (sessions survive browser close)
- Multi-device access
- 22-agent coordination
- Engagement mode filtering
- Infinity Terminal with Zellij (optional)
- Governance HUD
- Agent marketplace

#### Section: Next Steps

**Should include:**
```markdown
## What's Next?

1. **Explore the Dashboard** - See your project health and agent activity
2. **Review Best Practices** - See docs/best-practices/README.md
3. **Contributing** - Read CONTRIBUTING.md to get involved
4. **Advanced Features** - Check docs/features/ for multi-project examples
5. **API Integration** - See docs/api/ for REST/WebSocket endpoints
```

### Step 3: Verify All Examples

For each code example, verify it works:

```bash
# Test actual commands from doc
npm run dev

# Verify API endpoints mentioned exist
curl http://localhost:5051/api/health

# Check if mentioned files exist
ls docs/agents/README.md
ls docs/best-practices/README.md
```

### Step 4: Update Links

Ensure all links in GETTING-STARTED.md point to real files:

- ✅ [CONTRIBUTING.md](../CONTRIBUTING.md)
- ✅ [Agent Documentation](../docs/agents/README.md)
- ✅ [Best Practices](../docs/best-practices/README.md)
- ✅ [API Reference](../docs/api/README.md)
- ✅ [Multi-Project Guide](../docs/features/multi-project/README.md)

### Step 5: Test Navigation

A new user should be able to:
1. Follow installation steps successfully
2. Run `npm run dev` and see UI at localhost:5050
3. Understand how to create a project
4. Know how to switch between projects
5. Know where to find more information

---

## Step-by-Step Implementation Plan

### Week 1: Complete Both Priority 1 Items

**Day 1-2: REST API Documentation**
- [ ] Audit all endpoints in api-server.ts (2 hours)
- [ ] Write missing endpoint docs (1.5 hours)
- [ ] Verify with curl examples (30 min)
- [ ] Update OpenAPI spec (1 hour)

**Day 3-4: GETTING-STARTED.md Rewrite**
- [ ] Review and backup current version (30 min)
- [ ] Rewrite installation section (30 min)
- [ ] Update command examples (45 min)
- [ ] Add agent section (1 hour)
- [ ] Add multi-project section (1 hour)
- [ ] Add engagement modes section (30 min)
- [ ] Verify all links and examples (1 hour)
- [ ] Test with actual dev environment (1 hour)

**Day 5: Review & Polish**
- [ ] Review audit report for remaining issues
- [ ] Fix any broken links
- [ ] Test curl examples one more time
- [ ] Verify markdown formatting

### Total Effort: 3-4 hours

---

## Success Criteria

### REST API Documentation

- [ ] All endpoints documented (at least 8 new ones)
- [ ] Each endpoint has:
  - [ ] Clear description
  - [ ] Request format (method, path, params, body)
  - [ ] Response format (success + errors)
  - [ ] Working curl example
- [ ] OpenAPI spec updated and valid
- [ ] Links updated in README.md
- [ ] No broken references

### GETTING-STARTED.md

- [ ] All command examples use `/[FRG]-` prefix (not `/nxtg-`)
- [ ] Mentions 22-agent ecosystem (not just 2 agents)
- [ ] Includes multi-project section with examples
- [ ] Explains engagement modes
- [ ] Highlights session persistence feature
- [ ] All links work and point to real files
- [ ] Examples match current implementation
- [ ] New user can follow successfully

---

## Common Mistakes to Avoid

### REST API Documentation

❌ **Don't:**
- Leave endpoints undocumented
- Use outdated response formats
- Forget error cases
- Skip curl examples
- Reference non-existent paths

✅ **Do:**
- Document every endpoint thoroughly
- Use real response examples from code
- Include all error codes
- Provide working curl examples
- Match actual implementation

### GETTING-STARTED.md

❌ **Don't:**
- Keep old command names
- Oversimplify agent system
- Omit multi-project info
- Include misleading examples
- Break existing links

✅ **Do:**
- Use current command names
- Explain all 22 agents
- Show multi-project examples
- Test all examples
- Update all links

---

## Resources

### For REST API Work

1. **Source Code:**
   - `/src/server/api-server.ts` - Main endpoint definitions
   - `/src/server/routes/` - Route handlers
   - `/src/server/agent-router.ts` - Agent endpoints
   - `/src/server/workers/` - Worker pool endpoints

2. **Reference Documentation:**
   - `/docs/api/RUNSPACE-API.md` - Example format
   - `/docs/api/WEBSOCKET.md` - WebSocket patterns

3. **Testing:**
   - `npm run dev` - Start servers
   - `curl` - Test endpoints
   - Browser DevTools Network tab

### For GETTING-STARTED.md

1. **Reference Files:**
   - `/README.md` - Main marketing
   - `/CONTRIBUTING.md` - Contribution guide
   - `/docs/agents/README.md` - Agent details
   - `/docs/features/multi-project/` - Multi-project docs

2. **Example Files:**
   - `/docs/guides/QUICK-START.md` - Similar guide
   - `/docs/guides/TESTING-GUIDE.md` - Test examples

3. **Verification:**
   - `npm run dev` - Test commands
   - Browser at localhost:5050 - Visual check
   - Run actual `/[FRG]-` commands in Claude

---

## Questions?

If unclear on any section:

1. **Check the audit report:** `DOCUMENTATION-COMPLETENESS-AUDIT-2026-02-05.md`
2. **Review the code:** `/src/server/api-server.ts` is the source of truth
3. **Read existing docs:** `/docs/api/RUNSPACE-API.md` shows the format
4. **Test in dev environment:** `npm run dev` and try the endpoints

---

**Target Completion:** Before open-source release
**Effort:** 3-4 hours
**Impact:** Critical for new user success
**Status:** Ready to implement
