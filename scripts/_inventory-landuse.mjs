// READ-ONLY land-use inventory for the research/landuse-archetypes task.
// No writes. Counts ZAAHI parcels by derived land-use category and hunts
// for the DLRC hotel cluster. Mirrors deriveLandUse() from page.tsx.
import { config } from "dotenv";
config({ path: ".env.local" });
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

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
    const a = categorize(u.category || "");
    const b = categorize(u.sub || "");
    if (a) cats.add(a);
    if (b) cats.add(b);
  }
  if (cats.size > 1) return "MIXED_USE";
  if (cats.size === 1) return [...cats][0];
  return null;
}

const parcels = await prisma.parcel.findMany({
  select: {
    id: true, plotNumber: true, emirate: true, district: true,
    latitude: true, longitude: true, status: true,
    affectionPlans: {
      orderBy: { fetchedAt: "desc" }, take: 1,
      select: {
        community: true, projectName: true, landUseMix: true,
        maxFloors: true, maxHeightMeters: true, plotAreaSqft: true,
        setbacks: true, buildingStyle: true,
        buildingLimitGeometry: false,
      },
    },
  },
});

const byCat = {};
const byEmirate = {};
const noClass = [];
const hotels = [];
const dlrc = [];

for (const p of parcels) {
  const ap = p.affectionPlans[0];
  const mix = ap?.landUseMix ?? null;
  let cat = deriveLandUse(mix);
  // INVESTMENT fallback (AD primaryUse) — approximate: emirate AD + no class
  if (!cat && p.emirate && /abu/i.test(p.emirate)) {
    // leave null; not enough info offline
  }
  const key = cat ?? "UNCLASSIFIED";
  byCat[key] = (byCat[key] || 0) + 1;
  byEmirate[p.emirate] = (byEmirate[p.emirate] || 0) + 1;
  if (!cat) noClass.push({ plot: p.plotNumber, emirate: p.emirate, district: p.district, mix });
  const ctx = `${p.district || ""} ${ap?.community || ""} ${ap?.projectName || ""}`.toLowerCase();
  if (cat === "HOTEL") {
    hotels.push({
      plot: p.plotNumber, district: p.district, community: ap?.community,
      project: ap?.projectName, lat: p.latitude, lng: p.longitude,
      floors: ap?.maxFloors, areaSqft: ap?.plotAreaSqft,
    });
  }
  if (/dlrc|dubai land residence|majan|wadi al safa/.test(ctx)) {
    dlrc.push({
      plot: p.plotNumber, cat, district: p.district, community: ap?.community,
      project: ap?.projectName, lat: p.latitude, lng: p.longitude,
    });
  }
}

console.log("TOTAL PARCELS:", parcels.length);
console.log("\nBY EMIRATE:", JSON.stringify(byEmirate, null, 0));
console.log("\nBY LAND-USE CATEGORY:");
for (const [k, v] of Object.entries(byCat).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k.padEnd(20)} ${v}`);
}
console.log("\nHOTELS (", hotels.length, "):");
for (const h of hotels) console.log("  ", JSON.stringify(h));
console.log("\nDLRC / MAJAN / WADI AL SAFA context (", dlrc.length, "):");
for (const d of dlrc) console.log("  ", JSON.stringify(d));
console.log("\nUNCLASSIFIED (", noClass.length, "):");
for (const n of noClass.slice(0, 40)) console.log("  ", JSON.stringify(n));

await prisma.$disconnect();
