/**
 * Seed / update ZAAHI listing for DDA plot 6458042 — Capital 6 Office Building.
 *
 * Client:     AAMANI REAL ESTATE INVESTMENTS LTD
 * Consultant: CVTEC Consulting Engineers
 * Building:   3B + G + 7 + R office tower, 34.2 m total height
 * Project:    MAJAN (Wadi Al Safa 3)
 *
 * Source: /data/CAPITAL 6 OFFICE BUILDING.pdf (founder-supplied schematic).
 *
 * Idempotent: upserts Parcel + appends a new AffectionPlan row (never
 * deletes prior rows, per CLAUDE.md). Does NOT set currentValuation —
 * price remains exactly as whatever already exists (null if new parcel).
 *
 * Run: npx tsx -r dotenv/config scripts/seed-6458042.ts dotenv_config_path=.env.local
 */
import proj4 from 'proj4';
import { UserRole, ParcelStatus, Prisma } from '@prisma/client';
import { prisma } from '../src/lib/prisma';

const SYSTEM_USER_ID = '00000000-0000-0000-0000-00000000zaah';
const SYSTEM_EMAIL = 'system@zaahi.ae';

const PLOT_NUMBER = '6458042';
const EMIRATE = 'Dubai';
const DISTRICT = 'MAJAN';            // DDA PROJECT_NAME — community label

// ── Plot corners from the schematic (UTM Zone 40N, EPSG:32640) ──
// 6 vertices — the plot is an irregular hexagon (trapezoidal with two
// angled corners), not a simple rectangle.
const UTM_POINTS: Array<[number, number]> = [
  [497981.778, 2775845.719],
  [497984.989, 2775853.574],
  [498011.996, 2775864.909],
  [498033.417, 2775813.873],
  [498006.410, 2775802.537],
  [497998.555, 2775805.747],
];

// Register UTM 40N projection so proj4 can convert to WGS84 (EPSG:4326).
proj4.defs(
  'EPSG:32640',
  '+proj=utm +zone=40 +datum=WGS84 +units=m +no_defs',
);
const utmToWgs = proj4('EPSG:32640', 'EPSG:4326');

function utmToLngLat([e, n]: [number, number]): [number, number] {
  const [lng, lat] = utmToWgs.forward([e, n]);
  return [lng, lat];
}

// Plot geometry (closed ring) in WGS84
const plotRing: number[][] = UTM_POINTS.map(utmToLngLat);
plotRing.push(plotRing[0]); // close the ring (GeoJSON requirement)

const plotGeometry: GeoJSON.Polygon = {
  type: 'Polygon',
  coordinates: [plotRing],
};

// Centroid for parcel.lat/lng (simple average — sufficient for pin)
const centroidLng =
  plotRing.slice(0, -1).reduce((s, p) => s + p[0], 0) / (plotRing.length - 1);
const centroidLat =
  plotRing.slice(0, -1).reduce((s, p) => s + p[1], 0) / (plotRing.length - 1);

// ── Schematic facts ──
// Plot area — trust DDA's 20,637.45 sqft (≈ 1,917 sqm).
const PLOT_AREA_SQFT = 20637.45;
const PLOT_AREA_SQM = 1917.4;

// Height: Ground 5.4 m + 7 typical floors × 3.9 m + roof/parapet ≈ 34.2 m
// (Top of Parapet per schematic section).
const MAX_HEIGHT_M = 34.2;
const MAX_FLOORS = 8; // G + 7 storeys = 8 floors above ground

// GFA / FAR from schematic (office tower summary).
const MAX_GFA_SQM = 7664.63;
const MAX_GFA_SQFT = Math.round(MAX_GFA_SQM * 10.7639);
const FAR = 3.99;

// Setbacks (metres) from schematic site plan.
//   Side 1 (road):     13.00
//   Side 2 (neighbor):  7.50
//   Side 3 (road):     11.95
//   Side 4 (neighbor):  7.50 (mirrored)
const SETBACKS = [
  { side: 1, building: 13.0, podium: null },
  { side: 2, building: 7.5, podium: null },
  { side: 3, building: 11.95, podium: null },
  { side: 4, building: 7.5, podium: null },
];

async function main() {
  console.log(`Seeding plot ${PLOT_NUMBER} — Capital 6 Office Building`);
  console.log(
    `  centroid: ${centroidLng.toFixed(6)}, ${centroidLat.toFixed(6)}`,
  );
  console.log(`  height:   ${MAX_HEIGHT_M} m  (G+${MAX_FLOORS - 1}+R)`);

  // 1. ZAAHI system user (owner for seeded listings)
  await prisma.user.upsert({
    where: { id: SYSTEM_USER_ID },
    create: {
      id: SYSTEM_USER_ID,
      email: SYSTEM_EMAIL,
      role: UserRole.ADMIN,
      name: 'ZAAHI System',
    },
    update: {},
  });

  // 2. Parcel — upsert on (emirate, district, plotNumber).
  //    We do NOT touch currentValuation: if the parcel already has a
  //    price, it stays; if new, it stays null. Founder sets price
  //    explicitly via a separate script/UI.
  const existing = await prisma.parcel.findUnique({
    where: {
      emirate_district_plotNumber: {
        emirate: EMIRATE,
        district: DISTRICT,
        plotNumber: PLOT_NUMBER,
      },
    },
  });

  const parcel = await prisma.parcel.upsert({
    where: {
      emirate_district_plotNumber: {
        emirate: EMIRATE,
        district: DISTRICT,
        plotNumber: PLOT_NUMBER,
      },
    },
    create: {
      plotNumber: PLOT_NUMBER,
      ownerId: SYSTEM_USER_ID,
      area: PLOT_AREA_SQFT,
      emirate: EMIRATE,
      district: DISTRICT,
      latitude: centroidLat,
      longitude: centroidLng,
      geometry: plotGeometry as unknown as Prisma.InputJsonValue,
      // New listings start VACANT (no valuation yet).
      status: ParcelStatus.VACANT,
    },
    update: {
      // Refresh geometry + area from the engineer's schematic.
      // Leave status and currentValuation untouched.
      area: PLOT_AREA_SQFT,
      latitude: centroidLat,
      longitude: centroidLng,
      geometry: plotGeometry as unknown as Prisma.InputJsonValue,
    },
  });

  console.log(
    existing
      ? `  Parcel: updated ${parcel.id} (status=${parcel.status}, kept price)`
      : `  Parcel: created ${parcel.id} (status=VACANT, no price)`,
  );

  // 3. AffectionPlan — append a fresh row (never deleteMany).
  //    The app always reads the latest (orderBy fetchedAt desc, take 1).
  const plan = await prisma.affectionPlan.create({
    data: {
      parcelId: parcel.id,
      source: 'schematic: CAPITAL 6 OFFICE BUILDING.pdf',
      plotNumber: PLOT_NUMBER,
      projectName: 'Capital 6 Office Building',
      community: 'Majan',
      masterDeveloper: 'AAMANI REAL ESTATE INVESTMENTS LTD',

      plotAreaSqm: PLOT_AREA_SQM,
      plotAreaSqft: PLOT_AREA_SQFT,
      maxGfaSqm: MAX_GFA_SQM,
      maxGfaSqft: MAX_GFA_SQFT,

      maxHeightCode: 'G+7+R',
      maxFloors: MAX_FLOORS,
      maxHeightMeters: MAX_HEIGHT_M,
      far: FAR,

      setbacks: SETBACKS as unknown as Prisma.InputJsonValue,
      landUseMix: [
        { category: 'COMMERCIAL', sub: 'OFFICES - RETAIL', areaSqm: PLOT_AREA_SQM },
      ] as unknown as Prisma.InputJsonValue,

      // Flat single-block extrusion — no podium/body/crown tiering
      // (correct for office towers without visual podium distinction).
      // Renderer picks this up automatically in loadZaahiPlots.
      buildingStyle: 'FLAT',

      notes:
        'Capital 6 Office Building (3B + G + 7 + R). ' +
        'Consultant: CVTEC Consulting Engineers. ' +
        '116 parking bays across 3 basement levels (not rendered).',
    },
  });

  console.log(`  AffectionPlan: created ${plan.id}`);
  console.log(`  land use: COMMERCIAL (OFFICES - RETAIL) → color #1B4965`);
  console.log(`  style:    FLAT (single block, no podium/body/crown)`);
  console.log('\nDone.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
