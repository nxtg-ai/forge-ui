---
event: PreToolUse
tools: ["Bash"]
when: Attempting git commit
---

Before committing code, ensure quality standards are met:

## Validation Checks

1. **Code Quality**
   - Linting passes
   - No console.log statements
   - No commented code
   - No TODO without issue number

2. **Tests**
   - All tests passing
   - Coverage maintained
   - No skipped tests

3. **Security**
   - No hardcoded secrets
   - No vulnerable dependencies
   - Input validation present

4. **Documentation**
   - README updated if needed
   - API docs current
   - Comments for complex logic

Only commit code you'd be proud to show.