// React hook wiring the digital-twin Buildings layer into /parcels/map.
//
// Responsibilities:
//   1. Fetch /api/buildings once the map is ready.
//   2. For each building with modelPath → create a MapLibre CustomLayer
//      that renders the glTF at the building's real centroid.
//   3. Publish a clickable GeoJSON polygon source (footprint fill + gold
//      outline) — one feature per building. Click opens BuildingCard.
//      Mirrors the LISTED-plot click UX so the map surface feels
//      consistent across the two data planes.
//   4. Toggle ALL per-building layers + the footprint layer on/off via
//      a single "completed/UC visible" flag.
//   5. Clean up on unmount (removeLayer + removeSource).
//
// The hook is additive — it does not touch any existing ZAAHI Signature
// layer, source, mouse handler, or selection logic on /parcels/map.
//
// 2026-04-24 rev 1: storage of fetched buildings moved from `useRef` to
// `useState`; `onSelectBuilding` mirrored in a ref so parent re-renders
// don't churn the layer effect; verbose `[BUILDINGS]` logs added.
// 2026-04-24 rev 2: pin circle + halo layers removed. Replaced with a
// clickable footprint polygon (fill + line) that uses `footprintPolygon`
// from the Building row when present, else synthesises a 40 m × 40 m
// square centred on the WGS84 centroid. Hover state via feature-state
// boosts fill opacity 0.15 → 0.35; click opens the BuildingCard. The
// map-level diagnostic click handler is gone — footprint clicks are
// generous enough that the backup no longer earns its keep.

import { useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import type {
  GeoJSONSource,
  Map as MLMap,
  MapMouseEvent,
  MapGeoJSONFeature,
} from "maplibre-gl";
import { apiFetch } from "@/lib/api-fetch";
import type { BuildingDTO } from "./types";
import {
  createBuildingGlbLayer,
} from "./BuildingGlbLayer";

const SRC_ID = "zaahi-buildings-footprints";
const FILL_ID = "zaahi-buildings-fill";
const LINE_ID = "zaahi-buildings-line";

const GOLD = "#C8A96E";           // ZAAHI gold — matches LISTED plot outline
const GOLD_FILL = "#C8A96E";      // same hue for fill
const AMBER = "#E67E22";          // under-construction accent (reserved)

// Default footprint half-size when a Building row has no footprintPolygon.
// 40 m × 40 m gives a generous click target that approximates a typical
// tower base (API Horizon Pointe's real footprint is ~63 m × 60 m; this
// is conservative).
const DEFAULT_FOOTPRINT_HALF_M = 20;

/**
 * Square polygon ring (5 points, closed) around the given WGS84 centroid,
 * sized `halfM` metres in each direction. Returned in GeoJSON order
 * [lng, lat]. The lat → degree conversion uses the standard 111320 m/°
 * approximation; the lng conversion scales by cos(latitude) for the
 * Mercator squeeze. Accuracy is ~1 m at Dubai latitude — ample for a
 * click-area hitbox.
 */
function defaultFootprintRing(
  lat: number,
  lng: number,
  halfM: number,
): [number, number][] {
  const dLat = halfM / 111_320;
  const latRad = (lat * Math.PI) / 180;
  const dLng = halfM / (111_320 * Math.cos(latRad));
  return [
    [lng - dLng, lat - dLat],
    [lng + dLng, lat - dLat],
    [lng + dLng, lat + dLat],
    [lng - dLng, lat + dLat],
    [lng - dLng, lat - dLat],
  ];
}

function buildingToFeature(b: BuildingDTO): GeoJSON.Feature<GeoJSON.Polygon> {
  // Prefer the artist-supplied / OSM-sourced footprint polygon; otherwise
  // synthesize a small square around the centroid so there's always a
  // clickable surface.
  let geometry: GeoJSON.Polygon;
  const fp = b.footprintPolygon as GeoJSON.Polygon | null | undefined;
  if (
    fp &&
    typeof fp === "object" &&
    fp.type === "Polygon" &&
    Array.isArray(fp.coordinates) &&
    fp.coordinates.length > 0
  ) {
    geometry = fp;
  } else {
    geometry = {
      type: "Polygon",
      coordinates: [defaultFootprintRing(b.centroidLat, b.centroidLng, DEFAULT_FOOTPRINT_HALF_M)],
    };
  }
  return {
    type: "Feature",
    id: b.id,
    geometry,
    properties: {
      id: b.id,
      name: b.name,
      status: b.status,
    },
  };
}

interface Options {
  mapRef: MutableRefObject<MLMap | null>;
  mapReady: boolean;
  enabled: boolean;
  statusFilter?: BuildingDTO["status"][];
  onSelectBuilding: (id: string) => void;
}

interface LiveLayer {
  buildingId: string;
  layerId: string;
}

export function useBuildingsLayer({
  mapRef,
  mapReady,
  enabled,
  statusFilter,
  onSelectBuilding,
}: Options): { buildings: BuildingDTO[]; error: string | null } {
  const [buildings, setBuildings] = useState<BuildingDTO[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Ref mirror of the latest onSelectBuilding so the click handler stays
  // stable across parent re-renders.
  const onSelectBuildingRef = useRef(onSelectBuilding);
  onSelectBuildingRef.current = onSelectBuilding;

  const liveLayersRef = useRef<LiveLayer[]>([]);
  const handlersInstalledRef = useRef(false);
  const hoveredIdRef = useRef<string | number | null>(null);

  const clickHandlerRef = useRef<
    ((e: MapMouseEvent & { features?: MapGeoJSONFeature[] }) => void) | null
  >(null);
  const mouseMoveRef = useRef<
    ((e: MapMouseEvent & { features?: MapGeoJSONFeature[] }) => void) | null
  >(null);
  const mouseLeaveRef = useRef<(() => void) | null>(null);

  // ── Fetch once on mount ──────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    console.log("[BUILDINGS] fetching /api/buildings …");
    apiFetch("/api/buildings")
      .then(async (res) => {
        if (!res.ok) throw new Error(`GET /api/buildings → ${res.status}`);
        const json = (await res.json()) as { items: BuildingDTO[] };
        if (cancelled) return;
        const items = json.items ?? [];
        console.log(
          "[BUILDINGS] fetch ok — items:",
          items.length,
          items.map((b) => ({
            id: b.id,
            name: b.name,
            status: b.status,
            modelPath: b.modelPath,
            centroid: [b.centroidLat, b.centroidLng],
            hasFootprint: !!b.footprintPolygon,
          })),
        );
        setBuildings(items);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[BUILDINGS] fetch failed:", msg);
        setError(msg);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Main effect: attach / detach layers ─────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      console.log("[BUILDINGS] effect skipped — no map instance yet");
      return;
    }
    if (!mapReady) {
      console.log("[BUILDINGS] effect skipped — map style not ready yet");
      return;
    }

    const activeBuildings = buildings.filter((b) => {
      if (!enabled) return false;
      if (statusFilter && statusFilter.length > 0) {
        return statusFilter.includes(b.status);
      }
      return true;
    });

    console.log(
      "[BUILDINGS] effect run — enabled:",
      enabled,
      "filter:",
      statusFilter,
      "buildings loaded:",
      buildings.length,
      "active:",
      activeBuildings.length,
    );

    // ── Footprint source + fill + line ────────────────────────────
    const fc: GeoJSON.FeatureCollection<GeoJSON.Polygon> = {
      type: "FeatureCollection",
      features: activeBuildings.map(buildingToFeature),
    };

    const existingSrc = map.getSource(SRC_ID) as GeoJSONSource | undefined;
    if (existingSrc) {
      existingSrc.setData(fc);
    } else {
      console.log("[BUILDINGS] installing footprint source + fill/line layers");
      map.addSource(SRC_ID, { type: "geojson", data: fc });

      // Tan fill · hover boosts opacity 0.15 → 0.35 · matches LISTED-plot
      // visual language (ZAAHI Signature uses its own fill-opacity stack,
      // but the hover-bump pattern is the same).
      map.addLayer({
        id: FILL_ID,
        type: "fill",
        source: SRC_ID,
        paint: {
          "fill-color": [
            "match",
            ["get", "status"],
            "COMPLETED", GOLD_FILL,
            "UNDER_CONSTRUCTION", AMBER,
            "PLANNED", "#6B7280",
            GOLD_FILL,
          ],
          "fill-opacity": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            0.35,
            0.15,
          ],
        },
      });

      map.addLayer({
        id: LINE_ID,
        type: "line",
        source: SRC_ID,
        paint: {
          "line-color": [
            "match",
            ["get", "status"],
            "COMPLETED", GOLD,
            "UNDER_CONSTRUCTION", AMBER,
            "PLANNED", "#6B7280",
            GOLD,
          ],
          "line-width": 2,
          "line-opacity": 0.8,
        },
      });
    }

    // Install hover + click handlers once. Wrapped in a guard so re-runs
    // don't duplicate listeners. Handlers read the latest onSelectBuilding
    // through its ref mirror.
    if (!handlersInstalledRef.current && map.getLayer(FILL_ID)) {
      const clickHandler = (
        e: MapMouseEvent & { features?: MapGeoJSONFeature[] },
      ) => {
        const f = e.features?.[0];
        const id = f?.properties?.id;
        console.log("[BUILDINGS] footprint click", { id });
        if (typeof id === "string") onSelectBuildingRef.current(id);
      };
      const mouseMove = (
        e: MapMouseEvent & { features?: MapGeoJSONFeature[] },
      ) => {
        const f = e.features?.[0];
        if (!f || f.id === undefined) return;
        const fid = f.id as string | number;
        if (hoveredIdRef.current !== null && hoveredIdRef.current !== fid) {
          map.setFeatureState(
            { source: SRC_ID, id: hoveredIdRef.current },
            { hover: false },
          );
        }
        hoveredIdRef.current = fid;
        map.setFeatureState({ source: SRC_ID, id: fid }, { hover: true });
        map.getCanvas().style.cursor = "pointer";
      };
      const mouseLeave = () => {
        if (hoveredIdRef.current !== null) {
          map.setFeatureState(
            { source: SRC_ID, id: hoveredIdRef.current },
            { hover: false },
          );
        }
        hoveredIdRef.current = null;
        map.getCanvas().style.cursor = "";
      };

      map.on("click", FILL_ID, clickHandler);
      map.on("mousemove", FILL_ID, mouseMove);
      map.on("mouseleave", FILL_ID, mouseLeave);
      clickHandlerRef.current = clickHandler;
      mouseMoveRef.current = mouseMove;
      mouseLeaveRef.current = mouseLeave;
      handlersInstalledRef.current = true;
      console.log("[BUILDINGS] footprint handlers installed (click + hover)");
    }

    // Toggle visibility.
    const vis = enabled ? "visible" : "none";
    if (map.getLayer(FILL_ID)) map.setLayoutProperty(FILL_ID, "visibility", vis);
    if (map.getLayer(LINE_ID)) map.setLayoutProperty(LINE_ID, "visibility", vis);

    // ── Per-building glTF CustomLayers ──
    const targetIds = new Set(
      activeBuildings.filter((b) => b.modelPath).map((b) => b.id),
    );

    liveLayersRef.current = liveLayersRef.current.filter((live) => {
      if (!targetIds.has(live.buildingId)) {
        console.log(
          "[BUILDINGS] removing layer",
          live.layerId,
          "(building no longer active)",
        );
        if (map.getLayer(live.layerId)) map.removeLayer(live.layerId);
        return false;
      }
      return true;
    });

    const liveIds = new Set(liveLayersRef.current.map((l) => l.buildingId));
    for (const b of activeBuildings) {
      if (!b.modelPath) {
        console.log(
          "[BUILDINGS] building",
          b.name,
          "has no modelPath — skipping GLB layer (footprint-only)",
        );
        continue;
      }
      if (liveIds.has(b.id)) continue;

      const modelUrl = b.modelPath.startsWith("/") ? b.modelPath : `/${b.modelPath}`;
      console.log(
        "[BUILDINGS] addLayer for",
        b.name,
        "modelUrl:",
        modelUrl,
        "scaleFactor:",
        b.scaleFactor,
        "rotationDeg (DB):",
        b.rotationDeg,
      );
      const layer = createBuildingGlbLayer({
        buildingId: b.id,
        modelUrl,
        centroidLng: b.centroidLng,
        centroidLat: b.centroidLat,
        scaleFactor: b.scaleFactor,
        rotationDeg: b.rotationDeg,
      });
      if (!map.getLayer(layer.id)) {
        map.addLayer(layer);
        console.log(
          "[BUILDINGS] layer added —",
          layer.id,
          "getLayer post-check:",
          map.getLayer(layer.id) ? "present" : "MISSING",
        );
      }
      liveLayersRef.current.push({ buildingId: b.id, layerId: layer.id });
    }

    // Keep the footprint layers above the 3D CustomLayers so the gold
    // outline + hover tint read through the tower — matches the way
    // LISTED-plot outlines sit on top of ZAAHI Signature extrusions.
    if (map.getLayer(FILL_ID)) {
      try {
        map.moveLayer(FILL_ID);
      } catch {
        /* race — benign */
      }
    }
    if (map.getLayer(LINE_ID)) {
      try {
        map.moveLayer(LINE_ID);
      } catch {
        /* race — benign */
      }
    }
  }, [mapRef, mapReady, enabled, statusFilter, buildings]);

  // ── Cleanup on full unmount ──────────────────────────────────────
  useEffect(() => {
    return () => {
      const map = mapRef.current;
      if (!map) return;
      console.log("[BUILDINGS] unmount cleanup");

      for (const live of liveLayersRef.current) {
        if (map.getLayer(live.layerId)) map.removeLayer(live.layerId);
      }
      liveLayersRef.current = [];

      if (map.getLayer(FILL_ID)) {
        if (clickHandlerRef.current)
          map.off("click", FILL_ID, clickHandlerRef.current);
        if (mouseMoveRef.current)
          map.off("mousemove", FILL_ID, mouseMoveRef.current);
        if (mouseLeaveRef.current)
          map.off("mouseleave", FILL_ID, mouseLeaveRef.current);
        map.removeLayer(FILL_ID);
      }
      if (map.getLayer(LINE_ID)) map.removeLayer(LINE_ID);
      if (map.getSource(SRC_ID)) map.removeSource(SRC_ID);
    };
  }, [mapRef]);

  return { buildings, error };
}

export function flyToBuilding(map: MLMap, b: BuildingDTO) {
  map.flyTo({
    center: [b.centroidLng, b.centroidLat],
    zoom: 17,
    pitch: 60,
    duration: 1800,
  });
}
