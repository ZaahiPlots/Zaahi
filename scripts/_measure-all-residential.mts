// Measure residential archetype overhang vs the PLOT polygon for ALL residential
// parcels, replicating loadZaahiPlots' exact footprint logic. Read-only.
import { config } from "dotenv";
config({ path: ".env.local" });
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { buildArchetype, obbOf, clampToFootprint } from "../src/lib/archetypes/geometry";

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
function defaultSetbackM(landUse: string | null, sub: string | null): number {
  if (landUse === "RESIDENTIAL") return (sub && /villa|townhouse/i.test(sub)) ? 3 : 4;
  return 4;
}
// EXACT replica of page.tsx loadZaahiPlots insetRingByMeters.
function insetRingByMeters(ring: number[][], setbackM: number): number[][] {
  if (setbackM <= 0) return ring;
  const lngs = ring.map((p) => p[0]); const lats = ring.map((p) => p[1]);
  const midLat = (Math.max(...lats) + Math.min(...lats)) / 2;
  const dLng = (Math.max(...lngs) - Math.min(...lngs)) * 111000 * Math.cos((midLat * Math.PI) / 180);
  const dLat = (Math.max(...lats) - Math.min(...lats)) * 111000;
  const halfWidth = Math.min(dLng, dLat) / 2;
  if (halfWidth <= 0) return ring;
  const scale = Math.max(0.5, 1 - setbackM / halfWidth);
  const cLng = ring.reduce((s, p) => s + p[0], 0) / ring.length;
  const cLat = ring.reduce((s, p) => s + p[1], 0) / ring.length;
  return ring.map(([lng, lat]) => [cLng + (lng - cLng) * scale, cLat + (lat - cLat) * scale]);
}
function computeSetbackM(plotSqft: number, landUse: string | null, setbacks: { building: number | null; podium: number | null }[] | null, sub: string | null): number {
  if (plotSqft > 0 && plotSqft < 5000) return 0;
  if (setbacks && setbacks.length > 0) {
    const vals = setbacks.map((s) => s.building ?? s.podium ?? 0).filter((v) => v > 0);
    if (vals.length > 0) return vals.reduce((a, b) => a + b, 0) / vals.length;
  }
  return defaultSetbackM(landUse, sub);
}
function pointInRing(p: number[], r: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const xi = r[i][0], yi = r[i][1], xj = r[j][0], yj = r[j][1];
    if (((yi > p[1]) !== (yj > p[1])) && (p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}
function distSeg(p: number[], a: number[], b: number[]): number {
  const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1;
  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2; t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}
function overhang(p: number[], r: number[][]): number {
  if (pointInRing(p, r)) return 0;
  let m = Infinity; for (let i = 0, j = r.length - 1; i < r.length; j = i++) m = Math.min(m, distSeg(p, r[i], r[j]));
  return m;
}

const parcels = await prisma.parcel.findMany({
  select: { plotNumber: true, geometry: true, area: true,
    affectionPlans: { orderBy: { fetchedAt: "desc" }, take: 1,
      select: { landUseMix: true, maxFloors: true, maxHeightMeters: true, plotAreaSqft: true, setbacks: true, buildingLimitGeometry: true } } },
});

const results: { plot: string; cat: string; vsPlot: number; vsFoot: number; foot: string }[] = [];
for (const p of parcels) {
  const ap = p.affectionPlans[0];
  const cat = deriveLandUse(ap?.landUseMix as never);
  if (cat !== "RESIDENTIAL" && cat !== "MIXED_USE") continue;
  const geom = p.geometry as GeoJSON.Polygon | null;
  if (!geom || geom.type !== "Polygon") continue;
  const plotRing = geom.coordinates[0];
  // footprint exactly as the app builds it
  const blg = ap?.buildingLimitGeometry as GeoJSON.Polygon | null;
  let footDeg: number[][]; let footSrc: string;
  if (blg && blg.type === "Polygon") { footDeg = blg.coordinates[0]; footSrc = "buildingLimit"; }
  else { footDeg = insetRingByMeters(plotRing, computeSetbackM(ap?.plotAreaSqft ?? p.area ?? 0, cat, ap?.setbacks as never, null)); footSrc = "inset"; }
  // project both to metres around the footprint centroid (like the layer)
  const cl = footDeg.reduce((s, q) => s + q[0], 0) / footDeg.length;
  const ct = footDeg.reduce((s, q) => s + q[1], 0) / footDeg.length;
  const cos = Math.cos((ct * Math.PI) / 180);
  const toM = (r: number[][]) => r.map(([lng, lat]) => [(lng - cl) * 111320 * cos, (lat - ct) * 111320]);
  const footM = toM(footDeg); const plotM = toM(plotRing);
  const H = (ap?.maxHeightMeters && ap.maxHeightMeters > 0) ? ap.maxHeightMeters : Math.max(1, ap?.maxFloors ?? 4) * 3.5;
  const { solids } = buildArchetype(cat, footM, obbOf(footM), Math.max(3, H));
  // Apply the layer's hard plot-boundary clamp before measuring.
  for (const s of solids) if (s.t === "prism") s.ring = clampToFootprint(s.ring, plotM);
  let vsPlot = 0, vsFoot = 0;
  for (const s of solids) { if (s.t !== "prism") continue; for (const v of s.ring) { vsPlot = Math.max(vsPlot, overhang(v, plotM)); vsFoot = Math.max(vsFoot, overhang(v, footM)); } }
  results.push({ plot: p.plotNumber, cat, vsPlot, vsFoot, foot: footSrc });
}

results.sort((a, b) => b.vsPlot - a.vsPlot);
for (const C of ["RESIDENTIAL", "MIXED_USE"]) {
  const rows = results.filter((r) => r.cat === C);
  const bad = rows.filter((r) => r.vsPlot > 0.1);
  console.log(`\n${C}: ${rows.length} parcels · OVERHANGING plot (>0.1m): ${bad.length} / ${rows.length}`);
  for (const r of bad) console.log(`  ${r.plot.padEnd(16)} vsPLOT=${r.vsPlot.toFixed(2)} vsFOOT=${r.vsFoot.toFixed(2)} ${r.foot}`);
  if (bad.length === 0) console.log("  all inside ✓");
}
await prisma.$disconnect();
