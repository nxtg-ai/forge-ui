#!/usr/bin/env bash
# Print the CHANGELOG.md section for one version, to use as the GitHub release body.
# The release notes are the CHANGELOG section, not a git log (forge-pm, DIRECTIVE-NXTG-20261105-02).
# Usage: release-notes.sh <version> [changelog]   e.g. release-notes.sh 3.5.4
# Exits 1, printing nothing to stdout, if the section is missing or empty.
set -euo pipefail
VERSION="${1:?usage: release-notes.sh <version> [changelog]}"
FILE="${2:-CHANGELOG.md}"
# awk reads the file itself, with no pipe in front of it. It stops at the next heading; a writer
# piped into it could die of SIGPIPE (exit 141 under pipefail) when it had not finished writing.
notes=$(awk -v v="$VERSION" '
  { gsub(/\r/, "") }
  index($0, "## [" v "]") == 1 { f = 1; next }
  f && /^## \[/ { exit }
  f { print }
' "$FILE")
# Trim leading and trailing blank lines.
notes=$(printf '%s\n' "$notes" | sed -e '/./,$!d' | sed -e ':a' -e '/^\n*$/{$d;N;ba' -e '}')
if [ -z "${notes//[[:space:]]/}" ]; then
  echo "release-notes: no CHANGELOG section for [$VERSION] in $FILE" >&2
  exit 1
fi
printf '%s\n' "$notes"
