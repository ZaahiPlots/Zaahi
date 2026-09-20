// Land-use legend — APPROVED by founder 2026-04-11. NEVER change without
// explicit founder approval. 9 canonical categories. The exact same set
// is duplicated in three other places that MUST stay in sync:
//   - the inline `buildingColor` match expression in loadZaahiPlots
//     (drives the 3D fill-extrusion + outline)
//   - LANDUSE_COLORS in src/app/parcels/map/SidePanel.tsx
//     (the indicator dot in the side-panel land-use list)
//   - LAND_USE_LEGEND in this file (the visible legend popup)
// Source-of-truth in CLAUDE.md "Цвета по Land Use".
export const ZAAHI_LANDUSE_COLOR: Record<string, string> = {
  RESIDENTIAL: "#2D6A4F",         // green
  COMMERCIAL: "#1B3A5C",          // navy
  MIXED_USE: "#6B4C9A",           // purple
  HOTEL: "#E8732A",               // carrot orange (founder 2026-06-15)
  HOSPITALITY: "#E8732A",         // carrot orange (alias)
  INDUSTRIAL: "#495057",          // gray
  WAREHOUSE: "#495057",           // gray (alias)
  EDUCATIONAL: "#0077B6",         // sky blue
  EDUCATION: "#0077B6",           // sky blue (alias)
  HEALTHCARE: "#E63946",          // bright red
  AGRICULTURAL: "#606C38",        // olive
  AGRICULTURE: "#606C38",         // olive (alias)
  FUTURE_DEVELOPMENT: "#A8926E",  // sandstone (warm earth · distinct from gold brand colour)
  "FUTURE DEVELOPMENT": "#A8926E",
  // 10th category — added 2026-06-03 (founder approval — was 9). Covers
  // AD primaryUse="Investment" plots (off-plan / planned land) that
  // would otherwise stay invisible under any land-use filter. Strategy
  // B (safe): only plots that don't already match another category via
  // devCategory fallback flip to INVESTMENT, so no plot recolours.
  INVESTMENT: "#14B8A6",          // teal (finance signal · distinct from all 9 above)
};
export const ZAAHI_DEFAULT_COLOR = "#C8A96E"; // brand gold — used for the outline of unknown-land-use plots only

/**
 * Maps a DDA affection-plan landUseMix (or a free-form mainLandUse string)
 * into one of the 9 ZAAHI canonical categories. Returns `null` when DDA
 * has no land-use information at all — callers should render the parcel
 * as outline-only with no 3D extrusion in that case.
 *
 * Categories (founder-approved 2026-04-11):
 *   RESIDENTIAL · COMMERCIAL · MIXED_USE · HOTEL · INDUSTRIAL ·
 *   EDUCATIONAL · HEALTHCARE · AGRICULTURAL · FUTURE_DEVELOPMENT
 *
 * Mapping is case-insensitive `contains` against category + sub strings.
 * Multiple distinct categories in `mix` always collapse to MIXED_USE.
 */
export function deriveLandUse(
  mix: Array<{ category: string; sub?: string | null }> | null | undefined,
): string | null {
  if (!mix || mix.length === 0) return null;

  // Map a single string to one of the 9 canonical categories.
  const categorize = (s: string): string | null => {
    const l = s.toLowerCase();
    if (/residential|villa|townhouse|\bapartment\b/.test(l)) return "RESIDENTIAL";
    if (/commercial|office|retail|showroom|\bcbd\b/.test(l)) return "COMMERCIAL";
    if (/hotel|hospitality|resort|serviced\s*apartment/.test(l)) return "HOTEL";
    if (/industrial|warehouse|factory|logistics|storage/.test(l)) return "INDUSTRIAL";
    if (/educat|school|university|academy|nursery/.test(l)) return "EDUCATIONAL";
    if (/health|hospital|clinic|medical/.test(l)) return "HEALTHCARE";
    if (/agricult|\bfarm\b/.test(l)) return "AGRICULTURAL";
    if (/future\s*development/.test(l)) return "FUTURE_DEVELOPMENT";
    return null;
  };

  // Step 1: For each entry, determine its mapped category from category + sub.
  const uniqueCats = new Set<string>();
  for (const u of mix) {
    const fromCat = categorize(u.category || "");
    const fromSub = categorize(u.sub || "");
    if (fromCat) uniqueCats.add(fromCat);
    if (fromSub) uniqueCats.add(fromSub);
  }

  // Step 2: 2+ different mapped categories → Mixed Use.
  if (uniqueCats.size > 1) return "MIXED_USE";

  // Step 3: Exactly 1 category → return it.
  if (uniqueCats.size === 1) return [...uniqueCats][0];

  return null;
}
