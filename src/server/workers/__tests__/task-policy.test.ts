/**
 * Worker task policy — no free-form commands over HTTP.
 * NEXUS: DIRECTIVE-NXTG-20261007-10 (GHSA-rc7c-r55p-923j, real finding #2).
 */
import { describe, it, expect } from "vitest";
import { assertSpawnAllowed, validateHttpTask } from "../task-policy";

describe("validateHttpTask", () => {
  it("rejects a free-form shell command", () => {
    expect(validateHttpTask({ type: "shell", command: "touch" })).toEqual({
      ok: false,
      error: "command for shell tasks must be one of: claude, codex, gemini",
    });
    expect(validateHttpTask({ type: "script", command: "/bin/sh" })).toMatchObject({ ok: false });
    expect(validateHttpTask({ type: "shell", command: "npm run build" })).toMatchObject({ ok: false });
  });

  it("rejects a path to an allow-listed name", () => {
    expect(validateHttpTask({ type: "shell", command: "/tmp/claude" })).toMatchObject({ ok: false });
    expect(validateHttpTask({ type: "shell", command: "./codex" })).toMatchObject({ ok: false });
  });

  it("rejects unknown task types", () => {
    expect(validateHttpTask({ type: "build", command: "npm run build" })).toEqual({
      ok: false,
      error: "type must be one of: claude-code, agent, shell, script",
    });
  });

  it("rejects env over HTTP", () => {
    expect(validateHttpTask({ type: "claude-code", command: "review", env: { NODE_OPTIONS: "--require /tmp/x" } })).toEqual({
      ok: false,
      error: "env is not accepted for tasks submitted over HTTP",
    });
  });

  it("rejects non-string args", () => {
    expect(validateHttpTask({ type: "shell", command: "claude", args: [1] })).toMatchObject({ ok: false });
  });

  it("accepts an agent prompt and an allow-listed CLI", () => {
    expect(validateHttpTask({ type: "claude-code", command: "Review src/ for bugs" })).toEqual({ ok: true });
    expect(validateHttpTask({ type: "agent", command: "Plan the release" })).toEqual({ ok: true });
    expect(validateHttpTask({ type: "shell", command: "codex", args: ["exec", "hello"] })).toEqual({ ok: true });
    expect(validateHttpTask({ type: "shell", command: "claude", env: {} })).toEqual({ ok: true });
  });
});

describe("assertSpawnAllowed", () => {
  it("throws for anything off the list", () => {
    expect(() => assertSpawnAllowed("sh")).toThrow(/not in the worker command allowlist/);
    expect(() => assertSpawnAllowed("claude; id")).toThrow(/not in the worker command allowlist/);
  });

  it("allows the agent CLIs", () => {
    expect(() => assertSpawnAllowed("claude")).not.toThrow();
    expect(() => assertSpawnAllowed("gemini")).not.toThrow();
  });
});
