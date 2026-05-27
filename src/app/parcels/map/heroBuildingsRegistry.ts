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

  // ── 15-batch (2026-05-27) — Marina super-talls + DIFC + JLT + BB ──
  // All baked at real height, sizeScale 1.0, default orientation [0,0,90].
  // Founder will tune yaw/pitch/roll per building via dev panel.

  { id: "marina-101", label: "Marina 101",
    glb: "/glb/buildings/marina-101.glb",
    defaultCoords: [55.14863, 25.08898, 0],
    defaultOrientation: [0, 0, 90],
    defaultSize: 1.0 },

  { id: "princess-tower", label: "Princess Tower",
    glb: "/glb/buildings/princess-tower.glb",
    defaultCoords: [55.146858, 25.088625, 0],
    defaultOrientation: [0, 0, 90],
    defaultSize: 1.0 },

  { id: "23-marina", label: "23 Marina",
    glb: "/glb/buildings/23-marina.glb",
    defaultCoords: [55.15063, 25.08981, 0],
    defaultOrientation: [0, 0, 90],
    defaultSize: 1.0 },

  { id: "elite-residence", label: "Elite Residence",
    glb: "/glb/buildings/elite-residence.glb",
    defaultCoords: [55.1478889, 25.0895694, 0],
    defaultOrientation: [0, 0, 90],
    defaultSize: 1.0 },

  { id: "ciel-tower", label: "Ciel Tower",
    glb: "/glb/buildings/ciel-tower.glb",
    defaultCoords: [55.1444, 25.0875, 0],
    defaultOrientation: [0, 0, 90],
    defaultSize: 1.0 },

  { id: "almas-tower", label: "Almas Tower",
    glb: "/glb/buildings/almas-tower.glb",
    defaultCoords: [55.1411, 25.0689, 0],
    defaultOrientation: [0, 0, 90],
    defaultSize: 1.0 },

  { id: "gevora-hotel", label: "Gevora Hotel",
    glb: "/glb/buildings/gevora-hotel.glb",
    defaultCoords: [55.27708, 25.21239, 0],
    defaultOrientation: [0, 0, 90],
    defaultSize: 1.0 },

  { id: "jw-marriott-marquis", label: "JW Marriott Marquis",
    glb: "/glb/buildings/jw-marriott-marquis.glb",
    defaultCoords: [55.25667, 25.18556, 0],
    defaultOrientation: [0, 0, 90],
    defaultSize: 1.0 },

  { id: "emirates-tower-1", label: "Emirates Tower 1 (Office)",
    glb: "/glb/buildings/emirates-tower-1.glb",
    defaultCoords: [55.283546, 25.21768, 0],
    defaultOrientation: [0, 0, 90],
    defaultSize: 1.0 },

  { id: "emirates-tower-2", label: "Emirates Tower 2 (Hotel)",
    glb: "/glb/buildings/emirates-tower-2.glb",
    defaultCoords: [55.28194, 25.2175, 0],
    defaultOrientation: [0, 0, 90],
    defaultSize: 1.0 },

  { id: "index-tower", label: "Index Tower",
    glb: "/glb/buildings/index-tower.glb",
    defaultCoords: [55.27789, 25.20691, 0],
    defaultOrientation: [0, 0, 90],
    defaultSize: 1.0 },

  { id: "cayan-tower", label: "Cayan Tower",
    glb: "/glb/buildings/cayan-tower.glb",
    defaultCoords: [55.14525, 25.08689, 0],
    defaultOrientation: [0, 0, 90],
    defaultSize: 1.0 },

  { id: "damac-heights", label: "DAMAC Heights",
    glb: "/glb/buildings/damac-heights.glb",
    defaultCoords: [55.14567, 25.08724, 0],
    defaultOrientation: [0, 0, 90],
    defaultSize: 1.0 },

  { id: "the-torch", label: "The Torch",
    glb: "/glb/buildings/the-torch.glb",
    defaultCoords: [55.14750, 25.08794, 0],
    defaultOrientation: [0, 0, 90],
    defaultSize: 1.0 },

  { id: "ocean-heights", label: "Ocean Heights",
    glb: "/glb/buildings/ocean-heights.glb",
    defaultCoords: [55.14884, 25.09059, 0],
    defaultOrientation: [0, 0, 90],
    defaultSize: 1.0 },
];

export function effectiveValues(b: HeroBuilding, ov: HeroOverride | undefined) {
  return {
    coords: (ov?.coords ?? b.defaultCoords) as HeroCoords,
    orientation: (ov?.orientation ?? b.defaultOrientation) as HeroOrientation,
    size: ov?.size ?? b.defaultSize,
  };
}

export const HERO_OVERRIDES_STORAGE_KEY = "zaahi-hero-overrides";
