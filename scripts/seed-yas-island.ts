/**
 * Seed Yas Island (Abu Dhabi emirate) ZAAHI listing — Plot NY2-09-A3A,
 * sector NY2-09, YAS IB3 & IB4 community.
 *
 * Source:   Abu Dhabi Real Estate Centre affection plan / DCR.
 * Plot:     NY2-09-A3A, District YAS ISLAND, Community YAS IB3 & IB4,
 *           Sector NY2-09. Land Use: RESIDENTIAL — Multi Residential Unit
 *           (Investment). 2B+G+10, max height 47.2 m, 106 units.
 * Area:     3,600.00 m² (declared). FAR 3.00 → max GFA 10,800 m²
 *           (residential 10,640 + retail 160).
 * Price:    32,000,000 AED → currentValuation = 3,200,000,000 fils.
 * Status:   LISTED.
 *
 * Projection — CRITICAL:
 *   Abu Dhabi emirate uses TRUE UTM Zone 40N (EPSG:32640), NOT the
 *   Dubai Local TM (EPSG:3997). Same pattern as seed-al-ain-jahili.ts
 *   and seed-saadiyat-p28.ts.
 *
 * Polygon — 7 UTM points. The source provided them as
 * (Northing, Easting) pairs; proj4 requires [Easting, Northing], so the
 * UTM_POINTS array below is the swapped [E, N] form.
 *
 * Idempotent: upserts Parcel on (emirate, district, plotNumber) and
 * appends a fresh AffectionPlan row (never deletes prior rows, per CLAUDE.md).
 *
 * Price rule — per CLAUDE.md:
 *   On re-run we NEVER touch currentValuation or status. Only the geometry
 *   and area are refreshed so a re-projection bug can be fixed.
 *
 * Run: npx tsx -r dotenv/config scripts/seed-yas-island.ts dotenv_config_path=.env.local
 */
import proj4 from 'proj4';
import { UserRole, ParcelStatus, Prisma } from '@prisma/client';
import { prisma } from '../src/lib/prisma';

const SYSTEM_USER_ID = '00000000-0000-0000-0000-00000000zaah';
const SYSTEM_EMAIL = 'system@zaahi.ae';

const PLOT_NUMBER = 'NY2-09-A3A';
const EMIRATE = 'Abu Dhabi'; // same convention as seed-al-ain-jahili.ts / seed-saadiyat-p28.ts
const DISTRICT = 'YAS ISLAND';
const COMMUNITY = 'YAS IB3 & IB4';
const SECTOR = 'NY2-09';
const CITY = 'Abu Dhabi';
const LAND_USE_TEXT =
  'Multi Residential Unit (Investment). 2B+G+10, 47.2m, 106 units. ' +
  'Residential GFA 10,640 + Retail GFA 160 sqm';

const PLOT_AREA_SQM = 3_600.0;
const PLOT_AREA_SQFT = PLOT_AREA_SQM * 10.7639104; // ≈ 38,750.08 ft²

// 32,000,000 AED = 32,000,000 × 100 fils = 3,200,000,000 fils.
const PRICE_FILS: bigint = 3_200_000_000n;

// Building envelope.
const FAR = 3.0;
const MAX_GFA_SQM = 10_800; // = PLOT_AREA_SQM * FAR
const MAX_GFA_SQFT = MAX_GFA_SQM * 10.7639104;
const RESIDENTIAL_GFA_SQM = 10_640;
const RETAIL_GFA_SQM = 160;

const UNITS_TOTAL = 106;
const PARKING_DESC = '2 Basements';
const GROUND_COVERAGE_PCT = 100;

const MAX_HEIGHT_CODE = '2B+G+10';
const MAX_HEIGHT_M = 47.2;
// 2B+G+10 → 2 basements + ground + 10 upper = 13 above-grade floors.
// Basements are below grade and not extruded; ZAAHI 3D renderer counts
// above-grade floors from maxFloors. G+10 = 11 above-grade floors.
// Including the ground level we have 11; including mezz/amenity the
// declared profile is G+10 (11 above-grade). Store 13 to match founder
// task text (2B+G+10 → "floors 13") per the seed brief.
const MAX_FLOORS = 13;

const SETBACK_FRONT_M = 3;
const SETBACK_REAR_M = 3;
const SETBACK_SIDE_M = 3;

// ── Projection: EPSG:32640 (UTM Zone 40N) → EPSG:4326 (WGS84) ──
proj4.defs('EPSG:32640', '+proj=utm +zone=40 +datum=WGS84 +units=m +no_defs');
const utmToWgs = proj4('EPSG:32640', 'EPSG:4326');

function utmToLngLat([e, n]: [number, number]): [number, number] {
  const [lng, lat] = utmToWgs.forward([e, n]);
  return [lng, lat];
}

// Source coords were (Northing, Easting); here swapped to [Easting, Northing]
// which is what proj4 expects.
const UTM_POINTS: Array<[number, number]> = [
  [260099.665, 2710816.164], // PT 1
  [260032.167, 2710808.826], // PT 2
  [260026.408, 2710860.601], // PT 3
  [260034.339, 2710861.467], // PT 4
  [260059.484, 2710867.516], // PT 5
  [260079.899, 2710869.736], // PT 6
  [260095.176, 2710857.453], // PT 7
];

// Convert and close the ring for GeoJSON.
const plotRing: number[][] = UTM_POINTS.map(utmToLngLat);
plotRing.push(plotRing[0]);

const plotGeometry: GeoJSON.Polygon = {
  type: 'Polygon',
  coordinates: [plotRing],
};

// Simple centroid (mean of distinct vertices) — enough for a map pin.
const centroidLng =
  plotRing.slice(0, -1).reduce((s, p) => s + p[0], 0) / (plotRing.length - 1);
const centroidLat =
  plotRing.slice(0, -1).reduce((s, p) => s + p[1], 0) / (plotRing.length - 1);

// Shoelace area in UTM metres — real ground area for sanity check.
function localAreaSqm(pts: Array<[number, number]>): number {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a / 2);
}

async function main() {
  const lngs = plotRing.map((p) => p[0]);
  const lats = plotRing.map((p) => p[1]);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const groundAreaSqm = localAreaSqm(UTM_POINTS);

  console.log(`Seeding plot ${PLOT_NUMBER} — ${DISTRICT} / ${COMMUNITY}, ${CITY}, ${EMIRATE}`);
  console.log(`  WGS84 ring (lng,lat):`);
  plotRing.slice(0, -1).forEach((p, i) => {
    console.log(`    ${i + 1}  [${p[0].toFixed(7)}, ${p[1].toFixed(7)}]`);
  });
  console.log(
    `  bbox:     lng ${minLng.toFixed(6)}..${maxLng.toFixed(6)}  ` +
      `lat ${minLat.toFixed(6)}..${maxLat.toFixed(6)}`,
  );
  console.log(`  centroid: ${centroidLng.toFixed(6)}, ${centroidLat.toFixed(6)}`);
  console.log(
    `  area:     polygon=${groundAreaSqm.toFixed(2)} m² ` +
      `(declared ${PLOT_AREA_SQM} m², diff ` +
      `${(((groundAreaSqm - PLOT_AREA_SQM) / PLOT_AREA_SQM) * 100).toFixed(3)}%)`,
  );
  console.log(`  land use: RESIDENTIAL — ${LAND_USE_TEXT}`);
  console.log(`  price:    ${PRICE_FILS.toString()} fils (= 32,000,000 AED)`);

  // Sanity — Yas Island bounds: 24.44..24.52 N, 54.58..54.68 E.
  if (
    centroidLat < 24.44 ||
    centroidLat > 24.52 ||
    centroidLng < 54.58 ||
    centroidLng > 54.68
  ) {
    throw new Error(
      `Polygon centroid ${centroidLat.toFixed(4)}, ${centroidLng.toFixed(4)} is NOT on Yas Island — refusing to seed.`,
    );
  }

  // Area tolerance ±20 %.
  const areaPct = Math.abs(groundAreaSqm - PLOT_AREA_SQM) / PLOT_AREA_SQM;
  if (areaPct > 0.2) {
    throw new Error(
      `Polygon area ${groundAreaSqm.toFixed(0)} m² is > 20% off declared ${PLOT_AREA_SQM} m² — refusing to seed.`,
    );
  }

  // Pre-flight duplicate check by plotNumber alone (CLAUDE.md rule).
  const preDup = await prisma.parcel.findFirst({
    where: { plotNumber: PLOT_NUMBER },
    select: {
      id: true,
      plotNumber: true,
      emirate: true,
      district: true,
      status: true,
      currentValuation: true,
    },
  });
  if (preDup) {
    console.log(
      `\n  Duplicate pre-flight: plot ${PLOT_NUMBER} already exists as id=${preDup.id} ` +
        `${preDup.emirate}/${preDup.district} status=${preDup.status} ` +
        `price=${preDup.currentValuation?.toString() ?? 'null'} fils. ` +
        `Will upsert (refresh geometry; keep price & status).`,
    );
  } else {
    console.log(`\n  Duplicate pre-flight: none — ${PLOT_NUMBER} is new.`);
  }

  // 1. ZAAHI system user (placeholder owner for seeded listings).
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

  // 2. Parcel upsert on (emirate, district, plotNumber).
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
      status: ParcelStatus.LISTED,
      currentValuation: PRICE_FILS,
    },
    update: {
      // Refresh geometry + area; never touch currentValuation or status
      // on re-run (those are manual-only per CLAUDE.md).
      area: PLOT_AREA_SQFT,
      latitude: centroidLat,
      longitude: centroidLng,
      geometry: plotGeometry as unknown as Prisma.InputJsonValue,
    },
  });

  console.log(
    existing
      ? `  Parcel: updated ${parcel.id} (status=${parcel.status}, kept existing price)`
      : `  Parcel: created ${parcel.id} (LISTED, price=${PRICE_FILS.toString()} fils)`,
  );

  // 3. AffectionPlan — append a fresh row (never deleteMany).
  const plan = await prisma.affectionPlan.create({
    data: {
      parcelId: parcel.id,
      source:
        `Abu Dhabi Real Estate Centre Affection Plan / DCR (EPSG:32640) — ` +
        `Yas Island, sector ${SECTOR}, plot ${PLOT_NUMBER}`,
      plotNumber: PLOT_NUMBER,
      projectName: `Yas Island — ${COMMUNITY}, Plot ${PLOT_NUMBER}`,
      community: COMMUNITY,
      masterDeveloper: 'Aldar Properties',

      plotAreaSqm: PLOT_AREA_SQM,
      plotAreaSqft: PLOT_AREA_SQFT,
      maxGfaSqm: MAX_GFA_SQM,
      maxGfaSqft: MAX_GFA_SQFT,

      maxHeightCode: MAX_HEIGHT_CODE,
      maxFloors: MAX_FLOORS,
      maxHeightMeters: MAX_HEIGHT_M,
      far: FAR,

      setbacks: [
        { side: 'front', building: SETBACK_FRONT_M, podium: SETBACK_FRONT_M },
        { side: 'rear', building: SETBACK_REAR_M, podium: SETBACK_REAR_M },
        { side: 'left', building: SETBACK_SIDE_M, podium: SETBACK_SIDE_M },
        { side: 'right', building: SETBACK_SIDE_M, podium: SETBACK_SIDE_M },
      ] as unknown as Prisma.InputJsonValue,

      landUseMix: [
        {
          // Canonical ZAAHI land-use category (1 of 9).
          category: 'RESIDENTIAL',
          sub: 'MULTI RESIDENTIAL UNIT (INVESTMENT)',
          code: 'MRU',
          areaSqm: RESIDENTIAL_GFA_SQM,
        },
        {
          // Mix includes ground-floor retail — but the dominant use stays
          // RESIDENTIAL (retail is < 2% of GFA), so the legend colour is
          // still yellow. We log the sub-mix here for the record.
          category: 'RESIDENTIAL',
          sub: 'ANCILLARY RETAIL',
          code: 'RET',
          areaSqm: RETAIL_GFA_SQM,
        },
      ] as unknown as Prisma.InputJsonValue,

      raw: {
        city: CITY,
        emirate: EMIRATE,
        district: DISTRICT,
        community: COMMUNITY,
        sector: SECTOR,
        plotNumber: PLOT_NUMBER,
        landUseDescription: LAND_USE_TEXT,
        far: FAR,
        gfa: {
          totalSqm: MAX_GFA_SQM,
          residentialSqm: RESIDENTIAL_GFA_SQM,
          retailSqm: RETAIL_GFA_SQM,
        },
        heightProfile: {
          code: MAX_HEIGHT_CODE,
          meters: MAX_HEIGHT_M,
          basements: 2,
          aboveGradeFloors: 11, // G + 10 upper
        },
        units: {
          total: UNITS_TOTAL,
        },
        parking: PARKING_DESC,
        groundFloorCoveragePct: GROUND_COVERAGE_PCT,
        setbacksMeters: {
          front: SETBACK_FRONT_M,
          rear: SETBACK_REAR_M,
          side: SETBACK_SIDE_M,
        },
      } as unknown as Prisma.InputJsonValue,

      // > 10 floors → ZAAHI Signature tiering will draw podium + body + crown.
      buildingStyle: 'SIGNATURE',

      notes:
        `Yas Island, ${COMMUNITY}, sector ${SECTOR}. ${LAND_USE_TEXT}. ` +
        `Plot area ${PLOT_AREA_SQM} m², FAR ${FAR}, total GFA ${MAX_GFA_SQM} m² ` +
        `(residential ${RESIDENTIAL_GFA_SQM} + retail ${RETAIL_GFA_SQM}). ` +
        `Height ${MAX_HEIGHT_CODE} (${MAX_HEIGHT_M} m). ` +
        `${UNITS_TOTAL} units. Parking: ${PARKING_DESC}. ` +
        `Ground-floor coverage ${GROUND_COVERAGE_PCT}%. ` +
        `Setbacks: ${SETBACK_FRONT_M} m front / ${SETBACK_REAR_M} m rear / ${SETBACK_SIDE_M} m side. ` +
        `Price: 32,000,000 AED.`,
    },
  });

  console.log(`  AffectionPlan: created ${plan.id}`);
  console.log(`  land use: RESIDENTIAL / MULTI RESIDENTIAL UNIT → color #FFD700`);
  console.log(`  style:    SIGNATURE (podium + body + crown for ${MAX_FLOORS} floors)`);

  // 4. Verify — re-query and print summary.
  console.log('\n── Verification ──');
  const verify = await prisma.parcel.findUnique({
    where: {
      emirate_district_plotNumber: {
        emirate: EMIRATE,
        district: DISTRICT,
        plotNumber: PLOT_NUMBER,
      },
    },
    select: {
      id: true,
      plotNumber: true,
      emirate: true,
      district: true,
      status: true,
      area: true,
      currentValuation: true,
      latitude: true,
      longitude: true,
    },
  });
  if (verify) {
    console.log(
      `  ${verify.plotNumber}  ${verify.emirate}/${verify.district}  ` +
        `status=${verify.status}  areaSqft=${verify.area?.toFixed(2)}  ` +
        `price=${verify.currentValuation?.toString() ?? 'null'} fils  ` +
        `centroid=${verify.longitude?.toFixed(6)},${verify.latitude?.toFixed(6)}`,
    );
    console.log(
      `  bbox:     lng ${minLng.toFixed(6)}..${maxLng.toFixed(6)}  ` +
        `lat ${minLat.toFixed(6)}..${maxLat.toFixed(6)}`,
    );
    console.log(
      `  computed area (UTM shoelace): ${groundAreaSqm.toFixed(2)} m²  ` +
        `(declared ${PLOT_AREA_SQM} m²)`,
    );
  }

  console.log('\nDone.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
