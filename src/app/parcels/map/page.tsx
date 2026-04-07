"use client";
import { useEffect, useRef, useState } from "react";
import maplibregl, { Map as MLMap, StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import SidePanel from "./SidePanel";

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

export default function ParcelsMapPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [plotInput, setPlotInput] = useState("");

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: RASTER_STYLE,
      center: [55.27, 25.19],
      zoom: 11,
      pitch: 60,
      bearing: -17,
      maxPitch: 75,
    });
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  function handleAddPlot(e: React.FormEvent) {
    e.preventDefault();
    // TODO: ingest pipeline (DDA fetch → save → render)
    console.log("add plot", plotInput);
  }

  return (
    <div className="relative w-screen h-screen bg-black">
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />

      {/* Brand badge */}
      <div className="absolute top-4 left-4 bg-gray-950/90 backdrop-blur text-white px-4 py-3 rounded-xl border border-gray-800 z-10">
        <div className="text-amber-400 font-bold text-lg leading-none">ZAAHI</div>
        <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">Dubai Real Estate OS</div>
      </div>

      {/* Layer switcher (empty placeholder) */}
      <div className="absolute top-24 left-4 w-56 bg-gray-950/90 backdrop-blur text-white rounded-xl border border-gray-800 z-10">
        <div className="px-4 py-2 border-b border-gray-800 text-amber-400 text-xs font-bold uppercase tracking-wider">
          Layers
        </div>
        <div className="px-4 py-3 text-xs text-gray-500">No layers yet</div>
      </div>

      {/* Add Plot Number */}
      <form
        onSubmit={handleAddPlot}
        className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex gap-2 bg-gray-950/90 backdrop-blur border border-gray-800 rounded-xl p-2"
      >
        <input
          value={plotInput}
          onChange={(e) => setPlotInput(e.target.value)}
          placeholder="Plot number"
          className="bg-gray-900 text-white px-3 py-2 rounded-lg text-sm w-44 outline-none focus:ring-1 focus:ring-amber-500"
        />
        <button
          type="submit"
          disabled={!plotInput}
          className="px-4 py-2 rounded-lg bg-amber-500 text-black font-bold text-sm hover:bg-amber-400 disabled:opacity-50"
        >
          Add to ZAAHI
        </button>
      </form>

      <SidePanel parcelId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}
