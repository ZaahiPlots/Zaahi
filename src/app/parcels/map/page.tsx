"use client";
import { useEffect, useRef, useState } from "react";
import maplibregl, { Map as MLMap, StyleSpecification, MapMouseEvent } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import SidePanel from "./SidePanel";

interface MapParcel {
  id: string;
  plotNumber: string;
  district: string;
  emirate: string;
  status: string;
  area: number;
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon | null;
  currentValuation: string | null;
  plan: {
    projectName: string | null;
    community: string | null;
    maxFloors: number | null;
    maxHeightMeters: number | null;
    maxHeightCode: string | null;
    plotAreaSqm: number | null;
    maxGfaSqm: number | null;
    far: number | null;
    buildingLimitGeometry: GeoJSON.Polygon | null;
  } | null;
}

const RASTER_STYLE: StyleSpecification = {
  version: 8,
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  sources: {
    osm: {
      type: "raster",
      tiles: [
        "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};

export default function ParcelsMapPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedRef = useRef<string | null>(null);

  useEffect(() => {
    selectedRef.current = selectedId;
    const map = mapRef.current;
    if (!map || !map.getSource("plots")) return;
    // Push selected state into feature-state on plots source
    map.querySourceFeatures("plots").forEach((f) => {
      if (f.id != null) map.setFeatureState({ source: "plots", id: f.id }, { selected: false });
    });
    if (selectedId) {
      map.setFeatureState({ source: "plots", id: selectedId }, { selected: true });
    }
  }, [selectedId]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: RASTER_STYLE,
      center: [55.27, 25.19],
      zoom: 14,
      pitch: 60,
      bearing: -17,
      maxPitch: 75,
    });
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
    map.on("error", (e) => {
      console.error("[map] error", e);
      setError(e?.error?.message ?? "map error");
    });

    map.on("load", async () => {
      try {
        const res = await fetch("/api/parcels/map");
        if (!res.ok) throw new Error(`status ${res.status}`);
        const data: { items: MapParcel[] } = await res.json();

        // ── plots source: territory polygons
        const plotFeatures: GeoJSON.Feature[] = data.items
          .filter((p) => p.geometry)
          .map((p) => ({
            type: "Feature",
            id: p.id,
            geometry: p.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon,
            properties: {
              id: p.id,
              plotNumber: p.plotNumber,
              district: p.district,
            },
          }));

        // ── buildings source: extruded by maxHeightMeters
        const buildingFeatures: GeoJSON.Feature[] = data.items
          .filter((p) => p.plan?.buildingLimitGeometry && p.plan.maxHeightMeters)
          .map((p) => ({
            type: "Feature",
            id: p.id,
            geometry: p.plan!.buildingLimitGeometry as GeoJSON.Polygon,
            properties: {
              id: p.id,
              plotNumber: p.plotNumber,
              height: p.plan!.maxHeightMeters,
              floors: p.plan!.maxFloors,
              project: p.plan!.projectName,
            },
          }));

        map.addSource("plots", {
          type: "geojson",
          data: { type: "FeatureCollection", features: plotFeatures },
          promoteId: "id",
        });
        map.addSource("buildings", {
          type: "geojson",
          data: { type: "FeatureCollection", features: buildingFeatures },
          promoteId: "id",
        });

        // Plot territory — amber translucent fill
        map.addLayer({
          id: "plots-fill",
          type: "fill",
          source: "plots",
          paint: {
            "fill-color": "#f59e0b",
            "fill-opacity": [
              "case",
              ["boolean", ["feature-state", "selected"], false], 0.45,
              ["boolean", ["feature-state", "hover"], false], 0.28,
              0.15,
            ],
          },
        });
        map.addLayer({
          id: "plots-line",
          type: "line",
          source: "plots",
          paint: {
            "line-color": "#b45309",
            "line-width": [
              "case",
              ["boolean", ["feature-state", "selected"], false], 3,
              1.5,
            ],
          },
        });

        // 3D buildings — fill-extrusion using affection plan height
        map.addLayer({
          id: "buildings-3d",
          type: "fill-extrusion",
          source: "buildings",
          paint: {
            "fill-extrusion-color": [
              "case",
              ["boolean", ["feature-state", "selected"], false], "#fbbf24",
              ["boolean", ["feature-state", "hover"], false], "#cbd5e1",
              "#94a3b8",
            ],
            "fill-extrusion-height": ["coalesce", ["get", "height"], 0],
            "fill-extrusion-base": 0,
            "fill-extrusion-opacity": 0.92,
            "fill-extrusion-vertical-gradient": true,
          },
        });

        // Auto-fit
        if (plotFeatures.length > 0) {
          const bounds = new maplibregl.LngLatBounds();
          for (const f of plotFeatures) {
            const geom = f.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon;
            const rings = geom.type === "Polygon" ? geom.coordinates : geom.coordinates.flat();
            for (const ring of rings) for (const c of ring) bounds.extend(c as [number, number]);
          }
          map.fitBounds(bounds, { padding: 80, maxZoom: 17, pitch: 60, bearing: -17 });
        }

        // ── interactions ──
        let hoveredBuildingId: string | null = null;
        let hoveredPlotId: string | null = null;

        function setHover(source: string, idRef: { current: string | null }, newId: string | null) {
          if (idRef.current === newId) return;
          if (idRef.current != null)
            map.setFeatureState({ source, id: idRef.current }, { hover: false });
          idRef.current = newId;
          if (newId != null) map.setFeatureState({ source, id: newId }, { hover: true });
        }
        const bRef = { current: hoveredBuildingId };
        const pRef = { current: hoveredPlotId };

        map.on("mousemove", "buildings-3d", (e: MapMouseEvent & { features?: GeoJSON.Feature[] }) => {
          map.getCanvas().style.cursor = "pointer";
          const f = e.features?.[0];
          const fid = (f?.id as string | undefined) ?? null;
          setHover("buildings", bRef, fid);
          setHover("plots", pRef, fid);
        });
        map.on("mouseleave", "buildings-3d", () => {
          map.getCanvas().style.cursor = "";
          setHover("buildings", bRef, null);
          setHover("plots", pRef, null);
        });
        // Also allow hovering over plot footprints
        map.on("mousemove", "plots-fill", (e: MapMouseEvent & { features?: GeoJSON.Feature[] }) => {
          map.getCanvas().style.cursor = "pointer";
          const f = e.features?.[0];
          const fid = (f?.id as string | undefined) ?? null;
          setHover("plots", pRef, fid);
        });
        map.on("mouseleave", "plots-fill", () => {
          if (bRef.current == null) {
            map.getCanvas().style.cursor = "";
            setHover("plots", pRef, null);
          }
        });

        function selectFromFeature(f: GeoJSON.Feature | undefined) {
          const fid = (f?.id as string | undefined) ?? null;
          if (!fid) return;
          setSelectedId(fid);
        }
        map.on("click", "buildings-3d", (e) => selectFromFeature(e.features?.[0]));
        map.on("click", "plots-fill", (e) => selectFromFeature(e.features?.[0]));

        setCount(buildingFeatures.length);
      } catch (e) {
        setError(e instanceof Error ? e.message : "load failed");
      }
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div className="relative w-screen h-screen bg-black">
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />

      <div className="absolute top-4 left-4 bg-gray-950/90 backdrop-blur text-white px-4 py-3 rounded-xl border border-gray-800 z-10">
        <div className="text-amber-400 font-bold text-lg leading-none">ZAAHI</div>
        <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">Dubai Real Estate OS</div>
        {error ? (
          <div className="text-red-400 text-xs mt-2">{error}</div>
        ) : (
          <div className="text-xs text-gray-300 mt-2">
            {count == null ? "loading…" : `${count} buildings on map`}
          </div>
        )}
      </div>

      <SidePanel parcelId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}
