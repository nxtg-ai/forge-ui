#!/usr/bin/env bash
# Release-stage consistency check (DIRECTIVE-NXTG-20261007-11; two axes since DIRECTIVE-NXTG-20261013-17).
# STAGE at the repo root is the ONE constant. It records the two registry fields
# (ASIF governance/product-maturity-registry.yml, row forge-ui), one per line:
#   distribution: internal|public
#   maturity: pre-alpha|dogfood|alpha|beta|rc|ga
# The displayed label is derived, never stored (release-stage skill §2):
#   public + pre-alpha|dogfood -> Public preview; public + alpha|beta|rc|ga -> Alpha|Beta|Release candidate|GA;
#   internal + anything -> no outward label (this repo is public, so internal is RED here).
# Every surface below must state the derived label and no other stage. Exit 1 on any mismatch.
set -uo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

fail=0; checked=0
ok()  { checked=$((checked+1)); echo "  ok   $1"; }
bad() { checked=$((checked+1)); fail=$((fail+1)); echo "  RED  $1"; }

[ -f STAGE ] || { echo "RED: STAGE file missing"; exit 1; }
field() { sed -n "s/^$1:[[:space:]]*//p" STAGE | tr -d '\r[:space:]'; }
DIST=$(field distribution); MAT=$(field maturity)
[[ "$DIST" =~ ^(internal|public)$ ]] || { echo "RED: STAGE distribution must be internal|public, got '$DIST'"; exit 1; }
[[ "$MAT" =~ ^(pre-alpha|dogfood|alpha|beta|rc|ga)$ ]] || { echo "RED: STAGE maturity must be pre-alpha|dogfood|alpha|beta|rc|ga, got '$MAT'"; exit 1; }
if [ "$DIST" = internal ]; then
  [[ "$MAT" =~ ^(alpha|beta|rc|ga)$ ]] && { echo "RED: maturity $MAT cannot be internal (alpha and above are offered outward)"; exit 1; }
  echo "RED: STAGE says internal, but this repo is public; an internal product shows no outward label"; exit 1
fi
case "$MAT" in
  pre-alpha|dogfood) L='Public preview' ;;
  alpha) L='Alpha' ;; beta) L='Beta' ;; rc) L='Release candidate' ;; ga) L='GA' ;;
esac
SLUG=$(echo "$L" | tr 'A-Z ' 'a-z_')     # badge path segment
echo "STAGE = distribution $DIST, maturity $MAT -> label '$L'"

# Every label form that is not this one, plus the retired single-axis words.
ALL='Public preview|Alpha|Beta|Release candidate|GA|internal|dogfood|rc|ga'
OTHERS=$(echo "$ALL" | tr '|' '\n' | grep -vxiF "$L" | paste -sd'|')
OTHER_SLUGS=$(echo "$OTHERS" | tr 'A-Z ' 'a-z_')

has()  { if tr -d '\r' < "$1" | grep -qF -- "$2"; then ok "$3"; else bad "$3 (missing: $2)"; fi; }
none() { local hits; hits=$(tr -d '\r' < "$1" | grep -niE -- "$2" || true); if [ -z "$hits" ]; then ok "$3"; else bad "$3: $hits"; fi; }

# STAGE must equal forge-ui's own registry row (dx3-pm, GoPMO 1.18.7.5.88). The registry
# lives in the private ASIF repo, so this runs where it is readable (FORGE_STAGE_REGISTRY or
# ~/ASIF) and is skipped, and says so, elsewhere (CI). Never derive STAGE from the forge row:
# that row is the plugin and orchestrator, which are alpha.
REG="${FORGE_STAGE_REGISTRY:-$HOME/ASIF/governance/product-maturity-registry.yml}"
if [ -f "$REG" ]; then
  row() { awk -v k="$1" '/^[[:space:]]*- id:[[:space:]]*/{r=($NF=="forge-ui")} r && $1==k":"{print $2; exit}' "$REG"; }
  RD=$(row distribution); RM=$(row maturity)
  if [ "$RD" = "$DIST" ] && [ "$RM" = "$MAT" ]; then ok "STAGE equals registry row forge-ui ($RD, $RM)"
  else bad "STAGE ($DIST, $MAT) differs from registry row forge-ui ('$RD', '$RM') in $REG"; fi
else
  echo "  skip registry row forge-ui: $REG not readable here"
fi

README=README.md
# README line 9 is the ruled stage text, byte for byte: the label check-stage derives plus
# FINAL B (EMMA-SOUL Dx3 cc950597, ASIF PR 426). Change it only with a new ruling.
FINAL_B="The Forge plugin and orchestrator are in alpha. This dashboard, forge-ui, was not part of the pre-registered core-job test behind that stage and is still a public preview."
if [ "$(sed -n 9p "$README" | tr -d '\r')" = "**Stage: $L.** $FINAL_B" ]; then ok "README line 9 is the ruled stage text"
else bad "README line 9 is not '**Stage: $L.** ' + FINAL B"; fi
# The install path clones the current release tag, so a release PR must move it with the version.
VER=$(sed -n 's/^[[:space:]]*"version":[[:space:]]*"\([^"]*\)".*/\1/p' package.json | head -1)
has  "$README" "git clone --branch v$VER https://github.com/nxtg-ai/forge-ui" "README clones the release tag v$VER"
has  "$README" "img.shields.io/badge/stage-$SLUG-"        "README badge = stage-$SLUG"
none "$README" "badge/stage-($OTHER_SLUGS)-"              "README has no other stage badge"
has  "$README" "**Stage: $L.**"                            "README stage line"
none "$README" "\*\*Stage: ($OTHERS)\.\*\*"                "README has no other stage line"
none "$README" "not yet offered or supported for outside use|internal use only" "README does not say a public product is not offered outward"

if head -n 5 CHANGELOG.md | tr -d '\r' | grep -qxF "Stage: $L (see STAGE)"; then ok "CHANGELOG top line"; else bad "CHANGELOG top line (want 'Stage: $L (see STAGE)' in first 5 lines)"; fi
none CHANGELOG.md "^Stage: ($OTHERS) "                     "CHANGELOG has no other stage line"

# The constants the app header and /api/health render.
CONST=src/services/app-stage.ts
has  "$CONST" "export const APP_DISTRIBUTION: Distribution = \"$DIST\";" "app-stage.ts APP_DISTRIBUTION = $DIST"
has  "$CONST" "export const APP_MATURITY: Maturity = \"$MAT\";"          "app-stage.ts APP_MATURITY = $MAT"
has  "$CONST" "export const APP_STAGE = stageLabel(APP_DISTRIBUTION, APP_MATURITY);" "app-stage.ts APP_STAGE is derived"
has  src/server/routes/forge.ts          "stage: APP_STAGE,"   "/api/health stage comes from APP_STAGE"
has  src/components/layout/AppHeader.tsx "stage: {APP_STAGE}"  "app header badge comes from APP_STAGE"
none src/components/layout/AppHeader.tsx "not yet offered|outside use" "app header does not say a public product is not offered outward"

echo "stage-check: $fail red over $checked checked"
[ "$fail" -eq 0 ]
