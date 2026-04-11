/**
 * Parcel batch 3 — surgical fixes on existing rows.
 *
 * 1. Dump every plotNumber currently in the Parcel table (sorted, one per line).
 * 2. Re-seed the two VACANT stubs (6464982, 3260992) with a full DDA fetch:
 *      polygon → affection plan → building limit → land use → price.
 *    The existing stub rows are deleted first so the new row gets a fresh
 *    cuid and no stale fields.
 * 3. Update the asking price on:
 *      - 6457790 → 400 AED / sqft of GFA
 *      - 6488599 → 300 AED / sqft of GFA
 *    Both rows already exist with full DDA data — only `currentValuation`
 *    changes.
 * 4. Final audit — for every parcel print whether it has:
 *      - geometry (parcel polygon)
 *      - affection plan
 *      - building limit (3D extrusion footprint)
 *      - land use mix (drives 3D colour)
 *    Anything missing is logged with the plot number so the user can chase it.
 *
 * Run: npx tsx -r dotenv/config scripts/parcels-batch3.ts dotenv_config_path=.env.local
 */
import { Prisma, ParcelStatus, UserRole } from '@prisma/client';
import { prisma } from '../src/lib/prisma';
import { fetchPlotInfoHtml, parseAffectionPlan, fetchBuildingLimit } from '../src/lib/dda';

const SYSTEM_USER_ID = '00000000-0000-0000-0000-00000000zaah';
const SYSTEM_EMAIL = 'system@zaahi.ae';

const RESEED: Array<{ plotNumber: string; pricePerSqft: number }> = [
  { plotNumber: '6464982', pricePerSqft: 600 },
  { plotNumber: '3260992', pricePerSqft: 736 },
];

const REPRICE: Array<{ plotNumber: string; pricePerSqft: number }> = [
  { plotNumber: '6457790', pricePerSqft: 400 },
  { plotNumber: '6488599', pricePerSqft: 300 },
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

// ── Step 1 / 4: dump + audit ──────────────────────────────────────────────
async function dumpAndAudit(label: string) {
  const all = await prisma.parcel.findMany({
    select: {
      id: true,
      plotNumber: true,
      district: true,
      status: true,
      geometry: true,
      currentValuation: true,
      affectionPlans: {
        orderBy: { fetchedAt: 'desc' },
        take: 1,
        select: {
          id: true,
          maxFloors: true,
          maxHeightMeters: true,
          buildingLimitGeometry: true,
          landUseMix: true,
        },
      },
    },
  });
  all.sort((a, b) => a.plotNumber.localeCompare(b.plotNumber));

  console.log('');
  console.log(`── ${label} ── ${all.length} parcels ──────────────────────────────`);

  // Plain sorted list of plotNumbers (the user explicitly asked for this).
  console.log('plotNumbers (sorted, one per line):');
  for (const p of all) console.log(p.plotNumber);

  // Audit table.
  console.log('');
  console.log('plot     | status         | poly | plan | bldlim | landuse | floors');
  console.log('---------+----------------+------+------+--------+---------+-------');
  const issues: string[] = [];
  for (const p of all) {
    const plan = p.affectionPlans[0];
    const hasGeom = p.geometry != null;
    const hasPlan = !!plan;
    const hasBldLimit = !!plan?.buildingLimitGeometry;
    const landUseRaw = plan?.landUseMix;
    const hasLandUse = Array.isArray(landUseRaw) && landUseRaw.length > 0;
    const floors = plan?.maxFloors ?? null;
    console.log(
      [
        p.plotNumber.padEnd(8),
        (p.status as string).padEnd(14),
        (hasGeom ? '✓' : '✗').padEnd(4),
        (hasPlan ? '✓' : '✗').padEnd(4),
        (hasBldLimit ? '✓' : '✗').padEnd(6),
        (hasLandUse ? '✓' : '✗').padEnd(7),
        floors != null ? String(floors) : '?',
      ].join(' | '),
    );
    const missing: string[] = [];
    if (!hasGeom) missing.push('geometry');
    if (!hasPlan) missing.push('affectionPlan');
    if (!hasBldLimit) missing.push('buildingLimit');
    if (!hasLandUse) missing.push('landUseMix');
    if (missing.length > 0) {
      issues.push(`${p.plotNumber} (${p.district || '?'}): missing ${missing.join(', ')}`);
    }
  }

  console.log('');
  if (issues.length === 0) {
    console.log(`✓ all ${all.length} parcels are complete (geometry + plan + building limit + land use)`);
  } else {
    console.log(`⚠ ${issues.length} parcels need attention:`);
    for (const i of issues) console.log(`  - ${i}`);
  }
  console.log('');
  return all;
}

// ── Step 2: re-seed VACANT stubs ──────────────────────────────────────────
async function reseedOne(plotNumber: string, pricePerSqft: number) {
  console.log(`── reseed ${plotNumber} @ ${pricePerSqft} AED/sqft GFA ──`);

  // a. delete existing row (cascade kills affection plans, deals/docs are
  // expected to be empty for system stubs).
  const existing = await prisma.parcel.findFirst({ where: { plotNumber } });
  if (existing) {
    const dealCount = await prisma.deal.count({ where: { parcelId: existing.id } });
    if (dealCount > 0) {
      console.log(`  ✗ ${plotNumber} has ${dealCount} deals attached — refusing to delete. Skip.`);
      return;
    }
    await prisma.parcel.delete({ where: { id: existing.id } });
    console.log(`  ⊘ deleted stub id=${existing.id}`);
  }

  // b. polygon
  let polyJson: { features?: PolyFeature[] };
  try {
    const r = await fetch(polyUrl(plotNumber), { cache: 'no-store' });
    if (!r.ok) {
      console.log(`  ✗ DDA polygon HTTP ${r.status}`);
      return;
    }
    polyJson = (await r.json()) as { features?: PolyFeature[] };
  } catch (e) {
    console.log(`  ✗ DDA polygon fetch failed: ${(e as Error).message}`);
    return;
  }
  const feat = polyJson.features?.[0];
  if (!feat?.geometry) {
    console.log(`  ✗ DDA returned no polygon`);
    return;
  }
  const geometry = feat.geometry;
  const props = feat.properties;
  const projectName = (props.PROJECT_NAME as string) ?? 'UNKNOWN';
  const developer = (props.DEVELOPER_NAME as string) ?? null;
  const district = projectName;
  const ring = geometry.coordinates[0];
  const cLng = ring.reduce((s, p) => s + p[0], 0) / ring.length;
  const cLat = ring.reduce((s, p) => s + p[1], 0) / ring.length;

  // c. affection plan
  let plan: ReturnType<typeof parseAffectionPlan>;
  try {
    const html = await fetchPlotInfoHtml(plotNumber);
    plan = parseAffectionPlan(html);
  } catch (e) {
    console.log(`  ✗ affection plan fetch failed: ${(e as Error).message}`);
    return;
  }

  // d. building limit (drives 3D extrusion footprint)
  let buildingLimit: GeoJSON.Polygon | null = null;
  try {
    buildingLimit = await fetchBuildingLimit(plotNumber);
  } catch (e) {
    console.log(`  ! building limit skipped: ${(e as Error).message}`);
  }

  // e. price (GFA may be missing for undeveloped land — DDA returns polygon
  // but no affection plan with maxGfaSqft. In that case the parcel is still
  // worth keeping on the map, just as VACANT with no asking price.)
  const gfaSqft = plan.maxGfaSqft;
  let status: ParcelStatus;
  let priceFils: bigint | null;
  if (gfaSqft && gfaSqft > 0) {
    const priceAed = Math.round(gfaSqft * pricePerSqft);
    priceFils = BigInt(priceAed) * BigInt(100);
    status = ParcelStatus.LISTED;
  } else {
    console.log(
      `  ! ${plotNumber} — DDA returned polygon but no maxGfaSqft (undeveloped land); inserting as VACANT with no price`,
    );
    priceFils = null;
    status = ParcelStatus.VACANT;
  }

  // f. insert
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
        `  ✓ ${plotNumber} → ${district} • ${gfaSqft.toLocaleString()} sqft GFA × ${pricePerSqft} = ${priceAed.toLocaleString()} AED • bldLimit=${buildingLimit ? 'yes' : 'no'} • status=${status} • id=${parcel.id}`,
      );
    } else {
      console.log(
        `  ✓ ${plotNumber} → ${district} • polygon only • status=${status} • id=${parcel.id}`,
      );
    }
  } catch (e) {
    console.log(`  ✗ DB write failed: ${(e as Error).message}`);
  }
}

// ── Step 3: update asking price ────────────────────────────────────────────
async function repriceOne(plotNumber: string, pricePerSqft: number) {
  const parcel = await prisma.parcel.findFirst({
    where: { plotNumber },
    include: {
      affectionPlans: {
        orderBy: { fetchedAt: 'desc' },
        take: 1,
        select: { maxGfaSqft: true },
      },
    },
  });
  if (!parcel) {
    console.log(`⊘ ${plotNumber} — not found, can't reprice`);
    return;
  }
  const gfaSqft = parcel.affectionPlans[0]?.maxGfaSqft;
  if (!gfaSqft || gfaSqft <= 0) {
    console.log(`⊘ ${plotNumber} — no maxGfaSqft, can't compute new price`);
    return;
  }
  const priceAed = Math.round(gfaSqft * pricePerSqft);
  const priceFils = BigInt(priceAed) * BigInt(100);
  const before = parcel.currentValuation != null ? Number(parcel.currentValuation / BigInt(100)) : null;
  await prisma.parcel.update({
    where: { id: parcel.id },
    data: { currentValuation: priceFils },
  });
  console.log(
    `✓ ${plotNumber} reprice: ${before?.toLocaleString() ?? 'null'} → ${priceAed.toLocaleString()} AED (${gfaSqft.toLocaleString()} sqft × ${pricePerSqft})`,
  );
}

async function main() {
  await ensureSystemUser();

  console.log('═══════════════════════════════════════════════════════════');
  console.log('  STEP 1 — current state');
  console.log('═══════════════════════════════════════════════════════════');
  await dumpAndAudit('BEFORE');

  console.log('═══════════════════════════════════════════════════════════');
  console.log('  STEP 2 — reseed VACANT stubs');
  console.log('═══════════════════════════════════════════════════════════');
  for (const r of RESEED) await reseedOne(r.plotNumber, r.pricePerSqft);

  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  STEP 3 — reprice');
  console.log('═══════════════════════════════════════════════════════════');
  for (const r of REPRICE) await repriceOne(r.plotNumber, r.pricePerSqft);

  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  STEP 4 — final audit');
  console.log('═══════════════════════════════════════════════════════════');
  await dumpAndAudit('AFTER');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
