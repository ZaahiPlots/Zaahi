/**
 * Seed first Al Ain (Abu Dhabi emirate) ZAAHI listing — Plot 16-3-018-2,
 * Al Jahili zone, AL MARAYEGH sector.
 *
 * Source:   Abu Dhabi Real Estate Centre "Land Site Plan" (مخطط الجاهلي.pdf)
 *           issued 2026/01/11, application 2026/27165.
 * Client:   8 co-owners (Aldhaheri family, inheritance registration).
 * Terms:    Joint Venture only. No public price — `currentValuation = null`.
 * Plot:     Land No. 2, Plot Address 16-3-018-2, Allocation: Investment,
 *           Land Use: Investment - Permanent Residential (R12-A),
 *           Base District A-R12, Overlay AAM_R12-A/UGB, Constructed.
 * Area:     4,260.00 m² / 45,854.07 ft² (declared on PDF).
 *
 * Projection — CRITICAL:
 *   Al Ain is in Abu Dhabi emirate; the Abu Dhabi Real Estate Centre
 *   affection plan uses TRUE UTM Zone 40N (EPSG:32640), NOT the
 *   Dubai Local TM (EPSG:3997) that Trakhees/DM plans use. Grid ticks
 *   on the plan read "373715" (Easting) and "2678200" (Northing),
 *   projecting to ~24.21 N, 55.76 E — Al Ain city, eastern Abu Dhabi.
 *
 * Geometry extraction — pixel-calibration method (same as Bu Kadra 611-7209):
 *   PDF has no coordinate text layer. Procedure:
 *     1. `pdftoppm -r 800 …` rendered the plot page as a 9355×6615 PNG.
 *     2. Pink-fill mask located the plot 2 rectangle at pixel bbox
 *        x ∈ [1404, 3741], y ∈ [1192, 3004] (upper part of the parcel).
 *     3. Grid crosshair (373715 E, 2678200 N) detected at pixel (2327, 2312).
 *     4. Scales derived from labeled sides: 42.7 m E-W (upper width)
 *        → 54.73 px/m; 68.8 m N-S (upper height) → 26.34 px/m.
 *        (Vertical and horizontal PDF scales differ — the drawing is not
 *         uniformly scaled, common on Abu Dhabi affection plans.)
 *     5. Upper-plot corners in UTM:
 *            NW (373698.14, 2678242.52)
 *            NE (373740.84, 2678242.52)
 *            SE (373740.84, 2678173.72)
 *            SW (373698.14, 2678173.72)
 *        Upper area: 42.70 × 68.80 = 2937.76 m²  (only part of 4260).
 *     6. The declared parcel area (4,260 m²) equals 42.7 × 99.77. The
 *        PDF shows the plot as one body with an internal visual strip;
 *        we extend the rectangle 31.0 m further south to match the
 *        declared registry area:
 *            NW (373698.14, 2678242.52)
 *            NE (373740.84, 2678242.52)
 *            SE (373740.84, 2678142.72)
 *            SW (373698.14, 2678142.72)
 *        Combined area: 42.70 × 99.80 = 4261.46 m²  (+0.03 % of declared).
 *     7. Projected to WGS84 — centroid 55.7565 E, 24.2114 N (Al Ain). ✓
 *
 * Idempotent: upserts Parcel on (emirate, district, plotNumber) and
 * appends a fresh AffectionPlan row (never deletes prior rows, per CLAUDE.md).
 *
 * Price rule — per CLAUDE.md:
 *   JV-only → currentValuation = null on create. On re-run we never touch
 *   the price (owner may have set a value via UI).
 *
 * Run: npx tsx -r dotenv/config scripts/seed-al-ain-jahili.ts dotenv_config_path=.env.local
 */
import proj4 from 'proj4';
import { UserRole, ParcelStatus, Prisma } from '@prisma/client';
import { prisma } from '../src/lib/prisma';

const SYSTEM_USER_ID = '00000000-0000-0000-0000-00000000zaah';
const SYSTEM_EMAIL = 'system@zaahi.ae';

const PLOT_NUMBER = '16-3-018-2';
const EMIRATE = 'Abu Dhabi'; // same string convention as seed-saadiyat-p28.ts
const DISTRICT = 'AL JAHILI';
const COMMUNITY = 'AL MARAYEGH';
const CITY = 'Al Ain';
const LAND_NO = '2';
const ROAD_NAME = 'ROAD-18';
const BASE_DISTRICT = 'A-R12';
const OVERLAY_DISTRICT = 'AAM_R12-A, UGB';
const ALLOCATION_TYPE = 'Investment';
const LAND_USE_TEXT = 'Investment - Permanent Residential (R12-A)';
const CONSTRUCTION_STATUS = 'Constructed';
const ALLOCATION_DATE = '1970-05-10';
const APPLICATION_NUMBER = '2026/27165';
const APPLICATION_DATE = '2026-01-11';

const PLOT_AREA_SQM = 4_260.0;
const PLOT_AREA_SQFT = 45_854.07; // per PDF (we keep the PDF's own conversion)

// JV only — no direct sale. Per CLAUDE.md, `currentValuation` stays null.
const PRICE_FILS: bigint | null = null;

// Building stats — per R12-A residential guidelines (low-rise residential,
// existing building). No affection-plan-level FAR/GFA is given on this
// plan (it is a site-plan, not a DCR), so we leave those null.
const MAX_HEIGHT_M = 14; // G+3 envelope assumed for R12-A low-rise
const MAX_FLOORS = 4; // G+3
const MAX_HEIGHT_CODE = 'G+3';

// ── Projection: EPSG:32640 (UTM Zone 40N) → EPSG:4326 (WGS84) ──
proj4.defs('EPSG:32640', '+proj=utm +zone=40 +datum=WGS84 +units=m +no_defs');
const utmToWgs = proj4('EPSG:32640', 'EPSG:4326');

function utmToLngLat([e, n]: [number, number]): [number, number] {
  const [lng, lat] = utmToWgs.forward([e, n]);
  return [lng, lat];
}

// Pixel-calibrated UTM corners (see header comment for derivation).
const UTM_POINTS: Array<[number, number]> = [
  [373698.14, 2678242.52], // NW
  [373740.84, 2678242.52], // NE
  [373740.84, 2678142.72], // SE
  [373698.14, 2678142.72], // SW
];

// Convert and close the ring for GeoJSON.
const plotRing: number[][] = UTM_POINTS.map(utmToLngLat);
plotRing.push(plotRing[0]);

const plotGeometry: GeoJSON.Polygon = {
  type: 'Polygon',
  coordinates: [plotRing],
};

// Simple centroid (mean) — enough for a map pin.
const centroidLng =
  plotRing.slice(0, -1).reduce((s, p) => s + p[0], 0) / (plotRing.length - 1);
const centroidLat =
  plotRing.slice(0, -1).reduce((s, p) => s + p[1], 0) / (plotRing.length - 1);

// Shoelace area in UTM metres (source CRS) — real ground area for sanity check.
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
  console.log(
    `  bbox:     lng ${minLng.toFixed(6)}..${maxLng.toFixed(6)}  lat ${minLat.toFixed(6)}..${maxLat.toFixed(6)}`,
  );
  console.log(`  centroid: ${centroidLng.toFixed(6)}, ${centroidLat.toFixed(6)}`);
  console.log(
    `  area:     polygon=${groundAreaSqm.toFixed(2)} m² (declared ${PLOT_AREA_SQM} m², diff ${((groundAreaSqm - PLOT_AREA_SQM) / PLOT_AREA_SQM * 100).toFixed(2)}%)`,
  );
  console.log(`  land use: ${LAND_USE_TEXT}`);
  console.log(`  price:    JV only — currentValuation = null`);

  // Sanity — Al Ain city bounds: 24.1..24.3 N, 55.6..55.8 E.
  if (
    centroidLat < 24.1 ||
    centroidLat > 24.3 ||
    centroidLng < 55.6 ||
    centroidLng > 55.8
  ) {
    throw new Error(
      `Polygon centroid ${centroidLat.toFixed(4)}, ${centroidLng.toFixed(4)} is NOT in Al Ain — refusing to seed.`,
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
      currentValuation: PRICE_FILS, // null — JV only
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
      : `  Parcel: created ${parcel.id} (LISTED, NO PRICE — JV only)`,
  );

  // 3. AffectionPlan — append a fresh row (never deleteMany).
  const plan = await prisma.affectionPlan.create({
    data: {
      parcelId: parcel.id,
      source:
        `Abu Dhabi Real Estate Centre Land Site Plan (EPSG:32640) — ` +
        `App #${APPLICATION_NUMBER} / ${APPLICATION_DATE}`,
      plotNumber: PLOT_NUMBER,
      projectName: `Al Ain — Al Jahili, Plot ${LAND_NO} (${PLOT_NUMBER})`,
      community: COMMUNITY,
      masterDeveloper: 'Abu Dhabi Real Estate Centre (ADREC)',

      plotAreaSqm: PLOT_AREA_SQM,
      plotAreaSqft: PLOT_AREA_SQFT,
      // Site plan doesn't state a max GFA or FAR — leave null.
      maxGfaSqm: null,
      maxGfaSqft: null,

      maxHeightCode: MAX_HEIGHT_CODE,
      maxFloors: MAX_FLOORS,
      maxHeightMeters: MAX_HEIGHT_M,
      far: null,

      // No per-side setbacks in source → land-use defaults kick in (residential).
      setbacks: Prisma.JsonNull,

      landUseMix: [
        {
          // One of the 9 canonical ZAAHI land-use categories.
          category: 'RESIDENTIAL',
          sub: 'PERMANENT RESIDENTIAL (R12-A)',
          code: 'R12-A',
          areaSqm: PLOT_AREA_SQM,
        },
      ] as unknown as Prisma.InputJsonValue,

      // Store source-specific metadata we don't have columns for.
      raw: {
        city: CITY,
        zone: DISTRICT,
        sector: COMMUNITY,
        roadName: ROAD_NAME,
        landNo: LAND_NO,
        plotAddress: PLOT_NUMBER,
        constructionStatus: CONSTRUCTION_STATUS,
        allocationType: ALLOCATION_TYPE,
        landUseDescription: LAND_USE_TEXT,
        baseDistrict: BASE_DISTRICT,
        overlayDistrict: OVERLAY_DISTRICT,
        allocationDate: ALLOCATION_DATE,
        applicationNumber: APPLICATION_NUMBER,
        applicationDate: APPLICATION_DATE,
        jointVentureOnly: true,
        ownershipType: 'Inheritance Registration',
        coOwners: 8,
        ownerFamily: 'Aldhaheri',
      } as unknown as Prisma.InputJsonValue,

      // Low-rise residential (existing building, R12-A) → SIGNATURE style.
      // With maxFloors=4 the renderer draws a single podium (ZAAHI Signature),
      // same as seed-saadiyat-p28.ts for a low-rise plot.
      buildingStyle: 'SIGNATURE',

      notes:
        'Joint Venture only. 8 co-owners (Aldhaheri family, inheritance ' +
        'registration). Existing building on plot. Al Ain City — third city ' +
        'for ZAAHI. ' +
        `${LAND_USE_TEXT}. Construction status: ${CONSTRUCTION_STATUS}. ` +
        `Zone ${DISTRICT}, sector ${COMMUNITY}, road ${ROAD_NAME}. ` +
        `Land No. ${LAND_NO}, plot ${PLOT_NUMBER}. ` +
        `Source: ADREC Land Site Plan, app #${APPLICATION_NUMBER}.`,
    },
  });

  console.log(`  AffectionPlan: created ${plan.id}`);
  console.log(`  land use: RESIDENTIAL / PERMANENT RESIDENTIAL (R12-A) → color #FFD700`);
  console.log(`  style:    SIGNATURE (podium-only tier for G+3)`);

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
      geometry: true,
    },
  });
  if (verify) {
    console.log(
      `  ${verify.plotNumber}  ${verify.emirate}/${verify.district}  ` +
        `status=${verify.status}  areaSqft=${verify.area}  ` +
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
