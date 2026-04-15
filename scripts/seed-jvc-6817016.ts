/**
 * Seed ZAAHI listing — Plot 6817016, Jumeirah Village Community (JVC),
 * Al Barsha South Fourth, Dubai. Mixed Use (Hotel + Residential + Offices)
 * with 30% of GFA as Retail. 50,000,000 AED. Trakhees jurisdiction.
 *
 * Geometry source (tried in order, per founder instructions):
 *   A. DDA GIS BASIC_LAND_BASE/MapServer/2 (PLOT_NUMBER='6817016')   — MISS
 *      (returned empty featurecollection; JVC is Trakhees/Nakheel, not DDA)
 *   B. DDA DIS ?handler=PlotInfo                                       — MISS
 *      (returns an empty shell — no plot area, no coordinates)
 *   C. PDF pixel detection from official Trakhees site plan
 *      (data/local: /home/zaahi/Документы участков/JVC13AHRG001C_09.09.2024.pdf).
 *
 * Pixel-calibration method (same as Bu Kadra 611-7209 / Al Ain 16-3-018-2):
 *
 *   1. `pdftoppm -r 400` rendered page-1 at 6615×4678 PNG.
 *   2. Site-plan panel cropped to 3307×3041 px (right half of the page).
 *   3. Grid crosshair "+" marks detected via black-pixel template matching
 *      at the four labelled tick positions:
 *        TL px (597, 787)  → 487290 E, 2772030 N
 *        TR px (2694, 787) → 487370 E, 2772030 N
 *        BL px (598, 2361) → 487290 E, 2771970 N
 *        BR px (2695, 2361)→ 487370 E, 2771970 N
 *      Scale: 26.225 px/m (X), 26.233 px/m (Y) — uniform ✓
 *   4. Yellow-fill mask isolated plot 6817016; bbox centroid (1745, 1676) px.
 *   5. Centroid → UTM: E=487333.78, N=2771996.11 (~4 m NE of zone centre).
 *   6. Built axis-aligned 50.00 × 34.00 m rectangle (labeled L values match
 *      declared 1700.00 m² exactly) centered on that UTM centroid:
 *        NW (487308.78, 2772013.11)
 *        NE (487358.78, 2772013.11)
 *        SE (487358.78, 2771979.11)
 *        SW (487308.78, 2771979.11)
 *   7. Reprojected EPSG:3997 → EPSG:4326. Centroid at
 *      lng 55.20781, lat 25.05359 — inside Jumeirah Village Community ✓
 *
 * Projection — Dubai Local TM (EPSG:3997), NOT true UTM 40N. Easting range
 * ~480k–510k confirms it. Same definition as `src/lib/dda.ts` and
 * `scripts/fix-polygon-sizes.ts` use for all Dubai plots.
 *
 * Idempotent: upserts Parcel on (emirate, district, plotNumber) and
 * appends a fresh AffectionPlan row (never deletes prior rows, per CLAUDE.md).
 *
 * Price rule — per CLAUDE.md "Цена участка — ТОЛЬКО ВРУЧНУЮ":
 *   50,000,000 AED → 5_000_000_000 fils. Set on CREATE only.
 *   On re-run currentValuation is left exactly as-is (owner may have edited).
 *
 * Run: npx tsx -r dotenv/config scripts/seed-jvc-6817016.ts dotenv_config_path=.env.local
 */
import proj4 from 'proj4';
import { UserRole, ParcelStatus, Prisma } from '@prisma/client';
import { prisma } from '../src/lib/prisma';

// EPSG:3997 — Dubai Local TM (central meridian 55°20')
proj4.defs(
  'EPSG:3997',
  '+proj=tmerc +lat_0=0 +lon_0=55.33333333333334 +k=1 +x_0=500000 +y_0=0 +ellps=WGS84 +units=m +no_defs',
);

const SYSTEM_USER_ID = '00000000-0000-0000-0000-00000000zaah';
const SYSTEM_EMAIL = 'system@zaahi.ae';

// ── Plot attributes (from Trakhees site plan, founder-provided) ──────────
const PLOT_NUMBER = '6817016';
const EMIRATE = 'Dubai';
const DISTRICT = 'AL BARSHA SOUTH FOURTH';
const COMMUNITY = 'JUMEIRAH VILLAGE COMMUNITY';
const COMMUNITY_NUMBER = '681';
const MASTER_DEVELOPER = 'NAKHEEL';
const DEVELOPER_PLOT_NO = 'JVC13AHRG001C';
const AUTHORITY = 'Trakhees';
const DLD_REF = '19210 72079';
const ISSUE_DATE = '2024-09-09';
const LANDUSE_DESCRIPTION =
  'Mixed Use (Hotel + Residential + Offices) with 30% of GFA as Retail';
const CANONICAL_LAND_USE = 'MIXED_USE'; // per CLAUDE.md 9 canonical categories
const PLOT_AREA_SQM = 1_700.0;
const PLOT_AREA_SQFT = 18_298.66; // 1700 m² × 10.7639
const GFA_SQM = 14_489.52;
const FAR = 8.52;
const MAX_HEIGHT_CODE = 'Unlimited';
const MAX_HEIGHT_METERS = 80; // default tower height per founder instruction
const MAX_FLOORS = Math.round(MAX_HEIGHT_METERS / 3.5); // 23

const COVERAGE_TEXT =
  'GF & Podium: 100% of plot area. Tower: Maximum 50% of plot area.';
const SETBACKS_TEXT =
  'GF & Podium: 0m from all sides. Tower: Along main street = 0-2m, Along adjacent plot JVC13AHRG001B = 6m, Along paseo = 5m, Along internal green area = 8m';
const REMARKS =
  '* Owner/Possessor shall follow Trakhees Regulations & Dubai Building Code in conjunction with Master Developer\'s Guidelines. Trakhees and Master Developer\'s NOC/approvals shall be obtained prior starting construction. * Subject to obtain approval from Dubai Civil Aviation Authority (DCAA).';

// ── Price (ONLY MANUAL — 50M AED) ─────────────────────────────────────────
const PRICE_AED = 50_000_000;
const PRICE_FILS = 5_000_000_000n;

// ── Geometry (EPSG:3997, derived from Trakhees site plan pixel extraction) ─
// Centered on plot centroid at (487333.78, 2771996.11). Exact 50×34 m
// axis-aligned rectangle → 1700.00 m² (matches declared area exactly).
const UTM_RING_3997: [number, number][] = [
  [487308.78, 2772013.11], // NW
  [487358.78, 2772013.11], // NE
  [487358.78, 2771979.11], // SE
  [487308.78, 2771979.11], // SW
  [487308.78, 2772013.11], // close
];

function reprojectRing(ring: [number, number][]): number[][] {
  return ring.map(([x, y]) => proj4('EPSG:3997', 'EPSG:4326', [x, y]));
}

function centroidOf(ring: number[][]): { lng: number; lat: number } {
  const pts = ring.slice(0, -1);
  const lng = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const lat = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  return { lng, lat };
}

function bboxOf(ring: number[][]) {
  const lngs = ring.map((p) => p[0]);
  const lats = ring.map((p) => p[1]);
  return {
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs),
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
  };
}

/** Equirectangular approximation for polygon area in m² (WGS84 ring). */
function polygonAreaSqm(ring: number[][]): number {
  if (ring.length < 4) return 0;
  const latMid = ring.reduce((s, p) => s + p[1], 0) / ring.length;
  const mPerDegLat = 111_320;
  const mPerDegLng = 111_320 * Math.cos((latMid * Math.PI) / 180);
  let a = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    a += x1 * mPerDegLng * (y2 * mPerDegLat) - x2 * mPerDegLng * (y1 * mPerDegLat);
  }
  return Math.abs(a / 2);
}

async function ensureSystemUser() {
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
}

async function main() {
  await ensureSystemUser();

  console.log(`\n── Seeding JVC plot ${PLOT_NUMBER} ──`);

  // Pre-flight duplicate check (by plotNumber alone, per CLAUDE.md).
  const preDups = await prisma.parcel.findMany({
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
  if (preDups.length === 0) {
    console.log(`Pre-flight: plot ${PLOT_NUMBER} not in DB — will CREATE.`);
  } else {
    console.log('Pre-flight — existing row(s):');
    for (const d of preDups) {
      console.log(
        `  ${d.plotNumber}: id=${d.id}  ${d.emirate}/${d.district}  ` +
          `status=${d.status}  price=${d.currentValuation?.toString() ?? 'null'} fils`,
      );
    }
    console.log('Will UPDATE in-place (keeps existing currentValuation + status).');
  }

  // Reproject geometry to WGS84.
  const ring = reprojectRing(UTM_RING_3997);
  const geometry: GeoJSON.Polygon = { type: 'Polygon', coordinates: [ring] };
  const c = centroidOf(ring);
  const bb = bboxOf(ring);
  const polyArea = polygonAreaSqm(ring);
  const pctDiff = ((polyArea - PLOT_AREA_SQM) / PLOT_AREA_SQM) * 100;

  console.log(
    `Geometry (pixel-extracted from Trakhees PDF → EPSG:3997 → EPSG:4326):\n` +
      `  centroid: lng=${c.lng.toFixed(6)}, lat=${c.lat.toFixed(6)}\n` +
      `  bbox: [${bb.minLng.toFixed(6)},${bb.minLat.toFixed(6)} .. ${bb.maxLng.toFixed(6)},${bb.maxLat.toFixed(6)}]\n` +
      `  area: ${polyArea.toFixed(2)} m² (declared ${PLOT_AREA_SQM} m², diff ${pctDiff.toFixed(2)}%)`,
  );

  // Sanity — centroid must be in JVC (roughly 25.06°N, 55.21°E).
  if (
    c.lat < 25.03 ||
    c.lat > 25.09 ||
    c.lng < 55.18 ||
    c.lng > 55.24
  ) {
    throw new Error(
      `Centroid (${c.lng.toFixed(6)}, ${c.lat.toFixed(6)}) is outside JVC — aborting.`,
    );
  }
  if (Math.abs(pctDiff) > 20) {
    throw new Error(
      `Polygon area (${polyArea.toFixed(2)} m²) differs from declared (${PLOT_AREA_SQM} m²) by ${pctDiff.toFixed(1)}% > 20% — aborting.`,
    );
  }

  // Upsert Parcel on (emirate, district, plotNumber).
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
      latitude: c.lat,
      longitude: c.lng,
      geometry: geometry as unknown as Prisma.InputJsonValue,
      status: ParcelStatus.LISTED,
      currentValuation: PRICE_FILS,
    },
    update: {
      // Refresh authoritative geometry + area. Never touch price/status on re-run.
      area: PLOT_AREA_SQFT,
      latitude: c.lat,
      longitude: c.lng,
      geometry: geometry as unknown as Prisma.InputJsonValue,
    },
  });

  console.log(
    existing
      ? `Parcel: updated ${parcel.id} (status=${parcel.status}, kept price=${parcel.currentValuation?.toString() ?? 'null'} fils)`
      : `Parcel: created ${parcel.id} (LISTED, ${PRICE_AED.toLocaleString('en-US')} AED = ${PRICE_FILS} fils)`,
  );

  // AffectionPlan — always append (never deleteMany, per CLAUDE.md).
  const setbacksJson = [
    {
      side: 0,
      description: 'GF & Podium: 0m from all sides',
      building: 0,
      podium: 0,
    },
    {
      side: 1,
      description: 'Tower: Along main street',
      building: 1, // midpoint of 0-2m
      podium: 0,
    },
    {
      side: 2,
      description: 'Tower: Along adjacent plot JVC13AHRG001B',
      building: 6,
      podium: 0,
    },
    { side: 3, description: 'Tower: Along paseo', building: 5, podium: 0 },
    {
      side: 4,
      description: 'Tower: Along internal green area',
      building: 8,
      podium: 0,
    },
  ];

  const landUseMixJson = [
    {
      category: 'MIXED_USE',
      sub: 'Hotel',
      areaSqm: null,
    },
    {
      category: 'MIXED_USE',
      sub: 'Residential',
      areaSqm: null,
    },
    {
      category: 'MIXED_USE',
      sub: 'Offices',
      areaSqm: null,
    },
    {
      category: 'MIXED_USE',
      sub: 'Retail (30% of GFA)',
      areaSqm: Math.round(GFA_SQM * 0.3 * 100) / 100,
    },
  ];

  const plan = await prisma.affectionPlan.create({
    data: {
      parcelId: parcel.id,
      source:
        'Trakhees Site Plan (JVC13AHRG001C_09.09.2024.pdf) — pixel extraction; ' +
        `DLD Ref ${DLD_REF}; authority ${AUTHORITY}`,
      plotNumber: PLOT_NUMBER,
      oldNumber: null,
      projectName: COMMUNITY,
      community: COMMUNITY,
      masterDeveloper: MASTER_DEVELOPER,

      plotAreaSqm: PLOT_AREA_SQM,
      plotAreaSqft: PLOT_AREA_SQFT,
      maxGfaSqm: GFA_SQM,
      maxGfaSqft: Math.round(GFA_SQM * 10.7639 * 100) / 100,

      maxHeightCode: MAX_HEIGHT_CODE, // "Unlimited"
      maxFloors: MAX_FLOORS, // 23 (derived from 80m default tower / 3.5m storey)
      maxHeightMeters: MAX_HEIGHT_METERS, // 80
      far: FAR,

      setbacks: setbacksJson as unknown as Prisma.InputJsonValue,
      landUseMix: landUseMixJson as unknown as Prisma.InputJsonValue,

      sitePlanIssue: new Date(ISSUE_DATE),
      sitePlanExpiry: null,

      buildingLimitGeometry: Prisma.JsonNull,
      buildingStyle: 'SIGNATURE',

      notes:
        `JVC plot ${PLOT_NUMBER}. ${LANDUSE_DESCRIPTION}. ` +
        `Height: ${MAX_HEIGHT_CODE} (rendered at ${MAX_HEIGHT_METERS}m default tower, ` +
        `${MAX_FLOORS} floors @ 3.5m/storey). GFA=${GFA_SQM} m², FAR=${FAR}. ` +
        `Coverage: ${COVERAGE_TEXT}. Setbacks: ${SETBACKS_TEXT}. ` +
        `Authority: ${AUTHORITY}. DLD Ref: ${DLD_REF}. ` +
        `Developer: ${MASTER_DEVELOPER} (plot ${DEVELOPER_PLOT_NO}). ` +
        `Community: ${COMMUNITY} (no. ${COMMUNITY_NUMBER}). ` +
        `Remarks: ${REMARKS}`,

      raw: {
        source: {
          pdf: 'JVC13AHRG001C_09.09.2024.pdf',
          authority: AUTHORITY,
          dldRef: DLD_REF,
          issueDate: ISSUE_DATE,
        },
        developer: {
          masterDeveloper: MASTER_DEVELOPER,
          developerPlotNo: DEVELOPER_PLOT_NO,
        },
        community: {
          name: COMMUNITY,
          number: COMMUNITY_NUMBER,
          district: DISTRICT,
        },
        landUse: {
          canonical: CANONICAL_LAND_USE,
          description: LANDUSE_DESCRIPTION,
          mix: ['Hotel', 'Residential', 'Offices', 'Retail (30% GFA)'],
        },
        geometry: {
          source: 'PDF pixel extraction (labeled 50.00m × 34.00m = 1700 m²)',
          projection: 'EPSG:3997 (Dubai Local TM)',
          utmRing: UTM_RING_3997,
          pxCalibration: {
            TL: { px: [597, 787], utm: [487290, 2772030] },
            TR: { px: [2694, 787], utm: [487370, 2772030] },
            BL: { px: [598, 2361], utm: [487290, 2771970] },
            BR: { px: [2695, 2361], utm: [487370, 2771970] },
          },
          detectedCentroidUtm: [487333.78, 2771996.11],
          computedAreaSqm: Math.round(polyArea * 100) / 100,
        },
        height: {
          code: MAX_HEIGHT_CODE,
          renderedMeters: MAX_HEIGHT_METERS,
          renderedFloors: MAX_FLOORS,
        },
        coverage: {
          groundFloor: 1.0,
          podium: 1.0,
          tower: 0.5,
          description: COVERAGE_TEXT,
        },
        setbacksText: SETBACKS_TEXT,
        remarks: REMARKS,
        derived: {
          canonicalLandUse: CANONICAL_LAND_USE,
          opacity: 1,
        },
      } as unknown as Prisma.InputJsonValue,
    },
  });

  console.log(
    `AffectionPlan: created ${plan.id}  ` +
      `height=${MAX_HEIGHT_METERS}m  floors=${MAX_FLOORS}  FAR=${FAR}  ` +
      `landUse=${CANONICAL_LAND_USE}  gfa=${GFA_SQM} m²`,
  );

  // Verification
  console.log('\n── Verification ──');
  const verify = await prisma.parcel.findUnique({
    where: { id: parcel.id },
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
  if (verify && verify.geometry) {
    const g = verify.geometry as unknown as GeoJSON.Polygon;
    const ring2 = g.coordinates[0];
    const bb2 = bboxOf(ring2);
    const a2 = polygonAreaSqm(ring2);
    console.log(
      `  id=${verify.id}\n` +
        `  ${verify.emirate}/${verify.district}  plot=${verify.plotNumber}  status=${verify.status}\n` +
        `  areaSqft=${verify.area}  currentValuation=${verify.currentValuation?.toString() ?? 'null'} fils\n` +
        `  centroid=${verify.longitude?.toFixed(6)},${verify.latitude?.toFixed(6)}\n` +
        `  polygon bbox=[${bb2.minLng.toFixed(6)},${bb2.minLat.toFixed(6)} .. ${bb2.maxLng.toFixed(6)},${bb2.maxLat.toFixed(6)}]\n` +
        `  computed polygon area=${a2.toFixed(2)} m² (expected ${PLOT_AREA_SQM} m²)`,
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
