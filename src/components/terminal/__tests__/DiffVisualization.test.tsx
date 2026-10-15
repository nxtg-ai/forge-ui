/**
 * The diff viewer must not say a file is applied: /api/diffs/apply changes no
 * file. NEXUS: PRM-CLX9-20261015-06 item (b) (Codex review of #74).
 */
import { describe, it, expect } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { DiffVisualization } from "../DiffVisualization";

function showDiff(): void {
  act(() => {
    window.dispatchEvent(
      new CustomEvent("claude-diff", {
        detail: {
          filePath: "src/a.ts",
          language: "typescript",
          oldContent: "a",
          newContent: "b",
          changes: [{ lineNumber: 1, type: "modified", oldLine: "a", newLine: "b" }],
        },
      }),
    );
  });
}

describe("DiffVisualization wording", () => {
  it("offers Accept, says no file changes, and never says Apply", () => {
    render(<DiffVisualization />);
    showDiff();

    expect(screen.getByRole("button", { name: /accept/i })).toBeInTheDocument();
    expect(screen.getByText(/does not change the file/i)).toBeInTheDocument();
    expect(screen.queryByText(/apply/i)).toBeNull();
  });
});
