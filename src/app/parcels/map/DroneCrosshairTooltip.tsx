"use client";

// ZAAHI drone — crosshair plot tooltip (founder spec 2026-06-10).
//
// Throttled queryRenderedFeatures at the centre of the viewport. When the
// crosshair is over a plot in one of the ZAAHI / DDA / AD layers, surface
// a micro glassmorphism card to the right of the crosshair: plot number,
// area, category, status. Fades out when no plot is under crosshair.
//
// Reads layer IDs from page.tsx via props since the constants there
// (ZAAHI_PLOTS_FILL, DDA_LAND_TILES_FILL, AD_*_TILES_FILL) are local to
// the page module. We don't import them — props keep this component
// reusable if the renderer architecture changes.

import { useEffect, useRef, useState } from "react";
import type { Map as MLMap } from "maplibre-gl";
import {
  CROSSHAIR_QUERY_THROTTLE_MS,
  GLASS_BG,
  GLASS_BORDER,
  GLASS_BLUR,
  GOLD,
} from "@/lib/drone/constants";

export interface CrosshairTooltipProps {
  visible: boolean;
  mapRef: React.RefObject<MLMap | null>;
  layerIds: string[];
  /** Notify parent whenever the selectable-plot flag changes so the HUD
   *  crosshair can recolour gold ↔ neutral. */
  onSelectableChange: (over: boolean) => void;
}

interface PlotInfo {
  plotNumber: string;
  areaSqft: number | null;
  landUse: string | null;
  status: string | null;
}

function pickInfo(feature: maplibregl.MapGeoJSONFeature): PlotInfo | null {
  const p = (feature.properties ?? {}) as Record<string, unknown>;
  const plotNumber =
    (typeof p.plotNumber === "string" && p.plotNumber) ||
    (typeof p.PLOT_NUMBER === "string" && p.PLOT_NUMBER) ||
    null;
  if (!plotNumber) return null;
  const areaSqftRaw =
    (typeof p.areaSqft === "number" && p.areaSqft) ||
    (typeof p.AREA_SQFT === "number" && p.AREA_SQFT) ||
    null;
  const areaSqmFallback =
    (typeof p.areaSqm === "number" && p.areaSqm * 10.7639) ||
    (typeof p.AREA_SQM === "number" && p.AREA_SQM * 10.7639) ||
    null;
  return {
    plotNumber,
    areaSqft: typeof areaSqftRaw === "number" ? areaSqftRaw : areaSqmFallback,
    landUse:
      (typeof p.landUse === "string" && p.landUse) ||
      (typeof p.mainLandUse === "string" && p.mainLandUse) ||
      (typeof p.MAIN_LANDUSE === "string" && p.MAIN_LANDUSE) ||
      null,
    status:
      (typeof p.status === "string" && p.status) ||
      (typeof p.CONSTRUCTION_STATUS === "string" && p.CONSTRUCTION_STATUS) ||
      null,
  };
}

function fmtArea(sqft: number | null): string {
  if (!sqft || !Number.isFinite(sqft) || sqft <= 0) return "—";
  if (sqft >= 1_000_000) return `${(sqft / 1_000_000).toFixed(2)}M sqft`;
  if (sqft >= 1000) return `${Math.round(sqft).toLocaleString()} sqft`;
  return `${sqft.toFixed(0)} sqft`;
}
function tidyLandUse(s: string | null): string {
  if (!s) return "—";
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function DroneCrosshairTooltip({
  visible,
  mapRef,
  layerIds,
  onSelectableChange,
}: CrosshairTooltipProps) {
  const [info, setInfo] = useState<PlotInfo | null>(null);
  const lastSelectableRef = useRef(false);

  useEffect(() => {
    if (!visible) {
      setInfo(null);
      if (lastSelectableRef.current) {
        lastSelectableRef.current = false;
        onSelectableChange(false);
      }
      return;
    }
    let cancelled = false;
    const id = window.setInterval(() => {
      const map = mapRef.current;
      if (!map || cancelled) return;
      const w = map.getCanvas().clientWidth;
      const h = map.getCanvas().clientHeight;
      const presentLayers = layerIds.filter((lid) => !!map.getLayer(lid));
      if (presentLayers.length === 0) return;
      const features = map.queryRenderedFeatures([w / 2, h / 2], {
        layers: presentLayers,
      });
      let picked: PlotInfo | null = null;
      for (const f of features) {
        picked = pickInfo(f);
        if (picked) break;
      }
      const wasSelectable = lastSelectableRef.current;
      const isSelectable = !!picked;
      if (wasSelectable !== isSelectable) {
        lastSelectableRef.current = isSelectable;
        onSelectableChange(isSelectable);
      }
      setInfo(picked);
    }, CROSSHAIR_QUERY_THROTTLE_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [visible, mapRef, layerIds, onSelectableChange]);

  if (!visible || !info) return null;

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        left: "calc(50% + 22px)",
        top: "calc(50% - 8px)",
        padding: "8px 12px",
        background: GLASS_BG,
        backdropFilter: GLASS_BLUR,
        WebkitBackdropFilter: GLASS_BLUR,
        border: `1px solid ${GLASS_BORDER}`,
        borderRadius: 8,
        color: "#fff",
        fontSize: 11,
        fontFamily: '"SF Mono", Menlo, Consolas, monospace',
        lineHeight: 1.5,
        pointerEvents: "none",
        zIndex: 37,
        maxWidth: 260,
        opacity: 0.96,
        transition: "opacity 150ms ease",
      }}
    >
      <div style={{ color: GOLD, letterSpacing: "0.1em", fontWeight: 700 }}>
        {info.plotNumber}
      </div>
      <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 10 }}>
        {fmtArea(info.areaSqft)} · {tidyLandUse(info.landUse)}
      </div>
      {info.status && (
        <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 10 }}>{info.status}</div>
      )}
    </div>
  );
}
