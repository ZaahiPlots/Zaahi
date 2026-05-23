#!/usr/bin/env bash
# ── ZAAHI: Rebuild PMTiles at --maximum-zoom=18 (to /tmp, NOT prod) ──
# Identical to Step 5 of scripts/update-tiles.sh except:
#   • writes to /tmp/zaahi-tiles-z18/  (never touches public/tiles/)
#   • --maximum-zoom=18 (vs current production 16)
#   • adds magic-byte verification per file
#   • prints intended public URLs given a CDN_BASE
#
# Use this AFTER R2 is set up (see docs/r2-migration-plan.md):
#   1. Run this script — produces 4 fresh .pmtiles in /tmp.
#   2. Run scripts/upload-tiles-r2.sh against /tmp output (or copy
#      the files into public/tiles/ first; the upload script reads
#      from public/tiles/).
#   3. Apply the page.tsx diff + env var, deploy.
#
# A prior z18 rebuild on 2026-05-23 produced files exceeding GitHub's
# 100MB hard limit (ad-land-other.pmtiles = 165MB). That commit was
# reset; this script is the input to the R2 migration that lifts that
# limit. See memory: project_pmtiles_overzoom_band.
#
# Usage:
#   ./scripts/rebuild-tiles-z18.sh
#
# Optional: pass a destination dir as first arg (default /tmp/zaahi-tiles-z18).
#
set -euo pipefail
cd "$(dirname "$0")/.."

OUT_DIR="${1:-/tmp/zaahi-tiles-z18}"
mkdir -p "$OUT_DIR"

if ! command -v tippecanoe >/dev/null 2>&1; then
  echo "✗ tippecanoe not installed. apt-get install tippecanoe (or build from source)." >&2
  exit 1
fi

TIPPE_ARGS=(
  --layer=plots
  --minimum-zoom=10
  --maximum-zoom=18
  --drop-densest-as-needed
  --extend-zooms-if-still-dropping
  --force
  --quiet
)

declare -A INPUTS=(
  [dda-land]="data/tiles/dda-plots.geojson.nl"
  [ad-land-adm]="data/tiles/ad-plots-adm.geojson.nl"
  [ad-land-other]="data/tiles/ad-plots-other.geojson.nl"
  [oman-land]="data/tiles/oman-plots.geojson.nl"
)

# Build order: smallest input first so we fail fast on misconfig.
ORDER=(dda-land oman-land ad-land-adm ad-land-other)

echo "═══════════════════════════════════════════════"
echo "  ZAAHI Tile Rebuild z18 — $(date '+%Y-%m-%d %H:%M')"
echo "  Out:  $OUT_DIR"
echo "  Note: writes to /tmp; does NOT touch public/tiles/"
echo "═══════════════════════════════════════════════"

for name in "${ORDER[@]}"; do
  src="${INPUTS[$name]}"
  out="$OUT_DIR/$name.pmtiles"
  if [ ! -s "$src" ]; then
    echo "▸ SKIP $name — input $src missing or empty"
    continue
  fi
  echo ""
  echo "▸ $name  ($(du -h "$src" | awk '{print $1}') input)"
  start=$(date +%s)
  tippecanoe -o "$out" --name="$name" "${TIPPE_ARGS[@]}" "$src"
  end=$(date +%s)
  size=$(du -h "$out" | awk '{print $1}')
  echo "  built in $((end - start))s, output $size"

  # Magic-byte check.
  magic=$(xxd -l 8 -p "$out")
  if [ "$magic" != "504d54696c657303" ]; then
    echo "  ✗ bad magic $magic (want 504d54696c657303)" >&2
    exit 1
  fi
  echo "  magic OK: $magic"
done

echo ""
echo "═══════════════════════════════════════════════"
echo "  All builds complete. Sizes:"
ls -lh "$OUT_DIR"/*.pmtiles
echo ""
echo "  Total:"
du -sh "$OUT_DIR" | awk '{print "  " $0}'
echo ""
echo "  Next steps:"
echo "    1. Verify with 5-named-plot decode (per feedback_pmtiles_verification)."
echo "    2. cp $OUT_DIR/*.pmtiles public/tiles/   (only if R2 ready)"
echo "    3. ./scripts/upload-tiles-r2.sh"
echo "    4. Set NEXT_PUBLIC_TILES_BASE_URL on Vercel + apply page.tsx diff."
echo "═══════════════════════════════════════════════"
