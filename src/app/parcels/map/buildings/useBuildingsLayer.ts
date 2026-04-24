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
//
// 2026-04-24 rev: storage of fetched buildings moved from `useRef` to
// `useState` because the previous ref-based design didn't re-render the
// parent when the fetch completed. If the fetch finished AFTER the
// map-ready transition, the main effect had already run once with an
// empty list and nothing re-triggered it — pins + 3D layers silently
// never got added. Also: `onSelectBuilding` is now read through a ref so
// parent re-renders don't churn the layer effect, and every branch
// console.logs under "[BUILDINGS]" for visibility in browser devtools.

import { useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import type {
  ExpressionSpecification,
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
  UNDER_CONSTRUCTION: "#E67E22", // amber
  PLANNED: "#6B7280",            // subtle grey
};

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

  // Ref mirror of the latest onSelectBuilding so we can register the pin
  // click handler once and still invoke the latest callback.
  const onSelectBuildingRef = useRef(onSelectBuilding);
  onSelectBuildingRef.current = onSelectBuilding;

  const liveLayersRef = useRef<LiveLayer[]>([]);
  const handlersInstalledRef = useRef(false);
  const clickHandlerRef = useRef<
    ((e: MapMouseEvent & { features?: MapGeoJSONFeature[] }) => void) | null
  >(null);
  const mouseEnterRef = useRef<(() => void) | null>(null);
  const mouseLeaveRef = useRef<(() => void) | null>(null);
  const mapClickDiagRef = useRef<((e: MapMouseEvent) => void) | null>(null);

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

  // ── Effect: attach / detach layers based on enabled + mapReady + buildings ──
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
      console.log("[BUILDINGS] installing pin source + layers");
      map.addSource(PIN_SRC_ID, { type: "geojson", data: pinFc });

      // Zoom-responsive radii so the pin stays visible when zoomed out
      // AND clickable when zoomed into the tower (at z17+ the 3D model
      // renders on top of a 6 px dot; users click the tower and miss the
      // pin). MapLibre's layer-scoped click picker is 2D — radius here
      // is literally the hit zone. 28 px at z20 gives a forgiving target.
      const circleRadiusExpr: ExpressionSpecification = [
        "interpolate",
        ["linear"],
        ["zoom"],
        10, 6,
        14, 10,
        16, 16,
        18, 22,
        20, 28,
      ];
      const haloRadiusExpr: ExpressionSpecification = [
        "interpolate",
        ["linear"],
        ["zoom"],
        10, 14,
        14, 22,
        16, 32,
        18, 44,
        20, 56,
      ];

      map.addLayer({
        id: PIN_HALO_ID,
        type: "circle",
        source: PIN_SRC_ID,
        paint: {
          "circle-radius": haloRadiusExpr,
          "circle-color": [
            "match",
            ["get", "status"],
            "COMPLETED", STATUS_COLOR.COMPLETED,
            "UNDER_CONSTRUCTION", STATUS_COLOR.UNDER_CONSTRUCTION,
            "PLANNED", STATUS_COLOR.PLANNED,
            "#C8A96E",
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
          "circle-radius": circleRadiusExpr,
          "circle-color": [
            "match",
            ["get", "status"],
            "COMPLETED", STATUS_COLOR.COMPLETED,
            "UNDER_CONSTRUCTION", STATUS_COLOR.UNDER_CONSTRUCTION,
            "PLANNED", STATUS_COLOR.PLANNED,
            "#C8A96E",
          ],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2,
          "circle-opacity": 1,
        },
      });
    }

    if (!handlersInstalledRef.current && map.getLayer(PIN_CIRCLE_ID)) {
      const clickHandler = (
        e: MapMouseEvent & { features?: MapGeoJSONFeature[] },
      ) => {
        const f = e.features?.[0];
        const id = f?.properties?.id;
        console.log("[BUILDINGS] pin click", { id });
        if (typeof id === "string") onSelectBuildingRef.current(id);
      };
      const mouseEnter = () => {
        map.getCanvas().style.cursor = "pointer";
      };
      const mouseLeave = () => {
        map.getCanvas().style.cursor = "";
      };

      // Backup: a map-level click that queries the pin layers via
      // queryRenderedFeatures and fires onSelectBuilding if a pin is
      // under the cursor. The layer-scoped `map.on('click', LAYER, fn)`
      // is the primary path, but if something is interfering (e.g. a
      // CustomLayer above the pin, or an unusual state where the
      // layer-scoped bucket isn't registering), this second handler
      // catches the click anyway. Also logs every click so we can
      // confirm in devtools whether MapLibre sees the pin at the
      // click point at all.
      const mapClickDiag = (e: MapMouseEvent) => {
        if (!map.getLayer(PIN_CIRCLE_ID)) return;
        const hits = map.queryRenderedFeatures(e.point, {
          layers: [PIN_CIRCLE_ID, PIN_HALO_ID],
        });
        if (hits.length === 0) return;
        const id = hits[0].properties?.id;
        console.log(
          "[BUILDINGS] map-level click caught a pin @",
          e.lngLat.toArray(),
          "hits:",
          hits.length,
          "first id:",
          id,
        );
        if (typeof id === "string") onSelectBuildingRef.current(id);
      };

      map.on("click", PIN_CIRCLE_ID, clickHandler);
      map.on("mouseenter", PIN_CIRCLE_ID, mouseEnter);
      map.on("mouseleave", PIN_CIRCLE_ID, mouseLeave);
      map.on("click", mapClickDiag);
      clickHandlerRef.current = clickHandler;
      mouseEnterRef.current = mouseEnter;
      mouseLeaveRef.current = mouseLeave;
      mapClickDiagRef.current = mapClickDiag;
      handlersInstalledRef.current = true;
      console.log("[BUILDINGS] pin click handlers installed (layer-scoped + map-level backup)");
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

    // Add layers for any newly-visible buildings.
    const liveIds = new Set(liveLayersRef.current.map((l) => l.buildingId));
    for (const b of activeBuildings) {
      if (!b.modelPath) {
        console.log(
          "[BUILDINGS] building",
          b.name,
          "has no modelPath — skipping GLB layer (pin-only)",
        );
        continue;
      }
      if (liveIds.has(b.id)) {
        console.log(
          "[BUILDINGS] layer for",
          b.name,
          "already present — skipping re-add",
        );
        continue;
      }

      const modelUrl = b.modelPath.startsWith("/") ? b.modelPath : `/${b.modelPath}`;
      console.log(
        "[BUILDINGS] addLayer for",
        b.name,
        "modelUrl:",
        modelUrl,
        "scaleFactor:",
        b.scaleFactor,
        "rotationDeg:",
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

    // After the CustomLayers are in place, lift the pin layers to the
    // absolute top of the layer stack. MapLibre renders in add-order;
    // each CustomLayer was added AFTER the pins, so without this move
    // the 3D tower visually occludes the pin. Moving the pin above puts
    // the gold dot in front of the façade — users can see what to click,
    // and the halo is the unmistakable target. Click picking itself is
    // 2D-radius-based and already works regardless, but visual guidance
    // matters.
    if (map.getLayer(PIN_HALO_ID)) {
      try {
        map.moveLayer(PIN_HALO_ID);
      } catch {
        /* layer missing or race — benign */
      }
    }
    if (map.getLayer(PIN_CIRCLE_ID)) {
      try {
        map.moveLayer(PIN_CIRCLE_ID);
      } catch {
        /* layer missing or race — benign */
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

      if (map.getLayer(PIN_CIRCLE_ID)) {
        if (clickHandlerRef.current)
          map.off("click", PIN_CIRCLE_ID, clickHandlerRef.current);
        if (mouseEnterRef.current)
          map.off("mouseenter", PIN_CIRCLE_ID, mouseEnterRef.current);
        if (mouseLeaveRef.current)
          map.off("mouseleave", PIN_CIRCLE_ID, mouseLeaveRef.current);
        map.removeLayer(PIN_CIRCLE_ID);
      }
      if (mapClickDiagRef.current) {
        map.off("click", mapClickDiagRef.current);
      }
      if (map.getLayer(PIN_HALO_ID)) map.removeLayer(PIN_HALO_ID);
      if (map.getSource(PIN_SRC_ID)) map.removeSource(PIN_SRC_ID);
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

// Keep the named export consumers imported to avoid the unused-import lint
// rule tripping on the helper while keeping the symbol exportable.
export { buildingLayerId };
