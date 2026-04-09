/**
 * Seed first ZAAHI listing — DDA plot 6457940 (Majan / Liwan).
 * Pulls real polygon, affection plan, and building limit from DDA.
 *
 * Run: npx tsx -r dotenv/config scripts/seed-6457940.ts dotenv_config_path=.env.local
 *
 * Idempotent.
 */
import { UserRole, ParcelStatus, Prisma } from '@prisma/client';
import { prisma } from '../src/lib/prisma';
import { fetchPlotInfoHtml, parseAffectionPlan, fetchBuildingLimit } from '../src/lib/dda';

const SYSTEM_USER_ID = '00000000-0000-0000-0000-00000000zaah';
const SYSTEM_EMAIL = 'system@zaahi.ae';

const PLOT_NUMBER = '6457940';
const PRICE_AED = 60_500_000;
const PRICE_FILS = BigInt(PRICE_AED) * BigInt(100);

const POLY_URL =
  'https://gis.dda.gov.ae/server/rest/services/DDA/BASIC_LAND_BASE/MapServer/2/query' +
  `?where=PLOT_NUMBER%3D%27${PLOT_NUMBER}%27&outFields=*&returnGeometry=true&outSR=4326&f=geojson`;

interface PolyFeature {
  geometry: GeoJSON.Polygon;
  properties: Record<string, unknown>;
}

async function main() {
  // 1. Polygon from BASIC_LAND_BASE/2
  const polyRes = await fetch(POLY_URL, { cache: 'no-store' });
  if (!polyRes.ok) throw new Error(`polygon fetch HTTP ${polyRes.status}`);
  const polyJson = (await polyRes.json()) as { features?: PolyFeature[] };
  const feat = polyJson.features?.[0];
  if (!feat?.geometry) throw new Error('plot polygon not found');
  const geometry = feat.geometry;
  const props = feat.properties;
  const projectName = (props.PROJECT_NAME as string) ?? 'MAJAN';
  const developer = (props.DEVELOPER_NAME as string) ?? null;
  const district = projectName; // DDA "PROJECT_NAME" is the community label

  // Polygon centroid for parcel.lat/lng (rough average of ring points)
  const ring = geometry.coordinates[0];
  const cLng = ring.reduce((s, p) => s + p[0], 0) / ring.length;
  const cLat = ring.reduce((s, p) => s + p[1], 0) / ring.length;

  // 2. Affection plan (HTML scrape)
  const html = await fetchPlotInfoHtml(PLOT_NUMBER);
  const plan = parseAffectionPlan(html);

  // 3. Building Limit (layer 8) — optional
  let buildingLimit: GeoJSON.Polygon | null = null;
  try {
    buildingLimit = await fetchBuildingLimit(PLOT_NUMBER);
  } catch (e) {
    console.warn('[building-limit] failed:', (e as Error).message);
  }

  // 4. System owner
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

  // 5. Parcel
  const parcel = await prisma.parcel.upsert({
    where: {
      emirate_district_plotNumber: {
        emirate: 'Dubai',
        district,
        plotNumber: PLOT_NUMBER,
      },
    },
    create: {
      plotNumber: PLOT_NUMBER,
      ownerId: SYSTEM_USER_ID,
      area: plan.plotAreaSqft ?? 25_199,
      emirate: 'Dubai',
      district,
      latitude: cLat,
      longitude: cLng,
      geometry: geometry as unknown as Prisma.InputJsonValue,
      status: ParcelStatus.LISTED,
      currentValuation: PRICE_FILS,
    },
    update: {
      area: plan.plotAreaSqft ?? 25_199,
      latitude: cLat,
      longitude: cLng,
      geometry: geometry as unknown as Prisma.InputJsonValue,
      status: ParcelStatus.LISTED,
      currentValuation: PRICE_FILS,
    },
  });

  // 6. AffectionPlan — replace any existing
  await prisma.affectionPlan.deleteMany({ where: { parcelId: parcel.id } });
  await prisma.affectionPlan.create({
    data: {
      parcelId: parcel.id,
      source: 'gis.dda.gov.ae/DIS',
      plotNumber: plan.plotNumber || PLOT_NUMBER,
      oldNumber: plan.oldNumber,
      projectName: plan.projectName ?? projectName,
      community: plan.community ?? district,
      masterDeveloper: plan.masterDeveloper ?? developer,
      plotAreaSqm: plan.plotAreaSqm ?? 2341,
      plotAreaSqft: plan.plotAreaSqft ?? 25_199,
      maxGfaSqm: plan.maxGfaSqm ?? 14_047,
      maxGfaSqft: plan.maxGfaSqft ?? 151_197,
      maxHeightCode: plan.maxHeightCode ?? 'G+10',
      maxFloors: plan.maxFloors ?? 11,
      maxHeightMeters: plan.maxHeightMeters ?? 44,
      far: plan.far ?? 6.0,
      setbacks: plan.setbacks as unknown as Prisma.InputJsonValue,
      landUseMix: (plan.landUseMix.length
        ? plan.landUseMix
        : [{ category: 'RESIDENTIAL', sub: 'APARTMENT', areaSqm: 2341 }]) as unknown as Prisma.InputJsonValue,
      sitePlanIssue: plan.sitePlanIssue ? new Date(plan.sitePlanIssue) : null,
      sitePlanExpiry: plan.sitePlanExpiry ? new Date(plan.sitePlanExpiry) : null,
      notes: plan.notes,
      buildingLimitGeometry:
        (buildingLimit as unknown as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      raw: plan as unknown as Prisma.InputJsonValue,
    },
  });

  console.log(`✓ Parcel ${parcel.id} (${PLOT_NUMBER}) — ${district}`);
  console.log(`  height: ${plan.maxHeightCode ?? 'G+10'} → ${plan.maxFloors ?? 11} floors / ${plan.maxHeightMeters ?? 44}m`);
  console.log(`  building limit: ${buildingLimit ? `${buildingLimit.coordinates[0].length} pts` : 'none'}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
