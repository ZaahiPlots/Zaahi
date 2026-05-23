"use client";

// ── Google Photorealistic 3D Tiles spike ─────────────────────────────
// Research/3d-city-spike branch only — DO NOT merge to main without
// founder review. Goal: confirm Business Bay + Burj Khalifa render as
// real Google 3D Tiles over our MapLibre basemap.
//
// Stack:
//   MapLibre        — basemap (CARTO Positron, matches /parcels/map)
//   deck.gl         — Tile3DLayer to load Google 3D Tiles root tileset
//   MapboxOverlay   — interop between deck.gl and MapLibre v5
//   @loaders.gl     — Tiles3DLoader handles the spec (root.json → tiles)
//
// API key lives in NEXT_PUBLIC_GOOGLE_MAPS_API_KEY (.env.local + Vercel
// preview only). Restrict via HTTP referrer in GCP console before any
// public exposure — the NEXT_PUBLIC_ prefix means this key ships to
// every browser that loads this page.
//
// Attribution: Google 3D Tiles requires showing "Google" attribution
// alongside the rendered tiles. Built-in MapLibre attribution control
// shows the "© Google" copyright surfaced by the tileset's copyright
// header at render time.

import { useEffect, useRef, useState } from "react";
import maplibregl, { Map as MLMap, StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { Tile3DLayer } from "@deck.gl/geo-layers";
import { Tiles3DLoader } from "@loaders.gl/3d-tiles";

const GOLD = "#C8A96E";
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
const TILESET_URL = "https://tile.googleapis.com/v1/3dtiles/root.json";

// Business Bay + Burj Khalifa fit in a single view at zoom 15 / pitch 60.
const BB_CENTER: [number, number] = [55.2708, 25.1865];
const INITIAL_ZOOM = 15;
const INITIAL_PITCH = 60;
const INITIAL_BEARING = -17;

const BASE_STYLE: StyleSpecification = {
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
  glyphs: "https://fonts.openmaptiles.org/{fontstack}/{range}.pbf",
  layers: [{ id: "carto", type: "raster", source: "carto" }],
};

export default function ThreeDCitySpikePage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const [tilesOn, setTilesOn] = useState(true);
  const [status, setStatus] = useState<string>(
    API_KEY ? "Loading Google 3D Tiles…" : "MISSING NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in env",
  );
  const [copyright, setCopyright] = useState<string>("");

  // ── Map init (once) ──
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: BASE_STYLE,
      center: BB_CENTER,
      zoom: INITIAL_ZOOM,
      pitch: INITIAL_PITCH,
      bearing: INITIAL_BEARING,
      maxPitch: 85,
    });
    mapRef.current = map;

    const overlay = new MapboxOverlay({ interleaved: true, layers: [] });
    overlayRef.current = overlay;
    map.on("load", () => {
      // addControl casts to maplibregl's IControl — MapboxOverlay
      // implements the same interface. Cast to satisfy the typecheck.
      map.addControl(overlay as unknown as maplibregl.IControl);
    });

    return () => {
      overlay.finalize();
      overlayRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ── Tile3DLayer wired to overlay (toggles via tilesOn) ──
  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    if (!API_KEY) {
      overlay.setProps({ layers: [] });
      return;
    }
    if (!tilesOn) {
      overlay.setProps({ layers: [] });
      setStatus("3D tiles OFF — MapLibre basemap only.");
      return;
    }

    const layer = new Tile3DLayer({
      id: "google-3d-tiles",
      data: TILESET_URL,
      loader: Tiles3DLoader,
      loadOptions: {
        fetch: { headers: { "X-GOOG-API-KEY": API_KEY } },
      },
      onTilesetLoad: (tileset: { tiles?: unknown[] } | null) => {
        const n = tileset?.tiles?.length ?? 0;
        setStatus(`Tileset loaded · ${n} root tiles`);
      },
      onTileLoad: () => {
        // Google's tileset features a `copyright` header per tile.
        // The tileset surfaces credits via its root JSON properties.
        setCopyright("© Google · 3D Tiles");
      },
      onTileError: (err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        setStatus(`Tile load error: ${msg}`);
      },
      // operation: 'terrain+draping' would let MapLibre features
      // (e.g. a parcel polygon) drape over the photogrammetry mesh —
      // out of scope for this spike but worth noting for follow-up.
    });

    overlay.setProps({ layers: [layer] });
  }, [tilesOn]);

  return (
    <div style={{ position: "absolute", inset: 0, background: "#0A1628" }}>
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />

      {/* HUD */}
      <div
        style={{
          position: "absolute",
          top: 16,
          left: 16,
          padding: "10px 14px",
          background: "rgba(10, 22, 40, 0.4)",
          backdropFilter: "blur(16px) saturate(150%)",
          WebkitBackdropFilter: "blur(16px) saturate(150%)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 12,
          fontFamily: '-apple-system, "Segoe UI", Roboto, sans-serif',
          fontSize: 11,
          letterSpacing: "0.04em",
          color: "rgba(255,255,255,0.85)",
          maxWidth: 340,
          lineHeight: 1.45,
        }}
      >
        <div
          style={{
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: 13,
            color: GOLD,
            marginBottom: 4,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          3D City Spike · Business Bay
        </div>
        <div style={{ opacity: 0.85 }}>{status}</div>
        {copyright && <div style={{ opacity: 0.6, marginTop: 4 }}>{copyright}</div>}
      </div>

      {/* Toggle */}
      <button
        onClick={() => setTilesOn((v) => !v)}
        aria-pressed={tilesOn}
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          padding: "8px 16px",
          borderRadius: 8,
          border: `1px solid ${tilesOn ? GOLD : "rgba(200, 169, 110, 0.3)"}`,
          background: tilesOn ? "rgba(200, 169, 110, 0.25)" : "rgba(10, 22, 40, 0.5)",
          color: tilesOn ? GOLD : "rgba(255,255,255,0.7)",
          fontFamily: '-apple-system, "Segoe UI", Roboto, sans-serif',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          cursor: "pointer",
          backdropFilter: "blur(16px) saturate(150%)",
          WebkitBackdropFilter: "blur(16px) saturate(150%)",
          boxShadow: "0 6px 20px rgba(0,0,0,0.3)",
          transition: "border-color 150ms ease, background 150ms ease, color 150ms ease",
        }}
      >
        3D City · {tilesOn ? "ON" : "OFF"}
      </button>
    </div>
  );
}
