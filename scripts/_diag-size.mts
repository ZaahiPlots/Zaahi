// Diagnose archetype SIZE/overhang: for each real listing, replicate the layer's
// GLB placement (model centred at FOOTPRINT centroid, sized to footprint OBB,
// rotated obb.ang) and test whether the model's 4 corners fall INSIDE the plot
// polygon. Reports model dims vs footprint vs plot + overhang. Read-only.
import { readFileSync, writeFileSync } from "node:fs";
import { obbOf } from "../src/lib/archetypes/geometry";

const real = JSON.parse(readFileSync("docs/research/archetype-shots-v2/verify-plots-real.json", "utf8")) as Record<string, {
  plot: string; cat: string; plotRing: number[][]; footRing: number[][]; totalH: number; hasBL: boolean; offsetM: number;
}>;

function centroid(r: number[][]): [number, number] { let x = 0, y = 0; for (const p of r) { x += p[0]; y += p[1]; } return [x / r.length, y / r.length]; }
function pointInRing(p: number[], r: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const xi = r[i][0], yi = r[i][1], xj = r[j][0], yj = r[j][1];
    if (((yi > p[1]) !== (yj > p[1])) && (p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}
function bboxM(r: number[][], lat: number): [number, number] {
  const cos = Math.cos((lat * Math.PI) / 180);
  const xs = r.map((p) => p[0]); const ys = r.map((p) => p[1]);
  return [(Math.max(...xs) - Math.min(...xs)) * 111320 * cos, (Math.max(...ys) - Math.min(...ys)) * 111320];
}

const rows: { plot: string; cat: string; modelW: number; modelD: number; footW: number; footD: number; plotW: number; plotD: number; cornersOut: number; maxOverM: number }[] = [];
for (const r of Object.values(real)) {
  const [fcl, fct] = centroid(r.footRing);
  const cos = Math.cos((fct * Math.PI) / 180);
  const toM = (ring: number[][]) => ring.map(([lng, lat]) => [(lng - fcl) * 111320 * cos, (lat - fct) * 111320]);
  const footLocal = toM(r.footRing);
  const obb = obbOf(footLocal);
  // model: OBB centre + half-extents, WITH the fit-to-plot shrink clamp (mirrors
  // the layer). Binary-search the scale so all corners sit inside the plot.
  const c = Math.cos(obb.ang), s = Math.sin(obb.ang);
  const plotM = toM(r.plotRing);
  function pir(x: number, y: number, ring: number[][]): boolean { let ins = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1]; if (((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)) ins = !ins; } return ins; }
  const inside = (k: number) => [[-1, -1], [1, -1], [1, 1], [-1, 1]].every(([su, sv]) => { const u = su * obb.hl * k, v = sv * obb.hw * k; return pir(obb.cx + u * c - v * s, obb.cy + u * s + v * c, plotM); });
  let k = 1; if (!inside(1)) { let lo = 0.05, hi = 1; for (let i = 0; i < 12; i++) { const m = (lo + hi) / 2; if (inside(m)) lo = m; else hi = m; } k = lo; }
  const cornersLocal = [[-obb.hl, -obb.hw], [obb.hl, -obb.hw], [obb.hl, obb.hw], [-obb.hl, obb.hw]]
    .map(([u, v]) => [obb.cx + (u * k * c - v * k * s), obb.cy + (u * k * s + v * k * c)]);
  // back to lng/lat then test inside plot
  const plotRing = r.plotRing;
  let cornersOut = 0, maxOverM = 0;
  for (const [mx, my] of cornersLocal) {
    const lng = fcl + mx / (111320 * cos); const lat = fct + my / 111320;
    if (!pointInRing([lng, lat], plotRing)) {
      cornersOut++;
      // distance to nearest plot edge (approx)
      let md = Infinity;
      for (let i = 0, j = plotRing.length - 1; i < plotRing.length; j = i++) {
        const ax = plotRing[i][0], ay = plotRing[i][1], bx = plotRing[j][0], by = plotRing[j][1];
        const dx = (bx - ax) * 111320 * cos, dy = (by - ay) * 111320, l2 = dx * dx + dy * dy || 1;
        const px = (lng - ax) * 111320 * cos, py = (lat - ay) * 111320;
        let t = (px * dx + py * dy) / l2; t = Math.max(0, Math.min(1, t));
        md = Math.min(md, Math.hypot(px - t * dx, py - t * dy));
      }
      maxOverM = Math.max(maxOverM, md);
    }
  }
  const [modelW, modelD] = [2 * obb.hl, 2 * obb.hw];
  const [footW, footD] = bboxM(r.footRing, fct);
  const [plotW, plotD] = bboxM(r.plotRing, fct);
  rows.push({ plot: r.plot, cat: r.cat, modelW, modelD, footW, footD, plotW, plotD, cornersOut, maxOverM });
}

rows.sort((a, b) => b.maxOverM - a.maxOverM);
const over = rows.filter((r) => r.cornersOut > 0);
console.log(`\nTotal: ${rows.length} · model corners OUTSIDE plot (overhang): ${over.length}`);
console.log(`\nTOP overhang (model bigger than plot / pokes out):`);
console.log(`  ${"plot".padEnd(14)} ${"cat".padEnd(13)} ${"modelXY".padEnd(12)} ${"footXY".padEnd(12)} ${"plotXY".padEnd(12)} out maxOver`);
for (const r of rows.slice(0, 20)) {
  console.log(`  ${r.plot.padEnd(14)} ${r.cat.padEnd(13)} ${(Math.round(r.modelW) + "x" + Math.round(r.modelD)).padEnd(12)} ${(Math.round(r.footW) + "x" + Math.round(r.footD)).padEnd(12)} ${(Math.round(r.plotW) + "x" + Math.round(r.plotD)).padEnd(12)} ${r.cornersOut}  ${r.maxOverM.toFixed(1)}m`);
}
writeFileSync("docs/research/archetype-shots-v2/_size-audit.json", JSON.stringify(rows, null, 0));
console.log(`\nwrote _size-audit.json. Overhang >2m: ${rows.filter((r) => r.maxOverM > 2).length} / ${rows.length}`);
