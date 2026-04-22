// MapLibre CustomLayer wrapping Three.js rendering of Al Fahidi Fort.
//
// Integration pattern follows MapLibre GL JS CustomLayerInterface docs +
// the Three.js recipe for map-registered 3D models. The Three.js renderer
// shares MapLibre's WebGL context · we write into the same draw call
// frame so the building occludes/participates correctly with map tiles.
//
// Coordinate mapping:
//   - Fort centroid sits at FORT_LOCATION.lng/lat at altitude 0.
//   - Local Three.js units are metres · Y axis is UP.
//   - MercatorCoordinate translates metres → Mercator map units with the
//     latitude-dependent scale factor.
//   - We flip the Y sign in the scale matrix because MapLibre's Y axis
//     points south · Three.js Y axis points up.

import * as THREE from "three";
import type {
  CustomLayerInterface,
  CustomRenderMethodInput,
  Map as MLMap,
} from "maplibre-gl";
import maplibregl from "maplibre-gl";
import { buildFortGeometry } from "./FortGeometry";
import { FORT_LOCATION } from "./constants";

export function createFortLayer(): CustomLayerInterface {
  const merc = maplibregl.MercatorCoordinate.fromLngLat(
    [FORT_LOCATION.lng, FORT_LOCATION.lat],
    0
  );
  const scale = merc.meterInMercatorCoordinateUnits();

  const camera = new THREE.Camera();
  const scene = new THREE.Scene();
  let renderer: THREE.WebGLRenderer | null = null;
  let mapRef: MLMap | null = null;

  return {
    id: "al-fahidi-fort-3d",
    type: "custom",
    renderingMode: "3d",

    onAdd(map: MLMap, gl: WebGLRenderingContext | WebGL2RenderingContext): void {
      mapRef = map;

      // Lighting: midday Dubai sun with warm sand fill.
      scene.add(new THREE.AmbientLight(0xffffff, 0.6));

      const sun = new THREE.DirectionalLight(0xfff4e0, 1.1);
      sun.position.set(50, 100, 30);
      scene.add(sun);

      const fill = new THREE.DirectionalLight(0xc8d8e8, 0.4);
      fill.position.set(-50, 50, -30);
      scene.add(fill);

      // Build fort and DISABLE frustum culling on every mesh. We bypass
      // Three.js frustum testing because our `camera.projectionMatrix` is
      // overridden with MapLibre's MVP matrix each frame while camera.matrix
      // stays at identity · the internal frustum Three.js computes would
      // reject every mesh as out-of-view. Without this, the fort renders
      // zero pixels despite correct transforms.
      const fort = buildFortGeometry();
      fort.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.isMesh) mesh.frustumCulled = false;
      });
      scene.add(fort);

      renderer = new THREE.WebGLRenderer({
        canvas: map.getCanvas(),
        context: gl as WebGLRenderingContext,
        antialias: true,
      });
      renderer.autoClear = false;
    },

    render(
      _gl: WebGLRenderingContext | WebGL2RenderingContext,
      options: CustomRenderMethodInput
    ): void {
      if (!renderer || !mapRef) return;

      // MapLibre v5 passes the MVP matrix via options.modelViewProjectionMatrix
      // (world-space → clip-space). This replaces the raw number[] matrix arg
      // that was passed by MapLibre v4 and earlier.
      const matrix = options.modelViewProjectionMatrix;

      // Build transform: Three.js metres → Mercator map units at fort anchor.
      // rotationX flips Three.js Y-up into MapLibre Z-up (map vertical).
      const rotationX = new THREE.Matrix4().makeRotationAxis(
        new THREE.Vector3(1, 0, 0),
        Math.PI / 2
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
      scene.clear();
      renderer?.dispose();
      renderer = null;
      mapRef = null;
    },
  };
}
