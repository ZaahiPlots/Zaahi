"use client";
import { useEffect, useRef, useState } from "react";
import maplibregl, { Map as MLMap, StyleSpecification, MapMouseEvent } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

type Theme = "light" | "dark";

const STYLES: Record<Theme, StyleSpecification> = {
  light: {
    version: 8,
    sources: {
      carto: {
        type: "raster",
        tiles: [
          "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
          "https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
          "https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
        ],
        tileSize: 256,
        attribution: "© CARTO © OpenStreetMap contributors",
      },
    },
    layers: [{ id: "carto", type: "raster", source: "carto" }],
  },
  dark: {
    version: 8,
    sources: {
      carto: {
        type: "raster",
        tiles: [
          "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
          "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
          "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
        ],
        tileSize: 256,
        attribution: "© CARTO © OpenStreetMap contributors",
      },
    },
    layers: [{ id: "carto", type: "raster", source: "carto" }],
  },
};

const PALETTE: Record<Theme, {
  bg: string;
  text: string;
  textDim: string;
  border: string;
  borderSubtle: string;
  headerShadow: string;
}> = {
  light: {
    bg: "#FFFFFF",
    text: "#1A1A2E",
    textDim: "#8892a0",
    border: "#E5E5E5",
    borderSubtle: "#F0F0F0",
    headerShadow: "0 2px 12px rgba(0,0,0,0.08)",
  },
  dark: {
    bg: "#0A1628",
    text: "#E8E0D0",
    textDim: "#7a8a9c",
    border: "#1E3A5F",
    borderSubtle: "#152840",
    headerShadow: "0 2px 12px rgba(0,0,0,0.6)",
  },
};

const GOLD = "#C8A96E";
const COMMUNITIES_SRC = "communities";
const COMMUNITIES_LINE = "communities-line";
const COMMUNITIES_FILL = "communities-fill"; // invisible, only for hit-testing
const ROADS_SRC = "roads";
const ROADS_LINE = "roads-line";
const ISLANDS_SRC = "dubai-islands";
const ISLANDS_LINE = "dubai-islands-line";
const MEYDAN_SRC = "meydan-horizon";
const MEYDAN_LINE = "meydan-horizon-line";
const PEARL_SRC = "pearl-jumeirah";
const PEARL_LINE = "pearl-jumeirah-line";
const D11_SRC = "d11-parcel-ld";
const D11_LINE = "d11-parcel-ld-line";
const DUBAI_HILLS_SRC = "dda-dubai-hills";
const DUBAI_HILLS_LINE = "dda-dubai-hills-line";
const DAMAC_HILLS_2_SRC = "dda-damac-hills-2";
const DAMAC_HILLS_2_LINE = "dda-damac-hills-2-line";
const DAMAC_LAGOONS_SRC = "dda-damac-lagoons";
const DAMAC_LAGOONS_LINE = "dda-damac-lagoons-line";
const DAMAC_ISLANDS_SRC = "dda-damac-islands";
const DAMAC_ISLANDS_LINE = "dda-damac-islands-line";
const THE_VALLEY_SRC = "dda-the-valley";
const THE_VALLEY_LINE = "dda-the-valley-line";
const DAMAC_HILLS_SRC = "dda-damac-hills";
const DAMAC_HILLS_LINE = "dda-damac-hills-line";
const MUDON_SRC = "dda-mudon";
const MUDON_LINE = "dda-mudon-line";
const JABEL_ALI_HILLS_SRC = "dda-jabel-ali-hills";
const JABEL_ALI_HILLS_LINE = "dda-jabel-ali-hills-line";

export default function ParcelsMapPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const [theme, setTheme] = useState<Theme>("light");
  const [cursor, setCursor] = useState({ lng: 55.27, lat: 25.20 });
  const [zoom, setZoom] = useState(12);
  const [layers, setLayers] = useState({
    communities: true,
    roads: true,
    islands: true,
    meydan: true,
    pearl: true,
    d11: true,
    dubaiHills: true,
    damacHills2: true,
    damacLagoons: true,
    damacIslands: true,
    theValley: true,
    damacHills: true,
    mudon: true,
    jabelAliHills: true,
  });
  const layersRef = useRef(layers);
  layersRef.current = layers;
  const themeRef = useRef<Theme>("light");
  themeRef.current = theme;

  // Load all overlay layers onto a fresh style. Idempotent: won't re-add
  // sources that already exist (each call after setStyle attaches fresh).
  async function attachOverlays(map: MLMap) {
    const isDark = themeRef.current === "dark";
    const roadsColor = isDark ? "#888888" : "#666666";

    // ── Communities ────────────────────────────────────────────────
    if (!map.getSource(COMMUNITIES_SRC)) {
      try {
        const r = await fetch("/api/layers/communities");
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(COMMUNITIES_SRC, { type: "geojson", data, promoteId: "COMM_NUM" });
        map.addLayer({
          id: COMMUNITIES_FILL,
          type: "fill",
          source: COMMUNITIES_SRC,
          paint: {
            "fill-color": GOLD,
            "fill-opacity": [
              "case",
              ["boolean", ["feature-state", "hover"], false], 0.12,
              0,
            ],
          },
        });
        map.addLayer({
          id: COMMUNITIES_LINE,
          type: "line",
          source: COMMUNITIES_SRC,
          paint: {
            "line-color": GOLD,
            "line-width": [
              "case",
              ["boolean", ["feature-state", "hover"], false], 2,
              1,
            ],
            "line-opacity": 0.85,
          },
        });
      } catch (e) {
        console.error("[communities] load failed", e);
      }
    }

    // ── Roads ──────────────────────────────────────────────────────
    if (!map.getSource(ROADS_SRC)) {
      try {
        const r = await fetch("/api/layers/roads");
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(ROADS_SRC, { type: "geojson", data });
        map.addLayer({
          id: ROADS_LINE,
          type: "line",
          source: ROADS_SRC,
          paint: {
            "line-color": roadsColor,
            "line-width": 2,
            "line-opacity": 0.7,
          },
          layout: { "line-cap": "round", "line-join": "round" },
        });
      } catch (e) {
        console.error("[roads] load failed", e);
      }
    }

    // ── Master plans (purple dashed) ───────────────────────────────
    const masterPlanPaint: maplibregl.LineLayerSpecification["paint"] = {
      "line-color": "#9333EA",
      "line-width": 1.5,
      "line-opacity": 0.7,
      "line-dasharray": [3, 2],
    };

    if (!map.getSource(ISLANDS_SRC)) {
      try {
        const r = await fetch("/api/layers/dubai-islands");
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(ISLANDS_SRC, { type: "geojson", data });
        map.addLayer({
          id: ISLANDS_LINE,
          type: "line",
          source: ISLANDS_SRC,
          paint: { ...masterPlanPaint },
        });
      } catch (e) {
        console.error("[dubai-islands] load failed", e);
      }
    }

    if (!map.getSource(MEYDAN_SRC)) {
      try {
        const r = await fetch("/api/layers/masterplans/meydan-horizon");
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(MEYDAN_SRC, { type: "geojson", data });
        map.addLayer({
          id: MEYDAN_LINE,
          type: "line",
          source: MEYDAN_SRC,
          paint: { ...masterPlanPaint },
        });
      } catch (e) {
        console.error("[meydan-horizon] load failed", e);
      }
    }

    if (!map.getSource(PEARL_SRC)) {
      try {
        const r = await fetch("/api/layers/masterplans/pearl-jumeirah");
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(PEARL_SRC, { type: "geojson", data });
        map.addLayer({
          id: PEARL_LINE,
          type: "line",
          source: PEARL_SRC,
          paint: { ...masterPlanPaint },
        });
      } catch (e) {
        console.error("[pearl-jumeirah] load failed", e);
      }
    }

    if (!map.getSource(D11_SRC)) {
      try {
        const r = await fetch("/api/layers/masterplans/d11-parcel-ld");
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(D11_SRC, { type: "geojson", data });
        map.addLayer({
          id: D11_LINE,
          type: "line",
          source: D11_SRC,
          paint: { ...masterPlanPaint },
        });
      } catch (e) {
        console.error("[d11-parcel-ld] load failed", e);
      }
    }

    // ── Dubai Hills (DDA) ──────────────────────────────────────────
    if (!map.getSource(DUBAI_HILLS_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/dubai-hills");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(DUBAI_HILLS_SRC, { type: "geojson", data });
        map.addLayer({
          id: DUBAI_HILLS_LINE,
          type: "line",
          source: DUBAI_HILLS_SRC,
          paint: { ...masterPlanPaint },
        });
      } catch (e) {
        console.error("[dubai-hills] load failed", e);
      }
    }

    // ── Damac Hills 2 (DDA) ────────────────────────────────────────
    if (!map.getSource(DAMAC_HILLS_2_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/damac-hills-2");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(DAMAC_HILLS_2_SRC, { type: "geojson", data });
        map.addLayer({
          id: DAMAC_HILLS_2_LINE,
          type: "line",
          source: DAMAC_HILLS_2_SRC,
          paint: { ...masterPlanPaint },
        });
      } catch (e) {
        console.error("[damac-hills-2] load failed", e);
      }
    }

    // ── Damac Lagoons (DDA) ────────────────────────────────────────
    if (!map.getSource(DAMAC_LAGOONS_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/damac-lagoons");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(DAMAC_LAGOONS_SRC, { type: "geojson", data });
        map.addLayer({
          id: DAMAC_LAGOONS_LINE,
          type: "line",
          source: DAMAC_LAGOONS_SRC,
          paint: { ...masterPlanPaint },
        });
      } catch (e) {
        console.error("[damac-lagoons] load failed", e);
      }
    }

    // ── Damac Islands (DDA) ────────────────────────────────────────
    if (!map.getSource(DAMAC_ISLANDS_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/damac-islands");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(DAMAC_ISLANDS_SRC, { type: "geojson", data });
        map.addLayer({
          id: DAMAC_ISLANDS_LINE,
          type: "line",
          source: DAMAC_ISLANDS_SRC,
          paint: { ...masterPlanPaint },
        });
      } catch (e) {
        console.error("[damac-islands] load failed", e);
      }
    }

    // ── The Valley (DDA) ───────────────────────────────────────────
    if (!map.getSource(THE_VALLEY_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/the-valley");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(THE_VALLEY_SRC, { type: "geojson", data });
        map.addLayer({
          id: THE_VALLEY_LINE,
          type: "line",
          source: THE_VALLEY_SRC,
          paint: { ...masterPlanPaint },
        });
      } catch (e) {
        console.error("[the-valley] load failed", e);
      }
    }

    // ── Damac Hills (DDA) ──────────────────────────────────────────
    if (!map.getSource(DAMAC_HILLS_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/damac-hills");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(DAMAC_HILLS_SRC, { type: "geojson", data });
        map.addLayer({
          id: DAMAC_HILLS_LINE,
          type: "line",
          source: DAMAC_HILLS_SRC,
          paint: { ...masterPlanPaint },
        });
      } catch (e) {
        console.error("[damac-hills] load failed", e);
      }
    }

    // ── Mudon (DDA) ────────────────────────────────────────────────
    if (!map.getSource(MUDON_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/mudon");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(MUDON_SRC, { type: "geojson", data });
        map.addLayer({
          id: MUDON_LINE,
          type: "line",
          source: MUDON_SRC,
          paint: { ...masterPlanPaint },
        });
      } catch (e) {
        console.error("[mudon] load failed", e);
      }
    }

    // ── Jabel Ali Hills (DDA) ──────────────────────────────────────
    if (!map.getSource(JABEL_ALI_HILLS_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/jabel-ali-hills");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(JABEL_ALI_HILLS_SRC, { type: "geojson", data });
        map.addLayer({
          id: JABEL_ALI_HILLS_LINE,
          type: "line",
          source: JABEL_ALI_HILLS_SRC,
          paint: { ...masterPlanPaint },
        });
      } catch (e) {
        console.error("[jabel-ali-hills] load failed", e);
      }
    }

    // Apply current visibility state
    const v = (on: boolean) => (on ? "visible" : "none");
    if (map.getLayer(COMMUNITIES_FILL)) {
      map.setLayoutProperty(COMMUNITIES_FILL, "visibility", v(layersRef.current.communities));
      map.setLayoutProperty(COMMUNITIES_LINE, "visibility", v(layersRef.current.communities));
    }
    if (map.getLayer(ROADS_LINE)) {
      map.setLayoutProperty(ROADS_LINE, "visibility", v(layersRef.current.roads));
    }
    if (map.getLayer(ISLANDS_LINE)) {
      map.setLayoutProperty(ISLANDS_LINE, "visibility", v(layersRef.current.islands));
    }
    if (map.getLayer(MEYDAN_LINE)) {
      map.setLayoutProperty(MEYDAN_LINE, "visibility", v(layersRef.current.meydan));
    }
    if (map.getLayer(PEARL_LINE)) {
      map.setLayoutProperty(PEARL_LINE, "visibility", v(layersRef.current.pearl));
    }
    if (map.getLayer(D11_LINE)) {
      map.setLayoutProperty(D11_LINE, "visibility", v(layersRef.current.d11));
    }
    if (map.getLayer(DUBAI_HILLS_LINE)) {
      map.setLayoutProperty(DUBAI_HILLS_LINE, "visibility", v(layersRef.current.dubaiHills));
    }
    if (map.getLayer(DAMAC_HILLS_2_LINE)) {
      map.setLayoutProperty(DAMAC_HILLS_2_LINE, "visibility", v(layersRef.current.damacHills2));
    }
    if (map.getLayer(DAMAC_LAGOONS_LINE)) {
      map.setLayoutProperty(DAMAC_LAGOONS_LINE, "visibility", v(layersRef.current.damacLagoons));
    }
    if (map.getLayer(DAMAC_ISLANDS_LINE)) {
      map.setLayoutProperty(DAMAC_ISLANDS_LINE, "visibility", v(layersRef.current.damacIslands));
    }
    if (map.getLayer(THE_VALLEY_LINE)) {
      map.setLayoutProperty(THE_VALLEY_LINE, "visibility", v(layersRef.current.theValley));
    }
    if (map.getLayer(DAMAC_HILLS_LINE)) {
      map.setLayoutProperty(DAMAC_HILLS_LINE, "visibility", v(layersRef.current.damacHills));
    }
    if (map.getLayer(MUDON_LINE)) {
      map.setLayoutProperty(MUDON_LINE, "visibility", v(layersRef.current.mudon));
    }
    if (map.getLayer(JABEL_ALI_HILLS_LINE)) {
      map.setLayoutProperty(JABEL_ALI_HILLS_LINE, "visibility", v(layersRef.current.jabelAliHills));
    }
  }

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLES.light,
      center: [55.27, 25.20],
      zoom: 12,
      pitch: 45,
      bearing: -17,
      maxPitch: 70,
      dragRotate: true,
      pitchWithRotate: true,
      touchPitch: true,
    });
    map.dragRotate.enable();
    map.touchZoomRotate.enableRotation();
    map.keyboard.enable();
    map.addControl(
      new maplibregl.NavigationControl({ visualizePitch: true, showCompass: true, showZoom: true }),
      "top-right",
    );
    map.on("mousemove", (e) => setCursor({ lng: e.lngLat.lng, lat: e.lngLat.lat }));
    map.on("zoom", () => setZoom(map.getZoom()));

    // Single shared popup
    const popup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 8,
      className: "zaahi-popup",
    });
    popupRef.current = popup;

    // Hover state for the communities layer
    let hoveredId: string | number | undefined;
    function setHover(id: string | number | undefined) {
      if (hoveredId === id) return;
      if (hoveredId !== undefined) {
        map.setFeatureState({ source: COMMUNITIES_SRC, id: hoveredId }, { hover: false });
      }
      hoveredId = id;
      if (id !== undefined) {
        map.setFeatureState({ source: COMMUNITIES_SRC, id }, { hover: true });
      }
    }

    map.on("load", async () => {
      await attachOverlays(map);

      // ── Communities hover ──
      map.on("mousemove", COMMUNITIES_FILL, (e: MapMouseEvent & { features?: GeoJSON.Feature[] }) => {
        const f = e.features?.[0];
        if (!f) return;
        map.getCanvas().style.cursor = "pointer";
        setHover((f.id as string | number | undefined) ?? f.properties?.COMM_NUM);
        const name = (f.properties?.CNAME_E as string) ?? "—";
        const num = (f.properties?.COMM_NUM as string) ?? "";
        popup
          .setLngLat(e.lngLat)
          .setHTML(
            `<div><div style="font-family:Georgia,serif;font-weight:700;letter-spacing:0.05em">${name}</div>
             <div style="font-size:10px;opacity:0.7;margin-top:2px">Community ${num}</div></div>`,
          )
          .addTo(map);
      });
      map.on("mouseleave", COMMUNITIES_FILL, () => {
        map.getCanvas().style.cursor = "";
        setHover(undefined);
        popup.remove();
      });

      // ── Master plan hover (shared handler for islands + meydan) ──
      function masterPlanHover(planLabel: string) {
        return (e: MapMouseEvent & { features?: GeoJSON.Feature[] }) => {
          const f = e.features?.[0];
          if (!f) return;
          map.getCanvas().style.cursor = "pointer";
          const layerRaw = (f.properties?.Layer as string) ?? planLabel;
          const clean = layerRaw.replace(/^PDF\s+_MP_LU_/, "").replace(/_/g, " ");
          popup
            .setLngLat(e.lngLat)
            .setHTML(
              `<div><div style="font-family:Georgia,serif;font-weight:700;color:#9333EA">${clean}</div>
               <div style="font-size:10px;opacity:0.7;margin-top:2px">${planLabel}</div></div>`,
            )
            .addTo(map);
        };
      }
      const masterPlanLeave = () => {
        map.getCanvas().style.cursor = "";
        popup.remove();
      };
      map.on("mousemove", ISLANDS_LINE, masterPlanHover("Dubai Islands master plan"));
      map.on("mouseleave", ISLANDS_LINE, masterPlanLeave);
      map.on("mousemove", MEYDAN_LINE, masterPlanHover("Meydan Horizon master plan"));
      map.on("mouseleave", MEYDAN_LINE, masterPlanLeave);
      map.on("mousemove", PEARL_LINE, masterPlanHover("Pearl Jumeirah master plan"));
      map.on("mouseleave", PEARL_LINE, masterPlanLeave);
      map.on("mousemove", D11_LINE, masterPlanHover("D11 — Parcel L/D master plan"));
      map.on("mouseleave", D11_LINE, masterPlanLeave);

      // DDA per-plot hover — show plot number + project + sqft
      function ddaPlotHover(e: MapMouseEvent & { features?: GeoJSON.Feature[] }) {
        const f = e.features?.[0];
        if (!f) return;
        map.getCanvas().style.cursor = "pointer";
        const plot = (f.properties?.PLOT_NUMBER as string) ?? "—";
        const project = (f.properties?.PROJECT_NAME as string) ?? "DDA";
        const sqft = (f.properties?.AREA_SQFT as number) ?? null;
        popup
          .setLngLat(e.lngLat)
          .setHTML(
            `<div><div style="font-family:Georgia,serif;font-weight:700;color:#9333EA">Plot ${plot}</div>
             <div style="font-size:10px;opacity:0.8;margin-top:2px">${project}${sqft != null ? ` · ${Math.round(sqft).toLocaleString()} sqft` : ""}</div></div>`,
          )
          .addTo(map);
      }
      map.on("mousemove", DUBAI_HILLS_LINE, ddaPlotHover);
      map.on("mouseleave", DUBAI_HILLS_LINE, masterPlanLeave);
      map.on("mousemove", DAMAC_HILLS_2_LINE, ddaPlotHover);
      map.on("mouseleave", DAMAC_HILLS_2_LINE, masterPlanLeave);
      map.on("mousemove", DAMAC_LAGOONS_LINE, ddaPlotHover);
      map.on("mouseleave", DAMAC_LAGOONS_LINE, masterPlanLeave);
      map.on("mousemove", DAMAC_ISLANDS_LINE, ddaPlotHover);
      map.on("mouseleave", DAMAC_ISLANDS_LINE, masterPlanLeave);
      map.on("mousemove", THE_VALLEY_LINE, ddaPlotHover);
      map.on("mouseleave", THE_VALLEY_LINE, masterPlanLeave);
      map.on("mousemove", DAMAC_HILLS_LINE, ddaPlotHover);
      map.on("mouseleave", DAMAC_HILLS_LINE, masterPlanLeave);
      map.on("mousemove", MUDON_LINE, ddaPlotHover);
      map.on("mouseleave", MUDON_LINE, masterPlanLeave);
      map.on("mousemove", JABEL_ALI_HILLS_LINE, ddaPlotHover);
      map.on("mouseleave", JABEL_ALI_HILLS_LINE, masterPlanLeave);
    });

    mapRef.current = map;
    return () => {
      popup.remove();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Theme swap → reload basemap, reattach overlays after styledata fires,
  // and re-tint the road colour to match.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setStyle(STYLES[theme]);
    map.once("styledata", async () => {
      map.dragRotate.enable();
      map.touchZoomRotate.enableRotation();
      map.keyboard.enable();
      await attachOverlays(map);
      if (map.getLayer(ROADS_LINE)) {
        map.setPaintProperty(ROADS_LINE, "line-color", theme === "dark" ? "#888888" : "#666666");
      }
    });
  }, [theme]);

  // Layer toggles
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const v = (on: boolean) => (on ? "visible" : "none");
    if (map.getLayer(COMMUNITIES_FILL)) {
      map.setLayoutProperty(COMMUNITIES_FILL, "visibility", v(layers.communities));
      map.setLayoutProperty(COMMUNITIES_LINE, "visibility", v(layers.communities));
    }
    if (map.getLayer(ROADS_LINE)) {
      map.setLayoutProperty(ROADS_LINE, "visibility", v(layers.roads));
    }
    if (map.getLayer(ISLANDS_LINE)) {
      map.setLayoutProperty(ISLANDS_LINE, "visibility", v(layers.islands));
    }
    if (map.getLayer(MEYDAN_LINE)) {
      map.setLayoutProperty(MEYDAN_LINE, "visibility", v(layers.meydan));
    }
    if (map.getLayer(PEARL_LINE)) {
      map.setLayoutProperty(PEARL_LINE, "visibility", v(layers.pearl));
    }
    if (map.getLayer(D11_LINE)) {
      map.setLayoutProperty(D11_LINE, "visibility", v(layers.d11));
    }
    if (map.getLayer(DUBAI_HILLS_LINE)) {
      map.setLayoutProperty(DUBAI_HILLS_LINE, "visibility", v(layers.dubaiHills));
    }
    if (map.getLayer(DAMAC_HILLS_2_LINE)) {
      map.setLayoutProperty(DAMAC_HILLS_2_LINE, "visibility", v(layers.damacHills2));
    }
    if (map.getLayer(DAMAC_LAGOONS_LINE)) {
      map.setLayoutProperty(DAMAC_LAGOONS_LINE, "visibility", v(layers.damacLagoons));
    }
    if (map.getLayer(DAMAC_ISLANDS_LINE)) {
      map.setLayoutProperty(DAMAC_ISLANDS_LINE, "visibility", v(layers.damacIslands));
    }
    if (map.getLayer(THE_VALLEY_LINE)) {
      map.setLayoutProperty(THE_VALLEY_LINE, "visibility", v(layers.theValley));
    }
    if (map.getLayer(DAMAC_HILLS_LINE)) {
      map.setLayoutProperty(DAMAC_HILLS_LINE, "visibility", v(layers.damacHills));
    }
    if (map.getLayer(MUDON_LINE)) {
      map.setLayoutProperty(MUDON_LINE, "visibility", v(layers.mudon));
    }
    if (map.getLayer(JABEL_ALI_HILLS_LINE)) {
      map.setLayoutProperty(JABEL_ALI_HILLS_LINE, "visibility", v(layers.jabelAliHills));
    }
  }, [layers]);

  const c = PALETTE[theme];
  const isDark = theme === "dark";

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: c.bg,
        color: c.text,
        fontFamily: '-apple-system, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div ref={containerRef} style={{ position: "absolute", inset: "48px 0 0 0" }} />

      {/* Header */}
      <header
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 48,
          background: c.bg,
          borderBottom: `1px solid ${isDark ? GOLD : c.border}`,
          display: "flex",
          alignItems: "center",
          padding: "0 20px",
          zIndex: 10,
          boxShadow: c.headerShadow,
        }}
      >
        <button
          onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
          aria-label={isDark ? "Switch to light" : "Switch to dark"}
          style={{
            width: 32,
            height: 32,
            borderRadius: 6,
            border: `1px solid ${c.border}`,
            background: "transparent",
            color: GOLD,
            cursor: "pointer",
            fontSize: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 16,
          }}
        >
          {isDark ? "☀" : "☾"}
        </button>

        <div
          style={{
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: "0.22em",
            color: GOLD,
          }}
        >
          ZAAHI
        </div>
        <div
          style={{
            marginLeft: 14,
            fontSize: 10,
            color: c.textDim,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
          }}
        >
          Dubai Real Estate OS
        </div>
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            gap: 22,
            fontFamily: '"SF Mono", "Menlo", monospace',
            fontSize: 11,
          }}
        >
          <Stat label="LAT" value={cursor.lat.toFixed(5)} dim={c.textDim} text={c.text} />
          <Stat label="LNG" value={cursor.lng.toFixed(5)} dim={c.textDim} text={c.text} />
          <Stat label="ZOOM" value={zoom.toFixed(2)} dim={c.textDim} text={c.text} />
        </div>
      </header>

      {/* Layer switcher */}
      <div
        style={{
          position: "absolute",
          top: 64,
          left: 16,
          width: 200,
          background: c.bg,
          border: `1px solid ${isDark ? GOLD : c.border}`,
          borderRadius: 8,
          zIndex: 10,
          boxShadow: c.headerShadow,
        }}
      >
        <div
          style={{
            padding: "8px 14px",
            borderBottom: `1px solid ${c.borderSubtle}`,
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: 11,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: GOLD,
            fontWeight: 700,
          }}
        >
          Layers
        </div>
        <LayerToggle
          label="Communities"
          checked={layers.communities}
          onChange={(v) => setLayers((l) => ({ ...l, communities: v }))}
          color={c.text}
        />
        <LayerToggle
          label="Major Roads"
          checked={layers.roads}
          onChange={(v) => setLayers((l) => ({ ...l, roads: v }))}
          color={c.text}
        />
        <div
          style={{
            padding: "8px 14px 4px",
            borderTop: `1px solid ${c.borderSubtle}`,
            marginTop: 4,
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: 10,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: c.textDim,
          }}
        >
          Master Plans
        </div>
        <LayerToggle
          label="Dubai Islands"
          checked={layers.islands}
          onChange={(v) => setLayers((l) => ({ ...l, islands: v }))}
          color={c.text}
        />
        <LayerToggle
          label="Meydan Horizon"
          checked={layers.meydan}
          onChange={(v) => setLayers((l) => ({ ...l, meydan: v }))}
          color={c.text}
        />
        <LayerToggle
          label="Pearl Jumeirah"
          checked={layers.pearl}
          onChange={(v) => setLayers((l) => ({ ...l, pearl: v }))}
          color={c.text}
        />
        <LayerToggle
          label="D11 — Parcel L/D"
          checked={layers.d11}
          onChange={(v) => setLayers((l) => ({ ...l, d11: v }))}
          color={c.text}
        />
        <div
          style={{
            padding: "8px 14px 4px",
            borderTop: `1px solid ${c.borderSubtle}`,
            marginTop: 4,
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: 10,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: c.textDim,
          }}
        >
          DDA Districts
        </div>
        <LayerToggle
          label="Dubai Hills"
          checked={layers.dubaiHills}
          onChange={(v) => setLayers((l) => ({ ...l, dubaiHills: v }))}
          color={c.text}
        />
        <LayerToggle
          label="Damac Hills 2"
          checked={layers.damacHills2}
          onChange={(v) => setLayers((l) => ({ ...l, damacHills2: v }))}
          color={c.text}
        />
        <LayerToggle
          label="Damac Lagoons"
          checked={layers.damacLagoons}
          onChange={(v) => setLayers((l) => ({ ...l, damacLagoons: v }))}
          color={c.text}
        />
        <LayerToggle
          label="Damac Islands"
          checked={layers.damacIslands}
          onChange={(v) => setLayers((l) => ({ ...l, damacIslands: v }))}
          color={c.text}
        />
        <LayerToggle
          label="The Valley"
          checked={layers.theValley}
          onChange={(v) => setLayers((l) => ({ ...l, theValley: v }))}
          color={c.text}
        />
        <LayerToggle
          label="Damac Hills"
          checked={layers.damacHills}
          onChange={(v) => setLayers((l) => ({ ...l, damacHills: v }))}
          color={c.text}
        />
        <LayerToggle
          label="Mudon"
          checked={layers.mudon}
          onChange={(v) => setLayers((l) => ({ ...l, mudon: v }))}
          color={c.text}
        />
        <LayerToggle
          label="Jabel Ali Hills"
          checked={layers.jabelAliHills}
          onChange={(v) => setLayers((l) => ({ ...l, jabelAliHills: v }))}
          color={c.text}
        />
      </div>

      <style jsx global>{`
        .maplibregl-canvas-container {
          filter: ${isDark ? "brightness(1.3) hue-rotate(210deg) saturate(0.7)" : "none"};
          transition: filter 0.3s ease;
        }
        .maplibregl-ctrl-top-right {
          margin-top: 60px !important;
          margin-right: 16px !important;
        }
        .maplibregl-ctrl-group {
          background: ${c.bg} !important;
          border: 1px solid ${isDark ? GOLD : c.border} !important;
          box-shadow: ${c.headerShadow} !important;
          border-radius: 6px !important;
          overflow: hidden;
        }
        .maplibregl-ctrl-group button {
          background: transparent !important;
          border-bottom: 1px solid ${c.borderSubtle} !important;
        }
        .maplibregl-ctrl-group button:last-child {
          border-bottom: none !important;
        }
        .maplibregl-ctrl-group button .maplibregl-ctrl-icon {
          filter: ${isDark
            ? "invert(1) sepia(1) hue-rotate(15deg) saturate(2.5) brightness(1.05)"
            : "none"};
        }
        .maplibregl-ctrl-group button:hover {
          background: rgba(200, 169, 110, 0.15) !important;
        }
        .maplibregl-ctrl-attrib {
          background: ${isDark ? "rgba(10,22,40,0.85)" : "rgba(255,255,255,0.85)"} !important;
          color: ${c.textDim} !important;
          font-size: 10px !important;
        }
        .maplibregl-ctrl-attrib a {
          color: ${GOLD} !important;
        }
        .zaahi-popup .maplibregl-popup-content {
          background: ${isDark ? "rgba(10,22,40,0.95)" : "rgba(255,255,255,0.97)"} !important;
          color: ${c.text} !important;
          border: 1px solid ${GOLD};
          border-radius: 6px;
          padding: 8px 12px;
          font-size: 12px;
        }
        .zaahi-popup .maplibregl-popup-tip {
          border-top-color: ${GOLD} !important;
        }
      `}</style>
    </div>
  );
}

function LayerToggle({
  label,
  checked,
  onChange,
  color,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  color: string;
}) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 14px",
        fontSize: 12,
        cursor: "pointer",
        color,
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ accentColor: GOLD }}
      />
      {label}
    </label>
  );
}

function Stat({ label, value, dim, text }: { label: string; value: string; dim: string; text: string }) {
  return (
    <span>
      <span style={{ color: dim, marginRight: 5 }}>{label}</span>
      <span style={{ color: text }}>{value}</span>
    </span>
  );
}
