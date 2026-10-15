/**
 * Worker task policy — no free-form commands over HTTP.
 * NEXUS: DIRECTIVE-NXTG-20261007-10 (GHSA-rc7c-r55p-923j, real finding #2).
 */
import { describe, it, expect } from "vitest";
import { assertSpawnAllowed, assertTaskArgvAllowed, validateHttpTask } from "../task-policy";

const SHELL_ERROR = "shell and script tasks are not accepted over HTTP; submit a claude-code or agent task with a prompt";

describe("validateHttpTask", () => {
  // forge-pm al:1e8b0762ef802d95 (follow-up to PRM-CLX9-20261015-06 item c):
  // with args refused, a shell/script task over HTTP could only start a bare
  // CLI with no input, so those two types are refused over HTTP.
  it("refuses shell and script tasks, even with an allow-listed CLI and no args", () => {
    for (const type of ["shell", "script"]) {
      for (const command of ["claude", "codex", "gemini"]) {
        expect(validateHttpTask({ type, command })).toEqual({ ok: false, error: SHELL_ERROR });
      }
    }
  });

  it("rejects a free-form shell command", () => {
    expect(validateHttpTask({ type: "shell", command: "touch" })).toEqual({ ok: false, error: SHELL_ERROR });
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
    expect(validateHttpTask({ type: "claude-code", command: "review the diff", env: { NODE_OPTIONS: "--require /tmp/x" } })).toEqual({
      ok: false,
      error: "env is not accepted for tasks submitted over HTTP",
    });
  });

  it("rejects non-string args", () => {
    expect(validateHttpTask({ type: "claude-code", command: "Review the diff", args: [1] })).toMatchObject({ ok: false });
  });

  it("accepts an agent prompt and an allow-listed CLI", () => {
    expect(validateHttpTask({ type: "claude-code", command: "Review src/ for bugs" })).toEqual({ ok: true });
    expect(validateHttpTask({ type: "agent", command: "Plan the release" })).toEqual({ ok: true });
    expect(validateHttpTask({ type: "claude-code", command: "Review the diff", env: {} })).toEqual({ ok: true });
  });
});

// PRM-CLX9-20261015-06 item (c): the command was checked, its args were not.
// Every allow-listed CLI turns a flag into code execution (claude --settings
// hooks, codex -c / --dangerously-bypass-approvals-and-sandbox, gemini --yolo).
describe("validateHttpTask args", () => {
  const ARGS_ERROR = { ok: false, error: "args are not accepted for tasks submitted over HTTP" };

  it("rejects flags for an allow-listed CLI", () => {
    expect(
      validateHttpTask({ type: "agent", command: "Review the diff", args: ["--dangerously-bypass-approvals-and-sandbox", "exec", "x"] }),
    ).toEqual(ARGS_ERROR);
    expect(validateHttpTask({ type: "claude-code", command: "Review the diff", args: ["--yolo"] })).toEqual(ARGS_ERROR);
  });

  it("rejects extra args after an agent prompt", () => {
    expect(
      validateHttpTask({ type: "claude-code", command: "Review src/", args: ["--settings", '{"hooks":{}}'] }),
    ).toEqual(ARGS_ERROR);
    expect(validateHttpTask({ type: "agent", command: "Plan", args: ["--dangerously-skip-permissions"] })).toEqual(ARGS_ERROR);
  });

  it("rejects positional args too (subcommands such as mcp add)", () => {
    expect(validateHttpTask({ type: "claude-code", command: "Review the diff", args: ["mcp", "add", "x", "sh"] })).toEqual(ARGS_ERROR);
    expect(validateHttpTask({ type: "agent", command: "Review the diff", args: ["exec", "hello"] })).toEqual(ARGS_ERROR);
  });

  it("rejects an agent prompt that the CLI would read as a flag", () => {
    expect(validateHttpTask({ type: "claude-code", command: "--dangerously-skip-permissions" })).toEqual({
      ok: false,
      error: "the prompt for claude-code tasks must not start with \"-\"",
    });
    expect(validateHttpTask({ type: "agent", command: "-p" })).toMatchObject({ ok: false });
  });

  // Codex review of #75: `claude install` / `claude update` run those
  // subcommands, so a one-word prompt is refused.
  it("rejects a one-word prompt, which the CLI could read as a subcommand", () => {
    for (const word of ["install", "update", "doctor", "mcp", "  update\n"]) {
      expect(validateHttpTask({ type: "claude-code", command: word })).toEqual({
        ok: false,
        error: "the prompt for claude-code tasks must be more than one word",
      });
    }
    expect(validateHttpTask({ type: "agent", command: "logout" })).toMatchObject({ ok: false });
  });

  it("still accepts an empty args array", () => {
    expect(validateHttpTask({ type: "claude-code", command: "Review src/", args: [] })).toEqual({ ok: true });
  });
});

describe("assertTaskArgvAllowed (worker re-check)", () => {
  it("throws for shell tasks with any args", () => {
    expect(() => assertTaskArgvAllowed({ type: "shell", command: "codex", args: ["-c", "x"] })).toThrow(
      /args are not accepted/,
    );
  });

  it("throws for agent tasks with args or a flag-shaped prompt", () => {
    expect(() =>
      assertTaskArgvAllowed({ type: "claude-code", command: "hi", args: ["--settings", "{}"] }),
    ).toThrow(/args are not accepted/);
    expect(() => assertTaskArgvAllowed({ type: "agent", command: "--version" })).toThrow(/must not start with/);
    expect(() => assertTaskArgvAllowed({ type: "claude-code", command: "install" })).toThrow(/more than one word/);
  });

  it("allows a plain prompt and a bare CLI", () => {
    expect(() => assertTaskArgvAllowed({ type: "claude-code", command: "Review src/" })).not.toThrow();
    expect(() => assertTaskArgvAllowed({ type: "shell", command: "codex", args: [] })).not.toThrow();
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
