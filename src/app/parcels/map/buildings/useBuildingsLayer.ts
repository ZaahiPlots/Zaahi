// React hook wiring the digital-twin Buildings layer into /parcels/map.
//
// Responsibilities:
//   1. Fetch /api/buildings once the map is ready.
//   2. For each building with modelPath → create a MapLibre CustomLayer
//      that renders the glTF at the building's real centroid.
//   3. Publish a clickable MapLibre GeoJSON pin source (circle layer)
//      with one feature per building — click opens the BuildingCard.
//   4. Toggle ALL per-building layers + the pin layer on/off via a
//      single "completed/UC visible" flag.
//   5. Clean up on unmount (removeLayer + removeSource).
//
// The hook is additive — it does not touch any existing ZAAHI Signature
// layer, source, mouse handler, or selection logic on /parcels/map.

import { useEffect, useRef } from "react";
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
  buildingLayerId,
  createBuildingGlbLayer,
} from "./BuildingGlbLayer";

const PIN_SRC_ID = "zaahi-buildings-pins";
const PIN_CIRCLE_ID = "zaahi-buildings-pin-circle";
const PIN_HALO_ID = "zaahi-buildings-pin-halo";

const STATUS_COLOR: Record<string, string> = {
  COMPLETED: "#C8A96E",          // ZAAHI gold
  UNDER_CONSTRUCTION: "#E67E22", // amber — matches 9-category UNDER
  PLANNED: "#6B7280",            // subtle grey
};

interface Options {
  mapRef: MutableRefObject<MLMap | null>;
  mapReady: boolean;               // true once the style has finished loading
  enabled: boolean;                // master on/off toggle
  statusFilter?: BuildingDTO["status"][]; // per-status sub-toggles
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
  const buildingsRef = useRef<BuildingDTO[]>([]);
  const liveLayersRef = useRef<LiveLayer[]>([]);
  const clickHandlerRef = useRef<((e: MapMouseEvent & { features?: MapGeoJSONFeature[] }) => void) | null>(null);
  const mouseEnterRef = useRef<(() => void) | null>(null);
  const mouseLeaveRef = useRef<(() => void) | null>(null);
  const resultRef = useRef<{ buildings: BuildingDTO[]; error: string | null }>({
    buildings: [],
    error: null,
  });

  // ── Fetch once on mount ──────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    apiFetch("/api/buildings")
      .then(async (res) => {
        if (!res.ok) throw new Error(`GET /api/buildings ${res.status}`);
        const json = (await res.json()) as { items: BuildingDTO[] };
        if (cancelled) return;
        buildingsRef.current = json.items ?? [];
        resultRef.current = { buildings: buildingsRef.current, error: null };
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.error("[buildings] fetch failed", err);
        resultRef.current = {
          buildings: [],
          error: err instanceof Error ? err.message : String(err),
        };
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Effect: attach / detach layers based on enabled + mapReady ───
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const activeBuildings = buildingsRef.current.filter((b) => {
      if (!enabled) return false;
      if (statusFilter && statusFilter.length > 0) {
        return statusFilter.includes(b.status);
      }
      return true;
    });

    // ── Pin source + circle layers (one feature per active building) ──
    const pinFc: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: activeBuildings.map((b) => ({
        type: "Feature" as const,
        id: b.id,
        geometry: {
          type: "Point" as const,
          coordinates: [b.centroidLng, b.centroidLat],
        },
        properties: {
          id: b.id,
          name: b.name,
          status: b.status,
        },
      })),
    };

    const existingSrc = map.getSource(PIN_SRC_ID) as GeoJSONSource | undefined;
    if (existingSrc) {
      existingSrc.setData(pinFc);
    } else {
      map.addSource(PIN_SRC_ID, { type: "geojson", data: pinFc });

      map.addLayer({
        id: PIN_HALO_ID,
        type: "circle",
        source: PIN_SRC_ID,
        paint: {
          "circle-radius": 14,
          "circle-color": [
            "match",
            ["get", "status"],
            "COMPLETED", STATUS_COLOR.COMPLETED,
            "UNDER_CONSTRUCTION", STATUS_COLOR.UNDER_CONSTRUCTION,
            "PLANNED", STATUS_COLOR.PLANNED,
            /* other */ "#C8A96E",
          ],
          "circle-opacity": 0.18,
          "circle-blur": 0.4,
        },
      });

      map.addLayer({
        id: PIN_CIRCLE_ID,
        type: "circle",
        source: PIN_SRC_ID,
        paint: {
          "circle-radius": 6,
          "circle-color": [
            "match",
            ["get", "status"],
            "COMPLETED", STATUS_COLOR.COMPLETED,
            "UNDER_CONSTRUCTION", STATUS_COLOR.UNDER_CONSTRUCTION,
            "PLANNED", STATUS_COLOR.PLANNED,
            /* other */ "#C8A96E",
          ],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2,
          "circle-opacity": 1,
        },
      });

      // Click on pin → open card.
      const clickHandler = (
        e: MapMouseEvent & { features?: MapGeoJSONFeature[] },
      ) => {
        const f = e.features?.[0];
        const id = f?.properties?.id;
        if (typeof id === "string") onSelectBuilding(id);
      };
      const mouseEnter = () => {
        map.getCanvas().style.cursor = "pointer";
      };
      const mouseLeave = () => {
        map.getCanvas().style.cursor = "";
      };

      map.on("click", PIN_CIRCLE_ID, clickHandler);
      map.on("mouseenter", PIN_CIRCLE_ID, mouseEnter);
      map.on("mouseleave", PIN_CIRCLE_ID, mouseLeave);

      clickHandlerRef.current = clickHandler;
      mouseEnterRef.current = mouseEnter;
      mouseLeaveRef.current = mouseLeave;
    }

    // Toggle pin visibility.
    const pinVisibility = enabled ? "visible" : "none";
    if (map.getLayer(PIN_HALO_ID)) {
      map.setLayoutProperty(PIN_HALO_ID, "visibility", pinVisibility);
    }
    if (map.getLayer(PIN_CIRCLE_ID)) {
      map.setLayoutProperty(PIN_CIRCLE_ID, "visibility", pinVisibility);
    }

    // ── Per-building glTF CustomLayers ──
    const targetIds = new Set(
      activeBuildings.filter((b) => b.modelPath).map((b) => b.id),
    );

    // Remove layers that are no longer needed.
    liveLayersRef.current = liveLayersRef.current.filter((live) => {
      if (!targetIds.has(live.buildingId)) {
        if (map.getLayer(live.layerId)) map.removeLayer(live.layerId);
        return false;
      }
      return true;
    });

    // Add layers for any newly-visible buildings.
    const liveIds = new Set(liveLayersRef.current.map((l) => l.buildingId));
    for (const b of activeBuildings) {
      if (!b.modelPath) continue;
      if (liveIds.has(b.id)) continue;

      const modelUrl = b.modelPath.startsWith("/") ? b.modelPath : `/${b.modelPath}`;
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
      }
      liveLayersRef.current.push({ buildingId: b.id, layerId: layer.id });
    }
  }, [mapRef, mapReady, enabled, statusFilter, onSelectBuilding]);

  // ── Cleanup on full unmount ──────────────────────────────────────
  useEffect(() => {
    return () => {
      const map = mapRef.current;
      if (!map) return;

      for (const live of liveLayersRef.current) {
        if (map.getLayer(live.layerId)) map.removeLayer(live.layerId);
      }
      liveLayersRef.current = [];

      if (map.getLayer(PIN_CIRCLE_ID)) {
        if (clickHandlerRef.current)
          map.off("click", PIN_CIRCLE_ID, clickHandlerRef.current);
        if (mouseEnterRef.current)
          map.off("mouseenter", PIN_CIRCLE_ID, mouseEnterRef.current);
        if (mouseLeaveRef.current)
          map.off("mouseleave", PIN_CIRCLE_ID, mouseLeaveRef.current);
        map.removeLayer(PIN_CIRCLE_ID);
      }
      if (map.getLayer(PIN_HALO_ID)) map.removeLayer(PIN_HALO_ID);
      if (map.getSource(PIN_SRC_ID)) map.removeSource(PIN_SRC_ID);
    };
  }, [mapRef]);

  return resultRef.current;
}

export function flyToBuilding(map: MLMap, b: BuildingDTO) {
  map.flyTo({
    center: [b.centroidLng, b.centroidLat],
    zoom: 17,
    pitch: 60,
    duration: 1800,
  });
}
