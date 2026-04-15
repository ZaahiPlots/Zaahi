"use client";
import { useEffect, useRef } from "react";
import maplibregl, { Map as MLMap, StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

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
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};

export default function MapPreview({
  plot,
  building,
}: {
  plot: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  building?: GeoJSON.Polygon | null;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: ref.current,
      style: RASTER_STYLE,
      center: [55.27, 25.2],
      zoom: 15,
    });
    map.on("load", () => {
      map.addSource("plot", { type: "geojson", data: { type: "Feature", geometry: plot, properties: {} } });
      map.addLayer({ id: "plot-fill", type: "fill", source: "plot", paint: { "fill-color": "#f59e0b", "fill-opacity": 0.25 } });
      map.addLayer({ id: "plot-line", type: "line", source: "plot", paint: { "line-color": "#b45309", "line-width": 2 } });
      if (building) {
        map.addSource("building", { type: "geojson", data: { type: "Feature", geometry: building, properties: {} } });
        map.addLayer({ id: "building-fill", type: "fill", source: "building", paint: { "fill-color": "#ef4444", "fill-opacity": 0.4 } });
        map.addLayer({ id: "building-line", type: "line", source: "building", paint: { "line-color": "#991b1b", "line-width": 2, "line-dasharray": [2, 1] } });
      }
      // Fit
      const bounds = new maplibregl.LngLatBounds();
      const rings = plot.type === "Polygon" ? plot.coordinates : plot.coordinates.flat();
      for (const ring of rings) for (const c of ring) bounds.extend(c as [number, number]);
      map.fitBounds(bounds, { padding: 30, maxZoom: 18 });
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [plot, building]);

  return <div ref={ref} style={{ width: "100%", height: "100%", background: "rgba(10, 22, 40, 0.4)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" }} />;
}
