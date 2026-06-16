"use client";

// ZAAHI Land-use ARCHETYPE layer — MapLibre CustomLayer + Three.js.
//
// Renders the ZAAHI curated listings as per-land-use MORPHOLOGY massing
// (src/lib/archetypes/geometry.ts) instead of fill-extrusion tiers. Behind
// the `?archetypes=1` URL flag (default off → prod unchanged). Translucent,
// canonical land-use colours (legend untouched).
//
// Render core (matrix unwrap + framebuffer null-bind + per-mesh precision
// origin + Z-up scene) reuses the PROVEN pattern from the live
// BuildingGlbLayer and feat/signature-v2 three-layer (which rendered 123
// buildings on the deployed map — step 4 PASS). Only the geometry + material
// differ here. Do NOT "fix" the matrix shim — it is the §10 root-cause fix.

import type maplibregl from "maplibre-gl";
import { MercatorCoordinate } from "maplibre-gl";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { buildArchetype, obbOf, clampToFootprint, FLOOR_H, type Solid } from "./geometry";
import { getSunPosition } from "../sun-position";

// Same observer the map's sun slider uses (useSunLight.ts) so archetype
// lighting tracks the SAME solar model → reacts to the sun toggle.
const DUBAI_LAT = 25.2;
const DUBAI_LNG = 55.27;

// GLB archetype models (Meshy→Blender pipeline). Normalized to a unit box
// (X,Y ∈ [-0.5,0.5], Z ∈ [0,1] base-on-ground after Blender Z-up export). When a
// land-use has a GLB it's instanced+scaled per plot instead of procedural massing.
const ARCHETYPE_GLB: Record<string, string> = {
  HOTEL: "/glb/archetypes/hotel.glb",
  COMMERCIAL: "/glb/archetypes/commercial.glb",
  EDUCATIONAL: "/glb/archetypes/educational.glb",
  HEALTHCARE: "/glb/archetypes/healthcare.glb",
  INDUSTRIAL: "/glb/archetypes/industrial.glb",
  AGRICULTURAL: "/glb/archetypes/agricultural.glb",
  FUTURE_DEVELOPMENT: "/glb/archetypes/future_development.glb",
  INVESTMENT: "/glb/archetypes/investment.glb",
};

const M_PER_DEG_LAT = 111_320;
const LAYER_ID = "zaahi-archetypes-3d";

export interface ArchetypeBuildingInput {
  parcelId: string;
  /** Building footprint ring as [lng, lat] pairs (DDA building-limit or
   *  setback inset — same ring loadZaahiPlots feeds fill-extrusion). */
  footprint: number[][];
  /** Plot polygon ring as [lng, lat]. Hard boundary: all geometry is clamped
   *  inside it (the inset footprint can poke outside the plot on concave plots). */
  plot?: number[][];
  landUse: string | null;
  colorHex: string;
  totalH: number;
  isVault: boolean;
  status: string;
}

export interface ArchetypeLayerController {
  setBuildings(buildings: ArchetypeBuildingInput[]): void;
  setSelected(parcelId: string | null): void;
  setVisibility(predicate: (parcelId: string) => boolean): void;
  setEnabled(enabled: boolean): void;
  /** Aim the archetype SUN from the solar model for `date` (null = now) so the
   *  models self-shadow + react to the map's sun toggle. */
  setSun(date: Date | null): void;
  destroy(): void;
  readonly layerId: string;
}

const GREY = new THREE.Color(0x7a7a7a);

// Line-texture style. Founder ratified VARIANT G (2026-06-15) as the default for
// ALL types: edges ×1.5 LIGHTER (volume corners read as light cants) + floor
// bands ×1.4 LIGHTER (levels highlighted) + NO vertical ribs — volumetric and
// multi-storey, not a solid block nor a wireframe cage. The `?lv=` URL param
// overrides for tuning (A/B/C/D/E/F/H). Each field is a multiplier on the body
// legend colour, "gold" (#C8A96E), or null to omit that line family.
type LineVariant = { edge: number | "gold"; band: number | "gold" | null; rib: number | "gold" | null; ribSpacing: number };
function resolveLineVariant(): LineVariant {
  let lv = "";
  try { lv = (new URLSearchParams(window.location.search).get("lv") || "").toUpperCase(); } catch { /* ignore */ }
  switch (lv) {
    case "A": return { edge: 1.2, band: 1.4, rib: 1.4, ribSpacing: 14 };  // floors lighter — highlight
    case "B": return { edge: 0.5, band: 0.5, rib: 0.5, ribSpacing: 14 };  // floors darker — shadow
    case "D": return { edge: 1.0, band: null, rib: 1.3, ribSpacing: 18 }; // vertical ribs only
    case "E": return { edge: 1.0, band: "gold", rib: "gold", ribSpacing: 16 }; // brand gold accent
    // F/G/H (founder round 2): bright volume edges (light cants) + visible
    // floor levels — read volumetric + multi-storey without a wireframe cage.
    case "F": return { edge: 1.5, band: 0.6, rib: null, ribSpacing: 14 };  // edges light, floors mid-dark
    case "H": return { edge: 1.5, band: 0.5, rib: 0.7, ribSpacing: 20 };   // edges light, dark floors + sparse ribs
    case "C": return { edge: 1.0, band: 0.5, rib: null, ribSpacing: 14 };  // clean horizontal floors
    case "G":
    default:  return { edge: 1.5, band: 1.4, rib: null, ribSpacing: 14 };  // G — light volume edges + light floor levels, no ribs (DEFAULT, founder 2026-06-15)
  }
}
const GOLD_LINE = new THREE.Color(0xc8a96e);

export function installArchetypeLayer(map: maplibregl.Map): ArchetypeLayerController {
  const scene = new THREE.Scene();
  scene.up = new THREE.Vector3(0, 0, 1);
  // PBR-grade lighting (hero-building parity, founder 2026-06-15). The OLD setup
  // (hemisphere 1.15 + ambient 0.75 + emissive 0.22) flooded every face evenly,
  // so the Blender-modelled recessed windows never self-shadowed → they vanished
  // on the map. Now: LOW ambient + a strong directional "SUN" wired to the SAME
  // getSunPosition() the map's sun slider uses (so recess lintels darken exactly
  // like the render AND the whole thing reacts to the sun toggle). Tone mapping
  // rolls highlights off so the sun can be strong without clipping to white,
  // and is hue-preserving (Neutral) so the canonical legend colours stay true.
  const ambient = new THREE.AmbientLight(0xffffff, 0.42);
  scene.add(ambient);
  const skyFill = new THREE.HemisphereLight(0xbfd4ff, 0x2b2620, 0.30);
  scene.add(skyFill);
  const sun = new THREE.DirectionalLight(0xffffff, 2.6);
  sun.position.set(0.4, -0.7, 1.0);
  scene.add(sun);
  scene.add(sun.target); // target stays at origin → parallel (directional) rays

  // Aim + colour the sun from the solar model for `date` (null = now). Scene
  // axes are X=east, Y=south (the per-building group applies S(s,-s,s), flipping
  // north→-Y), Z=up — so ENU (E,N,U) maps to (x, -y, z).
  function applySun(date: Date | null): void {
    const sp = getSunPosition(date ?? new Date(), DUBAI_LAT, DUBAI_LNG);
    const altR = Math.max(sp.altitude, 3) * (Math.PI / 180); // graze, never from below
    const azR = sp.azimuth * (Math.PI / 180);
    const cosA = Math.cos(altR);
    sun.position.set(Math.sin(azR) * cosA, -Math.cos(azR) * cosA, Math.sin(altR));
    sun.color.set(sp.color);
    const day = sp.altitude > 0;
    sun.intensity = day ? 1.7 + sp.intensity * 1.3 : 0.45;     // strong key by day
    ambient.intensity = day ? 0.34 + sp.intensity * 0.16 : 0.5; // floor so night ≠ black
    map.triggerRepaint();
  }
  applySun(null); // seed at the current solar time; setSun() re-aims on toggle

  const camera = new THREE.PerspectiveCamera();
  let group = new THREE.Group();
  scene.add(group);
  let renderer: THREE.WebGLRenderer | null = null;

  // GLB archetype models — loaded once, cloned per building. Async; re-runs
  // setBuildings(lastBuildings) when a model finishes so it appears.
  const gltfLoader = new GLTFLoader();
  const glbCache = new Map<string, THREE.Object3D>();
  const glbPending = new Set<string>();
  let lastBuildings: ArchetypeBuildingInput[] = [];
  function ensureGlb(url: string): void {
    if (glbCache.has(url) || glbPending.has(url)) return;
    glbPending.add(url);
    gltfLoader.load(
      url,
      (gltf) => { glbCache.set(url, gltf.scene); glbPending.delete(url); setBuildings(lastBuildings); map.triggerRepaint(); },
      undefined,
      (e) => { glbPending.delete(url); console.error("[ZAAHI archetypes] GLB load failed", url, e); },
    );
  }

  // ── geometry helpers (Z-up: x=east, y=north, z=height in metres) ──
  // Each building is anchored at its OWN MercatorCoordinate via a per-building
  // group matrix, and its geometry is built in metres relative to its own
  // footprint centroid. (A single global origin + linear mercator scale drifts
  // for plots far from it — that drift rendered the model off its plot.)
  function ringCentroidLngLat(ring: number[][]): [number, number] {
    const closed = ring.length > 1 &&
      ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1];
    const pts = closed ? ring.slice(0, -1) : ring;
    let sx = 0, sy = 0;
    for (const [lng, lat] of pts) { sx += lng; sy += lat; }
    return [sx / pts.length, sy / pts.length];
  }

  function prismGeom(ring: number[][], base: number, top: number): THREE.BufferGeometry {
    const shape = new THREE.Shape(ring.map(([x, y]) => new THREE.Vector2(x, y)));
    const g = new THREE.ExtrudeGeometry(shape, { depth: Math.max(0.1, top - base), bevelEnabled: false, steps: 1 });
    g.translate(0, 0, base);
    return g;
  }
  function gableGeom(s: Extract<Solid, { t: "gable" }>): THREE.BufferGeometry {
    const c = Math.cos(s.ang), si = Math.sin(s.ang), L = s.len / 2, Wd = s.wid / 2;
    const loc = (lu: number, lv: number, h: number) =>
      [s.cx + lu * c - lv * si, s.cy + lu * si + lv * c, h] as [number, number, number];
    const e0L = loc(-L, -Wd, s.eave), e0R = loc(-L, Wd, s.eave), r0 = loc(-L, 0, s.ridge);
    const e1L = loc(L, -Wd, s.eave), e1R = loc(L, Wd, s.eave), r1 = loc(L, 0, s.ridge);
    const v = [e0L, e0R, r0, e1L, e1R, r1];
    const pos: number[] = [];
    const tri = (a: number, b: number, cc: number) => pos.push(...v[a], ...v[b], ...v[cc]);
    tri(0, 3, 5); tri(0, 5, 2); tri(1, 2, 5); tri(1, 5, 4); tri(0, 2, 1); tri(3, 4, 5);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    return g;
  }
  function sawtoothGeom(s: Extract<Solid, { t: "sawtooth" }>): THREE.BufferGeometry {
    const c = Math.cos(s.ang), si = Math.sin(s.ang), L = s.len, Wd = s.wid / 2, du = L / s.teeth;
    const loc = (lu: number, lv: number, h: number) =>
      [s.cx + (lu - L / 2) * c - lv * si, s.cy + (lu - L / 2) * si + lv * c, h] as [number, number, number];
    const pos: number[] = [];
    const quad = (a: number[], b: number[], cc: number[], d: number[]) =>
      pos.push(...a, ...b, ...cc, ...a, ...cc, ...d);
    for (let i = 0; i < s.teeth; i++) {
      const u0 = i * du, u1 = (i + 1) * du;
      quad(loc(u0, -Wd, s.low), loc(u0, Wd, s.low), loc(u1, Wd, s.high), loc(u1, -Wd, s.high));
      quad(loc(u1, -Wd, s.high), loc(u1, Wd, s.high), loc(u1, Wd, s.low), loc(u1, -Wd, s.low));
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    return g;
  }

  // Lazy sky/ground PMREM environment for glass REFLECTIONS (founder 2026-06-15
  // experiment: turn the flat colour box into a reflective glass tower). Built
  // once from a canvas gradient (sky→horizon→desert); needs the renderer, so
  // built on first use (setBuildings runs after onAdd → renderer exists).
  let envTex: THREE.Texture | null = null;
  function getEnvTex(): THREE.Texture | null {
    if (envTex) return envTex;
    if (!renderer) return null;
    const cv = document.createElement("canvas"); cv.width = 16; cv.height = 256;
    const ctx = cv.getContext("2d");
    if (!ctx) return null;
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0.0, "#aecbf2");  // sky (top of reflection)
    g.addColorStop(0.48, "#eef4fc"); // bright horizon
    g.addColorStop(0.52, "#d8c9a8"); // desert/ground
    g.addColorStop(1.0, "#7d6e52");
    ctx.fillStyle = g; ctx.fillRect(0, 0, 16, 256);
    const eq = new THREE.CanvasTexture(cv);
    eq.mapping = THREE.EquirectangularReflectionMapping;
    eq.colorSpace = THREE.SRGBColorSpace;
    const pmrem = new THREE.PMREMGenerator(renderer);
    envTex = pmrem.fromEquirectangular(eq).texture;
    eq.dispose(); pmrem.dispose();
    return envTex;
  }

  function makeMaterial(colorHex: string, landUse?: string | null): THREE.MeshStandardMaterial {
    // SOLID listing model (founder 2026-06-14 — opacity 1, one layer, the
    // translucent ghost under it is extinguished separately). PBR Standard
    // (metalness 0, mid roughness) so the directional SUN sculpts the recessed
    // window geometry the way it does in the Blender render — replaces the old
    // Lambert+heavy-emissive that flat-lit everything. A tiny emissive floor
    // keeps the deepest recesses from going pure black (founder "never-black").
    const c = new THREE.Color(colorHex);
    // INDUSTRIAL #495057 is so dark it reads as a black void on the bright
    // satellite (founder 2026-06-15). Lift ONLY its RENDER lightness toward a
    // mid-grey. Legend/fill hex stays #495057 (data untouched) — render-only.
    if (landUse === "INDUSTRIAL" || landUse === "WAREHOUSE") {
      c.lerp(new THREE.Color(0xffffff), 0.42);
    }
    // ── Per-type PBR materials (founder 2026-06-15, glass experiment → all 10) ──
    // Two classes, both tinted to the legend colour (colour-code preserved) and
    // reflecting the sky PMREM env so the SUN plays on them — turns flat boxes
    // into volumes. opacity 1 (never see-through).
    //   GLASS  (towers/residential): low roughness + envMap → reflective glazed facade.
    //   CONCRETE (sheds/low/institutional): high roughness + light env → matte PBR depth.
    const isGlass = landUse === "HOTEL" || landUse === "HOSPITALITY" ||
      landUse === "COMMERCIAL" || landUse === "INVESTMENT" ||
      landUse === "MIXED_USE" || landUse === "RESIDENTIAL";
    const mat = new THREE.MeshStandardMaterial({
      color: c,
      metalness: isGlass ? 0.35 : 0.05,
      roughness: isGlass ? 0.09 : 0.70,
      envMap: getEnvTex(),
      envMapIntensity: isGlass ? 1.15 : 0.35,
      emissive: c.clone().multiplyScalar(0.05),
      transparent: false,
      opacity: 1,
      side: THREE.FrontSide,
      depthWrite: true,
    });
    mat.userData.originalColorHex = "#" + c.getHexString(); // render colour (lifted for industrial) so deselect restores it
    return mat;
  }

  function disposeGroup(): void {
    group.traverse((obj) => {
      const m = obj as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      const mat = (m as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
      if (mat) (Array.isArray(mat) ? mat : [mat]).forEach((x) => x.dispose());
    });
    scene.remove(group);
    group = new THREE.Group();
    scene.add(group);
  }

  function setBuildings(buildings: ArchetypeBuildingInput[]): void {
    try {
      disposeGroup();
      lastBuildings = buildings;
      const lineVariant = resolveLineVariant();
      let meshes = 0;
      for (const b of buildings) {
        if (!b.footprint || b.footprint.length < 3) continue;
        // Anchor at the FOOTPRINT centroid (founder 2026-06-16). The footprint is
        // the BUILDING-LIMIT (if DDA gives one) or the setback-inset plot. The
        // model is centred here so it sits exactly ON the building-limit (matches
        // the gold outline). Plot-centroid centring (the prior attempt) misplaced
        // 68/148 listings by up to 28 m because the building-limit is offset from
        // the plot centre — measured in verify-plots-real.json. OBB only drives
        // orientation + size; the building-limit centroid is the position.
        const [blng, blat] = ringCentroidLngLat(b.footprint);
        const cosLat = Math.cos((blat * Math.PI) / 180);
        const local = (ring: number[][]) =>
          ring.map(([lng, lat]) => [(lng - blng) * M_PER_DEG_LAT * cosLat, (lat - blat) * M_PER_DEG_LAT]);
        const footLocal = local(b.footprint);
        const obb = obbOf(footLocal);
        // FUTURE_DEVELOPMENT has no building (the model is a cleared PAD + low
        // hoarding FENCE marker, founder 2026-06-15 — no crane), so its height is
        // a fixed low fence height, not GFA/data. All other types take their
        // height strictly from the data (founder spec).
        const H = b.landUse === "FUTURE_DEVELOPMENT" ? 3.5 : Math.max(3, b.totalH);

        // ── GLB archetype path (Meshy→Blender model, instanced+scaled) ──
        const glbUrl = b.landUse ? ARCHETYPE_GLB[b.landUse] : undefined;
        if (glbUrl) {
          const proto = glbCache.get(glbUrl);
          if (!proto) { ensureGlb(glbUrl); continue; } // appears once loaded
          const merc2 = MercatorCoordinate.fromLngLat([blng, blat], 0);
          const s2 = merc2.meterInMercatorCoordinateUnits();
          const bGroup2 = new THREE.Group();
          bGroup2.matrixAutoUpdate = false;
          bGroup2.matrix = new THREE.Matrix4().makeTranslation(merc2.x, merc2.y, merc2.z)
            .multiply(new THREE.Matrix4().makeScale(s2, -s2, s2));
          bGroup2.matrixWorldNeedsUpdate = true;
          const clone = proto.clone(true);
          const glbMat = makeMaterial(b.colorHex, b.landUse);
          // Edge lines (style G): the map material is flat-lit + emissive (the
          // ratified "never-black" solid look), which kills the self-shadowing
          // that makes recessed windows read. Outline the GLB's hard edges —
          // window openings, floor lines, volume corners — in the lighter legend
          // tone so the window GRID reads on the map exactly like the procedural
          // types do. Without this a GLB collapses to a flat block from above.
          const glbBodyCol = new THREE.Color(b.colorHex);
          const glbEdgeCol = lineVariant.edge === "gold"
            ? GOLD_LINE.clone() : glbBodyCol.clone().multiplyScalar(lineVariant.edge);
          const glbEdgeMat = new THREE.LineBasicMaterial({ color: glbEdgeCol });
          clone.traverse((o) => {
            const mm = o as THREE.Mesh;
            if (mm.isMesh && mm.geometry) {
              mm.material = glbMat; mm.frustumCulled = false; mm.userData.parcelId = b.parcelId;
              const eg = new THREE.LineSegments(new THREE.EdgesGeometry(mm.geometry, 30), glbEdgeMat);
              eg.frustumCulled = false; eg.userData.parcelId = b.parcelId; eg.userData.isEdge = true;
              mm.add(eg);
            }
          });
          // Unit GLB (X,Y∈[-0.5,0.5] footprint, Z∈[0,1] height after Blender
          // Z-up export → glTF Y-up) → fit the footprint OBB + data height:
          // T(obb centre) · Rz(obb angle) · S(2hl, 2hw, H) · Rx(90° Y-up→Z-up).
          // AGRICULTURAL / FUTURE_DEVELOPMENT are small markers (barn, site) — a
          // farm/site does NOT fill a giant plot. Cap their footprint scale so
          // they stay a sensible size centred in the plot, land around them
          // (founder 2026-06-15 huge-plot fix). Other types fill the footprint.
          const capXY = (b.landUse === "AGRICULTURAL" || b.landUse === "FUTURE_DEVELOPMENT") ? 55 : Infinity;
          const sx = Math.min(2 * obb.hl, capXY);
          const sy = Math.min(2 * obb.hw, capXY);
          // Centre the model at the FOOTPRINT centroid (local origin) — NOT the
          // OBB centre, NOT the plot centroid — so it sits exactly on the
          // BUILDING-LIMIT and matches the gold outline (founder 2026-06-16).
          // Footprint OBB only drives orientation (Rz) + footprint size (S).
          clone.matrixAutoUpdate = false;
          clone.matrix.identity()
            .multiply(new THREE.Matrix4().makeRotationZ(obb.ang))
            .multiply(new THREE.Matrix4().makeScale(sx, sy, H))
            .multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2));
          clone.matrixWorldNeedsUpdate = true;
          bGroup2.add(clone);
          group.add(bGroup2);
          meshes++;
          continue;
        }

        const built = buildArchetype(b.landUse ?? "", footLocal, obb, H);
        const { solids } = built;
        // Hard plot-boundary clamp: the inset footprint can poke a metre or two
        // outside the plot on concave plots. Clamp every prism ring to the PLOT
        // polygon so the massing never crosses the boundary the user sees.
        const plotLocal = b.plot && b.plot.length >= 3 ? local(b.plot) : null;
        if (plotLocal) {
          for (const s of solids) if (s.t === "prism") s.ring = clampToFootprint(s.ring, plotLocal);
        }

        // Per-building group anchored at the building's Mercator coordinate.
        const merc = MercatorCoordinate.fromLngLat([blng, blat], 0);
        const s = merc.meterInMercatorCoordinateUnits();
        const bGroup = new THREE.Group();
        bGroup.matrixAutoUpdate = false;
        bGroup.matrix = new THREE.Matrix4()
          .makeTranslation(merc.x, merc.y, merc.z)
          .multiply(new THREE.Matrix4().makeScale(s, -s, s));
        bGroup.matrixWorldNeedsUpdate = true;

        const mat = makeMaterial(b.colorHex, b.landUse);
        // Line texture per the active variant (default = delicate tonal). Colour
        // derived from the body legend hex (or brand gold), never white.
        const bodyCol = new THREE.Color(b.colorHex);
        const lineColOf = (m: number | "gold"): THREE.Color =>
          m === "gold" ? GOLD_LINE.clone() : bodyCol.clone().multiplyScalar(m);
        const edgeMat = new THREE.LineBasicMaterial({ color: lineColOf(lineVariant.edge) });
        let tallRing: number[][] | null = null;
        let tallBase = 0, tallTop = 0;
        for (const sol of solids) {
          let geo: THREE.BufferGeometry;
          if (sol.t === "prism") {
            geo = prismGeom(sol.ring, sol.base, sol.top);
            if (sol.top - sol.base > tallTop - tallBase) { tallRing = sol.ring; tallBase = sol.base; tallTop = sol.top; }
          } else if (sol.t === "gable") geo = gableGeom(sol);
          else geo = sawtoothGeom(sol);
          const mesh = new THREE.Mesh(geo, mat);
          mesh.frustumCulled = false;
          mesh.userData.parcelId = b.parcelId;
          mesh.userData.isVault = b.isVault;
          mesh.userData.status = b.status;
          bGroup.add(mesh);
          const eg = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 25), edgeMat);
          eg.frustumCulled = false;
          eg.userData.parcelId = b.parcelId;
          eg.userData.isEdge = true;
          bGroup.add(eg);
          meshes++;
        }
        // HOTEL window grid (🏨, founder 2026-06-15): a REGULAR grid of rows
        // (every floor) × columns (~every 4.5 m) in the light legend colour —
        // the "many identical rooms" signature. Independent of the line variant.
        if (built.windowGrid && tallRing && tallTop - tallBase >= FLOOR_H) {
          const gridMat = new THREE.LineBasicMaterial({ color: lineColOf(1.4) });
          const r = tallRing;
          for (let h = tallBase + FLOOR_H; h < tallTop - 0.5; h += FLOOR_H) {
            const row = new THREE.LineLoop(
              new THREE.BufferGeometry().setFromPoints(r.map(([x, y]) => new THREE.Vector3(x, y, h))),
              gridMat,
            );
            row.frustumCulled = false; row.userData.parcelId = b.parcelId; row.userData.isEdge = true;
            bGroup.add(row);
          }
          const cpos: number[] = [];
          for (let i = 0; i < r.length - 1; i++) {
            const [ax, ay] = r[i]; const [bx, by] = r[i + 1];
            const segLen = Math.hypot(bx - ax, by - ay);
            const steps = Math.max(1, Math.round(segLen / 4.5));
            for (let k = 0; k < steps; k++) {
              const t = k / steps;
              cpos.push(ax + (bx - ax) * t, ay + (by - ay) * t, tallBase, ax + (bx - ax) * t, ay + (by - ay) * t, tallTop);
            }
          }
          const cols = new THREE.LineSegments(
            new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(cpos, 3)),
            gridMat,
          );
          cols.frustumCulled = false; cols.userData.parcelId = b.parcelId; cols.userData.isEdge = true;
          bGroup.add(cols);
        }
        // Floor bands — light horizontal rhythm on the main body. SPARSE for
        // mixed-use (built.ribs) so the dense lattice doesn't read as a
        // transparent cage over the solid body; residential keeps per-floor.
        if (!built.windowGrid && lineVariant.band !== null && tallRing && tallTop - tallBase >= FLOOR_H * 1.5) {
          const bandMat = new THREE.LineBasicMaterial({ color: lineColOf(lineVariant.band) });
          const span = tallTop - tallBase;
          const bandStep = built.ribs ? Math.max(FLOOR_H, span / 8) : FLOOR_H; // ≤~8 bands for mixed-use
          for (let h = tallBase + bandStep; h < tallTop - 0.5; h += bandStep) {
            const band = new THREE.LineLoop(
              new THREE.BufferGeometry().setFromPoints((tallRing as number[][]).map(([x, y]) => new THREE.Vector3(x, y, h))),
              bandMat,
            );
            band.frustumCulled = false;
            band.userData.parcelId = b.parcelId;
            band.userData.isEdge = true;
            bGroup.add(band);
          }
        }
        // Vertical rib pilasters on the body (mixed-use facade rhythm, founder
        // 2026-06-14). SPARSE — ~every 14 m along the perimeter — so the solid
        // purple body dominates and reads opaque. Line overlay; geometry intact.
        if (!built.windowGrid && lineVariant.rib !== null && built.ribs && tallRing && tallTop - tallBase >= FLOOR_H) {
          const ribMat = new THREE.LineBasicMaterial({ color: lineColOf(lineVariant.rib) });
          const pos: number[] = [];
          const r = tallRing;
          for (let i = 0; i < r.length - 1; i++) {
            const [ax, ay] = r[i];
            const [bx, by] = r[i + 1];
            const segLen = Math.hypot(bx - ax, by - ay);
            const steps = Math.max(1, Math.round(segLen / lineVariant.ribSpacing));
            for (let k = 0; k < steps; k++) {
              const t = k / steps;
              const x = ax + (bx - ax) * t;
              const y = ay + (by - ay) * t;
              pos.push(x, y, tallBase, x, y, tallTop);
            }
          }
          const rib = new THREE.LineSegments(
            new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)),
            ribMat,
          );
          rib.frustumCulled = false;
          rib.userData.parcelId = b.parcelId;
          rib.userData.isEdge = true;
          bGroup.add(rib);
        }
        group.add(bGroup);
      }
      console.log("[ZAAHI archetypes] setBuildings:", buildings.length, "buildings,", meshes, "solids");
      map.triggerRepaint();
    } catch (err) {
      console.error("[ZAAHI archetypes] setBuildings FAILED:", err);
      throw err;
    }
  }

  function setSelected(parcelId: string | null): void {
    group.traverse((obj) => {
      const m = obj as THREE.Mesh;
      const mat = (m as THREE.Mesh).material as THREE.MeshLambertMaterial | undefined;
      if (!mat || !mat.isMaterial || m.userData.isEdge) return;
      const own = m.userData.parcelId as string | undefined;
      const orig = mat.userData.originalColorHex as string | undefined;
      if (parcelId === null || own === parcelId) {
        if (orig) { mat.color.set(orig); mat.emissive.set(orig).multiplyScalar(0.45); }
      } else {
        mat.color.copy(GREY);
        mat.emissive.copy(GREY).multiplyScalar(0.3);
      }
    });
    map.triggerRepaint();
  }

  function setVisibility(predicate: (parcelId: string) => boolean): void {
    group.traverse((obj) => {
      const pid = obj.userData?.parcelId as string | undefined;
      if (pid !== undefined) obj.visible = predicate(pid);
    });
    map.triggerRepaint();
  }

  function setEnabled(enabled: boolean): void {
    group.visible = enabled;
    map.triggerRepaint();
  }

  const customLayer: maplibregl.CustomLayerInterface = {
    id: LAYER_ID,
    type: "custom",
    renderingMode: "3d",
    onAdd(_m, gl) {
      try {
        renderer = new THREE.WebGLRenderer({
          canvas: map.getCanvas(), context: gl as WebGLRenderingContext, antialias: true,
        });
        renderer.autoClear = false;
        // sRGB output (default) so lit Lambert colours render at correct
        // brightness. LinearSRGB (used by the shader layer) rendered the
        // canonical hues near-black — that was the founder's "почти ЧЁРНЫМИ" bug.
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        // Hue-preserving tone mapping (Khronos PBR Neutral) so the strong sun
        // can carve shadows without clipping lit faces to white, while the
        // canonical land-use hues stay accurate (ACES would desaturate them).
        renderer.toneMapping = THREE.NeutralToneMapping;
        renderer.toneMappingExposure = 1.0;
      } catch (err) {
        console.error("[ZAAHI archetypes] onAdd FAILED:", err);
        throw err;
      }
    },
    render(gl, args: unknown) {
      if (!renderer) return;
      // MapLibre v5 matrix unwrap (§10 root-cause fix — do not simplify).
      let flat: ArrayLike<number> | null = null;
      if (args && (Array.isArray(args) || args instanceof Float32Array || args instanceof Float64Array)) {
        flat = args as ArrayLike<number>;
      } else if (args && typeof args === "object") {
        const obj = args as Record<string, unknown>;
        const cand =
          (obj.defaultProjectionData as Record<string, unknown> | undefined)?.mainMatrix ??
          obj.modelViewProjectionMatrix ?? obj.mainMatrix ?? obj.projectionMatrix ?? obj.matrix ?? null;
        if (cand) {
          if (Array.isArray(cand) || cand instanceof Float32Array || cand instanceof Float64Array) {
            flat = cand as ArrayLike<number>;
          } else if (typeof cand === "object") {
            const arr = new Array<number>(16);
            const indexed = cand as Record<string, number>;
            for (let i = 0; i < 16; i++) arr[i] = indexed[i];
            flat = arr;
          }
        }
      }
      if (!flat) return;

      // CustomLayer contract: bind the default framebuffer before drawing —
      // canonical fix from BuildingGlbLayer (fill-extrusion leaves an FBO
      // bound; without this Three draws into an unsized FBO → blank).
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);

      // Each building group carries its own Mercator anchor matrix, so the
      // camera projection is just MapLibre's matrix (mercator → clip).
      camera.projectionMatrix = new THREE.Matrix4().fromArray(flat);

      renderer.resetState();
      renderer.render(scene, camera);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      map.triggerRepaint();
    },
    onRemove() {
      disposeGroup();
      renderer?.dispose();
      renderer = null;
    },
  };

  map.addLayer(customLayer);

  const canvas = map.getCanvas();
  const onLost = (ev: Event) => { ev.preventDefault(); };
  const onRestored = () => {
    try {
      if (map.getLayer(LAYER_ID)) { try { map.removeLayer(LAYER_ID); } catch { /* ignore */ } }
      renderer?.dispose(); renderer = null; disposeGroup(); map.addLayer(customLayer);
    } catch (err) { console.error("[ZAAHI archetypes] reinstall FAILED:", err); }
  };
  canvas.addEventListener("webglcontextlost", onLost, false);
  canvas.addEventListener("webglcontextrestored", onRestored, false);

  return {
    setBuildings, setSelected, setVisibility, setEnabled, layerId: LAYER_ID,
    setSun(date: Date | null): void { applySun(date); },
    destroy(): void {
      try {
        canvas.removeEventListener("webglcontextlost", onLost);
        canvas.removeEventListener("webglcontextrestored", onRestored);
      } catch { /* gone */ }
      if (map.getLayer(LAYER_ID)) { try { map.removeLayer(LAYER_ID); } catch { /* race */ } }
    },
  };
}
