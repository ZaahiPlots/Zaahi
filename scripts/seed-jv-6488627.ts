/**
 * Seed JV listing — Plot 6488627, Wadi Al Safa 5 (Dubai Land Residence
 * Complex / DLRC sector E, RC-E-059), Dubai. Identified via DDA layer 2
 * by exact match on all 5 owner-supplied parameters (area / GFA / FAR /
 * height / land-use) — research log: research/identify-jv-dlrc-wadi-al-safa-5-2026-05-06.
 *
 * JV-available: `Parcel.openToJV = true`, `Parcel.currentValuation = null`,
 * `Parcel.jvDetails` carries the structured term sheet (JSON-encoded
 * String — JV type / land cost / GFA sharing / landowner share / developer
 * share / commission). The SidePanel renders these under an expandable
 * "JV Terms" section below the price block when openToJV is set.
 *
 * Same DDA pipeline as `seed-jv-3261270.ts` and `seed-dda-batch.ts`:
 *   - DDA GIS BASIC_LAND_BASE/MapServer/2  → polygon, area, GFA, height,
 *                                            land-use, setbacks.
 *   - DDA DIS ?handler=PlotInfo            → community / project / land-use mix.
 *   - DDA DIS MAIN_MAP/MapServer/8         → optional building-limit polygon.
 *
 * Pre-flight per CLAUDE.md "NEVER add duplicate parcels":
 *   - Lookup by plotNumber alone (not by composite key).
 *   - If found → UPDATE openToJV=true + jvDetails=<latest sheet>; never
 *     touches currentValuation / status / area / geometry on update.
 *   - If not  → CREATE with openToJV=true, jvDetails set,
 *     currentValuation=null, status=LISTED.
 *
 * Run: npx tsx -r dotenv/config scripts/seed-jv-6488627.ts dotenv_config_path=.env.local
 */
import { Prisma, ParcelStatus, UserRole } from '@prisma/client';
import { prisma } from '../src/lib/prisma';
import {
  fetchPlotInfoHtml,
  parseAffectionPlan,
  fetchBuildingLimit,
} from '../src/lib/dda';

const SYSTEM_USER_ID = '00000000-0000-0000-0000-00000000zaah';
const SYSTEM_EMAIL = 'system@zaahi.ae';

const PLOT_NUMBER = '6488627';
const EMIRATE = 'Dubai';
const STOREY_M = 4; // DDA convention when only "G+N" is given (no metres).

// Owner-supplied parameters for drift verification (research output).
const EXPECTED = {
  AREA_SQM: 2943.18,
  AREA_SQFT: 31_680.18,
  GFA_SQM: 10_301.13,
  GFA_SQFT: 110_880.44,
  FAR: 3.5,
  MAX_HEIGHT_FLOORS: 'G+11',
  OLD_PLOT_NUMBERS: 'RC-E-059',
} as const;

// Owner JV term sheet — stored as JSON-encoded TEXT in Parcel.jvDetails.
// Numeric splits are mirrored as both m² and sqft so the SidePanel can
// pick whichever the founder prefers for the active locale.
const JV_DETAILS = {
  jvType: 'Zero Upfront',
  landCost: 'Nil',
  gfaSharing: '50/50',
  basis: 'On Approved GFA',
  landownerShareSqm: 5_150.57,
  landownerShareSqft: 55_440.22,
  developerShareSqm: 5_150.57,
  developerShareSqft: 55_440.22,
  commissionPct: 3.0,
  commissionBasis: 'Total Project Cost',
} as const;

// ─── DDA layer 2 (polygon + canonical attributes) ─────────────────────────

interface DdaLayer2Attrs {
  OBJECTID?: number;
  PLOT_NUMBER?: string;
  OLD_PLOT_NUMBERS?: string | null;
  ENTITY_NAME?: string | null;
  DEVELOPER_NAME?: string | null;
  PROJECT_NAME?: string | null;
  LAND_NAME?: string | null;
  AREA_SQM?: number | null;
  AREA_SQFT?: number | null;
  GFA_SQM?: number | null;
  GFA_SQFT?: number | null;
  MAX_HEIGHT_FLOORS?: string | null;
  MAX_HEIGHT_METERS?: number | null;
  MAX_HEIGHT?: string | null;
  HEIGHT_CATEGORY?: string | null;
  CONSTRUCTION_STATUS?: string | null;
  MAIN_LANDUSE?: string | null;
  SUB_LANDUSE?: string | null;
  LANDUSE_DETAILS?: string | null;
  LANDUSE_CATEGORY?: string | null;
  GENERAL_NOTES?: string | null;
  SITEPLAN_ISSUE_DATE?: number | null;
  SITEPLAN_EXPIRY_DATE?: number | null;
  BUILDING_SETBACK_SIDE1?: string | null;
  BUILDING_SETBACK_SIDE2?: string | null;
  BUILDING_SETBACK_SIDE3?: string | null;
  BUILDING_SETBACK_SIDE4?: string | null;
  PODIUM_SETBACK_SIDE1?: string | null;
  PODIUM_SETBACK_SIDE2?: string | null;
  PODIUM_SETBACK_SIDE3?: string | null;
  PODIUM_SETBACK_SIDE4?: string | null;
  [k: string]: unknown;
}

interface DdaLayer2Feature {
  type: 'Feature';
  properties: DdaLayer2Attrs;
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon | null;
}

const LAYER2_URL =
  'https://gis.dda.gov.ae/server/rest/services/DDA/BASIC_LAND_BASE/MapServer/2/query';

async function queryDdaLayer2(plotNumber: string): Promise<DdaLayer2Feature | null> {
  const params = new URLSearchParams({
    where: `PLOT_NUMBER='${plotNumber}'`,
    outFields: '*',
    returnGeometry: 'true',
    outSR: '4326',
    f: 'geojson',
  });
  const r = await fetch(`${LAYER2_URL}?${params}`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`DDA layer2 ${plotNumber}: HTTP ${r.status}`);
  const j = (await r.json()) as { features?: DdaLayer2Feature[] };
  const f = j.features?.[0];
  return f?.geometry ? f : null;
}

function parseFloorsFromHeightCode(code: string | null | undefined): number | null {
  if (!code) return null;
  const m = code.match(/G\s*\+\s*(?:P\s*\+\s*)?(\d+)/i);
  if (m) return parseInt(m[1], 10) + 1;
  const n = parseInt(code, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseSetbackSide(v: string | null | undefined): number | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s || /n\/a|see\s*notes/i.test(s)) return null;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

function extractSetbacks(attrs: DdaLayer2Attrs) {
  const out: Array<{ side: number; building: number | null; podium: number | null }> = [];
  for (let i = 1; i <= 4; i++) {
    const b = parseSetbackSide(attrs[`BUILDING_SETBACK_SIDE${i}`] as string | null);
    const p = parseSetbackSide(attrs[`PODIUM_SETBACK_SIDE${i}`] as string | null);
    if (b != null || p != null) out.push({ side: i, building: b, podium: p });
  }
  return out;
}

type Canonical =
  | 'RESIDENTIAL'
  | 'COMMERCIAL'
  | 'MIXED_USE'
  | 'HOTEL_HOSPITALITY'
  | 'INDUSTRIAL'
  | 'EDUCATIONAL'
  | 'HEALTHCARE'
  | 'AGRICULTURAL'
  | 'FUTURE_DEVELOPMENT';

function deriveCanonical(s: string | null | undefined): Canonical | null {
  if (!s) return null;
  const t = s.toLowerCase();
  const hits = [
    /residential|villa|townhouse|apartment/.test(t),
    /commercial|office|retail|showroom|cbd/.test(t),
    /hotel|hospitality|resort|serviced apartment/.test(t),
    /industrial|warehouse|factory|logistics|storage/.test(t),
    /education|school|university|academy|nursery/.test(t),
    /health|hospital|clinic|medical/.test(t),
    /agriculture|farm/.test(t),
  ].filter(Boolean).length;
  if (hits >= 2 || /mixed/.test(t)) return 'MIXED_USE';
  if (/residential|villa|townhouse|apartment/.test(t)) return 'RESIDENTIAL';
  if (/commercial|office|retail|showroom|cbd/.test(t)) return 'COMMERCIAL';
  if (/hotel|hospitality|resort/.test(t)) return 'HOTEL_HOSPITALITY';
  if (/industrial|warehouse|factory|logistics|storage/.test(t)) return 'INDUSTRIAL';
  if (/education|school|university|academy|nursery/.test(t)) return 'EDUCATIONAL';
  if (/health|hospital|clinic|medical/.test(t)) return 'HEALTHCARE';
  if (/agriculture|farm/.test(t)) return 'AGRICULTURAL';
  if (/future development/.test(t)) return 'FUTURE_DEVELOPMENT';
  return null;
}

function defaultHeightForLandUse(c: Canonical | null): number {
  switch (c) {
    case 'RESIDENTIAL': return 14;
    case 'COMMERCIAL':  return 30;
    case 'MIXED_USE':   return 60;
    case 'HOTEL_HOSPITALITY': return 60;
    case 'INDUSTRIAL':  return 12;
    case 'EDUCATIONAL': return 18;
    case 'HEALTHCARE':  return 24;
    case 'AGRICULTURAL': return 4;
    case 'FUTURE_DEVELOPMENT': return 0;
    default: return 14;
  }
}

function centroidOf(ring: number[][]): { lng: number; lat: number } {
  const pts = ring.slice(0, -1);
  const lng = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const lat = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  return { lng, lat };
}

function polygonAreaSqm(coords: number[][][]): number {
  const ring = coords[0];
  if (!ring || ring.length < 4) return 0;
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

function isoFromEpochMs(ms: number | null | undefined): Date | null {
  if (ms == null) return null;
  return Number.isFinite(ms) ? new Date(ms) : null;
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

// ─── Drift check ──────────────────────────────────────────────────────────

function driftCheck(attrs: DdaLayer2Attrs): { ok: boolean; report: string[] } {
  const report: string[] = [];
  const tol = (a: number, b: number, eps: number) => Math.abs(a - b) <= eps;

  const areaSqm = attrs.AREA_SQM ?? null;
  const areaSqft = attrs.AREA_SQFT ?? null;
  const gfaSqm = attrs.GFA_SQM ?? null;
  const gfaSqft = attrs.GFA_SQFT ?? null;
  const heightCode = attrs.MAX_HEIGHT_FLOORS ?? attrs.MAX_HEIGHT ?? null;
  const oldPlot = attrs.OLD_PLOT_NUMBERS ?? null;

  let ok = true;
  if (areaSqm == null || !tol(areaSqm, EXPECTED.AREA_SQM, 0.5)) {
    ok = false;
    report.push(`  AREA_SQM drift: got ${areaSqm} expected ${EXPECTED.AREA_SQM} (±0.5)`);
  }
  if (areaSqft == null || !tol(areaSqft, EXPECTED.AREA_SQFT, 5)) {
    ok = false;
    report.push(`  AREA_SQFT drift: got ${areaSqft} expected ${EXPECTED.AREA_SQFT} (±5)`);
  }
  if (gfaSqm == null || !tol(gfaSqm, EXPECTED.GFA_SQM, 1)) {
    ok = false;
    report.push(`  GFA_SQM drift: got ${gfaSqm} expected ${EXPECTED.GFA_SQM} (±1)`);
  }
  if (gfaSqft == null || !tol(gfaSqft, EXPECTED.GFA_SQFT, 10)) {
    ok = false;
    report.push(`  GFA_SQFT drift: got ${gfaSqft} expected ${EXPECTED.GFA_SQFT} (±10)`);
  }
  const far =
    gfaSqm != null && areaSqm != null && areaSqm > 0
      ? Math.round((gfaSqm / areaSqm) * 100) / 100
      : null;
  if (far == null || !tol(far, EXPECTED.FAR, 0.05)) {
    ok = false;
    report.push(`  FAR drift: got ${far} expected ${EXPECTED.FAR} (±0.05)`);
  }
  if (heightCode !== EXPECTED.MAX_HEIGHT_FLOORS) {
    ok = false;
    report.push(
      `  MAX_HEIGHT_FLOORS drift: got "${heightCode}" expected "${EXPECTED.MAX_HEIGHT_FLOORS}"`,
    );
  }
  if (oldPlot !== EXPECTED.OLD_PLOT_NUMBERS) {
    ok = false;
    report.push(
      `  OLD_PLOT_NUMBERS drift: got "${oldPlot}" expected "${EXPECTED.OLD_PLOT_NUMBERS}"`,
    );
  }
  return { ok, report };
}

// ─── Main ─────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n── Seeding JV listing — Plot ${PLOT_NUMBER} (DLRC / Wadi Al Safa 5) ──`);

  await ensureSystemUser();

  // 0. Pre-flight duplicate check by plotNumber alone (CLAUDE.md rule).
  const preDups = await prisma.parcel.findMany({
    where: { plotNumber: PLOT_NUMBER },
    select: {
      id: true,
      plotNumber: true,
      emirate: true,
      district: true,
      status: true,
      currentValuation: true,
      openToJV: true,
      jvDetails: true,
      createdAt: true,
    },
  });
  const existed = preDups.length > 0;
  if (existed) {
    console.log(`  [pre-flight] FOUND ${preDups.length} existing row(s):`);
    for (const r of preDups) {
      console.log(
        `    id=${r.id}  ${r.emirate}/${r.district}  status=${r.status}  ` +
          `price=${r.currentValuation?.toString() ?? 'null'}  openToJV=${r.openToJV}  ` +
          `jvDetails=${r.jvDetails ? '<set>' : 'null'}  created=${r.createdAt.toISOString()}`,
      );
    }
    console.log('  Will UPDATE openToJV=true + jvDetails on existing row; no insert, no duplicate.');

    const result = await prisma.parcel.updateMany({
      where: { plotNumber: PLOT_NUMBER },
      data: {
        openToJV: true,
        jvDetails: JSON.stringify(JV_DETAILS),
      },
    });
    console.log(`  [DB] updated ${result.count} row(s) — openToJV=true + jvDetails set.`);
    console.log('\nDone (existed-already path).');
    return;
  }

  console.log(`  [pre-flight] no row with plotNumber=${PLOT_NUMBER} — fresh insert path.`);

  // 1. DDA layer 2 — polygon + canonical attributes.
  const feat = await queryDdaLayer2(PLOT_NUMBER);
  if (!feat || !feat.geometry) {
    throw new Error(
      `DDA layer 2 returned no polygon for ${PLOT_NUMBER} — aborting (no fabricated geometry).`,
    );
  }
  const attrs = feat.properties;

  // 1a. Drift check vs research-output expected values.
  const drift = driftCheck(attrs);
  if (!drift.ok) {
    throw new Error(
      `DDA fetch drifted from research-output expected values — aborting.\n` +
        drift.report.join('\n'),
    );
  }
  console.log('  [drift] DDA fetch matches research output on all 7 verified fields ✓');

  const geomIn = feat.geometry;
  const geometry: GeoJSON.Polygon =
    geomIn.type === 'MultiPolygon'
      ? { type: 'Polygon', coordinates: geomIn.coordinates[0] }
      : geomIn;
  const ring = geometry.coordinates[0];
  const c = centroidOf(ring);
  const polyArea = polygonAreaSqm(geometry.coordinates);

  const ddaAreaSqm = typeof attrs.AREA_SQM === 'number' ? attrs.AREA_SQM : null;
  const ddaAreaSqft = typeof attrs.AREA_SQFT === 'number' ? attrs.AREA_SQFT : null;
  const ddaGfaSqm = typeof attrs.GFA_SQM === 'number' ? attrs.GFA_SQM : null;
  const ddaGfaSqft = typeof attrs.GFA_SQFT === 'number' ? attrs.GFA_SQFT : null;

  const heightCode = attrs.MAX_HEIGHT_FLOORS ?? attrs.MAX_HEIGHT ?? null;
  const maxFloors = parseFloorsFromHeightCode(heightCode);
  const ddaHeightM =
    typeof attrs.MAX_HEIGHT_METERS === 'number' && attrs.MAX_HEIGHT_METERS > 0
      ? attrs.MAX_HEIGHT_METERS
      : null;

  const landUseSource =
    attrs.LANDUSE_DETAILS ??
    attrs.LANDUSE_CATEGORY ??
    attrs.MAIN_LANDUSE ??
    attrs.SUB_LANDUSE ??
    null;
  const landUse = deriveCanonical(landUseSource);
  const heightM =
    ddaHeightM ?? (maxFloors != null ? maxFloors * STOREY_M : defaultHeightForLandUse(landUse));

  const far =
    ddaGfaSqm != null && ddaAreaSqm != null && ddaAreaSqm > 0
      ? Math.round((ddaGfaSqm / ddaAreaSqm) * 100) / 100
      : null;

  console.log(
    `  [DDA layer2] HIT  area_sqm=${ddaAreaSqm} (poly≈${polyArea.toFixed(0)})  ` +
      `centroid=${c.lng.toFixed(6)},${c.lat.toFixed(6)}  ` +
      `height=${heightCode} (${maxFloors ?? '—'} floors, ${heightM} m)  ` +
      `landUse=${landUse ?? 'null'}  FAR=${far ?? '—'}`,
  );

  // 2. DIS PlotInfo — best-effort (community / project / land-use mix).
  let dis: ReturnType<typeof parseAffectionPlan> | null = null;
  try {
    const html = await fetchPlotInfoHtml(PLOT_NUMBER);
    dis = parseAffectionPlan(html);
    console.log(
      `  [DIS PlotInfo] HIT  community=${dis.community ?? 'null'}  ` +
        `projectName=${dis.projectName ?? 'null'}  ` +
        `landUseMix=${dis.landUseMix.length} entries`,
    );
  } catch (e) {
    console.warn(`  [DIS PlotInfo] MISS — ${(e as Error).message}`);
  }

  // 3. DIS MAIN_MAP layer 8 — building limit polygon (token-auth, optional).
  let buildingLimitGeometry: GeoJSON.Polygon | null = null;
  try {
    buildingLimitGeometry = await fetchBuildingLimit(PLOT_NUMBER);
    console.log(
      `  [DIS layer8] ${buildingLimitGeometry ? 'HIT' : 'MISS'}  ` +
        `buildingLimit=${buildingLimitGeometry ? 'polygon' : 'none'}`,
    );
  } catch (e) {
    console.warn(`  [DIS layer8] MISS — ${(e as Error).message}`);
  }

  // 4. Resolve district / community.
  //    Wadi Al Safa 5 is the canonical community per founder; project_name
  //    in DDA is the umbrella "DUBAI LAND RESIDENCE COMPLEX". Use the
  //    founder-specified community as district, fallback to LAND_NAME.
  const district = 'Wadi Al Safa 5';
  const community = dis?.community ?? 'Dubai Land Residence Complex';

  // 5. Build setbacks / landUseMix payloads from DDA.
  const setbacks = extractSetbacks(attrs);
  const landUseMix =
    dis && dis.landUseMix.length > 0
      ? dis.landUseMix
      : [
          {
            category: (attrs.MAIN_LANDUSE ?? landUse ?? 'RESIDENTIAL') as string,
            sub: (attrs.SUB_LANDUSE ?? '') as string,
            areaSqm: ddaAreaSqm,
          },
        ];

  // 6. Plot area in sqft.
  const plotAreaSqm = ddaAreaSqm;
  const plotAreaSqft =
    ddaAreaSqft ??
    (ddaAreaSqm != null ? Math.round(ddaAreaSqm * 10.7639 * 100) / 100 : null);
  if (plotAreaSqft == null) {
    throw new Error(
      `DDA returned polygon but no AREA_SQFT/AREA_SQM for ${PLOT_NUMBER} — aborting.`,
    );
  }

  // 7. Parcel CREATE — currentValuation: null, openToJV: true,
  //    jvDetails: <encoded term sheet>, status: LISTED.
  const parcel = await prisma.parcel.create({
    data: {
      plotNumber: PLOT_NUMBER,
      ownerId: SYSTEM_USER_ID,
      area: plotAreaSqft,
      emirate: EMIRATE,
      district,
      latitude: c.lat,
      longitude: c.lng,
      geometry: geometry as unknown as Prisma.InputJsonValue,
      status: ParcelStatus.LISTED,
      currentValuation: null,
      openToJV: true,
      jvDetails: JSON.stringify(JV_DETAILS),
    },
  });

  console.log(
    `  [DB] created ${parcel.id}  status=${parcel.status}  openToJV=true  ` +
      `currentValuation=null  jvDetails=<set>`,
  );

  // 8. AffectionPlan — append (never deleteMany, per CLAUDE.md).
  const issueDate = isoFromEpochMs(attrs.SITEPLAN_ISSUE_DATE ?? null);
  const expiryDate = isoFromEpochMs(attrs.SITEPLAN_EXPIRY_DATE ?? null);

  const plan = await prisma.affectionPlan.create({
    data: {
      parcelId: parcel.id,
      source:
        'DDA GIS BASIC_LAND_BASE/MapServer/2' +
        (dis ? ' + DIS ?handler=PlotInfo' : '') +
        (buildingLimitGeometry ? ' + MAIN_MAP/8' : ''),
      plotNumber: PLOT_NUMBER,
      oldNumber: attrs.OLD_PLOT_NUMBERS ?? dis?.oldNumber ?? null,
      projectName: attrs.PROJECT_NAME ?? dis?.projectName ?? null,
      community,
      masterDeveloper:
        (attrs.DEVELOPER_NAME && attrs.DEVELOPER_NAME !== '---'
          ? attrs.DEVELOPER_NAME
          : null) ??
        attrs.ENTITY_NAME ??
        dis?.masterDeveloper ??
        null,

      plotAreaSqm,
      plotAreaSqft,
      maxGfaSqm: ddaGfaSqm,
      maxGfaSqft: ddaGfaSqft,

      maxHeightCode: heightCode ?? dis?.maxHeightCode ?? null,
      maxFloors,
      maxHeightMeters: heightM,
      far,

      setbacks:
        setbacks.length > 0
          ? (setbacks as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      landUseMix: landUseMix as unknown as Prisma.InputJsonValue,

      sitePlanIssue: issueDate,
      sitePlanExpiry: expiryDate,

      buildingLimitGeometry: buildingLimitGeometry
        ? (buildingLimitGeometry as unknown as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      buildingStyle: 'SIGNATURE',

      notes: attrs.GENERAL_NOTES ?? dis?.notes ?? null,

      raw: {
        ddaLayer2: attrs as unknown as Record<string, unknown>,
        derived: {
          canonicalLandUse: landUse,
          renderedHeightM: heightM,
          renderedFloors: maxFloors,
          openToJV: true,
        },
        jvDetails: JV_DETAILS,
      } as unknown as Prisma.InputJsonValue,
    },
  });

  console.log(
    `  [DB] AffectionPlan: created ${plan.id}  height=${heightM}m  floors=${maxFloors ?? '—'}  ` +
      `FAR=${far ?? '—'}  landUse=${landUse ?? 'null'}`,
  );

  // 9. Verification.
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
      openToJV: true,
      jvDetails: true,
      latitude: true,
      longitude: true,
    },
  });
  if (verify) {
    console.log(
      `  id=${verify.id}\n` +
        `  ${verify.emirate}/${verify.district}  plot=${verify.plotNumber}  status=${verify.status}\n` +
        `  area=${verify.area} sqft  currentValuation=${verify.currentValuation?.toString() ?? 'null'} fils  ` +
        `openToJV=${verify.openToJV}  jvDetails.length=${verify.jvDetails?.length ?? 0}\n` +
        `  centroid=${verify.longitude?.toFixed(6)},${verify.latitude?.toFixed(6)}`,
    );
  }

  console.log('\nDone (created-fresh path).');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
