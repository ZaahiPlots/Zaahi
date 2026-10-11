"use client";
// Sold plots layer (founder research, spec docs/specs/sold-plots-layer.md §5, §7).
// One clustered GeoJSON source fed by the gated /api/sold-plots/pins route:
//   clusters  → gold circles sized by point_count, with a count label
//   singles   → 6 px circles; gold = a sale in the last 24 months, grey = older
//   approx    → the same singles also get a dashed ring (symbol on a generated image)
// Re-added on every style swap (setStyle wipes sources, layers and images).

import { useEffect, useRef } from "react";
import type { GeoJSONSource, Map as MLMap, MapLayerMouseEvent } from "maplibre-gl";
import { apiFetch } from "@/lib/api-fetch";

export const SOLD_SRC = "sold-plots";
export const SOLD_CLUSTERS = "sold-plots-clusters";
export const SOLD_CLUSTER_COUNT = "sold-plots-cluster-count";
export const SOLD_SINGLES = "sold-plots-singles";
export const SOLD_APPROX = "sold-plots-approx";
const RING_IMG = "sold-plots-approx-ring";
const GOLD = "#C8A96E";
const MUTED = "#6B7280";
const NAVY = "#1A1A2E";
const ALL_LAYERS = [SOLD_CLUSTERS, SOLD_CLUSTER_COUNT, SOLD_SINGLES, SOLD_APPROX];

export interface SoldHover { id: string; n: number; last: string | null; x: number; y: number }
export interface SoldPinsAsof { dxb: string; kit: string; registry: string; projects: string }

type Pins = GeoJSON.FeatureCollection<GeoJSON.Point> & { asof?: SoldPinsAsof };

/** 1 if the last sale month is within 24 months of `now`, else 0. */
export function isRecent(last: string | null, now = new Date()): 0 | 1 {
  const m = last && /^(\d{4})-(\d{2})/.exec(last);
  if (!m) return 0;
  const months = (now.getFullYear() - Number(m[1])) * 12 + (now.getMonth() + 1 - Number(m[2]));
  return months <= 24 ? 1 : 0;
}

function ringImage(): ImageData | null {
  if (typeof document === "undefined") return null;
  const size = 28;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  if (!g) return null;
  g.strokeStyle = GOLD;
  g.lineWidth = 1.5;
  g.setLineDash([3, 3]);
  g.beginPath();
  g.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
  g.stroke();
  return g.getImageData(0, 0, size, size);
}

export function ensureSoldPlotsLayers(map: MLMap, data: Pins, visible: boolean): void {
  const vis = visible ? "visible" : "none";
  if (!map.hasImage(RING_IMG)) {
    const img = ringImage();
    if (img) map.addImage(RING_IMG, img);
  }
  if (!map.getSource(SOLD_SRC)) {
    map.addSource(SOLD_SRC, { type: "geojson", data, cluster: true, clusterRadius: 40, clusterMaxZoom: 13 });
  }
  if (!map.getLayer(SOLD_CLUSTERS)) {
    map.addLayer({
      id: SOLD_CLUSTERS, type: "circle", source: SOLD_SRC, filter: ["has", "point_count"], layout: { visibility: vis },
      paint: {
        "circle-color": GOLD, "circle-opacity": 0.85, "circle-stroke-color": NAVY, "circle-stroke-width": 1.5,
        "circle-radius": ["step", ["get", "point_count"], 13, 25, 17, 100, 22, 500, 28],
      },
    });
  }
  if (!map.getLayer(SOLD_CLUSTER_COUNT)) {
    map.addLayer({
      id: SOLD_CLUSTER_COUNT, type: "symbol", source: SOLD_SRC, filter: ["has", "point_count"],
      layout: { visibility: vis, "text-field": ["get", "point_count_abbreviated"], "text-font": ["Open Sans Regular"], "text-size": 11, "text-allow-overlap": true },
      paint: { "text-color": NAVY },
    });
  }
  if (!map.getLayer(SOLD_SINGLES)) {
    map.addLayer({
      id: SOLD_SINGLES, type: "circle", source: SOLD_SRC, filter: ["!", ["has", "point_count"]], layout: { visibility: vis },
      paint: {
        "circle-radius": 6,
        "circle-color": ["case", ["==", ["get", "recent"], 1], GOLD, MUTED],
        "circle-opacity": 0.9, "circle-stroke-color": NAVY, "circle-stroke-width": 1.5,
      },
    });
  }
  if (!map.getLayer(SOLD_APPROX)) {
    map.addLayer({
      id: SOLD_APPROX, type: "symbol", source: SOLD_SRC, filter: ["all", ["!", ["has", "point_count"]], ["==", ["get", "approx"], true]],
      layout: { visibility: vis, "icon-image": RING_IMG, "icon-allow-overlap": true, "icon-ignore-placement": true },
    });
  }
  for (const id of ALL_LAYERS) if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", vis);
}

export function useSoldPlotsLayer({
  mapRef, mapReady, enabled, onHover, onSelect, onAsof,
}: {
  mapRef: { current: MLMap | null };
  mapReady: boolean;
  enabled: boolean;
  onHover: (h: SoldHover | null) => void;
  onSelect: (id: string) => void;
  onAsof?: (a: SoldPinsAsof) => void;
}) {
  const dataRef = useRef<Pins | null>(null);
  const cb = useRef({ onHover, onSelect, onAsof });
  cb.current = { onHover, onSelect, onAsof };

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    let cancelled = false;
    let bound = false;
    const sync = () => {
      if (!dataRef.current || !map.isStyleLoaded()) return;
      ensureSoldPlotsLayers(map, dataRef.current, enabled);
      // Layer-scoped listeners only once the layers exist (and never while the layer is off):
      // a delegated mousemove on a missing layer would query it on every pointer move.
      if (!bound && enabled) {
        bound = true;
        map.on("mousemove", SOLD_SINGLES, onMove);
        map.on("mouseleave", SOLD_SINGLES, onLeave);
        map.on("click", SOLD_SINGLES, onSingleClick);
        map.on("click", SOLD_CLUSTERS, onClusterClick);
      }
    };
    const onStyle = () => { if (enabled && dataRef.current && !map.getSource(SOLD_SRC)) sync(); };

    const onMove = (e: MapLayerMouseEvent) => {
      const f = e.features?.[0];
      if (!f) return;
      map.getCanvas().style.cursor = "pointer";
      const p = f.properties as { id: string; n: number; last: string | null };
      cb.current.onHover({ id: p.id, n: Number(p.n), last: p.last || null, x: e.point.x, y: e.point.y });
    };
    const onLeave = () => { map.getCanvas().style.cursor = ""; cb.current.onHover(null); };
    const onSingleClick = (e: MapLayerMouseEvent) => {
      const f = e.features?.[0];
      if (f) cb.current.onSelect((f.properties as { id: string }).id);
    };
    const onClusterClick = (e: MapLayerMouseEvent) => {
      const f = e.features?.[0];
      if (!f) return;
      const src = map.getSource(SOLD_SRC) as GeoJSONSource | undefined;
      const center = (f.geometry as GeoJSON.Point).coordinates as [number, number];
      void src?.getClusterExpansionZoom(f.properties?.cluster_id as number).then((zoom) => map.easeTo({ center, zoom }));
    };

    if (enabled) {
      const load = dataRef.current
        ? Promise.resolve()
        : apiFetch("/api/sold-plots/pins")
            .then((r) => (r.ok ? (r.json() as Promise<Pins>) : null))
            .then((fc) => {
              if (!fc) return;
              for (const f of fc.features) (f.properties as Record<string, unknown>).recent = isRecent((f.properties as { last: string | null }).last);
              dataRef.current = fc;
              if (fc.asof) cb.current.onAsof?.(fc.asof);
            })
            .catch(() => undefined);
      void load.then(() => { if (!cancelled) sync(); });
    } else if (map.getLayer(SOLD_SINGLES)) {
      for (const id of ALL_LAYERS) if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", "none");
    }

    map.on("styledata", onStyle);
    return () => {
      cancelled = true;
      map.off("styledata", onStyle);
      map.off("mousemove", SOLD_SINGLES, onMove);
      map.off("mouseleave", SOLD_SINGLES, onLeave);
      map.off("click", SOLD_SINGLES, onSingleClick);
      map.off("click", SOLD_CLUSTERS, onClusterClick);
    };
  }, [mapRef, mapReady, enabled]);
}
