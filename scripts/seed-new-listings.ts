/**
 * Seed two new Dubai ZAAHI listings:
 *   1. Al Furjan (JABAL ALI FIRST - 591) plot 5912323  — NAKHEEL, 50M AED
 *   2. Bu Kadra                          plot 6117209  — FAB, 212M AED
 *
 * Flow for each plot:
 *   1. Attempt DDA GIS enrichment (BASIC_LAND_BASE/MapServer/2,
 *      where PLOT_NUMBER='N'). If it returns a polygon, prefer it and pull
 *      AREA_SQM / GFA_SQM / land use / setbacks off the feature.
 *   2. Otherwise fall back to the founder-supplied rectangle in Dubai
 *      Local TM (EPSG:3997) coordinates. Task-note: the rectangles were
 *      initially flagged as UTM Zone 40N but the eastings (~480k/498k) are
 *      Dubai municipal grid values — projecting them through EPSG:3997
 *      lands the plots exactly on the expected Al Furjan / Bu Kadra
 *      centroids (55.14°E/25.02°N and 55.32°E/25.18°N). Zone 40N would
 *      put them ~150 km east in the Gulf of Oman.
 *
 * Idempotent: upserts Parcel on (emirate, district, plotNumber) and
 * appends a fresh AffectionPlan row (never deletes prior rows, per CLAUDE.md).
 *
 * Price — per CLAUDE.md "Цена участка — ТОЛЬКО ВРУЧНУЮ":
 *   Set on CREATE only. On re-run the existing currentValuation is left
 *   exactly as-is (owner may have edited it via UI).
 *
 * Run: npx tsx -r dotenv/config scripts/seed-new-listings.ts dotenv_config_path=.env.local
 */
import proj4 from 'proj4';
import { UserRole, ParcelStatus, Prisma } from '@prisma/client';
import { prisma } from '../src/lib/prisma';

const SYSTEM_USER_ID = '00000000-0000-0000-0000-00000000zaah';
const SYSTEM_EMAIL = 'system@zaahi.ae';

// ── Projections ──
// EPSG:3997 — WGS 84 / Dubai Local TM (central meridian 55°20'). Dubai
// Municipality & DDA coordinate system; affection plans and survey
// drawings are typically in this projection.
proj4.defs(
  'EPSG:3997',
  '+proj=tmerc +lat_0=0 +lon_0=55.33333333333334 +k=1 +x_0=500000 +y_0=0 +ellps=WGS84 +units=m +no_defs',
);
const dubaiToWgs = proj4('EPSG:3997', 'EPSG:4326');

function dubaiToLngLat([e, n]: [number, number]): [number, number] {
  const [lng, lat] = dubaiToWgs.forward([e, n]);
  return [lng, lat];
}

function centroidOf(ring: number[][]): { lng: number; lat: number } {
  const pts = ring.slice(0, -1); // drop closing duplicate
  const lng = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const lat = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  return { lng, lat };
}

// ── DDA GIS client ──

interface DdaFeatureAttrs {
  PLOT_NUMBER?: string;
  PROJECT_NAME?: string;
  ENTITY_NAME?: string;
  DEVELOPER_NAME?: string;
  AREA_SQM?: number | null;
  AREA_SQFT?: number | null;
  GFA_SQM?: number | null;
  GFA_SQFT?: number | null;
  MAX_HEIGHT_FLOORS?: number | null;
  MAIN_LANDUSE?: string | null;
  SUB_LANDUSE?: string | null;
  BUILDING_SETBACK_SIDE1?: number | null;
  BUILDING_SETBACK_SIDE2?: number | null;
  BUILDING_SETBACK_SIDE3?: number | null;
  BUILDING_SETBACK_SIDE4?: number | null;
  PODIUM_SETBACK_SIDE1?: number | null;
  PODIUM_SETBACK_SIDE2?: number | null;
  PODIUM_SETBACK_SIDE3?: number | null;
  PODIUM_SETBACK_SIDE4?: number | null;
}

interface DdaFeature {
  type: 'Feature';
  properties: DdaFeatureAttrs;
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon | null;
}

interface DdaResponse {
  type: 'FeatureCollection';
  features: DdaFeature[];
}

const DDA_QUERY_URL =
  'https://gis.dda.gov.ae/server/rest/services/DDA/BASIC_LAND_BASE/MapServer/2/query';

async function queryDda(plotNumber: string): Promise<DdaFeature | null> {
  const params = new URLSearchParams({
    where: `PLOT_NUMBER='${plotNumber}'`,
    outFields: '*',
    returnGeometry: 'true',
    outSR: '4326',
    f: 'geojson',
  });
  const url = `${DDA_QUERY_URL}?${params}`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      console.warn(`  DDA GIS: HTTP ${res.status} for ${plotNumber}`);
      return null;
    }
    const j = (await res.json()) as DdaResponse;
    const f = j.features?.[0];
    return f?.geometry ? f : null;
  } catch (e) {
    console.warn(`  DDA GIS: fetch failed for ${plotNumber}:`, (e as Error).message);
    return null;
  }
}

function polygonAreaSqm(coords: number[][][]): number {
  // Approximate area in m² for a lat/lng polygon using equirectangular
  // projection at the polygon centroid — good enough for ~sanity checks
  // on plots a few hundred metres across.
  const ring = coords[0];
  if (!ring || ring.length < 4) return 0;
  const latMid =
    ring.reduce((s, p) => s + p[1], 0) / ring.length;
  const mPerDegLat = 111_320;
  const mPerDegLng = 111_320 * Math.cos((latMid * Math.PI) / 180);
  let a = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    a += (x1 * mPerDegLng) * (y2 * mPerDegLat) - (x2 * mPerDegLng) * (y1 * mPerDegLat);
  }
  return Math.abs(a / 2);
}

// ── Plot definitions ──

interface PlotSpec {
  plotNumber: string;
  emirate: string;
  district: string;
  community: string;
  masterDeveloper: string;
  developerPlotNo?: string;
  owner: string;
  landUseMix: Array<{ category: string; sub: string; areaSqm: number | null }>;
  plotAreaSqm: number;
  maxGfaSqm: number | null;
  far: number | null;
  maxPlotCoveragePct: number | null;
  maxHeightMeters: number; // used for 3D render
  maxHeightCode: string;
  maxFloors: number | null;
  setbacks: Array<{ side: number; building: number | null; podium: number | null }> | null;
  makani: string | null;
  priceAed: number;
  buildingStyle: string;
  projectName: string;
  notes: string;
  // Fallback polygon (Dubai Local TM EPSG:3997, closed ring).
  fallbackUtm: Array<[number, number]>;
  // Expected centroid (WGS84) — refuse to seed if far off.
  expectedLng: number;
  expectedLat: number;
  centroidToleranceDeg: number;
}

const PLOTS: PlotSpec[] = [
  {
    plotNumber: '5912323',
    emirate: 'Dubai',
    district: 'AL FURJAN',
    community: 'JABAL ALI FIRST - 591',
    masterDeveloper: 'NAKHEEL',
    developerPlotNo: 'AFMU048A',
    owner: 'AL KHARRAZ MEADOWS LIMITED',
    landUseMix: [
      { category: 'MIXED USE', sub: 'HOTEL + RESIDENTIAL + OFFICES', areaSqm: null },
      { category: 'COMMERCIAL', sub: 'RETAIL (PODIUM 30%)', areaSqm: null },
    ],
    plotAreaSqm: 1850.64,
    maxGfaSqm: null,
    far: null,
    maxPlotCoveragePct: 40,
    maxHeightMeters: 60, // tower unlimited → default 60m per task
    maxHeightCode: 'UNLIMITED TOWER / PODIUM G+1 (9.5m)',
    maxFloors: null,
    setbacks: null,
    makani: '12214 68441',
    priceAed: 50_000_000,
    buildingStyle: 'SIGNATURE',
    projectName: 'Al Furjan — Mixed Use Tower (AFMU048A)',
    notes:
      'Al Furjan plot AFMU048A — Mixed Use (Hotel + Residential + Offices) ' +
      'with 30% podium Retail. Max plot coverage 40%. Tower height ' +
      'unlimited; podium max G+1 (9.5m). Makani 12214 68441. ' +
      'Owner: AL KHARRAZ MEADOWS LIMITED. Master developer: NAKHEEL.',
    fallbackUtm: [
      [480340, 2768310], // TL
      [480430, 2768310], // TR
      [480430, 2768240], // BR
      [480340, 2768240], // BL
      [480340, 2768310], // close
    ],
    expectedLng: 55.15,
    expectedLat: 25.02,
    centroidToleranceDeg: 0.05,
  },
  {
    plotNumber: '6117209',
    emirate: 'Dubai',
    district: 'BU KADRA',
    community: 'BU KADRA',
    masterDeveloper: 'Dubai Municipality (DLD Ref 133)',
    owner: 'FIRST ABU DHABI BANK P.J.S.C',
    landUseMix: [
      { category: 'COMMERCIAL', sub: 'COMMERCIAL', areaSqm: 1759 },
      { category: 'COMMERCIAL', sub: 'OFFICES', areaSqm: 10_555 },
      { category: 'RESIDENTIAL', sub: 'RESIDENTIAL', areaSqm: 22_868 },
    ],
    plotAreaSqm: 3907.97,
    maxGfaSqm: 35_182.0,
    far: 9.0,
    maxPlotCoveragePct: null,
    maxHeightMeters: 120, // podium + G + 5 + 30 → 120m total
    maxHeightCode: 'Podium+G+5+30 (≈120m)',
    maxFloors: 37, // G + 5 podium + 30 tower floors = 36, +1 podium base ≈ 37
    // Podium base: not mandatory. Tower: 1/4 height from neighbour, max 7.5m, min 3m.
    // Encode as per-side with null and document in notes.
    setbacks: [
      { side: 1, building: 7.5, podium: 0 },
      { side: 2, building: 7.5, podium: 0 },
      { side: 3, building: 7.5, podium: 0 },
      { side: 4, building: 7.5, podium: 0 },
    ],
    makani: '30873 86003',
    priceAed: 212_000_000,
    buildingStyle: 'SIGNATURE',
    projectName: 'Bu Kadra RC2/36 Mixed Use Tower',
    notes:
      'Bu Kadra plot RC2/36 — Commercial + Offices + Residential. ' +
      'FAR 9.0, GFA 35,182 m² (Commercial 1,759 / Offices 10,555 / Residential 22,868). ' +
      'Height: Podium + G + 5 podium floors + 30 tower floors (≈120m). ' +
      'Setbacks: podium base not mandatory; tower 1/4 height from neighbour, max 7.5m, min 3m. ' +
      'Authority: Dubai Municipality (DLD Ref 133). Makani 30873 86003. ' +
      'Owner: FIRST ABU DHABI BANK P.J.S.C.',
    fallbackUtm: [
      [498770, 2786110], // TL
      [498880, 2786110], // TR
      [498880, 2786010], // BR
      [498770, 2786010], // BL
      [498770, 2786110], // close
    ],
    expectedLng: 55.31,
    expectedLat: 25.18,
    centroidToleranceDeg: 0.05,
  },
];

// ── Helpers ──

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

async function seedPlot(spec: PlotSpec) {
  console.log(`\n── Plot ${spec.plotNumber} — ${spec.district} ──`);

  // 1. Try DDA GIS first.
  const dda = await queryDda(spec.plotNumber);

  let geometry: GeoJSON.Polygon;
  let plotAreaSqm = spec.plotAreaSqm;
  let maxGfaSqm = spec.maxGfaSqm;
  let ddaAttrs: DdaFeatureAttrs | null = null;
  let source = 'founder-supplied (EPSG:3997 rectangle)';

  if (dda && dda.geometry) {
    // DDA returned a polygon. Normalize MultiPolygon → first Polygon.
    const geom =
      dda.geometry.type === 'MultiPolygon'
        ? ({ type: 'Polygon', coordinates: dda.geometry.coordinates[0] } as GeoJSON.Polygon)
        : (dda.geometry as GeoJSON.Polygon);
    geometry = geom;
    ddaAttrs = dda.properties;

    const ddaArea = polygonAreaSqm(geom.coordinates);
    const expectedArea = spec.plotAreaSqm;
    const ratio = ddaArea / expectedArea;
    if (ratio < 0.5 || ratio > 2.0) {
      console.warn(
        `  WARNING: DDA polygon area ${ddaArea.toFixed(0)} m² differs ` +
          `>2× from expected ${expectedArea} m² (ratio ${ratio.toFixed(2)}). ` +
          `Using DDA geometry anyway — real DDA is source of truth.`,
      );
    }
    if (typeof ddaAttrs.AREA_SQM === 'number' && ddaAttrs.AREA_SQM > 0) {
      plotAreaSqm = ddaAttrs.AREA_SQM;
    }
    if (typeof ddaAttrs.GFA_SQM === 'number' && ddaAttrs.GFA_SQM > 0) {
      maxGfaSqm = ddaAttrs.GFA_SQM;
    }
    source = 'DDA GIS (BASIC_LAND_BASE/MapServer/2)';
    console.log(
      `  DDA GIS: HIT  (polygon area ≈ ${ddaArea.toFixed(0)} m², ` +
        `DDA AREA_SQM=${ddaAttrs.AREA_SQM ?? 'null'})`,
    );
  } else {
    // Fallback: project founder-supplied rectangle (Dubai Local TM) to WGS84.
    console.log('  DDA GIS: MISS — using fallback rectangle (EPSG:3997 → WGS84)');
    const ring: number[][] = spec.fallbackUtm.map(dubaiToLngLat);
    // Ensure closed
    if (
      ring.length > 0 &&
      (ring[0][0] !== ring[ring.length - 1][0] ||
        ring[0][1] !== ring[ring.length - 1][1])
    ) {
      ring.push(ring[0]);
    }
    geometry = { type: 'Polygon', coordinates: [ring] };
  }

  // 2. Centroid sanity check.
  const c = centroidOf(geometry.coordinates[0]);
  console.log(`  centroid: ${c.lng.toFixed(6)}, ${c.lat.toFixed(6)}`);
  const dLng = Math.abs(c.lng - spec.expectedLng);
  const dLat = Math.abs(c.lat - spec.expectedLat);
  if (dLng > spec.centroidToleranceDeg || dLat > spec.centroidToleranceDeg) {
    throw new Error(
      `Centroid ${c.lng.toFixed(4)},${c.lat.toFixed(4)} is >${spec.centroidToleranceDeg}° ` +
        `from expected ${spec.expectedLng},${spec.expectedLat} — refusing to seed plot ${spec.plotNumber}`,
    );
  }

  // 3. Derived values.
  const plotAreaSqft = Math.round(plotAreaSqm * 10.7639 * 100) / 100;
  const maxGfaSqft =
    maxGfaSqm != null ? Math.round(maxGfaSqm * 10.7639 * 100) / 100 : null;
  const priceFils = BigInt(spec.priceAed) * BigInt(100);

  // 4. Parcel upsert.
  const existing = await prisma.parcel.findUnique({
    where: {
      emirate_district_plotNumber: {
        emirate: spec.emirate,
        district: spec.district,
        plotNumber: spec.plotNumber,
      },
    },
  });

  const parcel = await prisma.parcel.upsert({
    where: {
      emirate_district_plotNumber: {
        emirate: spec.emirate,
        district: spec.district,
        plotNumber: spec.plotNumber,
      },
    },
    create: {
      plotNumber: spec.plotNumber,
      ownerId: SYSTEM_USER_ID,
      area: plotAreaSqft,
      emirate: spec.emirate,
      district: spec.district,
      latitude: c.lat,
      longitude: c.lng,
      geometry: geometry as unknown as Prisma.InputJsonValue,
      status: ParcelStatus.LISTED,
      currentValuation: priceFils,
    },
    update: {
      // Refresh geometry + area (DDA may have updated). Never touch
      // currentValuation or status on re-run (manual-only, per CLAUDE.md).
      area: plotAreaSqft,
      latitude: c.lat,
      longitude: c.lng,
      geometry: geometry as unknown as Prisma.InputJsonValue,
    },
  });

  console.log(
    existing
      ? `  Parcel: updated ${parcel.id} (status=${parcel.status}, kept existing price)`
      : `  Parcel: created ${parcel.id} (LISTED, ${spec.priceAed.toLocaleString('en-US')} AED = ${priceFils} fils)`,
  );

  // 5. AffectionPlan — append (never deleteMany, per CLAUDE.md).
  const plan = await prisma.affectionPlan.create({
    data: {
      parcelId: parcel.id,
      source,
      plotNumber: spec.plotNumber,
      projectName: spec.projectName,
      community: spec.community,
      masterDeveloper: spec.masterDeveloper,

      plotAreaSqm,
      plotAreaSqft,
      maxGfaSqm: maxGfaSqm ?? null,
      maxGfaSqft,

      maxHeightCode: spec.maxHeightCode,
      maxFloors: spec.maxFloors,
      maxHeightMeters: spec.maxHeightMeters,
      far: spec.far,

      setbacks: (spec.setbacks ?? Prisma.JsonNull) as unknown as Prisma.InputJsonValue,
      landUseMix: spec.landUseMix as unknown as Prisma.InputJsonValue,
      raw:
        ddaAttrs != null
          ? ({
              dda: ddaAttrs as unknown,
              developerPlotNo: spec.developerPlotNo ?? null,
              owner: spec.owner,
              makani: spec.makani,
              maxPlotCoveragePct: spec.maxPlotCoveragePct,
            } as unknown as Prisma.InputJsonValue)
          : ({
              developerPlotNo: spec.developerPlotNo ?? null,
              owner: spec.owner,
              makani: spec.makani,
              maxPlotCoveragePct: spec.maxPlotCoveragePct,
            } as unknown as Prisma.InputJsonValue),

      buildingStyle: spec.buildingStyle,
      notes: spec.notes,
    },
  });

  console.log(`  AffectionPlan: created ${plan.id}`);
  console.log(
    `  land use: ${spec.landUseMix
      .map((x) => `${x.category}/${x.sub}`)
      .join(', ')}`,
  );
  console.log(`  style:    ${spec.buildingStyle} (${spec.maxHeightMeters}m)`);
  return { parcel, plan, centroid: c };
}

async function main() {
  await ensureSystemUser();
  for (const spec of PLOTS) {
    await seedPlot(spec);
  }
  console.log('\nDone.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
