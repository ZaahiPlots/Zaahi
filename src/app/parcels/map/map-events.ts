import { Map as MLMap } from "maplibre-gl";
import { type ArchetypeLayerController } from "@/lib/archetypes/archetype-layer";
import { ZAAHI_BUILDINGS_3D, ZAAHI_PLOTS_FILL, ZAAHI_PLOTS_GLOW, ZAAHI_PLOTS_GLOW_CRISP, ZAAHI_PLOTS_LINE } from "./layers/ids";

// ── Map event-listener leak guard (founder fix 2026-06-03) ─────────
// MapLibre's setStyle() wipes layers/sources but NOT the internal
// _delegateListeners registry. attachOverlays() + loadLayer() add
// 25+ map.on() bindings on every style swap; without the cleanup
// below, each swap doubles the active listener count → 5 swaps =
// 5× click/hover handlers fire per event → Firefox locks up. The
// registry stores an `off` closure per (event_type, layer/global)
// key so each re-bind first removes the previous one. Module-scope
// because only one map exists per page in ZAAHI; if that ever
// changes the key must include a map id. See research/map-freeze-diag.
export const _layerEventRegistry = new Map<string, () => void>();

export function bindLayerEvent(
  map: MLMap,
  type: string,
  layerId: string,
  handler: (e: unknown) => void,
): void {
  const key = `${type}::${layerId}`;
  const prevOff = _layerEventRegistry.get(key);
  if (prevOff) {
    try { prevOff(); } catch { /* layer may already be gone */ }
  }
  // Casts mirror MapLibre's overloaded on/off — the type union is
  // unwieldy here but TypeScript can't narrow across the call site.
  map.on(type as never, layerId, handler as never);
  _layerEventRegistry.set(key, () => {
    try { map.off(type as never, layerId, handler as never); } catch { /* ignore */ }
  });
}

// Apply / clear selection highlight on the ZAAHI plot + building layers.
export function applySelectionPaint(map: MLMap, selectedId: string | null) {
  if (!map.getLayer(ZAAHI_PLOTS_FILL)) return;
  const sel = selectedId ?? "__none__";
  // When the residential archetype layer is active, residential renders as ONE
  // solid Three.js model — extinguish its translucent flat plot-fill so nothing
  // ghosts under/around it (founder 2026-06-14). Click/hover still work (an
  // opacity-0 fill is still query-hit-testable). Other land-uses unchanged.
  const archOn = !!(map as unknown as { __zaahiArchetypeActive?: boolean }).__zaahiArchetypeActive;
  const hideRes = (inner: unknown): unknown =>
    archOn
      ? ["case", ["match", ["get", "landUse"], ["RESIDENTIAL", "MIXED_USE", "HOTEL", "COMMERCIAL", "EDUCATIONAL", "HEALTHCARE", "INDUSTRIAL", "AGRICULTURAL", "FUTURE_DEVELOPMENT", "INVESTMENT"], true, false], 0, inner]
      : inner;
  // Plot fill: bright on selected, dim on others when selection is
  // active. Outline-only parcels (hasLandUse === false) ALWAYS render
  // with fill-opacity 0 — selection state must not give them a fill.
  if (selectedId) {
    map.setPaintProperty(ZAAHI_PLOTS_FILL, "fill-opacity", hideRes([
      "case",
      ["!=", ["get", "hasLandUse"], true], 0,
      ["==", ["get", "id"], sel], 0.85,
      0.08,
    ]) as never);
  } else {
    map.setPaintProperty(ZAAHI_PLOTS_FILL, "fill-opacity", hideRes([
      "case",
      ["==", ["get", "hasLandUse"], true], 0.4,
      0,
    ]) as never);
  }
  // Outline: thick + fully opaque on selected, thin + dim elsewhere so
  // neighbours recede visually.
  if (map.getLayer(ZAAHI_PLOTS_LINE)) {
    if (selectedId) {
      map.setPaintProperty(ZAAHI_PLOTS_LINE, "line-width", [
        "case", ["==", ["get", "id"], sel], 4, 1,
      ]);
      map.setPaintProperty(ZAAHI_PLOTS_LINE, "line-opacity", [
        "case", ["==", ["get", "id"], sel], 1, 0.35,
      ]);
    } else {
      map.setPaintProperty(ZAAHI_PLOTS_LINE, "line-width", 2);
      map.setPaintProperty(ZAAHI_PLOTS_LINE, "line-opacity", 1);
    }
  }
  // Glow filters
  if (map.getLayer(ZAAHI_PLOTS_GLOW)) {
    map.setFilter(ZAAHI_PLOTS_GLOW, ["==", ["id"], sel]);
  }
  if (map.getLayer(ZAAHI_PLOTS_GLOW_CRISP)) {
    map.setFilter(ZAAHI_PLOTS_GLOW_CRISP, ["==", ["id"], sel]);
  }
  // 3D buildings: selected stays in its canonical land-use color, the
  // rest shift to grey so the Signature model is clearly the brightest
  // thing on screen. The 3D features carry `parcelId` (not `id`).
  // `fill-extrusion-color` accepts data expressions (unlike -opacity).
  if (map.getLayer(ZAAHI_BUILDINGS_3D)) {
    if (selectedId) {
      map.setPaintProperty(ZAAHI_BUILDINGS_3D, "fill-extrusion-color", [
        "case",
        ["==", ["get", "parcelId"], sel], ["get", "color"],
        "#7a7a7a",
      ]);
    } else {
      map.setPaintProperty(ZAAHI_BUILDINGS_3D, "fill-extrusion-color", ["get", "color"]);
    }
  }
  // Archetype CustomLayer selection parity (?archetypes=1) — desaturate
  // non-selected morphologies. Controller is stashed on the map handle.
  const ac = (map as unknown as { __zaahiArchetypes?: ArchetypeLayerController }).__zaahiArchetypes;
  ac?.setSelected(selectedId);
}

/**
 * Area-weighted centroid of a polygon's outer ring, in [lng, lat].
 *
 * Used to place exactly one vault conflict marker per plot. The shoelace
 * centroid is preferred over a plain vertex mean because plot rings from DDA
 * are sampled unevenly — a long edge split into many points would drag a
 * vertex mean toward that edge. Degenerate rings (zero area, or fewer than
 * three points) fall back to the vertex mean, which is always defined.
 *
 * Ring winding does not matter: the signed area cancels in the division.
 */
export function ringCentroid(ring: number[][]): [number, number] | null {
  if (!ring || ring.length === 0) return null;
  // A closed ring repeats its first point last; drop it so the duplicate
  // does not get double-weighted in the fallback mean.
  const pts = ring.length > 1
    && ring[0][0] === ring[ring.length - 1][0]
    && ring[0][1] === ring[ring.length - 1][1]
      ? ring.slice(0, -1)
      : ring;
  if (pts.length === 0) return null;

  let twiceArea = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[(i + 1) % pts.length];
    const cross = x0 * y1 - x1 * y0;
    twiceArea += cross;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  }

  if (Math.abs(twiceArea) < 1e-12) {
    const mx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
    const my = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    return Number.isFinite(mx) && Number.isFinite(my) ? [mx, my] : null;
  }

  const lng = cx / (3 * twiceArea);
  const lat = cy / (3 * twiceArea);
  return Number.isFinite(lng) && Number.isFinite(lat) ? [lng, lat] : null;
}
