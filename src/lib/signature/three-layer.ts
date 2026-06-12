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
  /** Emphasize one parcel — all OTHER meshes desaturate toward grey
   *  (mirrors the fill-extrusion-color case expression in page.tsx
   *  applySelectionPaint). Pass null to clear. */
  setSelected(parcelId: string | null): void;
  /** Mirror MapLibre filter parity. Predicate is called per-parcelId;
   *  meshes whose parcel returns false get `mesh.visible = false`.
   *  Use to compose status / land-use / vault filters. */
  setVisibility(predicate: (parcelId: string) => boolean): void;
  /** Global on/off for the whole Three.js group — drives the LOD
   *  switch (zoom<15 or touch device). When disabled, all meshes are
   *  hidden and the caller restores fill-extrusion-opacity to 1. */
  setEnabled(enabled: boolean): void;
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
  // ── Stage 3 (residential / commercial / industrial) ──

  // Warm beige stone with dark windows + prominent balcony band per
  // floor.
  RESIDENTIAL: {
    base: 0xc8a56a, window: 0x1a1422, sill: 0x8a6840, accent: 0xe0bc85,
    kindCode: 0,
  },
  // Navy panel with blue-glass curtain wall + dark spandrel between
  // floors.
  COMMERCIAL: {
    base: 0x1a2740, window: 0x47a0e0, sill: 0x0e1828, accent: 0x2a4470,
    kindCode: 1,
  },
  // CLAUDE.md groups office/retail with commercial.
  OFFICE: {
    base: 0x1a2740, window: 0x47a0e0, sill: 0x0e1828, accent: 0x2a4470,
    kindCode: 1,
  },
  RETAIL: {
    base: 0x1a2740, window: 0x47a0e0, sill: 0x0e1828, accent: 0x2a4470,
    kindCode: 1,
  },
  // Slate grey corrugated metal + sparse upper-third windows.
  INDUSTRIAL: {
    base: 0x4a5560, window: 0x12181e, sill: 0x2a3038, accent: 0x708090,
    kindCode: 4,
  },
  WAREHOUSE: {
    base: 0x4a5560, window: 0x12181e, sill: 0x2a3038, accent: 0x708090,
    kindCode: 4,
  },

  // ── Stage 4 (mixed-use / hotel / educational / healthcare /
  //              agricultural / investment) ──

  // Mixed-use: purple base with shader branch that switches to
  // commercial pattern below podium top, residential pattern above.
  MIXED_USE: {
    base: 0x6a4870, window: 0x2a1830, sill: 0x402a48, accent: 0x9b59b6,
    kindCode: 2,
  },
  // Hotel: warm orange-brown stone, wide ribbon windows + accent
  // balcony band every floor.
  HOTEL: {
    base: 0xa0532c, window: 0x2a1810, sill: 0x6a3a1c, accent: 0xe67e22,
    kindCode: 3,
  },
  HOSPITALITY: {
    base: 0xa0532c, window: 0x2a1810, sill: 0x6a3a1c, accent: 0xe67e22,
    kindCode: 3,
  },
  // Agricultural: industrial-shape silhouette (barn-like corrugated
  // metal at 60 cm pitch), olive-green tint. Reuses kindCode 4 (the
  // industrial shader branch) — same pattern, recoloured base.
  AGRICULTURAL: {
    base: 0x5b6845, window: 0x1a201a, sill: 0x3a3f2a, accent: 0x6b8e23,
    kindCode: 4,
  },
  AGRICULTURE: {
    base: 0x5b6845, window: 0x1a201a, sill: 0x3a3f2a, accent: 0x6b8e23,
    kindCode: 4,
  },
  // Educational: warm brick-toned base, large classroom-style windows
  // tiled in wide columns. Own kindCode 5 — separate shader branch.
  EDUCATIONAL: {
    base: 0xa84d40, window: 0x281612, sill: 0x6a3024, accent: 0x1abc9c,
    kindCode: 5,
  },
  EDUCATION: {
    base: 0xa84d40, window: 0x281612, sill: 0x6a3024, accent: 0x1abc9c,
    kindCode: 5,
  },
  // Healthcare: pale off-white base, narrow vertical strip windows
  // arranged in tight columns. Clean / sterile feel. Own kindCode 6.
  HEALTHCARE: {
    base: 0xd8d4c8, window: 0x2a4555, sill: 0x9a948a, accent: 0xe74c3c,
    kindCode: 6,
  },
  // Investment: shares the curtain-wall commercial silhouette
  // (kindCode 1) but with the brand teal palette to match the
  // off-plan / pre-construction visual register set in CLAUDE.md
  // (Investment color #14B8A6 added 2026-06-03).
  INVESTMENT: {
    base: 0x0d3a44, window: 0x14b8a6, sill: 0x062228, accent: 0x14b8a6,
    kindCode: 1,
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
  // Stage 5 — selection desaturation. 0 = normal, 1 = full grey wash.
  // Mirrors the case-expression-driven grey #7a7a7a tint used by
  // page.tsx's applySelectionPaint on the MapLibre fill-extrusion.
  uniform float uDesaturate;

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

    // Per-category column pitch + window width. Defaults are the
    // "Stage 4 mid-cat" pitch — commercial / hotel / mixed-use all
    // happily render at 3.2 m before per-cat overrides.
    float colW = 3.2;
    float winW = 2.4;
    if (uKind > 0.5 && uKind < 1.5) { colW = 2.8; winW = 2.3; } // commercial / investment — curtain wall
    if (uKind > 1.5 && uKind < 2.5) { colW = 3.4; winW = 2.5; } // mixed-use — mid pitch
    if (uKind > 2.5 && uKind < 3.5) { colW = 4.0; winW = 3.4; } // hotel — wide ribbon
    if (uKind > 3.5 && uKind < 4.5) { colW = 6.0; winW = 1.0; } // industrial / agricultural
    if (uKind > 4.5 && uKind < 5.5) { colW = 5.0; winW = 3.5; } // educational — large classroom
    if (uKind > 5.5 && uKind < 6.5) { colW = 1.6; winW = 0.7; } // healthcare — narrow strips
    if (uKind < 0.5)                { colW = 4.0; winW = 2.0; } // residential — wider

    float win = windowMask(colCoord, rowCoord, colW, winW);

    // Industrial / agricultural: corrugated metal + sparse upper
    // windows only.
    if (uKind > 3.5 && uKind < 4.5) {
      float corr = corrugation(colCoord);
      col = mix(uBase * 0.65, uBase * 1.05, corr);
      if (rowCoord < 4.0) win = 0.0;
    }

    // Residential: prominent balcony band warming the base.
    if (uKind < 0.5) {
      float bal = balconyBand(rowCoord);
      col = mix(col, uSill, bal * 0.7);
    }

    // Commercial / investment: dark spandrel between floors
    // (top + bottom 5 %).
    if (uKind > 0.5 && uKind < 1.5) {
      float fy = fract(rowCoord / uFloorH);
      float spandrel = step(0.85, fy) + step(fy, 0.05);
      col = mix(col, uSill, spandrel * 0.6);
    }

    // Mixed-use: lower floors below podium top render as commercial
    // (smaller windows + spandrel), upper floors as residential
    // (wider windows + balcony band). Founder-ratified transition
    // at uPodiumTop — same boundary as the geometry tier split.
    if (uKind > 1.5 && uKind < 2.5) {
      if (rowCoord < uPodiumTop) {
        // Lower: commercial pattern at slightly larger pitch so the
        // visual transition reads cleanly.
        win = windowMask(colCoord, rowCoord, 3.0, 2.4);
        float fy = fract(rowCoord / uFloorH);
        float spandrel = step(0.85, fy) + step(fy, 0.05);
        col = mix(col, uSill, spandrel * 0.5);
      } else {
        // Upper: residential with balcony band.
        win = windowMask(colCoord, rowCoord, 4.0, 2.0);
        float bal = balconyBand(rowCoord);
        col = mix(col, uSill, bal * 0.55);
      }
    }

    // Hotel: ribbon balcony band on the lower 20 % of every floor,
    // accent-coloured (warm orange) so the building reads as
    // hospitality-grade.
    if (uKind > 2.5 && uKind < 3.5) {
      float fy = fract(rowCoord / uFloorH);
      float ribbon = step(0.0, fy) * step(fy, 0.20);
      col = mix(col, uAccent, ribbon * 0.4);
    }

    // Educational: subtle horizontal banding every 2 floors so the
    // building reads as stacked classroom blocks. Sill-coloured band
    // at 5 % thick.
    if (uKind > 4.5 && uKind < 5.5) {
      // Two-floor cycle.
      float blockY = fract(rowCoord / (uFloorH * 2.0));
      float band = step(0.95, blockY) + step(blockY, 0.05);
      col = mix(col, uSill, band * 0.45);
    }

    // Healthcare: tight vertical mullion ribs between each window
    // column — strengthens the "narrow strip" look at street zoom.
    if (uKind > 5.5 && uKind < 6.5) {
      float fx = fract(colCoord / 1.6);
      // Mullion at the column edge (5 % of cell width on each side).
      float mullion = step(0.95, fx) + step(fx, 0.05);
      col = mix(col, uSill, mullion * 0.5);
    }

    // Window glass tint over the wall colour. Done LAST so per-cat
    // shape modifiers above don't get cancelled by the glass blend.
    col = mix(col, uWindow, win);

    // East-facing faces get a faint sun lift — fakes morning daylight
    // direction. Keeps consistency with the scratch prototype's look.
    col *= 0.85 + 0.15 * smoothstep(-0.5, 0.5, vNormalLocal.x);

    // Stage 5 — selection desaturation blend toward grey #7a7a7a.
    col = mix(col, vec3(0.478), uDesaturate);

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

  /** Convert one ring of [lng, lat] pairs into project-meter [x, y]
   *  pairs centred at ORIGIN_LNG_LAT. Returned values can be large
   *  (kilometres) — pre-Stage-5 we used these directly as vertex
   *  positions, which overflowed float32 precision inside the shader's
   *  fract() tile arithmetic and washed every facade toward grey. The
   *  bug-fix below subtracts a per-mesh origin BEFORE these meters
   *  become vertex coords so the shader sees small values. */
  function ringToProjectMeters(ring: number[][]): { x: number; y: number }[] {
    return ring.map(([lng, lat]) => ({
      x: (lng - ORIGIN_LNG) * M_PER_DEG_LNG,
      y: (lat - ORIGIN_LAT) * M_PER_DEG_LAT,
    }));
  }

  /** Centroid of a ring expressed in project-meters. Anchor used as
   *  per-mesh origin so vertex coords stay small inside the GPU
   *  precision band. CPU computes the subtraction in double precision
   *  (JS numbers are float64) before handing float32 to the shader. */
  function ringCentroidProjectMeters(ring: number[][]): { x: number; y: number } {
    if (ring.length === 0) return { x: 0, y: 0 };
    let sx = 0, sy = 0;
    for (const [lng, lat] of ring) {
      sx += (lng - ORIGIN_LNG) * M_PER_DEG_LNG;
      sy += (lat - ORIGIN_LAT) * M_PER_DEG_LAT;
    }
    return { x: sx / ring.length, y: sy / ring.length };
  }

  /** Build a Three.js Mesh for one Tier. Material picked by landUse:
   *  Stage 3 categories (residential / commercial / industrial) get a
   *  procedural ShaderMaterial; everything else falls back to the
   *  Stage 2 Lambert flat-colour material.
   *
   *  2026-06-12 Stage 5 precision-overflow fix:
   *   - Vertex coords are subtracted from `meshOriginXm`/`meshOriginYm`
   *     so they stay in the ±50 m band → shader fract() math is exact.
   *   - mesh.position is set to the same origin (in project-meters) so
   *     Three.js's modelViewMatrix puts the mesh back at the correct
   *     world location. The modelMatrix already in camera.projection-
   *     Matrix converts meters→Mercator at the project anchor.
   */
  function buildTierMesh(
    tier: Tier,
    colorHex: string,
    landUse: string | null,
    meshOriginXm: number,
    meshOriginYm: number,
  ): THREE.Mesh {
    const pts = ringToProjectMeters(tier.ring);
    const shape = new THREE.Shape(
      pts.map((p) => new THREE.Vector2(p.x - meshOriginXm, p.y - meshOriginYm)),
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
    // Per-mesh origin in project-meters. Three.js's modelViewMatrix
    // applies this BEFORE the project→Mercator matrix already baked
    // into camera.projectionMatrix, so absolute world placement is
    // unchanged. Only the `position` attribute the shader receives
    // shrinks to the ±50 m band.
    mesh.position.set(meshOriginXm, meshOriginYm, 0);
    return mesh;
  }

  /** Stage 2 fallback for land-uses without a procedural shader yet.
   *  Stage 5 stashes the original color on `userData` so setSelected
   *  can desaturate / restore by mutating material.color in-place. */
  function makeFallbackMaterial(colorHex: string): THREE.Material {
    const mat = new THREE.MeshLambertMaterial({
      color: new THREE.Color(colorHex),
      flatShading: true,
    });
    mat.userData.originalColorHex = colorHex;
    return mat;
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
        uBase:       { value: new THREE.Color(profile.base) },
        uWindow:     { value: new THREE.Color(profile.window) },
        uSill:       { value: new THREE.Color(profile.sill) },
        uAccent:     { value: new THREE.Color(profile.accent) },
        uFloorH:     { value: FLOOR_H },
        uPodiumTop:  { value: PODIUM_TOP },
        uKind:       { value: profile.kindCode },
        uDesaturate: { value: 0.0 },
      },
      vertexShader: FACADE_VS,
      fragmentShader: FACADE_FS,
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
    const matCounts = { shader: 0, lambert: 0 };
    const landUseSeen = new Set<string>();
    // Diagnostic: max absolute vertex magnitude — confirms the
    // precision fix keeps vertex coords in the small-range band.
    let maxVertexAbs = 0;
    for (const b of buildings) {
      landUseSeen.add(b.landUse ?? "(null)");
      // 2026-06-12 Stage 5 fix — per-building origin in project-meters.
      // All tiers of one building share the same origin so their
      // rings stack cleanly without per-tier delta.
      const origin = ringCentroidProjectMeters(b.tiers[0]?.ring ?? []);
      for (const tier of b.tiers) {
        const mesh = buildTierMesh(tier, b.colorHex, b.landUse, origin.x, origin.y);
        mesh.userData.parcelId = b.parcelId;
        mesh.userData.isVault = b.isVault;
        mesh.userData.status = b.status;
        buildingsGroup.add(mesh);
        if (mesh.material instanceof THREE.ShaderMaterial) matCounts.shader++;
        else matCounts.lambert++;
        // Inspect first vertex of geometry to confirm small-range coords.
        const pos = (mesh.geometry as THREE.BufferGeometry).getAttribute("position");
        if (pos && pos.itemSize >= 3) {
          for (let i = 0; i < pos.count; i++) {
            const ax = Math.abs(pos.getX(i));
            const ay = Math.abs(pos.getY(i));
            if (ax > maxVertexAbs) maxVertexAbs = ax;
            if (ay > maxVertexAbs) maxVertexAbs = ay;
          }
        }
      }
    }
    console.log(
      "[ZAAHI three-layer] setBuildings:",
      buildings.length, "buildings,",
      matCounts.shader + matCounts.lambert, "meshes (shader=" + matCounts.shader,
      "lambert=" + matCounts.lambert + ")",
      "landUse:", [...landUseSeen].sort(),
      "maxVertexAbs(m)=" + maxVertexAbs.toFixed(1),
    );
    map.triggerRepaint();
  }

  // ── Stage 5 parity API ──

  // Grey #7a7a7a as a normalised THREE.Color, used as the desaturation
  // target for Lambert-material fallbacks. Matches the literal hex
  // page.tsx applySelectionPaint pushes onto the MapLibre fill-extrusion
  // for the non-selected case branch.
  const GREY = new THREE.Color(0x7a7a7a);

  function applyDesaturationToMesh(mesh: THREE.Mesh, desaturated: boolean): void {
    const mat = mesh.material as THREE.Material | THREE.Material[];
    if (Array.isArray(mat)) return; // not in our path
    if (mat instanceof THREE.ShaderMaterial) {
      const u = mat.uniforms.uDesaturate;
      if (u) u.value = desaturated ? 1.0 : 0.0;
    } else if (mat instanceof THREE.MeshLambertMaterial) {
      const orig = mat.userData.originalColorHex as string | undefined;
      if (desaturated) {
        mat.color.copy(GREY);
      } else if (orig !== undefined) {
        mat.color.set(orig);
      }
    }
  }

  function setSelected(parcelId: string | null): void {
    console.log("[ZAAHI three-layer] setSelected:", parcelId);
    buildingsGroup.traverse((obj) => {
      const m = obj as THREE.Mesh;
      if (!m.isMesh) return;
      const ownParcelId = m.userData.parcelId as string | undefined;
      if (parcelId === null) {
        applyDesaturationToMesh(m, false);
      } else {
        applyDesaturationToMesh(m, ownParcelId !== parcelId);
      }
    });
    map.triggerRepaint();
  }

  function setVisibility(predicate: (parcelId: string) => boolean): void {
    buildingsGroup.traverse((obj) => {
      const m = obj as THREE.Mesh;
      if (!m.isMesh) return;
      const pid = m.userData.parcelId as string | undefined;
      m.visible = pid ? predicate(pid) : true;
    });
    map.triggerRepaint();
  }

  function setEnabled(enabled: boolean): void {
    buildingsGroup.visible = enabled;
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
      // 2026-06-12 STAGE 5 flat-grey bug investigation: Three.js r150+
      // defaults outputColorSpace='srgb' + auto sRGB encoding pass. On
      // a shared MapLibre framebuffer the auto-encoding washes colours.
      // Force linear-srgb output so my shader's vec3 colours (already
      // computed as linear in [0..1]) pass through unchanged.
      renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
      console.log(
        "[ZAAHI three-layer] renderer init:",
        "outputColorSpace=" + renderer.outputColorSpace,
        "capabilities=" + (renderer.capabilities.isWebGL2 ? "WebGL2" : "WebGL1"),
        "ColorManagement.enabled=" + THREE.ColorManagement.enabled,
      );
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
    setSelected,
    setVisibility,
    setEnabled,
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
