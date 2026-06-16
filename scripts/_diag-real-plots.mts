// Diagnose archetype placement across MANY real listings. For each parcel:
// plot centroid vs footprint(building-limit/inset) centroid OFFSET in metres —
// the bigger the offset, the more the current PLOT-CENTROID centring misplaces
// the model vs where the building actually belongs (building-limit). Read-only.
import { config } from "dotenv";
config({ path: ".env.local" });
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { writeFileSync } from "node:fs";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

function categorize(s: string): string | null {
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
function deriveLandUse(mix: { category: string; sub?: string | null }[] | null): string | null {
  if (!mix || mix.length === 0) return null;
  const c = new Set<string>();
  for (const u of mix) { const a = categorize(u.category || ""); const b = categorize(u.sub || ""); if (a) c.add(a); if (b) c.add(b); }
  return c.size > 1 ? "MIXED_USE" : c.size === 1 ? [...c][0] : null;
}
function centroid(r: number[][]): [number, number] {
  let x = 0, y = 0; for (const p of r) { x += p[0]; y += p[1]; } return [x / r.length, y / r.length];
}
function insetRingByMeters(ring: number[][], setbackM: number): number[][] {
  if (setbackM <= 0) return ring;
  const lngs = ring.map((p) => p[0]); const lats = ring.map((p) => p[1]);
  const midLat = (Math.max(...lats) + Math.min(...lats)) / 2;
  const dLng = (Math.max(...lngs) - Math.min(...lngs)) * 111000 * Math.cos((midLat * Math.PI) / 180);
  const dLat = (Math.max(...lats) - Math.min(...lats)) * 111000;
  const halfWidth = Math.min(dLng, dLat) / 2; if (halfWidth <= 0) return ring;
  const scale = Math.max(0.5, 1 - setbackM / halfWidth);
  const [cLng, cLat] = centroid(ring);
  return ring.map(([lng, lat]) => [cLng + (lng - cLng) * scale, cLat + (lat - cLat) * scale]);
}
function defaultSetbackM(c: string | null): number {
  switch (c) { case "COMMERCIAL": return 0; case "HOTEL": return 3; case "RESIDENTIAL": case "MIXED_USE": case "INDUSTRIAL": return 4; case "EDUCATIONAL": case "HEALTHCARE": return 5; case "AGRICULTURAL": return 10; default: return 5; }
}

const parcels = await prisma.parcel.findMany({
  select: { plotNumber: true, geometry: true, area: true, emirate: true, district: true,
    affectionPlans: { orderBy: { fetchedAt: "desc" }, take: 1,
      select: { landUseMix: true, maxFloors: true, maxHeightMeters: true, plotAreaSqft: true, setbacks: true, buildingLimitGeometry: true } } },
});

const out: Record<string, unknown> = {};
const rows: { plot: string; cat: string; hasBL: boolean; offsetM: number; plotPts: number }[] = [];
for (const p of parcels) {
  const ap = p.affectionPlans[0];
  const cat = deriveLandUse(ap?.landUseMix as never);
  if (!cat) continue;
  const geom = p.geometry as GeoJSON.Polygon | null;
  if (!geom || geom.type !== "Polygon") continue;
  const plotRing = geom.coordinates[0];
  const blg = ap?.buildingLimitGeometry as GeoJSON.Polygon | null;
  const hasBL = !!(blg && blg.type === "Polygon");
  const sqft = ap?.plotAreaSqft ?? p.area ?? 0;
  const setback = sqft > 0 && sqft < 5000 ? 0 : defaultSetbackM(cat);
  const footRing = hasBL ? blg!.coordinates[0] : insetRingByMeters(plotRing, setback);
  const [pcl, pct] = centroid(plotRing);
  const [fcl, fct] = centroid(footRing);
  const cos = Math.cos((pct * Math.PI) / 180);
  const offsetM = Math.hypot((fcl - pcl) * 111320 * cos, (fct - pct) * 111320);
  const H = (ap?.maxHeightMeters && ap.maxHeightMeters > 0) ? ap.maxHeightMeters : Math.max(1, ap?.maxFloors ?? 4) * 3.5;
  rows.push({ plot: p.plotNumber, cat, hasBL, offsetM, plotPts: plotRing.length });
  out[p.plotNumber] = { plot: p.plotNumber, cat, plotRing, footRing, totalH: H, hasBL, offsetM: Math.round(offsetM * 10) / 10 };
}

rows.sort((a, b) => b.offsetM - a.offsetM);
console.log(`\nTotal classified parcels: ${rows.length}`);
const withBL = rows.filter((r) => r.hasBL).length;
console.log(`With building-limit: ${withBL} · without (inset): ${rows.length - withBL}`);
console.log(`\nTOP plot-centroid-vs-footprint OFFSET (метры) — these MISPLACE under plot-centroid centring:`);
for (const r of rows.slice(0, 20)) console.log(`  ${r.plot.padEnd(14)} ${r.cat.padEnd(14)} BL=${r.hasBL ? "Y" : "n"} offset=${r.offsetM.toFixed(1)}m`);
const big = rows.filter((r) => r.offsetM > 3);
console.log(`\nOFFSET > 3m: ${big.length} / ${rows.length} parcels (visible разъезд under plot-centroid centring)`);
writeFileSync("docs/research/archetype-shots-v2/verify-plots-real.json", JSON.stringify(out));
console.log("wrote verify-plots-real.json (" + Object.keys(out).length + " plots)");
await prisma.$disconnect();
