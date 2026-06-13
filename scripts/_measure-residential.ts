// Measure whether residential archetype geometry exceeds the footprint polygon.
import { readFileSync } from "node:fs";
import { buildArchetype, obbOf } from "../src/lib/archetypes/geometry";

const foots = JSON.parse(readFileSync("docs/research/archetype-shots/footprints.json", "utf8"));
const f = foots.RESIDENTIAL;
const ring: number[][] = f.geometry.coordinates[0];
// project to metres around centroid (same as the layer)
const clng = ring.reduce((s, p) => s + p[0], 0) / ring.length;
const clat = ring.reduce((s, p) => s + p[1], 0) / ring.length;
const cos = Math.cos((clat * Math.PI) / 180);
const footM = ring.map(([lng, lat]) => [(lng - clng) * 111320 * cos, (lat - clat) * 111320]);
const H = (f.maxHeightMeters && f.maxHeightMeters > 0) ? f.maxHeightMeters : Math.max(1, f.floors) * 3.5;

function pointInRing(p: number[], r: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const xi = r[i][0], yi = r[i][1], xj = r[j][0], yj = r[j][1];
    if (((yi > p[1]) !== (yj > p[1])) && (p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}
function distToSeg(p: number[], a: number[], b: number[]): number {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy || 1;
  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}
function overhang(p: number[], r: number[][]): number {
  if (pointInRing(p, r)) return 0;
  let m = Infinity;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) m = Math.min(m, distToSeg(p, r[i], r[j]));
  return m;
}

const obb = obbOf(footM);
const { solids } = buildArchetype("RESIDENTIAL", footM, obb, H);
let worst = 0, outCount = 0, total = 0;
for (const s of solids) {
  if (s.t !== "prism") continue;
  for (const v of s.ring) {
    total++;
    const o = overhang(v, footM);
    if (o > 0.01) { outCount++; worst = Math.max(worst, o); }
  }
}
console.log(`plot ${f.plot} · footprint ${ring.length}pts · ${solids.length} solids · ${total} prism verts`);
console.log(`vertices OUTSIDE footprint: ${outCount} · worst overhang: ${worst.toFixed(2)} m`);
console.log(worst < 0.01 ? "RESULT: fully inside footprint ✓" : "RESULT: OVERHANG present ✗");
