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

  const merc = maplibregl.MercatorCoordinate.fromLngLat(
    [centroidLng, centroidLat],
    0,
  );
  const mercScale = merc.meterInMercatorCoordinateUnits();

  const camera = new THREE.Camera();
  const scene = new THREE.Scene();
  let renderer: THREE.WebGLRenderer | null = null;
  let mapRef: MLMap | null = null;

  return {
    id: buildingLayerId(buildingId),
    type: "custom",
    renderingMode: "3d",

    onAdd(map: MLMap, gl: WebGLRenderingContext | WebGL2RenderingContext): void {
      mapRef = map;

      scene.add(new THREE.AmbientLight(0xffffff, 0.65));

      const key = new THREE.DirectionalLight(0xffffff, 1.0);
      key.position.set(80, 120, 60);
      scene.add(key);

      const fill = new THREE.DirectionalLight(0xc8d8e8, 0.35);
      fill.position.set(-60, 40, -40);
      scene.add(fill);

      // Wrapper group sits at world (0,0,0); we populate it with the
      // loaded gltf scene and apply rotation + scale. Centring onto the
      // model's own bbox bottom-centre is deferred to load time because
      // we need the bbox.
      const wrapper = new THREE.Group();
      scene.add(wrapper);

      new GLTFLoader().load(
        modelUrl,
        (gltf) => {
          const root = gltf.scene;

          // Compute model bounding box in raw model units so we can
          // translate so that the footprint centre sits at (0,0,0) and
          // the bottom of the model rests on Y=0 (map ground plane).
          const bbox = new THREE.Box3().setFromObject(root);
          const centreX = (bbox.min.x + bbox.max.x) / 2;
          const centreZ = (bbox.min.z + bbox.max.z) / 2;
          const minY = bbox.min.y;

          root.position.set(-centreX, -minY, -centreZ);

          const scaled = new THREE.Group();
          scaled.scale.setScalar(scaleFactor);
          scaled.add(root);

          // Rotation: rotationDeg is "yaw around vertical (map up)"
          // in degrees, following glTF/artist convention (+X east,
          // +Z south). We apply the rotation on the scaled group so
          // the model pivots around its footprint centre.
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
        undefined,
        (err) => {
          console.error(
            `[buildings] glTF load failed for ${buildingId} (${modelUrl})`,
            err,
          );
          onError?.(err);
        },
      );

      renderer = new THREE.WebGLRenderer({
        canvas: map.getCanvas(),
        context: gl as WebGLRenderingContext,
        antialias: true,
      });
      renderer.autoClear = false;
    },

    render(
      _gl: WebGLRenderingContext | WebGL2RenderingContext,
      options: CustomRenderMethodInput,
    ): void {
      if (!renderer || !mapRef) return;

      const matrix = options.modelViewProjectionMatrix;

      // Three.js Y-up → MapLibre Z-up: rotate 90° around +X.
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
      scene.clear();
      renderer?.dispose();
      renderer = null;
      mapRef = null;
    },
  };
}
