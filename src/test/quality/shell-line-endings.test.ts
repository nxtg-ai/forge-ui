// @vitest-environment node
/**
 * Tracked shell scripts must use LF line endings. With CRLF, bash reads the carriage return as part
 * of each command and the script fails on its first line ("$'\r': command not found").
 *
 * NEXUS: DIRECTIVE-NXTG-20261105-02 (forge-pm al:810e98d55ce4e857). init.sh (`npm run init`),
 * scripts/testing/check-testids.sh, scripts/start-integrated.sh and test-governance-websocket.sh were
 * committed with CRLF. .gitattributes now pins *.sh to LF.
 */
import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import * as path from "node:path";

const ROOT = path.resolve(__dirname, "../../..");

describe("shell script line endings", () => {
  it("every tracked .sh file is LF in the index", () => {
    const out = execFileSync("git", ["ls-files", "--eol", "--", "*.sh"], { cwd: ROOT, encoding: "utf-8" });
    const crlf = out
      .split("\n")
      .filter((line) => line.startsWith("i/crlf") || line.startsWith("i/mixed"))
      .map((line) => line.split("\t").pop());
    expect(crlf).toEqual([]);
  });

  it(".gitattributes pins *.sh to LF", () => {
    const out = execFileSync("git", ["check-attr", "eol", "--", "init.sh"], { cwd: ROOT, encoding: "utf-8" });
    expect(out.trim()).toBe("init.sh: eol: lf");
  });
});
