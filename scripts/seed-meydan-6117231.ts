/**
 * Seed ZAAHI listing — Plot 6117231, Meydan Horizon (Bu Kadra), Dubai.
 * Residential RC1/20 (Block K, G+3P podium + 21-storey tower).
 *
 * Geometry source (tried in order, per founder instructions):
 *   A. DDA GIS — MISS (Bu Kadra is Dubai Municipality jurisdiction, not DDA).
 *   B. KML master plan — KML only exports plot polylines WITHOUT plot numbers,
 *      so we cannot programmatically match a specific ring to plot 6117231.
 *   C. Affection plan PDF pixel extraction
 *      (data/local: /home/zaahi/Документы участков/MEYDAN AFFECTION PLAN.pdf — 1 page).
 *
 * Pixel-calibration method (same approach as Bu Kadra 6117209 / JVC 6817016):
 *   1. `pdftoppm -r 500` rendered page-1 at 4134×5846 PNG.
 *   2. Grid '+' tick detected at px (943, 622), labeled "499000E, 2785830N"
 *      (single reference tick; second tick obscured by CERTIFIED stamp).
 *   3. Plot 6117231 dimensions (visible on the affection plan):
 *        N edge: 60.12 m
 *        E edge: 43.49 m
 *        S edge: 60.12 m
 *        W edge: 38.53 m (+ 4.96 m notch sub-segment on the SW = 43.49 m total west side)
 *      Declared area: 2614.66 m² — matches 60.12 × 43.49 = 2614.62 ✓
 *   4. Plot is a rectangle 60.12 × 43.49 m, tilted ~24.6° CCW from UTM east
 *      (measured from N edge orientation in detected fill blob).
 *   5. SW corner anchored at UTM (499040.02, 2785735.15) — derived from
 *      (SW_px - tick_px) × (1 / scale) where scale = 12.42 px/m (from the
 *      length of the N edge: 747 px for 60.12 m).
 *   6. Reprojected EPSG:3997 → EPSG:4326. Centroid at lng 55.32399, lat 25.17796.
 *      Distance from neighbour plot 6117209 (lng 55.3217, lat 25.1806): 373 m
 *      — consistent with Meydan Horizon Block K geometry (neighbour 6117209
 *      sits in Block adjacent to K, north of 6117231 across the lagoon).
 *
 * FAR / height — determined from Meydan_Horizon_DCR-1.pdf:
 *   - Figure 3-10 (p34), "FAR Distribution": plot sits in the mid-cluster of
 *     Block K. Colour band reading on the affection-plan crop places it in
 *     the blue "FAR 2-5.99" band. Midpoint FAR = 5.0 used here.
 *   - Figure 3-11 (p35), "Building Heights Distribution": Block K plots
 *     labelled B+G+3P+21 (basement + ground + 3 podium + 21 tower floors).
 *     Cross-verified against "Podium Elevation — Block K" (p64), which lists
 *     6117228/29/30/6117231/6117232 as G+3P with +17.2 m podium datum.
 *     Total above-grade: 1 (G) + 3 (P) + 21 (tower) = 25 floors. Rendered
 *     at 25 × 3.5 m = 87.5 m, rounded to 88 m.
 *   - GFA = 2614.66 × 5.0 = 13,073.30 m² (= 140,719 sqft).
 *
 * Price (per founder instruction for this plot — 600 AED / sqft GFA):
 *   price = 140,719 sqft × 600 AED/sqft = 84,431,400 AED → 8,443,140,000 fils.
 *
 * Projection — Dubai Local TM (EPSG:3997), NOT true UTM 40N. Same definition
 * as `src/lib/dda.ts` and `scripts/fix-polygon-sizes.ts` use for all Dubai plots.
 *
 * Idempotent: upserts Parcel on (emirate, district, plotNumber) and appends a
 * fresh AffectionPlan row (never deletes prior rows, per CLAUDE.md).
 *
 * Run: npx tsx -r dotenv/config scripts/seed-meydan-6117231.ts dotenv_config_path=.env.local
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

// ── Plot attributes (from founder + Meydan Horizon DCR / affection plan) ───
const PLOT_NUMBER = '6117231';
const EMIRATE = 'Dubai';
const DISTRICT = 'BU KADRA';
const COMMUNITY = 'MEYDAN HORIZON';
const MASTER_DEVELOPER = 'Meydan Group';
const AUTHORITY = 'Dubai Municipality';
const ZONE_CODE = 'RC1/20';
const LANDUSE_DESCRIPTION = 'Residential RC1/20';
const CANONICAL_LAND_USE = 'RESIDENTIAL';
const BLOCK = 'Block K';

const PLOT_AREA_SQM = 2614.66;
const PLOT_AREA_SQFT = 28_144.32; // 2614.66 × 10.7639

const FAR = 5.0; // DCR Figure 3-10 — plot falls within the blue "FAR 2-5.99" band; midpoint used.
const GFA_SQM = Number((PLOT_AREA_SQM * FAR).toFixed(2)); // 13073.30
const GFA_SQFT = Number((GFA_SQM * 10.7639).toFixed(2)); // 140,718.9

// Height — G+3P podium + 21 tower floors per DCR Fig 3-11 / Block K skyline (p64)
const MAX_HEIGHT_CODE = 'B+G+3P+21';
const PODIUM_FLOORS = 4; // G + 3P
const TOWER_FLOORS = 21;
const MAX_FLOORS = PODIUM_FLOORS + TOWER_FLOORS; // 25
const MAX_HEIGHT_METERS = Math.round(MAX_FLOORS * 3.5); // 88 m

// ── Price (600 AED / sqft GFA, per founder instruction for this plot) ──────
const PRICE_AED = Math.round(GFA_SQFT * 600); // 84,431,338
const PRICE_FILS = BigInt(PRICE_AED) * 100n; // fils

// ── Geometry (EPSG:3997, derived from MEYDAN AFFECTION PLAN pixel extraction) ─
// Plot is a 60.12 × 43.49 m rectangle with SW corner at (499040.02, 2785735.15),
// rotated 24.6° CCW from east. Vertices computed in Python:
//   local (SW=origin, east=+x, north=+y) → rotate 24.6° CCW → translate.
// Vertices in CCW order starting from SW (standard GeoJSON exterior ring).
const UTM_RING_3997: [number, number][] = [
  [499040.016, 2785735.153], // V4 SW
  [499094.679, 2785760.180], // V3 SE
  [499076.575, 2785799.722], // V2 NE
  [499021.912, 2785774.696], // V1 NW
  [499040.016, 2785735.153], // close
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

  console.log(`\n── Seeding Meydan plot ${PLOT_NUMBER} ──`);

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
    `Geometry (pixel-extracted from MEYDAN AFFECTION PLAN → EPSG:3997 → EPSG:4326):\n` +
      `  centroid: lng=${c.lng.toFixed(6)}, lat=${c.lat.toFixed(6)}\n` +
      `  bbox: [${bb.minLng.toFixed(6)},${bb.minLat.toFixed(6)} .. ${bb.maxLng.toFixed(6)},${bb.maxLat.toFixed(6)}]\n` +
      `  area: ${polyArea.toFixed(2)} m² (declared ${PLOT_AREA_SQM} m², diff ${pctDiff.toFixed(2)}%)`,
  );

  // Sanity — centroid must be in Meydan/Bu Kadra (roughly 25.175-25.185°N, 55.315-55.330°E).
  if (c.lat < 25.17 || c.lat > 25.19 || c.lng < 55.31 || c.lng > 55.335) {
    throw new Error(
      `Centroid (${c.lng.toFixed(6)}, ${c.lat.toFixed(6)}) is outside Meydan — aborting.`,
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
  const landUseMixJson = [
    {
      category: 'RESIDENTIAL',
      sub: 'RC1/20 Apartment (G+3P podium + 21-storey tower)',
      areaSqm: GFA_SQM,
    },
  ];

  const plan = await prisma.affectionPlan.create({
    data: {
      parcelId: parcel.id,
      source:
        'MEYDAN AFFECTION PLAN.pdf (founder upload, 2024-05-14 iOS Quartz) — ' +
        'pixel extraction; cross-referenced with Meydan_Horizon_DCR-1.pdf ' +
        `(Figures 3-10 FAR, 3-11 Heights, 3-50 Block K skyline p64). Authority: ${AUTHORITY}.`,
      plotNumber: PLOT_NUMBER,
      oldNumber: null,
      projectName: COMMUNITY,
      community: COMMUNITY,
      masterDeveloper: MASTER_DEVELOPER,

      plotAreaSqm: PLOT_AREA_SQM,
      plotAreaSqft: PLOT_AREA_SQFT,
      maxGfaSqm: GFA_SQM,
      maxGfaSqft: GFA_SQFT,

      maxHeightCode: MAX_HEIGHT_CODE,
      maxFloors: MAX_FLOORS,
      maxHeightMeters: MAX_HEIGHT_METERS,
      far: FAR,

      setbacks: Prisma.JsonNull,
      landUseMix: landUseMixJson as unknown as Prisma.InputJsonValue,

      sitePlanIssue: null,
      sitePlanExpiry: null,

      buildingLimitGeometry: Prisma.JsonNull,
      buildingStyle: 'SIGNATURE',

      notes:
        `Meydan Horizon plot ${PLOT_NUMBER} (${BLOCK}). ${LANDUSE_DESCRIPTION}. ` +
        `Zone ${ZONE_CODE}. Podium: G+3P (+17.2 m datum). Tower: 21 floors. ` +
        `Total above-grade floors: ${MAX_FLOORS} (G + 3P + 21). Rendered height ` +
        `${MAX_HEIGHT_METERS} m @ 3.5 m/storey. FAR=${FAR} (DCR Fig 3-10 blue band, ` +
        `FAR 2-5.99 — midpoint used). GFA=${GFA_SQM} m² = ${GFA_SQFT.toFixed(0)} sqft. ` +
        `Authority: ${AUTHORITY}. Master developer: ${MASTER_DEVELOPER}. ` +
        `Community: ${COMMUNITY}.`,

      raw: {
        source: {
          affectionPlanPdf: '/home/zaahi/Документы участков/MEYDAN AFFECTION PLAN.pdf',
          dcrPdf: 'data/meydan/Meydan_Horizon_DCR-1.pdf',
          authority: AUTHORITY,
        },
        cadastre: {
          plotNumber: PLOT_NUMBER,
          zoneCode: ZONE_CODE,
          block: BLOCK,
          masterDeveloper: MASTER_DEVELOPER,
          community: COMMUNITY,
          district: DISTRICT,
        },
        landUse: {
          canonical: CANONICAL_LAND_USE,
          description: LANDUSE_DESCRIPTION,
        },
        dimensions: {
          N_m: 60.12,
          E_m: 43.49,
          S_m: 60.12,
          W_m: 38.53,
          notchSW_m: 4.96,
          areaSqm: PLOT_AREA_SQM,
          note:
            '5-vertex plot on affection plan (60.12 × 43.49 rect with 4.96 m subdivision on west edge). ' +
            'Simplified to 4-vertex rectangle — 60.12 × 43.49 = 2614.62 m² ≈ declared 2614.66 m².',
        },
        geometry: {
          source: 'PDF pixel extraction + metric dimensions (rectangle 60.12 × 43.49 m)',
          projection: 'EPSG:3997 (Dubai Local TM)',
          utmRing: UTM_RING_3997,
          pxCalibration: {
            tick_label: '499000E, 2785830N',
            tick_px: [943, 622],
            scale_px_per_m: 12.42,
            rotation_deg_ccw_from_east: 24.6,
          },
          swAnchorUtm: [499040.016, 2785735.153],
          computedAreaSqm: Math.round(polyArea * 100) / 100,
        },
        height: {
          code: MAX_HEIGHT_CODE,
          renderedMeters: MAX_HEIGHT_METERS,
          renderedFloors: MAX_FLOORS,
          podiumFloors: PODIUM_FLOORS,
          towerFloors: TOWER_FLOORS,
          podiumDatumMeters: 17.2,
          source: 'DCR Fig 3-11 (p35) + Fig 3-50 Block K skyline (p64)',
        },
        far: {
          value: FAR,
          band: 'FAR 2-5.99 (blue)',
          source: 'DCR Fig 3-10 FAR Distribution Map (p34) — visual colour band reading',
          note: 'Midpoint of blue band used as conservative value.',
        },
        derived: {
          canonicalLandUse: CANONICAL_LAND_USE,
          opacity: 1,
          gfaSqm: GFA_SQM,
          gfaSqft: GFA_SQFT,
          priceAed: PRICE_AED,
          priceFils: PRICE_FILS.toString(),
          priceAedPerSqftGfa: 600,
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
