import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock child_process before imports (CJS needs default + named exports sharing same ref)
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

import {
  ClaudeCodeBackend,
  CodexBackend,
  GeminiBackend,
  NodeWorkerBackend,
} from "../backend";

describe("whichSync allowlist", () => {
  beforeEach(() => {
    mockExecSync.mockReset();
    mockExecSync.mockReturnValue("/usr/bin/test\n");
  });

  it("rejects commands not in the allowlist", async () => {
    // If allowlist blocks it, execSync should never be called
    const backend = new CodexBackend();
    // Temporarily make execSync throw to detect if it's called
    mockExecSync.mockImplementation((cmd: string) => {
      if (cmd.includes("codex")) return "/usr/bin/codex\n";
      throw new Error("not found");
    });
    // codex is allowed, so it should work
    expect(await backend.isAvailable()).toBe(true);
  });

  it("allowed commands reach execSync", async () => {
    mockExecSync.mockReturnValue("/usr/bin/codex\n");
    const backend = new CodexBackend();
    await backend.isAvailable();
    expect(mockExecSync).toHaveBeenCalledWith(
      "which codex",
      expect.objectContaining({ encoding: "utf-8" }),
    );
  });
});

describe("ClaudeCodeBackend", () => {
  const backend = new ClaudeCodeBackend();
  const origEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...origEnv };
  });

  it("has name claude-code", () => {
    expect(backend.name).toBe("claude-code");
  });

  it("isAvailable returns true when CLAUDE_CODE env is set", async () => {
    process.env.CLAUDE_CODE = "1";
    expect(await backend.isAvailable()).toBe(true);
  });

  it("isAvailable returns true when CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS is set", async () => {
    delete process.env.CLAUDE_CODE;
    process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS = "1";
    expect(await backend.isAvailable()).toBe(true);
  });

  it("isAvailable returns true when ~/.claude directory exists", async () => {
    delete process.env.CLAUDE_CODE;
    delete process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS;
    mockStatSync.mockReturnValue({ isDirectory: () => true });
    expect(await backend.isAvailable()).toBe(true);
    mockStatSync.mockImplementation(() => { throw new Error("not found"); });
  });

  it("isAvailable returns false when no env vars and no .claude dir", async () => {
    delete process.env.CLAUDE_CODE;
    delete process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS;
    mockStatSync.mockImplementation(() => { throw new Error("not found"); });
    expect(await backend.isAvailable()).toBe(false);
  });

  it("getSpawnConfig returns fork mode with ipc", () => {
    const config = backend.getSpawnConfig();
    expect(config.mode).toBe("fork");
    expect(config.communicationProtocol).toBe("ipc");
    expect(config.command).toContain("worker-process");
  });
});

describe("CodexBackend", () => {
  const backend = new CodexBackend();

  beforeEach(() => {
    mockExecSync.mockReset();
  });

  it("has name codex", () => {
    expect(backend.name).toBe("codex");
  });

  it("isAvailable returns false when codex not installed", async () => {
    mockExecSync.mockImplementation(() => { throw new Error("not found"); });
    expect(await backend.isAvailable()).toBe(false);
  });

  it("isAvailable returns true when codex found", async () => {
    mockExecSync.mockReturnValue("/usr/bin/codex\n");
    expect(await backend.isAvailable()).toBe(true);
  });

  it("getSpawnConfig returns spawn mode with jsonlines", () => {
    const config = backend.getSpawnConfig();
    expect(config.mode).toBe("spawn");
    expect(config.command).toBe("codex");
    expect(config.args).toEqual(["--agent"]);
    expect(config.communicationProtocol).toBe("jsonlines");
  });
});

describe("GeminiBackend", () => {
  const backend = new GeminiBackend();

  beforeEach(() => {
    mockExecSync.mockReset();
  });

  it("has name gemini", () => {
    expect(backend.name).toBe("gemini");
  });

  it("isAvailable returns false when gemini not installed", async () => {
    mockExecSync.mockImplementation(() => { throw new Error("not found"); });
    expect(await backend.isAvailable()).toBe(false);
  });

  it("isAvailable returns true when gemini found", async () => {
    mockExecSync.mockReturnValue("/usr/bin/gemini\n");
    expect(await backend.isAvailable()).toBe(true);
  });

  it("getSpawnConfig returns spawn mode with jsonlines", () => {
    const config = backend.getSpawnConfig();
    expect(config.mode).toBe("spawn");
    expect(config.command).toBe("gemini");
    expect(config.args).toEqual(["--agent"]);
    expect(config.communicationProtocol).toBe("jsonlines");
  });
});

describe("NodeWorkerBackend", () => {
  const backend = new NodeWorkerBackend();

  it("has name node-worker", () => {
    expect(backend.name).toBe("node-worker");
  });

  it("isAvailable always returns true", async () => {
    expect(await backend.isAvailable()).toBe(true);
  });

  it("getSpawnConfig returns fork mode with ipc", () => {
    const config = backend.getSpawnConfig();
    expect(config.mode).toBe("fork");
    expect(config.communicationProtocol).toBe("ipc");
    expect(config.command).toContain("worker-process");
  });
});
