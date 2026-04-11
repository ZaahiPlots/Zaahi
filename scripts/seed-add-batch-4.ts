/**
 * Plot add — batch 4 (60 plot numbers).
 *
 * Same flow as scripts/seed-add-batch-3.ts:
 *   1. Pre-flight duplicate check on plotNumber alone.
 *   2. Polygon (BASIC_LAND_BASE/2) → fetchPlotInfoHtml + parseAffectionPlan
 *      → fetchBuildingLimit → Parcel + AffectionPlan rows.
 *   3. LISTED if maxGfaSqft is present, otherwise VACANT polygon-only.
 *
 * Difference: process the 60 plots in chunks of 10 with a 5-second pause
 * between chunks to be polite to gis.dda.gov.ae and stay under any
 * implicit rate limit. Within a chunk the plots are processed sequentially.
 *
 * Run:
 *   npx tsx -r dotenv/config scripts/seed-add-batch-4.ts dotenv_config_path=.env.local
 */
import { Prisma, ParcelStatus, UserRole } from '@prisma/client';
import { prisma } from '../src/lib/prisma';
import { fetchPlotInfoHtml, parseAffectionPlan, fetchBuildingLimit } from '../src/lib/dda';

const SYSTEM_USER_ID = '00000000-0000-0000-0000-00000000zaah';
const SYSTEM_EMAIL = 'system@zaahi.ae';

const BATCH: Array<{ plotNumber: string; pricePerSqft: number }> = [
  { plotNumber: '3460653', pricePerSqft: 825 },
  { plotNumber: '3324513', pricePerSqft: 2700 },
  { plotNumber: '3435438', pricePerSqft: 3500 },
  { plotNumber: '5137653', pricePerSqft: 327 },
  { plotNumber: '6218415', pricePerSqft: 330 },
  { plotNumber: '6212101', pricePerSqft: 278 },
  { plotNumber: '6218456', pricePerSqft: 280 },
  { plotNumber: '6439705', pricePerSqft: 700 },
  { plotNumber: '6439661', pricePerSqft: 807 },
  { plotNumber: '6439709', pricePerSqft: 479 },
  { plotNumber: '6489191', pricePerSqft: 383 },
  { plotNumber: '6488726', pricePerSqft: 350 },
  { plotNumber: '6460177', pricePerSqft: 300 },
  { plotNumber: '6460178', pricePerSqft: 300 },
  { plotNumber: '6460179', pricePerSqft: 300 },
  { plotNumber: '6458188', pricePerSqft: 171 },
  { plotNumber: '6453276', pricePerSqft: 400 },
  { plotNumber: '6854566', pricePerSqft: 720 },
  { plotNumber: '6854567', pricePerSqft: 275 },
  { plotNumber: '6727759', pricePerSqft: 500 },
  { plotNumber: '6731110', pricePerSqft: 500 },
  { plotNumber: '6731108', pricePerSqft: 500 },
  { plotNumber: '6734082', pricePerSqft: 500 },
  { plotNumber: '6731186', pricePerSqft: 500 },
  { plotNumber: '9118380', pricePerSqft: 400 },
  { plotNumber: '4154777', pricePerSqft: 300 },
  { plotNumber: '3261035', pricePerSqft: 530 },
  { plotNumber: '5310484', pricePerSqft: 99 },
  { plotNumber: '6243982', pricePerSqft: 278 },
  { plotNumber: '3830276', pricePerSqft: 800 },
  { plotNumber: '5310382', pricePerSqft: 300 },
  { plotNumber: '5310383', pricePerSqft: 300 },
  { plotNumber: '5310384', pricePerSqft: 300 },
  { plotNumber: '5310951', pricePerSqft: 180 },
  { plotNumber: '3260922', pricePerSqft: 650 },
  { plotNumber: '3260887', pricePerSqft: 650 },
  { plotNumber: '6488536', pricePerSqft: 300 },
  { plotNumber: '6488549', pricePerSqft: 250 },
  { plotNumber: '3460555', pricePerSqft: 850 },
  { plotNumber: '3460731', pricePerSqft: 1260 },
  { plotNumber: '3261204', pricePerSqft: 647 },
  { plotNumber: '6453982', pricePerSqft: 400 },
  { plotNumber: '6452459', pricePerSqft: 400 },
  { plotNumber: '6457890', pricePerSqft: 400 },
  { plotNumber: '6455974', pricePerSqft: 400 },
  { plotNumber: '6457941', pricePerSqft: 400 },
  { plotNumber: '6457920', pricePerSqft: 400 },
  { plotNumber: '6457802', pricePerSqft: 650 },
  { plotNumber: '6455948', pricePerSqft: 320 },
  { plotNumber: '6218474', pricePerSqft: 350 },
  { plotNumber: '6218574', pricePerSqft: 330 },
  { plotNumber: '6218515', pricePerSqft: 330 },
  { plotNumber: '6218609', pricePerSqft: 300 },
  { plotNumber: '4168106', pricePerSqft: 250 },
  { plotNumber: '3261113', pricePerSqft: 543 },
  { plotNumber: '3261107', pricePerSqft: 530 },
  { plotNumber: '3261099', pricePerSqft: 563 },
  { plotNumber: '3323003', pricePerSqft: 4200 },
  { plotNumber: '3830328', pricePerSqft: 650 },
  { plotNumber: '6854214', pricePerSqft: 275 },
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
    create: { id: SYSTEM_USER_ID, email: SYSTEM_EMAIL, role: UserRole.ADMIN, name: 'ZAAHI System' },
    update: {},
  });
}

type Outcome = 'added-listed' | 'added-vacant' | 'skipped-dup' | 'dda-fail' | 'no-poly' | 'error';

async function seedOne(plotNumber: string, pricePerSqft: number): Promise<Outcome> {
  const dup = await prisma.parcel.findFirst({
    where: { plotNumber },
    select: { id: true, district: true, status: true },
  });
  if (dup) {
    console.log(`⊘ ${plotNumber} — already exists (id=${dup.id}, district=${dup.district}, status=${dup.status})`);
    return 'skipped-dup';
  }

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

  let plan: ReturnType<typeof parseAffectionPlan>;
  try {
    const html = await fetchPlotInfoHtml(plotNumber);
    plan = parseAffectionPlan(html);
  } catch (e) {
    console.warn(`⊘ ${plotNumber} — affection plan fetch failed: ${(e as Error).message}`);
    return 'dda-fail';
  }

  let buildingLimit: GeoJSON.Polygon | null = null;
  try {
    buildingLimit = await fetchBuildingLimit(plotNumber);
  } catch {
    /* optional */
  }

  const gfaSqft = plan.maxGfaSqft;
  let status: ParcelStatus;
  let priceFils: bigint | null;
  if (gfaSqft && gfaSqft > 0) {
    const priceAed = Math.round(gfaSqft * pricePerSqft);
    priceFils = BigInt(priceAed) * BigInt(100);
    status = ParcelStatus.LISTED;
  } else {
    console.warn(
      `  ! ${plotNumber} — no maxGfaSqft (undeveloped); inserting as VACANT polygon-only`,
    );
    priceFils = null;
    status = ParcelStatus.VACANT;
  }

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
        `✓ ${plotNumber} → ${district} • ${gfaSqft.toLocaleString()} × ${pricePerSqft} = ${priceAed.toLocaleString()} AED • bldLimit=${buildingLimit ? 'yes' : 'no'} • LISTED`,
      );
      return 'added-listed';
    }
    console.log(`✓ ${plotNumber} → ${district} • polygon only • VACANT`);
    return 'added-vacant';
  } catch (e) {
    console.error(`✗ ${plotNumber} — DB write failed: ${(e as Error).message}`);
    return 'error';
  }
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function main() {
  await ensureSystemUser();

  const tally = {
    'added-listed': 0,
    'added-vacant': 0,
    'skipped-dup': 0,
    'dda-fail': 0,
    'no-poly': 0,
    error: 0,
  };

  // Process in chunks of 10 with a 5-second pause between chunks.
  const CHUNK = 10;
  for (let i = 0; i < BATCH.length; i += CHUNK) {
    const slice = BATCH.slice(i, i + CHUNK);
    const chunkN = i / CHUNK + 1;
    console.log('');
    console.log(`── chunk ${chunkN}/${Math.ceil(BATCH.length / CHUNK)} (${slice.length} plots) ──`);
    for (const item of slice) {
      const r = await seedOne(item.plotNumber, item.pricePerSqft);
      tally[r]++;
    }
    if (i + CHUNK < BATCH.length) {
      console.log(`  ⏸  pause 5s before next chunk…`);
      await sleep(5000);
    }
  }

  const totalParcels = await prisma.parcel.count();
  const onMap = await prisma.parcel.count({
    where: { status: { in: [ParcelStatus.LISTED, ParcelStatus.VERIFIED, ParcelStatus.IN_DEAL] } },
  });

  console.log('');
  console.log('═════════════════════════════════════════════');
  console.log('  BATCH 4 SEED — RESULTS');
  console.log('═════════════════════════════════════════════');
  console.log(`  added (LISTED, on map):  ${tally['added-listed']}`);
  console.log(`  added (VACANT, no map):  ${tally['added-vacant']}`);
  console.log(`  skipped (duplicate):     ${tally['skipped-dup']}`);
  console.log(`  DDA fetch failed:        ${tally['dda-fail']}`);
  console.log(`  no polygon returned:     ${tally['no-poly']}`);
  console.log(`  DB write error:          ${tally.error}`);
  console.log(`  ─────────────────────────────`);
  console.log(`  total parcels in db:     ${totalParcels}`);
  console.log(`  visible on /api/parcels/map: ${onMap}`);
  console.log('═════════════════════════════════════════════');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
