// Polygon construction + validation for non-DDA plot entry — Sprint 1.
//
// Pure functions, zero React, zero Prisma. Designed so the same
// pipeline runs inside CoordsEntry.tsx (live preview) and inside the
// vault/listing API routes (defence-in-depth — never trust the
// client even when the same code path produced the payload).
//
// We deliberately do NOT pull in @turf/turf for V1 — the two helpers
// we'd want from there (area, self-intersection) are ~50 lines hand-
// rolled and avoid the 50+ KB dependency. If a future feature needs
// more turf, we'll re-evaluate.

import {
  convertToWgs84,
  meanCentroid,
  haversineKm,
  EMIRATE_CENTRES,
  UAE_BBOX,
  type ProjectionKey,
} from "./coords-projection";

// Sanity bounds — values inferred from the founder's plot catalogue.
// Plot scale in Dubai ranges from villa (~3 K sqft) to large mixed-use
// (~50 K sqft). 1 km² = 10.76 M sqft, so 1 km² is ~10× the largest
// realistic ZAAHI plot. Beyond that we flag for user confirmation.
const MAX_PLOT_AREA_SQM = 1_000_000; // 1 km²
const MIN_PLOT_AREA_SQM = 1; // 1 m² — sanity floor (typo prevention)
const SQFT_PER_SQM = 10.7639;
/** Distance from the picked emirate's centre that flags a projection
 *  misfire. The Capital 6 disaster shifted the plot 200 km; 100 km is
 *  a comfortable threshold that still allows large emirates (Abu
 *  Dhabi covers nearly that distance internally). */
const FAR_FROM_EMIRATE_KM = 100;

export const MIN_POINTS = 3;
export const MAX_POINTS = 50;

/**
 * Parse the bulk-paste textarea. Accepts one point per line, two
 * comma-separated numbers per line. Tabs / semicolons / multiple
 * spaces also work — we strip them down to the two numbers per row.
 * Empty lines and trailing whitespace are dropped silently.
 *
 * Returns a typed array of pairs (whatever the projection is — the
 * caller knows whether they're lat/lng or X/Y). Throws on the first
 * unparseable line so the UI can show the line number.
 */
export function parsePointsText(text: string): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i].trim();
    if (raw === "" || raw.startsWith("#") || raw.startsWith("//")) continue;
    // Replace any non-numeric / non-dot / non-minus run with a single
    // space, then split on whitespace. Two numbers expected.
    const cleaned = raw.replace(/[^\d.\-]+/g, " ").trim();
    const parts = cleaned.split(/\s+/);
    if (parts.length < 2) {
      throw new Error(`Line ${i + 1}: need two numbers per line.`);
    }
    const a = Number(parts[0]);
    const b = Number(parts[1]);
    if (!Number.isFinite(a) || !Number.isFinite(b)) {
      throw new Error(`Line ${i + 1}: couldn't parse "${raw}".`);
    }
    out.push([a, b]);
  }
  return out;
}

/**
 * Append a copy of the first ring vertex to the end if it isn't
 * already closed. GeoJSON Polygon requires the outer ring to be
 * explicitly closed.
 */
export function closeRing(
  ring: ReadonlyArray<readonly [number, number]>,
): Array<[number, number]> {
  if (ring.length === 0) return [];
  const first = ring[0];
  const last = ring[ring.length - 1];
  const alreadyClosed = first[0] === last[0] && first[1] === last[1];
  const out: Array<[number, number]> = ring.map((p) => [p[0], p[1]]);
  if (!alreadyClosed) out.push([first[0], first[1]]);
  return out;
}

/** Do two segments (p1→p2 and p3→p4) intersect at an interior point?
 *  Treats touching endpoints as non-intersecting — that's the common
 *  case for ring vertices that legitimately share corners. */
function segmentsCross(
  p1: readonly [number, number],
  p2: readonly [number, number],
  p3: readonly [number, number],
  p4: readonly [number, number],
): boolean {
  const d = (p2[0] - p1[0]) * (p4[1] - p3[1]) - (p2[1] - p1[1]) * (p4[0] - p3[0]);
  if (d === 0) return false;
  const t = ((p3[0] - p1[0]) * (p4[1] - p3[1]) - (p3[1] - p1[1]) * (p4[0] - p3[0])) / d;
  const u = ((p3[0] - p1[0]) * (p2[1] - p1[1]) - (p3[1] - p1[1]) * (p2[0] - p1[0])) / d;
  // Strict inequalities — touching endpoints (t=0 / t=1 / u=0 / u=1)
  // are allowed; only crossings in the open interval count.
  return t > 1e-9 && t < 1 - 1e-9 && u > 1e-9 && u < 1 - 1e-9;
}

/**
 * Detect a self-intersecting ring (bow-tie figure-8). O(n²) on
 * segment count — fine for n ≤ MAX_POINTS = 50.
 *
 * Ring may be open or closed; either way only the segments between
 * consecutive non-equal vertices are checked.
 */
export function hasSelfIntersection(
  ring: ReadonlyArray<readonly [number, number]>,
): boolean {
  if (ring.length < 4) return false;
  // Build segment list from consecutive vertices, dropping the
  // closing-duplicate if present so we don't compare a segment with
  // itself in reverse.
  const verts: Array<readonly [number, number]> = [];
  for (const p of ring) {
    const last = verts[verts.length - 1];
    if (!last || last[0] !== p[0] || last[1] !== p[1]) verts.push(p);
  }
  const n = verts.length;
  if (n < 4) return false;
  for (let i = 0; i < n; i++) {
    const a = verts[i];
    const b = verts[(i + 1) % n];
    for (let j = i + 2; j < n; j++) {
      // Skip the segment that shares an endpoint with [i, i+1].
      if ((j + 1) % n === i) continue;
      const c = verts[j];
      const d = verts[(j + 1) % n];
      if (segmentsCross(a, b, c, d)) return true;
    }
  }
  return false;
}

/**
 * Shoelace area of a polygon ring in m². Assumes the ring vertices
 * are in WGS84 [lng, lat] — uses a flat-earth approximation around
 * the ring centroid (1° lat ≈ 111,320 m; 1° lng ≈ 111,320 × cos(lat)).
 * Plenty accurate for plot-scale polygons (< 1 km²).
 */
export function polygonAreaSqm(
  ring: ReadonlyArray<readonly [number, number]>,
): number {
  if (ring.length < 3) return 0;
  // Centroid latitude for the lng→m scale factor.
  let sumLat = 0;
  for (const p of ring) sumLat += p[1];
  const meanLat = sumLat / ring.length;
  const latRad = (meanLat * Math.PI) / 180;
  const mPerDegLat = 111_320;
  const mPerDegLng = 111_320 * Math.cos(latRad);

  // Shoelace on (xMeters, yMeters) — both axes in metres so the cross
  // product yields m² directly.
  let s = 0;
  for (let i = 0; i < ring.length; i++) {
    const [lng1, lat1] = ring[i];
    const [lng2, lat2] = ring[(i + 1) % ring.length];
    const x1 = lng1 * mPerDegLng;
    const y1 = lat1 * mPerDegLat;
    const x2 = lng2 * mPerDegLng;
    const y2 = lat2 * mPerDegLat;
    s += x1 * y2 - x2 * y1;
  }
  return Math.abs(s) / 2;
}

export function polygonAreaSqft(
  ring: ReadonlyArray<readonly [number, number]>,
): number {
  return polygonAreaSqm(ring) * SQFT_PER_SQM;
}

/** Combined warning / error envelope returned by buildPolygon. */
export interface PolygonBuild {
  /** Closed GeoJSON Polygon, ring in WGS84 [lng, lat]. null on hard
   *  errors (UI shows the `error` instead). */
  polygon: GeoJSON.Polygon | null;
  /** Auto-computed area in sqft, rounded to nearest integer. */
  areaSqft: number;
  /** UI-friendly warnings (non-fatal). */
  warnings: string[];
  /** First hard error — caller blocks submission while present. */
  error: string | null;
}

/**
 * One-shot: parse + project + close + validate + measure.
 *
 *   text      — raw textarea contents.
 *   projection — user pick (WGS84 / DLTM / UTM40N).
 *   emirate    — for the "centroid far from emirate" sanity check.
 *
 * Behaviour:
 *   - empty text → returns { polygon: null, error: "Enter…" }
 *   - < MIN_POINTS distinct vertices → error
 *   - > MAX_POINTS → error
 *   - self-intersection → error
 *   - centroid outside UAE bbox → error
 *   - centroid far from selected emirate → warning (D1 / Capital 6)
 *   - area outside [MIN, MAX] → warning
 */
export function buildPolygon(
  text: string,
  projection: ProjectionKey,
  emirate: string | null,
): PolygonBuild {
  const warnings: string[] = [];
  let points: Array<[number, number]>;
  try {
    points = parsePointsText(text);
  } catch (e) {
    return {
      polygon: null,
      areaSqft: 0,
      warnings: [],
      error: e instanceof Error ? e.message : "Parse error.",
    };
  }
  if (points.length === 0) {
    return {
      polygon: null,
      areaSqft: 0,
      warnings: [],
      error: `Enter at least ${MIN_POINTS} corners (one per line).`,
    };
  }
  if (points.length < MIN_POINTS) {
    return {
      polygon: null,
      areaSqft: 0,
      warnings: [],
      error: `Need at least ${MIN_POINTS} corners — got ${points.length}.`,
    };
  }
  if (points.length > MAX_POINTS) {
    return {
      polygon: null,
      areaSqft: 0,
      warnings: [],
      error: `Too many points (${points.length}). Max ${MAX_POINTS}.`,
    };
  }

  // Project to WGS84.
  let wgs84: Array<[number, number]>;
  try {
    wgs84 = convertToWgs84(points, projection);
  } catch (e) {
    return {
      polygon: null,
      areaSqft: 0,
      warnings: [],
      error: `Projection conversion failed: ${e instanceof Error ? e.message : "unknown"}`,
    };
  }

  // Self-intersection check on the open ring (before closing).
  if (hasSelfIntersection(wgs84)) {
    return {
      polygon: null,
      areaSqft: 0,
      warnings: [],
      error:
        "Polygon self-intersects (looks like a bow-tie). Reorder corners clockwise or counter-clockwise.",
    };
  }

  // Close ring.
  const closed = closeRing(wgs84);
  if (closed.length !== wgs84.length) {
    warnings.push("Ring auto-closed (last vertex was not the first).");
  }

  // Sanity: centroid inside UAE bbox.
  const centroid = meanCentroid(closed);
  if (!centroid) {
    return {
      polygon: null,
      areaSqft: 0,
      warnings: [],
      error: "Couldn't compute centroid.",
    };
  }
  const [cLng, cLat] = centroid;
  if (
    cLng < UAE_BBOX.minLng ||
    cLng > UAE_BBOX.maxLng ||
    cLat < UAE_BBOX.minLat ||
    cLat > UAE_BBOX.maxLat
  ) {
    return {
      polygon: null,
      areaSqft: 0,
      warnings: [],
      error: `Polygon centroid (${cLat.toFixed(3)}°, ${cLng.toFixed(3)}°) falls outside the UAE. Wrong projection?`,
    };
  }

  // Sanity: distance from selected emirate. Capital 6 prevention.
  if (emirate) {
    const eKey = emirate.toUpperCase().replace(/\s+/g, "_");
    const centre = EMIRATE_CENTRES[eKey];
    if (centre) {
      const km = haversineKm(centroid, centre);
      if (km > FAR_FROM_EMIRATE_KM) {
        warnings.push(
          `Polygon centroid is ~${Math.round(km)} km from ${eKey.replace("_", " ")} centre. Wrong projection?`,
        );
      }
    }
  }

  // Area sanity.
  const sqm = polygonAreaSqm(closed);
  const sqft = Math.round(sqm * SQFT_PER_SQM);
  if (sqm < MIN_PLOT_AREA_SQM) {
    warnings.push(`Polygon area is only ${sqft} sqft — typo?`);
  } else if (sqm > MAX_PLOT_AREA_SQM) {
    warnings.push(
      `Polygon area is ~${(sqm / 1_000_000).toFixed(2)} km² — larger than typical plot. Verify.`,
    );
  }

  return {
    polygon: {
      type: "Polygon",
      coordinates: [closed],
    },
    areaSqft: sqft,
    warnings,
    error: null,
  };
}
