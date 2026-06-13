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
import { buildArchetype, obbOf, clampToFootprint, FLOOR_H, type Solid } from "./geometry";

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
  destroy(): void;
  readonly layerId: string;
}

const GREY = new THREE.Color(0x7a7a7a);

export function installArchetypeLayer(map: maplibregl.Map): ArchetypeLayerController {
  const scene = new THREE.Scene();
  scene.up = new THREE.Vector3(0, 0, 1);
  // Bright, even lighting so the canonical land-use colour reads on every face
  // (the near-black bug was outputColorSpace + double-side alpha, fixed below;
  // generous ambient + emissive keep shadowed faces in-hue too).
  scene.add(new THREE.HemisphereLight(0xffffff, 0x35506b, 1.15));
  scene.add(new THREE.AmbientLight(0xffffff, 0.75));
  const key = new THREE.DirectionalLight(0xffffff, 0.6);
  key.position.set(0.5, -0.6, 1.2);
  scene.add(key);

  const camera = new THREE.PerspectiveCamera();
  let group = new THREE.Group();
  scene.add(group);
  let renderer: THREE.WebGLRenderer | null = null;

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

  function makeMaterial(colorHex: string): THREE.MeshLambertMaterial {
    // Lambert (not PBR) so the flat canonical hue reads predictably; emissive
    // lifts shadowed faces so they stay in-hue (never black). FrontSide avoids
    // the back-face-through-front-face alpha doubling that darkened solids.
    const c = new THREE.Color(colorHex);
    const mat = new THREE.MeshLambertMaterial({
      color: c,
      emissive: c.clone().multiplyScalar(0.45),
      transparent: true,
      opacity: 0.8,
      side: THREE.FrontSide,
      depthWrite: false,
    });
    mat.userData.originalColorHex = colorHex;
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
      let meshes = 0;
      for (const b of buildings) {
        if (!b.footprint || b.footprint.length < 3) continue;
        // Anchor at THIS building's footprint centroid + its own Mercator coord.
        const [blng, blat] = ringCentroidLngLat(b.footprint);
        const cosLat = Math.cos((blat * Math.PI) / 180);
        const local = (ring: number[][]) =>
          ring.map(([lng, lat]) => [(lng - blng) * M_PER_DEG_LAT * cosLat, (lat - blat) * M_PER_DEG_LAT]);
        const footLocal = local(b.footprint);
        const obb = obbOf(footLocal);
        const { solids } = buildArchetype(b.landUse ?? "", footLocal, obb, Math.max(3, b.totalH));
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

        const mat = makeMaterial(b.colorHex);
        const edgeMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 });
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
        // Floor bands — light horizontal ribs every floor on the main body.
        if (tallRing && tallTop - tallBase >= FLOOR_H * 1.5) {
          const bandMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 });
          const nFloors = Math.min(60, Math.floor((tallTop - tallBase) / FLOOR_H));
          for (let i = 1; i < nFloors; i++) {
            const h = tallBase + i * FLOOR_H;
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
    destroy(): void {
      try {
        canvas.removeEventListener("webglcontextlost", onLost);
        canvas.removeEventListener("webglcontextrestored", onRestored);
      } catch { /* gone */ }
      if (map.getLayer(LAYER_ID)) { try { map.removeLayer(LAYER_ID); } catch { /* race */ } }
    },
  };
}
