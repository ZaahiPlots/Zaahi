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
import { FLOOR_H, PODIUM_TOP } from "./geometry";

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
  /** Hex colour used by the Lambert fallback material (for land-use
   *  categories that don't yet have a procedural shader). Stage 3
   *  uses this for everything except residential / commercial /
   *  industrial. */
  colorHex: string;
  /** UPPER_SNAKE land-use string. Drives shader selection in Stage 3+.
   *  null → falls back to the Lambert flat-colour path. */
  landUse: string | null;
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

// ── Stage 3 facade profiles + GLSL ───────────────────────────────
//
// Per-category palette + a `kindCode` numeric uniform the fragment
// shader branches on (cheaper than a uniform string lookup, and
// matches the prototype's design). Stage 4 will add: 2=mixed_use,
// 3=hotel, plus 5+ entries for the remaining categories.

interface FacadeProfile {
  base: number;
  window: number;
  sill: number;
  accent: number;
  kindCode: number;
}

const FACADE_PROFILES: Record<string, FacadeProfile> = {
  // Warm beige stone with dark windows + prominent balcony band per
  // floor. Stage 3.
  RESIDENTIAL: {
    base: 0xc8a56a,
    window: 0x1a1422,
    sill: 0x8a6840,
    accent: 0xe0bc85,
    kindCode: 0,
  },
  // Navy panel with blue-glass curtain wall + dark spandrel between
  // floors. Stage 3.
  COMMERCIAL: {
    base: 0x1a2740,
    window: 0x47a0e0,
    sill: 0x0e1828,
    accent: 0x2a4470,
    kindCode: 1,
  },
  // Stage 3 — share commercial styling for OFFICE / RETAIL until a
  // separate spec lands (CLAUDE.md defaultSetbackM groups them).
  OFFICE: {
    base: 0x1a2740,
    window: 0x47a0e0,
    sill: 0x0e1828,
    accent: 0x2a4470,
    kindCode: 1,
  },
  RETAIL: {
    base: 0x1a2740,
    window: 0x47a0e0,
    sill: 0x0e1828,
    accent: 0x2a4470,
    kindCode: 1,
  },
  // Slate grey corrugated metal ribs + sparse small windows in the
  // upper third only. Stage 3.
  INDUSTRIAL: {
    base: 0x4a5560,
    window: 0x12181e,
    sill: 0x2a3038,
    accent: 0x708090,
    kindCode: 4,
  },
  // CLAUDE.md groups industrial with warehouse — share the profile.
  WAREHOUSE: {
    base: 0x4a5560,
    window: 0x12181e,
    sill: 0x2a3038,
    accent: 0x708090,
    kindCode: 4,
  },
};

// Vertex shader: pass object-local position + local normal so the
// fragment shader can tile windows in metres and detect roof/wall
// independent of camera angle.
const FACADE_VS = /* glsl */ `
  varying vec3 vLocal;
  varying vec3 vNormalLocal;
  void main() {
    vLocal = position;
    vNormalLocal = normal;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Fragment shader: procedural windows / balcony bands / corrugation
// keyed by uKind. Z-up convention — see makeFacadeMaterial header.
const FACADE_FS = /* glsl */ `
  precision highp float;
  varying vec3 vLocal;
  varying vec3 vNormalLocal;
  uniform vec3 uBase;
  uniform vec3 uWindow;
  uniform vec3 uSill;
  uniform vec3 uAccent;
  uniform float uFloorH;
  uniform float uPodiumTop;
  uniform float uKind;

  // Windows tiled in (colW × uFloorH) cells.
  float windowMask(float colCoord, float rowCoord, float colW, float winW) {
    float fx = fract(colCoord / colW);
    float fy = fract(rowCoord / uFloorH);
    float padX = (colW - winW) / colW * 0.5;
    float padYbot = 0.25;
    float padYtop = 0.85;
    float inX = step(padX, fx) * step(fx, 1.0 - padX);
    float inY = step(padYbot, fy) * step(fy, padYtop);
    return inX * inY;
  }

  // Bottom 10% of each floor — residential balcony band.
  float balconyBand(float rowCoord) {
    float fy = fract(rowCoord / uFloorH);
    return step(0.0, fy) * step(fy, 0.10);
  }

  // 60 cm pitch corrugation for industrial sides.
  float corrugation(float colCoord) {
    return 0.5 + 0.5 * cos(colCoord * 3.14159 / 0.6);
  }

  void main() {
    // Roof / floor / wall detection by object-space up dot.
    float upDot = dot(normalize(vNormalLocal), vec3(0.0, 0.0, 1.0));
    if (upDot > 0.6) {
      // Roof — flat dark cap with a faint base tint.
      gl_FragColor = vec4(uBase * 0.35, 1.0);
      return;
    }
    if (upDot < -0.6) {
      // Underside — never visible at street zoom; cheap black.
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
      return;
    }

    // Side wall. Pick the dominant horizontal axis so columns tile
    // cleanly along the longer XY projection of the face.
    float colCoord = abs(vLocal.x) > abs(vLocal.y) ? vLocal.y : vLocal.x;
    float rowCoord = vLocal.z;

    vec3 col = uBase;

    // Per-category column pitch + window width.
    float colW = 3.2;
    float winW = 2.4;
    if (uKind > 0.5 && uKind < 1.5) { colW = 2.8; winW = 2.3; } // commercial — curtain wall
    if (uKind > 3.5)                { colW = 6.0; winW = 1.0; } // industrial — sparse small
    if (uKind < 0.5)                { colW = 4.0; winW = 2.0; } // residential — wider

    float win = windowMask(colCoord, rowCoord, colW, winW);

    // Industrial: corrugated metal + sparse upper windows only.
    if (uKind > 3.5) {
      float corr = corrugation(colCoord);
      col = mix(uBase * 0.65, uBase * 1.05, corr);
      if (rowCoord < 4.0) win = 0.0;
    }

    // Residential: prominent balcony band warming the base.
    if (uKind < 0.5) {
      float bal = balconyBand(rowCoord);
      col = mix(col, uSill, bal * 0.7);
    }

    // Commercial: dark spandrel between floors (top + bottom 5 %).
    if (uKind > 0.5 && uKind < 1.5) {
      float fy = fract(rowCoord / uFloorH);
      float spandrel = step(0.85, fy) + step(fy, 0.05);
      col = mix(col, uSill, spandrel * 0.6);
    }

    // Window glass tint over the wall colour.
    col = mix(col, uWindow, win);

    // East-facing faces get a faint sun lift — fakes morning daylight
    // direction. Keeps consistency with the scratch prototype's look.
    col *= 0.85 + 0.15 * smoothstep(-0.5, 0.5, vNormalLocal.x);

    gl_FragColor = vec4(col, 1.0);
  }
`;

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

  /** Build a Three.js Mesh for one Tier. Material picked by landUse:
   *  Stage 3 categories (residential / commercial / industrial) get a
   *  procedural ShaderMaterial; everything else falls back to the
   *  Stage 2 Lambert flat-colour material. */
  function buildTierMesh(
    tier: Tier,
    colorHex: string,
    landUse: string | null,
  ): THREE.Mesh {
    const pts = ringToLocalMeters(tier.ring);
    const shape = new THREE.Shape(
      pts.map((p) => new THREE.Vector2(p.x, p.y)),
    );
    const depth = Math.max(0, tier.topM - tier.baseM);
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: false,
      steps: 1,
    });
    // ExtrudeGeometry builds Z=0..depth. Translate up to baseM so the
    // base sits at the right altitude.
    geometry.translate(0, 0, tier.baseM);

    const material = makeFacadeMaterial(landUse) ?? makeFallbackMaterial(colorHex);
    const mesh = new THREE.Mesh(geometry, material);
    return mesh;
  }

  /** Stage 2 fallback for land-uses without a procedural shader yet. */
  function makeFallbackMaterial(colorHex: string): THREE.Material {
    return new THREE.MeshLambertMaterial({
      color: new THREE.Color(colorHex),
      // Flat shading gives the "panelled" look of fill-extrusion; without
      // it, very thin facets read as smooth.
      flatShading: true,
    });
  }

  // ── Stage 3 (2026-06-11) — procedural facade shaders. ──
  //
  // Ported from the scratch prototype
  // /home/zaahi/scratch/signature-realistic/index.html. Axis
  // convention converted from Y-up (prototype) to Z-up (this layer):
  //   prototype vWorld.y (altitude) → vLocal.z
  //   prototype vWorld.x / vWorld.z (horizontal) → vLocal.x / vLocal.y
  //   prototype vNormal.y (up-detect) → vNormalLocal.z
  // Categories supported by Stage 3: residential / commercial /
  // industrial. Mixed-use / hotel / educational / healthcare /
  // agricultural / future_development land on the Lambert fallback
  // until Stage 4.

  function makeFacadeMaterial(landUse: string | null): THREE.Material | null {
    if (!landUse) return null;
    const profile = FACADE_PROFILES[landUse];
    if (!profile) return null;
    return new THREE.ShaderMaterial({
      uniforms: {
        uBase:      { value: new THREE.Color(profile.base) },
        uWindow:    { value: new THREE.Color(profile.window) },
        uSill:      { value: new THREE.Color(profile.sill) },
        uAccent:    { value: new THREE.Color(profile.accent) },
        uFloorH:    { value: FLOOR_H },
        uPodiumTop: { value: PODIUM_TOP },
        uKind:      { value: profile.kindCode },
      },
      vertexShader: FACADE_VS,
      fragmentShader: FACADE_FS,
      // Front faces only — ExtrudeGeometry winds outward so back faces
      // are interior. Skipping them halves the fragment shader load.
      side: THREE.FrontSide,
    });
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
        const mesh = buildTierMesh(tier, b.colorHex, b.landUse);
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
