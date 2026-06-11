// ZAAHI Signature — geometry & tier math.
//
// 2026-06-11 (Stage 1 of feat/signature-realistic). Extracted from
// src/app/parcels/map/page.tsx where these helpers lived inline at
// page.tsx:3076-3164 and as closures inside loadZaahiPlots
// (page.tsx:3365-3431). The goal of Stage 1 is to move the math
// out, not change it — the prod render must stay pixel-identical.
//
// Future stages (Three.js CustomLayer + procedural facade shaders)
// consume the same Tier output as the current fill-extrusion path.
// One source of truth for "where does ring → tier come from".
//
// NB. src/lib/zaahi-3d-tiers.ts contains an INDEPENDENT, slightly
// different port of the same concept used by the vault rendering
// paths (loadVaultMine / loadVaultShared). Its `insetRingByMeters`
// uses a centroid-distance averaging algorithm; this module uses
// bbox-half-width, matching the prod ZAAHI listings render. The
// two are intentionally NOT unified here — vault geometry is left
// untouched for this whole migration (founder spec 2026-06-11).
// SIG-FINAL: revisit unification when Signature-realistic ships.

// ── Constants ─────────────────────────────────────────────────────

/** Metres per floor — founder spec 2026-04-12. */
export const FLOOR_H = 3.5;

/** Podium top in metres = first 4 floors. */
export const PODIUM_TOP = 14;

/** Crown height in metres = last 2 floors. */
export const CROWN_H = 7;

/** sqft threshold below which we skip the setback inset — tiny plots
 *  (villa/townhouse on a 4500 sqft lot) would otherwise shrink to a
 *  matchbox after an N-metre uniform inset. */
export const SMALL_PLOT_BYPASS_SQFT = 5000;

// ── Setback rules ─────────────────────────────────────────────────

/** Land-use defaults when DDA's AffectionPlan supplies no
 *  per-plot setback data. Spec lives in CLAUDE.md
 *  "Правила 3D моделей (ZAAHI Signature)". */
export function defaultSetbackM(landUse: string | null, sub: string | null): number {
  if (!landUse) return 5;
  switch (landUse) {
    case "RESIDENTIAL":
      // Villas / townhouses: 3 m all around. Apartments: 5 m road
      // + 3 m sides → ~4 m representative for a uniform inset.
      if (sub && /villa|townhouse|town\s*house/i.test(sub)) return 3;
      return 4;
    case "COMMERCIAL":
    case "OFFICE":
    case "RETAIL":
      return 0; // commercial fills the plot edge to edge
    case "HOTEL":
    case "HOSPITALITY":
      return 3;
    case "INDUSTRIAL":
    case "WAREHOUSE":
      return 4;
    case "FUTURE_DEVELOPMENT":
    case "FUTURE DEVELOPMENT":
      // Follow the INDUSTRIAL pattern: 4 m inset. Visually produces
      // one near-plot-sized block, same treatment founder ratified
      // 2026-04-23 for FUTURE_DEVELOPMENT plots.
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
    default:
      return 5;
  }
}

/** Setbacks entry as it ships in the AffectionPlan JSON blob. */
export interface SetbackEntry {
  side: number;
  building: number | null;
  podium: number | null;
}

/**
 * Pick the metres value to use for inset. Prefer DDA's affection-plan
 * setbacks (most specific), fall back to land-use defaults, and bypass
 * inset entirely for very small plots.
 */
export function computeSetbackM(
  plotSqft: number,
  landUse: string | null,
  setbacks: SetbackEntry[] | null,
  sub: string | null,
): number {
  // Tiny plots — building fills the boundary, no setback.
  if (plotSqft > 0 && plotSqft < SMALL_PLOT_BYPASS_SQFT) return 0;

  if (setbacks && setbacks.length > 0) {
    const vals = setbacks
      .map((s) => s.building ?? s.podium ?? 0)
      .filter((v) => v > 0);
    if (vals.length > 0) {
      return vals.reduce((a, b) => a + b, 0) / vals.length;
    }
  }
  return defaultSetbackM(landUse, sub);
}

// ── Ring transforms ───────────────────────────────────────────────

/**
 * Inset a polygon ring uniformly toward its centroid by `setbackM`
 * metres. Caps the resulting scale at 0.5 so very deep setbacks on
 * small plots still produce a visible building. setbackM <= 0 returns
 * the ring unchanged (used for the small-plot bypass + commercial).
 *
 * Algorithm: bbox half-width based. Scale factor = clamp(1 - setbackM
 * / halfWidthM, 0.5, 1) applied to every vertex relative to the
 * centroid. The bbox is computed once in metres via 111000 × cos(lat)
 * (lng) and 111000 (lat).
 */
export function insetRingByMeters(ring: number[][], setbackM: number): number[][] {
  if (setbackM <= 0) return ring;
  const lngs = ring.map((p) => p[0]);
  const lats = ring.map((p) => p[1]);
  const midLat = (Math.max(...lats) + Math.min(...lats)) / 2;
  const dLng =
    (Math.max(...lngs) - Math.min(...lngs)) *
    111000 *
    Math.cos((midLat * Math.PI) / 180);
  const dLat = (Math.max(...lats) - Math.min(...lats)) * 111000;
  const halfWidth = Math.min(dLng, dLat) / 2;
  if (halfWidth <= 0) return ring;
  const scale = Math.max(0.5, 1 - setbackM / halfWidth);
  const cLng = ring.reduce((s, p) => s + p[0], 0) / ring.length;
  const cLat = ring.reduce((s, p) => s + p[1], 0) / ring.length;
  return ring.map(([lng, lat]) => [
    cLng + (lng - cLng) * scale,
    cLat + (lat - cLat) * scale,
  ]);
}

/**
 * Uniform scale toward the ring's centroid. `scale ∈ (0, 1]`. Used
 * to produce the body (0.7×) and crown (0.5×) tier rings from the
 * podium footprint.
 */
export function scaleRingFromCentroid(ring: number[][], scale: number): number[][] {
  if (ring.length < 3) return ring;
  const cx = ring.reduce((s, p) => s + p[0], 0) / ring.length;
  const cy = ring.reduce((s, p) => s + p[1], 0) / ring.length;
  return ring.map(([lng, lat]) => [
    cx + (lng - cx) * scale,
    cy + (lat - cy) * scale,
  ]);
}

// ── Tier composition ──────────────────────────────────────────────

/** A single fill-extrusion (or Three.js mesh) tier. baseM/topM in
 *  metres above ground. */
export interface Tier {
  ring: number[][];
  baseM: number;
  topM: number;
}

/** Floor count from total building height (m), clamped to ≥1. */
export function computeFloors(totalH: number): number {
  return Math.max(1, Math.round(totalH / FLOOR_H));
}

/**
 * Emit 1, 2 or 3 ZAAHI Signature tiers for one building.
 *
 *   forceFlat OR floors ≤ 4 → 1 tier (podium only, 0 → totalH)
 *   5 ≤ floors ≤ 10         → 2 tiers (podium 0 → 14, body 14 → totalH)
 *   floors ≥ 11             → 3 tiers (podium 0 → 14,
 *                                      body   14 → totalH − 7,
 *                                      crown  totalH − 7 → totalH)
 *
 * All tiers share the same input footprint ring (caller is
 * responsible for already-inset footprintRing). Body uses 0.7× scale
 * relative to footprint centroid; crown uses 0.5×.
 */
export function emitSignatureTiers(
  footprintRing: number[][],
  totalH: number,
  opts: { forceFlat?: boolean } = {},
): Tier[] {
  const forceFlat = !!opts.forceFlat;
  const floors = computeFloors(totalH);

  if (forceFlat || floors <= 4) {
    return [{ ring: footprintRing, baseM: 0, topM: totalH }];
  }
  if (floors <= 10) {
    return [
      { ring: footprintRing, baseM: 0, topM: PODIUM_TOP },
      { ring: scaleRingFromCentroid(footprintRing, 0.7), baseM: PODIUM_TOP, topM: totalH },
    ];
  }
  return [
    { ring: footprintRing, baseM: 0, topM: PODIUM_TOP },
    { ring: scaleRingFromCentroid(footprintRing, 0.7), baseM: PODIUM_TOP, topM: totalH - CROWN_H },
    { ring: scaleRingFromCentroid(footprintRing, 0.5), baseM: totalH - CROWN_H, topM: totalH },
  ];
}
