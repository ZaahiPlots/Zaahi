/**
 * Plot add — batch 3.
 *
 * 10 plot numbers, each with a target price-per-sqft of GFA. For every plot:
 *   1. Pre-flight duplicate check on plotNumber alone (per CLAUDE.md
 *      "NEVER add duplicate parcels"). If a row already exists, skip and
 *      log id / district / status.
 *   2. Otherwise full DDA seed: polygon (BASIC_LAND_BASE/2) →
 *      fetchPlotInfoHtml + parseAffectionPlan → fetchBuildingLimit →
 *      Parcel + AffectionPlan rows.
 *   3. Status LISTED (the schema enum equivalent of "for sale" — there
 *      is no FOR_SALE value, the map filters on LISTED/VERIFIED/IN_DEAL).
 *   4. If DDA returns the polygon but no maxGfaSqft (undeveloped land),
 *      insert as VACANT polygon-only with no asking price (same
 *      fallback parcels-batch3.ts settled on).
 *
 * The map page filters on `status in (LISTED, VERIFIED, IN_DEAL)`, so
 * VACANT fallbacks will not appear on the public map until they get a
 * proper plan. They are still in the DB so they can be repriced later.
 *
 * Run:
 *   npx tsx -r dotenv/config scripts/seed-add-batch-3.ts dotenv_config_path=.env.local
 */
import { Prisma, ParcelStatus, UserRole } from '@prisma/client';
import { prisma } from '../src/lib/prisma';
import { fetchPlotInfoHtml, parseAffectionPlan, fetchBuildingLimit } from '../src/lib/dda';

const SYSTEM_USER_ID = '00000000-0000-0000-0000-00000000zaah';
const SYSTEM_EMAIL = 'system@zaahi.ae';

const BATCH: Array<{ plotNumber: string; pricePerSqft: number }> = [
  { plotNumber: '6466979', pricePerSqft: 300 },
  { plotNumber: '6468141', pricePerSqft: 300 },
  { plotNumber: '6439976', pricePerSqft: 300 },
  { plotNumber: '6439740', pricePerSqft: 571 },
  { plotNumber: '6439755', pricePerSqft: 734 },
  { plotNumber: '6437605', pricePerSqft: 200 },
  { plotNumber: '6261523', pricePerSqft: 175 },
  { plotNumber: '6218420', pricePerSqft: 330 },
  { plotNumber: '6218398', pricePerSqft: 250 },
  { plotNumber: '6218473', pricePerSqft: 350 },
];

interface PolyFeature {
  geometry: GeoJSON.Polygon;
  properties: Record<string, unknown>;
}

function polyUrl(plotNumber: string): string {
  return (
    'https://gis.dda.gov.ae/server/rest/services/DDA/BASIC_LAND_BASE/MapServer/2/query' +
    `?where=PLOT_NUMBER%3D%27${plotNumber}%27&outFields=*&returnGeometry=true&outSR=4326&f=geojson`
  );
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

type Outcome = 'added-listed' | 'added-vacant' | 'skipped-dup' | 'dda-fail' | 'no-poly' | 'error';

async function seedOne(plotNumber: string, pricePerSqft: number): Promise<Outcome> {
  // 1. Duplicate check by plotNumber alone.
  const dup = await prisma.parcel.findFirst({
    where: { plotNumber },
    select: { id: true, district: true, status: true },
  });
  if (dup) {
    console.log(`⊘ ${plotNumber} — already exists (id=${dup.id}, district=${dup.district}, status=${dup.status})`);
    return 'skipped-dup';
  }

  // 2. Polygon
  let polyJson: { features?: PolyFeature[] };
  try {
    const r = await fetch(polyUrl(plotNumber), { cache: 'no-store' });
    if (!r.ok) {
      console.warn(`⊘ ${plotNumber} — DDA polygon HTTP ${r.status}`);
      return 'dda-fail';
    }
    polyJson = (await r.json()) as { features?: PolyFeature[] };
  } catch (e) {
    console.warn(`⊘ ${plotNumber} — DDA polygon fetch failed: ${(e as Error).message}`);
    return 'dda-fail';
  }
  const feat = polyJson.features?.[0];
  if (!feat?.geometry) {
    console.warn(`⊘ ${plotNumber} — DDA returned no polygon`);
    return 'no-poly';
  }
  const geometry = feat.geometry;
  const props = feat.properties;
  const projectName = (props.PROJECT_NAME as string) ?? 'UNKNOWN';
  const developer = (props.DEVELOPER_NAME as string) ?? null;
  const district = projectName;
  const ring = geometry.coordinates[0];
  const cLng = ring.reduce((s, p) => s + p[0], 0) / ring.length;
  const cLat = ring.reduce((s, p) => s + p[1], 0) / ring.length;

  // 3. Affection plan
  let plan: ReturnType<typeof parseAffectionPlan>;
  try {
    const html = await fetchPlotInfoHtml(plotNumber);
    plan = parseAffectionPlan(html);
  } catch (e) {
    console.warn(`⊘ ${plotNumber} — affection plan fetch failed: ${(e as Error).message}`);
    return 'dda-fail';
  }

  // 4. Building limit (drives 3D extrusion footprint — optional)
  let buildingLimit: GeoJSON.Polygon | null = null;
  try {
    buildingLimit = await fetchBuildingLimit(plotNumber);
  } catch (e) {
    console.warn(`  ! [building-limit] ${plotNumber} skipped: ${(e as Error).message}`);
  }

  // 5. Price (with VACANT fallback for undeveloped land)
  const gfaSqft = plan.maxGfaSqft;
  let status: ParcelStatus;
  let priceFils: bigint | null;
  if (gfaSqft && gfaSqft > 0) {
    const priceAed = Math.round(gfaSqft * pricePerSqft);
    priceFils = BigInt(priceAed) * BigInt(100);
    status = ParcelStatus.LISTED;
  } else {
    console.warn(
      `  ! ${plotNumber} — DDA returned polygon but no maxGfaSqft (undeveloped land); inserting as VACANT polygon-only`,
    );
    priceFils = null;
    status = ParcelStatus.VACANT;
  }

  // 6. Insert
  try {
    const parcel = await prisma.parcel.create({
      data: {
        plotNumber,
        ownerId: SYSTEM_USER_ID,
        area: plan.plotAreaSqft ?? 0,
        emirate: 'Dubai',
        district,
        latitude: cLat,
        longitude: cLng,
        geometry: geometry as unknown as Prisma.InputJsonValue,
        status,
        currentValuation: priceFils,
      },
    });
    await prisma.affectionPlan.create({
      data: {
        parcelId: parcel.id,
        source: 'gis.dda.gov.ae/DIS',
        plotNumber: plan.plotNumber || plotNumber,
        oldNumber: plan.oldNumber,
        projectName: plan.projectName ?? projectName,
        community: plan.community ?? district,
        masterDeveloper: plan.masterDeveloper ?? developer,
        plotAreaSqm: plan.plotAreaSqm,
        plotAreaSqft: plan.plotAreaSqft,
        maxGfaSqm: plan.maxGfaSqm,
        maxGfaSqft: plan.maxGfaSqft,
        maxHeightCode: plan.maxHeightCode,
        maxFloors: plan.maxFloors,
        maxHeightMeters: plan.maxHeightMeters,
        far: plan.far,
        setbacks: plan.setbacks as unknown as Prisma.InputJsonValue,
        landUseMix: plan.landUseMix as unknown as Prisma.InputJsonValue,
        sitePlanIssue: plan.sitePlanIssue ? new Date(plan.sitePlanIssue) : null,
        sitePlanExpiry: plan.sitePlanExpiry ? new Date(plan.sitePlanExpiry) : null,
        notes: plan.notes,
        buildingLimitGeometry:
          (buildingLimit as unknown as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        raw: plan as unknown as Prisma.InputJsonValue,
      },
    });

    if (priceFils != null && gfaSqft) {
      const priceAed = Number(priceFils / BigInt(100));
      console.log(
        `✓ ${plotNumber} → ${district} • ${gfaSqft.toLocaleString()} sqft GFA × ${pricePerSqft} = ${priceAed.toLocaleString()} AED • bldLimit=${buildingLimit ? 'yes' : 'no'} • LISTED • id=${parcel.id}`,
      );
      return 'added-listed';
    }
    console.log(
      `✓ ${plotNumber} → ${district} • polygon only • VACANT • id=${parcel.id}`,
    );
    return 'added-vacant';
  } catch (e) {
    console.error(`✗ ${plotNumber} — DB write failed: ${(e as Error).message}`);
    return 'error';
  }
}

async function main() {
  await ensureSystemUser();

  const tally = {
    'added-listed': 0,
    'added-vacant': 0,
    'skipped-dup': 0,
    'dda-fail': 0,
    'no-poly': 0,
    'error': 0,
  };

  for (const item of BATCH) {
    const r = await seedOne(item.plotNumber, item.pricePerSqft);
    tally[r]++;
  }

  const totalParcels = await prisma.parcel.count();

  console.log('');
  console.log('═════════════════════════════════════════════');
  console.log('  BATCH 3 SEED — RESULTS');
  console.log('═════════════════════════════════════════════');
  console.log(`  added (LISTED, on map):  ${tally['added-listed']}`);
  console.log(`  added (VACANT, no map):  ${tally['added-vacant']}`);
  console.log(`  skipped (duplicate):     ${tally['skipped-dup']}`);
  console.log(`  DDA fetch failed:        ${tally['dda-fail']}`);
  console.log(`  no polygon returned:     ${tally['no-poly']}`);
  console.log(`  DB write error:          ${tally['error']}`);
  console.log(`  ─────────────────────────────`);
  console.log(`  total parcels in db now: ${totalParcels}`);
  console.log('═════════════════════════════════════════════');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
