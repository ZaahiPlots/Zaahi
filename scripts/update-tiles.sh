#!/usr/bin/env bash
# ── ZAAHI Tile Pipeline ──────────────────────────────────────────────
# Fetches latest DDA + AD plot data, enriches, builds PMTiles, commits.
#
# Usage:
#   ./scripts/update-tiles.sh          # full pipeline
#   ./scripts/update-tiles.sh --skip-fetch   # rebuild tiles from existing GeoJSON
#   ./scripts/update-tiles.sh --no-push      # don't git push at the end
#
set -euo pipefail
cd "$(dirname "$0")/.."

SKIP_FETCH=false
NO_PUSH=false
for arg in "$@"; do
  case $arg in
    --skip-fetch) SKIP_FETCH=true ;;
    --no-push)    NO_PUSH=true ;;
  esac
done

echo "═══════════════════════════════════════════════"
echo "  ZAAHI Tile Pipeline — $(date '+%Y-%m-%d %H:%M')"
echo "═══════════════════════════════════════════════"

# ── Step 1: Fetch raw data ──
if [ "$SKIP_FETCH" = false ]; then
  echo ""
  echo "▸ Step 1/5: Fetching DDA plots..."
  npx tsx scripts/fetch-dda-plots.ts

  echo ""
  echo "▸ Step 2/5: Fetching AD plots..."
  npx tsx scripts/fetch-ad-plots.ts
else
  echo ""
  echo "▸ Steps 1-2: SKIPPED (--skip-fetch)"
fi

# ── Step 3: Enrich data ──
echo ""
echo "▸ Step 3/5: Enriching GeoJSON (color, height, landUse)..."
npx tsx scripts/prepare-tiles.ts

# ── Step 4: Build PMTiles ──
echo ""
echo "▸ Step 4/5: Building PMTiles with tippecanoe..."

mkdir -p public/tiles

echo "  → DDA Land (99K plots)..."
tippecanoe \
  -o public/tiles/dda-land.pmtiles \
  --name="DDA Land Plots" \
  --layer=plots \
  --minimum-zoom=10 \
  --maximum-zoom=16 \
  --drop-densest-as-needed \
  --extend-zooms-if-still-dropping \
  --force \
  --quiet \
  data/tiles/dda-plots.geojson.nl

echo "  → AD Land (362K plots)..."
tippecanoe \
  -o public/tiles/ad-land.pmtiles \
  --name="AD Land Plots" \
  --layer=plots \
  --minimum-zoom=10 \
  --maximum-zoom=16 \
  --drop-densest-as-needed \
  --extend-zooms-if-still-dropping \
  --force \
  --quiet \
  data/tiles/ad-plots.geojson.nl

echo ""
echo "  PMTiles built:"
ls -lh public/tiles/*.pmtiles

# ── Step 5: Commit + push ──
echo ""
echo "▸ Step 5/5: Git commit..."
git add public/tiles/*.pmtiles
git add -u  # stage any other tracked changes

TIMESTAMP=$(date '+%Y-%m-%d')
git commit -m "chore: rebuild land plot tiles ($TIMESTAMP)

DDA: $(wc -l < data/tiles/dda-plots.geojson.nl) plots
AD:  $(wc -l < data/tiles/ad-plots.geojson.nl) plots" || echo "  (nothing to commit)"

if [ "$NO_PUSH" = false ]; then
  echo "  Pushing..."
  git push
else
  echo "  (--no-push: skipping git push)"
fi

echo ""
echo "═══════════════════════════════════════════════"
echo "  Done! Tiles updated."
echo "═══════════════════════════════════════════════"
