/**
 * Seed two new Dubai ZAAHI listings:
 *   1. Warsan Fourth — International City Phase 3, plot 6241067
 *      NAKHEEL developer plot IC3-E-1, Residential (LR2) G+3 Apartments.
 *      Owner: SALEM AHMAD SALEM ALQAISI.  Price: 25,000,000 AED.
 *
 *   2. Dubai South — Community 92 Villas, plot RA-TH (non-numeric, like
 *      the Abu Dhabi SP1-P28 format).  Residential villas/townhouses,
 *      G+2, FAR 1.0, Coverage 50%.  **Joint Venture opportunity only** —
 *      owner does not consider direct sale.  No public price.
 *
 * Both polygons are in Dubai Local TM (EPSG:3997) — same convention as
 * scripts/seed-new-listings.ts (NOT UTM Zone 40N despite PDF labels).
 * Rings are closed (first = last).  Output geometry is GeoJSON Polygon
 * in WGS84, 2D, identical structure to existing Parcel rows.
 *
 * Idempotent: upserts Parcel on (emirate, district, plotNumber) and
 * appends a fresh AffectionPlan row (never deletes prior rows, per CLAUDE.md).
 *
 * Price rule — per CLAUDE.md "Цена участка — ТОЛЬКО ВРУЧНУЮ":
 *   Set on CREATE only. On re-run the existing currentValuation is left
 *   exactly as-is (owner may have edited it via UI).  Dubai South is JV-only
 *   → currentValuation is null on create; the JV-only note lives in the
 *   AffectionPlan.notes field.
 *
 * Run: npx tsx -r dotenv/config scripts/seed-warsan-dubai-south.ts dotenv_config_path=.env.local
 */
import proj4 from 'proj4';
import { UserRole, ParcelStatus, Prisma } from '@prisma/client';
import { prisma } from '../src/lib/prisma';

const SYSTEM_USER_ID = '00000000-0000-0000-0000-00000000zaah';
const SYSTEM_EMAIL = 'system@zaahi.ae';

// ── Projections ──
// EPSG:3997 — WGS 84 / Dubai Local TM (central meridian 55°20').
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

// Shoelace in the source (local metres) CRS — gives the real ground area,
// independent of lat/lng projection errors.  Used for sanity-check only.
function localAreaSqm(pts: Array<[number, number]>): number {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a / 2);
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

// ── Plot specs ──

interface PlotSpec {
  plotNumber: string;
  emirate: string;
  district: string;
  community: string;
  communityNumber?: string | null;
  masterDeveloper: string;
  developerPlotNo?: string | null;
  affectionPlanRef: string;
  owner: string;
  landUseMix: Array<{ category: string; sub: string; areaSqm: number | null }>;
  plotAreaSqm: number;
  maxGfaSqm: number | null;
  far: number | null;
  maxPlotCoveragePct: number | null;
  maxHeightMeters: number;
  maxHeightCode: string;
  maxFloors: number | null;
  priceAed: number | null;
  buildingStyle: string;
  projectName: string;
  landUseDescription: string;
  notes: string;
  // Polygon in Dubai Local TM (EPSG:3997), NOT closed — seed closes it.
  tmPoints: Array<[number, number]>;
  // Expected centroid (WGS84) — refuse to seed if far off.
  expectedLng: number;
  expectedLat: number;
  centroidToleranceDeg: number;
}

const PLOTS: PlotSpec[] = [
  {
    plotNumber: '6241067',
    emirate: 'Dubai',
    district: 'WARSAN FOURTH',
    community: 'INTERNATIONAL CITY PHASE 3',
    communityNumber: '624',
    masterDeveloper: 'NAKHEEL',
    developerPlotNo: 'IC3-E-1',
    affectionPlanRef: 'RC-RA-TH-22/6/2016',
    owner: 'SALEM AHMAD SALEM ALQAISI',
    landUseMix: [
      { category: 'RESIDENTIAL', sub: 'LR2 APARTMENT (G+3)', areaSqm: 3292.71 },
    ],
    plotAreaSqm: 3292.71,
    maxGfaSqm: null,
    far: null,
    maxPlotCoveragePct: null,
    maxHeightMeters: 15, // G+3 apartment ≈ 4 × 3.5m + ground
    maxHeightCode: 'G+3',
    maxFloors: 4, // G + 3
    priceAed: 25_000_000,
    buildingStyle: 'SIGNATURE',
    projectName: 'International City Phase 3 — Plot IC3-E-1',
    landUseDescription: 'Residential (LR2) Apartment, G+3 Storey Minimum',
    notes:
      'International City Phase 3, Warsan Fourth (community 624). ' +
      'NAKHEEL developer plot IC3-E-1. Residential (LR2) Apartment, ' +
      'G+3 Storey Minimum. Plot area 3,292.71 m². ' +
      'Owner: SALEM AHMAD SALEM ALQAISI. ' +
      'Affection plan ref: RC-RA-TH-22/6/2016. ' +
      'Asking price: 25,000,000 AED.',
    tmPoints: [
      [505999.752, 2782004.591],
      [505965.122, 2781996.340],
      [505940.0, 2781920.0],
      [506021.055, 2781904.749],
      [506026.895, 2781909.978],
    ],
    expectedLng: 55.4,
    expectedLat: 25.17,
    centroidToleranceDeg: 0.05,
  },
  {
    plotNumber: 'RA-TH',
    emirate: 'Dubai',
    district: 'DUBAI SOUTH',
    community: 'COMMUNITY 92 VILLAS',
    communityNumber: null,
    masterDeveloper: 'DUBAI SOUTH',
    developerPlotNo: 'RA-TH',
    affectionPlanRef: 'RC-RA-TH-22/6/2016',
    owner: 'DUBAI SOUTH (JV opportunity — direct sale not considered)',
    landUseMix: [
      { category: 'RESIDENTIAL', sub: 'VILLAS / TOWNHOUSES (G+2)', areaSqm: 20_621.7 },
    ],
    plotAreaSqm: 20_621.7,
    maxGfaSqm: 20_621.7, // FAR 1.0 → GFA = plot area
    far: 1.0,
    maxPlotCoveragePct: 50,
    maxHeightMeters: 12, // G+2 villa ≈ 3 × 3.5m + ground
    maxHeightCode: 'G+2',
    maxFloors: 3, // G + 2
    priceAed: null, // JV-only — no direct-sale price
    buildingStyle: 'SIGNATURE',
    projectName: 'Dubai South — Community 92 Villas (RA-TH)',
    landUseDescription:
      'Residential Villas/Townhouses, G+2, FAR 1.0, Coverage 50%. ' +
      'Joint Venture opportunity — owner does not consider direct sale.',
    notes:
      'Dubai South, Community 92 Villas. Plot RA-TH, 20,621.7 m². ' +
      'Residential Villas/Townhouses, G+2, FAR 1.0, Coverage 50%. ' +
      'Joint Venture only. Owner open to JV partnership, not direct sale. ' +
      'Contact for terms. ' +
      'Affection plan ref: RC-RA-TH-22/6/2016.',
    tmPoints: [
      [487157.394, 2760134.997], // PT1
      [487112.874, 2760061.642], // PT2
      [486949.007, 2760177.266], // PT3
      [486993.32, 2760249.932], // PT4
      [487053.993, 2760208.262], // PT5
      [487059.925, 2760217.935], // PT6
      [487098.857, 2760194.25], // PT7
      [487115.101, 2760220.951], // PT8
      [487168.542, 2760188.439], // PT9
      [487141.815, 2760144.509], // PT10
    ],
    expectedLng: 55.17,
    expectedLat: 24.95,
    centroidToleranceDeg: 0.05,
  },
];

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

  // 1. Convert EPSG:3997 → WGS84 and close the ring.
  const ring: number[][] = spec.tmPoints.map(dubaiToLngLat);
  if (
    ring[0][0] !== ring[ring.length - 1][0] ||
    ring[0][1] !== ring[ring.length - 1][1]
  ) {
    ring.push(ring[0]);
  }
  const geometry: GeoJSON.Polygon = { type: 'Polygon', coordinates: [ring] };

  // 2. Sanity checks.
  const c = centroidOf(ring);
  const bb = bboxOf(ring);
  const groundAreaSqm = localAreaSqm(spec.tmPoints);
  console.log(
    `  bbox:     lng ${bb.minLng.toFixed(6)}..${bb.maxLng.toFixed(6)}  ` +
      `lat ${bb.minLat.toFixed(6)}..${bb.maxLat.toFixed(6)}`,
  );
  console.log(`  centroid: ${c.lng.toFixed(6)}, ${c.lat.toFixed(6)}`);
  console.log(
    `  area:     polygon=${groundAreaSqm.toFixed(2)} m², declared=${spec.plotAreaSqm} m² ` +
      `(ratio ${(groundAreaSqm / spec.plotAreaSqm).toFixed(2)}×)`,
  );
  const dLng = Math.abs(c.lng - spec.expectedLng);
  const dLat = Math.abs(c.lat - spec.expectedLat);
  if (dLng > spec.centroidToleranceDeg || dLat > spec.centroidToleranceDeg) {
    throw new Error(
      `Centroid ${c.lng.toFixed(4)},${c.lat.toFixed(4)} is >${spec.centroidToleranceDeg}° ` +
        `from expected ${spec.expectedLng},${spec.expectedLat} — refusing to seed plot ${spec.plotNumber}`,
    );
  }

  // 3. Derived values.
  const plotAreaSqft = Math.round(spec.plotAreaSqm * 10.7639 * 100) / 100;
  const maxGfaSqft =
    spec.maxGfaSqm != null
      ? Math.round(spec.maxGfaSqm * 10.7639 * 100) / 100
      : null;
  const priceFils = spec.priceAed != null ? BigInt(spec.priceAed) * BigInt(100) : null;

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
      // Null when JV-only — schema allows BigInt? (nullable).
      currentValuation: priceFils,
    },
    update: {
      // Refresh geometry + area. Never touch currentValuation or status
      // on re-run (those are manual-only per CLAUDE.md).
      area: plotAreaSqft,
      latitude: c.lat,
      longitude: c.lng,
      geometry: geometry as unknown as Prisma.InputJsonValue,
    },
  });

  console.log(
    existing
      ? `  Parcel: updated ${parcel.id} (status=${parcel.status}, kept existing price)`
      : `  Parcel: created ${parcel.id} (LISTED, ${
          priceFils == null
            ? 'NO PRICE — JV only'
            : `${spec.priceAed!.toLocaleString('en-US')} AED = ${priceFils} fils`
        })`,
  );

  // 5. AffectionPlan — append (never deleteMany, per CLAUDE.md).
  const plan = await prisma.affectionPlan.create({
    data: {
      parcelId: parcel.id,
      source: `Founder-supplied site plan (EPSG:3997) — ${spec.affectionPlanRef}`,
      plotNumber: spec.plotNumber,
      projectName: spec.projectName,
      community: spec.community,
      masterDeveloper: spec.masterDeveloper,

      plotAreaSqm: spec.plotAreaSqm,
      plotAreaSqft,
      maxGfaSqm: spec.maxGfaSqm,
      maxGfaSqft,

      maxHeightCode: spec.maxHeightCode,
      maxFloors: spec.maxFloors,
      maxHeightMeters: spec.maxHeightMeters,
      far: spec.far,

      // No per-side setbacks in source → null → land-use defaults kick in.
      setbacks: Prisma.JsonNull,
      landUseMix: spec.landUseMix as unknown as Prisma.InputJsonValue,

      // Schema has no top-level `notes` on Parcel nor `communityNumber`/
      // `developerPlotNo`/`owner`/`affectionPlanRef`/`landUseDescription`
      // columns — fold those into AffectionPlan.raw (Json) and
      // AffectionPlan.notes so nothing is lost.
      raw: {
        communityNumber: spec.communityNumber,
        developerPlotNo: spec.developerPlotNo,
        owner: spec.owner,
        affectionPlanRef: spec.affectionPlanRef,
        landUseDescription: spec.landUseDescription,
        maxPlotCoveragePct: spec.maxPlotCoveragePct,
        jointVentureOnly: spec.priceAed == null,
      } as unknown as Prisma.InputJsonValue,

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
  return { parcel, plan, centroid: c, bbox: bb, groundAreaSqm };
}

async function main() {
  await ensureSystemUser();

  // Pre-flight duplicate check (report only — we upsert anyway).
  const dups = await prisma.parcel.findMany({
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
  if (dups.length === 0) {
    console.log('Pre-flight duplicate check: none of the plots pre-existed.');
  } else {
    console.log('Pre-flight duplicate check — existing rows:');
    for (const d of dups) {
      console.log(
        `  ${d.plotNumber}: id=${d.id}  ${d.emirate}/${d.district}  ` +
          `status=${d.status}  price=${d.currentValuation?.toString() ?? 'null'} fils`,
      );
    }
  }

  const results: Array<Awaited<ReturnType<typeof seedPlot>>> = [];
  for (const spec of PLOTS) {
    results.push(await seedPlot(spec));
  }

  // 6. Verify: re-query both rows and print summary.
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
  });
  for (const r of verify) {
    console.log(
      `  ${r.plotNumber}  ${r.emirate}/${r.district}  ` +
        `status=${r.status}  areaSqft=${r.area}  ` +
        `price=${r.currentValuation?.toString() ?? 'null'} fils  ` +
        `centroid=${r.longitude?.toFixed(6)},${r.latitude?.toFixed(6)}`,
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
