"use client";
/**
 * MiniMap — Civ6-style regional overview at the bottom-center of the
 * map screen. Independent lightweight MapLibre instance (raster only,
 * no 3D, no labels). Keeps in sync with the main map:
 *   • main map moveend → red viewport rectangle on the mini redraws
 *   • click / drag on the mini → main map flyTo that point
 * Also dots each ZAAHI plot so the founder can see listing coverage
 * across Dubai at a glance.
 */
import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import maplibregl, { Map as MLMap, StyleSpecification } from "maplibre-gl";
import { apiFetch } from "@/lib/api-fetch";

const GOLD = "#C8A96E";
const VIEWPORT_SRC = "mini-viewport";
const VIEWPORT_FILL = "mini-viewport-fill";
const VIEWPORT_LINE = "mini-viewport-line";
const PLOTS_SRC = "mini-plots";
const PLOTS_DOTS = "mini-plots-dots";

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

// Dubai + UAE + northern Oman. Fits 3 emirates + Muscat contract area.
const INITIAL_CENTER: [number, number] = [55.6, 24.3];
const INITIAL_ZOOM = 5.9;

// Raster-only light basemap with no labels — contours visible, nothing
// competes with the viewport rectangle and plot dots.
const MINI_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    base: {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png",
        "https://b.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png",
        "https://c.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png",
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

export default function MiniMap({
  mainMapRef,
}: {
  mainMapRef: RefObject<MLMap | null>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const miniRef = useRef<MLMap | null>(null);
  const pendingSync = useRef<number | null>(null);

  // Init the mini MapLibre instance once. It's a separate Map with its
  // own style, container, and disabled interactions. We wire custom
  // handlers on top (click / drag → flyTo main).
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
    });
    miniRef.current = mini;

    mini.on("load", () => {
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
    });

    return () => {
      if (pendingSync.current != null) cancelAnimationFrame(pendingSync.current);
      mini.remove();
      miniRef.current = null;
    };
  }, []);

  // Fetch the 101 ZAAHI plots once and drop them as dots on the mini.
  // Uses apiFetch (Bearer token) because /api/parcels/map is auth-gated.
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
            // Style isn't ready yet — retry once after the load event.
            mini.once("load", applyDots);
          }
        };
        applyDots();
      } catch {
        /* best-effort — no dots is better than a crash */
      }
    })();
    return () => { alive = false; };
  }, []);

  // Sync viewport rectangle on main map moveend. We also attach a
  // polling fallback because the main map may not be mounted yet when
  // this component mounts — retry for up to 5 s every 100 ms.
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
        const rect = mainBoundsToRect(main);
        src.setData({ type: "FeatureCollection", features: [rect] });
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
  }, [mainMapRef]);

  // Click / drag on the mini → fly main map to that point. We translate
  // container-relative pixel coords to a LngLat via mini.unproject, then
  // call flyTo on the main map. Drag uses the same unproject path so
  // panning on the mini scrubs the main view smoothly.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
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
  }, [mainMapRef]);

  return (
    <div
      style={{
        position: "relative",
        width: 280,
        height: 160,
        background: "rgba(10, 22, 40, 0.85)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 12,
        boxShadow: "0 6px 20px rgba(0,0,0,0.3)",
        overflow: "hidden",
      }}
    >
      <div
        ref={containerRef}
        style={{ position: "absolute", inset: 0, cursor: "crosshair" }}
      />
    </div>
  );
}
