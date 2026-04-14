"use client";
import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { jsPDF } from "jspdf";

/* ═══════════════════════════════════════════════════════════════════
   ZAAHI FEASIBILITY CALCULATOR v4.0 — TWO-TIER INSTITUTIONAL GRADE
   Dubai Land Development · 8 Segments · IRR-Centric
   Simple (owner/developer) + Advanced (expert) views
   Land-price slider drives real-time recomputation
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

// ── Palette (ZAAHI navy / teal / gold) ──────────────────────────────

const GOLD = "#C8A96E";
const NAVY = "#1A1A2E";
const TEAL = "#1B4965";
const TXT = "#1A1A2E";
const SUBTLE = "#6B7280";
const LINE = "#E5E7EB";
const BG = "#FAFAF9";
const RED = "#E63946";
const GREEN = "#2D6A4F";
const AMBER = "#E67E22";

// ── Height brackets and permits (unchanged from v3.1) ──────────────

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
type Mode = "sell" | "rent" | "jv";

interface LuConfig {
  label: string;
  icon: string;
  rm: string;
  defaults: Record<string, number | string>;
}

const LU: Record<LuKey, LuConfig> = {
  residential: { label: "Residential", icon: "R", rm: "sale", defaults: { zone: "Dubai Hills Estate", landArea: 50000, eff: 0.78, hcPSF: 450, softPct: 12, contPct: 10, constMo: 28, salePSF: 1800, absUnits: 15, unitSize: 900, dldPct: 4, agentPct: 2, escrowPct: 20, ppSplit: 60, dr: 12, ltv: 60, ir: 7.5, ecr: 6.5, floors: 0, rentPSF: 120, occ: 85, opex: 25, mgmt: 3 } },
  commercial: { label: "Commercial", icon: "C", rm: "noi", defaults: { zone: "Business Bay", landArea: 40000, eff: 0.82, hcPSF: 580, softPct: 14, contPct: 8, constMo: 32, rentPSF: 180, occ: 88, opex: 28, mgmt: 3, dldPct: 4, agentPct: 0, escrowPct: 20, ppSplit: 0, dr: 13, ltv: 55, ir: 7.0, ecr: 7.0, salePSF: 2200, absUnits: 8, unitSize: 1200, floors: 0 } },
  mixed_use: { label: "Mixed Use", icon: "M", rm: "mixed", defaults: { zone: "Business Bay", landArea: 60000, eff: 0.76, hcPSF: 520, softPct: 13, contPct: 9, constMo: 34, resPct: 55, comPct: 30, retPct: 15, salePSF: 1600, rentPSF: 160, retRent: 220, occ: 85, opex: 25, mgmt: 3, absUnits: 12, unitSize: 850, dldPct: 4, agentPct: 2, escrowPct: 20, ppSplit: 60, dr: 13, ltv: 55, ir: 7.25, ecr: 6.75, floors: 0 } },
  hotel: { label: "Hotel", icon: "H", rm: "hotel", defaults: { zone: "Palm Jumeirah", landArea: 35000, eff: 0.62, hcPSF: 1200, softPct: 16, contPct: 10, constMo: 40, adr: 750, occ: 77, rooms: 220, fbPct: 30, othPct: 15, opex: 62, mgmt: 4, ffe: 4, ramp: 2, dldPct: 4, escrowPct: 20, dr: 14, ltv: 50, ir: 8.0, ecr: 8.0, floors: 0, salePSF: 0, rentPSF: 0, agentPct: 0, ppSplit: 0, absUnits: 0, unitSize: 0 } },
  industrial: { label: "Industrial", icon: "I", rm: "noi", defaults: { zone: "DIP", landArea: 100000, eff: 0.90, hcPSF: 150, softPct: 10, contPct: 6, constMo: 14, rentPSF: 55, occ: 93, opex: 18, mgmt: 2.5, dldPct: 4, escrowPct: 0, dr: 11, ltv: 65, ir: 6.5, ecr: 7.5, salePSF: 0, agentPct: 0, ppSplit: 0, absUnits: 0, unitSize: 0, floors: 0 } },
  educational: { label: "Educational", icon: "E", rm: "edu", defaults: { zone: "Dubai Hills Estate", landArea: 45000, eff: 0.72, hcPSF: 380, softPct: 14, contPct: 8, constMo: 24, feePer: 55000, capacity: 1500, rampYr: 4, initPct: 35, opex: 72, dldPct: 4, escrowPct: 0, dr: 12, ltv: 45, ir: 7.0, ecr: 9.0, salePSF: 0, rentPSF: 0, occ: 0, agentPct: 0, mgmt: 0, ppSplit: 0, absUnits: 0, unitSize: 0, floors: 0 } },
  healthcare: { label: "Healthcare", icon: "+", rm: "health", defaults: { zone: "Dubai Hills Estate", landArea: 30000, eff: 0.65, hcPSF: 850, softPct: 18, contPct: 12, constMo: 34, beds: 150, revBed: 900000, occ: 72, ancPct: 35, opex: 68, ramp: 3, dldPct: 4, escrowPct: 0, dr: 14, ltv: 45, ir: 7.5, ecr: 8.5, salePSF: 0, rentPSF: 0, agentPct: 0, mgmt: 0, ppSplit: 0, absUnits: 0, unitSize: 0, floors: 0 } },
  agricultural: { label: "Agricultural", icon: "A", rm: "agri", defaults: { zone: "Custom", landArea: 200000, eff: 0.85, hcPSF: 45, softPct: 8, contPct: 5, constMo: 12, yld: 12, ppu: 8, grow: 3, opex: 55, dldPct: 4, escrowPct: 0, dr: 10, ltv: 35, ir: 6.0, ecr: 10.0, salePSF: 0, rentPSF: 0, occ: 0, agentPct: 0, mgmt: 0, ppSplit: 0, absUnits: 0, unitSize: 0, floors: 0 } },
};

// Which modes make sense for which land use
function allowedModes(lu: LuKey): Mode[] {
  if (lu === "residential" || lu === "commercial" || lu === "mixed_use") return ["sell", "rent", "jv"];
  return [];
}
function defaultMode(lu: LuKey): Mode {
  const rm = LU[lu].rm;
  if (rm === "sale") return "sell";
  if (rm === "noi") return "rent";
  return "sell";
}

// Runtime-model derivation from mode + lu
function effectiveRm(lu: LuKey, mode: Mode): string {
  const base = LU[lu].rm;
  // Mode toggle only applies to residential / commercial (pure-sale or pure-rent flip).
  // Mixed / Hotel / Edu / Health / Agri keep their native revenue model.
  if (lu === "residential" || lu === "commercial") {
    if (mode === "sell") return "sale";
    if (mode === "rent") return "noi";
    if (mode === "jv") return "sale"; // JV uses sale proceeds as base, split by share
  }
  return base;
}

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
  sc: number; cont: number; dld: number; dldAdmin: number; pm: PermitResult;
  tdc: number; eq: number; debt: number; ds: number; esc: number;
  noi: number; rev: number; tsr: number; ev: number; rr: number;
  irr: number; npv: number; em: number; dscr: number; dy: number;
  cf: number[]; met: Record<string, number | string>;
  hp: number; cy: number; cpsf: number;
  paybackMonths: number;    // time to positive cumulative cash flow
  totalRevenue: number;     // for summary (mode-aware)
  netProfit: number;        // totalRevenue - tdc
}

// Optional rmOverride lets the caller force a specific revenue model
// (used for SELL/RENT toggle on residential/commercial).
function run(type: string, inp: Record<string, number | string>, rmOverride?: string): RunResult {
  const c = LU[type as LuKey] || LU.residential;
  const rm = rmOverride ?? c.rm;
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
  const dldAdmin = (type === "residential" || type === "commercial" || type === "mixed_use" || type === "hotel") ? 5800 : 4300;
  const pm = calcPermits(type, hc, gba, fl, inp.zone as string);
  const tdc = landC + hc + sc + cont + dld + dldAdmin + 5000 + pm.total;
  const eq = tdc * (1 - (inp.ltv as number) / 100);
  const debt = tdc * ((inp.ltv as number) / 100);
  const ds = debt * ((inp.ir as number) / 100);
  const esc = tdc * ((inp.escrowPct as number) / 100);
  const hp = 10, cy = Math.ceil((inp.constMo as number) / 12);
  let cf: number[] = [], noi = 0, rev = 0, tsr = 0, ev = 0, rr = 0;
  const met: Record<string, number | string> = {};

  if (rm === "sale") {
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
  } else if (rm === "noi") {
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
  } else if (rm === "mixed") {
    rr = nsa * ((inp.resPct as number) || 55) / 100 * (inp.salePSF as number) * (1 - ((inp.agentPct as number) / 100) * 1.05);
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
  } else if (rm === "hotel") {
    const rp = (inp.adr as number) * ((inp.occ as number) / 100);
    const rrev = rp * (inp.rooms as number) * 365;
    rev = rrev * (1 + (inp.fbPct as number) / 100 + (inp.othPct as number) / 100);
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
  } else if (rm === "edu") {
    const mx = (inp.capacity as number) * (inp.feePer as number);
    const rmp = (inp.rampYr as number) || 4;
    const ip = ((inp.initPct as number) || 35) / 100;
    cf = [-eq];
    for (let y = 1; y <= cy; y++) cf.push(-ds);
    for (let y = 1; y <= hp - cy; y++) {
      const ep = Math.min(0.95, ip + (0.95 - ip) * Math.min(1, y / rmp));
      noi = mx * ep * (1 - (inp.opex as number) / 100);
      if (y === hp - cy) { ev = noi / ((inp.ecr as number) / 100); cf.push(noi - ds + ev - debt); }
      else cf.push(noi - ds);
    }
    met.maxRev = mx;
    met.costPerStudent = Math.round(tdc / (inp.capacity as number));
    met.stabilizedNOI = noi;
  } else if (rm === "health") {
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
  } else if (rm === "agri") {
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

  // Payback: months until cumulative CF turns positive
  let cum = 0;
  let paybackMonths = 0;
  for (let t = 0; t < cf.length; t++) {
    cum += cf[t];
    if (cum > 0) { paybackMonths = t * 12; break; }
  }
  if (paybackMonths === 0 && cum <= 0) paybackMonths = cf.length * 12;

  // Total revenue for summary (mode-aware)
  let totalRevenue = 0;
  if (rm === "sale") totalRevenue = tsr;
  else if (rm === "noi") totalRevenue = ev;
  else if (rm === "mixed") totalRevenue = rr + ev;
  else if (rm === "hotel") totalRevenue = rev * Math.max(1, hp - cy) + ev;
  else if (rm === "edu") totalRevenue = (met.maxRev as number || 0) * Math.max(1, hp - cy) * 0.7 + ev;
  else if (rm === "health") totalRevenue = rev * Math.max(1, hp - cy) + ev;
  else if (rm === "agri") totalRevenue = rev * Math.max(1, hp - cy) + ev;

  const netProfit = totalRevenue - tdc;

  return {
    gba, nsa, far, fl, landC, baseHC, hPrem: hPrem_, hc, sc, cont, dld, dldAdmin, pm, tdc, eq, debt, ds, esc,
    noi, rev, tsr, ev, rr, irr: ip, npv: n, em, dscr, dy, cf, met, hp, cy, cpsf: tdc / gba,
    paybackMonths, totalRevenue, netProfit,
  };
}

function sens(type: string, base: Record<string, number | string>, param: string, rmOverride?: string) {
  return [-20, -10, 0, 10, 20].map((d) => {
    const m = { ...base, [param]: (base[param] as number) * (1 + d / 100) };
    return { d, irr: run(type, m, rmOverride).irr, profit: run(type, m, rmOverride).netProfit };
  });
}

// ── Formatting ─────────────────────────────────────────────────────

const F = {
  n: (v: number): string => {
    if ((!v && v !== 0) || isNaN(v)) return "\u2014";
    if (Math.abs(v) >= 1e9) return (v / 1e9).toFixed(2) + "B";
    if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(1) + "M";
    if (Math.abs(v) >= 1e3) return (v / 1e3).toFixed(0) + "K";
    return v.toFixed(0);
  },
  aed: (v: number): string => "AED " + F.n(v),
  pct: (v: number, d = 1): string => (isNaN(v) ? "\u2014" : v.toFixed(d) + "%"),
  months: (m: number): string => {
    if (!isFinite(m) || isNaN(m)) return "\u2014";
    if (m >= 120) return `${(m / 12).toFixed(1)} yrs`;
    return `${Math.round(m)} mo`;
  },
};

// ── Helpers ────────────────────────────────────────────────────────

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

// ── Reactive sub-components ────────────────────────────────────────

function NumInput({ l, v, onChange: o, u, s = 1 }: { l: string; v: number; onChange: (v: number) => void; u?: string; s?: number }) {
  const [local, setLocal] = useState(String(v));
  const [focused, setFocused] = useState(false);
  useEffect(() => { if (!focused) setLocal(String(v)); }, [v, focused]);
  const formatted = !focused && v !== 0 ? v.toLocaleString("en-US") : local;
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 10, color: SUBTLE, letterSpacing: ".04em", marginBottom: 3 }}>{l}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <input
          type={focused ? "number" : "text"}
          value={focused ? local : formatted}
          onChange={(e) => { setLocal(e.target.value); const n = +e.target.value; if (!isNaN(n)) o(n); }}
          onFocus={() => setFocused(true)}
          onBlur={() => { setFocused(false); const n = +local; setLocal(String(isNaN(n) ? 0 : n)); if (isNaN(n)) o(0); }}
          step={s}
          style={{ flex: 1, background: BG, border: `1px solid ${LINE}`, borderRadius: 6, padding: "7px 9px", fontSize: 13, color: TXT, outline: "none", width: "100%", fontFamily: "inherit" }}
        />
        {u && <span style={{ fontSize: 10, color: SUBTLE, minWidth: 28 }}>{u}</span>}
      </div>
    </div>
  );
}

function LandPriceSlider({
  value, onChange, plotAreaSqft,
}: {
  value: number;
  onChange: (v: number) => void;
  plotAreaSqft: number;
}) {
  // Slider range: 10% → 500% of current value (or if 0, use zone default times area)
  const min = Math.max(100_000, Math.round(value * 0.1 / 100_000) * 100_000);
  const max = Math.max(min * 10, Math.round(value * 5 / 1_000_000) * 1_000_000);
  const step = Math.max(10_000, Math.round((max - min) / 1000 / 10_000) * 10_000);
  const pricePerSqft = plotAreaSqft > 0 ? value / plotAreaSqft : 0;

  return (
    <div style={{
      background: `linear-gradient(135deg, ${NAVY} 0%, ${TEAL} 100%)`,
      borderRadius: 12, padding: "18px 20px 16px", color: "#fff",
      boxShadow: "0 6px 20px rgba(27,73,101,0.25)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
        <div style={{ fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(255,255,255,.65)" }}>
          Land Cost
        </div>
        <div style={{ fontSize: 9, color: "rgba(255,255,255,.5)" }}>
          {pricePerSqft > 0 ? `AED ${pricePerSqft.toFixed(0)}/sqft` : "—"}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 12, color: "rgba(255,255,255,.55)" }}>AED</span>
        <input
          type="number"
          value={value}
          onChange={(e) => {
            const n = +e.target.value;
            if (!isNaN(n) && n >= 0) onChange(n);
          }}
          step={step}
          style={{
            background: "transparent", border: 0, borderBottom: "1px solid rgba(255,255,255,.2)",
            color: "#fff", fontSize: 28, fontWeight: 800, width: "100%", outline: "none",
            fontFamily: "inherit", padding: "2px 0",
          }}
        />
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={Math.min(Math.max(value, min), max)}
        onChange={(e) => onChange(+e.target.value)}
        style={{
          width: "100%", accentColor: GOLD, height: 4, cursor: "pointer",
        }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "rgba(255,255,255,.45)", marginTop: 4 }}>
        <span>{F.aed(min)}</span>
        <span>{F.aed(max)}</span>
      </div>
    </div>
  );
}

function SummaryCard({
  label, value, sub, accent, big,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
  big?: boolean;
}) {
  return (
    <div style={{
      background: "white", borderRadius: 10, padding: big ? "14px 16px" : "12px 14px",
      border: `1px solid ${LINE}`,
      borderLeft: accent ? `4px solid ${accent}` : `1px solid ${LINE}`,
      minWidth: 0, // allow ellipsize within grid
    }}>
      <div style={{ fontSize: 9, color: SUBTLE, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{
        fontSize: big ? 22 : 18, fontWeight: 800, color: accent ?? TXT, lineHeight: 1.1,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 10, color: SUBTLE, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function Verdict({ irr, netProfit }: { irr: number; netProfit: number }) {
  let status: "STRONG" | "MARGINAL" | "WEAK";
  let color: string;
  let bg: string;
  let msg: string;
  if (irr >= 18 && netProfit > 0) {
    status = "STRONG";
    color = "#fff";
    bg = GREEN;
    msg = "Attractive returns";
  } else if (irr >= 10 && netProfit > 0) {
    status = "MARGINAL";
    color = "#fff";
    bg = AMBER;
    msg = "Acceptable — negotiate harder";
  } else {
    status = "WEAK";
    color = "#fff";
    bg = RED;
    msg = netProfit <= 0 ? "Loss-making at this land price" : "Below target — reconsider";
  }
  return (
    <div style={{
      background: bg, color, borderRadius: 10, padding: "12px 16px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
    }}>
      <div>
        <div style={{ fontSize: 10, letterSpacing: ".1em", opacity: 0.75 }}>VERDICT</div>
        <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: ".04em" }}>{status}</div>
      </div>
      <div style={{ fontSize: 12, textAlign: "right", opacity: 0.92 }}>{msg}</div>
    </div>
  );
}

function ModeToggle({ mode, onChange, modes }: { mode: Mode; onChange: (m: Mode) => void; modes: Mode[] }) {
  if (modes.length === 0) return null;
  const labels: Record<Mode, string> = { sell: "BUILD-TO-SELL", rent: "BUILD-TO-RENT", jv: "JOINT VENTURE" };
  return (
    <div style={{ display: "flex", gap: 4, background: BG, padding: 3, borderRadius: 8, border: `1px solid ${LINE}` }}>
      {modes.map((m) => {
        const active = m === mode;
        return (
          <button
            key={m}
            onClick={() => onChange(m)}
            style={{
              flex: 1, border: 0, cursor: "pointer",
              background: active ? TEAL : "transparent",
              color: active ? "#fff" : SUBTLE,
              padding: "7px 10px", borderRadius: 6,
              fontSize: 10, fontWeight: 700, letterSpacing: ".05em",
            }}
          >
            {labels[m]}
          </button>
        );
      })}
    </div>
  );
}

function Section({
  title, open, onToggle, children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div style={{ background: "white", borderRadius: 8, border: `1px solid ${LINE}`, marginBottom: 8, overflow: "hidden" }}>
      <button
        onClick={onToggle}
        style={{
          width: "100%", background: "transparent", border: 0, cursor: "pointer",
          padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between",
          fontSize: 11, fontWeight: 700, color: GOLD, textTransform: "uppercase", letterSpacing: ".07em",
          fontFamily: "Georgia, serif",
        }}
      >
        <span>{title}</span>
        <span style={{ color: SUBTLE, fontSize: 14, transition: "transform .15s", transform: open ? "rotate(180deg)" : "none" }}>
          ⌄
        </span>
      </button>
      {open && (
        <div style={{ padding: "4px 14px 12px", borderTop: `1px solid ${LINE}` }}>{children}</div>
      )}
    </div>
  );
}

function ToggleRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${LINE}22` }}>
      <span style={{ fontSize: 11, color: SUBTLE }}>{label}</span>
      <span style={{ fontSize: 12, color: TXT, fontWeight: 600 }}>{children}</span>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────

export default function FeasibilityCalculator(props: Props) {
  const initialLu = mapLandUse(props.landUse);
  const [lu, setLU] = useState<LuKey>(initialLu);
  const [mode, setMode] = useState<Mode>(defaultMode(initialLu));
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    costs: true, revenue: false, timeline: false, metrics: false, hotel: false,
  });
  const [disclaimerVisible, setDisclaimerVisible] = useState(true);

  const [inp, setInp] = useState<Record<string, number | string>>(() => {
    const d = { ...LU[initialLu].defaults };
    if (props.plotAreaSqft > 0) d.landArea = props.plotAreaSqft;
    if (props.maxFloors && props.maxFloors > 0) d.floors = props.maxFloors;
    d.zone = matchZone(props.community);
    d.landCost = props.plotPriceAed > 0 ? props.plotPriceAed : 0;
    d.gfa = props.gfaSqft > 0 ? props.gfaSqft : 0;
    d.farOverride = props.far && props.far > 0 ? props.far : 0;
    const ms = computeMixedSplit(props.landUseMix);
    if (ms && initialLu === "mixed_use") { d.resPct = ms.resPct; d.comPct = ms.comPct; d.retPct = ms.retPct; }
    return d;
  });

  // Reset inputs + mode when land use changes (keep plot-derived overrides).
  useEffect(() => {
    const d = { ...LU[lu].defaults };
    if (props.plotAreaSqft > 0) d.landArea = props.plotAreaSqft;
    if (props.maxFloors && props.maxFloors > 0) d.floors = props.maxFloors;
    d.zone = matchZone(props.community);
    d.landCost = props.plotPriceAed > 0 ? props.plotPriceAed : 0;
    d.gfa = props.gfaSqft > 0 ? props.gfaSqft : 0;
    d.farOverride = props.far && props.far > 0 ? props.far : 0;
    const ms = computeMixedSplit(props.landUseMix);
    if (ms && lu === "mixed_use") { d.resPct = ms.resPct; d.comPct = ms.comPct; d.retPct = ms.retPct; }
    setInp(d);
    setMode(defaultMode(lu));
    // intentionally not including props in deps for the initial mount reset
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lu, props.plotAreaSqft, props.maxFloors, props.community, props.plotPriceAed, props.gfaSqft, props.far, props.landUseMix]);

  const u = useCallback((k: string, v: number | string) => setInp((p) => ({ ...p, [k]: v })), []);
  const updateLandCost = useCallback((n: number) => setInp((p) => ({ ...p, landCost: n })), []);

  const rm = effectiveRm(lu, mode);
  const r = useMemo(() => run(lu, inp, rm), [lu, inp, rm]);
  const c = LU[lu];

  // Sensitivity table: land price ±20% → profit / IRR
  const landSens = useMemo(
    () => sens(lu, inp, "landCost", rm),
    [lu, inp, rm],
  );

  const irrColor = r.irr > 18 ? GREEN : r.irr > 12 ? GOLD : r.irr >= 8 ? AMBER : RED;
  const profitColor = r.netProfit > 0 ? GREEN : RED;

  // PDF export
  const downloadPDF = useCallback(() => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const W = 210, M = 15;
    let y = 15;
    const gold: [number, number, number] = [200, 169, 110];
    const dark: [number, number, number] = [26, 26, 46];
    const gray: [number, number, number] = [107, 114, 128];

    const addFooter = () => {
      doc.setFontSize(6.5); doc.setTextColor(...gray); doc.setFont("helvetica", "normal");
      doc.text("ZAAHI Real Estate OS — zaahi.io — Confidential", W / 2, 290, { align: "center" });
    };
    addFooter();
    const checkPage = (need: number) => { if (y + need > 275) { doc.addPage(); y = 15; addFooter(); } };
    const heading = (t: string) => { checkPage(12); doc.setFontSize(11); doc.setTextColor(...gold); doc.setFont("helvetica", "bold"); doc.text(t, M, y); y += 6; };
    const row = (l: string, v: string) => { checkPage(6); doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(...gray); doc.text(l, M, y); doc.setTextColor(...dark); doc.text(v, W - M, y, { align: "right" }); y += 5; };
    const rule = () => { doc.setDrawColor(...gold); doc.setLineWidth(0.3); doc.line(M, y, W - M, y); y += 4; };

    doc.setFontSize(18); doc.setTextColor(...gold); doc.setFont("helvetica", "bold");
    doc.text("ZAAHI Feasibility Report", M, y); y += 8;
    doc.setFontSize(9); doc.setTextColor(...gray); doc.setFont("helvetica", "normal");
    doc.text(`Generated ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, M, y); y += 4;
    rule();

    heading("PLOT INFORMATION");
    if (props.projectName) row("Project", props.projectName);
    if (props.masterDeveloper) row("Master Developer", props.masterDeveloper);
    if (props.plotNumber) row("Plot Number", props.plotNumber);
    if (props.district) row("District", props.district);
    row("Land Use", c.label);
    if (props.community) row("Community", props.community);
    if (props.maxHeightCode) row("Height Code", props.maxHeightCode);
    row("Plot Area", `${Math.round(props.plotAreaSqft).toLocaleString()} sqft`);
    if (props.plotPriceAed > 0) row("Listed Price", F.aed(props.plotPriceAed));
    row("Strategy", mode === "sell" ? "Build-to-Sell" : mode === "rent" ? "Build-to-Rent" : "Joint Venture");
    y += 2;

    heading("SUMMARY");
    row("Total Investment", F.aed(r.tdc));
    row("Total Revenue", F.aed(r.totalRevenue));
    row("Net Profit", F.aed(r.netProfit));
    row("IRR", F.pct(r.irr));
    row("Payback", F.months(r.paybackMonths));
    y += 2;

    heading("COSTS");
    row("Land Cost", F.aed(r.landC));
    row("Base Hard Cost", F.aed(r.baseHC));
    row("Height Premium (+" + (r.pm.hPrem * 100).toFixed(0) + "%)", F.aed(r.hPrem));
    row("Soft Costs", F.aed(r.sc));
    row("Contingency", F.aed(r.cont));
    row("DLD Registration (4%)", F.aed(r.dld));
    row("DLD Admin Fee", F.aed(r.dldAdmin));
    row("Permits & Infrastructure", F.aed(r.pm.total));
    y += 2;

    heading("METRICS");
    row("GBA", `${F.n(r.gba)} sqft`);
    row("NSA", `${F.n(r.nsa)} sqft`);
    row("Cost / sqft", `AED ${r.cpsf.toFixed(0)}`);
    row("Floors", String(r.fl));
    row("NPV", F.aed(r.npv));
    row("Equity Multiple", `${r.em.toFixed(2)}x`);
    if (r.dscr > 0) row("DSCR", r.dscr.toFixed(2));
    row("Yield on Debt", F.pct(r.dy));
    y += 2;

    heading("LAND PRICE SENSITIVITY");
    [-20, -10, 0, 10, 20].forEach((d, i) => {
      const item = landSens[i];
      row(`${d > 0 ? "+" : ""}${d}% land cost`, `IRR ${F.pct(item.irr)} · Profit ${F.aed(item.profit)}`);
    });

    const plotLabel = props.plotNumber ? `-Plot-${props.plotNumber}` : "";
    doc.save(`ZAAHI-Feasibility${plotLabel}-${new Date().toISOString().slice(0, 10)}.pdf`);
  }, [r, landSens, lu, mode, props, c]);

  const toggleSection = (k: string) => setExpandedSections((s) => ({ ...s, [k]: !s[k] }));
  const allowed = allowedModes(lu);

  // ── RENDER ──

  return (
    <div style={{ color: TXT, fontFamily: "-apple-system, Segoe UI, Roboto, sans-serif", fontSize: 12 }}>

      {/* Disclaimer */}
      {disclaimerVisible && (
        <div style={{
          marginBottom: 10, padding: "7px 11px", background: `${GOLD}0D`,
          border: `1px solid ${GOLD}33`, borderRadius: 6,
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
        }}>
          <span style={{ fontSize: 9, color: SUBTLE, lineHeight: 1.4 }}>
            For informational purposes only — not investment advice.
          </span>
          <button
            onClick={() => setDisclaimerVisible(false)}
            style={{ background: "none", border: "none", color: SUBTLE, fontSize: 14, cursor: "pointer", padding: "0 2px", lineHeight: 1, flexShrink: 0 }}
            aria-label="Dismiss"
          >&times;</button>
        </div>
      )}

      {/* Project heading */}
      {(props.projectName || props.masterDeveloper) && (
        <div style={{ marginBottom: 10, padding: "6px 10px", background: `${GOLD}0A`, borderRadius: 5, borderLeft: `2px solid ${GOLD}` }}>
          {props.projectName && <div style={{ fontSize: 11, fontWeight: 700, color: TXT }}>{props.projectName}</div>}
          {props.masterDeveloper && <div style={{ fontSize: 9, color: SUBTLE }}>by {props.masterDeveloper}</div>}
        </div>
      )}

      {/* Land use selector */}
      <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginBottom: 10 }}>
        {(Object.entries(LU) as [LuKey, LuConfig][]).map(([k, v]) => (
          <button key={k} onClick={() => setLU(k)}
            style={{
              background: lu === k ? GOLD : "transparent",
              color: lu === k ? "#fff" : SUBTLE,
              border: lu === k ? "none" : `1px solid ${LINE}`,
              borderRadius: 5, padding: "4px 8px", cursor: "pointer",
              fontSize: 9.5, fontWeight: 600, whiteSpace: "nowrap",
              display: "flex", alignItems: "center", gap: 4,
            }}>
            <span style={{ fontSize: 8, fontWeight: 700, opacity: .7 }}>{v.icon}</span>
            {v.label}
          </button>
        ))}
      </div>

      {/* Mode toggle (residential / commercial / mixed only) */}
      {allowed.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <ModeToggle mode={mode} onChange={setMode} modes={allowed} />
        </div>
      )}

      {/* ══════════ SIMPLE VIEW (always visible) ══════════ */}

      <div style={{ marginBottom: 12 }}>
        <LandPriceSlider
          value={(inp.landCost as number) || 0}
          onChange={updateLandCost}
          plotAreaSqft={props.plotAreaSqft}
        />
      </div>

      {/* 5 big summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
        <SummaryCard label="Total Investment" value={F.aed(r.tdc)} sub={`${F.n(r.gba)} sqft GBA`} accent={TEAL} big />
        <SummaryCard label="Total Revenue" value={F.aed(r.totalRevenue)} sub={mode === "sell" ? "Sale proceeds" : mode === "rent" ? "Rent + exit" : "Split basis"} accent={GOLD} big />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 10 }}>
        <SummaryCard label="Net Profit" value={F.aed(r.netProfit)} accent={profitColor} />
        <SummaryCard label="IRR" value={F.pct(r.irr)} accent={irrColor} />
        <SummaryCard label="Payback" value={F.months(r.paybackMonths)} sub="break-even" />
      </div>

      {/* Verdict banner */}
      <div style={{ marginBottom: 10 }}>
        <Verdict irr={r.irr} netProfit={r.netProfit} />
      </div>

      {/* Action row */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        <button
          onClick={() => setAdvancedOpen((o) => !o)}
          style={{
            flex: 1, background: advancedOpen ? TEAL : "white",
            color: advancedOpen ? "#fff" : TEAL,
            border: `1px solid ${TEAL}`, borderRadius: 6, padding: "9px 12px",
            fontSize: 10, fontWeight: 700, cursor: "pointer", letterSpacing: ".06em", textTransform: "uppercase",
          }}
        >
          {advancedOpen ? "Hide Details ▴" : "Advanced Details ▾"}
        </button>
        <button
          onClick={downloadPDF}
          style={{
            flex: 1, background: GOLD, color: "#fff", border: 0, borderRadius: 6,
            padding: "9px 12px", fontSize: 10, fontWeight: 700, cursor: "pointer",
            letterSpacing: ".06em", textTransform: "uppercase",
          }}
        >
          Download Report ↓
        </button>
      </div>

      {/* ══════════ ADVANCED VIEW (collapsible) ══════════ */}

      {advancedOpen && (
        <div style={{
          borderTop: `2px solid ${GOLD}33`, paddingTop: 10,
          animation: "zaahiFadeIn 200ms ease",
        }}>

          <Section title="Costs" open={expandedSections.costs} onToggle={() => toggleSection("costs")}>
            <ToggleRow label="Land Cost">{F.aed(r.landC)}</ToggleRow>
            <NumInput l="Base Hard Cost / sqft (AED)" v={inp.hcPSF as number} onChange={(v) => u("hcPSF", v)} s={5} />
            <ToggleRow label="Base Hard Cost (total)">{F.aed(r.baseHC)}</ToggleRow>
            <ToggleRow label={`Height Premium +${(r.pm.hPrem * 100).toFixed(0)}% (${r.pm.hLabel})`}>{F.aed(r.hPrem)}</ToggleRow>
            <NumInput l="Soft Costs (%)" v={inp.softPct as number} onChange={(v) => u("softPct", v)} s={0.5} />
            <NumInput l="Contingency (%)" v={inp.contPct as number} onChange={(v) => u("contPct", v)} s={0.5} />
            <ToggleRow label="Building Permit (BP)">{F.aed(r.pm.bp)}</ToggleRow>
            <ToggleRow label="Civil Defence">{F.aed(r.pm.cd)}</ToggleRow>
            <ToggleRow label="DEWA (+ substation if req'd)">{F.aed(r.pm.dewa)}</ToggleRow>
            <ToggleRow label="Piling">{F.aed(r.pm.piling)}</ToggleRow>
            <ToggleRow label="Master Developer Fee (AED 8/sqft GBA)">{F.aed(r.pm.mdFee)}</ToggleRow>
            {r.pm.sector > 0 && <ToggleRow label="Sector Licence">{F.aed(r.pm.sector)}</ToggleRow>}
            <ToggleRow label="RERA Fee">{F.aed(r.pm.rera)}</ToggleRow>
            <NumInput l="DLD Registration (%)" v={inp.dldPct as number} onChange={(v) => u("dldPct", v)} s={0.5} />
            <ToggleRow label="DLD Admin Fee">{F.aed(r.dldAdmin)}</ToggleRow>
            <ToggleRow label="─── Total Investment ───"><b style={{ color: GOLD }}>{F.aed(r.tdc)}</b></ToggleRow>
          </Section>

          <Section title="Revenue" open={expandedSections.revenue} onToggle={() => toggleSection("revenue")}>
            {rm === "sale" && (
              <>
                <NumInput l="Sale Price / sqft (AED)" v={inp.salePSF as number} onChange={(v) => u("salePSF", v)} s={10} />
                <NumInput l="Absorption (units / month)" v={inp.absUnits as number} onChange={(v) => u("absUnits", v)} />
                <NumInput l="Avg Unit Size (sqft)" v={inp.unitSize as number} onChange={(v) => u("unitSize", v)} s={50} />
                <NumInput l="Construction Payment %" v={inp.ppSplit as number} onChange={(v) => u("ppSplit", v)} s={5} />
                <NumInput l="Agent Commission (%)" v={inp.agentPct as number} onChange={(v) => u("agentPct", v)} s={0.5} />
                <ToggleRow label="Total Sale Revenue">{F.aed(r.tsr)}</ToggleRow>
                {typeof r.met.totalUnits === "number" && <ToggleRow label="Units">{String(r.met.totalUnits)}</ToggleRow>}
                {r.met.monthsToSell !== undefined && <ToggleRow label="Months to Sell">{String(r.met.monthsToSell)}</ToggleRow>}
              </>
            )}
            {rm === "noi" && (
              <>
                <NumInput l="Rent / sqft / year (AED)" v={inp.rentPSF as number} onChange={(v) => u("rentPSF", v)} s={5} />
                <NumInput l="Occupancy (%)" v={inp.occ as number} onChange={(v) => u("occ", v)} />
                <NumInput l="OpEx (%)" v={inp.opex as number} onChange={(v) => u("opex", v)} />
                <NumInput l="Management Fee (%)" v={inp.mgmt as number} onChange={(v) => u("mgmt", v)} s={0.5} />
                <NumInput l="Exit Cap Rate (%)" v={inp.ecr as number} onChange={(v) => u("ecr", v)} s={0.25} />
                <ToggleRow label="Gross Annual Revenue">{F.aed(r.rev)}</ToggleRow>
                <ToggleRow label="Annual NOI">{F.aed(r.noi)}</ToggleRow>
                <ToggleRow label="Exit Value">{F.aed(r.ev)}</ToggleRow>
                {r.met.yieldOnCost && <ToggleRow label="Yield on Cost">{String(r.met.yieldOnCost)}</ToggleRow>}
              </>
            )}
            {rm === "mixed" && (
              <>
                <NumInput l="Residential %" v={inp.resPct as number} onChange={(v) => u("resPct", v)} s={5} />
                <NumInput l="Commercial %" v={inp.comPct as number} onChange={(v) => u("comPct", v)} s={5} />
                <NumInput l="Retail %" v={inp.retPct as number} onChange={(v) => u("retPct", v)} s={5} />
                <NumInput l="Res Sale / sqft (AED)" v={inp.salePSF as number} onChange={(v) => u("salePSF", v)} s={10} />
                <NumInput l="Office Rent / sqft / yr" v={inp.rentPSF as number} onChange={(v) => u("rentPSF", v)} s={5} />
                <NumInput l="Retail Rent / sqft / yr" v={inp.retRent as number} onChange={(v) => u("retRent", v)} s={5} />
                <NumInput l="Occupancy (%)" v={inp.occ as number} onChange={(v) => u("occ", v)} />
                <NumInput l="OpEx (%)" v={inp.opex as number} onChange={(v) => u("opex", v)} />
                <ToggleRow label="Res Sale Revenue">{F.aed(r.rr)}</ToggleRow>
                <ToggleRow label="Annual Com+Ret NOI">{F.aed(r.noi)}</ToggleRow>
                <ToggleRow label="Exit Value (NOI basis)">{F.aed(r.ev)}</ToggleRow>
              </>
            )}
            {rm === "hotel" && (
              <>
                <NumInput l="ADR (AED)" v={inp.adr as number} onChange={(v) => u("adr", v)} s={10} />
                <NumInput l="Occupancy (%)" v={inp.occ as number} onChange={(v) => u("occ", v)} />
                <NumInput l="Rooms (keys)" v={inp.rooms as number} onChange={(v) => u("rooms", v)} s={5} />
                <NumInput l="F&B Revenue (%)" v={inp.fbPct as number} onChange={(v) => u("fbPct", v)} />
                <NumInput l="Other Revenue (%)" v={inp.othPct as number} onChange={(v) => u("othPct", v)} />
                <NumInput l="OpEx (%)" v={inp.opex as number} onChange={(v) => u("opex", v)} />
                <NumInput l="Management Fee (%)" v={inp.mgmt as number} onChange={(v) => u("mgmt", v)} s={0.5} />
                <NumInput l="FF&E Reserve (%)" v={inp.ffe as number} onChange={(v) => u("ffe", v)} s={0.5} />
                <NumInput l="Ramp-up (years)" v={inp.ramp as number} onChange={(v) => u("ramp", v)} />
                <ToggleRow label="RevPAR">{String(r.met.revpar ?? "—")} AED</ToggleRow>
                <ToggleRow label="Cost / Key">{F.aed(r.met.costPerKey as number)}</ToggleRow>
                <ToggleRow label="GOP Margin">{String(r.met.gopMargin ?? "—")}</ToggleRow>
                <ToggleRow label="Stabilized NOI">{F.aed(r.noi)}</ToggleRow>
              </>
            )}
            {rm === "edu" && (
              <>
                <NumInput l="Fee / Student / year" v={inp.feePer as number} onChange={(v) => u("feePer", v)} s={1000} />
                <NumInput l="Capacity (students)" v={inp.capacity as number} onChange={(v) => u("capacity", v)} s={50} />
                <NumInput l="Ramp Years" v={inp.rampYr as number} onChange={(v) => u("rampYr", v)} />
                <NumInput l="Year-1 Enrollment (%)" v={inp.initPct as number} onChange={(v) => u("initPct", v)} s={5} />
                <NumInput l="OpEx (%)" v={inp.opex as number} onChange={(v) => u("opex", v)} />
                <ToggleRow label="Max Revenue">{F.aed(r.met.maxRev as number)}</ToggleRow>
                <ToggleRow label="Cost / Student">{F.aed(r.met.costPerStudent as number)}</ToggleRow>
              </>
            )}
            {rm === "health" && (
              <>
                <NumInput l="Beds" v={inp.beds as number} onChange={(v) => u("beds", v)} />
                <NumInput l="Revenue / Bed / year" v={inp.revBed as number} onChange={(v) => u("revBed", v)} s={10000} />
                <NumInput l="Occupancy (%)" v={inp.occ as number} onChange={(v) => u("occ", v)} />
                <NumInput l="Ancillary Revenue (%)" v={inp.ancPct as number} onChange={(v) => u("ancPct", v)} />
                <NumInput l="OpEx (%)" v={inp.opex as number} onChange={(v) => u("opex", v)} />
                <NumInput l="Ramp-up (years)" v={inp.ramp as number} onChange={(v) => u("ramp", v)} />
                <ToggleRow label="Annual Revenue">{F.aed(r.rev)}</ToggleRow>
                <ToggleRow label="Annual NOI">{F.aed(r.noi)}</ToggleRow>
                <ToggleRow label="EBITDA Margin">{String(r.met.ebitda ?? "—")}</ToggleRow>
                <ToggleRow label="Cost / Bed">{F.aed(r.met.costPerBed as number)}</ToggleRow>
              </>
            )}
            {rm === "agri" && (
              <>
                <NumInput l="Yield / sqft" v={inp.yld as number} onChange={(v) => u("yld", v)} s={0.5} />
                <NumInput l="Price / Unit (AED)" v={inp.ppu as number} onChange={(v) => u("ppu", v)} s={0.5} />
                <NumInput l="Annual Growth (%)" v={inp.grow as number} onChange={(v) => u("grow", v)} s={0.5} />
                <NumInput l="OpEx (%)" v={inp.opex as number} onChange={(v) => u("opex", v)} />
                <ToggleRow label="Annual Revenue">{F.aed(r.rev)}</ToggleRow>
                <ToggleRow label="Revenue / Acre">{F.aed(r.met.revPerAcre as number)}</ToggleRow>
              </>
            )}
            {mode === "jv" && rm === "sale" && (
              <div style={{ marginTop: 8, padding: 10, background: `${GOLD}11`, borderRadius: 6, borderLeft: `3px solid ${GOLD}` }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: GOLD, marginBottom: 6, letterSpacing: ".06em", textTransform: "uppercase" }}>Joint Venture Split</div>
                <ToggleRow label="Land Contribution">{F.aed(r.landC)}</ToggleRow>
                <ToggleRow label="Developer Contribution (Construction+Fees)">{F.aed(r.tdc - r.landC)}</ToggleRow>
                <ToggleRow label="Total Investment">{F.aed(r.tdc)}</ToggleRow>
                <ToggleRow label="Land Owner Share (at 60/40 split)">{F.aed(r.netProfit * 0.4)}</ToggleRow>
                <ToggleRow label="Developer Share (at 60/40 split)">{F.aed(r.netProfit * 0.6)}</ToggleRow>
                <div style={{ fontSize: 9, color: SUBTLE, marginTop: 6 }}>
                  Typical splits: 50/50 (equal), 60/40 (dev-led), 70/30 (large dev).
                </div>
              </div>
            )}
          </Section>

          <Section title="Timeline" open={expandedSections.timeline} onToggle={() => toggleSection("timeline")}>
            <ToggleRow label="Design & Permits">6–12 months</ToggleRow>
            <NumInput l="Construction (months)" v={inp.constMo as number} onChange={(v) => u("constMo", v)} />
            {rm === "sale" && r.met.monthsToSell !== undefined && (
              <ToggleRow label="Sales Period (est.)">{String(r.met.monthsToSell)} months</ToggleRow>
            )}
            <ToggleRow label="Total Construction Years">{r.cy}</ToggleRow>
            <ToggleRow label="Hold Period (cash flow model)">{r.hp} years</ToggleRow>
          </Section>

          <Section title="Metrics & Financing" open={expandedSections.metrics} onToggle={() => toggleSection("metrics")}>
            <NumInput l="LTV (%)" v={inp.ltv as number} onChange={(v) => u("ltv", v)} />
            <NumInput l="Interest (%)" v={inp.ir as number} onChange={(v) => u("ir", v)} s={0.25} />
            <NumInput l="WACC (%)" v={inp.dr as number} onChange={(v) => u("dr", v)} s={0.5} />
            <NumInput l="Escrow (%)" v={inp.escrowPct as number} onChange={(v) => u("escrowPct", v)} s={5} />
            <div style={{ height: 6 }} />
            <ToggleRow label="Equity">{F.aed(r.eq)}</ToggleRow>
            <ToggleRow label="Debt">{F.aed(r.debt)}</ToggleRow>
            <ToggleRow label="Annual Debt Service">{F.aed(r.ds)}</ToggleRow>
            <ToggleRow label="NPV @ WACC">{F.aed(r.npv)}</ToggleRow>
            <ToggleRow label="Equity Multiple">{`${r.em.toFixed(2)}x`}</ToggleRow>
            {r.dscr > 0 && <ToggleRow label="DSCR">{r.dscr.toFixed(2)}</ToggleRow>}
            {r.dy > 0 && <ToggleRow label="Yield on Debt">{F.pct(r.dy)}</ToggleRow>}

            {/* Sensitivity table — land price */}
            <div style={{ marginTop: 10, padding: 8, background: `${GOLD}08`, borderRadius: 6 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: GOLD, marginBottom: 6, letterSpacing: ".06em", textTransform: "uppercase" }}>
                Land Price Sensitivity
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 3, fontSize: 9 }}>
                {[-20, -10, 0, 10, 20].map((d, i) => {
                  const item = landSens[i];
                  const up = d > 0;
                  const bg = d === 0 ? `${GOLD}22` : up ? `${RED}11` : `${GREEN}11`;
                  return (
                    <div key={d} style={{ background: bg, padding: "6px 4px", borderRadius: 4, textAlign: "center" }}>
                      <div style={{ fontSize: 8, color: SUBTLE }}>{up ? "+" : ""}{d}%</div>
                      <div style={{ fontWeight: 700, color: item.irr >= 12 ? GREEN : RED }}>{F.pct(item.irr, 0)}</div>
                      <div style={{ fontSize: 8, color: SUBTLE }}>{F.aed(item.profit)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Section>

          {lu === "hotel" && (
            <Section title="Hotel Specifics" open={expandedSections.hotel} onToggle={() => toggleSection("hotel")}>
              <ToggleRow label="ADR × Occupancy = RevPAR">{String(r.met.revpar ?? "—")} AED</ToggleRow>
              <ToggleRow label="Cost per Key">{F.aed(r.met.costPerKey as number)}</ToggleRow>
              <ToggleRow label="GOP Margin">{String(r.met.gopMargin ?? "—")}</ToggleRow>
              <ToggleRow label="GOPPAR (approx)">{F.aed(((r.rev * 0.38) / ((inp.rooms as number) || 1)) / 365)} /key/night</ToggleRow>
              <ToggleRow label="Pre-opening Expenses">~2–3% of construction</ToggleRow>
            </Section>
          )}

        </div>
      )}

      <div style={{ marginTop: 10, fontSize: 8, color: SUBTLE, textAlign: "center" }}>
        ZAAHI Feasibility v4.0 · Two-tier · Not investment advice
      </div>

      <style jsx global>{`
        @keyframes zaahiFadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
