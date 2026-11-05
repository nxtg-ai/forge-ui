// @vitest-environment node
/**
 * CHANGELOG.md must use LF line endings. It had CRLF (698 lines at v3.5.6),
 * which the release-notes and stage-check scripts had to strip (forge-pm
 * al:cc9b713cd3814202). .gitattributes now pins it to LF.
 */
import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import * as path from "node:path";

const ROOT = path.resolve(__dirname, "../../..");

describe("CHANGELOG.md line endings", () => {
  it("is LF in the index", () => {
    const out = execFileSync("git", ["ls-files", "--eol", "--", "CHANGELOG.md"], {
      cwd: ROOT,
      encoding: "utf-8",
    });
    expect(out.split(/\s+/)[0]).toBe("i/lf");
  });

  it(".gitattributes pins CHANGELOG.md to LF", () => {
    const out = execFileSync("git", ["check-attr", "eol", "--", "CHANGELOG.md"], {
      cwd: ROOT,
      encoding: "utf-8",
    });
    expect(out.trim()).toBe("CHANGELOG.md: eol: lf");
  });
});
