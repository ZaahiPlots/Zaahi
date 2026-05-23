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
// Google's Photorealistic 3D Tiles documentation uses `?key=` query
// param for auth — not the X-GOOG-API-KEY header (which works for
// some other Google APIs but not this one). Pass via URL so the
// initial root.json fetch and every child tile request authenticate
// the same way.
const TILESET_URL = `https://tile.googleapis.com/v1/3dtiles/root.json?key=${API_KEY}`;

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
  // overlayReady flips true after MapboxOverlay is added to the map.
  // Calling setProps on an overlay that hasn't run onAdd() yet is a
  // silent no-op in some deck.gl versions, so the tiles effect waits
  // for this flag before constructing the layer.
  const [overlayReady, setOverlayReady] = useState(false);
  const [status, setStatus] = useState<string>(
    API_KEY ? "Loading Google 3D Tiles…" : "MISSING NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in env",
  );
  const [copyright, setCopyright] = useState<string>("");

  // ── Map init (once) ──
  useEffect(() => {
    // Diagnostic — confirms the NEXT_PUBLIC_ key is in the bundle.
    // If this logs `false`, .env.local wasn't read at build time —
    // restart pnpm dev so Next re-snapshots process.env.
    console.log("[3d-spike] API key present:", API_KEY.length > 0, "(length", API_KEY.length, ")");

    // Direct probe — independent of deck.gl. If this 200s, the key
    // is valid and CORS works. If it 4xx/5xx or errors, the rest of
    // the pipeline can't possibly work.
    if (API_KEY) {
      fetch(TILESET_URL)
        .then((r) => {
          console.log("[3d-spike] direct fetch root.json status:", r.status);
          return r.json();
        })
        .then((d) => console.log("[3d-spike] root.json payload keys:", Object.keys(d ?? {})))
        .catch((e) => console.error("[3d-spike] direct fetch error:", e));
    }

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

    // interleaved: false — deck.gl renders to its own canvas above the
    // MapLibre canvas. interleaved: true relies on mapbox-gl internal
    // renderer hooks that MapLibre v5 has since diverged from, so
    // overlay layers can silently fail to mount.
    const overlay = new MapboxOverlay({ interleaved: false, layers: [] });
    overlayRef.current = overlay;
    map.on("load", () => {
      console.log("[3d-spike] map load fired — mounting deck overlay");
      // MapboxOverlay implements the IControl interface MapLibre
      // expects; cast satisfies the typecheck.
      map.addControl(overlay as unknown as maplibregl.IControl);
      setOverlayReady(true);
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
    console.log("[3d-spike] tiles effect — overlayReady:", overlayReady, "tilesOn:", tilesOn, "key?", API_KEY.length > 0);
    if (!overlayReady) return;
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
      onTilesetLoad: (tileset: { tiles?: unknown[] } | null) => {
        const n = tileset?.tiles?.length ?? 0;
        console.log("[3d-spike] onTilesetLoad — root tiles:", n);
        setStatus(`Tileset loaded · ${n} root tiles`);
      },
      onTileLoad: () => {
        // Google's tileset features a `copyright` header per tile.
        // The tileset surfaces credits via its root JSON properties.
        setCopyright("© Google · 3D Tiles");
      },
      onTileError: (err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[3d-spike] onTileError:", err);
        setStatus(`Tile load error: ${msg}`);
      },
      // operation: 'terrain+draping' would let MapLibre features
      // (e.g. a parcel polygon) drape over the photogrammetry mesh —
      // out of scope for this spike but worth noting for follow-up.
    });
    console.log("[3d-spike] Tile3DLayer constructed, applying via overlay.setProps");

    overlay.setProps({ layers: [layer] });
  }, [overlayReady, tilesOn]);

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
