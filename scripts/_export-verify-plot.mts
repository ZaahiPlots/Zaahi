// Export one residential plot's plot ring + app-computed footprint for the
// in-bounds verification harness. Read-only.
import { config } from "dotenv";
config({ path: ".env.local" });
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { writeFileSync } from "node:fs";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
// plotNumber → archetype category
const PLOTS: Record<string, string> = {
  "6453982": "RESIDENTIAL", "5310384": "RESIDENTIAL", // worst two overhangers (pre-fix)
  "6460178": "MIXED_USE",                              // эталon mixed-use (City of Arabia, 66fl)
};

function insetRingByMeters(ring: number[][], setbackM: number): number[][] {
  if (setbackM <= 0) return ring;
  const lngs = ring.map((p) => p[0]); const lats = ring.map((p) => p[1]);
  const midLat = (Math.max(...lats) + Math.min(...lats)) / 2;
  const dLng = (Math.max(...lngs) - Math.min(...lngs)) * 111000 * Math.cos((midLat * Math.PI) / 180);
  const dLat = (Math.max(...lats) - Math.min(...lats)) * 111000;
  const halfWidth = Math.min(dLng, dLat) / 2; if (halfWidth <= 0) return ring;
  const scale = Math.max(0.5, 1 - setbackM / halfWidth);
  const cLng = ring.reduce((s, p) => s + p[0], 0) / ring.length;
  const cLat = ring.reduce((s, p) => s + p[1], 0) / ring.length;
  return ring.map(([lng, lat]) => [cLng + (lng - cLng) * scale, cLat + (lat - cLat) * scale]);
}

const out: Record<string, unknown> = {};
for (const [pn, cat] of Object.entries(PLOTS)) {
  const p = await prisma.parcel.findFirst({ where: { plotNumber: pn },
    select: { plotNumber: true, geometry: true, area: true,
      affectionPlans: { orderBy: { fetchedAt: "desc" }, take: 1,
        select: { maxFloors: true, maxHeightMeters: true, plotAreaSqft: true, setbacks: true, buildingLimitGeometry: true } } } });
  if (!p?.geometry) continue;
  const ap = p.affectionPlans[0];
  const plotRing = (p.geometry as GeoJSON.Polygon).coordinates[0];
  const blg = ap?.buildingLimitGeometry as GeoJSON.Polygon | null;
  const sb = ap?.setbacks ? ((ap.setbacks as { building: number|null; podium: number|null }[]).map(s=>s.building??s.podium??0).filter(v=>v>0)) : [];
  const setback = sb.length ? sb.reduce((a,b)=>a+b,0)/sb.length : 4;
  const footRing = (blg && blg.type === "Polygon") ? blg.coordinates[0]
    : insetRingByMeters(plotRing, (ap?.plotAreaSqft ?? p.area ?? 0) < 5000 ? 0 : setback);
  const H = (ap?.maxHeightMeters && ap.maxHeightMeters > 0) ? ap.maxHeightMeters : Math.max(1, ap?.maxFloors ?? 4) * 3.5;
  out[pn] = { plot: pn, cat, plotRing, footRing, totalH: H };
  console.log(`${pn}: plot ${plotRing.length}pts foot ${footRing.length}pts H=${Math.round(H)}`);
}
writeFileSync("docs/research/archetype-shots-v2/verify-plots.json", JSON.stringify(out));
console.log("wrote verify-plots.json");
await prisma.$disconnect();
