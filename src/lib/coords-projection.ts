// Projection helpers for non-DDA plot entry — Sprint 1.
//
// Three projections cover >95% of UAE plot charts (founder design
// D2, docs/specs/non-dda-plot-entry-DESIGN.md):
//
//   • WGS84  (EPSG:4326)   — lat/lng decimal, Google Maps / phone
//                            GPS. No conversion needed.
//   • DLTM   (EPSG:3997)   — Dubai Local Transverse Mercator. Used by
//                            Dubai Municipality + DDA on plot
//                            schematics. lon_0 = 55.333° E.
//   • UTM40N (EPSG:32640)  — UTM Zone 40 North. Rest of UAE (Sharjah,
//                            Abu Dhabi, RAK, etc) engineering plans.
//                            lon_0 = 57° E.
//
// ⚠ EXPLICIT USER CHOICE — never auto-detect. The Capital 6 disaster
// (2026-05-31) was caused by guessing UTM40N when the document was
// in DLTM; the plot landed 200 km in the Gulf of Oman. The
// CoordsEntry UI defaults the dropdown by emirate (D1) but the user
// MUST be able to override.
//
// proj4 is already a platform dependency (used by
// scripts/seed-6458042.ts to register EPSG:3997 against the same
// proj-string we register here).

import proj4 from "proj4";

export type ProjectionKey = "WGS84" | "DLTM" | "UTM40N";

/** UI metadata for the projection dropdown. */
export interface ProjectionMeta {
  key: ProjectionKey;
  label: string;
  hint: string;
}

export const PROJECTIONS: ProjectionMeta[] = [
  {
    key: "WGS84",
    label: "WGS84 (lat, lng)",
    hint: "Decimal degrees from Google Maps or phone GPS. Recommended when in doubt.",
  },
  {
    key: "DLTM",
    label: "Dubai Local TM (EPSG:3997)",
    hint: "Dubai Municipality / DDA plot schematics. Central meridian 55.333° E.",
  },
  {
    key: "UTM40N",
    label: "UTM Zone 40N (EPSG:32640)",
    hint: "Sharjah / Abu Dhabi / RAK engineering plans. Central meridian 57° E.",
  },
];

/** Default projection for a given emirate (founder D1). User can
 *  always override in the UI. */
export function defaultProjectionForEmirate(
  emirate: string | null | undefined,
): ProjectionKey {
  if (!emirate) return "WGS84";
  const e = emirate.toUpperCase();
  if (e === "DUBAI") return "DLTM";
  if (
    e === "SHARJAH" ||
    e === "ABU_DHABI" ||
    e === "ABUDHABI" ||
    e === "RAK" ||
    e === "AJMAN" ||
    e === "UAQ" ||
    e === "FUJAIRAH"
  ) {
    return "UTM40N";
  }
  return "WGS84";
}

// Idempotent — repeated calls are cheap and safe. proj4 stores defs
// in a global map keyed by name.
let registered = false;
export function registerProjections(): void {
  if (registered) return;
  // Dubai Local Transverse Mercator. Identical proj-string to the one
  // scripts/seed-6458042.ts uses (verified against the Capital 6
  // schematic on 2026-05-31).
  proj4.defs(
    "EPSG:3997",
    "+proj=tmerc +lat_0=0 +lon_0=55.33333333333334 +k=1 +x_0=500000 +y_0=0 +ellps=WGS84 +units=m +no_defs",
  );
  // UTM Zone 40 North. proj4 ships a built-in for utm but registering
  // explicitly keeps the def stable across versions.
  proj4.defs(
    "EPSG:32640",
    "+proj=utm +zone=40 +ellps=WGS84 +datum=WGS84 +units=m +no_defs",
  );
  // EPSG:4326 (WGS84) is built into proj4 — no registration needed.
  registered = true;
}

/**
 * Convert one or more raw points from the chosen projection to WGS84
 * lat/lng. For WGS84 input the points pass through with the
 * (lat, lng) → (lng, lat) swap so the output matches GeoJSON
 * convention ([lng, lat]).
 *
 *   pointsIn = [[a, b], [a, b], …]
 *
 * For WGS84  : a = lat, b = lng (decimal degrees).
 * For DLTM   : a = X easting (m), b = Y northing (m).
 * For UTM40N : a = X easting (m), b = Y northing (m).
 *
 * Output is always GeoJSON-style [lng, lat] pairs.
 */
export function convertToWgs84(
  pointsIn: ReadonlyArray<readonly [number, number]>,
  from: ProjectionKey,
): Array<[number, number]> {
  registerProjections();

  if (from === "WGS84") {
    // User typed "lat, lng" (the textarea convention). Swap to
    // GeoJSON's [lng, lat].
    return pointsIn.map(([lat, lng]) => [lng, lat] as [number, number]);
  }

  const srcEpsg = from === "DLTM" ? "EPSG:3997" : "EPSG:32640";
  const transform = proj4(srcEpsg, "EPSG:4326");
  return pointsIn.map(([x, y]) => {
    const [lng, lat] = transform.forward([x, y]);
    return [lng, lat] as [number, number];
  });
}

/**
 * Centroid of a list of [lng, lat] pairs. Simple arithmetic mean —
 * good enough for sanity-checking which emirate the polygon lands in.
 */
export function meanCentroid(
  pts: ReadonlyArray<readonly [number, number]>,
): [number, number] | null {
  if (pts.length === 0) return null;
  let sumLng = 0;
  let sumLat = 0;
  for (const [lng, lat] of pts) {
    sumLng += lng;
    sumLat += lat;
  }
  return [sumLng / pts.length, sumLat / pts.length];
}

/** Approximate UAE bounding box for the "is the polygon in the UAE
 *  at all" sanity check. Covers all seven emirates with a generous
 *  margin. If the centroid lands outside this box the projection
 *  selector is almost certainly wrong. */
export const UAE_BBOX = {
  minLng: 51.0,
  maxLng: 56.5,
  minLat: 22.5,
  maxLat: 26.5,
} as const;

/** Per-emirate approximate centre — used by the Capital-6 sanity
 *  check to flag a projection misfire ("centroid 500 km from Dubai —
 *  wrong projection?"). */
export const EMIRATE_CENTRES: Record<string, [number, number]> = {
  DUBAI: [55.2708, 25.2048],
  ABU_DHABI: [54.3773, 24.4539],
  ABUDHABI: [54.3773, 24.4539],
  SHARJAH: [55.4209, 25.3463],
  AJMAN: [55.4781, 25.4052],
  UAQ: [55.5544, 25.5641],
  RAK: [55.9748, 25.7895],
  FUJAIRAH: [56.3265, 25.1288],
};

/** Great-circle distance in km between two [lng, lat] points
 *  (Haversine). Used by the sanity check. */
export function haversineKm(
  a: readonly [number, number],
  b: readonly [number, number],
): number {
  const R = 6371; // km
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}
