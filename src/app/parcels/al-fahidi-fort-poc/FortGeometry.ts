// Procedural Three.js geometry for Al Fahidi Fort.
//
// POC-grade LOD2 silhouette · recognisable as a fort without being
// photorealistic. Agent-authored · public-domain building subject · zero
// licensing risk.
//
// Philosophy matches ZAAHI Signature: generate 3D from public facts rather
// than ship third-party model files. Future refinement can swap in a
// higher-fidelity mesh without changing the integration layer.

import * as THREE from "three";
import { FORT_DIMENSIONS, FORT_COLORS } from "./constants";

/**
 * Build the full Al Fahidi Fort scene group.
 * Centroid of the fort footprint sits at local origin (0,0,0).
 * Y axis is UP · XZ is the ground plane.
 */
export function buildFortGeometry(): THREE.Group {
  const group = new THREE.Group();
  group.name = "al-fahidi-fort";

  const wallMat = new THREE.MeshStandardMaterial({
    color: FORT_COLORS.wallBase,
    roughness: 0.9,
    metalness: 0.0,
  });
  const shadowMat = new THREE.MeshStandardMaterial({
    color: FORT_COLORS.wallShadow,
    roughness: 0.9,
    metalness: 0.0,
  });
  const towerMat = new THREE.MeshStandardMaterial({
    color: FORT_COLORS.towerBase,
    roughness: 0.85,
    metalness: 0.0,
  });
  const crenMat = new THREE.MeshStandardMaterial({
    color: FORT_COLORS.crenellation,
    roughness: 0.9,
    metalness: 0.0,
  });
  const gateMat = new THREE.MeshStandardMaterial({
    color: FORT_COLORS.gate,
    roughness: 0.7,
    metalness: 0.0,
  });

  const { wallLengthM, wallThicknessM, wallHeightM } = FORT_DIMENSIONS;
  const half = wallLengthM / 2;

  // Four outer walls forming a square
  group.add(makeWall(wallLengthM, wallThicknessM, wallHeightM, 0, 0, half, wallMat));
  group.add(
    makeWallWithGate(wallLengthM, wallThicknessM, wallHeightM, 0, 0, -half, wallMat, gateMat)
  );
  group.add(makeWall(wallThicknessM, wallLengthM, wallHeightM, half, 0, 0, shadowMat));
  group.add(makeWall(wallThicknessM, wallLengthM, wallHeightM, -half, 0, 0, shadowMat));

  // Three corner towers (SE · SW · NE)
  group.add(makeTower(half, -half, towerMat, crenMat));
  group.add(makeTower(-half, -half, towerMat, crenMat));
  group.add(makeTower(half, half, towerMat, crenMat));

  // Wall-top crenellations (decorative teeth · skip over gate)
  addWallCrenellations(group, crenMat);

  return group;
}

function makeWall(
  width: number,
  depth: number,
  height: number,
  x: number,
  yBase: number,
  z: number,
  mat: THREE.Material
): THREE.Mesh {
  const geo = new THREE.BoxGeometry(width, height, depth);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, yBase + height / 2, z);
  return mesh;
}

function makeWallWithGate(
  width: number,
  depth: number,
  height: number,
  x: number,
  yBase: number,
  z: number,
  wallMat: THREE.Material,
  gateMat: THREE.Material
): THREE.Group {
  const grp = new THREE.Group();
  const { gateWidthM, gateHeightM } = FORT_DIMENSIONS;

  const segmentWidth = (width - gateWidthM) / 2;

  grp.add(
    makeWall(
      segmentWidth,
      depth,
      height,
      x - (segmentWidth + gateWidthM) / 2,
      yBase,
      z,
      wallMat
    )
  );
  grp.add(
    makeWall(
      segmentWidth,
      depth,
      height,
      x + (segmentWidth + gateWidthM) / 2,
      yBase,
      z,
      wallMat
    )
  );

  // Arch lintel above gate
  const archHeight = height - gateHeightM;
  grp.add(makeWall(gateWidthM, depth, archHeight, x, yBase + gateHeightM, z, wallMat));

  // Wooden gate door
  const gateGeo = new THREE.BoxGeometry(
    gateWidthM - 0.2,
    gateHeightM,
    depth * 0.3
  );
  const gate = new THREE.Mesh(gateGeo, gateMat);
  gate.position.set(x, yBase + gateHeightM / 2, z);
  grp.add(gate);

  return grp;
}

function makeTower(
  x: number,
  z: number,
  towerMat: THREE.Material,
  crenMat: THREE.Material
): THREE.Group {
  const grp = new THREE.Group();
  const { towerDiameterM, towerHeightM, towerCrenellationHeightM } = FORT_DIMENSIONS;
  const radius = towerDiameterM / 2;

  // Main cylindrical tower body (slight taper to base for stability read)
  const bodyGeo = new THREE.CylinderGeometry(radius, radius * 1.05, towerHeightM, 20);
  const body = new THREE.Mesh(bodyGeo, towerMat);
  body.position.set(x, towerHeightM / 2, z);
  grp.add(body);

  // Top ring that caps the tower below crenellations
  const topRingGeo = new THREE.CylinderGeometry(radius + 0.3, radius + 0.3, 0.5, 20);
  const topRing = new THREE.Mesh(topRingGeo, crenMat);
  topRing.position.set(x, towerHeightM + 0.25, z);
  grp.add(topRing);

  // Crenellations around tower top (8 teeth evenly spaced)
  const teethCount = 8;
  for (let i = 0; i < teethCount; i++) {
    const angle = (i / teethCount) * Math.PI * 2;
    const teethRadius = radius + 0.15;
    const tx = x + Math.cos(angle) * teethRadius;
    const tz = z + Math.sin(angle) * teethRadius;
    const toothGeo = new THREE.BoxGeometry(0.8, towerCrenellationHeightM, 0.6);
    const tooth = new THREE.Mesh(toothGeo, crenMat);
    tooth.position.set(tx, towerHeightM + 0.5 + towerCrenellationHeightM / 2, tz);
    tooth.rotation.y = angle;
    grp.add(tooth);
  }

  return grp;
}

function addWallCrenellations(group: THREE.Group, mat: THREE.Material): void {
  const {
    wallLengthM,
    wallHeightM,
    crenellationHeightM,
    crenellationSpacingM,
  } = FORT_DIMENSIONS;
  const half = wallLengthM / 2;
  const yTop = wallHeightM + crenellationHeightM / 2;
  const totalTeeth = Math.floor(wallLengthM / crenellationSpacingM);

  // North wall (+Z)
  for (let i = 0; i < totalTeeth; i++) {
    const x = -half + crenellationSpacingM / 2 + i * crenellationSpacingM;
    addTooth(group, mat, x, yTop, half, "ns");
  }
  // South wall (-Z) · skip directly above gate
  for (let i = 0; i < totalTeeth; i++) {
    const x = -half + crenellationSpacingM / 2 + i * crenellationSpacingM;
    if (Math.abs(x) < 2) continue;
    addTooth(group, mat, x, yTop, -half, "ns");
  }
  // East wall (+X)
  for (let i = 0; i < totalTeeth; i++) {
    const z = -half + crenellationSpacingM / 2 + i * crenellationSpacingM;
    addTooth(group, mat, half, yTop, z, "ew");
  }
  // West wall (-X)
  for (let i = 0; i < totalTeeth; i++) {
    const z = -half + crenellationSpacingM / 2 + i * crenellationSpacingM;
    addTooth(group, mat, -half, yTop, z, "ew");
  }
}

function addTooth(
  group: THREE.Group,
  mat: THREE.Material,
  x: number,
  y: number,
  z: number,
  orient: "ns" | "ew"
): void {
  const {
    crenellationWidthM,
    crenellationHeightM,
    crenellationDepthM,
  } = FORT_DIMENSIONS;
  const w = orient === "ns" ? crenellationWidthM : crenellationDepthM;
  const d = orient === "ns" ? crenellationDepthM : crenellationWidthM;
  const geo = new THREE.BoxGeometry(w, crenellationHeightM, d);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  group.add(mesh);
}
