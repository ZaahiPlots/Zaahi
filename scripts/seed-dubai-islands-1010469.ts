/**
 * Seed new Dubai Islands listing — plot 1010469 (NAKHLAT DEIRA 101).
 *
 *   Developer plot no: DIA-RE-0167 (NAKHEEL)
 *   Owner/Possessor:   A R K HILLZ BUILDING MATERIALS TRADING CO. L.L.C
 *   Master developer:  NAKHEEL
 *   Plot area:         2,755.98 m² (from affection plan)
 *   Max GFA:           6,889.95 m² (FAR=2.50)
 *   Max height:        G+P+6 / 31.20 m
 *   Land use:          Residential (Apartments)
 *   Price:             68,000,000 AED
 *   Authority:         Trakhees (PCFC) — Dubai Islands is under Trakhees, not DDA
 *
 * Polygon sourcing:
 *   The affection plan (DIA-RE-0167) shows a 100×80 m grid-tick viewport at
 *   (496650..496750 E, 2797910..2797990 N) in Dubai Local TM (EPSG:3997 —
 *   same projection used throughout ZAAHI seeding, see fix-polygon-sizes.ts).
 *   Those 100×80 m = 8,000 m² is the ZONE, not the plot. The plot itself is
 *   2,755.98 m². Per founder direction, we synthesize a centered rectangle
 *   sized to exactly 2,755.98 m² with the zone's 5:4 aspect ratio — same
 *   approach that was used for Al Furjan before pixel-extraction upgrades.
 *   (Pixel-extraction from the PDF is blocked in this run; the synthesized
 *   rectangle is a known approximation, flagged in AffectionPlan.notes.)
 *
 *   DDA GIS is NOT queried: Dubai Islands is under Trakhees (PCFC), not DDA.
 *
 * Idempotent: upserts Parcel on (emirate, district, plotNumber). Price is
 * set on CREATE only — per CLAUDE.md «Цена участка — ТОЛЬКО ВРУЧНУЮ».
 *
 * Run: npx tsx -r dotenv/config scripts/seed-dubai-islands-1010469.ts dotenv_config_path=.env.local
 */
import proj4 from 'proj4';
import { UserRole, ParcelStatus, Prisma } from '@prisma/client';
import { prisma } from '../src/lib/prisma';

const SYSTEM_USER_ID = '00000000-0000-0000-0000-00000000zaah';
const SYSTEM_EMAIL = 'system@zaahi.ae';

proj4.defs(
  'EPSG:3997',
  '+proj=tmerc +lat_0=0 +lon_0=55.33333333333334 +k=1 +x_0=500000 +y_0=0 +ellps=WGS84 +units=m +no_defs',
);
const dubaiToWgs = proj4('EPSG:3997', 'EPSG:4326');

function dubaiToLngLat([e, n]: [number, number]): [number, number] {
  const [lng, lat] = dubaiToWgs.forward([e, n]);
  return [lng, lat];
}

// Zone bounding box from affection plan grid ticks (EPSG:3997, meters).
const ZONE = {
  minE: 496650,
  maxE: 496750,
  minN: 2797910,
  maxN: 2797990,
};
const PLOT_AREA_SQM = 2755.98;

function buildCenteredRectangle() {
  const zoneW = ZONE.maxE - ZONE.minE; // 100 m
  const zoneH = ZONE.maxN - ZONE.minN; // 80 m
  const zoneArea = zoneW * zoneH; // 8000 m²
  const k = Math.sqrt(PLOT_AREA_SQM / zoneArea);
  const plotW = zoneW * k;
  const plotH = zoneH * k;
  const cx = (ZONE.minE + ZONE.maxE) / 2;
  const cy = (ZONE.minN + ZONE.maxN) / 2;
  const tl: [number, number] = [cx - plotW / 2, cy + plotH / 2];
  const tr: [number, number] = [cx + plotW / 2, cy + plotH / 2];
  const br: [number, number] = [cx + plotW / 2, cy - plotH / 2];
  const bl: [number, number] = [cx - plotW / 2, cy - plotH / 2];
  console.log(
    `  zone ${zoneW}×${zoneH} m (${zoneArea} m²) → ` +
      `plot ${plotW.toFixed(2)}×${plotH.toFixed(2)} m (${(plotW * plotH).toFixed(2)} m²)`,
  );
  const ring: Array<[number, number]> = [tl, tr, br, bl, tl].map(dubaiToLngLat);
  return ring;
}

function centroidOf(ring: Array<[number, number]>) {
  const pts = ring.slice(0, -1);
  const lng = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const lat = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  return { lng, lat };
}

const SPEC = {
  plotNumber: '1010469',
  emirate: 'Dubai',
  district: 'DUBAI ISLANDS',
  community: 'NAKHLAT DEIRA',
  communityNumber: '101',
  masterDeveloper: 'NAKHEEL',
  developerPlotNo: 'DIA-RE-0167',
  owner: 'A R K HILLZ BUILDING MATERIALS TRADING CO. L.L.C',
  authority: 'Trakhees (PCFC)',
  dldRef: '28897 97915',
  landUseMix: [
    { category: 'RESIDENTIAL', sub: 'APARTMENTS', areaSqm: null },
  ],
  plotAreaSqm: 2755.98,
  maxGfaSqm: 6889.95,
  far: 2.5,
  maxHeightCode: 'G+P+6',
  maxHeightMeters: 31.2,
  maxFloors: 7, // G + Podium + 6 tower floors
  coverageGFPct: 70,
  coverageTowerPct: 55,
  setbacks: [
    // GF & Podium: Front & Sides & Rear = 3m.
    // Tower: Front = 5m, Rear = 5m, Right = 5m, Left = 10m.
    { side: 1, label: 'Front', podium: 3, building: 5 },
    { side: 2, label: 'Right', podium: 3, building: 5 },
    { side: 3, label: 'Rear',  podium: 3, building: 5 },
    { side: 4, label: 'Left',  podium: 3, building: 10 },
  ],
  makani: null as string | null,
  priceAed: 68_000_000,
  buildingStyle: 'SIGNATURE',
  projectName: 'Dubai Islands — DIA-RE-0167 (Nakhlat Deira 101)',
  notes:
    'Dubai Islands plot 1010469 (NAKHLAT DEIRA — 101), developer plot DIA-RE-0167. ' +
    'Master developer: NAKHEEL. Owner/Possessor: A R K HILLZ BUILDING MATERIALS ' +
    'TRADING CO. L.L.C. Residential (Apartments). G+P+6 / 31.20 m, FAR 2.50, ' +
    'GFA 6,889.95 m². Plot coverage: GF & Podium max 70%, Tower max 55%. ' +
    'Setbacks — GF & Podium: 3 m all sides. Tower: Front & Rear 5 m, Right 5 m, ' +
    'Left 10 m. Authority: Trakhees (PCFC). DLD ref: 28897 97915. ' +
    'Geometry: centered rectangle synthesized from the affection plan 100×80 m ' +
    'zone viewport, scaled to exactly 2,755.98 m² — pending upgrade to exact ' +
    'plot contour via pixel-extraction.',
  // Affection plan zone viewport (EPSG:3997) — used to derive the centered rect.
  zoneBboxUtm: [
    [ZONE.minE, ZONE.maxN], // TL
    [ZONE.maxE, ZONE.maxN], // TR
    [ZONE.maxE, ZONE.minN], // BR
    [ZONE.minE, ZONE.minN], // BL
  ],
  // Expected WGS84 centroid for sanity check (Dubai Islands ≈ 55.30°E, 25.30°N).
  expectedLng: 55.300,
  expectedLat: 25.300,
  centroidToleranceDeg: 0.05,
};

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

  console.log(`\n── Plot ${SPEC.plotNumber} — ${SPEC.district} / ${SPEC.community} ──`);

  // 1. Duplicate check.
  const existing = await prisma.parcel.findUnique({
    where: {
      emirate_district_plotNumber: {
        emirate: SPEC.emirate,
        district: SPEC.district,
        plotNumber: SPEC.plotNumber,
      },
    },
  });
  if (existing) {
    console.log(
      `  DUPLICATE: parcel ${existing.id} already exists ` +
        `(status=${existing.status}, price=${existing.currentValuation?.toString()} fils). ` +
        `Will refresh geometry/area only; price + status preserved.`,
    );
  }

  // 2. Build polygon.
  const ring = buildCenteredRectangle();
  const c = centroidOf(ring);
  console.log(`  centroid: ${c.lng.toFixed(6)}, ${c.lat.toFixed(6)}`);
  const dLng = Math.abs(c.lng - SPEC.expectedLng);
  const dLat = Math.abs(c.lat - SPEC.expectedLat);
  if (dLng > SPEC.centroidToleranceDeg || dLat > SPEC.centroidToleranceDeg) {
    throw new Error(
      `Centroid ${c.lng.toFixed(4)},${c.lat.toFixed(4)} is >${SPEC.centroidToleranceDeg}° ` +
        `from expected ${SPEC.expectedLng},${SPEC.expectedLat} — refusing to seed`,
    );
  }
  const geometry = {
    type: 'Polygon' as const,
    coordinates: [ring],
  };

  // 3. Derived values.
  const plotAreaSqft = Math.round(SPEC.plotAreaSqm * 10.7639 * 100) / 100;
  const maxGfaSqft = Math.round(SPEC.maxGfaSqm * 10.7639 * 100) / 100;
  const priceFils = BigInt(SPEC.priceAed) * BigInt(100);

  // 4. Parcel upsert.
  const parcel = await prisma.parcel.upsert({
    where: {
      emirate_district_plotNumber: {
        emirate: SPEC.emirate,
        district: SPEC.district,
        plotNumber: SPEC.plotNumber,
      },
    },
    create: {
      plotNumber: SPEC.plotNumber,
      ownerId: SYSTEM_USER_ID,
      area: plotAreaSqft,
      emirate: SPEC.emirate,
      district: SPEC.district,
      latitude: c.lat,
      longitude: c.lng,
      geometry: geometry as unknown as Prisma.InputJsonValue,
      status: ParcelStatus.LISTED,
      currentValuation: priceFils,
    },
    update: {
      area: plotAreaSqft,
      latitude: c.lat,
      longitude: c.lng,
      geometry: geometry as unknown as Prisma.InputJsonValue,
      // status + currentValuation intentionally omitted on re-run.
    },
  });

  console.log(
    existing
      ? `  Parcel: updated ${parcel.id} (status=${parcel.status}, kept existing price)`
      : `  Parcel: created ${parcel.id} (LISTED, ${SPEC.priceAed.toLocaleString('en-US')} AED = ${priceFils} fils)`,
  );

  // 5. AffectionPlan — append (never deleteMany).
  const plan = await prisma.affectionPlan.create({
    data: {
      parcelId: parcel.id,
      source: 'affection-plan/DIA-RE-0167 (Trakhees/NAKHEEL) — synthesized rectangle',
      plotNumber: SPEC.plotNumber,
      projectName: SPEC.projectName,
      community: `${SPEC.community} - ${SPEC.communityNumber}`,
      masterDeveloper: SPEC.masterDeveloper,

      plotAreaSqm: SPEC.plotAreaSqm,
      plotAreaSqft,
      maxGfaSqm: SPEC.maxGfaSqm,
      maxGfaSqft,

      maxHeightCode: SPEC.maxHeightCode,
      maxFloors: SPEC.maxFloors,
      maxHeightMeters: SPEC.maxHeightMeters,
      far: SPEC.far,

      setbacks: SPEC.setbacks as unknown as Prisma.InputJsonValue,
      landUseMix: SPEC.landUseMix as unknown as Prisma.InputJsonValue,
      raw: {
        developerPlotNo: SPEC.developerPlotNo,
        owner: SPEC.owner,
        possessor: SPEC.owner,
        authority: SPEC.authority,
        dldRef: SPEC.dldRef,
        communityNumber: SPEC.communityNumber,
        makani: SPEC.makani,
        coverageGFPct: SPEC.coverageGFPct,
        coverageTowerPct: SPEC.coverageTowerPct,
        zoneBboxUtm: SPEC.zoneBboxUtm,
      } as unknown as Prisma.InputJsonValue,

      buildingStyle: SPEC.buildingStyle,
      notes: SPEC.notes,
    },
  });

  console.log(`  AffectionPlan: created ${plan.id}`);
  console.log(`  style:    ${SPEC.buildingStyle} (${SPEC.maxHeightMeters} m, ${SPEC.maxFloors} floors)`);
  console.log(`  land use: ${SPEC.landUseMix.map((x) => `${x.category}/${x.sub}`).join(', ')}`);
  console.log('\nDone.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
