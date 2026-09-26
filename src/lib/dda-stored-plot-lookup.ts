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
import {
  fetchPlotInfoHtml,
  parseAffectionPlan,
  fetchBuildingLimit,
  type AffectionPlan,
} from "@/lib/dda";

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

// ─── Live enrichment of a stored hit (2026-09-26) ──────────────────────────
//
// BASIC_LAND_BASE (the endpoint fetchDdaPlotByNumber uses) is behind the
// 2026-09 token wall, but PlotInfo (fetchPlotInfoHtml + parseAffectionPlan,
// DIS/AGSToken flow) and BuildingLimit (MAIN_MAP layer 8, same token flow)
// still answer normally — they're a different DDA subsystem. A stored hit
// can therefore still get today's land use / floors / FAR / setbacks
// instead of the April-2026 snapshot's, without ever touching
// BASIC_LAND_BASE. See docs/agent-log/2026-09-26-vault-stored-live-plotinfo.md.

export type StoredFieldSource = "live_dda" | "stored";

export interface StoredHitEnrichment {
  /** Merged land use — live PlotInfo category when present, else the
   *  stored (possibly stale) value. */
  landUse: string | null;
  /** Full AffectionPlan from PlotInfo, or null if PlotInfo failed/timed out. */
  plan: AffectionPlan | null;
  /** Building-limit polygon, or null if it failed/timed out/is missing. */
  buildingLimit: GeoJSON.Polygon | null;
  /** Per-value provenance. "stored" also covers fields the stored index
   *  never carried at all (floors/far/height/setbacks/buildingLimit) —
   *  there it means "no live value was available", not "we had one on disk". */
  fieldSources: {
    landUse: StoredFieldSource;
    floors: StoredFieldSource;
    far: StoredFieldSource;
    height: StoredFieldSource;
    setbacks: StoredFieldSource;
    buildingLimit: StoredFieldSource;
  };
}

const ENRICH_TIMEOUT_MS = 8_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout_${ms}ms`)), ms);
    promise.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); },
    );
  });
}

/** First landUseMix category, uppercased — the same "one representative
 *  string" shape the live-DDA branch's `landUse` field already uses.
 *
 *  Defensive trim: on PlotInfo page layouts where parseAffectionPlan's
 *  primary `<li><b>CATEGORY</b>` match finds nothing, it falls back to a
 *  raw "Land use ... General Notes" text span (src/lib/dda.ts) — and on
 *  plots where a Setbacks table sits between those two labels, that span
 *  leaks the whole setbacks table into the category string. Confirmed
 *  live on 6489099 (2026-09-26): category came back as
 *  "HOSPITALITY : HOTEL Setbacks Side Building Podium Side 1 7.5 N/A …".
 *  `plan.landUseMix` itself is left untouched — writeAffectionPlan still
 *  persists whatever parseAffectionPlan produced, same as a live-DDA hit
 *  would — this only cleans the short string this route surfaces as
 *  `landUse`. Root cause is in dda.ts's fallback regex, out of this
 *  task's edit scope; worth a follow-up.  */
function firstLandUseCategory(plan: AffectionPlan | null): string | null {
  const first = plan?.landUseMix?.[0];
  if (!first?.category) return null;
  const cleaned = first.category.split(/\s+Setbacks\s+Side\s+Building/i)[0].trim();
  return cleaned.length > 0 ? cleaned.toUpperCase() : null;
}

/**
 * Enrich a stored-DDA hit with today's PlotInfo + BuildingLimit. Best-effort,
 * same pattern as fetchFullDdaData: each fetch is independent, a failure or
 * >8s timeout degrades to null and never blocks the stored result.
 *
 * `deps` is injectable so tests can exercise the merge logic without a
 * network call or the DIS token flow — production callers omit it.
 */
export async function enrichStoredHit(
  plotNumber: string,
  stored: { landUse: string | null },
  deps: {
    fetchPlotInfoHtml: (plotNumber: string) => Promise<string>;
    parseAffectionPlan: (html: string) => AffectionPlan;
    fetchBuildingLimit: (plotNumber: string) => Promise<GeoJSON.Polygon | null>;
  } = { fetchPlotInfoHtml, parseAffectionPlan, fetchBuildingLimit },
): Promise<StoredHitEnrichment> {
  const [plan, buildingLimit] = await Promise.all([
    (async (): Promise<AffectionPlan | null> => {
      try {
        const html = await withTimeout(deps.fetchPlotInfoHtml(plotNumber), ENRICH_TIMEOUT_MS);
        return deps.parseAffectionPlan(html);
      } catch (e) {
        console.error("[dda-stored-plot-lookup] PlotInfo enrich failed for", plotNumber, e);
        return null;
      }
    })(),
    (async (): Promise<GeoJSON.Polygon | null> => {
      try {
        return await withTimeout(deps.fetchBuildingLimit(plotNumber), ENRICH_TIMEOUT_MS);
      } catch (e) {
        console.error("[dda-stored-plot-lookup] BuildingLimit enrich failed for", plotNumber, e);
        return null;
      }
    })(),
  ]);

  const liveLandUse = firstLandUseCategory(plan);

  return {
    landUse: liveLandUse ?? stored.landUse,
    plan,
    buildingLimit,
    fieldSources: {
      landUse: liveLandUse ? "live_dda" : "stored",
      floors: plan?.maxFloors != null ? "live_dda" : "stored",
      far: plan?.far != null ? "live_dda" : "stored",
      height: plan?.maxHeightMeters != null ? "live_dda" : "stored",
      setbacks: plan != null && plan.setbacks.length > 0 ? "live_dda" : "stored",
      buildingLimit: buildingLimit != null ? "live_dda" : "stored",
    },
  };
}
