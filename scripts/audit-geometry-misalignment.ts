/**
 * Geometry audit — Phase A diagnostic + detail view of polygon rings.
 * Kept alongside the data-fix commit for future re-verification runs.
 *
 *   npx tsx scripts/audit-geometry-misalignment.ts
 *
 * Prints the full polygon ring (coords + per-vertex delta in metres
 * from centroid) for every parcel matching the target districts. Useful
 * to confirm a plot is a clean rectangle of the expected size and isn't
 * rotated or stretched weirdly.
 */

import { config as loadDotenv } from "dotenv";
loadDotenv({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

type LngLat = [number, number];
type Ring = LngLat[];

function firstOuterRing(geom: unknown): Ring | null {
  if (!geom || typeof geom !== "object") return null;
  const g = geom as { type?: string; coordinates?: unknown };
  if (g.type === "Polygon") return (g.coordinates as number[][][])[0] as unknown as Ring;
  if (g.type === "MultiPolygon") return (g.coordinates as number[][][][])[0]?.[0] as unknown as Ring;
  return null;
}

function haversineMeters(a: LngLat, b: LngLat): number {
  const R = 6371008.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLon = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function describeRing(ring: Ring) {
  const n = ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]
    ? ring.length - 1 : ring.length;
  let sx = 0, sy = 0;
  for (let i = 0; i < n; i++) { sx += ring[i][0]; sy += ring[i][1]; }
  const centroid: LngLat = [sx / n, sy / n];
  const rows: Array<{ i: number; lon: number; lat: number; distToCentroid_m: number; edgeToNext_m: number }> = [];
  for (let i = 0; i < n; i++) {
    const next = ring[(i + 1) % n];
    rows.push({
      i,
      lon: +ring[i][0].toFixed(6),
      lat: +ring[i][1].toFixed(6),
      distToCentroid_m: +haversineMeters(ring[i], centroid).toFixed(1),
      edgeToNext_m: +haversineMeters(ring[i], next).toFixed(1),
    });
  }
  return { centroid, rows };
}

async function main() {
  const plotNumbers = ["1010469", "5912323", "6117209", "6117231", "6817016"];
  const rows = await prisma.parcel.findMany({
    where: { plotNumber: { in: plotNumbers } },
    select: {
      id: true, plotNumber: true, district: true, emirate: true,
      area: true, geometry: true, status: true, createdAt: true,
    },
    orderBy: { plotNumber: "asc" },
  });

  for (const r of rows) {
    console.log(`\n━━━ Plot ${r.plotNumber} · ${r.district} · ${r.emirate} · area ${Math.round(r.area)} sqft ━━━`);
    const ring = firstOuterRing(r.geometry);
    if (!ring) { console.log("  (no polygon ring)"); continue; }
    const d = describeRing(ring);
    console.log(`  centroid: ${d.centroid[1].toFixed(6)}, ${d.centroid[0].toFixed(6)}  (lat, lon)`);
    console.table(d.rows);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
