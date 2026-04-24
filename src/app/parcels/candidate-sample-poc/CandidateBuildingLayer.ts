// MapLibre CustomLayer that renders the candidate's glTF building into the
// map's WebGL context. Pattern mirrors al-fahidi-fort-poc/FortLayer.ts · the
// only difference is we load geometry from /models/candidate-sample.glb
// asynchronously via GLTFLoader instead of building procedurally.
//
// Why share MapLibre's gl context (instead of a separate <Canvas>):
//   · Single draw call frame · no z-fighting with map tiles
//   · MapLibre navigation (drag · wheel · right-click rotate + pitch) already
//     gives us orbit-like evaluation controls · no need for OrbitControls
//   · Same pattern as the existing Al Fahidi POC · consistent review UX
//
// Frustum culling: Three.js's camera.matrix stays at identity while we
// overwrite camera.projectionMatrix with MapLibre's MVP · Three's internal
// frustum would reject every mesh as out-of-view · so we mesh.frustumCulled
// = false on every mesh after load · without this the building renders
// zero pixels despite correct transforms. Same workaround as FortLayer.
//
// Coordinate mapping:
//   · Building anchor = SAMPLE_LOCATION.lng/lat at altitude 0
//   · Three.js local units = metres (model source was cm · pre-scaled 0.01)
//   · MapLibre Y axis points south · we flip Y sign in the scale matrix
//   · rotationX flips Three.js Y-up into MapLibre Z-up (vertical)

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type {
  CustomLayerInterface,
  CustomRenderMethodInput,
  Map as MLMap,
} from "maplibre-gl";
import maplibregl from "maplibre-gl";
import { SAMPLE_LOCATION, MODEL_TRANSFORM, GLB_URL } from "./constants";

export const CANDIDATE_BUILDING_LAYER_ID = "candidate-sample-3d";

export function createCandidateBuildingLayer(
  onLoaded?: () => void,
  onError?: (err: unknown) => void,
): CustomLayerInterface {
  const merc = maplibregl.MercatorCoordinate.fromLngLat(
    [SAMPLE_LOCATION.lng, SAMPLE_LOCATION.lat],
    0,
  );
  const scale = merc.meterInMercatorCoordinateUnits();

  const camera = new THREE.Camera();
  const scene = new THREE.Scene();
  let renderer: THREE.WebGLRenderer | null = null;
  let mapRef: MLMap | null = null;
  let modelRoot: THREE.Object3D | null = null;

  return {
    id: CANDIDATE_BUILDING_LAYER_ID,
    type: "custom",
    renderingMode: "3d",

    onAdd(map: MLMap, gl: WebGLRenderingContext | WebGL2RenderingContext): void {
      mapRef = map;

      // Lighting: neutral studio setup so the candidate's material choices
      // read honestly · ambient + key + fill · no warm tint that would hide
      // drab colours.
      scene.add(new THREE.AmbientLight(0xffffff, 0.65));

      const key = new THREE.DirectionalLight(0xffffff, 1.0);
      key.position.set(80, 120, 60);
      scene.add(key);

      const fill = new THREE.DirectionalLight(0xc8d8e8, 0.35);
      fill.position.set(-60, 40, -40);
      scene.add(fill);

      // Wrap the loaded model so we can apply centring + cm→m scale in one
      // transform chain. Order matters: translate first (raw-unit centroid
      // back to origin) · then scale · then the wrapper sits at world (0,0,0).
      const wrapper = new THREE.Group();
      wrapper.position.set(0, 0, 0);
      scene.add(wrapper);
      modelRoot = wrapper;

      const loader = new GLTFLoader();
      loader.load(
        GLB_URL,
        (gltf) => {
          const root = gltf.scene;
          // Re-centre raw-unit bounds so the building base-centre lands at
          // the anchor · see constants.MODEL_TRANSFORM for derivation.
          root.position.set(
            -MODEL_TRANSFORM.translate.x,
            -MODEL_TRANSFORM.translate.y,
            -MODEL_TRANSFORM.translate.z,
          );
          const scaled = new THREE.Group();
          scaled.scale.setScalar(MODEL_TRANSFORM.scale);
          scaled.add(root);
          wrapper.add(scaled);

          // See file header · frustum workaround.
          wrapper.traverse((obj) => {
            const m = obj as THREE.Mesh;
            if (m.isMesh) m.frustumCulled = false;
          });

          mapRef?.triggerRepaint();
          onLoaded?.();
        },
        undefined,
        (err) => {
          console.error("[candidate-sample-poc] glTF load failed", err);
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

      const rotationX = new THREE.Matrix4().makeRotationAxis(
        new THREE.Vector3(1, 0, 0),
        Math.PI / 2,
      );

      const m = new THREE.Matrix4().fromArray(matrix);
      const l = new THREE.Matrix4()
        .makeTranslation(merc.x, merc.y, merc.z ?? 0)
        .scale(new THREE.Vector3(scale, -scale, scale))
        .multiply(rotationX);

      camera.projectionMatrix = m.multiply(l);
      renderer.resetState();
      renderer.render(scene, camera);
      mapRef.triggerRepaint();
    },

    onRemove(): void {
      if (modelRoot) {
        scene.remove(modelRoot);
      }
      scene.clear();
      renderer?.dispose();
      renderer = null;
      mapRef = null;
      modelRoot = null;
    },
  };
}
