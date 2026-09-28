import type { Map as MLMap, FilterSpecification } from "maplibre-gl";
import { VAULT_SHARED_SRC, ZAAHI_PLOTS_SRC } from "./layers/ids";

// Hover highlight for every plot layer that shows a hover card.
//
// No highlight existed before: the only `feature-state hover` in the page is
// on the COMM_NUM community layer, and PMTiles plot sources carry no feature
// ids, so feature-state cannot work there. Instead each plot source gets a
// pair of overlay layers (gold ground fill + gold outline) whose filter is
// swapped to match the hovered plot's property value. Property matching also
// lights up every tile fragment of a plot that crosses tile boundaries.
//
// One highlight at a time: setting a group clears the previously active one.
// Colour is the ZAAHI gold accent (ui-style-guide palette).

const GOLD = "#C8A96E";
const NO_MATCH: FilterSpecification = ["==", ["id"], "__none__"];

export interface HoverHighlightGroup {
  /** Prefix of the two overlay layer ids. */
  id: string;
  source: string;
  /** Vector-tile source-layer (PMTiles only). */
  sourceLayer?: string;
  /** Feature property that identifies one plot on this source. */
  key: string;
  /** Extra filter every highlighted feature must also pass. */
  base?: FilterSpecification;
}

/** ZAAHI listings + the caller's own vault plots (same source). */
export const ZAAHI_HOVER: HoverHighlightGroup = {
  id: "zaahi-plots",
  source: ZAAHI_PLOTS_SRC,
  key: "id",
};

/** Plots shared TO the caller; footprint = tierIndex 0 (podium ring). */
export const VAULT_SHARED_HOVER: HoverHighlightGroup = {
  id: "vault-shared",
  source: VAULT_SHARED_SRC,
  key: "id",
  base: ["==", ["get", "tierIndex"], 0],
};

/** PMTiles land source (DDA / AD): flat polygons keyed by plotNumber. */
export const landTilesHover = (srcId: string): HoverHighlightGroup => ({
  id: srcId,
  source: srcId,
  sourceLayer: "plots",
  key: "plotNumber",
  base: ["==", ["get", "tier"], "flat"],
});

export const hoverFillId = (g: HoverHighlightGroup) => `hover-hl-${g.id}-fill`;
export const hoverLineId = (g: HoverHighlightGroup) => `hover-hl-${g.id}-line`;

const groups = new Map<string, HoverHighlightGroup>();
let activeGroupId: string | null = null;
let activeValue: string | null = null;

function match(g: HoverHighlightGroup, value: string): FilterSpecification {
  const eq: FilterSpecification = [
    "==",
    ["to-string", ["get", g.key]],
    value,
  ];
  return g.base ? (["all", g.base, eq] as FilterSpecification) : eq;
}

/** Adds the overlay layers for one plot source. Idempotent per style. */
export function addHoverHighlight(map: MLMap, g: HoverHighlightGroup): void {
  groups.set(g.id, g);
  if (!map.getSource(g.source)) return;
  // A style swap wipes the layers; drop any stale "already on this plot" state.
  if (!map.getLayer(hoverLineId(g)) && activeGroupId === g.id) {
    activeGroupId = null;
    activeValue = null;
  }
  const common = {
    source: g.source,
    ...(g.sourceLayer ? { "source-layer": g.sourceLayer } : {}),
    filter: NO_MATCH,
  };
  if (!map.getLayer(hoverFillId(g))) {
    map.addLayer({
      ...common,
      id: hoverFillId(g),
      type: "fill",
      paint: { "fill-color": GOLD, "fill-opacity": 0.3 },
    });
  }
  if (!map.getLayer(hoverLineId(g))) {
    map.addLayer({
      ...common,
      id: hoverLineId(g),
      type: "line",
      layout: { "line-join": "round" },
      paint: { "line-color": GOLD, "line-width": 3, "line-opacity": 1 },
    });
  }
}

function setFilters(map: MLMap, g: HoverHighlightGroup, f: FilterSpecification) {
  for (const lid of [hoverFillId(g), hoverLineId(g)]) {
    if (map.getLayer(lid)) map.setFilter(lid, f);
  }
}

/** Highlights the plot whose `g.key` property equals `value`. */
export function setHoverHighlight(
  map: MLMap,
  g: HoverHighlightGroup,
  value: string | number | null | undefined,
): void {
  if (value === null || value === undefined || value === "") {
    clearHoverHighlight(map, g);
    return;
  }
  const v = String(value);
  // mousemove fires at pointer rate — nothing to do while on the same plot.
  if (activeGroupId === g.id && activeValue === v) return;
  if (activeGroupId && activeGroupId !== g.id) {
    const prev = groups.get(activeGroupId);
    if (prev) setFilters(map, prev, NO_MATCH);
  }
  if (!map.getLayer(hoverLineId(g))) return;
  activeGroupId = g.id;
  activeValue = v;
  setFilters(map, g, match(g, v));
  // Keep the overlay above plot layers added after it (ZAAHI plots load
  // async, after the PMTiles sources).
  map.moveLayer(hoverFillId(g));
  map.moveLayer(hoverLineId(g));
}

/**
 * Clears the highlight for `g`. Only acts when `g` is the active group, so a
 * stale mouseleave from the layer the cursor just left cannot wipe the
 * highlight the layer it just entered has already set.
 */
export function clearHoverHighlight(map: MLMap, g: HoverHighlightGroup): void {
  if (activeGroupId === g.id) {
    activeGroupId = null;
    activeValue = null;
  } else if (activeGroupId !== null) return;
  setFilters(map, g, NO_MATCH);
}
