#!/usr/bin/env bash
# ── ZAAHI Tile Pipeline ──────────────────────────────────────────────
# Fetches latest DDA + AD plot data, runs the shapely inset prepass,
# enriches with podium/body/crown tiers, builds PMTiles, commits.
#
# Usage:
#   ./scripts/update-tiles.sh                # full pipeline
#   ./scripts/update-tiles.sh --skip-fetch   # rebuild from existing GeoJSON
#   ./scripts/update-tiles.sh --skip-inset   # reuse existing data/layers-inset
#   ./scripts/update-tiles.sh --no-push      # don't git push at the end
#
# Inset prepass: scripts/inset-geojson.py applies a 3m perpendicular
# inset (UTM zone 40N) to every plot polygon so tier features render
# INSIDE the plot boundary (ZAAHI Signature look). Output goes to
# data/layers-inset/ (gitignored). prepare-tiles.ts emits flat
# features at the full polygon and tier features at the inset
# polygon, falling back to the original when no inset exists.
#
# IMPORTANT (past incident): tippecanoe v2.49 writes DIRECTLY to the
# .pmtiles output path — do NOT add a `.new` temp file + atomic
# rename, the binary doesn't expect that. After each build verify
# magic bytes with `xxd -l 8 file.pmtiles` — must start with
# "504d 5469 6c65 7303" (PMTiles\x03).
#
set -euo pipefail
cd "$(dirname "$0")/.."

SKIP_FETCH=false
SKIP_INSET=false
NO_PUSH=false
for arg in "$@"; do
  case $arg in
    --skip-fetch) SKIP_FETCH=true ;;
    --skip-inset) SKIP_INSET=true ;;
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

# ── Step 3: Inset prepass (shapely buffer -3m, UTM 40N) ──
echo ""
if [ "$SKIP_INSET" = false ]; then
  echo "▸ Step 3/6: Insetting plot polygons (3m perpendicular setback)..."
  rm -rf data/layers-inset
  mkdir -p data/layers-inset/dda-plots data/layers-inset/ad-plots data/layers-inset/oman-plots
  for f in data/layers/dda-plots/*.geojson; do
    python3 scripts/inset-geojson.py "$f" "data/layers-inset/dda-plots/$(basename "$f")" 3 \
      > /dev/null
  done
  echo "  ✓ DDA inset → data/layers-inset/dda-plots/"
  for f in data/layers/ad-plots/*.geojson; do
    # Skip 0-feature placeholder files
    [ "$(python3 -c "import json,sys; print(len(json.load(open(sys.argv[1])).get('features',[])))" "$f")" = "0" ] && continue
    python3 scripts/inset-geojson.py "$f" "data/layers-inset/ad-plots/$(basename "$f")" 3 \
      > /dev/null
  done
  echo "  ✓ AD inset  → data/layers-inset/ad-plots/"
  if [ -d data/layers/oman-plots ]; then
    for f in data/layers/oman-plots/*.geojson; do
      python3 scripts/inset-geojson.py "$f" "data/layers-inset/oman-plots/$(basename "$f")" 3 \
        > /dev/null
    done
    echo "  ✓ Oman inset → data/layers-inset/oman-plots/"
  fi
else
  echo "▸ Step 3/6: SKIPPED (--skip-inset; reusing data/layers-inset/)"
fi

# ── Step 4: Enrich GeoJSON with tiers ──
echo ""
echo "▸ Step 4/6: Enriching GeoJSON (color, height, podium/body/crown tiers)..."
npx tsx scripts/prepare-tiles.ts

# ── Step 5: Build PMTiles ──
# tippecanoe v2.49 writes directly to -o path. Do NOT use a .new
# extension + atomic swap — that's what bit us last time.
echo ""
echo "▸ Step 5/6: Building PMTiles with tippecanoe..."

mkdir -p public/tiles

# Shared tippecanoe args
TIPPE_ARGS=(
  --layer=plots
  --minimum-zoom=10
  --maximum-zoom=16
  --drop-densest-as-needed
  --extend-zooms-if-still-dropping
  --force
  --quiet
)

echo "  → DDA Land (Dubai 99K plots)..."
tippecanoe -o public/tiles/dda-land.pmtiles --name="DDA Land Plots" \
  "${TIPPE_ARGS[@]}" data/tiles/dda-plots.geojson.nl

echo "  → AD Land — ADM (Abu Dhabi Municipality)..."
tippecanoe -o public/tiles/ad-land-adm.pmtiles --name="AD Land Plots — ADM" \
  "${TIPPE_ARGS[@]}" data/tiles/ad-plots-adm.geojson.nl

echo "  → AD Land — Al Ain + Western Region..."
tippecanoe -o public/tiles/ad-land-other.pmtiles --name="AD Land Plots — Other" \
  "${TIPPE_ARGS[@]}" data/tiles/ad-plots-other.geojson.nl

if [ -s data/tiles/oman-plots.geojson.nl ]; then
  echo "  → Oman Land (Muscat — Seeb contract)..."
  tippecanoe -o public/tiles/oman-land.pmtiles --name="Oman Land Plots" \
    "${TIPPE_ARGS[@]}" data/tiles/oman-plots.geojson.nl
fi

# Magic-byte verification — PMTiles\x03 = 504d 5469 6c65 7303.
echo ""
echo "  Verifying PMTiles magic bytes (must start with 504d 5469 6c65 7303)..."
for p in public/tiles/dda-land.pmtiles public/tiles/ad-land-adm.pmtiles \
         public/tiles/ad-land-other.pmtiles public/tiles/oman-land.pmtiles; do
  [ -f "$p" ] || continue
  magic=$(xxd -l 8 -p "$p")
  if [ "$magic" = "504d54696c657303" ]; then
    echo "  ✓ $p"
  else
    echo "  ✗ $p — bad magic $magic" >&2
    exit 1
  fi
done

echo ""
echo "  PMTiles built:"
ls -lh public/tiles/*.pmtiles

# ── Step 6: Commit + push ──
echo ""
echo "▸ Step 6/6: Git commit..."
git add public/tiles/*.pmtiles
git add -u  # stage any other tracked changes

TIMESTAMP=$(date '+%Y-%m-%d')
git commit -m "chore: rebuild land plot tiles ($TIMESTAMP)

DDA:   $(wc -l < data/tiles/dda-plots.geojson.nl) features
AD ADM:   $(wc -l < data/tiles/ad-plots-adm.geojson.nl) features
AD other: $(wc -l < data/tiles/ad-plots-other.geojson.nl) features
Oman:  $(wc -l < data/tiles/oman-plots.geojson.nl 2>/dev/null || echo 0) features" || echo "  (nothing to commit)"

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
