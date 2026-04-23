import { promises as fs } from "node:fs";
import path from "node:path";
import type { PlotMatch } from "./types";
import { canonicaliseCommunity } from "./communities";

// Two sources of plot truth:
//   1. data/tiles/dda-plots.geojson.nl   — full 184k DDA polygons (NOT shipped to
//      Vercel, gitignored). Present on the founder dev box; used for the demo.
//   2. data/dld-lands.csv                — 127k DLD land records, IS shipped.
//      Used as the production fallback (community-only matching, no coords).
//
// MVP scope: this matcher loads source (1) lazily at first call and caches in
// memory. If the file is absent (production / Vercel), it falls back to
// source (2) and match-tier maxes out at 2 (community, no coords). The feed
// surfaces a clear "coords unavailable" note when this path fires.

interface PlotIndexEntry {
  plotNumber: string;
  lng: number;
  lat: number;
  community: string | null;
}

interface CommunityCenters {
  [canonical: string]: { lng: number; lat: number; count: number };
}

let plotByNumber: Map<string, PlotIndexEntry> | null = null;
let communityCenters: CommunityCenters | null = null;
let loadStarted = false;
let loadPromise: Promise<void> | null = null;

function centroidOfPolygon(coords: number[][][]): [number, number] {
  // Simple average centroid of the outer ring — good enough for MVP, we only
  // need a point to drop a red dot. The plot polygons from DDA are small
  // enough that any average is within ~meters of the geometric centroid.
  const ring = coords[0] ?? [];
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (const [x, y] of ring) {
    sx += x;
    sy += y;
    n++;
  }
  if (n === 0) return [0, 0];
  return [sx / n, sy / n];
}

async function loadFromNewlineGeojson(filePath: string): Promise<boolean> {
  let text: string;
  try {
    text = await fs.readFile(filePath, "utf8");
  } catch {
    return false;
  }
  const map = new Map<string, PlotIndexEntry>();
  const centers: CommunityCenters = {};
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    let feat: {
      geometry?: { type?: string; coordinates?: number[][][] };
      properties?: { plotNumber?: string; mainLandUse?: string };
    };
    try {
      feat = JSON.parse(line);
    } catch {
      continue;
    }
    const pn = feat.properties?.plotNumber;
    const coords = feat.geometry?.coordinates;
    if (!pn || !coords) continue;
    const [lng, lat] = centroidOfPolygon(coords);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
    // Community hint from the DDA dataset is sparse — we leave it null and
    // let the reverse lookup in the CSV backfill it when needed.
    map.set(pn, { plotNumber: pn, lng, lat, community: null });
  }
  plotByNumber = map;
  communityCenters = centers; // will be filled from CSV below
  return true;
}

async function loadFromDldCsv(csvPath: string): Promise<boolean> {
  let text: string;
  try {
    text = await fs.readFile(csvPath, "utf8");
  } catch {
    return false;
  }
  // Quick and permissive CSV parser — the file is quoted, comma-separated,
  // no embedded newlines in fields in practice for this dataset.
  const lines = text.split("\n");
  if (lines.length < 2) return false;
  const header = lines[0].replace(/^﻿/, "").split(",");
  const idxArea = header.indexOf("AREA_EN");
  const centers: CommunityCenters = communityCenters ?? {};
  // The CSV has no coordinates. It gives us the set of community names that
  // actually appear on DLD records — the canonicaliser then collapses them
  // onto our canonical labels and, if the geojson load succeeded, we reuse
  // its plot centroids by community to derive a community-level center.
  const communityCounts = new Map<string, number>();
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i];
    if (!row) continue;
    const cells = row.split(",");
    if (idxArea < 0 || idxArea >= cells.length) continue;
    const rawArea = cells[idxArea].replace(/^"|"$/g, "");
    const canon = canonicaliseCommunity(rawArea);
    if (!canon) continue;
    communityCounts.set(canon, (communityCounts.get(canon) ?? 0) + 1);
  }
  // If we have plot polygons, compute a centroid of centroids per community
  // by sampling — otherwise leave the map empty (Tier-2 match returns null).
  if (plotByNumber) {
    // Build a reverse link: skip — we don't have community per plot in the
    // geojson properties. We'll fall back to a static best-guess table for
    // the top 20 communities in §MVP. See COMMUNITY_DEFAULTS below.
  }
  communityCenters = { ...centers, ...COMMUNITY_DEFAULTS };
  // Record counts so the UI can show "Al Barsha has 3,412 DLD land records".
  for (const [canon, count] of communityCounts) {
    const prev = communityCenters[canon] ?? { lng: 0, lat: 0, count: 0 };
    communityCenters[canon] = { ...prev, count };
  }
  return true;
}

// Static fall-back centers for the top 20 Dubai communities. These are
// approximate centroids (source: OSM / Google Maps crosscheck 2026-04-23)
// used when no polygon dataset is available at runtime (e.g., on Vercel).
const COMMUNITY_DEFAULTS: CommunityCenters = {
  "Downtown Dubai": { lng: 55.2744, lat: 25.1972, count: 0 },
  DIFC: { lng: 55.2825, lat: 25.2131, count: 0 },
  "Business Bay": { lng: 55.2665, lat: 25.1859, count: 0 },
  "Dubai Marina": { lng: 55.1403, lat: 25.0777, count: 0 },
  JBR: { lng: 55.1357, lat: 25.0788, count: 0 },
  "Palm Jumeirah": { lng: 55.139, lat: 25.1124, count: 0 },
  "Emirates Hills": { lng: 55.1568, lat: 25.0656, count: 0 },
  "Jumeirah Village Circle": { lng: 55.2049, lat: 25.0554, count: 0 },
  "Jumeirah Village Triangle": { lng: 55.1939, lat: 25.055, count: 0 },
  "Al Barsha": { lng: 55.1976, lat: 25.1107, count: 0 },
  "Al Furjan": { lng: 55.1417, lat: 25.026, count: 0 },
  "Al Jaddaf": { lng: 55.3265, lat: 25.2228, count: 0 },
  Meydan: { lng: 55.304, lat: 25.154, count: 0 },
  "MBR City": { lng: 55.308, lat: 25.171, count: 0 },
  "Dubai South": { lng: 55.1626, lat: 24.8926, count: 0 },
  "Dubai Hills Estate": { lng: 55.244, lat: 25.101, count: 0 },
  "DAMAC Hills": { lng: 55.265, lat: 25.023, count: 0 },
  "Dubai Creek Harbour": { lng: 55.3428, lat: 25.197, count: 0 },
  "Dubai Islands": { lng: 55.3132, lat: 25.287, count: 0 },
  "Dubai Silicon Oasis": { lng: 55.3814, lat: 25.1203, count: 0 },
};

async function ensureLoaded(): Promise<void> {
  if (plotByNumber && communityCenters) return;
  if (loadPromise) return loadPromise;
  if (loadStarted) return;
  loadStarted = true;
  loadPromise = (async () => {
    // Try the newline-delimited full dataset (dev box only — gitignored).
    const geoPath = path.join(process.cwd(), "data/tiles/dda-plots.geojson.nl");
    const geoOk = await loadFromNewlineGeojson(geoPath);
    if (!geoOk) {
      plotByNumber = new Map();
    }
    // Always load the CSV for community counts and defaults — works on Vercel.
    const csvPath = path.join(process.cwd(), "data/dld-lands.csv");
    await loadFromDldCsv(csvPath);
    if (!communityCenters) communityCenters = { ...COMMUNITY_DEFAULTS };
  })();
  await loadPromise;
}

/**
 * Look up a plot by its number (7-digit DDA code). Tier-1 match.
 */
export async function matchByPlotNumber(pn: string | null | undefined): Promise<PlotMatch | null> {
  if (!pn) return null;
  const normalised = pn.replace(/\D+/g, "");
  if (normalised.length < 6 || normalised.length > 9) return null;
  await ensureLoaded();
  const hit = plotByNumber?.get(normalised);
  if (!hit) return null;
  return {
    plotNumber: hit.plotNumber,
    lng: hit.lng,
    lat: hit.lat,
    community: hit.community,
    tier: 1,
    confidence: 0.99,
  };
}

/**
 * Fallback community-level match. Tier-2 when we only know "Downtown Dubai".
 */
export async function matchByCommunity(community: string | null | undefined): Promise<PlotMatch | null> {
  if (!community) return null;
  const canon = canonicaliseCommunity(community);
  if (!canon) return null;
  await ensureLoaded();
  const center = communityCenters?.[canon];
  if (!center) return null;
  return {
    plotNumber: "",
    lng: center.lng,
    lat: center.lat,
    community: canon,
    tier: 2,
    confidence: 0.55,
  };
}

/**
 * Best-effort match — tries plot-number first, then community, then null.
 */
export async function bestMatch(
  plotNumber: string | null | undefined,
  community: string | null | undefined,
): Promise<PlotMatch | null> {
  const t1 = await matchByPlotNumber(plotNumber);
  if (t1) return t1;
  const t2 = await matchByCommunity(community);
  if (t2) return t2;
  return null;
}

/**
 * Diagnostic helper for the /ingest response — reports which data sources
 * loaded successfully. Lets the UI surface "plot polygons unavailable on
 * this deploy — match quality capped at Tier 2".
 */
export async function matcherStatus(): Promise<{ plotCount: number; communityCount: number }> {
  await ensureLoaded();
  return {
    plotCount: plotByNumber?.size ?? 0,
    communityCount: Object.keys(communityCenters ?? {}).length,
  };
}
