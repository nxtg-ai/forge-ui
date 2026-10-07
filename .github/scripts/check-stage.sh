#!/usr/bin/env bash
# Release-stage consistency check (DIRECTIVE-NXTG-20261007-11).
# STAGE at the repo root is the ONE constant. Every surface below must state
# the same stage and must not state a different one. Exit 1 on any mismatch.
set -uo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

STAGES='internal|dogfood|alpha|beta|rc|ga'
fail=0; checked=0
ok()  { checked=$((checked+1)); echo "  ok   $1"; }
bad() { checked=$((checked+1)); fail=$((fail+1)); echo "  RED  $1"; }

[ -f STAGE ] || { echo "RED: STAGE file missing"; exit 1; }
[ "$(wc -l < STAGE)" -le 1 ] || { echo "RED: STAGE must be a single line"; exit 1; }
S=$(cat STAGE)
S=${S%$'\n'}
if ! [[ "$S" =~ ^($STAGES)$ ]]; then
  echo "RED: STAGE must be exactly one of {${STAGES//|/,}}, got '$S'"; exit 1
fi
echo "STAGE = $S"

# has <file> <fixed-string> <label>
has() { if tr -d '\r' < "$1" | grep -qF -- "$2"; then ok "$3"; else bad "$3 (missing: $2)"; fi; }
# none_other <file> <ERE with STAGE_ALT placeholder> <label>
none_other() {
  local others re hits
  others=$(echo "$STAGES" | tr '|' '\n' | grep -vx "$S" | paste -sd'|')
  re=${2//STAGE_ALT/($others)}
  hits=$(tr -d '\r' < "$1" | grep -nE -- "$re" || true)
  if [ -z "$hits" ]; then ok "$3"; else bad "$3: $hits"; fi
}

README=README.md
has        "$README" "img.shields.io/badge/stage-$S-grey" "README badge = stage-$S"
none_other "$README" 'badge/stage-STAGE_ALT-'              "README has no other stage badge"
has        "$README" "**Stage: $S.**"                       "README stage line"
none_other "$README" '\*\*Stage: STAGE_ALT\.\*\*'          "README has no other stage line"

if head -n 5 CHANGELOG.md | tr -d '\r' | grep -qxF "Stage: $S (see STAGE)"; then ok "CHANGELOG top line"; else bad "CHANGELOG top line (want 'Stage: $S (see STAGE)' in first 5 lines)"; fi
none_other CHANGELOG.md '^Stage: STAGE_ALT '                "CHANGELOG has no other stage line"

# The constant the app header and /api/health render.
CONST=src/services/app-stage.ts
has        "$CONST" "export const APP_STAGE: ReleaseStage = \"$S\";" "app-stage.ts APP_STAGE = $S"
none_other "$CONST" 'APP_STAGE: ReleaseStage = "STAGE_ALT"'        "app-stage.ts states no other stage"
has        src/server/routes/forge.ts            "stage: APP_STAGE,"   "/api/health stage comes from APP_STAGE"
has        src/components/layout/AppHeader.tsx   "stage: {APP_STAGE}"  "app header badge comes from APP_STAGE"

echo "stage-check: $fail red over $checked checked"
[ "$fail" -eq 0 ]
