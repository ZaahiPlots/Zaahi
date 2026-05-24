"use client";
/**
 * MiniMap — Civ6-style locator + regional overview at the bottom-
 * centre of the map screen. Independent lightweight MapLibre instance
 * (raster Positron, no 3D), synced with the main map and aware of the
 * currently-selected parcel.
 *
 * v2 (founder spec 2026-05-24, docs/specs/site-plan-v2/):
 *   • Locator mode: when a parcel is selected, the mini recentres on
 *     its centroid at zoom 13.5 (district scale) and renders the
 *     plot polygon in gold. The red viewport rect from v1 is
 *     suppressed in this mode to avoid red-gold contention.
 *   • Overview mode (no selection): zoom 12 over Dubai with the red
 *     viewport rectangle tracking the main map.
 *   • District-name labels: a symbol layer driven by community
 *     centroids derived from /api/layers/communities (same data
 *     source as the main-map district-names layer added 2026-05-24).
 *   • North arrow: 16×16 gold inline SVG, top-right corner.
 *   • PDF reuse: preserveDrawingBuffer is on, and the component
 *     exposes a captureCanvas() method via useImperativeHandle so
 *     the Site Plan PDF can snapshot this locator into the new
 *     bottom-left pane.
 *   • Container resized 280×160 → 320×200 so the PDF capture has
 *     enough pixels at A4 print scale.
 *
 * Dock chrome (open/close toggle, grid layout, three rails, footer
 * cursor coords) is owned by page.tsx and is intentionally not
 * touched in v2.
 */
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import type { RefObject } from "react";
import maplibregl, { Map as MLMap, StyleSpecification } from "maplibre-gl";
import { apiFetch } from "@/lib/api-fetch";

const GOLD = "#C8A96E";
const VIEWPORT_SRC = "mini-viewport";
const VIEWPORT_FILL = "mini-viewport-fill";
const VIEWPORT_LINE = "mini-viewport-line";
const PLOTS_SRC = "mini-plots";
const PLOTS_DOTS = "mini-plots-dots";
const SELECTED_SRC = "mini-selected-plot";
const SELECTED_FILL = "mini-selected-plot-fill";
const SELECTED_LINE = "mini-selected-plot-line";
const DISTRICT_NAMES_SRC = "mini-district-names";
const DISTRICT_NAMES_LAYER = "mini-district-names-labels";

const LANDUSE_COLOR: Record<string, string> = {
  RESIDENTIAL: "#FFD700",
  COMMERCIAL: "#4A90D9",
  MIXED_USE: "#9B59B6",
  "MIXED USE": "#9B59B6",
  HOTEL: "#E67E22",
  HOSPITALITY: "#E67E22",
  INDUSTRIAL: "#708090",
  WAREHOUSE: "#708090",
  EDUCATIONAL: "#1ABC9C",
  EDUCATION: "#1ABC9C",
  HEALTHCARE: "#E74C3C",
  AGRICULTURAL: "#6B8E23",
  AGRICULTURE: "#6B8E23",
  FUTURE_DEVELOPMENT: "#84CC16",
  "FUTURE DEVELOPMENT": "#84CC16",
};

// Dubai default. Used when no parcel is selected (overview mode).
const INITIAL_CENTER: [number, number] = [55.27, 25.20];
const INITIAL_ZOOM = 12;

// Selected-parcel zoom. Picked so a typical Dubai community fills
// most of the 320×200 canvas with ~4–6 surrounding communities
// visible for context. Founder spec.
const SELECTED_ZOOM = 13.5;

// CARTO Positron — unified light basemap. Founder confirmed 2026-05-24:
// keep colour (not grayscale) — the colored locator is our edge over
// the DDA reference plan, NOT a clone of it.
const MINI_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    base: {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
        "https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
        "https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: "",
    },
  },
  layers: [{ id: "base", type: "raster", source: "base" }],
};

interface ParcelItem {
  id: string;
  geometry: GeoJSON.Polygon | null;
  affectionPlans?: Array<{ landUseMix?: Array<{ category?: string }> | null }>;
}

function mainBoundsToRect(main: MLMap): GeoJSON.Feature<GeoJSON.Polygon> {
  const b = main.getBounds();
  const sw = b.getSouthWest();
  const ne = b.getNorthEast();
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [sw.lng, sw.lat],
          [ne.lng, sw.lat],
          [ne.lng, ne.lat],
          [sw.lng, ne.lat],
          [sw.lng, sw.lat],
        ],
      ],
    },
  };
}

function centroidFromPolygon(poly: GeoJSON.Polygon): [number, number] | null {
  const ring = poly.coordinates[0];
  if (!ring?.length) return null;
  let lng = 0;
  let lat = 0;
  for (const p of ring) {
    lng += p[0];
    lat += p[1];
  }
  return [lng / ring.length, lat / ring.length];
}

/**
 * Imperative handle exposed via ref so the parent (page.tsx PDF
 * trigger handler) can capture the locator's current rendering as a
 * JPEG data-URL for embedding in the Site Plan PDF.
 */
export interface MiniMapHandle {
  /** Wait for the mini to settle, then return a JPEG data-URL of its canvas. */
  captureCanvas: () => Promise<string | null>;
}

export interface MiniMapProps {
  mainMapRef: RefObject<MLMap | null>;
  selectedParcelId?: string | null;
  selectedParcelGeometry?: GeoJSON.Polygon | null;
}

const MiniMap = forwardRef<MiniMapHandle, MiniMapProps>(function MiniMap(
  { mainMapRef, selectedParcelId, selectedParcelGeometry },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const miniRef = useRef<MLMap | null>(null);
  const pendingSync = useRef<number | null>(null);
  // Cached district-name centroids so we don't refetch on every render.
  const districtFeaturesRef = useRef<GeoJSON.Feature<GeoJSON.Point>[] | null>(null);

  // Init the mini MapLibre instance once. preserveDrawingBuffer is on
  // so toDataURL() returns the last rendered frame for the PDF capture.
  useEffect(() => {
    if (!containerRef.current || miniRef.current) return;
    const mini = new maplibregl.Map({
      container: containerRef.current,
      style: MINI_STYLE,
      center: INITIAL_CENTER,
      zoom: INITIAL_ZOOM,
      interactive: false,
      attributionControl: false,
      doubleClickZoom: false,
      dragPan: false,
      dragRotate: false,
      scrollZoom: false,
      boxZoom: false,
      keyboard: false,
      touchZoomRotate: false,
      pitchWithRotate: false,
      renderWorldCopies: false,
      // PDF capture path — see captureCanvas() below. Same flag the
      // main map sets in page.tsx for the Site Plan PDF generator.
      canvasContextAttributes: { preserveDrawingBuffer: true },
    });
    miniRef.current = mini;

    mini.on("load", () => {
      // ZAAHI plot dots (one per listing) — colored by land use.
      mini.addSource(PLOTS_SRC, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      mini.addLayer({
        id: PLOTS_DOTS,
        type: "circle",
        source: PLOTS_SRC,
        paint: {
          "circle-radius": 2.5,
          "circle-color": ["get", "color"],
          "circle-stroke-width": 0.5,
          "circle-stroke-color": "rgba(0,0,0,0.4)",
        },
      });

      // Viewport rectangle — overview mode only (hidden when a
      // parcel is selected; the gold polygon + recentre serves the
      // same purpose without competing for attention).
      mini.addSource(VIEWPORT_SRC, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      mini.addLayer({
        id: VIEWPORT_FILL,
        type: "fill",
        source: VIEWPORT_SRC,
        paint: { "fill-color": "#FF0000", "fill-opacity": 0.15 },
      });
      mini.addLayer({
        id: VIEWPORT_LINE,
        type: "line",
        source: VIEWPORT_SRC,
        paint: { "line-color": "#FF0000", "line-width": 2, "line-opacity": 1 },
      });

      // Selected-parcel polygon — visible only in locator mode.
      mini.addSource(SELECTED_SRC, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      mini.addLayer({
        id: SELECTED_FILL,
        type: "fill",
        source: SELECTED_SRC,
        paint: {
          "fill-color": GOLD,
          // Literal number — fill-opacity on a fill layer is fine to
          // animate, but we keep it constant for consistency with the
          // CLAUDE.md rule on fill-extrusion-opacity.
          "fill-opacity": 0.45,
        },
      });
      mini.addLayer({
        id: SELECTED_LINE,
        type: "line",
        source: SELECTED_SRC,
        paint: {
          "line-color": GOLD,
          "line-width": 2,
          "line-opacity": 0.95,
        },
      });

      // District-name labels — same /api/layers/communities source
      // as the main map's district-names layer, but with smaller
      // text-size to fit the 320×200 canvas. Loaded on first map
      // ready; we keep the features in a module ref so resize /
      // re-render doesn't refetch.
      void ensureDistrictNameLabels(mini);
    });

    return () => {
      if (pendingSync.current != null) cancelAnimationFrame(pendingSync.current);
      mini.remove();
      miniRef.current = null;
    };
  }, []);

  // Fetch district-name centroids (once) and add a symbol layer on
  // the mini. Pure best-effort — silent failure leaves the layer
  // dormant.
  async function ensureDistrictNameLabels(mini: MLMap) {
    if (!districtFeaturesRef.current) {
      try {
        const r = await apiFetch("/api/layers/communities");
        if (!r.ok) return;
        const fc = (await r.json()) as GeoJSON.FeatureCollection<GeoJSON.Polygon>;
        const feats: GeoJSON.Feature<GeoJSON.Point>[] = [];
        for (const f of fc.features) {
          if (f.geometry?.type !== "Polygon") continue;
          const ring = f.geometry.coordinates[0];
          if (!ring?.length) continue;
          let sx = 0;
          let sy = 0;
          for (const p of ring) { sx += p[0]; sy += p[1]; }
          const name = (f.properties?.CNAME_E as string | undefined) ?? "";
          if (!name) continue;
          feats.push({
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [sx / ring.length, sy / ring.length],
            },
            properties: { name },
          });
        }
        districtFeaturesRef.current = feats;
      } catch {
        return;
      }
    }
    if (!mini.getSource(DISTRICT_NAMES_SRC)) {
      mini.addSource(DISTRICT_NAMES_SRC, {
        type: "geojson",
        data: { type: "FeatureCollection", features: districtFeaturesRef.current },
      });
    }
    if (!mini.getLayer(DISTRICT_NAMES_LAYER)) {
      mini.addLayer({
        id: DISTRICT_NAMES_LAYER,
        type: "symbol",
        source: DISTRICT_NAMES_SRC,
        minzoom: 11,
        layout: {
          "text-field": ["get", "name"],
          // Smaller than the main-map layer (which interpolates 10→16);
          // the mini canvas is much smaller so a constant 8pt keeps
          // labels legible without crowding.
          "text-size": 8,
          "text-letter-spacing": 0.04,
          "text-allow-overlap": false,
          "text-ignore-placement": false,
        },
        paint: {
          "text-color": "#1A1A2E",
          "text-halo-color": "rgba(255,255,255,0.85)",
          "text-halo-width": 1.2,
        },
      });
    }
  }

  // Fetch the ZAAHI plots once and drop them as dots on the mini.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await apiFetch("/api/parcels/map");
        if (!r.ok) return;
        const payload = (await r.json()) as { items: ParcelItem[] };
        if (!alive) return;
        const features: GeoJSON.Feature[] = [];
        for (const it of payload.items) {
          if (!it.geometry || it.geometry.type !== "Polygon") continue;
          const c = centroidFromPolygon(it.geometry);
          if (!c) continue;
          const landUse = it.affectionPlans?.[0]?.landUseMix?.[0]?.category ?? "";
          const color = LANDUSE_COLOR[landUse.toUpperCase()] ?? GOLD;
          features.push({
            type: "Feature",
            geometry: { type: "Point", coordinates: c },
            properties: { color },
          });
        }
        const applyDots = () => {
          const mini = miniRef.current;
          if (!mini) return;
          const src = mini.getSource(PLOTS_SRC) as
            | maplibregl.GeoJSONSource
            | undefined;
          if (src) {
            src.setData({ type: "FeatureCollection", features });
          } else {
            mini.once("load", applyDots);
          }
        };
        applyDots();
      } catch {
        /* best-effort */
      }
    })();
    return () => { alive = false; };
  }, []);

  // Sync viewport rectangle on main map move — only when NO parcel
  // is selected (overview mode). In locator mode the rect is hidden
  // and the gold polygon owns the canvas.
  useEffect(() => {
    let bound: MLMap | null = null;

    const syncRect = () => {
      if (pendingSync.current != null) cancelAnimationFrame(pendingSync.current);
      pendingSync.current = requestAnimationFrame(() => {
        pendingSync.current = null;
        const mini = miniRef.current;
        const main = mainMapRef.current;
        if (!mini || !main) return;
        const src = mini.getSource(VIEWPORT_SRC) as
          | maplibregl.GeoJSONSource
          | undefined;
        if (!src) return;
        if (selectedParcelGeometry) {
          // Locator mode — clear the rect.
          src.setData({ type: "FeatureCollection", features: [] });
        } else {
          src.setData({
            type: "FeatureCollection",
            features: [mainBoundsToRect(main)],
          });
        }
      });
    };

    let tries = 0;
    const poll = window.setInterval(() => {
      tries += 1;
      const main = mainMapRef.current;
      if (main) {
        window.clearInterval(poll);
        bound = main;
        main.on("moveend", syncRect);
        main.on("move", syncRect);
        syncRect();
      } else if (tries > 50) {
        window.clearInterval(poll);
      }
    }, 100);

    return () => {
      window.clearInterval(poll);
      if (bound) {
        bound.off("moveend", syncRect);
        bound.off("move", syncRect);
      }
      if (pendingSync.current != null) cancelAnimationFrame(pendingSync.current);
    };
  }, [mainMapRef, selectedParcelGeometry]);

  // Locator mode: when a parcel is selected, recentre on its
  // centroid and render its polygon as a gold overlay. When the
  // selection clears, fall back to the Dubai overview view.
  useEffect(() => {
    const mini = miniRef.current;
    if (!mini) return;

    const applySelection = () => {
      const m = miniRef.current;
      if (!m) return;
      const src = m.getSource(SELECTED_SRC) as
        | maplibregl.GeoJSONSource
        | undefined;
      if (!src) {
        m.once("load", applySelection);
        return;
      }
      if (selectedParcelGeometry) {
        src.setData({
          type: "FeatureCollection",
          features: [
            { type: "Feature", properties: {}, geometry: selectedParcelGeometry },
          ],
        });
        const c = centroidFromPolygon(selectedParcelGeometry);
        if (c) {
          m.flyTo({ center: c, zoom: SELECTED_ZOOM, duration: 600, essential: true });
        }
      } else {
        src.setData({ type: "FeatureCollection", features: [] });
        m.flyTo({
          center: INITIAL_CENTER,
          zoom: INITIAL_ZOOM,
          duration: 600,
          essential: true,
        });
      }
    };

    if (mini.loaded()) applySelection();
    else mini.once("load", applySelection);
  }, [selectedParcelId, selectedParcelGeometry]);

  // Click / drag on the mini → fly main map to that point. Disabled
  // in locator mode to avoid accidentally throwing the camera away
  // from the just-selected plot.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (selectedParcelGeometry) return; // locator mode — pan disabled
    let dragging = false;

    const toLngLat = (clientX: number, clientY: number) => {
      const mini = miniRef.current;
      if (!mini) return null;
      const rect = el.getBoundingClientRect();
      const px = clientX - rect.left;
      const py = clientY - rect.top;
      return mini.unproject([px, py]);
    };

    const fly = (clientX: number, clientY: number, animate: boolean) => {
      const ll = toLngLat(clientX, clientY);
      const main = mainMapRef.current;
      if (!ll || !main) return;
      if (animate) {
        main.flyTo({ center: [ll.lng, ll.lat], duration: 600, essential: true });
      } else {
        main.panTo([ll.lng, ll.lat], { duration: 0 });
      }
    };

    const onDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      dragging = true;
      fly(e.clientX, e.clientY, true);
    };
    const onMove = (e: MouseEvent) => {
      if (!dragging) return;
      fly(e.clientX, e.clientY, false);
    };
    const onUp = () => { dragging = false; };

    el.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      el.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [mainMapRef, selectedParcelGeometry]);

  // Expose captureCanvas() for the Site Plan PDF generator. Waits
  // for the mini to be idle (so tile fetches + symbol placement
  // finish) then returns a JPEG data-URL. Returns null on failure
  // so the PDF generator can fall back to a single-pane layout.
  useImperativeHandle(ref, () => ({
    async captureCanvas(): Promise<string | null> {
      const mini = miniRef.current;
      if (!mini) return null;
      try {
        await new Promise<void>((resolve) => {
          const onIdle = () => { mini.off("idle", onIdle); resolve(); };
          mini.on("idle", onIdle);
          // Safety timeout — preserveDrawingBuffer ensures the buffer
          // still has the last rendered frame even if idle never fires.
          setTimeout(() => { mini.off("idle", onIdle); resolve(); }, 3000);
        });
        mini.triggerRepaint();
        await new Promise((r) => requestAnimationFrame(() => r(null)));
        return mini.getCanvas().toDataURL("image/jpeg", 0.92);
      } catch (e) {
        console.warn("[mini-map] capture failed:", e);
        return null;
      }
    },
  }), []);

  return (
    <div
      style={{
        position: "relative",
        // v2: bumped 280×160 → 320×200 so the PDF location-map pane
        // has enough pixels at A4 print scale. Founder spec 2026-05-24.
        width: 320,
        height: 200,
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      <div
        ref={containerRef}
        style={{
          position: "absolute",
          inset: 0,
          cursor: selectedParcelGeometry ? "default" : "crosshair",
        }}
      />
      {/* North arrow — small GOLD SVG, top-right. Mirrors the DDA
          Location Map reference (which shows a north arrow in the
          same corner). Pointer-events disabled so it never steals
          clicks from the drag/pan handler. */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: 6,
          right: 6,
          width: 16,
          height: 16,
          pointerEvents: "none",
          color: GOLD,
          filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.35))",
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 3 16 14 12 11 8 14 12 3" fill={GOLD} stroke={GOLD} />
          <text x="12" y="22" textAnchor="middle" fontSize="6" fill="currentColor" stroke="none" fontFamily="Georgia, serif" fontWeight="700">N</text>
        </svg>
      </div>
    </div>
  );
});

export default MiniMap;
