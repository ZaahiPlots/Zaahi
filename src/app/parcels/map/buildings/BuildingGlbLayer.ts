// One MapLibre CustomLayer per Building row — anchors the artist-supplied
// glTF at its real WGS84 centroid, scales cm→m (or whatever scaleFactor
// dictates), and rotates around the vertical axis by rotationDeg. Pattern
// is identical to the Al Fahidi / candidate-sample-poc POC layer — same
// Y-up-to-Z-up rotation, same frustum-cull workaround (Three.js rejects
// every mesh because we overwrite projectionMatrix while camera.matrix
// stays identity). One WebGLRenderer per layer is fine at the current
// 1–10 building scale; if the list grows to 100+ we can refactor to a
// single shared CustomLayer with many root groups.
//
// Only used when the Building row has modelPath != null. Buildings
// without a GLB fall back to the pin-only symbol rendering and can
// later be swapped in by dropping a .glb into /public/models/ and
// updating the DB row.
//
// 2026-04-24 rev: [BUILDINGS] console.logs at every lifecycle step —
// onAdd, first render, GLB load start, progress, success (with vertex
// count), error. No behavioural change from the previous revision.

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type {
  CustomLayerInterface,
  CustomRenderMethodInput,
  Map as MLMap,
} from "maplibre-gl";
import maplibregl from "maplibre-gl";

export interface BuildingGlbLayerParams {
  buildingId: string;
  modelUrl: string;
  centroidLng: number;
  centroidLat: number;
  scaleFactor: number;
  rotationDeg: number;
  onLoaded?: () => void;
  onError?: (err: unknown) => void;
}

export function buildingLayerId(buildingId: string): string {
  return `zaahi-building-3d-${buildingId}`;
}

export function createBuildingGlbLayer(
  params: BuildingGlbLayerParams,
): CustomLayerInterface {
  const {
    buildingId,
    modelUrl,
    centroidLng,
    centroidLat,
    scaleFactor,
    rotationDeg,
    onLoaded,
    onError,
  } = params;
  const tag = `[BUILDINGS:${buildingId}]`;

  const merc = maplibregl.MercatorCoordinate.fromLngLat(
    [centroidLng, centroidLat],
    0,
  );
  const mercScale = merc.meterInMercatorCoordinateUnits();

  const camera = new THREE.Camera();
  const scene = new THREE.Scene();
  let renderer: THREE.WebGLRenderer | null = null;
  let mapRef: MLMap | null = null;
  let firstRenderLogged = false;
  let gltfLoaded = false;

  return {
    id: buildingLayerId(buildingId),
    type: "custom",
    renderingMode: "3d",

    onAdd(map: MLMap, gl: WebGLRenderingContext | WebGL2RenderingContext): void {
      console.log(tag, "onAdd — creating scene, renderer, GLTFLoader");
      mapRef = map;

      scene.add(new THREE.AmbientLight(0xffffff, 0.65));

      const key = new THREE.DirectionalLight(0xffffff, 1.0);
      key.position.set(80, 120, 60);
      scene.add(key);

      const fill = new THREE.DirectionalLight(0xc8d8e8, 0.35);
      fill.position.set(-60, 40, -40);
      scene.add(fill);

      const wrapper = new THREE.Group();
      scene.add(wrapper);

      console.log(tag, "GLTFLoader.load →", modelUrl);
      const t0 = performance.now();

      new GLTFLoader().load(
        modelUrl,
        (gltf) => {
          gltfLoaded = true;
          const root = gltf.scene;

          let vertexCount = 0;
          let meshCount = 0;
          root.traverse((obj) => {
            const m = obj as THREE.Mesh;
            if (m.isMesh && m.geometry) {
              meshCount++;
              const pos = m.geometry.getAttribute("position");
              if (pos) vertexCount += pos.count;
            }
          });

          const bbox = new THREE.Box3().setFromObject(root);
          const centreX = (bbox.min.x + bbox.max.x) / 2;
          const centreZ = (bbox.min.z + bbox.max.z) / 2;
          const minY = bbox.min.y;
          const sizeX = bbox.max.x - bbox.min.x;
          const sizeY = bbox.max.y - bbox.min.y;
          const sizeZ = bbox.max.z - bbox.min.z;

          console.log(
            tag,
            "GLB loaded in",
            Math.round(performance.now() - t0),
            "ms · meshes:",
            meshCount,
            "vertices:",
            vertexCount,
            "bbox size (raw units):",
            [sizeX.toFixed(1), sizeY.toFixed(1), sizeZ.toFixed(1)],
            "→ after scaleFactor",
            scaleFactor,
            "metres:",
            [
              (sizeX * scaleFactor).toFixed(2),
              (sizeY * scaleFactor).toFixed(2),
              (sizeZ * scaleFactor).toFixed(2),
            ],
          );

          root.position.set(-centreX, -minY, -centreZ);

          const scaled = new THREE.Group();
          scaled.scale.setScalar(scaleFactor);
          scaled.add(root);

          if (rotationDeg !== 0) {
            scaled.rotateY((rotationDeg * Math.PI) / 180);
          }

          wrapper.add(scaled);

          wrapper.traverse((obj) => {
            const m = obj as THREE.Mesh;
            if (m.isMesh) m.frustumCulled = false;
          });

          mapRef?.triggerRepaint();
          onLoaded?.();
        },
        (progress) => {
          // GLB lengths vary and the fetch may not report total; log at
          // milestones to avoid spamming.
          if (progress.lengthComputable) {
            const pct = Math.floor((progress.loaded / progress.total) * 100);
            if (pct === 25 || pct === 50 || pct === 75 || pct === 100) {
              console.log(tag, "GLB download", pct, "%");
            }
          }
        },
        (err) => {
          console.error(tag, "GLTF load FAILED for", modelUrl, err);
          onError?.(err);
        },
      );

      renderer = new THREE.WebGLRenderer({
        canvas: map.getCanvas(),
        context: gl as WebGLRenderingContext,
        antialias: true,
      });
      renderer.autoClear = false;
      console.log(tag, "WebGLRenderer ready (sharing MapLibre GL context)");
    },

    render(
      _gl: WebGLRenderingContext | WebGL2RenderingContext,
      options: CustomRenderMethodInput,
    ): void {
      if (!renderer || !mapRef) return;

      if (!firstRenderLogged) {
        firstRenderLogged = true;
        console.log(
          tag,
          "first render tick — gltfLoaded:",
          gltfLoaded,
          "(will keep ticking every frame)",
        );
      }

      const matrix = options.modelViewProjectionMatrix;

      const rotationX = new THREE.Matrix4().makeRotationAxis(
        new THREE.Vector3(1, 0, 0),
        Math.PI / 2,
      );

      const m = new THREE.Matrix4().fromArray(matrix);
      const l = new THREE.Matrix4()
        .makeTranslation(merc.x, merc.y, merc.z ?? 0)
        .scale(new THREE.Vector3(mercScale, -mercScale, mercScale))
        .multiply(rotationX);

      camera.projectionMatrix = m.multiply(l);
      renderer.resetState();
      renderer.render(scene, camera);
      mapRef.triggerRepaint();
    },

    onRemove(): void {
      console.log(tag, "onRemove — disposing");
      scene.clear();
      renderer?.dispose();
      renderer = null;
      mapRef = null;
    },
  };
}
