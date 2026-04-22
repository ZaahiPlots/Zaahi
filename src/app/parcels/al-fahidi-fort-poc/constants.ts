// Al Fahidi Fort (Dubai Museum) — architectural constants for POC 3D render.
//
// Building selection rationale (documented in Spec 07):
//   - Built 1787 · architectural copyright expired in all jurisdictions
//   - Owned by Dubai Municipality · government heritage site
//   - Dubai's oldest existing building · iconic cultural landmark
//   - Legal posture: PUBLIC DOMAIN architectural work · zero IP risk
//
// Dimensions below are POC-grade approximations derived from public
// sources (Wikipedia · Visit Dubai · gulfnews.com · tourism materials).
// Actual fort has irregular plan; we render a rectangular footprint with
// three corner towers for procedural simplicity.

export const FORT_LOCATION = {
  lng: 55.2973,
  lat: 25.2631,
  name: "Al Fahidi Fort (Dubai Museum)",
  yearBuilt: 1787,
  owner: "Dubai Municipality",
  neighborhood: "Al Fahidi Historical Neighbourhood · Bur Dubai",
  status: "Public domain (architectural copyright expired)",
} as const;

// Architectural dimensions (metres). POC approximation · not surveyed.
export const FORT_DIMENSIONS = {
  // Outer wall footprint (roughly square)
  wallLengthM: 55,
  wallThicknessM: 2,
  wallHeightM: 12,

  // Crenellations on top of walls
  crenellationHeightM: 1,
  crenellationDepthM: 0.5,
  crenellationWidthM: 0.8,
  crenellationSpacingM: 1.4,

  // Three corner towers (SE · SW · NE per historical plan; NW corner omitted)
  towerDiameterM: 8,
  towerHeightM: 18,
  towerCrenellationHeightM: 1.5,

  // Main gate (south wall)
  gateWidthM: 3,
  gateHeightM: 5,

  // Total building envelope (used for camera framing)
  envelopeSizeM: 60,
} as const;

// Sandstone / coral-stone colour palette (warm ochre) matching the real
// fort's coral-stone + gypsum construction. Colours chosen to read well on
// ZAAHI's dark basemap.
export const FORT_COLORS = {
  wallBase: 0xc4a574,
  wallShadow: 0xa68556,
  towerBase: 0xb89668,
  crenellation: 0xd4b68a,
  gate: 0x3a2512,
  ground: 0xe8dab8,
} as const;

// Camera framing for the MapLibre view. Zoom 17 keeps the fort
// foot-printing the visible area at pitch 60°.
export const CAMERA = {
  initialZoom: 17,
  initialPitch: 60,
  initialBearing: -30,
} as const;
