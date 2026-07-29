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
  /**
   * Land-use ARCHETYPE massing (research/landuse-archetypes, founder concept
   * 2026-06-13). When true, the silhouette is shaped per land-use type
   * (hotel = tower+stylobate, residential = stepped terraces, educational =
   * horizontal slab, …) instead of the uniform podium/body/crown by floor
   * count. Default false → identical legacy behaviour (prod + vault unchanged).
   * Colour, opacity, setbacks and the inside-the-plot invariant are untouched —
   * only tier rings + height splits change.
   */
  archetype?: boolean;
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

const STYLOBATE_H = 7; // hotel/commercial podium base (~2 floors)

/**
 * Default podium / body / crown tiers by floor count (the legacy ZAAHI
 * Signature massing). Used directly when `archetype` is off, and as the
 * MIXED_USE + fallback profile when archetype massing is on.
 */
function emitDefaultTiers(footprintRing: number[][], totalH: number): Tier[] {
  const floors = Math.max(1, Math.round(totalH / FLOOR_H));
  if (floors <= 4) return [{ ring: footprintRing, baseMeters: 0, topMeters: totalH }];
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

/**
 * Land-use ARCHETYPE massing (founder concept 2026-06-13). The plot's
 * canonical colour, opacity and footprint setback are unchanged — only the
 * tier rings + height splits change so the SILHOUETTE reads as the land-use
 * TYPE. Every tier ring is `footprintRing` scaled toward its own centroid, so
 * all tiers stay strictly inside the plot building footprint (the CLAUDE.md
 * inside-the-plot invariant holds for free).
 *
 * | land use            | silhouette rule                                  |
 * |---------------------|--------------------------------------------------|
 * | HOTEL/HOSPITALITY   | narrow tower (0.42) on a wide low stylobate       |
 * | COMMERCIAL/RETAIL   | sheer curtain-wall prism + thin parapet crown     |
 * | INVESTMENT          | (AD off-plan) → commercial sheer tower            |
 * | RESIDENTIAL         | stepped terraces, step count scales with height   |
 * | MIXED_USE           | retail podium + tower (+crown) — reference massing |
 * | HEALTHCARE          | compact: inset base block + smaller upper block    |
 * | EDUCATIONAL         | horizontal low-rise: single full-footprint slab    |
 * | INDUSTRIAL/WAREHOUSE| low long block: single full-footprint slab         |
 * | AGRICULTURAL        | barn: single low block (large setback upstream)    |
 * | (unknown)           | default podium/body/crown by floor count           |
 */
export function emitArchetypeTiers(
  footprintRing: number[][],
  totalH: number,
  landUse: string | null,
): Tier[] {
  const lu = (landUse ?? "").toUpperCase();
  const S = (scale: number) => scaleRingFromCentroid(footprintRing, scale);

  // True-centroid scaler (excludes the duplicated closing vertex, which skews
  // the naive sum/length centroid ~10% on simple rings). Proportional, so it
  // is collapse-safe on narrow plots and stays nested → used by the terraced /
  // stepped archetypes that must read cleanly and stay centred.
  const closed =
    footprintRing.length > 1 &&
    footprintRing[0][0] === footprintRing[footprintRing.length - 1][0] &&
    footprintRing[0][1] === footprintRing[footprintRing.length - 1][1];
  const uniq = closed ? footprintRing.slice(0, -1) : footprintRing;
  const tcx = uniq.reduce((s, p) => s + p[0], 0) / uniq.length;
  const tcy = uniq.reduce((s, p) => s + p[1], 0) / uniq.length;
  const Sc = (scale: number): number[][] =>
    footprintRing.map(([x, y]) => [tcx + (x - tcx) * scale, tcy + (y - tcy) * scale]);

  switch (lu) {
    case "HOTEL":
    case "HOSPITALITY": {
      const podiumH = Math.min(STYLOBATE_H, totalH * 0.3);
      return [
        { ring: footprintRing, baseMeters: 0, topMeters: podiumH },
        { ring: S(0.42), baseMeters: podiumH, topMeters: totalH },
      ];
    }
    case "COMMERCIAL":
    case "RETAIL":
    case "INVESTMENT": {
      const parapet = Math.max(totalH * 0.6, totalH - 3);
      return [
        { ring: footprintRing, baseMeters: 0, topMeters: parapet },
        { ring: S(0.94), baseMeters: parapet, topMeters: totalH },
      ];
    }
    case "RESIDENTIAL": {
      // Clean stepped terraces / balcony bands. Gentle proportional setbacks
      // from the TRUE centroid → tiers stay nested + centred and never collapse
      // on narrow plots. Step count scales with height.
      const floors = Math.max(1, Math.round(totalH / FLOOR_H));
      const scales =
        floors > 30 ? [1.0, 0.88, 0.76, 0.64] :
        floors > 22 ? [1.0, 0.85, 0.70] :
        floors > 10 ? [1.0, 0.80] :
                      [1.0];
      const band = totalH / scales.length;
      return scales.map((sc, i) => ({
        ring: i === 0 ? footprintRing : Sc(sc),
        baseMeters: i * band,
        topMeters: (i + 1) * band,
      }));
    }
    case "HEALTHCARE": {
      // Compact clean massing: full-footprint base + a smaller upper block
      // scaled from the TRUE centroid, so it sits squarely centred on the base.
      const split = totalH * 0.6;
      return [
        { ring: footprintRing, baseMeters: 0, topMeters: split },
        { ring: Sc(0.78), baseMeters: split, topMeters: totalH },
      ];
    }
    case "EDUCATIONAL":
    case "EDUCATION":
    case "INDUSTRIAL":
    case "WAREHOUSE":
    case "AGRICULTURAL":
    case "AGRICULTURE":
      // Horizontal / low single full-footprint slab. Height stays honest
      // (resolveTotalHeightMeters already gives these types low defaults).
      return [{ ring: footprintRing, baseMeters: 0, topMeters: totalH }];
    case "MIXED_USE": {
      // Multifunctional read: generous retail podium + tower body +
      // PRONOUNCED crown setback. Deliberately distinct from the COMMERCIAL
      // sheer prism (which is full-footprint with only a thin parapet).
      const floors = Math.max(1, Math.round(totalH / FLOOR_H));
      if (floors <= 4) return [{ ring: footprintRing, baseMeters: 0, topMeters: totalH }];
      const podiumTop = Math.min(totalH * 0.22, 18);
      const crownH = Math.max(totalH * 0.18, 10);
      const bodyTop = Math.max(podiumTop + 1, totalH - crownH);
      return [
        { ring: footprintRing, baseMeters: 0, topMeters: podiumTop },
        { ring: Sc(0.66), baseMeters: podiumTop, topMeters: bodyTop },
        { ring: Sc(0.42), baseMeters: bodyTop, topMeters: totalH },
      ];
    }
    default:
      return emitDefaultTiers(footprintRing, totalH);
  }
}

/**
 * Emit the ZAAHI Signature tiers for one plot.
 *
 * 1 tier (podium only)            if floors ≤ 4 OR buildingStyle === "FLAT".
 * 2 tiers (podium + body)         if 5 ≤ floors ≤ 10.
 * 3 tiers (podium + body + crown) if floors > 10.
 *
 * When `input.archetype` is true, the per-floor tiering is replaced by
 * per-land-use archetype massing (see emitArchetypeTiers). forceFlat plots
 * (FLAT style / FUTURE_DEVELOPMENT) keep the single flat block either way.
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

  if (forceFlat) {
    return [{ ring: footprintRing, baseMeters: 0, topMeters: totalH }];
  }

  // Archetype massing (opt-in). Replaces per-floor tiering with per-land-use
  // silhouette rules. Default off → legacy path below unchanged.
  if (input.archetype) {
    return emitArchetypeTiers(footprintRing, totalH, input.landUse);
  }

  if (floors <= 4) {
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
