"use client";
import { useEffect, useRef, useState } from "react";
import maplibregl, { Map as MLMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import SidePanel from "./SidePanel";
import { BASEMAPS, BASEMAP_ORDER, type BasemapId } from "@/lib/basemaps";

const DUBAI_CENTER: [number, number] = [55.27, 25.20];

export default function ParcelsMapPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [basemap, setBasemap] = useState<BasemapId>("dark");

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: BASEMAPS.dark.style,
      center: DUBAI_CENTER,
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

  // setStyle replaces the basemap; user-added sources/layers (when we add them
  // later) must be re-attached after the new style finishes loading.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setStyle(BASEMAPS[basemap].style);
  }, [basemap]);

  return (
    <div className="relative w-screen h-screen bg-black">
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />

      {/* Brand */}
      <div className="absolute top-4 left-4 bg-gray-950/90 backdrop-blur text-white px-4 py-3 rounded-xl border border-gray-800 z-10">
        <div className="text-amber-400 font-bold text-lg leading-none">ZAAHI</div>
        <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">Dubai Real Estate OS</div>
      </div>

      {/* Layers (empty placeholder) */}
      <div className="absolute top-24 left-4 w-56 bg-gray-950/90 backdrop-blur text-white rounded-xl border border-gray-800 z-10">
        <div className="px-4 py-2 border-b border-gray-800 text-amber-400 text-xs font-bold uppercase tracking-wider">
          Layers
        </div>
        <div className="px-4 py-3 text-xs text-gray-500">No layers yet</div>
      </div>

      {/* Basemap switcher */}
      <div className="absolute bottom-6 left-4 bg-gray-950/90 backdrop-blur text-white rounded-xl border border-gray-800 z-10 p-1 flex gap-1">
        {BASEMAP_ORDER.map((id) => (
          <button
            key={id}
            onClick={() => setBasemap(id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              basemap === id
                ? "bg-amber-500 text-black"
                : "text-gray-400 hover:bg-gray-800 hover:text-white"
            }`}
          >
            {BASEMAPS[id].label}
          </button>
        ))}
      </div>

      <SidePanel parcelId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}
