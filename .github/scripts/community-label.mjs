#!/usr/bin/env node
// Print the numbers of open issues and PRs that need the `community` label.
//
// The stale bot (.github/workflows/stale.yml) must never close an outside author's issue or PR, so
// it exempts the `community` label. This picks who gets that label: every author whose
// author_association is not OWNER, MEMBER or COLLABORATOR, except bots, and only where the label is
// not already there.
//
// Input: one JSON object per line, as `gh api --jq` prints it from the issues API:
//   {"number": 1, "author_association": "NONE", "user_type": "User", "labels": ["bug"]}
// Usage: node .github/scripts/community-label.mjs <file.jsonl>
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const INSIDE = new Set(["OWNER", "MEMBER", "COLLABORATOR"]);

export function needsCommunityLabel(item) {
  return (
    !INSIDE.has(item.author_association) &&
    item.user_type !== "Bot" &&
    !(item.labels ?? []).includes("community")
  );
}

export function numbersToLabel(jsonl) {
  return jsonl
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line))
    .filter(needsCommunityLabel)
    .map((item) => item.number);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  for (const n of numbersToLabel(fs.readFileSync(process.argv[2], "utf-8"))) console.log(n);
}
