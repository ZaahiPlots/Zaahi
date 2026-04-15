/**
 * Seed three new Dubai ZAAHI listings, all sourced directly from the DDA
 * public GIS (BASIC_LAND_BASE MapServer layer 2) + DIS portal:
 *
 *   1. Plot 3260904  — Jaddaf Waterfront (Al Jadaf)       — 40,000,000 AED
 *   2. Plot 6850769  — Dubai Production City (IMPZ)       — 25,600,000 AED
 *   3. Plot 6850768  — Dubai Production City (IMPZ)       — 16,500,000 AED
 *
 * No fabricated geometry. If any plot does not return a polygon from DDA
 * layer 2 the script aborts that plot and reports — it will never seed a
 * rectangle placeholder.
 *
 * Data sources (in priority order):
 *   A. DDA GIS BASIC_LAND_BASE/MapServer/2 — polygon + attributes
 *      (AREA_SQM, AREA_SQFT, GFA_SQM, MAX_HEIGHT_FLOORS, setbacks, …)
 *   B. DDA DIS ?handler=PlotInfo             — affection plan HTML
 *      (community, land-use mix, notes) — parsed via src/lib/dda.ts.
 *   C. DDA DIS MAIN_MAP/MapServer/8          — building limit polygon
 *      (token-authenticated; reprojected EPSG:3997 → WGS84).
 *
 * Idempotent: upserts Parcel on (emirate, district, plotNumber) and
 * appends a fresh AffectionPlan row (never deletes prior rows, per CLAUDE.md).
 *
 * Price rule — per CLAUDE.md "Цена участка — ТОЛЬКО ВРУЧНУЮ":
 *   Set on CREATE only. On re-run the existing currentValuation is left
 *   exactly as-is (owner may have edited it via UI).
 *
 * Run: npx tsx -r dotenv/config scripts/seed-dda-batch.ts dotenv_config_path=.env.local
 */
import { UserRole, ParcelStatus, Prisma } from '@prisma/client';
import { prisma } from '../src/lib/prisma';
import { fetchPlotInfoHtml, parseAffectionPlan, fetchBuildingLimit } from '../src/lib/dda';

const SYSTEM_USER_ID = '00000000-0000-0000-0000-00000000zaah';
const SYSTEM_EMAIL = 'system@zaahi.ae';

// ── Constants ─────────────────────────────────────────────────────────────

const STOREY_M = 4; // default storey height (m) when DDA gives only G+N

// Canonical 9 categories (CLAUDE.md 2026-04-11). Do NOT introduce new ones.
const CANONICAL_LAND_USE = [
  'RESIDENTIAL',
  'COMMERCIAL',
  'MIXED_USE',
  'HOTEL',
  'INDUSTRIAL',
  'EDUCATIONAL',
  'HEALTHCARE',
  'AGRICULTURAL',
  'FUTURE_DEVELOPMENT',
] as const;
type Canonical = (typeof CANONICAL_LAND_USE)[number];

/**
 * Map DDA MAIN_LANDUSE / LANDUSE_CATEGORY string → one of the 9 canonical
 * categories. Mirrors the rules in CLAUDE.md → `deriveLandUse`. If multiple
 * categories appear in the same string (e.g. "COMMERCIAL - RESIDENTIAL")
 * we return MIXED_USE.
 */
function deriveCanonical(raw: string | null | undefined): Canonical | null {
  if (!raw) return null;
  const s = raw.toLowerCase();
  const hits = new Set<Canonical>();
  if (/residential|villa|townhouse|apartment/.test(s)) hits.add('RESIDENTIAL');
  if (/commercial|office|retail|showroom|cbd/.test(s)) hits.add('COMMERCIAL');
  if (/mixed/.test(s)) hits.add('MIXED_USE');
  if (/hotel|hospitality|resort|serviced apartment/.test(s)) hits.add('HOTEL');
  if (/industrial|warehouse|factory|logistics|storage/.test(s)) hits.add('INDUSTRIAL');
  if (/education|school|university|academy|nursery/.test(s)) hits.add('EDUCATIONAL');
  if (/health|hospital|clinic|medical/.test(s)) hits.add('HEALTHCARE');
  if (/agricultur|farm/.test(s)) hits.add('AGRICULTURAL');
  if (/future development/.test(s)) hits.add('FUTURE_DEVELOPMENT');
  if (hits.size === 0) return null;
  if (hits.size > 1) return 'MIXED_USE';
  return [...hits][0];
}

/** Parse DDA `MAX_HEIGHT` / `MAX_HEIGHT_FLOORS` string ("G+6", "G+3P+9"…). */
function parseFloorsFromHeightCode(code: string | null | undefined): number | null {
  if (!code) return null;
  const explicitM = code.match(/\((\d+)\s*m\)/i);
  if (explicitM) return Math.round(parseInt(explicitM[1], 10) / STOREY_M);
  const parts = code.replace(/^G\+?/i, '').split(/[+]/);
  let total = 1; // Ground floor
  for (const p of parts) {
    const t = p.trim().toUpperCase();
    if (t === 'M' || t === 'P') total += 1;
    else if (/^\d+P$/.test(t)) total += parseInt(t, 10);
    else if (/^\d+$/.test(t)) total += parseInt(t, 10);
  }
  return total > 1 ? total : null;
}

// Default fallback height (metres) if DDA gives nothing usable.
function defaultHeightForLandUse(cat: Canonical | null): number {
  switch (cat) {
    case 'RESIDENTIAL':
      return 15; // G+3 apartment-ish
    case 'COMMERCIAL':
      return 40;
    case 'MIXED_USE':
      return 50;
    case 'HOTEL':
      return 35;
    case 'INDUSTRIAL':
      return 12;
    case 'EDUCATIONAL':
      return 15;
    case 'HEALTHCARE':
      return 20;
    case 'AGRICULTURAL':
      return 6;
    case 'FUTURE_DEVELOPMENT':
    case null:
    default:
      return 15;
  }
}

// ── Geometry helpers ──────────────────────────────────────────────────────

function centroidOf(ring: number[][]): { lng: number; lat: number } {
  const pts = ring.slice(0, -1); // drop closing duplicate
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

/** Approximate WGS84-polygon area in m² (equirectangular around centroid). */
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

// ── DDA GIS layer-2 fetch ─────────────────────────────────────────────────

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
  MIN_PLOT_COVERAGE?: number | null;
  MAX_PLOT_COVERAGE?: number | null;
  PLOT_COVERAGE?: string | null;
  CONSTRUCTION_STATUS?: string | null;
  MAIN_LANDUSE?: string | null;
  SUB_LANDUSE?: string | null;
  LANDUSE_DETAILS?: string | null;
  LANDUSE_CATEGORY?: string | null;
  GENERAL_NOTES?: string | null;
  IS_FROZEN?: number | null;
  FREEZE_DATE?: number | null;
  FREEZE_REASON?: string | null;
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

interface DdaLayer2Response {
  type: 'FeatureCollection';
  features: DdaLayer2Feature[];
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
  const url = `${LAYER2_URL}?${params}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    console.warn(`  layer2: HTTP ${res.status}`);
    return null;
  }
  const j = (await res.json()) as DdaLayer2Response;
  const f = j.features?.[0];
  return f?.geometry ? f : null;
}

function parseSetbackSide(v: string | null | undefined): number | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s || /n\/a/i.test(s)) return null;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

function extractSetbacks(attrs: DdaLayer2Attrs) {
  const out: Array<{ side: number; building: number | null; podium: number | null }> = [];
  for (let i = 1; i <= 4; i++) {
    const b = parseSetbackSide(
      attrs[`BUILDING_SETBACK_SIDE${i}` as keyof DdaLayer2Attrs] as string | null,
    );
    const p = parseSetbackSide(
      attrs[`PODIUM_SETBACK_SIDE${i}` as keyof DdaLayer2Attrs] as string | null,
    );
    if (b != null || p != null) out.push({ side: i, building: b, podium: p });
  }
  return out;
}

// ── Plot specs ────────────────────────────────────────────────────────────

interface PlotSpec {
  plotNumber: string;
  priceAed: number;
  priceFils: bigint;
}

const PLOTS: PlotSpec[] = [
  { plotNumber: '3260904', priceAed: 40_000_000, priceFils: 4_000_000_000n },
  { plotNumber: '6850769', priceAed: 25_600_000, priceFils: 2_560_000_000n },
  { plotNumber: '6850768', priceAed: 16_500_000, priceFils: 1_650_000_000n },
];

// Emirate fixed — all three plots are in Dubai DDA jurisdiction.
const EMIRATE = 'Dubai';

// ── Worker ────────────────────────────────────────────────────────────────

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

interface SeedResult {
  plotNumber: string;
  parcelId: string | null;
  skipped: boolean;
  reason?: string;
  centroid?: { lng: number; lat: number };
  bbox?: { minLng: number; maxLng: number; minLat: number; maxLat: number };
  ddaAreaSqm?: number | null;
  polygonAreaSqm?: number | null;
  landUse?: Canonical | null;
  maxHeightMeters?: number;
  maxFloors?: number | null;
  far?: number | null;
  disHit?: boolean;
  layer8Hit?: boolean;
}

async function seedPlot(spec: PlotSpec): Promise<SeedResult> {
  const { plotNumber } = spec;
  console.log(`\n── Plot ${plotNumber} ──`);

  // 1. DDA layer 2 — polygon + canonical attributes.
  const feat = await queryDdaLayer2(plotNumber);
  if (!feat || !feat.geometry) {
    const reason = `layer-2 returned no polygon for ${plotNumber} — skipping (no fabricated geometry).`;
    console.error(`  [DDA layer2] MISS — ${reason}`);
    return { plotNumber, parcelId: null, skipped: true, reason };
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
  const derivedHeightM = ddaHeightM ?? (maxFloors != null ? maxFloors * STOREY_M : null);

  const landUseSource =
    attrs.LANDUSE_DETAILS ??
    attrs.LANDUSE_CATEGORY ??
    attrs.MAIN_LANDUSE ??
    attrs.SUB_LANDUSE ??
    null;
  const landUse = deriveCanonical(landUseSource);
  const heightM = derivedHeightM ?? defaultHeightForLandUse(landUse);

  const far =
    ddaGfaSqm != null && ddaAreaSqm != null && ddaAreaSqm > 0
      ? Math.round((ddaGfaSqm / ddaAreaSqm) * 100) / 100
      : null;

  // Diagnostic line BEFORE the upsert, as required.
  const expectedPricePerSqm =
    ddaAreaSqm != null && ddaAreaSqm > 0
      ? Math.round(spec.priceAed / ddaAreaSqm)
      : null;
  console.log(
    `  [DDA layer2] HIT  ` +
      `area_sqm=${ddaAreaSqm ?? '—'} (poly≈${polyArea.toFixed(0)})  ` +
      `bbox=[${bb.minLng.toFixed(5)},${bb.minLat.toFixed(5)} .. ${bb.maxLng.toFixed(5)},${bb.maxLat.toFixed(5)}]  ` +
      `centroid=${c.lng.toFixed(6)},${c.lat.toFixed(6)}  ` +
      `landUse=${landUse ?? 'null'}  ` +
      `price=${spec.priceAed.toLocaleString('en-US')} AED  ` +
      `pricePerSqm=${expectedPricePerSqm ?? '—'} AED/m²`,
  );

  // 2. DIS PlotInfo — best-effort, for community / affection-plan details.
  let dis: ReturnType<typeof parseAffectionPlan> | null = null;
  try {
    const html = await fetchPlotInfoHtml(plotNumber);
    dis = parseAffectionPlan(html);
    console.log(
      `  [DIS PlotInfo] HIT  community=${dis.community ?? 'null'}  ` +
        `projectName=${dis.projectName ?? 'null'}  ` +
        `landUseMix=${dis.landUseMix.length} entries`,
    );
  } catch (e) {
    console.warn(`  [DIS PlotInfo] MISS — ${(e as Error).message}`);
  }

  // 3. DIS MAIN_MAP layer 8 — building limit polygon (token-auth).
  let buildingLimitGeometry: GeoJSON.Polygon | null = null;
  try {
    buildingLimitGeometry = await fetchBuildingLimit(plotNumber);
    console.log(
      `  [DIS layer8] ${buildingLimitGeometry ? 'HIT' : 'MISS'}  ` +
        `buildingLimit=${buildingLimitGeometry ? 'polygon' : 'none'}`,
    );
  } catch (e) {
    console.warn(`  [DIS layer8] MISS — ${(e as Error).message}`);
  }

  // 4. Resolve district / community.
  //    DDA layer 2 lacks district per se; use LAND_NAME as fallback, prefer
  //    PROJECT_NAME for district. Community comes from DIS when available.
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

  // 6. Derived areas / price.
  const plotAreaSqm = ddaAreaSqm;
  const plotAreaSqft =
    ddaAreaSqft ??
    (ddaAreaSqm != null ? Math.round(ddaAreaSqm * 10.7639 * 100) / 100 : null);
  if (plotAreaSqft == null) {
    const reason = `DDA returned polygon but no AREA_SQFT/AREA_SQM for ${plotNumber}.`;
    console.error(`  ABORT — ${reason}`);
    return { plotNumber, parcelId: null, skipped: true, reason };
  }

  // 7. Parcel upsert.
  const existing = await prisma.parcel.findUnique({
    where: {
      emirate_district_plotNumber: {
        emirate: EMIRATE,
        district,
        plotNumber,
      },
    },
  });

  const parcel = await prisma.parcel.upsert({
    where: {
      emirate_district_plotNumber: {
        emirate: EMIRATE,
        district,
        plotNumber,
      },
    },
    create: {
      plotNumber,
      ownerId: SYSTEM_USER_ID,
      area: plotAreaSqft,
      emirate: EMIRATE,
      district,
      latitude: c.lat,
      longitude: c.lng,
      geometry: geometry as unknown as Prisma.InputJsonValue,
      status: ParcelStatus.LISTED,
      currentValuation: spec.priceFils,
    },
    update: {
      // Refresh DDA-authoritative geometry + area. Never touch currentValuation
      // or status on re-run (manual-only, per CLAUDE.md).
      area: plotAreaSqft,
      latitude: c.lat,
      longitude: c.lng,
      geometry: geometry as unknown as Prisma.InputJsonValue,
    },
  });

  console.log(
    existing
      ? `  Parcel: updated ${parcel.id} (status=${parcel.status}, kept price=${parcel.currentValuation ?? 'null'} fils)`
      : `  Parcel: created ${parcel.id} (LISTED, ${spec.priceAed.toLocaleString('en-US')} AED = ${spec.priceFils} fils)`,
  );

  // 8. AffectionPlan — always append (never deleteMany, per CLAUDE.md).
  const plan = await prisma.affectionPlan.create({
    data: {
      parcelId: parcel.id,
      source:
        'DDA GIS BASIC_LAND_BASE/MapServer/2' +
        (dis ? ' + DIS ?handler=PlotInfo' : '') +
        (buildingLimitGeometry ? ' + MAIN_MAP/8' : ''),
      plotNumber,
      oldNumber: attrs.OLD_PLOT_NUMBERS ?? dis?.oldNumber ?? null,
      projectName: attrs.PROJECT_NAME ?? dis?.projectName ?? null,
      community,
      masterDeveloper: attrs.DEVELOPER_NAME ?? attrs.ENTITY_NAME ?? dis?.masterDeveloper ?? null,

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

      buildingLimitGeometry:
        buildingLimitGeometry != null
          ? (buildingLimitGeometry as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,

      // ZAAHI Signature — podium/body/crown rendering driven by floors.
      // opacity is a layer-level literal (1 for LISTED parcels, per CLAUDE.md);
      // it lives in the renderer, not in this row. We store the style tag
      // and the canonical land-use so the renderer can colour + tier.
      buildingStyle: 'SIGNATURE',

      notes:
        `DDA plot ${plotNumber}. ` +
        (attrs.PROJECT_NAME ? `Project ${attrs.PROJECT_NAME}. ` : '') +
        (attrs.DEVELOPER_NAME ? `Developer ${attrs.DEVELOPER_NAME}. ` : '') +
        (attrs.MAIN_LANDUSE ? `Main land use ${attrs.MAIN_LANDUSE}. ` : '') +
        (heightCode ? `Height ${heightCode}. ` : '') +
        (attrs.CONSTRUCTION_STATUS ? `Construction ${attrs.CONSTRUCTION_STATUS}. ` : '') +
        (attrs.IS_FROZEN ? `FROZEN by DDA. ` : '') +
        (dis?.notes ? `DIS notes: ${dis.notes.slice(0, 400)}` : ''),

      raw: {
        dda: attrs as unknown,
        dis: dis as unknown,
        derived: {
          canonicalLandUse: landUse,
          opacity: 1, // number, not array — matches existing LISTED parcels
          sitePlanIssueMs: attrs.SITEPLAN_ISSUE_DATE ?? null,
          sitePlanExpiryMs: attrs.SITEPLAN_EXPIRY_DATE ?? null,
          isFrozen: Boolean(attrs.IS_FROZEN),
        },
      } as unknown as Prisma.InputJsonValue,
    },
  });

  console.log(
    `  AffectionPlan: created ${plan.id}  ` +
      `height=${heightM}m  floors=${maxFloors ?? '—'}  FAR=${far ?? '—'}  ` +
      `landUse=${landUse ?? 'null'}`,
  );

  return {
    plotNumber,
    parcelId: parcel.id,
    skipped: false,
    centroid: c,
    bbox: bb,
    ddaAreaSqm,
    polygonAreaSqm: polyArea,
    landUse,
    maxHeightMeters: heightM,
    maxFloors,
    far,
    disHit: dis != null,
    layer8Hit: buildingLimitGeometry != null,
  };
}

async function main() {
  await ensureSystemUser();

  // Pre-flight: show what's already in the DB for these plots.
  const preDups = await prisma.parcel.findMany({
    where: { plotNumber: { in: PLOTS.map((p) => p.plotNumber) } },
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
    console.log('Pre-flight: none of the plots exist yet.');
  } else {
    console.log('Pre-flight — existing rows:');
    for (const d of preDups) {
      console.log(
        `  ${d.plotNumber}: id=${d.id}  ${d.emirate}/${d.district}  ` +
          `status=${d.status}  price=${d.currentValuation?.toString() ?? 'null'} fils`,
      );
    }
  }

  const results: SeedResult[] = [];
  for (const spec of PLOTS) {
    try {
      results.push(await seedPlot(spec));
    } catch (e) {
      console.error(`  FATAL while seeding ${spec.plotNumber}:`, (e as Error).message);
      results.push({
        plotNumber: spec.plotNumber,
        parcelId: null,
        skipped: true,
        reason: (e as Error).message,
      });
    }
  }

  // Verification query.
  console.log('\n── Verification ──');
  const verify = await prisma.parcel.findMany({
    where: { plotNumber: { in: PLOTS.map((p) => p.plotNumber) } },
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
    orderBy: { plotNumber: 'asc' },
  });
  for (const r of verify) {
    console.log(
      `  ${r.plotNumber}  ${r.emirate}/${r.district}  ` +
        `status=${r.status}  areaSqft=${r.area}  ` +
        `price=${r.currentValuation?.toString() ?? 'null'} fils  ` +
        `centroid=${r.longitude?.toFixed(6)},${r.latitude?.toFixed(6)}  ` +
        `id=${r.id}`,
    );
  }

  // Summary (for the caller to relay).
  console.log('\n── Summary ──');
  for (const r of results) {
    if (r.skipped) {
      console.log(`  ${r.plotNumber}: SKIPPED (${r.reason})`);
    } else {
      console.log(
        `  ${r.plotNumber}: OK  ` +
          `parcelId=${r.parcelId}  ` +
          `centroid=${r.centroid?.lng.toFixed(6)},${r.centroid?.lat.toFixed(6)}  ` +
          `areaSqm=${r.ddaAreaSqm}  ` +
          `landUse=${r.landUse}  ` +
          `height=${r.maxHeightMeters}m  far=${r.far ?? '—'}  ` +
          `dis=${r.disHit ? 'y' : 'n'}  layer8=${r.layer8Hit ? 'y' : 'n'}`,
      );
    }
  }
  console.log('\nDone.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
