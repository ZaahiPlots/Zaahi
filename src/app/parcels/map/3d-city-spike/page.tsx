"use client";

// ── Google Photorealistic 3D Tiles spike (Three.js render path) ──────
//
// research/3d-city-spike branch only. Replaces the failed deck.gl
// Tile3DLayer attempt (which reported `root tiles: 0` with no further
// progress) with the canonical 3d-tiles-renderer pipeline:
//
//   • MapLibre custom layer shares its WebGL context with Three.js.
//   • TilesRenderer (3d-tiles-renderer/three) loads + LOD-streams the
//     Google Photorealistic 3D Tiles tileset.
//   • GoogleCloudAuthPlugin handles `?key=` auth + session refresh.
//   • Tileset is in ECEF (Earth-centred). We rebase it into MapLibre's
//     mercator world via inverse-ENU at Business Bay + meter→mercator
//     scale + a Y-axis flip (mercator Y increases southward, ENU N is
//     positive Y, so the meter-scale on Y is negated).
//
// On render(gl, matrix) MapLibre hands us a 4×4 MVP in mercator world
// space; we feed it directly into Three's camera.projectionMatrix and
// keep matrixWorldInverse = identity so positions live in mercator
// world unmodified by Three's camera. tilesRenderer.update() drives
// LOD off the same camera; map.triggerRepaint() keeps the frame loop
// hot while tiles stream in.

import { useEffect, useRef, useState } from "react";
import maplibregl, {
  Map as MLMap,
  StyleSpecification,
  MercatorCoordinate,
  CustomLayerInterface,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import * as THREE from "three";
import { TilesRenderer } from "3d-tiles-renderer";
import { GoogleCloudAuthPlugin } from "3d-tiles-renderer/plugins";
import { Ellipsoid, WGS84_RADIUS } from "3d-tiles-renderer";

const GOLD = "#C8A96E";
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

const BB_LNG = 55.2708;
const BB_LAT = 25.1865;
const BB_ALT = 0;
const INITIAL_ZOOM = 15;
const INITIAL_PITCH = 60;
const INITIAL_BEARING = -17;

const WGS84_ELLIPSOID = new Ellipsoid(WGS84_RADIUS, WGS84_RADIUS, WGS84_RADIUS);

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

// Build the matrix that takes a vertex in ECEF (where Google tiles
// live) and lands it in MapLibre's mercator world, positioned at
// Business Bay with proper scale + Y-axis flip.
//
//   v_merc = T_bb × S_m2merc × R_invENU × v_ecef
//
// where:
//   R_invENU      — inverse of the ENU frame at BB (lat/lng/height).
//                   Brings the tileset into local-meters at BB with
//                   X=East, Y=North, Z=Up.
//   S_m2merc      — scale meters → mercator. Diagonal (s, -s, s):
//                   Y is negated because mercator Y grows southward
//                   whereas ENU-North is positive Y.
//   T_bb          — translate to BB in mercator world coords.
function buildTilesetMatrix(): THREE.Matrix4 {
  // ENU at Business Bay (lat/lng in degrees → method expects radians? — Ellipsoid uses degrees per API).
  const enu = new THREE.Matrix4();
  WGS84_ELLIPSOID.getEastNorthUpFrame(BB_LAT, BB_LNG, BB_ALT, enu);
  const invEnu = enu.clone().invert();

  // Mercator coord of BB (anchor) + meter-to-mercator scale.
  const bb = MercatorCoordinate.fromLngLat({ lng: BB_LNG, lat: BB_LAT }, BB_ALT);
  const s = bb.meterInMercatorCoordinateUnits();
  const scale = new THREE.Matrix4().makeScale(s, -s, s);
  const translate = new THREE.Matrix4().makeTranslation(bb.x, bb.y, bb.z);

  return new THREE.Matrix4().multiplyMatrices(translate, scale).multiply(invEnu);
}

interface SpikeCustomLayer extends CustomLayerInterface {
  tiles?: TilesRenderer;
  renderer?: THREE.WebGLRenderer;
  scene?: THREE.Scene;
  camera?: THREE.Camera;
  mapRef?: MLMap;
  rafActive?: boolean;
}

function buildTilesLayer(setStatus: (s: string) => void): SpikeCustomLayer {
  const layer: SpikeCustomLayer = {
    id: "google-3d-tiles",
    type: "custom",
    renderingMode: "3d",

    onAdd(map, gl) {
      console.log("[3d-spike] custom layer onAdd — initialising Three.js");
      this.mapRef = map as MLMap;

      const scene = new THREE.Scene();
      // Empty ambient + a soft directional so 3D tiles textures stay readable
      // even on cloudy days; Google tiles already ship as baked-PBR materials
      // so heavy lighting isn't needed — these mostly stop the unlit edges
      // from going pitch black on shadow sides.
      scene.add(new THREE.AmbientLight(0xffffff, 0.7));
      const dir = new THREE.DirectionalLight(0xffffff, 0.6);
      dir.position.set(0.5, 1, 0.5);
      scene.add(dir);
      this.scene = scene;

      const camera = new THREE.PerspectiveCamera();
      camera.matrixAutoUpdate = false;
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
      // Rebase tileset from ECEF into MapLibre's mercator world,
      // anchored at Business Bay.
      const m = buildTilesetMatrix();
      tiles.group.applyMatrix4(m);
      tiles.group.matrixAutoUpdate = false;
      scene.add(tiles.group);

      tiles.addEventListener("load-tile-set", () => {
        console.log("[3d-spike] tilesRenderer load-tile-set fired");
        setStatus("Tileset loaded · streaming tiles");
      });
      tiles.addEventListener("tiles-load-end", () => {
        console.log("[3d-spike] tilesRenderer tiles-load-end (frame settled)");
      });
      this.tiles = tiles;
    },

    render(_gl, args) {
      const matrix = Array.isArray(args)
        ? (args as unknown as number[])
        : (args as { defaultProjectionData: { mainMatrix: number[] } })
            .defaultProjectionData.mainMatrix;
      if (!this.scene || !this.camera || !this.renderer || !this.tiles || !this.mapRef) return;

      // MapLibre's MVP is already mercator-world → clip space. Stuff
      // it into the camera's projection matrix and pin matrixWorld to
      // identity so Three's own view transform is a no-op.
      this.camera.projectionMatrix.fromArray(matrix);
      this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert();
      this.camera.matrix.identity();
      this.camera.matrixWorld.identity();
      this.camera.matrixWorldInverse.identity();

      this.tiles.setCamera(this.camera);
      this.tiles.setResolutionFromRenderer(this.camera, this.renderer);
      this.tiles.update();

      // Reset state Three.js modified before MapLibre drew its frame.
      this.renderer.resetState();
      this.renderer.render(this.scene, this.camera);

      // Keep the frame loop hot while tiles are still streaming —
      // tilesRenderer is async so we need continuous repaints.
      this.mapRef.triggerRepaint();
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

  // ── Init MapLibre + the custom 3D-Tiles layer ──
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

  // ── Toggle handler — add/remove the custom layer ──
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
        <div style={{ opacity: 0.6, marginTop: 4 }}>© Google · 3D Tiles</div>
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
