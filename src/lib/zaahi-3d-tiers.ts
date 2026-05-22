// ZAAHI Signature 3D — tier emission helper.
//
// Pure functions that take a plot polygon + optional AffectionPlan-style
// fields, and emit the podium / body / crown tier rings used by the
// `fill-extrusion` layers on the map. Logic mirrors `loadZaahiPlots` in
// src/app/parcels/map/page.tsx; the public Parcel renderer keeps its own
// inline copy for now (deliberate, to avoid touching the working path).
//
// Consumers: `loadVaultMine` / `loadVaultShared` for DDA-resolved vault
// entries. Non-DDA entries use a single flat tier (see emitFlatTier).

const FLOOR_H = 3.5;          // metres per floor (founder spec)
const PODIUM_TOP = 14;        // first 4 floors = podium
const CROWN_H = 7;            // top 2 floors = crown
const SMALL_PLOT_BYPASS = 5000; // sqft — skip setback inset for small plots

export type SetbackEntry = { side: number; building: number | null; podium: number | null };

export interface TierEmitInput {
  /** Full plot polygon. The OUTER ring is used as the starting plotRing. */
  plotPolygon: GeoJSON.Polygon;
  /** UPPER_SNAKE_CASE land-use category. Drives default setback + default height. */
  landUse: string | null;
  /** Optional sqft area. Below SMALL_PLOT_BYPASS the building fills the plot. */
  areaSqft?: number | null;
  /**
   * Explicit building-limit polygon (DDA layer 8). If supplied, used as the
   * building footprint directly — no setback inset is applied.
   */
  buildingLimitGeometry?: GeoJSON.Polygon | null;
  /** Setbacks JSON. Mean non-zero `building` value is used as the inset. */
  setbacks?: SetbackEntry[] | null;
  /** Override height in metres. */
  maxHeightMeters?: number | null;
  /** Override floor count (height = floors × FLOOR_H). */
  maxFloors?: number | null;
  /**
   * Sub-category from landUseMix (e.g. "villa" / "townhouse"). Used to refine
   * residential setback defaults.
   */
  landUseSub?: string | null;
  /** "FLAT" forces single-block render; default null/"SIGNATURE" tiers. */
  buildingStyle?: string | null;
}

export interface Tier {
  ring: number[][];
  baseMeters: number;
  topMeters: number;
}

/** Default setback (m) per land-use when AffectionPlan doesn't supply one. */
export function defaultSetbackMeters(landUse: string | null, landUseSub: string | null): number {
  if (!landUse) return 4;
  const sub = (landUseSub ?? "").toLowerCase();
  switch (landUse) {
    case "RESIDENTIAL":
      if (sub.includes("villa") || sub.includes("townhouse")) return 3;
      return 4;
    case "COMMERCIAL":
    case "RETAIL":
      return 0;
    case "HOTEL":
    case "HOSPITALITY":
      return 3;
    case "INDUSTRIAL":
    case "WAREHOUSE":
      return 4;
    case "EDUCATIONAL":
    case "EDUCATION":
    case "HEALTHCARE":
      return 5;
    case "AGRICULTURAL":
    case "AGRICULTURE":
      return 10;
    case "MIXED_USE":
      return 4;
    case "FUTURE_DEVELOPMENT":
    case "FUTURE DEVELOPMENT":
      return 0;
    default:
      return 4;
  }
}

/** Mean of non-zero `building` setback values; falls back to default. */
export function computeSetbackMeters(
  areaSqft: number | null | undefined,
  landUse: string | null,
  setbacks: SetbackEntry[] | null | undefined,
  landUseSub: string | null,
): number {
  if (typeof areaSqft === "number" && areaSqft < SMALL_PLOT_BYPASS) return 0;
  if (setbacks && setbacks.length > 0) {
    const nonZero = setbacks
      .map((s) => s.building)
      .filter((v): v is number => typeof v === "number" && v > 0);
    if (nonZero.length > 0) {
      return nonZero.reduce((a, b) => a + b, 0) / nonZero.length;
    }
  }
  return defaultSetbackMeters(landUse, landUseSub);
}

/** Inset a polygon ring by `meters` toward its centroid. Uniform shrink. */
export function insetRingByMeters(ring: number[][], meters: number): number[][] {
  if (meters <= 0 || ring.length < 3) return ring;
  const cx = ring.reduce((s, p) => s + p[0], 0) / ring.length;
  const cy = ring.reduce((s, p) => s + p[1], 0) / ring.length;
  const latM = meters / 111_320;
  const lngM = meters / (111_320 * Math.cos((cy * Math.PI) / 180));
  return ring.map(([lng, lat]) => {
    const dx = lng - cx;
    const dy = lat - cy;
    const dist = Math.hypot(dx, dy);
    if (dist === 0) return [lng, lat];
    // Approximate inset: shrink each radial by inset/avgRadius. Good enough
    // at plot scale (≤ 100 m). For tiny plots this can over-shrink, hence
    // the SMALL_PLOT_BYPASS guard upstream.
    const avgRadialM = Math.hypot(dx / lngM, dy / latM);
    const scale = Math.max(0.05, (avgRadialM - meters) / avgRadialM);
    return [cx + dx * scale, cy + dy * scale];
  });
}

/** Uniform scale toward centroid, scale ∈ [0,1]. */
export function scaleRingFromCentroid(ring: number[][], scale: number): number[][] {
  if (ring.length < 3) return ring;
  const cx = ring.reduce((s, p) => s + p[0], 0) / ring.length;
  const cy = ring.reduce((s, p) => s + p[1], 0) / ring.length;
  return ring.map(([lng, lat]) => [
    cx + (lng - cx) * scale,
    cy + (lat - cy) * scale,
  ]);
}

/** Resolve total building height (m) from plan fields + land-use defaults. */
export function resolveTotalHeightMeters(input: TierEmitInput): number {
  if (input.maxHeightMeters && input.maxHeightMeters > 0) return input.maxHeightMeters;
  if (input.maxFloors && input.maxFloors > 0) return input.maxFloors * FLOOR_H;
  // Per-land-use fallback (metres). Matches loadZaahiPlots defaults.
  const lu = input.landUse ?? "";
  return lu === "RESIDENTIAL"  ? 15 :
         lu === "COMMERCIAL"   ? 30 :
         lu === "MIXED_USE"    ? 40 :
         lu === "HOTEL"        ? 50 :
         lu === "HOSPITALITY"  ? 50 :
         lu === "INDUSTRIAL"   ? 12 :
         lu === "WAREHOUSE"    ? 12 :
         lu === "EDUCATIONAL"  ? 12 :
         lu === "EDUCATION"    ? 12 :
         lu === "HEALTHCARE"   ? 18 :
         lu === "AGRICULTURAL" ?  6 :
         lu === "AGRICULTURE"  ?  6 :
         lu === "FUTURE_DEVELOPMENT" ? 16 :
         lu === "FUTURE DEVELOPMENT" ? 16 :
         20;
}

/**
 * Emit the ZAAHI Signature tiers for one plot.
 *
 * 1 tier (podium only)            if floors ≤ 4 OR buildingStyle === "FLAT".
 * 2 tiers (podium + body)         if 5 ≤ floors ≤ 10.
 * 3 tiers (podium + body + crown) if floors > 10.
 *
 * All tiers share the building footprint (plot polygon insetted by setback,
 * or the DDA buildingLimitGeometry when supplied) and the body/crown are
 * scaled toward the footprint centroid.
 */
export function emitSignatureTiers(input: TierEmitInput): Tier[] {
  const plotRing = input.plotPolygon.coordinates[0];

  // 1) Resolve footprint ring.
  let footprintRing: number[][];
  if (input.buildingLimitGeometry?.type === "Polygon") {
    footprintRing = input.buildingLimitGeometry.coordinates[0];
  } else {
    const setbackM = computeSetbackMeters(
      input.areaSqft ?? null,
      input.landUse,
      input.setbacks ?? null,
      input.landUseSub ?? null,
    );
    footprintRing = insetRingByMeters(plotRing, setbackM);
  }

  // 2) Resolve total height.
  const totalH = resolveTotalHeightMeters(input);

  // 3) Tier strategy.
  const floors = Math.max(1, Math.round(totalH / FLOOR_H));
  const forceFlat =
    input.buildingStyle === "FLAT" ||
    input.landUse === "FUTURE_DEVELOPMENT" ||
    input.landUse === "FUTURE DEVELOPMENT";

  if (forceFlat || floors <= 4) {
    return [{ ring: footprintRing, baseMeters: 0, topMeters: totalH }];
  }
  if (floors <= 10) {
    return [
      { ring: footprintRing, baseMeters: 0, topMeters: PODIUM_TOP },
      { ring: scaleRingFromCentroid(footprintRing, 0.7), baseMeters: PODIUM_TOP, topMeters: totalH },
    ];
  }
  return [
    { ring: footprintRing, baseMeters: 0, topMeters: PODIUM_TOP },
    { ring: scaleRingFromCentroid(footprintRing, 0.7), baseMeters: PODIUM_TOP, topMeters: totalH - CROWN_H },
    { ring: scaleRingFromCentroid(footprintRing, 0.5), baseMeters: totalH - CROWN_H, topMeters: totalH },
  ];
}

/** Single flat tier (used for non-DDA polygon entries and placeholders). */
export function emitFlatTier(plotPolygon: GeoJSON.Polygon, heightMeters: number): Tier[] {
  return [{ ring: plotPolygon.coordinates[0], baseMeters: 0, topMeters: heightMeters }];
}
