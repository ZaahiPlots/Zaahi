/**
 * Seed first Abu Dhabi ZAAHI listing — Hidd Al Saadiyat SP1 (SDN7) Plot P28.
 *
 * Client:     (private owner — ZAAHI System placeholder owner used for seed)
 * Location:   Hidd Al Saadiyat, Saadiyat Island, Abu Dhabi
 * Source:     DCR / DMT affection plan PDF (data/DMT_MD_OUT_... P28 DCR)
 *
 * Scheme summary (from DCR):
 *   - Sector SP1 (SDN7), Plot P28
 *   - Land use: RESIDENTIAL - VILLAS (code 1000)
 *   - Site area: 18,008.52 m²  (≈ 193,843 sqft)
 *   - FAR: 0.72, Max GFA: 13,000 m²
 *   - Max plot coverage: 70 %
 *   - Stories: 3 (G+2), Max height: 15.00 m
 *   - 19 villas total
 *   - Asking price: 200,000,000 AED  → 20,000,000,000 fils
 *
 * Plot number: SP1-P28 (Abu Dhabi sector-plot format, NOT DDA 7-digit).
 * Geometry: 24-point polygon in UTM Zone 40N (EPSG:32640) converted to
 *           WGS84 (EPSG:4326). Ring is closed (first point repeated).
 *
 * Idempotent: upserts Parcel on (emirate, district, plotNumber) and
 * appends a fresh AffectionPlan row (never deletes prior rows).
 *
 * Run: npx tsx -r dotenv/config scripts/seed-saadiyat-p28.ts dotenv_config_path=.env.local
 */
import proj4 from 'proj4';
import { UserRole, ParcelStatus, Prisma } from '@prisma/client';
import { prisma } from '../src/lib/prisma';

const SYSTEM_USER_ID = '00000000-0000-0000-0000-00000000zaah';
const SYSTEM_EMAIL = 'system@zaahi.ae';

const PLOT_NUMBER = 'SP1-P28';
const EMIRATE = 'Abu Dhabi';
const DISTRICT = 'HIDD AL SAADIYAT';

const PRICE_AED = 200_000_000;
const PRICE_FILS = BigInt(PRICE_AED) * BigInt(100); // 20,000,000,000 fils

// ── Plot points from the DCR (UTM Zone 40N, EPSG:32640) ──
// The DCR's header reads "NORTHING  EASTING" but the column values are
// swapped: first column (~242k) is the Easting, second column (~2.71M)
// is the Northing for UTM 40N in Abu Dhabi. Verified: converting (242677,
// 2719285) lands at 24.566°N, 54.459°E — Hidd Al Saadiyat, Saadiyat Island.
const UTM_POINTS: Array<[number, number]> = [
  [242676.987, 2719285.402],   // 1
  [242695.47, 2719264.316],    // 2
  [242703.377, 2719255.295],   // 3
  [242705.67, 2719257.3039],   // 4
  [242720.709, 2719270.523],   // 5
  [242780.4, 2719208.82],      // 6
  [242813.186, 2719188.133],   // 7
  [242812.272, 2719167.437],   // 8
  [242776.281, 2719108.083],   // 9
  [242768.157, 2719112.319],   // 10
  [242681.24, 2719157.634],    // 11
  [242665.253, 2719168.444],   // 12
  [242652.751, 2719177.691],   // 13
  [242637.216, 2719190.98],    // 14
  [242635.214, 2719192.953],   // 15
  [242633.508, 2719195.1861],  // 16
  [242632.133, 2719197.637],   // 17
  [242631.114, 2719200.256],   // 18
  [242624.169, 2719222.656],   // 19
  [242631.653, 2719232.435],   // 20
  [242638.641, 2719242.007],   // 21
  [242645.186, 2719251.887],   // 22
  [242655.266, 2719263.545],   // 23
  [242665.874, 2719274.725],   // 24
];

// Register UTM 40N projection so proj4 can convert to WGS84 (EPSG:4326).
proj4.defs('EPSG:32640', '+proj=utm +zone=40 +datum=WGS84 +units=m +no_defs');
const utmToWgs = proj4('EPSG:32640', 'EPSG:4326');

function utmToLngLat([e, n]: [number, number]): [number, number] {
  const [lng, lat] = utmToWgs.forward([e, n]);
  return [lng, lat];
}

// Convert all 24 points, then close the ring for GeoJSON.
const plotRing: number[][] = UTM_POINTS.map(utmToLngLat);
plotRing.push(plotRing[0]);

const plotGeometry: GeoJSON.Polygon = {
  type: 'Polygon',
  coordinates: [plotRing],
};

// Centroid for parcel.lat / lng (simple average — sufficient for a map pin).
const centroidLng =
  plotRing.slice(0, -1).reduce((s, p) => s + p[0], 0) / (plotRing.length - 1);
const centroidLat =
  plotRing.slice(0, -1).reduce((s, p) => s + p[1], 0) / (plotRing.length - 1);

// ── DCR facts ──
const PLOT_AREA_SQM = 18_008.52;
const PLOT_AREA_SQFT = Math.round(PLOT_AREA_SQM * 10.7639 * 100) / 100; // 193,842.49

const MAX_GFA_SQM = 13_000;
const MAX_GFA_SQFT = Math.round(MAX_GFA_SQM * 10.7639 * 100) / 100;

const FAR = 0.72;
const MAX_HEIGHT_M = 15.0;
const MAX_FLOORS = 3; // G+2
const NUM_VILLAS = 19;
const MAX_PLOT_COVERAGE_PCT = 70;

async function main() {
  // Bounding box for the converted polygon — printed so the caller can
  // confirm the geometry lands on Saadiyat Island before any DB writes.
  const lngs = plotRing.map((p) => p[0]);
  const lats = plotRing.map((p) => p[1]);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);

  console.log(`Seeding plot ${PLOT_NUMBER} — ${DISTRICT}, ${EMIRATE}`);
  console.log(`  bbox:     lng ${minLng.toFixed(6)}..${maxLng.toFixed(6)}  lat ${minLat.toFixed(6)}..${maxLat.toFixed(6)}`);
  console.log(`  centroid: ${centroidLng.toFixed(6)}, ${centroidLat.toFixed(6)}`);
  console.log(`  area:     ${PLOT_AREA_SQM} m² (${PLOT_AREA_SQFT} sqft)`);
  console.log(`  GFA:      ${MAX_GFA_SQM} m²  FAR ${FAR}  G+${MAX_FLOORS - 1}  ${MAX_HEIGHT_M} m`);
  console.log(`  villas:   ${NUM_VILLAS}`);
  console.log(`  price:    ${PRICE_AED.toLocaleString('en-US')} AED`);

  // Sanity check — must be somewhere on Saadiyat Island (24.5-24.6°N, 54.4-54.5°E).
  if (centroidLat < 24.5 || centroidLat > 24.6 || centroidLng < 54.4 || centroidLng > 54.5) {
    throw new Error(
      `Polygon centroid ${centroidLat.toFixed(4)}, ${centroidLng.toFixed(4)} is NOT in Hidd Al Saadiyat — refusing to seed.`,
    );
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

  // 2. Parcel — upsert on (emirate, district, plotNumber).
  //    Per CLAUDE.md: currentValuation is set manually. Founder provided
  //    the 200M AED asking price for this listing, so set it on CREATE
  //    and leave it untouched on UPDATE (owner can change later via UI).
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
      // Refresh geometry + area from the DCR; do NOT touch
      // currentValuation or status on re-runs (those are manual-only).
      area: PLOT_AREA_SQFT,
      latitude: centroidLat,
      longitude: centroidLng,
      geometry: plotGeometry as unknown as Prisma.InputJsonValue,
    },
  });

  console.log(
    existing
      ? `  Parcel: updated ${parcel.id} (status=${parcel.status}, kept price)`
      : `  Parcel: created ${parcel.id} (LISTED, ${PRICE_AED.toLocaleString('en-US')} AED)`,
  );

  // 3. AffectionPlan — append a fresh row (never deleteMany, per CLAUDE.md).
  //    The app always reads the latest (orderBy fetchedAt desc, take 1).
  const plan = await prisma.affectionPlan.create({
    data: {
      parcelId: parcel.id,
      source: 'DCR: Hidd Al Saadiyat DMT Update — SP1 (SDN7) P28',
      plotNumber: PLOT_NUMBER,
      projectName: 'Hidd Al Saadiyat SP1 — Plot P28',
      community: 'Hidd Al Saadiyat',
      masterDeveloper: 'Modon / Aldar (Hidd Al Saadiyat DMT)',

      plotAreaSqm: PLOT_AREA_SQM,
      plotAreaSqft: PLOT_AREA_SQFT,
      maxGfaSqm: MAX_GFA_SQM,
      maxGfaSqft: MAX_GFA_SQFT,

      maxHeightCode: `G+${MAX_FLOORS - 1}`,
      maxFloors: MAX_FLOORS,
      maxHeightMeters: MAX_HEIGHT_M,
      far: FAR,

      // DCR doesn't give per-side setbacks explicitly — leave null so the
      // renderer falls back to the land-use default (3 m for villas).
      setbacks: Prisma.JsonNull,

      landUseMix: [
        {
          category: 'RESIDENTIAL',
          sub: 'VILLAS',
          code: '1000',
          areaSqm: PLOT_AREA_SQM,
        },
      ] as unknown as Prisma.InputJsonValue,

      // Null / SIGNATURE = default ZAAHI tiered renderer. With 3 floors
      // (≤4) the renderer draws a single podium — exactly what you want
      // for a low-rise villa cluster. Do NOT use FLAT (that's for offices).
      buildingStyle: 'SIGNATURE',

      notes:
        `Hidd Al Saadiyat DMT Update — Sector SP1 (SDN7), Plot P28. ` +
        `${NUM_VILLAS} villas (G+2, ${MAX_HEIGHT_M} m). ` +
        `Land use 1000: RESIDENTIAL - VILLAS. ` +
        `Max plot coverage ${MAX_PLOT_COVERAGE_PCT}%. ` +
        `Source: Abu Dhabi DCR affection plan PDF.`,
    },
  });

  console.log(`  AffectionPlan: created ${plan.id}`);
  console.log(`  land use: RESIDENTIAL - VILLAS (code 1000) → color #FFD700`);
  console.log(`  style:    SIGNATURE (podium-only tier for G+2)`);
  console.log('\nDone.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
