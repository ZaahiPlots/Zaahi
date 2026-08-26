// ZAAHI E2E fixtures — deterministic stand-ins for every API the map page
// calls. Nothing here touches the production database: Playwright fulfils the
// requests inside the browser, so the Next route handlers never execute and
// Prisma is never reached.
//
// Geometry is placed at MAP_CENTER so a click at the centre of the canvas
// lands on PLOT_CLICKABLE — see harness.ts (the camera is pinned via the
// zaahi-map-view localStorage key the map restores on boot).

/** Camera the harness pins so canvas-centre clicks are deterministic. */
export const MAP_CENTER: [number, number] = [55.27, 25.2];
export const MAP_ZOOM = 15;

/** Square polygon of `half` degrees around [lng, lat]. */
function square(lng: number, lat: number, half: number): GeoJSON.Polygon {
  return {
    type: "Polygon",
    coordinates: [[
      [lng - half, lat - half],
      [lng + half, lat - half],
      [lng + half, lat + half],
      [lng - half, lat + half],
      [lng - half, lat - half],
    ]],
  };
}

function plan(projectName: string, category: string) {
  return {
    projectName,
    community: "Business Bay",
    maxFloors: 12,
    maxHeightMeters: 42,
    maxHeightCode: "G+12",
    plotAreaSqm: 2000,
    plotAreaSqft: 21528,
    maxGfaSqm: 8000,
    maxGfaSqft: 86111,
    sitePlanIssue: "2024-02-01T00:00:00.000Z",
    fetchedAt: "2026-08-01T00:00:00.000Z",
    far: 4,
    buildingLimitGeometry: null,
    setbacks: null,
    landUseMix: [{ category, sub: null }],
    buildingStyle: null,
  };
}

/**
 * Five parcels covering every branch the smoke checks need:
 *  - four distinct statuses, including VAULT_PRIVATE (P0 1.25 regression: the
 *    old three-status whitelist dropped it from the body while the header
 *    still counted it);
 *  - one geometryless parcel (P0 2.2 "has no mapped boundary" branch);
 *  - one large polygon centred on the camera so a canvas-centre click hits it.
 */
export const PARCELS = [
  {
    id: "p-listed-1",
    plotNumber: "3261253",
    district: "Business Bay",
    emirate: "DUBAI",
    status: "LISTED",
    area: 21528,
    geometry: square(MAP_CENTER[0], MAP_CENTER[1], 0.004), // clickable at centre
    currentValuation: "5000000000",
    isVault: false,
    vaultEntryId: null,
    conflictsWithOthers: false,
    plan: plan("Bay Tower", "RESIDENTIAL"),
  },
  {
    id: "p-verified-1",
    plotNumber: "3261254",
    district: "Al Jadaf",
    emirate: "DUBAI",
    status: "VERIFIED",
    area: 18000,
    geometry: square(MAP_CENTER[0] + 0.02, MAP_CENTER[1], 0.001),
    currentValuation: "3200000000",
    isVault: false,
    vaultEntryId: null,
    conflictsWithOthers: false,
    plan: plan("Jadaf Views", "COMMERCIAL"),
  },
  {
    id: "p-indeal-1",
    plotNumber: "3261255",
    district: "Meydan",
    emirate: "DUBAI",
    status: "IN_DEAL",
    area: 26000,
    geometry: square(MAP_CENTER[0] - 0.02, MAP_CENTER[1], 0.001),
    currentValuation: "7800000000",
    isVault: false,
    vaultEntryId: null,
    conflictsWithOthers: false,
    plan: plan("Meydan Rise", "HOTEL"),
  },
  {
    // The row the pre-fix build silently discarded.
    id: "p-vault-1",
    plotNumber: "3261256",
    district: "Al Barsha",
    emirate: "DUBAI",
    status: "VAULT_PRIVATE",
    area: 14000,
    geometry: square(MAP_CENTER[0], MAP_CENTER[1] + 0.02, 0.001),
    currentValuation: "4100000000",
    isVault: true,
    vaultEntryId: "ve-1",
    conflictsWithOthers: false,
    plan: plan("Barsha Private", "MIXED_USE"),
  },
  {
    // Exists, but has no polygon — Find plot must say so explicitly rather
    // than reporting "not found".
    id: "p-nogeom-1",
    plotNumber: "3261257",
    district: "Dubai Land",
    emirate: "DUBAI",
    status: "LISTED",
    area: 9000,
    geometry: null,
    currentValuation: null,
    isVault: false,
    vaultEntryId: null,
    conflictsWithOthers: false,
    plan: plan("Land Parcel", "FUTURE_DEVELOPMENT"),
  },
];

export const PLOT_FOUND = "3261253";
export const PLOT_NO_GEOMETRY = "3261257";
export const PLOT_MISSING = "9999999";

export const EMPTY_FC = { type: "FeatureCollection", features: [] };
