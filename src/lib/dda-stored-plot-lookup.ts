// Vault plot-lookup fallback #2 — our own stored DDA plot data.
//
// Order (see /api/me/vault/plot-lookup): Parcel table (curated, ~130
// listings) -> this (99,126 plots, harvested before BASIC_LAND_BASE's
// 2026-09 token wall) -> live DDA (currently walled, resumes automatically
// once/if it reopens). See docs/agent-log/2026-09-26-vault-local-fallback.md.
//
// Source data:
//   - data/layers/dda/*.geojson (206 files, the same data /api/layers/dda/*
//     already serves publicly) — plot number, polygon, project name, area.
//   - docs/research/data-dubai/raw/land_registry.json (gitignored, NOT
//     deployed — see .gitignore's docs/research/data-dubai/ entry) — joined
//     once at build time via parcel_id == plotNumber for land use only.
//     data/dda-plot-index.json (committed, ~10 MB, scalars only) is the
//     baked result; the 233 MB raw dump never ships.
//
// Rebuild the index with: npx tsx scripts/build-dda-plot-index.ts

import { readFileSync } from "node:fs";
import { join } from "node:path";

const INDEX_PATH = join(process.cwd(), "data", "dda-plot-index.json");
const DDA_DIR = join(process.cwd(), "data", "layers", "dda");

/** Older of the two source dates (land_registry.json load_timestamp
 *  2026-04-10; data/layers/dda/*.geojson committed 2026-06-08) — shown to
 *  the user so a stored hit is never mistaken for a live DDA answer. Update
 *  this if scripts/build-dda-plot-index.ts is re-run against fresher data. */
export const STORED_DDA_SNAPSHOT_DATE = "2026-04-10";

interface IndexEntry {
  file: string;
  projectName: string;
  areaSqft: number | null;
  landUse: string | null;
}

let indexCache: Record<string, IndexEntry> | null = null;
function loadIndex(): Record<string, IndexEntry> {
  if (!indexCache) {
    indexCache = JSON.parse(readFileSync(INDEX_PATH, "utf8")) as Record<string, IndexEntry>;
  }
  return indexCache;
}

// One district file's features, cached per file for the life of the
// lambda/process — same pattern as the /api/layers/dda/[slug] routes.
const fileCache = new Map<string, GeoJSON.FeatureCollection>();
function loadDistrictFile(file: string): GeoJSON.FeatureCollection {
  const cached = fileCache.get(file);
  if (cached) return cached;
  const fc = JSON.parse(readFileSync(join(DDA_DIR, `${file}.geojson`), "utf8")) as GeoJSON.FeatureCollection;
  fileCache.set(file, fc);
  return fc;
}

export interface StoredDdaPlot {
  geometry: GeoJSON.Polygon;
  area: number | null;
  district: string;
  landUse: string | null;
  latitude: number;
  longitude: number;
}

/** Look up a plot in our own stored DDA data. No network call. */
export function lookupStoredDdaPlot(plotNumber: string): StoredDdaPlot | null {
  const entry = loadIndex()[plotNumber];
  if (!entry) return null;

  const fc = loadDistrictFile(entry.file);
  const feat = (fc.features ?? []).find(
    (f) => String(f.properties?.PLOT_NUMBER ?? "").trim() === plotNumber,
  );
  const geometry = feat?.geometry;
  if (!geometry || geometry.type !== "Polygon" || !Array.isArray(geometry.coordinates) || geometry.coordinates.length === 0) {
    return null; // index says it exists but the district file disagrees — treat as a miss, not a crash
  }
  const ring = geometry.coordinates[0];
  if (!Array.isArray(ring) || ring.length < 3) return null;

  let cx = 0, cy = 0, n = 0;
  for (const p of ring) {
    if (Array.isArray(p) && p.length >= 2 && typeof p[0] === "number" && typeof p[1] === "number") {
      cx += p[0];
      cy += p[1];
      n++;
    }
  }

  return {
    geometry,
    area: entry.areaSqft,
    district: entry.projectName || "UNKNOWN",
    landUse: entry.landUse,
    latitude: n > 0 ? cy / n : 0,
    longitude: n > 0 ? cx / n : 0,
  };
}
