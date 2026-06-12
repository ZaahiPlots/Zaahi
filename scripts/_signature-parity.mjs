// ZAAHI Signature — Stage 1 parity test for src/lib/signature/geometry.ts.
//
// Verifies that the new shared module produces byte-identical output
// to the OLD inline implementation that lived in src/app/parcels/map/
// page.tsx until 2026-06-11 (commit prior to Stage 1 of feat/signature-
// realistic).
//
// 10 input cases:
//   1-5. The 5 real plots inlined into the prototype HTML
//        (/home/zaahi/scratch/signature-realistic/footprints.json) —
//        covers shape classes rectangular / narrow / L-shape / tiny / huge
//        and categories residential / commercial / mixed-use / hotel /
//        industrial.
//   6.   Tiny plot — small-plot bypass (sqft < 5000) returns 0 setback.
//   7.   Commercial — 0 setback by default.
//   8.   Residential VILLA subtype — 3 m setback.
//   9.   Residential APARTMENT (no sub) — 4 m setback.
//  10.   DDA setbacks array with mixed building/podium values — exercises
//        the `s.building ?? s.podium ?? 0` average path.
//
// Run:
//   pnpm tsx scripts/_signature-parity.mjs
//
// Exit 0 = pass, exit 1 = any mismatch (with diff printed).

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";

// ── Bring in the NEW module under test ────────────────────────────
const newMod = await import("../src/lib/signature/geometry.ts");
const { computeSetbackM, insetRingByMeters, scaleRingFromCentroid, emitSignatureTiers } = newMod;

// ── OLD implementation — pasted byte-for-byte from
//    src/app/parcels/map/page.tsx pre-Stage-1 (commit 40060d8).
// ─────────────────────────────────────────────────────────────────
const OLD_FLOOR_H = 3.5;
const OLD_PODIUM_TOP = 14;
const OLD_CROWN_H = 7;

function OLD_defaultSetbackM(landUse, sub) {
  if (!landUse) return 5;
  switch (landUse) {
    case "RESIDENTIAL":
      if (sub && /villa|townhouse|town\s*house/i.test(sub)) return 3;
      return 4;
    case "COMMERCIAL":
    case "OFFICE":
    case "RETAIL":
      return 0;
    case "HOTEL":
    case "HOSPITALITY":
      return 3;
    case "INDUSTRIAL":
    case "WAREHOUSE":
      return 4;
    case "FUTURE_DEVELOPMENT":
    case "FUTURE DEVELOPMENT":
      return 4;
    case "EDUCATIONAL":
    case "EDUCATION":
    case "HEALTHCARE":
      return 5;
    case "AGRICULTURAL":
    case "AGRICULTURE":
      return 10;
    case "MIXED_USE":
      return 4;
    default:
      return 5;
  }
}

function OLD_computeSetbackM(plotSqft, landUse, setbacks, sub) {
  if (plotSqft > 0 && plotSqft < 5000) return 0;
  if (setbacks && setbacks.length > 0) {
    const vals = setbacks
      .map((s) => s.building ?? s.podium ?? 0)
      .filter((v) => v > 0);
    if (vals.length > 0) {
      return vals.reduce((a, b) => a + b, 0) / vals.length;
    }
  }
  return OLD_defaultSetbackM(landUse, sub);
}

function OLD_insetRingByMeters(ring, setbackM) {
  if (setbackM <= 0) return ring;
  const lngs = ring.map((p) => p[0]);
  const lats = ring.map((p) => p[1]);
  const midLat = (Math.max(...lats) + Math.min(...lats)) / 2;
  const dLng =
    (Math.max(...lngs) - Math.min(...lngs)) *
    111000 *
    Math.cos((midLat * Math.PI) / 180);
  const dLat = (Math.max(...lats) - Math.min(...lats)) * 111000;
  const halfWidth = Math.min(dLng, dLat) / 2;
  if (halfWidth <= 0) return ring;
  const scale = Math.max(0.5, 1 - setbackM / halfWidth);
  const cLng = ring.reduce((s, p) => s + p[0], 0) / ring.length;
  const cLat = ring.reduce((s, p) => s + p[1], 0) / ring.length;
  return ring.map(([lng, lat]) => [
    cLng + (lng - cLng) * scale,
    cLat + (lat - cLat) * scale,
  ]);
}

function OLD_scaleRingFromCentroid(ring, scale) {
  const cx = ring.reduce((s, p) => s + p[0], 0) / ring.length;
  const cy = ring.reduce((s, p) => s + p[1], 0) / ring.length;
  return ring.map(([lng, lat]) => [
    cx + (lng - cx) * scale,
    cy + (lat - cy) * scale,
  ]);
}

/** Old loadZaahiPlots tier composer (pre-Stage-1). */
function OLD_emitTiers(footprintRing, totalH, opts = {}) {
  const forceFlat = !!opts.forceFlat;
  const floors = Math.max(1, Math.round(totalH / OLD_FLOOR_H));
  const out = [];
  const push = (ring, baseM, topM) => out.push({ ring, baseM, topM });
  if (forceFlat) {
    push(footprintRing, 0, totalH);
  } else if (floors <= 4) {
    push(footprintRing, 0, totalH);
  } else if (floors <= 10) {
    push(footprintRing, 0, OLD_PODIUM_TOP);
    push(OLD_scaleRingFromCentroid(footprintRing, 0.7), OLD_PODIUM_TOP, totalH);
  } else {
    push(footprintRing, 0, OLD_PODIUM_TOP);
    push(OLD_scaleRingFromCentroid(footprintRing, 0.7), OLD_PODIUM_TOP, totalH - OLD_CROWN_H);
    push(OLD_scaleRingFromCentroid(footprintRing, 0.5), totalH - OLD_CROWN_H, totalH);
  }
  return out;
}

// ── Helpers ───────────────────────────────────────────────────────

const EPS = 1e-12;

/** Deep-compare two values with epsilon on numbers. Returns null if
 *  equal, else a string describing the first difference path. */
function diff(a, b, path = "") {
  if (typeof a !== typeof b) return `${path}: type ${typeof a} vs ${typeof b}`;
  if (typeof a === "number") {
    if (!Number.isFinite(a) || !Number.isFinite(b)) {
      return a === b ? null : `${path}: ${a} vs ${b}`;
    }
    return Math.abs(a - b) <= EPS ? null : `${path}: ${a} vs ${b} (Δ=${a - b})`;
  }
  if (Array.isArray(a)) {
    if (!Array.isArray(b)) return `${path}: array vs ${typeof b}`;
    if (a.length !== b.length) return `${path}.length: ${a.length} vs ${b.length}`;
    for (let i = 0; i < a.length; i++) {
      const d = diff(a[i], b[i], `${path}[${i}]`);
      if (d) return d;
    }
    return null;
  }
  if (a && typeof a === "object") {
    const ka = Object.keys(a).sort();
    const kb = Object.keys(b ?? {}).sort();
    if (ka.join("|") !== kb.join("|")) return `${path}: keys ${ka} vs ${kb}`;
    for (const k of ka) {
      const d = diff(a[k], b[k], `${path}.${k}`);
      if (d) return d;
    }
    return null;
  }
  return a === b ? null : `${path}: ${a} vs ${b}`;
}

// ── Load real prototype footprints ────────────────────────────────

const PROTO_PATH = "/home/zaahi/scratch/signature-realistic/footprints.json";
const proto = JSON.parse(readFileSync(PROTO_PATH, "utf-8"));

// Map prototype `cat` (lowercase) to landUse code.
const CAT_TO_LANDUSE = {
  residential: "RESIDENTIAL",
  commercial: "COMMERCIAL",
  mixed_use: "MIXED_USE",
  hotel: "HOTEL",
  industrial: "INDUSTRIAL",
};

// ── 10 cases ──────────────────────────────────────────────────────

const cases = [];

// Cases 1-5: real plots, derive a totalH from floors × FLOOR_H so the
// tier branch matches what prod would compute.
for (const p of proto) {
  cases.push({
    name: `${p.label} · plot ${p.plot} · ${p.cat} · ${p.floors}f`,
    plotSqft: p.area,
    landUse: CAT_TO_LANDUSE[p.cat],
    setbacks: null,
    sub: null,
    totalH: p.floors * 3.5,
    forceFlat: false,
    ring: p.ring,
  });
}

// Case 6: tiny plot — small-plot bypass.
cases.push({
  name: "synthetic · tiny plot · sqft 3500 · small-plot bypass returns 0 setback",
  plotSqft: 3500,
  landUse: "RESIDENTIAL",
  setbacks: null,
  sub: null,
  totalH: 12,
  forceFlat: false,
  // 30 m × 30 m square around 55.27 / 25.20
  ring: [
    [55.270, 25.200],
    [55.2703, 25.200],
    [55.2703, 25.2003],
    [55.270, 25.2003],
    [55.270, 25.200],
  ],
});

// Case 7: commercial — 0 setback by default.
cases.push({
  name: "synthetic · commercial · 0 setback default",
  plotSqft: 12000,
  landUse: "COMMERCIAL",
  setbacks: null,
  sub: null,
  totalH: 45,
  forceFlat: false,
  ring: [
    [55.275, 25.205],
    [55.276, 25.205],
    [55.276, 25.2055],
    [55.275, 25.2055],
    [55.275, 25.205],
  ],
});

// Case 8: residential VILLA subtype — 3 m setback.
cases.push({
  name: "synthetic · residential VILLA sub · 3m setback",
  plotSqft: 7500,
  landUse: "RESIDENTIAL",
  setbacks: null,
  sub: "villa",
  totalH: 8,
  forceFlat: false,
  ring: [
    [55.280, 25.210],
    [55.2808, 25.210],
    [55.2808, 25.2106],
    [55.280, 25.2106],
    [55.280, 25.210],
  ],
});

// Case 9: residential APARTMENT (no sub) — 4 m setback.
cases.push({
  name: "synthetic · residential APARTMENT (no sub) · 4m setback",
  plotSqft: 18000,
  landUse: "RESIDENTIAL",
  setbacks: null,
  sub: null,
  totalH: 25,
  forceFlat: false,
  ring: [
    [55.285, 25.215],
    [55.286, 25.215],
    [55.286, 25.2156],
    [55.285, 25.2156],
    [55.285, 25.215],
  ],
});

// Case 10: DDA setbacks array with mixed building/podium — exercises
// the `s.building ?? s.podium ?? 0` fallback path.
cases.push({
  name: "synthetic · DDA setbacks mix (building & podium fallback)",
  plotSqft: 22000,
  landUse: "MIXED_USE",
  setbacks: [
    { side: 0, building: 5, podium: 3 },
    { side: 1, building: null, podium: 4 }, // falls through to podium
    { side: 2, building: 6, podium: null },
    { side: 3, building: null, podium: null }, // falls through to 0 → filtered
  ],
  sub: null,
  totalH: 38,
  forceFlat: false,
  ring: [
    [55.290, 25.220],
    [55.291, 25.220],
    [55.291, 25.2207],
    [55.290, 25.2207],
    [55.290, 25.220],
  ],
});

// ── Run ───────────────────────────────────────────────────────────

let failed = 0;
for (let i = 0; i < cases.length; i++) {
  const c = cases[i];

  // Step 1: setback metres.
  const oldSetbackM = OLD_computeSetbackM(c.plotSqft, c.landUse, c.setbacks, c.sub);
  const newSetbackM = computeSetbackM(c.plotSqft, c.landUse, c.setbacks, c.sub);
  const dSet = diff(oldSetbackM, newSetbackM, "setbackM");

  // Step 2: footprint ring.
  const oldFootprint = OLD_insetRingByMeters(c.ring, oldSetbackM);
  const newFootprint = insetRingByMeters(c.ring, newSetbackM);
  const dFp = diff(oldFootprint, newFootprint, "footprint");

  // Step 3: tiers.
  const oldTiers = OLD_emitTiers(oldFootprint, c.totalH, { forceFlat: c.forceFlat });
  const newTiers = emitSignatureTiers(newFootprint, c.totalH, { forceFlat: c.forceFlat });
  const dT = diff(oldTiers, newTiers, "tiers");

  const ok = !dSet && !dFp && !dT;
  if (ok) {
    console.log(`[${i + 1}/${cases.length}] PASS  ${c.name}  (setback=${oldSetbackM.toFixed(3)}m · ${oldTiers.length} tier${oldTiers.length === 1 ? "" : "s"})`);
  } else {
    failed++;
    console.log(`[${i + 1}/${cases.length}] FAIL  ${c.name}`);
    if (dSet) console.log(`    setback diff: ${dSet}`);
    if (dFp) console.log(`    footprint diff: ${dFp}`);
    if (dT) console.log(`    tier diff: ${dT}`);
  }
}

console.log("");
console.log(`Total: ${cases.length}  Pass: ${cases.length - failed}  Fail: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
