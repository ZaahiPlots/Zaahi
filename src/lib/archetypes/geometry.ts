// Land-use ARCHETYPE geometry constructors (founder redirect 2026-06-13).
//
// Each land use gets its OWN constructor that emits a low-poly MASSING shaped
// after the real building TYPE — NOT a variation of podium/body/crown tiers.
// Output is a list of primitive "solids" in metre-space; the render harness
// turns them into Three.js meshes (translucent, canonical land-use colour).
//
// Solid primitives:
//   {t:'prism',   ring:[[x,y]...], base, top}                    flat-top extrusion
//   {t:'gable',   cx,cy,len,wid,ang, base, eave, ridge}          ridge roof (ridge ∥ len)
//   {t:'sawtooth',cx,cy,len,wid,ang, base, low, high, teeth}     north-light shed roof
//
// All coords are metres around the footprint centroid. `obb` is the oriented
// bounding box of the real footprint (PCA): { cx,cy,ang,hl,hw }.

export type Solid =
  | { t: "prism"; ring: number[][]; base: number; top: number }
  | { t: "gable"; cx: number; cy: number; len: number; wid: number; ang: number; base: number; eave: number; ridge: number }
  | { t: "sawtooth"; cx: number; cy: number; len: number; wid: number; ang: number; base: number; low: number; high: number; teeth: number };

export interface Obb { cx: number; cy: number; ang: number; hl: number; hw: number }
export interface BuildResult { solids: Solid[]; floorLines: boolean; ribs?: boolean }

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Oriented bounding box of a metre-space ring via PCA. */
export function obbOf(ring: number[][]): Obb {
  const closed = ring.length > 1 &&
    ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1];
  const pts = closed ? ring.slice(0, -1) : ring;
  const n = pts.length;
  const cx = pts.reduce((s, p) => s + p[0], 0) / n;
  const cy = pts.reduce((s, p) => s + p[1], 0) / n;
  let sxx = 0, syy = 0, sxy = 0;
  for (const [x, y] of pts) { const dx = x - cx, dy = y - cy; sxx += dx * dx; syy += dy * dy; sxy += dx * dy; }
  const ang = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  const ux = Math.cos(ang), uy = Math.sin(ang), vx = -Math.sin(ang), vy = Math.cos(ang);
  let uMin = Infinity, uMax = -Infinity, vMin = Infinity, vMax = -Infinity;
  for (const [x, y] of pts) {
    const dx = x - cx, dy = y - cy;
    const u = dx * ux + dy * uy, v = dx * vx + dy * vy;
    uMin = Math.min(uMin, u); uMax = Math.max(uMax, u);
    vMin = Math.min(vMin, v); vMax = Math.max(vMax, v);
  }
  // ensure length axis is the longer one
  let hl = (uMax - uMin) / 2, hw = (vMax - vMin) / 2;
  let ccx = cx + ((uMax + uMin) / 2) * ux + ((vMax + vMin) / 2) * vx;
  let ccy = cy + ((uMax + uMin) / 2) * uy + ((vMax + vMin) / 2) * vy;
  let a = ang;
  if (hw > hl) { [hl, hw] = [hw, hl]; a = ang + Math.PI / 2; }
  return { cx: ccx, cy: ccy, ang: a, hl, hw };
}

// Local OBB frame helpers. fu,fv ∈ [-1,1] are fractions of the half-extents.
function pt(o: Obb, fu: number, fv: number): number[] {
  const ux = Math.cos(o.ang), uy = Math.sin(o.ang), vx = -Math.sin(o.ang), vy = Math.cos(o.ang);
  return [o.cx + fu * o.hl * ux + fv * o.hw * vx, o.cy + fu * o.hl * uy + fv * o.hw * vy];
}
function rectRing(o: Obb, u0: number, u1: number, v0: number, v1: number): number[][] {
  return [pt(o, u0, v0), pt(o, u1, v0), pt(o, u1, v1), pt(o, u0, v1), pt(o, u0, v0)];
}
function subRect(o: Obb, u0: number, u1: number, v0: number, v1: number) {
  const uc = (u0 + u1) / 2, vc = (v0 + v1) / 2;
  const c = pt(o, uc, vc);
  return { cx: c[0], cy: c[1], len: (u1 - u0) * o.hl, wid: (v1 - v0) * o.hw, ang: o.ang };
}
function scaleRing(ring: number[][], f: number): number[][] {
  const closed = ring.length > 1 &&
    ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1];
  const pts = closed ? ring.slice(0, -1) : ring;
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  return ring.map(([x, y]) => [cx + (x - cx) * f, cy + (y - cy) * f]);
}

// ── Footprint containment (founder 2026-06-13: nothing crosses the plot) ──
// Center-scaling is fine for convex footprints but a concave/irregular footprint
// can push a centroid-scaled vertex outside the polygon. clampToFootprint binds
// any stray vertex back onto the footprint boundary, so the result is always
// ⊆ footprint regardless of shape. No-op for convex plots.
function pointInRing(p: number[], r: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const xi = r[i][0], yi = r[i][1], xj = r[j][0], yj = r[j][1];
    if (((yi > p[1]) !== (yj > p[1])) && (p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}
function nearestOnBoundary(p: number[], r: number[][]): number[] {
  let best = r[0], bd = Infinity;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const a = r[j], b = r[i];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const l2 = dx * dx + dy * dy || 1;
    let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2;
    t = Math.max(0, Math.min(1, t));
    const q = [a[0] + t * dx, a[1] + t * dy];
    const d = Math.hypot(p[0] - q[0], p[1] - q[1]);
    if (d < bd) { bd = d; best = q; }
  }
  return best;
}
export function clampToFootprint(ring: number[][], foot: number[][]): number[][] {
  return ring.map((v) => (pointInRing(v, foot) ? v : nearestOnBoundary(v, foot)));
}

const FLOOR_H = 3.5;

// ─────────────────────────────────────────────────────────────────────────
// RESIDENTIAL — body with rows of balcony bands + a small terraced top.
// EVERY part is strictly inside the footprint ring (founder 2026-06-13: nothing
// may cross the plot polygon). The body is inset so the balcony ledges protrude
// only OUT TO the footprint edge — never beyond it.
export function buildResidential(foot: number[][], obb: Obb, H: number): BuildResult {
  const solids: Solid[] = [];
  const bodyTop = H * 0.88;
  // Every ring is centroid-scaled THEN clamped to the footprint, so it is
  // strictly inside the plot polygon even for concave/irregular footprints.
  const bodyRing = clampToFootprint(scaleRing(foot, 0.92), foot);
  solids.push({ t: "prism", ring: bodyRing, base: 0, top: bodyTop });
  // Balcony bands — inset just inside the footprint (0.98); protrude past the
  // inset body but never past the plot boundary.
  const bands = clamp(Math.round(bodyTop / 9), 3, 8);
  const bandRing = clampToFootprint(scaleRing(foot, 0.98), foot);
  for (let i = 1; i <= bands; i++) {
    const y = (bodyTop / (bands + 1)) * i;
    solids.push({ t: "prism", ring: bandRing, base: y - 0.5, top: y + 0.5 });
  }
  // Terraced setback top (two steps) — well inside.
  solids.push({ t: "prism", ring: clampToFootprint(scaleRing(foot, 0.64), foot), base: bodyTop, top: bodyTop + (H - bodyTop) * 0.6 });
  solids.push({ t: "prism", ring: clampToFootprint(scaleRing(foot, 0.4), foot), base: bodyTop + (H - bodyTop) * 0.6, top: H });
  return { solids, floorLines: true };
}

// HOTEL — L-shaped tower on a wide low lobby podium.
export function buildHotel(foot: number[][], obb: Obb, H: number): BuildResult {
  const solids: Solid[] = [];
  const podium = Math.min(8, H * 0.18);
  solids.push({ t: "prism", ring: foot, base: 0, top: podium }); // lobby podium
  // L: a long slab along one edge + a perpendicular wing at one end
  solids.push({ t: "prism", ring: rectRing(obb, -1, 1, 0.25, 0.95), base: podium, top: H });
  solids.push({ t: "prism", ring: rectRing(obb, 0.25, 0.95, -0.95, 0.95), base: podium, top: H });
  return { solids, floorLines: true };
}

// EDUCATIONAL — low campus: long main bar + two wings (U / courtyard) + entrance.
export function buildEducational(foot: number[][], obb: Obb, H: number): BuildResult {
  const eduH = clamp(H, 11, 16);
  const solids: Solid[] = [];
  solids.push({ t: "prism", ring: rectRing(obb, -1, 1, 0.5, 1), base: 0, top: eduH });        // main bar (back)
  solids.push({ t: "prism", ring: rectRing(obb, -1, -0.6, -1, 0.5), base: 0, top: eduH * 0.85 }); // wing L
  solids.push({ t: "prism", ring: rectRing(obb, 0.6, 1, -1, 0.5), base: 0, top: eduH * 0.85 });   // wing R
  solids.push({ t: "prism", ring: rectRing(obb, -0.18, 0.18, 0.2, 0.62), base: 0, top: eduH * 1.25 }); // entrance
  return { solids, floorLines: false };
}

// HEALTHCARE — hospital H-plan: central spine + two ward wings + entrance canopy.
export function buildHealthcare(foot: number[][], obb: Obb, H: number): BuildResult {
  const solids: Solid[] = [];
  solids.push({ t: "prism", ring: rectRing(obb, -0.32, 0.32, -1, 1), base: 0, top: H });          // central spine
  solids.push({ t: "prism", ring: rectRing(obb, -1, -0.32, -0.72, 0.72), base: 0, top: H * 0.72 }); // wing A
  solids.push({ t: "prism", ring: rectRing(obb, 0.32, 1, -0.72, 0.72), base: 0, top: H * 0.72 });    // wing B
  solids.push({ t: "prism", ring: rectRing(obb, -0.28, 0.28, 0.72, 1.08), base: 0, top: 5 });        // entrance canopy
  return { solids, floorLines: true };
}

// COMMERCIAL — office tower with a distinct entrance plinth + parapet crown.
export function buildCommercial(foot: number[][], obb: Obb, H: number): BuildResult {
  const solids: Solid[] = [];
  solids.push({ t: "prism", ring: scaleRing(foot, 1.05), base: 0, top: 9 }); // plinth / entrance
  solids.push({ t: "prism", ring: scaleRing(foot, 0.97), base: 9, top: H - 3 }); // shaft
  solids.push({ t: "prism", ring: scaleRing(foot, 0.92), base: H - 3, top: H }); // parapet crown
  return { solids, floorLines: true };
}

// MIXED_USE — wide retail podium (2-3 floors) + a clearly separate slim tower.
export function buildMixedUse(foot: number[][], _obb: Obb, H: number): BuildResult {
  // ZAAHI Signature podium/body/crown — ONE building, founder canon for
  // mixed-use (2026-06-14). Scales 1.0 / 0.82 / 0.65, height 20% / 60% / 20%.
  // Every tier centroid-scaled THEN clamped to the footprint (concave-safe);
  // the layer additionally clamps to the plot polygon. floorLines + vertical
  // rib pilasters on the body give the facade rhythm of the reference.
  const podiumTop = H * 0.20;
  const bodyTop = H * 0.80;
  // Inner tiers use scaleRing ONLY (a homothety → always a simple, fillable
  // polygon). Do NOT clampToFootprint here: clamping a concave-footprint
  // homothety creates a self-intersecting ring that ExtrudeGeometry can't fill
  // (→ a see-through wireframe body). The layer's plot-polygon clamp still keeps
  // everything in bounds (and is a no-op for the smaller inner tiers).
  return {
    solids: [
      { t: "prism", ring: foot, base: 0, top: podiumTop },                       // retail podium
      { t: "prism", ring: scaleRing(foot, 0.82), base: podiumTop, top: bodyTop }, // body
      { t: "prism", ring: scaleRing(foot, 0.65), base: bodyTop, top: H },         // crown
    ],
    floorLines: true,
    ribs: true,
  };
}

// INDUSTRIAL — long warehouse shed with a sawtooth (north-light) roof + dock.
export function buildIndustrial(foot: number[][], obb: Obb, H: number): BuildResult {
  const eaves = clamp(H, 8, 11);
  const solids: Solid[] = [];
  solids.push({ t: "prism", ring: foot, base: 0, top: eaves }); // shed body (real footprint)
  const r = subRect(obb, -1, 1, -1, 1);
  solids.push({ t: "sawtooth", ...r, base: eaves, low: eaves, high: eaves + 8, teeth: clamp(Math.round(r.len / 24), 3, 7) });
  // loading dock — a low strip along the front edge
  solids.push({ t: "prism", ring: rectRing(obb, -0.7, 0.7, 1.0, 1.12), base: 0, top: 2 });
  return { solids, floorLines: false };
}

// AGRICULTURAL — long low barn with a gable roof, sitting in its field.
export function buildAgricultural(foot: number[][], obb: Obb, H: number): BuildResult {
  const eaves = clamp(H, 4, 6);
  const solids: Solid[] = [];
  solids.push({ t: "prism", ring: foot, base: 0, top: eaves });
  const r = subRect(obb, -1, 1, -1, 1);
  solids.push({ t: "gable", ...r, base: eaves, eave: eaves, ridge: eaves + 4 });
  return { solids, floorLines: false };
}

// INVESTMENT (AD off-plan) — premium tower: tapered shaft + protruding
// sky-terrace + corner-cut (narrowed) crown. Distinct from COMMERCIAL.
export function buildInvestment(foot: number[][], _obb: Obb, H: number): BuildResult {
  const t1 = H * 0.62, t2 = H * 0.9;
  return { solids: [
    { t: "prism", ring: scaleRing(foot, 1.04), base: 0, top: 8 },        // entrance base
    { t: "prism", ring: scaleRing(foot, 0.95), base: 8, top: t1 },       // main shaft
    { t: "prism", ring: scaleRing(foot, 1.08), base: t1, top: t1 + 2 },  // sky-terrace slab
    { t: "prism", ring: scaleRing(foot, 0.7), base: t1 + 2, top: t2 },   // tapered upper
    { t: "prism", ring: scaleRing(foot, 0.42), base: t2, top: H },       // crown
  ], floorLines: true };
}

// FUTURE_DEVELOPMENT — flat fill, no 3D massing (CLAUDE.md rule).
export function buildFuture(foot: number[][], _obb: Obb, _H: number): BuildResult {
  return { solids: [{ t: "prism", ring: foot, base: 0, top: 1.5 }], floorLines: false };
}

export function buildArchetype(cat: string, foot: number[][], obb: Obb, H: number): BuildResult {
  switch (cat) {
    case "RESIDENTIAL": return buildResidential(foot, obb, H);
    case "HOTEL": case "HOSPITALITY": return buildHotel(foot, obb, H);
    case "EDUCATIONAL": case "EDUCATION": return buildEducational(foot, obb, H);
    case "HEALTHCARE": return buildHealthcare(foot, obb, H);
    case "COMMERCIAL": case "RETAIL": return buildCommercial(foot, obb, H);
    case "INVESTMENT": return buildInvestment(foot, obb, H);
    case "MIXED_USE": return buildMixedUse(foot, obb, H);
    case "INDUSTRIAL": case "WAREHOUSE": return buildIndustrial(foot, obb, H);
    case "AGRICULTURAL": case "AGRICULTURE": return buildAgricultural(foot, obb, H);
    case "FUTURE_DEVELOPMENT": case "FUTURE DEVELOPMENT": return buildFuture(foot, obb, H);
    default: return buildCommercial(foot, obb, H);
  }
}

export { FLOOR_H };
