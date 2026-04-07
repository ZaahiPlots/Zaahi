"use client";
import { useEffect, useRef, useState } from "react";
import maplibregl, { Map as MLMap, Marker, Popup } from "maplibre-gl";
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
}

const DUBAI_CENTER: [number, number] = [55.2708, 25.2048];

export default function ParcelsMapPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    mapRef.current = new maplibregl.Map({
      container: containerRef.current,
      style: "https://tiles.openfreemap.org/styles/positron",
      center: DUBAI_CENTER,
      zoom: 9,
    });
    mapRef.current.addControl(new maplibregl.NavigationControl());
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // fetch + render parcels
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/parcels?pageSize=100");
        if (!res.ok) throw new Error(`status ${res.status}`);
        const data: { items: Parcel[]; total: number } = await res.json();
        if (cancelled || !mapRef.current) return;

        // clear old markers
        markersRef.current.forEach((m) => m.remove());
        markersRef.current = [];

        const withCoords = data.items.filter(
          (p) => typeof p.latitude === "number" && typeof p.longitude === "number",
        );
        for (const p of withCoords) {
          const popup = new maplibregl.Popup({ offset: 12 }).setHTML(
            `<div style="font-family:sans-serif">
               <strong>${p.plotNumber}</strong><br/>
               ${p.district}, ${p.emirate}<br/>
               ${p.area.toLocaleString()} sqft &middot; ${p.status}
             </div>`,
          );
          const marker = new maplibregl.Marker({ color: "#f59e0b" })
            .setLngLat([p.longitude as number, p.latitude as number])
            .setPopup(popup)
            .addTo(mapRef.current);
          markersRef.current.push(marker);
        }
        setCount(data.total);
      } catch (e) {
        setError(e instanceof Error ? e.message : "load failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="relative w-full h-screen bg-black">
      <div ref={containerRef} className="absolute inset-0" />
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
