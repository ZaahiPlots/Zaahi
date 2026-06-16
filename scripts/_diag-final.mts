// FINAL end-to-end placement audit over all real listings. Replicates the EXACT
// archetype-layer GLB placement (anchor footprint centroid, OBB centre, fit-to-
// plot clamp floor 0.05, cap 55 for agri/future-dev, H from data) and measures
// all 7 params + the fit-clamp side effects. Read-only.
import { readFileSync, writeFileSync } from "node:fs";
import { obbOf } from "../src/lib/archetypes/geometry";

const real = JSON.parse(readFileSync("docs/research/archetype-shots-v2/verify-plots-real.json", "utf8")) as Record<string, {
  plot: string; cat: string; plotRing: number[][]; footRing: number[][]; totalH: number; hasBL: boolean;
}>;
function centroid(r: number[][]): [number, number] { let x = 0, y = 0; for (const p of r) { x += p[0]; y += p[1]; } return [x / r.length, y / r.length]; }
function pir(x: number, y: number, r: number[][]): boolean { let ins = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const xi = r[i][0], yi = r[i][1], xj = r[j][0], yj = r[j][1]; if (((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)) ins = !ins; } return ins; }

const cats = ["RESIDENTIAL", "MIXED_USE", "HOTEL", "COMMERCIAL", "EDUCATIONAL", "HEALTHCARE", "INDUSTRIAL", "AGRICULTURAL", "FUTURE_DEVELOPMENT", "INVESTMENT"];
type Tally = { n: number; centerBad: number; overhang: number; tiny: number; needle: number; sliver: number };
const tally: Record<string, Tally> = {};
const problems: string[] = [];

for (const r of Object.values(real)) {
  const cat = r.cat; if (!cats.includes(cat)) continue;
  tally[cat] ??= { n: 0, centerBad: 0, overhang: 0, tiny: 0, needle: 0, sliver: 0 };
  const t = tally[cat]; t.n++;
  const [fcl, fct] = centroid(r.footRing);
  const cos = Math.cos((fct * Math.PI) / 180);
  const toM = (ring: number[][]) => ring.map(([lng, lat]) => [(lng - fcl) * 111320 * cos, (lat - fct) * 111320]);
  const footLocal = toM(r.footRing); const plotM = toM(r.plotRing);
  const obb = obbOf(footLocal);
  const cap = (cat === "AGRICULTURAL" || cat === "FUTURE_DEVELOPMENT") ? 55 : Infinity;
  let fitW = Math.min(2 * obb.hl, cap), fitD = Math.min(2 * obb.hw, cap);
  const c = Math.cos(obb.ang), s = Math.sin(obb.ang);
  const inside = (k: number) => [[-1, -1], [1, -1], [1, 1], [-1, 1]].every(([su, sv]) => { const u = su * (fitW / 2) * k, v = sv * (fitD / 2) * k; return pir(obb.cx + u * c - v * s, obb.cy + u * s + v * c, plotM); });
  let k = 1; if (!inside(1)) { let lo = 0.05, hi = 1; for (let i = 0; i < 14; i++) { const m = (lo + hi) / 2; if (inside(m)) lo = m; else hi = m; } k = lo; }
  fitW *= k; fitD *= k;
  const H = cat === "FUTURE_DEVELOPMENT" ? 3.5 : Math.max(3, r.totalH);

  // 1. CENTER: model placed at OBB centre; offset from footprint centroid
  const centerOff = Math.hypot(obb.cx, obb.cy);
  if (centerOff > 3) t.centerBad++;
  // 2. SIZE overhang (after clamp)
  const cornersOut = [[-1, -1], [1, -1], [1, 1], [-1, 1]].filter(([su, sv]) => { const u = su * (fitW / 2), v = sv * (fitD / 2); return !pir(obb.cx + u * c - v * s, obb.cy + u * s + v * c, plotM); }).length;
  if (cornersOut > 0) t.overhang++;
  // 3. SETBACK / over-shrink: clamp k too small OR model far smaller than plot
  if (k < 0.45) t.tiny++;
  // 4/7. ASPECT / needle: tall vs thin. flag if H / min(fitW,fitD) very high
  const minXY = Math.min(fitW, fitD);
  const aspect = H / Math.max(minXY, 0.1);
  if (aspect > 6) t.needle++;
  if (minXY < 6) t.sliver++;

  if (centerOff > 3 || cornersOut > 0 || k < 0.45 || aspect > 6 || minXY < 6) {
    problems.push(`${r.plot.padEnd(14)} ${cat.padEnd(12)} centerOff=${centerOff.toFixed(1)}m over=${cornersOut} k=${k.toFixed(2)} XY=${Math.round(fitW)}x${Math.round(fitD)} H=${Math.round(H)} aspect=${aspect.toFixed(1)} minXY=${minXY.toFixed(0)}m`);
  }
}

console.log("\nPER-TYPE (n · center>3m · overhang · tiny(k<.45) · needle(asp>6) · sliver(minXY<6m)):");
let tot = { n: 0, c: 0, o: 0, ti: 0, ne: 0, sl: 0 };
for (const cat of cats) { const t = tally[cat]; if (!t) continue; console.log(`  ${cat.padEnd(16)} n=${String(t.n).padStart(3)}  center=${t.centerBad}  over=${t.overhang}  tiny=${t.tiny}  needle=${t.needle}  sliver=${t.sliver}`); tot.n += t.n; tot.c += t.centerBad; tot.o += t.overhang; tot.ti += t.tiny; tot.ne += t.needle; tot.sl += t.sliver; }
console.log(`  ${"TOTAL".padEnd(16)} n=${String(tot.n).padStart(3)}  center=${tot.c}  over=${tot.o}  tiny=${tot.ti}  needle=${tot.ne}  sliver=${tot.sl}`);
console.log(`\nPROBLEM PLOTS (${problems.length}):`);
for (const p of problems.slice(0, 30)) console.log("  " + p);
if (problems.length > 30) console.log(`  ... +${problems.length - 30} more`);
writeFileSync("docs/research/archetype-shots-v2/_final-audit.json", JSON.stringify({ tally, problems }, null, 1));
