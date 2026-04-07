"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import maplibregl, { Map as MLMap, StyleSpecification, MapMouseEvent } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

interface Parcel {
  id: string;
  plotNumber: string;
  emirate: string;
  district: string;
  area: number;
  latitude: number | null;
  longitude: number | null;
  status: string;
  currentValuation: string | null;
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon | null;
}

const DUBAI_CENTER: [number, number] = [55.2708, 25.2048];
const SOURCE_ID = "parcels";
const FILL_LAYER = "parcels-fill";
const LINE_LAYER = "parcels-line";

const RASTER_STYLE: StyleSpecification = {
  version: 8,
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

function aedFromFils(fils: string | null): string {
  if (!fils) return "—";
  const aed = Number(BigInt(fils)) / 100;
  return aed.toLocaleString("en-AE", { style: "currency", currency: "AED", maximumFractionDigits: 0 });
}

export default function ParcelsMapPage() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: RASTER_STYLE,
      center: DUBAI_CENTER,
      zoom: 11,
    });
    map.addControl(new maplibregl.NavigationControl());
    map.on("error", (e) => {
      console.error("[map] error", e);
      setError(e?.error?.message ?? "map error");
    });

    map.on("load", async () => {
      try {
        const res = await fetch("/api/parcels?pageSize=200");
        if (!res.ok) throw new Error(`status ${res.status}`);
        const data: { items: Parcel[]; total: number } = await res.json();

        const features: GeoJSON.Feature[] = data.items
          .filter((p) => p.geometry != null)
          .map((p) => ({
            type: "Feature",
            geometry: p.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon,
            properties: {
              id: p.id,
              plotNumber: p.plotNumber,
              district: p.district,
              emirate: p.emirate,
              area: p.area,
              status: p.status,
              valuationAed: aedFromFils(p.currentValuation),
            },
          }));

        map.addSource(SOURCE_ID, {
          type: "geojson",
          data: { type: "FeatureCollection", features },
        });

        map.addLayer({
          id: FILL_LAYER,
          type: "fill",
          source: SOURCE_ID,
          paint: {
            "fill-color": "#f59e0b",
            "fill-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 0.55, 0.3],
          },
        });

        map.addLayer({
          id: LINE_LAYER,
          type: "line",
          source: SOURCE_ID,
          paint: {
            "line-color": "#b45309",
            "line-width": 2,
          },
        });

        // Auto-fit to all parcels
        if (features.length > 0) {
          const bounds = new maplibregl.LngLatBounds();
          for (const f of features) {
            const geom = f.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon;
            const rings =
              geom.type === "Polygon" ? geom.coordinates : geom.coordinates.flat();
            for (const ring of rings) {
              for (const coord of ring) {
                bounds.extend(coord as [number, number]);
              }
            }
          }
          map.fitBounds(bounds, { padding: 60, maxZoom: 16 });
        }

        // Hover state
        let hoveredId: string | number | undefined;
        map.on("mousemove", FILL_LAYER, (e: MapMouseEvent & { features?: GeoJSON.Feature[] }) => {
          map.getCanvas().style.cursor = "pointer";
          const f = e.features?.[0];
          if (!f) return;
          if (hoveredId !== undefined) {
            map.setFeatureState({ source: SOURCE_ID, id: hoveredId }, { hover: false });
          }
          hoveredId = (f.id as string | number | undefined) ?? f.properties?.id;
          if (hoveredId !== undefined) {
            map.setFeatureState({ source: SOURCE_ID, id: hoveredId }, { hover: true });
          }
        });
        map.on("mouseleave", FILL_LAYER, () => {
          map.getCanvas().style.cursor = "";
          if (hoveredId !== undefined) {
            map.setFeatureState({ source: SOURCE_ID, id: hoveredId }, { hover: false });
          }
          hoveredId = undefined;
        });

        // Click → popup
        map.on("click", FILL_LAYER, (e) => {
          const f = e.features?.[0];
          if (!f || !f.properties) return;
          const p = f.properties;
          new maplibregl.Popup({ offset: 8, maxWidth: "260px" })
            .setLngLat(e.lngLat)
            .setHTML(
              `<div style="font-family:system-ui,sans-serif;font-size:13px;line-height:1.45">
                 <div style="font-weight:700;color:#b45309">${p.plotNumber}</div>
                 <div>${p.district}, ${p.emirate}</div>
                 <div>${Number(p.area).toLocaleString()} sqft &middot; ${p.status}</div>
                 <div style="margin-top:4px;font-weight:600">${p.valuationAed}</div>
                 <a href="/parcels/${p.id}" style="display:inline-block;margin-top:6px;color:#b45309;font-weight:600;text-decoration:none">Open details →</a>
               </div>`,
            )
            .addTo(map);
        });

        map.on("dblclick", FILL_LAYER, (e) => {
          const f = e.features?.[0];
          if (f?.properties?.id) router.push(`/parcels/${f.properties.id}`);
        });

        setCount(features.length);
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
    <div className="relative w-screen h-screen bg-white">
      <div
        ref={containerRef}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", background: "#fff" }}
      />
      <div className="absolute top-4 left-4 bg-gray-900/90 text-white px-4 py-2 rounded-xl border border-gray-800 z-10">
        <div className="text-amber-400 font-bold">ZAAHI Parcels</div>
        {error ? (
          <div className="text-red-400 text-sm">{error}</div>
        ) : (
          <div className="text-sm text-gray-300">
            {count == null ? "loading…" : `${count} parcels`}
          </div>
        )}
      </div>
    </div>
  );
}
