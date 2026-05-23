"use client";

// ── Google Photorealistic 3D Tiles spike (ECEF-native camera) ───────
//
// research/3d-city-spike branch only. The deck.gl path streamed
// nothing; the prior Three.js path with a custom mercator rebase fired
// `load-tile-set` but no child tile fetches — classic frustum mismatch
// from a broken ECEF→mercator transform.
//
// This rewrite drops the rebase entirely and keeps the tileset in its
// native ECEF coords. The Three.js camera is also positioned in ECEF,
// synced to MapLibre's lat/lng/zoom/bearing/pitch every frame. The
// camera's projection matrix is the standard PerspectiveCamera one
// (NOT MapLibre's MVP) — so visually the tileset will not align with
// the basemap until we tighten the projection, but if children load
// and pixels appear we know the lib + auth + LOD pipeline works, and
// alignment is the only outstanding problem.

import { useEffect, useRef, useState } from "react";
import maplibregl, {
  Map as MLMap,
  StyleSpecification,
  MercatorCoordinate,
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
// 3d-tiles-renderer's Ellipsoid methods take RADIANS — explicit per
// JSDoc on Ellipsoid.js. The previous two spikes passed degrees, so
// camera + tileset both rendered against meaningless coordinates.
const BB_LAT_RAD = (BB_LAT * Math.PI) / 180;
const BB_LNG_RAD = (BB_LNG * Math.PI) / 180;
const INITIAL_ZOOM = 15;
const INITIAL_PITCH = 60;
const INITIAL_BEARING = -17;

const WGS84_ELLIPSOID = new Ellipsoid(WGS84_RADIUS, WGS84_RADIUS, WGS84_RADIUS);

// ECEF → MapLibre mercator-world transform anchored at Business Bay.
//
//   v_merc = T_bb × S(s,-s,s) × invENU_at_BB × v_ecef
//
//   invENU_at_BB    — ECEF → local meters at BB (X=East, Y=North, Z=Up).
//                     Built with RADIANS this time.
//   S(s,-s,s)       — meters → mercator. Y negated because MapLibre's
//                     mercator Y grows southward whereas ENU-North is +Y.
//   T_bb            — translate to BB in mercator world.
function buildTilesetMatrix(): THREE.Matrix4 {
  const enu = new THREE.Matrix4();
  WGS84_ELLIPSOID.getEastNorthUpFrame(BB_LAT_RAD, BB_LNG_RAD, 0, enu);
  const invEnu = enu.clone().invert();

  const bb = MercatorCoordinate.fromLngLat({ lng: BB_LNG, lat: BB_LAT }, 0);
  const s = bb.meterInMercatorCoordinateUnits();
  const scale = new THREE.Matrix4().makeScale(s, -s, s);
  const translate = new THREE.Matrix4().makeTranslation(bb.x, bb.y, bb.z);

  return new THREE.Matrix4().multiplyMatrices(translate, scale).multiply(invEnu);
}

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
  camera?: THREE.Camera;
  mapRef?: MLMap;
  childCountLastLogged?: number;
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
      scene.add(new THREE.AmbientLight(0xffffff, 0.7));
      const dir = new THREE.DirectionalLight(0xffffff, 0.6);
      dir.position.set(0.5, 1, 0.5);
      scene.add(dir);
      this.scene = scene;

      // Camera projection matrix is set directly from MapLibre's MVP
      // each frame; matrixAutoUpdate stays off so Three doesn't
      // recompute matrixWorld from position/rotation (we pin it to
      // identity below).
      const camera = new THREE.Camera();
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
      // Apply the ECEF→mercator transform once on init. With radians
      // wired in, this lands the Business Bay anchor at the correct
      // mercator-world point so MapLibre's MVP camera sees the tiles
      // exactly where the basemap shows Dubai.
      const tilesetMatrix = buildTilesetMatrix();
      tiles.group.applyMatrix4(tilesetMatrix);
      tiles.group.matrixAutoUpdate = false;
      console.log("[3d-spike] tileset matrix applied (degrees→radians fix)");
      scene.add(tiles.group);

      tiles.addEventListener("load-tile-set", () => {
        console.log("[3d-spike] tilesRenderer load-tile-set fired");
        setStatus("Tileset loaded · waiting for child tiles");
      });
      tiles.addEventListener("tiles-load-end", () => {
        console.log(
          "[3d-spike] tiles-load-end · group children:",
          tiles.group.children.length,
        );
      });
      this.tiles = tiles;
    },

    render(_gl, args) {
      if (!this.scene || !this.camera || !this.renderer || !this.tiles || !this.mapRef) return;

      // MapLibre v5's render signature varies: older builds passed the
      // matrix array directly as the 2nd arg, v5 wraps it in a struct.
      const matrix = Array.isArray(args)
        ? (args as unknown as number[])
        : (args as { defaultProjectionData: { mainMatrix: number[] } })
            .defaultProjectionData.mainMatrix;

      // Camera projection = MapLibre's full MVP (mercator world → clip
      // space). Pin matrixWorld/Inverse to identity so Three doesn't
      // apply its own view transform on top.
      this.camera.projectionMatrix.fromArray(matrix);
      this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert();
      this.camera.matrix.identity();
      this.camera.matrixWorld.identity();
      this.camera.matrixWorldInverse.identity();

      this.tiles.setCamera(this.camera);
      this.tiles.setResolutionFromRenderer(this.camera, this.renderer);
      this.tiles.update();

      // Diagnostic — log when child count changes (mesh attach events).
      const cc = this.tiles.group.children.length;
      if (cc !== this.childCountLastLogged) {
        console.log("[3d-spike] tilesRenderer.group.children.length:", cc);
        this.childCountLastLogged = cc;
      }

      this.renderer.resetState();
      this.renderer.render(this.scene, this.camera);

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
