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

export default function ParcelsMapPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const [theme, setTheme] = useState<Theme>("light");
  const [cursor, setCursor] = useState({ lng: 55.27, lat: 25.20 });
  const [zoom, setZoom] = useState(12);
  const [layers, setLayers] = useState({ communities: true });
  const layersRef = useRef(layers);
  layersRef.current = layers;

  // Loads the communities GeoJSON onto a fresh style. Idempotent.
  async function attachCommunities(map: MLMap) {
    if (map.getSource(COMMUNITIES_SRC)) return;
    try {
      const r = await fetch("/api/layers/communities");
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
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
      // Apply current toggle state
      const visibility = layersRef.current.communities ? "visible" : "none";
      map.setLayoutProperty(COMMUNITIES_FILL, "visibility", visibility);
      map.setLayoutProperty(COMMUNITIES_LINE, "visibility", visibility);
    } catch (e) {
      console.error("[communities] load failed", e);
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
      await attachCommunities(map);
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
            `<div style="font-family:Georgia,serif;color:#0A1628">
               <div style="font-weight:700;letter-spacing:0.05em">${name}</div>
               <div style="font-size:10px;color:#8892a0;margin-top:2px">Community ${num}</div>
             </div>`,
          )
          .addTo(map);
      });
      map.on("mouseleave", COMMUNITIES_FILL, () => {
        map.getCanvas().style.cursor = "";
        setHover(undefined);
        popup.remove();
      });
    });

    mapRef.current = map;
    return () => {
      popup.remove();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Theme swap → reload basemap, reattach overlay layers after styledata fires.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setStyle(STYLES[theme]);
    map.once("styledata", async () => {
      map.dragRotate.enable();
      map.touchZoomRotate.enableRotation();
      map.keyboard.enable();
      await attachCommunities(map);
    });
  }, [theme]);

  // Layer toggle
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getLayer(COMMUNITIES_LINE)) return;
    const visibility = layers.communities ? "visible" : "none";
    map.setLayoutProperty(COMMUNITIES_FILL, "visibility", visibility);
    map.setLayoutProperty(COMMUNITIES_LINE, "visibility", visibility);
  }, [layers.communities]);

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
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 14px",
            fontSize: 12,
            cursor: "pointer",
            color: c.text,
          }}
        >
          <input
            type="checkbox"
            checked={layers.communities}
            onChange={(e) => setLayers((l) => ({ ...l, communities: e.target.checked }))}
            style={{ accentColor: GOLD }}
          />
          Communities
        </label>
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

function Stat({ label, value, dim, text }: { label: string; value: string; dim: string; text: string }) {
  return (
    <span>
      <span style={{ color: dim, marginRight: 5 }}>{label}</span>
      <span style={{ color: text }}>{value}</span>
    </span>
  );
}
