// Central registry for 21 hero 3D buildings on the Dubai map.
// Each entry: glb path, default position/orientation/size. Overrides
// live in localStorage (key "zaahi-hero-overrides") and are applied
// at render time via HeroBuildingsDevPanel.
//
// Source-of-truth — DO NOT scatter HERO_* constants elsewhere. Founder
// tunes via ?dev=1 dev panel; result lands here when "Copy Config" is
// pasted in.
//
// Real-world heights are pre-baked into each GLB (see pipeline_force_zup
// in docs/research/3d-buildings-pilot/meshy-test). defaultSize stays 1.0
// for the 15 batch buildings. Six older heroes have hand-tuned sizes.

export type HeroOrientation = readonly [pitch: number, yaw: number, roll: number];
export type HeroCoords = readonly [lng: number, lat: number, elev_m: number];

export type HeroBuilding = {
  id: string;
  label: string;
  glb: string;
  defaultCoords: HeroCoords;
  defaultOrientation: HeroOrientation;
  defaultSize: number;
};

export type HeroOverride = {
  coords?: HeroCoords;
  orientation?: HeroOrientation;
  size?: number;
};

export const HERO_BUILDINGS: HeroBuilding[] = [
  // Burj Crown — Sketchfab CC-BY-4.0 model by Alnazir, baked at 203m
  // height (Sketchfab source is half-scale). sizeScale 1.995 brings it
  // to real 405m. License credit in public/glb/buildings/burj-crown.LICENSE.txt.
  // elev:500 keeps the founder-locked elevated placement above Downtown.
  { id: "burj-crown", label: "Burj Crown",
    glb: "/glb/buildings/burj-crown.glb",
    defaultCoords: [55.268824, 25.193982, 500],
    defaultOrientation: [1, -80, -86],
    defaultSize: 1.995 },

  // Burj Khalifa — Sketchfab CC-BY-4.0 SDC PERFORMANCE™. Baked at 731m
  // height; sizeScale 1.133 brings to real 828m.
  { id: "burj-khalifa", label: "Burj Khalifa",
    glb: "/glb/buildings/burj-khalifa.glb",
    defaultCoords: [55.274123, 25.197204, 0],
    defaultOrientation: [0, 53, 90],
    defaultSize: 1.133 },

  // Millennium Tower (Business Bay) — Meshy multi-image-to-3D, baked at
  // real 285m × 43×33m. sizeScale 1.0.
  { id: "millennium-tower", label: "Millennium Tower (BB)",
    glb: "/glb/buildings/millennium-tower.glb",
    defaultCoords: [55.263728, 25.193823, -1],
    defaultOrientation: [0, -41, 90],
    defaultSize: 1.0 },

  // Address Downtown — Meshy multi-image, baked at real 306m × 60×40m.
  { id: "address-downtown", label: "Address Downtown",
    glb: "/glb/buildings/address-downtown.glb",
    defaultCoords: [55.278916, 25.193949, 0],
    defaultOrientation: [0, -110, 90],
    defaultSize: 1.0 },

  // Burj Al Arab — Meshy, baked at real 321m × 50×100m.
  { id: "burj-al-arab", label: "Burj Al Arab",
    glb: "/glb/buildings/burj-al-arab.glb",
    defaultCoords: [55.185329, 25.141318, 0],
    defaultOrientation: [0, 53, 90],
    defaultSize: 1.0 },

  // First Hotel JVC — Meshy, baked at real 160m × 35×40m.
  { id: "first-hotel-jvc", label: "First Hotel JVC",
    glb: "/glb/buildings/first-hotel-jvc.glb",
    defaultCoords: [55.204777, 25.054784, 0],
    defaultOrientation: [0, -70, 90],
    defaultSize: 1.0 },

  // ── 5-building Marina/JLT batch (founder-locked 2026-05-27) ──
  // Cayan keeps defaults — pending founder tune. Other 4 are
  // founder-tuned via dev panel and copied back here.

  { id: "ciel-tower", label: "Ciel Tower",
    glb: "/glb/buildings/ciel-tower.glb",
    defaultCoords: [55.1447181, 25.0874099, 0],
    defaultOrientation: [0, -36, 90],
    defaultSize: 1.0 },

  { id: "almas-tower", label: "Almas Tower",
    glb: "/glb/buildings/almas-tower.glb",
    defaultCoords: [55.1410205, 25.0691342, 0],
    defaultOrientation: [0, -148, 90],
    defaultSize: 1.0 },

  { id: "cayan-tower", label: "Cayan Tower",
    glb: "/glb/buildings/cayan-tower.glb",
    defaultCoords: [55.14525, 25.08689, 0],
    defaultOrientation: [0, 0, 90],
    defaultSize: 1.0 },

  { id: "the-torch", label: "The Torch",
    glb: "/glb/buildings/the-torch.glb",
    defaultCoords: [55.1474404, 25.0879400, -12],
    defaultOrientation: [0, -41, 90],
    defaultSize: 1.25 },

  { id: "ocean-heights", label: "Ocean Heights",
    glb: "/glb/buildings/ocean-heights.glb",
    defaultCoords: [55.1487704, 25.0906621, 1],
    defaultOrientation: [0, -41, 90],
    defaultSize: 1.0 },

  // Como Residences (Nakheel, Palm Jumeirah trunk) — UNDER_CONSTRUCTION
  // Q2 2028. 71 floors, ~300m seashell tower. Founder-tuned 2026-05-27.
  { id: "como-residences", label: "Como Residences (Palm)",
    glb: "/glb/buildings/como-residences.glb",
    defaultCoords: [55.1455254, 25.1111202, 0],
    defaultOrientation: [0, -39, 90],
    defaultSize: 2.50 },
];

export function effectiveValues(b: HeroBuilding, ov: HeroOverride | undefined) {
  return {
    coords: (ov?.coords ?? b.defaultCoords) as HeroCoords,
    orientation: (ov?.orientation ?? b.defaultOrientation) as HeroOrientation,
    size: ov?.size ?? b.defaultSize,
  };
}

export const HERO_OVERRIDES_STORAGE_KEY = "zaahi-hero-overrides";
