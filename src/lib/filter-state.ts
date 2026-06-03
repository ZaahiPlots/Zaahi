// Filter state — Wave 2 (Filter Panel, 2026-06-02).
//
// Single source of truth for the map's filter parameters. Shared by
// page.tsx (lives in React.useState there, mirrored into refs for the
// build*Filter() functions) and FilterPanel.tsx (reads + writes via
// props). Archie's existing filter_by_land_use / filter_by_status
// tools translate through the helpers here so the panel UI never has
// to think in raw ParcelStatus or CONSTRUCTION_STATUS vocabularies.

/**
 * Unified status chips a realtor actually sees in the panel. Each chip
 * maps to BOTH ZAAHI ParcelStatus values (114 listings) AND raw DDA
 * CONSTRUCTION_STATUS values (461K PMTiles registry). The two-side
 * mapping handles the gap where some chips only make sense on one side
 * (e.g. "Built" only exists in DDA — listings have no "completed
 * building" status orthogonal to the listing lifecycle).
 */
export type UnifiedStatus =
  | "VACANT"
  | "IN_DEAL"
  | "SOLD"
  | "BUILT"
  | "UNDER_CONSTRUCTION"
  | "PRE_CONSTRUCTION"
  | "SUSPENDED";

/** Min/max range for a slider-driven filter. */
export interface NumberRange {
  min: number;
  max: number;
}

/** Complete filter state read by build*Filter(). */
export interface FilterState {
  /** Land-use category multi-select. Empty = no land-use constraint.
   *  Values are the 9 canonical ZAAHI categories (RESIDENTIAL,
   *  COMMERCIAL, MIXED_USE, HOTEL, INDUSTRIAL, EDUCATIONAL, HEALTHCARE,
   *  AGRICULTURAL, FUTURE_DEVELOPMENT). */
  landUse: string[];
  /** Status multi-select (unified UI chips). */
  unifiedStatus: UnifiedStatus[];
  /** Plot area range in sqft. null = no area constraint. */
  areaRange: NumberRange | null;
  /** GFA range in sqft. null = no GFA constraint. */
  gfaRange: NumberRange | null;
  /** FAR range 0–10. null = no FAR constraint. */
  farRange: NumberRange | null;
  /** Price range in AED. Listings-only filter. null = no constraint. */
  priceRange: NumberRange | null;
  /** District multi-select. Listings-only filter (PMTiles tiles don't
   *  carry district name — would require a tile re-bake to support). */
  districts: string[];
}

/** Default empty state — produces byte-identical filter output to the
 *  pre-panel build*Filter() path (Wave 1). */
export const EMPTY_FILTER_STATE: FilterState = {
  landUse: [],
  unifiedStatus: [],
  areaRange: null,
  gfaRange: null,
  farRange: null,
  priceRange: null,
  districts: [],
};

/**
 * Unified status → ZAAHI ParcelStatus values to match.
 *
 * BUILT / UNDER_CONSTRUCTION map to empty arrays on the ZAAHI side
 * because listings have no "construction-stage" semantic (status
 * tracks the listing lifecycle). When the panel selects ONLY those
 * chips, the union below is empty — the helper toZaahiStatusList
 * returns null → buildZaahiFilter pushes ["literal", false] → all
 * listings hidden. That's the correct outcome: realtor asked for
 * "built buildings" — listings don't model that, so the layer hides.
 */
export const UNIFIED_STATUS_TO_ZAAHI: Record<UnifiedStatus, string[]> = {
  VACANT: ["LISTED", "VERIFIED"],
  IN_DEAL: ["IN_DEAL"],
  SOLD: ["SOLD"],
  BUILT: [],
  UNDER_CONSTRUCTION: [],
  PRE_CONSTRUCTION: [],
  SUSPENDED: [],
};

/**
 * Unified status → raw PMTiles status strings. Covers DDA's
 * CONSTRUCTION_STATUS vocabulary AND AD's Construction_Status
 * vocabulary in one list per chip — the filter uses ["in", "status",
 * literal[]] so a single value-match against either taxonomy resolves
 * the row. Empty array on a chip means "no PMTiles row can satisfy
 * this chip" (e.g. IN_DEAL / SOLD are ZAAHI-only).
 *
 * Synonyms added 2026-06-02 after Part C recon revealed ~127K plots
 * were invisible to the existing list:
 *   • VACANT  ← DDA "Empty" (38,591) + AD "Not Constructed" (48,520).
 *               Both mean "no building / land parcel only" in their
 *               respective taxonomies.
 *   • BUILT   ← AD "Constructed" (40,757). Same semantic as DDA
 *               "Completed" — a finished building.
 *
 * 2026-06-03 — PRE_CONSTRUCTION chip added:
 *   • DDA "Pre-Construction" (~15.7K) — off-plan / early prep stage.
 *   • AD  "Only Boundary Wall" (~846) — wall is up but the building
 *     isn't, i.e. early-stage in AD's vocabulary. Conceptually the
 *     same transitional state. Previously invisible under any chip.
 *
 * 2026-06-03 — SUSPENDED chip added:
 *   • DDA "Suspended" (~1,054) — permit halted / construction paused.
 *     No AD vocabulary equivalent (recon 2026-06-03 — AD only has
 *     Constructed / Not Constructed / Under Construction / Only
 *     Boundary Wall). DDA "No Data" (~6 plots) intentionally NOT
 *     mapped — too small to warrant a row, and "no data" isn't
 *     semantically Suspended.
 * Still no tile rebake — values were already in the tile properties.
 */
export const UNIFIED_STATUS_TO_PMTILES: Record<UnifiedStatus, string[]> = {
  VACANT: ["Vacant", "Not Started", "", "Empty", "Not Constructed"],
  IN_DEAL: [],
  SOLD: [],
  BUILT: ["Completed", "Constructed"],
  UNDER_CONSTRUCTION: ["Under Construction"],
  PRE_CONSTRUCTION: ["Pre-Construction", "Only Boundary Wall"],
  SUSPENDED: ["Suspended"],
};

/**
 * Translate a list of unified chips to the ZAAHI ParcelStatus values
 * to match. Returns:
 *   • string[] non-empty — ["in", "status", literal] matches these
 *   • null — selection is exclusively DDA-only chips; ZAAHI layer
 *     should render nothing (caller pushes ["literal", false])
 */
export function unifiedToZaahiStatusList(
  unified: UnifiedStatus[],
): string[] | null {
  if (unified.length === 0) return [];
  const out = new Set<string>();
  let anyZaahiMapping = false;
  for (const u of unified) {
    const list = UNIFIED_STATUS_TO_ZAAHI[u];
    if (list.length > 0) anyZaahiMapping = true;
    for (const v of list) out.add(v);
  }
  if (!anyZaahiMapping) return null;
  return Array.from(out);
}

/**
 * Symmetric helper for the PMTiles side — translates unified chips to
 * raw CONSTRUCTION_STATUS values. Returns null when selection is
 * exclusively ZAAHI-only chips (caller hides all PMTiles features).
 */
export function unifiedToPmtilesStatusList(
  unified: UnifiedStatus[],
): string[] | null {
  if (unified.length === 0) return [];
  const out = new Set<string>();
  let anyPmtilesMapping = false;
  for (const u of unified) {
    const list = UNIFIED_STATUS_TO_PMTILES[u];
    if (list.length > 0) anyPmtilesMapping = true;
    for (const v of list) out.add(v);
  }
  if (!anyPmtilesMapping) return null;
  return Array.from(out);
}

/**
 * Translate Archie's filter_by_status tool input (ParcelStatus enum)
 * into the closest UnifiedStatus chip the panel speaks. VAULT_PRIVATE
 * intentionally returns null — it's covered by the separate
 * toggle_vault_only flow, not by the status filter.
 */
export function parcelStatusToUnified(s: string): UnifiedStatus | null {
  switch (s) {
    case "LISTED":
    case "VERIFIED":
      return "VACANT";
    case "IN_DEAL":
      return "IN_DEAL";
    case "SOLD":
      return "SOLD";
    default:
      return null;
  }
}

/** Count of distinct active filter dimensions — drives the
 *  "Filters [N]" badge on the trigger button. A dimension is "active"
 *  when its array is non-empty or its range is non-null. */
export function countActiveFilters(s: FilterState): number {
  let n = 0;
  if (s.landUse.length > 0) n++;
  if (s.unifiedStatus.length > 0) n++;
  if (s.areaRange) n++;
  if (s.gfaRange) n++;
  if (s.farRange) n++;
  if (s.priceRange) n++;
  if (s.districts.length > 0) n++;
  return n;
}

/** Land-use category metadata for the panel chips. Colors mirror
 *  ZAAHI_LANDUSE_COLOR in page.tsx (CLAUDE.md founder-approved
 *  palette 2026-04-11 — DO NOT change without explicit approval). */
export const LAND_USE_OPTIONS: ReadonlyArray<{
  key: string;
  label: string;
  color: string;
}> = [
  { key: "RESIDENTIAL", label: "Residential", color: "#FFD700" },
  { key: "COMMERCIAL", label: "Commercial", color: "#4A90D9" },
  { key: "MIXED_USE", label: "Mixed Use", color: "#9B59B6" },
  { key: "HOTEL", label: "Hotel", color: "#E67E22" },
  { key: "INDUSTRIAL", label: "Industrial", color: "#708090" },
  { key: "EDUCATIONAL", label: "Educational", color: "#1ABC9C" },
  { key: "HEALTHCARE", label: "Healthcare", color: "#E74C3C" },
  { key: "AGRICULTURAL", label: "Agricultural", color: "#6B8E23" },
  { key: "FUTURE_DEVELOPMENT", label: "Future Dev", color: "#84CC16" },
];

/** Unified status chip metadata for the panel. `appliesTo` text shows
 *  the realtor honestly which dataset each chip filters. */
export const STATUS_OPTIONS: ReadonlyArray<{
  key: UnifiedStatus;
  label: string;
  appliesTo: string;
}> = [
  { key: "VACANT", label: "Vacant / For sale", appliesTo: "461K + 114" },
  { key: "IN_DEAL", label: "In deal", appliesTo: "114 listings only" },
  { key: "SOLD", label: "Sold", appliesTo: "114 listings only" },
  { key: "BUILT", label: "Built", appliesTo: "461K registry only" },
  {
    key: "UNDER_CONSTRUCTION",
    label: "Under construction",
    appliesTo: "461K registry only",
  },
  {
    key: "PRE_CONSTRUCTION",
    label: "Pre-Construction",
    appliesTo: "461K registry only",
  },
  {
    key: "SUSPENDED",
    label: "Suspended",
    appliesTo: "461K registry only",
  },
];

// Numeric-range filters (Plot Area, GFA, FAR, Price) are unbounded
// since 2026-06-03 (founder spec — plots exist up to 37M sqft and
// beyond; any fixed ceiling is misleading). The panel renders text
// inputs only; empty min = 0, empty max = no upper limit. There are
// no slider bounds to expose.
