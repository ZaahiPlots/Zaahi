/**
 * Pull affection plans + Building Limit polygons from DDA for the demo
 * Business Bay parcels (3466801 = G+15, 3460391 = G+54).
 * Run: pnpm refresh:affection
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  fetchPlotInfoHtml,
  parseAffectionPlan,
  fetchBuildingLimit,
} from '../src/lib/dda';

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL! });
const prisma = new PrismaClient({ adapter });

const TARGETS = ['3466801', '3460391'];

async function main() {
  for (const plotNumber of TARGETS) {
    console.log(`\n→ ${plotNumber}`);
    const parcel = await prisma.parcel.findFirst({ where: { plotNumber } });
    if (!parcel) {
      console.log('  parcel not in DB, skip');
      continue;
    }

    const html = await fetchPlotInfoHtml(plotNumber);
    const plan = parseAffectionPlan(html);
    console.log(`  parsed: ${plan.maxHeightCode}, floors=${plan.maxFloors}, FAR=${plan.far}`);

    let buildingLimit: GeoJSON.Polygon | null = null;
    try {
      buildingLimit = await fetchBuildingLimit(plotNumber);
      console.log(`  building limit: ${buildingLimit ? buildingLimit.type : 'none'}`);
    } catch (e) {
      console.log(`  building limit failed: ${(e as Error).message}`);
    }

    const created = await prisma.affectionPlan.create({
      data: {
        parcelId: parcel.id,
        source: 'gis.dda.gov.ae/DIS',
        plotNumber: plan.plotNumber || plotNumber,
        oldNumber: plan.oldNumber,
        projectName: plan.projectName,
        community: plan.community,
        masterDeveloper: plan.masterDeveloper,
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
        buildingLimitGeometry: (buildingLimit as unknown as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        raw: plan as unknown as Prisma.InputJsonValue,
      },
    });
    console.log(`  saved AffectionPlan ${created.id}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
