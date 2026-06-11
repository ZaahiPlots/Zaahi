"use client";

// ZAAHI Signature — MapLibre CustomLayer + Three.js scene.
//
// 2026-06-11 (Stage 2 of feat/signature-realistic). Replaces the
// MapLibre `fill-extrusion` rendering of ZAAHI listings with a
// Three.js scene drawn into the same WebGL context. Behind a
// `?render=three` URL flag so prod traffic stays on fill-extrusion
// until the migration finishes.
//
// Stage 2 scope: SAME flat colour per building (matched to current
// land-use hex), same Signature geometry (consumed from the unified
// src/lib/signature/geometry.ts module). No textures, no shaders,
// no realism — that's Stage 3+. Goal here: prove the camera-sync
// + perf path under keyboard-nav 60 Hz jumpTo, with zero visual
// regression vs fill-extrusion at the flat-colour level.
//
// Coordinate convention:
//   • All meshes built in [east-meters, north-meters, up-meters]
//     relative to a fixed ORIGIN_LNG_LAT.
//   • `scene.up = (0, 0, 1)` so Three.js treats Z as world-up.
//   • Each render frame we project our scene into MapLibre's
//     Mercator space via the matrix MapLibre hands us.
//
// Keyboard-nav synchronisation:
//   keyboard-nav.ts drives the camera via map.jumpTo at ~60 Hz.
//   MapLibre re-renders the basemap on every jumpTo → calls our
//   custom-layer `render(gl, matrix)` callback synchronously in
//   the same frame → our scene is projected with the up-to-date
//   matrix. There is no lag between basemap and meshes, because
//   they share MapLibre's frame loop by design.

import type maplibregl from "maplibre-gl";
import { MercatorCoordinate } from "maplibre-gl";
import * as THREE from "three";
import type { Tier } from "./geometry";

// ── Local coordinate origin (deg). Used to anchor mesh meters-space. ──
// Page default center; sits inside Dubai so meter math stays accurate
// for every UAE plot we render. Far-away meshes (e.g. AD plots ~110 km
// north) get a tiny <0.005 % Mercator stretch — invisible at any zoom.
const ORIGIN_LNG = 55.27;
const ORIGIN_LAT = 25.20;

// Metres-per-degree at the origin latitude. Used to convert each
// ring vertex from lng/lat to local meters. Matches the constants
// used by insetRingByMeters in geometry.ts so meshes line up with
// fill-extrusion to sub-metre precision.
const M_PER_DEG_LAT = 111_000;
const M_PER_DEG_LNG = 111_000 * Math.cos((ORIGIN_LAT * Math.PI) / 180);

// ── Public types ──

/** One building emitted by loadZaahiPlots. Source of truth for shape
 *  + colour + isVault flag. The custom layer rebuilds its scene from
 *  these every time setBuildings is called. */
export interface ZaahiBuildingInput {
  parcelId: string;
  tiers: Tier[];
  colorHex: string;
  isVault: boolean;
  status: string;
}

export interface ZaahiThreeLayerController {
  /** Replace the rendered building set. Called after each
   *  loadZaahiPlots refresh (initial load, vault add, etc.). */
  setBuildings(buildings: ZaahiBuildingInput[]): void;
  /** Remove the custom layer + dispose Three.js resources. */
  destroy(): void;
  /** Layer id (for caller's records). */
  readonly layerId: string;
}

// ── Implementation ──

const LAYER_ID = "zaahi-three-buildings";

export function installZaahiThreeLayer(
  map: maplibregl.Map,
): ZaahiThreeLayerController {
  // Three.js side-state lives in the closure; the map.addLayer call
  // below wires it into MapLibre's render loop.
  const scene = new THREE.Scene();
  scene.up = new THREE.Vector3(0, 0, 1);

  // Hemisphere light gives a similar top-vs-side luminance ramp to
  // MapLibre fill-extrusion's vertical-gradient. Ambient lifts the
  // shadow side off pure black. No directional/cast shadows in
  // Stage 2 — that's Stage 3+ if we ever add cast shadows from sun
  // slider.
  scene.add(new THREE.HemisphereLight(0xffffff, 0x222831, 0.85));
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));

  const camera = new THREE.PerspectiveCamera();
  // Group holds every building mesh; we can dispose + replace the
  // group on setBuildings without touching lights or camera.
  let buildingsGroup = new THREE.Group();
  scene.add(buildingsGroup);

  // Renderer is created lazily inside onAdd because we need the GL
  // context MapLibre owns. WebGLRenderer must share the same context
  // and canvas — never create a separate one.
  let renderer: THREE.WebGLRenderer | null = null;

  // Mercator anchor + meter→mercator scale. Computed once at
  // layer creation: ORIGIN_LNG_LAT is fixed for the session.
  const merc = MercatorCoordinate.fromLngLat([ORIGIN_LNG, ORIGIN_LAT], 0);
  const mercScale = merc.meterInMercatorCoordinateUnits();

  // ── Geometry helpers ──

  /** Convert one ring of [lng, lat] pairs into local-meter
   *  [x, y] pairs centred at ORIGIN_LNG_LAT. */
  function ringToLocalMeters(ring: number[][]): { x: number; y: number }[] {
    return ring.map(([lng, lat]) => ({
      x: (lng - ORIGIN_LNG) * M_PER_DEG_LNG,
      y: (lat - ORIGIN_LAT) * M_PER_DEG_LAT,
    }));
  }

  /** Build a Three.js Mesh for one Tier. */
  function buildTierMesh(tier: Tier, colorHex: string): THREE.Mesh {
    const pts = ringToLocalMeters(tier.ring);
    const shape = new THREE.Shape(
      pts.map((p) => new THREE.Vector2(p.x, p.y)),
    );
    const depth = Math.max(0, tier.topM - tier.baseM);
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: false,
      // steps:1 — no subdivision along extrusion axis (we don't need
      // it for flat-colour Stage 2; saves vertices).
      steps: 1,
    });
    // ExtrudeGeometry builds Z=0..depth. Translate up to baseM so the
    // base sits at the right altitude.
    geometry.translate(0, 0, tier.baseM);

    const material = new THREE.MeshLambertMaterial({
      color: new THREE.Color(colorHex),
      // Flat shading on the sides gives the "panelled" look of
      // fill-extrusion; without it, very thin facets read as smooth
      // and the building loses its tower-block identity.
      flatShading: true,
    });
    const mesh = new THREE.Mesh(geometry, material);
    return mesh;
  }

  /** Tear down all current building meshes + materials. */
  function disposeGroup(): void {
    buildingsGroup.traverse((obj) => {
      const m = obj as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      if (m.material) {
        const mat = m.material as THREE.Material | THREE.Material[];
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else mat.dispose();
      }
    });
    scene.remove(buildingsGroup);
    buildingsGroup = new THREE.Group();
    scene.add(buildingsGroup);
  }

  // ── Public mutator ──

  function setBuildings(buildings: ZaahiBuildingInput[]): void {
    disposeGroup();
    for (const b of buildings) {
      for (const tier of b.tiers) {
        const mesh = buildTierMesh(tier, b.colorHex);
        // Stash parcelId for future picking (Stage 5 parity work).
        mesh.userData.parcelId = b.parcelId;
        mesh.userData.isVault = b.isVault;
        mesh.userData.status = b.status;
        buildingsGroup.add(mesh);
      }
    }
    map.triggerRepaint();
  }

  // ── MapLibre CustomLayer adapter ──

  const customLayer: maplibregl.CustomLayerInterface = {
    id: LAYER_ID,
    type: "custom",
    renderingMode: "3d",

    onAdd(_map, gl) {
      renderer = new THREE.WebGLRenderer({
        canvas: map.getCanvas(),
        context: gl as WebGLRenderingContext,
        antialias: true,
      });
      // CRITICAL: don't clear the framebuffer between draws — we share
      // it with MapLibre's basemap. autoClear=true wipes the basemap.
      renderer.autoClear = false;
    },

    render(_gl, matrix) {
      if (!renderer) return;

      // Build the projection matrix MapLibre wants us to multiply by
      // our model transform. ModelTransform = translate to origin's
      // Mercator position, then scale by meterInMercatorUnits.
      //
      // The negative on Y handles Mercator's south-positive Y axis
      // vs our scene's north-positive Y. Z stays positive because
      // MapLibre's altitude axis matches our scene's up axis.
      const modelMatrix = new THREE.Matrix4()
        .makeTranslation(merc.x, merc.y, merc.z)
        .scale(new THREE.Vector3(mercScale, -mercScale, mercScale));

      camera.projectionMatrix = new THREE.Matrix4()
        .fromArray(matrix as unknown as ArrayLike<number>)
        .multiply(modelMatrix);

      // Three.js needs to know GL state may have been mutated by
      // MapLibre between frames. resetState restores its tracked
      // state to match what's actually in the context. Skipping
      // this corrupts later MapLibre draws (e.g., labels disappear).
      renderer.resetState();
      renderer.render(scene, camera);

      // Tell MapLibre to schedule another frame — necessary while
      // we want continuous updates. Without this, if neither the
      // user nor an animation moves the camera, our scene wouldn't
      // re-draw. With it, keyboard-nav's jumpTo 60 Hz triggers
      // movement → MapLibre re-renders → we re-render. Idle case
      // (no movement, no animation): MapLibre re-renders once after
      // this triggerRepaint, sees nothing changed, stops. So this
      // is cheap.
      map.triggerRepaint();
    },

    onRemove(_map, _gl) {
      disposeGroup();
      if (renderer) {
        renderer.dispose();
        renderer = null;
      }
    },
  };

  map.addLayer(customLayer);

  return {
    setBuildings,
    layerId: LAYER_ID,
    destroy(): void {
      if (map.getLayer(LAYER_ID)) {
        try {
          map.removeLayer(LAYER_ID);
        } catch {
          /* layer already gone — basemap swap teardown race */
        }
      }
    },
  };
}
