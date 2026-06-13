// Replace the RESIDENTIAL entry in footprints.json with a clean-footprint plot
// (6117231, Bu Kadra, 25 fl, rectangular) for a clearer terrace demo shot.
import { config } from "dotenv";
config({ path: ".env.local" });
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { readFileSync, writeFileSync } from "node:fs";
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const p = await prisma.parcel.findFirst({
  where: { plotNumber: "6117231" },
  select: { plotNumber: true, emirate: true, district: true, geometry: true, area: true,
    affectionPlans: { orderBy: { fetchedAt: "desc" }, take: 1,
      select: { landUseMix: true, maxFloors: true, maxHeightMeters: true, plotAreaSqft: true,
        setbacks: true, buildingLimitGeometry: true, buildingStyle: true, projectName: true, community: true } } },
});
const ap = p.affectionPlans[0];
const foots = JSON.parse(readFileSync("docs/research/archetype-shots/footprints.json", "utf8"));
foots.RESIDENTIAL = {
  landUse: "RESIDENTIAL", plot: p.plotNumber, emirate: p.emirate, district: p.district,
  project: ap?.projectName, community: ap?.community,
  floors: ap?.maxFloors ?? 0, maxHeightMeters: ap?.maxHeightMeters ?? null,
  areaSqft: ap?.plotAreaSqft ?? p.area ?? null, setbacks: ap?.setbacks ?? null,
  buildingStyle: ap?.buildingStyle ?? null, buildingLimitGeometry: ap?.buildingLimitGeometry ?? null,
  geometry: p.geometry,
};
writeFileSync("docs/research/archetype-shots/footprints.json", JSON.stringify(foots, null, 2));
console.log(`RESIDENTIAL -> plot ${p.plotNumber} ${p.district} floors=${ap?.maxFloors} ring=${p.geometry.coordinates[0].length}pts buildLimit=${!!ap?.buildingLimitGeometry}`);
await prisma.$disconnect();
