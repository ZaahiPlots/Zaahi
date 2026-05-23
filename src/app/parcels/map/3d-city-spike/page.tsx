"use client";

// ── Google Photorealistic 3D Tiles spike (ECEF-native, radians-correct) ─
//
// Reading TilesRenderer.js:520–580 confirmed the lib expects a real
// THREE.PerspectiveCamera with separate matrixWorld + projectionMatrix
// (the frustum / SSE / position derivation all read these as separate
// matrices). The threebox-style "fused MVP into projectionMatrix" path
// regressed the lib to 0 children. Reverting to the ECEF-native
// approach that previously loaded 600+ tiles, with the actual bug
// fixed: Ellipsoid takes RADIANS, not degrees (JSDoc on Ellipsoid.js:128).
//
// Trade-off: basemap and tiles will NOT pixel-align — MapLibre renders
// its CARTO tiles via its own MVP, Three renders Google tiles via the
// PerspectiveCamera. The spike's question is "can we see Burj Khalifa
// at all"; alignment is a separate follow-up if this works.

import { useEffect, useRef, useState } from "react";
import maplibregl, {
  Map as MLMap,
  StyleSpecification,
  CustomLayerInterface,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import * as THREE from "three";
import { TilesRenderer, Ellipsoid, WGS84_RADIUS } from "3d-tiles-renderer";
import { GoogleCloudAuthPlugin } from "3d-tiles-renderer/plugins";

const GOLD = "#C8A96E";
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

const BB_LNG = 55.2708;
const BB_LAT = 25.1865;
const INITIAL_ZOOM = 15;
const INITIAL_PITCH = 60;
const INITIAL_BEARING = -17;

const WGS84_ELLIPSOID = new Ellipsoid(WGS84_RADIUS, WGS84_RADIUS, WGS84_RADIUS);

// ── radians helpers — Ellipsoid API expects radians, not degrees ──
const deg2rad = (d: number) => (d * Math.PI) / 180;

function ecefAt(latDeg: number, lngDeg: number, altMeters: number): THREE.Vector3 {
  const v = new THREE.Vector3();
  WGS84_ELLIPSOID.getCartographicToPosition(deg2rad(latDeg), deg2rad(lngDeg), altMeters, v);
  return v;
}

function enuAxesAt(
  latDeg: number,
  lngDeg: number,
  east: THREE.Vector3,
  north: THREE.Vector3,
  up: THREE.Vector3,
  pos: THREE.Vector3,
): void {
  WGS84_ELLIPSOID.getEastNorthUpAxes(deg2rad(latDeg), deg2rad(lngDeg), east, north, up, pos);
}

// Fixed camera slant distance from the ground point — 800m per founder
// spec 2026-05-23. At pitch 60° this means the camera sits ~400m above
// ground and ~693m horizontally from the lookat point, so Burj Khalifa
// (828m tall, ~2km north of Business Bay) reads as a dramatic close-up
// 3D mesh rather than a distant prick. Pulled out of the zoom-derived
// formula entirely — the zoom-derived altitude was ~4.2km at zoom 15,
// too high to see individual building geometry.
const FIXED_CAMERA_SLANT_M = 800;

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

interface SpikeCustomLayer extends CustomLayerInterface {
  tiles?: TilesRenderer;
  renderer?: THREE.WebGLRenderer;
  scene?: THREE.Scene;
  camera?: THREE.PerspectiveCamera;
  mapRef?: MLMap;
  childCountLastLogged?: number;
}

function buildTilesLayer(setStatus: (s: string) => void): SpikeCustomLayer {
  const layer: SpikeCustomLayer = {
    id: "google-3d-tiles",
    type: "custom",
    renderingMode: "3d",

    onAdd(map, gl) {
      console.log("[3d-spike] custom layer onAdd — initialising Three.js (ECEF-native, radians)");
      this.mapRef = map as MLMap;

      const scene = new THREE.Scene();
      scene.add(new THREE.AmbientLight(0xffffff, 0.7));
      const dir = new THREE.DirectionalLight(0xffffff, 0.6);
      dir.position.set(0.5, 1, 0.5);
      scene.add(dir);
      this.scene = scene;

      const aspect = typeof window !== "undefined" ? window.innerWidth / window.innerHeight : 1.5;
      // far=20 000 km comfortably covers all of Earth's surface in
      // case we ever zoom way out. near=100m keeps Burj close-ups
      // crisp without z-fighting.
      const camera = new THREE.PerspectiveCamera(60, aspect, 100, 20_000_000);
      this.camera = camera;

      const renderer = new THREE.WebGLRenderer({
        canvas: map.getCanvas(),
        context: gl as WebGLRenderingContext,
        antialias: true,
      });
      renderer.autoClear = false;
      this.renderer = renderer;

      const tiles = new TilesRenderer(`https://tile.googleapis.com/v1/3dtiles/root.json`);
      tiles.registerPlugin(new GoogleCloudAuthPlugin({ apiToken: API_KEY }));
      // Tileset stays in native ECEF. No group transform applied —
      // Three's perspective camera will be placed in ECEF too.
      scene.add(tiles.group);

      tiles.addEventListener("load-tile-set", () => {
        console.log("[3d-spike] tilesRenderer load-tile-set fired");
        setStatus("Tileset loaded · streaming tiles");
      });
      tiles.addEventListener("tiles-load-end", () => {
        console.log(
          "[3d-spike] tiles-load-end · group children:",
          tiles.group.children.length,
        );
      });
      this.tiles = tiles;
    },

    render() {
      if (!this.scene || !this.camera || !this.renderer || !this.tiles || !this.mapRef) return;

      const map = this.mapRef;
      const center = map.getCenter();
      const bearing = map.getBearing();
      const pitch = map.getPitch();

      // Ground point at map center, in ECEF.
      const ground = ecefAt(center.lat, center.lng, 0);

      // ENU at that ground point. CRITICAL: feed deg→rad in the helper
      // so the prior degrees-vs-radians bug stays squashed.
      const east = new THREE.Vector3();
      const north = new THREE.Vector3();
      const up = new THREE.Vector3();
      enuAxesAt(center.lat, center.lng, east, north, up, ground);

      // Pitch tilts the camera ray away from `up` toward (rotated) north.
      // pitch=0 → camera directly above; pitch=60 → camera ~60° off
      // vertical, looking down obliquely.
      const bearingRad = deg2rad(bearing);
      const pitchRad = deg2rad(pitch);
      const cosB = Math.cos(bearingRad);
      const sinB = Math.sin(bearingRad);

      const back = new THREE.Vector3();
      back.copy(up).multiplyScalar(Math.cos(pitchRad));
      back.addScaledVector(north, Math.sin(pitchRad) * cosB);
      back.addScaledVector(east, -Math.sin(pitchRad) * sinB);
      back.normalize();

      const camPos = ground.clone().addScaledVector(back, FIXED_CAMERA_SLANT_M);

      this.camera.position.copy(camPos);
      this.camera.up.copy(up);
      this.camera.lookAt(ground);
      this.camera.updateMatrixWorld();

      // Keep aspect in sync.
      const canvas = map.getCanvas();
      if (canvas.width && canvas.height) {
        const a = canvas.width / canvas.height;
        if (Math.abs(this.camera.aspect - a) > 0.001) {
          this.camera.aspect = a;
          this.camera.updateProjectionMatrix();
        }
      }

      this.tiles.setCamera(this.camera);
      this.tiles.setResolutionFromRenderer(this.camera, this.renderer);
      this.tiles.update();

      const cc = this.tiles.group.children.length;
      if (cc !== this.childCountLastLogged) {
        console.log("[3d-spike] tilesRenderer.group.children.length:", cc);
        this.childCountLastLogged = cc;
      }

      this.renderer.resetState();
      this.renderer.render(this.scene, this.camera);

      map.triggerRepaint();
    },

    onRemove() {
      this.tiles?.dispose();
      this.tiles = undefined;
      this.scene = undefined;
      this.camera = undefined;
      this.renderer?.dispose();
      this.renderer = undefined;
    },
  };
  return layer;
}

export default function ThreeDCitySpikePage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const layerRef = useRef<SpikeCustomLayer | null>(null);
  const [tilesOn, setTilesOn] = useState(true);
  const [status, setStatus] = useState<string>(
    API_KEY ? "Loading Google 3D Tiles…" : "MISSING NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in env",
  );

  useEffect(() => {
    console.log("[3d-spike] API key present:", API_KEY.length > 0, "(length", API_KEY.length, ")");
    if (API_KEY) {
      fetch(`https://tile.googleapis.com/v1/3dtiles/root.json?key=${API_KEY}`)
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
      center: [BB_LNG, BB_LAT],
      zoom: INITIAL_ZOOM,
      pitch: INITIAL_PITCH,
      bearing: INITIAL_BEARING,
      maxPitch: 85,
    });
    mapRef.current = map;

    map.on("load", () => {
      console.log("[3d-spike] map load fired — adding custom layer");
      const layer = buildTilesLayer(setStatus);
      layerRef.current = layer;
      map.addLayer(layer);
    });

    return () => {
      if (layerRef.current && map.getLayer(layerRef.current.id)) {
        map.removeLayer(layerRef.current.id);
      }
      layerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!API_KEY) return;
    const apply = () => {
      const hasLayer = !!map.getLayer("google-3d-tiles");
      if (tilesOn && !hasLayer) {
        const layer = buildTilesLayer(setStatus);
        layerRef.current = layer;
        map.addLayer(layer);
      } else if (!tilesOn && hasLayer) {
        map.removeLayer("google-3d-tiles");
        layerRef.current = null;
        setStatus("3D tiles OFF — MapLibre basemap only.");
      }
    };
    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
  }, [tilesOn]);

  return (
    <div style={{ position: "absolute", inset: 0, background: "#0A1628" }}>
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />

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
        <div style={{ opacity: 0.6, marginTop: 4 }}>© Google · 3D Tiles</div>
      </div>

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
