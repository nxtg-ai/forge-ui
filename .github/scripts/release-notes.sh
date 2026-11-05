#!/usr/bin/env bash
# Print the CHANGELOG.md section for one version, to use as the GitHub release body.
# The release notes are the CHANGELOG section, not a git log (forge-pm, DIRECTIVE-NXTG-20261105-02).
# Usage: release-notes.sh <version> [changelog]   e.g. release-notes.sh 3.5.4
# Exits 1, printing nothing to stdout, if the section is missing or empty.
set -euo pipefail
VERSION="${1:?usage: release-notes.sh <version> [changelog]}"
FILE="${2:-CHANGELOG.md}"
notes=$(tr -d '\r' < "$FILE" | awk -v v="$VERSION" '
  index($0, "## [" v "]") == 1 { f = 1; next }
  f && /^## \[/ { exit }
  f { print }
')
# Trim leading and trailing blank lines.
notes=$(printf '%s\n' "$notes" | sed -e '/./,$!d' | sed -e ':a' -e '/^\n*$/{$d;N;ba' -e '}')
if [ -z "${notes//[[:space:]]/}" ]; then
  echo "release-notes: no CHANGELOG section for [$VERSION] in $FILE" >&2
  exit 1
fi
printf '%s\n' "$notes"
