---
event: PreToolUse
tools: ["Bash"]
when: Before deployment or release
---

Enforce quality gates before critical operations:

## Quality Criteria

All must pass:
- [ ] Test coverage > 80%
- [ ] No critical security issues
- [ ] Performance benchmarks met
- [ ] Documentation complete
- [ ] Code review approved
- [ ] No unresolved TODOs

## Automated Checks

1. Run full test suite
2. Security vulnerability scan
3. Performance profiling
4. Documentation validation
5. Dependency audit

## Failure Handling

If quality gates fail:
1. Block the operation
2. Generate detailed report
3. Suggest remediation steps
4. Notify relevant parties

Quality is non-negotiable.