import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock child_process (CJS needs default + named exports sharing same ref)
const mockExecSync = vi.hoisted(() => vi.fn());
vi.mock("child_process", () => ({
  execSync: mockExecSync,
  default: { execSync: mockExecSync },
}));

// Mock fs (CJS needs default + named exports)
const mockStatSync = vi.hoisted(() => vi.fn(() => { throw new Error("not found"); }));
vi.mock("fs", () => ({
  statSync: mockStatSync,
  default: { statSync: mockStatSync },
}));

import { detectBackend } from "../backend-detector";

describe("detectBackend", () => {
  const origEnv = { ...process.env };

  beforeEach(() => {
    mockExecSync.mockReset();
    // Default: nothing found
    mockExecSync.mockImplementation(() => { throw new Error("not found"); });
  });

  afterEach(() => {
    process.env = { ...origEnv };
  });

  it("returns NodeWorkerBackend as fallback", async () => {
    delete process.env.FORGE_BACKEND;
    delete process.env.CLAUDE_CODE;
    delete process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS;
    const backend = await detectBackend();
    expect(backend.name).toBe("node-worker");
  });

  it("respects FORGE_BACKEND=node-worker override", async () => {
    process.env.FORGE_BACKEND = "node-worker";
    const backend = await detectBackend();
    expect(backend.name).toBe("node-worker");
  });

  it("respects FORGE_BACKEND=codex override", async () => {
    process.env.FORGE_BACKEND = "codex";
    const backend = await detectBackend();
    expect(backend.name).toBe("codex");
  });

  it("respects FORGE_BACKEND=gemini override", async () => {
    process.env.FORGE_BACKEND = "gemini";
    const backend = await detectBackend();
    expect(backend.name).toBe("gemini");
  });

  it("detects Claude Code via CLAUDE_CODE env", async () => {
    delete process.env.FORGE_BACKEND;
    process.env.CLAUDE_CODE = "1";
    const backend = await detectBackend();
    expect(backend.name).toBe("claude-code");
  });

  it("FORGE_BACKEND overrides Claude Code detection", async () => {
    process.env.FORGE_BACKEND = "node-worker";
    process.env.CLAUDE_CODE = "1";
    const backend = await detectBackend();
    expect(backend.name).toBe("node-worker");
  });
});
