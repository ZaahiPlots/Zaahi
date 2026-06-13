// READ-ONLY. Export one representative real plot footprint per land-use
// archetype → docs/research/archetype-shots/footprints.json. No writes to DB.
import { config } from "dotenv";
config({ path: ".env.local" });
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { writeFileSync, mkdirSync } from "node:fs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function categorize(s) {
  const l = (s || "").toLowerCase();
  if (/residential|villa|townhouse|\bapartment\b/.test(l)) return "RESIDENTIAL";
  if (/commercial|office|retail|showroom|\bcbd\b/.test(l)) return "COMMERCIAL";
  if (/hotel|hospitality|resort|serviced\s*apartment/.test(l)) return "HOTEL";
  if (/industrial|warehouse|factory|logistics|storage/.test(l)) return "INDUSTRIAL";
  if (/educat|school|university|academy|nursery/.test(l)) return "EDUCATIONAL";
  if (/health|hospital|clinic|medical/.test(l)) return "HEALTHCARE";
  if (/agricult|\bfarm\b/.test(l)) return "AGRICULTURAL";
  if (/future\s*development/.test(l)) return "FUTURE_DEVELOPMENT";
  return null;
}
function deriveLandUse(mix) {
  if (!mix || mix.length === 0) return null;
  const cats = new Set();
  for (const u of mix) {
    const a = categorize(u.category || ""); const b = categorize(u.sub || "");
    if (a) cats.add(a); if (b) cats.add(b);
  }
  if (cats.size > 1) return "MIXED_USE";
  if (cats.size === 1) return [...cats][0];
  return null;
}

const parcels = await prisma.parcel.findMany({
  select: {
    plotNumber: true, emirate: true, district: true, geometry: true, area: true,
    affectionPlans: {
      orderBy: { fetchedAt: "desc" }, take: 1,
      select: {
        landUseMix: true, maxFloors: true, maxHeightMeters: true,
        plotAreaSqft: true, setbacks: true, buildingLimitGeometry: true,
        buildingStyle: true, projectName: true, community: true,
      },
    },
  },
});

// Pick, per category, the parcel with a valid Polygon geometry and the
// most floors (tallest = most interesting silhouette).
const best = {};
for (const p of parcels) {
  const ap = p.affectionPlans[0];
  const cat = deriveLandUse(ap?.landUseMix);
  if (!cat) continue;
  const geom = p.geometry;
  if (!geom || geom.type !== "Polygon" || !Array.isArray(geom.coordinates)) continue;
  const floors = ap?.maxFloors ?? Math.round((ap?.maxHeightMeters ?? 0) / 3.5) ?? 0;
  const cur = best[cat];
  if (!cur || floors > cur.floors) {
    best[cat] = {
      landUse: cat, plot: p.plotNumber, emirate: p.emirate, district: p.district,
      project: ap?.projectName, community: ap?.community,
      floors, maxHeightMeters: ap?.maxHeightMeters ?? null,
      areaSqft: ap?.plotAreaSqft ?? p.area ?? null,
      setbacks: ap?.setbacks ?? null,
      buildingStyle: ap?.buildingStyle ?? null,
      buildingLimitGeometry: ap?.buildingLimitGeometry ?? null,
      geometry: geom,
    };
  }
}

mkdirSync("docs/research/archetype-shots", { recursive: true });
writeFileSync(
  "docs/research/archetype-shots/footprints.json",
  JSON.stringify(best, null, 2),
);
console.log("Exported categories:", Object.keys(best).join(", "));
for (const [k, v] of Object.entries(best)) {
  console.log(`  ${k.padEnd(20)} plot ${v.plot} floors=${v.floors} area=${Math.round(v.areaSqft||0)} ring=${v.geometry.coordinates[0].length}pts setbacks=${v.setbacks?"yes":"no"} buildLimit=${v.buildingLimitGeometry?"yes":"no"}`);
}
await prisma.$disconnect();
