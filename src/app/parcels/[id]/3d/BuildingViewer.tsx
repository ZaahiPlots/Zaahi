"use client";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, ContactShadows, Grid } from "@react-three/drei";
import * as THREE from "three";
import { useMemo } from "react";
import { lngLatToLocalMeters, polygonCentroid } from "@/lib/projection";

interface Props {
  plot: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  building: GeoJSON.Polygon | null;
  floors: number;
  storeyHeight?: number;
}

function ringToShape(ring: Array<[number, number]>): THREE.Shape {
  const shape = new THREE.Shape();
  ring.forEach(([x, y], i) => {
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  });
  return shape;
}

function flattenFirstRing(geom: GeoJSON.Polygon | GeoJSON.MultiPolygon): number[][] {
  return geom.type === "Polygon" ? geom.coordinates[0] : geom.coordinates[0][0];
}

export default function BuildingViewer({ plot, building, floors, storeyHeight = 4 }: Props) {
  const { plotShape, buildingShape, height, sizeHint } = useMemo(() => {
    const plotRing = flattenFirstRing(plot);
    const center = polygonCentroid(plotRing);
    const plotLocal = lngLatToLocalMeters(plotRing, center.lng, center.lat);
    const buildingLocal = building
      ? lngLatToLocalMeters(building.coordinates[0], center.lng, center.lat)
      : null;

    // Estimate plot bounding box for camera
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const [x, y] of plotLocal) {
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
    const sz = Math.max(maxX - minX, maxY - minY);

    return {
      plotShape: ringToShape(plotLocal),
      buildingShape: buildingLocal ? ringToShape(buildingLocal) : null,
      height: floors * storeyHeight,
      sizeHint: sz,
    };
  }, [plot, building, floors, storeyHeight]);

  const camDist = Math.max(120, sizeHint * 1.6);

  return (
    <Canvas
      shadows
      camera={{ position: [camDist, camDist * 0.8, camDist], fov: 45, near: 0.1, far: 5000 }}
      style={{ background: "#0a0a0a" }}
    >
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[200, 400, 200]}
        intensity={1.4}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-300}
        shadow-camera-right={300}
        shadow-camera-top={300}
        shadow-camera-bottom={-300}
      />
      <Environment preset="city" />

      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[2000, 2000]} />
        <meshStandardMaterial color="#1f2937" roughness={0.9} />
      </mesh>
      <Grid
        position={[0, 0.02, 0]}
        args={[2000, 2000]}
        cellSize={10}
        cellThickness={0.5}
        cellColor="#374151"
        sectionSize={50}
        sectionThickness={1}
        sectionColor="#4b5563"
        fadeDistance={400}
        infiniteGrid
      />

      {/* Plot footprint outline */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <shapeGeometry args={[plotShape]} />
        <meshBasicMaterial color="#f59e0b" transparent opacity={0.18} side={THREE.DoubleSide} />
      </mesh>

      {/* Stacked floors as thin extrusions for visible separation */}
      {buildingShape &&
        Array.from({ length: floors }).map((_, i) => (
          <mesh
            key={i}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, i * storeyHeight + storeyHeight * 0.5, 0]}
            castShadow
            receiveShadow
          >
            <extrudeGeometry
              args={[
                buildingShape,
                { depth: storeyHeight * 0.92, bevelEnabled: false },
              ]}
            />
            <meshStandardMaterial
              color="#94a3b8"
              metalness={0.55}
              roughness={0.3}
              emissive="#1e293b"
              emissiveIntensity={0.1}
            />
          </mesh>
        ))}

      {/* Roof crown */}
      {buildingShape && (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, height + 0.5, 0]}
          castShadow
        >
          <extrudeGeometry args={[buildingShape, { depth: 1.5, bevelEnabled: false }]} />
          <meshStandardMaterial color="#f59e0b" metalness={0.6} roughness={0.2} />
        </mesh>
      )}

      <ContactShadows position={[0, 0.01, 0]} opacity={0.6} scale={400} blur={2.5} far={50} />
      <OrbitControls makeDefault enableDamping minDistance={20} maxDistance={1500} />
    </Canvas>
  );
}
