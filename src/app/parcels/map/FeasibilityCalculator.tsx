"use client";
import { useState, useCallback, useMemo, useEffect } from "react";
import { jsPDF } from "jspdf";

/* ═══════════════════════════════════════════════════════════════════
   ZAAHI FEASIBILITY CALCULATOR v3.1 — INSTITUTIONAL GRADE
   Dubai Land Development · 8 Segments · IRR-Centric
   Height Premium, Permits/Licenses, DEWA, Master Dev Fees
   Calibrated: Knight Frank, CBRE, DLD, RERA, Cavendish Maxwell, DBC 2021
   ═══════════════════════════════════════════════════════════════════ */

interface Props {
  plotAreaSqft: number;
  plotPriceAed: number;
  gfaSqft: number;
  far: number | null;
  landUse: string;
  landUseMix?: Array<{ category: string; sub: string; areaSqm?: number | null }> | null;
  maxFloors?: number | null;
  community?: string | null;
  plotNumber?: string | null;
  district?: string | null;
  projectName?: string | null;
  masterDeveloper?: string | null;
  maxHeightCode?: string | null;
}

// ── Constants ──────────────────────────────────────────────────────

const GOLD = "#C8A96E";
const TXT = "#1A1A2E";
const SUBTLE = "#6B7280";
const LINE = "#E5E7EB";
const BG = "#FAFAF9";
const RED = "#E63946";
const GREEN = "#2D6A4F";

interface HeightBracket {
  maxFloors: number;
  label: string;
  premium: number;
  pilingCost: number;
  dewaSubstation: boolean;
}

const HEIGHT_BRACKETS: HeightBracket[] = [
  { maxFloors: 4, label: "Low-Rise G+4", premium: 0, pilingCost: 0, dewaSubstation: false },
  { maxFloors: 10, label: "Mid-Rise G+10", premium: 0.12, pilingCost: 35, dewaSubstation: false },
  { maxFloors: 20, label: "High-Rise G+20", premium: 0.25, pilingCost: 80, dewaSubstation: true },
  { maxFloors: 40, label: "Tower G+40", premium: 0.40, pilingCost: 150, dewaSubstation: true },
  { maxFloors: 60, label: "Super Tall G+60", premium: 0.55, pilingCost: 250, dewaSubstation: true },
  { maxFloors: 999, label: "Mega Tall 60+", premium: 0.75, pilingCost: 400, dewaSubstation: true },
];

function getHB(f: number): HeightBracket {
  return HEIGHT_BRACKETS.find((b) => f <= b.maxFloors) || HEIGHT_BRACKETS[5];
}
function estFloors(gba: number, land: number, far: number): number {
  const fp = land * (far > 4 ? 0.45 : far > 2 ? 0.55 : 0.65);
  return fp <= 0 ? 4 : Math.max(1, Math.ceil(gba / fp));
}

interface PermitResult {
  bp: number; cd: number; dewa: number; piling: number; mdFee: number;
  sector: number; rera: number; env: number; cPrem: number; total: number;
  hPrem: number; hLabel: string;
}

function calcPermits(type: string, hc: number, gba: number, floors: number, zone: string): PermitResult {
  const hb = getHB(floors);
  const bp = hc * (gba > 500000 ? 0.015 : gba > 100000 ? 0.012 : 0.01);
  const cd = gba * (floors > 20 ? 8 : floors > 10 ? 5 : 3);
  let dewa = gba * 12;
  if (hb.dewaSubstation) dewa += gba > 500000 ? 2000000 : gba > 200000 ? 1500000 : 800000;
  const piling = (gba * hb.pilingCost) / 10.764;
  const mdFee = !["Custom", "DIP", "JAFZA", "Dubai Industrial City", "Al Quoz"].includes(zone) ? gba * 8 : 0;
  let sector = 0;
  if (type === "educational") sector = 50000;
  if (type === "healthcare") sector = 40000;
  if (type === "hotel") sector = 25000;
  const cPrem = hc > 100000000 ? hc * 0.08 : hc > 50000000 ? hc * 0.05 : 0;
  const env = type === "industrial" || type === "agricultural" ? 25000 : 0;
  const total = bp + cd + dewa + piling + mdFee + sector + 15000 + env + cPrem;
  return { bp, cd, dewa, piling, mdFee, sector, rera: 15000, env, cPrem, total, hPrem: hb.premium, hLabel: hb.label };
}

interface ZoneInfo { far: number; lpsf: number; tier: string }
const ZONES: Record<string, ZoneInfo> = {
  DIFC: { far: 12.75, lpsf: 2800, tier: "Prime" },
  "Downtown Dubai": { far: 8.0, lpsf: 2200, tier: "Prime" },
  "Palm Jumeirah": { far: 3.5, lpsf: 4500, tier: "Ultra-Prime" },
  "Dubai Marina": { far: 7.0, lpsf: 1800, tier: "Prime" },
  "Business Bay": { far: 6.5, lpsf: 1600, tier: "Prime" },
  "Dubai Hills Estate": { far: 2.5, lpsf: 1500, tier: "Mid-Prime" },
  JVC: { far: 3.0, lpsf: 650, tier: "Mid-Market" },
  "MBR City": { far: 2.8, lpsf: 900, tier: "Mid-Prime" },
  "Dubai South": { far: 2.0, lpsf: 450, tier: "Emerging" },
  "Al Furjan": { far: 2.5, lpsf: 750, tier: "Mid-Market" },
  DIP: { far: 1.5, lpsf: 75, tier: "Industrial" },
  JAFZA: { far: 1.2, lpsf: 90, tier: "Free Zone" },
  "Dubai Industrial City": { far: 0.8, lpsf: 55, tier: "Industrial" },
  "Dubai Silicon Oasis": { far: 3.0, lpsf: 500, tier: "Mid-Market" },
  "Al Quoz": { far: 2.0, lpsf: 120, tier: "Industrial" },
  Custom: { far: 2.5, lpsf: 500, tier: "Custom" },
};

type LuKey = "residential" | "commercial" | "mixed_use" | "hotel" | "industrial" | "educational" | "healthcare" | "agricultural";

interface LuConfig {
  label: string;
  icon: string;
  rm: string;
  defaults: Record<string, number | string>;
  ph: string[];
}

const LU: Record<LuKey, LuConfig> = {
  residential: { label: "Residential", icon: "R", rm: "sale", defaults: { zone: "Dubai Hills Estate", landArea: 50000, eff: 0.78, hcPSF: 450, softPct: 12, contPct: 10, constMo: 28, salePSF: 1800, absUnits: 15, unitSize: 900, dldPct: 4, agentPct: 2, escrowPct: 20, ppSplit: 60, dr: 12, ltv: 60, ir: 7.5, ecr: 6.5, floors: 0, rentPSF: 0, occ: 0, opex: 0, mgmt: 0 }, ph: ["Pre-Dev", "Design", "Construction", "Sales", "Handover"] },
  commercial: { label: "Commercial", icon: "C", rm: "noi", defaults: { zone: "Business Bay", landArea: 40000, eff: 0.82, hcPSF: 580, softPct: 14, contPct: 8, constMo: 32, rentPSF: 180, occ: 88, opex: 28, mgmt: 3, dldPct: 4, agentPct: 0, escrowPct: 20, ppSplit: 0, dr: 13, ltv: 55, ir: 7.0, ecr: 7.0, salePSF: 0, absUnits: 0, unitSize: 0, floors: 0 }, ph: ["Pre-Dev", "Design", "Construction", "Lease-Up", "Stabilization"] },
  mixed_use: { label: "Mixed Use", icon: "M", rm: "mixed", defaults: { zone: "Business Bay", landArea: 60000, eff: 0.76, hcPSF: 520, softPct: 13, contPct: 9, constMo: 34, resPct: 55, comPct: 30, retPct: 15, salePSF: 1600, rentPSF: 160, retRent: 220, occ: 85, opex: 25, mgmt: 3, absUnits: 12, unitSize: 850, dldPct: 4, agentPct: 2, escrowPct: 20, ppSplit: 60, dr: 13, ltv: 55, ir: 7.25, ecr: 6.75, floors: 0 }, ph: ["Master Plan", "Phase 1", "Phase 2", "Lease & Sales", "Stabilized"] },
  hotel: { label: "Hotel", icon: "H", rm: "hotel", defaults: { zone: "Palm Jumeirah", landArea: 35000, eff: 0.62, hcPSF: 1200, softPct: 16, contPct: 10, constMo: 40, adr: 750, occ: 77, rooms: 220, fbPct: 30, othPct: 15, opex: 62, mgmt: 4, ffe: 4, ramp: 2, dldPct: 4, escrowPct: 20, dr: 14, ltv: 50, ir: 8.0, ecr: 8.0, floors: 0, salePSF: 0, rentPSF: 0, agentPct: 0, ppSplit: 0, absUnits: 0, unitSize: 0 }, ph: ["Pre-Dev", "Design", "Construction", "Pre-Open", "Ramp-Up", "Stable"] },
  industrial: { label: "Industrial", icon: "I", rm: "noi", defaults: { zone: "DIP", landArea: 100000, eff: 0.90, hcPSF: 150, softPct: 10, contPct: 6, constMo: 14, rentPSF: 55, occ: 93, opex: 18, mgmt: 2.5, dldPct: 4, escrowPct: 0, dr: 11, ltv: 65, ir: 6.5, ecr: 7.5, salePSF: 0, agentPct: 0, ppSplit: 0, absUnits: 0, unitSize: 0, floors: 0 }, ph: ["Land", "Construction", "Fit-Out", "Lease-Up"] },
  educational: { label: "Educational", icon: "E", rm: "edu", defaults: { zone: "Dubai Hills Estate", landArea: 45000, eff: 0.72, hcPSF: 380, softPct: 14, contPct: 8, constMo: 24, feePer: 55000, capacity: 1500, rampYr: 4, initPct: 35, opex: 72, dldPct: 4, escrowPct: 0, dr: 12, ltv: 45, ir: 7.0, ecr: 9.0, salePSF: 0, rentPSF: 0, occ: 0, agentPct: 0, mgmt: 0, ppSplit: 0, absUnits: 0, unitSize: 0, floors: 0 }, ph: ["Land", "Construction", "KHDA", "Staffing", "Enrollment"] },
  healthcare: { label: "Healthcare", icon: "+", rm: "health", defaults: { zone: "Dubai Hills Estate", landArea: 30000, eff: 0.65, hcPSF: 850, softPct: 18, contPct: 12, constMo: 34, beds: 150, revBed: 900000, occ: 72, ancPct: 35, opex: 68, ramp: 3, dldPct: 4, escrowPct: 0, dr: 14, ltv: 45, ir: 7.5, ecr: 8.5, salePSF: 0, rentPSF: 0, agentPct: 0, mgmt: 0, ppSplit: 0, absUnits: 0, unitSize: 0, floors: 0 }, ph: ["Land/DHA", "Design", "Construction", "Equip", "Commission", "Ramp"] },
  agricultural: { label: "Agricultural", icon: "A", rm: "agri", defaults: { zone: "Custom", landArea: 200000, eff: 0.85, hcPSF: 45, softPct: 8, contPct: 5, constMo: 12, yld: 12, ppu: 8, grow: 3, opex: 55, dldPct: 4, escrowPct: 0, dr: 10, ltv: 35, ir: 6.0, ecr: 10.0, salePSF: 0, rentPSF: 0, occ: 0, agentPct: 0, mgmt: 0, ppSplit: 0, absUnits: 0, unitSize: 0, floors: 0 }, ph: ["Land", "Infra", "Planting", "Yield", "Stable"] },
};

// ── IRR / NPV ──────────────────────────────────────────────────────

function irr(cfs: number[], g = 0.1): number {
  let r = g;
  for (let i = 0; i < 300; i++) {
    let n = 0, d = 0;
    for (let t = 0; t < cfs.length; t++) {
      const p = Math.pow(1 + r, t);
      n += cfs[t] / p;
      d -= (t * cfs[t]) / (p * (1 + r));
    }
    if (Math.abs(n) < 0.01) return r;
    const nr = r - n / d;
    if (isNaN(nr) || !isFinite(nr)) return NaN;
    r = nr;
  }
  return r;
}

// ── Run model ──────────────────────────────────────────────────────

interface RunResult {
  gba: number; nsa: number; far: number; fl: number;
  landC: number; baseHC: number; hPrem: number; hc: number;
  sc: number; cont: number; dld: number; pm: PermitResult;
  tdc: number; eq: number; debt: number; ds: number; esc: number;
  noi: number; rev: number; tsr: number; ev: number;
  irr: number; npv: number; em: number; dscr: number; dy: number;
  cf: number[]; met: Record<string, number | string>;
  hp: number; cy: number; cpsf: number;
}

function run(type: string, inp: Record<string, number | string>): RunResult {
  const c = LU[type as LuKey] || LU.residential;
  const z = ZONES[inp.zone as string] || ZONES.Custom;
  const far = (inp.farOverride as number) > 0 ? (inp.farOverride as number) : z.far;
  const la = inp.landArea as number;
  const gba = (inp.gfa as number) > 0 ? (inp.gfa as number) : la * far;
  const nsa = gba * (inp.eff as number);
  const fl = (inp.floors as number) > 0 ? (inp.floors as number) : estFloors(gba, la, far);
  const hb = getHB(fl);
  const landC = (inp.landCost as number) > 0 ? (inp.landCost as number) : la * z.lpsf;
  const baseHC = gba * (inp.hcPSF as number), hPrem_ = baseHC * hb.premium, hc = baseHC + hPrem_;
  const sc = hc * ((inp.softPct as number) / 100);
  const cont = hc * ((inp.contPct as number) / 100);
  const dld = landC * ((inp.dldPct as number) / 100);
  const pm = calcPermits(type, hc, gba, fl, inp.zone as string);
  const tdc = landC + hc + sc + cont + dld + 5000 + pm.total;
  const eq = tdc * (1 - (inp.ltv as number) / 100);
  const debt = tdc * ((inp.ltv as number) / 100);
  const ds = debt * ((inp.ir as number) / 100);
  const esc = tdc * ((inp.escrowPct as number) / 100);
  const hp = 10, cy = Math.ceil((inp.constMo as number) / 12);
  let cf: number[] = [], noi = 0, rev = 0, tsr = 0, ev = 0;
  const met: Record<string, number | string> = {};

  if (c.rm === "sale") {
    tsr = nsa * (inp.salePSF as number);
    const tu = Math.floor(nsa / ((inp.unitSize as number) || 900));
    const ac = tsr * ((inp.agentPct as number) / 100) * 1.05;
    const nr = tsr - ac;
    const ms = tu / ((inp.absUnits as number) || 15);
    const sy = Math.max(1, Math.ceil(ms / 12));
    const dm = ((nr - tdc) / nr) * 100;
    cf = [-eq - esc];
    for (let y = 1; y <= cy; y++) cf.push(-ds);
    const ps = nr * (((inp.ppSplit as number) || 60) / 100) * 0.3;
    if (cy > 0) cf[cy] += ps;
    const pr = nr - ps;
    for (let y = 0; y < sy; y++) cf.push(pr / sy - ds);
    cf[cf.length - 1] -= debt;
    if (cf.length < hp) cf.push(tsr * 0.05);
    met.totalUnits = tu;
    met.devMargin = dm.toFixed(1) + "%";
    met.monthsToSell = Math.round(ms);
    met.costPerUnit = Math.round(tdc / tu);
  } else if (c.rm === "noi") {
    rev = nsa * (inp.rentPSF as number) * ((inp.occ as number) / 100);
    noi = rev * (1 - (inp.opex as number) / 100 - ((inp.mgmt as number) || 0) / 100);
    ev = (noi * Math.pow(1.03, hp - cy)) / ((inp.ecr as number) / 100);
    cf = [-eq];
    for (let y = 1; y <= cy; y++) cf.push(-ds);
    cf.push(noi * 0.6 - ds);
    for (let y = cy + 2; y <= hp - 1; y++) cf.push(noi * Math.pow(1.03, y - cy - 1) - ds);
    cf.push(noi * Math.pow(1.03, hp - cy - 1) - ds + ev - debt);
    met.annualNOI = noi;
    met.yieldOnCost = ((noi / tdc) * 100).toFixed(2) + "%";
    met.exitVal = ev;
  } else if (c.rm === "mixed") {
    const rr = nsa * ((inp.resPct as number) || 55) / 100 * (inp.salePSF as number) * (1 - ((inp.agentPct as number) / 100) * 1.05);
    const cn = nsa * ((inp.comPct as number) || 30) / 100 * (inp.rentPSF as number) * ((inp.occ as number) / 100) * (1 - (inp.opex as number) / 100 - ((inp.mgmt as number) || 0) / 100);
    const rn = nsa * ((inp.retPct as number) || 15) / 100 * ((inp.retRent as number) || (inp.rentPSF as number) * 1.3) * ((inp.occ as number) / 100) * (1 - (inp.opex as number) / 100);
    noi = cn + rn;
    ev = (noi * Math.pow(1.03, hp - cy)) / ((inp.ecr as number) / 100);
    cf = [-eq];
    for (let y = 1; y <= cy; y++) cf.push(-ds);
    for (let y = 0; y < 2; y++) cf.push(rr / 2 + noi * 0.7 - ds);
    for (let y = cy + 3; y <= hp - 1; y++) cf.push(noi * Math.pow(1.03, y - cy) - ds);
    cf.push(noi * Math.pow(1.03, hp - cy) + ev - debt);
    met.resRev = rr;
    met.annualNOI = noi;
    met.exitVal = ev;
  } else if (c.rm === "hotel") {
    const rp = (inp.adr as number) * ((inp.occ as number) / 100);
    const rr = rp * (inp.rooms as number) * 365;
    rev = rr * (1 + (inp.fbPct as number) / 100 + (inp.othPct as number) / 100);
    const gop = rev * (1 - (inp.opex as number) / 100);
    noi = gop - rev * ((inp.mgmt as number) / 100) - rev * (((inp.ffe as number) || 4) / 100);
    ev = (noi * Math.pow(1.03, hp - cy - ((inp.ramp as number) || 2))) / ((inp.ecr as number) / 100);
    cf = [-eq];
    for (let y = 1; y <= cy; y++) cf.push(-ds);
    for (let y = 1; y <= ((inp.ramp as number) || 2); y++) cf.push(noi * (0.3 + (0.7 * y) / ((inp.ramp as number) || 2)) - ds);
    const ss = cy + ((inp.ramp as number) || 2) + 1;
    for (let y = ss; y <= hp - 1; y++) cf.push(noi * Math.pow(1.03, y - ss + 1) - ds);
    cf.push(noi * Math.pow(1.03, hp - ss + 1) + ev - debt);
    met.revpar = rp.toFixed(0);
    met.costPerKey = Math.round(tdc / (inp.rooms as number));
    met.gopMargin = ((gop / rev) * 100).toFixed(1) + "%";
    met.annualNOI = noi;
  } else if (c.rm === "edu") {
    const mx = (inp.capacity as number) * (inp.feePer as number);
    const rm = (inp.rampYr as number) || 4;
    const ip = ((inp.initPct as number) || 35) / 100;
    cf = [-eq];
    for (let y = 1; y <= cy; y++) cf.push(-ds);
    for (let y = 1; y <= hp - cy; y++) {
      const ep = Math.min(0.95, ip + (0.95 - ip) * Math.min(1, y / rm));
      noi = mx * ep * (1 - (inp.opex as number) / 100);
      if (y === hp - cy) { ev = noi / ((inp.ecr as number) / 100); cf.push(noi - ds + ev - debt); }
      else cf.push(noi - ds);
    }
    met.maxRev = mx;
    met.costPerStudent = Math.round(tdc / (inp.capacity as number));
    met.stabilizedNOI = noi;
  } else if (c.rm === "health") {
    rev = (inp.beds as number) * (inp.revBed as number) * ((inp.occ as number) / 100) * (1 + (inp.ancPct as number) / 100);
    noi = rev * (1 - (inp.opex as number) / 100);
    ev = (noi * Math.pow(1.03, hp - cy - ((inp.ramp as number) || 3))) / ((inp.ecr as number) / 100);
    cf = [-eq];
    for (let y = 1; y <= cy; y++) cf.push(-ds);
    for (let y = 1; y <= ((inp.ramp as number) || 3); y++) cf.push(noi * (0.2 + (0.8 * y) / ((inp.ramp as number) || 3)) - ds);
    const ss = cy + ((inp.ramp as number) || 3) + 1;
    for (let y = ss; y <= hp - 1; y++) cf.push(noi * Math.pow(1.03, y - ss + 1) - ds);
    cf.push(noi * Math.pow(1.03, hp - ss + 1) + ev - debt);
    met.annualRev = rev;
    met.annualNOI = noi;
    met.costPerBed = Math.round(tdc / (inp.beds as number));
    met.ebitda = ((noi / rev) * 100).toFixed(1) + "%";
  } else if (c.rm === "agri") {
    rev = la * (inp.eff as number) * ((inp.yld as number) || 12) * ((inp.ppu as number) || 8);
    noi = rev * (1 - (inp.opex as number) / 100);
    ev = (noi * Math.pow(1.03, hp - cy)) / ((inp.ecr as number) / 100);
    cf = [-eq];
    for (let y = 1; y <= cy; y++) cf.push(-ds);
    cf.push(noi * 0.4 - ds);
    for (let y = cy + 2; y <= hp - 1; y++) cf.push(noi * Math.pow(1 + ((inp.grow as number) || 3) / 100, y - cy - 1) - ds);
    cf.push(noi * Math.pow(1.03, hp - cy) + ev - debt);
    met.annualRev = rev;
    met.annualNOI = noi;
    met.revPerAcre = Math.round(rev / (la / 43560));
  }

  const i = irr(cf);
  const ip = isNaN(i) ? 0 : i * 100;
  const n = cf.reduce((s, c_, t) => s + c_ / Math.pow(1 + (inp.dr as number) / 100, t), 0);
  const em = cf.reduce((s, c_) => s + Math.max(0, c_), 0) / eq;
  const dscr = noi > 0 ? noi / ds : 0;
  const dy = noi > 0 ? (noi / debt) * 100 : 0;
  return { gba, nsa, far, fl, landC, baseHC, hPrem: hPrem_, hc, sc, cont, dld, pm, tdc, eq, debt, ds, esc, noi, rev, tsr, ev, irr: ip, npv: n, em, dscr, dy, cf, met, hp, cy, cpsf: tdc / gba };
}

function sens(type: string, base: Record<string, number | string>, param: string) {
  return [-20, -10, 0, 10, 20].map((d) => {
    const m = { ...base, [param]: (base[param] as number) * (1 + d / 100) };
    return { d, irr: run(type, m).irr };
  });
}

// ── Formatting ─────────────────────────────────────────────────────

const F = {
  n: (v: number): string => {
    if (!v && v !== 0 || isNaN(v)) return "\u2014";
    if (Math.abs(v) >= 1e9) return (v / 1e9).toFixed(2) + "B";
    if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(1) + "M";
    if (Math.abs(v) >= 1e3) return (v / 1e3).toFixed(0) + "K";
    return v.toFixed(0);
  },
  aed: (v: number): string => "AED " + F.n(v),
  pct: (v: number, d = 1): string => (isNaN(v) ? "\u2014" : v.toFixed(d) + "%"),
};

// ── Sub-components ─────────────────────────────────────────────────

function NumInput({ l, v, onChange: o, u, s = 1 }: { l: string; v: number; onChange: (v: number) => void; u?: string; s?: number }) {
  const [local, setLocal] = useState(String(v));
  const [focused, setFocused] = useState(false);
  useEffect(() => { if (!focused) setLocal(String(v)); }, [v, focused]);
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ fontSize: 9.5, color: SUBTLE, letterSpacing: ".04em", marginBottom: 2 }}>{l}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <input type="number" value={local}
          onChange={(e) => { setLocal(e.target.value); const n = +e.target.value; if (!isNaN(n)) o(n); }}
          onFocus={() => setFocused(true)}
          onBlur={() => { setFocused(false); const n = +local; setLocal(String(isNaN(n) ? 0 : n)); if (isNaN(n)) o(0); }}
          step={s}
          style={{ flex: 1, background: BG, border: `1px solid ${LINE}`, borderRadius: 5, padding: "5px 7px", fontSize: 12, color: TXT, outline: "none", width: "100%", fontFamily: "inherit" }} />
        {u && <span style={{ fontSize: 8, color: SUBTLE, minWidth: 20 }}>{u}</span>}
      </div>
    </div>
  );
}

function Sel({ l, v, onChange: o, opts }: { l: string; v: string; onChange: (v: string) => void; opts: string[] }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ fontSize: 9.5, color: SUBTLE, letterSpacing: ".04em", marginBottom: 2 }}>{l}</div>
      <select value={v} onChange={(e) => o(e.target.value)}
        style={{ width: "100%", background: BG, border: `1px solid ${LINE}`, borderRadius: 5, padding: "5px 7px", fontSize: 12, color: TXT, outline: "none", fontFamily: "inherit" }}>
        {opts.map((o_) => <option key={o_}>{o_}</option>)}
      </select>
    </div>
  );
}

function Metric({ l, v, sub, big: b }: { l: string; v: string; sub?: string; big?: boolean }) {
  return (
    <div style={{ background: b ? GOLD : "white", borderRadius: 6, padding: b ? "11px 13px" : "7px 9px", border: b ? "none" : `1px solid ${LINE}`, flex: "1 1 100px", minWidth: 90 }}>
      <div style={{ fontSize: 8, textTransform: "uppercase", letterSpacing: ".06em", color: b ? "rgba(255,255,255,.55)" : SUBTLE, marginBottom: 1 }}>{l}</div>
      <div style={{ fontSize: b ? 20 : 14, fontWeight: 700, color: b ? "#fff" : TXT, lineHeight: 1.1 }}>{v}</div>
      {sub && <div style={{ fontSize: 7.5, color: b ? "rgba(255,255,255,.4)" : SUBTLE, marginTop: 1 }}>{sub}</div>}
    </div>
  );
}

function CfBar({ cfs }: { cfs: number[] }) {
  const mx = Math.max(...cfs.map(Math.abs), 1);
  return (
    <svg viewBox="0 0 100 50" style={{ width: "100%", height: 65 }}>
      <line x1="0" y1="25" x2="100" y2="25" stroke={LINE} strokeWidth=".3" />
      {cfs.map((c_, i) => { const w = 100 / cfs.length, h = (Math.abs(c_) / mx) * 22; return <rect key={i} x={i * w + w * .15} y={c_ >= 0 ? 25 - h : 25} width={w * .7} height={h} fill={c_ >= 0 ? GOLD : RED} rx=".6" opacity=".8" />; })}
      {cfs.map((_, i) => { const w = 100 / cfs.length; return <text key={"t" + i} x={i * w + w / 2} y="48" textAnchor="middle" fontSize="2.3" fill={SUBTLE}>Y{i}</text>; })}
    </svg>
  );
}

// ── Map land use string → LuKey ────────────────────────────────────

function mapLandUse(lu: string): LuKey {
  const s = lu.toUpperCase().replace(/[\s_-]+/g, "_");
  if (s.includes("RESIDENTIAL") || s.includes("VILLA") || s.includes("APARTMENT")) return "residential";
  if (s.includes("MIXED")) return "mixed_use";
  if (s.includes("HOTEL") || s.includes("HOSPITALITY")) return "hotel";
  if (s.includes("INDUSTRIAL") || s.includes("WAREHOUSE")) return "industrial";
  if (s.includes("EDUCATIONAL") || s.includes("EDUCATION")) return "educational";
  if (s.includes("HEALTHCARE") || s.includes("HEALTH")) return "healthcare";
  if (s.includes("AGRICULTURAL") || s.includes("AGRICULTURE") || s.includes("FARM")) return "agricultural";
  if (s.includes("COMMERCIAL") || s.includes("OFFICE") || s.includes("RETAIL")) return "commercial";
  return "residential";
}

// ── Match community name → zone key ────────────────────────────────

function matchZone(community: string | null | undefined): string {
  if (!community) return "Custom";
  const c = community.toUpperCase();
  for (const [zk] of Object.entries(ZONES)) {
    if (c.includes(zk.toUpperCase())) return zk;
  }
  if (c.includes("BUSINESS BAY")) return "Business Bay";
  if (c.includes("DUBAI HILLS")) return "Dubai Hills Estate";
  if (c.includes("MARINA")) return "Dubai Marina";
  if (c.includes("DOWNTOWN")) return "Downtown Dubai";
  if (c.includes("JVC") || c.includes("JUMEIRAH VILLAGE")) return "JVC";
  if (c.includes("PALM")) return "Palm Jumeirah";
  if (c.includes("SILICON")) return "Dubai Silicon Oasis";
  if (c.includes("INDUSTRIAL")) return "Dubai Industrial City";
  if (c.includes("SOUTH")) return "Dubai South";
  return "Custom";
}

// ── Auto-split mixed use from DDA landUseMix ──────────────────────

function computeMixedSplit(mix: Props["landUseMix"]): { resPct: number; comPct: number; retPct: number } | null {
  if (!mix || mix.length < 2) return null;
  const areas = mix.map((m) => m.areaSqm ?? 0);
  const total = areas.reduce((s, a) => s + a, 0);
  if (total <= 0) return null;
  let res = 0, com = 0, ret = 0;
  mix.forEach((m, i) => {
    const cat = m.category.toUpperCase();
    const sub = (m.sub || "").toUpperCase();
    if (cat.includes("RESIDENTIAL") || cat.includes("VILLA") || cat.includes("APARTMENT")) res += areas[i];
    else if (sub.includes("RETAIL") || cat.includes("RETAIL")) ret += areas[i];
    else com += areas[i];
  });
  return { resPct: Math.round((res / total) * 100), comPct: Math.round((com / total) * 100), retPct: Math.round((ret / total) * 100) };
}

// ── Main component ─────────────────────────────────────────────────

export default function FeasibilityCalculator(props: Props) {
  const initialLu = mapLandUse(props.landUse);
  const [lu, setLU] = useState<LuKey>(initialLu);
  const [inp, setInp] = useState<Record<string, number | string>>(() => {
    const d = { ...LU[initialLu].defaults };
    if (props.plotAreaSqft > 0) d.landArea = props.plotAreaSqft;
    if (props.maxFloors && props.maxFloors > 0) d.floors = props.maxFloors;
    const zone = matchZone(props.community);
    d.zone = zone;
    d.landCost = props.plotPriceAed > 0 ? props.plotPriceAed : 0;
    d.gfa = props.gfaSqft > 0 ? props.gfaSqft : 0;
    d.farOverride = props.far && props.far > 0 ? props.far : 0;
    const ms = computeMixedSplit(props.landUseMix);
    if (ms && initialLu === "mixed_use") { d.resPct = ms.resPct; d.comPct = ms.comPct; d.retPct = ms.retPct; }
    return d;
  });
  const [tab, setTab] = useState<"inputs" | "results" | "sensitivity">("inputs");
  const [sd, setSD] = useState<Array<{ l: string; d: Array<{ d: number; irr: number }> }> | null>(null);
  const [disclaimerVisible, setDisclaimerVisible] = useState(true);

  const c = LU[lu];

  // When land use type changes, reset defaults but keep plot-specific overrides
  useEffect(() => {
    const d = { ...LU[lu].defaults };
    if (props.plotAreaSqft > 0) d.landArea = props.plotAreaSqft;
    if (props.maxFloors && props.maxFloors > 0) d.floors = props.maxFloors;
    const zone = matchZone(props.community);
    d.zone = zone;
    d.landCost = props.plotPriceAed > 0 ? props.plotPriceAed : 0;
    d.gfa = props.gfaSqft > 0 ? props.gfaSqft : 0;
    d.farOverride = props.far && props.far > 0 ? props.far : 0;
    const ms = computeMixedSplit(props.landUseMix);
    if (ms && lu === "mixed_use") { d.resPct = ms.resPct; d.comPct = ms.comPct; d.retPct = ms.retPct; }
    setInp(d);
    setTab("inputs");
    setSD(null);
  }, [lu, props.plotAreaSqft, props.maxFloors, props.community, props.plotPriceAed, props.gfaSqft, props.far, props.landUseMix]);

  const u = useCallback((k: string, v: number | string) => setInp((p) => ({ ...p, [k]: v })), []);
  const r = useMemo(() => run(lu, inp), [lu, inp]);

  const doS = () => {
    const ps: [string, string][] =
      lu === "hotel" ? [["adr", "ADR"], ["occ", "Occ"], ["hcPSF", "Hard"], ["ecr", "Cap"]] :
      c.rm === "sale" ? [["salePSF", "Price"], ["hcPSF", "Hard"], ["absUnits", "Absorb"], ["ir", "Rate"]] :
      c.rm === "edu" ? [["feePer", "Fee"], ["capacity", "Cap"], ["hcPSF", "Hard"], ["opex", "OpEx"]] :
      c.rm === "health" ? [["revBed", "Rev/Bed"], ["occ", "Occ"], ["hcPSF", "Hard"], ["opex", "OpEx"]] :
      [["rentPSF", "Rent"], ["occ", "Occ"], ["hcPSF", "Hard"], ["ecr", "Cap"]];
    setSD(ps.map(([k, l]) => ({ l, d: sens(lu, inp, k) })));
  };

  const ic = r.irr > 18 ? GREEN : r.irr > 12 ? GOLD : RED;
  const it = r.irr > 18 ? "STRONG" : r.irr > 12 ? "MODERATE" : "BELOW TARGET";

  const downloadPDF = useCallback(() => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const W = 210, M = 15;
    const cw = W - 2 * M;
    let y = 15;
    const gold: [number, number, number] = [200, 169, 110];
    const dark: [number, number, number] = [26, 26, 46];
    const gray: [number, number, number] = [107, 114, 128];

    const addLine = () => { doc.setDrawColor(...gold); doc.setLineWidth(0.3); doc.line(M, y, W - M, y); y += 4; };
    const addFooter = () => { doc.setFontSize(6.5); doc.setTextColor(...gray); doc.setFont("helvetica", "normal"); doc.text("ZAAHI Real Estate OS \u2014 zaahi.io \u2014 Confidential", W / 2, 290, { align: "center" }); };
    addFooter();
    const checkPage = (need: number) => { if (y + need > 275) { doc.addPage(); y = 15; addFooter(); } };
    const heading = (t: string) => { checkPage(12); doc.setFontSize(11); doc.setTextColor(...gold); doc.setFont("helvetica", "bold"); doc.text(t, M, y); y += 6; };
    const row = (l: string, v: string) => { checkPage(6); doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(...gray); doc.text(l, M, y); doc.setTextColor(...dark); doc.text(v, W - M, y, { align: "right" }); y += 5; };

    // Header
    doc.setFontSize(18); doc.setTextColor(...gold); doc.setFont("helvetica", "bold");
    doc.text("ZAAHI Feasibility Report", M, y); y += 8;
    doc.setFontSize(9); doc.setTextColor(...gray); doc.setFont("helvetica", "normal");
    doc.text(`Generated ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, M, y); y += 4;
    addLine();

    // Plot info
    heading("PLOT INFORMATION");
    if (props.projectName) row("Project", props.projectName);
    if (props.masterDeveloper) row("Master Developer", props.masterDeveloper);
    if (props.plotNumber) row("Plot Number", props.plotNumber);
    if (props.district) row("District", props.district);
    row("Land Use", c.label);
    if (props.community) row("Community", props.community);
    if (props.maxHeightCode) row("Height Code", props.maxHeightCode);
    row("Plot Area", `${Math.round(props.plotAreaSqft).toLocaleString()} sqft`);
    if (props.plotPriceAed > 0) row("Plot Price", F.aed(props.plotPriceAed));
    y += 2;

    // Assumptions
    heading("ASSUMPTIONS");
    row("Zone", inp.zone as string);
    row("Land Cost", F.aed(r.landC));
    if (props.plotPriceAed > 0 && r.landC !== props.plotPriceAed) row("Listed Price", F.aed(props.plotPriceAed));
    row("GFA", `${F.n(r.gba)} sqft`);
    row("FAR", `${r.far}x`);
    row("Efficiency", `${((inp.eff as number) * 100).toFixed(0)}%`);
    row("Hard Cost / sqft", `AED ${inp.hcPSF}`);
    row("Soft Costs", `${inp.softPct}%`);
    row("Contingency", `${inp.contPct}%`);
    row("Construction", `${inp.constMo} months`);
    row("LTV", `${inp.ltv}%`);
    row("Interest Rate", `${inp.ir}%`);
    row("WACC", `${inp.dr}%`);
    row("Exit Cap Rate", `${inp.ecr}%`);
    const revFields = rf();
    for (const f of revFields) {
      const v = inp[f.k];
      row(f.l, `${v}${f.u ? " " + f.u : ""}`);
    }
    y += 2;

    // Key metrics
    heading("KEY METRICS");
    row("Levered IRR", `${F.pct(r.irr)} (${it})`);
    row("NPV", F.aed(r.npv));
    row("Equity Multiple", `${r.em.toFixed(2)}x`);
    if (r.dscr > 0) row("DSCR", r.dscr.toFixed(2));
    if (r.dy > 0) row("Debt Yield", F.pct(r.dy));
    row("GBA", `${F.n(r.gba)} sqft`);
    row("NSA", `${F.n(r.nsa)} sqft`);
    row("Floors", `${r.fl} (${r.pm.hLabel})`);
    row("Cost / sqft (GBA)", `AED ${r.cpsf.toFixed(0)}`);
    for (const [k, v] of Object.entries(r.met)) {
      const label = k.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
      row(label, typeof v === "number" ? (Math.abs(v) > 1000 ? F.aed(v) : F.n(v)) : String(v));
    }
    y += 2;

    // Cost stack
    heading("FULL COST STACK");
    const costs: [string, number][] = [["Land", r.landC], ["Base Hard Cost", r.baseHC], [`Height Premium +${(r.pm.hPrem * 100).toFixed(0)}%`, r.hPrem], ["Soft Cost", r.sc], ["Contingency", r.cont], ["DLD 4%", r.dld], ["Permits & Infra", r.pm.total]];
    for (const [l, v] of costs) { if (v > 0) row(l, F.aed(v)); }
    doc.setFont("helvetica", "bold"); doc.setTextColor(...gold);
    row("TOTAL DEVELOPMENT COST", F.aed(r.tdc));
    doc.setFont("helvetica", "normal");
    row("Equity Required", F.aed(r.eq));
    row("Debt", F.aed(r.debt));
    row("Annual Debt Service", F.aed(r.ds));
    y += 2;

    // Cash flow table
    heading("CASH FLOW PROJECTION");
    checkPage(10 + r.cf.length * 5);
    doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.setTextColor(...dark);
    doc.text("Year", M, y); doc.text("Cash Flow (AED)", W - M, y, { align: "right" }); y += 4;
    doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    r.cf.forEach((v, i) => {
      checkPage(5);
      doc.setTextColor(...gray); doc.text(`Year ${i}`, M, y);
      doc.setTextColor(v >= 0 ? 45 : 230, v >= 0 ? 106 : 57, v >= 0 ? 79 : 70);
      doc.text(F.aed(v), W - M, y, { align: "right" }); y += 4.5;
    });
    y += 2;

    // Sensitivity
    if (sd && sd.length > 0) {
      heading("SENSITIVITY ANALYSIS (IRR +/-20%)");
      doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.setTextColor(...dark);
      doc.text("Parameter", M, y);
      [-20, -10, 0, 10, 20].forEach((d, i) => {
        doc.text(`${d > 0 ? "+" : ""}${d}%`, M + 35 + i * 22, y, { align: "center" });
      }); y += 4;
      doc.setFont("helvetica", "normal");
      for (const s of sd) {
        checkPage(5);
        doc.setTextColor(...gray); doc.text(s.l, M, y);
        s.d.forEach((d, i) => {
          doc.setTextColor(...dark); doc.text(F.pct(d.irr, 1), M + 35 + i * 22, y, { align: "center" });
        }); y += 4.5;
      }
      y += 2;
    }

    // Disclaimer
    checkPage(15);
    addLine();
    doc.setFontSize(7); doc.setTextColor(...gray); doc.setFont("helvetica", "italic");
    doc.text("DISCLAIMER: This report is generated by ZAAHI Feasibility Calculator v3.1 for informational purposes only.", M, y); y += 3.5;
    doc.text("It does not constitute investment advice. All assumptions are user-defined and should be independently verified.", M, y); y += 3.5;
    doc.text("ZAAHI assumes no liability for investment decisions made based on this report.", M, y);

    // Page numbers
    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFontSize(7); doc.setTextColor(...gray); doc.setFont("helvetica", "normal");
      doc.text(`Page ${p} of ${totalPages}`, W - M, 290, { align: "right" });
    }

    const plotLabel = props.plotNumber ? `-Plot-${props.plotNumber}` : "";
    doc.save(`ZAAHI-Feasibility${plotLabel}-${new Date().toISOString().slice(0, 10)}.pdf`);
  }, [r, inp, lu, c, sd, it, props.plotNumber, props.district, props.plotAreaSqft, props.plotPriceAed, props.community, props.projectName, props.masterDeveloper, props.maxHeightCode]);

  type FieldDef = { k: string; l: string; u?: string; s?: number; t?: string; o?: string[] };

  const sec = (t: string, fs: FieldDef[]) => (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 8, fontWeight: 700, color: GOLD, letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 5, borderBottom: `1px solid ${GOLD}22`, paddingBottom: 2 }}>{t}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 8px" }}>
        {fs.map((f) => f.t === "s"
          ? <Sel key={f.k} l={f.l} v={inp[f.k] as string} onChange={(v) => u(f.k, v)} opts={f.o!} />
          : <NumInput key={f.k} l={f.l} v={(inp[f.k] as number) ?? 0} onChange={(v) => u(f.k, v)} u={f.u} s={f.s || 1} />
        )}
      </div>
    </div>
  );

  const rf = (): FieldDef[] => {
    if (c.rm === "sale") return [{ k: "salePSF", l: "Sale Price/sqft", u: "AED", s: 10 }, { k: "absUnits", l: "Units/Month", u: "un" }, { k: "unitSize", l: "Avg Unit", u: "sqft", s: 50 }, { k: "ppSplit", l: "Constr Payment%", u: "%", s: 5 }, { k: "agentPct", l: "Agent Comm", u: "%", s: .5 }];
    if (c.rm === "hotel") return [{ k: "adr", l: "ADR", u: "AED", s: 10 }, { k: "occ", l: "Occupancy", u: "%", s: 1 }, { k: "rooms", l: "Rooms", u: "keys" }, { k: "fbPct", l: "F&B%", u: "%", s: 1 }, { k: "othPct", l: "Other%", u: "%", s: 1 }, { k: "opex", l: "OpEx%", u: "%", s: 1 }, { k: "mgmt", l: "Mgmt%", u: "%", s: .5 }, { k: "ffe", l: "FF&E%", u: "%", s: .5 }, { k: "ramp", l: "Ramp-Up", u: "yr" }];
    if (c.rm === "edu") return [{ k: "feePer", l: "Fee/Student", u: "AED", s: 1000 }, { k: "capacity", l: "Capacity", u: "stud" }, { k: "rampYr", l: "Ramp Years", u: "yr" }, { k: "initPct", l: "Yr1 Enroll", u: "%", s: 5 }, { k: "opex", l: "OpEx%", u: "%", s: 1 }];
    if (c.rm === "health") return [{ k: "beds", l: "Beds", u: "beds" }, { k: "revBed", l: "Rev/Bed/Yr", u: "AED", s: 10000 }, { k: "occ", l: "Occupancy", u: "%", s: 1 }, { k: "ancPct", l: "Ancillary%", u: "%", s: 1 }, { k: "opex", l: "OpEx%", u: "%", s: 1 }, { k: "ramp", l: "Ramp-Up", u: "yr" }];
    if (c.rm === "agri") return [{ k: "yld", l: "Yield/sqft", u: "un", s: .5 }, { k: "ppu", l: "Price/Unit", u: "AED", s: .5 }, { k: "grow", l: "Growth%", u: "%", s: .5 }, { k: "opex", l: "OpEx%", u: "%", s: 1 }];
    if (c.rm === "mixed") return [{ k: "resPct", l: "Residential%", u: "%", s: 5 }, { k: "comPct", l: "Commercial%", u: "%", s: 5 }, { k: "retPct", l: "Retail%", u: "%", s: 5 }, { k: "salePSF", l: "Res Sale/sqft", u: "AED", s: 10 }, { k: "rentPSF", l: "Office Rent", u: "AED", s: 5 }, { k: "retRent", l: "Retail Rent", u: "AED", s: 5 }, { k: "occ", l: "Occupancy", u: "%", s: 1 }, { k: "opex", l: "OpEx%", u: "%", s: 1 }];
    return [{ k: "rentPSF", l: "Rent/sqft/yr", u: "AED", s: 5 }, { k: "occ", l: "Occupancy", u: "%", s: 1 }, { k: "opex", l: "OpEx%", u: "%", s: 1 }, { k: "mgmt", l: "Mgmt%", u: "%", s: .5 }];
  };

  return (
    <div style={{ color: TXT, fontFamily: '-apple-system, "Segoe UI", Roboto, sans-serif', fontSize: 11 }}>
      {/* Disclaimer banner */}
      {disclaimerVisible && (
        <div
          style={{
            marginBottom: 8,
            padding: "6px 10px",
            background: `${GOLD}0D`,
            border: `1px solid ${GOLD}33`,
            borderRadius: 6,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <span style={{ fontSize: 9, color: SUBTLE, lineHeight: 1.4 }}>
            This analysis is for informational purposes only and does not constitute investment advice.
          </span>
          <button
            onClick={() => setDisclaimerVisible(false)}
            style={{
              background: "none",
              border: "none",
              color: SUBTLE,
              fontSize: 13,
              cursor: "pointer",
              padding: "0 2px",
              lineHeight: 1,
              flexShrink: 0,
            }}
            aria-label="Dismiss disclaimer"
          >
            &times;
          </button>
        </div>
      )}

      {/* Land Use type selector */}
      <div style={{ marginBottom: 8, display: "flex", gap: 2, flexWrap: "wrap" }}>
        {(Object.entries(LU) as [LuKey, LuConfig][]).map(([k, v]) => (
          <button key={k} onClick={() => setLU(k)}
            style={{
              background: lu === k ? GOLD : "transparent",
              color: lu === k ? "#fff" : SUBTLE,
              border: lu === k ? "none" : `1px solid ${LINE}`,
              borderRadius: 5, padding: "3px 7px", cursor: "pointer",
              fontSize: 9, fontWeight: 600, whiteSpace: "nowrap",
              display: "flex", alignItems: "center", gap: 3,
            }}>
            <span style={{ fontSize: 8, fontWeight: 700, opacity: .7 }}>{v.icon}</span>
            {v.label}
          </button>
        ))}
      </div>

      {/* Project info from DDA */}
      {(props.projectName || props.masterDeveloper) && (
        <div style={{ marginBottom: 6, padding: "4px 8px", background: `${GOLD}0A`, borderRadius: 5, borderLeft: `2px solid ${GOLD}` }}>
          {props.projectName && <div style={{ fontSize: 10, fontWeight: 700, color: TXT }}>{props.projectName}</div>}
          {props.masterDeveloper && <div style={{ fontSize: 8.5, color: SUBTLE }}>by {props.masterDeveloper}</div>}
        </div>
      )}

      {/* Phase timeline */}
      <div style={{ display: "flex", gap: 1, marginBottom: 8 }}>
        {c.ph.map((p, i) => (
          <div key={i} style={{
            flex: 1, textAlign: "center", padding: "3px 1px",
            background: i === 0 ? `${GOLD}30` : `${GOLD}10`,
            borderRadius: i === 0 ? "4px 0 0 4px" : i === c.ph.length - 1 ? "0 4px 4px 0" : 0,
            fontSize: 6, color: i === 0 ? GOLD : SUBTLE, fontWeight: i === 0 ? 700 : 400,
            textTransform: "uppercase",
          }}>{p}</div>
        ))}
      </div>

      {/* Tab nav */}
      <div style={{ display: "flex", borderBottom: `1px solid ${LINE}`, marginBottom: 10 }}>
        {([["inputs", "Assumptions"], ["results", "Analysis"], ["sensitivity", "Sensitivity"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => { setTab(k as typeof tab); if (k === "sensitivity") doS(); }}
            style={{ background: "none", border: "none", cursor: "pointer", padding: "6px 10px", fontSize: 10, fontWeight: 600, color: tab === k ? GOLD : SUBTLE, borderBottom: tab === k ? `2px solid ${GOLD}` : "2px solid transparent" }}>
            {l}
          </button>
        ))}
      </div>

      {/* ── INPUTS TAB ── */}
      {tab === "inputs" && (<>
        {sec("SITE & ZONING", [{ k: "zone", l: "Zone", t: "s", o: Object.keys(ZONES) }, { k: "landArea", l: "Plot Area", u: "sqft" }, { k: "landCost", l: "Land Cost", u: "AED", s: 100000 }, { k: "gfa", l: "GFA (0=auto)", u: "sqft", s: 100 }, { k: "farOverride", l: "FAR (0=zone)", u: "x", s: .1 }, { k: "eff", l: "Net/Gross", u: "ratio", s: .01 }, { k: "floors", l: "Floors (0=auto)", u: "fl" }])}
        {/* Contextual hints from DDA / listing */}
        <div style={{ background: `${GOLD}11`, borderRadius: 5, padding: "5px 7px", marginBottom: 8, fontSize: 8.5, color: SUBTLE, display: "flex", flexWrap: "wrap", gap: "3px 12px" }}>
          {props.plotPriceAed > 0 && <span>Listed: <b style={{ color: GOLD }}>{F.aed(props.plotPriceAed)}</b></span>}
          {props.gfaSqft > 0 && <span>DDA GFA: <b>{F.n(props.gfaSqft)} sqft</b></span>}
          {props.far && props.far > 0 && <span>DDA FAR: <b style={{ color: GOLD }}>{props.far}x</b></span>}
          <span>Calc FAR: <b style={{ color: GOLD }}>{r.far}x</b></span>
          <span>GBA: <b>{F.n(r.gba)}</b></span>
          <span>Floors: <b style={{ color: GOLD }}>{r.fl}</b></span>
          <span>Class: <b style={{ color: r.pm.hPrem > .3 ? RED : GOLD }}>{r.pm.hLabel}</b></span>
        </div>
        {sec("CONSTRUCTION", [{ k: "hcPSF", l: "Base Hard Cost/sqft", u: "AED", s: 5 }, { k: "softPct", l: "Soft Costs", u: "%", s: .5 }, { k: "contPct", l: "Contingency", u: "%", s: .5 }, { k: "constMo", l: "Duration", u: "mo" }])}
        {sec("REVENUE & OPS", rf())}
        {sec("FINANCING", [{ k: "ltv", l: "LTV", u: "%", s: 1 }, { k: "ir", l: "Interest", u: "%", s: .25 }, { k: "dr", l: "WACC", u: "%", s: .5 }, { k: "ecr", l: "Exit Cap", u: "%", s: .25 }])}
        {sec("REGULATORY", [{ k: "dldPct", l: "DLD Fee", u: "%", s: .5 }, { k: "escrowPct", l: "Escrow Contrib", u: "%", s: 5 }])}

        {/* Live IRR banner */}
        <div style={{ background: `${GOLD}11`, border: `1px solid ${GOLD}33`, borderRadius: 7, padding: 10, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 7 }}>
          <div><div style={{ fontSize: 7, color: SUBTLE, textTransform: "uppercase", letterSpacing: ".08em" }}>Live IRR</div><div style={{ fontSize: 22, fontWeight: 800, color: ic }}>{F.pct(r.irr)}</div></div>
          <div><div style={{ fontSize: 7, color: SUBTLE, textTransform: "uppercase", letterSpacing: ".08em" }}>NPV</div><div style={{ fontSize: 12, fontWeight: 700 }}>{F.aed(r.npv)}</div></div>
          <div><div style={{ fontSize: 7, color: SUBTLE, textTransform: "uppercase", letterSpacing: ".08em" }}>Total Cost</div><div style={{ fontSize: 12, fontWeight: 700 }}>{F.aed(r.tdc)}</div></div>
          <button onClick={() => setTab("results")} style={{ background: GOLD, color: "#fff", border: "none", borderRadius: 5, padding: "6px 14px", fontSize: 9.5, fontWeight: 600, cursor: "pointer" }}>Analysis &rarr;</button>
        </div>
      </>)}

      {/* ── RESULTS TAB ── */}
      {tab === "results" && (<>
        <div style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD}bb)`, borderRadius: 9, padding: "16px 18px", marginBottom: 10, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -6, right: -6, fontSize: 45, opacity: .06, fontWeight: 700 }}>{c.icon}</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 12 }}>
            <div>
              <div style={{ fontSize: 7.5, color: "rgba(255,255,255,.5)", textTransform: "uppercase", letterSpacing: ".1em" }}>Levered IRR</div>
              <div style={{ fontSize: 34, fontWeight: 800, color: "#fff", lineHeight: 1 }}>{F.pct(r.irr)}</div>
            </div>
            <div style={{ background: ic, borderRadius: 12, padding: "2px 9px", fontSize: 8.5, color: "#fff", fontWeight: 700, marginBottom: 4 }}>{it}</div>
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
          <Metric l="NPV" v={F.aed(r.npv)} sub={`@${inp.dr}%`} />
          <Metric l="Eq Mult" v={`${r.em.toFixed(2)}x`} sub={`${r.hp}yr`} />
          {r.dscr > 0 && <Metric l="DSCR" v={r.dscr.toFixed(2)} sub={r.dscr >= 1.25 ? "Bankable" : "<1.25x"} />}
        </div>
        <div style={{ background: "white", borderRadius: 6, border: `1px solid ${LINE}`, padding: 10, marginBottom: 10 }}>
          <div style={{ fontSize: 8, fontWeight: 700, color: SUBTLE, textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 5 }}>Full Cost Stack</div>
          {[["Land", r.landC], ["Base Hard", r.baseHC], ["Height +" + ((r.pm.hPrem * 100).toFixed(0)) + "%", r.hPrem], ["Soft Cost", r.sc], ["Contingency", r.cont], ["DLD 4%", r.dld], ["Permits & Infra", r.pm.total]].filter(([, v]) => (v as number) > 0).map(([l, v], i) => {
            const p = ((v as number) / r.tdc) * 100;
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
                <div style={{ width: 80, fontSize: 8, color: (l as string).includes("Height") ? RED : SUBTLE }}>{l as string}</div>
                <div style={{ flex: 1, height: 7, background: BG, borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ width: `${p}%`, height: "100%", background: (l as string).includes("Height") ? RED : GOLD, opacity: .3 + i * .1, borderRadius: 2 }} />
                </div>
                <div style={{ width: 60, textAlign: "right", fontSize: 8.5 }}>{F.aed(v as number)}</div>
                <div style={{ width: 25, textAlign: "right", fontSize: 7, color: SUBTLE }}>{F.pct(p, 0)}</div>
              </div>
            );
          })}
          <div style={{ borderTop: `1px solid ${LINE}`, paddingTop: 3, marginTop: 2, display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 9, fontWeight: 700 }}>Total</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: GOLD }}>{F.aed(r.tdc)}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
          <Metric l="GBA" v={F.n(r.gba)} sub="sqft" />
          <Metric l="NSA" v={F.n(r.nsa)} sub="sqft" />
          <Metric l="Cost/sqft" v={`AED ${r.cpsf.toFixed(0)}`} sub="GBA" />
          <Metric l="Floors" v={String(r.fl)} sub={r.pm.hLabel} />
        </div>
        <div style={{ background: "white", borderRadius: 6, border: `1px solid ${LINE}`, padding: 10, marginBottom: 10 }}>
          <div style={{ fontSize: 8, fontWeight: 700, color: SUBTLE, textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 3 }}>Cash Flow</div>
          <CfBar cfs={r.cf} />
        </div>
        {Object.keys(r.met).length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {Object.entries(r.met).map(([k, v]) => (
              <Metric key={k} l={k.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())} v={typeof v === "number" ? (Math.abs(v) > 1000 ? F.aed(v) : F.n(v)) : String(v)} />
            ))}
          </div>
        )}
        <button onClick={downloadPDF} style={{
          width: "100%", marginTop: 10, padding: "8px 12px", borderRadius: 6,
          border: `1px solid ${GOLD}`, background: "rgba(200,169,110,0.08)",
          color: GOLD, fontWeight: 700, fontSize: 10, cursor: "pointer",
          textTransform: "uppercase", letterSpacing: 1,
        }}>
          Download Report (PDF)
        </button>
      </>)}

      {/* ── SENSITIVITY TAB ── */}
      {tab === "sensitivity" && (<>
        {!sd ? (
          <div style={{ textAlign: "center", padding: 20, fontSize: 10, color: SUBTLE }}>Computing…</div>
        ) : (<>
          <div style={{ fontSize: 8, fontWeight: 700, color: SUBTLE, textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 3 }}>IRR Sensitivity &plusmn;20%</div>
          <div style={{ display: "flex", gap: 1.5, marginBottom: 3, paddingLeft: 55 }}>
            {[-20, -10, 0, 10, 20].map((d) => (
              <div key={d} style={{ flex: 1, textAlign: "center", fontSize: 7, color: SUBTLE }}>{d > 0 ? `+${d}%` : `${d}%`}</div>
            ))}
          </div>
          {sd.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 3, marginBottom: 2 }}>
              <div style={{ width: 50, fontSize: 8, color: SUBTLE, textAlign: "right" }}>{s.l}</div>
              <div style={{ display: "flex", gap: 1.5, flex: 1 }}>
                {s.d.map((d, j) => {
                  const df = d.irr - r.irr;
                  const bg = df > 0 ? `rgba(45,106,79,${Math.min(.5, Math.abs(df) / 10)})` : `rgba(230,57,70,${Math.min(.5, Math.abs(df) / 10)})`;
                  return <div key={j} style={{ flex: 1, textAlign: "center", padding: "2px 0", borderRadius: 2, background: bg, fontSize: 7, color: TXT }}>{F.pct(d.irr, 1)}</div>;
                })}
              </div>
            </div>
          ))}
          <div style={{ marginTop: 10, padding: 7, background: "white", borderRadius: 5, border: `1px solid ${LINE}` }}>
            <div style={{ fontSize: 7.5, fontWeight: 700, color: SUBTLE, textTransform: "uppercase", marginBottom: 3 }}>Scenarios</div>
            <div style={{ display: "flex", gap: 8 }}>
              {([["Worst", RED, Math.min(...sd.flatMap((s) => s.d.map((d) => d.irr)))], ["Base", GOLD, r.irr], ["Best", GREEN, Math.max(...sd.flatMap((s) => s.d.map((d) => d.irr)))]] as [string, string, number][]).map(([l, cl, v]) => (
                <div key={l} style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ fontSize: 7, color: cl }}>{l}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: cl }}>{F.pct(v)}</div>
                </div>
              ))}
            </div>
          </div>
        </>)}
      </>)}

      <div style={{ marginTop: 10, fontSize: 7, color: SUBTLE, textAlign: "center" }}>
        ZAAHI Feasibility v3.1 &middot; Not investment advice
      </div>
    </div>
  );
}
