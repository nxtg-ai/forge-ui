# Getting Started with NXTG-Forge

**The 30-Second Guide**

```bash
# Clone and install
git clone https://github.com/nxtg-ai/nxtg-forge.git
cd nxtg-forge/v3
pip install -e .

# Use in your project
cd your-project
claude
```

Claude just got smarter. That's it.

> **Installation Note**: Package is currently installed from source. PyPI publication coming soon.

---

## What You'll Notice

After installing nxtg-forge, Claude Code handles complex requests differently:

### Before (Standard Claude)

```
You: "Create a REST API for a todo app"

Claude: "I can help with that. What framework would you like to use?"
You: "FastAPI"
Claude: "Great! Let me create the main.py file..."
[Creates one file]
You: "Now add database models"
Claude: [Creates models]
You: "Add CRUD endpoints"
... [Many exchanges back and forth]
```

### After (With nxtg-forge)

```
You: "Create a REST API for a todo app"

Claude: "I'll create a complete FastAPI todo API for you.

Architecture:
  • FastAPI with async/await
  • PostgreSQL database
  • SQLAlchemy ORM
  • Pydantic models for validation
  • Full CRUD operations
  • 100% test coverage

I'll create:
  1. Project structure
  2. Database models and migrations
  3. API endpoints (GET, POST, PUT, DELETE)
  4. Request/response schemas
  5. Unit and integration tests
  6. API documentation (auto-generated)
  7. Docker setup

Starting with the project structure..."

[10 minutes later]

"✅ Todo API complete!

  Created:
    • 15 files
    • 5 API endpoints
    • 32 tests (all passing)
    • Coverage: 100%
    • Docker compose setup

  Try it:
    $ docker-compose up
    $ open http://localhost:8000/docs

  What would you like to add next?"
```

**That's the difference.** One request → complete, tested, documented implementation.

---

## Real-World Scenarios

### Scenario 1: Feature Development

**Request**: "Add user authentication with JWT tokens"

**Claude delivers**:

- User model with password hashing
- Login/register endpoints
- JWT token generation and validation
- Protected route middleware
- Refresh token mechanism
- Password reset functionality
- Complete test suite
- Security best practices

**In one conversation.**

---

### Scenario 2: Code Refactoring

**Request**: "Refactor the entire auth module to use dependency injection"

**Claude delivers**:

- Analyzes current code structure
- Identifies all dependencies
- Creates container/provider pattern
- Refactors all auth services
- Updates all tests
- Verifies nothing breaks
- Documents the new pattern

**Without you managing the process.**

---

### Scenario 3: Integration Work

**Request**: "Integrate Stripe for payment processing"

**Claude delivers**:

- Stripe SDK setup
- Payment models and migrations
- Webhook handlers for events
- Customer and subscription management
- Error handling and retry logic
- Test suite with mocked Stripe API
- Admin dashboard for payments
- Documentation and examples

**Production-ready integration.**

---

## Interactive Sessions

### Interruption Recovery

Close your laptop mid-task? No problem.

```bash
# 3 hours later, different location
cd project
claude
```

```
Claude: "Welcome back! You were adding payment processing.

         Completed (3 hours ago):
           ✅ Stripe SDK integration
           ✅ Payment models
           ✅ Webhook endpoints

         Remaining:
           ☐ Customer management UI
           ☐ Subscription handling
           ☐ Admin dashboard

         Want to continue where you left off?"

You: "Yes"

Claude: "Resuming payment feature. Let me implement the customer management UI..."
```

**Zero context loss.** Claude knows exactly where you were.

---

## Advanced Usage (Optional)

### Customization

Want to tweak behavior? Edit `.claude/forge/config.yml`:

```yaml
# .claude/forge/config.yml
defaults:
  memory:
    enabled: true          # Session persistence
    persistence: session   # or 'permanent'

  agents:
    orchestration: true    # Multi-agent coordination
    max_parallel: 3        # Concurrent agents

  features:
    tdd_workflow: true     # Auto-run TDD cycles
    refactoring_bot: true  # Suggest refactorings
    analytics: true        # Track project health
```

**But 90% of users never touch this.** Defaults work great.

---

### Commands

New commands available after nxtg-forge:

```bash
/resume              # Resume interrupted work
/memory status       # View session memory
/memory clear        # Clear old sessions
```

---

## Troubleshooting

### "Not seeing any difference"

Nxtg-forge activates for complex tasks. Try:

```
"Create a REST API with authentication and database"
"Refactor all services to use dependency injection"
"Add comprehensive error handling across the app"
```

For simple tasks ("fix typo", "update README"), Claude uses standard behavior.

---

### "Want to disable it temporarily"

```bash
# Uninstall
pip uninstall nxtg-forge

# Or just rename the config
mv .claude/forge/config.yml .claude/forge/config.yml.disabled
```

---

## What's Happening Behind the Scenes?

*You don't need to know this, but if you're curious:*

When you make a complex request, Claude:

1. Analyzes your project structure
2. Creates a multi-step plan
3. Coordinates specialized agents for different parts
4. Implements everything with proper separation
5. Writes comprehensive tests
6. Documents the code
7. Returns the complete result

All automatically. You just see the result.

---

## The Point

You should **never have to think about nxtg-forge**.

Install it once. Use Claude Code normally. Notice Claude handles complex tasks better.

That's elegant software.

---

## Next Steps

- **Start using it**: `claude` in your project
- **Try complex requests**: See the difference
- **Customize if needed**: Edit `.claude/forge/config.yml`
- **Read advanced docs**: [docs/](docs/) if you want to dive deeper

But honestly? Just use it. You'll figure out the rest by doing.

---

**Questions?**

- **Docs**: [docs/](docs/)
- **Issues**: [GitHub Issues](https://github.com/nxtg-ai/nxtg-forge/issues)
- **Examples**: [EXAMPLES.md](EXAMPLES.md)

**Ready to see it in action?**

```bash
cd your-project
claude
You: "Create a complete REST API with auth, database, tests, and docs"
```

Watch what happens.
