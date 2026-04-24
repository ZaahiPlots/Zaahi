// Candidate 3D-artist sample POC — evaluation page for an external candidate's
// building model (FBX/OBJ from 3ds Max exporter) converted to production glTF.
//
// Conversion: scripts/convert_candidate_sample.py (trimesh 4.12 · OBJ → GLB).
//   · 105 Max "mesh objects" merged into 7 per-material groups (7 draw calls)
//   · Legacy Phong Kd → PBR baseColorFactor (roughness 0.85 · metallic 0)
//   · PATTERN material's map_d pointed at D:\PROJECT\3D\ZHAN\PATTERN.jpg ·
//     unreachable · solid-color fallback from Kd (grey 0.588)
//   · Source units = cm (bounds 58.4m × 103.1m × 55.4m after /100 scale)
//
// Placement: separate pin on the Dubai Water Canal basin · north of TB02 ·
// zero overlap with the production TB02 tower geometry. Selected because task
// brief anchors evaluation "на TB02 plot (Dubai Water Canal) или отдельной
// pin на map" — we choose the isolated-pin option so the standalone POC
// cannot accidentally distort the real TB02 rendering.
//
// This route is an ADDITION to ZAAHI Signature · not a replacement.

export const SAMPLE_LOCATION = {
  // Offset north of TB02 centroid (~55.254, 25.195 per seed-tb02 script).
  // Sits over the canal basin · clear airspace · nothing to collide with.
  lng: 55.2560,
  lat: 25.1985,
  name: "Candidate 3D sample · building 1",
  submittedBy: "External 3D artist (evaluation submission)",
  neighborhood: "Dubai Water Canal · POC anchor (not a real listing)",
  sourceFormat: "Autodesk FBX / OBJ + MTL (3ds Max exporter v0.99)",
  convertedTo: "glTF 2.0 binary (.glb)",
  status: "Evaluation only · not a listed parcel",
} as const;

// Model metrics reported back to the founder in the info panel.
// Values come from the convert script stdout and public/models/ ls -l.
export const MODEL_METRICS = {
  rawMeshObjects: 105,
  mergedMeshGroups: 7,
  vertices: 5331,
  triangles: 6384,
  materials: 7,
  glbKilobytes: 207,
  dimensionsM: { x: 58.4, y: 103.1, z: 55.4 },
  textures: "Missing (PATTERN.jpg absolute Windows path) — solid-color fallback",
  pbr: "Legacy Phong Kd → PBR baseColor (best-effort · no normal/metallic maps)",
} as const;

// Units: source is cm · multiply positions by 0.01 to get metres so the
// building sits at its stated real-world size on the map. Also flip +Y/+X
// footprint-centered so the building's base centre aligns with SAMPLE_LOCATION.
export const MODEL_TRANSFORM = {
  scale: 0.01,
  // Raw-unit offsets (in cm · before scale). Derived from bounds:
  //   X: [-3026.4, +2817.4]  → centre 104.5 cm east of raw origin
  //   Y: [-20.0, +10292.2]   → bottom ~20 cm below raw origin · negligible
  //   Z: [-4972.8, +569.8]   → centre 2201.5 cm north of raw origin
  // We translate so (centreX, 0, centreZ) lands at (0, 0, 0) world-anchor.
  translate: { x: 104.5, y: 20.0, z: 2201.5 },
} as const;

// Camera framing: zoom/pitch chosen to frame a 60-metre-wide building at ~60°
// pitch so the whole facade is legible and the rotation pattern reads.
export const CAMERA = {
  initialZoom: 16.5,
  initialPitch: 60,
  initialBearing: 35,
} as const;

export const GLB_URL = "/models/candidate-sample.glb";
