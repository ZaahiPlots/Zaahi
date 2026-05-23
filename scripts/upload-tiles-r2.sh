#!/usr/bin/env bash
# ── ZAAHI: Upload PMTiles to Cloudflare R2 ───────────────────────────
# Pushes all four pre-built PMTiles to an R2 bucket via wrangler, then
# verifies each upload with an HTTP HEAD against the public URL.
#
# Created 2026-05-23 for the R2 migration plan
# (see docs/r2-migration-plan.md). Read that doc first.
#
# Prereqs (founder must complete BEFORE running this script):
#   1. Cloudflare account exists.
#   2. R2 bucket created (suggested name: zaahi-tiles).
#   3. Public access for the bucket configured — either:
#        a) "Allow Access" toggle ON → pub-<hash>.r2.dev URL, OR
#        b) Custom domain bound (e.g. cdn.zaahi.io → bucket).
#   4. CORS rule on the bucket allowing GET + HEAD, with Range
#      headers, from https://zaahi.io and https://*.vercel.app.
#   5. `wrangler` CLI installed and authenticated:
#        npm i -g wrangler
#        wrangler login
#
# Usage:
#   BUCKET=zaahi-tiles CDN_BASE=https://cdn.zaahi.io \
#     ./scripts/upload-tiles-r2.sh
#
#   Or with the r2.dev URL:
#   BUCKET=zaahi-tiles CDN_BASE=https://pub-<hash>.r2.dev \
#     ./scripts/upload-tiles-r2.sh
#
# Pass --dry-run to preview commands without executing wrangler.
#
set -euo pipefail
cd "$(dirname "$0")/.."

DRY_RUN=false
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    *) echo "unknown arg: $arg" >&2; exit 2 ;;
  esac
done

: "${BUCKET:?Set BUCKET=<r2-bucket-name>}"
: "${CDN_BASE:?Set CDN_BASE=<https://cdn... or https://pub-...r2.dev>}"

if [ "$DRY_RUN" = false ] && ! command -v wrangler >/dev/null 2>&1; then
  echo "✗ wrangler not installed. Install with: npm i -g wrangler" >&2
  exit 1
fi

# Strip trailing slash from CDN_BASE for clean concatenation.
CDN_BASE="${CDN_BASE%/}"

FILES=(
  dda-land.pmtiles
  ad-land-adm.pmtiles
  ad-land-other.pmtiles
  oman-land.pmtiles
)

echo "═══════════════════════════════════════════════"
echo "  ZAAHI Tile R2 Upload — $(date '+%Y-%m-%d %H:%M')"
echo "  Bucket:    $BUCKET"
echo "  CDN base:  $CDN_BASE"
[ "$DRY_RUN" = true ] && echo "  Mode:      DRY-RUN"
echo "═══════════════════════════════════════════════"

# ── Step 1: Verify local files + magic bytes ──
echo ""
echo "▸ Step 1/3: Local file + magic-byte verification..."
for f in "${FILES[@]}"; do
  path="public/tiles/$f"
  if [ ! -f "$path" ]; then
    echo "  ✗ missing: $path" >&2; exit 1
  fi
  magic=$(xxd -l 8 -p "$path")
  size=$(du -h "$path" | awk '{print $1}')
  if [ "$magic" != "504d54696c657303" ]; then
    echo "  ✗ $path — bad magic $magic (want 504d54696c657303)" >&2
    exit 1
  fi
  echo "  ✓ $path  size=$size  magic=$magic"
done

# ── Step 2: Upload via wrangler ──
echo ""
echo "▸ Step 2/3: Uploading to R2..."
for f in "${FILES[@]}"; do
  path="public/tiles/$f"
  key="tiles/$f"
  echo "  → $key  ($(du -h "$path" | awk '{print $1}'))"
  if [ "$DRY_RUN" = true ]; then
    echo "    DRY-RUN: wrangler r2 object put $BUCKET/$key --file=$path --content-type=application/octet-stream"
  else
    wrangler r2 object put "$BUCKET/$key" \
      --file="$path" \
      --content-type=application/octet-stream
  fi
done

# ── Step 3: HEAD verification ──
echo ""
echo "▸ Step 3/3: Verifying public URLs via HTTP HEAD..."
for f in "${FILES[@]}"; do
  url="$CDN_BASE/tiles/$f"
  if [ "$DRY_RUN" = true ]; then
    echo "    DRY-RUN: curl -sI -o /dev/null -w '%{http_code} %{size_download}\\n' $url"
    continue
  fi
  status=$(curl -sI -o /dev/null -w '%{http_code}' "$url" || echo "000")
  bytes=$(curl -sI "$url" | awk '/content-length:/i {print $2}' | tr -d '\r')
  if [ "$status" = "200" ] && [ -n "$bytes" ]; then
    local_bytes=$(stat -c%s "public/tiles/$f")
    if [ "$bytes" = "$local_bytes" ]; then
      echo "  ✓ $url  HTTP $status  $bytes bytes (matches local)"
    else
      echo "  ⚠ $url  HTTP $status  $bytes bytes (LOCAL=$local_bytes — mismatch!)"
    fi
  else
    echo "  ✗ $url  HTTP $status"
  fi
done

# ── Step 4: Range-request smoke test (PMTiles needs this) ──
echo ""
echo "▸ Step 4/3 (bonus): Range-request smoke test on dda-land.pmtiles..."
if [ "$DRY_RUN" = true ]; then
  echo "    DRY-RUN: curl -sI -H 'Range: bytes=0-7' $CDN_BASE/tiles/dda-land.pmtiles"
else
  range_status=$(curl -sI -H 'Range: bytes=0-7' "$CDN_BASE/tiles/dda-land.pmtiles" \
    | awk '/^HTTP/ {print $2}' | tr -d '\r')
  range_magic=$(curl -s -H 'Range: bytes=0-6' "$CDN_BASE/tiles/dda-land.pmtiles" | xxd -p)
  if [ "$range_status" = "206" ] && [ "$range_magic" = "504d54696c6573" ]; then
    echo "  ✓ HTTP 206 Partial Content with magic 'PMTiles' returned. R2 range support OK."
  else
    echo "  ✗ Range request failed: status=$range_status magic=$range_magic"
    echo "    PMTiles will not load in the browser without 206 + Range support."
    exit 1
  fi
fi

echo ""
echo "═══════════════════════════════════════════════"
echo "  Done! Public URLs:"
for f in "${FILES[@]}"; do echo "    $CDN_BASE/tiles/$f"; done
echo ""
echo "  Next: set NEXT_PUBLIC_TILES_BASE_URL=$CDN_BASE on Vercel"
echo "  and apply the page.tsx diff from docs/r2-migration-plan.md."
echo "═══════════════════════════════════════════════"
