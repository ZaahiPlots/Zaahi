/**
 * Seed JV listing — Plot 3261270, SAMA AL JADAF, Al Jadaf, Dubai.
 *
 * Joint-Venture-available DDA listing — `Parcel.openToJV = true`,
 * `currentValuation = null` ("Price on request"). The SidePanel render
 * layer detects this combination and replaces the AED total with
 * "Price on request — JV terms negotiable".
 *
 * Data sources (live DDA fetch — same pipeline as the other 100+ DDA listings):
 *   - DDA GIS BASIC_LAND_BASE/MapServer/2  → polygon, area, GFA, height,
 *                                            land-use, setback flags.
 *   - DDA DIS ?handler=PlotInfo            → community / project / land-use mix.
 *   - DDA DIS MAIN_MAP/MapServer/8         → optional building-limit polygon
 *                                            (best-effort; layer 8 misses for
 *                                            this plot, falls back to ZAAHI
 *                                            default setbacks per land use).
 *
 * Pre-flight per CLAUDE.md "NEVER add duplicate parcels":
 *   - Check for plotNumber=3261270 in `Parcel` (by plotNumber alone, not by
 *     the composite key — a plot must never appear twice even under a
 *     different district label).
 *   - If found → UPDATE openToJV=true (and refresh DDA-authoritative geometry
 *     + area), keep currentValuation/status as-is.
 *   - If not  → CREATE with openToJV=true, currentValuation=null,
 *     status=LISTED.
 *
 * Per CLAUDE.md the price is owner-set only — leaving currentValuation null
 * is the explicit "Price on request" signal for the JV path.
 *
 * Run: npx tsx -r dotenv/config scripts/seed-jv-3261270.ts dotenv_config_path=.env.local
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

const PLOT_NUMBER = '3261270';
const EMIRATE = 'Dubai';
const STOREY_M = 4; // DDA default storey height when only G+N is given

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
  const m = code.match(/G\s*\+\s*(\d+)/i);
  if (m) return parseInt(m[1], 10) + 1; // G + N → N+1 floors
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

// Map DDA strings to the 9 canonical land-use categories (per CLAUDE.md).
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
  // Multi-category strings ("commercial - hospitality - residential") → MIXED_USE.
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
  // Reasonable rendering defaults when DDA gives us only "G+N" with N=0 and
  // no MAX_HEIGHT_METERS. Mid-rise mixed-use → 60 m default.
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

// ─── Geometry helpers ─────────────────────────────────────────────────────

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

// ─── System user ──────────────────────────────────────────────────────────

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

// ─── Main ─────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n── Seeding JV listing — Plot ${PLOT_NUMBER} ──`);

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
          `created=${r.createdAt.toISOString()}`,
      );
    }
    console.log('  Will UPDATE openToJV=true on the existing row(s); no insert, no duplicate.');

    const result = await prisma.parcel.updateMany({
      where: { plotNumber: PLOT_NUMBER },
      data: { openToJV: true },
    });
    console.log(`  [DB] updated ${result.count} row(s) — openToJV=true.`);
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
  const geomIn = feat.geometry;
  const geometry: GeoJSON.Polygon =
    geomIn.type === 'MultiPolygon'
      ? { type: 'Polygon', coordinates: geomIn.coordinates[0] }
      : geomIn;
  const ring = geometry.coordinates[0];
  const c = centroidOf(ring);
  const bb = bboxOf(ring);
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
    `  [DDA layer2] HIT  area_sqm=${ddaAreaSqm ?? '—'} (poly≈${polyArea.toFixed(0)})  ` +
      `bbox=[${bb.minLng.toFixed(5)},${bb.minLat.toFixed(5)} .. ${bb.maxLng.toFixed(5)},${bb.maxLat.toFixed(5)}]  ` +
      `centroid=${c.lng.toFixed(6)},${c.lat.toFixed(6)}  ` +
      `height=${heightCode ?? '—'} (${maxFloors ?? '—'} floors, ${heightM} m)  ` +
      `landUse=${landUse ?? 'null'}  FAR=${far ?? '—'}`,
  );

  // 2. DIS PlotInfo — best-effort, for community / project name.
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
  const district =
    (attrs.PROJECT_NAME && attrs.PROJECT_NAME.trim()) ||
    (attrs.LAND_NAME && attrs.LAND_NAME.trim()) ||
    'DUBAI';
  const community = dis?.community ?? null;

  // 5. Build setbacks / landUseMix payloads.
  const setbacks = extractSetbacks(attrs);
  const landUseMix =
    dis && dis.landUseMix.length > 0
      ? dis.landUseMix
      : [
          {
            category: (attrs.MAIN_LANDUSE ?? landUse ?? 'UNKNOWN') as string,
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

  // 7. Parcel CREATE — currentValuation: null (Price on request),
  //    openToJV: true, status: LISTED.
  //    Per CLAUDE.md `ParcelStatus` enum is unchanged — LISTED is the
  //    "for sale on the platform" canonical status. The JV signal is the
  //    new openToJV column, not a new enum value.
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
    },
  });

  console.log(
    `  [DB] created ${parcel.id}  status=${parcel.status}  openToJV=true  ` +
      `currentValuation=null (Price on request — JV terms negotiable)`,
  );

  // 8. AffectionPlan — always append (never deleteMany, per CLAUDE.md).
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
      latitude: true,
      longitude: true,
    },
  });
  if (verify) {
    console.log(
      `  id=${verify.id}\n` +
        `  ${verify.emirate}/${verify.district}  plot=${verify.plotNumber}  status=${verify.status}\n` +
        `  area=${verify.area} sqft  currentValuation=${verify.currentValuation?.toString() ?? 'null'} fils  openToJV=${verify.openToJV}\n` +
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
