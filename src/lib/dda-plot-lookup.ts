// Server-side live DDA plot lookup.
//
// Called by /api/me/vault/plot-lookup when the local Parcel index misses.
// Endpoint: BASIC_LAND_BASE/MapServer/2 — one fetch, no token, returns
// polygon + all relevant fields. Tested 2026-05-22 against Arjan plots
// 6731157 and 6731146 (~0.4–0.5s round trip).
//
// Failure modes return null; route caller treats that as "not_found".
//
// fetchFullDdaData (Phase 2 of vault refactor, founder spec 2026-05-30)
// chains the basic lookup with the same fetchPlotInfoHtml +
// parseAffectionPlan + fetchBuildingLimit calls that listings use, so
// vault entries can persist a real AffectionPlan row identical to
// public listings rather than relying on the partial DdaSnapshot.

import {
  fetchPlotInfoHtml,
  parseAffectionPlan,
  fetchBuildingLimit,
  type AffectionPlan,
} from "@/lib/dda";

export interface DdaPlotResult {
  /** Plot polygon in EPSG:4326. */
  geometry: GeoJSON.Polygon;
  /** Square feet. */
  area: number | null;
  /** PROJECT_NAME from DDA (e.g. "ARJAN"). Often differs from the user-typed district. */
  district: string;
  /** LANDUSE_CATEGORY (RESIDENTIAL / COMMERCIAL / …) uppercased. */
  landUse: string | null;
  /** Centroid of polygon — for placeholder layer if needed downstream. */
  latitude: number;
  longitude: number;
  /** Raw feature for storage in VaultEntry.ddaSnapshot. */
  ddaSnapshot: DdaSnapshot;
}

/** Shape we persist verbatim in VaultEntry.ddaSnapshot (JSONB). */
export interface DdaSnapshot {
  source: "dda-basic-land-base-2";
  fetchedAt: string;
  plotNumber: string;
  feature: {
    properties: Record<string, unknown>;
    geometry: GeoJSON.Polygon;
  };
}

/**
 * Shape the map renderer expects (mirrors AffectionPlan fields used in GAP 1).
 * JSON-flavoured fields use `unknown` so the value lines up with Prisma's
 * broad `JsonValue` typing at the route boundary — the client side already
 * narrows via its own type assertion in `loadVaultMine`/`loadVaultShared`.
 */
export interface AffectionPlanLike {
  maxFloors: number | null;
  maxHeightMeters: number | null;
  buildingLimitGeometry: unknown;
  setbacks: unknown;
  landUseMix: unknown;
  buildingStyle: string | null;
}

const BASIC_LAND_BASE =
  "https://gis.dda.gov.ae/server/rest/services/DDA/BASIC_LAND_BASE/MapServer/2/query";
const UA = "Mozilla/5.0 (X11; Linux x86_64) ZAAHI/1.0";

/**
 * Parse DDA's "G+N" floor descriptor.
 *   "G+6" → 7   (ground + 6 floors)
 *   "G+15" → 16
 *   "G" → 1
 *   "G+0" → 1
 *   anything else → null (caller falls back to land-use default)
 */
export function parseGroundPlusFloors(raw: unknown): number | null {
  if (typeof raw !== "string") return null;
  const s = raw.trim().toUpperCase();
  if (s === "G") return 1;
  const m = s.match(/^G\+(\d+)/);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n < 0) return null;
  return n + 1;
}

/** Try to coerce a setback string to a positive number. "SEE NOTES" / "N/A" / "" → null. */
function parseSetbackValue(raw: unknown): number | null {
  if (raw == null) return null;
  if (typeof raw === "number") return raw > 0 ? raw : null;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed || /^see notes|^n\/a$|^na$/i.test(trimmed)) return null;
    const n = Number(trimmed);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  return null;
}

/** Build the AffectionPlanLike shape the GAP 1 map renderer needs. */
export function synthesizeAffectionPlanFromDdaSnapshot(
  snapshot: DdaSnapshot,
): AffectionPlanLike {
  const props = snapshot.feature.properties;
  const maxFloors = parseGroundPlusFloors(props.MAX_HEIGHT_FLOORS);

  const setbacks: Array<{ side: number; building: number | null; podium: number | null }> = [];
  for (let i = 1; i <= 4; i++) {
    const b = parseSetbackValue(props[`BUILDING_SETBACK_SIDE${i}`]);
    const p = parseSetbackValue(props[`PODIUM_SETBACK_SIDE${i}`]);
    if (b !== null || p !== null) {
      setbacks.push({ side: i, building: b, podium: p });
    }
  }

  const category =
    typeof props.LANDUSE_CATEGORY === "string" ? props.LANDUSE_CATEGORY.toUpperCase() :
    typeof props.MAIN_LANDUSE === "string" ? props.MAIN_LANDUSE.toUpperCase() :
    null;
  const sub =
    typeof props.SUB_LANDUSE === "string" ? props.SUB_LANDUSE.toUpperCase() : null;

  const landUseMix = category
    ? [{ category, sub }]
    : null;

  return {
    maxFloors,
    maxHeightMeters: null, // DDA usually sets this to 0; tiers helper derives from maxFloors
    buildingLimitGeometry: null, // not in BASIC_LAND_BASE; only DDA layer 8 has it
    setbacks: setbacks.length > 0 ? setbacks : null,
    landUseMix,
    buildingStyle: null,
  };
}

/**
 * Outcome of a live BASIC_LAND_BASE / full DDA lookup — three distinct
 * shapes so callers never collapse "DDA is down" into "plot doesn't exist".
 *
 *   hit         — parsed a real feature.
 *   not_found   — DDA answered cleanly (or the plot number is malformed)
 *                 and there is genuinely no such plot.
 *   unavailable — DDA errored (HTTP failure, network failure, or an ArcGIS
 *                 error body like the 499 "Token Required" wall) — we don't
 *                 know whether the plot exists. `reason` is for logs only,
 *                 never shown to the user verbatim.
 *
 * 2026-09-26: BASIC_LAND_BASE started answering every query with HTTP 200 +
 * `{"error":{"code":499,"message":"Token Required"}}`. The old code only
 * checked `res.ok` (true — the error body IS a 200), then saw an empty
 * `features[]` and returned null, which every caller read as "not in DDA".
 * See docs/agent-log/2026-09-26-dda-token-restore.md for the full trace —
 * no legitimate token path exists for this service, so this is an
 * error-handling fix only, not a token workaround.
 */
export type DdaLookupResult<T> =
  | { status: "hit"; data: T }
  | { status: "not_found" }
  | { status: "unavailable"; reason: string };

/** Full vault-side DDA fetch — basic polygon + affection plan +
 *  building limit. Each child fetch is best-effort: PlotInfo can return
 *  "SEE NOTES" on master plots, and BuildingLimit is missing for many
 *  smaller parcels. Only the basic BASIC_LAND_BASE lookup can produce
 *  not_found / unavailable — plan and buildingLimit failures degrade to
 *  null within a "hit".
 *
 *  Used by /api/me/vault/plot-lookup (to surface the plan in the wizard)
 *  and /api/me/vault/entries POST (to persist the AffectionPlan row).
 */
export interface DdaFullData {
  basic: DdaPlotResult;
  plan: AffectionPlan | null;
  buildingLimit: GeoJSON.Polygon | null;
}

export async function fetchFullDdaData(
  plotNumber: string,
): Promise<DdaLookupResult<DdaFullData>> {
  const basic = await fetchDdaPlotByNumber(plotNumber);
  if (basic.status !== "hit") return basic;

  // Plan and building-limit run in parallel — neither blocks the basic
  // polygon, both are best-effort.
  const [plan, buildingLimit] = await Promise.all([
    (async () => {
      try {
        const html = await fetchPlotInfoHtml(plotNumber);
        return parseAffectionPlan(html);
      } catch (e) {
        console.error("[dda-full-fetch] PlotInfo failed for", plotNumber, e);
        return null;
      }
    })(),
    (async () => {
      try {
        return await fetchBuildingLimit(plotNumber);
      } catch (e) {
        console.error("[dda-full-fetch] BuildingLimit failed for", plotNumber, e);
        return null;
      }
    })(),
  ]);

  return { status: "hit", data: { basic: basic.data, plan, buildingLimit } };
}

/** Fetch + parse one plot from BASIC_LAND_BASE. */
export async function fetchDdaPlotByNumber(
  plotNumber: string,
): Promise<DdaLookupResult<DdaPlotResult>> {
  // Validate: BASIC_LAND_BASE expects plain numeric plot string. A
  // malformed plot number is never DDA's fault — not_found, not unavailable.
  if (!/^\d{5,10}$/.test(plotNumber)) return { status: "not_found" };

  const url =
    `${BASIC_LAND_BASE}?where=PLOT_NUMBER%3D%27${encodeURIComponent(plotNumber)}%27` +
    `&outFields=*&returnGeometry=true&outSR=4326&f=geojson`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "User-Agent": UA },
      cache: "no-store",
      // 10s timeout via AbortController so a stalled DDA doesn't block the wizard.
      signal: AbortSignal.timeout(10_000),
    });
  } catch (e) {
    console.error("[dda-plot-lookup] fetch failed for", plotNumber, e);
    return { status: "unavailable", reason: `fetch_failed: ${e instanceof Error ? e.message : String(e)}` };
  }
  if (!res.ok) {
    console.error("[dda-plot-lookup] HTTP", res.status, "for", plotNumber);
    return { status: "unavailable", reason: `http_${res.status}` };
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch (e) {
    console.error("[dda-plot-lookup] JSON parse failed for", plotNumber, e);
    return { status: "unavailable", reason: "invalid_json" };
  }

  // ArcGIS errors (token walls, quota, bad query) come back as HTTP 200
  // with an {"error": {...}} body — res.ok tells us nothing. Must check
  // the body shape before ever looking at features[].
  const errorBody = json as { error?: { code?: number; message?: string } };
  if (errorBody.error) {
    console.error(
      "[dda-plot-lookup] ArcGIS error for", plotNumber,
      errorBody.error.code, errorBody.error.message,
    );
    return {
      status: "unavailable",
      reason: `dda_error_${errorBody.error.code ?? "unknown"}: ${errorBody.error.message ?? ""}`,
    };
  }

  const collection = json as { features?: Array<{ geometry?: unknown; properties?: Record<string, unknown> }> };
  const features = Array.isArray(collection.features) ? collection.features : [];
  if (features.length === 0) return { status: "not_found" };

  const feat = features[0];
  if (!feat.geometry || typeof feat.geometry !== "object") return { status: "not_found" };
  const geom = feat.geometry as { type?: string; coordinates?: number[][][] };
  if (geom.type !== "Polygon" || !Array.isArray(geom.coordinates) || geom.coordinates.length === 0) {
    return { status: "not_found" };
  }
  const ring = geom.coordinates[0];
  if (!Array.isArray(ring) || ring.length < 3) return { status: "not_found" };

  const props = feat.properties ?? {};
  const polygon: GeoJSON.Polygon = {
    type: "Polygon",
    coordinates: geom.coordinates,
  };

  // Centroid of outer ring — used as lat/lng if downstream wants point fallback.
  let cx = 0;
  let cy = 0;
  let pointCount = 0;
  for (const p of ring) {
    if (Array.isArray(p) && p.length >= 2 && typeof p[0] === "number" && typeof p[1] === "number") {
      cx += p[0];
      cy += p[1];
      pointCount++;
    }
  }
  const longitude = pointCount > 0 ? cx / pointCount : 0;
  const latitude = pointCount > 0 ? cy / pointCount : 0;

  const districtRaw = props.PROJECT_NAME;
  const district = typeof districtRaw === "string" && districtRaw.trim().length > 0
    ? districtRaw.trim()
    : "";

  const area = typeof props.AREA_SQFT === "number" ? props.AREA_SQFT : null;

  // Prefer LANDUSE_CATEGORY (single value) over MAIN_LANDUSE (which can be duplicated in LANDUSE_DETAILS).
  const landUseRaw =
    typeof props.LANDUSE_CATEGORY === "string" ? props.LANDUSE_CATEGORY :
    typeof props.MAIN_LANDUSE === "string" ? props.MAIN_LANDUSE :
    null;
  const landUse = landUseRaw ? landUseRaw.toUpperCase().trim() : null;

  const snapshot: DdaSnapshot = {
    source: "dda-basic-land-base-2",
    fetchedAt: new Date().toISOString(),
    plotNumber,
    feature: { properties: props, geometry: polygon },
  };

  return {
    status: "hit",
    data: {
      geometry: polygon,
      area,
      district,
      landUse,
      latitude,
      longitude,
      ddaSnapshot: snapshot,
    },
  };
}
