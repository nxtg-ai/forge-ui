/**
 * Memory API Routes
 * Serves memory seed data for browser localStorage
 */

import express from 'express';

const router = express.Router();

const seedMemoryItems = [
  {
    id: crypto.randomUUID(),
    content: "Dog-Food or Die: Use Claude Code's native capabilities (agents, hooks, commands, skills). DON'T build TypeScript meta-services when agents can do the work.",
    tags: ["critical", "dog-food", "week-1"],
    category: "instruction",
    created: new Date("2026-01-28").toISOString(),
    updated: new Date("2026-01-28").toISOString()
  },
  {
    id: crypto.randomUUID(),
    content: "TypeScript IS appropriate for UI abstractions (state-bridge, terminal components). NOT appropriate for meta-orchestration services (plan-executor, builder-service).",
    tags: ["typescript", "architecture", "ui"],
    category: "learning",
    created: new Date("2026-01-29").toISOString(),
    updated: new Date("2026-01-29").toISOString()
  },
  {
    id: crypto.randomUUID(),
    content: "Run agents in PARALLEL (up to 20) using multiple Task tool calls in a SINGLE message. Maximizes throughput.",
    tags: ["agents", "performance", "parallel"],
    category: "instruction",
    created: new Date("2026-01-29").toISOString(),
    updated: new Date("2026-01-29").toISOString()
  },
  {
    id: crypto.randomUUID(),
    content: "QA agents must see REAL web logs from running servers. No mocked testing data. Real integration tests only.",
    tags: ["testing", "qa", "real-logs"],
    category: "instruction",
    created: new Date("2026-01-29").toISOString(),
    updated: new Date("2026-01-29").toISOString()
  },
  {
    id: crypto.randomUUID(),
    content: "CEO-LOOP makes decision → EXECUTE immediately. Don't ask for additional permission unless CRITICAL (Impact: CRITICAL + Risk: CRITICAL).",
    tags: ["ceo-loop", "autonomous", "execution"],
    category: "decision",
    created: new Date("2026-01-28").toISOString(),
    updated: new Date("2026-01-28").toISOString()
  },
  {
    id: crypto.randomUUID(),
    content: "Week 1 COMPLETE: 5 critical gaps closed (approval queue, planner agent, CEO-LOOP validation, checkpoints, memory widgets). Foundation for autonomous operation established.",
    tags: ["week-1", "milestone", "complete"],
    category: "context",
    created: new Date("2026-01-29").toISOString(),
    updated: new Date("2026-01-29").toISOString()
  },
  {
    id: crypto.randomUUID(),
    content: "OOM crash at 4GB heap during CEO-LOOP invocation. Solution: Increase NODE_OPTIONS to 8GB + use focused, lightweight operations.",
    tags: ["incident", "memory", "learned"],
    category: "learning",
    created: new Date("2026-01-29").toISOString(),
    updated: new Date("2026-01-29").toISOString()
  }
];

// GET /api/memory/seed - Get seed data
router.get('/seed', (_req, res) => {
  res.json({
    success: true,
    items: seedMemoryItems,
    count: seedMemoryItems.length
  });
});

export default router;
